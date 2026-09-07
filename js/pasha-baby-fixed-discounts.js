(() => {
  if (window.__PASHA_BABY_FIXED_DISCOUNTS_V1__) return;
  window.__PASHA_BABY_FIXED_DISCOUNTS_V1__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  let cachedDiscounts = [];
  let loadPromise = null;
  let boundaryTimer = null;
  let channel = null;
  let decorationFrame = 0;

  const client = () =>
    typeof supabaseClient !== 'undefined' && supabaseClient
      ? supabaseClient
      : null;

  const amountOf = row => {
    const amount = Number(row?.discount_amount || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };

  function discountIsLive(row, now = Date.now()) {
    if (!row || row.is_active === false || amountOf(row) <= 0) return false;
    const start = row.starts_at ? Date.parse(row.starts_at) : null;
    const end = row.ends_at ? Date.parse(row.ends_at) : null;
    if (Number.isFinite(start) && now < start) return false;
    if (Number.isFinite(end) && now >= end) return false;
    return true;
  }

  function effectiveDiscount(discounts, product) {
    const productId = String(product?.id || '');
    const categoryId = String(product?.category?.id || '');
    const live = (discounts || []).filter(row => discountIsLive(row));
    const scopes = [
      live.filter(row => row.scope_type === 'product' && String(row.target_id || '') === productId),
      live.filter(row => row.scope_type === 'category' && String(row.target_id || '') === categoryId),
      live.filter(row => row.scope_type === 'restaurant')
    ];

    for (const rows of scopes) {
      if (!rows.length) continue;
      return rows.reduce((best, row) => amountOf(row) > amountOf(best) ? row : best);
    }
    return null;
  }

  function originalPrice(option) {
    const candidates = [option?.__retailOriginalPrice, option?.originalPrice, option?.price];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function fixedPrice(original, amount) {
    const value = Number(original);
    const discount = Number(amount);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (!Number.isFinite(discount) || discount <= 0) return value;
    return Math.max(0, Math.round(value - discount));
  }

  function applyToData(discounts = cachedDiscounts) {
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return false;

    DB.products.forEach(product => {
      const discount = effectiveDiscount(discounts, product);
      const amount = amountOf(discount);

      product.discountAmount = amount;
      product.discountPercent = 0;
      product.discountScope = discount?.scope_type || '';
      product.discountId = discount?.id || '';

      if (product.badges && product.__retailBaseOffer !== undefined) {
        product.badges.offer = product.__retailBaseOffer === true;
      }

      (product.options || []).forEach(option => {
        const original = originalPrice(option);
        option.__retailOriginalPrice = original;
        option.originalPrice = original;
        option.price = fixedPrice(original, amount);
        option._discountPercent = 0;
        option._discountAmount = amount;
      });
    });

    window.RESTBR_FIXED_DISCOUNTS_READY = true;
    return true;
  }

  function ensureActionRow(card, action) {
    if (!action) return null;
    let row = action.closest('.pb-product-action-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'pb-product-action-row';
      action.parentNode?.insertBefore(row, action);
      row.appendChild(action);
    }

    const preview = row.querySelector('[data-pb-color-preview]');
    if (preview) row.parentNode?.insertBefore(preview, row);
    return row;
  }

  function decorateCards() {
    decorationFrame = 0;
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    const byId = new Map(DB.products.map(product => [String(product.id), product]));

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = byId.get(String(card.dataset.productCard || ''));
      if (!product) return;

      card.querySelectorAll('.pb-discount-badge,.sm-live-discount').forEach(node => node.remove());

      const amount = Math.max(0, Number(product.discountAmount || 0));
      const action = card.querySelector('.sm-direct-add,.sm-choose-options');
      const row = ensureActionRow(card, action);
      let chip = row?.querySelector(':scope > .pb-fixed-discount-chip') || null;

      if (amount > 0 && row && action) {
        if (!chip) {
          chip = document.createElement('span');
          chip.className = 'pb-fixed-discount-chip';
          row.appendChild(chip);
        }
        chip.textContent = 'خصم';
        chip.title = 'يوجد خصم على هذا الصنف';
        chip.setAttribute('aria-label', 'خصم');
      } else {
        chip?.remove();
      }

      [...card.querySelectorAll('.sm-option')].forEach((optionRow, index) => {
        const option = (product.options || [])[index];
        const buy = optionRow.querySelector('.sm-option-buy');
        if (!option || !buy) return;

        const original = Number(option.originalPrice ?? option.__retailOriginalPrice ?? option.price ?? 0);
        const current = Number(option.price ?? 0);
        if (amount > 0 && Number.isFinite(original) && original > current && current >= 0) {
          buy.innerHTML = `
            <span class="pb-price-stack">
              <span class="pb-old-price">${Math.max(0, original).toLocaleString('en-US')} د.ع</span>
              <b class="sm-price">${Math.max(0, current).toLocaleString('en-US')} د.ع</b>
            </span>`;
        }
      });
    });
  }

  function scheduleDecoration() {
    if (decorationFrame) return;
    decorationFrame = requestAnimationFrame(decorateCards);
  }

  function publish({ render = true, detail = {} } = {}) {
    if (!applyToData()) return false;
    if (render && typeof window.render === 'function') window.render();
    scheduleDecoration();
    window.dispatchEvent(new CustomEvent('restbr:prices-updated', {
      detail: { fixedDiscounts: true, ...detail }
    }));
    window.dispatchEvent(new CustomEvent('restbr:fixed-discounts-ready', {
      detail: { discounts: cachedDiscounts }
    }));
    return true;
  }

  function scheduleBoundary() {
    clearTimeout(boundaryTimer);
    boundaryTimer = null;

    const now = Date.now();
    const future = [];
    cachedDiscounts.forEach(row => {
      for (const raw of [row.starts_at, row.ends_at]) {
        if (!raw) continue;
        const stamp = Date.parse(raw);
        if (Number.isFinite(stamp) && stamp > now) future.push(stamp);
      }
    });

    if (!future.length) return;
    const next = Math.min(...future);
    const delay = Math.min(2147483000, Math.max(100, next - now + 120));
    boundaryTimer = setTimeout(() => {
      publish({ render: true, detail: { boundary: true } });
      scheduleBoundary();
    }, delay);
  }

  async function fetchDiscounts() {
    const sb = client();
    if (!sb) return [];

    const rows = [];
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from('discounts')
        .select('id,discount_amount,discount_percent,price_mode,scope_type,target_id,is_active,starts_at,ends_at,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from >= MAX_ROWS) throw new Error(`discounts exceeded ${MAX_ROWS} row safety limit`);
    }

    return rows.filter(row => amountOf(row) > 0);
  }

  async function reload({ render = true } = {}) {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        cachedDiscounts = await fetchDiscounts();
        publish({ render, detail: { refreshed: true } });
        scheduleBoundary();
        return true;
      } catch (error) {
        console.error('PASHA FIXED DISCOUNTS LOAD ERROR:', error);
        return false;
      }
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  function subscribe() {
    const sb = client();
    if (!sb || channel) return;

    channel = sb
      .channel('pasha-fixed-discounts-v1')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'discounts'
      }, () => void reload({ render: true }))
      .subscribe();
  }

  function observeMenu() {
    const menu = document.getElementById('smMenu');
    if (!menu || menu.dataset.pbFixedDiscountObserver === '1') return;
    menu.dataset.pbFixedDiscountObserver = '1';
    new MutationObserver(scheduleDecoration).observe(menu, { childList: true, subtree: true });
  }

  function start() {
    observeMenu();
    subscribe();
    void reload({ render: true });
  }

  window.addEventListener('restbr:catalog-expanded', () => void reload({ render: true }));
  window.addEventListener('restbr:commerce-ready', () => {
    if (cachedDiscounts.length) publish({ render: true, detail: { afterCommerce: true } });
  });
  window.addEventListener('online', () => void reload({ render: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reload({ render: false });
  });

  window.addEventListener('restbr:ready', start, { once: true });
  if (window.RESTBR_DB?.products) start();
})();
