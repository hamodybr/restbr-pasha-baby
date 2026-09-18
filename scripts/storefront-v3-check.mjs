import fs from 'node:fs';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const css = fs.readFileSync('storefront-v3/storefront-v3.css', 'utf8');
const js = fs.readFileSync('storefront-v3/storefront-v3.js', 'utf8');

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
  'storefront-v3/storefront-v3.css?v=1.0',
  'storefront-v3/storefront-v3.js?v=1.0'
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
  'js/pasha-baby-storefront-bundle.js'
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

if (/MutationObserver|setInterval\s*\(/.test(js)) {
  fail('V3 shell must avoid persistent observers and polling.');
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