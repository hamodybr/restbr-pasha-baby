(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_BABY_ADMIN_POLISH_V3__) return;
  window.__PASHA_BABY_ADMIN_POLISH_V3__ = true;

  const STYLE_ID = 'pbAdminPolishV3Styles';
  const HOLDER_IDS = ['optionsEditor','newOptionsEditor'];
  const optionRects = new WeakMap();
  let observer = null;
  let queued = false;

  function installStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Pasha Baby admin: force the same mint-first accent language everywhere. */
      body.admin-global-light,
      body.admin-global-dark{
        --pbx-accent:var(--pba-primary,#2f8b73);
        --pbx-accent-2:var(--pba-primary-2,#4ea78f);
        --pbx-ink:var(--pba-ink,#2f3b42);
        --pbx-muted:var(--pba-muted,#6e7b81);
        --pbx-surface:var(--pba-surface,#fffdfb);
        --pbx-surface-strong:var(--pba-surface-strong,#fff);
        --pbx-surface-soft:var(--pba-surface-soft,#f3fbf8);
        --pbx-border:var(--pba-border,rgba(47,139,115,.15));
        --pbx-border-strong:var(--pba-border-strong,rgba(47,139,115,.32));
      }

      body.admin-global-light .admin-header h1,
      body.admin-global-dark .admin-header h1,
      body.admin-global-light .view-title-row h2,
      body.admin-global-dark .view-title-row h2,
      body.admin-global-light .panel-header h2,
      body.admin-global-dark .panel-header h2,
      body.admin-global-light .home-hero h2,
      body.admin-global-dark .home-hero h2,
      body.admin-global-light .settings-section-title,
      body.admin-global-dark .settings-section-title,
      body.admin-global-light .settings-accordion-title strong,
      body.admin-global-dark .settings-accordion-title strong,
      body.admin-global-light .sm-hours-toggle-title,
      body.admin-global-dark .sm-hours-toggle-title,
      body.admin-global-light .sm-hours-day-name,
      body.admin-global-dark .sm-hours-day-name,
      body.admin-global-light #discountsSettingsPanel .settings-accordion-title strong,
      body.admin-global-dark #discountsSettingsPanel .settings-accordion-title strong,
      body.admin-global-light #discountsSettingsPanel .pb-discount-row strong,
      body.admin-global-dark #discountsSettingsPanel .pb-discount-row strong,
      body.admin-global-light .product-price,
      body.admin-global-dark .product-price,
      body.admin-global-light .sort-position,
      body.admin-global-dark .sort-position,
      body.admin-global-light .sort-status,
      body.admin-global-dark .sort-status,
      body.admin-global-light .sm-option-order-number,
      body.admin-global-dark .sm-option-order-number,
      body.admin-global-light #adminRoleBadge,
      body.admin-global-dark #adminRoleBadge{
        color:var(--pbx-accent)!important;
      }

      body.admin-global-light .btn-gold,
      body.admin-global-dark .btn-gold,
      body.admin-global-light .login-submit,
      body.admin-global-dark .login-submit,
      body.admin-global-light #pbDiscountCreateBtn,
      body.admin-global-dark #pbDiscountCreateBtn{
        background:linear-gradient(135deg,var(--pbx-accent-2),var(--pbx-accent))!important;
        color:#fff!important;
        border-color:transparent!important;
        box-shadow:0 8px 20px color-mix(in srgb,var(--pbx-accent) 22%,transparent)!important;
      }

      body.admin-global-light .filter-chip.active,
      body.admin-global-dark .filter-chip.active{
        background:color-mix(in srgb,var(--pbx-accent) 14%,var(--pbx-surface-strong))!important;
        color:var(--pbx-accent)!important;
        border-color:var(--pbx-border-strong)!important;
      }

      body.admin-global-light .bottom-nav .nav-btn.active,
      body.admin-global-dark .bottom-nav .nav-btn.active{
        color:var(--pbx-accent)!important;
        background:color-mix(in srgb,var(--pbx-accent) 11%,transparent)!important;
      }

      body.admin-global-light .compact-details>summary,
      body.admin-global-dark .compact-details>summary,
      body.admin-global-light #discountsSettingsPanel>summary,
      body.admin-global-dark #discountsSettingsPanel>summary{
        color:var(--pbx-accent)!important;
        border-color:var(--pbx-border)!important;
      }

      body.admin-global-light .compact-details>summary::after,
      body.admin-global-dark .compact-details>summary::after,
      body.admin-global-light .settings-chevron,
      body.admin-global-dark .settings-chevron,
      body.admin-global-light #discountsSettingsPanel .settings-chevron,
      body.admin-global-dark #discountsSettingsPanel .settings-chevron{
        color:var(--pbx-accent)!important;
      }

      body.admin-global-light .drag-handle,
      body.admin-global-dark .drag-handle,
      body.admin-global-light .sm-option-drag,
      body.admin-global-dark .sm-option-drag{
        background:color-mix(in srgb,var(--pbx-accent) 9%,var(--pbx-surface-strong))!important;
        color:var(--pbx-accent)!important;
        border-color:var(--pbx-border-strong)!important;
      }

      body.admin-global-light input:focus,
      body.admin-global-dark input:focus,
      body.admin-global-light textarea:focus,
      body.admin-global-dark textarea:focus,
      body.admin-global-light select:focus,
      body.admin-global-dark select:focus,
      body.admin-global-light .search-box:focus,
      body.admin-global-dark .search-box:focus{
        border-color:var(--pbx-accent)!important;
        box-shadow:0 0 0 3px color-mix(in srgb,var(--pbx-accent) 12%,transparent)!important;
      }

      body.admin-global-light .settings-switch input:checked + i,
      body.admin-global-dark .settings-switch input:checked + i{
        background:color-mix(in srgb,var(--pbx-accent) 24%,transparent)!important;
        border-color:var(--pbx-border-strong)!important;
      }
      body.admin-global-light .settings-switch input:checked + i::after,
      body.admin-global-dark .settings-switch input:checked + i::after{
        background:var(--pbx-accent)!important;
      }

      body.admin-global-light #adminRoleBadge,
      body.admin-global-dark #adminRoleBadge,
      body.admin-global-light .restbr-account-identity,
      body.admin-global-dark .restbr-account-identity{
        background:color-mix(in srgb,var(--pbx-accent) 8%,var(--pbx-surface))!important;
        border-color:var(--pbx-border)!important;
      }

      body.admin-global-light .restbr-account-identity span,
      body.admin-global-dark .restbr-account-identity span{color:var(--pbx-accent)!important}

      body.admin-global-light #discountsSettingsPanel,
      body.admin-global-dark #discountsSettingsPanel,
      body.admin-global-light #discountsSettingsPanel .pb-discount-box,
      body.admin-global-dark #discountsSettingsPanel .pb-discount-box,
      body.admin-global-light .pb-discount-row,
      body.admin-global-dark .pb-discount-row{
        background:var(--pbx-surface)!important;
        color:var(--pbx-ink)!important;
        border-color:var(--pbx-border)!important;
      }

      body.admin-global-light #discountsSettingsPanel input,
      body.admin-global-dark #discountsSettingsPanel input,
      body.admin-global-light #discountsSettingsPanel select,
      body.admin-global-dark #discountsSettingsPanel select{
        background:var(--pbx-surface-strong)!important;
        color:var(--pbx-ink)!important;
        -webkit-text-fill-color:var(--pbx-ink)!important;
        border-color:var(--pbx-border)!important;
      }

      body.admin-global-light #discountsSettingsPanel label,
      body.admin-global-dark #discountsSettingsPanel label,
      body.admin-global-light #discountsSettingsPanel .pb-discount-head small,
      body.admin-global-dark #discountsSettingsPanel .pb-discount-head small,
      body.admin-global-light #discountsSettingsPanel .pb-discount-row small,
      body.admin-global-dark #discountsSettingsPanel .pb-discount-row small{
        color:var(--pbx-muted)!important;
      }

      /* We keep one collapsible discounts panel only. */
      #pbDiscountQuickBtn{display:none!important}

      /* Sort controls now live above potentially very large lists. */
      #viewProducts .compact-details[data-pb-sort-up='1'],
      #viewCategories .compact-details[data-pb-sort-up='1']{
        margin:0 0 12px!important;
        box-shadow:0 8px 22px color-mix(in srgb,var(--pbx-accent) 7%,transparent)!important;
      }

      /* Product options use the same visual motion language as sortable lists. */
      #optionsEditor .option-editor,
      #newOptionsEditor .option-editor{
        position:relative!important;
        overflow:visible!important;
        transition:transform .20s cubic-bezier(.2,.8,.2,1),box-shadow .20s ease,border-color .20s ease,opacity .20s ease!important;
        will-change:transform;
      }

      #optionsEditor .option-editor.sm-option-dragging,
      #newOptionsEditor .option-editor.sm-option-dragging{
        opacity:.94!important;
        transform:scale(1.018) rotate(.2deg)!important;
        border-color:var(--pbx-border-strong)!important;
        background:var(--pbx-surface-soft)!important;
        box-shadow:0 16px 34px color-mix(in srgb,var(--pbx-accent) 18%,transparent)!important;
        z-index:8!important;
      }

      #optionsEditor .option-editor.sm-option-drag-over,
      #newOptionsEditor .option-editor.sm-option-drag-over{
        border-color:var(--pbx-accent)!important;
        box-shadow:0 0 0 2px color-mix(in srgb,var(--pbx-accent) 13%,transparent)!important;
      }

      #optionsEditor .option-editor.sm-option-drag-over::before,
      #newOptionsEditor .option-editor.sm-option-drag-over::before{
        content:'';
        position:absolute;
        inset-inline:10px;
        top:-6px;
        height:3px;
        border-radius:999px;
        background:linear-gradient(90deg,transparent,var(--pbx-accent),transparent);
        box-shadow:0 0 12px color-mix(in srgb,var(--pbx-accent) 45%,transparent);
        pointer-events:none;
      }

      .sm-option-drag{position:relative!important}
      .sm-option-drag::after{
        content:'';
        position:absolute;
        inset:-4px;
        border:1px solid transparent;
        border-radius:12px;
        pointer-events:none;
      }

      body.sm-option-is-dragging .sm-option-drag::after{
        border-color:color-mix(in srgb,var(--pbx-accent) 42%,transparent);
        animation:pbOptionDragPulse 1s ease-in-out infinite;
      }

      @keyframes pbOptionDragPulse{
        0%,100%{transform:scale(.96);opacity:.35}
        50%{transform:scale(1.08);opacity:.95}
      }

      .sm-option-delete{
        background:color-mix(in srgb,#d76565 8%,var(--pbx-surface-strong))!important;
        color:#d76565!important;
        border-color:color-mix(in srgb,#d76565 28%,transparent)!important;
      }

      @media(prefers-reduced-motion:reduce){
        #optionsEditor .option-editor,
        #newOptionsEditor .option-editor{transition:none!important}
        body.sm-option-is-dragging .sm-option-drag::after{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function visibleRows(holder){
    if (!holder) return [];
    return [...holder.children].filter(row =>
      row instanceof Element &&
      row.classList.contains('option-editor') &&
      row.dataset.deleted !== '1' &&
      row.style.display !== 'none'
    );
  }

  function updateOptionLabels(holder){
    visibleRows(holder).forEach((row,index) => {
      const label = row.querySelector(':scope > .sm-option-order-bar .sm-option-order-number');
      if (label) label.textContent = `الخيار ${index + 1}`;
    });
  }

  function optionName(row){
    return row?.querySelector('.oe-name')?.value?.trim() || 'هذا الخيار';
  }

  function removeOptionRow(row){
    if (!row) return;
    const holder = row.closest('#optionsEditor,#newOptionsEditor');
    const name = optionName(row);
    if (!window.confirm(`هل أنت متأكد من حذف الخيار «${name}»؟`)) return;

    if (row.dataset.optionId) {
      row.dataset.deleted = '1';
      row.style.display = 'none';
    } else {
      row.remove();
    }

    updateOptionLabels(holder);
    if (holder) requestAnimationFrame(() => recordRects(holder));
  }

  function patchDeleteButtons(root = document){
    root.querySelectorAll?.('[data-sm-option-delete]').forEach(button => {
      button.removeAttribute('data-sm-option-delete');
      button.setAttribute('data-pb-option-delete','1');
      button.setAttribute('aria-label','حذف الخيار بعد التأكيد');
      button.title = 'حذف الخيار';
    });
  }

  function recordRects(holder){
    if (!holder) return;
    const map = new Map();
    visibleRows(holder).forEach(row => map.set(row,row.getBoundingClientRect()));
    optionRects.set(holder,map);
  }

  function animateReflow(holder){
    if (!holder) return;
    const previous = optionRects.get(holder) || new Map();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (!reduced) {
      visibleRows(holder).forEach(row => {
        if (row.classList.contains('sm-option-dragging')) return;
        const oldRect = previous.get(row);
        if (!oldRect) return;
        const now = row.getBoundingClientRect();
        const dy = oldRect.top - now.top;
        if (Math.abs(dy) < 1) return;
        try {
          row.animate(
            [{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],
            {duration:190,easing:'cubic-bezier(.2,.8,.2,1)'}
          );
        } catch (_) {}
      });
    }

    requestAnimationFrame(() => recordRects(holder));
  }

  function removeDiscountQuickButton(){
    document.getElementById('pbDiscountQuickBtn')?.remove();
  }

  function moveSortSectionsUp(){
    const productDetails = document.getElementById('productSortList')?.closest('.compact-details');
    const productPanel = document.getElementById('productsContainer')?.closest('.panel');
    if (productDetails && productPanel) {
      productDetails.dataset.pbSortUp = '1';
      if (productDetails.nextElementSibling !== productPanel) productPanel.before(productDetails);
    }

    const categoryDetails = document.getElementById('categorySortList')?.closest('.compact-details');
    const categoryPanel = document.getElementById('categoriesContainer')?.closest('.panel');
    if (categoryDetails && categoryPanel) {
      categoryDetails.dataset.pbSortUp = '1';
      if (categoryDetails.nextElementSibling !== categoryPanel) categoryPanel.before(categoryDetails);
    }
  }

  function polish(){
    queued = false;
    removeDiscountQuickButton();
    moveSortSectionsUp();
    patchDeleteButtons(document);

    HOLDER_IDS.forEach(id => {
      const holder = document.getElementById(id);
      if (!holder) return;
      updateOptionLabels(holder);
      if (!optionRects.has(holder)) recordRects(holder);
    });
  }

  function queuePolish(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(polish);
  }

  function startObserver(){
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      const changedHolders = new Set();

      mutations.forEach(mutation => {
        if (mutation.type !== 'childList') return;
        const target = mutation.target;
        if (!(target instanceof Element)) return;
        if (HOLDER_IDS.includes(target.id)) changedHolders.add(target);
      });

      changedHolders.forEach(holder => {
        patchDeleteButtons(holder);
        animateReflow(holder);
      });

      queuePolish();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('click',event => {
    const button = event.target.closest?.('[data-pb-option-delete]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    removeOptionRow(button.closest('.option-editor'));
  },true);

  function boot(){
    installStyles();
    polish();
    startObserver();

    let attempts = 0;
    const timer = setInterval(() => {
      polish();
      attempts += 1;
      if (attempts >= 80) clearInterval(timer);
    },250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();