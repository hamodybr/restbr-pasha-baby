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
const forbidText = (file, marker, label = marker) => {
  if (exists(file) && read(file).includes(marker)) fail(`${file}: forbidden ${label}`);
};

const files = [
  'js/pasha-baby-commerce.js',
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
requireText('index.html', 'js/pasha-baby-commerce.js?v=1.0', 'retail commerce runtime');
requireText('sw.js', 'restbr-pasha-baby-v19', 'retail cache generation');
requireText('sw.js', 'css/pasha-baby-commerce.css?v=1.0', 'cached commerce stylesheet');
requireText('sw.js', 'js/pasha-baby-commerce.js?v=1.0', 'cached commerce runtime');

requireText('js/language-settings.js', 'js/admin-retail-discounts.js?v=1.0', 'retail discount admin loader');
requireText('js/language-settings.js', 'js/admin-product-colors.js?v=1.0', 'product colors admin loader');

requireText('js/pasha-baby-commerce.js', "scope_type === 'product'", 'product discount priority');
requireText('js/pasha-baby-commerce.js', "scope_type === 'category'", 'category discount priority');
requireText('js/pasha-baby-commerce.js', "scope_type === 'restaurant'", 'store-wide discount compatibility');
requireText('js/pasha-baby-commerce.js', 'starts_at', 'discount start scheduling');
requireText('js/pasha-baby-commerce.js', 'ends_at', 'discount end scheduling');
requireText('js/pasha-baby-commerce.js', 'product_colors', 'customer product colors loader');
requireText('js/pasha-baby-commerce.js', 'data-retail-bypass', 'existing cart integration guard');
requireText('js/pasha-baby-commerce.js', "Color: ${colorName}", 'English color carried into cart');
requireText('js/pasha-baby-commerce.js', "اللون: ${colorName}", 'Arabic color carried into cart');

requireText('js/admin-retail-discounts.js', "price_mode: 'both'", 'retail discount backward-compatible price mode');
forbidText('js/admin-retail-discounts.js', 'داخل المطعم', 'restaurant dining wording');
forbidText('js/admin-retail-discounts.js', 'سفري', 'takeaway wording');
requireText('js/admin-retail-discounts.js', 'المتجر كامل', 'store-wide discount wording');

requireText('js/admin-product-colors.js', "from('product_colors')", 'product colors writes');
requireText('js/admin-product-colors.js', 'is_available', 'color availability control');
requireText('js/admin-product-colors.js', 'color_hex', 'color visual selector');

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
