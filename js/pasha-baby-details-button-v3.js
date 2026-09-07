/* PASHA BABY — CARD DETAILS BUTTON V3
   Presentation-only helper. Keeps the existing product details sheet logic intact,
   replaces the inline More link with a small Details button in the bottom action row. */

(() => {
  if (window.__PB_CARD_DETAILS_BUTTON_V3__) return;
  window.__PB_CARD_DETAILS_BUTTON_V3__ = true;

  const STYLE_ID = 'pbCardDetailsButtonV3Style';
  let scheduled = false;
  let observer = null;
  let langObserver = null;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'css/pasha-baby-details-button-v3.css?v=3.1';
    document.head.appendChild(link);
  };

  const detailsLabel = () => {
    const language = String(document.documentElement.lang || 'ar').toLowerCase();
    if (language.startsWith('en')) return 'Details';
    if (language.startsWith('ku')) return 'وردەکاری';
    return 'تفاصيل';
  };

  const sync = () => {
    scheduled = false;

    document.querySelectorAll('#smMenu [data-product-card]').forEach(card => {
      const info = card.querySelector('.sm-info');
      if (!info) return;

      const description = info.querySelector('.pb-product-description');
      const more = info.querySelector('.pb-product-description-more');
      const actionRow = card.querySelector('.pb-product-action-row');
      let details = card.querySelector('.pb-card-details-btn');

      // The V2 helper only creates the hidden More trigger when the description
      // is long enough to need the full details sheet.
      if (!description || !more) {
        details?.remove();
        return;
      }

      // The fixed-discount layer creates one shared row for the cart action and
      // discount label. Wait for that row so Details always lives on the same line.
      if (!actionRow) {
        details?.remove();
        return;
      }

      if (!details) {
        details = document.createElement('button');
        details.type = 'button';
        details.className = 'pb-card-details-btn';
      }

      if (details.parentElement !== actionRow) {
        actionRow.appendChild(details);
      }

      details.textContent = detailsLabel();
      details.setAttribute('aria-label', `${detailsLabel()} — ${String(card.querySelector('.sm-name')?.textContent || '').trim()}`);

      details.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        const trigger = info.querySelector('.pb-product-description-more');
        trigger?.click();
      };
    });
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  };

  const attach = () => {
    ensureStyle();

    const menu = document.getElementById('smMenu');
    if (!menu) {
      setTimeout(attach, 120);
      return;
    }

    observer?.disconnect();
    observer = new MutationObserver(scheduleSync);
    observer.observe(menu, { childList: true, subtree: true });

    langObserver?.disconnect();
    langObserver = new MutationObserver(scheduleSync);
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'dir']
    });

    window.addEventListener('restbr:prices-updated', scheduleSync);
    window.addEventListener('restbr:fixed-discounts-ready', scheduleSync);

    scheduleSync();
    setTimeout(scheduleSync, 350);
    setTimeout(scheduleSync, 1100);
    setTimeout(scheduleSync, 2000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
