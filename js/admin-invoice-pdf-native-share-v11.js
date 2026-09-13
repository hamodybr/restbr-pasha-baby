(() => {
  if (window.__PASHA_INVOICE_PDF_NATIVE_SHARE_V11__) return;
  window.__PASHA_INVOICE_PDF_NATIVE_SHARE_V11__ = true;

  const READY_ROOT_ID = 'pbInvoicePrintReady';
  const nativeCreateObjectURL = URL.createObjectURL.bind(URL);

  let latestPdfBlob = null;
  let latestPdfUrl = '';
  let latestPdfFile = null;
  let buttonObserver = null;

  const isPdfBlob = value =>
    value instanceof Blob && /^application\/pdf(?:;|$)/i.test(String(value.type || '').trim());

  function currentRoot() {
    return document.getElementById(READY_ROOT_ID);
  }

  function currentButton() {
    return currentRoot()?.querySelector?.('[data-pb-print-now]') || null;
  }

  function currentPreviewImage() {
    return currentRoot()?.querySelector?.('[data-pb-print-image]') || null;
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

  function syncPrintButton() {
    const button = currentButton();
    if (!button) return;
    const image = currentPreviewImage();
    const imageReady = Boolean(image?.complete && image?.naturalWidth > 0);
    const ready = Boolean(latestPdfBlob && latestPdfUrl && imageReady);

    button.disabled = !ready;
    if (!ready) {
      button.textContent = '⏳ تجهيز طباعة PDF…';
      return;
    }

    button.textContent = canNativeSharePdf()
      ? '🖨 طباعة PDF'
      : '📄 فتح PDF للطباعة';
  }

  function watchReadyButton() {
    const button = currentButton();
    const image = currentPreviewImage();
    if (!button) return;

    buttonObserver?.disconnect();
    buttonObserver = new MutationObserver(syncPrintButton);
    buttonObserver.observe(button, { attributes: true, attributeFilter: ['disabled'] });
    image?.addEventListener('load', syncPrintButton, { once: true });
    image?.addEventListener('error', syncPrintButton, { once: true });
    syncPrintButton();
  }

  // Capture the exact final PDF Blob produced by the proven V8/V9 renderer.
  URL.createObjectURL = function pashaCreateObjectURLV11(value) {
    const url = nativeCreateObjectURL(value);
    if (isPdfBlob(value)) {
      latestPdfBlob = value;
      latestPdfUrl = url;
      latestPdfFile = null;
      queueMicrotask(syncPrintButton);
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

      // On iPhone/iPad this opens the native share sheet with the actual PDF
      // file. Choosing Print there prints the PDF itself, so Safari cannot add
      // webpage URL/date headers or footers.
      await navigator.share({
        files: [file],
        title: 'Pasha Baby Invoice'
      });
    } catch (error) {
      // AbortError means the user simply closed the share sheet; do not force
      // navigation in that case. Any real platform failure falls back to PDF.
      if (String(error?.name || '') === 'AbortError') return;
      console.warn('Native PDF share failed; opening the proven PDF instead.', error);
      openPdfFallback();
    }
  }

  function handlePrintTap(event) {
    const button = event.target?.closest?.('[data-pb-print-now]');
    if (!button) return;

    // Stop V9 window.print() and any older V10 HTML/iframe print bridge.
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!latestPdfBlob || !latestPdfUrl) {
      openPdfFallback();
      return;
    }

    if (canNativeSharePdf()) {
      void sharePdfForPrint();
    } else {
      openPdfFallback();
    }
  }

  document.addEventListener('click', handlePrintTap, true);

  const rootObserver = new MutationObserver(() => {
    if (currentRoot()) {
      watchReadyButton();
    } else {
      buttonObserver?.disconnect();
      buttonObserver = null;
      latestPdfBlob = null;
      latestPdfFile = null;
      latestPdfUrl = '';
    }
  });

  const start = () => {
    rootObserver.observe(document.body, { childList: true, subtree: true });
    if (currentRoot()) watchReadyButton();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.PashaInvoicePdfNativeShareV11 = Object.freeze({
    version: '11.0',
    sync: syncPrintButton,
    openPdf: openPdfFallback
  });
})();
