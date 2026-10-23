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
/* ---------- 술 종류 (고정 목록) ---------- */
export const DRINKS = [
  { id: 'beer', name: '맥주', sprite: 'beer' },
  { id: 'soju', name: '소주', sprite: 'soju' },
  { id: 'wine', name: '와인', sprite: 'wine' },
  { id: 'whisky', name: '위스키', sprite: 'whisky' },
  { id: 'etc', name: '그 외', sub: '사케·고량주 등', sprite: 'sake' },
  { id: 'corkage', name: '콜키지', sprite: 'corkage' },
];
export const drinkOf = (id) => DRINKS.find((d) => d.id === id);

// 장소가 친구 취향에 맞는지: 고른 음식이 있거나, (마시는 친구라면) 고른 술이 있으면 후보예요.
export const foodScore = (place, me) => (place.food_ids || []).filter((f) => (me.food_ids || []).includes(f)).length;
export const drinkScore = (place, me) => (me.drink === true ? (place.drink_ids || []).filter((d) => (me.drink_ids || []).includes(d)).length : 0);
export const matches = (place, me) => foodScore(place, me) > 0 || drinkScore(place, me) > 0;

// 네이버 지도 "공유 → 복사" 글에서 링크와 가게 이름을 뽑아요.
// 예) "[네이버 지도]\n을지로 와인바\n서울 중구 ...\nhttps://naver.me/abcd"
export function parseShare(text) {
  const raw = String(text || '');
  const url = raw.match(/https?:\/\/[^\s<>"'）)]+/)?.[0] || '';
  const header = /\[?\s*네이버\s*(지도|플레이스|map)\s*\]?/i;
  const hadHeader = header.test(raw);
  const lines = raw.replace(url, '\n').split(/\r?\n/).map((l) => l.replace(header, '').trim()).filter(Boolean);
  const looksLikeAddress = (l) => /(특별시|광역시|시|도|구|군|읍|면|동|로|길)\s*\d/.test(l);
  let name = '';
  if (lines.length && (hadHeader || lines.length > 1) && !looksLikeAddress(lines[0])) name = lines[0];
  return { url, name: name.slice(0, 60) };
}

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
  whisky: ['............', '............', '..g......g..', '..gwwOOOOg..', '..gwwwOOOg..', '..gOOOOOOg..', '..gOOOOOOg..', '..gyOOOOyg..', '..gggggggg..'],
  sake: ['....ww......', '....bb......', '...wwww.....', '..wwwwww....', '..wbbbbw....', '..wwwwww....', '..wwwwww.ww.', '...wwww..vv.'],
  corkage: ['....dd......', '....HH......', '....HH......', '...HHHH.....', '..HHHHHH....', '..HwwwwH.pp.', '..HwRRwH.pp.', '..HwwwwH....', '..HHHHHH....', '..HHHHHH....'],
  heart: ['............', '..pp...pp...', '.pPPp.pPPp..', '.pPPPpPPPp..', '.pPPPPPPPp..', '..pPPPPPp...', '...pPPPp....', '....pPp.....', '.....p......'],
};
export const FOOD_SPRITES = ['meat', 'sushi', 'pasta', 'rice', 'dumpling', 'chicken', 'heart'];

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
// 사진이 없을 때 쓰는 그림: 첫 음식 → 첫 술 → 집 모양
export const placeSprite = (place, foods) => foods.find((x) => x.id === (place.food_ids || [])[0])?.sprite || drinkOf((place.drink_ids || [])[0])?.sprite || 'place';
export function thumb(place, foods, cls = 'thumb') {
  if (place.photo_url) return `<img class="${cls}" src="${esc(place.photo_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">`;
  return `<img class="${cls} px" src="${spr(placeSprite(place, foods))}" alt="">`;
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
