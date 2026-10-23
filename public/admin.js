// 관리자 화면: /admin
import { titles, titleText, whenText, dday, shortDate, img, thumb, bar, esc, safeUrl, toast, api, copyText, startBlink, spr, FOOD_SPRITES } from './shared.js';

const view = document.getElementById('view');
let S = null;            // 서버 상태
let active = null;       // 선택된 방 id
let draft = null;        // 장소 입력 폼
let saving = false;

const R = () => S.rooms.find((r) => r.id === active) || S.rooms[0];
const food = (id) => S.foods.find((f) => f.id === id);
const linkOf = (r) => `${location.origin}/r/${r.code}`;
function tally(players) {
  const c = { n: 0, yes: 0, no: 0, foods: {}, places: {} };
  players.filter((p) => p.drink != null).forEach((p) => {
    c.n++; p.drink ? c.yes++ : c.no++;
    (p.food_ids || []).forEach((f) => (c.foods[f] = (c.foods[f] || 0) + 1));
    if (p.place_id) c.places[p.place_id] = (c.places[p.place_id] || 0) + 1;
  });
  return c;
}

/* ---------- 서버 ---------- */
async function load() {
  try { S = await api('/api/admin'); if (!S.rooms.some((r) => r.id === active)) active = S.rooms[0]?.id || null; render(); }
  catch (e) { if (e.status === 401) loginView(e.message); else view.innerHTML = `<p class="notice">${esc(e.message)}</p>`; }
}
async function act(action, body = {}, okMsg) {
  if (saving) return null;
  saving = true;
  try {
    const next = await api('/api/admin', { action, ...body });
    S = next; if (!S.rooms.some((r) => r.id === active)) active = S.rooms[0]?.id || null;
    render(); if (okMsg) toast(okMsg);
    return next;
  } catch (e) {
    if (e.status === 401) loginView('다시 로그인해 주세요'); else toast(e.message);
    return null;
  } finally { saving = false; }
}

/* ---------- 로그인 ---------- */
function loginView(msg) {
  document.getElementById('logout').hidden = true;
  view.innerHTML = `<form class="login" id="login">${img('mascot', 'mascot')}<h1>관리자 로그인</h1>
    <label class="field" style="text-align:left">비밀번호<input id="pw" type="password" autocomplete="current-password" required></label>
    <button class="pbtn pink big" type="submit">입장하기</button>${msg && msg !== '로그인이 필요해요' ? `<p class="notice">${esc(msg)}</p>` : ''}</form>`;
  document.getElementById('pw').focus();
}
view.addEventListener('submit', async (e) => {
  if (e.target.id !== 'login') return;
  e.preventDefault();
  try { await api('/api/admin', { action: 'login', password: document.getElementById('pw').value }); await load(); }
  catch (err) { toast(err.message); }
});
document.getElementById('logout').onclick = async () => { await api('/api/admin', { action: 'logout' }).catch(() => {}); S = null; loginView(); };

/* ---------- 화면 ---------- */
function roomPanel(r, c) {
  const pl = r.places.find((x) => x.id === r.confirmed_place);
  return `<section class="panel"><h2>${esc(r.name)}<span class="tag">${r.confirmed_place ? 'CLEAR' : dday(r.deadline)}</span></h2>
    <div class="meta"><span>참여 <b>${c.n}/${r.headcount}</b></span>${r.deadline ? `<span>마감 <b>${shortDate(r.deadline)}</b></span>` : ''}</div>
    <div class="linkbox"><span style="flex:1;min-width:0">${esc(linkOf(r))}</span></div>
    ${pl ? `<div class="final-strip"><span class="mini">확정 완료 · 친구가 링크를 열면 발표 화면이 보여요</span><b>${esc(pl.title)}</b>${whenText(r) ? `<span>${esc(whenText(r))}</span>` : ''}${r.final_note ? `<span class="mini">${esc(r.final_note)}</span>` : ''}</div>` : ''}
    <div class="actions">${pl ? `<button class="pbtn pink" data-act="announce">발표 메시지 복사</button>` : `<button class="pbtn pink" data-act="copy">카톡방 초대 메시지 복사</button>`}
      <a class="pbtn" style="text-decoration:none" href="/r/${esc(r.code)}?preview=1" target="_blank" rel="noopener">친구 화면 미리보기 ↗</a>
      <button class="pbtn ghost" data-act="editroom">방 설정</button></div></section>`;
}
function resultPanel(r, c) {
  const fmax = Math.max(0, ...S.foods.map((f) => c.foods[f.id] || 0));
  const pmax = Math.max(0, ...r.places.map((p) => c.places[p.id] || 0));
  const voters = r.players.filter((p) => p.drink != null);
  return `<section class="panel"><h2>현재 결과<button class="pbtn ghost sm" data-act="refresh">새로고침</button></h2>
    <div class="stat"><h3>STAGE 1 · 음주 여부</h3>
      ${c.yes + c.no ? `<div class="split"><span class="y" style="flex-grow:${c.yes || 0.001}">${c.yes ? '마신다 ' + c.yes : ''}</span><span class="n" style="flex-grow:${c.no || 0.001}">${c.no ? '안 마신다 ' + c.no : ''}</span></div>` : '<span class="mini">아직 아무도 고르지 않았어요. 카톡방에 링크를 보내 보세요.</span>'}</div>
    <div class="stat"><h3>STAGE 2 · 음식 (여러 개)</h3>
      ${[...S.foods].sort((a, b) => (c.foods[b.id] || 0) - (c.foods[a.id] || 0)).map((f) => { const n = c.foods[f.id] || 0; return bar(img(f.sprite), esc(f.name), n, fmax, n > 0 && n === fmax); }).join('')}</div>
    <div class="stat"><h3>STAGE 3 · 장소 (하나만)</h3>
      ${r.places.length ? [...r.places].sort((a, b) => (c.places[b.id] || 0) - (c.places[a.id] || 0)).map((p) => {
        const n = c.places[p.id] || 0, conf = r.confirmed_place === p.id;
        return bar(thumb(p, S.foods, 'px-ico'), esc(p.title) + (conf ? ' <span class="badge">확정</span>' : ''), n, pmax, conf || (n > 0 && n === pmax && !r.confirmed_place),
          `<button class="pbtn sm ${conf ? 'ghost' : ''}" data-act="confirm" data-id="${p.id}">${conf ? '확정 취소' : '이 장소로 확정'}</button>`);
      }).join('') : '<span class="mini">장소 후보를 먼저 올려 주세요.</span>'}</div>
    ${voters.length ? `<div class="stat"><h3>참여한 친구</h3><div class="players">${voters.map((p) => `<span class="chip" title="${esc((p.food_ids || []).map(food).filter(Boolean).map((f) => f.name).join(', '))}">${esc(p.name)} · ${p.drink ? '술' : '노술'}${p.place_id ? '' : ' · 진행 중'}</span>`).join('')}</div>
      <button class="pbtn ghost sm" style="justify-self:start" data-act="resetvotes">이 방 투표 전부 지우기</button></div>` : ''}
  </section>`;
}
function placeForm() {
  const d = draft;
  return `<form class="addp" id="pform">
    <label class="field">링크 (네이버 지도·플레이스 공유 링크를 붙여넣어 주세요)<input id="pf-url" type="url" value="${esc(d.url)}" placeholder="https://naver.me/..." autocomplete="off"></label>
    <span class="og-status" id="og-status"></span>
    <div class="row2"><label class="field">장소 이름<input id="pf-title" maxlength="60" value="${esc(d.title)}" placeholder="링크를 넣으면 자동으로 채워져요" required></label>
    <label class="field">한 줄 메모<input id="pf-memo" maxlength="80" value="${esc(d.memo)}" placeholder="예: 1인 4만원, 룸 있음"></label></div>
    <div class="field">어떤 음식이 있나요? (여러 개)<div class="tags">${S.foods.map((f) => `<button type="button" class="tgl" data-ft="${f.id}" aria-pressed="${d.food_ids.includes(f.id)}">${img(f.sprite)}${esc(f.name)}</button>`).join('')}</div></div>
    <div class="field">술<div class="tags"><button type="button" class="tgl" data-alc="1" aria-pressed="${d.alcohol}">${img('beer')}술 마실 수 있어요</button><button type="button" class="tgl" data-alc="0" aria-pressed="${!d.alcohol}">${img('juice')}술 없어요</button></div></div>
    <div class="field">대표 사진<div class="photo-row"><img id="pf-prev" class="thumb ${d.photo_url ? '' : 'px'}" src="${esc(d.photo_url) || spr(food(d.food_ids[0])?.sprite || 'place')}" alt="" referrerpolicy="no-referrer">
      <div style="display:grid;gap:6px"><input id="pf-photo" type="file" accept="image/*">${d.photo_url ? '<button type="button" class="pbtn ghost sm" data-act="clearphoto" style="justify-self:start">사진 빼기</button>' : ''}</div></div></div>
    <div class="actions"><button class="pbtn mint" type="submit">${d.id ? '수정 저장' : '장소 올리기'}</button><button class="pbtn ghost" type="button" data-act="cancelplace">취소</button></div></form>`;
}
function placesPanel(r) {
  return `<section class="panel"><h2>장소 후보<button class="pbtn mint sm" data-act="newplace">+ 장소 추가</button></h2>
    ${draft ? placeForm() : ''}
    <div class="plist">${r.places.map((p) => `<div class="pitem">${thumb(p, S.foods)}<div class="pi-main">
      <span class="pi-title">${esc(p.title)}</span>${p.memo ? `<span class="mini">${esc(p.memo)}</span>` : ''}
      <div class="tags">${(p.food_ids || []).map(food).filter(Boolean).map((f) => `<span class="tg">${img(f.sprite)}${esc(f.name)}</span>`).join('')}<span class="tg ${p.alcohol ? 'alc' : 'noalc'}">${p.alcohol ? '술 OK' : '술 없음'}</span></div>
      ${safeUrl(p.url) ? `<a class="c-link" href="${esc(p.url)}" target="_blank" rel="noopener">링크 열기 ↗</a>` : ''}
      <div class="actions"><button class="pbtn sm" data-act="editplace" data-id="${p.id}">수정</button><button class="pbtn sm ghost" data-act="delplace" data-id="${p.id}">삭제</button></div>
    </div></div>`).join('') || '<span class="mini">아직 장소가 없어요. 네이버 지도에서 "공유 → 링크 복사"한 주소를 붙여넣어 보세요.</span>'}</div></section>`;
}
function foodsPanel() {
  return `<section class="panel"><h2>음식 메뉴<span class="tag">STAGE 2</span></h2>
    <div class="tags">${S.foods.map((f) => `<span class="tgl">${img(f.sprite)}${esc(f.name)}<button class="pbtn ghost sm" style="padding:0 4px;border:0" data-act="delfood" data-id="${f.id}" aria-label="${esc(f.name)} 삭제">×</button></span>`).join('')}
    <button class="pbtn sm" data-act="addfood">+ 메뉴</button></div>
    <span class="hint">모든 톡방에 같은 메뉴가 나와요. 장소마다 음식 태그를 달면 친구가 고른 음식에 맞는 장소가 위로 올라와요.</span></section>`;
}
function titlePanel() {
  const st = S.settings;
  return `<section class="panel"><h2>초대장 제목<span class="tag">ALL ROOMS</span></h2>
    <label class="field">주인공 이름<input id="host" maxlength="10" value="${esc(st.host)}"></label>
    <div class="stat" id="title-opts">${titles(st.host).map((t, i) => `<label class="opt"><input type="radio" name="tt" value="${i}" ${st.title_idx === i ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
    <label class="opt"><input type="radio" name="tt" value="4" ${st.title_idx === 4 ? 'checked' : ''}><input id="custom-title" maxlength="40" placeholder="직접 쓰기" value="${esc(st.custom_title)}" style="flex:1;background:none;border:0;border-bottom:2px solid var(--line);padding:2px 0"></label></div>
    <span class="hint">카톡에 링크를 보내면 미리보기 제목으로도 쓰여요.</span></section>`;
}

function render() {
  if (!S) return;
  document.getElementById('logout').hidden = false;
  let h = S.storage === 'memory' ? `<p class="notice">로컬 테스트 모드예요. 서버를 끄면 데이터가 사라져요. 배포할 때는 Supabase 환경변수를 넣어 주세요.</p>` : '';
  h += `<nav class="rooms" role="tablist" aria-label="톡방">${S.rooms.map((x) => `<button class="room-tab" role="tab" aria-selected="${x.id === active}" data-room="${x.id}">${esc(x.name)}<span class="n">${tally(x.players).n}/${x.headcount}</span></button>`).join('')}<button class="room-tab add" data-act="addroom">+ 톡방</button></nav>`;
  const r = R();
  if (r) { const c = tally(r.players); h += roomPanel(r, c) + resultPanel(r, c) + placesPanel(r); }
  else h += `<section class="panel"><h2>첫 톡방을 만들어 보세요</h2><span class="mini">톡방마다 링크가 따로 생겨요. 예: 대학 동기방, 회사 팀방</span><button class="pbtn pink" style="justify-self:start" data-act="addroom">+ 톡방 만들기</button></section>`;
  h += foodsPanel() + titlePanel();
  const y = scrollY;
  view.innerHTML = `<div style="display:flex;flex-direction:column;gap:18px">${h}</div>`;
  view.querySelectorAll('.px-ico').forEach((e) => { e.style.width = '28px'; e.style.height = '28px'; e.style.objectFit = 'cover'; });
  scrollTo(0, y);
}

function dialog(title, fields, onOk) {
  const b = document.createElement('div'); b.className = 'dlg-back';
  b.innerHTML = `<form class="dlg"><h4>${esc(title)}</h4>${fields}<div class="actions"><button class="pbtn pink" type="submit">확인</button><button class="pbtn ghost" type="button" data-x>취소</button></div></form>`;
  document.body.appendChild(b); b.querySelector('input')?.focus();
  b.addEventListener('click', (e) => { if (e.target === b || e.target.hasAttribute('data-x')) b.remove(); });
  b.querySelector('form').addEventListener('submit', async (e) => { e.preventDefault(); const ok = await onOk(new FormData(e.target), b); if (ok !== false) b.remove(); });
  return b;
}

/* ---------- 동작 ---------- */
async function onAct(t) {
  const r = R(), a = t.dataset.act;
  if (a === 'refresh') { await load(); toast('최신 결과로 바꿨어요'); return; }
  if (a === 'addroom') {
    dialog('새 톡방', `<label class="field">톡방 이름<input name="n" required maxlength="20" placeholder="예: 고등학교 친구들"></label><div class="row2"><label class="field">인원<input name="h" type="number" min="1" max="99" value="6"></label><label class="field">투표 마감일<input name="d" type="date"></label></div>`,
      async (f) => { const res = await act('createRoom', { name: f.get('n'), headcount: f.get('h'), deadline: f.get('d') }, '톡방을 만들었어요. 장소를 올려 주세요'); if (res?.result) { active = res.result.id; render(); } return !!res; });
    return;
  }
  if (a === 'copy') return copyText(`[${r.name}] ${titleText(S.settings)}\n어디서 뭘 먹을지 같이 골라줘! ▶ ${linkOf(r)}`, '초대 메시지를 복사했어요. 카톡방에 붙여넣으세요');
  if (a === 'announce') {
    const pl = r.places.find((x) => x.id === r.confirmed_place), w = whenText(r);
    return copyText(`[${r.name}] 청모 장소 확정!\n${w ? w + ' · ' : ''}${pl?.title || ''}\n자세히 보기 ▶ ${linkOf(r)}`, '발표 메시지를 복사했어요');
  }
  if (a === 'editroom') {
    const b = dialog('방 설정', `<label class="field">톡방 이름<input name="n" required maxlength="20" value="${esc(r.name)}"></label><div class="row2"><label class="field">인원<input name="h" type="number" min="1" max="99" value="${r.headcount}"></label><label class="field">투표 마감일<input name="d" type="date" value="${esc(r.deadline || '')}"></label></div><button type="button" class="pbtn ghost sm" id="del-room" style="justify-self:start;color:var(--red)">이 톡방 삭제</button>`,
      async (f) => (await act('updateRoom', { id: r.id, name: f.get('n'), headcount: f.get('h'), deadline: f.get('d') }, '저장했어요')) !== null);
    b.querySelector('#del-room').onclick = async (ev) => {
      const btn = ev.currentTarget;
      if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '장소·투표까지 모두 지워져요. 한 번 더 누르면 삭제'; return; }
      b.remove(); await act('deleteRoom', { id: r.id }, '톡방을 삭제했어요');
    };
    return;
  }
  if (a === 'confirm') {
    const id = t.dataset.id;
    if (r.confirmed_place === id) { await act('confirm', { roomId: r.id, placeId: null }, '확정을 취소했어요. 다시 투표할 수 있어요'); return; }
    const pl = r.places.find((x) => x.id === id);
    dialog('이 장소로 확정할까요?', `<p class="mini" style="margin:0">${esc(pl.title)}</p><div class="row2"><label class="field">날짜 (선택)<input name="d" type="date" value="${esc(r.final_date || '')}"></label><label class="field">시간 (선택)<input name="t" type="time" value="${esc(r.final_time || '19:00')}"></label></div><label class="field">한마디 (선택)<input name="n" maxlength="60" placeholder="예: 예약자 해빈, 2층 룸이에요" value="${esc(r.final_note || '')}"></label><span class="hint">확정하면 투표가 닫히고, 친구가 링크를 열면 발표 화면이 먼저 보여요.</span>`,
      async (f) => (await act('confirm', { roomId: r.id, placeId: id, date: f.get('d'), time: f.get('t'), note: f.get('n') }, '장소 확정! 발표 메시지를 복사해 카톡방에 보내세요')) !== null);
    return;
  }
  if (a === 'resetvotes') {
    if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = '정말 지울까요? 한 번 더 누르면 삭제'; return; }
    await act('resetVotes', { roomId: r.id }, '투표를 모두 지웠어요'); return;
  }
  if (a === 'newplace') { draft = { url: '', title: '', memo: '', food_ids: [], alcohol: true, photo_url: null }; render(); document.getElementById('pf-url')?.focus(); return; }
  if (a === 'editplace') { const p = r.places.find((x) => x.id === t.dataset.id); draft = { ...p, food_ids: [...p.food_ids] }; render(); document.getElementById('pform')?.scrollIntoView({ block: 'center' }); return; }
  if (a === 'cancelplace') { draft = null; render(); return; }
  if (a === 'clearphoto') { syncDraft(); draft.photo_url = null; render(); return; }
  if (a === 'delplace') {
    if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = '정말 삭제?'; return; }
    await act('deletePlace', { id: t.dataset.id }, '장소를 삭제했어요'); return;
  }
  if (a === 'addfood') {
    let sp = 'heart';
    const b = dialog('메뉴 추가', `<label class="field">메뉴 이름<input name="n" required maxlength="12" placeholder="예: 양꼬치"></label><div class="field">그림<div class="sprites">${FOOD_SPRITES.map((s) => `<button type="button" data-sp="${s}" aria-pressed="${s === 'heart'}">${img(s)}</button>`).join('')}</div></div>`,
      async (f) => (await act('createFood', { name: f.get('n'), sprite: sp }, '메뉴를 추가했어요')) !== null);
    b.querySelectorAll('[data-sp]').forEach((x) => (x.onclick = () => { sp = x.dataset.sp; b.querySelectorAll('[data-sp]').forEach((y) => y.setAttribute('aria-pressed', y === x)); }));
    return;
  }
  if (a === 'delfood') {
    if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = '삭제?'; return; }
    await act('deleteFood', { id: t.dataset.id }, '메뉴를 삭제했어요'); return;
  }
}

function syncDraft() {
  if (!draft) return;
  draft.url = document.getElementById('pf-url')?.value.trim() ?? draft.url;
  draft.title = document.getElementById('pf-title')?.value.trim() ?? draft.title;
  draft.memo = document.getElementById('pf-memo')?.value.trim() ?? draft.memo;
}

view.addEventListener('click', (e) => {
  const t = e.target.closest('[data-room],[data-act],[data-ft],[data-alc]'); if (!t || !S) return;
  if (t.dataset.room) { active = t.dataset.room; draft = null; render(); return; }
  if (t.dataset.ft) {
    const on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', on);
    draft.food_ids = on ? [...draft.food_ids, t.dataset.ft] : draft.food_ids.filter((x) => x !== t.dataset.ft);
    if (!draft.photo_url) document.getElementById('pf-prev').src = spr(food(draft.food_ids[0])?.sprite || 'place');
    return;
  }
  if (t.dataset.alc) { draft.alcohol = t.dataset.alc === '1'; view.querySelectorAll('[data-alc]').forEach((x) => x.setAttribute('aria-pressed', (x.dataset.alc === '1') === draft.alcohol)); return; }
  if (t.dataset.act) onAct(t);
});

// 링크를 붙여넣으면 네이버에서 이름·사진을 가져와 채워요
let ogTimer, ogSeq = 0;
async function fetchOg(url) {
  const st = document.getElementById('og-status'); const seq = ++ogSeq;
  if (!/^https?:\/\/\S+\.\S+/.test(url)) { if (st) st.textContent = ''; return; }
  if (st) { st.className = 'og-status'; st.textContent = '링크에서 정보를 가져오는 중...'; }
  try {
    const og = await api('/api/admin', { action: 'og', url });
    if (seq !== ogSeq || !draft) return;
    const ti = document.getElementById('pf-title'), me = document.getElementById('pf-memo');
    if (og.title && ti && !ti.value.trim()) ti.value = og.title;
    if (og.description && me && !me.value.trim()) me.value = og.description.slice(0, 40);
    if (og.image && !draft.photo_url) { draft.photo_url = og.image; const pv = document.getElementById('pf-prev'); pv.src = og.image; pv.classList.remove('px'); }
    if (st) st.textContent = og.title ? `가져왔어요: ${og.title}` : '이름을 찾지 못했어요. 직접 적어 주세요';
  } catch (e) {
    if (seq !== ogSeq) return;
    if (st) { st.className = 'og-status err'; st.textContent = e.message; }
  }
}

let settingsTimer;
function saveSettings() {
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(async () => {
    try { S = { ...S, ...(await api('/api/admin', { action: 'updateSettings', ...S.settings })) }; toast('초대장 제목을 저장했어요'); }
    catch (e) { toast(e.message); }
  }, 700);
}
view.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'host') { S.settings.host = e.target.value.trim(); view.querySelectorAll('#title-opts .opt span').forEach((o, i) => (o.textContent = titles(S.settings.host)[i])); saveSettings(); }
  if (id === 'custom-title') { S.settings.custom_title = e.target.value; S.settings.title_idx = 4; view.querySelector('input[name="tt"][value="4"]').checked = true; saveSettings(); }
  if (id === 'pf-url') { clearTimeout(ogTimer); ogTimer = setTimeout(() => fetchOg(e.target.value.trim()), 500); }
});
view.addEventListener('change', (e) => {
  if (e.target.name === 'tt') { S.settings.title_idx = Number(e.target.value); saveSettings(); }
  if (e.target.id === 'pf-photo') {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = async () => {
        const max = 900, k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const st = document.getElementById('og-status'); if (st) { st.className = 'og-status'; st.textContent = '사진 올리는 중...'; }
        try {
          const { url } = await api('/api/admin', { action: 'upload', dataUrl: c.toDataURL('image/jpeg', 0.8) });
          draft.photo_url = url; const pv = document.getElementById('pf-prev'); pv.src = url; pv.classList.remove('px');
          if (st) st.textContent = '사진을 올렸어요';
        } catch (err) { if (st) { st.className = 'og-status err'; st.textContent = err.message; } }
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  }
});
view.addEventListener('submit', async (e) => {
  if (e.target.id !== 'pform') return;
  e.preventDefault(); syncDraft();
  if (!draft.title) { toast('장소 이름을 적어 주세요'); return; }
  if (!draft.food_ids.length) { toast('음식 태그를 하나 이상 골라 주세요'); return; }
  const body = { roomId: R().id, id: draft.id, title: draft.title, memo: draft.memo, url: draft.url, food_ids: draft.food_ids, alcohol: draft.alcohol, photo_url: draft.photo_url };
  const editing = !!draft.id; const keep = draft; draft = null;
  const res = await act(editing ? 'updatePlace' : 'createPlace', body, editing ? '수정했어요' : '장소를 올렸어요');
  if (!res) { draft = keep; render(); }
});

document.getElementById('brand-ico').src = spr('heart');
startBlink();
load();
setInterval(() => { if (document.visibilityState === 'visible' && S && !draft && !document.querySelector('.dlg-back')) load(); }, 20000);
