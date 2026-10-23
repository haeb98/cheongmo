// 친구 화면: /r/:code
import { titleText, whenText, dday, shortDate, matches, img, thumb, bar, esc, safeUrl, toast, api, confetti, startBlink, spr } from './shared.js';

const app = document.getElementById('app');
const code = app.dataset.code;
const preview = new URLSearchParams(location.search).has('preview');

function deviceId() {
  try {
    let id = localStorage.getItem('cm_device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('cm_device', id); }
    return id;
  } catch { return (window.__cmDevice ||= crypto.randomUUID()); }
}
const DEVICE = preview ? 'preview-' + crypto.randomUUID() : deviceId();
const savedName = () => { try { return localStorage.getItem('cm_name') || ''; } catch { return ''; } };

let D = null;                 // 서버 데이터
let ui = { stage: 0, name: savedName(), showAll: false, peek: false };
let say = null, jump = false, popId = null, celebrated = false, busy = false, loadError = '';

const LINES = { 0: '어서와! 퀘스트 받으러 왔구나?', 1: '오늘 한잔 할 거야?', 2: '뭐 먹고 싶어? 여러 개 골라도 돼!', 3: '그럼 어디로 갈까? 하나만 골라줘!', 4: '퀘스트 완료! 그날 꼭 와~' };
const REACT = { y: ['오~ 달리자!!', '짠 준비 완료!'], n: ['음료수도 최고지!', '오케이 맑은 정신으로!'], food: ['냠냠! 좋아', '오 그거 맛있지', '배고파진다...'], place: ['좋은 선택!', '거기 분위기 좋대!'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const food = (id) => D.foods.find((f) => f.id === id);
const me = () => D.me;
const cnt = { drink: (v) => (v ? D.counts.drink.yes : D.counts.drink.no), food: (id) => D.counts.foods[id] || 0, place: (id) => D.counts.places[id] || 0 };
const isFinal = () => D.room.confirmed_place && D.places.some((p) => p.id === D.room.confirmed_place);

/* ---------- 데이터 ---------- */
async function load(first) {
  try {
    const next = await api(`/api/room?code=${encodeURIComponent(code)}&device=${encodeURIComponent(DEVICE)}`);
    if (preview && D) next.me = D.me, next.counts = D.counts; // 미리보기: 로컬 선택 유지
    const becameFinal = D && !isFinal() && next.room.confirmed_place;
    D = next; loadError = '';
    if (first && D.me?.name) ui.name = D.me.name;
    if (becameFinal) celebrated = false;
    render();
  } catch (e) {
    loadError = e.status === 404 ? '없는 초대장이에요. 링크를 다시 확인해 주세요.' : e.message;
    if (first || !D) render(); else toast(e.message);
  }
}

// 내 선택 변화를 집계에 바로 반영 (응답 오기 전 화면 갱신용)
function applyLocal(prev, next) {
  const c = D.counts, was = prev && prev.drink != null, now = next.drink != null;
  if (was) { c.players--; prev.drink ? c.drink.yes-- : c.drink.no--; prev.food_ids.forEach((f) => c.foods[f]--); if (prev.place_id) c.places[prev.place_id]--; }
  if (now) { c.players++; next.drink ? c.drink.yes++ : c.drink.no++; next.food_ids.forEach((f) => (c.foods[f] = (c.foods[f] || 0) + 1)); if (next.place_id) c.places[next.place_id] = (c.places[next.place_id] || 0) + 1; }
  D.me = next;
}

async function send(patch) {
  const prev = D.me ? { ...D.me, food_ids: [...D.me.food_ids] } : null;
  const next = { name: ui.name, drink: null, food_ids: [], place_id: null, ...(prev || {}), ...patch };
  applyLocal(prev, next);
  if (preview) return;
  busy = true;
  try {
    D = await api('/api/vote', { code, deviceId: DEVICE, name: ui.name, ...patch });
  } catch (e) {
    toast(e.message);
    await load();
  } finally { busy = false; }
}

/* ---------- 화면 ---------- */
const mascot = (line, big) => `<div class="mascot-row" ${big ? 'style="flex-direction:column;align-items:center"' : ''}>${img(jump ? 'happy' : 'mascot', 'mascot' + (jump ? ' jump' : ''))}<div class="bubble" ${big ? 'style="margin-bottom:0"' : ''}>${esc(line)}</div></div>`;
const hud = (st) => `<div class="hud"><span>STAGE ${st}/3</span><span class="pips">${[1, 2, 3].map((i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</span><span class="p1">P1 ${esc(ui.name)}</span></div>`;
const tags = (p) => `<div class="tags">${(p.food_ids || []).map(food).filter(Boolean).map((f) => `<span class="tg">${img(f.sprite)}${esc(f.name)}</span>`).join('')}<span class="tg ${p.alcohol ? 'alc' : 'noalc'}">${p.alcohol ? '술 OK' : '술 없음'}</span></div>`;

function introHTML() {
  const r = D.room;
  return `<div class="intro">${mascot(say || LINES[0], true)}
    <span class="invite">INVITATION · ${esc(r.name)}</span>
    <h1 class="big-title">${esc(titleText(D.settings))}</h1>
    <p class="sub">${D.counts.players}명 참여 중${r.deadline ? ` · ${shortDate(r.deadline)}까지 (${dday(r.deadline)})` : ''}</p>
    <label class="field">플레이어 이름<input id="g-name" maxlength="10" value="${esc(ui.name)}" placeholder="닉네임 입력" autocomplete="nickname" enterkeyhint="go"></label>
    <button class="pbtn pink big" data-g="start"><span class="blink">▶</span> ${me()?.drink != null ? 'CONTINUE' : 'PRESS START'}</button></div>`;
}
function stage1() {
  const m = me();
  return hud(1) + mascot(say || LINES[1]) + `<h2 class="stage-title"><small>DRINK OR NOT</small>음주 여부를 골라줘</h2>
    <div class="choices two">
      <button class="gcard ${popId === 'y' ? 'pop' : ''}" data-g="drink" data-v="1" aria-pressed="${m.drink === true}">${img('beer')}마신다!<span class="cnt">${cnt.drink(true)}명</span></button>
      <button class="gcard ${popId === 'n' ? 'pop' : ''}" data-g="drink" data-v="0" aria-pressed="${m.drink === false}">${img('juice')}안 마신다<span class="cnt">${cnt.drink(false)}명</span></button>
    </div><div class="spacer"></div>
    <div class="navrow dock"><button class="pbtn ghost" data-g="back" aria-label="이전">◀</button><button class="pbtn mint" data-g="next" ${m.drink == null ? 'disabled' : ''}>다음 ▶</button></div>`;
}
function stage2() {
  const m = me();
  return hud(2) + mascot(say || LINES[2]) + `<h2 class="stage-title"><small>PICK YOUR FOOD</small>먹고 싶은 걸 다 골라줘</h2>
    <div class="choices three">${D.foods.map((f) => `<button class="gcard ${popId === f.id ? 'pop' : ''}" data-g="food" data-v="${f.id}" aria-pressed="${m.food_ids.includes(f.id)}">${img(f.sprite)}${esc(f.name)}<span class="cnt">${cnt.food(f.id)}명</span></button>`).join('')}</div>
    <div class="spacer"></div>
    <div class="navrow dock"><button class="pbtn ghost" data-g="back" aria-label="이전">◀</button><button class="pbtn mint" data-g="next" ${m.food_ids.length ? '' : 'disabled'}>다음 ▶ ${m.food_ids.length ? `(${m.food_ids.length}개)` : ''}</button></div>`;
}
function stage3() {
  const m = me();
  const ok = D.places.filter((x) => matches(x, m)), other = D.places.filter((x) => !matches(x, m));
  const sc = (x) => x.food_ids.filter((f) => m.food_ids.includes(f)).length;
  ok.sort((a, b) => sc(b) - sc(a) || cnt.place(b.id) - cnt.place(a.id));
  const max = Math.max(1, ...D.places.map((x) => cnt.place(x.id)));
  const card = (x, dim) => `<button class="place ${dim ? 'dim' : ''}" data-g="place" data-v="${x.id}" aria-pressed="${m.place_id === x.id}">${thumb(x, D.foods)}
    <div class="pi-main"><span class="pl-title">${esc(x.title)}${!dim && sc(x) > 1 ? '<span class="badge match">취향저격</span>' : ''}</span>
    ${x.memo ? `<span class="mini">${esc(x.memo)}</span>` : ''}${tags(x)}
    ${safeUrl(x.url) ? `<a class="c-link" href="${esc(x.url)}" target="_blank" rel="noopener" data-stop>네이버에서 보기 ↗</a>` : ''}
    <div class="meter"><div class="track"><i style="width:${(cnt.place(x.id) / max) * 100}%"></i></div><b>${cnt.place(x.id)}표</b></div></div></button>`;
  if (!D.places.length) return hud(3) + mascot('아직 장소 후보가 없어! 조금만 기다려줘') + `<div class="spacer"></div><div class="navrow dock"><button class="pbtn ghost" data-g="back">◀</button><button class="pbtn" data-g="reload">새로고침</button></div>`;
  return hud(3) + mascot(say || (ok.length ? LINES[3] : '딱 맞는 곳이 없네! 전체에서 골라줘')) + `<h2 class="stage-title"><small>CHOOSE THE STAGE</small>${ok.length ? `네 취향에 맞는 장소 ${ok.length}곳` : '전체 장소'}</h2>
    <div class="choices">${(ok.length ? ok : other).map((x) => card(x, false)).join('')}
    ${ok.length && other.length ? (ui.showAll ? other.map((x) => card(x, true)).join('') + `<button class="more" data-g="toggleall">다른 장소 접기</button>` : `<button class="more" data-g="toggleall">조건에 안 맞는 장소 ${other.length}곳도 보기</button>`) : ''}</div>
    <div class="spacer"></div>
    <div class="navrow dock"><button class="pbtn ghost" data-g="back" aria-label="이전">◀</button><button class="pbtn pink" data-g="next" ${m.place_id ? '' : 'disabled'}>선택 완료 ★</button></div>`;
}
function stage4() {
  const m = me(), pl = D.places.find((x) => x.id === m.place_id);
  const rank = [...D.places].sort((a, b) => cnt.place(b.id) - cnt.place(a.id)).slice(0, 3), max = Math.max(1, ...rank.map((x) => cnt.place(x.id)));
  return `<p class="clear" style="padding-top:16px">STAGE CLEAR!</p>` + mascot(say || LINES[4]) + `
    <div class="summary"><div><span class="k">DRINK</span>${m.drink ? '마신다!' : '안 마신다'}</div>
    <div><span class="k">FOOD</span>${m.food_ids.map(food).filter(Boolean).map((f) => esc(f.name)).join(', ')}</div>
    <div><span class="k">PLACE</span>${esc(pl?.title || '-')}</div></div>
    <div class="stat"><h3>지금 순위 · ${D.counts.players}/${D.room.headcount}명 참여</h3>${rank.map((x, i) => bar(thumb(x, D.foods, 'px-ico'), `${i + 1}위 ${esc(x.title)}`, cnt.place(x.id), max, i === 0 && cnt.place(x.id) > 0)).join('')}</div>
    <div class="spacer"></div>
    <div class="dock"><button class="pbtn" data-g="redo" style="width:100%">선택 바꾸기</button></div>`;
}
function finalHTML() {
  const r = D.room, pl = D.places.find((x) => x.id === r.confirmed_place);
  const f = food(pl.food_ids[0]);
  const hero = pl.photo_url ? `<img class="hero" src="${esc(pl.photo_url)}" alt="" referrerpolicy="no-referrer">` : `<img class="hero px" src="${spr(f?.sprite || 'place')}" alt="">`;
  return `<p class="clear" style="padding-top:16px">QUEST COMPLETE!</p>${mascot('장소 정해졌어! 그날 꼭 봐~')}
    <span class="invite">${esc(r.name)} · ${esc(titleText(D.settings))}</span>
    <div class="final-card">${hero}<div class="final-body">
      <span class="badge" style="justify-self:start">확정된 장소</span>
      <span class="pl-title">${esc(pl.title)}</span>
      ${whenText(r) ? `<span class="when">${esc(whenText(r))}</span>` : ''}
      ${pl.memo ? `<span class="mini">${esc(pl.memo)}</span>` : ''}${tags(pl)}
      ${r.final_note ? `<span class="note">${esc(r.final_note)}</span>` : ''}
      ${safeUrl(pl.url) ? `<a class="pbtn mint" style="text-align:center;text-decoration:none" href="${esc(pl.url)}" target="_blank" rel="noopener">네이버 지도에서 길찾기 ↗</a>` : ''}
      <span class="votes-line">${D.counts.players}명 참여 · ${cnt.place(pl.id)}표로 선정</span>
    </div></div><div class="spacer"></div>
    <div class="dock"><button class="pbtn" data-g="peek" style="width:100%">전체 투표 결과 보기</button></div>`;
}
function resultsHTML() {
  const { yes, no } = D.counts.drink;
  const fs = [...D.foods].sort((a, b) => cnt.food(b.id) - cnt.food(a.id)), fm = Math.max(1, ...fs.map((f) => cnt.food(f.id)));
  const ps = [...D.places].sort((a, b) => cnt.place(b.id) - cnt.place(a.id)), pm = Math.max(1, ...ps.map((x) => cnt.place(x.id)));
  return `<div class="hud"><span>RESULT</span><span class="p1">${D.counts.players}/${D.room.headcount}명 참여</span></div>
    <h2 class="stage-title"><small>FINAL SCORE</small>투표는 마감됐어요</h2>
    <div class="stat"><h3>음주 여부</h3>${yes + no ? `<div class="split"><span class="y" style="flex-grow:${yes || 0.001}">${yes ? '마신다 ' + yes : ''}</span><span class="n" style="flex-grow:${no || 0.001}">${no ? '안 마신다 ' + no : ''}</span></div>` : ''}</div>
    <div class="stat"><h3>음식</h3>${fs.map((f, i) => bar(img(f.sprite), esc(f.name), cnt.food(f.id), fm, i === 0)).join('')}</div>
    <div class="stat"><h3>장소</h3>${ps.map((x) => bar(thumb(x, D.foods, 'px-ico'), esc(x.title) + (x.id === D.room.confirmed_place ? ' <span class="badge">확정</span>' : ''), cnt.place(x.id), pm, x.id === D.room.confirmed_place)).join('')}</div>
    <div class="spacer"></div>
    <div class="dock"><button class="pbtn pink" data-g="peek" style="width:100%">◀ 발표 화면으로</button></div>`;
}

function render() {
  let body;
  if (loadError && !D) body = `<div class="g"><div class="intro">${mascot(loadError, true)}</div></div>`;
  else if (!D) body = `<div class="loading">LOADING...</div>`;
  else if (isFinal()) body = `<div class="g">${ui.peek ? resultsHTML() : finalHTML()}</div>`;
  else if (ui.stage === 0 || !me()) body = `<div class="g">${introHTML()}</div>`;
  else body = `<div class="g">${[null, stage1, stage2, stage3, stage4][ui.stage]()}</div>`;
  app.innerHTML = (preview ? '<div class="preview-banner">미리보기 · 여기서 고른 건 저장되지 않아요</div>' : '') + body;
  app.querySelectorAll('.px-ico').forEach((e) => { e.style.width = '28px'; e.style.height = '28px'; e.style.objectFit = 'cover'; });
  if (D && !celebrated && (isFinal() ? !ui.peek : ui.stage === 4)) { celebrated = true; confetti(document.body); }
  if (D) document.title = titleText(D.settings);
  jump = false; popId = null;
}
const go = (stage) => { ui.stage = stage; say = null; render(); scrollTo(0, 0); };

/* ---------- 이벤트 ---------- */
async function start() {
  const nm = (document.getElementById('g-name')?.value || '').trim().slice(0, 10);
  if (!nm) { toast('플레이어 이름을 적어 주세요'); document.getElementById('g-name')?.focus(); return; }
  ui.name = nm; try { localStorage.setItem('cm_name', nm); } catch { /* 저장 불가 */ }
  const back = me()?.place_id;
  if (!me() || me().name !== nm) await send({ name: nm });
  jump = true; say = back ? `${nm} 다시 왔구나!` : null; celebrated = !!back;
  ui.stage = back ? 4 : 1; render(); scrollTo(0, 0);
}

app.addEventListener('click', async (e) => {
  if (e.target.closest('a[data-stop]')) return;
  const t = e.target.closest('[data-g]'); if (!t || !D) return;
  const a = t.dataset.g, m = me();
  if (a === 'start') return start();
  if (a === 'peek') { ui.peek = !ui.peek; render(); scrollTo(0, 0); return; }
  if (a === 'reload') return load();
  if (a === 'back') return go(ui.stage - 1);
  if (a === 'next') { if (ui.stage === 3) { celebrated = false; jump = true; } return go(Math.min(4, ui.stage + 1)); }
  if (a === 'redo') { go(1); say = '다시 골라볼까?'; render(); return; }
  if (a === 'toggleall') { ui.showAll = !ui.showAll; render(); return; }
  if (a === 'drink') {
    const v = t.dataset.v === '1'; popId = v ? 'y' : 'n'; say = pick(v ? REACT.y : REACT.n); jump = true;
    send({ drink: v }); render(); return;
  }
  if (a === 'food') {
    const id = t.dataset.v, on = !m.food_ids.includes(id);
    if (on) { popId = id; say = pick(REACT.food); jump = true; }
    send({ food_ids: on ? [...m.food_ids, id] : m.food_ids.filter((x) => x !== id) }); render(); return;
  }
  if (a === 'place') {
    say = pick(REACT.place); jump = true;
    send({ place_id: t.dataset.v }); render(); return;
  }
});
app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'g-name') { e.preventDefault(); start(); } });
app.addEventListener('input', (e) => { if (e.target.id === 'g-name') ui.name = e.target.value; });

startBlink();
render();
if (!code) { loadError = '없는 초대장이에요. 링크를 다시 확인해 주세요.'; render(); }
else {
  await load(true);
  setInterval(() => { if (document.visibilityState === 'visible' && !busy && ui.stage !== 0) load(); }, 10000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !busy) load(); });
}
