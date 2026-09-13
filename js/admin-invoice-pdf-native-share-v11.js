(() => {
  if (window.__PASHA_INVOICE_PDF_NATIVE_SHARE_V11__) return;
  window.__PASHA_INVOICE_PDF_NATIVE_SHARE_V11__ = true;

  const READY_ROOT_ID = 'pbInvoicePrintReady';
  const nativeCreateObjectURL = URL.createObjectURL.bind(URL);

  let latestPdfBlob = null;
  let latestPdfUrl = '';
  let latestPdfFile = null;
  let boundReadyRoot = null;

  const isPdfBlob = value =>
    value instanceof Blob && /^application\/pdf(?:;|$)/i.test(String(value.type || '').trim());

  function currentRoot() {
    return document.getElementById(READY_ROOT_ID);
  }

  function currentButton(root = currentRoot()) {
    return root?.querySelector?.('[data-pb-print-now]') || null;
  }

  function currentPreviewImage(root = currentRoot()) {
    return root?.querySelector?.('[data-pb-print-image]') || null;
  }

  function pdfFile() {
    if (!latestPdfBlob) return null;
    if (latestPdfFile) return latestPdfFile;
    try {
      latestPdfFile = new File(
        [latestPdfBlob],
        `Pasha-Baby-Invoice-${Date.now()}.pdf`,
        { type: 'application/pdf', lastModified: Date.now() }
      );
    } catch (_) {
      latestPdfFile = null;
    }
    return latestPdfFile;
  }

  function canNativeSharePdf() {
    const file = pdfFile();
    if (!file || typeof navigator.share !== 'function') return false;
    if (typeof navigator.canShare !== 'function') return true;
    try { return navigator.canShare({ files: [file] }); } catch (_) { return false; }
  }

  function syncPrintButton(root = currentRoot()) {
    const button = currentButton(root);
    if (!button) return;
    const image = currentPreviewImage(root);
    const imageReady = Boolean(image?.complete && image?.naturalWidth > 0);
    const ready = Boolean(latestPdfBlob && latestPdfUrl && imageReady);

    if (button.disabled !== !ready) button.disabled = !ready;
    const label = !ready
      ? '⏳ تجهيز طباعة PDF…'
      : canNativeSharePdf()
        ? '🖨 طباعة PDF'
        : '📄 فتح PDF للطباعة';
    if (button.textContent !== label) button.textContent = label;
  }

  function bindReadyRoot(root) {
    if (!root || root === boundReadyRoot) return;
    boundReadyRoot = root;

    const image = currentPreviewImage(root);
    image?.addEventListener('load', () => syncPrintButton(root), { once: true });
    image?.addEventListener('error', () => syncPrintButton(root), { once: true });
    syncPrintButton(root);
  }

  // Capture the exact final PDF Blob produced by the proven V8/V9 renderer.
  URL.createObjectURL = function pashaCreateObjectURLV11(value) {
    const url = nativeCreateObjectURL(value);
    if (isPdfBlob(value)) {
      latestPdfBlob = value;
      latestPdfUrl = url;
      latestPdfFile = null;
      queueMicrotask(() => syncPrintButton());
    }
    return url;
  };

  function openPdfFallback() {
    if (latestPdfUrl) window.location.assign(latestPdfUrl);
  }

  async function sharePdfForPrint() {
    const file = pdfFile();
    if (!file || typeof navigator.share !== 'function') {
      openPdfFallback();
      return;
    }

    try {
      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
        openPdfFallback();
        return;
      }

      await navigator.share({
        files: [file],
        title: 'Pasha Baby Invoice'
      });
    } catch (error) {
      if (String(error?.name || '') === 'AbortError') return;
      console.warn('Native PDF share failed; opening the proven PDF instead.', error);
      openPdfFallback();
    }
  }

  function handlePrintTap(event) {
    const button = event.target?.closest?.('[data-pb-print-now]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!latestPdfBlob || !latestPdfUrl) {
      openPdfFallback();
      return;
    }

    if (canNativeSharePdf()) void sharePdfForPrint();
    else openPdfFallback();
  }

  document.addEventListener('click', handlePrintTap, true);

  // Watch only for the print-ready root appearing/disappearing. Do not observe
  // the print button's disabled attribute: mutating that attribute from inside
  // its own MutationObserver can starve Safari's microtask queue and freeze the
  // transition on "invoice ready".
  const rootObserver = new MutationObserver(() => {
    const root = currentRoot();
    if (root) {
      bindReadyRoot(root);
      return;
    }

    if (boundReadyRoot) {
      boundReadyRoot = null;
      latestPdfBlob = null;
      latestPdfFile = null;
      latestPdfUrl = '';
    }
  });

  const start = () => {
    rootObserver.observe(document.body, { childList: true, subtree: true });
    const root = currentRoot();
    if (root) bindReadyRoot(root);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PashaInvoicePdfNativeShareV11 = Object.freeze({
    version: '11.1',
    sync: syncPrintButton,
    openPdf: openPdfFallback
  });
})();
