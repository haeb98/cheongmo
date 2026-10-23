// 앱의 도메인 로직: 방 조회, 투표, 관리자 작업.
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { HttpError, str } from './http.js';

const SPRITES = ['meat', 'sushi', 'pasta', 'rice', 'dumpling', 'chicken', 'wine', 'soju', 'beer', 'juice', 'heart'];
// 술 종류 (public/shared.js 의 DRINKS 와 같은 목록)
const DRINK_IDS = ['beer', 'soju', 'wine', 'whisky', 'etc', 'corkage'];
const drinkList = (v) => [...new Set((Array.isArray(v) ? v : []).filter((d) => DRINK_IDS.includes(d)))];
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const isTime = (v) => /^\d{2}:\d{2}$/.test(v || '');

export async function getSettings() {
  const rows = await db.select('settings', { id: 1 }, null);
  return rows[0] || { id: 1, host: '해빈', title_idx: 0, custom_title: '' };
}
export const listFoods = async () => (await db.select('foods', {}, 'sort.asc,created_at.asc')).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

export async function roomByCode(code) {
  const rows = await db.select('rooms', { code: str(code, 20) });
  if (!rows[0]) throw new HttpError('없는 방이에요. 링크를 다시 확인해 주세요', 404);
  return rows[0];
}

export function tally(players) {
  const c = { players: 0, drink: { yes: 0, no: 0 }, drinks: {}, foods: {}, places: {} };
  for (const p of players) {
    if (p.drink == null) continue;
    c.players++;
    p.drink ? c.drink.yes++ : c.drink.no++;
    if (p.drink) (p.drink_ids || []).forEach((d) => (c.drinks[d] = (c.drinks[d] || 0) + 1));
    (p.food_ids || []).forEach((f) => (c.foods[f] = (c.foods[f] || 0) + 1));
    if (p.place_id) c.places[p.place_id] = (c.places[p.place_id] || 0) + 1;
  }
  return c;
}

export async function publicRoom(code, deviceId) {
  const room = await roomByCode(code);
  const [settings, foods, places, players] = await Promise.all([
    getSettings(), listFoods(), db.select('places', { room_id: room.id }), db.select('players', { room_id: room.id }),
  ]);
  const me = deviceId ? players.find((p) => p.device_id === deviceId) : null;
  return {
    room, settings, foods, places, counts: tally(players),
    me: me ? { name: me.name, drink: me.drink, drink_ids: me.drink_ids || [], food_ids: me.food_ids || [], place_id: me.place_id } : null,
  };
}

export async function vote(body) {
  const room = await roomByCode(body.code);
  if (room.confirmed_place) throw new HttpError('장소가 이미 확정돼서 투표가 닫혔어요', 409);
  const device_id = str(body.deviceId, 64);
  const name = str(body.name, 10);
  if (device_id.length < 8) throw new HttpError('기기 정보를 확인할 수 없어요. 새로고침해 주세요');
  if (!name) throw new HttpError('플레이어 이름을 적어 주세요');
  const row = { room_id: room.id, device_id, name, updated_at: new Date().toISOString() };
  if ('drink' in body) row.drink = body.drink === null ? null : Boolean(body.drink);
  if ('drink_ids' in body) row.drink_ids = drinkList(body.drink_ids);
  if (row.drink === false) row.drink_ids = []; // 안 마시는 친구는 술 종류 없음
  if ('food_ids' in body) {
    const valid = new Set((await listFoods()).map((f) => f.id));
    row.food_ids = [...new Set((Array.isArray(body.food_ids) ? body.food_ids : []).filter((id) => valid.has(id)))];
  }
  if ('place_id' in body) {
    if (body.place_id === null) row.place_id = null;
    else {
      const ok = (await db.select('places', { room_id: room.id, id: str(body.place_id, 64) }))[0];
      if (!ok) throw new HttpError('없는 장소예요. 새로고침해 주세요');
      row.place_id = ok.id;
    }
  }
  await db.upsert('players', row, 'room_id,device_id');
  return publicRoom(room.code, device_id);
}

/* ---------------- 관리자 ---------------- */
export async function adminState() {
  const [settings, foods, rooms, places, players] = await Promise.all([
    getSettings(), listFoods(), db.select('rooms'), db.select('places'), db.select('players'),
  ]);
  return {
    settings, foods,
    rooms: rooms.map((r) => ({
      ...r,
      places: places.filter((p) => p.room_id === r.id),
      players: players.filter((p) => p.room_id === r.id).map(({ device_id, ...p }) => p),
    })),
  };
}

async function uniqueCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    if (!(await db.select('rooms', { code })).length) return code;
  }
  throw new Error('방 코드를 만들지 못했어요');
}

function placeFields(b) {
  const url = str(b.url, 500);
  if (url && !/^https?:\/\//i.test(url)) throw new HttpError('링크는 http:// 또는 https:// 로 시작해야 해요');
  const title = str(b.title, 60);
  if (!title) throw new HttpError('장소 이름을 적어 주세요');
  const food_ids = Array.isArray(b.food_ids) ? b.food_ids.map((x) => str(x, 64)).filter(Boolean) : [];
  const drink_ids = drinkList(b.drink_ids);
  if (!food_ids.length && !drink_ids.length) throw new HttpError('음식이나 술 종류를 하나 이상 골라 주세요');
  const photo = String(b.photo_url || '').trim();
  const okPhoto = (/^https:\/\//.test(photo) && photo.length <= 600) || (photo.startsWith('data:image/') && photo.length <= 400_000);
  return { title, memo: str(b.memo, 80), url, food_ids, drink_ids, photo_url: okPhoto ? photo : null };
}

export const adminActions = {
  async updateSettings(b) {
    const patch = { host: str(b.host, 10) || '해빈', title_idx: Math.max(0, Math.min(4, Number(b.title_idx) || 0)), custom_title: str(b.custom_title, 40) };
    const rows = await db.update('settings', { id: 1 }, patch);
    if (!rows.length) await db.insert('settings', { id: 1, ...patch });
  },
  async createRoom(b) {
    const name = str(b.name, 20); if (!name) throw new HttpError('톡방 이름을 적어 주세요');
    return db.insert('rooms', { name, code: await uniqueCode(), deadline: isDate(b.deadline) ? b.deadline : null, headcount: Math.max(1, Math.min(99, Number(b.headcount) || 6)) });
  },
  async updateRoom(b) {
    const patch = {};
    if ('name' in b) { patch.name = str(b.name, 20); if (!patch.name) throw new HttpError('톡방 이름을 적어 주세요'); }
    if ('deadline' in b) patch.deadline = isDate(b.deadline) ? b.deadline : null;
    if ('headcount' in b) patch.headcount = Math.max(1, Math.min(99, Number(b.headcount) || 6));
    await db.update('rooms', { id: str(b.id, 64) }, patch);
  },
  async deleteRoom(b) {
    const id = str(b.id, 64);
    await db.remove('players', { room_id: id });
    await db.remove('places', { room_id: id });
    await db.remove('rooms', { id });
  },
  async confirm(b) {
    const id = str(b.roomId, 64);
    if (!b.placeId) { await db.update('rooms', { id }, { confirmed_place: null, final_date: null, final_time: null, final_note: null }); return; }
    const pl = (await db.select('places', { room_id: id, id: str(b.placeId, 64) }))[0];
    if (!pl) throw new HttpError('없는 장소예요');
    const date = isDate(b.date) ? b.date : null;
    await db.update('rooms', { id }, { confirmed_place: pl.id, final_date: date, final_time: date && isTime(b.time) ? b.time : null, final_note: str(b.note, 60) || null });
  },
  async createPlace(b) { return db.insert('places', { room_id: str(b.roomId, 64), ...placeFields(b) }); },
  async updatePlace(b) { await db.update('places', { id: str(b.id, 64) }, placeFields(b)); },
  async deletePlace(b) {
    const id = str(b.id, 64);
    await db.update('players', { place_id: id }, { place_id: null });
    await db.update('rooms', { confirmed_place: id }, { confirmed_place: null, final_date: null, final_time: null, final_note: null });
    await db.remove('places', { id });
  },
  async createFood(b) {
    const name = str(b.name, 12); if (!name) throw new HttpError('메뉴 이름을 적어 주세요');
    const foods = await listFoods();
    return db.insert('foods', { name, sprite: SPRITES.includes(b.sprite) ? b.sprite : 'heart', sort: foods.length });
  },
  async deleteFood(b) {
    const foods = await listFoods();
    if (foods.length <= 1) throw new HttpError('메뉴는 하나 이상 있어야 해요');
    await db.remove('foods', { id: str(b.id, 64) });
  },
  async resetVotes(b) { await db.remove('players', { room_id: str(b.roomId, 64) }); },
  async upload(b) {
    const m = String(b.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new HttpError('이미지 파일만 올릴 수 있어요');
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > 2_000_000) throw new HttpError('사진이 너무 커요');
    const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
    return { url: await db.uploadPhoto(`${randomUUID()}.${ext}`, bytes, m[1]) };
  },
};
