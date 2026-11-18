// =====================================================================
// Outback Arms — SEO page generator
// Reads the live product inventory from Supabase (public anon key, same
// read the storefront uses) and writes ONE static, crawlable HTML page
// per gun at /guns/<slug>, a /guns hub page, and a fresh sitemap.xml.
//
// Why: the storefront renders inventory with JavaScript after load, so
// search engines can't reliably see individual guns. These static pages
// give Google a real URL + title + description + Product data per item,
// each linking back to the live "Hold this gun" view on the main site.
//
// Run:  node scripts/gen-seo.mjs
// Local test (no Supabase):  GEN_LOCAL_PRODUCTS=mock.json node scripts/gen-seo.mjs
// Safe: on any fetch failure it exits WITHOUT touching existing pages.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://outbackarms.com';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GUNS_DIR = path.join(ROOT, 'guns');

// ---- read Supabase URL + public anon key straight from index.html ----
function readConfig() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const url = (html.match(/SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
  const key = (html.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/) || [])[1];
  return { url, key };
}

async function loadProducts() {
  // Local test mode: read a mock JSON array instead of calling Supabase.
  if (process.env.GEN_LOCAL_PRODUCTS) {
    const raw = fs.readFileSync(process.env.GEN_LOCAL_PRODUCTS, 'utf8');
    return JSON.parse(raw);
  }
  const { url, key } = readConfig();
  if (!url || !key) throw new Error('Could not read SUPABASE_URL / ANON_KEY from index.html');
  const res = await fetch(`${url}/rest/v1/products?select=*&order=created_at.desc&limit=2000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
  return res.json();
}

// ---- helpers (slug matches the app's productSlug exactly) ----
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const productSlug = (p) => slugify(`${p.brand}-${p.name}`);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const PLACEHOLDER = `${SITE}/og-image.png`;

function priceOf(p) {
  const sale = Number(p.sale_price);
  if (sale > 0 && sale < Number(p.price)) return { now: sale, was: Number(p.price) };
  return { now: Number(p.price || 0), was: null };
}
function stockLine(p) {
  const s = Number(p.stock || 0);
  if (s <= 0) return 'Currently out — call to confirm availability';
  if (s === 1) return 'Only 1 left';
  return `In stock (${s})`;
}
function specRows(p) {
  const s = p.specs || {};
  const map = [['Caliber', s.caliber], ['Barrel', s.barrel], ['Twist', s.twist], ['Action', s.action], ['Accuracy', s.moa], ['Discipline', s.discipline]];
  return map.filter(([, v]) => v && String(v).trim());
}

function productJsonLd(p, slug) {
  const { now } = priceOf(p);
  const avail = Number(p.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const cond = /used/i.test(p.cond || '') ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition';
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: `${p.brand} ${p.name}`,
    image: [p.img || PLACEHOLDER],
    description: descOf(p),
    category: p.cat || 'Firearms',
    brand: { '@type': 'Brand', name: p.brand || 'Outback Arms' },
    offers: {
      '@type': 'Offer',
      url: `${SITE}/guns/${slug}`,
      priceCurrency: 'USD',
      price: String(now),
      availability: avail,
      itemCondition: cond,
      seller: {
        '@type': 'GunStore',
        name: 'Outback Arms',
        telephone: '+1-781-585-6615',
        address: { '@type': 'PostalAddress', streetAddress: '376 Main St', addressLocality: 'Plympton', addressRegion: 'MA', postalCode: '02367', addressCountry: 'US' },
      },
    },
  };
}

function descOf(p) {
  const bits = [`${p.brand} ${p.name}`, p.cond, money(priceOf(p).now)].filter(Boolean).join(' · ');
  const extra = (p.desc || '').replace(/\s+/g, ' ').trim();
  const tail = 'In stock at Outback Arms, Plympton MA. Hold online, pick up in store. FFL dealer serving the South Shore.';
  return `${bits}. ${extra ? extra + ' ' : ''}${tail}`.slice(0, 300);
}

const PAGE_CSS = `:root{--bg:#0b0c0d;--card:#141518;--ink:#f3f1ec;--mute:#9a968e;--accent:#ef6c1f;--line:#26272b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--accent)}.wrap{max-width:860px;margin:0 auto;padding:20px 16px 60px}
.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:24px;font-weight:700}
.top .sub{color:var(--mute);font-weight:400;font-size:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.card img{width:100%;height:auto;display:block;background:#000;aspect-ratio:4/3;object-fit:cover}
.body{padding:22px}.cat{color:var(--mute);text-transform:uppercase;letter-spacing:.06em;font-size:12px;margin:0 0 6px}
h1{font-size:28px;margin:0 0 10px;line-height:1.2}.price{font-size:26px;font-weight:800;color:var(--accent);margin:0 0 4px}
.was{color:var(--mute);text-decoration:line-through;font-size:18px;margin-left:8px;font-weight:400}
.stock{color:#7fd38a;font-weight:600;margin:0 0 16px}.desc{color:#d9d6cf;margin:0 0 18px}
table{border-collapse:collapse;width:100%;margin:0 0 20px;font-size:14px}td{border-bottom:1px solid var(--line);padding:8px 0}
td.k{color:var(--mute);width:40%}
.cta{display:inline-block;background:var(--accent);color:#111;font-weight:800;text-decoration:none;padding:13px 20px;border-radius:10px;margin:0 10px 10px 0}
.cta2{display:inline-block;color:var(--ink);text-decoration:none;padding:13px 4px;font-weight:600}
.legal{color:var(--mute);font-size:12px;border-top:1px solid var(--line);margin-top:26px;padding-top:16px}
.foot{color:var(--mute);font-size:13px;margin-top:30px;text-align:center}
.list{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.list a{display:flex;justify-content:space-between;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-decoration:none;color:var(--ink)}
.list a .p{color:var(--accent);font-weight:700;white-space:nowrap}`;

function shell(title, desc, canonical, bodyHtml, jsonLd, ogImage) {
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Outback Arms">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(ogImage || PLACEHOLDER)}">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
${ld}
<style>${PAGE_CSS}</style>
</head>
<body><div class="wrap">
<div class="top"><a href="/">OUTBACK ARMS</a><span class="sub">FFL Dealer · Plympton, MA · 781-585-6615</span></div>
${bodyHtml}
<div class="foot">Outback Arms · 376 Main St, Plympton, MA 02367 · <a href="tel:+17815856615">781-585-6615</a> · <a href="/">Home</a> · <a href="/guns">All inventory</a></div>
</div></body></html>`;
}

function productPage(p, slug) {
  const { now, was } = priceOf(p);
  const rows = specRows(p);
  const specTable = rows.length
    ? `<table>${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`
    : '';
  const condCat = [p.cat, p.cond].filter(Boolean).map(esc).join(' · ');
  const body = `<div class="card">
<img src="${esc(p.img || PLACEHOLDER)}" alt="${esc(p.brand + ' ' + p.name)}" width="800" height="600" loading="eager">
<div class="body">
<p class="cat">${condCat}</p>
<h1>${esc(p.brand)} ${esc(p.name)}</h1>
<p class="price">${money(now)}${was ? `<span class="was">${money(was)}</span>` : ''}</p>
<p class="stock">${esc(stockLine(p))}</p>
${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
${specTable}
<a class="cta" href="/#${slug}">View &amp; Hold This Gun →</a>
<a class="cta2" href="/guns">← Browse all inventory</a>
<p class="legal">All firearm transfers comply with Massachusetts law and require a valid license (LTC/FID), an FFL transfer, and an in-store background check. Prices subject to change; availability verified in-store. Call 781-585-6615 to confirm.</p>
</div></div>`;
  const title = `${p.brand} ${p.name} — ${money(now)} | Outback Arms (Plympton, MA)`;
  return shell(title, descOf(p), `${SITE}/guns/${slug}`, body, productJsonLd(p, slug), p.img);
}

function hubPage(items) {
  const lis = items.map(({ p, slug }) =>
    `<li><a href="/guns/${slug}"><span>${esc(p.brand)} ${esc(p.name)}</span><span class="p">${money(priceOf(p).now)}</span></a></li>`
  ).join('\n');
  const body = `<p class="cat">In-Stock Inventory</p>
<h1>Firearms, Optics &amp; Ammo — In Stock</h1>
<p class="desc">Every item below is verified in-store at Outback Arms in Plympton, MA. Click any item for details, then hold it online and pick it up in store.</p>
<ul class="list">${lis}</ul>`;
  const title = 'All Firearms, Optics & Ammo In Stock | Outback Arms (Plympton, MA)';
  const desc = `Browse every gun, optic, and ammo in stock at Outback Arms — a family-run FFL dealer in Plympton, MA. ${items.length} items, verified in-store. Hold online, pick up tomorrow.`;
  return shell(title, desc, `${SITE}/guns`, body, null, PLACEHOLDER);
}

function sitemap(items) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `<url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${SITE}/guns</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    ...items.map(({ slug }) => `<url><loc>${SITE}/guns/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join('\n  ')}\n</urlset>\n`;
}

// ---- main ----
async function main() {
  let products;
  try {
    products = await loadProducts();
  } catch (e) {
    console.error('[gen-seo] Could not load products:', e.message, '— leaving existing pages untouched.');
    process.exit(0); // never destroy good pages on a transient failure
  }
  if (!Array.isArray(products) || !products.length) {
    console.error('[gen-seo] No products returned — leaving existing pages untouched.');
    process.exit(0);
  }

  // slug per product, de-duplicated (second collision gets -<id>)
  const seen = new Set();
  const items = [];
  for (const p of products) {
    let slug = productSlug(p);
    if (!slug) continue;
    if (seen.has(slug)) slug = `${slug}-${p.id}`;
    seen.add(slug);
    items.push({ p, slug });
  }

  // fresh guns/ directory each run (keeps it in sync with the catalog)
  fs.rmSync(GUNS_DIR, { recursive: true, force: true });
  fs.mkdirSync(GUNS_DIR, { recursive: true });

  for (const { p, slug } of items) {
    fs.writeFileSync(path.join(GUNS_DIR, `${slug}.html`), productPage(p, slug));
  }
  fs.writeFileSync(path.join(GUNS_DIR, 'index.html'), hubPage(items));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap(items));

  console.log(`[gen-seo] Wrote ${items.length} product pages + /guns hub + sitemap.xml`);
}

main();
