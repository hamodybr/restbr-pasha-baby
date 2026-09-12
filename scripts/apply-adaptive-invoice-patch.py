from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('patched', label)


orders = Path('js/admin-orders-customers.js')
text = orders.read_text(encoding='utf-8')

old = "    const pageSize = ['A4','A5','Letter'].includes(cfg.page_size) ? `${cfg.page_size} ${cfg.page_orientation}` : 'auto';\n    const pageWidth = cfg.page_size === 'A5' ? 136 : cfg.page_size === 'Letter' ? 203 : 198;\n"
new = "    const pageSize = ['A4','A5','Letter'].includes(cfg.page_size) ? `${cfg.page_size} ${cfg.page_orientation}` : 'auto';\n    const physicalPage = ({\n      A4: { width: 210, height: 297 },\n      A5: { width: 148, height: 210 },\n      Letter: { width: 215.9, height: 279.4 }\n    })[cfg.page_size] || {\n      width: 210,\n      height: Math.max(120, Number(cfg.paper_min_height_mm) || 297)\n    };\n    const orientedPage = cfg.page_orientation === 'landscape'\n      ? { width: physicalPage.height, height: physicalPage.width }\n      : physicalPage;\n    const pageWidth = Math.max(60, orientedPage.width - (Number(cfg.page_margin_mm) || 0) * 2);\n    const pageHeight = Math.max(80, orientedPage.height - (Number(cfg.page_margin_mm) || 0) * 2);\n"
if text.count(old) != 1:
    raise SystemExit(f'orders page geometry: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)

old = '.label{position:relative;width:100%;max-width:${pageWidth}mm;min-height:${Math.min(Number(cfg.paper_min_height_mm)||285,273)}mm;margin:0 auto;padding:${cfg.outer_padding_mm}mm;background:#fff;color:#000;border:${cfg.frame_width_pt}pt double #000;border-radius:${cfg.frame_radius_mm}mm}'
new = '.label{position:relative;width:100%;max-width:${pageWidth}mm;min-height:${pageHeight}mm;margin:0 auto;padding:${cfg.outer_padding_mm}mm;background:#fff;color:#000;border:${cfg.frame_width_pt}pt double #000;border-radius:${cfg.frame_radius_mm}mm;display:flex;flex-direction:column}'
if text.count(old) != 1:
    raise SystemExit(f'orders label css: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)

old = '.details-title{text-align:center;margin:0 0 1mm;font-size:${cfg.details_size_pt}pt;font-weight:${cfg.font_weight}}.items{padding:0 1mm}'
new = '.details-title{text-align:center;margin:0 0 1mm;font-size:${cfg.details_size_pt}pt;font-weight:${cfg.font_weight}}.items{padding:0 1mm;flex:1 1 auto;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}'
if text.count(old) != 1:
    raise SystemExit(f'orders items css: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)

old = '.label{width:100%!important;max-width:none!important;min-height:${cfg.paper_min_height_mm}mm!important;margin:0!important;overflow:visible!important}'
new = '.label{width:100%!important;max-width:none!important;min-height:${pageHeight}mm!important;margin:0!important;overflow:visible!important;display:flex!important;flex-direction:column!important}.items{flex:1 1 auto!important;display:flex!important;flex-direction:column!important;justify-content:space-evenly!important}'
if text.count(old) != 1:
    raise SystemExit(f'orders print css: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)
orders.write_text(text, encoding='utf-8')

settings = Path('js/admin-invoice-settings.js')
text = settings.read_text(encoding='utf-8')

old = '.pb-invoice-paper{width:100%;min-height:590px;padding:18px;background:#fff;color:#000;border-style:double;transform-origin:top center;box-shadow:0 8px 28px rgba(0,0,0,.25);font-family:Tahoma,Arial,sans-serif}'
new = '.pb-invoice-paper{width:100%;min-height:590px;padding:18px;background:#fff;color:#000;border-style:double;transform-origin:top center;box-shadow:0 8px 28px rgba(0,0,0,.25);font-family:Tahoma,Arial,sans-serif;display:flex;flex-direction:column}'
if text.count(old) != 1:
    raise SystemExit(f'preview paper css: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)

old = '.pb-prev-details{text-align:center;font-weight:900}.pb-prev-item{display:flex;gap:5px;align-items:baseline}'
new = '.pb-prev-details{text-align:center;font-weight:900}.pb-prev-item{display:flex;gap:5px;align-items:baseline;flex:1 1 0;min-height:0;align-items:center}'
if text.count(old) != 1:
    raise SystemExit(f'preview item flex css: expected 1 match, found {text.count(old)}')
text = text.replace(old, new, 1)
settings.write_text(text, encoding='utf-8')

replace_once(
    'js/pasha-arabic-only.js',
    "loadScript('pashaInvoiceSettingsScript', 'js/admin-invoice-settings.js?v=1.0', true);",
    "loadScript('pashaInvoiceSettingsScript', 'js/admin-invoice-settings.js?v=1.1', true);",
    'invoice settings cache version'
)
replace_once(
    'js/pasha-arabic-only.js',
    "loadScript('pashaOrdersCustomersScript', 'js/admin-orders-customers.js?v=1.7', true);",
    "loadScript('pashaOrdersCustomersScript', 'js/admin-orders-customers.js?v=1.8', true);",
    'orders cache version'
)
replace_once(
    'js/supabase-config.js',
    "script.src = 'js/pasha-arabic-only.js?v=1.3';",
    "script.src = 'js/pasha-arabic-only.js?v=1.4';",
    'arabic loader cache version'
)
replace_once(
    'admin.html',
    '<script src="js/supabase-config.js?v=2.2"></script>',
    '<script src="js/supabase-config.js?v=2.3"></script>',
    'admin config cache version'
)
