// GET /api/room?code=xxxxx&device=... → 친구 화면에 필요한 방 정보 + 집계
import { handle, json, fail } from './_lib/http.js';
import { publicRoom } from './_lib/store.js';

export const GET = handle(async (request) => {
  const q = new URL(request.url).searchParams;
  if (!q.get('code')) return fail('방 코드가 없어요', 400);
  return json(await publicRoom(q.get('code'), q.get('device')));
});
