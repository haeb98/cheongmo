-- 이미 schema.sql 을 실행해 둔 DB에서, 술 종류 기능을 쓰려면 이것만 실행하세요.
-- Supabase → SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전해요.
alter table places add column if not exists drink_ids text[] not null default '{}';
alter table players add column if not exists drink_ids text[] not null default '{}';
