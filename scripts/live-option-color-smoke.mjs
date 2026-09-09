const BASE_URL = String(process.env.SMOKE_BASE_URL || 'https://pashababyiq.com').replace(/\/$/, '');
const failures = [];

async function expect(path, markers, label) {
  try {
    const url = `${BASE_URL}/${path.replace(/^\//, '')}?__smoke=${Date.now()}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache', 'user-agent': 'Pasha-Option-Color-Smoke/1.0' }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const missing = markers.filter(marker => !text.includes(marker));
    if (missing.length) throw new Error(`missing ${missing.join(', ')}`);
    console.log(`✓ ${label}`);
    return text;
  } catch (error) {
    failures.push(`${label}: ${error?.message || error}`);
  }
}

await expect('js/pasha-arabic-only.js', [
  'js/admin-option-price-fast.js?v=1.0',
  'js/pasha-color-image-gallery.js?v=2.0'
], 'production loaders');

await expect('js/admin-option-price-fast.js', [
  "const PRICE_SELECTOR = '.oe-price,.noe-price'",
  "document.addEventListener('beforeinput'",
  "data-pb-fast-option-price"
], 'production option-price fast input');

const gallery = await expect('js/pasha-color-image-gallery.js', [
  '__PASHA_COLOR_IMAGE_GALLERY_V2__',
  'pbColorImageLightbox',
  'data-pb-color-preview',
  'commerceObserver.observe(body'
], 'production color image lightbox');

if (gallery?.includes('.observe(document.body, { childList: true, subtree: true })')) {
  failures.push('production color image lightbox: document-wide observer returned');
}

if (failures.length) {
  console.error('\nLive option/color smoke failed:');
  failures.forEach(item => console.error(` - ${item}`));
  process.exit(1);
}

console.log('✓ Live option-price and color-preview smoke passed');
