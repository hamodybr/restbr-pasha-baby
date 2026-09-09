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

requireText('js/pasha-arabic-only.js', "js/admin-option-price-fast.js?v=1.0", 'admin fast option-price loader');
requireText('js/pasha-arabic-only.js', "js/pasha-color-image-gallery.js?v=2.0", 'color image gallery v2 loader');

if (failures.length) {
  console.error('\nOption price / color preview audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Option-price fast input and color-image preview audit passed');
