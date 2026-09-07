(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_PRODUCT_EDITOR_CLEANUP_V1__) return;
  window.__PASHA_PRODUCT_EDITOR_CLEANUP_V1__ = true;

  function removeFieldByInputId(id, selector) {
    const input = document.getElementById(id);
    if (!input) return false;
    const wrap = input.closest(selector);
    if (wrap) wrap.remove();
    else input.remove();
    return true;
  }

  function cleanupEditor() {
    const body = document.getElementById('editorBody');
    if (!body) return;

    // Retail store: no restaurant-style spicy/hot flag.
    removeFieldByInputId('p_is_hot', '.check-card');
    removeFieldByInputId('np_is_hot', '.check-card');

    // Retail store: availability is manual only. Remove scheduled availability UI.
    for (const prefix of ['p', 'np']) {
      const enabled = document.getElementById(`${prefix}_availability_schedule_enabled`);
      if (enabled) enabled.checked = false;
      const from = document.getElementById(`${prefix}_available_from`);
      if (from) from.value = '';
      const to = document.getElementById(`${prefix}_available_to`);
      if (to) to.value = '';
      const schedule = enabled?.closest('.schedule-editor') || from?.closest('.schedule-editor') || to?.closest('.schedule-editor');
      schedule?.remove();
    }

    // Old helper text still describes percentage discounts; Pasha now uses fixed IQD discounts.
    body.querySelectorAll('.schedule-note').forEach(note => {
      if (/نسبة الخصم|خصم الخضراء/.test(note.textContent || '')) note.remove();
    });
  }

  function boot() {
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
