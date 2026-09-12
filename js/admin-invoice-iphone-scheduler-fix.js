(() => {
  if (window.__PASHA_INVOICE_IPHONE_SCHEDULER_FIX_V1__) return;
  window.__PASHA_INVOICE_IPHONE_SCHEDULER_FIX_V1__ = true;

  function install() {
    const api = window.PashaInvoicePdf;
    if (!api || typeof api.create !== 'function') return false;
    if (api.__iphoneSchedulerFixed) return true;

    const originalCreate = api.create.bind(api);

    api.create = async function createInvoiceWithoutBackgroundRafStall(options) {
      const nativeRaf = window.requestAnimationFrame;
      const nativeCancelRaf = window.cancelAnimationFrame;
      let nextId = 1;
      const cancelled = new Set();

      // The invoice preview is a separate Safari window. When it has focus,
      // iOS can suspend requestAnimationFrame in the admin/opener window.
      // The native-canvas renderer only used two RAFs as a layout pause after
      // FontFace loading, so a microtask checkpoint is sufficient and does not
      // depend on the opener being foreground-visible.
      const microtaskRaf = callback => {
        const id = nextId++;
        queueMicrotask(() => {
          if (!cancelled.has(id)) callback(performance.now());
          cancelled.delete(id);
        });
        return id;
      };

      const microtaskCancel = id => cancelled.add(id);

      try {
        window.requestAnimationFrame = microtaskRaf;
        window.cancelAnimationFrame = microtaskCancel;
        return await originalCreate(options);
      } finally {
        window.requestAnimationFrame = nativeRaf;
        window.cancelAnimationFrame = nativeCancelRaf;
      }
    };

    api.__iphoneSchedulerFixed = true;
    api.schedulerMode = 'microtask-when-generating-pdf';
    return true;
  }

  if (install()) return;

  const rendererScript = document.getElementById('pashaInvoicePdfScript');
  rendererScript?.addEventListener('load', install, { once: true });
  queueMicrotask(install);
})();
