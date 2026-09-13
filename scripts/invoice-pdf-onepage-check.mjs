import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const failures = [];
const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');
const need = (file, marker, label = marker) => {
  if (!exists(file)) return failures.push(`${file}: missing`);
  if (!read(file).includes(marker)) failures.push(`${file}: missing ${label}`);
};
const forbid = (file, marker, label = marker) => {
  if (exists(file) && read(file).includes(marker)) failures.push(`${file}: forbidden ${label}`);
};

const engine = 'js/admin-invoice-pdf-onepage-v8.js';
const router = 'js/admin-invoice-print-ready-v9.js';
const nativeShare = 'js/admin-invoice-pdf-native-share-v11.js';
const packer = 'js/admin-invoice-fast-pdf-ios-v1.js';
const brand = 'js/pasha-admin-brand-v1.js';

for (const file of [engine, router, nativeShare, packer, brand]) {
  if (!exists(file)) {
    failures.push(`${file}: missing`);
    continue;
  }
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${file}: syntax error ${String(error?.stderr || error?.message || error)}`);
  }
}

need('js/runtime-config.js', 'js/admin-invoice-print-ready-v9.js?v=9.0', 'V9 print-ready invoice loader');
need('js/runtime-config.js', 'js/admin-invoice-pdf-native-share-v11.js?v=11.0', 'V11 native PDF share loader');
need('js/runtime-config.js', 'js/pasha-admin-brand-v1.js?v=1.0', 'Pasha admin brand loader');
forbid('js/runtime-config.js', 'js/admin-invoice-pdf-direct-print-v10.js?v=10.0', 'V10 iframe print loader');
forbid('js/runtime-config.js', 'js/admin-invoice-print-v2.js?v=2.2', 'old V8 router loader alongside V9');

need(router, "js/admin-invoice-pdf-onepage-v8.js?v=8.0", 'proven V8 invoice engine reuse');
need(router, "preview-matched-one-page-v8", 'V8 render-mode assertion');
need(router, "document.addEventListener('click', capture, true)", 'capture-phase invoice generation override');
need(router, 'event.stopImmediatePropagation()', 'legacy invoice route suppression');
need(router, 'pbInvoiceForegroundOverlay', 'foreground generation overlay');
need(router, 'pbInvoicePrintReady', 'print-ready invoice screen');
need(router, 'data-pb-print-now', 'print button');
need(router, "printButton?.addEventListener('click', () => window.print())", 'legacy V9 HTML print handler retained for V11 interception');
need(router, 'extractEmbeddedJpeg', 'exact V8 raster reuse for print preview');
need(router, 'window.location.assign(pdfUrl)', 'optional PDF button');
need(router, 'result.pageCount !== 1', 'one-page output assertion');
need(router, 'result.customFontBaked !== true', 'custom-font raster assertion');
need(router, 'PdfClass: window.PashaFastSinglePagePdf', 'direct one-page packer for all devices');
need(router, 'fetchBuffer(fontUrl)', 'uploaded font byte fetch');
need(router, "renderMode: 'print-ready-preview-matched-v9'", 'V9 route identity');
forbid(router, 'window.open(', 'pre-generation popup/background-tab path');
forbid(router, 'jspdf', 'jsPDF dependency in active print route');

need(nativeShare, "value instanceof Blob && /^application\\/pdf", 'PDF-only Blob capture');
need(nativeShare, 'URL.createObjectURL = function pashaCreateObjectURLV11', 'exact final PDF Blob capture');
need(nativeShare, "document.addEventListener('click', handlePrintTap, true)", 'capture-phase print-button interception');
need(nativeShare, "event.target?.closest?.('[data-pb-print-now]')", 'V9 print button targeting');
need(nativeShare, 'event.stopImmediatePropagation()', 'old HTML print handler suppression');
need(nativeShare, 'new File(', 'real PDF file handoff');
need(nativeShare, 'navigator.canShare({ files: [file] })', 'native file-share capability check');
need(nativeShare, 'navigator.share({', 'native iOS share sheet path');
need(nativeShare, "files: [file]", 'share exact PDF file');
need(nativeShare, 'window.location.assign(latestPdfUrl)', 'safe proven-PDF fallback');
need(nativeShare, "version: '11.0'", 'V11 bridge identity');
forbid(nativeShare, 'contentWindow.print()', 'iframe/webpage print path');
forbid(nativeShare, 'window.print()', 'HTML print path');
forbid(nativeShare, 'window.open(', 'popup print path');
forbid(nativeShare, 'jspdf', 'jsPDF dependency in print bridge');

need(engine, "const RENDER_MODE = 'preview-matched-one-page-v8'", 'preview-matched render mode');
need(engine, 'const LAYOUT_MM = 2', 'dashboard preview mm visual contract');
need(engine, 'const LAYOUT_PT = 1', 'dashboard preview pt visual contract');
need(engine, 'paper_min_height_mm', 'preview paper-height contract');
need(engine, 'roundedRect(', 'rounded double-frame renderer');
need(engine, 'new FontFace(', 'uploaded font binary loader');
need(engine, 'document.fonts.check(', 'uploaded font verification');
need(engine, 'cachedCustomFontSignature', 'custom-font reuse cache');
need(engine, 'canvas.toBlob', 'async JPEG raster encoding');
need(engine, "'image/jpeg'", 'single-page JPEG raster');
need(engine, 'new Uint8Array(buffer)', 'binary image path without base64 expansion');
need(engine, "doc.addImage(jpeg, 'JPEG'", 'direct single-page image pack');
need(engine, 'pageCount: 1', 'exact one-page metadata');
need(engine, 'customFontBaked:', 'font-baked metadata');
need(engine, "ctx.fillText('◆'", 'preview footer diamond');
need(engine, "ctx.fillText('المجموع الكلي'", 'preview total layout');
forbid(engine, 'doc.addPage(', 'multi-page PDF creation');
forbid(engine, 'window.print(', 'renderer must stay independent from browser print');
forbid(engine, '96 / 25.4', 'old physical mm-to-px mismatch');
forbid(engine, '96 / 72', 'old physical pt-to-px mismatch');
forbid(engine, 'document.fonts.ready', 'global font-set wait that can stall Safari');

need(packer, '/Count 1', 'hard one-page PDF page tree');
need(packer, '/DCTDecode', 'direct JPEG embedding');

need(brand, "const FALLBACK_LOGO = 'assets/pasha-baby-logo-256.webp'", 'real Pasha Baby fallback logo');
need(brand, "document.querySelector('.admin-logo')", 'dashboard header logo repair');
need(brand, "document.querySelector('.login-brand img')", 'login logo repair');
need(brand, "document.getElementById('rs_logo_preview')", 'settings logo fallback repair');
need(brand, "loginTitle.textContent = 'Pasha Baby Admin'", 'login brand title');
if (!exists('assets/pasha-baby-logo-256.webp')) failures.push('assets/pasha-baby-logo-256.webp: missing');

if (failures.length) {
  console.error('\nInvoice native-PDF share V11 / Pasha admin brand audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ native-PDF invoice share/print V11 + Pasha Baby admin brand audit passed');
