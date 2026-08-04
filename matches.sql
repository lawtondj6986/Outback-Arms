-- =====================================================================
-- OUTBACK ARMS — New England Match Calendar
-- Staff-managed table of upcoming precision matches. Public can read;
-- only staff can add/edit/delete. Run once in Supabase ▸ SQL Editor.
-- Requires the is_staff() function from customer-accounts.sql.
-- =====================================================================
create table if not exists public.matches (
  id         bigint generated always as identity primary key,
  date       date not null,
  title      text not null,
  discipline text default '',
  range_name text default '',
  location   text default '',
  url        text default '',
  notes      text default '',
  created_at timestamptz not null default now()
);
alter table public.matches enable row level security;

drop policy if exists "matches readable by all" on public.matches;
create policy "matches readable by all" on public.matches for select using (true);

drop policy if exists "matches writable by staff" on public.matches;
create policy "matches writable by staff" on public.matches for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create index if not exists matches_date_idx on public.matches (date);
