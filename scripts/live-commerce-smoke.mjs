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
  'js/pasha-baby-commerce.js?v=1.0'
], 'storefront commerce assets');

await expectText('/js/pasha-baby-commerce.js', [
  "fetchAll('discounts'",
  "fetchAll('product_colors'",
  'pb-discount-badge',
  'pb-color-choice'
], 'storefront commerce runtime');

await expectText('/js/language-settings.js', [
  'js/admin-retail-discounts.js?v=1.0',
  'js/admin-product-colors.js?v=1.0'
], 'admin commerce loader');

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

console.log(`\nRetail commerce smoke summary: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
console.log('✓ Pasha Baby live retail commerce smoke passed');
