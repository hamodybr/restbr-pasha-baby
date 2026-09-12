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

const engine = 'js/admin-invoice-pdf-onepage-v6.js';
const router = 'js/admin-invoice-print-v2.js';
const fastPdf = 'js/admin-invoice-fast-pdf-ios-v1.js';
const vendor = 'js/vendor/jspdf-2.5.2.umd.min.js';

for (const file of [engine, router, fastPdf]) {
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

need('js/runtime-config.js', 'js/admin-invoice-print-v2.js?v=2.1', 'cache-busted invoice router');
need(router, "js/admin-invoice-pdf-onepage-v6.js?v=6.0", 'V6 invoice raster engine route');
need(router, "js/admin-invoice-fast-pdf-ios-v1.js?v=1.0", 'iPhone direct PDF packer route');
need(router, "native-canvas-one-page-v6", 'V6 render-mode assertion');
need(router, "typeof window.PashaFastSinglePagePdf === 'function'", 'iPhone fast PDF availability check');
need(router, "const PdfClass = isIOS() ? window.PashaFastSinglePagePdf : window.jspdf.jsPDF", 'iPhone jsPDF bypass');
need(router, "document.addEventListener('click', capture, true)", 'capture-phase print override');
need(router, 'event.stopImmediatePropagation()', 'legacy HTML print suppression');
need(router, "popup.location.replace(blobUrl)", 'PDF-first popup navigation');
need(router, 'result.pageCount !== 1', 'one-page output assertion');
need(router, 'result.customFontBaked !== true', 'custom-font raster assertion');
need(router, "fetchBuffer(fontUrl)", 'uploaded font byte fetch');
need(router, "cache: 'force-cache'", 'repeat asset cache');
need(router, "pdfPacker: isIOS() ? 'direct-jpeg' : 'jspdf'", 'runtime packer telemetry');
forbid(router, 'window.print(', 'browser HTML print path');

need(engine, "const RENDER_MODE = 'native-canvas-one-page-v6'", 'iPhone optimized raster render mode');
need(engine, 'new FontFace(', 'uploaded font binary loader');
need(engine, 'document.fonts.check(', 'uploaded font verification');
need(engine, 'cachedCustomFontSignature', 'custom-font reuse cache');
need(engine, 'const fitFactor = Math.min(1, mm(metrics.contentHeight) / cssHeight)', 'fit-aware raster scaling');
need(engine, '6_500_000', 'iPhone pixel-budget cap');
need(engine, "const mime = ios ? 'image/jpeg' : 'image/png'", 'fast iPhone raster encoding');
need(engine, 'canvas.toBlob', 'async raster encoding');
need(engine, 'new Uint8Array(buffer)', 'binary image path without base64 expansion');
need(engine, "doc.addImage(image.data, image.format", 'single PDF image insertion point');
need(engine, 'Promise.all([', 'parallel font and logo preparation');
need(engine, '60000', 'mobile-safe completion budget');
need(engine, 'pageCount: 1', 'exact one-page metadata');
need(engine, 'customFontBaked:', 'font-baked metadata');
forbid(engine, 'doc.addPage(', 'multi-page PDF creation');
forbid(engine, 'window.print(', 'HTML print fallback');
forbid(engine, 'document.fonts.ready', 'global font-set wait that can stall Safari');

need(fastPdf, 'class PashaFastSinglePagePdf', 'direct PDF writer class');
need(fastPdf, '/Filter /DCTDecode', 'JPEG embedded without reparsing');
need(fastPdf, 'new Blob(chunks, { type: \'application/pdf\' })', 'direct PDF Blob output');
need(fastPdf, "mode: 'direct-jpeg-one-page-pdf-v1'", 'direct packer identity');
need(fastPdf, "emitStage('pack')", 'post-raster stage marker');
need(fastPdf, "emitStage('pdf')", 'direct PDF stage marker');
forbid(fastPdf, 'jsPDF', 'jsPDF dependency in iPhone packer');
forbid(fastPdf, 'window.print(', 'HTML print fallback in iPhone packer');

if (!exists(vendor)) failures.push(`${vendor}: missing`);
else if (fs.statSync(vendor).size < 300_000) failures.push(`${vendor}: unexpected/truncated jsPDF vendor file`);

if (failures.length) {
  console.error('\nInvoice deterministic one-page V6 direct-iPhone audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ One-page invoice V6 raster + direct iPhone PDF packer + uploaded-font audit passed');
