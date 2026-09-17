(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_PRODUCT_GALLERY_THERMAL_V1__) return;
  window.__PASHA_PRODUCT_GALLERY_THERMAL_V1__ = true;

  const SHEET_ID = 'pbProductDetailSheet';
  const STYLE_ID = 'pbProductGalleryThermalV1Style';
  let observer = null;
  let queued = false;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SHEET_ID} .pb-product-sheet-color-picker{
        margin:2px 0 8px!important;
        padding:0!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-title{
        margin:0 0 5px!important;
        font-size:10px!important;
        line-height:1.2!important;
        opacity:.72!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list{
        display:flex!important;
        gap:5px!important;
        overflow-x:auto!important;
        overscroll-behavior-inline:contain!important;
        scrollbar-width:none!important;
        padding:1px 1px 3px!important;
        -webkit-overflow-scrolling:touch!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-list::-webkit-scrollbar{display:none!important}
      #${SHEET_ID} .pb-product-sheet-color{
        min-height:30px!important;
        min-width:max-content!important;
        gap:5px!important;
        padding:3px 7px!important;
        border-radius:9px!important;
        font-size:10px!important;
        line-height:1.15!important;
        flex:0 0 auto!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-swatch{
        width:13px!important;
        height:13px!important;
        min-width:13px!important;
        min-height:13px!important;
      }
      #${SHEET_ID} .pb-product-sheet-color-image{display:none!important}
      #${SHEET_ID} .pb-product-sheet-name{margin-top:4px!important}
      #${SHEET_ID} .pb-product-sheet-stage{
        touch-action:pan-y!important;
        overflow:hidden!important;
      }
      #${SHEET_ID} .pb-product-sheet-image{
        transform:translate3d(0,0,0);
        will-change:auto;
      }
      #${SHEET_ID} .pb-product-sheet-stage.pb-swipe-active .pb-product-sheet-image{
        will-change:transform;
      }
      @media(prefers-reduced-motion:reduce){
        #${SHEET_ID} .pb-product-sheet-image{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function compactAndMoveColorPicker() {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return false;
    const name = sheet.querySelector('.pb-product-sheet-name');
    const pickers = [...sheet.querySelectorAll('.pb-product-sheet-color-picker')];
    if (!name || !pickers.length) return false;

    // renderSheet creates a fresh picker in .extras. If an older picker was
    // already moved above the title, remove it before moving the fresh one.
    const picker = pickers[pickers.length - 1];
    pickers.slice(0, -1).forEach(old => old.remove());

    // Full color photos inside tiny chips duplicate image decoding. The swatch
    // already identifies the color; the full photo is decoded only when chosen.
    picker.querySelectorAll('.pb-product-sheet-color-image').forEach(img => img.remove());
    picker.querySelectorAll('.pb-product-sheet-color.has-image').forEach(btn => btn.classList.remove('has-image'));

    if (picker.nextElementSibling !== name) name.before(picker);
    return true;
  }

  function settleImage(stage, image, duration = 150) {
    if (!stage || !image) return;
    stage.classList.remove('pb-swipe-active');
    image.style.transition = `transform ${duration}ms cubic-bezier(.2,.75,.25,1)`;
    image.style.transform = 'translate3d(0,0,0)';
    window.setTimeout(() => {
      if (!image.isConnected) return;
      image.style.removeProperty('transition');
      image.style.removeProperty('transform');
    }, duration + 24);
  }

  function bindSwipe(stage) {
    if (!(stage instanceof HTMLElement) || stage.dataset.pbThermalSwipe === '1') return;
    stage.dataset.pbThermalSwipe = '1';
    let drag = null;

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const image = stage.querySelector('.pb-product-sheet-image');
      if (!image) return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        horizontal: false,
        image
      };
      image.style.transition = 'none';
      try { stage.setPointerCapture(event.pointerId); } catch (_) {}
    });

    stage.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.horizontal) {
        if (Math.abs(dx) < 7) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.08) return;
        drag.horizontal = true;
        stage.classList.add('pb-swipe-active');
      }
      if (!drag.horizontal) return;
      event.preventDefault();
      const damped = Math.max(-82, Math.min(82, dx * 0.72));
      drag.image.style.transform = `translate3d(${damped}px,0,0)`;
    }, { passive: false });

    // This listener is registered after the gallery's own pointerup handler.
    // The gallery changes the source first, then the new image settles into place.
    stage.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const image = drag.image;
      const horizontal = drag.horizontal;
      drag = null;
      try { stage.releasePointerCapture(event.pointerId); } catch (_) {}
      settleImage(stage, image, horizontal ? 155 : 115);
    });

    stage.addEventListener('pointercancel', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const image = drag.image;
      drag = null;
      settleImage(stage, image, 110);
    });
  }

  function enhanceSheet() {
    queued = false;
    installStyle();
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return false;
    compactAndMoveColorPicker();
    bindSwipe(sheet.querySelector('.pb-product-sheet-stage'));

    if (!observer) {
      const root = sheet.querySelector('.pb-product-sheet-scroll') || sheet;
      observer = new MutationObserver(mutations => {
        if (!mutations.some(m => m.addedNodes.length || m.removedNodes.length)) return;
        if (queued) return;
        queued = true;
        requestAnimationFrame(enhanceSheet);
      });
      observer.observe(root, { childList: true, subtree: true });
    }
    return true;
  }

  function boot() {
    installStyle();
    if (enhanceSheet()) return;

    // Product details is created shortly after the menu runtime. Use a short,
    // bounded retry instead of a permanent page-wide observer/timer.
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (enhanceSheet() || tries >= 30) clearInterval(timer);
    }, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();