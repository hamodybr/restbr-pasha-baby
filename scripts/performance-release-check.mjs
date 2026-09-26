import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const failures = [];
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  const source = read(file);
  if (!source.includes(marker)) failures.push(`${file}: missing ${label}`);
};
const requireMatch = (file, pattern, label = String(pattern)) => {
  const source = read(file);
  if (!pattern.test(source)) failures.push(`${file}: missing ${label}`);
};
const forbidText = (file, marker, label = marker) => {
  const source = read(file);
  if (source.includes(marker)) failures.push(`${file}: forbidden ${label}`);
};

for (const file of [
  'js/live-prices.js',
  'js/pasha-arabic-only.js',
  'js/admin-large-catalog.js',
  'js/admin-image-pipeline.js',
  'js/admin-b2-storage.js',
  'js/admin-color-image-upload.js',
  'js/pasha-product-gallery-thermal-v1.js',
  'sw.js'
]) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

requireText('js/live-prices.js', 'const PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000', '5-minute price reconciliation');
requireText('js/live-prices.js', 'document.visibilityState !== "visible"', 'hidden-tab price-sync guard');
requireText('js/live-prices.js', 'status === "SUBSCRIBED"', 'Realtime subscription sync');
forbidText('js/live-prices.js', 'setInterval(() => void syncAllPrices(), 30000)', 'legacy 30-second full price polling');

forbidText('js/pasha-arabic-only.js', 'new MutationObserver(keepArabic)', 'storefront-wide Arabic MutationObserver');
requireText('js/pasha-arabic-only.js', "window.addEventListener('restbr:ready', keepArabic, { once: true })", 'one-shot Arabic ready handler');
requireText('js/pasha-arabic-only.js', "window.removeEventListener('scroll', baseScrollEffects)", 'raw scroll listener replacement');
requireText('js/pasha-arabic-only.js', 'requestAnimationFrame(() => {', 'scroll rAF throttle');
requireText('js/pasha-arabic-only.js', 'clearInterval(window.__RESTBR_SCHEDULE_TIMER__)', 'unused schedule timer removal');
requireText('js/pasha-arabic-only.js', 'availability_schedule_enabled === true', 'schedule-aware timer guard');

requireText('js/admin-large-catalog.js', 'function catalogMayBeTruncated()', 'large-catalog truncation guard');
requireText('js/admin-large-catalog.js', 'async function ensureCompleteCatalog()', 'conditional full-catalog hydration');
requireText('js/admin-large-catalog.js', 'rows.length >= PAGE_SIZE', '1000-row boundary detection');

requireText('sw.js', 'restbr-pasha-baby-v49', 'version-safe code cache generation');
requireText('sw.js', '2026-09-17: v46 forces iOS Safari', 'install-time storefront cache refresh marker');
requireText('sw.js', 'function staleWhileRevalidate(event, request)', 'stale-while-revalidate strategy');
requireText('sw.js', 'event.respondWith(staleWhileRevalidate(event, request))', 'public code cache fast path');
requireText('sw.js', 'networkFirst(request, { noStore: true })', 'fresh admin asset path');
requireText('sw.js', 'js/pasha-product-gallery-thermal-v1.js?v=1.3', 'carousel gallery precache');

requireText('index.html', 'rel="preconnect" href="https://wlollfpmjzenhkjwxrqo.supabase.co"', 'Supabase preconnect');
requireMatch('index.html', /src="(?:https:\/\/cdn\.jsdelivr\.net\/gh\/hamodybr\/restbr-pasha-baby@[^\"]+\/)?js\/vendor\/supabase-2\.114\.0\.min\.js"/, 'pinned Supabase browser SDK');
requireText('index.html', 'href="assets/favicon.png"', 'local lightweight favicon');
requireText('index.html', 'href="assets/apple-touch-icon.png"', 'local lightweight Apple icon');
requireMatch('index.html', /(window\.addEventListener\("restbr:ready",scanBrandLogo,\{once:true\}\)|body class="pb-v3-page)/, 'one-shot live brand icon refresh or static V3 brand shell');
forbidText('index.html', 'new MutationObserver(scanBrandLogo)', 'global brand-logo MutationObserver');

requireText('js/admin-image-pipeline.js', "canvasToBlob(canvas, 'image/webp'", 'shared WebP image optimization');
requireText('js/admin-image-pipeline.js', '[1280, 0.74]', 'bounded product compression profile');
requireText('js/admin-image-pipeline.js', '[1080, 0.72]', 'bounded color compression profile');
requireText('js/admin-image-pipeline.js', 'canvas.width = 1', 'canvas memory release');
requireText('js/admin-image-pipeline.js', 'decoded.close?.()', 'decoded image memory release');
requireText('js/admin-b2-storage.js', 'PASHA_ADMIN_IMAGE_PIPELINE', 'product upload shared pipeline');
requireText('js/admin-color-image-upload.js', 'PASHA_ADMIN_IMAGE_PIPELINE', 'color upload shared pipeline');
forbidText('js/admin-b2-storage.js', 'setInterval(', 'B2 uploader polling');
forbidText('js/admin-color-image-upload.js', 'observe(document.body', 'whole-dashboard color upload observer');
requireText('js/admin-image-optimizer.js', '__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V3__ = true', 'legacy optimizer kill-switch');
forbidText('js/admin-image-optimizer.js', 'createImageBitmap(', 'duplicate legacy image decoding');

requireText('js/pasha-baby-product-description-v2.js', "const SHEET_ID = 'pbProductDetailSheet'", 'real product details sheet id');
requireText('js/pasha-product-gallery-thermal-v1.js', "const SHEET_ID = 'pbProductDetailSheet'", 'gallery helper real sheet target');
forbidText('js/pasha-product-gallery-thermal-v1.js', 'pbProductDetailsSheet', 'stale plural product sheet id');
requireText('js/pasha-product-gallery-thermal-v1.js', '__PASHA_PRODUCT_GALLERY_THERMAL_V3__', 'continuous carousel runtime');
requireText('js/pasha-product-gallery-thermal-v1.js', 'name.before(picker)', 'color strip above product title');
requireText('js/pasha-product-gallery-thermal-v1.js', 'button.dataset.pbCarouselSrc = src', 'persistent color slide source');
forbidText('js/pasha-product-gallery-thermal-v1.js', "querySelectorAll('.pb-product-sheet-color-image').forEach(img => img.remove())", 'destructive base-gallery thumbnail removal');
requireText('js/pasha-product-gallery-thermal-v1.js', "stage.addEventListener('pointermove'", 'finger-following gallery swipe');
requireText('js/pasha-product-gallery-thermal-v1.js', 'pb-carousel-track', 'three-image carousel track');
requireText('js/pasha-product-gallery-thermal-v1.js', "for (const position of ['prev', 'current', 'next'])", 'previous/current/next carousel peers');
requireText('js/pasha-product-gallery-thermal-v1.js', 'requestAnimationFrame(flushMove)', 'rAF-throttled finger tracking');
requireText('js/pasha-product-gallery-thermal-v1.js', 'touch-action:pan-y', 'native vertical scrolling during gallery use');
requireText('js/pasha-product-gallery-thermal-v1.js', 'background:rgba(247,248,246,.97)!important', 'natural category rail background');
forbidText('js/pasha-product-gallery-thermal-v1.js', 'background:#101313!important', 'obsolete black category rail');
forbidText('js/pasha-product-gallery-thermal-v1.js', 'new IntersectionObserver', 'obsolete sticky-category observer');
requireText('js/pasha-product-gallery-thermal-v1.js', 'content-visibility:visible!important', 'Safari card virtualization override');
requireText('js/pasha-product-gallery-thermal-v1.js', '.sm-live-sheen', 'legacy card sheen suppression');
requireText('js/pasha-product-gallery-thermal-v1.js', 'animation:none!important', 'legacy mobile card animation suppression');

requireText('js/app.js', 'loading="lazy"', 'lazy product images');
requireText('js/app.js', 'decoding="async"', 'async product image decode');
requireText('index.html', 'css/style.css?v=4.1', 'original storefront base CSS order');
requireMatch('index.html', /(css\/pasha-baby-final-tweaks\.css\?v=1\.1|v3-visual-fixes\.css\?v=4\.6)/, 'original or V3 storefront override CSS order');
requireMatch('index.html', /(js\/pasha-baby-storefront-bundle\.js\?v=1\.3|js\/pasha-baby-commerce\.js\?v=v3\.1)/, 'storefront JavaScript bundle or V3 commerce runtime');
requireText('index.html', 'id="pbBrand" class="pb-brand"', 'server-rendered brand layout');
requireMatch('index.html', /id="(?:pbStoreHeroV2|pbV3Hero)" class="(?:pb-store-hero|pb-v3-hero)"/, 'server-rendered hero layout');
requireMatch('index.html', /(__smIntroEarlyDismissTimer|id="smIntro" class="sm-intro pb-v3-intro" aria-hidden="true")/, 'data-independent intro dismissal');
requireMatch('index.html', /(html\.sm-hours-pending #smOrderStateBanner|id="pbV3CatalogStatus" class="pb-v3-catalog-status")/, 'pending-hours banner flash guard or V3 status shell');
requireText('js/cart.js', 'banner.hidden=hoursPending||allowed', 'resolved-hours order banner guard');
requireText('css/pasha-baby-storefront-v2.css', 'min-height:50px;', 'reserved search host height');
requireText('css/pasha-baby-retail-v4.css', 'min-height:48px!important;margin:8px auto 10px!important', 'reserved quick-action height');
requireMatch('index.html', /rel="preload" as="image" href="(?:assets\/pasha-baby-logo-256\.webp|https:\/\/cdn\.jsdelivr\.net\/gh\/hamodybr\/restbr-pasha-baby@[^\"]+\/assets\/pasha-baby-reference-logo\.png)"/, 'optimized logo preload');
requireText('js/app.js', 'data-original-image=', 'original product-image fallback');
requireText('js/app.js', 'RESTBR_OPTIMIZED_MEDIA_URL', 'optimized product card images');
requireText('js/url-safety.js', 'assets/product-thumbnails/9c4f903c-a78b-4620-9279-3c696235e55c.webp', 'B2 card thumbnail mapping');

const sdkDigest = createHash('sha384')
  .update(fs.readFileSync('js/vendor/supabase-2.114.0.min.js'))
  .digest('base64');
if (sdkDigest !== '0UK+HVlz5Y7F//atDpPysyocv/PjGXQoBX+XSaL/eEotARW8rPFh+lL5sO0Ljzfi') {
  failures.push('js/vendor/supabase-2.114.0.min.js: pinned SDK integrity mismatch');
}

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
