import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const stripTypeScriptTypes = code => ts.transpile(code, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 });
import { pathToFileURL } from 'node:url';

const awsModule = pathToFileURL(`${process.cwd()}/node_modules/aws4fetch/dist/aws4fetch.esm.mjs`).href;
const source = fs.readFileSync('supabase/functions/r2-images/storage.ts', 'utf8').replace('npm:aws4fetch@1.0.20', awsModule);
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const { R2Storage, parseList, imageExtension, STOP_BYTES } = await import(moduleUrl);
const env = { R2_ENDPOINT: `https://${'a'.repeat(32)}.r2.cloudflarestorage.com`, R2_BUCKET: 'pasha-baby-images', R2_PUBLIC_BASE_URL: 'https://images.pashababyiq.com', R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret' };
const store = new R2Storage(k => env[k]);
assert.throws(() => new R2Storage(k => k === 'R2_ENDPOINT' ? env[k] + '/pasha-baby-images' : env[k]), /without the bucket/);
assert.throws(() => new R2Storage(k => k === 'R2_PUBLIC_BASE_URL' ? 'https://other.example' : env[k]), /Unexpected/);
assert.deepEqual(parseList('<ListBucketResult><Contents><Key>a&amp;b</Key><Size>12</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>').files, [{ key: 'a&b', size: 12 }]);
assert.throws(() => parseList('<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>'), /Incomplete/);
assert.throws(() => parseList('<ListBucketResult><Contents><Key>x</Key><Size>NaN</Size></Contents></ListBucketResult>'), /Invalid/);
assert.throws(() => imageExtension(new TextEncoder().encode('<svg onload="alert(1)">'), 'image/webp'), /صالحة/);
const webp = new Uint8Array([82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32,0,0,0,0]);
const file = new File([webp], 'photo.webp', { type: 'image/webp' });
const originalFetch = globalThis.fetch;
const requests = [];
let listing = 0;
globalThis.fetch = async req => {
  requests.push(req);
  assert.match(req.headers.get('authorization'), /^AWS4-HMAC-SHA256 /);
  assert.equal(new URL(req.url).hostname, 'a'.repeat(32) + '.r2.cloudflarestorage.com');
  if (req.method === 'GET') {
    listing++;
    return new Response(listing === 1 ? '<ListBucketResult><Contents><Key>first</Key><Size>10</Size></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>a&amp;b</NextContinuationToken></ListBucketResult>' : '<ListBucketResult><Contents><Key>second</Key><Size>20</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>');
  }
  return new Response(null, { status: 200 });
};
try {
  const usage = await store.usage();
  assert.equal(usage.currentBytes, 30);
  assert.equal(usage.fileCount, 2);
  assert.equal(new URL(requests[1].url).searchParams.get('continuation-token'), 'a&b');
  store.usage = async () => ({ currentBytes: 0 });
  const uploaded = await store.upload(file, file, 'valid-id');
  assert.match(uploaded.publicUrl, /^https:\/\/images\.pashababyiq\.com\/products\/valid-id\/[a-f0-9]{64}\.webp$/);
  assert.equal(uploaded.thumbnailUrl, uploaded.publicUrl.replace('.webp', '-card.webp'));
  const puts = requests.filter(r => r.method === 'PUT');
  assert.equal(puts.length, 2);
  assert.ok(puts[0].url.includes('-card.webp'));
  assert.equal(puts[1].headers.get('cache-control'), 'public, max-age=31536000, immutable');
  await assert.rejects(store.upload(file, file, '../escape'), /Invalid/);
  await assert.rejects(store.upload(new File([new Uint8Array(701*1024)], 'big.webp', { type: 'image/webp' }), file, 'valid-id'), /أكبر/);
  store.usage = async () => ({ currentBytes: STOP_BYTES - 1 });
  const before = requests.length;
  await assert.rejects(store.upload(file, file, 'valid-id'), /9 GB/);
  assert.equal(requests.length, before, 'quota rejection must not PUT');
  const handlerSource = fs.readFileSync('supabase/functions/r2-images/index.ts', 'utf8').replace('./storage.ts', moduleUrl).replace('Deno.serve(handler);', '');
  globalThis.Deno = { env: { get: k => k === 'SUPABASE_URL' ? 'https://project.supabase.co' : 'anon-test' } };
  const { handler } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(handlerSource)).toString('base64'));
  assert.equal((await handler(new Request('https://fn.example', { method: 'GET' }))).status, 405);
  assert.equal((await handler(new Request('https://fn.example', { method: 'POST' }))).status, 403);
  globalThis.fetch = async () => new Response('false', { headers: { 'Content-Type': 'application/json' } });
  assert.equal((await handler(new Request('https://fn.example', { method: 'POST', headers: { Authorization: 'Bearer visitor' } }))).status, 403);
} finally { globalThis.fetch = originalFetch; delete globalThis.Deno; }
console.log('R2 storage: signed requests, paginated totals, thumbnails, input validation, upload limit and manager authorization passed.');
