-- =====================================================================
-- OUTBACK ARMS — Customer Accounts migration
-- RUN THIS BEFORE the customer-login feature goes live.
-- It creates customer profiles, a staff flag, and — importantly —
-- LOCKS DOWN the staff-only tables so a signed-up customer can never
-- read leads/orders or edit products. Paste the whole file into the
-- Supabase SQL editor and Run. Safe to re-run (idempotent).
-- =====================================================================

-- 1) PROFILES ---------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  is_staff   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- 2) STAFF CHECK (SECURITY DEFINER so it reads is_staff regardless of RLS)
create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_staff from public.profiles where id = auth.uid()), false);
$$;

-- 3) PROFILE POLICIES -------------------------------------------------
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (auth.uid() = id or public.is_staff());
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert
  with check (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- 4) AUTO-CREATE a profile row on every new signup --------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) BACKFILL existing users + MARK YOUR STAFF ACCOUNT ----------------
insert into public.profiles (id, email)
  select id, email from auth.users on conflict (id) do nothing;
-- 👇 set this to the email of YOUR staff/admin account:
update public.profiles set is_staff = true where email = 'outbackarms@yahoo.com';

-- 6) LEADS: tie to the customer + read = staff-or-owner ---------------
alter table public.leads add column if not exists user_id uuid references auth.users(id);

drop policy if exists "leads readable by staff" on public.leads;
drop policy if exists "leads read staff or owner" on public.leads;
create policy "leads read staff or owner" on public.leads for select to authenticated
  using (public.is_staff() or user_id = auth.uid());

drop policy if exists "leads updatable by staff" on public.leads;
drop policy if exists "leads update staff" on public.leads;
create policy "leads update staff" on public.leads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- (the existing "leads insert by anyone" policy stays — visitors can submit)

-- 7) LOCK DOWN staff-only tables (customers are now 'authenticated'!) --
-- Make sure the staff-only tables exist first (older schemas lacked them).
create table if not exists public.orders (
  id         bigint generated always as identity primary key,
  order_no   text,
  customer   text not null,
  items      text,
  ffl        text default '',
  status     text not null default 'New',
  total      numeric default 0,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  path       text default '/',
  created_at timestamptz not null default now()
);
alter table public.page_views enable row level security;
drop policy if exists "page_views insert by anyone" on public.page_views;
create policy "page_views insert by anyone" on public.page_views
  for insert to anon, authenticated with check (true);

drop policy if exists "products writable by staff" on public.products;
create policy "products writable by staff" on public.products for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "orders staff all" on public.orders;
create policy "orders staff all" on public.orders for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "page_views readable by staff" on public.page_views;
create policy "page_views readable by staff" on public.page_views for select to authenticated
  using (public.is_staff());

-- Done. Customers can now sign up & see only THEIR wishlist + requests;
-- only is_staff accounts can reach the admin console and its data.
