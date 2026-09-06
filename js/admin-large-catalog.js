(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_LARGE_CATALOG_V1__) return;
  window.__PASHA_ADMIN_LARGE_CATALOG_V1__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  let inFlight = null;
  let baseLoader = null;
  let wrapped = false;
  let firstHydrationScheduled = false;

  async function fetchAll(table, { order = null, ascending = true } = {}) {
    const rows = [];
    let from = 0;

    while (true) {
      let query = supabaseClient
        .from(table)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (order) query = query.order(order, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from >= MAX_ROWS) throw new Error(`${table} exceeded ${MAX_ROWS} row safety limit`);
    }

    return rows;
  }

  function rerenderAdminCatalog() {
    document.getElementById('categoryCount')?.replaceChildren(String(adminCategories.length));
    document.getElementById('productCount')?.replaceChildren(String(adminProducts.length));
    document.getElementById('optionCount')?.replaceChildren(String(adminOptions.length));

    if (typeof renderAdminCategories === 'function') renderAdminCategories();
    if (typeof renderAdminProducts === 'function') renderAdminProducts();
    if (typeof renderBackupCategoryOptions === 'function') renderBackupCategoryOptions();
    if (typeof renderCategorySortList === 'function') renderCategorySortList();
    if (typeof renderProductSortCategoryOptions === 'function') renderProductSortCategoryOptions();
    if (typeof renderBulkPriceCategoryOptions === 'function') renderBulkPriceCategoryOptions();

    const statusText = document.getElementById('connectionText');
    if (statusText && !/\d[\d,]*\s+صنف/.test(statusText.textContent || '')) {
      statusText.textContent = `${statusText.textContent || 'متصل بقاعدة البيانات'} • ${adminProducts.length.toLocaleString('en-US')} صنف`;
    }
  }

  async function hydrateFullCatalog() {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return false;

      const [categories, products, options] = await Promise.all([
        fetchAll('categories', { order: 'sort_order', ascending: true }),
        fetchAll('products', { order: 'sort_order', ascending: true }),
        fetchAll('product_options', { order: 'sort_order', ascending: true })
      ]);

      adminCategories = categories;
      adminProducts = products;
      adminOptions = options;

      rerenderAdminCatalog();

      window.RESTBR_ADMIN_CATALOG_COUNTS = {
        categories: categories.length,
        products: products.length,
        options: options.length
      };
      window.RESTBR_ADMIN_LARGE_CATALOG_READY = true;
      window.dispatchEvent(new CustomEvent('restbr:admin-catalog-ready', {
        detail: window.RESTBR_ADMIN_CATALOG_COUNTS
      }));

      console.log('✓ Pasha admin full catalog hydrated', window.RESTBR_ADMIN_CATALOG_COUNTS);
      return true;
    })().catch(error => {
      console.error('PASHA ADMIN LARGE CATALOG ERROR:', error);
      const statusText = document.getElementById('connectionText');
      if (statusText) statusText.textContent = `تعذر تحميل كامل الأصناف: ${error?.message || error}`;
      return false;
    }).finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  function wrapDashboardLoader() {
    if (wrapped || typeof loadAdminDashboard !== 'function') return false;
    wrapped = true;
    baseLoader = loadAdminDashboard;

    loadAdminDashboard = async function (...args) {
      const result = await baseLoader.apply(this, args);
      await hydrateFullCatalog();
      return result;
    };

    return true;
  }

  function scheduleFirstHydration() {
    if (firstHydrationScheduled) return;
    firstHydrationScheduled = true;

    const tryHydrate = () => {
      const unlocked = document.body && !document.body.classList.contains('auth-locked');
      const connected = document.getElementById('connectionStatus')?.classList.contains('success');

      if (unlocked && connected) {
        void hydrateFullCatalog();
        return true;
      }
      return false;
    };

    if (tryHydrate()) return;

    const observer = new MutationObserver(() => {
      if (!tryHydrate()) return;
      observer.disconnect();
    });

    const target = document.getElementById('connectionStatus') || document.body;
    observer.observe(target, { attributes: true, attributeFilter: ['class'] });

    setTimeout(() => {
      observer.disconnect();
      if (document.body && !document.body.classList.contains('auth-locked')) {
        void hydrateFullCatalog();
      }
    }, 5000);
  }

  function start() {
    wrapDashboardLoader();
    scheduleFirstHydration();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
