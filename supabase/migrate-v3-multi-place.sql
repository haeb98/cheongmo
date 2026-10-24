-- 장소를 1인 최대 3곳까지 고르는 기능(v3)을 쓰려면, 이미 만든 DB에서 이것만 실행하세요.
-- Supabase → SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전해요. 이미 고른 1곳은 그대로 옮겨져요.
alter table players add column if not exists place_ids uuid[] not null default '{}';
update players set place_ids = array[place_id] where place_id is not null and place_ids = '{}';
