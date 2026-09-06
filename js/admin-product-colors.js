(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_PRODUCT_COLORS_V2__) return;
  window.__PASHA_ADMIN_PRODUCT_COLORS_V2__ = true;

  const state = {
    productId: '',
    colors: [],
    hookInstalled: false,
    loadToken: 0
  };

  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const COLOR_ALIASES = [
    ['اوف وايت', '#f5f1e6'], ['اوفوايت', '#f5f1e6'], ['سكري', '#f6e8c9'],
    ['ازرق سماوي', '#4fc3f7'], ['سماوي', '#4fc3f7'], ['لبني', '#87ceeb'],
    ['ازرق ملكي', '#4169e1'], ['ازرق', '#1e88e5'], ['كحلي', '#1b2a49'],
    ['اخضر فاتح', '#8bcf7b'], ['اخضر غامق', '#2e7d32'], ['اخضر', '#43a047'],
    ['زيتي', '#708238'], ['نعناعي', '#98d8c8'], ['فيروزي', '#26a69a'], ['تركواز', '#40e0d0'],
    ['احمر غامق', '#b71c1c'], ['احمر', '#e53935'], ['عنابي', '#7b1e3a'], ['نبيتي', '#800020'], ['خمري', '#722f37'],
    ['وردي فاتح', '#f8bbd0'], ['وردي غامق', '#d85a8a'], ['وردي', '#f48fb1'], ['زهري', '#f48fb1'], ['فوشي', '#e91e63'],
    ['بنفسجي فاتح', '#b39ddb'], ['بنفسجي', '#8e44ad'], ['موف', '#9c6ade'], ['لافندر', '#b39ddb'],
    ['اصفر فاتح', '#fff176'], ['اصفر', '#fdd835'], ['ليموني', '#d4e157'], ['ذهبي', '#d4af37'],
    ['برتقالي', '#fb8c00'], ['مشمشي', '#ffb07c'], ['مرجاني', '#ff7f50'],
    ['بني فاتح', '#a98274'], ['بني غامق', '#5d4037'], ['بني', '#795548'], ['جوزي', '#6d4c41'],
    ['بيج', '#d7c3a3'], ['كريمي', '#fff3d6'], ['رملي', '#d8c3a5'],
    ['رمادي فاتح', '#cfd8dc'], ['رمادي غامق', '#616161'], ['رمادي', '#9e9e9e'], ['رصاصي', '#78909c'],
    ['فضي', '#b0bec5'], ['اسود', '#111111'], ['ابيض', '#ffffff'],
    ['black', '#111111'], ['white', '#ffffff'], ['red', '#e53935'], ['blue', '#1e88e5'],
    ['green', '#43a047'], ['yellow', '#fdd835'], ['orange', '#fb8c00'], ['pink', '#f48fb1'],
    ['purple', '#8e44ad'], ['brown', '#795548'], ['gray', '#9e9e9e'], ['grey', '#9e9e9e'],
    ['beige', '#d7c3a3'], ['navy', '#1b2a49'], ['gold', '#d4af37'], ['silver', '#b0bec5']
  ];

  function normalizeColorName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/ـ/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ');
  }

  function detectColorHex(value) {
    const normalized = normalizeColorName(value);
    if (!normalized) return '';

    const exact = COLOR_ALIASES.find(([name]) => normalized === name);
    if (exact) return exact[1];

    const partial = COLOR_ALIASES
      .slice()
      .sort((a, b) => b[0].length - a[0].length)
      .find(([name]) => normalized.includes(name));

    return partial?.[1] || '';
  }

  function installStyles() {
    if (q('#pbAdminColorsEditorStyles')) return;

    const style = document.createElement('style');
    style.id = 'pbAdminColorsEditorStyles';
    style.textContent = `
      #pbProductColorsEditor{grid-column:1/-1;margin-top:14px;padding:14px;border:1px solid rgba(216,169,88,.22);border-radius:16px;background:rgba(216,169,88,.045)}
      .pb-editor-colors-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
      .pb-editor-colors-head strong{display:block;color:#e5b765;font-size:14px;margin-bottom:3px}
      .pb-editor-colors-head small{display:block;color:#9b9288;font-size:10px;line-height:1.6}
      #pbEditorAddColor{border:1px solid rgba(216,169,88,.3);background:#17130f;color:#efd09a;border-radius:10px;padding:9px 11px;font-weight:900;white-space:nowrap}
      #pbEditorColorStatus{min-height:17px;margin:4px 0 8px;font-size:10px;color:#9b9288}
      #pbEditorColorList{display:flex;flex-direction:column;gap:9px}
      .pb-editor-color-row{padding:11px;border:1px solid rgba(255,255,255,.075);border-radius:13px;background:#090705}
      .pb-editor-color-row.is-unavailable{opacity:.62}
      .pb-editor-color-main{display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;align-items:start}
      .pb-editor-color-swatch{width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.86);background:var(--pb-editor-color,#d8d0d3);box-shadow:0 0 0 1px rgba(0,0,0,.2),0 4px 15px rgba(0,0,0,.18)}
      .pb-editor-color-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .pb-editor-color-field{display:flex;flex-direction:column;gap:5px}
      .pb-editor-color-field.full{grid-column:1/-1}
      .pb-editor-color-field label{font-size:10px;color:#aaa097}
      .pb-editor-color-field input,.pb-editor-color-field select{width:100%;min-width:0;height:39px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#030302;color:#fff;padding:0 10px;outline:none;box-sizing:border-box}
      .pb-editor-color-field input:focus,.pb-editor-color-field select:focus{border-color:#c99545}
      .pb-editor-color-picker-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:end}
      .pb-editor-color-picker{padding:4px!important;cursor:pointer}
      .pb-editor-color-auto{height:39px;border:1px solid rgba(216,169,88,.28);border-radius:10px;background:#17130f;color:#e7c78e;padding:0 9px;font-size:10px;font-weight:900}
      .pb-editor-color-actions{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
      .pb-editor-color-actions button{height:36px;border-radius:10px;padding:0 12px;font-weight:900;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd}
      .pb-editor-color-actions .save{flex:1;border:0;background:linear-gradient(135deg,#e2b55e,#ad7426);color:#100b05}
      .pb-editor-color-actions .danger{color:#fecaca;border-color:rgba(248,113,113,.3);background:#251010}
      .pb-editor-color-empty{padding:14px;text-align:center;border:1px dashed rgba(255,255,255,.09);border-radius:11px;color:#8f867a;font-size:11px}
      .pb-editor-color-loading{padding:13px;text-align:center;color:#9b9288;font-size:11px}
      @media(max-width:640px){
        .pb-editor-colors-head{align-items:stretch;flex-direction:column}
        #pbEditorAddColor{width:100%}
        .pb-editor-color-grid{grid-template-columns:1fr}
        .pb-editor-color-field.full{grid-column:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function setStatus(message = '', ok = true) {
    const el = q('#pbEditorColorStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#9ccfb7' : '#fecaca';
  }

  function isPersistedId(value) {
    return value && !String(value).startsWith('new-');
  }

  function nextSortOrder() {
    if (!state.colors.length) return 1;
    return Math.max(...state.colors.map(row => Number(row.sort_order || 0))) + 1;
  }

  function rowHtml(row) {
    const id = String(row.id || `new-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const detected = detectColorHex(row.name_ar || '');
    const colorHex = /^#[0-9a-f]{6}$/i.test(String(row.color_hex || ''))
      ? String(row.color_hex)
      : (detected || '#d8d0d3');
    const manual = detected && detected.toLowerCase() === colorHex.toLowerCase() ? '0' : (row.id ? '1' : '0');

    return `
      <div class="pb-editor-color-row ${row.is_available === false ? 'is-unavailable' : ''}"
           data-pb-color-row="${esc(id)}"
           data-manual-color="${manual}"
           data-sort-order="${Number(row.sort_order || nextSortOrder())}">
        <div class="pb-editor-color-main">
          <span class="pb-editor-color-swatch" style="--pb-editor-color:${esc(colorHex)}"></span>
          <div class="pb-editor-color-grid">
            <div class="pb-editor-color-field">
              <label>اسم اللون بالعربي *</label>
              <input class="pb-edit-color-name-ar" maxlength="80" value="${esc(row.name_ar || '')}" placeholder="مثال: أسود">
            </div>
            <div class="pb-editor-color-field">
              <label>اسم اللون English</label>
              <input class="pb-edit-color-name-en" maxlength="80" value="${esc(row.name_en || '')}" placeholder="Black">
            </div>
            <div class="pb-editor-color-field">
              <label>اسم اللون كوردي</label>
              <input class="pb-edit-color-name-ku" maxlength="80" value="${esc(row.name_ku || '')}">
            </div>
            <div class="pb-editor-color-field">
              <label>لون الدائرة</label>
              <div class="pb-editor-color-picker-wrap">
                <input class="pb-editor-color-picker" type="color" value="${esc(colorHex)}">
                <button class="pb-editor-color-auto" type="button" data-color-auto>تلقائي</button>
              </div>
            </div>
            <div class="pb-editor-color-field">
              <label>الحالة</label>
              <select class="pb-edit-color-available">
                <option value="true" ${row.is_available === false ? '' : 'selected'}>متوفر</option>
                <option value="false" ${row.is_available === false ? 'selected' : ''}>غير متوفر</option>
              </select>
            </div>
            <div class="pb-editor-color-field">
              <label>صورة خاصة لهذا اللون (اختياري)</label>
              <input class="pb-edit-color-image" type="url" value="${esc(row.image_url || '')}" placeholder="https://...">
            </div>
          </div>
        </div>
        <div class="pb-editor-color-actions">
          <button class="save" type="button" data-color-save>${isPersistedId(id) ? 'حفظ اللون' : 'إضافة اللون'}</button>
          <button class="danger" type="button" data-color-delete>حذف</button>
        </div>
      </div>`;
  }

  function renderList() {
    const box = q('#pbEditorColorList');
    if (!box) return;

    if (!state.colors.length) {
      box.innerHTML = '<div class="pb-editor-color-empty">هذا الصنف ما عنده ألوان بعد. اضغط «+ إضافة لون».</div>';
      return;
    }

    box.innerHTML = state.colors
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map(rowHtml)
      .join('');
  }

  function editorSectionHtml() {
    return `
      <div id="pbProductColorsEditor">
        <div class="pb-editor-colors-head">
          <div>
            <strong>🎨 ألوان الصنف</strong>
            <small>اكتب اسم اللون بالعربي والدائرة تتلوّن تلقائياً. وإذا تريد درجة مختلفة غيّرها يدوياً.</small>
          </div>
          <button id="pbEditorAddColor" type="button">+ إضافة لون</button>
        </div>
        <div id="pbEditorColorStatus"></div>
        <div id="pbEditorColorList"><div class="pb-editor-color-loading">جاري تحميل الألوان...</div></div>
      </div>`;
  }

  async function loadColors(productId) {
    const token = ++state.loadToken;
    setStatus('جاري تحميل الألوان...');

    const { data, error } = await supabaseClient
      .from('product_colors')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (token !== state.loadToken || String(productId) !== String(state.productId)) return;

    if (error) {
      console.error('PRODUCT COLORS LOAD ERROR', error);
      state.colors = [];
      renderList();
      setStatus('فشل تحميل الألوان: ' + (error.message || error), false);
      return;
    }

    state.colors = Array.isArray(data) ? data : [];
    renderList();
    setStatus(state.colors.length ? `ألوان الصنف: ${state.colors.length}` : 'ماكو ألوان مضافة لهذا الصنف بعد.');
  }

  function injectIntoProductEditor(productId) {
    installStyles();

    const editorBody = q('#editorBody');
    if (!editorBody || !q('#editorModal')?.classList.contains('open')) return;

    q('#pbProductColorsEditor')?.remove();

    const template = document.createElement('template');
    template.innerHTML = editorSectionHtml().trim();
    const section = template.content.firstElementChild;
    const actions = editorBody.querySelector('.modal-actions');

    if (actions) actions.before(section);
    else editorBody.appendChild(section);

    state.productId = String(productId || '');
    state.colors = [];

    if (!state.productId) {
      q('#pbEditorColorList').innerHTML = '<div class="pb-editor-color-empty">احفظ الصنف أولاً، وبعدها افتحه تعديل حتى تضيف ألوانه.</div>';
      return;
    }

    void loadColors(state.productId);
  }

  function updateRowSwatch(row) {
    const picker = row?.querySelector('.pb-editor-color-picker');
    const swatch = row?.querySelector('.pb-editor-color-swatch');
    if (!picker || !swatch) return;
    swatch.style.setProperty('--pb-editor-color', picker.value || '#d8d0d3');
  }

  function applyAutoColor(row, notify = false) {
    const name = row?.querySelector('.pb-edit-color-name-ar')?.value || '';
    const picker = row?.querySelector('.pb-editor-color-picker');
    const detected = detectColorHex(name);

    if (!picker) return false;

    if (!detected) {
      if (notify) setStatus('ما عرفت هذا الاسم تلقائياً؛ اختار اللون يدوياً.', false);
      return false;
    }

    picker.value = detected;
    row.dataset.manualColor = '0';
    updateRowSwatch(row);
    if (notify) setStatus(`تم اختيار اللون تلقائياً: ${detected}`);
    return true;
  }

  async function saveRow(row) {
    if (!state.productId || !row) return;

    const id = String(row.dataset.pbColorRow || '');
    const nameAr = row.querySelector('.pb-edit-color-name-ar')?.value.trim() || '';
    const nameEn = row.querySelector('.pb-edit-color-name-en')?.value.trim() || nameAr;
    const nameKu = row.querySelector('.pb-edit-color-name-ku')?.value.trim() || nameAr;
    const colorHex = row.querySelector('.pb-editor-color-picker')?.value || '#d8d0d3';
    const isAvailable = row.querySelector('.pb-edit-color-available')?.value !== 'false';
    const imageUrl = row.querySelector('.pb-edit-color-image')?.value.trim() || null;
    const sortOrder = Math.max(0, Number(row.dataset.sortOrder || nextSortOrder()));

    if (!nameAr) {
      setStatus('اكتب اسم اللون بالعربي أولاً.', false);
      row.querySelector('.pb-edit-color-name-ar')?.focus();
      return;
    }

    const payload = {
      product_id: state.productId,
      name_ar: nameAr,
      name_ku: nameKu,
      name_en: nameEn,
      color_hex: colorHex,
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: true,
      is_available: isAvailable,
      updated_at: new Date().toISOString()
    };

    const button = row.querySelector('[data-color-save]');
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري الحفظ...';
    }

    setStatus('جاري حفظ اللون...');

    let result;
    if (isPersistedId(id)) {
      result = await supabaseClient.from('product_colors').update(payload).eq('id', id);
    } else {
      result = await supabaseClient.from('product_colors').insert(payload);
    }

    if (result.error) {
      console.error('PRODUCT COLOR SAVE ERROR', result.error);
      setStatus('فشل حفظ اللون: ' + (result.error.message || result.error), false);
      if (button) {
        button.disabled = false;
        button.textContent = isPersistedId(id) ? 'حفظ اللون' : 'إضافة اللون';
      }
      return;
    }

    await loadColors(state.productId);
    setStatus('تم حفظ اللون ✓');
  }

  async function deleteRow(row) {
    if (!row) return;
    const id = String(row.dataset.pbColorRow || '');

    if (!isPersistedId(id)) {
      row.remove();
      if (!q('#pbEditorColorList .pb-editor-color-row')) {
        q('#pbEditorColorList').innerHTML = '<div class="pb-editor-color-empty">هذا الصنف ما عنده ألوان بعد. اضغط «+ إضافة لون».</div>';
      }
      return;
    }

    if (!confirm('حذف هذا اللون نهائياً؟')) return;

    setStatus('جاري حذف اللون...');
    const { error } = await supabaseClient.from('product_colors').delete().eq('id', id);

    if (error) {
      setStatus('فشل حذف اللون: ' + (error.message || error), false);
      return;
    }

    await loadColors(state.productId);
    setStatus('تم حذف اللون.');
  }

  function addDraftRow() {
    const box = q('#pbEditorColorList');
    if (!box) return;

    box.querySelector('.pb-editor-color-empty')?.remove();

    const draft = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name_ar: '', name_ku: '', name_en: '',
      color_hex: '#d8d0d3',
      is_available: true,
      image_url: '',
      sort_order: nextSortOrder()
    };

    box.insertAdjacentHTML('beforeend', rowHtml(draft));
    const rows = box.querySelectorAll('.pb-editor-color-row');
    const row = rows[rows.length - 1];
    row?.querySelector('.pb-edit-color-name-ar')?.focus();
    setStatus('اكتب اسم اللون؛ لون الدائرة يتغير تلقائياً.');
  }

  function bindEditorEvents() {
    document.addEventListener('input', event => {
      const input = event.target.closest('.pb-edit-color-name-ar');
      if (!input) return;
      const row = input.closest('.pb-editor-color-row');
      if (!row || row.dataset.manualColor === '1') return;
      applyAutoColor(row, false);
    });

    document.addEventListener('change', event => {
      const picker = event.target.closest('.pb-editor-color-picker');
      if (picker) {
        const row = picker.closest('.pb-editor-color-row');
        if (row) row.dataset.manualColor = '1';
        updateRowSwatch(row);
        setStatus('تم تثبيت اختيارك اليدوي لهذا اللون.');
        return;
      }

      const available = event.target.closest('.pb-edit-color-available');
      if (available) {
        available.closest('.pb-editor-color-row')?.classList.toggle('is-unavailable', available.value === 'false');
      }
    });

    document.addEventListener('click', event => {
      if (event.target.closest('#pbEditorAddColor')) {
        event.preventDefault();
        addDraftRow();
        return;
      }

      const auto = event.target.closest('[data-color-auto]');
      if (auto) {
        event.preventDefault();
        applyAutoColor(auto.closest('.pb-editor-color-row'), true);
        return;
      }

      const save = event.target.closest('[data-color-save]');
      if (save) {
        event.preventDefault();
        void saveRow(save.closest('.pb-editor-color-row'));
        return;
      }

      const del = event.target.closest('[data-color-delete]');
      if (del) {
        event.preventDefault();
        void deleteRow(del.closest('.pb-editor-color-row'));
      }
    });
  }

  function hookProductEditor() {
    if (state.hookInstalled) return true;
    if (typeof window.editAdminProduct !== 'function') return false;

    const original = window.editAdminProduct;
    if (original.__pbColorsV2Wrapped) {
      state.hookInstalled = true;
      return true;
    }

    function wrappedEditAdminProduct(productId, ...args) {
      const result = original.call(this, productId, ...args);
      setTimeout(() => injectIntoProductEditor(productId), 0);
      return result;
    }

    wrappedEditAdminProduct.__pbColorsV2Wrapped = true;
    wrappedEditAdminProduct.__pbOriginal = original;
    window.editAdminProduct = wrappedEditAdminProduct;
    state.hookInstalled = true;
    return true;
  }

  function boot() {
    installStyles();
    bindEditorEvents();

    if (hookProductEditor()) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (hookProductEditor() || tries > 120) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.PASHA_COLOR_NAME_TO_HEX = detectColorHex;
})();
