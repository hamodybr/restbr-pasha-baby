/* PASHA BABY — PRODUCT DESCRIPTION V2
   Storefront-only presentation helper.
   Product descriptions already exist in the products table/admin editor; this script
   renders a compact preview under the product name and opens a full retail details sheet. */

(() => {
  if (window.__PB_PRODUCT_DESCRIPTION_V2__) return;
  window.__PB_PRODUCT_DESCRIPTION_V2__ = true;

  const STYLE_ID = 'pbCardDensityV2Style';
  const SHEET_ID = 'pbProductDetailSheet';
  const RETRY_LIMIT = 100;
  let observer = null;
  let langObserver = null;
  let scheduled = false;
  let retries = 0;
  let descriptionRows = new Map();
  let descriptionLoadPromise = null;
  let lastTrigger = null;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'css/pasha-baby-card-density-v2.css?v=2.3';
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

  const uiText = key => {
    const language = currentLanguage();
    const labels = {
      ar: { more: 'المزيد', details: 'تفاصيل المنتج', close: 'إغلاق', add: 'إضافة للسلة' },
      ku: { more: 'زیاتر', details: 'وردەکاری بەرهەم', close: 'داخستن', add: 'زیادکردن بۆ سەبەتە' },
      en: { more: 'More', details: 'Product details', close: 'Close', add: 'Add to cart' }
    };
    return labels[language]?.[key] || labels.ar[key] || key;
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

  const closeSheet = () => {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pb-product-sheet-open');
    document.body?.classList.remove('pb-product-sheet-open');
    setTimeout(() => {
      if (!sheet.classList.contains('open')) sheet.hidden = true;
    }, 220);
    try { lastTrigger?.focus({ preventScroll: true }); } catch (_) {}
  };

  const ensureSheet = () => {
    let sheet = document.getElementById(SHEET_ID);
    if (sheet) return sheet;

    sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'pb-product-sheet';
    sheet.hidden = true;
    sheet.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'pb-product-sheet-backdrop';
    backdrop.setAttribute('aria-label', uiText('close'));
    backdrop.addEventListener('click', closeSheet);

    const panel = document.createElement('section');
    panel.className = 'pb-product-sheet-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'pbProductSheetName');

    const handle = document.createElement('div');
    handle.className = 'pb-product-sheet-handle';
    handle.setAttribute('aria-hidden', 'true');

    const head = document.createElement('div');
    head.className = 'pb-product-sheet-head';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'pb-product-sheet-eyebrow';
    eyebrow.textContent = uiText('details');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'pb-product-sheet-close';
    close.textContent = '×';
    close.setAttribute('aria-label', uiText('close'));
    close.addEventListener('click', closeSheet);

    head.append(eyebrow, close);

    const scroll = document.createElement('div');
    scroll.className = 'pb-product-sheet-scroll';

    const image = document.createElement('img');
    image.className = 'pb-product-sheet-image';
    image.alt = '';

    const name = document.createElement('h3');
    name.id = 'pbProductSheetName';
    name.className = 'pb-product-sheet-name';

    const description = document.createElement('p');
    description.className = 'pb-product-sheet-description';

    const extras = document.createElement('div');
    extras.className = 'pb-product-sheet-extras';

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'pb-product-sheet-action';
    action.textContent = uiText('add');

    scroll.append(image, name, description, extras, action);
    panel.append(handle, head, scroll);
    sheet.append(backdrop, panel);
    document.body.appendChild(sheet);

    sheet.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
    });

    return sheet;
  };

  const openSheet = (card, product, description, trigger) => {
    if (!card || !product || !description) return;
    const sheet = ensureSheet();
    const image = sheet.querySelector('.pb-product-sheet-image');
    const name = sheet.querySelector('.pb-product-sheet-name');
    const body = sheet.querySelector('.pb-product-sheet-description');
    const extras = sheet.querySelector('.pb-product-sheet-extras');
    const action = sheet.querySelector('.pb-product-sheet-action');
    const close = sheet.querySelector('.pb-product-sheet-close');

    const cardImage = card.querySelector('.sm-product-image');
    const cardName = card.querySelector('.sm-name');
    const originalAction = card.querySelector('.sm-direct-add, .sm-choose-options');
    const colorPreview = card.querySelector('.pb-color-preview');
    const optionPreview = card.querySelector('.sm-options-scroll');

    if (image) {
      image.src = cardImage?.currentSrc || cardImage?.src || '';
      image.alt = String(cardName?.textContent || '').trim();
      image.hidden = !image.src;
    }
    if (name) name.textContent = String(cardName?.textContent || '').trim();
    if (body) body.textContent = description;

    if (extras) {
      extras.replaceChildren();
      if (colorPreview) {
        const colors = colorPreview.cloneNode(true);
        colors.classList.add('pb-product-sheet-colors');
        extras.appendChild(colors);
      }
      if (optionPreview) {
        const options = optionPreview.cloneNode(true);
        options.classList.add('pb-product-sheet-options');
        extras.appendChild(options);
      }
    }

    if (action) {
      if (originalAction) {
        action.hidden = false;
        action.innerHTML = originalAction.innerHTML;
        action.onclick = () => {
          closeSheet();
          setTimeout(() => originalAction.click(), 40);
        };
      } else {
        action.hidden = true;
        action.onclick = null;
      }
    }

    lastTrigger = trigger || null;
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pb-product-sheet-open');
    document.body?.classList.add('pb-product-sheet-open');
    requestAnimationFrame(() => sheet.classList.add('open'));
    setTimeout(() => {
      try { close?.focus({ preventScroll: true }); } catch (_) {}
    }, 30);
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
      let more = info.querySelector('.pb-product-description-more');

      if (!description) {
        node?.remove();
        more?.remove();
        return;
      }

      if (!node) {
        node = document.createElement('div');
        node.className = 'pb-product-description';
        name.insertAdjacentElement('afterend', node);
      }

      if (node.textContent !== description) node.textContent = description;
      node.setAttribute('aria-label', description);
      node.removeAttribute('title');

      const showMore = description.length > 46;
      if (!showMore) {
        more?.remove();
        return;
      }

      if (!more) {
        more = document.createElement('button');
        more.type = 'button';
        more.className = 'pb-product-description-more';
        node.insertAdjacentElement('afterend', more);
      }

      more.textContent = uiText('more');
      more.setAttribute('aria-label', `${uiText('more')}: ${String(name.textContent || '').trim()}`);
      more.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openSheet(card, product, description, more);
      };
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
    ensureSheet();

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
    ensureSheet();
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
