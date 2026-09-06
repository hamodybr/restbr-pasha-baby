import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const fail = message => failures.push(message);
const requireText = (file, marker, label = marker) => {
  if (!exists(file)) return fail(`${file}: missing`);
  if (!read(file).includes(marker)) fail(`${file}: missing ${label}`);
};
const requireMatch = (file, pattern, label = String(pattern)) => {
  if (!exists(file)) return fail(`${file}: missing`);
  if (!pattern.test(read(file))) fail(`${file}: missing ${label}`);
};
const forbidText = (file, marker, label = marker) => {
  if (exists(file) && read(file).includes(marker)) fail(`${file}: forbidden ${label}`);
};

const files = [
  'js/pasha-baby-commerce.js',
  'js/live-prices.js',
  'js/admin-large-catalog.js',
  'js/admin-retail-discounts.js',
  'js/admin-product-colors.js',
  'js/pasha-arabic-only.js'
];

for (const file of files) {
  if (!exists(file)) {
    fail(`${file}: missing`);
    continue;
  }
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

requireText('index.html', 'css/pasha-baby-commerce.css?v=1.0', 'retail commerce stylesheet');
requireText('index.html', 'js/pasha-baby-commerce.js?v=2.0', 'retail commerce v2 runtime');
requireText('index.html', 'js/live-prices.js?v=2.0', 'discount-aware live prices v2 runtime');
forbidText('index.html', 'css/english-card-ltr.css', 'English-only card stylesheet');
forbidText('index.html', 'js/english-news-ticker.js', 'English ticker layer');
forbidText('index.html', 'id="smLangs"', 'storefront language picker');
requireMatch('sw.js', /restbr-pasha-baby-v\d+/, 'retail cache generation');
requireText('sw.js', 'css/pasha-baby-commerce.css?v=1.0', 'cached commerce stylesheet');
requireText('sw.js', 'js/pasha-baby-commerce.js?v=2.0', 'cached commerce v2 runtime');
requireText('sw.js', 'js/live-prices.js?v=2.0', 'cached live prices v2 runtime');
requireText('sw.js', 'js/pasha-arabic-only.js?v=1.0', 'cached Arabic-only policy');

requireText('js/supabase-config.js', 'js/pasha-arabic-only.js?v=1.0', 'Arabic-only policy loader');
forbidText('js/supabase-config.js', 'language-settings.js', 'legacy multilingual loader');
requireText('js/pasha-arabic-only.js', "localStorage.setItem('RESTBR_LANG_V1', 'ar')", 'Arabic language lock');
requireText('js/pasha-arabic-only.js', 'data-pasha-multilang-hidden', 'admin multilingual field suppression');
requireText('js/pasha-arabic-only.js', 'js/admin-retail-discounts.js?v=3.0', 'retail discount admin v3 loader');
requireText('js/pasha-arabic-only.js', 'js/admin-product-colors.js?v=3.0', 'product colors admin v3 loader');
requireText('js/pasha-arabic-only.js', 'js/admin-large-catalog.js?v=1.0', 'large catalog admin loader');

requireText('js/pasha-baby-commerce.js', "scope_type === 'product'", 'product discount priority');
requireText('js/pasha-baby-commerce.js', "scope_type === 'category'", 'category discount priority');
requireText('js/pasha-baby-commerce.js', "scope_type === 'restaurant'", 'store-wide discount compatibility');
requireText('js/pasha-baby-commerce.js', 'scheduleNextDiscountBoundary', 'automatic scheduled discount boundary refresh');
requireText('js/pasha-baby-commerce.js', 'observer.observe(menu, { childList: true, subtree: false })', 'non-recursive commerce DOM observer');
requireText('js/pasha-baby-commerce.js', "fetchAll('products'", 'paginated storefront products');
requireText('js/pasha-baby-commerce.js', "fetchAll('product_options'", 'paginated storefront options');
requireText('js/pasha-baby-commerce.js', 'RESTBR_LARGE_CATALOG_READY', 'large storefront catalog readiness');
requireText('js/pasha-baby-commerce.js', 'product_colors', 'customer product colors loader');
requireText('js/pasha-baby-commerce.js', 'dataset.retailBypass', 'existing cart integration guard');
requireText('js/pasha-baby-commerce.js', "compose('ar', 'اللون')", 'Arabic color carried into cart');

requireText('js/live-prices.js', '__RESTBR_LIVE_PRICES_V2__', 'live price v2 singleton guard');
requireText('js/live-prices.js', 'fetchAllPriceRows', 'paginated live price sync');
requireText('js/live-prices.js', 'retailPrice(product, originalPrice)', 'discount-aware live price calculation');
requireText('js/live-prices.js', 'restbr:catalog-expanded', 'large catalog live price resync');

requireText('js/admin-large-catalog.js', 'PAGE_SIZE = 1000', 'paginated admin page size');
requireText('js/admin-large-catalog.js', 'from(table)', 'generic admin pagination loader');

requireText('js/admin-retail-discounts.js', '__PASHA_ADMIN_RETAIL_DISCOUNTS_V3__', 'discount admin v3 guard');
requireText('js/admin-retail-discounts.js', "event.target.closest('#pbDiscountQuickBtn')", 'resilient discount button delegation');
requireText('js/admin-retail-discounts.js', 'body.admin-global-light #discountsSettingsPanel', 'discount light-theme support');
requireText('js/admin-retail-discounts.js', "price_mode: 'both'", 'retail discount backward-compatible price mode');
requireText('js/admin-retail-discounts.js', 'starts_at: startsAt', 'discount start scheduling');
requireText('js/admin-retail-discounts.js', 'ends_at: endsAt', 'discount end scheduling');
forbidText('js/admin-retail-discounts.js', 'داخل المطعم', 'restaurant dining wording');
forbidText('js/admin-retail-discounts.js', 'سفري', 'takeaway wording');
requireText('js/admin-retail-discounts.js', 'المتجر كامل', 'store-wide discount wording');

requireText('js/admin-product-colors.js', '__PASHA_ADMIN_PRODUCT_COLORS_V3__', 'product colors v3 guard');
requireText('js/admin-product-colors.js', 'pbProductColorsEditor', 'colors embedded inside product editor');
requireText('js/admin-product-colors.js', 'hookProductEditor', 'product editor integration hook');
requireText('js/admin-product-colors.js', 'detectColorHex', 'automatic Arabic color-name matching');
requireText('js/admin-product-colors.js', "['اسود', '#111111']", 'automatic black mapping');
requireText('js/admin-product-colors.js', "['ابيض', '#ffffff']", 'automatic white mapping');
requireText('js/admin-product-colors.js', 'data-color-auto', 'manual to automatic color reset');
requireText('js/admin-product-colors.js', 'body.admin-global-light #pbProductColorsEditor', 'product color light-theme support');
requireText('js/admin-product-colors.js', "name_ku: nameAr", 'legacy DB fallback from Arabic color name');
requireText('js/admin-product-colors.js', "name_en: nameAr", 'legacy DB fallback from Arabic color name');
forbidText('js/admin-product-colors.js', 'pb-edit-color-name-en', 'visible English color field');
forbidText('js/admin-product-colors.js', 'pb-edit-color-name-ku', 'visible Kurdish color field');
forbidText('js/admin-product-colors.js', 'productColorsSettingsPanel', 'standalone product colors tools panel');

const migration = 'supabase/migrations/20260906230500_pasha_retail_discounts_and_colors.sql';
requireText(migration, 'create table if not exists public.product_colors', 'product_colors table');
requireText(migration, 'alter table public.product_colors enable row level security', 'product_colors RLS');
requireText(migration, 'private.can_manage_menu()', 'admin-only color writes');
requireText(migration, 'starts_at timestamptz', 'discount starts_at');
requireText(migration, 'ends_at timestamptz', 'discount ends_at');
requireText(migration, 'on delete cascade', 'color cleanup with product deletion');

if (failures.length) {
  console.error('\nRetail commerce audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby Arabic-only retail commerce audit passed');
