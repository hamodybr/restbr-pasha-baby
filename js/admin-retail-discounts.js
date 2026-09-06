(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V1__) return;
  window.__PASHA_ADMIN_RETAIL_DISCOUNTS_V1__ = true;

  const PAGE_SIZE = 1000;
  const state = { categories: [], products: [], discounts: [] };
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
    if (q('#pbAdminDiscountStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminDiscountStyles';
    style.textContent = `
      #discountsSettingsPanel .pb-discount-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #discountsSettingsPanel .pb-discount-field{display:flex;flex-direction:column;gap:6px}
      #discountsSettingsPanel .pb-discount-field.full{grid-column:1/-1}
      #discountsSettingsPanel label{font-size:11px;color:#b8afa4;font-weight:800}
      #discountsSettingsPanel input,#discountsSettingsPanel select{width:100%;height:42px;border:1px solid rgba(216,169,88,.28);border-radius:11px;background:#0d0b09;color:#fff;padding:0 11px;outline:none;box-sizing:border-box}
      #discountsSettingsPanel input:focus,#discountsSettingsPanel select:focus{border-color:#d8a958}
      #pbDiscountCreateBtn{width:100%;height:44px;margin-top:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#e2b55e,#ad7426);color:#100b05;font-weight:900}
      #pbDiscountStatus{min-height:18px;margin-top:8px;font-size:11px}
      #pbDiscountList{display:flex;flex-direction:column;gap:8px;margin-top:14px}
      .pb-discount-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.025)}
      .pb-discount-row.off{opacity:.55}
      .pb-discount-row strong{display:block;color:#efbd62;font-size:14px;margin-bottom:4px}
      .pb-discount-row small{display:block;color:#a79d90;font-size:10px;line-height:1.6}
      .pb-discount-actions{display:flex;gap:6px;flex-wrap:wrap}
      .pb-discount-actions button{height:31px;padding:0 9px;border-radius:9px;border:1px solid rgba(216,169,88,.24);background:#17130f;color:#ddd;font-size:10px;font-weight:800}
      .pb-discount-actions .danger{color:#ffaaa4;border-color:rgba(248,113,113,.25)}
      .pb-discount-empty{padding:18px;text-align:center;color:#8f867a;border:1px dashed rgba(255,255,255,.08);border-radius:12px}
      @media(max-width:640px){#discountsSettingsPanel .pb-discount-grid{grid-template-columns:1fr}.pb-discount-row{grid-template-columns:1fr}.pb-discount-actions{justify-content:flex-start}}
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
            <small>خصم على المتجر كامل أو قسم أو صنف، مع وقت بداية ونهاية اختياري.</small>
          </span>
          <span class="settings-chevron">⌄</span>
        </summary>
        <div class="settings-accordion-body">
          <div class="settings-element" style="margin-top:10px">
            <div class="settings-element-head"><div><strong>إنشاء خصم</strong><small>السعر الأصلي يبقى محفوظاً، والخصم ينعكس تلقائياً في العرض والسلة.</small></div></div>
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
          <div class="settings-element">
            <div class="settings-element-head"><div><strong>الخصومات الحالية</strong><small>الأولوية: خصم الصنف، ثم القسم، ثم المتجر. عند تكرار نفس المستوى يعتمد أعلى خصم.</small></div></div>
            <div id="pbDiscountList"><div class="pb-discount-empty">جاري التحميل...</div></div>
          </div>
        </div>
      </details>`;
  }

  function insertPanel() {
    if (q('#discountsSettingsPanel')) return q('#discountsSettingsPanel');
    const wrap = q('#viewTools .settings-clean-wrap');
    if (!wrap) return null;
    const template = document.createElement('template');
    template.innerHTML = panelHtml().trim();
    const panel = template.content.firstElementChild;
    wrap.prepend(panel);
    return panel;
  }

  function status(message = '', ok = true) {
    const el = q('#pbDiscountStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = ok ? '#baf3d7' : '#fecaca';
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
      box.innerHTML = '<div class="pb-discount-empty">لا توجد خصومات حالياً.</div>';
      return;
    }

    box.innerHTML = state.discounts.map(row => `
      <div class="pb-discount-row ${row.is_active ? '' : 'off'}" data-discount-id="${esc(row.id)}">
        <div>
          <strong>-${Number(row.discount_percent)}%</strong>
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
      fetchAll('categories', 'id,name_ar,name_ku,name_en,sort_order,is_visible', 'sort_order', true),
      fetchAll('products', 'id,category_id,name_ar,name_ku,name_en,sort_order,is_visible', 'sort_order', true)
    ]);

    state.categories = categories.filter(row => row.is_visible !== false);
    state.products = products.filter(row => row.is_visible !== false);
  }

  async function loadDiscounts() {
    state.discounts = await fetchAll('discounts', '*', 'created_at', false);
    renderList();
  }

  function dateInputToIso(id) {
    const raw = q(id)?.value || '';
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
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
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

  function bind(panel) {
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

  async function refresh() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    try {
      await loadReferenceData();
      renderTargets();
      await loadDiscounts();
      status('');
    } catch (error) {
      console.error('RETAIL DISCOUNTS LOAD ERROR', error);
      status('تعذر تحميل نظام الخصومات: ' + (error.message || error), false);
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
