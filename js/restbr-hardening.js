// RESTBR / Pasha Baby runtime hardening.
// Loaded by runtime-config.js on both the storefront and admin dashboard.
(() => {
  if (window.__RESTBR_HARDENING_V1__) return;
  window.__RESTBR_HARDENING_V1__ = true;

  const OFFLINE_CACHE_KEY = 'RESTBR_MENU_OFFLINE_CACHE_V1';
  const OFFLINE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  window.RESTBR_OFFLINE_CACHE_MAX_AGE_MS = OFFLINE_CACHE_MAX_AGE_MS;

  // Do not let an old offline snapshot silently become the source of prices.
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const savedAt = Number(parsed?.saved_at || 0);
      const age = Date.now() - savedAt;
      if (!savedAt || age < -5 * 60 * 1000 || age > OFFLINE_CACHE_MAX_AGE_MS) {
        localStorage.removeItem(OFFLINE_CACHE_KEY);
      }
    }
  } catch (_) {
    try { localStorage.removeItem(OFFLINE_CACHE_KEY); } catch (_) {}
  }

  const isAdminPath = /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);
  if (!isAdminPath) return;

  let authorized = false;
  let verifying = false;
  let authListenerInstalled = false;
  let excelPatchInstalled = false;
  let bodyObserver = null;

  const client = () => {
    try {
      return typeof supabaseClient !== 'undefined' ? supabaseClient : null;
    } catch (_) {
      return null;
    }
  };

  const loginMessage = message => {
    const el = document.getElementById('adminLoginMsg');
    if (!el || !message) return;
    el.textContent = message;
    el.style.color = '#fecaca';
  };

  const enforceAdminLock = () => {
    if (!document.body || authorized) return;
    if (!document.body.classList.contains('auth-locked')) {
      document.body.classList.add('auth-locked');
    }
  };

  const watchAdminLock = () => {
    if (!document.body || bodyObserver) return;
    enforceAdminLock();
    bodyObserver = new MutationObserver(enforceAdminLock);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  };

  async function verifyAdminAuthorization() {
    if (verifying) return;
    const sb = client();
    if (!sb || !document.body) return;

    verifying = true;
    try {
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData?.session || null;
      if (!session) {
        authorized = false;
        window.RESTBR_ADMIN_AUTHORIZED = false;
        enforceAdminLock();
        return;
      }

      const { data, error } = await sb.rpc('can_access_admin');
      if (error) throw error;

      if (data !== true) {
        authorized = false;
        window.RESTBR_ADMIN_AUTHORIZED = false;
        enforceAdminLock();
        loginMessage('هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.');
        try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}
        return;
      }

      authorized = true;
      window.RESTBR_ADMIN_AUTHORIZED = true;
      document.body.classList.remove('auth-locked');
    } catch (error) {
      authorized = false;
      window.RESTBR_ADMIN_AUTHORIZED = false;
      enforceAdminLock();
      console.error('ADMIN AUTHORIZATION CHECK ERROR:', error);
      loginMessage('تعذر التحقق من صلاحية حساب الإدارة. حاول مرة ثانية.');
    } finally {
      verifying = false;
    }
  }

  const installAuthListener = () => {
    const sb = client();
    if (!sb || authListenerInstalled) return false;
    authListenerInstalled = true;
    sb.auth.onAuthStateChange(() => {
      authorized = false;
      window.RESTBR_ADMIN_AUTHORIZED = false;
      enforceAdminLock();
      setTimeout(verifyAdminAuthorization, 0);
    });
    return true;
  };

  // Excel imports used to update categories/products/options using separate
  // requests. Stage all patches and send them through one transactional RPC.
  const installTransactionalExcelPatch = () => {
    if (excelPatchInstalled) return true;

    let cleanPatch;
    let existingUpdater;
    try {
      if (typeof cleanExcelPatch !== 'function' || typeof updateRowsFromExcel !== 'function') {
        return false;
      }
      cleanPatch = cleanExcelPatch;
      existingUpdater = updateRowsFromExcel;
    } catch (_) {
      return false;
    }

    let stage = null;

    const buildPatches = (rows, currentRows, allowed, types = {}) => {
      const existing = new Set((currentRows || []).map(row => String(row.id)));
      const patches = [];

      (rows || []).forEach(row => {
        const id = String(row?.id || '').trim();
        if (!id || !existing.has(id)) return;

        const patch = cleanPatch(row, allowed, types);
        delete patch.id;
        if (!Object.keys(patch).length) return;
        patches.push({ id, patch });
      });

      return patches;
    };

    const transactionalUpdater = async (table, rows, currentRows, allowed, types = {}) => {
      const patches = buildPatches(rows, currentRows, allowed, types);

      if (table === 'categories') {
        stage = { categories: patches, products: [], options: [] };
        return patches.length;
      }

      if (!stage) {
        // Defensive fallback if another feature ever calls this helper out of order.
        return existingUpdater(table, rows, currentRows, allowed, types);
      }

      if (table === 'products') {
        stage.products = patches;
        return patches.length;
      }

      if (table !== 'product_options') {
        return existingUpdater(table, rows, currentRows, allowed, types);
      }

      stage.options = patches;
      const pending = stage;
      stage = null;

      const sb = client();
      if (!sb) throw new Error('Supabase client is not available');

      const { data, error } = await sb.rpc('apply_menu_excel_updates', {
        p_categories: pending.categories,
        p_products: pending.products,
        p_options: pending.options
      });

      if (error) throw error;
      return Number(data?.options_updated ?? pending.options.length);
    };

    transactionalUpdater.__restbrTransactional = true;
    try {
      updateRowsFromExcel = transactionalUpdater;
      excelPatchInstalled = true;
      window.RESTBR_EXCEL_TRANSACTIONAL_IMPORT = true;
      return true;
    } catch (error) {
      console.warn('Could not install transactional Excel patch:', error);
      return false;
    }
  };

  const boot = () => {
    watchAdminLock();
    const authReady = installAuthListener();
    const excelReady = installTransactionalExcelPatch();
    if (authReady) verifyAdminAuthorization();
    return authReady && excelReady;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // admin.html defines some helpers later in the document. Keep retrying briefly
  // so the hardening layer installs regardless of script ordering.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const done = boot();
    if (done || attempts >= 80) clearInterval(timer);
  }, 125);

  window.addEventListener('pageshow', () => {
    authorized = false;
    enforceAdminLock();
    verifyAdminAuthorization();
  }, { passive: true });
})();
