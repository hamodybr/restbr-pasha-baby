(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_INTERACTION_POLISH_V3__) return;
  window.__PASHA_ADMIN_INTERACTION_POLISH_V3__ = true;

  const q = (selector, root = document) => root.querySelector(selector);

  function installStyle() {
    if (q('#pbAdminInteractionPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminInteractionPolishStyle';
    style.textContent = `
      /* Reuse the visual language of the old dedicated ordering window. */
      #categoriesContainer .category-row,
      #productsContainer .product-row{
        transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,opacity .18s ease!important;
      }

      #categoriesContainer .category-row.pb-inline-order-chosen,
      #productsContainer .product-row.pb-inline-order-chosen{
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,transparent)!important;
        transform:none!important;
        z-index:6!important;
      }

      #categoriesContainer .category-row.pb-inline-order-ghost,
      #productsContainer .product-row.pb-inline-order-ghost{
        opacity:.35!important;
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,transparent)!important;
        transform:none!important;
      }

      /* On touch fallback, this is the card that physically follows the finger. */
      .pb-inline-order-fallback{
        opacity:.72!important;
        border:1px solid var(--pba-primary,#2f8b73)!important;
        border-radius:13px!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 18%,transparent)!important;
        transform:none!important;
        pointer-events:none!important;
        z-index:10050!important;
      }

      #categoriesContainer .category-row.pb-inline-order-drag,
      #productsContainer .product-row.pb-inline-order-drag{
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,transparent)!important;
        transform:none!important;
      }

      .pb-list-drag-handle:active{transform:translateY(-50%)!important}

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

    /* Exact interaction values from the old ordering window. */
    sortable.option('animation', 180);
    sortable.option('delay', 80);
    sortable.option('delayOnTouchOnly', true);
    sortable.option('touchStartThreshold', 4);

    /* Undo the newer custom drag physics and let Sortable behave like the old window. */
    sortable.option('forceFallback', false);
    sortable.option('fallbackOnBody', false);
    sortable.option('fallbackTolerance', 0);
    sortable.option('swapThreshold', 1);
    sortable.option('invertSwap', false);
    sortable.option('fallbackClass', 'pb-inline-order-fallback');
    return true;
  }

  function tuneOrderingMotion() {
    const categoryReady = tuneSortable(q('#categoriesContainer'));
    const productReady = tuneSortable(q('#productsContainer'));
    return categoryReady && productReady;
  }

  /* Keep the first-tap fix for every collapsible dashboard section. */
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