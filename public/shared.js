// 브라우저와 서버(api/r.js)가 같이 쓰는 코드: 제목 문구, 날짜 표기, 픽셀 스프라이트.

/* ---------- 문구 ---------- */
export const batchim = (s) => { const c = (s || '').charCodeAt((s || '').length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
export function titles(host) {
  const h = host || '친구', i = batchim(h) ? '이' : '';
  return [
    `${h}의 청모에 초대합니당~`,
    `${h}${i} 결혼한대요!! 청모 퀘스트 오픈`,
    `${h}${i}랑 밥 먹을 사람 여기 붙어라~`,
    `청첩장 받으러 올 용사 모집 (feat. ${h})`,
  ];
}
export const titleText = (s) => (s.title_idx === 4 && s.custom_title ? s.custom_title : titles(s.host)[s.title_idx] || titles(s.host)[0]);

export function whenText(room) {
  if (!room.final_date) return '';
  const d = new Date(room.final_date + 'T00:00:00');
  let s = `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
  if (room.final_time) {
    const [h, m] = room.final_time.split(':').map(Number);
    s += ` ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시${m ? ' ' + m + '분' : ''}`;
  }
  return s;
}
export function dday(date) {
  if (!date) return '';
  const n = Math.ceil((new Date(date + 'T23:59:59+09:00') - new Date()) / 864e5);
  return n < 0 ? '마감됨' : n === 0 ? '오늘 마감' : 'D-' + n;
}
export const shortDate = (d) => (d ? d.slice(5).replace('-', '.') : '');
export const matches = (place, me) => (me.drink !== true || place.alcohol) && (place.food_ids || []).some((f) => (me.food_ids || []).includes(f));

/* ---------- 픽셀 스프라이트 ---------- */
export const PAL = { w: '#F4F1FF', v: '#C9C2E8', k: '#14121C', h: '#FF9BC4', p: '#FF5FA2', P: '#FF9CC8', r: '#7A3324', R: '#C8553D', y: '#D9A22E', Y: '#FFD84D', o: '#D9662A', O: '#FF9F4A', g: '#AEB8CC', G: '#3FBF7F', H: '#2B8A5A', b: '#3D5AFE', B: '#7B95FF', c: '#C9B07E', C: '#F3E6C4', d: '#6B4A2E' };
export const SPR = {
  mascot: ['..............', '....pp..pp....', '...pPPppPPp...', '....ppPPpp....', '.....pppp.....', '...wwwwwwww...', '..wwwwwwwwww..', '.wwwkwwwwkwww.', '.wwwkwwwwkwww.', '.whhwwwwwwhhw.', '.wwwwwkkwwwww.', '.wwwwwwwwwwww.', '.vvwwwwwwwwvv.', '.vv.vv..vv.vv.'],
  blink: ['..............', '....pp..pp....', '...pPPppPPp...', '....ppPPpp....', '.....pppp.....', '...wwwwwwww...', '..wwwwwwwwww..', '.wwwwwwwwwwww.', '.wwkkwwwwkkww.', '.whhwwwwwwhhw.', '.wwwwwkkwwwww.', '.wwwwwwwwwwww.', '.vvwwwwwwwwvv.', '.vv.vv..vv.vv.'],
  happy: ['..............', '....pp..pp....', '...pPPppPPp...', '....ppPPpp....', '.....pppp.....', '...wwwwwwww...', '..wwwwwwwwww..', '.wwwkwwwwkwww.', '.wwkwkwwkwkww.', '.whhwwwwwwhhw.', '.wwwwkkkkwwww.', '.wwwwwhhwwwww.', '.vvwwwwwwwwvv.', '.vv.vv..vv.vv.'],
  beer: ['............', '..wwwwwww...', '.wwwwwwwww..', '.yYYYYYYy...', '.yYwYYYYyoo.', '.yYwYYYYy.o.', '.yYYYYYYy.o.', '.yYYYYYYyoo.', '.yYYYYYYy...', '.yyyyyyyy...', '............'],
  wine: ['...gggggg...', '...gRRRRg...', '...gRRRRg...', '....gRRg....', '.....gg.....', '.....gg.....', '.....gg.....', '...gggggg...'],
  soju: ['.....GG.....', '.....GG.....', '....GGGG....', '...GGGGGG...', '...GwwwwG...', '...GwbbwG...', '...GwwwwG...', '...GGGGGG...', '...HHHHHH...'],
  juice: ['.......P....', '......P.....', '.....P......', '...wwPwww...', '...wOOOOw...', '...wOYOOw...', '....wOOw....', '....wOOw....', '....wwww....'],
  meat: ['............', '...rrrrr....', '..rRRRRRr...', '.rRRwwRRRr..', '.rRRRRwRRr..', '.rRRRRRRRr..', '..rRRRRRr.ww', '...rrrrrrwww', '.........ww.'],
  sushi: ['............', '..oooooooo..', '.oOwOOwOOOo.', '.oooooooooo.', '.wwwwwwwwww.', '.wvwwwwwvww.', '.wwwwwwwwww.', '..vvvvvvvv..'],
  pasta: ['...YYYYY....', '..YyYyYyY...', '.YyYRRYyYy..', '.yYYRRYyYy..', 'wwyYyYyYyyww', '.wwwwwwwwww.', '...vvvvvv...'],
  rice: ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', 'bbbbbbbbbbbb', '.bBBBBBBBBb.', '..bBpBBpBb..', '...bbbbbb...', '....bbbb....'],
  dumpling: ['....c.c.c...', '...cCcCcCc..', '..cCCCCCCCc.', '.cCCCCCCCCCc', '.cCCCCCCCCCc', '..cccccccccc'],
  chicken: ['.....ooo....', '...oOOOOo...', '..oOOOOOOo..', '..oOOYOOOo..', '...oOOOOo...', '....oOOo....', '.....ww.....', '....w..w....'],
  place: ['.....pp.....', '....pPPp....', '...pPPPPp...', '..pPPPPPPp..', '..wwwwwwww..', '..wYwwwwYw..', '..wwwwwwww..', '..wYwwdwYw..', '..wwwwdwww..'],
  heart: ['............', '..pp...pp...', '.pPPp.pPPp..', '.pPPPpPPPp..', '.pPPPPPPPp..', '..pPPPPPp...', '...pPPPp....', '....pPp.....', '.....p......'],
};
export const FOOD_SPRITES = ['meat', 'sushi', 'pasta', 'rice', 'dumpling', 'chicken', 'wine', 'soju', 'beer', 'juice', 'heart'];

const spCache = {};
export function spr(name) {
  if (spCache[name]) return spCache[name];
  const rows = SPR[name] || SPR.heart, w = Math.max(...rows.map((r) => r.length)), h = rows.length, s = Math.max(w, h);
  const c = document.createElement('canvas'); c.width = s; c.height = s; const x = c.getContext('2d');
  const ox = Math.floor((s - w) / 2), oy = Math.floor((s - h) / 2);
  rows.forEach((r, y) => [...r.padEnd(w, '.')].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(ox + i, oy + y, 1, 1); } }));
  return (spCache[name] = c.toDataURL());
}

/* ---------- 브라우저 공용 ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
export const img = (n, cls = '') => `<img class="px ${cls}" src="${spr(n)}" alt="">`;
export function thumb(place, foods, cls = 'thumb') {
  if (place.photo_url) return `<img class="${cls}" src="${esc(place.photo_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">`;
  const f = foods.find((x) => x.id === (place.food_ids || [])[0]);
  return `<img class="${cls} px" src="${spr(f?.sprite || 'place')}" alt="">`;
}
export function bar(icon, label, n, max, win, tools = '') {
  return `<div class="brow ${win ? 'win' : ''}">${icon}<span class="lab">${label}</span><span class="num">${n}표</span><div class="track"><i style="width:${max ? (n / max) * 100 : 0}%"></i></div>${tools ? `<div class="tools">${tools}</div>` : ''}</div>`;
}
let toastTimer;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
  document.body.appendChild(d); clearTimeout(toastTimer); toastTimer = setTimeout(() => d.remove(), 2400);
}
export async function api(path, body) {
  const res = await fetch(path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch { /* 빈 응답 */ }
  if (!res.ok) { const e = new Error(data.error || '네트워크 문제가 생겼어요. 다시 시도해 주세요'); e.status = res.status; throw e; }
  return data;
}
export async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { window.prompt('아래 내용을 복사하세요', text); }
}
export function confetti(host) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !host) return;
  const d = document.createElement('div'); d.className = 'confetti';
  const cols = ['var(--pink)', 'var(--mint)', 'var(--yellow)', 'var(--sky)'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 4];
    s.style.animationDuration = 1.4 + Math.random() * 1.6 + 's'; s.style.animationDelay = Math.random() * 0.5 + 's'; d.appendChild(s);
  }
  host.appendChild(d); setTimeout(() => d.remove(), 4000);
}
export function startBlink() {
  setInterval(() => {
    document.querySelectorAll('.mascot:not(.jump)').forEach((m) => { m.src = spr('blink'); setTimeout(() => { m.src = spr('mascot'); }, 160); });
  }, 3200);
}
