(() => {
  if (window.__PASHA_INVOICE_LIVE_SETTINGS_UI_V1__) return;
  window.__PASHA_INVOICE_LIVE_SETTINGS_UI_V1__ = true;

  const STYLE_ID = 'pbInvoiceLiveSettingsUiStyle';
  const GROUPS = [
    ['الورقة والخط', ['page_size','page_orientation','base_size_pt','line_height']],
    ['الصفحة والإطار', ['page_margin_mm','outer_padding_mm']],
    ['الرأس والشعار', ['logo_size_mm']],
    ['الأصناف والفواصل', ['item_size_pt','option_size_pt','price_size_pt','row_min_height_mm','row_padding_mm']]
  ];

  const LABELS = {
    page_size:'حجم الورقة', page_orientation:'اتجاه الورقة',
    base_size_pt:'حجم الخط الأساسي', line_height:'تباعد السطور',
    page_margin_mm:'هامش الطابعة', outer_padding_mm:'المسافة داخل الإطار',
    logo_size_mm:'حجم الشعار', item_size_pt:'اسم الصنف',
    option_size_pt:'الخيار واللون', price_size_pt:'سعر الصنف',
    row_min_height_mm:'ارتفاع صف الصنف', row_padding_mm:'الحشو العمودي للصف'
  };

  const UNITS = {
    base_size_pt:'pt', line_height:'×', page_margin_mm:'mm', outer_padding_mm:'mm',
    logo_size_mm:'mm', item_size_pt:'pt', option_size_pt:'pt', price_size_pt:'pt',
    row_min_height_mm:'mm', row_padding_mm:'mm'
  };

  const RANGES = {
    base_size_pt:[8,20,.5], line_height:[1,2,.05], page_margin_mm:[0,20,.5],
    outer_padding_mm:[2,24,.5], logo_size_mm:[12,55,1], item_size_pt:[8,20,.5],
    option_size_pt:[7,18,.5], price_size_pt:[8,20,.5], row_min_height_mm:[4,18,.5],
    row_padding_mm:[0,8,.25]
  };

  const TOGGLE_LABELS = {
    fit_one_page:'ملاءمة في صفحة واحدة', show_logo:'الشعار',
    show_customer_address:'عنوان الزبون', show_notes:'الملاحظات',
    show_footer:'عبارة الشكر', show_subtotal:'مجموع الأصناف قبل التوصيل'
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pb-invoice-live{padding:0!important;background:rgba(0,0,0,.88)!important}
      .pb-invoice-live-card{
        width:min(860px,100%)!important;height:100dvh!important;max-height:100dvh!important;
        display:flex!important;flex-direction:column!important;border-radius:0!important;overflow:hidden!important;
        background:var(--pba-bg,#11100f)!important;border:0!important
      }
      .pb-invoice-live-preview{
        order:0!important;flex:0 0 34dvh!important;height:34dvh!important;min-height:220px!important;max-height:34dvh!important;
        padding:12px!important;overflow:hidden!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;
        align-items:stretch!important;justify-items:stretch!important;background:#24211f!important;border-bottom:1px solid rgba(255,255,255,.08)!important
      }
      .pb-live-settings-preview-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#fff;margin-bottom:8px}
      .pb-live-settings-preview-title strong{font-size:12px}.pb-live-settings-preview-title span{font-size:9px;color:#a59b91}
      .pb-invoice-live-preview img{
        width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;
        margin:auto!important;transform:none!important;background:#fff!important;box-shadow:0 8px 28px rgba(0,0,0,.35)!important
      }
      .pb-invoice-live-controls{
        order:1!important;flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;padding:12px 12px calc(22px + env(safe-area-inset-bottom))!important;
        border:0!important;background:var(--pba-bg,#11100f)!important
      }
      .pb-invoice-live-controls h2{margin:0 0 3px!important;padding-inline:48px 0!important;color:#e2b55e!important;font-size:18px!important}
      .pb-invoice-live-controls>p{margin:0 0 10px!important;color:#a59b91!important;font-size:10px!important}
      .pb-live-settings-groups{display:grid;gap:8px}
      .pb-live-settings-groups .pb-invoice-group{margin:0!important}
      .pb-live-settings-groups .pb-invoice-group-body{padding:0 12px 12px!important}
      .pb-live-settings-groups .pb-invoice-fields{display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important}
      .pb-live-settings-groups .pb-invoice-select-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important}
      .pb-live-settings-groups .pb-invoice-number{display:grid!important;grid-template-columns:minmax(70px,1fr) 68px 22px!important;gap:6px!important;align-items:center!important}
      .pb-live-settings-groups .pb-invoice-number input[type=range]{width:100%!important;accent-color:var(--pba-primary,#2f8b73)!important}
      .pb-live-settings-groups .pb-invoice-number input[type=number],
      .pb-live-settings-groups .pb-invoice-select-grid select{
        width:100%!important;border:1px solid var(--pba-border,rgba(255,255,255,.12))!important;border-radius:9px!important;
        padding:8px!important;background:var(--pba-surface-strong,#0f0c0a)!important;color:var(--pba-ink,#fff)!important;font:800 10px/1.2 inherit!important
      }
      .pb-live-settings-groups .pb-invoice-field,.pb-live-settings-groups .pb-invoice-select-grid label{display:grid!important;gap:6px!important;font-size:9px!important;font-weight:800!important;color:var(--pba-muted,#a59b91)!important}
      .pb-live-settings-toggles{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
      .pb-live-settings-toggles label{display:flex!important;align-items:center!important;gap:7px!important;padding:9px!important;border:1px solid var(--pba-border,rgba(255,255,255,.1))!important;border-radius:9px!important;font-size:10px!important;font-weight:800!important;background:var(--pba-surface,#15110e)!important}
      .pb-live-settings-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-top:10px!important}
      .pb-live-settings-actions button{border:1px solid var(--pba-border,rgba(255,255,255,.12))!important;border-radius:10px!important;padding:11px!important;background:var(--pba-surface,#17130f)!important;color:var(--pba-ink,#fff)!important;font:900 11px/1.2 inherit!important}
      .pb-live-settings-actions .green{background:#174638!important;color:#d7fff1!important;border-color:#2c705b!important}
      .pb-live-settings-actions .primary{grid-column:1/-1!important;background:linear-gradient(135deg,#e2b55e,#b67c2d)!important;color:#171009!important;border:0!important}
      .pb-live-scale,.pb-live-status{margin-top:8px!important;border-radius:9px!important;background:var(--pba-surface,#17130f)!important;color:#a99f94!important;padding:8px 10px!important;font-size:10px!important}
      .pb-live-close{position:fixed!important;top:calc(10px + env(safe-area-inset-top))!important;left:10px!important;z-index:2147483001!important;width:42px!important;height:42px!important}
      @media(min-width:760px){
        .pb-invoice-live-card{height:calc(100dvh - 24px)!important;max-height:calc(100dvh - 24px)!important;margin:12px!important;border-radius:18px!important;border:1px solid rgba(226,181,94,.28)!important}
        .pb-invoice-live-preview{flex-basis:42dvh!important;height:42dvh!important;max-height:42dvh!important}
      }
      @media(max-width:430px){
        .pb-invoice-live-preview{flex-basis:31dvh!important;height:31dvh!important;max-height:31dvh!important;min-height:190px!important;padding:8px!important}
        .pb-live-settings-groups .pb-invoice-fields,.pb-live-settings-groups .pb-invoice-select-grid{grid-template-columns:1fr!important}
        .pb-live-settings-actions{grid-template-columns:1fr 1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function setImportant(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function makeSelectField(input, key) {
    const label = document.createElement('label');
    const title = document.createElement('span');
    title.textContent = LABELS[key] || key;
    label.append(title, input);
    return label;
  }

  function makeNumberField(input, key) {
    const label = document.createElement('label');
    label.className = 'pb-invoice-field';
    const title = document.createElement('span');
    title.textContent = LABELS[key] || key;
    const row = document.createElement('div');
    row.className = 'pb-invoice-number';
    const [min,max,step] = RANGES[key] || [0,100,1];
    const range = document.createElement('input');
    range.type = 'range'; range.min = String(min); range.max = String(max); range.step = String(step); range.value = input.value;
    input.type = 'number'; input.min = String(min); input.max = String(max); input.step = String(step); input.inputMode = 'decimal';
    const unit = document.createElement('b'); unit.textContent = UNITS[key] || '';
    range.addEventListener('input', () => { input.value = range.value; input.dispatchEvent(new Event('input', { bubbles:true })); });
    input.addEventListener('input', () => { range.value = input.value; });
    row.append(range, input, unit); label.append(title, row); return label;
  }

  function makeGroup(title, open = false) {
    const details = document.createElement('details');
    details.className = 'pb-invoice-group';
    if (open) details.open = true;
    const summary = document.createElement('summary'); summary.textContent = title;
    const body = document.createElement('div'); body.className = 'pb-invoice-group-body';
    details.append(summary, body); return { details, body };
  }

  function transform(modal) {
    if (!modal || modal.dataset.pbSettingsUi === '1') return;
    const card = modal.querySelector('.pb-invoice-live-card');
    const controls = modal.querySelector('.pb-invoice-live-controls');
    const preview = modal.querySelector('.pb-invoice-live-preview');
    if (!card || !controls || !preview) return;
    modal.dataset.pbSettingsUi = '1';

    // Reset any inline layout left by the previous iPhone guard.
    [modal, card, controls, preview].forEach(el => {
      ['order','flex','width','height','min-height','max-height','overflow','padding','display','grid-template-rows','grid-template-columns','border-radius'].forEach(prop => el.style.removeProperty(prop));
    });

    setImportant(card, 'display', 'flex'); setImportant(card, 'flex-direction', 'column');
    setImportant(preview, 'order', '0'); setImportant(controls, 'order', '1');

    if (!preview.querySelector('.pb-live-settings-preview-title')) {
      const head = document.createElement('div');
      head.className = 'pb-live-settings-preview-title';
      head.innerHTML = '<strong>المعاينة المباشرة</strong><span>نفس الطلب الحالي — التعديل يظهر فوراً</span>';
      preview.prepend(head);
    }

    const h2 = controls.querySelector('h2'); if (h2) h2.textContent = 'إعدادات الفاتورة';
    const intro = controls.querySelector(':scope > p'); if (intro) intro.textContent = 'نفس إعدادات الفاتورة الموجودة في صفحة الإعدادات، لكن مطبقة مباشرة على الطلب الحالي.';

    const oldGrid = controls.querySelector('.pb-live-grid');
    const oldChecks = controls.querySelector('.pb-live-checks');
    const oldActions = controls.querySelector('.pb-live-actions');
    const scale = controls.querySelector('.pb-live-scale');
    const status = controls.querySelector('.pb-live-status');
    if (!oldGrid || !oldChecks || !oldActions) return;

    const fieldMap = new Map();
    oldGrid.querySelectorAll('[data-pb-live-field]').forEach(input => fieldMap.set(input.dataset.pbLiveField, input));
    const toggleMap = new Map();
    oldChecks.querySelectorAll('[data-pb-live-toggle]').forEach(input => toggleMap.set(input.dataset.pbLiveToggle, input));

    const holder = document.createElement('div'); holder.className = 'pb-live-settings-groups';

    GROUPS.forEach(([title, keys], index) => {
      const group = makeGroup(title, index === 0);
      const hasSelect = keys.some(key => ['page_size','page_orientation'].includes(key));
      const selectGrid = hasSelect ? document.createElement('div') : null;
      if (selectGrid) selectGrid.className = 'pb-invoice-select-grid';
      const numberGrid = document.createElement('div'); numberGrid.className = 'pb-invoice-fields';
      keys.forEach(key => {
        const input = fieldMap.get(key); if (!input) return;
        if (input.tagName === 'SELECT') selectGrid?.appendChild(makeSelectField(input, key));
        else numberGrid.appendChild(makeNumberField(input, key));
      });
      if (selectGrid && selectGrid.children.length) group.body.appendChild(selectGrid);
      if (numberGrid.children.length) group.body.appendChild(numberGrid);
      holder.appendChild(group.details);
    });

    const toggleGroup = makeGroup('إظهار وإخفاء العناصر', false);
    const toggles = document.createElement('div'); toggles.className = 'pb-live-settings-toggles';
    toggleMap.forEach((input, key) => {
      const label = document.createElement('label');
      const span = document.createElement('span'); span.textContent = TOGGLE_LABELS[key] || key;
      label.append(input, span); toggles.appendChild(label);
    });
    toggleGroup.body.appendChild(toggles); holder.appendChild(toggleGroup.details);

    const topActions = document.createElement('div'); topActions.className = 'pb-invoice-actions';
    const fitBtn = oldActions.querySelector('[data-pb-live-fit]');
    const resetBtn = oldActions.querySelector('[data-pb-live-reset]');
    if (fitBtn) { fitBtn.textContent = 'قالب مضغوط لأصناف كثيرة'; topActions.appendChild(fitBtn); }
    if (resetBtn) { resetBtn.textContent = 'إرجاع التصميم الافتراضي'; topActions.appendChild(resetBtn); }
    const note = document.createElement('span'); note.textContent = 'التغييرات مؤقتة لهذا الطلب إلى أن تضغط «حفظ كافتراضي».'; topActions.appendChild(note);

    const printActions = document.createElement('div'); printActions.className = 'pb-live-settings-actions';
    const printBtn = oldActions.querySelector('[data-pb-live-print]');
    const pdfBtn = oldActions.querySelector('[data-pb-live-pdf]');
    const saveBtn = oldActions.querySelector('[data-pb-live-save]');
    if (printBtn) { printBtn.className = 'green'; printBtn.textContent = '🖨 طباعة مباشرة'; printActions.appendChild(printBtn); }
    if (pdfBtn) { pdfBtn.textContent = 'فتح PDF'; printActions.appendChild(pdfBtn); }
    if (saveBtn) { saveBtn.className = 'primary'; saveBtn.textContent = 'حفظ هذه الإعدادات كافتراضية'; printActions.appendChild(saveBtn); }

    oldGrid.remove(); oldChecks.remove(); oldActions.remove();
    intro?.after(topActions, holder, printActions);
    if (scale) controls.appendChild(scale);
    if (status) controls.appendChild(status);
  }

  function scan() {
    document.querySelectorAll('.pb-invoice-live').forEach(transform);
  }

  installStyles();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('resize', scan, { passive:true });
  window.visualViewport?.addEventListener('resize', scan, { passive:true });
})();
