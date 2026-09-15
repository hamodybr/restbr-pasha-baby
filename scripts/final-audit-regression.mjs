import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Run the production request handler with an in-memory database. No network or
// real order writes: this verifies which validated values reach the order RPC.
const source = fs.readFileSync('supabase/functions/pasha-orders/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
const js = stripTypeScriptTypes(source);
const productId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const optionA = '33333333-3333-4333-8333-333333333333';
const optionB = '44444444-4444-4444-8444-444444444444';
const missingId = '55555555-5555-4555-8555-555555555555';
const options = [
  { id: optionA, product_id: productId, price: 10000, name_ar: 'قياس 3' },
  { id: optionB, product_id: productId, price: 19000, name_ar: 'قياس 4' },
];
let currentOptions = options, existing = null, writes = [], handler;
const data = table => ({
  orders: existing,
  restaurant_settings: { is_open: true, orders_enabled: true, restaurant_schedule_mode: 'always' },
  products: [{ id: productId, category_id: categoryId, base_price: 5000, name_ar: 'منتج' }],
  product_options: currentOptions,
  product_colors: [], discounts: [], categories: [{ id: categoryId }],
}[table]);
const db = {
  from(table) {
    const query = {
      select() { return this; }, eq() { return this; }, in() { return this; },
      order() { return this; }, limit() { return this; },
      maybeSingle() { return Promise.resolve({ data: data(table) }); },
      then(resolve, reject) { return Promise.resolve({ data: data(table) }).then(resolve, reject); },
    };
    return query;
  },
  async rpc(name, args) {
    if (name === 'claim_pasha_order_rate_limit') return { data: true };
    assert.equal(name, 'create_pasha_order'); writes.push(args);
    return { data: { order_id: 'test-only', total: args.p_items.reduce((s, i) => s + i.quantity * i.unit_price, 0) } };
  },
};
vm.runInNewContext(js, {
  Deno: { env: { get: () => 'test-only' }, serve: fn => { handler = fn; } },
  createClient: () => db, Request, Response, TextDecoder, RangeError, SyntaxError, Error,
  console: { error() {} },
});
const payload = item => ({
  name: 'اختبار محلي', phone: '07500000000', orderType: 'pickup',
  clientToken: '66666666-6666-4666-8666-666666666666',
  items: [{ productId, optionId: optionB, optionIndex: 1, quantity: 2, price: 1, ...item }],
});
const request = body => new Request('https://example.test/orders', {
  method: 'POST', headers: { origin: 'https://pashababyiq.com', 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
assert.equal((await handler(request(payload()))).status, 201);
assert.equal(writes[0].p_items[0].unit_price, 19000, 'client prices must not override catalog prices');
assert.equal(writes[0].p_items[0].option_id, optionB);
for (const item of [{ optionId: missingId, optionIndex: 0 }, { optionId: '', optionIndex: 99 }]) {
  writes = [];
  assert.equal((await handler(request(payload(item)))).status, 400);
  assert.equal(writes.length, 0, 'stale/invalid options must not create an order');
}
currentOptions = [];
assert.equal((await handler(request(payload({ optionId: optionB })))).status, 400);
assert.equal((await handler(request(payload({ optionId: '' })))).status, 201);
assert.equal(writes.at(-1).p_items[0].unit_price, 5000, 'products without options retain their base price');
currentOptions = options;
assert.equal((await handler(request(payload({ optionId: '', optionIndex: 1 })))).status, 201);
existing = { id: 'existing', order_number: 'PB-existing', customer_phone: '+9647500000000', total: 38000 };
writes = [];
assert.equal((await handler(request(payload()))).status, 200);
assert.equal(writes.length, 0, 'duplicate retry must not create another order');
existing = null;
assert.equal((await handler(request('null'))).status, 400);
assert.equal((await handler(request('[]'))).status, 400);
assert.equal((await handler(request('{'))).status, 400);
const oversized = request(JSON.stringify({ notes: 'x'.repeat(66000) }));
assert.equal(oversized.headers.has('content-length'), false);
assert.equal((await handler(oversized)).status, 413, 'body cap must work without Content-Length');
assert.equal(writes.length, 0);
console.log('✓ Order handler: authoritative prices, stale options, base prices, duplicate retry and bounded JSON');

// Execute the real worker with deterministic cache/network stand-ins.
const listeners = {}, stored = new Map();
let failNetwork = false;
const worker = {
  self: { location: { origin: 'https://example.test' }, addEventListener: (event, fn) => { listeners[event] = fn; } },
  caches: {
    match: async (req, opts) => {
      if (opts?.ignoreSearch) return stored.get(new URL(req.url).pathname)?.clone();
      return stored.get(req.url)?.clone();
    },
    open: async () => ({ put: async (req, response) => { stored.set(req.url, response.clone()); } }),
  },
  fetch: async req => { if (failNetwork) throw Error('offline'); return new Response('fresh:' + new URL(req.url).search); },
  URL, Response,
};
vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), worker);
stored.set('/css/pasha-reviews.css', new Response('stale-v5'));
async function fetchCode(version) {
  const pending = []; let response;
  listeners.fetch({ request: new Request('https://example.test/css/pasha-reviews.css?v=' + version),
    respondWith: r => { response = r; }, waitUntil: p => pending.push(p) });
  const result = await response; await Promise.all(pending); return result;
}
assert.equal(await (await fetchCode(6)).text(), 'fresh:?v=6', 'new versions must not receive old bytes');
failNetwork = true;
assert.equal(await (await fetchCode(6)).text(), 'fresh:?v=6', 'exact cached versions work offline');
assert.equal((await fetchCode(7)).type, 'error', 'offline must not silently substitute a different version');
console.log('✓ Service worker: exact version cache, network upgrade and safe offline behavior');
