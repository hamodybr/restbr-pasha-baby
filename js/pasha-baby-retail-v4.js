(() => {
  if (window.__PASHA_BABY_RETAIL_V4__) return;
  window.__PASHA_BABY_RETAIL_V4__ = true;

  const DEFAULT_PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';
  const PLACEHOLDER_RE = /(?:restaurant-placeholder|pasha-baby-product-placeholder)\.svg(?:\?|$)/i;

  function removeDuplicateCategoryPanel() {
    document.getElementById('pbCategoryPanelV2')?.remove();
  }

  function markPlaceholders(root = document) {
    root.querySelectorAll?.('#smMenu .sm-product-image').forEach(img => {
      const src = String(img.getAttribute('src') || '');
      const full = String(img.dataset.fullImage || '');
      const holder = img.closest('.sm-img');
      const placeholder =
        PLACEHOLDER_RE.test(src) ||
        PLACEHOLDER_RE.test(full) ||
        holder?.classList.contains('pb-placeholder') ||
        holder?.classList.contains('sm-image-fallback-empty') ||
        img.dataset.smFallbackApplied === '1';

      img.dataset.pbPlaceholder = placeholder ? '1' : '0';
      if (holder) holder.classList.toggle('pb-placeholder', placeholder);

      if (placeholder && !/pasha-baby-product-placeholder\.svg(?:\?|$)/i.test(src)) {
        img.src = DEFAULT_PLACEHOLDER;
        img.dataset.fullImage = DEFAULT_PLACEHOLDER;
      }
    });
  }

  function scrollToMenu() {
    const target = document.querySelector('#smMenu .sm-section') || document.getElementById('smMenu');
    if (!target) return;
    const rail = document.querySelector('.sm-cats-wrap');
    const offset = Math.max(72, rail?.getBoundingClientRect().height || 0) + 8;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function centerActiveCategory() {
    const active = document.querySelector('#smCats .sm-cat.active');
    active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function refresh() {
    removeDuplicateCategoryPanel();
    markPlaceholders();
    centerActiveCategory();
  }

  let queued = false;
  function scheduleRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh();
    });
  }

  // A placeholder is not a real product photo. Do not open the old image viewer.
  document.addEventListener('click', event => {
    const image = event.target.closest?.('.sm-product-image');
    if (!image) return;

    const holder = image.closest('.sm-img');
    const placeholder =
      image.dataset.pbPlaceholder === '1' ||
      holder?.classList.contains('pb-placeholder') ||
      holder?.classList.contains('sm-image-fallback-empty') ||
      PLACEHOLDER_RE.test(String(image.getAttribute('src') || '')) ||
      PLACEHOLDER_RE.test(String(image.dataset.fullImage || ''));

    if (!placeholder) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  // The pastel category rail is now the only category navigation.
  document.addEventListener('click', event => {
    const category = event.target.closest?.('#smCats .sm-cat');
    if (!category) return;

    setTimeout(() => {
      centerActiveCategory();
      scrollToMenu();
      markPlaceholders();
    }, 40);
  });

  function start() {
    refresh();

    const cats = document.getElementById('smCats');
    const menu = document.getElementById('smMenu');
    [cats, menu].filter(Boolean).forEach(node => {
      const observer = new MutationObserver(scheduleRefresh);
      observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src', 'data-pb-icon']
      });
    });

    window.addEventListener('restbr:ready', () => {
      refresh();
      setTimeout(refresh, 100);
    });

    [80, 250, 650, 1300].forEach(delay => setTimeout(refresh, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
