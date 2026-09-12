import fs from 'node:fs';

const editor = fs.readFileSync('js/admin-invoice-live-editor.js', 'utf8');
const loader = fs.readFileSync('js/admin-orders-nav-hotfix.js', 'utf8');
const ui = fs.readFileSync('js/admin-invoice-live-settings-ui.js', 'utf8');
const polish = fs.readFileSync('js/admin-invoice-print-polish.js', 'utf8');
const direct = fs.readFileSync('js/admin-invoice-direct-editor-v1.js', 'utf8');
const failures = [];
const need = (text, marker, label) => { if (!text.includes(marker)) failures.push(`missing ${label}`); };
const forbid = (text, pattern, label) => { if (pattern.test(text)) failures.push(`forbidden ${label}`); };

need(loader, "js/admin-invoice-live-editor.js?v=1.0", 'editor preload');
need(loader, "js/admin-invoice-live-settings-ui.js?v=1.0", 'settings-style UI preload');
need(loader, "js/admin-invoice-print-polish.js?v=1.0", 'print polish preload');
need(loader, "js/admin-invoice-direct-editor-v1.js?v=1.0", 'direct-touch editor preload');
forbid(loader, /admin-invoice-live-editor-mobile-(?:fix|runtime-fix)\.js/, 'legacy mobile preview guards');
need(editor, "closest('[data-print-order]')", 'print interception');
need(editor, 'طباعة مباشرة', 'direct print button');
need(editor, 'window.print()', 'native print dialog fallback');
need(editor, 'فتح PDF', 'PDF secondary action');
need(editor, 'حفظ هذه الإعدادات كافتراضية', 'save defaults action');
need(editor, "from('restaurant_settings').update({ui_design_settings:next})", 'settings persistence');
need(editor, "from('orders')", 'current order fetch');
need(editor, 'new FontFace', 'uploaded font rendering');
need(editor, "toDataURL('image/png')", 'raster print preservation');
need(editor, 'fitScale', 'fit scale reporting');

need(ui, 'المعاينة المباشرة', 'preview title');
need(ui, 'نفس إعدادات الفاتورة الموجودة في صفحة الإعدادات', 'settings parity copy');
need(ui, "['الورقة والخط'", 'paper/font settings group');
need(ui, "['الصفحة والإطار'", 'page/frame settings group');
need(ui, "['الرأس والشعار'", 'header/logo settings group');
need(ui, "['الأصناف والفواصل'", 'items settings group');
need(ui, 'إظهار وإخفاء العناصر', 'visibility settings group');
need(ui, 'قالب مضغوط لأصناف كثيرة', 'same compact preset label');
need(ui, 'إرجاع التصميم الافتراضي', 'same reset label');

need(polish, "color:#48545e!important", 'high-contrast settings labels');
need(polish, "closest('[data-pb-live-print]')", 'direct print capture');
need(polish, "doc.output('blob')", 'PDF blob print source');
need(polish, 'frame.contentWindow.print()', 'PDF-frame native print');
need(polish, 'بدون ترويسة أو رابط الموقع', 'header/footer-free print status');
forbid(polish, /<img[^>]+onload=.*window\.print/i, 'HTML image direct print that triggers Safari headers');

need(direct, "modal.dataset.pbDirectEditor='1'", 'direct editor modal activation');
need(direct, 'اضغط على أي جزء من الفاتورة لتعديله', 'direct-edit onboarding hint');
need(direct, "multi.textContent='تحديد متعدد'", 'multi-select mode');
need(direct, 'selected = new Set()', 'selection state');
need(direct, 'pb-direct-zone', 'semantic invoice hit zones');
need(direct, "label:'الشعار'", 'logo element');
need(direct, "label:'بيانات الزبون'", 'customer element');
need(direct, "label:'أسماء الأصناف'", 'item-name element');
need(direct, "label:'أسعار الأصناف'", 'price element');
need(direct, 'adjustSelected(-1)', 'decrease selected elements');
need(direct, 'adjustSelected(1)', 'increase selected elements');
need(direct, 'toggleSelectedVisibility', 'element visibility control');
need(direct, "proxyClick(modal,'[data-pb-live-print]')", 'existing safe print path reuse');
need(direct, "proxyClick(modal,'[data-pb-live-pdf]')", 'existing PDF path reuse');
need(direct, "proxyClick(modal,'[data-pb-live-save]')", 'existing defaults save reuse');
need(direct, 'pb-direct-advanced-open', 'advanced settings fallback');
forbid(direct, /supabaseClient|\.from\s*\(['"]/i, 'database access in direct editor');

forbid(editor, /html2canvas/i, 'html2canvas');
forbid(editor, /foreignObject/i, 'SVG foreignObject');
forbid(editor, /cdn\.jsdelivr|cdnjs|unpkg/i, 'runtime CDN');
forbid(polish, /cdn\.jsdelivr|cdnjs|unpkg/i, 'print runtime CDN');
forbid(direct, /cdn\.jsdelivr|cdnjs|unpkg/i, 'direct editor runtime CDN');

if (failures.length) {
  console.error('Invoice live editor audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}
console.log('✓ Invoice live editor audit passed');
