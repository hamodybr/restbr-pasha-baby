(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_INTERACTION_POLISH_V5__) return;
  window.__PASHA_ADMIN_INTERACTION_POLISH_V5__ = true;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function installStyle() {
    if (q('#pbAdminInteractionPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminInteractionPolishStyle';
    style.textContent = `
      /*
       * Modern lifted-card reorder behaviour:
       * the moving card itself follows the finger, while its old slot becomes
       * only a very light placeholder. This keeps the old Sortable feel but
       * removes the distracting duplicate-card look on iPhone.
       */
      #categoriesContainer .category-row,
      #productsContainer .product-row{
        transition:
          background .16s ease,
          border-color .16s ease,
          box-shadow .16s ease,
          opacity .14s ease!important;
      }

      /* The original slot stays in the flow only as a faint placeholder. */
      #categoriesContainer .category-row.sortable-chosen:not(.sortable-fallback),
      #productsContainer .product-row.sortable-chosen:not(.sortable-fallback),
      #categoriesContainer .category-row.sortable-ghost:not(.sortable-fallback),
      #productsContainer .product-row.sortable-ghost:not(.sortable-fallback){
        opacity:.08!important;
        border:1px dashed color-mix(in srgb,var(--pba-primary,#2f8b73) 38%,transparent)!important;
        background:color-mix(in srgb,var(--pba-primary,#2f8b73) 4%,transparent)!important;
        box-shadow:none!important;
      }

      /* This is the lifted card that physically follows the finger/mouse. */
      .sortable-fallback{
        opacity:.96!important;
        scale:.955!important;
        transform-origin:center center!important;
        border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 68%,transparent)!important;
        border-radius:15px!important;
        background:linear-gradient(
          135deg,
          color-mix(in srgb,var(--pba-surface-strong,#fff) 94%,var(--pba-mint,#bfe5da)),
          color-mix(in srgb,var(--pba-mint,#bfe5da) 48%,var(--pba-surface-strong,#fff))
        )!important;
        box-shadow:
          0 20px 42px color-mix(in srgb,var(--pba-primary,#2f8b73) 20%,transparent),
          0 5px 14px rgba(0,0,0,.10)!important;
        pointer-events:none!important;
        cursor:grabbing!important;
        z-index:10050!important;
        will-change:transform,scale!important;
        transition:scale .12s ease,opacity .12s ease,box-shadow .12s ease!important;
      }

      body.admin-global-dark .sortable-fallback{
        background:linear-gradient(
          135deg,
          color-mix(in srgb,var(--pba-surface-strong,#192826) 90%,var(--pba-mint)),
          color-mix(in srgb,var(--pba-mint) 28%,var(--pba-surface-strong,#192826))
        )!important;
        box-shadow:
          0 22px 46px rgba(0,0,0,.34),
          0 6px 16px color-mix(in srgb,var(--pba-primary,#8fcdbd) 18%,transparent)!important;
      }

      /* Native/desktop drag class gets the same lifted feeling. */
      #categoriesContainer .category-row.sortable-drag,
      #productsContainer .product-row.sortable-drag{
        opacity:.96!important;
        scale:.955!important;
        border-color:var(--pba-primary,#2f8b73)!important;
        box-shadow:0 18px 38px color-mix(in srgb,var(--pba-primary,#2f8b73) 18%,transparent)!important;
      }

      .pb-list-drag-handle.drag-handle:active{transform:translateY(-50%)!important}

      @media(prefers-reduced-motion:reduce){
        #categoriesContainer .category-row,
        #productsContainer .product-row,
        .sortable-fallback{transition:none!important}
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

    sortable.option('animation', 180);
    sortable.option('easing', 'cubic-bezier(.2,.8,.2,1)');
    sortable.option('handle', '.drag-handle');
    sortable.option('ghostClass', 'sortable-ghost');
    sortable.option('chosenClass', 'sortable-chosen');
    sortable.option('dragClass', 'sortable-drag');
    sortable.option('delay', 80);
    sortable.option('delayOnTouchOnly', true);
    sortable.option('touchStartThreshold', 4);

    /* Force the touch fallback mirror so the lifted card follows the finger
       smoothly on iPhone. The real list slot becomes the faint placeholder. */
    sortable.option('draggable', '>*');
    sortable.option('forceFallback', true);
    sortable.option('fallbackOnBody', true);
    sortable.option('fallbackClass', 'sortable-fallback');
    sortable.option('fallbackTolerance', 3);
    sortable.option('swapThreshold', .65);
    sortable.option('invertSwap', false);
    sortable.option('scroll', true);
    sortable.option('scrollSensitivity', 70);
    sortable.option('scrollSpeed', 12);

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