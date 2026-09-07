(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_INTERACTION_POLISH_V4__) return;
  window.__PASHA_ADMIN_INTERACTION_POLISH_V4__ = true;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function installStyle() {
    if (q('#pbAdminInteractionPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminInteractionPolishStyle';
    style.textContent = `
      /*
       * Inline lists now use the ORIGINAL SortableJS state classes from the
       * old dedicated ordering window: sortable-chosen / sortable-ghost /
       * sortable-drag / sortable-fallback.  Only the list location is new.
       */
      #categoriesContainer .category-row,
      #productsContainer .product-row{
        transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,opacity .18s ease!important;
      }

      #categoriesContainer .category-row.sortable-chosen,
      #productsContainer .product-row.sortable-chosen{
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,transparent)!important;
        transform:none!important;
        z-index:6!important;
      }

      #categoriesContainer .category-row.sortable-ghost,
      #productsContainer .product-row.sortable-ghost{
        opacity:.35!important;
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 16%,transparent)!important;
        transform:none!important;
      }

      #categoriesContainer .category-row.sortable-drag,
      #productsContainer .product-row.sortable-drag,
      .sortable-fallback{
        opacity:.72!important;
        border-color:var(--pba-primary,#2f8b73)!important;
        background:linear-gradient(135deg,var(--pba-surface-strong,#fff),var(--pba-mint,#bfe5da))!important;
        box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary,#2f8b73) 18%,transparent)!important;
        transform:none!important;
      }

      .sortable-fallback{
        border:1px solid var(--pba-primary,#2f8b73)!important;
        border-radius:13px!important;
        pointer-events:none!important;
        z-index:10050!important;
      }

      .pb-list-drag-handle.drag-handle:active{transform:translateY(-50%)!important}

      @media(prefers-reduced-motion:reduce){
        #categoriesContainer .category-row,
        #productsContainer .product-row{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function prepareOldHandles(root = document) {
    qa('.pb-list-drag-handle', root).forEach(handle => {
      handle.classList.add('drag-handle');
    });
  }

  function clearNewerStateClasses(container) {
    if (!container) return;
    qa('.pb-inline-order-ghost,.pb-inline-order-chosen,.pb-inline-order-drag,.pb-inline-order-fallback', container)
      .forEach(el => el.classList.remove(
        'pb-inline-order-ghost',
        'pb-inline-order-chosen',
        'pb-inline-order-drag',
        'pb-inline-order-fallback'
      ));
  }

  function tuneSortable(container) {
    if (!container || !window.Sortable?.get) return false;
    const sortable = window.Sortable.get(container);
    if (!sortable) return false;

    prepareOldHandles(container);
    clearNewerStateClasses(container);

    /* Exact options used by the old ordering window. */
    sortable.option('animation', 180);
    sortable.option('handle', '.drag-handle');
    sortable.option('ghostClass', 'sortable-ghost');
    sortable.option('chosenClass', 'sortable-chosen');
    sortable.option('dragClass', 'sortable-drag');
    sortable.option('delay', 80);
    sortable.option('delayOnTouchOnly', true);
    sortable.option('touchStartThreshold', 4);

    /* Restore SortableJS defaults for everything the newer inline version tuned. */
    sortable.option('draggable', '>*');
    sortable.option('forceFallback', false);
    sortable.option('fallbackOnBody', false);
    sortable.option('fallbackClass', 'sortable-fallback');
    sortable.option('fallbackTolerance', 0);
    sortable.option('swapThreshold', 1);
    sortable.option('invertSwap', false);
    sortable.option('scroll', true);
    sortable.option('scrollSensitivity', 30);
    sortable.option('scrollSpeed', 10);

    return true;
  }

  function tuneOrderingMotion() {
    prepareOldHandles(document);
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
    prepareOldHandles(document);

    document.addEventListener('pointerdown', rememberSummaryState, true);
    document.addEventListener('mousedown', rememberSummaryState, true);
    document.addEventListener('touchstart', rememberSummaryState, { capture: true, passive: true });
    document.addEventListener('focusin', restoreSummaryStateAfterFocus, true);

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (tuneOrderingMotion() || attempts >= 100) clearInterval(timer);
    }, 100);

    const retune = () => requestAnimationFrame(tuneOrderingMotion);
    window.addEventListener('restbr:inline-category-order-saved', retune);
    window.addEventListener('restbr:inline-product-order-saved', retune);
    window.addEventListener('pageshow', retune, { passive: true });

    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.addedNodes.length || m.removedNodes.length)) {
        requestAnimationFrame(() => {
          prepareOldHandles(document);
          tuneOrderingMotion();
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();