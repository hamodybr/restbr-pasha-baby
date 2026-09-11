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
  'پاشا بيبي',
  'js/runtime-config.js',
  'js/vendor/supabase-2.114.0.min.js',
  'js/pasha-baby-storefront-bundle.js?v=1.0',
  'css/pasha-baby-final-tweaks.css?v=1.0'
], 'storefront');

if (indexHtml.includes('id="smLangs"')) fail('Arabic-only storefront', 'language picker still present');
else ok('Arabic-only storefront has no language picker');

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
  "[/🍽️?/g, '📦']"
], 'retail dashboard copy layer');

await expectText('/js/pasha-arabic-only.js', [
  "localStorage.setItem('RESTBR_LANG_V1', 'ar')",
  'js/admin-retail-discounts.js?v=4.0',
  'js/admin-product-colors.js?v=3.0',
  'js/admin-invoice-settings.js?v=1.0',
  'js/admin-orders-customers.js?v=2.0',
  'js/pasha-admin-product-editor-cleanup.js?v=1.0',
  'js/arabic-news-ticker.js?v=1.1',
  'js/pasha-number-normalizer.js?v=1.2',
  "window.addEventListener('restbr:ready', keepArabic, { once: true })"
], 'Arabic-only policy');

await expectText('/js/admin-orders-customers.js', [
  '@page{size:${pageSize};margin:${cfg.page_margin_mm}mm}',
  'window.PashaInvoiceSettings?.normalize',
  'font-family:${invoiceFont}',
  'min-height:${cfg.row_min_height_mm}mm',
  'border-bottom:${cfg.leader_width_pt}pt ${cfg.leader_style}'
], 'saved configurable laser invoice renderer');

await expectText('/js/admin-invoice-pdf.js', [
  "doc.addFont('PashaInvoiceCustom.ttf', 'PashaInvoiceCustom', 'normal')",
  'drawAmount',
  "doc.output('blob')",
  "embeddedFont: 'PashaInvoiceCustom'"
], 'direct PDF renderer with embedded custom Arabic font');

await expectText('/js/admin-invoice-settings.js', [
  'إعدادات الفاتورة',
  'المعاينة المباشرة',
  'قالب مضغوط لأصناف كثيرة',
  "from('invoice-assets').upload",
  'mergeIntoUiDesignSettings'
], 'complete invoice settings editor');

await expectText('/js/pasha-admin-product-editor-cleanup.js', [
  'p_is_hot',
  'np_is_hot',
  'p_availability_schedule_enabled',
  'np_availability_schedule_enabled'
], 'Pasha retail product editor cleanup');

await expectText('/js/admin-retail-discounts.js', [
  '__PASHA_ADMIN_RETAIL_DISCOUNTS_V4__',
  'pbDiscountAmount',
  'discount_amount: amount',
  'discount_percent: 0'
], 'fixed amount discount admin');

await expectText('/js/pasha-baby-fixed-discounts.js', [
  '__PASHA_BABY_FIXED_DISCOUNTS_V1__',
  'discount_amount',
  'product.discountAmount = amount',
  'pb-product-action-row',
  "chip.textContent = 'خصم'"
], 'fixed amount storefront discounts');

await expectText('/js/live-prices.js', [
  'const PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000',
  'document.visibilityState !== "visible"',
  'status === "SUBSCRIBED"'
], 'low-overhead Realtime price sync');

await expectText('/js/admin-large-catalog.js', [
  'function catalogMayBeTruncated()',
  'async function ensureCompleteCatalog()',
  'rows.length >= PAGE_SIZE'
], 'conditional large-catalog hydration');

await expectText('/css/pasha-baby-final-tweaks.css', [
  '#smMenu .sm-display-badge.red',
  '#smMenu .pb-discount-badge',
  '.pb-product-action-row',
  '.pb-fixed-discount-chip',
  '1.15s'
], 'Pasha final UI tweaks');

await expectText('/sw.js', [
  'restbr-pasha-baby-v40',
  'function staleWhileRevalidate(event, request)',
  'event.respondWith(staleWhileRevalidate(event, request))',
  'js/restbr-hardening.js',
  'js/pasha-arabic-only.js?v=1.6',
  'js/pasha-number-normalizer.js?v=1.2',
  'js/pasha-baby-storefront-bundle.js?v=1.0',
  'css/pasha-baby-final-tweaks.css?v=1.0',
  'js/arabic-news-ticker.js?v=1.1',
  'assets/product-thumbnails/9c4f903c-a78b-4620-9279-3c696235e55c.webp'
], 'service worker');

await expectText('/js/pasha-number-normalizer.js', [
  'RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE',
  'data-pb-native-number',
  "document.addEventListener('focusin'",
  "document.addEventListener('keydown'"
], 'iPhone localized-number hard fix');

try {
  const { response, body } = await get('/manifest.webmanifest', { json: true });
  if (!response.ok) fail('manifest', `HTTP ${response.status}`);
  else if (!/پاشا\s*بيبي/.test(String(body?.name || ''))) fail('manifest', 'wrong app identity');
  else if (String(body?.lang || '') !== 'ar' || String(body?.dir || '') !== 'rtl') fail('manifest', 'Arabic/RTL metadata missing');
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
  else {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) fail('Supabase fixed discount schema', 'response is not an array');
    else ok('Supabase fixed discount schema');
  }
} catch (error) {
  fail('Supabase fixed discount schema', error?.message || String(error));
}

console.log(`\nLive smoke summary: ${passed.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(item => console.error(` - ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby live Arabic-only fixed-discount delivery smoke test passed');
