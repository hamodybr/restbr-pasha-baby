import fs from 'node:fs';

const file = fs.readFileSync('js/admin-invoice-print-polish.js', 'utf8');
const loader = fs.readFileSync('js/admin-orders-nav-hotfix.js', 'utf8');
const failures = [];
const need = (text, marker, label) => { if (!text.includes(marker)) failures.push(`missing ${label}`); };
const forbid = (text, pattern, label) => { if (pattern.test(text)) failures.push(`forbidden ${label}`); };

need(loader, "js/admin-invoice-print-polish.js?v=1.0", 'polish loader');
need(file, 'color:#48545e!important', 'clear settings labels');
need(file, "doc.output('blob')", 'PDF blob print source');
need(file, 'frame.contentWindow.print()', 'native PDF print attempt');
need(file, 'بدون ترويسة أو رابط الموقع', 'header/footer-free print path');
need(file, "document.addEventListener('click', handleDirectPrint, true)", 'capture direct print interception');
forbid(file, /location\.href|document\.URL|admin\.html.*print/i, 'HTML URL print source');

if (failures.length) {
  console.error('Invoice print polish audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}
console.log('✓ Invoice print polish audit passed');
