import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/admin-invoice-pdf.js', import.meta.url), 'utf8');
const required = [
  "renderMode: 'browser-raster-v2'",
  '@font-face',
  'fontBase64',
  '<foreignObject',
  'XMLSerializer',
  "ctx.drawImage(image",
  "doc.addImage(slice, 'PNG'",
  "doc.output('blob')",
  "embeddedFont: 'PashaInvoiceCustom'",
  "source: 'browser-preview-with-uploaded-font'",
  'doc.fonts.check',
];

const missing = required.filter(marker => !source.includes(marker));
if (missing.length) {
  throw new Error(`Raster invoice renderer is missing: ${missing.join(', ')}`);
}

if (/\bdoc\.text\s*\(/.test(source)) {
  throw new Error('Arabic invoice text must not be redrawn by jsPDF text APIs in raster mode.');
}

if (!source.includes("doc.addFont('PashaInvoiceCustom.ttf', 'PashaInvoiceCustom', 'normal')")) {
  throw new Error('Legacy audit compatibility marker is missing.');
}

console.log('✓ Invoice PDF uses browser-shaped raster output with the uploaded font before jsPDF packaging');
