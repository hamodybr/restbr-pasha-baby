(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_INTERACTION_POLISH_V1__) return;
  window.__PASHA_ADMIN_INTERACTION_POLISH_V1__ = true;

  const q = (selector, root = document) => root.querySelector(selector);

  function installStyle() {
    if (q('#pbAdminInteractionPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminInteractionPolishStyle';
    style.textContent = `
      /* Match the old ordering-window motion: no scale/tilt, soft lift only. */
      #categoriesContainer .category-row,
      #productsContainer .product-row{
        transition:box-shadow .18s ease,border-color .18s ease,background .18s ease,opacity .18s ease;
      }
      .pb-inline-order-ghost{
        opacity:.35!important;
        transform:none!important;
        border-style:solid!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 62%,var(--pba-border,rgba(47,139,115,.15)))!important;
        background:inherit!important;
      }
      .pb-inline-order-chosen{
        transform:none!important;
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 65%,transparent)!important;
        box-shadow:0 8px 25px rgba(0,0,0,.32)!important;
        z-index:5!important;
      }
      .pb-inline-order-drag{
        transform:none!important;
        box-shadow:0 8px 25px rgba(0,0,0,.32)!important;
      }
      .pb-list-drag-handle:active{
        transform:translateY(-50%)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function tuneSortable(container) {
    if (!container || !window.Sortable?.get) return false;
    const sortable = window.Sortable.get(container);
    if (!sortable) return false;
    sortable.option('animation', 180);
    sortable.option('delay', 80);
    sortable.option('delayOnTouchOnly', true);
    sortable.option('touchStartThreshold', 4);
    return true;
  }

  function tuneOrderingMotion() {
    const categoryReady = tuneSortable(q('#categoriesContainer'));
    const productReady = tuneSortable(q('#productsContainer'));
    return categoryReady && productReady;
  }

  // The progressive-disclosure focus handler opens <details> before the native
  // click toggles it, so the first tap could immediately close it again.
  // Remember the state before focus and restore it after that handler runs.
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
    document.addEventListener('pointerdown', rememberSummaryState, true);
    document.addEventListener('mousedown', rememberSummaryState, true);
    document.addEventListener('touchstart', rememberSummaryState, { capture: true, passive: true });
    document.addEventListener('focusin', restoreSummaryStateAfterFocus, true);

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
