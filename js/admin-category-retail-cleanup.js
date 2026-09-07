(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_CATEGORY_RETAIL_CLEANUP_V12__) return;
  window.__PASHA_CATEGORY_RETAIL_CLEANUP_V12__ = true;

  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];

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
        overflow:visible!important;
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
        overflow:visible!important;
      }
      #editorBody .pb-category-badges-clean > .form-grid > .field{
        min-width:0!important;
        gap:8px!important;
        padding:10px!important;
        border:1px solid var(--pba-border,rgba(47,139,115,.15))!important;
        border-radius:13px!important;
        background:var(--pba-surface,#fffdfb)!important;
        overflow:visible!important;
      }
      #editorBody .pb-category-badges-clean > .form-grid > .field > span{
        display:block!important;
        color:var(--pba-ink,#2f3b42)!important;
        font-size:12px!important;
        line-height:1.65!important;
        font-weight:850!important;
        white-space:normal!important;
        overflow:visible!important;
        text-overflow:clip!important;
      }
      #editorBody .pb-category-badges-clean select{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        height:48px!important;
        min-height:48px!important;
        padding:0 14px!important;
        border-radius:11px!important;
        background:var(--pba-surface-strong,#fff)!important;
        color:var(--pba-ink,#2f3b42)!important;
        -webkit-text-fill-color:var(--pba-ink,#2f3b42)!important;
        border:1px solid var(--pba-border,rgba(47,139,115,.15))!important;
        font-size:15px!important;
        font-weight:750!important;
        line-height:normal!important;
        text-align:right!important;
        text-align-last:right!important;
        opacity:1!important;
      }
      #editorBody .pb-category-badges-clean select option{
        color:var(--pba-ink,#2f3b42)!important;
        background:var(--pba-surface-strong,#fff)!important;
      }
      body.admin-global-dark #editorBody .pb-category-badges-clean,
      body.admin-global-dark #editorBody .pb-category-badges-clean > .form-grid > .field{
        background:var(--pba-surface-strong,#18211f)!important;
      }
      body.admin-global-dark #editorBody .pb-category-badges-clean select,
      body.admin-global-dark #editorBody .pb-category-badges-clean select option{
        background:var(--pba-surface,#101715)!important;
      }
      @media(max-width:700px){
        #editorBody .pb-category-badges-clean > .form-grid{grid-template-columns:1fr!important}
        #editorBody .pb-category-badges-clean > .form-grid > .field{padding:12px!important}
        #editorBody .pb-category-badges-clean select{height:50px!important;min-height:50px!important;font-size:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function removeStaleScheduleFolds() {
    qa('#editorBody details.pb-fold').forEach(details => {
      const summary = details.querySelector(':scope > summary');
      const label = String(summary?.textContent || '').replace(/\s+/g, ' ').trim();
      if (/توفر القسم حسب الوقت|توفر.*القسم.*حسب.*الوقت/.test(label)) details.remove();
    });
  }

  function removeScheduleBlock(id) {
    const control = document.getElementById(id);
    if (!control) return false;

    const fold = control.closest('details.pb-fold');
    const block = control.closest('.schedule-editor,.settings-card,.field');
    (block || control).remove();

    if (fold?.isConnected) {
      const foldBody = fold.querySelector(':scope > .pb-fold-body');
      const hasRealContent = foldBody && [...foldBody.children].some(child => {
        if (!(child instanceof Element)) return false;
        return child.matches('input,select,textarea,button') || !!child.querySelector('input,select,textarea,button');
      });
      if (!hasRealContent) fold.remove();
    }
    return true;
  }

  function setTextIfChanged(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function cleanCategoryEditor() {
    const modal = q('#editorModal');
    const body = q('#editorBody');
    if (!body || !modal?.classList.contains('open')) return;

    removeScheduleBlock('c_availability_schedule_enabled');
    removeScheduleBlock('nc_availability_schedule_enabled');
    removeStaleScheduleFolds();

    ['#c_badge_is_hot','#nc_badge_is_hot'].forEach(selector => {
      const hotSelect = q(selector);
      const hotField = hotSelect?.closest('.field');
      if (hotField) hotField.remove();
    });

    const popular = q('#c_badge_is_popular') || q('#nc_badge_is_popular');
    const badgeBlock = popular?.closest('.schedule-editor');
    if (!badgeBlock) return;

    if (!badgeBlock.classList.contains('pb-category-badges-clean')) {
      badgeBlock.classList.add('pb-category-badges-clean');
    }

    setTextIfChanged(
      badgeBlock.querySelector('.schedule-editor-head strong'),
      '🏷 ليبلات أصناف القسم'
    );
    setTextIfChanged(
      badgeBlock.querySelector('.schedule-editor-head small'),
      'طبّق ليبل على كل أصناف القسم أو اتركه «بدون تغيير» حتى تبقى حالة كل صنف مثل ما هي.'
    );
  }

  function boot() {
    installStyle();
    cleanCategoryEditor();

    const target = q('#editorBody') || document.body;
    let scheduled = false;
    const scheduleClean = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        cleanCategoryEditor();
      });
    };

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) {
        scheduleClean();
      }
    });
    observer.observe(target, { childList: true, subtree: true });

    document.addEventListener('click', scheduleClean, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
