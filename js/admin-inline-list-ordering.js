(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_INLINE_LIST_ORDERING_V1__) return;
  window.__PASHA_INLINE_LIST_ORDERING_V1__ = true;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  let categorySortable = null;
  let productSortable = null;
  let categorySaving = false;
  let productSaving = false;
  let scheduled = false;
  let dragging = false;

  function globalsReady() {
    return (
      typeof supabaseClient !== 'undefined' &&
      typeof adminCategories !== 'undefined' &&
      typeof adminProducts !== 'undefined' &&
      typeof window.Sortable !== 'undefined'
    );
  }

  function installStyle() {
    if (q('#pbInlineListOrderingStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbInlineListOrderingStyle';
    style.textContent = `
      .pb-inline-order-status{
        display:inline-flex;align-items:center;gap:5px;min-height:25px;
        max-width:58%;padding:4px 8px;border-radius:999px;
        border:1px solid var(--pba-border,rgba(47,139,115,.15));
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 6%,var(--pba-surface-strong,#fff));
        color:var(--pba-muted,#6e7b81);font-size:9.5px;font-weight:700;
        line-height:1.35;text-align:start;white-space:normal;
      }
      .pb-inline-order-status[data-state="saving"]{color:var(--pba-primary,#2f8b73)}
      .pb-inline-order-status[data-state="ok"]{color:var(--pba-primary,#2f8b73)}
      .pb-inline-order-status[data-state="error"]{color:#c75d62;border-color:rgba(199,93,98,.28)}
      .pb-inline-order-status .pb-order-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 6px}

      #categoriesContainer .category-row,
      #productsContainer .product-row{
        position:relative;
        transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease,opacity .2s ease;
      }
      #categoriesContainer .category-row[data-pb-order-id],
      #productsContainer .product-row[data-pb-order-id]{
        padding-inline-start:48px!important;
      }

      .pb-list-drag-handle{
        position:absolute;inset-inline-start:8px;top:50%;transform:translateY(-50%);
        width:34px;height:38px;border-radius:11px;
        display:grid;place-items:center;padding:0;margin:0;
        border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 28%,var(--pba-border,rgba(47,139,115,.15)));
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 8%,var(--pba-surface-strong,#fff));
        color:var(--pba-primary,#2f8b73);font-size:20px;font-weight:900;line-height:1;
        cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;
        z-index:2;box-shadow:0 4px 14px rgba(0,0,0,.04);
      }
      .pb-list-drag-handle:active{cursor:grabbing;transform:translateY(-50%) scale(.94)}
      .pb-list-drag-handle::before{content:'⋮⋮';letter-spacing:-5px;transform:translateX(-2px)}
      .pb-list-drag-handle span{display:none}

      .pb-inline-order-ghost{
        opacity:.34!important;
        transform:scale(.985)!important;
        border:1px dashed var(--pba-primary,#2f8b73)!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 9%,var(--pba-surface-strong,#fff))!important;
      }
      .pb-inline-order-chosen{
        box-shadow:0 18px 38px rgba(32,82,69,.16)!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 52%,transparent)!important;
        transform:scale(1.012)!important;
        z-index:5!important;
      }
      .pb-inline-order-drag{
        box-shadow:0 22px 50px rgba(32,82,69,.2)!important;
        transform:rotate(.35deg) scale(1.015)!important;
      }
      body.pb-inline-order-dragging .pb-list-drag-handle{opacity:.72}

      .pb-order-disabled .pb-list-drag-handle{display:none!important}
      .pb-order-field-hidden{display:none!important}

      body.admin-global-dark .pb-list-drag-handle{
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 15%,var(--pba-surface,#101715));
        box-shadow:none;
      }
      body.admin-global-dark .pb-inline-order-status{
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 10%,var(--pba-surface,#101715));
      }

      @media(max-width:640px){
        .pb-inline-order-status{max-width:62%;font-size:8.8px;padding:4px 7px}
        #categoriesContainer .category-row[data-pb-order-id],
        #productsContainer .product-row[data-pb-order-id]{padding-inline-start:43px!important}
        .pb-list-drag-handle{inset-inline-start:5px;width:31px;height:36px;border-radius:10px;font-size:18px}
      }

      @media(prefers-reduced-motion:reduce){
        #categoriesContainer .category-row,
        #productsContainer .product-row{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function text(el) {
    return String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function removeLegacyOrderPanels() {
    qa('details.compact-details').forEach(details => {
      const title = text(q(':scope > summary', details));
      if (title === 'ترتيب الأقسام' || title === 'ترتيب أصناف قسم معيّن') {
        details.remove();
      }
    });
  }

  function hideManualOrderFields() {
    ['c_sort_order', 'nc_sort_order', 'p_sort_order', 'np_sort_order'].forEach(id => {
      const input = document.getElementById(id);
      const field = input?.closest('.field');
      if (field) field.classList.add('pb-order-field-hidden');
    });
  }

  function extractIdFromHandler(row, fnName) {
    const button = row?.querySelector(`[onclick*="${fnName}("]`);
    const raw = String(button?.getAttribute('onclick') || '');
    const match = raw.match(new RegExp(`${fnName}\\(['\"]([^'\"]+)['\"]\\)`));
    return match ? String(match[1]) : '';
  }

  function addHandle(row, id) {
    if (!row || !id) return;
    row.dataset.pbOrderId = id;
    if (q(':scope > .pb-list-drag-handle', row)) return;
    const handle = document.createElement('button');
    handle.className = 'pb-list-drag-handle';
    handle.type = 'button';
    handle.tabIndex = -1;
    handle.setAttribute('aria-label', 'اسحب لتغيير الترتيب');
    handle.innerHTML = '<span>ترتيب</span>';
    row.appendChild(handle);
  }

  function decorateCategoryRows() {
    const container = q('#categoriesContainer');
    if (!container) return;
    qa(':scope > .category-row', container).forEach(row => {
      const id = extractIdFromHandler(row, 'editAdminCategory');
      if (id) addHandle(row, id);
    });
  }

  function activeProductCategoryId() {
    const active = q('[data-admin-category-filter].active');
    return String(active?.dataset?.adminCategoryFilter || '');
  }

  function expectedProductIds(categoryId) {
    try {
      return adminProducts
        .filter(p => String(p?.category_id || '') === String(categoryId))
        .slice()
        .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
        .map(p => String(p.id));
    } catch (_) {
      return [];
    }
  }

  function visibleProductRows() {
    const container = q('#productsContainer');
    return container ? qa(':scope > .product-row', container) : [];
  }

  function productOrderingState() {
    const categoryId = activeProductCategoryId();
    if (!categoryId) {
      return { enabled: false, categoryId: '', reason: 'اختر قسمًا من الفلاتر لترتيب أصنافه بالسحب.' };
    }

    const search = String(q('#adminSearch')?.value || '').trim();
    if (search) {
      return { enabled: false, categoryId, reason: 'امسح البحث حتى يظهر كل أصناف القسم ويصبح الترتيب متاحًا.' };
    }

    const rows = visibleProductRows();
    const ids = rows.map(row => extractIdFromHandler(row, 'editAdminProduct')).filter(Boolean);
    const expected = expectedProductIds(categoryId);

    if (!rows.length || !expected.length) {
      return { enabled: false, categoryId, reason: 'لا توجد أصناف قابلة للترتيب في هذا القسم.' };
    }

    const complete = ids.length === expected.length && expected.every(id => ids.includes(id));
    if (!complete) {
      return { enabled: false, categoryId, reason: 'اختر «الكل» حتى تظهر كل أصناف القسم قبل الترتيب.' };
    }

    return { enabled: true, categoryId, reason: 'اسحب من ⋮⋮ — يتم حفظ الترتيب تلقائيًا.' };
  }

  function decorateProductRows() {
    const state = productOrderingState();
    const container = q('#productsContainer');
    if (!container) return state;

    container.classList.toggle('pb-order-disabled', !state.enabled);
    visibleProductRows().forEach(row => {
      const id = extractIdFromHandler(row, 'editAdminProduct');
      if (id) addHandle(row, id);
    });

    return state;
  }

  function panelHeaderFor(containerId) {
    return q(`#${containerId}`)?.closest('.panel')?.querySelector('.panel-header') || null;
  }

  function ensureStatus(containerId, id) {
    const header = panelHeaderFor(containerId);
    if (!header) return null;
    let status = q(`#${id}`, header);
    if (!status) {
      status = document.createElement('span');
      status.id = id;
      status.className = 'pb-inline-order-status';
      status.setAttribute('aria-live', 'polite');
      status.innerHTML = '<i class="pb-order-dot"></i><span></span>';
      header.appendChild(status);
    }
    return status;
  }

  function setStatus(status, message, state = '') {
    if (!status) return;
    status.dataset.state = state;
    const span = q('span', status);
    if (span && span.textContent !== message) span.textContent = message;
  }

  function updateCategoryMeta(ids) {
    const container = q('#categoriesContainer');
    if (!container) return;
    ids.forEach((id, index) => {
      const row = q(`:scope > .category-row[data-pb-order-id="${CSS.escape(id)}"]`, container);
      const meta = q('.category-meta', row || container);
      if (!meta) return;
      const current = String(meta.textContent || '');
      const next = /الترتيب\s*\d+/.test(current)
        ? current.replace(/الترتيب\s*\d+/, `الترتيب ${index + 1}`)
        : current;
      if (next !== current) meta.textContent = next;
    });
  }

  function mutateLocalOrder(collection, ids) {
    try {
      const positions = new Map(ids.map((id, index) => [String(id), index + 1]));
      collection.forEach(item => {
        const next = positions.get(String(item?.id));
        if (next != null) item.sort_order = next;
      });
    } catch (_) {}
  }

  async function saveCategoryOrderInline() {
    if (categorySaving) return;
    const container = q('#categoriesContainer');
    const status = ensureStatus('categoriesContainer', 'pbCategoryInlineOrderStatus');
    if (!container) return;

    const ids = qa(':scope > .category-row[data-pb-order-id]', container)
      .map(row => String(row.dataset.pbOrderId || ''))
      .filter(Boolean);
    if (ids.length < 2) return;

    categorySaving = true;
    categorySortable?.option('disabled', true);
    setStatus(status, 'جاري حفظ ترتيب الأقسام...', 'saving');

    try {
      const result = await supabaseClient.rpc('reorder_categories', { p_ids: ids });
      if (result.error) throw result.error;
      mutateLocalOrder(adminCategories, ids);
      updateCategoryMeta(ids);
      setStatus(status, 'تم حفظ الترتيب ✓', 'ok');
      window.dispatchEvent(new CustomEvent('restbr:inline-category-order-saved', { detail: { ids } }));
    } catch (error) {
      console.error('INLINE CATEGORY ORDER ERROR:', error);
      setStatus(status, 'فشل الحفظ — رجّع الصفحة وحاول مرة ثانية.', 'error');
      try { if (typeof loadAdminDashboard === 'function') await loadAdminDashboard(); } catch (_) {}
    } finally {
      categorySaving = false;
      categorySortable?.option('disabled', false);
      scheduleProcess();
    }
  }

  async function saveProductOrderInline(categoryId) {
    if (productSaving) return;
    const container = q('#productsContainer');
    const status = ensureStatus('productsContainer', 'pbProductInlineOrderStatus');
    if (!container || !categoryId) return;

    const ids = qa(':scope > .product-row[data-pb-order-id]', container)
      .map(row => String(row.dataset.pbOrderId || ''))
      .filter(Boolean);
    const expected = expectedProductIds(categoryId);
    if (!ids.length || ids.length !== expected.length || !expected.every(id => ids.includes(id))) {
      setStatus(status, 'الترتيب متاح فقط عند عرض كل أصناف القسم.', 'error');
      scheduleProcess();
      return;
    }

    productSaving = true;
    productSortable?.option('disabled', true);
    setStatus(status, 'جاري حفظ ترتيب الأصناف...', 'saving');

    try {
      const result = await supabaseClient.rpc('reorder_products', {
        p_category_id: categoryId,
        p_ids: ids
      });
      if (result.error) throw result.error;
      mutateLocalOrder(adminProducts, ids);
      setStatus(status, 'تم حفظ الترتيب ✓', 'ok');
      window.dispatchEvent(new CustomEvent('restbr:inline-product-order-saved', {
        detail: { categoryId, ids }
      }));
    } catch (error) {
      console.error('INLINE PRODUCT ORDER ERROR:', error);
      setStatus(status, 'فشل الحفظ — رجّع الصفحة وحاول مرة ثانية.', 'error');
      try { if (typeof loadAdminDashboard === 'function') await loadAdminDashboard(); } catch (_) {}
    } finally {
      productSaving = false;
      scheduleProcess();
    }
  }

  function sortableOptions(kind, onEnd) {
    return {
      animation: 220,
      handle: '.pb-list-drag-handle',
      draggable: kind === 'category'
        ? '.category-row[data-pb-order-id]'
        : '.product-row[data-pb-order-id]',
      ghostClass: 'pb-inline-order-ghost',
      chosenClass: 'pb-inline-order-chosen',
      dragClass: 'pb-inline-order-drag',
      delay: 110,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      fallbackTolerance: 5,
      scroll: true,
      scrollSensitivity: 80,
      scrollSpeed: 12,
      onStart: () => {
        dragging = true;
        document.body.classList.add('pb-inline-order-dragging');
        try { navigator.vibrate?.(10); } catch (_) {}
      },
      onEnd: event => {
        dragging = false;
        document.body.classList.remove('pb-inline-order-dragging');
        if (event.oldIndex === event.newIndex) return;
        try { navigator.vibrate?.(14); } catch (_) {}
        onEnd();
      }
    };
  }

  function setupCategorySortable() {
    const container = q('#categoriesContainer');
    if (!container || !window.Sortable) return;
    if (!categorySortable) {
      categorySortable = new Sortable(container, sortableOptions('category', saveCategoryOrderInline));
    }
    categorySortable.option('disabled', categorySaving);
    const status = ensureStatus('categoriesContainer', 'pbCategoryInlineOrderStatus');
    if (!categorySaving && status?.dataset.state !== 'error') {
      setStatus(status, 'اسحب من ⋮⋮ — حفظ تلقائي', status?.dataset.state === 'ok' ? 'ok' : '');
    }
  }

  function setupProductSortable(state) {
    const container = q('#productsContainer');
    if (!container || !window.Sortable) return;
    if (!productSortable) {
      productSortable = new Sortable(container, sortableOptions('product', () => {
        const latest = productOrderingState();
        if (latest.enabled) saveProductOrderInline(latest.categoryId);
      }));
    }
    productSortable.option('disabled', !state.enabled || productSaving);

    const status = ensureStatus('productsContainer', 'pbProductInlineOrderStatus');
    if (!productSaving && status?.dataset.state !== 'error') {
      setStatus(status, state.reason, state.enabled ? (status?.dataset.state === 'ok' ? 'ok' : '') : '');
    }
  }

  function process() {
    if (dragging) return;
    installStyle();
    removeLegacyOrderPanels();
    hideManualOrderFields();
    if (!globalsReady()) return;
    decorateCategoryRows();
    const productState = decorateProductRows();
    setupCategorySortable();
    setupProductSortable(productState);
  }

  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      process();
    });
  }

  function bind() {
    const observer = new MutationObserver(mutations => {
      if (dragging) return;
      if (mutations.some(m => m.addedNodes.length || m.removedNodes.length)) scheduleProcess();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-admin-category-filter],[data-product-filter],[data-admin-view]')) {
        setTimeout(scheduleProcess, 0);
      }
    }, true);

    q('#adminSearch')?.addEventListener('input', () => setTimeout(scheduleProcess, 0));
    window.addEventListener('restbr:ready', scheduleProcess);
  }

  function boot() {
    installStyle();
    removeLegacyOrderPanels();
    hideManualOrderFields();
    bind();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (globalsReady()) {
        clearInterval(timer);
        process();
      } else if (attempts > 120) {
        clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
