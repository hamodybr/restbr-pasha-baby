(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_BABY_ADMIN_COPY_V4__) return;
  window.__PASHA_BABY_ADMIN_COPY_V4__ = true;

  const EXACT = new Map([
    ['لغات المنيو', 'لغات المتجر'],
    ['عنوان المنيو', 'عنوان المتجر'],
    ['إظهار عنوان المنيو', 'إظهار عنوان المتجر'],
    ['إحصائيات المنيو', 'إحصائيات المتجر'],
    ['رابط المنيو', 'رابط المتجر'],
    ['واتساب منيو', 'واتساب'],
    ['Menu Languages', 'Store Languages'],
    ['Menu Title', 'Store Title'],
    ['Menu Analytics', 'Store Analytics'],
    ['Menu Link', 'Store Link'],
    ['WhatsApp Menu', 'WhatsApp']
  ]);

  // Pasha Baby is retail. Replace the generic business noun instead of trying
  // to maintain a growing list such as "اسم المطعم", "فتح المطعم", etc.
  // This runs only on dashboard copy/attributes and never on product/category data.
  const PHRASES = [
    [/المطعم/g, 'المحل'],
    [/مطعم/g, 'محل'],
    [/\bRESTAURANT\b/g, 'STORE'],
    [/\bRestaurant\b/g, 'Store'],
    [/\brestaurant\b/g, 'store'],
    [/چێشتخانێ/g, 'دوکانێ'],
    [/چێشتخانەکە/g, 'دوکانەکە'],
    [/لغات المنيو/g, 'لغات المتجر'],
    [/إحصائيات المنيو/g, 'إحصائيات المتجر'],
    [/Menu Languages/gi, 'Store Languages'],
    [/Menu Analytics/gi, 'Store Analytics']
  ];

  const PROTECTED = [
    '.product-name',
    '.category-name',
    '.sort-item-name',
    '.analytics-label',
    '.admin-account-email',
    '.dynamic-item-title',
    '.option-chip',
    '[data-admin-i18n-ignore]'
  ].join(',');

  function isProtected(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return !!element?.closest?.(PROTECTED);
  }

  function replaceText(value) {
    const source = String(value ?? '');
    const trimmed = source.trim();
    if (!trimmed) return source;

    if (EXACT.has(trimmed)) {
      const replacement = EXACT.get(trimmed);
      const start = source.indexOf(trimmed);
      return start >= 0
        ? source.slice(0, start) + replacement + source.slice(start + trimmed.length)
        : replacement;
    }

    let next = source;
    PHRASES.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    return next;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || isProtected(node)) return;
    const next = replaceText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || isProtected(element)) return;
    ['placeholder', 'title', 'aria-label'].forEach(name => {
      const value = element.getAttribute(name);
      if (!value) return;
      const next = replaceText(value);
      if (next !== value) element.setAttribute(name, next);
    });
  }

  function scan(root) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (root instanceof Element) translateAttributes(root);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
    );

    let current;
    while ((current = walker.nextNode())) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else translateAttributes(current);
    }
  }

  // Pasha Baby is a retail store. These controls belong to the restaurant
  // template and are intentionally disabled here instead of deleting DB columns.
  function applyRetailFeaturePolicy() {
    document.getElementById('diningGateSettingsPanel')?.remove();
    document.getElementById('bulkPriceTargetField')?.remove();
    document.getElementById('discountsSettingsPanel')?.remove();
    document.querySelectorAll('.sm-takeaway-field').forEach(element => element.remove());

    const backgroundVideoControl =
      document.getElementById('rs_background_video_enabled') ||
      document.getElementById('rs_background_video');
    backgroundVideoControl?.closest('.settings-element')?.remove();
  }

  function activeScope() {
    return document.querySelector('.admin-view.active') || document.body;
  }

  let frame = 0;
  function scheduleScopeScan(delay = 0) {
    const run = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyRetailFeaturePolicy();
        scan(activeScope());
        scan(document.querySelector('.admin-header'));
        scan(document.querySelector('.bottom-nav'));
      });
    };
    if (delay > 0) setTimeout(run, delay);
    else run();
  }

  // Dynamic settings (hours, async status messages, i18n updates) can appear
  // after the first paint. Observe only changed nodes instead of rescanning the
  // whole dashboard, which keeps the previous iPhone/Safari performance fix.
  const pendingNodes = new Set();
  let mutationFrame = 0;

  function queueNode(node) {
    if (!node) return;
    pendingNodes.add(node);
    if (mutationFrame) return;

    mutationFrame = requestAnimationFrame(() => {
      mutationFrame = 0;
      const nodes = Array.from(pendingNodes);
      pendingNodes.clear();
      nodes.forEach(scan);
      applyRetailFeaturePolicy();
    });
  }

  function startIncrementalObserver() {
    if (!document.body || window.__PASHA_BABY_ADMIN_COPY_OBSERVER_V4__) return;
    window.__PASHA_BABY_ADMIN_COPY_OBSERVER_V4__ = true;

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'characterData') {
          queueNode(mutation.target);
          return;
        }

        if (mutation.type === 'attributes') {
          queueNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(queueNode);
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
  }

  function start() {
    applyRetailFeaturePolicy();
    scan(document.body);
    startIncrementalObserver();

    document.addEventListener('restbr:admin-language-change', () => {
      scheduleScopeScan();
      scheduleScopeScan(80);
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-admin-nav],[data-go-view]')) {
        scheduleScopeScan();
        scheduleScopeScan(90);
        return;
      }

      if (event.target.closest('button,summary')) {
        scheduleScopeScan(60);
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
