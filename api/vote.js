// POST /api/vote { code, deviceId, name, drink?, food_ids?, place_id? }
import { handle, json, readJson } from './_lib/http.js';
import { vote } from './_lib/store.js';

export const POST = handle(async (request) => json(await vote(await readJson(request, 20_000))));
