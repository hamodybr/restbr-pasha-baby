/* PASHA BABY — PRODUCT DETAILS GALLERY V3
   Storefront-only helper. Every product image opens one details sheet whose
   gallery starts with the main product image, then follows with color images. */

(() => {
  if (window.__PB_PRODUCT_DETAILS_GALLERY_V3__) return;
  window.__PB_PRODUCT_DETAILS_GALLERY_V3__ = true;

  const STYLE_ID = 'pbCardDensityV2Style';
  const SHEET_ID = 'pbProductDetailSheet';
  const RETRY_LIMIT = 100;
  const SWIPE_THRESHOLD = 44;
  const PRODUCT_PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';
  let observer = null;
  let langObserver = null;
  let scheduled = false;
  let retries = 0;
  let descriptionRows = new Map();
  let descriptionLoadPromise = null;
  let lastTrigger = null;
  let activeProductId = '';
  let gallerySlides = [];
  let activeGalleryIndex = 0;
  let selectedDetailColorId = '';
  let swipeStart = null;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'css/pasha-baby-card-density-v2.css?v=3.0';
    document.head.appendChild(link);
  };

  const currentLanguage = () => {
    try {
      if (typeof lang !== 'undefined' && ['ar', 'ku', 'en'].includes(String(lang))) {
        return String(lang);
      }
    } catch (_) {}

    let configured = '';
    try {
      if (typeof window.RESTBR_LANG === 'function') {
        configured = String(window.RESTBR_LANG() || '').toLowerCase();
      }
    } catch (_) {}
    if (['ar', 'ku', 'en'].includes(configured)) return configured;

    const htmlLang = String(document.documentElement.lang || 'ar').toLowerCase();
    if (htmlLang.startsWith('ku')) return 'ku';
    if (htmlLang.startsWith('en')) return 'en';
    return 'ar';
  };

  const uiText = key => {
    const language = currentLanguage();
    const labels = {
      ar: {
        more: 'المزيد',
        details: 'تفاصيل المنتج',
        close: 'إغلاق',
        add: 'إضافة للسلة',
        colors: 'اختر اللون',
        mainImage: 'صورة المنتج',
        swipe: 'اسحب الصورة للتنقل بين الألوان',
        previous: 'الصورة السابقة',
        next: 'الصورة التالية',
        image: 'الصورة',
        of: 'من',
        unavailable: 'غير متوفر',
        openDetails: 'فتح تفاصيل المنتج'
      },
      ku: {
        more: 'زیاتر',
        details: 'وردەکاری بەرهەم',
        close: 'داخستن',
        add: 'زیادکردن بۆ سەبەتە',
        colors: 'رەنگ هەڵبژێرە',
        mainImage: 'وێنەی بەرهەم',
        swipe: 'وێنەکە بکێشە بۆ گۆڕینی رەنگ',
        previous: 'وێنەی پێشوو',
        next: 'وێنەی دواتر',
        image: 'وێنە',
        of: 'لە',
        unavailable: 'بەردەست نییە',
        openDetails: 'کردنەوەی وردەکاری بەرهەم'
      },
      en: {
        more: 'More',
        details: 'Product details',
        close: 'Close',
        add: 'Add to cart',
        colors: 'Choose a color',
        mainImage: 'Product image',
        swipe: 'Swipe the image to browse colors',
        previous: 'Previous image',
        next: 'Next image',
        image: 'Image',
        of: 'of',
        unavailable: 'Unavailable',
        openDetails: 'Open product details'
      }
    };
    return labels[language]?.[key] || labels.ar[key] || key;
  };

  const safeMedia = value => {
    try {
      const guard = window.RESTBR_SAFE_MEDIA_URL;
      if (typeof guard === 'function') return guard(value) || '';
    } catch (_) {}
    return String(value || '').trim();
  };

  const currentDatabase = () => {
    if (window.RESTBR_DB) return window.RESTBR_DB;
    try {
      return typeof DB !== 'undefined' ? DB : null;
    } catch (_) {
      return null;
    }
  };

  const productById = productId => {
    const database = currentDatabase();
    if (!database || !Array.isArray(database.products)) return null;
    return database.products.find(product => String(product?.id || '') === String(productId || '')) || null;
  };

  const cardByProductId = productId => {
    let match = null;
    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      if (!match && String(card.dataset.productCard || '') === String(productId || '')) match = card;
    });
    return match;
  };

  const localizedValue = value => {
    if (!value) return '';
    if (typeof value !== 'object') return String(value).trim();
    const language = currentLanguage();
    return String(value[language] || value.ar || value.en || value.ku || '').trim();
  };

  const productNameFor = (card, product) => String(
    card?.querySelector('.sm-name')?.textContent || localizedValue(product?.name) || ''
  ).trim();

  const colorNameFor = color => {
    const language = currentLanguage();
    return String(color?.[language] || color?.ar || color?.en || color?.ku || '').trim();
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
      const value = localizedValue(nested);
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

  const colorsFor = product => Array.isArray(product?.colors) ? product.colors : [];

  const mainImageFor = (card, product) => {
    const image = card?.querySelector('.sm-product-image');
    return safeMedia(image?.dataset.fullImage) ||
      safeMedia(product?.image) ||
      safeMedia(image?.currentSrc) ||
      safeMedia(image?.getAttribute('src')) ||
      safeMedia(PRODUCT_PLACEHOLDER);
  };

  const buildGallerySlides = (card, product) => {
    const name = productNameFor(card, product);
    const mainImage = mainImageFor(card, product);
    const slides = mainImage ? [{
      src: mainImage,
      alt: name,
      caption: uiText('mainImage'),
      colorId: ''
    }] : [];

    colorsFor(product).forEach(color => {
      const image = safeMedia(color?.image || '');
      if (!image) return;
      const colorName = colorNameFor(color) || uiText('colors');
      slides.push({
        src: image,
        alt: `${name} — ${colorName}`,
        caption: colorName,
        colorId: String(color?.id || '')
      });
    });

    return slides;
  };

  const updateColorSelection = () => {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    sheet.querySelectorAll('[data-pb-detail-color-id]').forEach(button => {
      const selected = String(button.dataset.pbDetailColorId || '') === selectedDetailColorId;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  };

  const showGallerySlide = (requestedIndex, { syncColor = true, forcedColorId = null } = {}) => {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet || !gallerySlides.length) return;

    const total = gallerySlides.length;
    const index = ((Number(requestedIndex) % total) + total) % total;
    const slide = gallerySlides[index];
    activeGalleryIndex = index;

    if (syncColor) selectedDetailColorId = String(slide.colorId || '');
    if (forcedColorId !== null) selectedDetailColorId = String(forcedColorId || '');

    const image = sheet.querySelector('.pb-product-sheet-image');
    const caption = sheet.querySelector('.pb-product-gallery-caption');
    const counter = sheet.querySelector('.pb-product-gallery-counter');
    const stage = sheet.querySelector('.pb-product-sheet-stage');

    if (image) {
      delete image.dataset.pbFallbackApplied;
      image.src = slide.src;
      image.alt = slide.alt || slide.caption || '';
      image.hidden = false;
    }
    if (caption) caption.textContent = slide.caption || uiText('mainImage');
    if (counter) counter.textContent = `${index + 1} / ${total}`;
    if (stage) {
      stage.setAttribute(
        'aria-label',
        `${slide.caption || uiText('image')}، ${uiText('image')} ${index + 1} ${uiText('of')} ${total}`
      );
    }

    sheet.querySelectorAll('[data-pb-gallery-index]').forEach(dot => {
      const selected = Number(dot.dataset.pbGalleryIndex) === index;
      dot.classList.toggle('selected', selected);
      if (selected) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    updateColorSelection();
  };

  const shiftGallery = direction => {
    if (gallerySlides.length < 2) return;
    showGallerySlide(activeGalleryIndex + Number(direction || 0));
  };

  const renderGallery = (sheet, card, product, preserveColor = '') => {
    gallerySlides = buildGallerySlides(card, product);
    const gallery = sheet.querySelector('.pb-product-sheet-gallery');
    const image = sheet.querySelector('.pb-product-sheet-image');
    const previous = sheet.querySelector('.pb-product-gallery-prev');
    const next = sheet.querySelector('.pb-product-gallery-next');
    const dots = sheet.querySelector('.pb-product-gallery-dots');
    const hint = sheet.querySelector('.pb-product-gallery-hint');

    if (gallery) gallery.hidden = !gallerySlides.length;
    if (!gallerySlides.length) {
      if (image) {
        image.removeAttribute('src');
        image.hidden = true;
      }
      selectedDetailColorId = '';
      return;
    }

    const multiple = gallerySlides.length > 1;
    if (previous) {
      previous.hidden = !multiple;
      previous.setAttribute('aria-label', uiText('previous'));
    }
    if (next) {
      next.hidden = !multiple;
      next.setAttribute('aria-label', uiText('next'));
    }
    if (hint) {
      hint.hidden = !multiple;
      hint.textContent = uiText('swipe');
    }

    if (dots) {
      dots.replaceChildren();
      dots.hidden = !multiple;
      gallerySlides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'pb-product-gallery-dot';
        dot.dataset.pbGalleryIndex = String(index);
        dot.setAttribute('aria-label', `${uiText('image')} ${index + 1}: ${slide.caption}`);
        dot.addEventListener('click', () => showGallerySlide(index));
        dots.appendChild(dot);
      });
    }

    const preservedId = String(preserveColor || '');
    const preservedIndex = preservedId
      ? gallerySlides.findIndex(slide => String(slide.colorId || '') === preservedId)
      : -1;

    if (preservedId && preservedIndex < 0) {
      showGallerySlide(0, { syncColor: false, forcedColorId: preservedId });
      const preservedColor = colorsFor(product).find(color => String(color?.id || '') === preservedId);
      const caption = sheet.querySelector('.pb-product-gallery-caption');
      if (caption && preservedColor) caption.textContent = colorNameFor(preservedColor) || uiText('mainImage');
      return;
    }
    showGallerySlide(preservedIndex >= 0 ? preservedIndex : 0, {
      syncColor: true,
      forcedColorId: preservedIndex >= 0 ? preservedId : null
    });
  };

  const renderColorPicker = (container, product) => {
    const colors = colorsFor(product);
    if (!colors.length) return;

    const picker = document.createElement('section');
    picker.className = 'pb-product-sheet-color-picker';

    const title = document.createElement('div');
    title.className = 'pb-product-sheet-color-title';
    title.textContent = uiText('colors');

    const list = document.createElement('div');
    list.className = 'pb-product-sheet-color-list';

    colors.forEach(color => {
      const colorId = String(color?.id || '');
      const colorName = colorNameFor(color) || uiText('colors');
      const colorImage = safeMedia(color?.image || '');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `pb-product-sheet-color${color?.isAvailable === false ? ' is-unavailable' : ''}`;
      button.dataset.pbDetailColorId = colorId;
      button.setAttribute('aria-pressed', 'false');
      if (color?.isAvailable === false) button.setAttribute('aria-disabled', 'true');

      if (colorImage) {
        button.classList.add('has-image');
        const thumbnail = document.createElement('img');
        thumbnail.className = 'pb-product-sheet-color-image';
        thumbnail.src = colorImage;
        thumbnail.alt = '';
        thumbnail.loading = 'lazy';
        thumbnail.decoding = 'async';
        thumbnail.addEventListener('error', () => {
          button.classList.remove('has-image');
          thumbnail.remove();
        });
        button.appendChild(thumbnail);
      }

      const swatch = document.createElement('i');
      swatch.className = 'pb-product-sheet-color-swatch';
      swatch.style.setProperty('--pb-color', String(color?.hex || '#d8d0d3'));
      swatch.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.textContent = color?.isAvailable === false
        ? `${colorName} — ${uiText('unavailable')}`
        : colorName;

      button.append(swatch, label);
      button.addEventListener('click', () => {
        const slideIndex = gallerySlides.findIndex(slide => String(slide.colorId || '') === colorId);
        if (slideIndex >= 0) {
          showGallerySlide(slideIndex, { forcedColorId: colorId });
        } else {
          showGallerySlide(0, { syncColor: false, forcedColorId: colorId });
          const caption = document.querySelector(`#${SHEET_ID} .pb-product-gallery-caption`);
          if (caption) caption.textContent = colorName;
        }
      });
      list.appendChild(button);
    });

    picker.append(title, list);
    container.appendChild(picker);
    updateColorSelection();
  };

  const closeSheet = () => {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pb-product-sheet-open');
    document.body?.classList.remove('pb-product-sheet-open');
    swipeStart = null;
    activeProductId = '';
    gallerySlides = [];
    activeGalleryIndex = 0;
    selectedDetailColorId = '';
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

    const gallery = document.createElement('section');
    gallery.className = 'pb-product-sheet-gallery';
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'carousel');

    const stage = document.createElement('div');
    stage.className = 'pb-product-sheet-stage';
    stage.tabIndex = 0;

    const image = document.createElement('img');
    image.className = 'pb-product-sheet-image';
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'pb-product-gallery-arrow pb-product-gallery-prev';
    previous.textContent = '‹';
    previous.addEventListener('click', () => shiftGallery(-1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'pb-product-gallery-arrow pb-product-gallery-next';
    next.textContent = '›';
    next.addEventListener('click', () => shiftGallery(1));

    stage.append(image, previous, next);

    const meta = document.createElement('div');
    meta.className = 'pb-product-gallery-meta';

    const caption = document.createElement('span');
    caption.className = 'pb-product-gallery-caption';
    caption.setAttribute('aria-live', 'polite');

    const counter = document.createElement('span');
    counter.className = 'pb-product-gallery-counter';
    meta.append(caption, counter);

    const dots = document.createElement('div');
    dots.className = 'pb-product-gallery-dots';

    const hint = document.createElement('div');
    hint.className = 'pb-product-gallery-hint';

    gallery.append(stage, meta, dots, hint);

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

    scroll.append(gallery, name, description, extras, action);
    panel.append(handle, head, scroll);
    sheet.append(backdrop, panel);
    document.body.appendChild(sheet);

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      swipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };
    });
    stage.addEventListener('pointerup', event => {
      if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
      event.preventDefault();
      shiftGallery(deltaX < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', () => { swipeStart = null; });
    stage.addEventListener('dragstart', event => event.preventDefault());
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        shiftGallery(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        shiftGallery(1);
      }
    });
    image.addEventListener('error', () => {
      const fallback = gallerySlides[0]?.src || safeMedia(PRODUCT_PLACEHOLDER);
      if (!fallback || image.dataset.pbFallbackApplied === '1') return;
      image.dataset.pbFallbackApplied = '1';
      image.src = fallback;
    });

    sheet.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
    });

    return sheet;
  };

  const renderSheet = (card, product, { preserveColor = '' } = {}) => {
    if (!card || !product) return false;
    const sheet = ensureSheet();
    const name = sheet.querySelector('.pb-product-sheet-name');
    const body = sheet.querySelector('.pb-product-sheet-description');
    const extras = sheet.querySelector('.pb-product-sheet-extras');
    const action = sheet.querySelector('.pb-product-sheet-action');
    const originalAction = card.querySelector('.sm-direct-add, .sm-choose-options');
    const optionPreview = card.querySelector('.sm-options-scroll');
    const productName = productNameFor(card, product);
    const description = descriptionFor(product);

    sheet.querySelector('.pb-product-sheet-eyebrow').textContent = uiText('details');
    sheet.querySelector('.pb-product-sheet-close').setAttribute('aria-label', uiText('close'));
    sheet.querySelector('.pb-product-sheet-backdrop').setAttribute('aria-label', uiText('close'));

    if (name) name.textContent = productName;
    if (body) {
      body.textContent = description;
      body.hidden = !description;
    }

    renderGallery(sheet, card, product, preserveColor);

    if (extras) {
      extras.replaceChildren();
      renderColorPicker(extras, product);
      if (optionPreview) {
        const options = optionPreview.cloneNode(true);
        options.classList.add('pb-product-sheet-options');
        extras.appendChild(options);
      }
    }

    if (action) {
      if (originalAction) {
        action.hidden = false;
        action.disabled = originalAction.disabled;
        action.innerHTML = originalAction.innerHTML;
        action.onclick = () => {
          const selectedColor = colorsFor(product).find(color =>
            String(color?.id || '') === selectedDetailColorId && color?.isAvailable !== false
          );
          if (selectedColor) {
            originalAction.dataset.pbPreferredColorId = String(selectedColor.id || '');
          } else {
            delete originalAction.dataset.pbPreferredColorId;
          }
          closeSheet();
          setTimeout(() => originalAction.click(), 40);
        };
      } else {
        action.hidden = true;
        action.onclick = null;
      }
    }

    return true;
  };

  const openSheet = (card, product, trigger) => {
    if (!card || !product) return false;
    activeProductId = String(product.id || card.dataset.productCard || '');
    selectedDetailColorId = '';
    activeGalleryIndex = 0;
    if (!renderSheet(card, product)) return false;

    const sheet = ensureSheet();
    const close = sheet.querySelector('.pb-product-sheet-close');
    lastTrigger = trigger || card.querySelector('.sm-product-image') || null;
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pb-product-sheet-open');
    document.body?.classList.add('pb-product-sheet-open');
    requestAnimationFrame(() => sheet.classList.add('open'));
    setTimeout(() => {
      try { close?.focus({ preventScroll: true }); } catch (_) {}
    }, 30);
    return true;
  };

  const resolveCard = source => {
    if (source instanceof Element) {
      return source.matches('[data-product-card]')
        ? source
        : source.closest('[data-product-card]');
    }
    return cardByProductId(String(source || ''));
  };

  const openProductDetails = (source, trigger = null) => {
    const card = resolveCard(source);
    if (!card) return false;
    const product = productById(card.dataset.productCard);
    if (!product) return false;
    return openSheet(card, product, trigger || (source instanceof Element ? source : null));
  };

  window.PASHA_OPEN_PRODUCT_DETAILS = openProductDetails;

  const refreshOpenSheet = () => {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet?.classList.contains('open') || !activeProductId) return;
    const product = productById(activeProductId);
    const card = cardByProductId(activeProductId);
    if (!product || !card) return;
    renderSheet(card, product, { preserveColor: selectedDetailColorId });
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
      const image = card.querySelector('.sm-product-image');
      if (!info || !name) return;

      const product = byId.get(String(card.dataset.productCard || ''));
      if (!product) return;
      const description = descriptionFor(product);
      let node = info.querySelector('.pb-product-description');
      let more = info.querySelector('.pb-product-description-more');

      if (image) {
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-haspopup', 'dialog');
        image.setAttribute(
          'aria-label',
          `${uiText('openDetails')}: ${productNameFor(card, product)}`
        );
        image.dataset.pbProductDetailsTrigger = '1';
      }

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
        openSheet(card, product, more);
      };
    });

    refreshOpenSheet();
    return true;
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(syncDescriptions);
  };

  document.addEventListener('click', event => {
    const image = event.target.closest?.('#smMenu .sm-product-image');
    if (!image) return;
    const card = image.closest('[data-product-card]');
    if (!card || !openProductDetails(card, image)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const image = event.target.closest?.('#smMenu .sm-product-image');
    if (!image) return;
    const card = image.closest('[data-product-card]');
    if (!card || !openProductDetails(card, image)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

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
    window.addEventListener('restbr:commerce-ready', scheduleSync);
    window.addEventListener('restbr:prices-updated', scheduleSync);
    window.addEventListener('restbr:catalog-expanded', scheduleSync);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
