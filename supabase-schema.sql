-- =====================================================================
-- OUTBACK ARMS v3 — Supabase schema
-- Paste this whole file into  Supabase ▸ SQL Editor ▸ New query ▸ Run.
-- It creates the products + wishlists tables, Row Level Security policies,
-- and seeds the 8 demo products so the storefront lights up immediately.
-- =====================================================================

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id         bigint generated always as identity primary key,
  name       text    not null,
  brand      text    not null,
  cat        text    not null default 'Handguns',
  price      numeric not null default 0,
  stock      integer not null default 0,
  cond       text    not null default 'New',
  "desc"     text    default '',
  img        text    default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh on every write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

-- Anyone (anon) may READ the catalog...
drop policy if exists "products readable by all" on public.products;
create policy "products readable by all"
  on public.products for select
  using (true);

-- ...but only signed-in staff may INSERT / UPDATE / DELETE.
drop policy if exists "products writable by staff" on public.products;
create policy "products writable by staff"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- ---------- WISHLISTS ----------
-- Anonymous, device-scoped wishlists (mirror of the browser's localStorage).
-- When you add real customer accounts, add a user_id column + policy that
-- restricts rows to auth.uid().
create table if not exists public.wishlists (
  device_id  text primary key,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wishlists enable row level security;

-- Demo-friendly policy: anon can read/write its own device row.
-- Tighten this for production (e.g. tie to auth.uid()).
drop policy if exists "wishlist anon upsert" on public.wishlists;
create policy "wishlist anon upsert"
  on public.wishlists for all
  to anon, authenticated
  using (true)
  with check (true);

-- ---------- LEADS ----------
-- Every website form (inquiry, hold, class signup, SMS/email opt-in,
-- trade-in request) inserts one row here. Visitors may INSERT; only
-- signed-in staff may READ — so lead contact info is never public.
create table if not exists public.leads (
  id         bigint generated always as identity primary key,
  type       text not null,                 -- 'inquiry' | 'hold' | 'class_signup' | 'sms_signup' | 'email_signup' | 'newsletter'
  payload    jsonb not null default '{}'::jsonb,
  source     text default 'website',
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "leads insert by anyone" on public.leads;
create policy "leads insert by anyone"
  on public.leads for insert
  to anon, authenticated
  with check (true);

drop policy if exists "leads readable by staff" on public.leads;
create policy "leads readable by staff"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "leads updatable by staff" on public.leads;
create policy "leads updatable by staff"
  on public.leads for update
  to authenticated
  using (true) with check (true);

-- ---------- ORDERS ----------
-- Staff-only order tracking (holds, background checks, pickups, shipments).
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

drop policy if exists "orders staff all" on public.orders;
create policy "orders staff all"
  on public.orders for all to authenticated
  using (true) with check (true);

-- seed a few demo orders (run once)
insert into public.orders (order_no, customer, items, ffl, status, total) values
 ('#2841','D. Jameson','Sig Cross 6.5','On file','FFL Hold',1649),
 ('#2840','M. Reilly','Vortex Strike Eagle','—','Ready for pickup',549),
 ('#2839','J. O''Connor','Glock G19 Gen 5','Outgoing','Background check',649),
 ('#2838','K. Sullivan','500rd 5.56 case','n/a','Shipped',249);

-- ---------- SEED (8 demo products) ----------
insert into public.products (name, brand, cat, price, stock, cond, "desc", img) values
 ('G19 Gen 5 9mm','Glock','Handguns',649,4,'New','Striker-fired 9mm. 15+1 capacity, 4.02" barrel. The most popular concealed-carry handgun in the US.','https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&h=450&fit=crop&q=70'),
 ('10/22 Tactical .22LR #1261','Ruger','Used',329,1,'Used · Like New','Iconic semi-auto .22LR with tactical stock. Trade-in from a local hunter, ~200 rounds through it.','https://images.unsplash.com/photo-1581955957646-b5a446b6100a?w=600&h=450&fit=crop&q=70'),
 ('Big Boy H006 .44 Mag','Henry Repeating Arms','Rifles',899,3,'New','Brass-receiver lever action. American-made in NJ. 10-round tube magazine.','https://images.unsplash.com/photo-1683580366058-26f0afb5a21f?w=600&h=450&fit=crop&q=70'),
 ('Strike Eagle 1-8x24 FFP','Vortex','Optics',549,7,'New','First focal plane riflescope. 1-8x magnification, illuminated reticle. Lifetime warranty.','https://images.unsplash.com/photo-1669489890884-baff10f74b49?w=600&h=450&fit=crop&q=70'),
 ('M1A SOCOM Tanker .308','Springfield Armory','Rifles',1899,2,'New','16.25" barrel M1A in .308 Win. Walnut stock. Made in USA.','https://images.unsplash.com/photo-1610165539827-5d3ed2512958?w=600&h=450&fit=crop&q=70'),
 ('M&P Shield 9mm','Smith & Wesson','Used',379,2,'Used · Excellent','Slim single-stack 9mm for concealed carry. Comes with 2 magazines.','https://images.unsplash.com/photo-1594232352231-11a0958d131c?w=600&h=450&fit=crop&q=70'),
 ('457 American 22LR','CZ-USA','Rifles',489,5,'New','Czech-made bolt-action 22LR. Walnut stock, adjustable trigger. Sub-MOA accuracy.','https://images.unsplash.com/photo-1700774607099-8c4631ee9764?w=600&h=450&fit=crop&q=70'),
 ('5.56 NATO 55gr — 500rd Case','Federal','Ammo',249,0,'Clearance','American Eagle 55gr FMJ. 500-round case. Brass case, boxer primed, reloadable.','https://images.unsplash.com/photo-1591123720164-de1348028a82?w=600&h=450&fit=crop&q=70')
on conflict do nothing;

-- ---------- PRODUCT PHOTOS (Storage) ----------
-- The admin uploader resizes photos to 800px and uploads them here, storing
-- the public URL on the product. Public read; only signed-in staff can write.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "product photos public read" on storage.objects;
create policy "product photos public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "product photos staff insert" on storage.objects;
create policy "product photos staff insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "product photos staff update" on storage.objects;
create policy "product photos staff update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos');

drop policy if exists "product photos staff delete" on storage.objects;
create policy "product photos staff delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos');

-- ---------- STAFF USER ----------
-- Create at least one staff login in  Authentication ▸ Users ▸ Add user
-- (email + password). That account signs into the admin console and is the
-- only role allowed to write to products (per the RLS policy above).
