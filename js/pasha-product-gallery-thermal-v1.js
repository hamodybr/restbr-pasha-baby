(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_PRODUCT_GALLERY_THERMAL_V2__) return;
  window.__PASHA_PRODUCT_GALLERY_THERMAL_V2__ = true;

  const SHEET_ID = 'pbProductDetailSheet';
  const STYLE_ID = 'pbProductGalleryThermalV2Style';
  const CATS_STUCK_CLASS = 'pb-cats-stuck';
  const CAROUSEL_MS = 260;
  let sheetObserver = null;
  let catsObserver = null;
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
        font-size:10.5px!important;
        line-height:1.2!important;
        opacity:.76!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list{
        display:flex!important;
        gap:7px!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        overscroll-behavior-inline:contain!important;
        scrollbar-width:none!important;
        padding:1px 1px 4px!important;
        -webkit-overflow-scrolling:touch!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list::-webkit-scrollbar{display:none!important}
      #${SHEET_ID} .pb-product-sheet-color{
        min-height:36px!important;
        min-width:max-content!important;
        max-width:none!important;
        gap:6px!important;
        padding:5px 10px!important;
        border-radius:10px!important;
        font-size:11px!important;
        line-height:1.18!important;
        flex:0 0 auto!important;
        white-space:nowrap!important;
      }
      #${SHEET_ID} .pb-product-sheet-color > span{
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-swatch{
        width:15px!important;
        height:15px!important;
        min-width:15px!important;
        min-height:15px!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-image{display:none!important}
      #${SHEET_ID} .pb-product-sheet-name{margin-top:5px!important}

      #${SHEET_ID} .pb-product-sheet-stage{
        --pb-carousel-x:0px;
        touch-action:pan-y!important;
        overflow:hidden!important;
        position:relative!important;
      }
      #${SHEET_ID} .pb-product-sheet-image,
      #${SHEET_ID} .pb-carousel-peer{
        position:absolute!important;
        inset:0!important;
        display:block!important;
        width:100%!important;
        height:100%!important;
        margin:0!important;
        object-fit:contain!important;
        object-position:center!important;
        background:#fff!important;
        pointer-events:none!important;
        user-select:none!important;
        -webkit-user-select:none!important;
        will-change:auto!important;
      }
      #${SHEET_ID} .pb-product-sheet-image{
        transform:translate3d(var(--pb-carousel-x),0,0)!important;
      }
      #${SHEET_ID} .pb-carousel-prev-image{
        transform:translate3d(calc(-100% + var(--pb-carousel-x)),0,0)!important;
      }
      #${SHEET_ID} .pb-carousel-next-image{
        transform:translate3d(calc(100% + var(--pb-carousel-x)),0,0)!important;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-dragging .pb-product-sheet-image,
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-dragging .pb-carousel-peer,
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-product-sheet-image,
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-peer{
        will-change:transform!important;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-product-sheet-image,
      #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-peer{
        transition:transform ${CAROUSEL_MS}ms cubic-bezier(.22,.72,.18,1)!important;
      }
      #${SHEET_ID} .pb-product-gallery-arrow{
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        background:rgba(255,255,255,.96)!important;
      }

      .sm-cats-wrap{
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        transition:background-color .16s ease,box-shadow .16s ease!important;
      }
      .sm-cats-wrap.${CATS_STUCK_CLASS}{
        background:#101313!important;
        background-image:none!important;
        box-shadow:0 8px 22px rgba(0,0,0,.20)!important;
      }
      .pb-cats-sticky-sentinel{
        display:block!important;
        width:1px!important;
        height:1px!important;
        margin:0 0 -1px!important;
        padding:0!important;
        border:0!important;
        pointer-events:none!important;
        visibility:hidden!important;
      }

      @media(max-width:899px){
        html body #smMenu .sm-grid > article.sm-card{
          contain-intrinsic-size:auto 560px!important;
        }
        html body #smMenu .sm-card > .sm-share-product{
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          background:rgba(255,255,255,.96)!important;
        }
      }

      @media(prefers-reduced-motion:reduce){
        #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-product-sheet-image,
        #${SHEET_ID} .pb-product-sheet-stage.pb-carousel-animating .pb-carousel-peer{
          transition-duration:1ms!important;
        }
        .sm-cats-wrap{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  const imageSrc = image => String(
    image?.currentSrc || image?.getAttribute?.('src') || image?.src || ''
  ).trim();

  function currentGalleryIndex(sheet) {
    const selected = sheet?.querySelector('[data-pb-gallery-index][aria-current="true"], [data-pb-gallery-index].selected');
    const index = Number(selected?.dataset?.pbGalleryIndex);
    return Number.isFinite(index) ? index : 0;
  }

  function captureSlidesBeforeCompacting(sheet) {
    const stage = sheet?.querySelector('.pb-product-sheet-stage');
    const center = stage?.querySelector('.pb-product-sheet-image');
    const pickers = [...(sheet?.querySelectorAll('.pb-product-sheet-color-picker') || [])];
    const picker = pickers[pickers.length - 1];
    if (!stage || !center || !picker) return;

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

    const current = imageSrc(center);
    let main = String(stage.__pbCarouselMainSrc || '');
    if (!main || !colorSources.includes(current)) main = current || main;
    if (!main) return;

    stage.__pbCarouselMainSrc = main;
    stage.__pbCarouselSlides = [main, ...colorSources];
  }

  function compactAndMoveColorPicker() {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return false;
    const name = sheet.querySelector('.pb-product-sheet-name');
    const pickers = [...sheet.querySelectorAll('.pb-product-sheet-color-picker')];
    if (!name || !pickers.length) return false;

    const picker = pickers[pickers.length - 1];
    pickers.slice(0, -1).forEach(old => old.remove());

    picker.querySelectorAll('.pb-product-sheet-color-image').forEach(img => img.remove());
    picker.querySelectorAll('.pb-product-sheet-color.has-image').forEach(btn => btn.classList.remove('has-image'));

    if (picker.nextElementSibling !== name) name.before(picker);
    return true;
  }

  function ensureCarouselPeers(stage) {
    if (!(stage instanceof HTMLElement)) return null;
    let previous = stage.querySelector('.pb-carousel-prev-image');
    let next = stage.querySelector('.pb-carousel-next-image');

    if (!previous) {
      previous = document.createElement('img');
      previous.className = 'pb-carousel-peer pb-carousel-prev-image';
      previous.alt = '';
      previous.decoding = 'async';
      previous.draggable = false;
      stage.prepend(previous);
    }
    if (!next) {
      next = document.createElement('img');
      next.className = 'pb-carousel-peer pb-carousel-next-image';
      next.alt = '';
      next.decoding = 'async';
      next.draggable = false;
      const center = stage.querySelector('.pb-product-sheet-image');
      if (center?.nextSibling) stage.insertBefore(next, center.nextSibling);
      else stage.appendChild(next);
    }
    return { previous, next };
  }

  function setPeerSource(image, src) {
    if (!image) return;
    const nextSrc = String(src || '');
    if (!nextSrc) {
      image.hidden = true;
      image.removeAttribute('src');
      return;
    }
    image.hidden = false;
    if (imageSrc(image) !== nextSrc) image.src = nextSrc;
  }

  function syncCarouselPeers(stage, forcedIndex = null) {
    const sheet = document.getElementById(SHEET_ID);
    const slides = stage?.__pbCarouselSlides;
    const peers = ensureCarouselPeers(stage);
    if (!sheet || !Array.isArray(slides) || !slides.length || !peers) return false;

    const index = forcedIndex === null ? currentGalleryIndex(sheet) : Number(forcedIndex);
    const safeIndex = ((index % slides.length) + slides.length) % slides.length;
    stage.__pbCarouselIndex = safeIndex;
    stage.style.setProperty('--pb-carousel-x', '0px');

    if (slides.length < 2) {
      peers.previous.hidden = true;
      peers.next.hidden = true;
      return true;
    }

    const previousIndex = (safeIndex - 1 + slides.length) % slides.length;
    const nextIndex = (safeIndex + 1) % slides.length;
    setPeerSource(peers.previous, slides[previousIndex]);
    setPeerSource(peers.next, slides[nextIndex]);
    return true;
  }

  function carouselDirection(from, to, total) {
    const forward = (to - from + total) % total;
    const backward = (from - to + total) % total;
    return forward <= backward ? 1 : -1;
  }

  function activateDot(sheet, index, stage) {
    const dot = sheet.querySelector(`[data-pb-gallery-index="${index}"]`);
    if (!dot) return false;
    stage.__pbCarouselInternalClick = true;
    try { dot.click(); }
    finally { stage.__pbCarouselInternalClick = false; }
    return true;
  }

  function animateCarouselTo(stage, targetIndex, direction = null) {
    const sheet = document.getElementById(SHEET_ID);
    const slides = stage?.__pbCarouselSlides;
    if (!sheet || !Array.isArray(slides) || slides.length < 2 || stage.__pbCarouselBusy) return false;

    const from = currentGalleryIndex(sheet);
    const target = ((Number(targetIndex) % slides.length) + slides.length) % slides.length;
    if (target === from) return false;

    const move = direction || carouselDirection(from, target, slides.length);
    const peers = ensureCarouselPeers(stage);
    if (!peers) return false;

    if (move > 0) setPeerSource(peers.next, slides[target]);
    else setPeerSource(peers.previous, slides[target]);

    const width = Math.max(1, stage.getBoundingClientRect().width || stage.clientWidth || 320);
    stage.__pbCarouselBusy = true;
    stage.classList.remove('pb-carousel-dragging');
    stage.classList.add('pb-carousel-animating');

    requestAnimationFrame(() => {
      stage.style.setProperty('--pb-carousel-x', `${move > 0 ? -width : width}px`);
    });

    window.setTimeout(() => {
      activateDot(sheet, target, stage);
      stage.classList.remove('pb-carousel-animating');
      stage.style.setProperty('--pb-carousel-x', '0px');
      syncCarouselPeers(stage, target);
      stage.__pbCarouselBusy = false;
    }, CAROUSEL_MS + 24);

    return true;
  }

  function settleCarousel(stage) {
    if (!stage || stage.__pbCarouselBusy) return;
    stage.classList.remove('pb-carousel-dragging');
    stage.classList.add('pb-carousel-animating');
    stage.style.setProperty('--pb-carousel-x', '0px');
    window.setTimeout(() => {
      stage.classList.remove('pb-carousel-animating');
    }, CAROUSEL_MS + 20);
  }

  function bindCarousel(stage) {
    if (!(stage instanceof HTMLElement) || stage.dataset.pbWhatsappCarousel === '1') return;
    stage.dataset.pbWhatsappCarousel = '1';
    let drag = null;

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!Array.isArray(stage.__pbCarouselSlides) || stage.__pbCarouselSlides.length < 2) return;

      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastAt: performance.now(),
        velocityX: 0,
        horizontal: false
      };
      event.stopImmediatePropagation();
    }, true);

    stage.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || stage.__pbCarouselBusy) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (!drag.horizontal) {
        if (Math.abs(dx) < 7) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.08) return;
        drag.horizontal = true;
        stage.classList.add('pb-carousel-dragging');
        try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      }
      if (!drag.horizontal) return;

      event.preventDefault();
      event.stopPropagation();

      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastAt);
      drag.velocityX = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastAt = now;

      const width = Math.max(1, stage.clientWidth || 320);
      const clamped = Math.max(-width, Math.min(width, dx));
      stage.style.setProperty('--pb-carousel-x', `${clamped}px`);
    }, { capture: true, passive: false });

    stage.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const state = drag;
      drag = null;
      if (!state.horizontal) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      try { stage.releasePointerCapture(event.pointerId); } catch (_) {}

      const dx = event.clientX - state.x;
      const width = Math.max(1, stage.clientWidth || 320);
      const distanceThreshold = Math.min(58, Math.max(38, width * 0.16));
      const fastEnough = Math.abs(state.velocityX) > 0.42 && Math.abs(dx) > 18;
      const commit = Math.abs(dx) >= distanceThreshold || fastEnough;

      if (!commit) {
        settleCarousel(stage);
        return;
      }

      const current = currentGalleryIndex(document.getElementById(SHEET_ID));
      const direction = dx < 0 ? 1 : -1;
      const total = stage.__pbCarouselSlides.length;
      const target = (current + direction + total) % total;
      animateCarouselTo(stage, target, direction);
    }, true);

    stage.addEventListener('pointercancel', event => {
      if (!drag || drag.id !== event.pointerId) return;
      drag = null;
      settleCarousel(stage);
    }, true);

    stage.addEventListener('click', event => {
      const arrow = event.target.closest('.pb-product-gallery-prev,.pb-product-gallery-next');
      if (!arrow || stage.__pbCarouselBusy) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = currentGalleryIndex(document.getElementById(SHEET_ID));
      const total = stage.__pbCarouselSlides?.length || 0;
      if (total < 2) return;
      const direction = arrow.classList.contains('pb-product-gallery-next') ? 1 : -1;
      const target = (current + direction + total) % total;
      animateCarouselTo(stage, target, direction);
    }, true);
  }

  function bindSheetNavigation(sheet) {
    if (!(sheet instanceof HTMLElement) || sheet.dataset.pbCarouselNavigation === '1') return;
    sheet.dataset.pbCarouselNavigation = '1';

    sheet.addEventListener('click', event => {
      const stage = sheet.querySelector('.pb-product-sheet-stage');
      if (!stage || stage.__pbCarouselInternalClick || stage.__pbCarouselBusy) return;

      const dot = event.target.closest('[data-pb-gallery-index]');
      if (dot) {
        const target = Number(dot.dataset.pbGalleryIndex);
        const total = stage.__pbCarouselSlides?.length || 0;
        if (!Number.isFinite(target) || total < 2 || target === currentGalleryIndex(sheet)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        animateCarouselTo(stage, target);
        return;
      }

      const color = event.target.closest('[data-pb-detail-color-id][data-pb-carousel-index]');
      if (!color) return;
      const target = Number(color.dataset.pbCarouselIndex);
      const total = stage.__pbCarouselSlides?.length || 0;
      if (!Number.isFinite(target) || total < 2 || target === currentGalleryIndex(sheet)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      animateCarouselTo(stage, target);
    }, true);
  }

  function installCategoryStickyState() {
    const wrap = document.querySelector('.sm-cats-wrap');
    if (!wrap) return false;
    if (wrap.dataset.pbStickyState === '1') return true;

    wrap.dataset.pbStickyState = '1';
    let sentinel = wrap.previousElementSibling;
    if (!sentinel?.classList?.contains('pb-cats-sticky-sentinel')) {
      sentinel = document.createElement('i');
      sentinel.className = 'pb-cats-sticky-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      wrap.before(sentinel);
    }

    catsObserver?.disconnect();
    catsObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      const isStuck = !entry?.isIntersecting && Number(entry?.boundingClientRect?.top) < 0;
      wrap.classList.toggle(CATS_STUCK_CLASS, isStuck);
    }, { threshold: [0, 1] });
    catsObserver.observe(sentinel);
    return true;
  }

  function enhanceSheet() {
    queued = false;
    installStyle();
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return false;

    captureSlidesBeforeCompacting(sheet);
    compactAndMoveColorPicker();

    const stage = sheet.querySelector('.pb-product-sheet-stage');
    bindCarousel(stage);
    bindSheetNavigation(sheet);
    syncCarouselPeers(stage);

    if (!sheetObserver) {
      const root = sheet.querySelector('.pb-product-sheet-scroll') || sheet;
      sheetObserver = new MutationObserver(mutations => {
        if (!mutations.some(m => m.addedNodes.length || m.removedNodes.length)) return;
        if (queued) return;
        queued = true;
        requestAnimationFrame(enhanceSheet);
      });
      sheetObserver.observe(root, { childList: true, subtree: true });
    }
    return true;
  }

  function boot() {
    installStyle();
    installCategoryStickyState();
    enhanceSheet();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const catsReady = installCategoryStickyState();
      const sheetReady = enhanceSheet();
      if ((catsReady && sheetReady) || tries >= 30) clearInterval(timer);
    }, 120);

    window.addEventListener('pageshow', installCategoryStickyState, { passive: true });
    window.addEventListener('restbr:ready', installCategoryStickyState, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();