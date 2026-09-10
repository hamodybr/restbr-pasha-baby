import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const failures = [];
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  if (!read(file).includes(marker)) failures.push(`${file}: missing ${label}`);
};
const forbidText = (file, marker, label = marker) => {
  if (read(file).includes(marker)) failures.push(`${file}: forbidden ${label}`);
};

for (const file of [
  'js/admin-option-price-fast.js',
  'js/pasha-color-image-gallery.js',
  'js/pasha-baby-product-description-v2.js',
  'js/pasha-baby-commerce.js',
  'js/pasha-arabic-only.js'
]) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

requireText('js/admin-option-price-fast.js', "const PRICE_SELECTOR = '.oe-price,.noe-price'", 'existing/new option price targeting');
requireText('js/admin-option-price-fast.js', "document.addEventListener('beforeinput'", 'localized digit beforeinput fast path');
requireText('js/admin-option-price-fast.js', "input.setRangeText(text, start, end, 'end')", 'single-range insertion');
requireText('js/admin-option-price-fast.js', "data-pb-fast-option-price", 'fast price marker');
requireText('js/admin-option-price-fast.js', "new MutationObserver", 'editor-scoped dynamic option support');
requireText('js/admin-option-price-fast.js', "document.getElementById('editorModal')", 'editor-only observer scope');

requireText('js/pasha-color-image-gallery.js', '__PASHA_COLOR_IMAGE_GALLERY_V2__', 'color gallery v2 guard');
requireText('js/pasha-color-image-gallery.js', 'pbColorImageLightbox', 'full-screen color image lightbox');
requireText('js/pasha-color-image-gallery.js', 'data-pb-color-preview', 'clickable color image preview');
requireText('js/pasha-color-image-gallery.js', "event.key === 'Escape'", 'keyboard close');
requireText('js/pasha-color-image-gallery.js', "commerceObserver.observe(body", 'commerce-body scoped observer');
forbidText('js/pasha-color-image-gallery.js', ".observe(document.body, { childList: true, subtree: true })", 'document-wide color gallery observer');

requireText('js/pasha-baby-product-description-v2.js', '__PB_PRODUCT_DETAILS_GALLERY_V3__', 'details gallery v3 guard');
requireText('js/pasha-baby-product-description-v2.js', 'window.PASHA_OPEN_PRODUCT_DETAILS', 'image-click details API');
requireText('js/pasha-baby-product-description-v2.js', 'pb-product-gallery-dot', 'carousel dot navigation');
requireText('js/pasha-baby-product-description-v2.js', 'data-pb-detail-color-id', 'detail color navigation');
requireText('js/pasha-baby-product-description-v2.js', "stage.addEventListener('pointerdown'", 'carousel swipe start');
requireText('js/pasha-baby-product-description-v2.js', "stage.addEventListener('pointerup'", 'carousel swipe finish');
requireText('js/pasha-baby-product-description-v2.js', 'originalAction.dataset.pbPreferredColorId', 'selected color cart handoff');
requireText('js/pasha-baby-commerce.js', 'button.dataset.pbPreferredColorId', 'preferred color cart intake');
requireText('js/runtime-config.js', 'js/pasha-baby-product-description-v2.js?v=3.0', 'details gallery v3 loader');
requireText('css/pasha-baby-card-density-v2.css', '.pb-product-sheet-stage', 'carousel stage styling');
requireText('css/pasha-baby-card-density-v2.css', '.pb-product-sheet-color', 'detail color styling');

requireText('js/pasha-arabic-only.js', "js/admin-option-price-fast.js?v=1.0", 'admin fast option-price loader');
requireText('js/pasha-arabic-only.js', "js/pasha-color-image-gallery.js?v=2.0", 'color image gallery v2 loader');

if (failures.length) {
  console.error('\nOption price / color preview audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Option-price fast input and color-image preview audit passed');
