(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_ORDERS_NAV_HOTFIX_V4__) return;
  window.__PASHA_ADMIN_ORDERS_NAV_HOTFIX_V4__ = true;

  const STYLE_ID = 'pbOrdersNavHotfixStyles';

  function loadAddon(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width:650px){
        .bottom-nav{
          display:flex!important;
          grid-template-columns:none!important;
          align-items:stretch!important;
          justify-content:flex-start!important;
          gap:6px!important;
          overflow-x:auto!important;
          overflow-y:hidden!important;
          -webkit-overflow-scrolling:touch!important;
          overscroll-behavior-inline:contain!important;
          scroll-snap-type:x proximity!important;
          scrollbar-width:none!important;
          touch-action:pan-x!important;
          padding-inline:7px!important;
          white-space:nowrap!important;
        }
        .bottom-nav::-webkit-scrollbar{display:none!important}
        .bottom-nav .nav-btn{
          flex:0 0 76px!important;
          width:76px!important;
          min-width:76px!important;
          max-width:76px!important;
          scroll-snap-align:center!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function kindFromTarget(target) {
    const el = target instanceof Element ? target : null;
    if (!el) return '';
    if (el.closest('#pbOrdersNav')) return 'orders';
    if (el.closest('#pbCustomersNav')) return 'customers';

    const quick = el.closest('#viewHome .quick-action');
    if (!quick) return '';
    const text = String(quick.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.includes('متابعة وطباعة طلبات المتجر')) return 'orders';
    if (text.includes('عدد الزبائن وسجل مشترياتهم')) return 'customers';
    return '';
  }

  function applyCustomView(kind) {
    const targetId = kind === 'orders' ? 'viewPashaOrders' : 'viewPashaCustomers';
    const navId = kind === 'orders' ? 'pbOrdersNav' : 'pbCustomersNav';
    const target = document.getElementById(targetId);
    if (!target) return false;

    document.querySelectorAll('.admin-view').forEach(section => {
      section.classList.toggle('active', section === target);
    });

    document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    document.getElementById(navId)?.classList.add('active');

    const title = document.getElementById('adminPageTitle');
    const subtitle = document.getElementById('adminPageSubtitle');
    if (title) title.textContent = kind === 'orders' ? 'الطلبات' : 'الزبائن';
    if (subtitle) subtitle.textContent = kind === 'orders'
      ? 'إدارة وتجهيز وطباعة الطلبات'
      : 'قاعدة زبائن Pasha Baby';

    return true;
  }

  function keepCustomView(kind) {
    queueMicrotask(() => applyCustomView(kind));
    requestAnimationFrame(() => applyCustomView(kind));
    setTimeout(() => applyCustomView(kind), 80);
  }

  function tagQuickActions() {
    document.querySelectorAll('#viewHome .quick-action').forEach(button => {
      const text = String(button.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.includes('متابعة وطباعة طلبات المتجر')) button.dataset.pbCustomView = 'orders';
      if (text.includes('عدد الزبائن وسجل مشترياتهم')) button.dataset.pbCustomView = 'customers';
    });
  }

  function boot() {
    installStyles();
    tagQuickActions();
    loadAddon('pashaInvoicePdfScript', 'js/admin-invoice-pdf-v4.js?v=4.0');
    loadAddon('pashaInvoicePdfSchedulerPatch', 'js/admin-invoice-iphone-scheduler-fix.js?v=1.0');
    loadAddon('pashaInvoiceLiveEditorScript', 'js/admin-invoice-live-editor.js?v=1.0');
    loadAddon('pashaInvoiceLiveSettingsUiV1', 'js/admin-invoice-live-settings-ui.js?v=1.0');
    loadAddon('pashaInvoicePrintPolishV1', 'js/admin-invoice-print-polish.js?v=1.0');
    loadAddon('pbOrdersEnhancementsScript', 'js/admin-orders-enhancements.js?v=1.0');
    loadAddon('pbColorImageUploadScript', 'js/admin-color-image-upload.js?v=1.0');

    document.addEventListener('click', event => {
      const kind = kindFromTarget(event.target);
      if (!kind) return;
      keepCustomView(kind);
    }, true);

    const observer = new MutationObserver(() => {
      tagQuickActions();
      installStyles();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
