import fs from 'node:fs';

const renderer = fs.readFileSync('js/admin-invoice-pdf-v4.js', 'utf8');
const loader = fs.readFileSync('js/admin-orders-nav-hotfix.js', 'utf8');
const schedulerFix = fs.readFileSync('js/admin-invoice-iphone-scheduler-fix.js', 'utf8');
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
need(schedulerFix, 'window.requestAnimationFrame = microtaskRaf', 'RAF replacement while PDF is generated');
need(schedulerFix, 'queueMicrotask', 'foreground-independent scheduler checkpoint');
need(schedulerFix, 'window.requestAnimationFrame = nativeRaf', 'RAF restoration after PDF creation');
need(schedulerFix, '__iphoneSchedulerFixed', 'single-install guard');

forbid(renderer, /html2canvas/i, 'html2canvas dependency');
forbid(renderer, /foreignObject/i, 'SVG foreignObject rendering');
forbid(renderer, /XMLSerializer/i, 'XML serialization');
forbid(renderer, /cdn\.jsdelivr|cdnjs|unpkg/i, 'runtime CDN dependency');

if (failures.length) {
  console.error('Native canvas invoice PDF audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Native canvas invoice PDF audit passed, including iPhone background-window scheduler guard');
