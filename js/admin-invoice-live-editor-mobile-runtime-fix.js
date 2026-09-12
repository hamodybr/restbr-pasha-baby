(() => {
  if (window.__PASHA_INVOICE_LIVE_EDITOR_MOBILE_RUNTIME_FIX_V2__) return;
  window.__PASHA_INVOICE_LIVE_EDITOR_MOBILE_RUNTIME_FIX_V2__ = true;

  const isCompact = () => {
    const vv = window.visualViewport;
    const width = Math.min(
      Number(window.innerWidth || 9999),
      Number(document.documentElement?.clientWidth || 9999),
      Number(vv?.width || 9999)
    );
    return width <= 1100 || /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  };

  const important = (el, prop, value) => el?.style?.setProperty(prop, value, 'important');

  function forceLayout(modal) {
    if (!modal || !isCompact()) return;

    const card = modal.querySelector('.pb-invoice-live-card');
    const preview = modal.querySelector('.pb-invoice-live-preview');
    const image = preview?.querySelector('img');
    const controls = modal.querySelector('.pb-invoice-live-controls');
    const close = modal.querySelector('.pb-live-close');
    const actions = modal.querySelector('.pb-live-actions');
    if (!card || !preview || !controls) return;

    important(modal, 'padding', '0');
    important(modal, 'overflow', 'hidden');

    important(card, 'display', 'flex');
    important(card, 'flex-direction', 'column');
    important(card, 'width', '100%');
    important(card, 'max-width', '100%');
    important(card, 'height', '100dvh');
    important(card, 'max-height', '100dvh');
    important(card, 'overflow', 'hidden');
    important(card, 'border-radius', '0');

    // Controls first: this guarantees the editor is visible immediately.
    important(controls, 'order', '0');
    important(controls, 'flex', '1 1 auto');
    important(controls, 'min-height', '0');
    important(controls, 'max-height', 'none');
    important(controls, 'overflow-y', 'auto');
    important(controls, 'overflow-x', 'hidden');
    important(controls, '-webkit-overflow-scrolling', 'touch');
    important(controls, 'padding', '14px 14px calc(16px + env(safe-area-inset-bottom))');
    important(controls, 'border-inline-end', '0');
    important(controls, 'border-bottom', '0');

    // Preview is intentionally a small thumbnail pane at the bottom.
    important(preview, 'order', '1');
    important(preview, 'flex', '0 0 24dvh');
    important(preview, 'width', '100%');
    important(preview, 'height', '24dvh');
    important(preview, 'min-height', '130px');
    important(preview, 'max-height', '24dvh');
    important(preview, 'overflow', 'hidden');
    important(preview, 'padding', '8px 10px');
    important(preview, 'align-items', 'center');
    important(preview, 'justify-content', 'center');
    important(preview, 'border-top', '1px solid rgba(255,255,255,.08)');
    important(preview, 'border-bottom', '0');

    if (image) {
      important(image, 'display', 'block');
      important(image, 'width', 'auto');
      important(image, 'height', 'auto');
      important(image, 'max-width', '100%');
      important(image, 'max-height', '100%');
      important(image, 'object-fit', 'contain');
      important(image, 'margin', 'auto');
      important(image, 'transform', 'none');
    }

    if (close) {
      important(close, 'position', 'fixed');
      important(close, 'top', 'calc(10px + env(safe-area-inset-top))');
      important(close, 'left', '10px');
      important(close, 'z-index', '2147483000');
    }

    if (actions) {
      important(actions, 'position', 'sticky');
      important(actions, 'bottom', 'calc(-14px - env(safe-area-inset-bottom))');
      important(actions, 'z-index', '5');
      important(actions, 'background', '#11100f');
      important(actions, 'padding-bottom', 'calc(12px + env(safe-area-inset-bottom))');
    }

    modal.dataset.pbMobileLayoutV2 = '1';
  }

  function scan() {
    document.querySelectorAll('.pb-invoice-live').forEach(forceLayout);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('.pb-invoice-live')) forceLayout(node);
        node.querySelectorAll?.('.pb-invoice-live').forEach(forceLayout);
      }
    }
  });

  const start = () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', scan, { passive: true });
    window.visualViewport?.addEventListener('resize', scan, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
