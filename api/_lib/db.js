// 데이터 저장소. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있으면 Supabase(REST),
// 없으면 로컬 테스트용 메모리 저장소(서버를 끄면 사라짐)를 씁니다.
import { randomUUID } from 'node:crypto';
import { memorySeed } from './seed.js';

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const usingSupabase = Boolean(SB_URL && SB_KEY);
export const PHOTO_BUCKET = 'photos';

/* ---------------- Supabase (PostgREST) ---------------- */
// 새 secret 키(sb_secret_…)는 JWT가 아니라서 apikey 헤더로만 보내요.
// 예전 service_role 키(eyJ…로 시작하는 JWT)일 때만 Authorization 헤더도 함께 보내요.
const authHeaders = () => (SB_KEY.startsWith('eyJ') ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : { apikey: SB_KEY });
function sbHeaders(extra = {}) {
  return { ...authHeaders(), 'Content-Type': 'application/json', ...extra };
}
function sbFilter(filters = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) q.append(k, v === null ? 'is.null' : `eq.${v}`);
  return q;
}
async function sbFetch(path, init) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const supabase = {
  async select(table, filters = {}, order = 'created_at.asc') {
    const q = sbFilter(filters); q.set('select', '*'); if (order) q.set('order', order);
    return sbFetch(`${table}?${q}`, { headers: sbHeaders() });
  },
  async insert(table, row) {
    const r = await sbFetch(table, { method: 'POST', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify(row) });
    return r[0];
  },
  async update(table, filters, patch) {
    return sbFetch(`${table}?${sbFilter(filters)}`, { method: 'PATCH', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify(patch) });
  },
  async remove(table, filters) {
    await sbFetch(`${table}?${sbFilter(filters)}`, { method: 'DELETE', headers: sbHeaders() });
  },
  async upsert(table, row, onConflict) {
    const r = await sbFetch(`${table}?on_conflict=${onConflict}`, {
      method: 'POST', headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }), body: JSON.stringify(row),
    });
    return r[0];
  },
  async uploadPhoto(path, bytes, contentType) {
    const res = await fetch(`${SB_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': contentType, 'x-upsert': 'true' }, body: bytes,
    });
    if (!res.ok) throw new Error(`사진 업로드 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return `${SB_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
  },
};

/* ---------------- 메모리 저장소 (로컬 테스트용) ---------------- */
const mem = globalThis.__cheongmoMem || (globalThis.__cheongmoMem = memorySeed());
const match = (row, f) => Object.entries(f).every(([k, v]) => (v === null ? row[k] == null : String(row[k]) === String(v)));
const clone = (x) => JSON.parse(JSON.stringify(x));
const memory = {
  async select(table, filters = {}) { return clone(mem[table].filter((r) => match(r, filters))); },
  async insert(table, row) { const r = { id: randomUUID(), created_at: new Date().toISOString(), ...row }; mem[table].push(r); return clone(r); },
  async update(table, filters, patch) { const out = []; mem[table].forEach((r) => { if (match(r, filters)) { Object.assign(r, patch); out.push(clone(r)); } }); return out; },
  async remove(table, filters) { mem[table] = mem[table].filter((r) => !match(r, filters)); },
  async upsert(table, row, onConflict) {
    const keys = onConflict.split(',');
    const hit = mem[table].find((r) => keys.every((k) => r[k] === row[k]));
    if (hit) { Object.assign(hit, row); return clone(hit); }
    return memory.insert(table, row);
  },
  async uploadPhoto(_path, bytes, contentType) { return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`; },
};

export const db = usingSupabase ? supabase : memory;
