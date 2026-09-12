import fs from 'node:fs';

const fail = message => { throw new Error(message); };
const read = path => fs.readFileSync(path, 'utf8');

const runtime = read('js/runtime-config.js');
const studio = read('js/admin-invoice-studio-v1.js');
const workflow = read('.github/workflows/pages.yml');

if (!runtime.includes('pbInvoiceStudioV1Script')) fail('Invoice Studio loader id is missing from runtime config.');
if (!runtime.includes('js/admin-invoice-studio-v1.js?v=1.0')) fail('Invoice Studio loader path is missing from runtime config.');
if (!runtime.includes("/(^|\\/)admin(?:\\.html)?\\/?$/.test(path)")) fail('Invoice Studio loader must remain admin-only.');

for (const token of [
  '__PASHA_INVOICE_STUDIO_V1__',
  'data-pb-invoice-studio',
  'Invoice Studio',
  'data-studio-group',
  'data-studio-print',
  'data-studio-pdf',
  'data-studio-save',
  'data-pb-live-print',
  'data-pb-live-pdf',
  'data-pb-live-save',
  'MutationObserver'
]) {
  if (!studio.includes(token)) fail(`Invoice Studio is missing required integration token: ${token}`);
}

for (const group of ['quick','logo','brand','meta','customer','items','options','prices','total','footer','layout']) {
  if (!studio.includes(`id:'${group}'`)) fail(`Invoice Studio group is missing: ${group}`);
}

if (/supabaseClient\s*\.\s*from\s*\(/.test(studio)) {
  fail('Invoice Studio must not write to or query Supabase directly; it should reuse the validated live invoice engine.');
}
if (/fetchOrder\s*\(/.test(studio)) {
  fail('Invoice Studio must not duplicate order fetching.');
}
if (!workflow.includes('node scripts/invoice-studio-check.mjs')) fail('Invoice Studio audit is not wired into GitHub Actions.');

console.log('Invoice Studio trial audit passed.');
