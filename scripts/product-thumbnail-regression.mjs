import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
const rows = JSON.parse(fs.readFileSync('assets/product-thumbnails/manifest.json', 'utf8'));
const dom = new JSDOM('<body></body>', { url: 'https://pashababyiq.com/', runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('js/url-safety.js', 'utf8'));
const optimize = dom.window.RESTBR_OPTIMIZED_MEDIA_URL;
for (const row of rows) {
  assert.equal(optimize(row.source, 'product-card'), row.card);
  assert.equal(optimize(row.source, 'category'), row.category);
  for (const file of [row.card, row.category]) assert.ok(fs.statSync(file).size > 100, 'Missing thumbnail ' + file);
  const changed = new URL(row.source); changed.searchParams.set('v', 'new-upload-version');
  assert.equal(optimize(changed.href, 'product-card'), changed.href, 'Changed image must never use an old thumbnail');
  assert.equal(optimize(row.source, 'detail'), row.source, 'Detail image must remain full size');
  const unrelated = new URL(row.source); unrelated.hostname = 'unrelated.example';
  assert.equal(optimize(unrelated.href, 'product-card'), unrelated.href);
}
const totalSource = rows.reduce((total, row) => total + row.sourceBytes, 0);
const totalCard = rows.reduce((total, row) => total + fs.statSync(row.card).size, 0);
assert.ok(totalCard < totalSource * 0.1, 'Thumbnail compression no longer saves at least 90%');
const sample = 'https://wlollfpmjzenhkjwxrqo.supabase.co/storage/v1/object/public/menu-images/products/test.png';
assert.equal(new URL(optimize(sample, 'category')).searchParams.get('width'), '160');
assert.equal(new URL(optimize(sample, 'product-card')).searchParams.get('width'), '480');
dom.window.close();
console.log(`Product thumbnail regression passed: ${rows.length} versioned photos, ${totalSource} -> ${totalCard} bytes; changed uploads and original detail photos preserved.`);
