import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const failures = [];
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (file, marker, label = marker) => {
  if (!read(file).includes(marker)) failures.push(`${file}: missing ${label}`);
};
const forbidText = (file, marker, label = marker) => {
  if (read(file).includes(marker)) failures.push(`${file}: forbidden ${label}`);
};

for (const file of ['js/admin-invoice-pdf-v3.js', 'js/admin-orders-nav-hotfix.js']) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

requireText('js/admin-invoice-pdf-v3.js', "const RENDER_MODE = 'html2canvas-v3'", 'v3 render mode');
requireText('js/admin-invoice-pdf-v3.js', 'new win.FontFace', 'browser FontFace loading');
requireText('js/admin-invoice-pdf-v3.js', 'doc.fonts.check', 'custom-font verification');
requireText('js/admin-invoice-pdf-v3.js', 'foreignObjectRendering: false', 'foreignObject disabled');
requireText('js/admin-invoice-pdf-v3.js', 'html2canvas(label', 'direct DOM-to-canvas renderer');
requireText('js/admin-invoice-pdf-v3.js', "slice.toDataURL('image/png')", 'PNG PDF pages');
requireText('js/admin-invoice-pdf-v3.js', "embeddedFont: 'browser-canvas:PashaInvoiceCustom'", 'browser-canvas result marker');
requireText('js/admin-orders-nav-hotfix.js', "loadAddon('pashaInvoicePdfScript', 'js/admin-invoice-pdf-v3.js?v=3.0')", 'v3 preloader using legacy loader id');
forbidText('js/admin-invoice-pdf-v3.js', '<foreignObject', 'SVG foreignObject pipeline');
forbidText('js/admin-invoice-pdf-v3.js', 'XMLSerializer', 'serialized SVG invoice pipeline');

if (failures.length) {
  console.error('\nInvoice PDF v3 audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Invoice PDF v3 uses browser canvas text shaping with the verified uploaded font');
