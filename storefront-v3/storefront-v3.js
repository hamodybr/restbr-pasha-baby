(() => {
  if (window.__PASHA_STOREFRONT_V3__) return;
  window.__PASHA_STOREFRONT_V3__ = true;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

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
    const badge = $('#pbV3CartCount');
    if (!badge) return;
    const count = cartQuantity();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count <= 0;
  }

  function openCart() {
    const cart = $('#smCartFab');
    if (!cart) return false;
    cart.click();
    window.setTimeout(syncCartCount, 0);
    return true;
  }

  function relocateSearch() {
    const host = $('#pbV3SearchHost');
    const search = $('#smSearchWrap');
    if (!host || !search) return false;

    if (search.parentElement !== host) host.appendChild(search);
    search.classList.add('pb-v3-search');

    const toggle = $('#smSearchToggle');
    if (toggle) toggle.style.display = 'none';
    return true;
  }

  function focusSearch() {
    relocateSearch();
    const input = $('#smSearchInput');
    if (!input) return false;
    $('#pbV3SearchHost')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => input.focus({ preventScroll: true }), 260);
    return true;
  }

  function syncCategoryIcons(root = document) {
    root.querySelectorAll?.('#smCats .sm-cat').forEach(button => {
      if (!button.dataset.v3Icon) button.dataset.v3Icon = iconFor(button.textContent);
    });
  }

  function syncProductCount() {
    const node = $('#pbV3ProductCount');
    if (!node) return;

    const dbCount = Array.isArray(window.RESTBR_DB?.products)
      ? window.RESTBR_DB.products.length
      : 0;
    const domCount = $$('#smMenu .sm-card').length;
    const count = dbCount || domCount;
    node.textContent = count > 0 ? count.toLocaleString('en-US') + ' منتج' : '';
  }

  function syncWhatsApp() {
    const source = $('#smFooterWhatsapp');
    const href = String(source?.href || source?.getAttribute?.('href') || '').trim();
    const valid = /^https?:\/\//i.test(href) || /^whatsapp:/i.test(href);

    ['pbV3HeroWhatsapp', 'pbV3DrawerWhatsapp'].forEach(id => {
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
    renderHighlightGroup('offer', available.filter(product => product?.badges?.offer === true));

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

    activateProductCategory(product);

    const reveal = () => {
      const card = findProductCard(product.id);
      if (!card) return false;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('sm-deep-highlight');
      window.setTimeout(() => card.classList.remove('sm-deep-highlight'), 1600);

      const details = card.querySelector('.pb-card-details-btn,.pb-product-description-more');
      if (details) {
        window.setTimeout(() => details.click(), 260);
      }
      return true;
    };

    if (!reveal()) {
      window.setTimeout(reveal, 120);
      window.setTimeout(reveal, 320);
    }
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

  function syncTopbarScroll() {
    const topbar = $('#pbV3Topbar');
    if (!topbar) return;
    topbar.classList.toggle('is-scrolled', window.scrollY > 8);
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

    $('#pbV3CartBtn')?.addEventListener('click', openCart);
    $('#pbV3BottomCart')?.addEventListener('click', openCart);

    $('#pbV3ShopNow')?.addEventListener('click', () => scrollToTarget('#smCatsSentinel'));
    $('#pbV3SeeProducts')?.addEventListener('click', () => scrollToTarget('#smMenu'));

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
        }, 0);
      }

      if (event.target.closest('#smCartContinue')) {
        window.setTimeout(enhanceCheckout, 0);
      }

      if (event.target.closest('.sm-direct-add,.sm-add-cart,.sm-choose-options,#smCartContinue,.sm-cart-qty button,.sm-cart-remove')) {
        window.setTimeout(syncCartCount, 0);
      }
    });

    document.addEventListener('keydown', event => {
      const feature = event.target.closest?.('[data-v3-feature-product]');
      if (feature && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        showFeatureProduct(feature.dataset.v3FeatureProduct);
        return;
      }
      if (event.key === 'Escape') setDrawer(false);
    });

    window.addEventListener('storage', event => {
      if (event.key === 'RESTBR_CART_V1') syncCartCount();
    });
    window.addEventListener('pageshow', () => {
      syncCartCount();
      syncTopbarScroll();
    }, { passive: true });
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
    relocateSearch();
    syncCategoryIcons();
    syncProductCount();
    syncCartCount();
    syncWhatsApp();
    renderHighlights();
    enhanceCheckout();

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

    window.addEventListener('restbr:ready', syncRuntimeUI, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();