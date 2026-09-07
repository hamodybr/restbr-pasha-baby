/* PASHA BABY — PRODUCT DESCRIPTION V2
   Storefront-only presentation helper.
   Product descriptions already exist in the products table/admin editor; this script
   renders the current-language description directly under the product name. */

(() => {
  if (window.__PB_PRODUCT_DESCRIPTION_V2__) return;
  window.__PB_PRODUCT_DESCRIPTION_V2__ = true;

  const STYLE_ID = 'pbCardDensityV2Style';
  const RETRY_LIMIT = 80;
  let observer = null;
  let langObserver = null;
  let scheduled = false;
  let retries = 0;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'css/pasha-baby-card-density-v2.css?v=2.0';
    document.head.appendChild(link);
  };

  const currentLanguage = () => {
    try {
      if (typeof lang !== 'undefined' && ['ar', 'ku', 'en'].includes(String(lang))) {
        return String(lang);
      }
    } catch (_) {}

    const htmlLang = String(document.documentElement.lang || 'ar').toLowerCase();
    if (htmlLang.startsWith('ku')) return 'ku';
    if (htmlLang.startsWith('en')) return 'en';
    return 'ar';
  };

  const currentDatabase = () => {
    try {
      return typeof DB !== 'undefined' ? DB : null;
    } catch (_) {
      return null;
    }
  };

  const descriptionFor = product => {
    if (!product) return '';
    const language = currentLanguage();
    const preferred = product[`description_${language}`];
    return String(
      preferred ||
      product.description_ar ||
      product.description_en ||
      product.description_ku ||
      ''
    ).trim();
  };

  const syncDescriptions = () => {
    scheduled = false;

    const database = currentDatabase();
    if (!database || !Array.isArray(database.products)) return false;

    const byId = new Map(
      database.products.map(product => [String(product?.id || ''), product])
    );

    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const info = card.querySelector('.sm-info');
      const name = info?.querySelector('.sm-name');
      if (!info || !name) return;

      const product = byId.get(String(card.dataset.productCard || ''));
      const description = descriptionFor(product);
      let node = info.querySelector('.pb-product-description');

      if (!description) {
        node?.remove();
        return;
      }

      if (!node) {
        node = document.createElement('div');
        node.className = 'pb-product-description';
        name.insertAdjacentElement('afterend', node);
      }

      if (node.textContent !== description) node.textContent = description;
      node.setAttribute('aria-label', description);
    });

    return true;
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(syncDescriptions);
  };

  const attach = () => {
    ensureStyle();

    const menu = document.getElementById('smMenu');
    if (!menu) {
      if (retries++ < RETRY_LIMIT) setTimeout(attach, 100);
      return;
    }

    observer?.disconnect();
    observer = new MutationObserver(scheduleSync);
    observer.observe(menu, { childList: true, subtree: true });

    langObserver?.disconnect();
    langObserver = new MutationObserver(scheduleSync);
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'dir']
    });

    scheduleSync();
    setTimeout(scheduleSync, 250);
    setTimeout(scheduleSync, 900);
  };

  const start = () => {
    ensureStyle();
    attach();
    window.addEventListener('pageshow', scheduleSync, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
