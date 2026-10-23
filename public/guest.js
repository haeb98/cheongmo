// 친구 화면: /r/:code
import { titleText, whenText, dday, shortDate, matches, foodScore, drinkScore, DRINKS, drinkOf, placeSprite, img, thumb, bar, esc, safeUrl, toast, api, confetti, startBlink, spr } from './shared.js';

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
let ui = { step: null, name: savedName(), showAll: false, peek: false }; // step: null = 초대장
let say = null, jump = false, popId = null, celebrated = false, busy = false, loadError = '';

const LINES = { intro: '어서와! 퀘스트 받으러 왔구나?', drink: '오늘 한잔 할 거야?', drinks: '뭐 마시고 싶어? 여러 개 골라도 돼!', food: '뭐 먹고 싶어? 여러 개 골라도 돼!', place: '그럼 어디로 갈까? 하나만 골라줘!', clear: '퀘스트 완료! 그날 꼭 와~' };
// 마시는 친구만 술 종류 단계를 거쳐요
const steps = () => (D.me?.drink === true ? ['drink', 'drinks', 'food', 'place', 'clear'] : ['drink', 'food', 'place', 'clear']);
const REACT = { y: ['오~ 달리자!!', '짠 준비 완료!'], n: ['음료수도 최고지!', '오케이 맑은 정신으로!'], drinks: ['캬~ 좋지', '오 취향 확실하네!', '짠 하자!'], food: ['냠냠! 좋아', '오 그거 맛있지', '배고파진다...'], place: ['좋은 선택!', '거기 분위기 좋대!'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const food = (id) => D.foods.find((f) => f.id === id);
const me = () => D.me;
const cnt = { drink: (v) => (v ? D.counts.drink.yes : D.counts.drink.no), drinks: (id) => D.counts.drinks?.[id] || 0, food: (id) => D.counts.foods[id] || 0, place: (id) => D.counts.places[id] || 0 };
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
  c.drinks ||= {};
  if (was) { c.players--; prev.drink ? c.drink.yes-- : c.drink.no--; if (prev.drink) prev.drink_ids.forEach((d) => c.drinks[d]--); prev.food_ids.forEach((f) => c.foods[f]--); if (prev.place_id) c.places[prev.place_id]--; }
  if (now) { c.players++; next.drink ? c.drink.yes++ : c.drink.no++; if (next.drink) next.drink_ids.forEach((d) => (c.drinks[d] = (c.drinks[d] || 0) + 1)); next.food_ids.forEach((f) => (c.foods[f] = (c.foods[f] || 0) + 1)); if (next.place_id) c.places[next.place_id] = (c.places[next.place_id] || 0) + 1; }
  D.me = next;
}

async function send(patch) {
  const prev = D.me ? { ...D.me, food_ids: [...D.me.food_ids], drink_ids: [...(D.me.drink_ids || [])] } : null;
  const next = { name: ui.name, drink: null, drink_ids: [], food_ids: [], place_id: null, ...(prev || {}), ...patch };
  if (next.drink === false) next.drink_ids = [];
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
function hud() {
  const all = steps().slice(0, -1), st = all.indexOf(ui.step) + 1;
  return `<div class="hud"><span>STAGE ${st}/${all.length}</span><span class="pips">${all.map((_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</span><span class="p1">P1 ${esc(ui.name)}</span></div>`;
}
// 장소 태그: 음식 + 술 종류. 친구가 고른 것과 겹치면 강조
function tags(p, m) {
  const fHit = (id) => m && m.food_ids.includes(id), dHit = (id) => m && m.drink === true && (m.drink_ids || []).includes(id);
  return `<div class="tags">${(p.food_ids || []).map(food).filter(Boolean).map((f) => `<span class="tg ${fHit(f.id) ? 'hit' : ''}">${img(f.sprite)}${esc(f.name)}</span>`).join('')}${(p.drink_ids || []).map(drinkOf).filter(Boolean).map((d) => `<span class="tg drink ${dHit(d.id) ? 'hit' : ''}">${img(d.sprite)}${esc(d.name)}</span>`).join('')}</div>`;
}
const nav = (ok, label = '다음 ▶', cls = 'mint') => `<div class="navrow dock"><button class="pbtn ghost" data-g="back" aria-label="이전">◀</button><button class="pbtn ${cls}" data-g="next" ${ok ? '' : 'disabled'}>${label}</button></div>`;

function introHTML() {
  const r = D.room;
  return `<div class="intro">${mascot(say || LINES.intro, true)}
    <span class="invite">INVITATION · ${esc(r.name)}</span>
    <h1 class="big-title">${esc(titleText(D.settings))}</h1>
    <p class="sub">${D.counts.players}명 참여 중${r.deadline ? ` · ${shortDate(r.deadline)}까지 (${dday(r.deadline)})` : ''}</p>
    <label class="field">플레이어 이름<input id="g-name" maxlength="10" value="${esc(ui.name)}" placeholder="닉네임 입력" autocomplete="nickname" enterkeyhint="go"></label>
    <button class="pbtn pink big" data-g="start"><span class="blink">▶</span> ${me()?.drink != null ? 'CONTINUE' : 'PRESS START'}</button></div>`;
}
function stageDrink() {
  const m = me();
  return hud() + mascot(say || LINES.drink) + `<h2 class="stage-title"><small>DRINK OR NOT</small>음주 여부를 골라줘</h2>
    <div class="choices two">
      <button class="gcard ${popId === 'y' ? 'pop' : ''}" data-g="drink" data-v="1" aria-pressed="${m.drink === true}">${img('beer')}마신다!<span class="cnt">${cnt.drink(true)}명</span></button>
      <button class="gcard ${popId === 'n' ? 'pop' : ''}" data-g="drink" data-v="0" aria-pressed="${m.drink === false}">${img('juice')}안 마신다<span class="cnt">${cnt.drink(false)}명</span></button>
    </div><div class="spacer"></div>` + nav(m.drink != null);
}
function stageDrinks() {
  const m = me(), n = m.drink_ids.length;
  return hud() + mascot(say || LINES.drinks) + `<h2 class="stage-title"><small>PICK YOUR DRINK</small>마시고 싶은 술을 다 골라줘</h2>
    <div class="choices three">${DRINKS.map((d) => `<button class="gcard ${popId === d.id ? 'pop' : ''}" data-g="drinks" data-v="${d.id}" aria-pressed="${m.drink_ids.includes(d.id)}">${img(d.sprite)}${esc(d.name)}${d.sub ? `<span class="sub">${esc(d.sub)}</span>` : ''}<span class="cnt">${cnt.drinks(d.id)}명</span></button>`).join('')}</div>
    <p class="hint" style="margin:0">콜키지는 술을 직접 가져갈 수 있는 곳이에요.</p>
    <div class="spacer"></div>` + nav(n > 0, `다음 ▶ ${n ? `(${n}개)` : ''}`);
}
function stageFood() {
  const m = me(), n = m.food_ids.length;
  return hud() + mascot(say || LINES.food) + `<h2 class="stage-title"><small>PICK YOUR FOOD</small>먹고 싶은 걸 다 골라줘</h2>
    <div class="choices three">${D.foods.map((f) => `<button class="gcard ${popId === f.id ? 'pop' : ''}" data-g="food" data-v="${f.id}" aria-pressed="${m.food_ids.includes(f.id)}">${img(f.sprite)}${esc(f.name)}<span class="cnt">${cnt.food(f.id)}명</span></button>`).join('')}</div>
    <div class="spacer"></div>` + nav(n > 0, `다음 ▶ ${n ? `(${n}개)` : ''}`);
}
function stagePlace() {
  const m = me();
  const ok = D.places.filter((x) => matches(x, m)), other = D.places.filter((x) => !matches(x, m));
  const sc = (x) => foodScore(x, m) + drinkScore(x, m);
  // 음식과 술이 둘 다 맞으면 "취향저격" (안 마시는 친구는 음식이 2개 이상 맞을 때)
  const perfect = (x) => (m.drink === true ? foodScore(x, m) > 0 && drinkScore(x, m) > 0 : foodScore(x, m) > 1);
  ok.sort((a, b) => perfect(b) - perfect(a) || sc(b) - sc(a) || cnt.place(b.id) - cnt.place(a.id));
  const max = Math.max(1, ...D.places.map((x) => cnt.place(x.id)));
  const card = (x, dim) => `<button class="place ${dim ? 'dim' : ''}" data-g="place" data-v="${x.id}" aria-pressed="${m.place_id === x.id}">${thumb(x, D.foods)}
    <div class="pi-main"><span class="pl-title">${esc(x.title)}${!dim && perfect(x) ? '<span class="badge match">취향저격</span>' : ''}</span>
    ${x.memo ? `<span class="mini">${esc(x.memo)}</span>` : ''}${tags(x, m)}
    ${safeUrl(x.url) ? `<a class="c-link" href="${esc(x.url)}" target="_blank" rel="noopener" data-stop>네이버에서 보기 ↗</a>` : ''}
    <div class="meter"><div class="track"><i style="width:${(cnt.place(x.id) / max) * 100}%"></i></div><b>${cnt.place(x.id)}표</b></div></div></button>`;
  if (!D.places.length) return hud() + mascot('아직 장소 후보가 없어! 조금만 기다려줘') + `<div class="spacer"></div><div class="navrow dock"><button class="pbtn ghost" data-g="back">◀</button><button class="pbtn" data-g="reload">새로고침</button></div>`;
  return hud() + mascot(say || (ok.length ? LINES.place : '딱 맞는 곳이 없네! 전체에서 골라줘')) + `<h2 class="stage-title"><small>CHOOSE THE STAGE</small>${ok.length ? `네 취향에 맞는 장소 ${ok.length}곳` : '전체 장소'}</h2>
    ${ok.length ? `<p class="hint" style="margin:0">고른 ${m.drink === true ? '음식이나 술' : '음식'}이 있는 곳이에요. 겹치는 태그는 초록색으로 보여요.</p>` : ''}
    <div class="choices">${(ok.length ? ok : other).map((x) => card(x, false)).join('')}
    ${ok.length && other.length ? (ui.showAll ? other.map((x) => card(x, true)).join('') + `<button class="more" data-g="toggleall">다른 장소 접기</button>` : `<button class="more" data-g="toggleall">조건에 안 맞는 장소 ${other.length}곳도 보기</button>`) : ''}</div>
    <div class="spacer"></div>` + nav(!!m.place_id, '선택 완료 ★', 'pink');
}
function stageClear() {
  const m = me(), pl = D.places.find((x) => x.id === m.place_id);
  const rank = [...D.places].sort((a, b) => cnt.place(b.id) - cnt.place(a.id)).slice(0, 3), max = Math.max(1, ...rank.map((x) => cnt.place(x.id)));
  const drinks = m.drink ? (m.drink_ids || []).map(drinkOf).filter(Boolean).map((d) => d.name).join(', ') : '';
  return `<p class="clear" style="padding-top:16px">STAGE CLEAR!</p>` + mascot(say || LINES.clear) + `
    <div class="summary"><div><span class="k">DRINK</span>${m.drink ? `마신다! ${drinks ? '· ' + esc(drinks) : ''}` : '안 마신다'}</div>
    <div><span class="k">FOOD</span>${m.food_ids.map(food).filter(Boolean).map((f) => esc(f.name)).join(', ')}</div>
    <div><span class="k">PLACE</span>${esc(pl?.title || '-')}</div></div>
    <div class="stat"><h3>지금 순위 · ${D.counts.players}/${D.room.headcount}명 참여</h3>${rank.map((x, i) => bar(thumb(x, D.foods, 'px-ico'), `${i + 1}위 ${esc(x.title)}`, cnt.place(x.id), max, i === 0 && cnt.place(x.id) > 0)).join('')}</div>
    <div class="spacer"></div>
    <div class="dock"><button class="pbtn" data-g="redo" style="width:100%">선택 바꾸기</button></div>`;
}
const STAGES = { drink: stageDrink, drinks: stageDrinks, food: stageFood, place: stagePlace, clear: stageClear };
function finalHTML() {
  const r = D.room, pl = D.places.find((x) => x.id === r.confirmed_place);
  const hero = pl.photo_url ? `<img class="hero" src="${esc(pl.photo_url)}" alt="" referrerpolicy="no-referrer">` : `<img class="hero px" src="${spr(placeSprite(pl, D.foods))}" alt="">`;
  return `<p class="clear" style="padding-top:16px">QUEST COMPLETE!</p>${mascot('장소 정해졌어! 그날 꼭 봐~')}
    <span class="invite">${esc(r.name)} · ${esc(titleText(D.settings))}</span>
    <div class="final-card">${hero}<div class="final-body">
      <span class="badge" style="justify-self:start">확정된 장소</span>
      <span class="pl-title">${esc(pl.title)}</span>
      ${whenText(r) ? `<span class="when">${esc(whenText(r))}</span>` : ''}
      ${pl.memo ? `<span class="mini">${esc(pl.memo)}</span>` : ''}${tags(pl, null)}
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
    ${Object.keys(D.counts.drinks || {}).length ? `<div class="stat"><h3>술 종류</h3>${(() => { const dm = Math.max(1, ...DRINKS.map((d) => cnt.drinks(d.id))); return [...DRINKS].sort((a, b) => cnt.drinks(b.id) - cnt.drinks(a.id)).map((d, i) => bar(img(d.sprite), esc(d.name), cnt.drinks(d.id), dm, i === 0)).join(''); })()}</div>` : ''}
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
  else if (!ui.step || !me()) body = `<div class="g">${introHTML()}</div>`;
  else body = `<div class="g">${(STAGES[ui.step] || stageDrink)()}</div>`;
  app.innerHTML = (preview ? '<div class="preview-banner">미리보기 · 여기서 고른 건 저장되지 않아요</div>' : '') + body;
  app.querySelectorAll('.px-ico').forEach((e) => { e.style.width = '28px'; e.style.height = '28px'; e.style.objectFit = 'cover'; });
  if (D && !celebrated && (isFinal() ? !ui.peek : ui.step === 'clear')) { celebrated = true; confetti(document.body); }
  if (D) document.title = titleText(D.settings);
  jump = false; popId = null;
}
const go = (step) => { ui.step = step; say = null; render(); scrollTo(0, 0); };
const move = (d) => { const all = steps(), i = all.indexOf(ui.step); go(i + d < 0 ? null : all[Math.min(all.length - 1, i + d)]); };

/* ---------- 이벤트 ---------- */
async function start() {
  const nm = (document.getElementById('g-name')?.value || '').trim().slice(0, 10);
  if (!nm) { toast('플레이어 이름을 적어 주세요'); document.getElementById('g-name')?.focus(); return; }
  ui.name = nm; try { localStorage.setItem('cm_name', nm); } catch { /* 저장 불가 */ }
  const back = me()?.place_id;
  if (!me() || me().name !== nm) await send({ name: nm });
  jump = true; say = back ? `${nm} 다시 왔구나!` : null; celebrated = !!back;
  ui.step = back ? 'clear' : 'drink'; render(); scrollTo(0, 0);
}

app.addEventListener('click', async (e) => {
  if (e.target.closest('a[data-stop]')) return;
  const t = e.target.closest('[data-g]'); if (!t || !D) return;
  const a = t.dataset.g, m = me();
  if (a === 'start') return start();
  if (a === 'peek') { ui.peek = !ui.peek; render(); scrollTo(0, 0); return; }
  if (a === 'reload') return load();
  if (a === 'back') return move(-1);
  if (a === 'next') { if (ui.step === 'place') { celebrated = false; jump = true; } return move(1); }
  if (a === 'redo') { go('drink'); say = '다시 골라볼까?'; render(); return; }
  if (a === 'toggleall') { ui.showAll = !ui.showAll; render(); return; }
  if (a === 'drink') {
    const v = t.dataset.v === '1'; popId = v ? 'y' : 'n'; say = pick(v ? REACT.y : REACT.n); jump = true;
    send(v ? { drink: true } : { drink: false, drink_ids: [] }); render(); return;
  }
  if (a === 'drinks') {
    const id = t.dataset.v, on = !m.drink_ids.includes(id);
    if (on) { popId = id; say = pick(REACT.drinks); jump = true; }
    send({ drink_ids: on ? [...m.drink_ids, id] : m.drink_ids.filter((x) => x !== id) }); render(); return;
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
  setInterval(() => { if (document.visibilityState === 'visible' && !busy && ui.step) load(); }, 10000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !busy) load(); });
}
