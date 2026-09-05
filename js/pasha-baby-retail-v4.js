(() => {
  if (window.__PASHA_BABY_RETAIL_V5__) return;
  window.__PASHA_BABY_RETAIL_V5__ = true;

  const DEFAULT_PLACEHOLDER = 'assets/pasha-baby-product-placeholder.svg';
  const PLACEHOLDER_RE = /(?:restaurant-placeholder|pasha-baby-product-placeholder)\.svg(?:\?|$)/i;
  const CARD_CHARACTERS = ['🧸','🐰','🐥','🐼','🐨','🦊','🐻‍❄️','🐯'];

  function installRetailFixStyles() {
    if (document.getElementById('pbRetailV5RuntimeStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbRetailV5RuntimeStyles';
    style.textContent = `
      /* Shorash-style identity stack: logo, store name, subtitle. */
      .sm-header{
        padding-top:18px!important;
      }
      #pbBrand.pb-brand{
        width:100%!important;
        max-width:none!important;
        margin:0 auto 12px!important;
        padding:4px 14px 8px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:0!important;
        text-align:center!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        background-image:none!important;
        box-shadow:none!important;
      }
      #pbBrand .pb-brand-mark{
        grid-row:auto!important;
        grid-column:auto!important;
        width:118px!important;
        height:118px!important;
        margin:0 auto 8px!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        background-image:none!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      #pbBrand .pb-brand-mark.has-store-logo,
      #pbBrand .pb-brand-mark.has-store-logo:hover{
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }
      #pbBrand .pb-brand-mark.has-store-logo::before,
      #pbBrand .pb-brand-mark.has-store-logo::after,
      #pbBrand .pb-brand-mark.has-store-logo small{
        display:none!important;
        content:none!important;
      }
      #pbBrand .pb-brand-logo{
        width:100%!important;
        height:100%!important;
        max-width:118px!important;
        max-height:118px!important;
        padding:0!important;
        margin:0 auto!important;
        object-fit:contain!important;
        object-position:center!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      #pbBrand .pb-brand-name{
        grid-column:auto!important;
        width:100%!important;
        margin:0!important;
        padding:0!important;
        color:#243137!important;
        font-size:28px!important;
        line-height:1.15!important;
        font-weight:950!important;
        letter-spacing:-.45px!important;
        text-align:center!important;
      }
      #pbBrand .pb-brand-tagline{
        grid-column:auto!important;
        width:100%!important;
        max-width:330px!important;
        margin:6px auto 0!important;
        padding:0!important;
        color:#6d7b80!important;
        font-size:12.5px!important;
        line-height:1.55!important;
        font-weight:720!important;
        text-align:center!important;
      }

      /* Match the upper quick actions to the compact footer action buttons. */
      #smActions.sm-actions,
      .sm-header #smActions.sm-actions,
      .sm-header .sm-quick-actions{
        width:min(100%,430px)!important;
        margin:8px auto 10px!important;
        padding:0 14px!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;
        box-sizing:border-box!important;
      }
      #smActions.sm-actions>a,
      .sm-header .sm-quick-actions>a{
        min-width:0!important;
        min-height:48px!important;
        margin:0!important;
        padding:7px 9px!important;
        display:flex!important;
        flex-direction:row!important;
        align-items:center!important;
        justify-content:center!important;
        gap:6px!important;
        border:1px solid rgba(139,177,167,.22)!important;
        border-radius:16px!important;
        background:linear-gradient(180deg,#fff,#f8fbfa)!important;
        color:#34464b!important;
        box-shadow:0 6px 15px rgba(48,67,63,.055)!important;
        text-decoration:none!important;
        text-align:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      #smActions.sm-actions>a:nth-child(3n+2),
      .sm-header .sm-quick-actions>a:nth-child(3n+2){
        background:linear-gradient(180deg,#fff,#f8f7fc)!important;
      }
      #smActions.sm-actions>a:nth-child(3n+3),
      .sm-header .sm-quick-actions>a:nth-child(3n+3){
        background:linear-gradient(180deg,#fff,#fff8f3)!important;
      }
      #smActions.sm-actions>a>span,
      .sm-header .sm-quick-actions>a>span{
        width:20px!important;
        height:20px!important;
        min-width:20px!important;
        flex:0 0 20px!important;
        margin:0!important;
        padding:0!important;
        display:grid!important;
        place-items:center!important;
        border-radius:7px!important;
        background:#dcefe9!important;
        color:#2f7568!important;
        font-size:13px!important;
        line-height:1!important;
      }
      #smActions.sm-actions>a:nth-child(3n+2)>span,
      .sm-header .sm-quick-actions>a:nth-child(3n+2)>span{
        background:#eee9f7!important;
        color:#625a75!important;
      }
      #smActions.sm-actions>a:nth-child(3n+3)>span,
      .sm-header .sm-quick-actions>a:nth-child(3n+3)>span{
        background:#f8e5da!important;
        color:#875c51!important;
      }
      #smActions.sm-actions>a>b,
      #smActions.sm-actions>a>strong,
      .sm-header .sm-quick-actions>a>b,
      .sm-header .sm-quick-actions>a>strong{
        min-width:0!important;
        margin:0!important;
        padding:0!important;
        color:inherit!important;
        font-size:9.8px!important;
        line-height:1.1!important;
        font-weight:900!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      #smActions.sm-actions>a:active,
      .sm-header .sm-quick-actions>a:active{
        transform:scale(.975)!important;
      }

      /* Social buttons: always four equal columns, never adaptive by label width. */
      #smApp .sm-footer .sm-footer-socials{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:6px!important;
        align-items:stretch!important;
        justify-content:stretch!important;
      }
      #smApp .sm-footer .sm-footer-socials>a{
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        min-height:29px!important;
        margin:0!important;
        padding:0 4px!important;
        box-sizing:border-box!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        font-size:8px!important;
        white-space:nowrap!important;
        overflow:hidden!important;
      }

      @media(max-width:390px){
        #smActions.sm-actions,
        .sm-header #smActions.sm-actions,
        .sm-header .sm-quick-actions{
          gap:6px!important;
          padding-inline:11px!important;
        }
        #smActions.sm-actions>a,
        .sm-header .sm-quick-actions>a{
          min-height:45px!important;
          padding-inline:6px!important;
          gap:4px!important;
        }
        #smActions.sm-actions>a>span,
        .sm-header .sm-quick-actions>a>span{
          width:18px!important;
          height:18px!important;
          min-width:18px!important;
          flex-basis:18px!important;
          font-size:12px!important;
        }
        #smActions.sm-actions>a>b,
        #smActions.sm-actions>a>strong,
        .sm-header .sm-quick-actions>a>b,
        .sm-header .sm-quick-actions>a>strong{
          font-size:8.8px!important;
        }
        #smApp .sm-footer .sm-footer-socials{
          gap:5px!important;
        }
        #smApp .sm-footer .sm-footer-socials>a{
          min-height:28px!important;
          padding-inline:3px!important;
          gap:3px!important;
          font-size:7.5px!important;
        }
      }

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

  function centerCategory(category) {
    if (!category) return;
    try {
      category.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    } catch (_) {}
  }

  function refresh() {
    installRetailFixStyles();
    removeDuplicateCategoryPanel();
    markPlaceholders();
    decorateProductCards();
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

  document.addEventListener('click', event => {
    const category = event.target.closest?.('#smCats .sm-cat');
    if (!category) return;

    setTimeout(() => {
      centerCategory(category);
      scrollToMenu();
      markPlaceholders();
      decorateProductCards();
    }, 35);
  });

  function start() {
    refresh();

    const cats = document.getElementById('smCats');
    const menu = document.getElementById('smMenu');

    if (cats) {
      const catsObserver = new MutationObserver(scheduleRefresh);
      catsObserver.observe(cats, { childList: true, subtree: true });
    }

    if (menu) {
      const menuObserver = new MutationObserver(scheduleRefresh);
      menuObserver.observe(menu, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
    }

    window.addEventListener('restbr:ready', () => {
      refresh();
      setTimeout(refresh, 100);
    });

    [80, 250, 650].forEach(delay => setTimeout(refresh, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
