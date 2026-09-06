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
  'js/admin-product-colors.js'
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
requireMatch('sw.js', /restbr-pasha-baby-v\d+/, 'retail cache generation');
requireText('sw.js', 'css/pasha-baby-commerce.css?v=1.0', 'cached commerce stylesheet');
requireText('sw.js', 'js/pasha-baby-commerce.js?v=2.0', 'cached commerce v2 runtime');
requireText('sw.js', 'js/live-prices.js?v=2.0', 'cached live prices v2 runtime');

requireText('js/language-settings.js', 'js/admin-retail-discounts.js?v=2.0', 'retail discount admin v2 loader');
requireText('js/language-settings.js', 'js/admin-product-colors.js?v=2.0', 'product colors admin v2 loader');
requireText('js/language-settings.js', 'js/admin-large-catalog.js?v=1.0', 'large catalog admin loader');

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
requireText('js/pasha-baby-commerce.js', "compose('en', 'Color')", 'English color carried into cart');
requireText('js/pasha-baby-commerce.js', "compose('ar', 'اللون')", 'Arabic color carried into cart');

requireText('js/live-prices.js', '__RESTBR_LIVE_PRICES_V2__', 'live price v2 singleton guard');
requireText('js/live-prices.js', 'fetchAllPriceRows', 'paginated live price sync');
requireText('js/live-prices.js', 'retailPrice(product, originalPrice)', 'discount-aware live price calculation');
requireText('js/live-prices.js', 'restbr:catalog-expanded', 'large catalog live price resync');

requireText('js/admin-large-catalog.js', 'PAGE_SIZE = 1000', 'paginated admin page size');
requireText('js/admin-large-catalog.js', 'from(table)', 'generic admin pagination loader');

requireText('js/admin-retail-discounts.js', '__PASHA_ADMIN_RETAIL_DISCOUNTS_V2__', 'discount admin v2 guard');
requireText('js/admin-retail-discounts.js', "q('#viewProducts')", 'discount panel in products view');
requireText('js/admin-retail-discounts.js', 'pbDiscountQuickBtn', 'visible products discount button');
requireText('js/admin-retail-discounts.js', "price_mode: 'both'", 'retail discount backward-compatible price mode');
requireText('js/admin-retail-discounts.js', 'starts_at: startsAt', 'discount start scheduling');
requireText('js/admin-retail-discounts.js', 'ends_at: endsAt', 'discount end scheduling');
forbidText('js/admin-retail-discounts.js', 'داخل المطعم', 'restaurant dining wording');
forbidText('js/admin-retail-discounts.js', 'سفري', 'takeaway wording');
requireText('js/admin-retail-discounts.js', 'المتجر كامل', 'store-wide discount wording');

requireText('js/admin-product-colors.js', '__PASHA_ADMIN_PRODUCT_COLORS_V2__', 'product colors v2 guard');
requireText('js/admin-product-colors.js', 'pbProductColorsEditor', 'colors embedded inside product editor');
requireText('js/admin-product-colors.js', 'hookProductEditor', 'product editor integration hook');
requireText('js/admin-product-colors.js', 'detectColorHex', 'automatic Arabic color-name matching');
requireText('js/admin-product-colors.js', "['اسود', '#111111']", 'automatic black mapping');
requireText('js/admin-product-colors.js', "['ابيض', '#ffffff']", 'automatic white mapping');
requireText('js/admin-product-colors.js', 'data-color-auto', 'manual to automatic color reset');
requireText('js/admin-product-colors.js', "from('product_colors')", 'product colors writes');
requireText('js/admin-product-colors.js', 'is_available', 'color availability control');
requireText('js/admin-product-colors.js', 'color_hex', 'color visual selector');
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

console.log('✓ Pasha Baby retail commerce audit passed');
