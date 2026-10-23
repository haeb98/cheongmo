// 로컬 실행용 서버: `npm run dev` → http://localhost:3000
// vercel.json 과 같은 규칙으로 /api 함수와 public/ 정적 파일을 띄웁니다. 외부 패키지 없이 동작해요.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// .env.local 이 있으면 읽어요
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

async function callApi(name, req, url) {
  const mod = await import(`./api/${name}.js`);
  const fn = mod[req.method];
  if (!fn) return new Response('Method Not Allowed', { status: 405 });
  const chunks = []; for await (const c of req) chunks.push(c);
  const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  return fn(request);
}

async function send(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let path = url.pathname;
    if (path === '/') { res.writeHead(307, { location: '/admin' }); return res.end(); }
    const r = path.match(/^\/r\/([^/]+)$/);
    if (r) { url.pathname = '/api/r'; url.searchParams.set('code', decodeURIComponent(r[1])); path = '/api/r'; }
    const api = path.match(/^\/api\/([a-z]+)$/);
    if (api) return send(res, await callApi(api[1], req, url.toString()));
    let file = normalize(join('public', path));
    if (!file.startsWith('public')) { res.writeHead(403); return res.end(); }
    if (!extname(file)) file += '.html';
    await stat(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch (e) {
    if (e.code === 'ENOENT') { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('없는 페이지예요'); }
    console.error(e); res.writeHead(500); res.end('서버 오류');
  }
}).listen(PORT, () => {
  const mode = process.env.SUPABASE_URL ? 'Supabase 연결' : `메모리 모드 (관리자 비밀번호: ${process.env.ADMIN_PASSWORD ? '.env.local 의 값' : 'cheongmo'})`;
  console.log(`청모 퀘스트 → http://localhost:${PORT}/admin  [${mode}]`);
});
