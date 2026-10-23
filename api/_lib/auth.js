// 관리자 비밀번호 로그인: 서명된 쿠키(30일)로 세션을 유지합니다.
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { usingSupabase } from './db.js';

const COOKIE = 'cm_admin';
const MAX_AGE = 60 * 60 * 24 * 30;

export function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return usingSupabase ? null : 'cheongmo'; // 로컬 메모리 모드에서만 기본 비밀번호
}
const key = () => createHash('sha256').update('cheongmo:' + adminPassword()).digest();
const sign = (v) => createHmac('sha256', key()).update(v).digest('base64url');

function safeEq(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(pw) {
  const real = adminPassword();
  if (!real) return false;
  return safeEq(createHash('sha256').update(String(pw)).digest('hex'), createHash('sha256').update(real).digest('hex'));
}

export function sessionCookie(request) {
  const ts = String(Math.floor(Date.now() / 1000));
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${ts}.${sign(ts)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function isAdmin(request) {
  if (!adminPassword()) return false;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [ts, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!ts || !sig || !safeEq(sig, sign(ts))) return false;
  return Date.now() / 1000 - Number(ts) < MAX_AGE;
}
