(() => {
  if (window.__PASHA_INVOICE_PDF_DIRECT_PRINT_V10__) return;
  window.__PASHA_INVOICE_PDF_DIRECT_PRINT_V10__ = true;

  const FRAME_ID = 'pbInvoicePdfPrintFrameV10';
  const READY_ROOT_ID = 'pbInvoicePrintReady';
  const nativeCreateObjectURL = URL.createObjectURL.bind(URL);

  let latestPdfUrl = '';
  let frameReady = false;
  let fallbackReadyTimer = 0;
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

  function removeFrame() {
    if (fallbackReadyTimer) {
      clearTimeout(fallbackReadyTimer);
      fallbackReadyTimer = 0;
    }
    document.getElementById(FRAME_ID)?.remove();
    frameReady = false;
  }

  function syncPrintButton() {
    const button = currentButton();
    if (!button) return;
    const image = currentPreviewImage();
    const imageReady = Boolean(image?.complete && image?.naturalWidth > 0);
    const ready = Boolean(latestPdfUrl && frameReady && imageReady);

    if (ready) {
      if (button.disabled) button.disabled = false;
      if (button.textContent !== '🖨 طباعة PDF') button.textContent = '🖨 طباعة PDF';
    } else {
      if (!button.disabled) button.disabled = true;
      if (button.textContent !== '⏳ تجهيز طباعة PDF…') button.textContent = '⏳ تجهيز طباعة PDF…';
    }
  }

  function watchReadyButton() {
    const button = currentButton();
    const image = currentPreviewImage();
    if (!button) return;

    buttonObserver?.disconnect();
    buttonObserver = new MutationObserver(() => syncPrintButton());
    buttonObserver.observe(button, { attributes: true, attributeFilter: ['disabled'] });

    image?.addEventListener('load', syncPrintButton, { once: true });
    image?.addEventListener('error', syncPrintButton, { once: true });
    syncPrintButton();
  }

  function preloadPdf(url) {
    if (!url || !document.body) return;
    latestPdfUrl = url;
    removeFrame();

    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.title = 'Pasha Baby invoice PDF print bridge';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = [
      'position:fixed',
      'left:-10000px',
      'top:0',
      'width:8px',
      'height:8px',
      'opacity:0.001',
      'pointer-events:none',
      'border:0',
      'z-index:-1'
    ].join(';');

    frame.addEventListener('load', () => {
      frameReady = true;
      if (fallbackReadyTimer) {
        clearTimeout(fallbackReadyTimer);
        fallbackReadyTimer = 0;
      }
      syncPrintButton();
    }, { once: true });

    frame.src = url;
    document.body.appendChild(frame);

    // Some iOS Safari PDF viewers do not emit a normal iframe load event even
    // though the embedded PDF window is already ready. Keep a short safety
    // timer so the user is not left with a permanently disabled print button.
    fallbackReadyTimer = window.setTimeout(() => {
      frameReady = Boolean(frame.isConnected && frame.contentWindow);
      fallbackReadyTimer = 0;
      syncPrintButton();
    }, 1200);
  }

  // V9 already creates the exact final PDF Blob. Capture only that Blob URL and
  // leave every other object URL untouched. The original function is always used.
  URL.createObjectURL = function pashaCreateObjectURLV10(value) {
    const url = nativeCreateObjectURL(value);
    if (isPdfBlob(value)) preloadPdf(url);
    return url;
  };

  function fallbackToPdf() {
    if (!latestPdfUrl) return;
    window.location.assign(latestPdfUrl);
  }

  function printPreparedPdf(event) {
    const button = event.target?.closest?.('[data-pb-print-now]');
    if (!button) return;

    // Stop V9's old window.print() target handler. That old path prints the
    // dashboard HTML on iPhone, which is exactly the regression this bridge fixes.
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    const frame = document.getElementById(FRAME_ID);
    if (!latestPdfUrl || !frameReady || !frame?.contentWindow) {
      fallbackToPdf();
      return;
    }

    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (error) {
      console.warn('Direct PDF print bridge failed; opening the proven PDF instead.', error);
      fallbackToPdf();
    }
  }

  document.addEventListener('click', printPreparedPdf, true);

  const rootObserver = new MutationObserver(() => {
    if (currentRoot()) {
      watchReadyButton();
    } else {
      buttonObserver?.disconnect();
      buttonObserver = null;
      removeFrame();
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

  window.PashaInvoicePdfDirectPrintV10 = Object.freeze({
    version: '10.0',
    sync: syncPrintButton,
    openPdf: fallbackToPdf
  });
})();
