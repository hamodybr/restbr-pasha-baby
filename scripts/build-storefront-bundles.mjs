import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const cssFiles = [
  'css/style.css',
  'css/cart.css',
  'css/pasha-baby-commerce.css',
  'css/desktop-phone-parity.css',
  'css/mobile-card-image-fix.css',
  'css/live-card-badges.css',
  'css/pasha-baby-theme.css',
  'css/pasha-baby-storefront-v2.css',
  'css/pasha-baby-retail-fixes.css',
  'css/pasha-baby-retail-polish-v3.css',
  'css/pasha-baby-retail-v4.css',
  'css/pasha-baby-brand-background.css',
  'css/pasha-baby-footer-v2.css',
  'css/pasha-baby-final-tweaks.css'
];

const jsFiles = [
  'js/offline-status.js',
  'js/supabase-config.js',
  'js/unavailable-card-state.js',
  'js/app.js',
  'js/pasha-baby-commerce.js',
  'js/product-image-fallback.js',
  'js/price-safety.js',
  'js/cart.js',
  'js/cart-stale-item-guard.js',
  'js/live-prices.js',
  'js/pasha-baby-fixed-discounts.js',
  'js/live-card-badges.js',
  'js/card-life-effects.js',
  'js/pasha-baby-ui.js',
  'js/pasha-baby-storefront-v2.js',
  'js/pasha-baby-retail-interactions-v3.js',
  'js/pasha-baby-retail-v4.js'
];

function build(files, output, comment) {
  const content = files.map(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8').trim();
    return `/* ${file} */\n${source}`;
  }).join('\n\n');

  fs.writeFileSync(path.join(root, output), `${comment}\n${content}\n`, 'utf8');
}

build(cssFiles, 'css/pasha-baby-storefront-bundle.css', '/* Generated storefront CSS bundle. Run scripts/build-storefront-bundles.mjs after source CSS changes. */');
build(jsFiles, 'js/pasha-baby-storefront-bundle.js', '/* Generated storefront JavaScript bundle. Run scripts/build-storefront-bundles.mjs after source JavaScript changes. */');

console.log(`Built ${cssFiles.length} CSS files and ${jsFiles.length} JavaScript files.`);
