// POST /api/vote { code, deviceId, name, drink?, drink_ids?, food_ids?, place_ids? (최대 3곳) }
import { handle, json, readJson } from './_lib/http.js';
import { vote } from './_lib/store.js';

export const POST = handle(async (request) => json(await vote(await readJson(request, 20_000))));
