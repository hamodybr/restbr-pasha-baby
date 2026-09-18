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

      if (event.target.closest('.sm-direct-add,.sm-add-cart,.sm-choose-options,#smCartContinue,.sm-cart-qty button,.sm-cart-remove')) {
        window.setTimeout(syncCartCount, 0);
      }
    });

    document.addEventListener('keydown', event => {
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

  function syncRuntimeUI() {
    relocateSearch();
    syncCategoryIcons();
    syncProductCount();
    syncCartCount();
    syncWhatsApp();

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

    window.addEventListener('restbr:ready', syncRuntimeUI, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();