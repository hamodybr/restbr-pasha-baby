(() => {
  if (window.__PASHA_STOREFRONT_V3__) return;
  window.__PASHA_STOREFRONT_V3__ = true;

  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  let catalogDelayTimer = 0;

  function iconFor(value) {
    const text = String(value || '').toLowerCase();
    if (/حفاض|diaper|wipe|مناديل/.test(text)) return '🧷';
    if (/رضاع|حليب|bottle|feed|pacifier|لهاية/.test(text)) return '🍼';
    if (/عناي|كريم|شامبو|care|cream|shampoo/.test(text)) return '🧴';
    if (/استحم|حمام|منشف|bath|towel/.test(text)) return '🛁';
    if (/ملابس|لباس|قطن|clothes|clothing/.test(text)) return '👕';
    if (/نوم|بطاني|سرير|sleep|blanket|bed/.test(text)) return '🌙';
    if (/لعب|العاب|ألعاب|toy|game/.test(text)) return '🧸';
    if (/عربات|عربة|كرسي|stroller|seat|carriage/.test(text)) return '🚼';
    if (/حقيبة|شنط|bag|سفر/.test(text)) return '🎒';
    if (/سلامة|حماية|safety|protect/.test(text)) return '🛡️';
    if (/غذاء|طعام|food|meal/.test(text)) return '🥣';
    if (/رضيع|baby|مواليد/.test(text)) return '👶';
    return '✦';
  }

  function hideIntro() {
    const intro = $('#smIntro');
    if (!intro) return;
    intro.classList.add('hide');
    window.setTimeout(() => {
      intro.style.display = 'none';
    }, 180);
  }

  function setDrawer(open) {
    const drawer = $('#pbV3Drawer');
    const backdrop = $('#pbV3DrawerBackdrop');
    const button = $('#pbV3MenuBtn');
    if (!drawer || !backdrop) return;

    drawer.classList.toggle('open', Boolean(open));
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    button?.setAttribute('aria-expanded', open ? 'true' : 'false');
    backdrop.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }

  function resolveTarget(selector) {
    if (!selector) return null;
    try {
      const selectors = String(selector).split(',').map(value => value.trim()).filter(Boolean);
      for (const item of selectors) {
        const node = document.querySelector(item);
        if (node) return node;
      }
    } catch (_) {}
    return null;
  }

  function scrollToTarget(selector) {
    const target = resolveTarget(selector);
    if (!target) return false;
    setDrawer(false);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function cartQuantity() {
    try {
      const cart = JSON.parse(localStorage.getItem('RESTBR_CART_V1') || '[]');
      if (!Array.isArray(cart)) return 0;
      return cart.reduce((sum, item) => sum + Math.max(0, Number(item?.qty) || 0), 0);
    } catch (_) {
      return 0;
    }
  }

  function syncCartCount() {
    const count = cartQuantity();
    const label = count > 99 ? '99+' : String(count);

    ['pbV3CartCount', 'pbV3BottomCartCount'].forEach(id => {
      const badge = document.getElementById(id);
      if (!badge) return;
      badge.textContent = label;
      badge.hidden = count <= 0;
    });
  }

  function openCart() {
    const cart = $('#smCartFab');
    if (!cart) return false;
    cart.click();
    window.setTimeout(syncCartCount, 0);
    return true;
  }

  function relocateSearch(targetHost = null) {
    const host = targetHost || $('#pbV3SearchHost');
    const search = $('#smSearchWrap');
    if (!host || !search) return false;

    if (search.parentElement !== host) host.appendChild(search);
    search.classList.add('pb-v3-search');

    const toggle = $('#smSearchToggle');
    if (toggle) toggle.style.display = 'none';
    return true;
  }

  function setBottomNavActive(name) {
    all('.pb-v3-bottom-nav [data-v3-nav]').forEach(button => {
      button.classList.toggle('active', String(button.dataset.v3Nav || '') === name);
    });
  }

  function openSearchOverlay() {
    const overlay = $('#pbV3SearchOverlay');
    const host = $('#pbV3SearchOverlayHost');
    const input = $('#smSearchInput');

    if (!overlay || !host || !input) return false;

    relocateSearch(host);
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.documentElement.classList.add('pb-v3-search-open');
    setBottomNavActive('search');

    window.setTimeout(() => input.focus({ preventScroll: true }), 70);
    return true;
  }

  function closeSearchOverlay({ restoreFocus = false } = {}) {
    const overlay = $('#pbV3SearchOverlay');
    if (!overlay || overlay.hidden) return;

    overlay.classList.remove('open');
    document.documentElement.classList.remove('pb-v3-search-open');

    window.setTimeout(() => {
      relocateSearch($('#pbV3SearchHost'));
      overlay.hidden = true;
      if (restoreFocus) $('#pbV3SearchBtn')?.focus?.({ preventScroll: true });
      syncBottomNavScroll();
    }, 150);
  }

  function focusSearch() {
    const input = $('#smSearchInput');
    if (!input) return false;

    if (window.matchMedia?.('(max-width:680px)').matches) {
      return openSearchOverlay();
    }

    relocateSearch();
    $('#pbV3SearchHost')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => input.focus({ preventScroll: true }), 220);
    return true;
  }

  function syncCategoryIcons(root = document) {
    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products
      : [];

    root.querySelectorAll?.('#smCats .sm-cat').forEach(button => {
      const categoryId = String(button.dataset.cat || button.dataset.catId || '');
      const label = String(button.dataset.v3Label || button.textContent || '').trim();
      if (!label) return;

      button.dataset.v3Label = label;
      button.dataset.v3Icon = iconFor(label);

      const matching = products.filter(product =>
        String(product?.category?.id || '') === categoryId
      );
      const candidate = matching.find(product => String(product?.image || '').trim());
      const count = matching.length;

      const media = candidate
        ? `<span class="pb-v3-cat-media has-image"><img src="${esc(productImage(candidate))}" alt="" loading="lazy" decoding="async"></span>`
        : `<span class="pb-v3-cat-media"><span aria-hidden="true">${esc(iconFor(label))}</span></span>`;

      button.classList.add('pb-v3-cat-tile');
      button.innerHTML = `
        ${media}
        <span class="pb-v3-cat-copy">
          <b>${esc(label)}</b>
          <small>${count ? count.toLocaleString('en-US') + ' منتج' : ''}</small>
        </span>`;
    });
  }

  function localStoreText(value) {
    if (value && typeof value === 'object') {
      return String(value.ar || value.en || value.ku || '').trim();
    }
    return String(value || '').trim();
  }

  function syncStorefrontCopy() {
    const restaurant = window.RESTBR_DB?.restaurant || {};

    const announcementText = localStoreText(restaurant.announcement);
    const announcement = $('#pbV3Announcement');
    const announcementNode = $('#pbV3AnnouncementText');
    if (announcement && announcementNode) {
      const enabled = restaurant.announcementEnabled !== false && Boolean(announcementText);
      announcement.hidden = !enabled;
      announcementNode.textContent = enabled ? announcementText : '';
    }

    const deliveryText =
      localStoreText(restaurant.deliveryInfo) ||
      announcementText ||
      'التوصيل متوفر حسب المنطقة';
    const deliveryNode = $('#pbV3DeliveryBenefit');
    if (deliveryNode) deliveryNode.textContent = deliveryText;

    const footerLocation = localStoreText(restaurant.footerLocation);
    const footerLocationNode = $('.sm-footer-location');
    if (footerLocationNode && footerLocation) footerLocationNode.textContent = footerLocation;

    const brandAr = String(restaurant.nameAr || restaurant.name || 'پاشا بيبي').trim();
    const brandEn = String(restaurant.nameEn || restaurant.name || 'Pasha Baby').trim();

    const topAr = $('.pb-v3-brand b');
    const topEn = $('.pb-v3-brand small');
    if (topAr) topAr.textContent = brandAr;
    if (topEn) topEn.textContent = brandEn;

    const drawerBrand = $('.pb-v3-drawer-brand b');
    if (drawerBrand) drawerBrand.textContent = brandAr;

    const infoDelivery = $('#pbV3InfoDelivery');
    if (infoDelivery) {
      infoDelivery.textContent = restaurant.deliveryEnabled === false
        ? 'التوصيل غير متاح حاليًا.'
        : deliveryText;
    }

    const infoPickup = $('#pbV3InfoPickup');
    if (infoPickup) {
      infoPickup.textContent = restaurant.pickupEnabled === false
        ? 'الاستلام من المحل غير متاح حاليًا.'
        : 'يمكن اختيار الاستلام من المحل عند تثبيت الطلب.';
    }

    const infoLocation = $('#pbV3InfoLocation');
    if (infoLocation && footerLocation) infoLocation.textContent = footerLocation;

    const infoMap = $('#pbV3InfoMap');
    const locationUrl = String(restaurant.location || '').trim();
    if (infoMap) {
      if (/^https?:\/\//i.test(locationUrl)) {
        infoMap.href = locationUrl;
        infoMap.hidden = false;
      } else {
        infoMap.hidden = true;
      }
    }

    const infoCall = $('#pbV3InfoCall');
    const phone = String(restaurant.phone || '').trim();
    if (infoCall) {
      if (phone) {
        infoCall.href = 'tel:' + phone.replace(/[^\d+().-]/g, '');
        infoCall.hidden = false;
      } else {
        infoCall.hidden = true;
      }
    }
  }

  function syncCatalogStatus() {
    const status = $('#pbV3CatalogStatus');
    const text = status?.querySelector('strong');
    const retry = $('#pbV3CatalogRetry');
    if (!status || !text || !retry) return;

    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products
      : [];

    if (products.length) {
      status.hidden = true;
      retry.hidden = true;
      if (catalogDelayTimer) {
        clearTimeout(catalogDelayTimer);
        catalogDelayTimer = 0;
      }
      return;
    }

    status.hidden = false;
    text.textContent = 'جاري تحميل المنتجات...';
    retry.hidden = true;
  }

  function markCatalogDelayed() {
    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products
      : [];
    if (products.length) return;

    const status = $('#pbV3CatalogStatus');
    const text = status?.querySelector('strong');
    const retry = $('#pbV3CatalogRetry');
    if (!status || !text || !retry) return;

    status.hidden = false;
    text.textContent = 'التحميل أخذ وقتًا أطول من المعتاد.';
    retry.hidden = false;
  }

  function syncProductCount() {
    const node = $('#pbV3ProductCount');
    if (!node) return;

    const dbCount = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products.length
      : 0;
    const domCount = all('#smMenu .sm-card').length;
    const count = dbCount || domCount;
    node.textContent = count > 0 ? count.toLocaleString('en-US') + ' منتج' : '';
  }

  function syncWhatsApp() {
    const source = $('#smFooterWhatsapp');
    const configured = String(window.RESTBR_DB?.restaurant?.whatsapp || '').trim();
    const fallback = String(source?.href || source?.getAttribute?.('href') || '').trim();
    const href = /^https?:\/\//i.test(configured) || /^whatsapp:/i.test(configured)
      ? configured
      : fallback;
    const valid = /^https?:\/\//i.test(href) || /^whatsapp:/i.test(href);

    ['pbV3HeroWhatsapp', 'pbV3DrawerWhatsapp', 'pbV3WhatsAppFab'].forEach(id => {
      const target = document.getElementById(id);
      if (!target) return;
      if (valid) {
        target.href = href;
        target.hidden = false;
      } else {
        target.hidden = true;
      }
    });
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function productName(product) {
    return String(product?.name?.ar || product?.name?.en || '').trim();
  }

  function categoryName(product) {
    return String(product?.category?.ar || product?.category?.en || '').trim();
  }

  function productPrice(product) {
    const prices = (product?.options || [])
      .map(option => Number(option?.price))
      .filter(value => Number.isFinite(value) && value >= 0);
    return prices.length ? Math.min(...prices) : null;
  }

  function money(value) {
    if (!Number.isFinite(Number(value))) return '';
    return Number(value).toLocaleString('en-US') + ' د.ع';
  }

  function productImage(product) {
    const original = String(product?.image || '').trim();
    const safe = typeof window.RESTBR_SAFE_MEDIA_URL === 'function'
      ? window.RESTBR_SAFE_MEDIA_URL(original)
      : original;
    const source = safe || 'assets/pasha-baby-product-placeholder.svg';
    if (typeof window.RESTBR_OPTIMIZED_MEDIA_URL === 'function') {
      return window.RESTBR_OPTIMIZED_MEDIA_URL(source, 'product-card') || source;
    }
    return source;
  }

  function featureBadge(type) {
    if (type === 'popular') return 'الأكثر طلبًا';
    if (type === 'new') return 'جديد';
    if (type === 'offer') return 'عرض';
    return '';
  }

  function featureCard(product, type) {
    const price = productPrice(product);
    const name = productName(product);
    const category = categoryName(product);
    return `
      <article class="pb-v3-feature-card" data-v3-feature-product="${esc(product.id)}" tabindex="0" role="button"
               aria-label="عرض تفاصيل ${esc(name)}">
        <div class="pb-v3-feature-image">
          <img src="${esc(productImage(product))}" alt="${esc(name)}" loading="lazy" decoding="async">
          <span class="pb-v3-feature-badge">${esc(featureBadge(type))}</span>
        </div>
        <div class="pb-v3-feature-copy">
          <strong>${esc(name)}</strong>
          <small>${esc(category)}</small>
          <span class="pb-v3-feature-price">${price === null ? '' : esc(money(price))}</span>
          <span class="pb-v3-feature-open">التفاصيل</span>
        </div>
      </article>`;
  }

  function renderHighlightGroup(type, products) {
    const section = document.getElementById(
      type === 'popular' ? 'pbV3PopularSection' :
      type === 'new' ? 'pbV3NewSection' :
      'pbV3OfferSection'
    );
    const list = document.querySelector(`[data-v3-highlight-list="${type}"]`);
    if (!section || !list) return;

    const rows = products.slice(0, 6);
    section.hidden = rows.length === 0;
    list.innerHTML = rows.map(product => featureCard(product, type)).join('');
  }

  function renderHighlights() {
    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products
      : [];
    if (!products.length) return;

    const available = products.filter(product => product?.badges?.unavailable !== true);
    renderHighlightGroup('popular', available.filter(product => product?.badges?.popular === true));
    renderHighlightGroup('new', available.filter(product => product?.badges?.new === true));
    const offerProducts = available.filter(product => product?.badges?.offer === true);
    renderHighlightGroup('offer', offerProducts);

    const offerDrawer = $('#pbV3DrawerOffers');
    if (offerDrawer) offerDrawer.hidden = offerProducts.length === 0;

    const holder = $('#pbV3Highlights');
    if (holder) {
      holder.hidden = !holder.querySelector('.pb-v3-highlight-group:not([hidden])');
    }
  }

  function findProductCard(productId) {
    return [...document.querySelectorAll('[data-product-card]')].find(
      card => String(card.dataset.productCard || '') === String(productId || '')
    ) || null;
  }

  function activateProductCategory(product) {
    const categoryId = String(product?.category?.id || '');
    if (!categoryId) return false;
    const button = [...document.querySelectorAll('#smCats .sm-cat')].find(
      item => String(item.dataset.cat || item.dataset.catId || '') === categoryId
    );
    if (!button) return false;
    if (!button.classList.contains('active')) button.click();
    return true;
  }

  function showFeatureProduct(productId) {
    const product = window.RESTBR_DB?.products?.find(
      item => String(item.id) === String(productId)
    );
    if (!product) return;

    if (typeof window.PASHA_V3_OPEN_PRODUCT_DETAILS === 'function') {
      void window.PASHA_V3_OPEN_PRODUCT_DETAILS(product.id);
      return;
    }

    activateProductCategory(product);
    window.setTimeout(() => {
      findProductCard(product.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  function syncHeroProduct() {
    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products.filter(product =>
          product?.badges?.unavailable !== true && String(product?.image || '').trim()
        )
      : [];
    if (!products.length) return;

    const product =
      products.find(item => item?.badges?.popular === true) ||
      products.find(item => item?.badges?.new === true) ||
      products[0];

    const art = $('.pb-v3-hero-art');
    const image = art?.querySelector('img');
    if (!art || !image || !product) return;

    const safe = typeof window.RESTBR_SAFE_MEDIA_URL === 'function'
      ? window.RESTBR_SAFE_MEDIA_URL(product.image)
      : String(product.image || '');
    if (!safe) return;

    image.src = safe;
    image.alt = productName(product);
    art.classList.add('has-product');

    let caption = $('#pbV3HeroProduct');
    if (!caption) {
      caption = document.createElement('button');
      caption.id = 'pbV3HeroProduct';
      caption.className = 'pb-v3-hero-product';
      caption.type = 'button';
      art.appendChild(caption);
    }

    const price = productPrice(product);
    caption.innerHTML = `
      <span>${esc(productName(product))}</span>
      <b>${price === null ? 'عرض التفاصيل' : esc(money(price))}</b>`;
    caption.onclick = () => showFeatureProduct(product.id);
  }

  function enhanceCheckout() {
    const sheet = $('#smCheckoutSheet');
    const body = sheet?.querySelector('.sm-checkout-body');
    const head = sheet?.querySelector('.sm-checkout-head');
    if (!sheet || !body || !head) return false;

    if (!$('#pbV3CheckoutIntro')) {
      const intro = document.createElement('div');
      intro.id = 'pbV3CheckoutIntro';
      intro.className = 'pb-v3-checkout-intro';
      intro.innerHTML = `
        <b>✓</b>
        <span>
          <strong>بيانات بسيطة لتثبيت الطلب</strong>
          <small>لا تحتاج إلى حساب أو تسجيل دخول.</small>
        </span>`;
      head.insertAdjacentElement('afterend', intro);
    }

    if (!$('#pbV3CheckoutTrust')) {
      const trust = document.createElement('div');
      trust.id = 'pbV3CheckoutTrust';
      trust.className = 'pb-v3-checkout-trust';
      trust.innerHTML = `
        <span><i>✓</i> الدفع عند الاستلام</span>
        <span><i>✓</i> بدون إنشاء حساب</span>
        <span><i>✓</i> تثبيت مباشر</span>`;
      body.appendChild(trust);
    }

    const name = $('#smCustomerName');
    const phone = $('#smCustomerPhone');
    const address = $('#smCustomerAddress');
    const notes = $('#smCustomerNotes');
    if (name) name.placeholder = 'الاسم الكامل';
    if (phone) phone.placeholder = '07xx xxx xxxx';
    if (address) address.placeholder = 'المنطقة، الشارع، أقرب نقطة دالة';
    if (notes) notes.placeholder = 'أي ملاحظة تخص الطلب...';

    const pickup = $('#smPickupBtn');
    if (pickup) pickup.textContent = 'استلام من المحل';

    return true;
  }

  function syncBottomNavScroll() {
    if (!$('#pbV3SearchOverlay')?.hidden) return;

    const hero = $('#pbV3Hero');
    const categories = $('#smCatsSentinel');
    const menu = $('#smMenu');
    const y = window.scrollY + Math.min(window.innerHeight * .38, 260);

    if (menu && y >= menu.offsetTop) {
      setBottomNavActive('categories');
      return;
    }

    if (categories && y >= categories.offsetTop) {
      setBottomNavActive('categories');
      return;
    }

    if (hero) setBottomNavActive('home');
  }

  function syncTopbarScroll() {
    const topbar = $('#pbV3Topbar');
    if (!topbar) return;
    topbar.classList.toggle('is-scrolled', window.scrollY > 8);
    syncBottomNavScroll();
  }

  function installTopbarScroll() {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        syncTopbarScroll();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    syncTopbarScroll();
  }

  function bindStaticControls() {
    $('#pbV3MenuBtn')?.addEventListener('click', () => setDrawer(true));
    $('#pbV3DrawerClose')?.addEventListener('click', () => setDrawer(false));
    $('#pbV3DrawerBackdrop')?.addEventListener('click', () => setDrawer(false));

    $('#pbV3SearchBtn')?.addEventListener('click', focusSearch);
    $('#pbV3BottomSearch')?.addEventListener('click', focusSearch);
    $('#pbV3SearchClose')?.addEventListener('click', () => closeSearchOverlay({ restoreFocus: true }));
    $('#pbV3SearchShowResults')?.addEventListener('click', () => {
      closeSearchOverlay();
      window.setTimeout(() => scrollToTarget('#smMenu'), 170);
    });
    $('#pbV3SearchOverlay')?.addEventListener('click', event => {
      if (event.target?.id === 'pbV3SearchOverlay') closeSearchOverlay();
    });

    $('#pbV3CartBtn')?.addEventListener('click', openCart);
    $('#pbV3BottomCart')?.addEventListener('click', openCart);

    $('#pbV3ShopNow')?.addEventListener('click', () => scrollToTarget('#smCatsSentinel'));
    $('#pbV3SeeProducts')?.addEventListener('click', () => scrollToTarget('#smMenu'));
    $('#pbV3CatalogRetry')?.addEventListener('click', () => window.location.reload());

    document.addEventListener('click', event => {
      const nav = event.target.closest('[data-v3-target]');
      if (nav) {
        event.preventDefault();
        scrollToTarget(nav.getAttribute('data-v3-target'));
        return;
      }

      const feature = event.target.closest('[data-v3-feature-product]');
      if (feature) {
        event.preventDefault();
        showFeatureProduct(feature.dataset.v3FeatureProduct);
        return;
      }

      const highlightJump = event.target.closest('[data-v3-highlight-jump]');
      if (highlightJump) {
        const type = String(highlightJump.dataset.v3HighlightJump || '');
        const first = document.querySelector(`[data-v3-highlight-list="${type}"] [data-v3-feature-product]`);
        if (first) showFeatureProduct(first.dataset.v3FeatureProduct);
        return;
      }

      if (event.target.closest('#smCats .sm-cat')) {
        window.setTimeout(() => {
          syncCategoryIcons();
          syncProductCount();
          syncCardDecorations();
        }, 0);
      }

      if (event.target.closest('#smCartContinue')) {
        window.setTimeout(enhanceCheckout, 0);
      }

      if (event.target.closest('.sm-direct-add,.sm-add-cart,.sm-choose-options,#smCartContinue,.sm-cart-qty button,.sm-cart-remove')) {
        window.setTimeout(syncCartCount, 0);
      }
    });

    document.addEventListener('input', event => {
      if (event.target?.id === 'smSearchInput') {
        window.setTimeout(syncCardDecorations, 0);
      }
    });

    document.addEventListener('keydown', event => {
      const feature = event.target.closest?.('[data-v3-feature-product]');
      if (feature && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        showFeatureProduct(feature.dataset.v3FeatureProduct);
        return;
      }
      if (event.key === 'Escape') {
        if (!$('#pbV3SearchOverlay')?.hidden) {
          closeSearchOverlay({ restoreFocus: true });
          return;
        }
        setDrawer(false);
      }
    });

    window.addEventListener('storage', event => {
      if (event.key === 'RESTBR_CART_V1') syncCartCount();
    });
    window.addEventListener('pageshow', () => {
      syncCartCount();
      syncTopbarScroll();
    }, { passive: true });
  }

  function syncCardSummaries() {
    const products = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products
      : [];

    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const product = products.find(item =>
        String(item?.id || '') === String(card.dataset.productCard || '')
      );
      if (!product) return;

      const info = card.querySelector('.sm-info');
      const action = info?.querySelector('.sm-direct-add,.sm-choose-options');
      if (!info || !action) return;

      let summary = info.querySelector('.pb-v3-card-summary');
      if (!summary) {
        summary = document.createElement('div');
        summary.className = 'pb-v3-card-summary';
        action.insertAdjacentElement('beforebegin', summary);
      }

      const options = Array.isArray(product.options) ? product.options : [];
      const sorted = options
        .map(option => ({
          current: Number(option?.price),
          original: Number(option?.originalPrice ?? option?.price)
        }))
        .filter(row => Number.isFinite(row.current))
        .sort((a, b) => a.current - b.current);

      if (!sorted.length) {
        summary.hidden = true;
        return;
      }

      summary.hidden = false;
      const lowest = sorted[0];
      const hasRange = new Set(sorted.map(row => row.current)).size > 1;
      const discounted = Number.isFinite(lowest.original) && lowest.original > lowest.current;

      summary.innerHTML = `
        <span>
          ${hasRange ? '<small>ابتداءً من</small>' : ''}
          ${discounted ? `<del>${esc(money(lowest.original))}</del>` : ''}
          <b>${esc(money(lowest.current))}</b>
        </span>
        ${Number(product.discountPercent || 0) > 0
          ? `<i>-${Math.round(Number(product.discountPercent))}%</i>`
          : ''}
      `;
    });
  }

  function syncCardActionRows() {
    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const info = card.querySelector('.sm-info');
      const action = info?.querySelector('.sm-direct-add,.sm-choose-options');
      const details = info?.querySelector('.pb-v3-details-btn');
      if (!info || !action || !details) return;

      let row = action.closest('.pb-product-action-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'pb-product-action-row';
        action.insertAdjacentElement('beforebegin', row);
        row.appendChild(action);
      }

      if (details.parentElement !== row) row.appendChild(details);
    });
  }

  function syncCardDecorations() {
    window.PASHA_RETAIL_DECORATE_CARDS?.();
    window.PASHA_FIXED_DISCOUNTS_DECORATE?.();
    window.PASHA_LIVE_BADGES_SYNC?.();
    window.PASHA_V3_ENHANCE_PRODUCT_CARDS?.();
    syncCardSummaries();
    syncCardActionRows();

    requestAnimationFrame(() => {
      window.PASHA_V3_ENHANCE_PRODUCT_CARDS?.();
      syncCardSummaries();
      syncCardActionRows();
    });
  }

  function stripLegacyPresentationRuntime() {
    [
      'smDiscoveryStyle',
      'smV44PolishStyles',
      'smUiDesignRuntime',
      'smMenuCardPolishV38'
    ].forEach(id => document.getElementById(id)?.remove());
  }

  function syncRuntimeUI() {
    stripLegacyPresentationRuntime();
    const searchOverlay = $('#pbV3SearchOverlay');
    relocateSearch(
      searchOverlay && !searchOverlay.hidden
        ? $('#pbV3SearchOverlayHost')
        : $('#pbV3SearchHost')
    );
    syncCategoryIcons();
    syncStorefrontCopy();
    syncCatalogStatus();
    syncProductCount();
    syncCartCount();
    syncWhatsApp();
    renderHighlights();
    syncHeroProduct();
    enhanceCheckout();
    syncCardDecorations();

    const cartFab = $('#smCartFab');
    if (cartFab) {
      cartFab.setAttribute('aria-label', 'فتح السلة');
    }
  }

  function boot() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';

    bindStaticControls();
    installTopbarScroll();

    window.setTimeout(hideIntro, 180);
    window.setTimeout(syncRuntimeUI, 0);
    window.setTimeout(syncRuntimeUI, 180);
    window.setTimeout(syncRuntimeUI, 520);
    window.setTimeout(syncRuntimeUI, 1200);
    catalogDelayTimer = window.setTimeout(markCatalogDelayed, 3500);

    window.addEventListener('restbr:ready', syncRuntimeUI, { once: true });
    window.addEventListener('restbr:commerce-ready', syncRuntimeUI);
    window.addEventListener('restbr:prices-updated', syncRuntimeUI);
    window.addEventListener('pasha:v3-cart-changed', syncCartCount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();