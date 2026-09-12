(() => {
  if (window.__PASHA_INVOICE_STUDIO_V1__) return;
  window.__PASHA_INVOICE_STUDIO_V1__ = true;

  const STYLE_ID = 'pbInvoiceStudioV1Styles';
  const ROOT_ATTR = 'data-pb-invoice-studio';

  const FIELD_META = {
    page_size: { type:'select', label:'حجم الورقة', options:[['A4','A4'],['A5','A5'],['Letter','Letter']] },
    page_orientation: { type:'select', label:'اتجاه الورقة', options:[['portrait','طولي'],['landscape','عرضي']] },
    font_family: { type:'select', label:'الخط', options:[['modern_pro','Modern Pro'],['din','DIN Arabic'],['segoe','Segoe UI'],['tahoma','Tahoma'],['arial','Arial'],['kufi','Kufi'],['custom','الخط المرفوع']] },
    font_weight: { label:'سُمك الخط', min:400, max:900, step:100, fallback:900 },
    base_size_pt: { label:'الخط الأساسي', min:8, max:22, step:.5, fallback:12 },
    logo_size_mm: { label:'حجم الشعار', min:10, max:70, step:1, fallback:27 },
    title_size_pt: { label:'اسم المتجر', min:10, max:46, step:.5, fallback:25 },
    subtitle_size_pt: { label:'وصف المتجر', min:5, max:22, step:.5, fallback:8 },
    meta_size_pt: { label:'رقم الطلب والتاريخ', min:5, max:20, step:.5, fallback:8 },
    customer_size_pt: { label:'اسم ورقم الزبون', min:6, max:26, step:.5, fallback:10.5 },
    address_size_pt: { label:'العنوان', min:6, max:24, step:.5, fallback:9.5 },
    details_size_pt: { label:'عنوان تفاصيل الطلب', min:8, max:32, step:.5, fallback:17 },
    item_size_pt: { label:'اسم الصنف', min:7, max:26, step:.5, fallback:12 },
    option_size_pt: { label:'الخيار واللون', min:6, max:22, step:.5, fallback:9.5 },
    price_size_pt: { label:'السعر', min:7, max:26, step:.5, fallback:12 },
    row_min_height_mm: { label:'ارتفاع صف الصنف', min:4, max:20, step:.5, fallback:7 },
    row_padding_mm: { label:'المسافة بين الأصناف', min:0, max:8, step:.25, fallback:1 },
    total_size_pt: { label:'المجموع الكلي', min:9, max:34, step:.5, fallback:16 },
    total_border_pt: { label:'إطار المجموع', min:0, max:6, step:.5, fallback:2 },
    footer_size_pt: { label:'عبارة الشكر', min:7, max:30, step:.5, fallback:15 },
    footer_spacing_mm: { label:'مسافة عبارة الشكر', min:0, max:15, step:.5, fallback:2.5 },
    outer_padding_mm: { label:'الحشو داخل الإطار', min:2, max:26, step:.5, fallback:8 },
    page_margin_mm: { label:'هامش الورقة', min:0, max:24, step:.5, fallback:6 },
    line_height: { label:'تباعد السطور', min:1, max:2, step:.05, fallback:1.25 },
    frame_width_pt: { label:'سُمك إطار الفاتورة', min:0, max:8, step:.5, fallback:3 },
    leader_width_pt: { label:'سُمك خط السعر', min:.5, max:5, step:.25, fallback:1.5 }
  };

  const TOGGLE_LABELS = {
    fit_one_page:'صفحة واحدة',
    show_logo:'الشعار',
    show_brand_title:'اسم المتجر',
    show_brand_subtitle:'وصف المتجر',
    show_order_number:'رقم الطلب',
    show_date_time:'التاريخ والوقت',
    show_customer_phone:'رقم الهاتف',
    show_customer_address:'العنوان',
    show_order_type:'نوع الطلب',
    show_details_title:'عنوان التفاصيل',
    show_quantity:'الكمية',
    show_options:'الخيارات والألوان',
    show_notes:'الملاحظات',
    show_subtotal:'مجموع الأصناف',
    show_footer:'عبارة الشكر'
  };

  const GROUPS = [
    { id:'quick', icon:'✨', label:'سريع', fields:['page_size','page_orientation','base_size_pt'], toggles:['fit_one_page'] },
    { id:'logo', icon:'◉', label:'الشعار', fields:['logo_size_mm'], toggles:['show_logo'] },
    { id:'brand', icon:'Aa', label:'المتجر', fields:['title_size_pt','subtitle_size_pt'], toggles:['show_brand_title','show_brand_subtitle'] },
    { id:'meta', icon:'#', label:'الطلب', fields:['meta_size_pt'], toggles:['show_order_number','show_date_time'] },
    { id:'customer', icon:'♙', label:'الزبون', fields:['customer_size_pt','address_size_pt'], toggles:['show_customer_phone','show_customer_address','show_order_type'] },
    { id:'items', icon:'▤', label:'الأصناف', fields:['item_size_pt','row_min_height_mm','row_padding_mm'], toggles:['show_quantity'] },
    { id:'options', icon:'◌', label:'الخيارات', fields:['option_size_pt'], toggles:['show_options'] },
    { id:'prices', icon:'$', label:'الأسعار', fields:['price_size_pt','leader_width_pt'], toggles:[] },
    { id:'total', icon:'Σ', label:'المجموع', fields:['total_size_pt','total_border_pt'], toggles:['show_subtotal'] },
    { id:'footer', icon:'✓', label:'النهاية', fields:['footer_size_pt','footer_spacing_mm'], toggles:['show_footer'] },
    { id:'layout', icon:'⚙', label:'عام', fields:['font_family','font_weight','line_height','outer_padding_mm','page_margin_mm','frame_width_pt'], toggles:['show_details_title','show_notes'] }
  ];

  let currentModal = null;
  let activeGroup = 'quick';
  let statusObserver = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getCfg = () => {
    let raw = {};
    try { raw = adminRestaurantSettings?.ui_design_settings?.invoice || {}; } catch (_) {}
    const defaults = window.PashaInvoiceSettings?.defaults || {};
    const normalized = window.PashaInvoiceSettings?.normalize?.(raw) || raw;
    return { ...defaults, ...normalized, fit_one_page:true };
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pb-invoice-live[${ROOT_ATTR}="1"]{padding:0!important;background:#171513!important;backdrop-filter:none!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-invoice-live-card{width:100%!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;display:block!important;overflow:hidden!important;background:#171513!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-invoice-live-controls{display:none!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-invoice-live-preview{position:absolute!important;inset:0!important;width:100%!important;height:100dvh!important;max-height:none!important;min-height:0!important;display:block!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;padding:68px 10px 250px!important;background:#171513!important;border:0!important;box-sizing:border-box!important;overscroll-behavior:contain!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-invoice-live-preview>[data-pb-live-preview],
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-stage>[data-pb-live-preview]{display:block!important;position:relative!important;width:min(100%,760px)!important;height:auto!important;max-width:none!important;max-height:none!important;object-fit:contain!important;margin:0 auto!important;transform:none!important;box-shadow:0 14px 48px rgba(0,0,0,.42)!important;background:#fff!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-stage{width:min(100%,760px)!important;height:auto!important;margin:0 auto!important;background:#fff!important;box-shadow:none!important;line-height:0!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-live-close{display:none!important}
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-topbar,
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-tip,
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-sheet,
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-dock,
      .pb-invoice-live[${ROOT_ATTR}="1"] .pb-direct-hit-layer{display:none!important}
      .pb-studio-top{position:fixed;z-index:2147483500;top:0;left:0;right:0;height:58px;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;display:flex;align-items:center;gap:9px;background:rgba(20,18,16,.96);border-bottom:1px solid rgba(255,255,255,.09);backdrop-filter:blur(16px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .pb-studio-top .close{width:38px;height:38px;flex:0 0 auto;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:#2b2723;color:#fff;font-size:21px;line-height:1}
      .pb-studio-title{min-width:0;flex:1}.pb-studio-title strong{display:flex;align-items:center;gap:7px;font-size:14px;color:#fff}.pb-studio-title i{font-style:normal;font-size:9px;border:1px solid rgba(226,181,94,.3);border-radius:999px;padding:3px 6px;color:#e7bf74;background:rgba(226,181,94,.08)}.pb-studio-title span{display:block;margin-top:2px;color:#9f978e;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pb-studio-top .fit{height:36px;border:1px solid rgba(226,181,94,.28);border-radius:10px;background:#2d2418;color:#e7bf74;padding:0 10px;font:850 11px/1 inherit;white-space:nowrap}
      .pb-studio-panel{position:fixed;z-index:2147483501;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));max-height:232px;background:rgba(247,244,239,.985);color:#201d19;border:1px solid rgba(0,0,0,.1);border-radius:18px;box-shadow:0 18px 55px rgba(0,0,0,.42);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .pb-studio-groups{display:flex;gap:6px;overflow-x:auto;padding:8px 8px 6px;border-bottom:1px solid rgba(0,0,0,.07);scrollbar-width:none;-webkit-overflow-scrolling:touch}.pb-studio-groups::-webkit-scrollbar{display:none}
      .pb-studio-chip{flex:0 0 auto;min-width:64px;border:1px solid #ddd5ca;border-radius:11px;background:#fff;color:#62594f;padding:7px 8px;font:800 10px/1.1 inherit}.pb-studio-chip b{display:block;margin-bottom:3px;font-size:13px;color:#302a24}.pb-studio-chip.is-active{background:#2a241d;color:#f4e8d7;border-color:#2a241d}.pb-studio-chip.is-active b{color:#e7bd70}
      .pb-studio-body{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px;min-height:92px;max-height:118px;overflow:auto}
      .pb-studio-controls{display:grid;gap:7px;align-content:start}.pb-studio-field{display:grid;grid-template-columns:minmax(96px,1fr) 38px minmax(54px,72px) 38px;align-items:center;gap:5px}.pb-studio-field>span{font-size:10px;font-weight:800;color:#5b534b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pb-studio-field button{height:32px;border:1px solid #d8d0c6;border-radius:9px;background:#fff;color:#251f19;font-size:20px;font-weight:800}.pb-studio-field output{display:grid;place-items:center;height:32px;border-radius:9px;background:#eee8df;font:900 11px/1 ui-monospace,SFMono-Regular,monospace;direction:ltr}.pb-studio-field select{grid-column:2/5;height:32px;min-width:0;border:1px solid #d8d0c6;border-radius:9px;background:#fff;color:#251f19;font:800 11px/1 inherit;padding:0 7px}
      .pb-studio-toggles{display:flex;gap:5px;flex-wrap:wrap}.pb-studio-toggle{border:1px solid #d8d0c6;border-radius:999px;background:#fff;color:#61584e;padding:7px 9px;font:800 9px/1 inherit}.pb-studio-toggle.is-on{border-color:#4e8f77;background:#e8f4ef;color:#24654f}.pb-studio-side{display:grid;grid-template-columns:repeat(2,44px);gap:6px;align-content:start}.pb-studio-side button{height:38px;border:1px solid #d8d0c6;border-radius:10px;background:#fff;color:#3c342c;font:800 9px/1.15 inherit}.pb-studio-side .reset{grid-column:1/-1;width:94px;color:#8a4b3e;background:#fff7f4;border-color:#ead2ca}
      .pb-studio-actions{display:grid;grid-template-columns:1.05fr .85fr .85fr;gap:6px;padding:7px 8px 8px;border-top:1px solid rgba(0,0,0,.07);background:#eee8df}.pb-studio-actions button{height:40px;border:1px solid #d0c6b9;border-radius:11px;background:#fff;color:#342c24;font:900 10px/1 inherit}.pb-studio-actions .print{background:#1f624c;color:#fff;border-color:#1f624c}.pb-studio-actions .save{background:#a97125;color:#fff;border-color:#a97125}
      .pb-studio-status{position:fixed;z-index:2147483499;top:62px;left:50%;transform:translateX(-50%);max-width:86vw;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,.7);color:#eee;font:750 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
      @media(min-width:900px){.pb-invoice-live[${ROOT_ATTR}="1"] .pb-invoice-live-preview{padding:76px 390px 24px 24px!important}.pb-studio-panel{left:auto;right:16px;top:74px;bottom:16px;width:350px;max-height:none;border-radius:18px;display:grid;grid-template-rows:auto minmax(0,1fr) auto}.pb-studio-groups{flex-wrap:wrap;overflow:auto;align-content:start}.pb-studio-chip{min-width:76px}.pb-studio-body{grid-template-columns:1fr;max-height:none;overflow:auto;align-content:start}.pb-studio-side{grid-template-columns:repeat(3,1fr)}.pb-studio-side .reset{grid-column:auto;width:auto}.pb-studio-actions{grid-template-columns:1fr}.pb-studio-actions button{height:44px}.pb-studio-status{top:16px;left:auto;right:380px;transform:none;max-width:40vw}}
    `;
    document.head.appendChild(style);
  }

  function ensureField(modal, key) {
    let input = modal.querySelector(`[data-pb-live-field="${key}"]`);
    if (input) return input;
    const meta = FIELD_META[key] || {};
    const cfg = getCfg();
    input = document.createElement(meta.type === 'select' ? 'select' : 'input');
    input.hidden = true;
    input.dataset.pbLiveField = key;
    if (meta.type === 'select') {
      for (const [value, label] of meta.options || []) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; input.appendChild(option);
      }
      input.value = String(cfg[key] ?? meta.options?.[0]?.[0] ?? '');
    } else {
      input.type = 'number'; input.inputMode = 'decimal';
      input.min = String(meta.min ?? -999); input.max = String(meta.max ?? 999); input.step = String(meta.step ?? .5);
      input.value = String(cfg[key] ?? meta.fallback ?? 0);
    }
    modal.appendChild(input);
    return input;
  }

  function ensureToggle(modal, key) {
    let input = modal.querySelector(`[data-pb-live-toggle="${key}"]`);
    if (input) return input;
    const cfg = getCfg();
    input = document.createElement('input'); input.type = 'checkbox'; input.hidden = true; input.dataset.pbLiveToggle = key;
    input.checked = cfg[key] !== false;
    modal.appendChild(input);
    return input;
  }

  function notify(input) {
    input.dispatchEvent(new Event('input', { bubbles:true }));
    input.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function proxy(modal, selector) {
    const target = modal.querySelector(selector);
    if (target) target.click();
  }

  function adjustField(modal, key, direction) {
    const meta = FIELD_META[key];
    if (!meta || meta.type === 'select') return;
    const input = ensureField(modal, key);
    const current = Number(input.value || meta.fallback || 0);
    const next = clamp(current + direction * meta.step, meta.min, meta.max);
    input.value = String(Math.round(next * 100) / 100);
    notify(input);
    refreshBody(modal);
  }

  function toggleField(modal, key) {
    const input = ensureToggle(modal, key);
    input.checked = !input.checked;
    notify(input);
    refreshBody(modal);
  }

  function renderField(modal, key) {
    const meta = FIELD_META[key];
    if (!meta) return '';
    const input = ensureField(modal, key);
    if (meta.type === 'select') {
      const options = (meta.options || []).map(([value,label]) => `<option value="${value}" ${String(input.value) === String(value) ? 'selected' : ''}>${label}</option>`).join('');
      return `<label class="pb-studio-field" data-studio-select-row="${key}"><span>${meta.label}</span><select data-studio-select="${key}">${options}</select></label>`;
    }
    return `<div class="pb-studio-field" data-studio-field-row="${key}"><span>${meta.label}</span><button type="button" data-studio-minus="${key}" aria-label="تصغير ${meta.label}">−</button><output>${input.value}</output><button type="button" data-studio-plus="${key}" aria-label="تكبير ${meta.label}">+</button></div>`;
  }

  function refreshBody(modal) {
    const body = modal.querySelector('.pb-studio-controls');
    if (!body) return;
    const group = GROUPS.find(item => item.id === activeGroup) || GROUPS[0];
    const fields = group.fields.map(key => renderField(modal,key)).join('');
    const toggles = group.toggles.map(key => {
      const input = ensureToggle(modal,key);
      return `<button type="button" class="pb-studio-toggle ${input.checked ? 'is-on' : ''}" data-studio-toggle="${key}" aria-pressed="${String(input.checked)}">${input.checked ? '✓ ' : ''}${TOGGLE_LABELS[key] || key}</button>`;
    }).join('');
    body.innerHTML = `${fields}${toggles ? `<div class="pb-studio-toggles">${toggles}</div>` : ''}`;

    body.querySelectorAll('[data-studio-minus]').forEach(button => button.addEventListener('click', () => adjustField(modal, button.dataset.studioMinus, -1)));
    body.querySelectorAll('[data-studio-plus]').forEach(button => button.addEventListener('click', () => adjustField(modal, button.dataset.studioPlus, 1)));
    body.querySelectorAll('[data-studio-toggle]').forEach(button => button.addEventListener('click', () => toggleField(modal, button.dataset.studioToggle)));
    body.querySelectorAll('[data-studio-select]').forEach(select => select.addEventListener('change', () => {
      const input = ensureField(modal, select.dataset.studioSelect);
      input.value = select.value;
      notify(input);
      refreshBody(modal);
    }));
  }

  function buildStudio(modal) {
    modal.querySelectorAll('.pb-direct-topbar,.pb-direct-tip,.pb-direct-sheet,.pb-direct-dock,.pb-direct-hit-layer').forEach(node => node.remove());
    modal.classList.remove('pb-direct-advanced-open');
    modal.dataset.pbDirectEditor = '1';
    modal.setAttribute(ROOT_ATTR, '1');

    const top = document.createElement('div');
    top.className = 'pb-studio-top';
    top.innerHTML = `<button class="close" type="button" data-studio-close aria-label="إغلاق">×</button><div class="pb-studio-title"><strong>Invoice Studio <i>تجريبي</i></strong><span>اختَر الجزء وعدّل فقط ما تحتاجه</span></div><button class="fit" type="button" data-studio-fit>✨ ملاءمة ذكية</button>`;
    modal.appendChild(top);

    const panel = document.createElement('section');
    panel.className = 'pb-studio-panel';
    panel.innerHTML = `<div class="pb-studio-groups">${GROUPS.map(group => `<button type="button" class="pb-studio-chip ${group.id === activeGroup ? 'is-active' : ''}" data-studio-group="${group.id}"><b>${group.icon}</b>${group.label}</button>`).join('')}</div><div class="pb-studio-body"><div class="pb-studio-controls"></div><div class="pb-studio-side"><button type="button" data-studio-fit>✨ ملاءمة</button><button type="button" data-studio-reset>↶ رجوع</button><button type="button" class="reset" data-studio-original>إعدادات البداية</button></div></div><div class="pb-studio-actions"><button class="print" type="button" data-studio-print>🖨 طباعة</button><button type="button" data-studio-pdf>PDF</button><button class="save" type="button" data-studio-save>حفظ كافتراضي</button></div>`;
    modal.appendChild(panel);

    const status = document.createElement('div'); status.className = 'pb-studio-status'; status.textContent = 'جاري تجهيز المعاينة…'; modal.appendChild(status);

    const close = () => proxy(modal,'[data-pb-live-close]');
    top.querySelector('[data-studio-close]').addEventListener('click', close);
    modal.querySelectorAll('[data-studio-fit]').forEach(button => button.addEventListener('click', () => proxy(modal,'[data-pb-live-fit]')));
    modal.querySelector('[data-studio-reset]').addEventListener('click', () => {
      proxy(modal,'[data-pb-live-reset]');
      setTimeout(() => refreshBody(modal), 40);
    });
    modal.querySelector('[data-studio-original]').addEventListener('click', () => {
      if (!confirm('ترجع تعديلات هذه الجلسة إلى إعدادات البداية؟')) return;
      proxy(modal,'[data-pb-live-reset]');
      setTimeout(() => refreshBody(modal), 40);
    });
    modal.querySelector('[data-studio-print]').addEventListener('click', () => proxy(modal,'[data-pb-live-print]'));
    modal.querySelector('[data-studio-pdf]').addEventListener('click', () => proxy(modal,'[data-pb-live-pdf]'));
    modal.querySelector('[data-studio-save]').addEventListener('click', () => proxy(modal,'[data-pb-live-save]'));
    modal.querySelectorAll('[data-studio-group]').forEach(button => button.addEventListener('click', () => {
      activeGroup = button.dataset.studioGroup || 'quick';
      modal.querySelectorAll('[data-studio-group]').forEach(chip => chip.classList.toggle('is-active', chip.dataset.studioGroup === activeGroup));
      refreshBody(modal);
    }));

    refreshBody(modal);

    statusObserver?.disconnect();
    const legacyStatus = modal.querySelector('[data-pb-live-status]');
    if (legacyStatus) {
      const sync = () => { status.textContent = legacyStatus.textContent || 'المعاينة جاهزة.'; };
      sync();
      statusObserver = new MutationObserver(sync);
      statusObserver.observe(legacyStatus, { childList:true, subtree:true, characterData:true });
    }
  }

  function transform(modal) {
    if (!modal || modal.getAttribute(ROOT_ATTR) === '1') return;
    currentModal = modal;
    installStyles();
    buildStudio(modal);

    const cleanup = new MutationObserver(() => {
      if (!modal.isConnected) {
        cleanup.disconnect();
        statusObserver?.disconnect();
        if (currentModal === modal) currentModal = null;
        return;
      }
      modal.querySelectorAll('.pb-direct-topbar,.pb-direct-tip,.pb-direct-sheet,.pb-direct-dock,.pb-direct-hit-layer').forEach(node => node.remove());
    });
    cleanup.observe(document.body, { childList:true, subtree:true });
  }

  function scan() {
    document.querySelectorAll('.pb-invoice-live').forEach(transform);
  }

  installStyles();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
