-- 곁자리 Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- 'users' 는 Supabase Auth(auth.users)가 담당합니다. 비밀번호는 직접 저장하지 않습니다.

create extension if not exists "pgcrypto";

-- 1) profiles: 고객 정보 + 권한 -------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- 관리자 판별 함수 (RLS 재귀 방지를 위해 security definer)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 가입 시 프로필 자동 생성 (회원가입 폼의 name, phone 을 metadata 로 전달)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name',''),
          coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) services: 서비스 (가격은 여기서만 관리) -----------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  summary text not null default '',
  description text not null default '',
  can_do text[] not null default '{}',
  cannot_do text[] not null default '{}',
  steps text[] not null default '{}',
  cautions text[] not null default '{}',
  price_label text not null default '상담 후 안내',   -- 화면에 보이는 가격 문구
  unit_price integer,                                  -- 시간당 금액 (없으면 null)
  min_price integer,
  base_hours integer,                  -- 기본 이용 시간 (예: 청소 2시간)
  base_price integer,                  -- 기본 요금
  regular_base_price integer,          -- 정기 이용 기본 요금
  extra_hour_price integer,            -- 추가 시간 요금 (시간당)
  regular_extra_hour_price integer,    -- 정기 이용 추가 시간 요금 (시간당)
  duration_text text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) reservations: 예약 ---------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  service_id uuid not null references public.services(id),
  reserve_date date not null,
  reserve_time text not null,
  name text not null,
  phone text not null,
  address text not null,
  request text not null default '',
  privacy_agreed boolean not null check (privacy_agreed),
  status text not null default '접수'
    check (status in ('접수','상담중','확정','완료','취소')),
  created_at timestamptz not null default now()
);
create index on public.reservations (user_id, created_at desc);
create index on public.reservations (status, reserve_date);

-- 4) site_settings: 홈페이지 문구/연락처 (key-value) ----------------------
create table public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- 5) reviews: 후기 (관리자 승인 후 노출) -----------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  content text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6) notices: 공지사항 -----------------------------------------------------
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.services      enable row level security;
alter table public.reservations  enable row level security;
alter table public.site_settings enable row level security;
alter table public.reviews       enable row level security;
alter table public.notices       enable row level security;

-- profiles: 본인만 조회/수정 (role 변경은 불가), 관리자는 전체 조회
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- services / site_settings / notices: 누구나 공개분 조회, 관리자만 수정
create policy "services_read" on public.services
  for select using (is_active or public.is_admin());
create policy "services_admin_write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy "settings_read" on public.site_settings for select using (true);
create policy "settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "notices_read" on public.notices
  for select using (is_published or public.is_admin());
create policy "notices_admin_write" on public.notices
  for all using (public.is_admin()) with check (public.is_admin());

-- reservations: 본인 예약만 조회/취소, 관리자는 전체
create policy "resv_insert_own" on public.reservations
  for insert with check (user_id = auth.uid() and status = '접수');
create policy "resv_select_own_or_admin" on public.reservations
  for select using (user_id = auth.uid() or public.is_admin());
create policy "resv_cancel_own" on public.reservations
  for update using (user_id = auth.uid() and status in ('접수','상담중'))
  with check (user_id = auth.uid() and status = '취소');
create policy "resv_admin_all" on public.reservations
  for all using (public.is_admin()) with check (public.is_admin());

-- reviews: 승인된 후기만 공개, 본인 후기 작성, 관리자 승인/삭제
create policy "reviews_read" on public.reviews
  for select using (is_published or user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid() and is_published = false);
create policy "reviews_admin_all" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- 이미지 저장 버킷 (관리자만 업로드, 누구나 조회)
insert into storage.buckets (id, name, public) values ('site-images','site-images', true)
  on conflict (id) do nothing;
create policy "site_images_read" on storage.objects
  for select using (bucket_id = 'site-images');
create policy "site_images_admin_write" on storage.objects
  for all using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());

-- 초기 데이터 --------------------------------------------------------------
-- 가격이 정해지지 않은 서비스는 '상담 후 안내'로 두었습니다. 관리자 페이지에서 수정하세요.
insert into public.services (slug, name, summary, price_label, unit_price, min_price, duration_text, sort_order) values
 ('errand',    '장보기·생활심부름', '식료품·생활용품 구매, 우편 발송, 물건 전달 등 일상 심부름', '시간당 13,000원 (최소 10,000원)', 13000, 10000, '1시간 내외', 1),
 ('companion', '말벗·생활지원',     '말벗, 스마트폰·키오스크 사용 도움, 간단한 생활정보 확인', '상담 후 안내', null, null, '상담 후 안내', 2),
 ('escort',    '생활 동행',         '병원·관공서 방문, 외출, 장보기 이동 동행 (의료행위 제외)', '상담 후 안내', null, null, '상담 후 안내', 3);

insert into public.services
  (slug, name, summary, price_label, base_hours, base_price, regular_base_price,
   extra_hour_price, regular_extra_hour_price, duration_text, sort_order) values
 ('cleaning', '청소', '집안 정리와 청소를 도와드립니다',
  '기본 2시간 38,000원 (정기 35,000원) · 추가 시간 17,000원/시간 (정기 16,000원)',
  2, 38000, 35000, 17000, 16000, '기본 2시간', 4);

insert into public.site_settings (key, value) values
 ('hero_title',    '부모님의 일상에,' || E'\n' || '든든한 곁자리를.'),
 ('hero_subtitle', '장보기부터 생활심부름, 말벗과 생활지원까지 필요한 순간 가까이에서 도와드립니다.'),
 ('phone',         ''),
 ('sms_number',    ''),
 ('kakao_url',     ''),
 ('hero_image_url','');

-- 관리자 지정 방법 (회원가입 후, 본인 이메일로 한 번만 실행):
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
