(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_PRODUCT_GALLERY_THERMAL_V3__) return;
  window.__PASHA_PRODUCT_GALLERY_THERMAL_V3__ = true;

  const SHEET_ID = 'pbProductDetailSheet';
  const STYLE_ID = 'pbProductGalleryThermalV3Style';
  const CAROUSEL_MS = 285;
  let sheetObserver = null;
  let discoveryObserver = null;
  let queued = false;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SHEET_ID} .pb-product-sheet-color-picker{
        margin:3px 0 10px!important;
        padding:0!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-title{
        margin:0 0 6px!important;
        font-size:11px!important;
        line-height:1.2!important;
        opacity:.78!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list{
        display:flex!important;
        gap:8px!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        overscroll-behavior-inline:contain!important;
        scrollbar-width:none!important;
        padding:1px 1px 5px!important;
        -webkit-overflow-scrolling:touch!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list::-webkit-scrollbar{display:none!important}
      #${SHEET_ID} .pb-product-sheet-color{
        min-height:40px!important;
        min-width:max-content!important;
        max-width:none!important;
        gap:7px!important;
        padding:6px 12px!important;
        border-radius:11px!important;
        font-size:11.5px!important;
        line-height:1.2!important;
        flex:0 0 auto!important;
        white-space:nowrap!important;
      }
      #${SHEET_ID} .pb-product-sheet-color > span{
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-swatch{
        width:17px!important;
        height:17px!important;
        min-width:17px!important;
        min-height:17px!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-image{display:none!important}
      #${SHEET_ID} .pb-product-sheet-name{margin-top:5px!important}

      #${SHEET_ID} .pb-product-sheet-stage{
        touch-action:pan-y!important;
        overflow:hidden!important;
        position:relative!important;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-enhanced > .pb-product-sheet-image{
        visibility:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      #${SHEET_ID} .pb-carousel-track{
        position:absolute!important;
        z-index:1!important;
        inset:0 auto 0 0!important;
        width:300%!important;
        height:100%!important;
        display:flex!important;
        flex-direction:row!important;
        direction:ltr!important;
        transform:translate3d(-33.333333%,0,0);
        pointer-events:none!important;
        will-change:auto!important;
      }
      #${SHEET_ID} .pb-carousel-track > img{
        display:block!important;
        flex:0 0 33.333333%!important;
        width:33.333333%!important;
        height:100%!important;
        min-width:0!important;
        max-width:none!important;
        margin:0!important;
        object-fit:contain!important;
        object-position:center!important;
        background:#fff!important;
        pointer-events:none!important;
        user-select:none!important;
        -webkit-user-select:none!important;
        -webkit-user-drag:none!important;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-dragging .pb-carousel-track,
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-track{
        will-change:transform!important;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-track{
        transition:transform ${CAROUSEL_MS}ms cubic-bezier(.22,.74,.18,1)!important;
      }
      #${SHEET_ID} .pb-product-gallery-arrow{
        z-index:4!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        background:rgba(255,255,255,.96)!important;
      }
      #${SHEET_ID} .pb-product-gallery-dots,
      #${SHEET_ID} .pb-product-gallery-counter,
      #${SHEET_ID} .pb-product-gallery-caption,
      #${SHEET_ID} .pb-product-gallery-hint{position:relative!important;z-index:3!important}

      /* The Pasha category rail should never turn into a black slab. */
      .sm-cats-wrap,
      .sm-cats-wrap.fixed,
      .sm-cats-wrap.pb-cats-stuck{
        background:rgba(247,248,246,.97)!important;
        background-image:none!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        transition:none!important;
      }
      .pb-cats-sticky-sentinel{display:none!important}

      /* iOS Safari: disable virtualized cards and legacy living-card animation.
         Both were repainting/re-compositing cards while scrolling back and forth. */
      @media(max-width:899px){
        html body #smMenu .sm-grid > article.sm-card{
          content-visibility:visible!important;
          contain:none!important;
          contain-intrinsic-size:none!important;
          transition:none!important;
          transform:none!important;
          translate:0 0!important;
          filter:none!important;
          will-change:auto!important;
        }
        html body #smMenu .sm-grid > article.sm-card:active,
        html body #smMenu .sm-card.sm-life-ready,
        html body #smMenu .sm-card.sm-life-ready.sm-reveal,
        html body #smMenu .sm-card.sm-life-ready.sm-reveal.sm-visible,
        html body #smMenu .sm-card.sm-life-ready:active{
          animation:none!important;
          transition:none!important;
          transform:none!important;
          translate:0 0!important;
          filter:none!important;
          will-change:auto!important;
        }
        html body #smMenu .sm-card .sm-product-image,
        html body #smMenu .sm-card.sm-life-ready .sm-product-image,
        html body #smMenu .sm-card.sm-life-ready:active .sm-product-image{
          animation:none!important;
          transition:none!important;
          transform:none!important;
          translate:0 0!important;
          scale:1!important;
          filter:none!important;
          will-change:auto!important;
        }
        html body #smMenu .sm-card .sm-live-sheen,
        html body #smMenu .sm-card .sm-info::after,
        html body #smMenu .sm-popular-card::before,
        html body #smMenu .sm-hot-card::after,
        html body #smMenu .sm-grill-card::before,
        html body #smMenu .sm-cold-card::before,
        html body #smMenu .sm-cold-card::after{
          display:none!important;
          content:none!important;
          animation:none!important;
          transition:none!important;
        }
        html body #smMenu .sm-card > .sm-share-product{
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          background:rgba(255,255,255,.96)!important;
        }
      }

      @media(prefers-reduced-motion:reduce){
        #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-track{
          transition-duration:1ms!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const imageSrc = image => String(
    image?.currentSrc || image?.getAttribute?.('src') || image?.src || ''
  ).trim();

  const normalizeIndex = (index, total) => total > 0
    ? ((Number(index) % total) + total) % total
    : 0;

  function currentGalleryIndex(sheet) {
    const selected = sheet?.querySelector('[data-pb-gallery-index][aria-current="true"], [data-pb-gallery-index].selected');
    const index = Number(selected?.dataset?.pbGalleryIndex);
    return Number.isFinite(index) ? index : 0;
  }

  function cleanupOldCategoryState() {
    document.querySelectorAll('.sm-cats-wrap.pb-cats-stuck').forEach(wrap => wrap.classList.remove('pb-cats-stuck'));
    document.querySelectorAll('.pb-cats-sticky-sentinel').forEach(node => node.remove());
  }

  function captureSlidesBeforeCompacting(sheet) {
    const stage = sheet?.querySelector('.pb-product-sheet-stage');
    const center = stage?.querySelector(':scope > .pb-product-sheet-image');
    const pickers = [...(sheet?.querySelectorAll('.pb-product-sheet-color-picker') || [])];
    const picker = pickers[pickers.length - 1];
    if (!stage || !center || !picker) return false;

    const colorButtons = [...picker.querySelectorAll('[data-pb-detail-color-id]')];
    const colorSources = [];
    let nextGalleryIndex = 1;

    colorButtons.forEach(button => {
      const thumb = button.querySelector('.pb-product-sheet-color-image');
      const src = imageSrc(thumb);
      if (!src) {
        delete button.dataset.pbCarouselIndex;
        return;
      }
      button.dataset.pbCarouselIndex = String(nextGalleryIndex);
      nextGalleryIndex += 1;
      colorSources.push(src);
    });

    const activeIndex = currentGalleryIndex(sheet);
    const current = imageSrc(center);
    if (activeIndex === 0 && current) stage.__pbCarouselMainSrc = current;
    if (!stage.__pbCarouselMainSrc && current) stage.__pbCarouselMainSrc = current;
    if (!stage.__pbCarouselMainSrc) return false;

    stage.__pbCarouselSlides = [String(stage.__pbCarouselMainSrc), ...colorSources];
    return true;
  }

  function compactAndMoveColorPicker(sheet) {
    const name = sheet?.querySelector('.pb-product-sheet-name');
    const pickers = [...(sheet?.querySelectorAll('.pb-product-sheet-color-picker') || [])];
    if (!name || !pickers.length) return false;

    const picker = pickers[pickers.length - 1];
    pickers.slice(0, -1).forEach(old => old.remove());
    picker.querySelectorAll('.pb-product-sheet-color-image').forEach(img => img.remove());
    picker.querySelectorAll('.pb-product-sheet-color.has-image').forEach(btn => btn.classList.remove('has-image'));
    if (picker.nextElementSibling !== name) name.before(picker);
    return true;
  }

  function ensureTrack(stage) {
    if (!(stage instanceof HTMLElement)) return null;
    let track = stage.querySelector(':scope > .pb-carousel-track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'pb-carousel-track';
      track.setAttribute('aria-hidden', 'true');
      for (const position of ['prev', 'current', 'next']) {
        const image = document.createElement('img');
        image.className = `pb-carousel-track-${position}`;
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        track.appendChild(image);
      }
      const center = stage.querySelector(':scope > .pb-product-sheet-image');
      if (center) stage.insertBefore(track, center);
      else stage.prepend(track);
    }
    stage.classList.add('pb-carousel-enhanced');
    return {
      track,
      previous: track.children[0],
      current: track.children[1],
      next: track.children[2]
    };
  }

  function setImageSource(image, src) {
    if (!(image instanceof HTMLImageElement)) return;
    const nextSrc = String(src || '');
    if (!nextSrc) {
      image.removeAttribute('src');
      return;
    }
    if (imageSrc(image) !== nextSrc) image.src = nextSrc;
  }

  function setTrackOffset(stage, px, animate = false) {
    const parts = ensureTrack(stage);
    if (!parts) return;
    stage.classList.toggle('pb-carousel-animating', animate);
    if (!animate) stage.classList.remove('pb-carousel-animating');
    parts.track.style.transform = `translate3d(calc(-33.333333% + ${Number(px) || 0}px),0,0)`;
  }

  function renderTrack(stage, forcedIndex = null) {
    const sheet = document.getElementById(SHEET_ID);
    const slides = stage?.__pbCarouselSlides;
    const parts = ensureTrack(stage);
    if (!sheet || !Array.isArray(slides) || !slides.length || !parts) return false;

    const index = normalizeIndex(forcedIndex === null ? currentGalleryIndex(sheet) : forcedIndex, slides.length);
    const previousIndex = normalizeIndex(index - 1, slides.length);
    const nextIndex = normalizeIndex(index + 1, slides.length);
    setImageSource(parts.previous, slides.length > 1 ? slides[previousIndex] : '');
    setImageSource(parts.current, slides[index]);
    setImageSource(parts.next, slides.length > 1 ? slides[nextIndex] : '');
    stage.__pbCarouselIndex = index;
    stage.classList.remove('pb-carousel-dragging', 'pb-carousel-animating');
    parts.track.style.transition = '';
    setTrackOffset(stage, 0, false);
    return true;
  }

  function activateBaseDot(sheet, index, stage) {
    const dot = sheet?.querySelector(`[data-pb-gallery-index="${index}"]`);
    if (!dot) return false;
    stage.__pbCarouselInternalClick = true;
    try { dot.click(); }
    finally { stage.__pbCarouselInternalClick = false; }
    return true;
  }

  function directionBetween(from, to, total) {
    const forward = normalizeIndex(to - from, total);
    const backward = normalizeIndex(from - to, total);
    return forward <= backward ? 1 : -1;
  }

  function transitionDone(track, callback) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      track.removeEventListener('transitionend', onEnd);
      callback();
    };
    const onEnd = event => {
      if (event.target === track && event.propertyName === 'transform') finish();
    };
    track.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, CAROUSEL_MS + 90);
  }

  function animateCarouselTo(stage, requestedIndex, requestedDirection = null) {
    const sheet = document.getElementById(SHEET_ID);
    const slides = stage?.__pbCarouselSlides;
    const parts = ensureTrack(stage);
    if (!sheet || !Array.isArray(slides) || slides.length < 2 || !parts || stage.__pbCarouselBusy) return false;

    const from = normalizeIndex(currentGalleryIndex(sheet), slides.length);
    const target = normalizeIndex(requestedIndex, slides.length);
    if (target === from) {
      renderTrack(stage, target);
      return false;
    }

    const direction = requestedDirection || directionBetween(from, target, slides.length);
    if (direction > 0) setImageSource(parts.next, slides[target]);
    else setImageSource(parts.previous, slides[target]);

    const width = Math.max(1, stage.getBoundingClientRect().width || stage.clientWidth || 320);
    stage.__pbCarouselBusy = true;
    stage.classList.remove('pb-carousel-dragging');
    stage.classList.add('pb-carousel-animating');

    requestAnimationFrame(() => {
      parts.track.style.transform = `translate3d(calc(-33.333333% + ${direction > 0 ? -width : width}px),0,0)`;
      transitionDone(parts.track, () => {
        activateBaseDot(sheet, target, stage);
        renderTrack(stage, target);
        stage.__pbCarouselBusy = false;
      });
    });
    return true;
  }

  function settleCarousel(stage) {
    const parts = ensureTrack(stage);
    if (!parts || stage.__pbCarouselBusy) return;
    stage.classList.remove('pb-carousel-dragging');
    stage.classList.add('pb-carousel-animating');
    requestAnimationFrame(() => {
      parts.track.style.transform = 'translate3d(-33.333333%,0,0)';
      transitionDone(parts.track, () => {
        stage.classList.remove('pb-carousel-animating');
        renderTrack(stage);
      });
    });
  }

  function bindCarousel(stage) {
    if (!(stage instanceof HTMLElement) || stage.dataset.pbWhatsappTrack === '1') return;
    stage.dataset.pbWhatsappTrack = '1';
    let drag = null;
    let moveFrame = 0;
    let pendingDx = 0;

    const flushMove = () => {
      moveFrame = 0;
      if (!drag?.horizontal || stage.__pbCarouselBusy) return;
      setTrackOffset(stage, pendingDx, false);
    };

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!Array.isArray(stage.__pbCarouselSlides) || stage.__pbCarouselSlides.length < 2) return;

      renderTrack(stage);
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastAt: performance.now(),
        velocityX: 0,
        horizontal: false
      };
      pendingDx = 0;
      event.stopImmediatePropagation();
    }, true);

    stage.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || stage.__pbCarouselBusy) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (!drag.horizontal) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.05) return;
        drag.horizontal = true;
        stage.classList.add('pb-carousel-dragging');
        try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      }
      if (!drag.horizontal) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastAt);
      drag.velocityX = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastAt = now;

      const width = Math.max(1, stage.clientWidth || 320);
      pendingDx = Math.max(-width, Math.min(width, dx));
      if (!moveFrame) moveFrame = requestAnimationFrame(flushMove);
    }, { capture: true, passive: false });

    stage.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const state = drag;
      drag = null;
      if (moveFrame) {
        cancelAnimationFrame(moveFrame);
        moveFrame = 0;
      }
      if (!state.horizontal) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      try { stage.releasePointerCapture(event.pointerId); } catch (_) {}

      const dx = event.clientX - state.x;
      const width = Math.max(1, stage.clientWidth || 320);
      pendingDx = Math.max(-width, Math.min(width, dx));
      setTrackOffset(stage, pendingDx, false);

      const distanceThreshold = Math.min(62, Math.max(34, width * 0.14));
      const fastEnough = Math.abs(state.velocityX) > 0.36 && Math.abs(dx) > 14;
      if (Math.abs(dx) < distanceThreshold && !fastEnough) {
        settleCarousel(stage);
        return;
      }

      const total = stage.__pbCarouselSlides.length;
      const current = normalizeIndex(currentGalleryIndex(document.getElementById(SHEET_ID)), total);
      const direction = dx < 0 ? 1 : -1;
      animateCarouselTo(stage, current + direction, direction);
    }, true);

    stage.addEventListener('pointercancel', event => {
      if (!drag || drag.id !== event.pointerId) return;
      drag = null;
      if (moveFrame) {
        cancelAnimationFrame(moveFrame);
        moveFrame = 0;
      }
      settleCarousel(stage);
    }, true);

    stage.addEventListener('click', event => {
      const arrow = event.target.closest('.pb-product-gallery-prev,.pb-product-gallery-next');
      if (!arrow || stage.__pbCarouselBusy) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const total = stage.__pbCarouselSlides?.length || 0;
      if (total < 2) return;
      const current = currentGalleryIndex(document.getElementById(SHEET_ID));
      const direction = arrow.classList.contains('pb-product-gallery-next') ? 1 : -1;
      animateCarouselTo(stage, current + direction, direction);
    }, true);
  }

  function bindSheetNavigation(sheet) {
    if (!(sheet instanceof HTMLElement) || sheet.dataset.pbCarouselNavigationV3 === '1') return;
    sheet.dataset.pbCarouselNavigationV3 = '1';

    sheet.addEventListener('click', event => {
      const stage = sheet.querySelector('.pb-product-sheet-stage');
      if (!stage || stage.__pbCarouselInternalClick || stage.__pbCarouselBusy) return;
      const total = stage.__pbCarouselSlides?.length || 0;
      if (total < 2) return;

      const dot = event.target.closest('[data-pb-gallery-index]');
      if (dot) {
        const target = Number(dot.dataset.pbGalleryIndex);
        if (!Number.isFinite(target) || target === currentGalleryIndex(sheet)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        animateCarouselTo(stage, target);
        return;
      }

      const color = event.target.closest('[data-pb-detail-color-id][data-pb-carousel-index]');
      if (!color) return;
      const target = Number(color.dataset.pbCarouselIndex);
      if (!Number.isFinite(target) || target === currentGalleryIndex(sheet)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      animateCarouselTo(stage, target);
    }, true);
  }

  function enhanceSheet() {
    queued = false;
    installStyle();
    cleanupOldCategoryState();
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return false;

    captureSlidesBeforeCompacting(sheet);
    compactAndMoveColorPicker(sheet);

    const stage = sheet.querySelector('.pb-product-sheet-stage');
    bindCarousel(stage);
    bindSheetNavigation(sheet);
    renderTrack(stage);

    if (!sheetObserver) {
      const root = sheet.querySelector('.pb-product-sheet-scroll') || sheet;
      sheetObserver = new MutationObserver(mutations => {
        if (!mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) return;
        if (queued) return;
        queued = true;
        requestAnimationFrame(enhanceSheet);
      });
      sheetObserver.observe(root, { childList: true, subtree: true });
    }
    return true;
  }

  function discoverSheet() {
    if (document.getElementById(SHEET_ID)) {
      discoveryObserver?.disconnect();
      discoveryObserver = null;
      enhanceSheet();
      return;
    }
    if (discoveryObserver || !document.body) return;
    discoveryObserver = new MutationObserver(mutations => {
      const found = mutations.some(mutation => [...mutation.addedNodes].some(node =>
        node instanceof Element && (node.id === SHEET_ID || node.querySelector?.(`#${SHEET_ID}`))
      ));
      if (!found) return;
      discoveryObserver.disconnect();
      discoveryObserver = null;
      requestAnimationFrame(enhanceSheet);
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stabilizeExistingCards() {
    document.querySelectorAll('#smMenu .sm-live-sheen').forEach(node => node.remove());
  }

  function boot() {
    installStyle();
    cleanupOldCategoryState();
    stabilizeExistingCards();
    discoverSheet();

    const resync = () => {
      cleanupOldCategoryState();
      stabilizeExistingCards();
      enhanceSheet();
    };
    window.addEventListener('restbr:ready', resync, { once: true });
    window.addEventListener('pageshow', resync, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
