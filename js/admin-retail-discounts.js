(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V2__) return;
  window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V2__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  const state = {
    categories: [],
    products: [],
    discounts: [],
    bound: false,
    refreshing: null
  };

  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const nameOf = row => row?.name_ar || row?.name_ku || row?.name_en || 'بدون اسم';

  async function fetchAll(table, select, order = 'sort_order', ascending = true) {
    const rows = [];
    let from = 0;

    while (true) {
      let query = supabaseClient
        .from(table)
        .select(select)
        .range(from, from + PAGE_SIZE - 1);

      if (order) query = query.order(order, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;

      from += PAGE_SIZE;
      if (from >= MAX_ROWS) throw new Error(`عدد سجلات ${table} أكبر من حد الأمان.`);
    }

    return rows;
  }

  function installStyles() {
    if (q('#pbAdminDiscountStylesV2')) return;

    const style = document.createElement('style');
    style.id = 'pbAdminDiscountStylesV2';
    style.textContent = `
      #pbDiscountQuickBtn{display:inline-flex;align-items:center;justify-content:center;gap:6px}
      #discountsSettingsPanel{margin:0 0 16px;border:1px solid rgba(216,169,88,.2);border-radius:16px;background:rgba(216,169,88,.035);overflow:hidden}
      #discountsSettingsPanel>summary{display:flex;align-items:center;gap:10px;padding:14px;cursor:pointer;list-style:none;user-select:none}
      #discountsSettingsPanel>summary::-webkit-details-marker{display:none}
      #discountsSettingsPanel .settings-accordion-icon{font-size:20px}
      #discountsSettingsPanel .settings-accordion-title{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
      #discountsSettingsPanel .settings-accordion-title strong{color:#e2b55e;font-size:14px}
      #discountsSettingsPanel .settings-accordion-title small{color:#999188;font-size:10px;line-height:1.5}
      #discountsSettingsPanel .settings-chevron{color:#c99b55;transition:transform .2s ease}
      #discountsSettingsPanel[open] .settings-chevron{transform:rotate(180deg)}
      #discountsSettingsPanel .settings-accordion-body{padding:0 14px 14px}
      #discountsSettingsPanel .pb-discount-box{padding:12px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(0,0,0,.16)}
      #discountsSettingsPanel .pb-discount-head{margin-bottom:10px}
      #discountsSettingsPanel .pb-discount-head strong{display:block;color:#f0e5d4;font-size:12px;margin-bottom:3px}
      #discountsSettingsPanel .pb-discount-head small{display:block;color:#968f87;font-size:10px;line-height:1.55}
      #discountsSettingsPanel .pb-discount-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #discountsSettingsPanel .pb-discount-field{display:flex;flex-direction:column;gap:5px}
      #discountsSettingsPanel .pb-discount-field.full{grid-column:1/-1}
      #discountsSettingsPanel label{font-size:10px;color:#b8afa4;font-weight:800}
      #discountsSettingsPanel input,#discountsSettingsPanel select{width:100%;height:41px;border:1px solid rgba(216,169,88,.24);border-radius:10px;background:#0b0907;color:#fff;padding:0 10px;outline:none;box-sizing:border-box}
      #discountsSettingsPanel input:focus,#discountsSettingsPanel select:focus{border-color:#d8a958}
      #pbDiscountCreateBtn{width:100%;height:43px;margin-top:11px;border:0;border-radius:11px;background:linear-gradient(135deg,#e2b55e,#ad7426);color:#100b05;font-weight:900}
      #pbDiscountStatus{min-height:17px;margin-top:7px;font-size:10px;color:#9b9288}
      #pbDiscountListWrap{margin-top:10px}
      #pbDiscountList{display:flex;flex-direction:column;gap:8px;margin-top:8px}
      .pb-discount-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.025)}
      .pb-discount-row.off{opacity:.55}
      .pb-discount-row strong{display:block;color:#efbd62;font-size:15px;margin-bottom:3px}
      .pb-discount-row small{display:block;color:#a79d90;font-size:10px;line-height:1.55}
      .pb-discount-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .pb-discount-actions button{height:31px;padding:0 9px;border-radius:9px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-size:10px;font-weight:800}
      .pb-discount-actions .danger{color:#ffaaa4;border-color:rgba(248,113,113,.25)}
      .pb-discount-empty{padding:16px;text-align:center;color:#8f867a;border:1px dashed rgba(255,255,255,.08);border-radius:11px;font-size:11px}
      @media(max-width:640px){
        #discountsSettingsPanel .pb-discount-grid{grid-template-columns:1fr}
        #discountsSettingsPanel .pb-discount-field.full{grid-column:auto}
        .pb-discount-row{grid-template-columns:1fr}
        .pb-discount-actions{justify-content:flex-start}
      }
    `;
    document.head.appendChild(style);
  }

  function panelHtml() {
    return `
      <details id="discountsSettingsPanel" class="settings-accordion">
        <summary>
          <span class="settings-accordion-icon">🏷️</span>
          <span class="settings-accordion-title">
            <strong>الخصومات</strong>
            <small>خصم على المتجر كامل أو قسم كامل أو صنف واحد.</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>
        <div class="settings-accordion-body">
          <div class="pb-discount-box">
            <div class="pb-discount-head">
              <strong>إنشاء خصم</strong>
              <small>السعر الأصلي يبقى محفوظ، والسعر بعد الخصم يظهر تلقائياً للزبون وفي السلة.</small>
            </div>
            <div class="pb-discount-grid">
              <div class="pb-discount-field">
                <label for="pbDiscountPercent">نسبة الخصم %</label>
                <input id="pbDiscountPercent" type="number" min="1" max="100" step="1" inputmode="decimal" placeholder="مثال: 20">
              </div>
              <div class="pb-discount-field">
                <label for="pbDiscountScope">مكان الخصم</label>
                <select id="pbDiscountScope">
                  <option value="restaurant">المتجر كامل</option>
                  <option value="category">قسم كامل</option>
                  <option value="product">صنف واحد</option>
                </select>
              </div>
              <div class="pb-discount-field full" id="pbDiscountTargetWrap" hidden>
                <label for="pbDiscountTarget">اختيار الهدف</label>
                <select id="pbDiscountTarget"></select>
              </div>
              <div class="pb-discount-field">
                <label for="pbDiscountStartsAt">يبدأ (اختياري)</label>
                <input id="pbDiscountStartsAt" type="datetime-local">
              </div>
              <div class="pb-discount-field">
                <label for="pbDiscountEndsAt">ينتهي (اختياري)</label>
                <input id="pbDiscountEndsAt" type="datetime-local">
              </div>
            </div>
            <button id="pbDiscountCreateBtn" type="button">إضافة الخصم</button>
            <div id="pbDiscountStatus"></div>
          </div>
          <div id="pbDiscountListWrap" class="pb-discount-box">
            <div class="pb-discount-head">
              <strong>الخصومات الحالية</strong>
              <small>الأولوية: الصنف ثم القسم ثم المتجر. إذا تكرر نفس المستوى يعتمد أعلى خصم.</small>
            </div>
            <div id="pbDiscountList"><div class="pb-discount-empty">جاري التحميل...</div></div>
          </div>
        </div>
      </details>`;
  }

  function installProductsEntry() {
    installStyles();

    const view = q('#viewProducts');
    const toolbar = view?.querySelector('.compact-toolbar');
    if (!view || !toolbar) return null;

    let button = q('#pbDiscountQuickBtn');
    if (!button) {
      button = document.createElement('button');
      button.id = 'pbDiscountQuickBtn';
      button.className = 'btn btn-dark';
      button.type = 'button';
      button.innerHTML = '<span aria-hidden="true">🏷️</span><span>الخصومات</span>';
      toolbar.appendChild(button);
    }

    let panel = q('#discountsSettingsPanel');
    if (!panel) {
      const template = document.createElement('template');
      template.innerHTML = panelHtml().trim();
      panel = template.content.firstElementChild;

      const filters = q('#productFilterStrip');
      if (filters && filters.parentElement === view) filters.before(panel);
      else toolbar.insertAdjacentElement('afterend', panel);
    }

    bind(panel, button);
    return panel;
  }

  function status(message = '', ok = true) {
    const el = q('#pbDiscountStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#9ccfb7' : '#fecaca';
  }

  function scopeLabel(row) {
    if (row.scope_type === 'restaurant') return 'المتجر كامل';
    const source = row.scope_type === 'category' ? state.categories : state.products;
    const target = source.find(item => String(item.id) === String(row.target_id));
    if (row.scope_type === 'category') return `قسم: ${nameOf(target)}`;
    return `صنف: ${nameOf(target)}`;
  }

  function dateLabel(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ar-IQ', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch (_) {
      return String(value);
    }
  }

  function timingLabel(row) {
    const parts = [];
    if (row.starts_at) parts.push(`من ${dateLabel(row.starts_at)}`);
    if (row.ends_at) parts.push(`إلى ${dateLabel(row.ends_at)}`);
    return parts.length ? parts.join(' • ') : 'بدون مدة محددة';
  }

  function renderTargets() {
    const scope = q('#pbDiscountScope')?.value || 'restaurant';
    const wrap = q('#pbDiscountTargetWrap');
    const select = q('#pbDiscountTarget');
    if (!wrap || !select) return;

    wrap.hidden = scope === 'restaurant';
    if (scope === 'restaurant') {
      select.innerHTML = '';
      return;
    }

    const rows = scope === 'category' ? state.categories : state.products;
    select.innerHTML = rows
      .map(row => `<option value="${esc(row.id)}">${esc(nameOf(row))}</option>`)
      .join('');
  }

  function renderList() {
    const box = q('#pbDiscountList');
    if (!box) return;

    if (!state.discounts.length) {
      box.innerHTML = '<div class="pb-discount-empty">لا توجد خصومات حالياً.</div>';
      return;
    }

    box.innerHTML = state.discounts.map(row => `
      <div class="pb-discount-row ${row.is_active ? '' : 'off'}" data-discount-id="${esc(row.id)}">
        <div>
          <strong>-${Number(row.discount_percent || 0)}%</strong>
          <small>${esc(scopeLabel(row))} • ${row.is_active ? 'مفعّل' : 'متوقف'}</small>
          <small>${esc(timingLabel(row))}</small>
        </div>
        <div class="pb-discount-actions">
          <button type="button" data-discount-toggle="${esc(row.id)}">${row.is_active ? 'إيقاف' : 'تفعيل'}</button>
          <button type="button" class="danger" data-discount-delete="${esc(row.id)}">حذف</button>
        </div>
      </div>`).join('');
  }

  async function loadReferenceData() {
    const [categories, products] = await Promise.all([
      fetchAll('categories', 'id,name_ar,name_ku,name_en,sort_order,is_visible,is_active', 'sort_order', true),
      fetchAll('products', 'id,category_id,name_ar,name_ku,name_en,sort_order,is_visible,is_active', 'sort_order', true)
    ]);

    state.categories = categories.filter(row => row.is_visible !== false && row.is_active !== false);
    state.products = products.filter(row => row.is_visible !== false && row.is_active !== false);
    renderTargets();
  }

  async function loadDiscounts() {
    state.discounts = await fetchAll('discounts', '*', 'created_at', false);
    renderList();
  }

  async function refresh() {
    if (state.refreshing) return state.refreshing;

    state.refreshing = (async () => {
      status('جاري تحديث الخصومات...');
      try {
        await Promise.all([loadReferenceData(), loadDiscounts()]);
        status(`تم تحميل ${state.discounts.length} خصم.`);
      } catch (error) {
        console.error('RETAIL DISCOUNTS LOAD ERROR', error);
        status('فشل تحميل الخصومات: ' + (error?.message || error), false);
      }
    })().finally(() => {
      state.refreshing = null;
    });

    return state.refreshing;
  }

  function dateInputToIso(selector) {
    const raw = q(selector)?.value || '';
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  async function createDiscount() {
    const percent = Number(q('#pbDiscountPercent')?.value);
    const scope = q('#pbDiscountScope')?.value || 'restaurant';
    const targetId = scope === 'restaurant' ? null : (q('#pbDiscountTarget')?.value || null);
    const startsAt = dateInputToIso('#pbDiscountStartsAt');
    const endsAt = dateInputToIso('#pbDiscountEndsAt');

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      status('اكتب نسبة صحيحة من 1 إلى 100.', false);
      return;
    }

    if (scope !== 'restaurant' && !targetId) {
      status('اختر القسم أو الصنف.', false);
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      status('وقت النهاية لازم يكون بعد وقت البداية.', false);
      return;
    }

    const button = q('#pbDiscountCreateBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري الحفظ...';
    }

    status('جاري حفظ الخصم...');

    const { error } = await supabaseClient.from('discounts').insert({
      discount_percent: percent,
      price_mode: 'both',
      scope_type: scope,
      target_id: targetId,
      is_active: true,
      starts_at: startsAt,
      ends_at: endsAt
    });

    if (button) {
      button.disabled = false;
      button.textContent = 'إضافة الخصم';
    }

    if (error) {
      console.error('RETAIL DISCOUNT CREATE ERROR', error);
      status('فشل حفظ الخصم: ' + (error.message || error), false);
      return;
    }

    q('#pbDiscountPercent').value = '';
    q('#pbDiscountStartsAt').value = '';
    q('#pbDiscountEndsAt').value = '';
    await loadDiscounts();
    status('تم حفظ الخصم ✓');
  }

  async function toggleDiscount(id) {
    const row = state.discounts.find(item => String(item.id) === String(id));
    if (!row) return;

    const { error } = await supabaseClient
      .from('discounts')
      .update({
        is_active: !row.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      status('فشل تغيير حالة الخصم: ' + (error.message || error), false);
      return;
    }

    await loadDiscounts();
    status(row.is_active ? 'تم إيقاف الخصم.' : 'تم تفعيل الخصم ✓');
  }

  async function deleteDiscount(id) {
    if (!confirm('حذف هذا الخصم نهائياً؟')) return;

    const { error } = await supabaseClient.from('discounts').delete().eq('id', id);
    if (error) {
      status('فشل حذف الخصم: ' + (error.message || error), false);
      return;
    }

    await loadDiscounts();
    status('تم حذف الخصم.');
  }

  function openDiscounts() {
    const panel = installProductsEntry();
    if (!panel) return;

    panel.open = true;
    void refresh();
    requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function bind(panel, button) {
    if (!panel || state.bound) return;
    state.bound = true;

    button?.addEventListener('click', event => {
      event.preventDefault();
      openDiscounts();
    });

    q('#pbDiscountScope')?.addEventListener('change', renderTargets);
    q('#pbDiscountCreateBtn')?.addEventListener('click', () => void createDiscount());

    panel.addEventListener('toggle', () => {
      if (panel.open) void refresh();
    });

    panel.addEventListener('click', event => {
      const toggle = event.target.closest('[data-discount-toggle]');
      if (toggle) {
        void toggleDiscount(toggle.dataset.discountToggle);
        return;
      }

      const del = event.target.closest('[data-discount-delete]');
      if (del) void deleteDiscount(del.dataset.discountDelete);
    });
  }

  function boot() {
    installStyles();

    if (installProductsEntry()) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (installProductsEntry() || tries > 120) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.PASHA_OPEN_DISCOUNTS = openDiscounts;
})();
