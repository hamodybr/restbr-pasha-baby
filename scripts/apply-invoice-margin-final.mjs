import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');
const replace = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`Missing ${label}`);
  return text.replace(from, to);
};

// 1) Final PDF engine: bake page margin into the raster itself so every PDF viewer,
// iOS share/print path, and extracted preview sees exactly the same margin.
const engineFile = 'js/admin-invoice-pdf-onepage-v8.js';
let engine = read(engineFile);

const oldCustomer = `    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    // Move customer content up slightly; lower divider stays stable below.
    y += 4;

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);
    const customerY = y + num(cfg.customer_size_pt, 10.5);
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText(digits(options, order.customer_name || 'زبون'), right, customerY);
    const leftParts = [];
    if (cfg.show_customer_phone && order.customer_phone) leftParts.push(digits(options, order.customer_phone));
    if (cfg.show_order_type) leftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (leftParts.length) {
      ctx.textAlign = 'left'; ctx.direction = 'rtl';
      ctx.fillText(leftParts.join(' · '), left, customerY);
    }
    y = customerY + 5;
    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      const text = \`العنوان: \${digits(options, order.address)}\`;
      const lines = wrapText(ctx, text, inner);
      for (const line of lines) { y += num(cfg.address_size_pt, 9.5) * 1.25; ctx.fillText(line, right, y); }
      // Bold Arabic glyphs need more clearance from the divider.
      y += Math.max(5, num(cfg.address_size_pt, 9.5) * .45);
    } else {
      y += 3;
    }
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 7;`;

const newCustomer = `    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    // Keep customer block visually high and reserve an explicit safe gap before
    // the lower divider. This avoids Arabic descenders touching the rule.
    const customerSize = num(cfg.customer_size_pt, 10.5);
    const addressSize = num(cfg.address_size_pt, 9.5);
    y += 2;

    setFont(ctx, customerSize, font);
    const customerY = y + customerSize * .92;
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText(digits(options, order.customer_name || 'زبون'), right, customerY);
    const leftParts = [];
    if (cfg.show_customer_phone && order.customer_phone) leftParts.push(digits(options, order.customer_phone));
    if (cfg.show_order_type) leftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (leftParts.length) {
      ctx.textAlign = 'left'; ctx.direction = 'rtl';
      ctx.fillText(leftParts.join(' · '), left, customerY);
    }
    y = customerY + 2;
    if (cfg.show_customer_address && order.address) {
      setFont(ctx, addressSize, font);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      const text = \`العنوان: \${digits(options, order.address)}\`;
      const lines = wrapText(ctx, text, inner);
      for (const line of lines) {
        y += addressSize * 1.18;
        ctx.fillText(line, right, y);
      }
      // Guaranteed visible breathing room below the last address baseline.
      y += Math.max(9, addressSize * .9);
    } else {
      y += 6;
    }
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 7;`;
engine = replace(engine, oldCustomer, newCustomer, 'customer/address block');

const encodeAnchor = `  async function encodeJpeg(canvas) {`;
const composeFn = `  function composeFullPageCanvas(contentCanvas, cfg) {
    const metrics = pageMetrics(cfg);
    const pxPerMm = LAYOUT_MM * 2;
    const pageWidthPx = Math.max(1, Math.round(metrics.width * pxPerMm));
    const pageHeightPx = Math.max(1, Math.round(metrics.height * pxPerMm));
    const marginPx = Math.max(0, Math.round(metrics.margin * pxPerMm));
    const innerWidth = Math.max(1, pageWidthPx - marginPx * 2);
    const innerHeight = Math.max(1, pageHeightPx - marginPx * 2);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = pageWidthPx;
    pageCanvas.height = pageHeightPx;
    const pageCtx = pageCanvas.getContext('2d', { alpha: false });
    if (!pageCtx) throw new Error('تعذر تجهيز صفحة الفاتورة مع هامش الطباعة.');
    pageCtx.fillStyle = '#fff';
    pageCtx.fillRect(0, 0, pageWidthPx, pageHeightPx);
    pageCtx.drawImage(contentCanvas, marginPx, marginPx, innerWidth, innerHeight);
    return pageCanvas;
  }

`;
if (!engine.includes('function composeFullPageCanvas(')) {
  engine = replace(engine, encodeAnchor, composeFn + encodeAnchor, 'encode anchor');
}

engine = replace(
  engine,
  `    const rendered = renderCanvas(options, font, logo);\n    const jpeg = await encodeJpeg(rendered.canvas);`,
  `    const rendered = renderCanvas(options, font, logo);\n    const fullPageCanvas = composeFullPageCanvas(rendered.canvas, cfg);\n    const jpeg = await encodeJpeg(fullPageCanvas);`,
  'full-page raster composition'
);
engine = replace(
  engine,
  `    doc.addImage(jpeg, 'JPEG', metrics.margin, metrics.margin, metrics.contentWidth, metrics.contentHeight);`,
  `    doc.addImage(jpeg, 'JPEG', 0, 0, metrics.width, metrics.height);`,
  'full-page PDF embedding'
);
write(engineFile, engine);

// 2) Print-ready screen: the JPEG extracted from the PDF now already includes
// the real page margin. Remove the simulated wrapper so there is no double margin.
const routerFile = 'js/admin-invoice-print-ready-v9.js';
let router = read(routerFile);
router = router.replace("const PDF_ENGINE_SRC = 'js/admin-invoice-pdf-onepage-v8.js?v=8.1';", "const PDF_ENGINE_SRC = 'js/admin-invoice-pdf-onepage-v8.js?v=8.2';");
router = router.replace(/\n  function previewPageMarginPercent\(cfg\) \{[\s\S]*?\n  \}\n\n  async function showPrintReady/, '\n  async function showPrintReady');
router = router.replace(`      .pb-ipr-page{display:block;width:min(100%,820px);box-sizing:border-box;padding:var(--pb-page-margin);background:#fff;box-shadow:0 12px 45px #000}\n      .pb-ipr-paper{display:block;width:100%;height:auto;background:#fff;border:0}`, `      .pb-ipr-paper{display:block;width:min(100%,820px);height:auto;background:#fff;box-shadow:0 12px 45px #000;border:0}`);
router = router.replace(`        #pbInvoicePrintReady .pb-ipr-page{display:block!important;width:100%!important;max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important}\n`, '');
router = router.replace(`    const orderNumber = englishDigits(order?.order_number || '');\n    const previewMarginPct = previewPageMarginPercent(cfg);`, `    const orderNumber = englishDigits(order?.order_number || '');`);
router = router.replace(`<main class="pb-ipr-stage"><div class="pb-ipr-page" style="--pb-page-margin:\${previewMarginPct.toFixed(4)}%"><img class="pb-ipr-paper" data-pb-print-image alt="فاتورة Pasha Baby"></div></main>`, `<main class="pb-ipr-stage"><img class="pb-ipr-paper" data-pb-print-image alt="فاتورة Pasha Baby"></main>`);
write(routerFile, router);

// 3) Cache-bust only the changed V9 route. Keep Auto page size and user's subtotal choice untouched.
const runtimeFile = 'js/runtime-config.js';
let runtime = read(runtimeFile);
runtime = runtime.replace("js/admin-invoice-print-ready-v9.js?v=9.1", "js/admin-invoice-print-ready-v9.js?v=9.2");
write(runtimeFile, runtime);

// 4) Keep static checks aligned with the new deterministic margin implementation.
const auditFile = 'scripts/invoice-pdf-onepage-check.mjs';
let audit = read(auditFile);
audit = audit.replace("need('js/runtime-config.js', 'js/admin-invoice-print-ready-v9.js?v=9.1', 'V9 print-ready invoice loader');", "need('js/runtime-config.js', 'js/admin-invoice-print-ready-v9.js?v=9.2', 'V9.2 print-ready invoice loader');");
audit = audit.replace("need(router, \"js/admin-invoice-pdf-onepage-v8.js?v=8.1\", 'proven V8 invoice engine reuse');", "need(router, \"js/admin-invoice-pdf-onepage-v8.js?v=8.2\", 'V8.2 invoice engine reuse');");
audit = audit.replace("need(engine, \"doc.addImage(jpeg, 'JPEG', metrics.margin, metrics.margin, metrics.contentWidth, metrics.contentHeight)\", 'final PDF uses saved page margin');\n", '');
audit = audit.replace("need(router, 'previewPageMarginPercent(cfg)', 'print-ready preview shows real page margin');\n", '');
audit = audit.replace("need(router, 'Number.isFinite(rawMargin) ? rawMargin : 6', 'zero-safe page margin');\n", "need(router, 'Number.isFinite(rawMargin) ? rawMargin : 6', 'zero-safe fallback page margin');\n");
const auditAnchor = "need(engine, 'Math.max(5, num(cfg.address_size_pt, 9.5) * .45)', 'safe customer/address divider clearance');";
if (audit.includes(auditAnchor)) audit = audit.replace(auditAnchor, "need(engine, 'y += Math.max(9, addressSize * .9)', 'safe customer/address divider clearance');");
if (!audit.includes("composeFullPageCanvas")) {
  const insertAfter = "need(engine, 'canvas.toBlob', 'async JPEG raster encoding');";
  audit = replace(audit, insertAfter, `${insertAfter}\nneed(engine, 'composeFullPageCanvas', 'page margin baked into final raster');\nneed(engine, \"doc.addImage(jpeg, 'JPEG', 0, 0, metrics.width, metrics.height)\", 'full-page raster embedded without secondary margin');`, 'audit canvas anchor');
}
write(auditFile, audit);

// Sync old version assertions used by other audits/smokes.
for (const file of ['scripts/live-smoke-test.mjs','scripts/orders-labels-check.mjs']) {
  if (!fs.existsSync(file)) continue;
  let text = read(file);
  text = text.replaceAll('admin-invoice-print-ready-v9.js?v=9.1', 'admin-invoice-print-ready-v9.js?v=9.2');
  text = text.replaceAll('admin-invoice-pdf-onepage-v8.js?v=8.1', 'admin-invoice-pdf-onepage-v8.js?v=8.2');
  write(file, text);
}

console.log('Applied deterministic invoice margin + customer clearance fix.');
