(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V4__) return;
  window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V4__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  const state = {
    categories: [],
    products: [],
    discounts: [],
    refreshing: null
  };

  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const nameOf = row => row?.name_ar || row?.name || 'بدون اسم';
  const money = value => `${Math.max(0, Number(value || 0)).toLocaleString('en-US')} د.ع`;

  async function fetchAll(table, select = '*', order = 'sort_order', ascending = true) {
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
    if (q('#pbAdminDiscountStylesV4')) return;

    const style = document.createElement('style');
    style.id = 'pbAdminDiscountStylesV4';
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
      #discountsSettingsPanel .pb-discount-box+.pb-discount-box{margin-top:10px}
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
      #pbDiscountList{display:flex;flex-direction:column;gap:8px;margin-top:8px}
      .pb-discount-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.025)}
      .pb-discount-row.off{opacity:.55}
      .pb-discount-row strong{display:block;color:#efbd62;font-size:15px;margin-bottom:3px}
      .pb-discount-row small{display:block;color:#a79d90;font-size:10px;line-height:1.55}
      .pb-discount-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .pb-discount-actions button{height:31px;padding:0 9px;border-radius:9px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-size:10px;font-weight:800}
      .pb-discount-actions .danger{color:#ffaaa4;border-color:rgba(248,113,113,.25)}
      .pb-discount-empty{padding:16px;text-align:center;color:#8f867a;border:1px dashed rgba(255,255,255,.08);border-radius:11px;font-size:11px}

      body.admin-global-light #discountsSettingsPanel{background:#fffaf3!important;border-color:rgba(112,79,34,.16)!important;color:#30281f!important}
      body.admin-global-light #discountsSettingsPanel>summary{background:linear-gradient(180deg,#fffdf8,#fff8ee)!important}
      body.admin-global-light #discountsSettingsPanel .settings-accordion-title strong{color:#b9791f!important}
      body.admin-global-light #discountsSettingsPanel .settings-accordion-title small,
      body.admin-global-light #discountsSettingsPanel .pb-discount-head small,
      body.admin-global-light #pbDiscountStatus{color:#817568!important}
      body.admin-global-light #discountsSettingsPanel .pb-discount-box,
      body.admin-global-light .pb-discount-row{background:#fffdf9!important;border-color:rgba(112,79,34,.16)!important;color:#30281f!important;box-shadow:none!important}
      body.admin-global-light #discountsSettingsPanel .pb-discount-head strong{color:#33291f!important}
      body.admin-global-light #discountsSettingsPanel label{color:#776b5f!important}
      body.admin-global-light #discountsSettingsPanel input,
      body.admin-global-light #discountsSettingsPanel select{background:#fff!important;color:#30281f!important;-webkit-text-fill-color:#30281f!important;border-color:rgba(112,79,34,.22)!important;color-scheme:light!important}
      body.admin-global-light .pb-discount-row strong{color:#b9791f!important}
      body.admin-global-light .pb-discount-row small{color:#817568!important}
      body.admin-global-light .pb-discount-actions button{background:#fff7e9!important;color:#6f4b1b!important;border-color:rgba(112,79,34,.2)!important}
      body.admin-global-light .pb-discount-actions .danger{background:#fff1f0!important;color:#a63731!important;border-color:rgba(166,55,49,.22)!important}
      body.admin-global-light .pb-discount-empty{color:#817568!important;border-color:rgba(112,79,34,.16)!important}

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
            <small>خصم مبلغ ثابت على المتجر كامل أو قسم كامل أو صنف واحد.</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>
        <div class="settings-accordion-body">
          <div class="pb-discount-box">
            <div class="pb-discount-head">
              <strong>إنشاء خصم ثابت</strong>
              <small>مثال: اكتب 5,000 وسيتم تنزيل 5,000 د.ع من سعر كل صنف يشمله الخصم.</small>
            </div>
            <div class="pb-discount-grid">
              <div class="pb-discount-field">
                <label for="pbDiscountAmount">قيمة الخصم (د.ع)</label>
                <input id="pbDiscountAmount" type="number" min="1" step="250" inputmode="numeric" placeholder="مثال: 5000">
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
          <div class="pb-discount-box">
            <div class="pb-discount-head">
              <strong>الخصومات الحالية</strong>
              <small>الأولوية: الصنف ثم القسم ثم المتجر. إذا تكرر نفس المستوى يعتمد أكبر مبلغ خصم.</small>
            </div>
            <div id="pbDiscountList"><div class="pb-discount-empty">جاري التحميل...</div></div>
          </div>
        </div>
      </details>`;
  }

  function ensureUi() {
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

    bindPanel(panel);
    renderTargets();
    return panel;
  }

  function status(message = '', ok = true) {
    const el = q('#pbDiscountStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok
      ? (document.body.classList.contains('admin-global-light') ? '#568d70' : '#9ccfb7')
      : '#b5463f';
  }

  function scopeLabel(row) {
    if (row.scope_type === 'restaurant') return 'المتجر كامل';
    const source = row.scope_type === 'category' ? state.categories : state.products;
    const target = source.find(item => String(item.id) === String(row.target_id));
    return row.scope_type === 'category' ? `قسم: ${nameOf(target)}` : `صنف: ${nameOf(target)}`;
  }

  function dateLabel(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
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
    select.innerHTML = rows.map(row => `<option value="${esc(row.id)}">${esc(nameOf(row))}</option>`).join('');
  }

  function renderList() {
    const box = q('#pbDiscountList');
    if (!box) return;

    if (!state.discounts.length) {
      box.innerHTML = '<div class="pb-discount-empty">لا توجد خصومات ثابتة حالياً.</div>';
      return;
    }

    box.innerHTML = state.discounts.map(row => `
      <div class="pb-discount-row ${row.is_active ? '' : 'off'}" data-discount-id="${esc(row.id)}">
        <div>
          <strong>−${esc(money(row.discount_amount))}</strong>
          <small>${esc(scopeLabel(row))} • ${row.is_active ? 'مفعّل' : 'متوقف'}</small>
          <small>${esc(timingLabel(row))}</small>
        </div>
        <div class="pb-discount-actions">
          <button type="button" data-discount-toggle="${esc(row.id)}">${row.is_active ? 'إيقاف' : 'تفعيل'}</button>
          <button class="danger" type="button" data-discount-delete="${esc(row.id)}">حذف</button>
        </div>
      </div>`).join('');
  }

  async function refresh() {
    if (state.refreshing) return state.refreshing;

    state.refreshing = (async () => {
      try {
        status('جاري تحديث الخصومات...');
        const [categories, products, discounts] = await Promise.all([
          fetchAll('categories', 'id,name_ar,sort_order', 'sort_order', true),
          fetchAll('products', 'id,name_ar,sort_order', 'sort_order', true),
          fetchAll('discounts', 'id,discount_amount,discount_percent,price_mode,scope_type,target_id,is_active,starts_at,ends_at,created_at', 'created_at', false)
        ]);

        state.categories = categories;
        state.products = products;
        state.discounts = discounts.filter(row => Number(row.discount_amount || 0) > 0);
        renderTargets();
        renderList();
        status('تم تحديث الخصومات.');
        return true;
      } catch (error) {
        console.error('PASHA FIXED DISCOUNT ADMIN REFRESH:', error);
        status(`تعذر تحميل الخصومات: ${error?.message || error}`, false);
        return false;
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
    const amount = Math.round(Number(q('#pbDiscountAmount')?.value));
    const scope = q('#pbDiscountScope')?.value || 'restaurant';
    const targetId = scope === 'restaurant' ? null : (q('#pbDiscountTarget')?.value || null);
    const startsAt = dateInputToIso('#pbDiscountStartsAt');
    const endsAt = dateInputToIso('#pbDiscountEndsAt');

    if (!Number.isFinite(amount) || amount <= 0) {
      status('اكتب مبلغ خصم صحيح أكبر من صفر.', false);
      return;
    }

    if (scope !== 'restaurant' && !targetId) {
      status('اختر القسم أو الصنف الذي سيطبق عليه الخصم.', false);
      return;
    }

    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      status('وقت انتهاء الخصم يجب أن يكون بعد وقت البداية.', false);
      return;
    }

    const button = q('#pbDiscountCreateBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري الحفظ...';
    }

    try {
      status('جاري حفظ الخصم...');
      const { error } = await supabaseClient.from('discounts').insert({
        discount_amount: amount,
        discount_percent: 0,
        price_mode: 'both',
        scope_type: scope,
        target_id: targetId,
        is_active: true,
        starts_at: startsAt,
        ends_at: endsAt
      });

      if (error) throw error;

      if (q('#pbDiscountAmount')) q('#pbDiscountAmount').value = '';
      if (q('#pbDiscountStartsAt')) q('#pbDiscountStartsAt').value = '';
      if (q('#pbDiscountEndsAt')) q('#pbDiscountEndsAt').value = '';
      await refresh();
      status(`تمت إضافة خصم بقيمة ${money(amount)} ✓`);
    } catch (error) {
      console.error('PASHA FIXED DISCOUNT CREATE:', error);
      status(`فشل حفظ الخصم: ${error?.message || error}`, false);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'إضافة الخصم';
      }
    }
  }

  async function toggleDiscount(id) {
    const row = state.discounts.find(item => String(item.id) === String(id));
    if (!row) return;

    status('جاري تحديث الخصم...');
    const { error } = await supabaseClient
      .from('discounts')
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      status(`فشل تحديث الخصم: ${error.message}`, false);
      return;
    }

    await refresh();
    status('تم تحديث حالة الخصم.');
  }

  async function deleteDiscount(id) {
    const row = state.discounts.find(item => String(item.id) === String(id));
    if (!row) return;

    if (!window.confirm(`حذف خصم ${money(row.discount_amount)}؟`)) return;

    status('جاري حذف الخصم...');
    const { error } = await supabaseClient
      .from('discounts')
      .delete()
      .eq('id', row.id);

    if (error) {
      status(`فشل حذف الخصم: ${error.message}`, false);
      return;
    }

    await refresh();
    status('تم حذف الخصم.');
  }

  function openDiscounts() {
    const panel = ensureUi();
    if (!panel) return;
    panel.open = true;
    void refresh();
    requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function bindPanel(panel) {
    if (!panel || panel.dataset.pbDiscountBound === '1') return;
    panel.dataset.pbDiscountBound = '1';

    panel.addEventListener('change', event => {
      if (event.target.closest('#pbDiscountScope')) renderTargets();
    });

    panel.addEventListener('click', event => {
      if (event.target.closest('#pbDiscountCreateBtn')) {
        event.preventDefault();
        void createDiscount();
        return;
      }

      const toggle = event.target.closest('[data-discount-toggle]');
      if (toggle) {
        event.preventDefault();
        void toggleDiscount(toggle.dataset.discountToggle);
        return;
      }

      const del = event.target.closest('[data-discount-delete]');
      if (del) {
        event.preventDefault();
        void deleteDiscount(del.dataset.discountDelete);
      }
    });

    panel.addEventListener('toggle', () => {
      if (panel.open) void refresh();
    });
  }

  function installResilience() {
    if (document.documentElement.dataset.pbFixedDiscountDelegation === '1') return;
    document.documentElement.dataset.pbFixedDiscountDelegation = '1';

    document.addEventListener('click', event => {
      const quick = event.target.closest('#pbDiscountQuickBtn');
      if (quick) {
        event.preventDefault();
        event.stopPropagation();
        openDiscounts();
        return;
      }

      if (event.target.closest('[data-admin-nav="products"],[data-go-view="products"]')) {
        setTimeout(ensureUi, 40);
        setTimeout(ensureUi, 220);
      }
    }, true);
  }

  function boot() {
    installStyles();
    ensureUi();
    installResilience();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ready = ensureUi();
      if (ready || tries > 50) clearInterval(timer);
    }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.PASHA_OPEN_DISCOUNTS = openDiscounts;
})();
