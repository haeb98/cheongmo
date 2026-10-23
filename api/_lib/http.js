export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const fail = (message, status = 400) => json({ error: message }, status);

export async function readJson(request, limit = 3_000_000) {
  const text = await request.text();
  if (text.length > limit) throw new HttpError('요청이 너무 커요. 사진 크기를 줄여 주세요', 413);
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError('잘못된 요청이에요', 400); }
}

export class HttpError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// 핸들러를 감싸서 에러를 JSON으로 돌려줍니다.
export const handle = (fn) => async (request) => {
  try { return await fn(request); }
  catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status);
    console.error(e);
    return fail('서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요', 500);
  }
};

export const str = (v, max) => String(v ?? '').trim().slice(0, max);
