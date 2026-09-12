import fs from 'node:fs';

const BASE_URL = String(process.env.SMOKE_BASE_URL || 'https://pashababy.restbr.com').replace(/\/$/, '');
const runtimeConfig = fs.readFileSync(new URL('../js/runtime-config.js', import.meta.url), 'utf8');
const SUPABASE_URL = runtimeConfig.match(/supabaseUrl:\s*'([^']+)'/)?.[1] || '';
const SUPABASE_KEY = runtimeConfig.match(/supabasePublishableKey:\s*'([^']+)'/)?.[1] || '';
const failures = [];
let passed = 0;

function ok(label) {
  passed += 1;
  console.log(`✓ ${label}`);
}

function fail(label, detail = '') {
  const text = detail ? `${label}: ${detail}` : label;
  failures.push(text);
  console.error(`✗ ${text}`);
}

async function expectText(url, markers, label) {
  try {
    const target = new URL(url, `${BASE_URL}/`);
    target.searchParams.set('__commerce_smoke', Date.now().toString());
    const response = await fetch(target, { cache: 'no-store', redirect: 'follow' });
    const body = await response.text();
    if (!response.ok) return fail(label, `HTTP ${response.status}`);
    const missing = markers.filter(marker => !body.includes(marker));
    if (missing.length) return fail(label, `missing ${missing.join(', ')}`);
    ok(label);
  } catch (error) {
    fail(label, error?.message || String(error));
  }
}

await expectText('/', [
  'css/pasha-baby-commerce.css?v=1.0',
  'css/pasha-baby-final-tweaks.css?v=1.0',
  'js/pasha-baby-storefront-bundle.js?v=1.0',
  'js/vendor/supabase-2.114.0.min.js'
], 'storefront Arabic-only fixed-discount commerce assets');

await expectText('/js/supabase-config.js', [
  'js/pasha-arabic-only.js?v=1.5'
], 'Arabic-only policy loader');

await expectText('/js/pasha-arabic-only.js', [
  "localStorage.setItem('RESTBR_LANG_V1', 'ar')",
  'js/admin-retail-discounts.js?v=4.0',
  'js/admin-product-colors.js?v=3.0',
  'data-pasha-multilang-hidden'
], 'Arabic-only storefront/admin policy');

await expectText('/js/pasha-baby-commerce.js', [
  "fetchAll('discounts'",
  "fetchAll('product_colors'",
  "fetchAll('products'",
  'scheduleNextDiscountBoundary',
  'RESTBR_LARGE_CATALOG_READY',
  'pb-color-choice'
], 'storefront commerce compatibility runtime');

await expectText('/js/pasha-baby-fixed-discounts.js', [
  '__PASHA_BABY_FIXED_DISCOUNTS_V1__',
  'discount_amount',
  'product.discountAmount = amount',
  'fixedPrice(original, amount)',
  'pb-fixed-discount-chip',
  "scope_type === 'product'",
  "scope_type === 'category'",
  "scope_type === 'restaurant'"
], 'fixed IQD discount storefront runtime');

await expectText('/js/live-prices.js', [
  '__RESTBR_LIVE_PRICES_V3__',
  'fetchAllPriceRows',
  'retailPrice(product, originalPrice)',
  'product?.discountAmount',
  'restbr:fixed-discounts-ready',
  'restbr:catalog-expanded'
], 'fixed-discount-aware live price runtime');

await expectText('/js/admin-retail-discounts.js', [
  '__PASHA_ADMIN_RETAIL_DISCOUNTS_V4__',
  'pbDiscountAmount',
  'discount_amount: amount',
  'discount_percent: 0',
  'pbDiscountQuickBtn',
  "event.target.closest('#pbDiscountQuickBtn')",
  'body.admin-global-light #discountsSettingsPanel'
], 'reliable fixed-IQD discounts admin');

await expectText('/css/pasha-baby-final-tweaks.css', [
  '#smMenu .sm-display-badge.red',
  '#smMenu .pb-discount-badge',
  '.pb-fixed-discount-chip',
  '1.15s'
], 'hot-label removal and discount-chip UI');

await expectText('/js/admin-product-colors.js', [
  '__PASHA_ADMIN_PRODUCT_COLORS_V3__',
  'pbProductColorsEditor',
  'detectColorHex',
  "['اسود', '#111111']",
  'data-color-auto',
  'body.admin-global-light #pbProductColorsEditor'
], 'Arabic-only light-aware product colors admin');

for (const table of ['discounts', 'product_colors']) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      cache: 'no-store',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });
    const text = await response.text();
    if (!response.ok) fail(`Supabase public read: ${table}`, `HTTP ${response.status} ${text.slice(0, 120)}`);
    else if (!Array.isArray(JSON.parse(text))) fail(`Supabase public read: ${table}`, 'response is not an array');
    else ok(`Supabase public read: ${table}`);
  } catch (error) {
    fail(`Supabase public read: ${table}`, error?.message || String(error));
  }
}

try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/discounts?select=id,discount_amount,discount_percent,scope_type,is_active&limit=1`, {
    cache: 'no-store',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });
  const text = await response.text();
  if (!response.ok) fail('Supabase fixed discount schema', `HTTP ${response.status} ${text.slice(0, 160)}`);
  else if (!Array.isArray(JSON.parse(text))) fail('Supabase fixed discount schema', 'response is not an array');
  else ok('Supabase fixed discount schema');
} catch (error) {
  fail('Supabase fixed discount schema', error?.message || String(error));
}

console.log(`\nRetail commerce smoke summary: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
console.log('✓ Pasha Baby live Arabic-only fixed-IQD retail commerce smoke passed');
