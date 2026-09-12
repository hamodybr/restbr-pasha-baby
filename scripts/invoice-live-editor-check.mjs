import fs from 'node:fs';

const editor = fs.readFileSync('js/admin-invoice-live-editor.js', 'utf8');
const loader = fs.readFileSync('js/admin-orders-nav-hotfix.js', 'utf8');
const failures = [];
const need = (text, marker, label) => { if (!text.includes(marker)) failures.push(`missing ${label}`); };
const forbid = (text, pattern, label) => { if (pattern.test(text)) failures.push(`forbidden ${label}`); };

need(loader, "js/admin-invoice-live-editor.js?v=1.0", 'editor preload');
need(editor, "closest('[data-print-order]')", 'print interception');
need(editor, 'تعديل وطباعة الفاتورة', 'editor title');
need(editor, 'كل تعديل ينعكس مباشرة', 'live-edit UX');
need(editor, 'ملاءمة في صفحة واحدة', 'one-page toggle');
need(editor, 'ملاءمة تلقائية A4', 'auto fit action');
need(editor, 'طباعة مباشرة', 'direct print button');
need(editor, 'window.print()', 'native print dialog');
need(editor, 'فتح PDF', 'PDF secondary action');
need(editor, 'حفظ هذه الإعدادات كافتراضية', 'save defaults action');
need(editor, "from('restaurant_settings').update({ui_design_settings:next})", 'settings persistence');
need(editor, "from('orders')", 'current order fetch');
need(editor, 'new FontFace', 'uploaded font rendering');
need(editor, "toDataURL('image/png')", 'raster print preservation');
need(editor, 'fitScale', 'fit scale reporting');

forbid(editor, /html2canvas/i, 'html2canvas');
forbid(editor, /foreignObject/i, 'SVG foreignObject');
forbid(editor, /cdn\.jsdelivr|cdnjs|unpkg/i, 'runtime CDN');

if (failures.length) {
  console.error('Invoice live editor audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}
console.log('✓ Invoice live editor audit passed');
