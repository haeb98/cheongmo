// GET /r/:code (vercel.json 이 /api/r?code= 로 넘겨줌)
// 카톡 미리보기용 og 태그를 방마다 채운 친구 화면 HTML을 돌려줍니다.
import { roomByCode, getSettings } from './_lib/store.js';
import { titleText, whenText } from '../public/shared.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page({ title, desc, origin, code, url }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${origin}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url)}">
<meta name="theme-color" content="#07070B">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Jua&family=Press+Start+2P&display=swap">
<link rel="stylesheet" href="/style.css">
</head><body class="guest-page"><div id="app" data-code="${esc(code)}"></div>
<script type="module" src="/guest.js"></script></body></html>`;
}

export async function GET(request) {
  const u = new URL(request.url);
  const origin = `${u.protocol}//${request.headers.get('x-forwarded-host') || u.host}`;
  const code = (u.searchParams.get('code') || '').slice(0, 20);
  const html = (status, body) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  try {
    const [room, settings] = await Promise.all([roomByCode(code), getSettings()]);
    const title = titleText(settings);
    const when = whenText(room);
    const desc = room.confirmed_place ? `장소 확정! ${when ? when + ' · ' : ''}눌러서 확인해 주세요` : `${room.name} · 어디서 뭘 먹을지 같이 골라 주세요!`;
    return html(200, page({ title, desc, origin, code: room.code, url: `${origin}/r/${room.code}` }));
  } catch (e) {
    const notFound = e?.status === 404;
    if (!notFound) console.error(e);
    return html(notFound ? 404 : 500, page({ title: notFound ? '없는 초대장이에요' : '잠시 후 다시 열어 주세요', desc: '', origin, code: '', url: origin }));
  }
}
