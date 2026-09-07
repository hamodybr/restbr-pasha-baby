/* PASHA BABY — PRODUCT DESCRIPTION V2
   Storefront-only presentation helper.
   Product descriptions already exist in the products table/admin editor; this script
   renders the current-language description directly under the product name. */

(() => {
  if (window.__PB_PRODUCT_DESCRIPTION_V2__) return;
  window.__PB_PRODUCT_DESCRIPTION_V2__ = true;

  const STYLE_ID = 'pbCardDensityV2Style';
  const RETRY_LIMIT = 100;
  let observer = null;
  let langObserver = null;
  let scheduled = false;
  let retries = 0;
  let descriptionRows = new Map();
  let descriptionLoadPromise = null;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'css/pasha-baby-card-density-v2.css?v=2.2';
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

  const descriptionFromRow = row => {
    if (!row) return '';
    const language = currentLanguage();
    return String(
      row[`description_${language}`] ||
      row.description_ar ||
      row.description_en ||
      row.description_ku ||
      ''
    ).trim();
  };

  const descriptionFor = product => {
    if (!product) return '';

    const direct = descriptionFromRow(product);
    if (direct) return direct;

    const nested = product.description;
    if (nested && typeof nested === 'object') {
      const language = currentLanguage();
      const value = String(
        nested[language] || nested.ar || nested.en || nested.ku || ''
      ).trim();
      if (value) return value;
    }

    return descriptionFromRow(descriptionRows.get(String(product.id || '')));
  };

  const loadDescriptions = async () => {
    if (descriptionLoadPromise) return descriptionLoadPromise;

    descriptionLoadPromise = (async () => {
      for (let attempt = 0; attempt < 35; attempt += 1) {
        try {
          if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
              .from('products')
              .select('id,description_ar,description_ku,description_en');

            if (error) throw error;

            descriptionRows = new Map(
              (Array.isArray(data) ? data : []).map(row => [String(row.id || ''), row])
            );
            scheduleSync();
            return true;
          }
        } catch (error) {
          console.warn('Pasha Baby product description load failed:', error);
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 120));
      }
      return false;
    })();

    return descriptionLoadPromise;
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
      node.setAttribute('title', description);
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

    loadDescriptions();
    scheduleSync();
    setTimeout(scheduleSync, 250);
    setTimeout(scheduleSync, 900);
    setTimeout(scheduleSync, 1800);
  };

  const start = () => {
    ensureStyle();
    attach();
    loadDescriptions();
    window.addEventListener('pageshow', () => {
      loadDescriptions();
      scheduleSync();
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
