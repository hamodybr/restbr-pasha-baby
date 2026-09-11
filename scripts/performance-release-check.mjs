import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const failures = [];
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  const source = read(file);
  if (!source.includes(marker)) failures.push(`${file}: missing ${label}`);
};
const forbidText = (file, marker, label = marker) => {
  const source = read(file);
  if (source.includes(marker)) failures.push(`${file}: forbidden ${label}`);
};

for (const file of [
  'js/live-prices.js',
  'js/pasha-arabic-only.js',
  'js/admin-large-catalog.js',
  'sw.js'
]) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

// Live prices: Realtime stays immediate, full-table reconciliation is only a
// low-frequency safety net and never runs while the storefront tab is hidden.
requireText('js/live-prices.js', 'const PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000', '5-minute price reconciliation');
requireText('js/live-prices.js', 'document.visibilityState !== "visible"', 'hidden-tab price-sync guard');
requireText('js/live-prices.js', 'status === "SUBSCRIBED"', 'Realtime subscription sync');
forbidText('js/live-prices.js', 'setInterval(() => void syncAllPrices(), 30000)', 'legacy 30-second full price polling');

// Arabic-only storefront must not watch every DOM mutation. It also throttles
// the existing scroll work to one animation frame and removes the one-minute
// schedule timer entirely when the loaded catalog has no scheduled items.
forbidText('js/pasha-arabic-only.js', 'new MutationObserver(keepArabic)', 'storefront-wide Arabic MutationObserver');
requireText('js/pasha-arabic-only.js', "window.addEventListener('restbr:ready', keepArabic, { once: true })", 'one-shot Arabic ready handler');
requireText('js/pasha-arabic-only.js', "window.removeEventListener('scroll', baseScrollEffects)", 'raw scroll listener replacement');
requireText('js/pasha-arabic-only.js', 'requestAnimationFrame(() => {', 'scroll rAF throttle');
requireText('js/pasha-arabic-only.js', 'clearInterval(window.__RESTBR_SCHEDULE_TIMER__)', 'unused schedule timer removal');
requireText('js/pasha-arabic-only.js', 'availability_schedule_enabled === true', 'schedule-aware timer guard');

// Admin large-catalog fallback should only paginate when a normal Supabase page
// could actually be truncated at the 1000-row boundary.
requireText('js/admin-large-catalog.js', 'function catalogMayBeTruncated()', 'large-catalog truncation guard');
requireText('js/admin-large-catalog.js', 'async function ensureCompleteCatalog()', 'conditional full-catalog hydration');
requireText('js/admin-large-catalog.js', 'rows.length >= PAGE_SIZE', '1000-row boundary detection');

// Repeat public visits should come from local cache immediately while a fresh
// copy is revalidated in the background. Admin remains network-first/no-store.
requireText('sw.js', 'restbr-pasha-baby-v40', 'stable first-paint cache generation');
requireText('sw.js', 'function staleWhileRevalidate(event, request)', 'stale-while-revalidate strategy');
requireText('sw.js', 'event.respondWith(staleWhileRevalidate(event, request))', 'public code cache fast path');
requireText('sw.js', 'networkFirst(request, { noStore: true })', 'fresh admin asset path');

// First visit: avoid a second 2MB+ logo request for favicon/apple icon, warm the
// the Supabase API connection, and never rescan the entire document for logo mutations.
requireText('index.html', 'rel="preconnect" href="https://wlollfpmjzenhkjwxrqo.supabase.co"', 'Supabase preconnect');
requireText('index.html', 'src="js/vendor/supabase-2.114.0.min.js"', 'self-hosted pinned Supabase browser SDK');
requireText('index.html', 'href="assets/favicon.png"', 'local lightweight favicon');
requireText('index.html', 'href="assets/apple-touch-icon.png"', 'local lightweight Apple icon');
requireText('index.html', 'window.addEventListener("restbr:ready",scanBrandLogo,{once:true})', 'one-shot live brand icon refresh');
forbidText('index.html', 'new MutationObserver(scanBrandLogo)', 'global brand-logo MutationObserver');

// Existing image pipeline is part of the release performance contract: product
// uploads are compressed to WebP/JPEG, image elements lazy-load, and immutable
// product URLs get one-year browser/cache lifetime.
requireText('js/admin-image-optimizer.js', "canvasToBlob(canvas, 'image/webp'", 'WebP product-image optimization');
requireText('js/admin-image-optimizer.js', "cacheControl: '31536000'", 'one-year product image cache');
requireText('js/app.js', 'loading="lazy"', 'lazy product images');
requireText('js/app.js', 'decoding="async"', 'async product image decode');
requireText('index.html', 'css/style.css?v=4.1', 'original storefront base CSS order');
requireText('index.html', 'css/pasha-baby-final-tweaks.css?v=1.0', 'original storefront override CSS order');
requireText('index.html', 'js/pasha-baby-storefront-bundle.js?v=1.0', 'storefront JavaScript bundle');
requireText('index.html', 'id="pbBrand" class="pb-brand"', 'server-rendered brand layout');
requireText('index.html', 'id="pbStoreHeroV2" class="pb-store-hero"', 'server-rendered hero layout');
requireText('index.html', '__smIntroEarlyDismissTimer', 'data-independent intro dismissal');
requireText('index.html', 'html.sm-hours-pending #smOrderStateBanner', 'pending-hours banner flash guard');
requireText('js/cart.js', 'banner.hidden=hoursPending||allowed', 'resolved-hours order banner guard');
requireText('css/pasha-baby-storefront-v2.css', 'min-height:50px;', 'reserved search host height');
requireText('css/pasha-baby-retail-v4.css', 'min-height:48px!important;margin:8px auto 10px!important', 'reserved quick-action height');
requireText('index.html', 'rel="preload" as="image" href="assets/pasha-baby-logo-256.webp"', 'optimized logo preload');
requireText('js/app.js', 'data-original-image=', 'original product-image fallback');
requireText('js/app.js', 'RESTBR_OPTIMIZED_MEDIA_URL', 'optimized product card images');
requireText('js/url-safety.js', 'assets/product-thumbnails/9c4f903c-a78b-4620-9279-3c696235e55c.webp', 'B2 card thumbnail mapping');

const sdkDigest = createHash('sha384')
  .update(fs.readFileSync('js/vendor/supabase-2.114.0.min.js'))
  .digest('base64');
if (sdkDigest !== '0UK+HVlz5Y7F//atDpPysyocv/PjGXQoBX+XSaL/eEotARW8rPFh+lL5sO0Ljzfi') {
  failures.push('js/vendor/supabase-2.114.0.min.js: pinned SDK integrity mismatch');
}

// Keep key client files under generous regression ceilings. These are not bundle
// targets; they only catch accidental megabyte-scale artifacts before delivery.
for (const [file, maxBytes] of [
  ['js/app.js', 250 * 1024],
  ['admin.html', 600 * 1024],
  ['js/pasha-baby-commerce.js', 100 * 1024],
  ['js/pasha-baby-product-description-v2.js', 60 * 1024],
  ['js/live-prices.js', 40 * 1024],
  ['js/pasha-baby-storefront-bundle.js', 400 * 1024],
  ['css/pasha-baby-storefront-bundle.css', 250 * 1024],
  ['sw.js', 30 * 1024]
]) {
  const size = fs.statSync(file).size;
  if (size > maxBytes) failures.push(`${file}: ${size} bytes exceeds release ceiling ${maxBytes}`);
}

if (failures.length) {
  console.error('\nPerformance release audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby final performance release audit passed');
