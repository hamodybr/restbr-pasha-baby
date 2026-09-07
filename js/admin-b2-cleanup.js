(() => {
  if (window.__PASHA_B2_CLEANUP_V1__) return;
  window.__PASHA_B2_CLEANUP_V1__ = true;

  const CLEANUP_FUNCTION = 'b2-cleanup';
  const GB = 1024 * 1024 * 1024;
  let cleanupPromise = null;
  let bootCleanupDone = false;

  const $ = id => document.getElementById(id);

  function client() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function fmt(bytes) {
    const n = Math.max(0, Number(bytes || 0));
    if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${Math.round(n / 1024)} KB`;
  }

  async function detailedInvokeError(error) {
    const fallback = String(error?.message || error || 'فشل تنظيف صور التخزين.');
    try {
      const response = error?.context;
      if (response && typeof response.clone === 'function') {
        const text = await response.clone().text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const message = String(parsed?.error || parsed?.message || '').trim();
            if (message) return message;
          } catch (_) {}
        }
      }
    } catch (_) {}
    return fallback;
  }

  async function invokeCleanup() {
    const sb = client();
    if (!sb?.functions?.invoke) throw new Error('خدمة تنظيف الصور غير جاهزة.');

    const { data, error } = await sb.functions.invoke(CLEANUP_FUNCTION, { body: {} });
    if (error) throw new Error(await detailedInvokeError(error));
    if (data?.error) throw new Error(String(data.error));
    return data || {};
  }

  function applyUsage(data) {
    const value = $('pbB2MeterValue');
    const fill = $('pbB2MeterFill');
    const card = $('pbB2Meter');
    if (!value || !fill || !card) return;

    const current = Math.max(0, Number(data?.currentBytes || 0));
    const hard = 9 * GB;
    const percent = Math.min(100, current / hard * 100);
    fill.style.width = `${percent.toFixed(2)}%`;
    value.textContent = `${fmt(current)} / 9 GB • ${Number(data?.fileCount || 0)} صورة`;
    card.dataset.state = current >= hard ? 'blocked' : current >= 8 * GB ? 'warn' : 'ok';
  }

  async function cleanupOrphans(reason = 'manual') {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      try {
        const data = await invokeCleanup();
        applyUsage(data);
        if (Number(data?.deletedFiles || 0) > 0) {
          console.info(`B2 orphan cleanup (${reason}):`, data);
        }
        return data;
      } catch (error) {
        console.warn(`B2 orphan cleanup skipped (${reason}):`, error);
        return null;
      } finally {
        cleanupPromise = null;
      }
    })();
    return cleanupPromise;
  }

  function wrapDeleteFunction(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__pbB2CleanupWrapped) return false;

    const wrapped = async function(...args) {
      const result = await original.apply(this, args);
      // The original flow owns confirmation and DB deletion. Cleanup afterwards
      // is safe even when the user cancelled: it only removes files that no
      // longer have a matching product record.
      setTimeout(() => cleanupOrphans(`after-${name}`), 80);
      return result;
    };

    wrapped.__pbB2CleanupWrapped = true;
    wrapped.__pbB2CleanupOriginal = original;
    window[name] = wrapped;
    return true;
  }

  function patchDeletes() {
    wrapDeleteFunction('deleteAdminProduct');
    wrapDeleteFunction('deleteCategoryWithContents');
  }

  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      patchDeletes();

      const ready = !!client()?.functions?.invoke;
      if (ready && !bootCleanupDone) {
        bootCleanupDone = true;
        setTimeout(() => cleanupOrphans('admin-boot'), 500);
      }

      if (tries > 240) clearInterval(timer);
    }, 250);

    patchDeletes();
    window.addEventListener('pageshow', () => {
      setTimeout(() => cleanupOrphans('pageshow'), 500);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
