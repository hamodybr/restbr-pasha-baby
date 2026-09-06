(() => {
  if (window.__PASHA_BABY_COMMERCE_V1__) return;
  window.__PASHA_BABY_COMMERCE_V1__ = true;

  const PAGE_SIZE = 1000;
  let commerceReady = false;
  let currentProduct = null;
  let selectedOptionIndex = null;
  let selectedColorId = '';
  let observer = null;

  const lang = () => window.RESTBR_LANG
    ? window.RESTBR_LANG()
    : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');

  const txt = value => {
    if (!value) return '';
    const l = lang();
    return String(value[l] || value.ar || value.en || '').trim();
  };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const money = value => {
    const n = Number(value || 0);
    return n.toLocaleString('en-US') + ' ' + (lang() === 'en' ? 'IQD' : 'د.ع');
  };

  function t(ar, ku, en) {
    return lang() === 'en' ? en : lang() === 'ku' ? ku : ar;
  }

  async function fetchAll(table, { select = '*', order = null, ascending = true, activeOnly = false } = {}) {
    const rows = [];
    let from = 0;

    while (true) {
      let query = supabaseClient
        .from(table)
        .select(select)
        .range(from, from + PAGE_SIZE - 1);

      if (activeOnly) query = query.eq('is_active', true);
      if (order) query = query.order(order, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;

      if (from > 50000) throw new Error(`${table} exceeded storefront safety limit`);
    }

    return rows;
  }

  function discountIsLive(row, now = Date.now()) {
    if (!row || row.is_active === false) return false;

    const start = row.starts_at ? Date.parse(row.starts_at) : null;
    const end = row.ends_at ? Date.parse(row.ends_at) : null;

    if (Number.isFinite(start) && now < start) return false;
    if (Number.isFinite(end) && now >= end) return false;

    return true;
  }

  function effectiveDiscount(discounts, product) {
    const productId = String(product?.id || '');
    const categoryId = String(product?.category?.id || '');

    const live = discounts.filter(row => discountIsLive(row));

    const scopes = [
      live.filter(row => row.scope_type === 'product' && String(row.target_id || '') === productId),
      live.filter(row => row.scope_type === 'category' && String(row.target_id || '') === categoryId),
      live.filter(row => row.scope_type === 'restaurant')
    ];

    for (const rows of scopes) {
      if (!rows.length) continue;
      return rows.reduce((best, row) =>
        Number(row.discount_percent || 0) > Number(best.discount_percent || 0) ? row : best
      );
    }

    return null;
  }

  function discountedPrice(original, percent) {
    const value = Number(original);
    const p = Number(percent);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (!Number.isFinite(p) || p <= 0) return value;
    return Math.max(0, Math.round(value * (100 - Math.min(100, p)) / 100));
  }

  function normalizeColor(row) {
    return {
      id: row.id,
      ar: row.name_ar || '',
      ku: row.name_ku || row.name_ar || '',
      en: row.name_en || row.name_ar || '',
      hex: /^#[0-9a-f]{6}$/i.test(String(row.color_hex || '')) ? row.color_hex : '#d8d0d3',
      image: row.image_url || '',
      order: Number(row.sort_order || 0),
      isAvailable: row.is_available !== false
    };
  }

  async function loadCommerceData() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    try {
      const [discounts, colorRows] = await Promise.all([
        fetchAll('discounts', { order: 'created_at', ascending: false, activeOnly: true }),
        fetchAll('product_colors', { order: 'sort_order', ascending: true, activeOnly: true })
      ]);

      const colorsByProduct = new Map();
      colorRows.forEach(row => {
        const key = String(row.product_id || '');
        if (!key) return;
        if (!colorsByProduct.has(key)) colorsByProduct.set(key, []);
        colorsByProduct.get(key).push(normalizeColor(row));
      });

      DB.products.forEach(product => {
        const discount = effectiveDiscount(discounts, product);
        const percent = Math.max(0, Math.min(100, Number(discount?.discount_percent || 0)));

        if (product.__retailBaseOffer === undefined) {
          product.__retailBaseOffer = product.badges?.offer === true;
        }

        product.discountPercent = percent;
        product.discountScope = discount?.scope_type || '';
        product.colors = (colorsByProduct.get(String(product.id)) || [])
          .sort((a, b) => a.order - b.order);

        if (product.badges) {
          product.badges.offer = product.__retailBaseOffer || percent > 0;
        }

        (product.options || []).forEach(option => {
          if (option.__retailOriginalPrice === undefined) {
            option.__retailOriginalPrice = Number(option.price || 0);
          }

          const original = Number(option.__retailOriginalPrice || 0);
          option.originalPrice = original;
          option.price = discountedPrice(original, percent);
        });
      });

      commerceReady = true;
      window.RESTBR_COMMERCE_READY = true;

      if (typeof window.render === 'function') {
        window.render();
      }

      decorateCards();
      window.dispatchEvent(new CustomEvent('restbr:prices-updated'));
      window.dispatchEvent(new CustomEvent('restbr:commerce-ready', { detail: { discounts, colors: colorRows } }));
    } catch (error) {
      console.error('PASHA RETAIL COMMERCE LOAD ERROR:', error);
    }
  }

  function colorPreviewHtml(product) {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    if (!colors.length) return '';

    const shown = colors.slice(0, 6);
    return `
      <div class="pb-color-preview" data-pb-color-preview>
        <span class="pb-color-preview-label">${esc(t('الألوان', 'رەنگ', 'Colors'))}</span>
        ${shown.map(color => `
          <i class="pb-color-dot ${color.isAvailable ? '' : 'is-unavailable'}"
             style="--pb-color:${esc(color.hex)}"
             title="${esc(txt(color))}"></i>
        `).join('')}
        ${colors.length > shown.length ? `<span class="pb-color-more">+${colors.length - shown.length}</span>` : ''}
      </div>`;
  }

  function decorateCards() {
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = DB.products.find(p => String(p.id) === String(card.dataset.productCard));
      if (!product) return;

      card.querySelectorAll('.pb-discount-badge,[data-pb-color-preview]').forEach(node => node.remove());

      if (Number(product.discountPercent) > 0) {
        card.insertAdjacentHTML(
          'beforeend',
          `<span class="pb-discount-badge">-${Math.round(Number(product.discountPercent))}%</span>`
        );
      }

      const rows = [...card.querySelectorAll('.sm-option')];
      rows.forEach((row, index) => {
        const option = (product.options || [])[index];
        if (!option) return;

        const buy = row.querySelector('.sm-option-buy');
        if (!buy) return;

        const original = Number(option.originalPrice ?? option.price ?? 0);
        const current = Number(option.price ?? 0);

        if (original > current && current >= 0) {
          buy.innerHTML = `
            <span class="pb-price-stack">
              <span class="pb-old-price">${esc(money(original))}</span>
              <b class="sm-price">${esc(money(current))}</b>
            </span>`;
        }
      });

      const info = card.querySelector('.sm-info');
      const action = card.querySelector('.sm-direct-add,.sm-choose-options');

      if (info && action && Array.isArray(product.colors) && product.colors.length) {
        action.insertAdjacentHTML('beforebegin', colorPreviewHtml(product));
        action.dataset.retailColors = '1';

        if (action.classList.contains('sm-direct-add')) {
          const label = action.querySelector('b');
          if (label) label.textContent = t('اختيار اللون', 'رەنگ هەڵبژێرە', 'Choose color');
        }
      }
    });
  }

  function ensureChooser() {
    if (document.getElementById('pbCommerceSheet')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="pbCommerceBackdrop" class="pb-commerce-backdrop"></div>
      <section id="pbCommerceSheet" class="pb-commerce-sheet" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="pb-commerce-handle"></div>
        <div class="pb-commerce-head">
          <button id="pbCommerceClose" class="pb-commerce-close" type="button" aria-label="Close">×</button>
          <h3 id="pbCommerceTitle"></h3>
          <span></span>
        </div>
        <div id="pbCommerceBody" class="pb-commerce-body"></div>
        <button id="pbCommerceAdd" class="pb-commerce-add" type="button"></button>
      </section>`);

    document.getElementById('pbCommerceClose').addEventListener('click', closeChooser);
    document.getElementById('pbCommerceBackdrop').addEventListener('click', closeChooser);
    document.getElementById('pbCommerceAdd').addEventListener('click', confirmChoice);

    document.getElementById('pbCommerceBody').addEventListener('click', event => {
      const optionButton = event.target.closest('[data-pb-option-index]');
      if (optionButton) {
        selectedOptionIndex = Number(optionButton.dataset.pbOptionIndex);
        renderChooserBody();
        return;
      }

      const colorButton = event.target.closest('[data-pb-color-id]');
      if (colorButton && !colorButton.disabled) {
        selectedColorId = String(colorButton.dataset.pbColorId || '');
        renderChooserBody();
      }
    });
  }

  function renderChooserBody() {
    if (!currentProduct) return;

    const options = currentProduct.options || [];
    const colors = currentProduct.colors || [];
    const body = document.getElementById('pbCommerceBody');
    const add = document.getElementById('pbCommerceAdd');

    const optionSection = options.length > 1 ? `
      <div class="pb-choice-section">
        <div class="pb-choice-section-title">${esc(t('اختار النوع', 'جۆر هەڵبژێرە', 'Choose an option'))}</div>
        <div class="pb-option-grid">
          ${options.map((option, index) => `
            <button class="pb-option-choice ${selectedOptionIndex === index ? 'selected' : ''}" type="button" data-pb-option-index="${index}">
              <span>${esc(txt(option) || txt(currentProduct.name))}</span>
              <b>${esc(money(option.price))}</b>
            </button>`).join('')}
        </div>
      </div>` : '';

    const colorSection = `
      <div class="pb-choice-section">
        <div class="pb-choice-section-title">${esc(t('اختار اللون', 'رەنگ هەڵبژێرە', 'Choose a color'))}</div>
        <div class="pb-color-grid">
          ${colors.map(color => `
            <button class="pb-color-choice ${selectedColorId === String(color.id) ? 'selected' : ''}" type="button"
                    data-pb-color-id="${esc(color.id)}" ${color.isAvailable ? '' : 'disabled'}>
              <i style="--pb-color:${esc(color.hex)}"></i>
              <span>${esc(txt(color))}${color.isAvailable ? '' : ` — ${esc(t('غير متوفر', 'بەردەست نییە', 'Unavailable'))}`}</span>
            </button>`).join('')}
        </div>
      </div>`;

    body.innerHTML = optionSection + colorSection;

    const ready = Number.isInteger(selectedOptionIndex) && !!selectedColorId;
    add.disabled = !ready;
    add.textContent = t('إضافة للسلة', 'زیادکردن بۆ سەبەتە', 'Add to cart');
  }

  function openChooser(product) {
    ensureChooser();
    currentProduct = product;
    selectedOptionIndex = (product.options || []).length === 1 ? 0 : null;
    selectedColorId = '';

    document.getElementById('pbCommerceTitle').textContent = txt(product.name);
    renderChooserBody();

    document.getElementById('pbCommerceBackdrop').classList.add('open');
    const sheet = document.getElementById('pbCommerceSheet');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeChooser() {
    document.getElementById('pbCommerceBackdrop')?.classList.remove('open');
    const sheet = document.getElementById('pbCommerceSheet');
    sheet?.classList.remove('open');
    sheet?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedOptionIndex = null;
    selectedColorId = '';
  }

  function composeOption(product, option, color) {
    const compose = (locale, colorPrefix) => {
      const optionName = String(option?.[locale] || option?.ar || '').trim();
      const productName = String(product?.name?.[locale] || product?.name?.ar || '').trim();
      const colorName = String(color?.[locale] || color?.ar || '').trim();
      const parts = [];
      if (optionName && optionName !== productName) parts.push(optionName);
      parts.push(`${colorPrefix}: ${colorName}`);
      return parts.join(' • ');
    };

    return {
      ...option,
      ar: compose('ar', 'اللون'),
      ku: compose('ku', 'رەنگ'),
      en: compose('en', 'Color')
    };
  }

  function addSelectedToExistingCart(product, optionIndex, color) {
    const options = product.options || [];
    const option = options[optionIndex];
    if (!option || !color) return;

    const originalLength = options.length;
    const colorIndex = Math.max(0, (product.colors || []).findIndex(item => String(item.id) === String(color.id)));
    const syntheticIndex = originalLength + 1 + (colorIndex * 1000) + Math.max(0, optionIndex);
    const synthetic = composeOption(product, option, color);
    const originalImage = product.image;

    options[syntheticIndex] = synthetic;
    if (color.image) product.image = color.image;

    const proxy = document.createElement('button');
    proxy.type = 'button';
    proxy.className = 'sm-direct-add';
    proxy.dataset.productId = String(product.id);
    proxy.dataset.optionIndex = String(syntheticIndex);
    proxy.dataset.retailBypass = '1';
    proxy.style.display = 'none';
    document.body.appendChild(proxy);

    proxy.click();
    proxy.remove();

    options.length = originalLength;
    product.image = originalImage;
  }

  function confirmChoice() {
    if (!currentProduct || !Number.isInteger(selectedOptionIndex) || !selectedColorId) return;

    const color = (currentProduct.colors || []).find(item =>
      String(item.id) === String(selectedColorId) && item.isAvailable
    );

    if (!color) return;

    addSelectedToExistingCart(currentProduct, selectedOptionIndex, color);
    closeChooser();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.sm-direct-add,.sm-choose-options');
    if (!button || button.dataset.retailBypass === '1') return;

    const DB = window.RESTBR_DB;
    const product = DB?.products?.find(item => String(item.id) === String(button.dataset.productId || ''));

    if (!commerceReady || !product || !Array.isArray(product.colors) || !product.colors.length) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openChooser(product);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('pbCommerceSheet')?.classList.contains('open')) {
      closeChooser();
    }
  });

  function startObserver() {
    if (observer) return;
    const menu = document.getElementById('smMenu');
    if (!menu) return;

    observer = new MutationObserver(() => {
      if (commerceReady) requestAnimationFrame(decorateCards);
    });

    observer.observe(menu, { childList: true, subtree: true });
  }

  window.addEventListener('restbr:ready', () => {
    startObserver();
    void loadCommerceData();
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-lang]') && commerceReady) {
      setTimeout(() => {
        decorateCards();
        if (document.getElementById('pbCommerceSheet')?.classList.contains('open')) renderChooserBody();
      }, 60);
    }
  });
})();
