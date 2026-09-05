(() => {
  if (window.__PASHA_BABY_RETAIL_V4__) return;
  window.__PASHA_BABY_RETAIL_V4__ = true;

  const DEFAULT_PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';
  const PLACEHOLDER_RE = /(?:restaurant-placeholder|pasha-baby-product-placeholder)\.svg(?:\?|$)/i;
  const CARD_CHARACTERS = ['🧸','🐰','🐥','🐼','🐨','🦊','🐻‍❄️','🐯'];

  function installRetailFixStyles() {
    if (document.getElementById('pbRetailV4RuntimeStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbRetailV4RuntimeStyles';
    style.textContent = `
      /* Use the branded Pasha Baby image itself for products without photos. */
      #smMenu .sm-img.pb-placeholder .sm-product-image,
      #smMenu .sm-product-image[data-pb-placeholder="1"]{
        opacity:1!important;
        visibility:visible!important;
        display:block!important;
        width:100%!important;
        height:100%!important;
        object-fit:contain!important;
        object-position:center!important;
        padding:0!important;
        background:#f8fbfa!important;
      }
      #smMenu .sm-img.pb-placeholder::after{
        content:none!important;
        display:none!important;
      }

      /* Cart notifications belong in the visual center, not at the bottom. */
      .sm-cart-toast{
        top:50%!important;
        bottom:auto!important;
        left:50%!important;
        right:auto!important;
        width:max-content!important;
        max-width:min(86vw,360px)!important;
        min-height:48px!important;
        padding:12px 18px!important;
        border:1px solid #cbe4dc!important;
        border-radius:16px!important;
        background:#eff8f5!important;
        color:#2f7568!important;
        box-shadow:0 14px 38px rgba(48,67,63,.16)!important;
        font-size:13px!important;
        font-weight:900!important;
        text-align:center!important;
        white-space:normal!important;
        transform:translate(-50%,-50%) scale(.96)!important;
        transition:opacity .18s ease,transform .18s ease!important;
      }
      .sm-cart-toast.show{
        opacity:1!important;
        transform:translate(-50%,-50%) scale(1)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateCategoryPanel() {
    document.getElementById('pbCategoryPanelV2')?.remove();
  }

  function stableHash(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function decorateProductCards(root = document) {
    root.querySelectorAll?.('#smMenu .sm-card').forEach(card => {
      if (card.querySelector(':scope > .pb-card-character')) return;

      const name = String(card.querySelector('.sm-name')?.textContent || '').trim();
      const category = String(
        card.querySelector('.sm-search-category')?.textContent ||
        card.closest('.sm-section')?.querySelector('.sm-section-title')?.textContent ||
        ''
      ).trim();
      const image = String(card.querySelector('.sm-product-image')?.getAttribute('src') || '');
      const explicit = String(
        card.dataset.productId ||
        card.dataset.id ||
        card.getAttribute('data-product') ||
        ''
      );
      const key = `${explicit}|${category}|${name}|${image}`;
      const index = stableHash(key) % CARD_CHARACTERS.length;

      const sticker = document.createElement('span');
      sticker.className = `pb-card-character pb-card-character-${index + 1}`;
      sticker.textContent = CARD_CHARACTERS[index];
      sticker.setAttribute('aria-hidden', 'true');
      sticker.dataset.pbCharacter = String(index + 1);
      card.appendChild(sticker);
    });
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
    installRetailFixStyles();
    removeDuplicateCategoryPanel();
    markPlaceholders();
    decorateProductCards();
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
      decorateProductCards();
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
