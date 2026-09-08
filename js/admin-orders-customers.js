(() => {
  if (window.__PASHA_ADMIN_ORDERS_CUSTOMERS_V1__) return;
  window.__PASHA_ADMIN_ORDERS_CUSTOMERS_V1__ = true;

  const STATUS = {
    new: ['جديد', '🆕'],
    confirmed: ['مؤكد', '✓'],
    preparing: ['قيد التجهيز', '📦'],
    ready: ['جاهز', '✅'],
    delivering: ['قيد التوصيل', '🚚'],
    completed: ['مكتمل', '●'],
    cancelled: ['ملغي', '×'],
  };

  let orders = [];
  let customers = [];
  let currentCustomView = '';
  let orderFilter = 'all';
  let orderSearch = '';
  let customerSearch = '';
  let customerFilterPhone = '';
  let refreshTimer = null;

  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';
  const when = value => {
    try {
      return new Date(value).toLocaleString('ar-IQ', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch (_) { return String(value || ''); }
  };

  function injectStyles() {
    if (document.getElementById('pbOrdersCustomersStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbOrdersCustomersStyles';
    style.textContent = `
      .pb-ops-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 13px}
      .pb-ops-toolbar input,.pb-ops-toolbar select{flex:1 1 170px;min-width:0;border:1px solid rgba(255,255,255,.09);background:#0d0b09;color:inherit;border-radius:12px;padding:11px 12px;font:inherit;font-size:16px;outline:none}
      .pb-ops-toolbar button{border:1px solid rgba(216,169,88,.2);background:rgba(216,169,88,.08);color:#e2b55e;border-radius:12px;padding:10px 12px;font:inherit;font-weight:800;cursor:pointer}
      .pb-ops-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:13px}
      .pb-ops-kpi{padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .pb-ops-kpi span{display:block;color:#918a82;font-size:10px;margin-bottom:5px}.pb-ops-kpi b{font-size:20px;color:#e2b55e}
      .pb-order-list,.pb-customer-list{display:grid;gap:9px}
      .pb-order-card,.pb-customer-card{border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(10,8,6,.82);padding:12px;box-shadow:0 10px 28px rgba(0,0,0,.12)}
      .pb-order-head,.pb-customer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      .pb-order-number{font:900 15px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e2b55e;direction:ltr;text-align:left}
      .pb-order-date,.pb-muted{color:#817a72;font-size:10px;line-height:1.55}
      .pb-order-status{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(216,169,88,.16);border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800;color:#d7c4a5;background:rgba(216,169,88,.05);white-space:nowrap}
      .pb-order-customer{margin:10px 0 7px;font-weight:800;color:#ece7e1}.pb-order-customer a{color:inherit;text-decoration:none;direction:ltr;display:inline-block}
      .pb-order-address{color:#a9a097;font-size:11px;line-height:1.6;margin-bottom:8px}
      .pb-order-items{display:grid;gap:4px;padding:8px 0;border-top:1px dashed rgba(255,255,255,.08);border-bottom:1px dashed rgba(255,255,255,.08)}
      .pb-order-item{display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:1.5}.pb-order-item span{min-width:0}.pb-order-item b{white-space:nowrap;color:#d7c4a5}
      .pb-order-total{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-weight:900}.pb-order-total b{font-size:17px;color:#e2b55e}
      .pb-order-notes{margin-top:7px;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,.03);color:#b5ada4;font-size:10px;line-height:1.55}
      .pb-order-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.pb-order-actions button,.pb-customer-actions button{flex:1 1 105px;border:1px solid rgba(255,255,255,.08);background:#15110e;color:#ddd4ca;border-radius:10px;padding:9px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.pb-order-actions .primary{border-color:rgba(216,169,88,.25);background:linear-gradient(135deg,#e2b55e,#b67c2d);color:#171009}
      .pb-status-select{width:100%;margin-top:7px;border:1px solid rgba(255,255,255,.08);background:#0e0b09;color:inherit;border-radius:9px;padding:8px;font:inherit;font-size:13px}
      .pb-customer-id{font:900 14px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e2b55e;direction:ltr;text-align:left}.pb-customer-name{font-weight:900;color:#ece7e1;margin-top:4px}.pb-customer-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.pb-customer-stat{padding:8px;border-radius:10px;background:rgba(255,255,255,.025);text-align:center}.pb-customer-stat span{display:block;color:#827b73;font-size:8px}.pb-customer-stat b{display:block;margin-top:3px;font-size:11px;color:#d9d1c7}.pb-customer-actions{display:flex;gap:6px;margin-top:9px}
      .pb-empty{padding:30px 14px;text-align:center;color:#8b847c;border:1px dashed rgba(255,255,255,.08);border-radius:14px}
      .pb-nav-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#e2b55e;color:#24170a;font-size:8px;font-weight:900;margin-inline-start:4px}
      @media(max-width:650px){.pb-ops-kpis{grid-template-columns:1fr 1fr}.pb-ops-kpi:last-child{grid-column:1/-1}.pb-order-head,.pb-customer-head{gap:6px}.pb-customer-stats{grid-template-columns:1fr 1fr 1fr}}
      body.admin-global-light .pb-order-card,body.admin-global-light .pb-customer-card{background:#fffaf4;border-color:rgba(86,57,19,.13);color:#33291f}body.admin-global-light .pb-ops-toolbar input,body.admin-global-light .pb-ops-toolbar select,body.admin-global-light .pb-status-select{background:#fff;color:#33291f;border-color:rgba(86,57,19,.14)}body.admin-global-light .pb-order-actions button,body.admin-global-light .pb-customer-actions button{background:#fff7ec;color:#44372a;border-color:rgba(86,57,19,.13)}
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    if (document.getElementById('viewPashaOrders')) return;
    injectStyles();

    const nav = document.querySelector('[data-admin-nav="tools"]')?.parentElement;
    if (nav) {
      const ordersBtn = document.createElement('button');
      ordersBtn.className = 'nav-btn';
      ordersBtn.type = 'button';
      ordersBtn.id = 'pbOrdersNav';
      ordersBtn.innerHTML = '<span class="nav-icon">▤</span><span>الطلبات <i id="pbNewOrdersBadge" class="pb-nav-badge" hidden>0</i></span>';
      ordersBtn.addEventListener('click', () => showView('orders'));

      const customersBtn = document.createElement('button');
      customersBtn.className = 'nav-btn';
      customersBtn.type = 'button';
      customersBtn.id = 'pbCustomersNav';
      customersBtn.innerHTML = '<span class="nav-icon">♙</span><span>الزبائن</span>';
      customersBtn.addEventListener('click', () => showView('customers'));

      nav.insertBefore(ordersBtn, nav.querySelector('[data-admin-nav="analytics"]') || null);
      nav.insertBefore(customersBtn, nav.querySelector('[data-admin-nav="analytics"]') || null);
    }

    const main = document.querySelector('.admin-main');
    if (!main) return;

    main.insertAdjacentHTML('beforeend', `
      <section id="viewPashaOrders" class="admin-view" data-view="pasha-orders">
        <div class="view-title-row"><div><h2>الطلبات</h2><div class="view-subtitle">الطلبات الجديدة، التجهيز والطباعة 100×150</div></div></div>
        <div class="pb-ops-kpis">
          <div class="pb-ops-kpi"><span>طلبات جديدة</span><b id="pbOrdersNewCount">0</b></div>
          <div class="pb-ops-kpi"><span>طلبات اليوم</span><b id="pbOrdersTodayCount">0</b></div>
          <div class="pb-ops-kpi"><span>إجمالي اليوم</span><b id="pbOrdersTodayTotal">0 د.ع</b></div>
        </div>
        <div class="pb-ops-toolbar">
          <input id="pbOrderSearch" type="search" placeholder="رقم الطلب، اسم أو هاتف...">
          <select id="pbOrderFilter">
            <option value="all">كل الحالات</option>
            <option value="new">جديد</option>
            <option value="confirmed">مؤكد</option>
            <option value="preparing">قيد التجهيز</option>
            <option value="ready">جاهز</option>
            <option value="delivering">قيد التوصيل</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
          <button id="pbRefreshOrders" type="button">↻ تحديث</button>
        </div>
        <div id="pbOrdersList" class="pb-order-list"><div class="pb-empty">جاري تحميل الطلبات...</div></div>
      </section>

      <section id="viewPashaCustomers" class="admin-view" data-view="pasha-customers">
        <div class="view-title-row"><div><h2>الزبائن</h2><div class="view-subtitle">رقم الهاتف هو المعرّف الظاهر للزبون</div></div></div>
        <div class="pb-ops-kpis">
          <div class="pb-ops-kpi"><span>عدد الزبائن</span><b id="pbCustomersCount">0</b></div>
          <div class="pb-ops-kpi"><span>زبائن بطلب متكرر</span><b id="pbRepeatCustomersCount">0</b></div>
          <div class="pb-ops-kpi"><span>إجمالي الطلبات</span><b id="pbCustomerOrdersCount">0</b></div>
        </div>
        <div class="pb-ops-toolbar">
          <input id="pbCustomerSearch" type="search" placeholder="اسم أو رقم هاتف...">
          <button id="pbRefreshCustomers" type="button">↻ تحديث</button>
        </div>
        <div id="pbCustomersList" class="pb-customer-list"><div class="pb-empty">جاري تحميل الزبائن...</div></div>
      </section>`);

    document.getElementById('pbOrderSearch')?.addEventListener('input', e => { orderSearch = e.target.value || ''; renderOrders(); });
    document.getElementById('pbOrderFilter')?.addEventListener('change', e => { orderFilter = e.target.value || 'all'; renderOrders(); });
    document.getElementById('pbCustomerSearch')?.addEventListener('input', e => { customerSearch = e.target.value || ''; renderCustomers(); });
    document.getElementById('pbRefreshOrders')?.addEventListener('click', () => void loadOrders(true));
    document.getElementById('pbRefreshCustomers')?.addEventListener('click', () => void loadCustomers(true));

    document.querySelectorAll('[data-admin-nav]').forEach(button => {
      button.addEventListener('click', () => {
        currentCustomView = '';
        document.getElementById('pbOrdersNav')?.classList.remove('active');
        document.getElementById('pbCustomersNav')?.classList.remove('active');
      });
    });

    const homeGrid = document.querySelector('#viewHome .quick-grid');
    if (homeGrid) {
      const orderQuick = document.createElement('button');
      orderQuick.className = 'quick-action';
      orderQuick.type = 'button';
      orderQuick.innerHTML = '<strong>🧾 الطلبات</strong><span>متابعة وطباعة طلبات المتجر</span>';
      orderQuick.addEventListener('click', () => showView('orders'));
      homeGrid.appendChild(orderQuick);

      const customerQuick = document.createElement('button');
      customerQuick.className = 'quick-action';
      customerQuick.type = 'button';
      customerQuick.innerHTML = '<strong>👥 الزبائن</strong><span>عدد الزبائن وسجل مشترياتهم</span>';
      customerQuick.addEventListener('click', () => showView('customers'));
      homeGrid.appendChild(customerQuick);
    }
  }

  function showView(view) {
    injectUI();
    currentCustomView = view;
    document.querySelectorAll('.admin-view').forEach(section => section.classList.remove('active'));
    document.getElementById(view === 'orders' ? 'viewPashaOrders' : 'viewPashaCustomers')?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    document.getElementById(view === 'orders' ? 'pbOrdersNav' : 'pbCustomersNav')?.classList.add('active');

    const title = document.getElementById('adminPageTitle');
    const subtitle = document.getElementById('adminPageSubtitle');
    if (title) title.textContent = view === 'orders' ? 'الطلبات' : 'الزبائن';
    if (subtitle) subtitle.textContent = view === 'orders' ? 'إدارة وتجهيز وطباعة الطلبات' : 'قاعدة زبائن Pasha Baby';

    if (view === 'orders') void loadOrders();
    else void loadCustomers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadOrders(force = false) {
    const client = sb();
    if (!client) return;
    const list = document.getElementById('pbOrdersList');
    if (force && list) list.innerHTML = '<div class="pb-empty">جاري التحديث...</div>';

    const result = await client
      .from('orders')
      .select('id,order_number,customer_id,customer_name,customer_phone,order_type,address,location_url,notes,status,subtotal,delivery_fee,total,created_at,updated_at,order_items(id,product_id,option_id,product_name,option_name,quantity,unit_price,line_total)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (result.error) {
      if (list) list.innerHTML = `<div class="pb-empty">تعذر تحميل الطلبات: ${esc(result.error.message || result.error)}</div>`;
      return;
    }
    orders = Array.isArray(result.data) ? result.data : [];
    updateOrderKPIs();
    renderOrders();
    if (!customers.length) void loadCustomers(false);
  }

  async function loadCustomers(force = false) {
    const client = sb();
    if (!client) return;
    const list = document.getElementById('pbCustomersList');
    if (force && list) list.innerHTML = '<div class="pb-empty">جاري التحديث...</div>';

    const summary = await client
      .from('customer_order_summary')
      .select('*')
      .order('last_order_at', { ascending: false, nullsFirst: false })
      .limit(1000);

    if (!summary.error) {
      customers = Array.isArray(summary.data) ? summary.data : [];
    } else {
      const raw = await client.from('customers').select('*').order('updated_at', { ascending: false }).limit(1000);
      if (raw.error) {
        if (list) list.innerHTML = `<div class="pb-empty">تعذر تحميل الزبائن: ${esc(raw.error.message || raw.error)}</div>`;
        return;
      }
      const customerRows = Array.isArray(raw.data) ? raw.data : [];
      customers = customerRows.map(customer => {
        const related = orders.filter(order => String(order.customer_id || '') === String(customer.id) && order.status !== 'cancelled');
        return {
          ...customer,
          order_count: related.length,
          total_spent: related.reduce((sum, order) => sum + Number(order.total || 0), 0),
          first_order_at: related.length ? related[related.length - 1].created_at : null,
          last_order_at: related.length ? related[0].created_at : null,
        };
      });
    }

    updateCustomerKPIs();
    renderCustomers();
  }

  function updateOrderKPIs() {
    const now = new Date();
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const today = orders.filter(order => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(order.created_at)) === todayKey;
      } catch (_) { return false; }
    });
    const newCount = orders.filter(order => order.status === 'new').length;
    const todayTotal = today.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0);
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('pbOrdersNewCount', String(newCount));
    set('pbOrdersTodayCount', String(today.length));
    set('pbOrdersTodayTotal', money(todayTotal));
    const badge = document.getElementById('pbNewOrdersBadge');
    if (badge) { badge.textContent = String(newCount); badge.hidden = newCount < 1; }
  }

  function updateCustomerKPIs() {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('pbCustomersCount', String(customers.length));
    set('pbRepeatCustomersCount', String(customers.filter(c => Number(c.order_count || 0) > 1).length));
    set('pbCustomerOrdersCount', String(customers.reduce((sum, c) => sum + Number(c.order_count || 0), 0)));
  }

  function renderOrders() {
    const list = document.getElementById('pbOrdersList');
    if (!list) return;
    const needle = String(orderSearch || '').trim().toLowerCase();
    const filtered = orders.filter(order => {
      if (orderFilter !== 'all' && order.status !== orderFilter) return false;
      if (customerFilterPhone && String(order.customer_phone || '') !== customerFilterPhone) return false;
      if (!needle) return true;
      return [order.order_number, order.customer_name, order.customer_phone, order.address]
        .some(value => String(value || '').toLowerCase().includes(needle));
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="pb-empty">${customerFilterPhone ? 'لا توجد طلبات لهذا الزبون.' : 'لا توجد طلبات مطابقة.'}</div>`;
      return;
    }

    list.innerHTML = filtered.map(order => {
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      const status = STATUS[order.status] || [order.status || '—', '•'];
      return `<article class="pb-order-card" data-order-id="${esc(order.id)}">
        <div class="pb-order-head">
          <div><div class="pb-order-number">${esc(order.order_number)}</div><div class="pb-order-date">${esc(when(order.created_at))}</div></div>
          <span class="pb-order-status">${status[1]} ${esc(status[0])}</span>
        </div>
        <div class="pb-order-customer">${esc(order.customer_name)} — <a href="tel:${esc(order.customer_phone)}">${esc(order.customer_phone)}</a></div>
        ${order.address ? `<div class="pb-order-address">📍 ${esc(order.address)}</div>` : ''}
        <div class="pb-order-items">${items.map(item => `<div class="pb-order-item"><span>${Number(item.quantity || 0)}× ${esc(item.product_name)}${item.option_name ? ` — ${esc(item.option_name)}` : ''}</span><b>${money(item.line_total)}</b></div>`).join('')}</div>
        ${order.notes ? `<div class="pb-order-notes">📝 ${esc(order.notes)}</div>` : ''}
        <div class="pb-order-total"><span>المجموع الكلي</span><b>${money(order.total)}</b></div>
        <select class="pb-status-select" data-order-status="${esc(order.id)}">${Object.entries(STATUS).map(([key, value]) => `<option value="${key}" ${key === order.status ? 'selected' : ''}>${value[0]}</option>`).join('')}</select>
        <div class="pb-order-actions">
          <button class="primary" type="button" data-print-order="${esc(order.id)}">🖨 PDF / طباعة 100×150</button>
          ${order.location_url ? `<button type="button" data-open-location="${esc(order.id)}">📍 الموقع</button>` : ''}
          <button type="button" data-customer-orders="${esc(order.customer_phone)}">👤 سجل الزبون</button>
        </div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-order-status]').forEach(select => select.addEventListener('change', () => void updateStatus(select.dataset.orderStatus, select.value)));
    list.querySelectorAll('[data-print-order]').forEach(button => button.addEventListener('click', () => printOrder(button.dataset.printOrder)));
    list.querySelectorAll('[data-open-location]').forEach(button => button.addEventListener('click', () => {
      const order = orders.find(row => String(row.id) === String(button.dataset.openLocation));
      if (order?.location_url) window.open(order.location_url, '_blank', 'noopener,noreferrer');
    }));
    list.querySelectorAll('[data-customer-orders]').forEach(button => button.addEventListener('click', () => {
      customerFilterPhone = button.dataset.customerOrders || '';
      orderFilter = 'all';
      orderSearch = '';
      const search = document.getElementById('pbOrderSearch'); if (search) search.value = '';
      const filter = document.getElementById('pbOrderFilter'); if (filter) filter.value = 'all';
      renderOrders();
    }));
  }

  async function updateStatus(orderId, status) {
    if (!STATUS[status]) return;
    const client = sb();
    if (!client) return;
    const result = await client.from('orders').update({ status }).eq('id', orderId);
    if (result.error) {
      alert('فشل تحديث حالة الطلب: ' + (result.error.message || result.error));
      await loadOrders(true);
      return;
    }
    const order = orders.find(row => String(row.id) === String(orderId));
    if (order) order.status = status;
    updateOrderKPIs();
    renderOrders();
    void loadCustomers(false);
  }

  function renderCustomers() {
    const list = document.getElementById('pbCustomersList');
    if (!list) return;
    const needle = String(customerSearch || '').trim().toLowerCase();
    const filtered = customers.filter(customer => !needle || [customer.name, customer.phone_e164, customer.default_address]
      .some(value => String(value || '').toLowerCase().includes(needle)));

    if (!filtered.length) {
      list.innerHTML = '<div class="pb-empty">لا توجد زبائن مطابقة.</div>';
      return;
    }

    list.innerHTML = filtered.map(customer => `<article class="pb-customer-card">
      <div class="pb-customer-head"><div><div class="pb-customer-id">${esc(customer.phone_e164)}</div><div class="pb-customer-name">${esc(customer.name)}</div></div><span class="pb-order-status">${Number(customer.order_count || 0)} طلب</span></div>
      ${customer.default_address ? `<div class="pb-order-address" style="margin-top:8px">📍 ${esc(customer.default_address)}</div>` : ''}
      <div class="pb-customer-stats">
        <div class="pb-customer-stat"><span>الطلبات</span><b>${Number(customer.order_count || 0)}</b></div>
        <div class="pb-customer-stat"><span>المشتريات</span><b>${money(customer.total_spent)}</b></div>
        <div class="pb-customer-stat"><span>آخر طلب</span><b>${customer.last_order_at ? esc(when(customer.last_order_at).split('،')[0]) : '—'}</b></div>
      </div>
      <div class="pb-customer-actions"><button type="button" data-show-customer-orders="${esc(customer.phone_e164)}">عرض سجل الطلبات</button></div>
    </article>`).join('');

    list.querySelectorAll('[data-show-customer-orders]').forEach(button => button.addEventListener('click', () => {
      customerFilterPhone = button.dataset.showCustomerOrders || '';
      showView('orders');
      renderOrders();
    }));
  }

  function printOrder(orderId) {
    const order = orders.find(row => String(row.id) === String(orderId));
    if (!order) return;
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const logo = document.querySelector('.admin-logo')?.src || '';
    const compactClass = items.length > 14 ? 'ultra-compact' : items.length > 10 ? 'compact' : '';
    const popup = window.open('', '_blank', 'width=520,height=780');
    if (!popup) {
      alert('اسمح بالنوافذ المنبثقة حتى تفتح معاينة الطباعة.');
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(order.order_number)} — Pasha Baby</title><style>
      @page{size:100mm 150mm;margin:0}
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      html,body{margin:0;padding:0;width:100mm;min-width:100mm;background:#fff;color:#111;font-family:Arial,Tahoma,"Segoe UI",sans-serif}
      .label{width:100mm;height:150mm;padding:5mm 5mm 4mm;display:flex;flex-direction:column;overflow:hidden;border:0}
      .brand{text-align:center;border-bottom:.35mm solid #111;padding-bottom:2.2mm;margin-bottom:2.3mm}.brand img{width:16mm;height:16mm;object-fit:contain;display:block;margin:0 auto 1mm}.brand h1{margin:0;font:900 5mm/1.05 Georgia,serif;letter-spacing:.5mm}.brand small{font-size:2.4mm;letter-spacing:.35mm}
      .orderline{display:flex;justify-content:space-between;align-items:center;gap:2mm;margin-bottom:2mm}.orderline strong{font:900 4.1mm/1.1 ui-monospace,monospace;direction:ltr}.orderline span{font-size:2.6mm}
      .customer{border:.35mm solid #111;border-radius:2mm;padding:2.2mm;margin-bottom:2.2mm;font-size:3mm;line-height:1.45}.customer b{font-size:3.4mm}.phone{direction:ltr;display:inline-block;font-weight:900}.address{margin-top:1mm;font-weight:700}
      .items{flex:1;min-height:0;overflow:hidden;border-top:.3mm solid #111;border-bottom:.3mm solid #111;padding:1.2mm 0}.item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;padding:1mm 0;border-bottom:.18mm dotted #777;font-size:2.75mm;line-height:1.32}.item:last-child{border-bottom:0}.item strong{white-space:nowrap}.option{font-size:2.3mm;color:#333}.compact .item{font-size:2.35mm;padding:.65mm 0}.compact .option{font-size:2mm}.ultra-compact .item{font-size:1.95mm;padding:.4mm 0;line-height:1.16}.ultra-compact .option{font-size:1.75mm}
      .notes{margin-top:1.6mm;padding:1.5mm;border:.25mm solid #555;border-radius:1.5mm;font-size:2.45mm;line-height:1.35;max-height:15mm;overflow:hidden}.totals{margin-top:2mm;border:.45mm solid #111;border-radius:1.8mm;padding:2mm;display:grid;gap:.8mm}.row{display:flex;justify-content:space-between;gap:2mm;font-size:2.7mm}.row.grand{font-size:4.2mm;font-weight:900;border-top:.3mm solid #111;padding-top:1.2mm}.footer{text-align:center;margin-top:1.7mm;font-size:2.5mm;font-weight:800}.screen-actions{display:flex;gap:8px;padding:12px;position:fixed;left:0;right:0;bottom:0;background:#eee;z-index:5}.screen-actions button{flex:1;padding:12px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:800}@media print{.screen-actions{display:none}}
    </style></head><body><div class="label ${compactClass}">
      <div class="brand">${logo ? `<img src="${esc(logo)}" alt="Pasha Baby">` : ''}<h1>PASHA BABY</h1><small>PREMIUM BABY BOUTIQUE</small></div>
      <div class="orderline"><strong>${esc(order.order_number)}</strong><span>${esc(when(order.created_at))}</span></div>
      <div class="customer"><b>${esc(order.customer_name)}</b><br><span class="phone">${esc(order.customer_phone)}</span> · ${order.order_type === 'delivery' ? 'توصيل' : 'استلام'}${order.address ? `<div class="address">${esc(order.address)}</div>` : ''}</div>
      <div class="items">${items.map(item => `<div class="item"><span><b>${Number(item.quantity || 0)}× ${esc(item.product_name)}</b>${item.option_name ? `<div class="option">${esc(item.option_name)}</div>` : ''}</span><strong>${money(item.line_total)}</strong></div>`).join('')}</div>
      ${order.notes ? `<div class="notes"><b>ملاحظة:</b> ${esc(order.notes)}</div>` : ''}
      <div class="totals">${Number(order.delivery_fee || 0) > 0 ? `<div class="row"><span>المجموع</span><b>${money(order.subtotal)}</b></div><div class="row"><span>التوصيل</span><b>${money(order.delivery_fee)}</b></div>` : ''}<div class="row grand"><span>المجموع الكلي</span><b>${money(order.total)}</b></div></div>
      <div class="footer">شكراً لاختياركم PASHA BABY</div>
    </div><div class="screen-actions"><button onclick="window.print()">طباعة / حفظ PDF 100×150</button></div></body></html>`);
    popup.document.close();
    popup.focus();
  }

  function startAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadOrders(false);
      if (currentCustomView === 'customers') void loadCustomers(false);
    }, 30000);
  }

  function start() {
    if (document.body.classList.contains('auth-locked')) return;
    injectUI();
    void loadOrders(false);
    void loadCustomers(false);
    startAutoRefresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
