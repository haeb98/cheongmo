// 네이버 지도/플레이스 등 링크에서 가게 이름·사진·설명을 가져옵니다 (og 태그).
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

class OgError extends Error {}

function blockedHost(host) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^(\d+\.){3}\d+$/.test(h) || h.includes(':') || h.startsWith('[');
}

async function get(url, referer) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || blockedHost(u.hostname)) throw new OgError('지원하지 않는 링크예요');
  let res;
  try {
    res = await fetch(u, {
      redirect: 'follow',
      headers: { 'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9', accept: 'text/html,application/xhtml+xml', ...(referer ? { referer } : {}) },
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new OgError('링크에 접속하지 못했어요');
  }
  const html = (await res.text()).slice(0, 500_000);
  return { finalUrl: res.url || url, html, status: res.status };
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c).trim() : '';
}

export function naverPlaceId(text) {
  return String(text || '').match(/(?:place|restaurant|cafe|bar|hairshop|accommodation)\/(\d{5,})/)?.[1] || null;
}
// 지도 검색 링크(map.naver.com/p/search/가게이름)에서 검색어를 꺼내요
const searchTerm = (url) => { try { return decodeURIComponent(new URL(url).pathname.match(/\/search\/([^/]+)/)?.[1] || ''); } catch { return ''; } };

function cleanTitle(t) {
  t = t.replace(/\s*[:|]\s*네이버.*$/, '').replace(/\s*-\s*네이버\s*(지도|플레이스)?$/, '').trim();
  return /^네이버\s*(지도|플레이스)?$/.test(t) ? '' : t;
}
function read(html) {
  const title = cleanTitle(meta(html, 'og:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim());
  const image = meta(html, 'og:image');
  return { title, image: /^https?:\/\//.test(image) ? image : '', description: meta(html, 'og:description') };
}

export async function fetchOg(url) {
  const first = await get(url);
  let best = read(first.html);
  const pid = naverPlaceId(first.finalUrl) || naverPlaceId(url) || naverPlaceId(first.html);

  // 지도 페이지는 og 정보가 빈약해서, 플레이스 페이지에서 다시 읽어요 (모바일 → PC 순서)
  if (pid && !(best.title && best.image)) {
    for (const u of [`https://m.place.naver.com/place/${pid}/home`, `https://pcmap.place.naver.com/place/${pid}/home`]) {
      try {
        const r = await get(u, 'https://map.naver.com/');
        const got = read(r.html);
        if (got.title || got.image) { best = { title: got.title || best.title, image: got.image || best.image, description: got.description || best.description }; }
        if (best.title && best.image) break;
      } catch { /* 다음 주소로 */ }
    }
  }
  if (!best.title) best.title = searchTerm(first.finalUrl) || searchTerm(url);
  if (!best.title && !best.image) {
    throw new OgError(first.status >= 400 ? `네이버가 요청을 막았어요 (HTTP ${first.status})` : '링크에서 가게 정보를 찾지 못했어요');
  }
  return { title: best.title.slice(0, 60), image: best.image, description: best.description.slice(0, 80), placeId: pid };
}
export { OgError };
