import fs from 'node:fs';

const renderer = fs.readFileSync('js/admin-invoice-pdf-v4.js', 'utf8');
const loader = fs.readFileSync('js/admin-orders-nav-hotfix.js', 'utf8');
const schedulerFix = fs.readFileSync('js/admin-invoice-iphone-scheduler-fix.js', 'utf8');
const liveEditor = fs.readFileSync('js/admin-invoice-live-editor.js', 'utf8');
const failures = [];

const need = (text, marker, label) => {
  if (!text.includes(marker)) failures.push(`missing ${label || marker}`);
};
const forbid = (text, pattern, label) => {
  if (pattern.test(text)) failures.push(`forbidden ${label}`);
};

need(renderer, "RENDER_MODE = 'native-canvas-v4'", 'native-canvas-v4 render mode');
need(renderer, 'new FontFace(', 'browser FontFace loading');
need(renderer, "getContext('2d'", '2D canvas rendering');
need(renderer, '.fillText(', 'native browser text shaping');
need(renderer, "toDataURL('image/png')", 'PNG page output');
need(renderer, "doc.addImage(png, 'PNG'", 'PDF image packaging');
need(renderer, '18000', 'hard PDF completion timeout');
need(renderer, 'document.fonts.check', 'font application verification');
need(loader, "js/admin-invoice-pdf-v4.js?v=4.0", 'v4 preload');
need(loader, "js/admin-invoice-iphone-scheduler-fix.js?v=1.0", 'iPhone scheduler guard preload');
need(loader, "js/admin-invoice-live-editor.js?v=1.0", 'live invoice editor preload');
need(schedulerFix, 'window.requestAnimationFrame = microtaskRaf', 'RAF replacement while PDF is generated');
need(schedulerFix, 'queueMicrotask', 'foreground-independent scheduler checkpoint');
need(schedulerFix, 'window.requestAnimationFrame = nativeRaf', 'RAF restoration after PDF creation');
need(schedulerFix, '__iphoneSchedulerFixed', 'single-install guard');

need(liveEditor, "closest('[data-print-order]')", 'print button capture');
need(liveEditor, 'data-pb-live-field', 'live invoice controls');
need(liveEditor, 'fit_one_page:true', 'one-page fit default');
need(liveEditor, 'ملاءمة تلقائية A4', 'automatic A4 fit action');
need(liveEditor, 'طباعة مباشرة', 'direct print action');
need(liveEditor, 'فتح PDF', 'secondary PDF action');
need(liveEditor, "window.print()", 'system print dialog path');
need(liveEditor, "toDataURL('image/png')", 'rasterized print image');
need(liveEditor, "from('restaurant_settings').update({ui_design_settings:next})", 'save invoice defaults only');
need(liveEditor, "from('orders')", 'current order fetch');
need(liveEditor, "new FontFace", 'custom font shaping in live preview');

forbid(renderer, /html2canvas/i, 'html2canvas dependency');
forbid(renderer, /foreignObject/i, 'SVG foreignObject rendering');
forbid(renderer, /XMLSerializer/i, 'XML serialization');
forbid(renderer, /cdn\.jsdelivr|cdnjs|unpkg/i, 'runtime CDN dependency');
forbid(liveEditor, /html2canvas/i, 'html2canvas in live editor');
forbid(liveEditor, /foreignObject/i, 'SVG foreignObject in live editor');
forbid(liveEditor, /cdn\.jsdelivr|cdnjs|unpkg/i, 'runtime CDN in live editor');

if (failures.length) {
  console.error('Native canvas invoice PDF audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Native canvas invoice PDF audit passed, including iPhone scheduler guard and live one-page print editor');
