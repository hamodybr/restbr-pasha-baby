(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_INTERACTION_POLISH_V2__) return;
  window.__PASHA_ADMIN_INTERACTION_POLISH_V2__ = true;

  const q = (selector, root = document) => root.querySelector(selector);

  function installStyle() {
    if (q('#pbAdminInteractionPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminInteractionPolishStyle';
    style.textContent = `
      /* Old ordering-window feel: tint on press, translucent drag clone that follows the finger. */
      #categoriesContainer .category-row,
      #productsContainer .product-row{
        transition:box-shadow .16s ease,border-color .16s ease,background .16s ease,opacity .16s ease;
      }

      #categoriesContainer .category-row.pb-order-pressing,
      #productsContainer .product-row.pb-order-pressing{
        opacity:.68!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 64%,var(--pba-border,rgba(47,139,115,.15)))!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 14%,var(--pba-surface-strong,#fff))!important;
        box-shadow:0 7px 20px rgba(0,0,0,.12)!important;
      }

      .pb-inline-order-ghost{
        opacity:.28!important;
        transform:none!important;
        border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 56%,var(--pba-border,rgba(47,139,115,.15)))!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 11%,var(--pba-surface-strong,#fff))!important;
        box-shadow:none!important;
      }

      .pb-inline-order-chosen{
        opacity:.58!important;
        transform:none!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 68%,transparent)!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,var(--pba-surface-strong,#fff))!important;
        box-shadow:0 8px 25px rgba(0,0,0,.22)!important;
        z-index:5!important;
      }

      .pb-inline-order-drag{
        opacity:.78!important;
        transform:none!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 72%,transparent)!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 18%,var(--pba-surface-strong,#fff))!important;
        box-shadow:0 10px 28px rgba(0,0,0,.26)!important;
      }

      .pb-inline-order-fallback{
        opacity:.80!important;
        transform:none!important;
        border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 74%,transparent)!important;
        border-radius:13px!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 18%,var(--pba-surface-strong,#fff))!important;
        box-shadow:0 14px 34px rgba(0,0,0,.28)!important;
        z-index:10050!important;
        pointer-events:none!important;
      }

      .pb-list-drag-handle:active{transform:translateY(-50%)!important}

      body.admin-global-dark #categoriesContainer .category-row.pb-order-pressing,
      body.admin-global-dark #productsContainer .product-row.pb-order-pressing,
      body.admin-global-dark .pb-inline-order-chosen,
      body.admin-global-dark .pb-inline-order-drag,
      body.admin-global-dark .pb-inline-order-fallback{
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 25%,var(--pba-surface-strong,#18211f))!important;
      }

      @media(prefers-reduced-motion:reduce){
        #categoriesContainer .category-row,
        #productsContainer .product-row{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function tuneSortable(container) {
    if (!container || !window.Sortable?.get) return false;
    const sortable = window.Sortable.get(container);
    if (!sortable) return false;

    // Force Sortable's fallback clone on touch devices so the dragged card
    // visibly follows the finger, like the old dedicated ordering window.
    sortable.option('animation', 180);
    sortable.option('delay', 70);
    sortable.option('delayOnTouchOnly', true);
    sortable.option('touchStartThreshold', 3);
    sortable.option('forceFallback', true);
    sortable.option('fallbackOnBody', true);
    sortable.option('fallbackClass', 'pb-inline-order-fallback');
    sortable.option('fallbackTolerance', 3);
    sortable.option('swapThreshold', 0.65);
    sortable.option('invertSwap', false);
    return true;
  }

  function tuneOrderingMotion() {
    const categoryReady = tuneSortable(q('#categoriesContainer'));
    const productReady = tuneSortable(q('#productsContainer'));
    return categoryReady && productReady;
  }

  // Immediate visual feedback from the first press, before Sortable starts moving.
  let pressedRow = null;
  function clearPressedRow() {
    if (pressedRow) pressedRow.classList.remove('pb-order-pressing');
    pressedRow = null;
  }
  function markPressedRow(event) {
    const handle = event.target?.closest?.('.pb-list-drag-handle');
    if (!handle) return;
    clearPressedRow();
    pressedRow = handle.closest('.category-row,.product-row');
    pressedRow?.classList.add('pb-order-pressing');
  }

  // The progressive-disclosure focus handler opens <details> before the native
  // click toggles it, so the first tap could immediately close it again.
  const pointerState = new WeakMap();

  function rememberSummaryState(event) {
    const summary = event.target?.closest?.('summary');
    const details = summary?.parentElement;
    if (!summary || !(details instanceof HTMLDetailsElement)) return;
    pointerState.set(summary, details.open);
  }

  function restoreSummaryStateAfterFocus(event) {
    const summary = event.target?.closest?.('summary');
    const details = summary?.parentElement;
    if (!summary || !(details instanceof HTMLDetailsElement)) return;
    if (!pointerState.has(summary)) return;
    details.open = pointerState.get(summary);
    requestAnimationFrame(() => pointerState.delete(summary));
  }

  function boot() {
    installStyle();

    document.addEventListener('pointerdown', event => {
      rememberSummaryState(event);
      markPressedRow(event);
    }, true);
    document.addEventListener('mousedown', rememberSummaryState, true);
    document.addEventListener('touchstart', event => {
      rememberSummaryState(event);
      markPressedRow(event);
    }, { capture: true, passive: true });
    document.addEventListener('focusin', restoreSummaryStateAfterFocus, true);

    ['pointerup','pointercancel','mouseup','touchend','touchcancel'].forEach(type => {
      document.addEventListener(type, clearPressedRow, true);
    });

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (tuneOrderingMotion() || attempts >= 80) clearInterval(timer);
    }, 100);

    const retune = () => requestAnimationFrame(tuneOrderingMotion);
    window.addEventListener('restbr:inline-category-order-saved', retune);
    window.addEventListener('restbr:inline-product-order-saved', retune);
    window.addEventListener('pageshow', retune, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();