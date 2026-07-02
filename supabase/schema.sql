-- ============================================================
-- LA BITÁCORA — schema + RLS
-- Run this in the Supabase SQL editor for a fresh project.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- PROPERTIES ----------
create table properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- ---------- PILLARS ----------
create table pillars (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  color text not null default '#E8401C',
  sort_order int not null default 0
);

-- ---------- STAFF USERS ----------
-- One row per staff member, linked to their Supabase auth account.
create table staff_users (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  auth_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'staff' check (role in ('staff', 'manager')),
  created_at timestamptz not null default now()
);

-- ---------- MOMENTS ----------
create table moments (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  activity_tag text,
  caption text not null,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  submitted_by_type text not null check (submitted_by_type in ('staff', 'guest')),
  submitted_by_name text,
  submitted_by_instagram text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  flagged_for_reuse boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references staff_users(id)
);

create index moments_property_status_idx on moments(property_id, status, created_at desc);

-- ============================================================
-- HELPER: is the current user staff at a given property?
-- ============================================================
create or replace function is_staff_of(target_property_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from staff_users
    where auth_id = auth.uid()
    and property_id = target_property_id
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table properties enable row level security;
alter table pillars enable row level security;
alter table staff_users enable row level security;
alter table moments enable row level security;

-- properties: public read (needed to resolve slug -> id), no public write
create policy "properties are publicly readable"
  on properties for select
  using (true);

-- pillars: public read, staff-only write
create policy "pillars are publicly readable"
  on pillars for select
  using (true);

create policy "staff manage their pillars"
  on pillars for all
  using (is_staff_of(property_id))
  with check (is_staff_of(property_id));

-- staff_users: staff can see their own property's roster, manage own row
create policy "staff can view their property roster"
  on staff_users for select
  using (is_staff_of(property_id));

create policy "staff can update their own row"
  on staff_users for update
  using (auth_id = auth.uid());

-- moments: THE IMPORTANT ONES
-- Public can only ever see approved moments.
create policy "public sees approved moments"
  on moments for select
  using (status = 'approved');

-- Staff can see everything at their property (including pending/rejected).
create policy "staff see all moments at their property"
  on moments for select
  using (is_staff_of(property_id));

-- Guests (anon) can insert, but ALWAYS as pending + submitted_by_type = 'guest'.
-- This is enforced by the check constraint below combined with a trigger
-- that forces status back to 'pending' regardless of what's submitted.
create policy "anyone can submit a guest moment"
  on moments for insert
  to anon
  with check (submitted_by_type = 'guest');

-- Staff can insert as themselves (auto-approved).
create policy "staff can post moments"
  on moments for insert
  to authenticated
  with check (is_staff_of(property_id) and submitted_by_type = 'staff');

-- Only staff can update (approve/reject/flag), scoped to their property.
create policy "staff can moderate moments"
  on moments for update
  using (is_staff_of(property_id))
  with check (is_staff_of(property_id));

-- Trigger: force guest submissions to pending no matter what the client sends,
-- and auto-approve staff submissions at insert time.
create or replace function enforce_moment_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.submitted_by_type = 'guest' then
    new.status := 'pending';
    new.flagged_for_reuse := false;
  elsif new.submitted_by_type = 'staff' then
    new.status := 'approved';
    new.approved_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_enforce_moment_status
  before insert on moments
  for each row execute function enforce_moment_status();

-- ============================================================
-- SEED: La Fortuna property + 7 pillars
-- ============================================================
insert into properties (name, slug) values ('Viajero La Fortuna', 'la-fortuna');

insert into pillars (property_id, name, color, sort_order)
select id, p.name, p.color, p.sort_order
from properties, (values
  ('La Tierra', '#8B5E3C', 1),
  ('La Selva', '#3F6B3B', 2),
  ('La Gente', '#E8401C', 3),
  ('El Agua', '#2E7D9A', 4),
  ('El Sabor', '#C77D1E', 5),
  ('La Aventura', '#4A4A4A', 6),
  ('El Alma', '#8B3A62', 7)
) as p(name, color, sort_order)
where properties.slug = 'la-fortuna';

-- ============================================================
-- STORAGE BUCKET (run separately if not using SQL for storage)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('moments-media', 'moments-media', true)
on conflict (id) do nothing;

-- Public read
create policy "public read moments media"
  on storage.objects for select
  using (bucket_id = 'moments-media');

-- Anyone (guest or staff) can upload, but only images/video, capped size
-- is enforced client-side + you can add a Supabase Storage size limit in
-- the dashboard (Settings > Storage > file size limit).
create policy "anyone can upload moments media"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'moments-media');
