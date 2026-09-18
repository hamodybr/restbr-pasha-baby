import fs from 'node:fs';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const css = fs.readFileSync('storefront-v3/storefront-v3.css', 'utf8');
const js = fs.readFileSync('storefront-v3/storefront-v3.js', 'utf8');
const detailsJs = fs.readFileSync('storefront-v3/product-details-v3.js', 'utf8');
const commerceJs = fs.readFileSync('js/pasha-baby-commerce.js', 'utf8');
const fixedDiscountJs = fs.readFileSync('js/pasha-baby-fixed-discounts.js', 'utf8');
const liveBadgesJs = fs.readFileSync('js/live-card-badges.js', 'utf8');
const arabicOnlyJs = fs.readFileSync('js/pasha-arabic-only.js', 'utf8');
const numberNormalizerJs = fs.readFileSync('js/pasha-number-normalizer.js', 'utf8');
const unavailableJs = fs.readFileSync('js/unavailable-card-state.js', 'utf8');
const imageFallbackJs = fs.readFileSync('js/product-image-fallback.js', 'utf8');
const priceSafetyJs = fs.readFileSync('js/price-safety.js', 'utf8');
const urlSafetyJs = fs.readFileSync('js/url-safety.js', 'utf8');
const livePricesJs = fs.readFileSync('js/live-prices.js', 'utf8');
const restaurantHoursJs = fs.readFileSync('js/restaurant-hours.js', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');
const cartJs = fs.readFileSync('js/cart.js', 'utf8');

const fail = message => {
  console.error('Storefront V3 check failed:', message);
  process.exitCode = 1;
};

const requiredHtml = [
  'id="pbV3Topbar"',
  'id="pbV3Hero"',
  'id="pbV3SearchHost"',
  'id="smCats"',
  'id="smMenu"',
  'id="pbV3BottomCart"',
  'storefront-v3/storefront-v3.css?v=1.4',
  'storefront-v3/storefront-v3.js?v=1.4'
];

for (const token of requiredHtml) {
  if (!html.includes(token)) fail('Missing HTML token: ' + token);
}

const forbiddenLegacy = [
  'css/pasha-baby-theme.css',
  'css/pasha-baby-storefront-v2.css',
  'css/pasha-baby-retail-fixes.css',
  'css/pasha-baby-retail-polish-v3.css',
  'css/pasha-baby-retail-v4.css',
  'css/pasha-baby-brand-background.css',
  'css/pasha-baby-footer-v2.css',
  'css/pasha-baby-final-tweaks.css',
  'js/pasha-baby-storefront-bundle.js',
  'js/pasha-baby-product-description-v2.js',
  'js/pasha-baby-details-button-v3.js',
  'js/pasha-product-gallery-thermal-v1.js'
];

for (const token of forbiddenLegacy) {
  if (html.includes(token)) fail('V3 must not load legacy presentation layer: ' + token);
}

if (!html.includes('name="robots" content="noindex,nofollow"')) {
  fail('Experimental V3 page must stay noindex until approval.');
}

if (!css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')) {
  fail('V3 mobile product grid must keep two columns.');
}

if (!css.includes('--v3-sage') || !css.includes('--v3-beige')) {
  fail('V3 design tokens are missing.');
}

for (const token of [
  'id="pbV3Highlights"',
  'storefront-v3/product-details-v3.js?v=1.0'
]) {
  if (!html.includes(token)) fail('V3 phase 2 feature missing: ' + token);
}

if (!css.includes('.pb-v3-product-panel') ||
    !css.includes('.pb-v3-page .sm-checkout-sheet')) {
  fail('V3 details/checkout visual layer is missing.');
}

if (!css.includes('@media(max-width:680px)') ||
    !css.includes('backdrop-filter:none!important')) {
  fail('V3 mobile Safari compositing guard is missing.');
}

if (css.includes('V3 product details sheet — same proven logic, new shell')) {
  fail('Obsolete legacy product-details CSS returned to V3.');
}

for (const token of [
  '.pb-v3-page #smMenu .pb-color-preview',
  '.pb-v3-page #smMenu .sm-display-badge',
  '.pb-v3-page #smMenu .sm-card.sm-unavailable-card::after',
  'animation:none!important',
  'backdrop-filter:none!important'
]) {
  if (!css.includes(token)) fail('V3 static card metadata/thermal rule missing: ' + token);
}

if (!js.includes('function renderHighlights()') ||
    !js.includes('function enhanceCheckout()')) {
  fail('V3 real-data highlights or checkout enhancer is missing.');
}

for (const token of [
  'function syncStorefrontCopy()',
  'pb-v3-cat-media',
  'function syncCardSummaries()',
  'pb-v3-card-summary',
  'function syncCardActionRows()',
  'pb-product-action-row>.pb-v3-details-btn'
]) {
  if (!js.includes(token) && !css.includes(token)) {
    fail('V3 storefront polish missing: ' + token);
  }
}

if (!html.includes('id="pbV3Announcement"') ||
    !html.includes('id="pbV3DeliveryBenefit"')) {
  fail('V3 store-driven announcement/delivery copy anchors are missing.');
}

if (!html.includes('id="pbV3CatalogStatus"') ||
    !js.includes('function syncCatalogStatus()') ||
    !js.includes('function markCatalogDelayed()')) {
  fail('V3 quiet catalog loading/retry state is missing.');
}

for (const token of [
  'id="pbV3SearchOverlay"',
  'id="pbV3StoreInfo"',
  'id="pbV3InfoMap"',
  'id="pbV3InfoCall"',
  'data-v3-nav="home"',
  'id="pbV3DrawerOffers"',
  'id="pbV3SearchShowResults"',
  'id="pbV3WhatsAppFab"',
  'id="pbV3BottomCartCount"',
  'class="pb-v3-desktop-nav"'
]) {
  if (!html.includes(token)) fail('V3 navigation/search/info element missing: ' + token);
}

for (const token of [
  'function openSearchOverlay()',
  'function closeSearchOverlay(',
  'function syncBottomNavScroll()',
  'pb-v3-search-overlay',
  'pb-v3-store-info',
  '.pb-v3-page .pb-reviews-premium'
]) {
  if (!js.includes(token) && !css.includes(token)) {
    fail('V3 navigation/search/reviews integration missing: ' + token);
  }
}

if (/MutationObserver|setInterval\s*\(/.test(js)) {
  fail('V3 shell must avoid persistent observers and polling.');
}

if (/MutationObserver|setInterval\s*\(/.test(detailsJs)) {
  fail('V3 product details must remain observer-free and polling-free.');
}

if (!detailsJs.includes('window.PASHA_V3_OPEN_PRODUCT_DETAILS') ||
    !detailsJs.includes('pointerdown') ||
    !detailsJs.includes('data-v3-color-id')) {
  fail('V3 lightweight gallery/choice API is incomplete.');
}

for (const token of [
  'pbV3QtyMinus',
  'pbV3QtyPlus',
  'pbV3QtyValue',
  'RESTBR_CART_ADD_QUANTITY'
]) {
  if (!detailsJs.includes(token) && !cartJs.includes(token)) {
    fail('V3 quantity flow missing: ' + token);
  }
}

if (!cartJs.includes('window.RESTBR_CART_ADD_QUANTITY') ||
    !cartJs.includes('function addItemQuantity')) {
  fail('Cart quantity API is missing.');
}

if (!css.includes('.pb-v3-product-quantity')) {
  fail('V3 product quantity styling is missing.');
}

for (const [name, source, api] of [
  ['commerce', commerceJs, 'PASHA_RETAIL_DECORATE_CARDS'],
  ['fixed discounts', fixedDiscountJs, 'PASHA_FIXED_DISCOUNTS_DECORATE'],
  ['live badges', liveBadgesJs, 'PASHA_LIVE_BADGES_SYNC']
]) {
  if (!source.includes('IS_STOREFRONT_V3')) {
    fail(name + ' is missing the V3 observer guard.');
  }
  if (!source.includes(api)) {
    fail(name + ' is missing its V3 event-driven decoration API.');
  }
}

if (!arabicOnlyJs.includes('IS_STOREFRONT_V3') ||
    !arabicOnlyJs.includes('if (!IS_STOREFRONT_V3)')) {
  fail('Arabic-only bootstrap can reload legacy gallery observers into V3.');
}

if (!fixedDiscountJs.includes('if (!IS_STOREFRONT_V3) subscribe();')) {
  fail('V3 must not keep the fixed-discount realtime channel open.');
}

if (!numberNormalizerJs.includes('IS_STOREFRONT_V3') ||
    !numberNormalizerJs.includes('if (!IS_STOREFRONT_V3)')) {
  fail('V3 numeric input handling is missing the body-observer guard.');
}

if (!unavailableJs.includes('IS_STOREFRONT_V3') ||
    !unavailableJs.includes('if (IS_STOREFRONT_V3) return;') ||
    !unavailableJs.includes('PASHA_UNAVAILABLE_SYNC')) {
  fail('V3 unavailable-card state is missing its observer-free event API.');
}

for (const [name, source, api] of [
  ['image fallback', imageFallbackJs, 'RESTBR_PRODUCT_IMAGE_SCAN'],
  ['price safety', priceSafetyJs, 'RESTBR_PRICE_SAFETY_PATCH'],
  ['URL safety', urlSafetyJs, 'RESTBR_URL_SAFETY_SCAN']
]) {
  if (!source.includes('IS_STOREFRONT_V3') || !source.includes(api)) {
    fail(name + ' is missing its V3 event-driven guard/API.');
  }
}

if (!livePricesJs.includes('IS_STOREFRONT_V3') ||
    !livePricesJs.includes('if (!IS_STOREFRONT_V3) {\n      window.setInterval')) {
  fail('V3 live-price reconciliation timer guard is missing.');
}

if (!restaurantHoursJs.includes('IS_STOREFRONT_V3') ||
    !restaurantHoursJs.includes('scheduleNextV3Refresh')) {
  fail('V3 restaurant-hours single refresh loop is missing.');
}

if (!appJs.includes('IS_STOREFRONT_V3') ||
    !appJs.includes('if(!IS_STOREFRONT_V3){') ||
    !appJs.includes('if(IS_STOREFRONT_V3){') ||
    !appJs.includes('if(IS_STOREFRONT_V3) return;') ||
    !appJs.includes('if (!IS_STOREFRONT_V3 && "IntersectionObserver" in window)')) {
  fail('V3 app runtime-presentation/scroll/reveal guards are missing.');
}

for (const token of [
  '.pb-v3-page .sm-checkout-sheet',
  'display:flex!important',
  '.pb-v3-page .sm-checkout-body',
  'overflow-y:auto!important',
  '.pb-v3-page .sm-checkout-actions',
  'scroll-padding-bottom:130px!important'
]) {
  if (!css.includes(token)) fail('V3 checkout viewport/keyboard rule missing: ' + token);
}

if (!js.includes("button.setAttribute('aria-current', 'page')")) {
  fail('V3 bottom navigation active state is missing aria-current.');
}

if (arabicOnlyJs.includes("if (!IS_STOREFRONT_V3) {\n      loadScript('pashaArabicNewsTickerScript'") === false) {
  fail('V3 can still load the legacy animated news ticker.');
}

if (!js.includes("window.addEventListener('restbr:ready'")) {
  fail('V3 must synchronize against the existing storefront ready event.');
}

if (!js.includes("localStorage.getItem('RESTBR_CART_V1')")) {
  fail('V3 cart shortcut must reuse the existing cart state.');
}

if (!process.exitCode) {
  console.log('Storefront V3 check passed.');
}