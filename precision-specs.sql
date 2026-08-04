-- =====================================================================
-- OUTBACK ARMS — Precision Spec Pack
-- Adds one JSON column to hold precision rifle specs (caliber, twist,
-- barrel, action, accuracy guarantee, discipline tags). Safe to re-run.
-- Run it once in Supabase ▸ SQL Editor, then upload spec'd rifles.
-- =====================================================================
alter table public.products
  add column if not exists specs jsonb not null default '{}'::jsonb;

-- Optional: index for fast caliber filtering once you have lots of rifles.
create index if not exists products_specs_caliber_idx
  on public.products ((specs->>'caliber'));
