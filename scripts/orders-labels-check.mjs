import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const exists = file => fs.existsSync(path.join(root, file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => failures.push(message);
const requireText = (file, text, label = text) => {
  if (!exists(file)) return fail(`${file}: missing`);
  if (!read(file).includes(text)) fail(`${file}: missing ${label}`);
};
const forbidText = (file, text, label = text) => {
  if (exists(file) && read(file).includes(text)) fail(`${file}: forbidden ${label}`);
};

for (const file of [
  'js/pasha-order-submit.js',
  'js/admin-orders-customers.js',
  'js/pasha-arabic-only.js',
  'js/admin-role-ui.js',
  'js/admin-orders-enhancements.js',
  'js/pasha-order-color-bridge.js',
  'js/pasha-color-image-gallery.js',
  'js/admin-color-image-upload.js',
  'js/pasha-number-normalizer.js',
  'js/admin-orders-nav-hotfix.js'
]) {
  if (!exists(file)) { fail(`${file}: missing`); continue; }
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

const migration = 'supabase/migrations/20260908173000_pasha_orders_customers_labels.sql';
const deleteMigration = 'supabase/migrations/20260908204500_orders_customers_delete_permissions.sql';
const deliveryMigration = 'supabase/migrations/20260909031732_pasha_order_item_colors_and_delivery_fees.sql';
const colorGrantMigration = 'supabase/migrations/20260909040910_grant_pasha_orders_color_read.sql';
const edge = 'supabase/functions/pasha-orders/index.ts';
const colorImageEdge = 'supabase/functions/b2-color-images/index.ts';

requireText(migration, 'create table if not exists public.customers', 'customers table');
requireText(migration, 'phone_e164 text not null unique', 'unique E.164 phone identifier');
requireText(migration, 'alter table public.customers enable row level security', 'customers RLS');
requireText(migration, 'create_pasha_order', 'transactional order RPC');
requireText(migration, 'security definer', 'server-only transactional RPC');
requireText(migration, 'revoke all on function public.create_pasha_order', 'RPC public revoke');
requireText(migration, 'grant execute on function public.create_pasha_order', 'service role RPC grant');
requireText(migration, 'with (security_invoker = true)', 'RLS-respecting customer summary');
requireText(migration, 'private.pasha_order_rate_limit', 'private order rate-limit buckets');
requireText(migration, 'claim_pasha_order_rate_limit', 'server-only order rate limiter');
requireText(migration, 'accepted_count < 240', 'global per-minute abuse ceiling');
requireText(migration, 'accepted_count < 5', 'per-phone per-minute abuse ceiling');
requireText(migration, 'pg_advisory_xact_lock', 'idempotency concurrency lock');
forbidText(migration, 'grant insert on public.orders to anon', 'public order insert');
forbidText(migration, 'grant select on public.customers to anon', 'public customer read');
forbidText(migration, 'grant execute on function public.claim_pasha_order_rate_limit(text) to anon', 'public rate-limit RPC execution');

requireText(deleteMigration, 'restbr_orders_delete', 'order delete RLS policy');
requireText(deleteMigration, 'pasha_customers_delete', 'customer delete RLS policy');
requireText(deleteMigration, 'private.can_manage_orders()', 'delete permission guard');
requireText(deleteMigration, 'grant delete on public.orders to authenticated', 'authenticated order delete grant');
requireText(deleteMigration, 'grant delete on public.customers to authenticated', 'authenticated customer delete grant');
requireText(deliveryMigration, 'add column if not exists selected_color text', 'per-item selected color column');
requireText(deliveryMigration, 'option_name, selected_color', 'selected color order item insert');
requireText(deliveryMigration, 'revoke all on function public.create_pasha_order', 'order RPC remains server-only');
requireText(colorGrantMigration, 'grant select on table public.product_colors to service_role', 'order function color catalog read grant');

requireText(edge, 'https://pashababyiq.com', 'production origin');
requireText(edge, 'SUPABASE_SERVICE_ROLE_KEY', 'server-only service role');
requireText(edge, 'MAX_BODY_BYTES', 'request body size cap');
requireText(edge, 'effectiveDiscount', 'authoritative fixed discount calculation');
requireText(edge, 'create_pasha_order', 'transactional order RPC call');
requireText(edge, 'claim_pasha_order_rate_limit', 'rate limiter call');
requireText(edge, 'existingOrderResult', 'duplicate fast-path');
requireText(edge, 'One of the products is not available right now', 'availability validation');
requireText(edge, 'Origin not allowed', 'origin rejection');
requireText(edge, 'restaurant_schedule_mode', 'server opening-hours validation');
requireText(edge, 'settings.orders_enabled === false', 'server orders enabled validation');
requireText(edge, 'settings.delivery_enabled === false', 'server delivery validation');
requireText(edge, 'settings.pickup_enabled === false', 'server pickup validation');
requireText(edge, 'Invalid location reference', 'server delivery location validation');
requireText(edge, '.from("product_colors")', 'authoritative color lookup');
requireText(edge, 'selected_color: selectedColor', 'authoritative selected color persistence');
requireText(edge, 'baghdadNow().stamp', 'Baghdad order-number date');
requireText(edge, 'تمت محاولات طلب كثيرة خلال دقيقة واحدة', 'Arabic rate-limit response');

requireText('js/pasha-order-submit.js', "const CART_KEY = 'RESTBR_CART_V1'", 'existing cart integration');
requireText('js/pasha-order-submit.js', '/functions/v1/pasha-orders', 'order Edge Function call');
requireText('js/pasha-order-submit.js', 'clientToken', 'idempotency token');
requireText('js/pasha-order-submit.js', 'event.stopImmediatePropagation()', 'persist-before-WhatsApp interception');
requireText('js/pasha-order-submit.js', 'capturedLocationUrl', 'captured delivery location');
requireText('js/pasha-order-submit.js', 'https://maps.google.com/?q=', 'Google Maps location payload');
requireText('js/pasha-order-submit.js', 'if (checkout.locationUrl)', 'WhatsApp location preservation');
requireText('js/admin-orders-customers.js', '@page{size:100mm 150mm;margin:0}', '100x150 print page');
requireText('js/admin-orders-customers.js', "from('customer_order_summary')", 'customer summary');
requireText('js/admin-orders-customers.js', "from('orders')", 'orders dashboard');
requireText('js/admin-orders-customers.js', 'PDF / طباعة 100×150', 'label action');
requireText('js/pasha-arabic-only.js', "js/pasha-order-submit.js?v=1.1", 'public order loader');
requireText('js/pasha-arabic-only.js', "js/admin-orders-customers.js?v=1.2", 'admin orders loader');
requireText('js/pasha-arabic-only.js', "js/pasha-order-color-bridge.js?v=1.1", 'color persistence loader');
requireText('js/pasha-arabic-only.js', "js/pasha-color-image-gallery.js?v=1.0", 'color gallery loader');
requireText('js/pasha-arabic-only.js', 'js/pasha-number-normalizer.js?v=1.2', 'number normalizer loader');
requireText('js/pasha-arabic-only.js', 'js/admin-interaction-polish.js?v=1.5', 'restored drag and first-tap loader');
requireText('js/admin-role-ui.js', "'pasha-orders'", 'orders view role allowlist');
requireText('js/admin-role-ui.js', "'pasha-customers'", 'customers view role allowlist');
requireText('js/admin-role-ui.js', "const ORDERS_ROLES = new Set(['super_admin','owner','manager'])", 'orders/customer role policy');
requireText('js/admin-role-ui.js', "qa('.bottom-nav .nav-btn')", 'dynamic bottom-nav column count');

requireText('js/admin-orders-nav-hotfix.js', 'js/admin-orders-enhancements.js?v=1.0', 'orders UI enhancement loader');
requireText('js/admin-orders-nav-hotfix.js', 'js/admin-color-image-upload.js?v=1.0', 'color image upload loader');
requireText('js/admin-orders-enhancements.js', "from('orders').delete()", 'order delete action');
requireText('js/admin-orders-enhancements.js', "from('customers').delete()", 'customer delete action');
requireText('js/admin-orders-enhancements.js', 'body.admin-global-dark #viewPashaOrders', 'orders dark theme');
requireText('js/admin-orders-enhancements.js', 'body.admin-global-dark #viewPashaCustomers', 'customers dark theme');
requireText('js/admin-orders-enhancements.js', 'button.pb-danger-delete', 'specific delete button danger styling');
requireText('js/pasha-order-color-bridge.js', "colorId: String(cart[index]?.colorId || '')", 'selected color id payload');
forbidText('js/pasha-order-color-bridge.js', 'payload.notes =', 'color summary inside order notes');
requireText('js/pasha-order-color-bridge.js', "ar: ['اللون'", 'Arabic explicit color label');
requireText('js/admin-orders-customers.js', 'orderItemsWithColors(order)', 'per-item invoice color mapping');
requireText('js/admin-orders-customers.js', 'data-save-delivery-fee', 'delivery fee editor');
requireText('js/admin-orders-customers.js', '1× أجور التوصيل', 'delivery fee invoice line');
requireText('js/admin-orders-customers.js', 'englishDigits', 'English invoice digits');
requireText('js/pasha-order-submit.js', "toast('تم تثبيت الطلب'", 'order confirmation notice');
requireText('js/pasha-order-submit.js', 'WHATSAPP_DELAY_MS = 2600', 'visible notice before WhatsApp');
requireText('js/cart.js', 'send:"تثبيت الطلب"', 'confirm order button label');
requireText('js/cart.js', 'pb-delivery-live-icon', 'prominent delivery notice');
requireText('js/pasha-number-normalizer.js', 'RESTBR_TO_ENGLISH_DIGITS', 'global English digit normalizer');
requireText('js/pasha-number-normalizer.js', "document.addEventListener('beforeinput'", 'localized digit typing normalization');
requireText('js/pasha-number-normalizer.js', "document.addEventListener('paste'", 'localized digit paste normalization');
requireText('js/pasha-number-normalizer.js', "if (type === 'number')", 'iOS number input direct normalization');
requireText('js/pasha-number-normalizer.js', 'normalizeTextTree(root)', 'dashboard visible digit normalization');
requireText('js/admin-orders-customers.js', "let orderFilter = 'new'", 'new orders default filter');
requireText('js/admin-orders-customers.js', 'id="pbOrderStatusBar"', 'order status filter strip');
forbidText('js/admin-orders-customers.js', 'id="pbOrderFilter"', 'legacy native status dropdown filter');
requireText('js/pasha-color-image-gallery.js', 'pb-color-choice-image', 'color thumbnail chooser');
requireText('js/pasha-color-image-gallery.js', 'pb-color-large-preview', 'selected color image preview');
requireText('js/admin-color-image-upload.js', "sb.functions.invoke('b2-color-images'", 'B2 color image upload invocation');
requireText('js/admin-color-image-upload.js', '.pb-edit-color-image,.pb-npc-image', 'existing and new product color image fields');
requireText(colorImageEdge, 'COLOR_PREFIX = `${B2_PREFIX}color-assets/`', 'isolated color image B2 prefix');
requireText(colorImageEdge, 'MAX_UPLOAD_BYTES = 700 * 1024', 'color image max upload size');
requireText(colorImageEdge, 'requireMenuManager', 'color image admin authorization');
requireText(colorImageEdge, 'HARD_STOP_BYTES = 9 * 1024 * 1024 * 1024', 'B2 hard stop');

if (failures.length) {
  console.error('\nOrders/customers/labels audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby orders, customers, colors and 100x150 label audit passed');
