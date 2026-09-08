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

for (const file of ['js/pasha-order-submit.js', 'js/admin-orders-customers.js', 'js/pasha-arabic-only.js']) {
  if (!exists(file)) { fail(`${file}: missing`); continue; }
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

const migration = 'supabase/migrations/20260908173000_pasha_orders_customers_labels.sql';
const edge = 'supabase/functions/pasha-orders/index.ts';

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
requireText('js/pasha-arabic-only.js', "js/pasha-order-submit.js?v=1.0", 'public order loader');
requireText('js/pasha-arabic-only.js', "js/admin-orders-customers.js?v=1.0", 'admin orders loader');

if (failures.length) {
  console.error('\nOrders/customers/labels audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby orders, customers and 100x150 label audit passed');
