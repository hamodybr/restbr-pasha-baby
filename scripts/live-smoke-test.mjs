import fs from 'node:fs';

const BASE_URL = String(process.env.SMOKE_BASE_URL || 'https://pashababy.restbr.com').replace(/\/$/, '');
const runtimeConfig = fs.readFileSync(new URL('../js/runtime-config.js', import.meta.url), 'utf8');
const SUPABASE_URL = runtimeConfig.match(/supabaseUrl:\s*'([^']+)'/)?.[1] || '';
const SUPABASE_KEY = runtimeConfig.match(/supabasePublishableKey:\s*'([^']+)'/)?.[1] || '';
const failures = [];
const passed = [];

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) || SUPABASE_KEY.length < 20) {
  throw new Error('Pasha runtime Supabase public configuration is missing');
}

function ok(label) {
  passed.push(label);
  console.log(`✓ ${label}`);
}

function fail(label, detail = '') {
  const message = detail ? `${label}: ${detail}` : label;
  failures.push(message);
  console.error(`✗ ${message}`);
}

async function get(path, { json = false, headers = {} } = {}) {
  const url = new URL(path, `${BASE_URL}/`);
  url.searchParams.set('__smoke', Date.now().toString());
  const response = await fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'RestBr-Pasha-Delivery-Smoke/1.0',
      ...headers
    }
  });
  const body = json ? await response.json() : await response.text();
  return { response, body, url: response.url };
}

async function expectText(path, markers, label) {
  try {
    const { response, body } = await get(path);
    if (!response.ok) {
      fail(label, `HTTP ${response.status}`);
      return '';
    }

    const missing = markers.filter(marker => !body.includes(marker));
    if (missing.length) fail(label, `missing marker ${missing.join(', ')}`);
    else ok(`${label} (${response.status})`);

    return body;
  } catch (error) {
    fail(label, error?.message || String(error));
    return '';
  }
}

function localRefs(html) {
  const refs = new Set();
  if (!html) return [];
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.includes('${') || value.includes('{{')) continue;
    if (/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(value)) continue;
    refs.add(value);
  }
  return [...refs];
}

async function checkAsset(ref, source) {
  try {
    const url = new URL(ref, `${BASE_URL}/${source}`);
    url.searchParams.set('__smoke', Date.now().toString());
    const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    if (!response.ok) fail(`asset ${ref}`, `HTTP ${response.status}`);
    else ok(`asset ${ref}`);
  } catch (error) {
    fail(`asset ${ref}`, error?.message || String(error));
  }
}

function extractMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  if (a?.[1]) return a[1];
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'));
  return b?.[1] || '';
}

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  const sig = [137,80,78,71,13,10,26,10];
  if (!sig.every((v, i) => buffer[i] === v)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const indexHtml = await expectText('/', [
  'Pasha Baby',
  'js/runtime-config.js',
  'js/pasha-baby-storefront-v2.js',
  'css/pasha-baby-footer-v2.css'
], 'storefront');

const ogImage = extractMeta(indexHtml, 'og:image');
if (!ogImage) {
  fail('social preview image', 'og:image is missing');
} else {
  try {
    const response = await fetch(ogImage, {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'user-agent': 'WhatsApp/2.26 RestBr-Preview-Smoke/1.0' }
    });
    const type = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    const dims = pngDimensions(bytes);
    console.log(`ℹ social preview image: HTTP ${response.status}; ${type || 'unknown type'}; ${bytes.length} bytes${dims ? `; ${dims.width}x${dims.height}` : ''}`);
    if (!response.ok) fail('social preview image', `HTTP ${response.status}`);
    else if (!/^image\//i.test(type)) fail('social preview image', `unexpected content-type ${type || 'none'}`);
    else if (bytes.length < 1024) fail('social preview image', `suspiciously small (${bytes.length} bytes)`);
    else if (bytes.length > 5 * 1024 * 1024) fail('social preview image', `too large for reliable messaging previews (${bytes.length} bytes)`);
    else if (dims && (dims.width < 300 || dims.height < 200)) fail('social preview image', `dimensions too small (${dims.width}x${dims.height})`);
    else ok('social preview image is externally fetchable');
  } catch (error) {
    fail('social preview image', error?.message || String(error));
  }
}

const adminHtml = await expectText('/admin.html', [
  'Admin Dashboard',
  'js/runtime-config.js',
  'js/supabase-config.js'
], 'admin page');

try {
  const response = await fetch(`${BASE_URL}/admin`, { redirect: 'manual', cache: 'no-store' });
  if ([200, 301, 302, 307, 308].includes(response.status)) ok(`friendly admin route /admin (${response.status})`);
  else console.log(`ℹ friendly admin route /admin returned ${response.status}; canonical admin.html remains healthy`);
} catch (error) {
  console.log(`ℹ friendly admin route check skipped: ${error?.message || error}`);
}

await expectText('/js/pasha-baby-admin-copy.js', [
  "[/المنيو/g, 'المتجر']",
  "[/منيو/g, 'متجر']",
  "[/\\bMenu\\b/g, 'Store']",
  "[/🍽️?/g, '📦']"
], 'retail dashboard copy layer');

await expectText('/sw.js', [
  'restbr-pasha-baby-v',
  'js/restbr-hardening.js',
  'js/pasha-baby-storefront-v2.js'
], 'service worker');

try {
  const { response, body } = await get('/manifest.webmanifest', { json: true });
  if (!response.ok) fail('manifest', `HTTP ${response.status}`);
  else if (!/Pasha Baby/i.test(String(body?.name || ''))) fail('manifest', 'wrong app identity');
  else {
    ok('manifest');
    for (const icon of body.icons || []) await checkAsset(icon.src, '');
  }
} catch (error) {
  fail('manifest', error?.message || String(error));
}

const refs = new Set([
  ...localRefs(indexHtml),
  ...localRefs(adminHtml)
]);
for (const ref of refs) await checkAsset(ref, '');

for (const table of ['categories', 'products', 'product_options', 'restaurant_settings']) {
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
    else {
      const rows = JSON.parse(text);
      if (!Array.isArray(rows)) fail(`Supabase public read: ${table}`, 'response is not an array');
      else ok(`Supabase public read: ${table}`);
    }
  } catch (error) {
    fail(`Supabase public read: ${table}`, error?.message || String(error));
  }
}

console.log(`\nLive smoke summary: ${passed.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(item => console.error(` - ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby live delivery smoke test passed');
