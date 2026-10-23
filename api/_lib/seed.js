// 로컬 메모리 모드에서만 쓰는 예시 데이터. Supabase 모드에서는 쓰이지 않아요.
const nq = (q) => 'https://map.naver.com/p/search/' + encodeURIComponent(q);
const t = (i) => new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString();

export function memorySeed() {
  const foods = [
    ['f-meat', '고기', 'meat'], ['f-sushi', '회·스시', 'sushi'], ['f-pasta', '파스타', 'pasta'],
    ['f-rice', '한식', 'rice'], ['f-dump', '중식', 'dumpling'], ['f-chicken', '치킨', 'chicken'],
  ].map(([id, name, sprite], i) => ({ id, name, sprite, sort: i, created_at: t(i) }));
  const room = { id: 'room-1', name: '대학 동기방 (예시)', code: 'demo1', deadline: '2026-11-07', headcount: 9, confirmed_place: null, final_date: null, final_time: null, final_note: null, created_at: t(10) };
  const P = (id, title, memo, q, food_ids, alcohol, i) => ({ id, room_id: room.id, title, memo, url: nq(q), food_ids, alcohol, photo_url: null, created_at: t(20 + i) });
  const places = [
    P('p1', '을지로 와인 비스트로 (예시)', '룸 8~10인 · 콜키지 프리', '을지로 와인 비스트로 룸', ['f-pasta', 'f-meat'], true, 0),
    P('p2', '성수 한우 오마카세 (예시)', '코스 1인 6만원 · 프라이빗룸', '성수 한우 오마카세 룸', ['f-meat', 'f-rice'], true, 1),
    P('p3', '합정 이자카야 (예시)', '늦게까지 영업 · 단체석', '합정 이자카야 단체석', ['f-sushi', 'f-chicken'], true, 2),
    P('p4', '연남 한식 밥집 (예시)', '술 없이 조용하게', '연남동 한식 룸', ['f-rice'], false, 3),
  ];
  const players = [
    ['민지', true, ['f-meat', 'f-pasta'], 'p1'], ['준호', true, ['f-sushi'], 'p3'], ['서연', false, ['f-rice'], 'p2'],
  ].map(([name, drink, food_ids, place_id], i) => ({ id: 'pl' + i, room_id: room.id, device_id: 'seed-' + i, name, drink, food_ids, place_id, updated_at: t(40 + i), created_at: t(40 + i) }));
  return { settings: [{ id: 1, host: '해빈', title_idx: 0, custom_title: '' }], foods, rooms: [room], places, players };
}
