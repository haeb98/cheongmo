// 관리자 API
// GET  /api/admin            → 전체 상태 (로그인 필요)
// POST /api/admin {action,…} → login / logout / 그 외 관리 작업
import { handle, json, fail, readJson } from './_lib/http.js';
import { isAdmin, checkPassword, sessionCookie, clearCookie, adminPassword } from './_lib/auth.js';
import { adminState, adminActions } from './_lib/store.js';
import { fetchOg, OgError } from './_lib/og.js';
import { usingSupabase } from './_lib/db.js';

const meta = () => ({ storage: usingSupabase ? 'supabase' : 'memory' });

export const GET = handle(async (request) => {
  if (!isAdmin(request)) return fail(adminPassword() ? '로그인이 필요해요' : 'ADMIN_PASSWORD 환경변수를 먼저 설정해 주세요', 401);
  return json({ ...(await adminState()), ...meta() });
});

export const POST = handle(async (request) => {
  const body = await readJson(request);
  const { action } = body;
  if (action === 'login') {
    if (!adminPassword()) return fail('ADMIN_PASSWORD 환경변수를 먼저 설정해 주세요', 500);
    if (!checkPassword(body.password || '')) return fail('비밀번호가 맞지 않아요', 401);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request) });
  }
  if (action === 'logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
  if (!isAdmin(request)) return fail('로그인이 필요해요', 401);

  if (action === 'og') {
    try { return json(await fetchOg(String(body.url || ''))); }
    catch (e) {
      console.error('og fetch failed:', body.url, e?.message);
      return fail(e instanceof OgError ? e.message : '링크에서 정보를 가져오지 못했어요', 422);
    }
  }
  const fn = adminActions[action];
  if (!fn) return fail('알 수 없는 작업이에요', 400);
  const result = await fn(body);
  if (action === 'upload') return json(result);
  return json({ ...(await adminState()), ...meta(), result: result ?? null });
});
