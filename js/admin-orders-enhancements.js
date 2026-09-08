(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_ORDERS_ENHANCEMENTS_V1__) return;
  window.__PASHA_ADMIN_ORDERS_ENHANCEMENTS_V1__ = true;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function client() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function installStyles() {
    if (q('#pbOrdersEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbOrdersEnhancementStyles';
    style.textContent = `
      #viewPashaOrders,#viewPashaCustomers{
        --pb-ops-card:#fffdf9;
        --pb-ops-card-2:#fff9f2;
        --pb-ops-ink:#28363b;
        --pb-ops-muted:#65737a;
        --pb-ops-soft:#7e8a90;
        --pb-ops-border:rgba(56,82,88,.14);
        --pb-ops-accent:#2f8b73;
        --pb-ops-accent-soft:rgba(47,139,115,.09);
        --pb-ops-danger:#b54848;
        --pb-ops-danger-bg:#fff2f1;
        color:var(--pb-ops-ink)!important;
      }
      #viewPashaOrders .view-title-row h2,#viewPashaCustomers .view-title-row h2{
        color:var(--pb-ops-accent)!important;font-size:25px!important;font-weight:950!important;letter-spacing:0!important
      }
      #viewPashaOrders .view-subtitle,#viewPashaCustomers .view-subtitle{
        color:var(--pb-ops-muted)!important;font-size:13px!important;font-weight:600!important;line-height:1.7!important
      }
      #viewPashaOrders .pb-ops-kpi,#viewPashaCustomers .pb-ops-kpi,
      #viewPashaOrders .pb-order-card,#viewPashaCustomers .pb-customer-card{
        background:var(--pb-ops-card)!important;border-color:var(--pb-ops-border)!important;color:var(--pb-ops-ink)!important;
        box-shadow:0 8px 26px rgba(44,65,70,.055)!important
      }
      #viewPashaOrders .pb-ops-kpi span,#viewPashaCustomers .pb-ops-kpi span{
        color:var(--pb-ops-muted)!important;font-size:12px!important;font-weight:700!important
      }
      #viewPashaOrders .pb-ops-kpi b,#viewPashaCustomers .pb-ops-kpi b{
        color:#d8a741!important;font-size:27px!important;font-weight:950!important
      }
      #viewPashaOrders .pb-order-number,#viewPashaCustomers .pb-customer-id{
        color:#d39c2f!important;font-size:17px!important;font-weight:950!important;opacity:1!important
      }
      #viewPashaOrders .pb-order-date,#viewPashaOrders .pb-muted,#viewPashaCustomers .pb-muted{
        color:var(--pb-ops-muted)!important;font-size:11px!important;font-weight:600!important;opacity:1!important
      }
      #viewPashaOrders .pb-order-customer,#viewPashaCustomers .pb-customer-name{
        color:var(--pb-ops-ink)!important;font-size:15px!important;font-weight:900!important;opacity:1!important
      }
      #viewPashaOrders .pb-order-address,#viewPashaCustomers .pb-order-address{
        color:var(--pb-ops-muted)!important;font-size:12px!important;font-weight:650!important;opacity:1!important
      }
      #viewPashaOrders .pb-order-item{
        color:var(--pb-ops-ink)!important;font-size:13px!important;font-weight:650!important;line-height:1.65!important
      }
      #viewPashaOrders .pb-order-item b{color:#98722d!important;font-size:12px!important;font-weight:900!important}
      #viewPashaOrders .pb-order-total{color:var(--pb-ops-ink)!important;font-size:18px!important;font-weight:950!important}
      #viewPashaOrders .pb-order-total b{color:#d39c2f!important;font-size:22px!important}
      #viewPashaOrders .pb-order-status,#viewPashaCustomers .pb-order-status{
        color:#8b6a2c!important;background:#fff8e8!important;border-color:rgba(196,148,53,.2)!important;font-size:10px!important;font-weight:900!important
      }
      #viewPashaOrders .pb-order-notes{
        color:var(--pb-ops-muted)!important;background:var(--pb-ops-accent-soft)!important;font-size:12px!important;font-weight:650!important
      }
      #viewPashaOrders .pb-status-select,#viewPashaOrders .pb-ops-toolbar input,#viewPashaOrders .pb-ops-toolbar select,
      #viewPashaCustomers .pb-ops-toolbar input{
        background:#fff!important;color:var(--pb-ops-ink)!important;-webkit-text-fill-color:var(--pb-ops-ink)!important;
        border-color:var(--pb-ops-border)!important;font-size:16px!important;font-weight:650!important
      }
      #viewPashaOrders .pb-ops-toolbar button,#viewPashaCustomers .pb-ops-toolbar button,
      #viewPashaOrders .pb-order-actions button,#viewPashaCustomers .pb-customer-actions button{
        background:var(--pb-ops-card-2)!important;color:#795b24!important;border-color:rgba(160,118,42,.18)!important;font-size:12px!important;font-weight:900!important
      }
      #viewPashaOrders .pb-order-actions .primary{
        background:linear-gradient(135deg,#e6ba5d,#d69a32)!important;color:#271b08!important;border:0!important
      }
      #viewPashaCustomers .pb-customer-stat{background:#fff8f0!important;color:var(--pb-ops-ink)!important}
      #viewPashaCustomers .pb-customer-stat span{color:var(--pb-ops-muted)!important;font-size:10px!important;font-weight:700!important}
      #viewPashaCustomers .pb-customer-stat b{color:var(--pb-ops-ink)!important;font-size:13px!important;font-weight:900!important;opacity:1!important}
      .pb-danger-delete{
        background:var(--pb-ops-danger-bg)!important;color:var(--pb-ops-danger)!important;border:1px solid rgba(181,72,72,.24)!important
      }
      .pb-danger-delete:disabled{opacity:.55!important;cursor:not-allowed!important}

      body.admin-global-dark #viewPashaOrders,body.admin-global-dark #viewPashaCustomers{
        --pb-ops-card:#121a18;
        --pb-ops-card-2:#17211e;
        --pb-ops-ink:#f1f5f3;
        --pb-ops-muted:#b3c0bb;
        --pb-ops-soft:#93a29c;
        --pb-ops-border:rgba(121,187,161,.16);
        --pb-ops-accent:#72c4a7;
        --pb-ops-accent-soft:rgba(82,174,142,.1);
        --pb-ops-danger:#ff9d9d;
        --pb-ops-danger-bg:rgba(165,54,54,.12);
      }
      body.admin-global-dark #viewPashaOrders .pb-order-card,
      body.admin-global-dark #viewPashaCustomers .pb-customer-card,
      body.admin-global-dark #viewPashaOrders .pb-ops-kpi,
      body.admin-global-dark #viewPashaCustomers .pb-ops-kpi{
        box-shadow:0 14px 34px rgba(0,0,0,.22)!important
      }
      body.admin-global-dark #viewPashaOrders .pb-order-number,
      body.admin-global-dark #viewPashaCustomers .pb-customer-id,
      body.admin-global-dark #viewPashaOrders .pb-ops-kpi b,
      body.admin-global-dark #viewPashaCustomers .pb-ops-kpi b,
      body.admin-global-dark #viewPashaOrders .pb-order-total b{color:#efc267!important}
      body.admin-global-dark #viewPashaOrders .pb-order-item b{color:#dfc58c!important}
      body.admin-global-dark #viewPashaOrders .pb-order-status,
      body.admin-global-dark #viewPashaCustomers .pb-order-status{
        color:#ead29d!important;background:rgba(227,183,91,.09)!important;border-color:rgba(227,183,91,.18)!important
      }
      body.admin-global-dark #viewPashaOrders .pb-status-select,
      body.admin-global-dark #viewPashaOrders .pb-ops-toolbar input,
      body.admin-global-dark #viewPashaOrders .pb-ops-toolbar select,
      body.admin-global-dark #viewPashaCustomers .pb-ops-toolbar input{
        background:#0d1412!important;color:#f1f5f3!important;-webkit-text-fill-color:#f1f5f3!important;color-scheme:dark!important
      }
      body.admin-global-dark #viewPashaOrders .pb-ops-toolbar button,
      body.admin-global-dark #viewPashaCustomers .pb-ops-toolbar button,
      body.admin-global-dark #viewPashaOrders .pb-order-actions button,
      body.admin-global-dark #viewPashaCustomers .pb-customer-actions button{
        background:#18221f!important;color:#e8d2a2!important;border-color:rgba(227,183,91,.15)!important
      }
      #viewPashaOrders .pb-order-actions button.pb-danger-delete,
      #viewPashaCustomers .pb-customer-actions button.pb-danger-delete{
        background:var(--pb-ops-danger-bg)!important;color:var(--pb-ops-danger)!important;border-color:rgba(181,72,72,.28)!important
      }
      body.admin-global-dark #viewPashaOrders .pb-order-actions button.pb-danger-delete,
      body.admin-global-dark #viewPashaCustomers .pb-customer-actions button.pb-danger-delete{
        background:var(--pb-ops-danger-bg)!important;color:var(--pb-ops-danger)!important;border-color:rgba(255,157,157,.28)!important
      }
      body.admin-global-dark #viewPashaCustomers .pb-customer-stat{background:#0f1715!important}
      @media(max-width:650px){
        #viewPashaOrders .pb-order-card,#viewPashaCustomers .pb-customer-card{padding:14px!important}
        #viewPashaOrders .pb-order-item{font-size:13px!important}
        #viewPashaOrders .pb-order-customer,#viewPashaCustomers .pb-customer-name{font-size:15px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceOrderCard(card) {
    if (!(card instanceof Element) || card.dataset.pbDeleteReady === '1') return;
    const id = String(card.dataset.orderId || '');
    const actions = q('.pb-order-actions', card);
    if (!id || !actions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pb-danger-delete';
    button.dataset.deleteOrder = id;
    button.textContent = '🗑 حذف الطلب';
    actions.appendChild(button);
    card.dataset.pbDeleteReady = '1';
  }

  function enhanceCustomerCard(card) {
    if (!(card instanceof Element) || card.dataset.pbDeleteReady === '1') return;
    const phone = q('.pb-customer-id', card)?.textContent?.trim() || '';
    const actions = q('.pb-customer-actions', card);
    if (!phone || !actions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pb-danger-delete';
    button.dataset.deleteCustomer = phone;
    button.textContent = '🗑 حذف الزبون';
    actions.appendChild(button);
    card.dataset.pbDeleteReady = '1';
  }

  function enhance() {
    installStyles();
    qa('#pbOrdersList .pb-order-card').forEach(enhanceOrderCard);
    qa('#pbCustomersList .pb-customer-card').forEach(enhanceCustomerCard);
  }

  async function deleteOrder(button) {
    const id = String(button.dataset.deleteOrder || '');
    if (!id) return;
    if (!confirm('حذف هذا الطلب نهائياً؟\n\nسيتم حذف تفاصيل الطلب أيضاً، ولا يمكن التراجع.')) return;
    const sb = client();
    if (!sb) return alert('قاعدة البيانات غير جاهزة.');
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'جاري الحذف...';
    const { error } = await sb.from('orders').delete().eq('id', id);
    if (error) {
      button.disabled = false;
      button.textContent = old;
      alert('فشل حذف الطلب: ' + (error.message || error));
      return;
    }
    q('#pbRefreshOrders')?.click();
    setTimeout(() => q('#pbRefreshCustomers')?.click(), 250);
  }

  async function deleteCustomer(button) {
    const phone = String(button.dataset.deleteCustomer || '').trim();
    if (!phone) return;
    if (!confirm(`حذف الزبون ${phone} من قائمة الزبائن؟\n\nسجل الطلبات القديم يبقى محفوظاً، لكن الزبون ينحذف من قاعدة الزبائن. وإذا طلب لاحقاً بنفس الرقم ينضاف من جديد.`)) return;
    const sb = client();
    if (!sb) return alert('قاعدة البيانات غير جاهزة.');
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'جاري الحذف...';
    const { error } = await sb.from('customers').delete().eq('phone_e164', phone);
    if (error) {
      button.disabled = false;
      button.textContent = old;
      alert('فشل حذف الزبون: ' + (error.message || error));
      return;
    }
    q('#pbRefreshCustomers')?.click();
    setTimeout(() => q('#pbRefreshOrders')?.click(), 250);
  }

  function boot() {
    installStyles();
    enhance();
    document.addEventListener('click', event => {
      const orderButton = event.target.closest?.('[data-delete-order]');
      if (orderButton) {
        event.preventDefault();
        void deleteOrder(orderButton);
        return;
      }
      const customerButton = event.target.closest?.('[data-delete-customer]');
      if (customerButton) {
        event.preventDefault();
        void deleteCustomer(customerButton);
      }
    });
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pageshow', enhance, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
