-- 청모 퀘스트 DB 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요. 여러 번 실행해도 안전해요.

create extension if not exists pgcrypto;

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  host text not null default '해빈',
  title_idx int not null default 0,
  custom_title text not null default ''
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sprite text not null default 'heart',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  deadline date,
  headcount int not null default 6,
  confirmed_place uuid,
  final_date date,
  final_time text,
  final_note text,
  created_at timestamptz not null default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  memo text not null default '',
  url text not null default '',
  food_ids uuid[] not null default '{}',
  alcohol boolean not null default true, -- v1에서 쓰던 칸 (지금은 안 써요)
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  device_id text not null,
  name text not null,
  drink boolean,
  food_ids uuid[] not null default '{}',
  place_id uuid references places(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (room_id, device_id)
);
-- v2: 술 종류 (맥주·소주·와인·위스키·그 외·콜키지). 이미 만든 DB에도 이 줄들만 다시 실행하면 돼요.
alter table places add column if not exists drink_ids text[] not null default '{}';
alter table players add column if not exists drink_ids text[] not null default '{}';
-- v3: 장소 1인 최대 3곳
alter table players add column if not exists place_ids uuid[] not null default '{}';

create index if not exists places_room_idx on places(room_id);
create index if not exists players_room_idx on players(room_id);

-- 브라우저에서 직접 접근은 막고, 서버(service role 키)만 읽고 씁니다.
alter table settings enable row level security;
alter table foods enable row level security;
alter table rooms enable row level security;
alter table places enable row level security;
alter table players enable row level security;

-- 기본 음식 메뉴 (처음 한 번만)
insert into foods (name, sprite, sort)
select * from (values ('고기','meat',0), ('회·스시','sushi',1), ('파스타','pasta',2), ('한식','rice',3), ('중식','dumpling',4), ('치킨','chicken',5)) v(name, sprite, sort)
where not exists (select 1 from foods);

-- 장소 사진 저장소 (공개 읽기)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
