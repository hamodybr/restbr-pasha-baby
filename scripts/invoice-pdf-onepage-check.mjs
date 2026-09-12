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
const router = 'js/admin-invoice-print-v2.js';
const packer = 'js/admin-invoice-fast-pdf-ios-v1.js';

for (const file of [engine, router, packer]) {
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

need('js/runtime-config.js', 'js/admin-invoice-print-v2.js?v=2.2', 'V8 cache-busted invoice loader');
need(router, "js/admin-invoice-pdf-onepage-v8.js?v=8.0", 'V8 invoice engine route');
need(router, "preview-matched-one-page-v8", 'V8 render-mode assertion');
need(router, "document.addEventListener('click', capture, true)", 'capture-phase print override');
need(router, 'event.stopImmediatePropagation()', 'legacy HTML print suppression');
need(router, "window.location.assign(blobUrl)", 'same-tab PDF navigation after generation');
need(router, 'pbInvoiceForegroundOverlay', 'foreground generation overlay');
need(router, 'result.pageCount !== 1', 'one-page output assertion');
need(router, 'result.customFontBaked !== true', 'custom-font raster assertion');
need(router, 'PdfClass: window.PashaFastSinglePagePdf', 'direct one-page packer for all devices');
need(router, 'fetchBuffer(fontUrl)', 'uploaded font byte fetch');
need(router, "cache: 'force-cache'", 'repeat asset cache');
forbid(router, 'window.open(', 'pre-generation popup/background-tab path');
forbid(router, 'window.print(', 'browser HTML print path');
forbid(router, 'jspdf', 'jsPDF dependency in active print route');

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
forbid(engine, 'window.print(', 'HTML print fallback');
forbid(engine, '96 / 25.4', 'old physical mm-to-px mismatch');
forbid(engine, '96 / 72', 'old physical pt-to-px mismatch');
forbid(engine, 'document.fonts.ready', 'global font-set wait that can stall Safari');

need(packer, '/Count 1', 'hard one-page PDF page tree');
need(packer, '/DCTDecode', 'direct JPEG embedding');

if (failures.length) {
  console.error('\nInvoice foreground preview-matched V8 audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ foreground preview-matched one-page invoice V8 audit passed');
