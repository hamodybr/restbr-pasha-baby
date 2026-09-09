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
  let readySignature = '';

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

  function catalogMayBeTruncated() {
    return [adminCategories, adminProducts, adminOptions]
      .some(rows => Array.isArray(rows) && rows.length >= PAGE_SIZE);
  }

  function publishReady() {
    const counts = {
      categories: Array.isArray(adminCategories) ? adminCategories.length : 0,
      products: Array.isArray(adminProducts) ? adminProducts.length : 0,
      options: Array.isArray(adminOptions) ? adminOptions.length : 0
    };
    const signature = `${counts.categories}:${counts.products}:${counts.options}`;

    window.RESTBR_ADMIN_CATALOG_COUNTS = counts;
    window.RESTBR_ADMIN_LARGE_CATALOG_READY = true;

    if (readySignature !== signature) {
      readySignature = signature;
      window.dispatchEvent(new CustomEvent('restbr:admin-catalog-ready', {
        detail: counts
      }));
    }

    return counts;
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
      const counts = publishReady();

      console.log('✓ Pasha admin full catalog hydrated', counts);
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

  async function ensureCompleteCatalog() {
    // Supabase's normal Data API page is capped at PAGE_SIZE. For the common
    // case (<1000 rows per table), the base dashboard request is already the
    // complete catalog, so a second three-table download only wastes time.
    if (!catalogMayBeTruncated()) {
      publishReady();
      return true;
    }
    return hydrateFullCatalog();
  }

  function wrapDashboardLoader() {
    if (wrapped || typeof loadAdminDashboard !== 'function') return false;
    wrapped = true;
    baseLoader = loadAdminDashboard;

    loadAdminDashboard = async function (...args) {
      const result = await baseLoader.apply(this, args);
      await ensureCompleteCatalog();
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
        void ensureCompleteCatalog();
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
        void ensureCompleteCatalog();
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
