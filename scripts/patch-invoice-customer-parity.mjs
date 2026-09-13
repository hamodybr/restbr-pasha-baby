import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text, 'utf8');
const replaceExact = (text, from, to, label) => {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  return text.replace(from, to);
};

const engineFile = 'js/admin-invoice-pdf-onepage-v8.js';
let engine = read(engineFile);
engine = replaceExact(
  engine,
  "    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();\n    y += 7;\n\n    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);",
  "    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();\n    // Move customer content up slightly; lower divider stays stable below.\n    y += 4;\n\n    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);",
  'customer top spacing'
);
engine = replaceExact(
  engine,
  "      for (const line of lines) { y += num(cfg.address_size_pt, 9.5) * 1.25; ctx.fillText(line, right, y); }\n      y += 2;\n    }\n    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();",
  "      for (const line of lines) { y += num(cfg.address_size_pt, 9.5) * 1.25; ctx.fillText(line, right, y); }\n      // Bold Arabic glyphs need more clearance from the divider.\n      y += Math.max(5, num(cfg.address_size_pt, 9.5) * .45);\n    } else {\n      y += 3;\n    }\n    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();",
  'customer bottom clearance'
);
engine = replaceExact(
  engine,
  "    for (const item of items) {\n      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`;\n      rows.push(measureRow(ctx, cfg, font, product, cfg.show_options ? optionText(options, item) : '', productMax));\n    }\n    if (Number(fee || 0) > 0) rows.push(measureRow(ctx, cfg, font, `${cfg.show_quantity ? '1× ' : ''}أجور التوصيل`, '', productMax));",
  "    for (const item of items) {\n      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`;\n      rows.push(measureRow(ctx, cfg, font, product, cfg.show_options ? optionText(options, item) : '', productMax));\n    }\n    if (cfg.show_subtotal) rows.push(measureRow(ctx, cfg, font, 'مجموع الأصناف', '', productMax));\n    if (Number(fee || 0) > 0) rows.push(measureRow(ctx, cfg, font, `${cfg.show_quantity ? '1× ' : ''}أجور التوصيل`, '', productMax));",
  'subtotal natural measurement'
);
engine = replaceExact(
  engine,
  "    const renderRows = items.map(item => ({\n      product: `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`,\n      option: cfg.show_options ? digits(options, optionText(options, item)) : '',\n      price: digits(options, money(options, item.line_total))\n    }));\n    if (Number(fee || 0) > 0) renderRows.push({",
  "    const renderRows = items.map(item => ({\n      product: `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`,\n      option: cfg.show_options ? digits(options, optionText(options, item)) : '',\n      price: digits(options, money(options, item.line_total))\n    }));\n    if (cfg.show_subtotal) renderRows.push({\n      product: 'مجموع الأصناف', option: '', price: digits(options, money(options, order.subtotal))\n    });\n    if (Number(fee || 0) > 0) renderRows.push({",
  'subtotal render row'
);
write(engineFile, engine);

const settingsFile = 'js/admin-invoice-settings.js';
let settings = read(settingsFile);
settings = replaceExact(settings, "    ['الخط العام', ['base_size_pt','line_height']],", "    ['الخط العام', ['line_height']],", 'hide ineffective base size control');
settings = replaceExact(settings, '<option>A4</option><option>A5</option><option>Letter</option><option value="auto">تلقائي</option>', '<option>A4</option><option>A5</option><option>Letter</option>', 'remove ambiguous auto page size option');
settings = replaceExact(settings, "    result.page_size = ['A4','A5','Letter','auto'].includes(source.page_size) ? source.page_size : DEFAULTS.page_size;", "    result.page_size = ['A4','A5','Letter'].includes(source.page_size) ? source.page_size : DEFAULTS.page_size;", 'normalize legacy auto page size to A4');
const oldPreviewRows = "      ${[['1× بدلة أطفال','اللون: بيج','35,000'],['2× رضاعة سوانكس','الحجم: صغير','18,000'],['1× حقيبة حليب','','5,000'],['1× أجور التوصيل','','5,000']].map(([name,opt,price])=>`<div class=\"pb-prev-item\" style=\"min-height:${s.row_min_height_mm*2}px;padding:${s.row_padding_mm*1.5}px 0;font-size:${s.item_size_pt}px\"><span>${s.show_quantity?name:name.replace(/^\\d+×\\s*/,'')}${s.show_options&&opt?` <small style=\"font-size:${s.option_size_pt}px\">— ${opt}</small>`:''}</span><i class=\"pb-prev-leader\" style=\"border-bottom-width:${s.leader_width_pt}px;border-bottom-style:${s.leader_style}\"></i><strong style=\"font-size:${s.price_size_pt}px\">${price}</strong></div>`).join('')}";
const newPreviewRows = "      ${[['1× بدلة أطفال','اللون: بيج','35,000'],['2× رضاعة سوانكس','الحجم: صغير','18,000'],['1× حقيبة حليب','','5,000'],...(s.show_subtotal?[['مجموع الأصناف','','58,000']]:[]),['1× أجور التوصيل','','5,000']].map(([name,opt,price])=>`<div class=\"pb-prev-item\" style=\"min-height:${s.row_min_height_mm*2}px;padding:${s.row_padding_mm*1.5}px 0;font-size:${s.item_size_pt}px\"><span>${s.show_quantity?name:name.replace(/^\\d+×\\s*/,'')}${s.show_options&&opt?` <small style=\"font-size:${s.option_size_pt}px\">— ${opt}</small>`:''}</span><i class=\"pb-prev-leader\" style=\"border-bottom-width:${s.leader_width_pt}px;border-bottom-style:${s.leader_style}\"></i><strong style=\"font-size:${s.price_size_pt}px\">${price}</strong></div>`).join('')}";
settings = replaceExact(settings, oldPreviewRows, newPreviewRows, 'subtotal preview row');
write(settingsFile, settings);

const routerFile = 'js/admin-invoice-print-ready-v9.js';
let router = read(routerFile);
router = replaceExact(router, "js/admin-invoice-pdf-onepage-v8.js?v=8.0", "js/admin-invoice-pdf-onepage-v8.js?v=8.1", 'V8 engine cache bust');
write(routerFile, router);

const runtimeFile = 'js/runtime-config.js';
let runtime = read(runtimeFile);
runtime = replaceExact(runtime, "js/admin-invoice-print-ready-v9.js?v=9.0", "js/admin-invoice-print-ready-v9.js?v=9.1", 'V9 router cache bust');
write(runtimeFile, runtime);

// Settings loader already exists in Pasha Arabic-only bootstrap. Bump it to 1.2.
const candidates = ['admin.html', ...fs.readdirSync('js').filter(name => name.endsWith('.js')).map(name => path.join('js', name))];
let settingsLoaderFound = 0;
let settingsLoaderChanges = 0;
for (const file of candidates) {
  let text = read(file);
  if (!text.includes('admin-invoice-settings.js')) continue;
  settingsLoaderFound += 1;
  const next = text.replace(/admin-invoice-settings\.js(?:\?v=[0-9.]+)?/g, 'admin-invoice-settings.js?v=1.2');
  if (next !== text) { write(file, next); settingsLoaderChanges += 1; }
}
if (settingsLoaderFound < 1) throw new Error('Could not locate admin-invoice-settings.js loader');

for (const testFile of ['scripts/live-smoke-test.mjs','scripts/orders-labels-check.mjs']) {
  let text = read(testFile);
  text = text.replaceAll('js/admin-invoice-settings.js?v=1.1', 'js/admin-invoice-settings.js?v=1.2');
  write(testFile, text);
}

const auditFile = 'scripts/invoice-pdf-onepage-check.mjs';
let audit = read(auditFile);
audit = audit.replaceAll("js/admin-invoice-print-ready-v9.js?v=9.0", "js/admin-invoice-print-ready-v9.js?v=9.1");
audit = audit.replaceAll("js/admin-invoice-pdf-onepage-v8.js?v=8.0", "js/admin-invoice-pdf-onepage-v8.js?v=8.1");
audit = replaceExact(
  audit,
  "need(engine, \"ctx.fillText('المجموع الكلي'\", 'preview total layout');",
  "need(engine, \"ctx.fillText('المجموع الكلي'\", 'preview total layout');\nneed(engine, 'cfg.show_subtotal', 'subtotal setting reaches final PDF');\nneed(engine, \"product: 'مجموع الأصناف'\", 'subtotal row exists in final PDF');\nneed(engine, 'Math.max(5, num(cfg.address_size_pt, 9.5) * .45)', 'safe customer/address divider clearance');\nneed('js/admin-invoice-settings.js', \"['الخط العام', ['line_height']]\", 'only effective global line-height control is exposed');\nneed('js/pasha-arabic-only.js', 'js/admin-invoice-settings.js?v=1.2', 'invoice settings cache-busted loader');\nforbid('js/admin-invoice-settings.js', '<option value=\"auto\">تلقائي</option>', 'ambiguous auto page-size control');",
  'invoice parity audit markers'
);
write(auditFile, audit);

console.log(`Invoice customer spacing + settings parity patch applied. Settings loaders found: ${settingsLoaderFound}; changed: ${settingsLoaderChanges}`);
