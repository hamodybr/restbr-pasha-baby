(() => {
  if (window.__PASHA_PRODUCT_DETAILS_V3_LIGHT__) return;
  window.__PASHA_PRODUCT_DETAILS_V3_LIGHT__ = true;

  const PRODUCT_PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';
  const descriptionCache = new Map();
  const descriptionPromises = new Map();

  let currentProduct = null;
  let selectedOptionIndex = null;
  let selectedColorId = '';
  let selectedQuantity = 1;
  let slides = [];
  let slideIndex = 0;
  let pointerStartX = null;
  let lastTrigger = null;

  const $ = selector => document.querySelector(selector);

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const txt = value => {
    if (!value) return '';
    return String(value.ar || value.en || value.ku || '').trim();
  };

  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';

  const safeMedia = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (typeof window.RESTBR_SAFE_MEDIA_URL === 'function') {
      return window.RESTBR_SAFE_MEDIA_URL(raw) || '';
    }
    return raw;
  };

  const productById = id => window.RESTBR_DB?.products?.find(
    product => String(product.id) === String(id)
  ) || null;

  function ensureSheet() {
    if ($('#pbV3ProductSheet')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="pbV3ProductBackdrop" class="pb-v3-product-backdrop" hidden></div>
      <section id="pbV3ProductSheet" class="pb-v3-product-sheet" role="dialog" aria-modal="true"
               aria-hidden="true" aria-labelledby="pbV3ProductName" hidden>
        <div class="pb-v3-product-panel">
          <div class="pb-v3-product-handle"></div>
          <header class="pb-v3-product-head">
            <span>تفاصيل المنتج</span>
            <button id="pbV3ProductClose" type="button" aria-label="إغلاق">×</button>
          </header>

          <div class="pb-v3-product-scroll">
            <div class="pb-v3-product-gallery">
              <div id="pbV3ProductStage" class="pb-v3-product-stage" tabindex="0" aria-label="معرض صور المنتج">
                <div id="pbV3ProductTrack" class="pb-v3-product-track"></div>
                <button id="pbV3ProductPrev" class="pb-v3-product-arrow prev" type="button" aria-label="الصورة السابقة">‹</button>
                <button id="pbV3ProductNext" class="pb-v3-product-arrow next" type="button" aria-label="الصورة التالية">›</button>
              </div>
              <div id="pbV3ProductThumbs" class="pb-v3-product-thumbs"></div>
              <div id="pbV3ProductCounter" class="pb-v3-product-counter"></div>
            </div>

            <div class="pb-v3-product-main">
              <div class="pb-v3-product-title-row">
                <div>
                  <small id="pbV3ProductCategory"></small>
                  <h2 id="pbV3ProductName"></h2>
                </div>
                <span id="pbV3ProductDiscount" class="pb-v3-product-discount" hidden></span>
              </div>

              <div id="pbV3ProductPrice" class="pb-v3-product-price"></div>
              <p id="pbV3ProductDescription" class="pb-v3-product-description" hidden></p>

              <section id="pbV3ProductOptionsSection" class="pb-v3-product-choice-section" hidden>
                <div class="pb-v3-product-choice-title">
                  <strong>اختَر النوع</strong>
                  <small>حدد الخيار المطلوب</small>
                </div>
                <div id="pbV3ProductOptions" class="pb-v3-product-options"></div>
              </section>

              <section id="pbV3ProductColorsSection" class="pb-v3-product-choice-section" hidden>
                <div class="pb-v3-product-choice-title">
                  <strong>اختَر اللون</strong>
                  <small>الصورة تتغير حسب اللون المتوفر</small>
                </div>
                <div id="pbV3ProductColors" class="pb-v3-product-colors"></div>
              </section>

              <div class="pb-v3-product-quantity">
                <span><b>الكمية</b><small>يمكن إضافة حتى 99 قطعة</small></span>
                <div role="group" aria-label="اختيار الكمية">
                  <button id="pbV3QtyMinus" type="button" aria-label="تقليل الكمية">−</button>
                  <output id="pbV3QtyValue" aria-live="polite">1</output>
                  <button id="pbV3QtyPlus" type="button" aria-label="زيادة الكمية">+</button>
                </div>
              </div>

              <div class="pb-v3-product-assurance">
                <span>✓ السعر الظاهر هو السعر الحالي</span>
                <span>✓ الألوان حسب المتوفر</span>
              </div>
            </div>
          </div>

          <footer class="pb-v3-product-footer">
            <div id="pbV3ProductFooterPrice"></div>
            <button id="pbV3ProductAdd" type="button">إضافة للسلة</button>
          </footer>
        </div>
      </section>`);

    $('#pbV3ProductClose').addEventListener('click', close);
    $('#pbV3ProductBackdrop').addEventListener('click', close);
    $('#pbV3ProductPrev').addEventListener('click', () => moveSlide(-1));
    $('#pbV3ProductNext').addEventListener('click', () => moveSlide(1));
    $('#pbV3ProductAdd').addEventListener('click', addSelected);
    $('#pbV3QtyMinus').addEventListener('click', () => setQuantity(selectedQuantity - 1));
    $('#pbV3QtyPlus').addEventListener('click', () => setQuantity(selectedQuantity + 1));

    $('#pbV3ProductThumbs').addEventListener('click', event => {
      const button = event.target.closest('[data-v3-slide-index]');
      if (!button) return;
      setSlide(Number(button.dataset.v3SlideIndex));
    });

    $('#pbV3ProductOptions').addEventListener('click', event => {
      const button = event.target.closest('[data-v3-option-index]');
      if (!button) return;
      selectedOptionIndex = Number(button.dataset.v3OptionIndex);
      renderOptions();
      renderPrice();
      syncAddState();
    });

    $('#pbV3ProductColors').addEventListener('click', event => {
      const button = event.target.closest('[data-v3-color-id]');
      if (!button || button.disabled) return;
      selectedColorId = String(button.dataset.v3ColorId || '');
      renderColors();
      const targetIndex = slides.findIndex(slide => String(slide.colorId || '') === selectedColorId);
      if (targetIndex >= 0) setSlide(targetIndex);
      syncAddState();
    });

    const stage = $('#pbV3ProductStage');
    stage.addEventListener('pointerdown', event => {
      pointerStartX = event.clientX;
    }, { passive: true });
    stage.addEventListener('pointerup', event => {
      if (pointerStartX === null) return;
      const delta = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(delta) < 42) return;
      moveSlide(delta < 0 ? 1 : -1);
    }, { passive: true });
    stage.addEventListener('pointercancel', () => {
      pointerStartX = null;
    }, { passive: true });
  }

  function buildSlides(product) {
    const rows = [];
    const seen = new Set();

    const push = (url, colorId = '', label = '') => {
      const safe = safeMedia(url);
      if (!safe || seen.has(safe)) return;
      seen.add(safe);
      rows.push({ url: safe, colorId: String(colorId || ''), label: String(label || '') });
    };

    push(product?.image || PRODUCT_PLACEHOLDER, '', txt(product?.name));

    (Array.isArray(product?.colors) ? product.colors : []).forEach(color => {
      if (color?.image) push(color.image, color.id, txt(color));
    });

    if (!rows.length) push(PRODUCT_PLACEHOLDER, '', txt(product?.name));
    return rows;
  }

  function renderGallery() {
    const track = $('#pbV3ProductTrack');
    const thumbs = $('#pbV3ProductThumbs');

    track.innerHTML = slides.map((slide, index) => `
      <div class="pb-v3-product-slide">
        <img src="${esc(slide.url)}" alt="${esc(slide.label || txt(currentProduct?.name))}"
             loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
      </div>`).join('');

    thumbs.innerHTML = slides.length > 1
      ? slides.map((slide, index) => `
          <button class="pb-v3-product-thumb ${index === slideIndex ? 'selected' : ''}"
                  type="button" data-v3-slide-index="${index}" aria-label="عرض الصورة ${index + 1}">
            <img src="${esc(slide.url)}" alt="" loading="lazy" decoding="async">
          </button>`).join('')
      : '';

    setSlide(Math.min(slideIndex, Math.max(0, slides.length - 1)), false);
  }

  function setSlide(index, animate = true) {
    if (!slides.length) return;
    slideIndex = (index + slides.length) % slides.length;

    const track = $('#pbV3ProductTrack');
    if (track) {
      track.style.transition = animate ? 'transform .28s cubic-bezier(.2,.75,.25,1)' : 'none';
      track.style.transform = `translate3d(-${slideIndex * 100}%,0,0)`;
    }

    document.querySelectorAll('#pbV3ProductThumbs [data-v3-slide-index]').forEach(button => {
      button.classList.toggle('selected', Number(button.dataset.v3SlideIndex) === slideIndex);
    });

    const counter = $('#pbV3ProductCounter');
    counter.textContent = slides.length > 1 ? `${slideIndex + 1} / ${slides.length}` : '';

    $('#pbV3ProductPrev').hidden = slides.length < 2;
    $('#pbV3ProductNext').hidden = slides.length < 2;
  }

  function moveSlide(delta) {
    if (slides.length < 2) return;
    setSlide(slideIndex + delta);
  }

  function selectedOption() {
    return Number.isInteger(selectedOptionIndex)
      ? (currentProduct?.options || [])[selectedOptionIndex] || null
      : null;
  }

  function selectedColor() {
    return (currentProduct?.colors || []).find(
      color => String(color.id) === String(selectedColorId) && color.isAvailable !== false
    ) || null;
  }

  function renderPrice() {
    const options = currentProduct?.options || [];
    const option = selectedOption();
    const source = option || (options.length === 1 ? options[0] : null);
    const holder = $('#pbV3ProductPrice');
    const footer = $('#pbV3ProductFooterPrice');

    if (!source) {
      const prices = options
        .map(item => Number(item?.price))
        .filter(value => Number.isFinite(value));
      const label = prices.length ? `ابتداءً من ${money(Math.min(...prices))}` : '';
      holder.textContent = label;
      footer.textContent = label;
      return;
    }

    const current = Number(source.price || 0);
    const original = Number(source.originalPrice ?? current);
    const discounted = original > current;

    holder.innerHTML = discounted
      ? `<span class="pb-v3-product-old-price">${esc(money(original))}</span><strong>${esc(money(current))}</strong>`
      : `<strong>${esc(money(current))}</strong>`;

    footer.innerHTML = selectedQuantity > 1
      ? `<small>${selectedQuantity} × ${esc(money(current))}</small><b>${esc(money(current * selectedQuantity))}</b>`
      : `<b>${esc(money(current))}</b>`;
  }

  function setQuantity(value) {
    selectedQuantity = Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
    const output = $('#pbV3QtyValue');
    const minus = $('#pbV3QtyMinus');
    const plus = $('#pbV3QtyPlus');
    if (output) output.textContent = String(selectedQuantity);
    if (minus) minus.disabled = selectedQuantity <= 1;
    if (plus) plus.disabled = selectedQuantity >= 99;
    renderPrice();
  }

  function renderOptions() {
    const options = currentProduct?.options || [];
    const section = $('#pbV3ProductOptionsSection');
    const holder = $('#pbV3ProductOptions');

    section.hidden = options.length <= 1;
    holder.innerHTML = options.length > 1
      ? options.map((option, index) => `
          <button type="button" class="${selectedOptionIndex === index ? 'selected' : ''}"
                  data-v3-option-index="${index}">
            <span>${esc(txt(option) || txt(currentProduct?.name))}</span>
            <b>${esc(money(option.price))}</b>
          </button>`).join('')
      : '';
  }

  function renderColors() {
    const colors = Array.isArray(currentProduct?.colors) ? currentProduct.colors : [];
    const section = $('#pbV3ProductColorsSection');
    const holder = $('#pbV3ProductColors');

    section.hidden = colors.length === 0;
    holder.innerHTML = colors.map(color => `
      <button type="button"
              class="${selectedColorId === String(color.id) ? 'selected' : ''} ${color.isAvailable === false ? 'unavailable' : ''}"
              data-v3-color-id="${esc(color.id)}" ${color.isAvailable === false ? 'disabled' : ''}>
        ${color.image
          ? `<img src="${esc(safeMedia(color.image))}" alt="" loading="lazy" decoding="async">`
          : `<i style="--v3-swatch:${esc(color.hex || '#d8d0d3')}"></i>`}
        <span>${esc(txt(color))}</span>
      </button>`).join('');
  }

  function syncAddState() {
    const options = currentProduct?.options || [];
    const colors = Array.isArray(currentProduct?.colors) ? currentProduct.colors : [];
    const optionReady = options.length === 1 || (options.length > 1 && Number.isInteger(selectedOptionIndex));
    const colorReady = colors.length === 0 || Boolean(selectedColor());
    const add = $('#pbV3ProductAdd');

    add.disabled = !(optionReady && colorReady) || currentProduct?.badges?.unavailable === true;
    add.textContent = currentProduct?.badges?.unavailable === true
      ? 'غير متوفر حالياً'
      : !optionReady
        ? 'اختَر النوع أولاً'
        : !colorReady
          ? 'اختَر اللون أولاً'
          : 'إضافة للسلة';
  }

  function renderProduct(product) {
    currentProduct = product;
    selectedQuantity = 1;
    selectedOptionIndex = (product.options || []).length === 1 ? 0 : null;

    const availableColors = (product.colors || []).filter(color => color.isAvailable !== false);
    selectedColorId = availableColors.length === 1 ? String(availableColors[0].id) : '';

    slides = buildSlides(product);
    slideIndex = 0;

    $('#pbV3ProductCategory').textContent = txt(product.category);
    $('#pbV3ProductName').textContent = txt(product.name);

    const discount = Math.max(0, Number(product.discountPercent || 0));
    const discountNode = $('#pbV3ProductDiscount');
    discountNode.hidden = discount <= 0;
    discountNode.textContent = discount > 0 ? `-${Math.round(discount)}%` : '';

    const description = descriptionCache.get(String(product.id)) || '';
    const descriptionNode = $('#pbV3ProductDescription');
    descriptionNode.textContent = description;
    descriptionNode.hidden = !description;

    renderGallery();
    renderOptions();
    renderColors();
    setQuantity(1);
    syncAddState();
  }

  async function loadDescription(product) {
    const id = String(product?.id || '');
    if (!id || descriptionCache.has(id)) return descriptionCache.get(id) || '';
    if (descriptionPromises.has(id)) return descriptionPromises.get(id);

    const promise = (async () => {
      try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return '';
        const { data, error } = await supabaseClient
          .from('products')
          .select('id,description_ar')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        const value = String(data?.description_ar || '').trim();
        descriptionCache.set(id, value);
        return value;
      } catch (_) {
        descriptionCache.set(id, '');
        return '';
      } finally {
        descriptionPromises.delete(id);
      }
    })();

    descriptionPromises.set(id, promise);
    return promise;
  }

  async function open(productOrId, trigger = null) {
    ensureSheet();

    const product = typeof productOrId === 'object'
      ? productOrId
      : productById(productOrId);
    if (!product) return false;

    lastTrigger = trigger || document.activeElement;
    renderProduct(product);

    const backdrop = $('#pbV3ProductBackdrop');
    const sheet = $('#pbV3ProductSheet');

    backdrop.hidden = false;
    sheet.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      sheet.classList.add('open');
    });
    sheet.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pb-v3-product-open');
    document.body.classList.add('pb-v3-product-open');

    const description = await loadDescription(product);
    if (currentProduct && String(currentProduct.id) === String(product.id)) {
      const node = $('#pbV3ProductDescription');
      node.textContent = description;
      node.hidden = !description;
    }

    return true;
  }

  function close() {
    const backdrop = $('#pbV3ProductBackdrop');
    const sheet = $('#pbV3ProductSheet');
    if (!sheet || sheet.hidden) return;

    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pb-v3-product-open');
    document.body.classList.remove('pb-v3-product-open');

    window.setTimeout(() => {
      backdrop.hidden = true;
      sheet.hidden = true;
      currentProduct = null;
      selectedQuantity = 1;
      slides = [];
      lastTrigger?.focus?.({ preventScroll: true });
      lastTrigger = null;
    }, 190);
  }

  function localizedOptionWithColor(product, option, color) {
    const optionName = String(option?.ar || '').trim();
    const productName = String(product?.name?.ar || '').trim();
    const colorName = String(color?.ar || '').trim();
    const parts = [];
    if (optionName && optionName !== productName) parts.push(optionName);
    if (colorName) parts.push(`اللون: ${colorName}`);

    const ar = parts.join(' • ');
    return {
      ...option,
      ar,
      ku: ar,
      en: ar
    };
  }

  function proxyAdd(product, optionIndex, color = null, quantity = 1) {
    const options = product.options || [];
    const originalLength = options.length;
    const originalImage = product.image;
    let targetIndex = optionIndex;

    if (color) {
      const colorIndex = Math.max(0, (product.colors || []).findIndex(
        item => String(item.id) === String(color.id)
      ));
      targetIndex = originalLength + 1 + (colorIndex * 1000) + Math.max(0, optionIndex);
      options[targetIndex] = localizedOptionWithColor(product, options[optionIndex], color);
      if (color.image) product.image = color.image;
    }

    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    let added = false;

    if (typeof window.RESTBR_CART_ADD_QUANTITY === 'function') {
      added = window.RESTBR_CART_ADD_QUANTITY(product, targetIndex, qty) !== false;
    } else {
      const proxy = document.createElement('button');
      proxy.type = 'button';
      proxy.className = 'sm-direct-add';
      proxy.dataset.productId = String(product.id);
      proxy.dataset.optionIndex = String(targetIndex);
      proxy.dataset.retailBypass = '1';
      proxy.hidden = true;
      document.body.appendChild(proxy);
      for (let index = 0; index < qty; index += 1) proxy.click();
      proxy.remove();
      added = true;
    }

    if (color) options.length = originalLength;
    product.image = originalImage;

    if (added) window.dispatchEvent(new CustomEvent('pasha:v3-cart-changed'));
    return added;
  }

  function addSelected() {
    if (!currentProduct) return;
    const options = currentProduct.options || [];
    const colors = Array.isArray(currentProduct.colors) ? currentProduct.colors : [];

    const optionIndex = options.length === 1 ? 0 : selectedOptionIndex;
    if (!Number.isInteger(optionIndex) || !options[optionIndex]) return;

    const color = colors.length ? selectedColor() : null;
    if (colors.length && !color) return;

    if (proxyAdd(currentProduct, optionIndex, color, selectedQuantity)) close();
  }

  function enhanceCards() {
    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const info = card.querySelector('.sm-info');
      if (!info) return;

      let button = card.querySelector('.pb-v3-details-btn');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'pb-v3-details-btn';
        button.textContent = 'التفاصيل';
        info.appendChild(button);
      }

      const name = String(card.querySelector('.sm-name')?.textContent || '').trim();
      button.setAttribute('aria-label', `تفاصيل — ${name}`);
    });
  }

  document.addEventListener('click', event => {
    const details = event.target.closest('#smMenu .pb-v3-details-btn');
    const image = event.target.closest('#smMenu .sm-product-image');
    if (!details && !image) return;

    const card = (details || image).closest('[data-product-card]');
    const product = productById(card?.dataset.productCard);
    if (!product) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void open(product, details || image);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#pbV3ProductSheet')?.classList.contains('open')) {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    const details = event.target.closest?.('#smMenu .pb-v3-details-btn');
    if (!details) return;

    const card = details.closest('[data-product-card]');
    const product = productById(card?.dataset.productCard);
    if (!product) return;

    event.preventDefault();
    void open(product, details);
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('#smCats .sm-cat')) window.setTimeout(enhanceCards, 0);
  });

  document.addEventListener('input', event => {
    if (event.target?.id === 'smSearchInput') window.setTimeout(enhanceCards, 0);
  });

  ['restbr:ready', 'restbr:commerce-ready', 'restbr:prices-updated'].forEach(type => {
    window.addEventListener(type, () => window.setTimeout(enhanceCards, 0));
  });

  window.PASHA_V3_OPEN_PRODUCT_DETAILS = id => open(id);
  window.PASHA_V3_ENHANCE_PRODUCT_CARDS = enhanceCards;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureSheet();
      enhanceCards();
    }, { once: true });
  } else {
    ensureSheet();
    enhanceCards();
  }
})();