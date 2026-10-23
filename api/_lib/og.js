// 네이버 지도/플레이스 등 링크에서 가게 이름·사진·설명을 가져옵니다 (og 태그).
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function blockedHost(host) {
  const h = host.toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^(\d+\.){3}\d+$/.test(h) || h.includes(':') || h.startsWith('[');
}

async function get(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || blockedHost(u.hostname)) throw new Error('지원하지 않는 링크예요');
  const res = await fetch(u, { redirect: 'follow', headers: { 'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9' }, signal: AbortSignal.timeout(7000) });
  const html = (await res.text()).slice(0, 400_000);
  return { finalUrl: res.url || url, html };
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c).trim() : '';
}

export function naverPlaceId(url) {
  return url.match(/(?:place|restaurant|cafe|bar|hairshop|accommodation)\/(\d{5,})/)?.[1] || null;
}

export async function fetchOg(url) {
  let { finalUrl, html } = await get(url);
  const pid = naverPlaceId(finalUrl) || naverPlaceId(url);
  // 지도 페이지는 og 정보가 빈약해서, 모바일 플레이스 페이지에서 다시 읽어요.
  if (pid && !/m\.place\.naver\.com/.test(finalUrl)) {
    try { ({ finalUrl, html } = await get(`https://m.place.naver.com/place/${pid}/home`)); } catch { /* 원래 페이지 정보로 진행 */ }
  }
  let title = meta(html, 'og:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
  title = title.replace(/\s*[:|-]\s*네이버.*$/, '').replace(/\s*-\s*네이버\s*지도$/, '').trim();
  if (/^네이버\s*(지도|플레이스)?$/.test(title)) title = '';
  const image = meta(html, 'og:image');
  const description = meta(html, 'og:description');
  return { title: title.slice(0, 60), image: /^https?:\/\//.test(image) ? image : '', description: description.slice(0, 80), finalUrl };
}
