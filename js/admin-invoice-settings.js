(() => {
  if (window.__PASHA_INVOICE_SETTINGS_V1__) return;
  window.__PASHA_INVOICE_SETTINGS_V1__ = true;

  const DEFAULTS = Object.freeze({
    page_size: 'A4', page_orientation: 'portrait', page_margin_mm: 6,
    paper_min_height_mm: 285, outer_padding_mm: 8, frame_width_pt: 3,
    frame_radius_mm: 4, font_family: 'modern_pro', font_weight: 900,
    custom_font_url: '', custom_font_name: '', base_size_pt: 12, line_height: 1.25,
    logo_mode: 'stamp', logo_url: '', logo_size_mm: 27, title_size_pt: 25,
    subtitle_size_pt: 8, header_spacing_mm: 2.5, meta_size_pt: 8,
    customer_size_pt: 10.5, address_size_pt: 9.5, details_size_pt: 17,
    item_size_pt: 12, option_size_pt: 9.5, price_size_pt: 12,
    row_min_height_mm: 7, row_padding_mm: 1, leader_width_pt: 1.5,
    leader_style: 'dotted', notes_size_pt: 9.5, total_size_pt: 16,
    total_border_pt: 2, footer_size_pt: 15, footer_spacing_mm: 2.5,
    brand_title: 'PASHA BABY', brand_subtitle: 'PREMIUM BABY BOUTIQUE',
    details_title: 'تفاصيل الطلب', footer_text: 'شكراً لاختياركم',
    show_logo: true, show_brand_title: true, show_brand_subtitle: true,
    show_order_number: true, show_date_time: true, show_customer_phone: true,
    show_customer_address: true, show_order_type: true, show_details_title: true,
    show_quantity: true, show_options: true, show_notes: true,
    show_subtotal: true, show_footer: true
  });

  const NUMBER_FIELDS = {
    page_margin_mm: [0, 20, .5, 'هامش الطابعة', 'mm'],
    paper_min_height_mm: [120, 400, 1, 'ارتفاع إطار الفاتورة', 'mm'],
    outer_padding_mm: [2, 24, .5, 'المسافة داخل الإطار', 'mm'],
    frame_width_pt: [.5, 8, .5, 'سماكة الإطار', 'pt'],
    frame_radius_mm: [0, 15, .5, 'استدارة الإطار', 'mm'],
    base_size_pt: [8, 20, .5, 'حجم الخط الأساسي', 'pt'],
    line_height: [1, 2, .05, 'تباعد السطور', '×'],
    logo_size_mm: [12, 55, 1, 'حجم الشعار', 'mm'],
    title_size_pt: [12, 42, 1, 'عنوان PASHA BABY', 'pt'],
    subtitle_size_pt: [6, 18, .5, 'النص تحت العنوان', 'pt'],
    header_spacing_mm: [0, 16, .5, 'المسافة أسفل الرأس', 'mm'],
    meta_size_pt: [6, 14, .5, 'التاريخ والوقت ورقم الطلب', 'pt'],
    customer_size_pt: [8, 20, .5, 'اسم وهاتف الزبون', 'pt'],
    address_size_pt: [7, 18, .5, 'عنوان الزبون', 'pt'],
    details_size_pt: [10, 28, 1, 'عنوان تفاصيل الطلب', 'pt'],
    item_size_pt: [8, 20, .5, 'اسم الصنف', 'pt'],
    option_size_pt: [7, 18, .5, 'الخيار واللون', 'pt'],
    price_size_pt: [8, 20, .5, 'سعر الصنف', 'pt'],
    row_min_height_mm: [4, 18, .5, 'ارتفاع صف الصنف', 'mm'],
    row_padding_mm: [0, 8, .25, 'الحشو العمودي للصف', 'mm'],
    leader_width_pt: [.5, 5, .5, 'سماكة الخط المنقط', 'pt'],
    notes_size_pt: [7, 18, .5, 'الملاحظات', 'pt'],
    total_size_pt: [10, 30, 1, 'المجموع الكلي', 'pt'],
    total_border_pt: [.5, 6, .5, 'إطار المجموع', 'pt'],
    footer_size_pt: [8, 26, 1, 'عبارة الشكر', 'pt'],
    footer_spacing_mm: [0, 15, .5, 'المسافة قبل الشكر', 'mm']
  };

  const TEXT_FIELDS = {
    brand_title: ['اسم البراند الرئيسي', 'PASHA BABY'],
    brand_subtitle: ['النص تحت اسم البراند', 'PREMIUM BABY BOUTIQUE'],
    details_title: ['عنوان قائمة الأصناف', 'تفاصيل الطلب'],
    footer_text: ['عبارة أسفل الفاتورة', 'شكراً لاختياركم']
  };

  const TOGGLES = {
    show_logo: 'الشعار', show_brand_title: 'اسم البراند', show_brand_subtitle: 'وصف البراند',
    show_order_number: 'رقم الطلب', show_date_time: 'التاريخ والوقت',
    show_customer_phone: 'هاتف الزبون', show_customer_address: 'عنوان الزبون',
    show_order_type: 'نوع الطلب', show_details_title: 'عنوان تفاصيل الطلب',
    show_quantity: 'الكمية', show_options: 'الخيار واللون', show_notes: 'الملاحظات',
    show_subtotal: 'مجموع الأصناف قبل التوصيل', show_footer: 'عبارة الشكر'
  };

  const GROUPS = [
    ['الصفحة والإطار', ['page_margin_mm','paper_min_height_mm','outer_padding_mm','frame_width_pt','frame_radius_mm']],
    ['الخط العام', ['base_size_pt','line_height']],
    ['الرأس والشعار', ['logo_size_mm','title_size_pt','subtitle_size_pt','header_spacing_mm']],
    ['الطلب والزبون', ['meta_size_pt','customer_size_pt','address_size_pt','details_size_pt']],
    ['الأصناف والفواصل', ['item_size_pt','option_size_pt','price_size_pt','row_min_height_mm','row_padding_mm','leader_width_pt']],
    ['المجموع والأسفل', ['notes_size_pt','total_size_pt','total_border_pt','footer_size_pt','footer_spacing_mm']]
  ];

  const FONT_STACKS = {
    modern_pro: '"Modern Pro Bold","Modern Pro","DIN Next Arabic","Geeza Pro",Tahoma,Arial,sans-serif',
    din: '"DIN Next Arabic","DIN Arabic",Tahoma,Arial,sans-serif',
    segoe: '"Segoe UI Variable Text","Segoe UI",Tahoma,Arial,sans-serif',
    tahoma: 'Tahoma,"Segoe UI",Arial,sans-serif',
    arial: 'Arial,Tahoma,sans-serif',
    kufi: '"Noto Kufi Arabic",Tahoma,Arial,sans-serif',
    custom: '"PashaInvoiceCustom",Tahoma,Arial,sans-serif'
  };

  let customFontObjectUrl = '';
  let logoObjectUrl = '';

  const esc = value => String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const safeHttpsUrl = value => {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  };
  const readObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function normalize(raw = {}) {
    const source = readObject(raw);
    const result = { ...DEFAULTS };
    Object.keys(NUMBER_FIELDS).forEach(key => {
      const [min,max,,] = NUMBER_FIELDS[key];
      result[key] = clamp(source[key], min, max, DEFAULTS[key]);
    });
    Object.keys(TEXT_FIELDS).forEach(key => { result[key] = String(source[key] ?? DEFAULTS[key]).slice(0, 120); });
    Object.keys(TOGGLES).forEach(key => { result[key] = source[key] === undefined ? DEFAULTS[key] : source[key] === true; });
    result.page_size = ['A4','A5','Letter','auto'].includes(source.page_size) ? source.page_size : DEFAULTS.page_size;
    result.page_orientation = ['portrait','landscape'].includes(source.page_orientation) ? source.page_orientation : DEFAULTS.page_orientation;
    result.font_family = Object.hasOwn(FONT_STACKS, source.font_family) ? source.font_family : DEFAULTS.font_family;
    result.font_weight = [600,700,800,900].includes(Number(source.font_weight)) ? Number(source.font_weight) : DEFAULTS.font_weight;
    result.leader_style = ['dotted','dashed','solid','double'].includes(source.leader_style) ? source.leader_style : DEFAULTS.leader_style;
    result.logo_mode = ['stamp','image'].includes(source.logo_mode) ? source.logo_mode : DEFAULTS.logo_mode;
    result.custom_font_url = safeHttpsUrl(source.custom_font_url);
    result.custom_font_name = String(source.custom_font_name || '').slice(0, 100);
    result.logo_url = safeHttpsUrl(source.logo_url);
    return result;
  }

  function numericControl(key) {
    const [min,max,step,label,unit] = NUMBER_FIELDS[key];
    return `<label class="pb-invoice-field"><span>${esc(label)}</span><div class="pb-invoice-number"><input type="range" min="${min}" max="${max}" step="${step}" data-invoice-range="${key}"><input type="number" min="${min}" max="${max}" step="${step}" data-invoice-number="${key}"><b>${esc(unit)}</b></div></label>`;
  }

  function buildMarkup() {
    return `<details class="settings-accordion pb-invoice-settings" open>
      <summary><span class="settings-accordion-icon">🧾</span><span class="settings-accordion-title"><strong>إعدادات الفاتورة</strong><small>تحكم كامل مع معاينة مباشرة ورفع خط أو شعار خاص</small></span><span class="settings-chevron">⌄</span></summary>
      <div class="settings-accordion-body pb-invoice-editor">
        <div class="pb-invoice-actions"><button type="button" data-invoice-preset="compact">قالب مضغوط لأصناف كثيرة</button><button type="button" data-invoice-reset>إرجاع التصميم الافتراضي</button><span>اضغط «حفظ التغييرات» أعلى الصفحة لتثبيت التصميم.</span></div>
        <div class="pb-invoice-layout">
          <div class="pb-invoice-controls">
            <details class="pb-invoice-group" open><summary>الورقة والخط</summary><div class="pb-invoice-group-body">
              <div class="pb-invoice-select-grid">
                <label><span>حجم الورقة</span><select data-invoice-field="page_size"><option>A4</option><option>A5</option><option>Letter</option><option value="auto">تلقائي</option></select></label>
                <label><span>اتجاه الورقة</span><select data-invoice-field="page_orientation"><option value="portrait">طولي</option><option value="landscape">عرضي</option></select></label>
                <label><span>نوع الخط</span><select data-invoice-field="font_family"><option value="modern_pro">Modern Pro Bold عربي</option><option value="din">DIN Next Arabic</option><option value="segoe">Segoe UI Arabic</option><option value="tahoma">Tahoma</option><option value="arial">Arial</option><option value="kufi">Noto Kufi Arabic</option><option value="custom">الخط المرفوع</option></select></label>
                <label><span>سماكة الخط</span><select data-invoice-field="font_weight"><option value="600">Semi Bold 600</option><option value="700">Bold 700</option><option value="800">Extra Bold 800</option><option value="900">Black 900</option></select></label>
                <label><span>شكل الفاصل</span><select data-invoice-field="leader_style"><option value="dotted">منقط</option><option value="dashed">متقطع</option><option value="solid">مستقيم</option><option value="double">مزدوج</option></select></label>
              </div>
              <div class="pb-invoice-upload-grid">
                <label class="settings-file-btn">🔤 رفع خط<input type="file" data-invoice-font-file accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"></label>
                <span data-invoice-font-name>لم يتم رفع خط مخصص</span><button type="button" class="pb-invoice-clear" data-invoice-clear-font>إزالة الخط</button>
                <input type="hidden" data-invoice-field="custom_font_url"><input type="hidden" data-invoice-field="custom_font_name">
              </div>
            </div></details>
            ${GROUPS.map(([title,keys]) => `<details class="pb-invoice-group"><summary>${esc(title)}</summary><div class="pb-invoice-group-body pb-invoice-fields">${keys.map(numericControl).join('')}</div></details>`).join('')}
            <details class="pb-invoice-group"><summary>الشعار والنصوص</summary><div class="pb-invoice-group-body">
              <div class="pb-invoice-select-grid"><label><span>نوع الشعار</span><select data-invoice-field="logo_mode"><option value="stamp">الختم الدائري</option><option value="image">صورة مرفوعة</option></select></label></div>
              <div class="pb-invoice-upload-grid"><label class="settings-file-btn">🖼️ رفع شعار الفاتورة<input type="file" data-invoice-logo-file accept="image/png,image/jpeg,image/webp"></label><span data-invoice-logo-name>لم يتم رفع شعار خاص</span><button type="button" class="pb-invoice-clear" data-invoice-clear-logo>إزالة الشعار</button><input type="hidden" data-invoice-field="logo_url"></div>
              <div class="pb-invoice-text-grid">${Object.entries(TEXT_FIELDS).map(([key,[label,placeholder]]) => `<label><span>${esc(label)}</span><input type="text" data-invoice-field="${key}" placeholder="${esc(placeholder)}" maxlength="120"></label>`).join('')}</div>
            </div></details>
            <details class="pb-invoice-group"><summary>إظهار وإخفاء العناصر</summary><div class="pb-invoice-group-body pb-invoice-toggles">${Object.entries(TOGGLES).map(([key,label]) => `<label><input type="checkbox" data-invoice-toggle="${key}"><span>${esc(label)}</span></label>`).join('')}</div></details>
          </div>
          <div class="pb-invoice-preview-wrap"><div class="pb-invoice-preview-title"><strong>المعاينة المباشرة</strong><span>تقريبية — الطباعة النهائية تتبع حجم الورقة المختار</span></div><div class="pb-invoice-stage"><div class="pb-invoice-paper" data-invoice-preview></div></div></div>
        </div>
      </div>
    </details>`;
  }

  function installStyles() {
    if (document.getElementById('pbInvoiceSettingsStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbInvoiceSettingsStyle';
    style.textContent = `
      .pb-invoice-editor{padding:12px!important}.pb-invoice-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}.pb-invoice-actions button{border:1px solid var(--pba-border,rgba(255,255,255,.12));border-radius:10px;padding:9px 11px;background:var(--pba-surface,#17130f);color:var(--pba-ink,#fff);font:800 10px/1.2 inherit;cursor:pointer}.pb-invoice-actions span{font-size:9px;color:var(--pba-muted,#92877d)}
      .pb-invoice-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(330px,.95fr);gap:14px;align-items:start}.pb-invoice-controls{display:grid;gap:8px}.pb-invoice-group{border:1px solid var(--pba-border,rgba(255,255,255,.1));border-radius:12px;background:var(--pba-surface,#15110e);overflow:hidden}.pb-invoice-group>summary{padding:11px 12px;font-weight:900;font-size:11px;cursor:pointer}.pb-invoice-group-body{padding:0 12px 12px}.pb-invoice-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pb-invoice-field,.pb-invoice-select-grid label,.pb-invoice-text-grid label{display:grid;gap:6px;font-size:9px;font-weight:800;color:var(--pba-muted,#a59b91)}.pb-invoice-number{display:grid;grid-template-columns:minmax(80px,1fr) 68px 22px;gap:6px;align-items:center}.pb-invoice-number input[type=range]{width:100%;accent-color:var(--pba-primary,#2f8b73)}.pb-invoice-number input[type=number],.pb-invoice-select-grid select,.pb-invoice-text-grid input{width:100%;border:1px solid var(--pba-border,rgba(255,255,255,.12));border-radius:9px;padding:8px;background:var(--pba-surface-strong,#0f0c0a);color:var(--pba-ink,#fff);font:800 10px/1.2 inherit}.pb-invoice-number b{font-size:8px}.pb-invoice-select-grid,.pb-invoice-text-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pb-invoice-upload-grid{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin-top:10px}.pb-invoice-upload-grid span{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--pba-muted,#a59b91)}.pb-invoice-clear{border:1px solid var(--pba-border,rgba(255,255,255,.12));border-radius:8px;padding:7px;background:transparent;color:var(--pba-muted,#a59b91);font:800 8px/1 inherit;cursor:pointer}.pb-invoice-toggles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.pb-invoice-toggles label{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid var(--pba-border,rgba(255,255,255,.1));border-radius:9px;font-size:9px;font-weight:800}.pb-invoice-toggles input{accent-color:var(--pba-primary,#2f8b73)}
      .pb-invoice-preview-wrap{position:sticky;top:72px;min-width:0}.pb-invoice-preview-title{display:flex;justify-content:space-between;gap:8px;margin-bottom:7px}.pb-invoice-preview-title strong{font-size:11px}.pb-invoice-preview-title span{font-size:8px;color:var(--pba-muted,#8c8177)}.pb-invoice-stage{padding:12px;border-radius:14px;background:#777;overflow:auto;max-height:76vh}.pb-invoice-paper{width:100%;min-height:590px;padding:18px;background:#fff;color:#000;border-style:double;transform-origin:top center;box-shadow:0 8px 28px rgba(0,0,0,.25);font-family:Tahoma,Arial,sans-serif;display:flex;flex-direction:column}.pb-prev-brand{text-align:center}.pb-prev-stamp{margin:0 auto 5px;border-style:double;border-color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Georgia,serif;line-height:1}.pb-prev-stamp b:first-child{font-size:.54em}.pb-prev-stamp b:last-child{font-size:1em}.pb-prev-logo-image{display:block;margin:0 auto 5px;object-fit:contain;filter:grayscale(1) contrast(1.25)}.pb-prev-brand h3{margin:0;font-family:Georgia,serif;line-height:1}.pb-prev-brand small{display:block;font-family:Georgia,serif;letter-spacing:1.5px}.pb-prev-rule{display:flex;align-items:center;gap:6px}.pb-prev-rule::before,.pb-prev-rule::after{content:"";height:1px;background:#000;flex:1}.pb-prev-meta,.pb-prev-customer-line,.pb-prev-total{display:flex;justify-content:space-between;gap:8px}.pb-prev-customer{border-block:1px solid #000;padding:5px 0}.pb-prev-details{text-align:center;font-weight:900}.pb-prev-item{display:flex;gap:5px;align-items:baseline;flex:1 1 0;min-height:0;align-items:center}.pb-prev-item span:first-child{font-weight:900}.pb-prev-leader{flex:1;border-bottom-color:#000;transform:translateY(-3px)}.pb-prev-item strong{direction:ltr}.pb-prev-total{border-style:solid;border-color:#000;border-radius:5px;padding:6px;font-weight:900}.pb-prev-footer{text-align:center;font-weight:900}.pb-prev-footer::before{content:"◆";display:block;font-size:.55em}
      body.admin-global-light .pb-invoice-group{background:#fff}body.admin-global-light .pb-invoice-number input[type=number],body.admin-global-light .pb-invoice-select-grid select,body.admin-global-light .pb-invoice-text-grid input{background:#fff;color:#263238;-webkit-text-fill-color:#263238}
      @media(max-width:980px){.pb-invoice-layout{grid-template-columns:1fr}.pb-invoice-preview-wrap{position:static}.pb-invoice-stage{max-height:none}.pb-invoice-paper{max-width:520px;margin:auto}}
      @media(max-width:560px){.pb-invoice-fields,.pb-invoice-select-grid,.pb-invoice-text-grid{grid-template-columns:1fr}.pb-invoice-toggles{grid-template-columns:1fr 1fr}.pb-invoice-number{grid-template-columns:minmax(70px,1fr) 62px 20px}.pb-invoice-editor{padding:8px!important}.pb-invoice-stage{padding:7px}.pb-invoice-paper{padding:12px}}
    `;
    document.head.appendChild(style);
  }

  function currentFromFields() {
    const raw = {};
    document.querySelectorAll('[data-invoice-field]').forEach(input => { raw[input.dataset.invoiceField] = input.value; });
    document.querySelectorAll('[data-invoice-number]').forEach(input => { raw[input.dataset.invoiceNumber] = input.value; });
    document.querySelectorAll('[data-invoice-toggle]').forEach(input => { raw[input.dataset.invoiceToggle] = input.checked; });
    return normalize(raw);
  }

  function applyToFields(raw) {
    const settings = normalize(raw);
    document.querySelectorAll('[data-invoice-field]').forEach(input => { input.value = settings[input.dataset.invoiceField] ?? ''; });
    document.querySelectorAll('[data-invoice-number]').forEach(input => { input.value = settings[input.dataset.invoiceNumber]; });
    document.querySelectorAll('[data-invoice-range]').forEach(input => { input.value = settings[input.dataset.invoiceRange]; });
    document.querySelectorAll('[data-invoice-toggle]').forEach(input => { input.checked = settings[input.dataset.invoiceToggle] === true; });
    const fontName = document.querySelector('[data-invoice-font-name]');
    if (fontName) fontName.textContent = settings.custom_font_name || (settings.custom_font_url ? 'خط مخصص محفوظ' : 'لم يتم رفع خط مخصص');
    const logoName = document.querySelector('[data-invoice-logo-name]');
    if (logoName) logoName.textContent = settings.logo_url ? 'شعار فاتورة محفوظ' : 'لم يتم رفع شعار خاص';
    updatePreview();
  }

  function previewLogo(settings) {
    if (!settings.show_logo) return '';
    const logo = logoObjectUrl || settings.logo_url;
    if (settings.logo_mode === 'image' && logo) return `<img class="pb-prev-logo-image" src="${esc(logo)}" alt="" style="width:${settings.logo_size_mm}mm;height:${settings.logo_size_mm}mm">`;
    return `<div class="pb-prev-stamp" style="width:${settings.logo_size_mm}mm;height:${settings.logo_size_mm}mm;border-width:${settings.frame_width_pt}pt"><b>♛ PASHA BABY</b><b>PB</b></div>`;
  }

  function updatePreview() {
    const holder = document.querySelector('[data-invoice-preview]');
    if (!holder) return;
    const s = currentFromFields();
    const fontUrl = customFontObjectUrl || s.custom_font_url;
    const customFace = s.font_family === 'custom' && fontUrl ? `@font-face{font-family:PashaInvoicePreview;src:url("${fontUrl.replace(/["\\]/g,'')}")} ` : '';
    let face = document.getElementById('pbInvoicePreviewFont');
    if (!face) { face = document.createElement('style'); face.id = 'pbInvoicePreviewFont'; document.head.appendChild(face); }
    face.textContent = customFace;
    const font = s.font_family === 'custom' && fontUrl ? 'PashaInvoicePreview,Tahoma,Arial,sans-serif' : FONT_STACKS[s.font_family];
    holder.style.cssText = `min-height:${Math.max(420,s.paper_min_height_mm*2)}px;padding:${s.outer_padding_mm*2}px;border-width:${s.frame_width_pt}px;border-radius:${s.frame_radius_mm*1.5}px;font-family:${font};font-size:${s.base_size_pt}px;font-weight:${s.font_weight};line-height:${s.line_height}`;
    holder.innerHTML = `<div class="pb-prev-brand">${previewLogo(s)}${s.show_brand_title?`<h3 style="font-size:${s.title_size_pt}px">${esc(s.brand_title)}</h3>`:''}${s.show_brand_subtitle?`<small style="font-size:${s.subtitle_size_pt}px">${esc(s.brand_subtitle)}</small>`:''}</div>
      <div class="pb-prev-rule" style="margin:${s.header_spacing_mm*1.2}px 0"><span>◆</span></div>
      ${(s.show_order_number||s.show_date_time)?`<div class="pb-prev-meta" style="font-size:${s.meta_size_pt}px">${s.show_order_number?'<b>PB-260910-001</b>':'<span></span>'}${s.show_date_time?'<span>10/09/2026، 03:30 م</span>':''}</div>`:''}
      <div class="pb-prev-customer" style="font-size:${s.customer_size_pt}px"><div class="pb-prev-customer-line"><b>محمد مصطفى محمود</b><span>${s.show_customer_phone?'0750 000 0000':''}${s.show_order_type?' · توصيل':''}</span></div>${s.show_customer_address?`<div style="font-size:${s.address_size_pt}px">العنوان: دهوك، شارع بارزان</div>`:''}</div>
      ${s.show_details_title?`<div class="pb-prev-details" style="font-size:${s.details_size_pt}px">${esc(s.details_title)}</div>`:''}
      ${[['1× بدلة أطفال','اللون: بيج','35,000'],['2× رضاعة سوانكس','الحجم: صغير','18,000'],['1× حقيبة حليب','','5,000'],['1× أجور التوصيل','','5,000']].map(([name,opt,price])=>`<div class="pb-prev-item" style="min-height:${s.row_min_height_mm*2}px;padding:${s.row_padding_mm*1.5}px 0;font-size:${s.item_size_pt}px"><span>${s.show_quantity?name:name.replace(/^\d+×\s*/,'')}${s.show_options&&opt?` <small style="font-size:${s.option_size_pt}px">— ${opt}</small>`:''}</span><i class="pb-prev-leader" style="border-bottom-width:${s.leader_width_pt}px;border-bottom-style:${s.leader_style}"></i><strong style="font-size:${s.price_size_pt}px">${price}</strong></div>`).join('')}
      ${s.show_notes?`<div style="font-size:${s.notes_size_pt}px;border-top:1px solid;padding-top:4px">ملاحظة: الاتصال قبل التوصيل</div>`:''}
      <div class="pb-prev-total" style="font-size:${s.total_size_pt}px;border-width:${s.total_border_pt}px"><span>المجموع الكلي</span><b>63,000 د.ع</b></div>
      ${s.show_footer?`<div class="pb-prev-footer" style="font-size:${s.footer_size_pt}px;margin-top:${s.footer_spacing_mm*1.3}px">${esc(s.footer_text)}</div>`:''}`;
  }

  function bind() {
    const root = document.querySelector('.pb-invoice-settings');
    if (!root) return;
    root.addEventListener('input', event => {
      const rangeKey = event.target.dataset.invoiceRange;
      const numberKey = event.target.dataset.invoiceNumber;
      if (rangeKey) { const twin = root.querySelector(`[data-invoice-number="${rangeKey}"]`); if (twin) twin.value = event.target.value; }
      if (numberKey) { const twin = root.querySelector(`[data-invoice-range="${numberKey}"]`); if (twin) twin.value = event.target.value; }
      if (event.target.dataset.invoiceField === 'page_size') {
        const heights = { A4:285, A5:198, Letter:267, auto:285 };
        const height = heights[event.target.value] || 285;
        const number = root.querySelector('[data-invoice-number="paper_min_height_mm"]');
        const range = root.querySelector('[data-invoice-range="paper_min_height_mm"]');
        if (number) number.value = height;
        if (range) range.value = height;
      }
      updatePreview();
    });
    root.querySelector('[data-invoice-reset]')?.addEventListener('click', () => {
      if (confirm('ترجع كل إعدادات الفاتورة إلى التصميم الافتراضي؟')) applyToFields(DEFAULTS);
    });
    root.querySelector('[data-invoice-preset="compact"]')?.addEventListener('click', () => applyToFields({ ...currentFromFields(), page_size:'A4', page_orientation:'portrait', page_margin_mm:6, paper_min_height_mm:285, outer_padding_mm:8, base_size_pt:11, line_height:1.15, meta_size_pt:7, customer_size_pt:10, address_size_pt:8.5, details_size_pt:15, item_size_pt:11, option_size_pt:8.5, price_size_pt:11, row_min_height_mm:5.5, row_padding_mm:.5, notes_size_pt:8.5, total_size_pt:15, footer_size_pt:13, header_spacing_mm:1.5 }));
    root.querySelector('[data-invoice-font-file]')?.addEventListener('change', event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (customFontObjectUrl) URL.revokeObjectURL(customFontObjectUrl);
      customFontObjectUrl = URL.createObjectURL(file);
      root.querySelector('[data-invoice-field="font_family"]').value = 'custom';
      root.querySelector('[data-invoice-font-name]').textContent = file.name;
      updatePreview();
    });
    root.querySelector('[data-invoice-logo-file]')?.addEventListener('change', event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
      logoObjectUrl = URL.createObjectURL(file);
      root.querySelector('[data-invoice-field="logo_mode"]').value = 'image';
      root.querySelector('[data-invoice-logo-name]').textContent = file.name;
      updatePreview();
    });
    root.querySelector('[data-invoice-clear-font]')?.addEventListener('click', () => {
      if (customFontObjectUrl) URL.revokeObjectURL(customFontObjectUrl);
      customFontObjectUrl = '';
      root.querySelector('[data-invoice-font-file]').value = '';
      root.querySelector('[data-invoice-field="custom_font_url"]').value = '';
      root.querySelector('[data-invoice-field="custom_font_name"]').value = '';
      root.querySelector('[data-invoice-field="font_family"]').value = 'modern_pro';
      root.querySelector('[data-invoice-font-name]').textContent = 'لم يتم رفع خط مخصص';
      updatePreview();
    });
    root.querySelector('[data-invoice-clear-logo]')?.addEventListener('click', () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
      logoObjectUrl = '';
      root.querySelector('[data-invoice-logo-file]').value = '';
      root.querySelector('[data-invoice-field="logo_url"]').value = '';
      root.querySelector('[data-invoice-field="logo_mode"]').value = 'stamp';
      root.querySelector('[data-invoice-logo-name]').textContent = 'لم يتم رفع شعار خاص';
      updatePreview();
    });
  }

  async function uploadFile(file, folder, allowed, maxSize) {
    if (!file) return '';
    const extension = String(file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(extension)) throw new Error(`نوع الملف .${extension} غير مدعوم.`);
    if (file.size > maxSize) throw new Error(`حجم الملف أكبر من ${Math.round(maxSize/1024/1024)}MB.`);
    const path = `settings/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${extension}`;
    const result = await supabaseClient.storage.from('invoice-assets').upload(path, file, { cacheControl:'31536000', upsert:false, contentType:file.type || 'application/octet-stream' });
    if (result.error) throw result.error;
    const publicUrl = supabaseClient.storage.from('invoice-assets').getPublicUrl(path)?.data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر إنشاء رابط الملف المرفوع.');
    return publicUrl;
  }

  async function uploadPendingAssets() {
    const root = document.querySelector('.pb-invoice-settings');
    if (!root) return;
    const fontInput = root.querySelector('[data-invoice-font-file]');
    const logoInput = root.querySelector('[data-invoice-logo-file]');
    if (fontInput?.files?.[0]) {
      if (typeof setRestaurantSettingsMsg === 'function') setRestaurantSettingsMsg('جاري رفع خط الفاتورة...');
      const url = await uploadFile(fontInput.files[0], 'fonts', ['woff2','woff','ttf','otf'], 8*1024*1024);
      root.querySelector('[data-invoice-field="custom_font_url"]').value = url;
      root.querySelector('[data-invoice-field="custom_font_name"]').value = fontInput.files[0].name;
      fontInput.value = '';
    }
    if (logoInput?.files?.[0]) {
      if (typeof setRestaurantSettingsMsg === 'function') setRestaurantSettingsMsg('جاري رفع شعار الفاتورة...');
      const url = await uploadFile(logoInput.files[0], 'logos', ['png','jpg','jpeg','webp'], 8*1024*1024);
      root.querySelector('[data-invoice-field="logo_url"]').value = url;
      logoInput.value = '';
    }
  }

  function mergeIntoUiDesignSettings(existing) {
    return { ...readObject(existing), invoice: currentFromFields() };
  }

  function init() {
    const message = document.getElementById('restaurantSettingsMsg');
    if (!message || document.querySelector('.pb-invoice-settings')) return;
    installStyles();
    message.insertAdjacentHTML('afterend', buildMarkup());
    bind();
    let saved = {};
    try { saved = readObject(adminRestaurantSettings?.ui_design_settings).invoice || {}; } catch (_) {}
    applyToFields(saved);
  }

  window.PashaInvoiceSettings = {
    defaults: DEFAULTS,
    fontStacks: FONT_STACKS,
    normalize,
    render: applyToFields,
    updatePreview,
    uploadPendingAssets,
    mergeIntoUiDesignSettings
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
