(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_CATEGORY_RETAIL_CLEANUP_V1__) return;
  window.__PASHA_CATEGORY_RETAIL_CLEANUP_V1__ = true;

  const q = selector => document.querySelector(selector);

  function installStyle() {
    if (q('#pbCategoryRetailCleanupStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbCategoryRetailCleanupStyle';
    style.textContent = `
      #editorBody .pb-category-badges-clean{
        margin-top:12px!important;
        padding:14px!important;
        border-radius:16px!important;
        border:1px solid var(--pba-border,rgba(47,139,115,.15))!important;
        background:var(--pba-surface-strong,#fff)!important;
        box-shadow:none!important;
      }
      #editorBody .pb-category-badges-clean .schedule-editor-head{margin-bottom:12px!important}
      #editorBody .pb-category-badges-clean .schedule-editor-head strong{
        color:var(--pba-primary,#2f8b73)!important;
        font-size:14px!important;
      }
      #editorBody .pb-category-badges-clean .schedule-editor-head small{
        display:block!important;
        margin-top:4px!important;
        color:var(--pba-muted,#6e7b81)!important;
        line-height:1.7!important;
      }
      #editorBody .pb-category-badges-clean > .form-grid{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:10px!important;
      }
      #editorBody .pb-category-badges-clean > .form-grid > .field{
        min-width:0!important;
        gap:7px!important;
        padding:10px!important;
        border:1px solid var(--pba-border,rgba(47,139,115,.15))!important;
        border-radius:13px!important;
        background:var(--pba-surface,#fffdfb)!important;
      }
      #editorBody .pb-category-badges-clean > .form-grid > .field > span{
        color:var(--pba-ink,#2f3b42)!important;
        font-size:11px!important;
        line-height:1.55!important;
        font-weight:800!important;
      }
      #editorBody .pb-category-badges-clean select{
        width:100%!important;
        min-width:0!important;
        height:42px!important;
        border-radius:11px!important;
        background:var(--pba-surface-strong,#fff)!important;
        color:var(--pba-ink,#2f3b42)!important;
        -webkit-text-fill-color:var(--pba-ink,#2f3b42)!important;
        border:1px solid var(--pba-border,rgba(47,139,115,.15))!important;
      }
      body.admin-global-dark #editorBody .pb-category-badges-clean,
      body.admin-global-dark #editorBody .pb-category-badges-clean > .form-grid > .field{
        background:var(--pba-surface-strong,#18211f)!important;
      }
      body.admin-global-dark #editorBody .pb-category-badges-clean select{
        background:var(--pba-surface,#101715)!important;
      }
      @media(max-width:700px){
        #editorBody .pb-category-badges-clean > .form-grid{grid-template-columns:1fr!important}
        #editorBody .pb-category-badges-clean > .form-grid > .field{padding:11px 12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function removeScheduleBlock(id) {
    const control = document.getElementById(id);
    if (!control) return;
    const block = control.closest('.schedule-editor,.settings-card,.field');
    if (block) block.remove();
    else control.remove();
  }

  function cleanCategoryEditor() {
    const modal = q('#editorModal');
    const body = q('#editorBody');
    if (!body || !modal?.classList.contains('open')) return;

    // Pasha Baby is retail-only: category time scheduling is intentionally removed.
    removeScheduleBlock('c_availability_schedule_enabled');
    removeScheduleBlock('nc_availability_schedule_enabled');

    // Remove the restaurant-only "hot" badge from bulk category controls.
    const hotSelect = q('#c_badge_is_hot');
    hotSelect?.closest('.field')?.remove();

    const popular = q('#c_badge_is_popular');
    const badgeBlock = popular?.closest('.schedule-editor');
    if (badgeBlock) {
      badgeBlock.classList.add('pb-category-badges-clean');
      const headStrong = badgeBlock.querySelector('.schedule-editor-head strong');
      const headSmall = badgeBlock.querySelector('.schedule-editor-head small');
      if (headStrong) headStrong.textContent = '🏷 ليبلات أصناف القسم';
      if (headSmall) headSmall.textContent = 'طبّق ليبل على كل أصناف القسم أو اتركه «بدون تغيير» حتى تبقى حالة كل صنف مثل ما هي.';
    }
  }

  function boot() {
    installStyle();
    cleanCategoryEditor();

    const target = q('#editorBody') || document.body;
    const observer = new MutationObserver(cleanCategoryEditor);
    observer.observe(target, { childList: true, subtree: true });

    document.addEventListener('click', () => setTimeout(cleanCategoryEditor, 0), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
