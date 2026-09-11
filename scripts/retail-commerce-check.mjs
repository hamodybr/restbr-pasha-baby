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
  'js/pasha-baby-product-description-v2.js',
  'js/pasha-baby-retail-v4.js',
  'js/pasha-baby-fixed-discounts.js',
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

requireText('index.html', 'css/pasha-baby-storefront-bundle.css?v=1.0', 'retail storefront CSS bundle');
requireText('index.html', 'js/runtime-config.js?v=2.2', 'product gallery runtime config');
requireText('index.html', 'js/pasha-baby-storefront-bundle.js?v=1.0', 'retail storefront JavaScript bundle');
requireText('js/pasha-baby-storefront-bundle.js', '/* js/pasha-baby-commerce.js */', 'bundled preferred-color commerce runtime');
requireText('js/pasha-baby-storefront-bundle.js', '/* js/pasha-baby-retail-v4.js */', 'bundled placeholder detail opener runtime');
requireText('js/pasha-baby-storefront-bundle.js', '/* js/live-prices.js */', 'bundled fixed-discount-aware live prices');
requireText('js/pasha-baby-storefront-bundle.js', '/* js/pasha-baby-fixed-discounts.js */', 'bundled fixed discount storefront runtime');
requireText('css/pasha-baby-storefront-bundle.css', '/* css/pasha-baby-final-tweaks.css */', 'bundled final Pasha UI tweaks');
forbidText('index.html', 'css/english-card-ltr.css', 'English-only card stylesheet');
forbidText('index.html', 'js/english-news-ticker.js', 'English ticker layer');
forbidText('index.html', 'id="smLangs"', 'storefront language picker');

requireMatch('sw.js', /restbr-pasha-baby-v\d+/, 'retail cache generation');
requireText('sw.js', 'css/pasha-baby-storefront-bundle.css?v=1.0', 'cached retail storefront stylesheet bundle');
requireText('sw.js', 'js/pasha-baby-storefront-bundle.js?v=1.0', 'cached retail storefront JavaScript bundle');
requireText('sw.js', 'js/runtime-config.js?v=2.2', 'cached product gallery runtime config');
requireText('sw.js', 'js/pasha-arabic-only.js?v=1.3', 'cached Arabic-only policy');
requireText('sw.js', 'js/pasha-number-normalizer.js?v=1.2', 'cached English-digit normalizer');

requireText('js/supabase-config.js', 'js/pasha-arabic-only.js?v=1.3', 'Arabic-only policy loader');
forbidText('js/supabase-config.js', 'language-settings.js', 'legacy multilingual loader');
requireText('js/pasha-arabic-only.js', "localStorage.setItem('RESTBR_LANG_V1', 'ar')", 'Arabic language lock');
requireText('js/pasha-arabic-only.js', 'data-pasha-multilang-hidden', 'admin multilingual field suppression');
requireText('js/pasha-arabic-only.js', 'js/admin-retail-discounts.js?v=4.0', 'fixed retail discount admin v4 loader');
requireText('js/pasha-arabic-only.js', 'js/admin-product-colors.js?v=3.0', 'product colors admin v3 loader');
requireText('js/pasha-arabic-only.js', 'js/admin-large-catalog.js?v=1.0', 'large catalog admin loader');

requireText('js/pasha-baby-commerce.js', "scope_type === 'product'", 'product discount priority compatibility');
requireText('js/pasha-baby-commerce.js', "scope_type === 'category'", 'category discount priority compatibility');
requireText('js/pasha-baby-commerce.js', "scope_type === 'restaurant'", 'store-wide discount compatibility');
requireText('js/pasha-baby-commerce.js', 'scheduleNextDiscountBoundary', 'automatic scheduled discount boundary refresh');
requireText('js/pasha-baby-commerce.js', 'observer.observe(menu, { childList: true, subtree: false })', 'non-recursive commerce DOM observer');
requireText('js/pasha-baby-commerce.js', "fetchAll('products'", 'paginated storefront products');
requireText('js/pasha-baby-commerce.js', "fetchAll('product_options'", 'paginated storefront options');
requireText('js/pasha-baby-commerce.js', 'RESTBR_LARGE_CATALOG_READY', 'large storefront catalog readiness');
requireText('js/pasha-baby-commerce.js', 'product_colors', 'customer product colors loader');
requireText('js/pasha-baby-commerce.js', 'dataset.retailBypass', 'existing cart integration guard');
requireText('js/pasha-baby-commerce.js', 'dataset.pbPreferredColorId', 'detail-sheet preferred color handoff');
requireText('js/pasha-baby-commerce.js', "compose('ar', 'اللون')", 'Arabic color carried into cart');

requireText('js/runtime-config.js', 'js/pasha-baby-product-description-v2.js?v=3.0', 'product details gallery v3 loader');
requireText('js/pasha-baby-product-description-v2.js', '__PB_PRODUCT_DETAILS_GALLERY_V3__', 'product details gallery v3 guard');
requireText('js/pasha-baby-product-description-v2.js', 'window.PASHA_OPEN_PRODUCT_DETAILS', 'public product details opener');
requireText('js/pasha-baby-product-description-v2.js', 'data-pb-detail-color-id', 'interactive detail color picker');
requireText('js/pasha-baby-product-description-v2.js', "stage.addEventListener('pointerdown'", 'touch swipe start');
requireText('js/pasha-baby-product-description-v2.js', "stage.addEventListener('pointerup'", 'touch swipe finish');
requireText('js/pasha-baby-retail-v4.js', 'window.PASHA_OPEN_PRODUCT_DETAILS(card, image)', 'placeholder image details routing');
requireText('css/pasha-baby-card-density-v2.css', '.pb-product-sheet-gallery', 'details image carousel styling');
requireText('css/pasha-baby-card-density-v2.css', '.pb-product-sheet-color-list', 'details color selector styling');

requireText('js/pasha-baby-fixed-discounts.js', '__PASHA_BABY_FIXED_DISCOUNTS_V1__', 'fixed discount storefront guard');
requireText('js/pasha-baby-fixed-discounts.js', 'discount_amount', 'fixed amount DB field');
requireText('js/pasha-baby-fixed-discounts.js', 'product.discountAmount = amount', 'fixed amount stored on product');
requireText('js/pasha-baby-fixed-discounts.js', 'fixedPrice(original, amount)', 'fixed amount price calculation');
requireText('js/pasha-baby-fixed-discounts.js', 'pb-fixed-discount-chip', 'discount chip beside add action');
requireText('js/pasha-baby-fixed-discounts.js', 'restbr:fixed-discounts-ready', 'fixed discount readiness event');
requireText('js/pasha-baby-fixed-discounts.js', "scope_type === 'product'", 'fixed product priority');
requireText('js/pasha-baby-fixed-discounts.js', "scope_type === 'category'", 'fixed category priority');
requireText('js/pasha-baby-fixed-discounts.js', "scope_type === 'restaurant'", 'fixed store priority');

requireText('js/live-prices.js', '__RESTBR_LIVE_PRICES_V3__', 'live price v3 singleton guard');
requireText('js/live-prices.js', 'fetchAllPriceRows', 'paginated live price sync');
requireText('js/live-prices.js', 'retailPrice(product, originalPrice)', 'discount-aware live price calculation');
requireText('js/live-prices.js', 'product?.discountAmount', 'fixed amount live price calculation');
requireText('js/live-prices.js', 'restbr:fixed-discounts-ready', 'fixed amount live price resync');
requireText('js/live-prices.js', 'restbr:catalog-expanded', 'large catalog live price resync');

requireText('js/admin-large-catalog.js', 'PAGE_SIZE = 1000', 'paginated admin page size');
requireText('js/admin-large-catalog.js', 'from(table)', 'generic admin pagination loader');

requireText('js/admin-retail-discounts.js', '__PASHA_ADMIN_RETAIL_DISCOUNTS_V4__', 'discount admin v4 guard');
requireText('js/admin-retail-discounts.js', 'pbDiscountAmount', 'fixed amount input');
requireText('js/admin-retail-discounts.js', 'قيمة الخصم (د.ع)', 'fixed amount Arabic label');
requireText('js/admin-retail-discounts.js', 'discount_amount: amount', 'fixed amount insert');
requireText('js/admin-retail-discounts.js', 'discount_percent: 0', 'legacy percent neutralization');
requireText('js/admin-retail-discounts.js', "event.target.closest('#pbDiscountQuickBtn')", 'resilient discount button delegation');
requireText('js/admin-retail-discounts.js', 'body.admin-global-light #discountsSettingsPanel', 'discount light-theme support');
requireText('js/admin-retail-discounts.js', "price_mode: 'both'", 'retail discount backward-compatible price mode');
requireText('js/admin-retail-discounts.js', 'starts_at: startsAt', 'discount start scheduling');
requireText('js/admin-retail-discounts.js', 'ends_at: endsAt', 'discount end scheduling');
forbidText('js/admin-retail-discounts.js', 'pbDiscountPercent', 'percentage discount input');
forbidText('js/admin-retail-discounts.js', 'نسبة الخصم %', 'percentage discount wording');
forbidText('js/admin-retail-discounts.js', 'داخل المطعم', 'restaurant dining wording');
forbidText('js/admin-retail-discounts.js', 'سفري', 'takeaway wording');
requireText('js/admin-retail-discounts.js', 'المتجر كامل', 'store-wide discount wording');

// Regression guard: the generic retail copy layer must never delete the Pasha
// discount panel. Doing so while discount resilience re-inserts it creates a
// MutationObserver add/remove loop that freezes the Products dashboard.
forbidText(
  'js/pasha-baby-admin-copy.js',
  "document.getElementById('discountsSettingsPanel')?.remove();",
  'discount panel deletion / Products freeze loop'
);

requireText('css/pasha-baby-final-tweaks.css', '#smMenu .sm-display-badge.red', 'hot/spicy label suppression');
requireText('css/pasha-baby-final-tweaks.css', '#smMenu .pb-discount-badge', 'old overlay discount suppression');
requireText('css/pasha-baby-final-tweaks.css', '.pb-fixed-discount-chip', 'fixed discount action chip styling');
requireText('css/pasha-baby-final-tweaks.css', '1.15s', 'extended add-to-cart toast visibility');

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

const colorsMigration = 'supabase/migrations/20260906230500_pasha_retail_discounts_and_colors.sql';
requireText(colorsMigration, 'create table if not exists public.product_colors', 'product_colors table');
requireText(colorsMigration, 'alter table public.product_colors enable row level security', 'product_colors RLS');
requireText(colorsMigration, 'private.can_manage_menu()', 'admin-only color writes');
requireText(colorsMigration, 'starts_at timestamptz', 'discount starts_at');
requireText(colorsMigration, 'ends_at timestamptz', 'discount ends_at');
requireText(colorsMigration, 'on delete cascade', 'color cleanup with product deletion');

const fixedMigration = 'supabase/migrations/20260907113000_pasha_fixed_amount_discounts.sql';
requireText(fixedMigration, 'discount_amount numeric(12,2)', 'fixed discount amount column');
requireText(fixedMigration, 'discounts_discount_amount_check', 'fixed discount amount constraint');
requireText(fixedMigration, 'discounts_discount_value_check', 'discount value compatibility constraint');
requireText(fixedMigration, 'discount_percent >= 0', 'zeroed percent compatibility');
requireText(fixedMigration, 'set is_active = false', 'legacy percentage discounts disabled');

if (failures.length) {
  console.error('\nRetail commerce audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby Arabic-only fixed-discount retail commerce audit passed');
