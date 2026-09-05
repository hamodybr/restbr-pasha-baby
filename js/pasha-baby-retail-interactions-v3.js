(() => {
  if (window.__PASHA_BABY_RETAIL_INTERACTIONS_V3__) return;
  window.__PASHA_BABY_RETAIL_INTERACTIONS_V3__ = true;

  const CARD_BORDER = '1px solid #dde8e4';
  const CARD_BG = '#ffffff';
  const PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';

  function setImportant(el, property, value) {
    if (!el) return;
    if (
      el.style.getPropertyValue(property) === value &&
      el.style.getPropertyPriority(property) === 'important'
    ) return;
    el.style.setProperty(property, value, 'important');
  }

  function enforceRetailCards(root = document) {
    root.querySelectorAll?.('#smMenu .sm-card').forEach(card => {
      setImportant(card, 'background-image', 'none');
      setImportant(card, 'background-color', CARD_BG);
      setImportant(card, 'border-top', CARD_BORDER);
      setImportant(card, 'border-right', CARD_BORDER);
      setImportant(card, 'border-bottom', CARD_BORDER);
      setImportant(card, 'border-left', CARD_BORDER);
      setImportant(card, 'box-shadow', '0 6px 18px rgba(48,67,63,.06)');
      setImportant(card, 'backdrop-filter', 'none');
      setImportant(card, '-webkit-backdrop-filter', 'none');
    });
  }

  function currentSourceButtons() {
    return [...document.querySelectorAll('#smCats .sm-cat')];
  }

  function syncCategoryTiles() {
    const buttons = currentSourceButtons();
    document.querySelectorAll('.pb-category-tile').forEach(tile => {
      const index = Number(tile.dataset.categoryIndex);
      const source = Number.isInteger(index) ? buttons[index] : null;
      if (!source) {
        tile.disabled = true;
        tile.classList.remove('pb-active');
        return;
      }

      tile.disabled = false;
      tile.dataset.categoryId = source.dataset.catId || '';
      tile.dataset.categoryKey = source.dataset.cat || '';
      tile.classList.toggle('pb-active', source.classList.contains('active'));
    });
  }

  function scrollToMenu() {
    const target = document.querySelector('#smMenu .sm-section') || document.getElementById('smMenu');
    if (!target) return;
    const sticky = document.querySelector('.sm-cats-wrap');
    const offset = Math.max(54, sticky?.getBoundingClientRect().height || 0) + 10;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function activateLargeCategory(tile) {
    const buttons = currentSourceButtons();
    const index = Number(tile.dataset.categoryIndex);
    const source = Number.isInteger(index) ? buttons[index] : null;
    if (!source) return;

    if (!source.classList.contains('active')) {
      source.click();
    }

    requestAnimationFrame(() => {
      syncCategoryTiles();
      setTimeout(scrollToMenu, 35);
    });
  }

  function cartSvg() {
    return `
      <svg class="pb-cart-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 5h2l1.55 9.1a1.8 1.8 0 0 0 1.78 1.5h7.92a1.8 1.8 0 0 0 1.75-1.35L20.5 8H6.1"></path>
        <circle cx="9.2" cy="19" r="1.25"></circle>
        <circle cx="17.2" cy="19" r="1.25"></circle>
      </svg>`;
  }

  function updateCartVisuals() {
    const fab = document.getElementById('smCartFab');
    if (!fab) return;

    const icon = fab.querySelector(':scope > span:first-child');
    if (icon && !icon.querySelector('.pb-cart-svg')) icon.innerHTML = cartSvg();

    const text = String(document.getElementById('smCartFabText')?.textContent || '').trim();
    const match = text.match(/^\s*(\d+)\s*[•·]/);
    const count = match ? Number(match[1]) : 0;
    fab.dataset.pbCount = String(Number.isFinite(count) ? count : 0);

    document.querySelectorAll('.sm-cart-item img').forEach(img => {
      const src = String(img.getAttribute('src') || '');
      if (/restaurant-placeholder\.svg(?:\?|$)/i.test(src)) img.src = PLACEHOLDER;
    });
  }

  function subtleAddFeedback(source) {
    if (!source) return;
    source.classList.add('pb-added');
    setTimeout(() => source.classList.remove('pb-added'), 520);

    setTimeout(() => {
      updateCartVisuals();
      const fab = document.getElementById('smCartFab');
      const icon = fab?.querySelector('.pb-cart-svg');
      if (icon?.animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        icon.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.14)', offset: .45 },
            { transform: 'scale(1)' }
          ],
          { duration: 300, easing: 'ease-out' }
        );
      }
    }, 30);
  }

  function refreshAll() {
    enforceRetailCards();
    syncCategoryTiles();
    updateCartVisuals();
  }

  let queued = false;
  function scheduleRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshAll();
    });
  }

  // Capture before the old tile's detached-button handler. This fixes the
  // large category cards even when the small category rail has re-rendered.
  document.addEventListener('click', event => {
    const tile = event.target.closest?.('.pb-category-tile');
    if (tile) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateLargeCategory(tile);
      return;
    }

    const add = event.target.closest?.('.sm-add-cart,.sm-direct-add,[data-choice-product]');
    if (add && !add.disabled) subtleAddFeedback(add);
  }, true);

  function start() {
    refreshAll();

    const menu = document.getElementById('smMenu');
    const cats = document.getElementById('smCats');
    const cart = document.getElementById('smCartDrawer');

    [menu, cats, cart].filter(Boolean).forEach(node => {
      const observer = new MutationObserver(scheduleRefresh);
      observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'src']
      });
    });

    window.addEventListener('restbr:ready', () => {
      refreshAll();
      setTimeout(refreshAll, 100);
    });

    document.addEventListener('restbr:admin-language-change', scheduleRefresh);
    [100, 300, 700, 1400, 2600].forEach(delay => setTimeout(refreshAll, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
