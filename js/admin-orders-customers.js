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
  let orderFilter = 'new';
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

  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));

  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';
  const when = value => {
    try {
      return englishDigits(new Date(value).toLocaleString('ar-IQ', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }));
    } catch (_) { return englishDigits(String(value || '')); }
  };

  const itemKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function legacyColors(notes) {
    const queues = new Map();
    const text = String(notes || '');
    if (!/^🎨\s*الألوان:/m.test(text)) return queues;
    text.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*•\s*(.*?)\s*×\s*[0-9٠-٩۰-۹]+\s*:\s*(.+?)\s*$/);
      if (!match) return;
      const key = itemKey(match[1]);
      const color = String(match[2] || '').trim().slice(0, 80);
      if (!key || !color) return;
      if (!queues.has(key)) queues.set(key, []);
      queues.get(key).push(color);
    });
    return queues;
  }

  function orderItemsWithColors(order) {
    const queues = legacyColors(order?.notes);
    const rows = Array.isArray(order?.order_items) ? order.order_items : [];
    return rows.map(item => {
      const explicit = String(item?.selected_color || '').trim();
      if (explicit) return { ...item, selected_color: explicit };
      const queue = queues.get(itemKey(item?.product_name));
      return { ...item, selected_color: queue?.shift?.() || '' };
    });
  }

  function cleanOrderNotes(value) {
    return String(value || '')
      .replace(/^\s*🎨\s*الألوان:\s*\r?\n(?:\s*•[^\r\n]*(?:\r?\n|$))+\s*/i, '')
      .trim();
  }

  function itemOptionText(item) {
    const option = String(item?.option_name || '').trim();
    const color = String(item?.selected_color || '').trim();
    if (option && color) return `${option} • اللون: ${color}`;
    if (color) return `اللون: ${color}`;
    return option;
  }

  function parseFee(value) {
    const normalized = englishDigits(value)
      .replace(/[٬،,\s]/g, '')
      .replace(/٫/g, '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const fee = Number(normalized);
    return Number.isFinite(fee) && fee >= 0 && fee <= 10000000 ? fee : null;
  }

  function injectStyles() {
    if (document.getElementById('pbOrdersCustomersStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbOrdersCustomersStyles';
    style.textContent = `
      .pb-ops-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 13px}
      .pb-ops-toolbar input{flex:1 1 170px;min-width:0;border:1px solid rgba(255,255,255,.09);background:#0d0b09;color:inherit;border-radius:12px;padding:11px 12px;font:inherit;font-size:16px;outline:none}
      .pb-ops-toolbar button{border:1px solid rgba(216,169,88,.2);background:rgba(216,169,88,.08);color:#e2b55e;border-radius:12px;padding:10px 12px;font:inherit;font-weight:800;cursor:pointer}
      .pb-status-filter-bar{display:flex;gap:7px;overflow-x:auto;margin:-2px 0 14px;padding:2px 1px 7px;scroll-snap-type:x proximity;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
      .pb-status-filter-bar button{flex:0 0 auto;scroll-snap-align:start;border:1px solid rgba(216,169,88,.17);border-radius:999px;background:rgba(216,169,88,.055);color:#bdb3a8;padding:8px 12px;font:800 11px/1.2 inherit;white-space:nowrap;cursor:pointer;transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease}
      .pb-status-filter-bar button:active{transform:scale(.97)}.pb-status-filter-bar button.active{border-color:#d8a958;background:linear-gradient(135deg,#e3b85f,#bd8330);color:#181008;box-shadow:0 5px 14px rgba(181,121,38,.2)}
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
      .pb-order-item{display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:1.5}.pb-order-item span{min-width:0}.pb-order-item span strong{display:block;color:inherit}.pb-order-item span small{display:block;margin-top:2px;color:#a99d91;font-size:10px;font-weight:700}.pb-order-item b{white-space:nowrap;color:#d7c4a5}.pb-order-item.pb-delivery-line{color:#6eb89f}.pb-order-item.pb-delivery-line span strong{color:inherit}
      .pb-order-total{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-weight:900}.pb-order-total b{font-size:17px;color:#e2b55e}
      .pb-order-notes{margin-top:7px;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,.03);color:#b5ada4;font-size:10px;line-height:1.55}
      .pb-delivery-fee-editor{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:end;margin-top:9px;padding:9px;border:1px solid rgba(110,184,159,.18);border-radius:11px;background:rgba(72,151,126,.06)}.pb-delivery-fee-editor label{min-width:0}.pb-delivery-fee-editor label span{display:block;margin:0 2px 5px;color:#aebdb7;font-size:10px;font-weight:850}.pb-delivery-fee-editor input{width:100%;min-width:0;height:39px;padding:0 10px;border:1px solid rgba(110,184,159,.24);border-radius:9px;background:#0d1412;color:#f1f5f3;-webkit-text-fill-color:#f1f5f3;font:800 16px/1 ui-monospace,monospace;direction:ltr;text-align:left;outline:none}.pb-delivery-fee-editor input:focus{border-color:#72c4a7;box-shadow:0 0 0 3px rgba(114,196,167,.1)}.pb-delivery-fee-editor button{height:39px;padding:0 12px;border:1px solid rgba(110,184,159,.25);border-radius:9px;background:#19362e;color:#a6e2ce;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.pb-delivery-fee-editor button:disabled{opacity:.58;cursor:wait}
      .pb-order-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.pb-order-actions button,.pb-customer-actions button{flex:1 1 105px;border:1px solid rgba(255,255,255,.08);background:#15110e;color:#ddd4ca;border-radius:10px;padding:9px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.pb-order-actions .primary{border-color:rgba(216,169,88,.25);background:linear-gradient(135deg,#e2b55e,#b67c2d);color:#171009}
      .pb-status-select{width:100%;margin-top:7px;border:1px solid rgba(255,255,255,.08);background:#0e0b09;color:inherit;border-radius:9px;padding:8px;font:inherit;font-size:13px}
      .pb-customer-id{font:900 14px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e2b55e;direction:ltr;text-align:left}.pb-customer-name{font-weight:900;color:#ece7e1;margin-top:4px}.pb-customer-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}.pb-customer-stat{padding:8px;border-radius:10px;background:rgba(255,255,255,.025);text-align:center}.pb-customer-stat span{display:block;color:#827b73;font-size:8px}.pb-customer-stat b{display:block;margin-top:3px;font-size:11px;color:#d9d1c7}.pb-customer-actions{display:flex;gap:6px;margin-top:9px}
      .pb-empty{padding:30px 14px;text-align:center;color:#8b847c;border:1px dashed rgba(255,255,255,.08);border-radius:14px}
      .pb-nav-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#e2b55e;color:#24170a;font-size:8px;font-weight:900;margin-inline-start:4px}
      @media(max-width:650px){.pb-ops-kpis{grid-template-columns:1fr 1fr}.pb-ops-kpi:last-child{grid-column:1/-1}.pb-order-head,.pb-customer-head{gap:6px}.pb-customer-stats{grid-template-columns:1fr 1fr 1fr}}
      body.admin-global-light .pb-order-card,body.admin-global-light .pb-customer-card{background:#fffaf4;border-color:rgba(86,57,19,.13);color:#33291f}body.admin-global-light .pb-ops-toolbar input,body.admin-global-light .pb-status-select{background:#fff;color:#33291f;border-color:rgba(86,57,19,.14)}body.admin-global-light .pb-status-filter-bar button{background:#fffaf2;color:#79664e;border-color:rgba(141,100,37,.18)}body.admin-global-light .pb-status-filter-bar button.active{background:linear-gradient(135deg,#e3b85f,#bd8330);color:#181008;border-color:#c28b38}body.admin-global-light .pb-order-actions button,body.admin-global-light .pb-customer-actions button{background:#fff7ec;color:#44372a;border-color:rgba(86,57,19,.13)}body.admin-global-light .pb-delivery-fee-editor{background:#f2fbf7;border-color:#cee7de}body.admin-global-light .pb-delivery-fee-editor label span{color:#55736a}body.admin-global-light .pb-delivery-fee-editor input{background:#fff;color:#263c35;-webkit-text-fill-color:#263c35;border-color:#c8dfd7}body.admin-global-light .pb-delivery-fee-editor button{background:#dff3ec;color:#235f50;border-color:#b9dacf}
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
        <div class="view-title-row"><div><h2>الطلبات</h2><div class="view-subtitle">الطلبات الجديدة، التجهيز وطباعة فواتير الليزر</div></div></div>
        <div class="pb-ops-kpis">
          <div class="pb-ops-kpi"><span>طلبات جديدة</span><b id="pbOrdersNewCount">0</b></div>
          <div class="pb-ops-kpi"><span>طلبات اليوم</span><b id="pbOrdersTodayCount">0</b></div>
          <div class="pb-ops-kpi"><span>إجمالي اليوم</span><b id="pbOrdersTodayTotal">0 د.ع</b></div>
        </div>
        <div class="pb-ops-toolbar">
          <input id="pbOrderSearch" type="search" placeholder="رقم الطلب، اسم أو هاتف...">
          <button id="pbRefreshOrders" type="button">↻ تحديث</button>
        </div>
        <div id="pbOrderStatusBar" class="pb-status-filter-bar" role="toolbar" aria-label="تصفية الطلبات حسب الحالة">
          ${Object.entries(STATUS).map(([key, value]) => `<button type="button" data-order-filter="${key}" class="${key === orderFilter ? 'active' : ''}" aria-pressed="${key === orderFilter}">${value[1]} ${value[0]}</button>`).join('')}
          <button type="button" data-order-filter="all" class="${orderFilter === 'all' ? 'active' : ''}" aria-pressed="${orderFilter === 'all'}">كل الحالات</button>
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
    document.getElementById('pbOrderStatusBar')?.addEventListener('click', event => {
      const button = event.target.closest?.('[data-order-filter]');
      if (!button) return;
      orderFilter = button.dataset.orderFilter || 'new';
      customerFilterPhone = '';
      syncOrderFilterBar();
      renderOrders();
    });
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

  function syncOrderFilterBar() {
    document.querySelectorAll('[data-order-filter]').forEach(button => {
      const active = button.dataset.orderFilter === orderFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
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
      .select('id,order_number,customer_id,customer_name,customer_phone,order_type,address,location_url,notes,status,subtotal,delivery_fee,total,created_at,updated_at,order_items(id,product_id,option_id,product_name,option_name,selected_color,quantity,unit_price,line_total)')
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
      const emptyText = customerFilterPhone
        ? 'لا توجد طلبات لهذا الزبون.'
        : orderFilter === 'new' && !needle ? 'لا توجد طلبات جديدة.' : 'لا توجد طلبات مطابقة.';
      list.innerHTML = `<div class="pb-empty">${emptyText}</div>`;
      return;
    }

    list.innerHTML = filtered.map(order => {
      const items = orderItemsWithColors(order);
      const notes = cleanOrderNotes(order.notes);
      const fee = Number(order.delivery_fee || 0);
      const status = STATUS[order.status] || [order.status || '—', '•'];
      return `<article class="pb-order-card" data-order-id="${esc(order.id)}">
        <div class="pb-order-head">
          <div><div class="pb-order-number">${esc(order.order_number)}</div><div class="pb-order-date">${esc(when(order.created_at))}</div></div>
          <span class="pb-order-status">${status[1]} ${esc(status[0])}</span>
        </div>
        <div class="pb-order-customer">${esc(order.customer_name)} — <a href="tel:${esc(order.customer_phone)}">${esc(order.customer_phone)}</a></div>
        ${order.address ? `<div class="pb-order-address">📍 ${esc(order.address)}</div>` : ''}
        <div class="pb-order-items">${items.map(item => { const option = itemOptionText(item); return `<div class="pb-order-item"><span><strong>${Number(item.quantity || 0)}× ${esc(item.product_name)}</strong>${option ? `<small>${esc(option)}</small>` : ''}</span><b>${money(item.line_total)}</b></div>`; }).join('')}${fee > 0 ? `<div class="pb-order-item pb-delivery-line"><span><strong>1× أجور التوصيل</strong></span><b>${money(fee)}</b></div>` : ''}</div>
        ${notes ? `<div class="pb-order-notes">📝 ${esc(notes)}</div>` : ''}
        ${order.order_type === 'delivery' ? `<div class="pb-delivery-fee-editor"><label><span>أجور التوصيل — تنضاف للفاتورة والمجموع</span><input type="text" inputmode="numeric" data-pb-numeric data-delivery-fee-input="${esc(order.id)}" value="${esc(englishDigits(fee))}" aria-label="أجور التوصيل"></label><button type="button" data-save-delivery-fee="${esc(order.id)}">حفظ الأجور</button></div>` : ''}
        <div class="pb-order-total"><span>المجموع الكلي</span><b>${money(order.total)}</b></div>
        <select class="pb-status-select" data-order-status="${esc(order.id)}">${Object.entries(STATUS).map(([key, value]) => `<option value="${key}" ${key === order.status ? 'selected' : ''}>${value[0]}</option>`).join('')}</select>
        <div class="pb-order-actions">
          <button class="primary" type="button" data-print-order="${esc(order.id)}">🖨 PDF / طباعة ليزر واضحة</button>
          ${order.location_url ? `<button type="button" data-open-location="${esc(order.id)}">📍 الموقع</button>` : ''}
          <button type="button" data-customer-orders="${esc(order.customer_phone)}">👤 سجل الزبون</button>
        </div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-order-status]').forEach(select => select.addEventListener('change', () => void updateStatus(select.dataset.orderStatus, select.value)));
    list.querySelectorAll('[data-save-delivery-fee]').forEach(button => button.addEventListener('click', () => {
      const input = list.querySelector(`[data-delivery-fee-input="${CSS.escape(button.dataset.saveDeliveryFee || '')}"]`);
      void updateDeliveryFee(button.dataset.saveDeliveryFee, input?.value || '', button);
    }));
    list.querySelectorAll('[data-delivery-fee-input]').forEach(input => input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      list.querySelector(`[data-save-delivery-fee="${CSS.escape(input.dataset.deliveryFeeInput || '')}"]`)?.click();
    }));
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
      syncOrderFilterBar();
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

  async function updateDeliveryFee(orderId, rawValue, button) {
    const fee = parseFee(rawValue);
    if (fee === null) {
      alert('أدخل أجور توصيل صحيحة بين 0 و 10,000,000 د.ع. تقدر تستخدم الأرقام العربية أو الإنجليزية.');
      return;
    }
    const order = orders.find(row => String(row.id) === String(orderId));
    const client = sb();
    if (!order || !client) return;

    const total = Number(order.subtotal || 0) + fee;
    const oldText = button?.textContent || 'حفظ الأجور';
    if (button) {
      button.disabled = true;
      button.textContent = 'جاري الحفظ...';
    }

    const result = await client
      .from('orders')
      .update({ delivery_fee: fee, total, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('delivery_fee,total,updated_at')
      .single();

    if (result.error) {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
      alert('فشل حفظ أجور التوصيل: ' + (result.error.message || result.error));
      return;
    }

    order.delivery_fee = Number(result.data?.delivery_fee ?? fee);
    order.total = Number(result.data?.total ?? total);
    order.updated_at = result.data?.updated_at || order.updated_at;
    updateOrderKPIs();
    if (button) button.textContent = '✓ تم الحفظ';
    setTimeout(() => renderOrders(), 850);
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
    const items = orderItemsWithColors(order);
    const notes = cleanOrderNotes(order.notes);
    const fee = Number(order.delivery_fee || 0);
    const invoiceEsc = value => esc(englishDigits(value));
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      alert('اسمح بالنوافذ المنبثقة حتى تفتح معاينة الطباعة.');
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(order.order_number)} — Pasha Baby</title><style>
      @page{size:auto;margin:8mm}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;min-width:0;background:#fff;color:#000;font-family:"Segoe UI Variable Text","Segoe UI",Tahoma,Arial,sans-serif;font-size:14pt;font-weight:800;line-height:1.5;font-variant-numeric:tabular-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{padding:10mm 8mm 28mm}
      .label{width:100%;max-width:190mm;margin:0 auto;background:#fff;color:#000}
      .brand{display:flex;align-items:center;justify-content:center;gap:4mm;border-top:1.5pt solid #000;border-bottom:1.5pt solid #000;padding:3.5mm 0;margin-bottom:4mm;text-align:right;break-inside:avoid}.print-logo-mark{width:16mm;height:16mm;flex:0 0 16mm;border:2pt solid #000;border-radius:50%;display:grid;place-items:center;font:900 15pt/1 Arial Black,Arial,sans-serif;letter-spacing:.4pt}.brand-copy h1{margin:0;color:#000;font:900 24pt/1 Arial Black,Arial,sans-serif;letter-spacing:1pt}.brand-ar{margin-top:1.2mm;font-size:13pt;font-weight:900;letter-spacing:0}
      .orderline{display:flex;justify-content:space-between;align-items:center;gap:5mm;margin-bottom:3mm;border-bottom:1.5pt solid #000;padding-bottom:2.5mm;break-inside:avoid}.orderline strong{font:900 16pt/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;direction:ltr;text-align:left}.orderline span{font-size:13pt;font-weight:900}
      .customer{border:2pt solid #000;border-radius:2mm;padding:3mm;margin-bottom:3.5mm;font-size:14pt;font-weight:800;line-height:1.55;break-inside:avoid}.customer b{font-size:16pt;font-weight:900}.phone{direction:ltr;display:inline-block;font-weight:900}.address{margin-top:1.5mm;font-weight:900}
      .items{border-top:2pt solid #000;border-bottom:2pt solid #000}.item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6mm;align-items:start;padding:2.8mm 1mm;border-bottom:2pt solid #000;font-size:14pt;font-weight:800;line-height:1.5;break-inside:avoid}.item:last-child{border-bottom:0}.item b{font-weight:900}.item strong{white-space:nowrap;font-weight:900;direction:ltr;text-align:left}.option{margin-top:1mm;font-size:12.5pt;color:#000;font-weight:900}.delivery-item,.delivery-item .option{color:#000}
      .notes{margin-top:3.5mm;padding:3mm;border:1.5pt solid #000;border-radius:1.5mm;font-size:13pt;font-weight:800;line-height:1.5;break-inside:avoid}.totals{margin-top:4mm;border:2pt solid #000;border-radius:1.8mm;padding:3mm;display:grid;gap:1.5mm;break-inside:avoid}.row{display:flex;justify-content:space-between;gap:5mm;font-size:14pt;font-weight:900}.row b{white-space:nowrap;direction:ltr}.row.grand{font-size:20pt;font-weight:900;border-top:2pt solid #000;padding-top:2.2mm}.footer{text-align:center;margin-top:3mm;font-size:12.5pt;font-weight:900;break-inside:avoid}.screen-actions{display:flex;gap:8px;padding:12px;position:fixed;left:0;right:0;bottom:0;background:#eee;z-index:5}.screen-actions button{flex:1;padding:12px;border:0;border-radius:8px;background:#000;color:#fff;font-size:16px;font-weight:900}
      @media print{html,body{width:auto!important;min-width:0!important;background:#fff!important;color:#000!important}body{padding:0!important}.label{width:100%!important;max-width:none!important;margin:0!important;overflow:visible!important}.screen-actions{display:none!important}}
    </style></head><body><div class="label">
      <div class="brand" aria-label="Pasha Baby"><div class="print-logo-mark" aria-hidden="true">PB</div><div class="brand-copy"><h1>PASHA BABY</h1><div class="brand-ar">باشا بيبي · مستلزمات الأطفال</div></div></div>
      <div class="orderline"><strong>${invoiceEsc(order.order_number)}</strong><span>${invoiceEsc(when(order.created_at))}</span></div>
      <div class="customer"><b>${invoiceEsc(order.customer_name)}</b><br><span class="phone">${invoiceEsc(order.customer_phone)}</span> · ${order.order_type === 'delivery' ? 'توصيل' : 'استلام'}${order.address ? `<div class="address">${invoiceEsc(order.address)}</div>` : ''}</div>
      <div class="items">${items.map(item => { const option = itemOptionText(item); return `<div class="item"><span><b>${Number(item.quantity || 0)}× ${invoiceEsc(item.product_name)}</b>${option ? `<div class="option">${invoiceEsc(option)}</div>` : ''}</span><strong>${money(item.line_total)}</strong></div>`; }).join('')}${fee > 0 ? `<div class="item delivery-item"><span><b>1× أجور التوصيل</b><div class="option">خدمة التوصيل</div></span><strong>${money(fee)}</strong></div>` : ''}</div>
      ${notes ? `<div class="notes"><b>ملاحظة:</b> ${invoiceEsc(notes)}</div>` : ''}
      <div class="totals">${fee > 0 ? `<div class="row"><span>مجموع الأصناف</span><b>${money(order.subtotal)}</b></div>` : ''}<div class="row grand"><span>المجموع الكلي</span><b>${money(order.total)}</b></div></div>
      <div class="footer">شكراً لاختياركم PASHA BABY</div>
    </div><div class="screen-actions"><button onclick="window.print()">طباعة بالحجم الكامل / حفظ PDF</button></div></body></html>`);
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
