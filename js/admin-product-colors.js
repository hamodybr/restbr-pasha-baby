(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_PRODUCT_COLORS_V1__) return;
  window.__PASHA_ADMIN_PRODUCT_COLORS_V1__ = true;

  const PAGE_SIZE = 1000;
  const state = { products: [], colors: [], editingId: null };
  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nameOf = row => row?.name_ar || row?.name_ku || row?.name_en || 'بدون اسم';

  async function fetchAll(table, select, order = 'sort_order', ascending = true) {
    const rows = [];
    let from = 0;
    while (true) {
      let query = supabaseClient.from(table).select(select).range(from, from + PAGE_SIZE - 1);
      if (order) query = query.order(order, { ascending });
      const { data, error } = await query;
      if (error) throw error;
      const page = data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from > 50000) throw new Error('عدد السجلات أكبر من حد الأمان للوحة الإدارة.');
    }
    return rows;
  }

  function installStyles() {
    if (q('#pbAdminColorsStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminColorsStyles';
    style.textContent = `
      #productColorsSettingsPanel .pb-colors-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #productColorsSettingsPanel .pb-color-field{display:flex;flex-direction:column;gap:6px}
      #productColorsSettingsPanel .pb-color-field.full{grid-column:1/-1}
      #productColorsSettingsPanel label{font-size:11px;color:#b8afa4;font-weight:800}
      #productColorsSettingsPanel input,#productColorsSettingsPanel select{width:100%;height:42px;border:1px solid rgba(216,169,88,.28);border-radius:11px;background:#0d0b09;color:#fff;padding:0 11px;outline:none;box-sizing:border-box}
      #productColorsSettingsPanel input[type="color"]{padding:4px;cursor:pointer}
      .pb-color-form-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
      .pb-color-form-actions button{height:42px;padding:0 16px;border-radius:11px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-weight:900}
      #pbColorSaveBtn{flex:1 1 180px;border:0;background:linear-gradient(135deg,#e2b55e,#ad7426);color:#100b05}
      #pbColorCancelEditBtn{display:none}
      #pbColorStatus{min-height:18px;margin-top:8px;font-size:11px}
      #pbColorList{display:flex;flex-direction:column;gap:8px;margin-top:14px}
      .pb-color-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.025)}
      .pb-color-swatch{width:34px;height:34px;border:2px solid rgba(255,255,255,.8);border-radius:50%;background:var(--pb-admin-color,#d8d0d3);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
      .pb-color-row.off{opacity:.52}
      .pb-color-row strong{display:block;color:#efbd62;font-size:12px;margin-bottom:3px}
      .pb-color-row small{display:block;color:#a79d90;font-size:10px;line-height:1.5}
      .pb-color-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .pb-color-actions button{height:31px;padding:0 8px;border-radius:9px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-size:10px;font-weight:800}
      .pb-color-actions .danger{color:#ffaaa4;border-color:rgba(248,113,113,.25)}
      .pb-color-empty{padding:18px;text-align:center;color:#8f867a;border:1px dashed rgba(255,255,255,.08);border-radius:12px}
      @media(max-width:640px){#productColorsSettingsPanel .pb-colors-grid{grid-template-columns:1fr}.pb-color-row{grid-template-columns:auto 1fr}.pb-color-actions{grid-column:1/-1;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function panelHtml() {
    return `
      <details id="productColorsSettingsPanel" class="settings-accordion">
        <summary>
          <span class="settings-accordion-icon">🎨</span>
          <span class="settings-accordion-title">
            <strong>ألوان المنتجات</strong>
            <small>أضف الألوان المتوفرة لكل صنف، والزبون يختار اللون قبل إضافته للسلة.</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>
        <div class="settings-accordion-body">
          <div class="settings-element" style="margin-top:10px">
            <div class="pb-colors-grid">
              <div class="pb-color-field full">
                <label for="pbColorProduct">الصنف</label>
                <select id="pbColorProduct"></select>
              </div>
              <div class="pb-color-field">
                <label for="pbColorNameAr">اسم اللون عربي *</label>
                <input id="pbColorNameAr" type="text" maxlength="80" placeholder="مثال: وردي">
              </div>
              <div class="pb-color-field">
                <label for="pbColorNameKu">اسم اللون كوردي</label>
                <input id="pbColorNameKu" type="text" maxlength="80">
              </div>
              <div class="pb-color-field">
                <label for="pbColorNameEn">اسم اللون English</label>
                <input id="pbColorNameEn" type="text" maxlength="80" placeholder="Pink">
              </div>
              <div class="pb-color-field">
                <label for="pbColorHex">لون الدائرة</label>
                <input id="pbColorHex" type="color" value="#f2a9bd">
              </div>
              <div class="pb-color-field">
                <label for="pbColorSort">الترتيب</label>
                <input id="pbColorSort" type="number" min="0" step="1" value="1">
              </div>
              <div class="pb-color-field">
                <label for="pbColorAvailable">الحالة</label>
                <select id="pbColorAvailable">
                  <option value="true">متوفر</option>
                  <option value="false">غير متوفر</option>
                </select>
              </div>
              <div class="pb-color-field full">
                <label for="pbColorImageUrl">صورة خاصة لهذا اللون (اختياري)</label>
                <input id="pbColorImageUrl" type="url" placeholder="https://...">
              </div>
            </div>
            <div class="pb-color-form-actions">
              <button id="pbColorSaveBtn" type="button">إضافة اللون</button>
              <button id="pbColorCancelEditBtn" type="button">إلغاء التعديل</button>
            </div>
            <div id="pbColorStatus"></div>
          </div>
          <div class="settings-element">
            <div class="settings-element-head"><div><strong>ألوان الصنف المحدد</strong><small>يمكنك تعديل اللون، إيقاف توفره مؤقتاً أو حذفه.</small></div></div>
            <div id="pbColorList"><div class="pb-color-empty">اختر صنفاً لعرض ألوانه.</div></div>
          </div>
        </div>
      </details>`;
  }

  function insertPanel() {
    if (q('#productColorsSettingsPanel')) return q('#productColorsSettingsPanel');
    const wrap = q('#viewTools .settings-clean-wrap');
    if (!wrap) return null;
    const template = document.createElement('template');
    template.innerHTML = panelHtml().trim();
    const panel = template.content.firstElementChild;
    const discounts = q('#discountsSettingsPanel');
    if (discounts) discounts.after(panel);
    else wrap.prepend(panel);
    return panel;
  }

  function status(message = '', ok = true) {
    const el = q('#pbColorStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
  }

  function selectedProductId() {
    return String(q('#pbColorProduct')?.value || '');
  }

  function colorsForSelectedProduct() {
    const productId = selectedProductId();
    return state.colors
      .filter(row => String(row.product_id) === productId)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }

  function nextSortOrder() {
    const rows = colorsForSelectedProduct();
    return rows.length ? Math.max(...rows.map(row => Number(row.sort_order || 0))) + 1 : 1;
  }

  function renderProducts() {
    const select = q('#pbColorProduct');
    if (!select) return;
    const current = select.value;
    select.innerHTML = state.products.map(row => `<option value="${esc(row.id)}">${esc(nameOf(row))}</option>`).join('');
    if (current && state.products.some(row => String(row.id) === String(current))) select.value = current;
    if (!select.value && state.products[0]) select.value = state.products[0].id;
    q('#pbColorSort').value = String(nextSortOrder());
  }

  function renderList() {
    const box = q('#pbColorList');
    if (!box) return;
    const rows = colorsForSelectedProduct();

    if (!rows.length) {
      box.innerHTML = '<div class="pb-color-empty">لا توجد ألوان لهذا الصنف بعد.</div>';
      return;
    }

    box.innerHTML = rows.map(row => `
      <div class="pb-color-row ${row.is_available === false || row.is_active === false ? 'off' : ''}">
        <span class="pb-color-swatch" style="--pb-admin-color:${esc(row.color_hex || '#d8d0d3')}"></span>
        <div>
          <strong>${esc(row.name_ar || row.name_en || 'لون')}</strong>
          <small>${esc(row.name_en || '')}${row.name_ku ? ` • ${esc(row.name_ku)}` : ''}</small>
          <small>${row.is_available === false ? 'غير متوفر للزبون' : 'متوفر'} • ترتيب ${Number(row.sort_order || 0)}</small>
        </div>
        <div class="pb-color-actions">
          <button type="button" data-color-edit="${esc(row.id)}">تعديل</button>
          <button type="button" data-color-toggle="${esc(row.id)}">${row.is_available === false ? 'توفير' : 'إيقاف'}</button>
          <button type="button" class="danger" data-color-delete="${esc(row.id)}">حذف</button>
        </div>
      </div>`).join('');
  }

  function clearForm() {
    state.editingId = null;
    q('#pbColorNameAr').value = '';
    q('#pbColorNameKu').value = '';
    q('#pbColorNameEn').value = '';
    q('#pbColorHex').value = '#f2a9bd';
    q('#pbColorAvailable').value = 'true';
    q('#pbColorImageUrl').value = '';
    q('#pbColorSort').value = String(nextSortOrder());
    q('#pbColorSaveBtn').textContent = 'إضافة اللون';
    q('#pbColorCancelEditBtn').style.display = 'none';
  }

  function editColor(id) {
    const row = state.colors.find(item => String(item.id) === String(id));
    if (!row) return;
    state.editingId = row.id;
    q('#pbColorProduct').value = row.product_id;
    q('#pbColorNameAr').value = row.name_ar || '';
    q('#pbColorNameKu').value = row.name_ku || '';
    q('#pbColorNameEn').value = row.name_en || '';
    q('#pbColorHex').value = /^#[0-9a-f]{6}$/i.test(String(row.color_hex || '')) ? row.color_hex : '#d8d0d3';
    q('#pbColorSort').value = String(Number(row.sort_order || 0));
    q('#pbColorAvailable').value = row.is_available === false ? 'false' : 'true';
    q('#pbColorImageUrl').value = row.image_url || '';
    q('#pbColorSaveBtn').textContent = 'حفظ تعديل اللون';
    q('#pbColorCancelEditBtn').style.display = '';
    renderList();
  }

  async function loadData() {
    const [products, colors] = await Promise.all([
      fetchAll('products', 'id,name_ar,name_ku,name_en,sort_order,is_visible,is_active', 'sort_order', true),
      fetchAll('product_colors', '*', 'sort_order', true)
    ]);

    state.products = products.filter(row => row.is_active !== false && row.is_visible !== false);
    state.colors = colors;
    renderProducts();
    renderList();
  }

  async function saveColor() {
    const productId = selectedProductId();
    const nameAr = q('#pbColorNameAr')?.value.trim() || '';
    const nameKu = q('#pbColorNameKu')?.value.trim() || nameAr;
    const nameEn = q('#pbColorNameEn')?.value.trim() || nameAr;
    const colorHex = q('#pbColorHex')?.value || '#d8d0d3';
    const sortOrder = Math.max(0, Number(q('#pbColorSort')?.value || 0));
    const isAvailable = q('#pbColorAvailable')?.value !== 'false';
    const imageUrl = q('#pbColorImageUrl')?.value.trim() || null;

    if (!productId) {
      status('اختر الصنف أولاً.', false);
      return;
    }
    if (!nameAr) {
      status('اكتب اسم اللون بالعربي.', false);
      return;
    }

    const payload = {
      product_id: productId,
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

    status('جاري حفظ اللون...');

    let result;
    if (state.editingId) {
      result = await supabaseClient.from('product_colors').update(payload).eq('id', state.editingId);
    } else {
      result = await supabaseClient.from('product_colors').insert(payload);
    }

    if (result.error) {
      console.error('PRODUCT COLOR SAVE ERROR', result.error);
      status('فشل حفظ اللون: ' + (result.error.message || result.error), false);
      return;
    }

    await loadData();
    clearForm();
    status('تم حفظ اللون ✓');
  }

  async function toggleColor(id) {
    const row = state.colors.find(item => String(item.id) === String(id));
    if (!row) return;

    const { error } = await supabaseClient
      .from('product_colors')
      .update({ is_available: row.is_available === false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      status('فشل تغيير توفر اللون: ' + (error.message || error), false);
      return;
    }

    await loadData();
    status(row.is_available === false ? 'صار اللون متوفر ✓' : 'تم إيقاف اللون مؤقتاً.');
  }

  async function deleteColor(id) {
    if (!confirm('حذف هذا اللون نهائياً؟')) return;
    const { error } = await supabaseClient.from('product_colors').delete().eq('id', id);
    if (error) {
      status('فشل حذف اللون: ' + (error.message || error), false);
      return;
    }
    if (String(state.editingId) === String(id)) clearForm();
    await loadData();
    status('تم حذف اللون.');
  }

  function bind(panel) {
    q('#pbColorProduct')?.addEventListener('change', () => {
      clearForm();
      renderList();
    });
    q('#pbColorSaveBtn')?.addEventListener('click', () => void saveColor());
    q('#pbColorCancelEditBtn')?.addEventListener('click', clearForm);

    panel.addEventListener('toggle', () => {
      if (panel.open) void refresh();
    });

    panel.addEventListener('click', event => {
      const edit = event.target.closest('[data-color-edit]');
      if (edit) {
        editColor(edit.dataset.colorEdit);
        return;
      }
      const toggle = event.target.closest('[data-color-toggle]');
      if (toggle) {
        void toggleColor(toggle.dataset.colorToggle);
        return;
      }
      const del = event.target.closest('[data-color-delete]');
      if (del) void deleteColor(del.dataset.colorDelete);
    });
  }

  async function refresh() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    try {
      await loadData();
      status('');
    } catch (error) {
      console.error('PRODUCT COLORS LOAD ERROR', error);
      status('تعذر تحميل ألوان المنتجات: ' + (error.message || error), false);
    }
  }

  function start() {
    installStyles();
    const panel = insertPanel();
    if (!panel) return;
    bind(panel);

    const authObserver = new MutationObserver(() => {
      if (!document.body.classList.contains('auth-locked')) void refresh();
    });
    authObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    if (!document.body.classList.contains('auth-locked')) void refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
