(() => {
  'use strict';

  if (window.__PASHA_REFERENCE_MATCH_V4__) return;
  window.__PASHA_REFERENCE_MATCH_V4__ = true;

  const CDN = 'https://cdn.jsdelivr.net/gh/hamodybr/restbr-pasha-baby@d717fa9d8c4f2ded231b4e307eadf77f5f5e0929/';
  const OFFER_ART = CDN + 'assets/v3-demo-offer-banner.webp';
  const PLACEHOLDER = CDN + 'assets/pasha-baby-reference-logo.png';
  const FAVORITES_KEY = 'PASHA_BABY_V3_FAVORITES';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let syncFrame = 0;
  let currentProductId = '';
  const categoryTiles = new Map();

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const localized = value => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    return String(value.ar || value.en || value.ku || '').trim();
  };

  const english = value => {
    if (!value || typeof value === 'string') return '';
    return String(value.en || '').trim();
  };

  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';

  const safeMedia = value => {
    const raw = String(value || '').trim();
    if (!raw || /(?:restaurant|pasha-baby-product)-placeholder\.svg/i.test(raw)) return PLACEHOLDER;
    if (typeof window.RESTBR_SAFE_MEDIA_URL === 'function') {
      const safe = window.RESTBR_SAFE_MEDIA_URL(raw) || PLACEHOLDER;
      return /(?:restaurant|pasha-baby-product)-placeholder\.svg/i.test(safe) ? PLACEHOLDER : safe;
    }
    return raw;
  };

  const optimizedMedia = value => {
    const source = safeMedia(value);
    if (typeof window.RESTBR_OPTIMIZED_MEDIA_URL === 'function') {
      return window.RESTBR_OPTIMIZED_MEDIA_URL(source, 'product-card') || source;
    }
    return source;
  };

  const icon = name => {
    const icons = {
      truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
      shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
      headset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13H2v5h4v-5zM20 13h2v5h-4v-5zM18 18c0 2-2 3-5 3"/></svg>',
      gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v12H3zM12 9v12M2 5h20v4H2z"/><path d="M12 5c-1.7-3.2-5.8-2.4-5.8-.1 0 2.2 3 2.1 5.8.1Zm0 0c1.7-3.2 5.8-2.4 5.8-.1 0 2.2-3 2.1-5.8.1Z"/></svg>',
      heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/></svg>',
      cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="9.5" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/></svg>',
      layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11h6M11 8v6"/></svg>',
      box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5zM3 7v10l9 5 9-5V7M12 12v10"/></svg>',
      refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M7 7a7 7 0 0 1 11 2M17 17A7 7 0 0 1 6 15"/></svg>'
    };
    return icons[name] || icons.check;
  };

  function products() {
    return Array.isArray(window.RESTBR_DB?.products) ? window.RESTBR_DB.products : [];
  }

  function productPriceInfo(product) {
    const rows = (Array.isArray(product?.options) ? product.options : [])
      .map(option => {
        const current = Number(option?.price);
        const original = Number(option?.originalPrice ?? option?.__retailOriginalPrice ?? current);
        return { current, original };
      })
      .filter(row => Number.isFinite(row.current))
      .sort((a, b) => a.current - b.current);
    return rows[0] || null;
  }

  function productById(id) {
    return products().find(product => String(product?.id) === String(id)) || null;
  }

  function productByVisibleName(name) {
    const needle = String(name || '').trim();
    return products().find(product => {
      const names = [localized(product?.name), english(product?.name), product?.name?.ku]
        .map(value => String(value || '').trim());
      return names.includes(needle);
    }) || null;
  }

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeFavorites(set) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
    } catch (_) {}
  }

  function toggleFavorite(productId) {
    const id = String(productId || '');
    if (!id) return false;
    const favorites = readFavorites();
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    writeFavorites(favorites);
    syncFavoriteButtons();
    return favorites.has(id);
  }

  function syncFavoriteButtons() {
    const favorites = readFavorites();
    $$('[data-pb36-favorite]').forEach(button => {
      const selected = favorites.has(String(button.dataset.pb36Favorite || ''));
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      const label = button.querySelector('.pb36-favorite-label');
      const nextLabel = selected ? 'تمت الإضافة للمفضلة' : 'إضافة للمفضلة';
      if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
    });
  }

  function decorateBenefits() {
    const holder = $('.pb-v3-benefits');
    if (!holder) return;
    const alreadyCorrect = holder.children.length === 4 && holder.textContent.includes('منتجات أصلية');
    if (alreadyCorrect) return;
    holder.dataset.pb36Ready = '4';
    holder.innerHTML = `
      <div>${icon('truck')}<span><b>توصيل سريع</b><small>لكل المحافظات</small></span></div>
      <div>${icon('shield')}<span><b>منتجات أصلية</b><small>مختارة بعناية</small></span></div>
      <div>${icon('headset')}<span><b>دعم مستمر</b><small>نحن دائماً هنا</small></span></div>
      <div>${icon('gift')}<span><b>عروض مميزة</b><small>بشكل متجدد</small></span></div>`;
  }

  function replaceLegacyPlaceholders() {
    document.querySelectorAll('img').forEach(image => {
      const source = String(image.currentSrc || image.src || '');
      if (!/(?:restaurant|pasha-baby-product)-placeholder\.svg/i.test(source)) return;
      image.src = PLACEHOLDER;
      image.classList.add('pb36-product-fallback');
      image.dataset.pb36Fallback = '1';
    });
  }

  function restoreCategoryTiles() {
    $$('#smCats .sm-cat').forEach(button => {
      const key = String(button.dataset.catId || button.dataset.cat || '');
      if (!key) return;
      const media = $('.pb-v3-cat-media', button);
      if (media) {
        categoryTiles.set(key, {
          html: button.innerHTML,
          label: button.dataset.v3Label || $('.pb-v3-cat-copy b', button)?.textContent?.trim() || '',
          icon: button.dataset.v3Icon || ''
        });
        return;
      }
      const saved = categoryTiles.get(key);
      if (!saved) return;
      button.innerHTML = saved.html;
      button.classList.add('pb-v3-cat-tile');
      if (saved.label) button.dataset.v3Label = saved.label;
      if (saved.icon) button.dataset.v3Icon = saved.icon;
    });
  }

  function stabilizeCategoryImages() {
    $$('#smCats .pb-v3-cat-media img').forEach(image => {
      image.loading = 'eager';
      image.decoding = 'async';
      image.fetchPriority = 'high';
      if (image.dataset.pb36CategoryImage === '1') return;
      image.dataset.pb36CategoryImage = '1';
      image.addEventListener('error', () => {
        if (image.dataset.pb36CategoryFallback === '1') return;
        image.dataset.pb36CategoryFallback = '1';
        image.src = PLACEHOLDER;
      }, { once: true });
    });
  }

  function featuredProducts() {
    const available = products().filter(product => product?.badges?.unavailable !== true);
    const result = [];
    const add = product => {
      if (!product || result.some(item => String(item.id) === String(product.id))) return;
      result.push(product);
    };
    available.filter(product => /kidilo|كيديلو|كرسي|عربة|car seat|stroller/i.test(
      [localized(product.name), english(product.name), localized(product.category)].join(' ')
    )).forEach(add);
    available.filter(product => product?.badges?.popular === true).forEach(add);
    available.filter(product => product?.badges?.new === true).forEach(add);
    available.forEach(add);
    return result.slice(0, 4);
  }

  function colorDots(product) {
    const colors = Array.isArray(product?.colors) ? product.colors.filter(color => color?.isAvailable !== false) : [];
    if (!colors.length) return '<span class="pb36-no-colors">حسب المتوفر</span>';
    return colors.slice(0, 5).map(color => {
      const name = localized(color) || 'لون متوفر';
      return `<i title="${escapeHtml(name)}" style="--pb36-dot:${escapeHtml(color.hex || '#d8d0d3')}"></i>`;
    }).join('');
  }

  function featuredCard(product) {
    const price = productPriceInfo(product);
    const badge = product?.badges?.popular === true
      ? 'الأكثر طلبًا'
      : product?.badges?.new === true
        ? 'جديد'
        : product?.badges?.offer === true
          ? 'عرض'
          : '';
    const name = localized(product?.name);
    const category = localized(product?.category);
    return `
      <article class="pb36-feature-card" data-pb36-product-card="${escapeHtml(product.id)}">
        <div class="pb36-feature-media">
          <img src="${escapeHtml(optimizedMedia(product.image))}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">
          <button class="pb36-heart" type="button" data-pb36-favorite="${escapeHtml(product.id)}" aria-label="إضافة ${escapeHtml(name)} للمفضلة" aria-pressed="false">${icon('heart')}</button>
          ${badge ? `<span class="pb36-card-badge">${escapeHtml(badge)}</span>` : ''}
        </div>
        <div class="pb36-feature-body">
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(category || 'Pasha Baby')}</p>
          <div class="pb36-card-price">
            ${price && price.original > price.current ? `<del>${escapeHtml(money(price.original))}</del>` : ''}
            <strong>${price ? escapeHtml(money(price.current)) : 'اسأل عن السعر'}</strong>
          </div>
          <div class="pb36-color-dots" aria-label="الألوان المتوفرة">${colorDots(product)}</div>
          <div class="pb36-card-actions">
            <button type="button" data-pb36-add="${escapeHtml(product.id)}">${icon('cart')}<span>أضف للسلة</span></button>
            <button type="button" data-pb36-details="${escapeHtml(product.id)}">التفاصيل</button>
          </div>
        </div>
      </article>`;
  }

  function ensureFeaturedSection() {
    const sentinel = $('#smCatsSentinel');
    if (!sentinel) return;
    let section = $('#pb36KidiloSection');
    if (!section) {
      section = document.createElement('section');
      section.id = 'pb36KidiloSection';
      section.className = 'pb36-featured-section';
      section.innerHTML = `
        <header class="pb36-section-head">
          <div><h2>منتجات KIDILO</h2><p>اختيارات مميزة لطفلك</p></div>
          <button type="button" data-pb36-show-all>عرض الكل <span>←</span></button>
        </header>
        <div class="pb36-feature-rail" aria-live="polite"></div>`;
      sentinel.insertAdjacentElement('afterend', section);
    }
    const rows = featuredProducts();
    const rail = $('.pb36-feature-rail', section);
    if (rail && rail.dataset.pb36Signature !== rows.map(item => item.id).join('|')) {
      rail.dataset.pb36Signature = rows.map(item => item.id).join('|');
      rail.innerHTML = rows.map(featuredCard).join('');
      section.hidden = rows.length === 0;
    }
  }

  function offerProducts() {
    return products().filter(product => {
      if (product?.badges?.unavailable === true) return false;
      if (product?.badges?.offer === true) return true;
      if (Number(product?.discountPercent || 0) > 0 || Number(product?.discountAmount || 0) > 0) return true;
      return (product?.options || []).some(option => {
        const current = Number(option?.price);
        const original = Number(option?.originalPrice ?? option?.__retailOriginalPrice ?? current);
        return Number.isFinite(current) && Number.isFinite(original) && original > current;
      });
    });
  }

  function maxOfferPercent(rows) {
    return rows.reduce((highest, product) => {
      let percent = Math.max(0, Number(product?.discountPercent || 0));
      (product?.options || []).forEach(option => {
        const current = Number(option?.price);
        const original = Number(option?.originalPrice ?? option?.__retailOriginalPrice ?? current);
        if (Number.isFinite(current) && Number.isFinite(original) && original > current && original > 0) {
          percent = Math.max(percent, ((original - current) / original) * 100);
        }
      });
      return Math.max(highest, percent);
    }, 0);
  }

  function ensureOfferBanner() {
    const featured = $('#pb36KidiloSection');
    if (!featured) return;
    let banner = $('#pb36OfferBanner');
    if (!banner) {
      banner = document.createElement('section');
      banner.id = 'pb36OfferBanner';
      banner.className = 'pb36-offer-banner';
      banner.innerHTML = `
        <div class="pb36-offer-copy">
          <small>مختاراتنا لك</small>
          <h2>عروض مميزة</h2>
          <p>على مستلزمات طفلك</p>
          <button type="button" data-pb36-offers>تسوّق العروض <span>←</span></button>
        </div>
        <img src="${OFFER_ART}" alt="مستلزمات أطفال" loading="lazy" decoding="async">
        <div class="pb36-offer-round"><small>UP TO</small><strong data-pb36-offer-value>عروض</strong><span>خصومات</span></div>`;
      featured.insertAdjacentElement('afterend', banner);
    }
    const percent = Math.round(maxOfferPercent(offerProducts()));
    const value = $('[data-pb36-offer-value]', banner);
    const round = $('.pb36-offer-round', banner);
    const nextValue = percent > 0 ? percent + '%' : 'عروض';
    if (value && value.textContent !== nextValue) value.textContent = nextValue;
    banner.classList.toggle('pb36-has-discount', percent > 0);
    if (round) round.hidden = percent <= 0;
  }

  function renameLiveSections() {
    const popularTitle = $('#pbV3PopularSection h2');
    const popularNote = $('#pbV3PopularSection .pb-v3-section-head small');
    const newTitle = $('#pbV3NewSection h2');
    const newNote = $('#pbV3NewSection .pb-v3-section-head small');
    const productsTitle = $('.pb-v3-products-head h2');
    if (popularTitle && popularTitle.textContent !== 'الأكثر مبيعًا') popularTitle.textContent = 'الأكثر مبيعًا';
    if (popularNote && popularNote.textContent !== 'منتجات يفضلها زبائننا') popularNote.textContent = 'منتجات يفضلها زبائننا';
    if (newTitle && newTitle.textContent !== 'وصل حديثًا') newTitle.textContent = 'وصل حديثًا';
    if (newNote && newNote.textContent !== 'أحدث اختياراتنا') newNote.textContent = 'أحدث اختياراتنا';
    if (productsTitle && productsTitle.textContent !== 'جميع المنتجات') productsTitle.textContent = 'جميع المنتجات';
  }

  function enhanceCatalogCards() {
    const rows = products();
    $$('#smMenu [data-product-card]').forEach(card => {
      const product = rows.find(item => String(item?.id) === String(card.dataset.productCard));
      if (!product) return;
      const media = $('.sm-img', card);
      const info = $('.sm-info', card);
      const name = $('.sm-name', card);
      if (!media || !info || !name) return;

      let favorite = $('.pb36-catalog-heart', card);
      if (!favorite) {
        favorite = document.createElement('button');
        favorite.type = 'button';
        favorite.className = 'pb36-catalog-heart';
        favorite.dataset.pb36Favorite = String(product.id);
        favorite.setAttribute('aria-label', `إضافة ${localized(product.name)} للمفضلة`);
        favorite.innerHTML = icon('heart');
        media.appendChild(favorite);
      }

      let meta = $('.pb36-catalog-meta', info);
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'pb36-catalog-meta';
        name.insertAdjacentElement('afterend', meta);
      }
      const nextMeta = localized(product.category) || 'Pasha Baby';
      if (meta.textContent !== nextMeta) meta.textContent = nextMeta;

      let dots = $('.pb36-color-dots', info);
      const actionRow = $('.pb-product-action-row', info);
      if (!dots) {
        dots = document.createElement('div');
        dots.className = 'pb36-color-dots';
        if (actionRow) actionRow.insertAdjacentElement('beforebegin', dots);
        else info.appendChild(dots);
      }
      const colors = Array.isArray(product.colors) ? product.colors : [];
      const signature = colors.map(color => [color.id, color.hex, color.isAvailable].join(':')).join('|') || 'none';
      if (dots.dataset.pb36Signature !== signature) {
        dots.dataset.pb36Signature = signature;
        dots.innerHTML = colorDots(product);
      }
    });
  }

  function addSimpleProduct(product) {
    if (!product || product?.badges?.unavailable === true) return false;
    const options = Array.isArray(product.options) ? product.options : [];
    const colors = Array.isArray(product.colors) ? product.colors.filter(color => color?.isAvailable !== false) : [];
    if (options.length !== 1 || colors.length) return false;
    let added = false;
    if (typeof window.RESTBR_CART_ADD_QUANTITY === 'function') {
      added = window.RESTBR_CART_ADD_QUANTITY(product, 0, 1) !== false;
    } else {
      const proxy = document.createElement('button');
      proxy.type = 'button';
      proxy.className = 'sm-direct-add';
      proxy.dataset.productId = String(product.id);
      proxy.dataset.optionIndex = '0';
      proxy.dataset.retailBypass = '1';
      proxy.hidden = true;
      document.body.appendChild(proxy);
      proxy.click();
      proxy.remove();
      added = true;
    }
    if (added) window.dispatchEvent(new CustomEvent('pasha:v3-cart-changed'));
    return added;
  }

  function openProduct(productId, trigger = null) {
    currentProductId = String(productId || '');
    if (typeof window.PASHA_V3_OPEN_PRODUCT_DETAILS === 'function') {
      void window.PASHA_V3_OPEN_PRODUCT_DETAILS(currentProductId, trigger);
      window.setTimeout(enhanceProductSheet, 0);
      window.setTimeout(enhanceProductSheet, 80);
      return true;
    }
    return false;
  }

  function sheetProduct() {
    const title = $('#pbV3ProductName')?.textContent;
    const found = productByVisibleName(title);
    if (found) {
      currentProductId = String(found.id);
      return found;
    }
    if (currentProductId) return productById(currentProductId);
    return null;
  }

  function ensureSheetStructure() {
    const sheet = $('#pbV3ProductSheet');
    const panel = $('.pb-v3-product-panel', sheet || document);
    const head = $('.pb-v3-product-head', sheet || document);
    const main = $('.pb-v3-product-main', sheet || document);
    const stage = $('#pbV3ProductStage');
    const footer = $('.pb-v3-product-footer', sheet || document);
    if (!sheet || !panel || !head || !main || !stage || !footer) return false;

    if (!$('#pb36SheetFavorite')) {
      head.insertAdjacentHTML('beforeend', `<button id="pb36SheetFavorite" class="pb36-sheet-favorite" type="button" data-pb36-favorite="" aria-label="إضافة للمفضلة" aria-pressed="false">${icon('heart')}</button>`);
    }

    if (!$('#pb36ZoomButton')) {
      stage.insertAdjacentHTML('beforeend', `<button id="pb36ZoomButton" class="pb36-zoom-button" type="button" aria-label="تكبير صورة المنتج">${icon('zoom')}</button>`);
    }

    const titleBlock = $('.pb-v3-product-title-row > div');
    if (titleBlock && !$('#pb36ArabicTitle')) {
      titleBlock.insertAdjacentHTML('beforeend', '<p id="pb36ArabicTitle" class="pb36-arabic-title"></p><div id="pb36Rating" class="pb36-rating" hidden></div>');
    }

    const description = $('#pbV3ProductDescription');
    if (description && !$('#pb36ProductFeatures')) {
      description.insertAdjacentHTML('afterend', '<div id="pb36ProductFeatures" class="pb36-product-features"></div>');
    }

    if (!$('#pb36BuyRow')) {
      const price = $('#pbV3ProductPrice');
      const discount = $('#pbV3ProductDiscount');
      const quantity = $('.pb-v3-product-quantity');
      const anchor = $('#pbV3ProductColorsSection') || $('#pbV3ProductOptionsSection') || $('#pb36ProductFeatures');
      const row = document.createElement('div');
      row.id = 'pb36BuyRow';
      row.className = 'pb36-buy-row';
      row.innerHTML = '<div class="pb36-price-wrap"><b>السعر</b></div><div class="pb36-quantity-wrap"></div>';
      anchor?.insertAdjacentElement('afterend', row);
      const priceWrap = $('.pb36-price-wrap', row);
      const quantityWrap = $('.pb36-quantity-wrap', row);
      if (price) priceWrap?.appendChild(price);
      if (discount) priceWrap?.appendChild(discount);
      if (quantity) quantityWrap?.appendChild(quantity);
    }

    if (!$('#pb36FooterFavorite')) {
      footer.insertAdjacentHTML('beforeend', `<button id="pb36FooterFavorite" class="pb36-footer-favorite" type="button" data-pb36-favorite=""><span class="pb36-favorite-label">إضافة للمفضلة</span>${icon('heart')}</button>`);
    }

    if (!$('#pb36DetailBenefits')) {
      footer.insertAdjacentHTML('afterend', `
        <div id="pb36DetailBenefits" class="pb36-detail-benefits">
          <span>${icon('truck')}<b>توصيل سريع</b><small>لجميع المحافظات</small></span>
          <span>${icon('refresh')}<b>استبدال وإرجاع</b><small>حسب سياسة المتجر</small></span>
          <span>${icon('shield')}<b>تثبيت آمن</b><small>عبر واتساب</small></span>
        </div>`);
    }
    return true;
  }

  function sheetFeatures(product) {
    const options = Array.isArray(product?.options) ? product.options : [];
    const colors = Array.isArray(product?.colors) ? product.colors.filter(color => color?.isAvailable !== false) : [];
    const rows = [
      { icon: 'layers', title: options.length > 1 ? options.length + ' خيارات' : 'خيار واضح' },
      { icon: 'gift', title: colors.length ? colors.length + ' ألوان متوفرة' : 'حسب المتوفر' },
      { icon: 'check', title: 'طلب بسيط وسريع' }
    ];
    return rows.map(row => `<span>${icon(row.icon)}<b>${escapeHtml(row.title)}</b></span>`).join('');
  }

  function syncColorCards(product) {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    $$('#pbV3ProductColors [data-v3-color-id]').forEach(button => {
      const color = colors.find(item => String(item.id) === String(button.dataset.v3ColorId));
      if (!color || $('.pb36-color-dot', button)) return;
      const dot = document.createElement('i');
      dot.className = 'pb36-color-dot';
      dot.style.setProperty('--pb36-dot', color.hex || '#d8d0d3');
      const label = $('span', button);
      if (label) button.insertBefore(dot, label);
      else button.appendChild(dot);
    });
  }

  function enhanceProductSheet() {
    if (!ensureSheetStructure()) return;
    const product = sheetProduct();
    if (!product) return;
    currentProductId = String(product.id);

    const arName = String(product?.name?.ar || localized(product.name)).trim();
    const enName = english(product.name);
    const title = $('#pbV3ProductName');
    const arabicTitle = $('#pb36ArabicTitle');
    const category = $('#pbV3ProductCategory');
    const brand = /kidilo|كيديلو/i.test([arName, enName, localized(product.category)].join(' ')) ? 'KIDILO' : 'PASHA BABY';
    const nextTitle = enName && enName.toLowerCase() !== arName.toLowerCase() ? enName : arName;
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
    if (arabicTitle) {
      const nextArabicTitle = enName && enName.toLowerCase() !== arName.toLowerCase() ? arName : localized(product.category);
      if (arabicTitle.textContent !== nextArabicTitle) arabicTitle.textContent = nextArabicTitle;
      arabicTitle.hidden = !arabicTitle.textContent;
    }
    if (category && category.textContent !== brand) category.textContent = brand;

    const rating = $('#pb36Rating');
    const stats = window.PashaReviewStats;
    if (rating) {
      const count = Math.max(0, Number(stats?.count || 0));
      const average = Number(stats?.average || 0);
      rating.hidden = !(count > 0 && average > 0);
      const ratingMarkup = count > 0 && average > 0
        ? `<span>★</span><b>${average.toFixed(1)}</b><small>(${count.toLocaleString('en-US')} تقييم للمتجر)</small>`
        : '';
      if (rating.dataset.pb36Signature !== ratingMarkup) {
        rating.dataset.pb36Signature = ratingMarkup;
        rating.innerHTML = ratingMarkup;
      }
    }

    const features = $('#pb36ProductFeatures');
    if (features) {
      const featureMarkup = sheetFeatures(product);
      if (features.dataset.pb36Signature !== featureMarkup) {
        features.dataset.pb36Signature = featureMarkup;
        features.innerHTML = featureMarkup;
      }
    }
    syncColorCards(product);

    $$('[data-pb36-favorite]', $('#pbV3ProductSheet')).forEach(button => {
      button.dataset.pb36Favorite = String(product.id);
    });
    syncFavoriteButtons();
  }

  function decorateServiceFooter() {
    const items = $$('.pb-ref-service-footer > div');
    const content = [
      [icon('truck'), 'توصيل سريع', 'لكل المحافظات'],
      [icon('shield'), 'دفع آمن', 'بجميع الوسائل'],
      [icon('box'), 'تغليف مميز', 'يحفظ جودة المنتجات'],
      [icon('headset'), 'خدمة عملاء', 'نحن دائماً معك']
    ];
    items.forEach((item, index) => {
      const row = content[index];
      if (!row || item.dataset.pb36Ready === '1') return;
      item.dataset.pb36Ready = '1';
      item.innerHTML = `${row[0]}<span><b>${row[1]}</b><small>${row[2]}</small></span>`;
    });
  }

  function ensureReviewFallback() {
    document.body.classList.remove('pb-v3-reviews-paused');
    document.body.dataset.pb36ReviewReady = '1';
    if ($('.pb-reviews')) {
      $('#pb36ReviewFallback')?.remove();
      return;
    }
    const footer = $('.sm-footer');
    if (!footer || $('#pb36ReviewFallback')) return;
    const section = document.createElement('section');
    section.id = 'pb36ReviewFallback';
    section.className = 'pb36-review-fallback';
    section.innerHTML = `
      <header class="pb36-section-head"><div><h2>آراء زبائننا</h2><p>تقييمات حقيقية وموثقة</p></div></header>
      <div class="pb36-review-empty"><span>☆</span><div><b>التقييمات الموثقة تظهر هنا</b><p>بعد نشر أول تقييم معتمد سيظهر مباشرة في هذا القسم.</p></div></div>`;
    footer.insertAdjacentElement('beforebegin', section);
  }

  function normalizeStorefrontChrome() {
    const announcement = $('#pbV3AnnouncementText');
    if (announcement) {
      const words = String(announcement.textContent || '').trim().split(/\s+/).filter(Boolean);
      for (let size = 4; size <= Math.floor(words.length / 2); size += 1) {
        if (words.length % size) continue;
        const repeats = words.length / size;
        const isRepeated = repeats > 1 && words.every((word, index) => word === words[index % size]);
        if (isRepeated) {
          announcement.textContent = words.slice(0, size).join(' ');
          break;
        }
      }
    }

    const search = $('#smSearchInput');
    if (search && search.placeholder !== 'ابحث عن منتج...') search.placeholder = 'ابحث عن منتج...';

    const secondaryHeroAction = $('#pbV3HeroWhatsapp');
    if (secondaryHeroAction) {
      secondaryHeroAction.hidden = true;
      secondaryHeroAction.setAttribute('aria-hidden', 'true');
    }
  }

  function syncAll() {
    normalizeStorefrontChrome();
    replaceLegacyPlaceholders();
    restoreCategoryTiles();
    stabilizeCategoryImages();
    decorateBenefits();
    ensureFeaturedSection();
    ensureOfferBanner();
    renameLiveSections();
    enhanceCatalogCards();
    enhanceProductSheet();
    decorateServiceFooter();
    syncFavoriteButtons();
    if (document.body.dataset.pb36ReviewReady === '1') ensureReviewFallback();
  }

  function scheduleSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      syncAll();
    });
  }

  function showAllProducts() {
    if (typeof window.RESTBR_V3_SHOW_CATALOG === 'function') {
      window.RESTBR_V3_SHOW_CATALOG('all');
    }
    $('#smMenu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showOffers() {
    const offers = offerProducts();
    if (offers.length && typeof window.RESTBR_V3_SHOW_CATALOG === 'function') {
      window.RESTBR_V3_SHOW_CATALOG('offer');
      return;
    }
    $('#pbV3Highlights')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('click', event => {
    const productTrigger = event.target.closest('#smMenu .pb-v3-details-btn,#smMenu .sm-product-image,[data-v3-feature-product]');
    if (productTrigger) {
      currentProductId = String(
        productTrigger.closest('[data-product-card]')?.dataset.productCard ||
        productTrigger.closest('[data-v3-feature-product]')?.dataset.v3FeatureProduct || ''
      );
    }
    if (event.target.closest('#pbV3ProductClose')) currentProductId = '';
  }, true);

  document.addEventListener('click', event => {
    const categoryButton = event.target.closest('#smCats .sm-cat');
    if (categoryButton) {
      const category = String(categoryButton.dataset.cat || categoryButton.dataset.catId || '');
      if (category && typeof window.RESTBR_V3_SHOW_CATALOG === 'function') {
        window.RESTBR_V3_SHOW_CATALOG(category === '__all__' ? 'all' : category);
      }
      window.setTimeout(() => {
        restoreCategoryTiles();
        stabilizeCategoryImages();
      }, 0);
      window.setTimeout(() => {
        restoreCategoryTiles();
        stabilizeCategoryImages();
      }, 120);
      window.setTimeout(enhanceCatalogCards, 160);
    }

    const favorite = event.target.closest('[data-pb36-favorite]');
    if (favorite) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(favorite.dataset.pb36Favorite);
      return;
    }

    const details = event.target.closest('[data-pb36-details]');
    if (details) {
      event.preventDefault();
      openProduct(details.dataset.pb36Details, details);
      return;
    }

    const add = event.target.closest('[data-pb36-add]');
    if (add) {
      event.preventDefault();
      const product = productById(add.dataset.pb36Add);
      if (!addSimpleProduct(product)) openProduct(add.dataset.pb36Add, add);
      return;
    }

    if (event.target.closest('[data-pb36-show-all]')) {
      event.preventDefault();
      showAllProducts();
      return;
    }

    if (event.target.closest('[data-pb36-offers]')) {
      event.preventDefault();
      showOffers();
      return;
    }

    if (event.target.closest('#pb36ZoomButton')) {
      event.preventDefault();
      $('#pbV3ProductStage')?.classList.toggle('pb36-zoomed');
      return;
    }

    if (event.target.closest('#smMenu .pb-v3-details-btn,#smMenu .sm-product-image,[data-v3-feature-product]')) {
      currentProductId = String(
        event.target.closest('[data-product-card]')?.dataset.productCard ||
        event.target.closest('[data-v3-feature-product]')?.dataset.v3FeatureProduct || ''
      );
      window.setTimeout(enhanceProductSheet, 0);
      window.setTimeout(enhanceProductSheet, 90);
    }
  });

  ['restbr:ready', 'restbr:commerce-ready', 'restbr:prices-updated', 'restbr:v3-menu-rendered'].forEach(type => {
    window.addEventListener(type, scheduleSync);
  });

  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) scheduleSync();
  });

  function boot() {
    document.body.classList.remove('pb-v3-reviews-paused');
    syncAll();
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(syncAll, 180);
    window.setTimeout(syncAll, 650);
    window.setTimeout(syncAll, 1400);
    window.setTimeout(ensureReviewFallback, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
