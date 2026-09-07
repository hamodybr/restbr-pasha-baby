(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_PRODUCT_EDITOR_CLEANUP_V1__) return;
  window.__PASHA_PRODUCT_EDITOR_CLEANUP_V1__ = true;

  const HOT_IDS = ['p_is_hot', 'np_is_hot'];
  const SCHEDULE_FIELDS = [
    ['p_availability_schedule_enabled', 'p_available_from', 'p_available_to'],
    ['np_availability_schedule_enabled', 'np_available_from', 'np_available_to']
  ];
  const IOS_NO_ZOOM_STYLE_ID = 'pashaProductDescriptionNoZoomStyle';

  function ensureDescriptionNoZoomStyle() {
    if (document.getElementById(IOS_NO_ZOOM_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = IOS_NO_ZOOM_STYLE_ID;
    style.textContent = `
      @media (max-width: 768px) {
        #editorBody textarea#p_description_ar,
        #editorBody textarea#p_description_ku,
        #editorBody textarea#p_description_en,
        #editorBody textarea#np_description_ar,
        #editorBody textarea#np_description_ku,
        #editorBody textarea#np_description_en {
          font-size: 16px !important;
          line-height: 1.55 !important;
          -webkit-text-size-adjust: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeFieldByInputId(id, selector) {
    const input = document.getElementById(id);
    if (!input) return false;
    const wrap = input.closest(selector);
    if (wrap) wrap.remove();
    else input.remove();
    return true;
  }

  function cleanupEditor() {
    ensureDescriptionNoZoomStyle();

    const body = document.getElementById('editorBody');
    if (!body) return;

    // Retail store: no restaurant-style spicy/hot flag.
    HOT_IDS.forEach(id => removeFieldByInputId(id, '.check-card'));

    // Retail store: availability is manual only. Remove scheduled availability UI.
    SCHEDULE_FIELDS.forEach(([enabledId, fromId, toId]) => {
      const enabled = document.getElementById(enabledId);
      if (enabled) enabled.checked = false;
      const from = document.getElementById(fromId);
      if (from) from.value = '';
      const to = document.getElementById(toId);
      if (to) to.value = '';
      const schedule = enabled?.closest('.schedule-editor') || from?.closest('.schedule-editor') || to?.closest('.schedule-editor');
      schedule?.remove();
    });

    // Old helper text still describes percentage discounts; Pasha now uses fixed IQD discounts.
    body.querySelectorAll('.schedule-note').forEach(note => {
      if (/نسبة الخصم|خصم الخضراء/.test(note.textContent || '')) note.remove();
    });
  }

  function boot() {
    ensureDescriptionNoZoomStyle();
    cleanupEditor();
    const modal = document.getElementById('editorModal');
    const body = document.getElementById('editorBody');
    if (!modal || !body) return;

    const observer = new MutationObserver(() => cleanupEditor());
    observer.observe(body, { childList: true, subtree: true });

    document.addEventListener('click', event => {
      if (event.target.closest('.edit-product-btn,[onclick*="editAdminProduct"],[onclick*="openAddProductEditor"]')) {
        setTimeout(cleanupEditor, 0);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
