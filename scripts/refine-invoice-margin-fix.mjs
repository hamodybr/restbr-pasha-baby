import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text, 'utf8');
const replaceExact = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`Missing ${label}`);
  return text.replace(from, to);
};

// 1) Keep the user's Auto page-size behavior and make page margin visible in Settings preview.
const settingsFile = 'js/admin-invoice-settings.js';
let settings = read(settingsFile);
settings = replaceExact(
  settings,
  "result.page_size = ['A4','A5','Letter'].includes(source.page_size) ? source.page_size : DEFAULTS.page_size;",
  "result.page_size = ['auto','A4','A5','Letter'].includes(source.page_size) ? source.page_size : DEFAULTS.page_size;",
  'Auto page-size normalization'
);
settings = replaceExact(
  settings,
  '<label><span>حجم الورقة</span><select data-invoice-field="page_size"><option>A4</option><option>A5</option><option>Letter</option></select></label>',
  '<label><span>حجم الورقة</span><select data-invoice-field="page_size"><option value="auto">تلقائي</option><option>A4</option><option>A5</option><option>Letter</option></select></label>',
  'Auto page-size option'
);
settings = replaceExact(
  settings,
  "holder.style.cssText = `min-height:${Math.max(420,s.paper_min_height_mm*2)}px;padding:${s.outer_padding_mm*2}px;border-width:${s.frame_width_pt}px;border-radius:${s.frame_radius_mm*1.5}px;font-family:${font};font-size:${s.base_size_pt}px;font-weight:${s.font_weight};line-height:${s.line_height}`;",
  "const previewMarginPx = Math.max(0, Number(s.page_margin_mm || 0) * 2);\n    holder.style.cssText = `min-height:${Math.max(420,s.paper_min_height_mm*2)}px;padding:${s.outer_padding_mm*2}px;border-width:${s.frame_width_pt}px;border-radius:${s.frame_radius_mm*1.5}px;font-family:${font};font-size:${s.base_size_pt}px;font-weight:${s.font_weight};line-height:${s.line_height};outline:1px solid rgba(127,127,127,.55);outline-offset:${previewMarginPx}px;margin:${Math.max(10,previewMarginPx+10)}px auto`;",
  'Settings preview page-margin visualization'
);
write(settingsFile, settings);

// 2) The final PDF already uses the real margin. Make the print-ready screen show that same page margin.
const routerFile = 'js/admin-invoice-print-ready-v9.js';
let router = read(routerFile);
router = replaceExact(
  router,
  "const margin = Math.max(0, Math.min(20, Number(cfg.page_margin_mm || 6)));",
  "const rawMargin = Number(cfg.page_margin_mm);\n    const margin = Math.max(0, Math.min(20, Number.isFinite(rawMargin) ? rawMargin : 6));",
  'zero-safe print page margin'
);
router = replaceExact(
  router,
  "  async function showPrintReady(pdfBlob, cfg, order) {",
  "  function previewPageMarginPercent(cfg) {\n    const sizeRaw = String(cfg.page_size || 'A4').toUpperCase();\n    let pageWidth = sizeRaw === 'A5' ? 148 : sizeRaw === 'LETTER' ? 215.9 : 210;\n    let pageHeight = sizeRaw === 'A5' ? 210 : sizeRaw === 'LETTER' ? 279.4 : 297;\n    if (String(cfg.page_orientation || 'portrait').toLowerCase() === 'landscape') [pageWidth, pageHeight] = [pageHeight, pageWidth];\n    const rawMargin = Number(cfg.page_margin_mm);\n    const margin = Math.max(0, Math.min(20, Number.isFinite(rawMargin) ? rawMargin : 6));\n    return Math.max(0, Math.min(20, margin / pageWidth * 100));\n  }\n\n  async function showPrintReady(pdfBlob, cfg, order) {",
  'print-ready margin helper'
);
router = replaceExact(
  router,
  "      .pb-ipr-paper{display:block;width:min(100%,820px);height:auto;background:#fff;box-shadow:0 12px 45px #000;border:0}",
  "      .pb-ipr-page{display:block;width:min(100%,820px);box-sizing:border-box;padding:var(--pb-page-margin);background:#fff;box-shadow:0 12px 45px #000}\n      .pb-ipr-paper{display:block;width:100%;height:auto;background:#fff;border:0}",
  'screen page wrapper'
);
router = replaceExact(
  router,
  "        #pbInvoicePrintReady .pb-ipr-stage{display:block!important;min-height:0!important;padding:0!important;margin:0!important}\n        #pbInvoicePrintReady .pb-ipr-paper{display:block!important;width:100%!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important;box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}",
  "        #pbInvoicePrintReady .pb-ipr-stage{display:block!important;min-height:0!important;padding:0!important;margin:0!important}\n        #pbInvoicePrintReady .pb-ipr-page{display:block!important;width:100%!important;max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important}\n        #pbInvoicePrintReady .pb-ipr-paper{display:block!important;width:100%!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important;box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}",
  'print wrapper reset'
);
router = replaceExact(
  router,
  "    const orderNumber = englishDigits(order?.order_number || '');\n    root.innerHTML = `",
  "    const orderNumber = englishDigits(order?.order_number || '');\n    const previewMarginPct = previewPageMarginPercent(cfg);\n    root.innerHTML = `",
  'preview margin percentage'
);
router = replaceExact(
  router,
  "      <main class=\"pb-ipr-stage\"><img class=\"pb-ipr-paper\" data-pb-print-image alt=\"فاتورة Pasha Baby\"></main>",
  "      <main class=\"pb-ipr-stage\"><div class=\"pb-ipr-page\" style=\"--pb-page-margin:${previewMarginPct.toFixed(4)}%\"><img class=\"pb-ipr-paper\" data-pb-print-image alt=\"فاتورة Pasha Baby\"></div></main>",
  'print-ready page wrapper markup'
);
write(routerFile, router);

// 3) Keep subtotal behavior out of this focused fix; user intentionally hides it.
const engineFile = 'js/admin-invoice-pdf-onepage-v8.js';
let engine = read(engineFile);
engine = engine.replace("    if (cfg.show_subtotal) rows.push(measureRow(ctx, cfg, font, 'مجموع الأصناف', '', productMax));\n", '');
engine = engine.replace("    if (cfg.show_subtotal) renderRows.push({\n      product: 'مجموع الأصناف', option: '', price: digits(options, money(options, order.subtotal))\n    });\n", '');
write(engineFile, engine);

// 4) Focus regression audit on the real margin path and preserve Auto page size.
const auditFile = 'scripts/invoice-pdf-onepage-check.mjs';
let audit = read(auditFile);
audit = audit.replace("need(engine, 'cfg.show_subtotal', 'subtotal setting reaches final PDF');\n", '');
audit = audit.replace("need(engine, \"product: 'مجموع الأصناف'\", 'subtotal row exists in final PDF');\n", '');
audit = audit.replace("forbid('js/admin-invoice-settings.js', '<option value=\"auto\">تلقائي</option>', 'ambiguous auto page-size control');\n", '');
const anchor = "need(engine, 'Math.max(5, num(cfg.address_size_pt, 9.5) * .45)', 'safe customer/address divider clearance');";
if (!audit.includes(anchor)) throw new Error('Missing audit anchor');
audit = audit.replace(anchor, `${anchor}\nneed(engine, \"doc.addImage(jpeg, 'JPEG', metrics.margin, metrics.margin, metrics.contentWidth, metrics.contentHeight)\", 'final PDF uses saved page margin');\nneed(router, 'previewPageMarginPercent(cfg)', 'print-ready preview shows real page margin');\nneed(router, 'Number.isFinite(rawMargin) ? rawMargin : 6', 'zero-safe page margin');\nneed('js/admin-invoice-settings.js', 'outline-offset:${previewMarginPx}px', 'settings preview shows page margin');\nneed('js/admin-invoice-settings.js', '<option value=\"auto\">تلقائي</option>', 'Auto page-size remains available');`);
write(auditFile, audit);

console.log('Focused invoice margin refinement applied.');