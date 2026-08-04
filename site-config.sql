-- =====================================================================
-- OUTBACK ARMS — Site config (powers the admin-editable promo bar)
-- A tiny key/value store. Public can read; only staff can write.
-- Run once in Supabase ▸ SQL Editor. Needs is_staff() from customer-accounts.sql.
-- =====================================================================
create table if not exists public.site_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;

drop policy if exists "site_config readable by all" on public.site_config;
create policy "site_config readable by all" on public.site_config for select using (true);

drop policy if exists "site_config writable by staff" on public.site_config;
create policy "site_config writable by staff" on public.site_config for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
