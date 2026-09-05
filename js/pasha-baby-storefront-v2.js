(() => {
  if (window.__PASHA_BABY_STOREFRONT_V2__) return;
  window.__PASHA_BABY_STOREFRONT_V2__ = true;

  const COPY = {
    ar: {
      eyebrow: 'كل احتياجات طفلك بمكان واحد',
      title: 'اختار القسم اللي تحتاجه',
      sub: 'أقسام واضحة، أسعار مباشرة، وطلب سهل.'
    },
    ku: {
      eyebrow: 'هەمی پێداویستیێن زاروکی تە ل شوینەکی',
      title: 'پۆلا کو پێدڤی تەیە هەلبژێرە',
      sub: 'پۆلێن ئاشکرا، نرخێن دیار و داواکاریەکا ساناهی.'
    },
    en: {
      eyebrow: 'Everything your baby needs in one place',
      title: 'Choose what you need',
      sub: 'Clear categories, simple prices, easy ordering.'
    }
  };

  function lang() {
    const value = String(
      (typeof window.RESTBR_LANG === 'function' ? window.RESTBR_LANG() : '') ||
      localStorage.getItem('RESTBR_LANG_V1') ||
      document.documentElement.lang ||
      'ar'
    ).toLowerCase();
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function installInlineSearchStyles() {
    if (document.getElementById('pbInlineSearchStylesV3')) return;
    const style = document.createElement('style');
    style.id = 'pbInlineSearchStylesV3';
    style.textContent = `
      #smSearchToggle{display:none!important}
      #pbSearchLaunchV2,.pb-search-launch{display:none!important}
      .pb-search-host{position:relative;z-index:3;width:100%;margin-top:14px}
      .pb-store-hero #smSearchWrap,
      .pb-store-hero #smSearchWrap.pb-inline-search{
        position:relative!important;inset:auto!important;z-index:3!important;
        width:100%!important;max-width:none!important;min-height:50px!important;
        margin:0!important;padding:5px 8px!important;display:grid!important;
        grid-template-columns:1fr!important;gap:0!important;box-sizing:border-box!important;
        border:1px solid rgba(79,143,131,.18)!important;border-radius:16px!important;
        background:rgba(255,255,255,.96)!important;color:#243137!important;
        box-shadow:0 5px 16px rgba(50,111,101,.06)!important;
        backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
        transform:none!important;opacity:1!important;visibility:visible!important
      }
      .pb-store-hero .sm-search-row{
        width:100%!important;min-height:38px!important;display:grid!important;
        grid-template-columns:28px minmax(0,1fr) 30px!important;
        align-items:center!important;gap:7px!important;direction:inherit!important
      }
      .pb-store-hero .sm-search-icon{
        width:28px!important;height:28px!important;display:grid!important;place-items:center!important;
        color:#4f8f83!important;opacity:1!important;font-size:15px!important
      }
      .pb-store-hero #smSearchInput{
        width:100%!important;min-width:0!important;height:38px!important;margin:0!important;
        padding:0 2px!important;border:0!important;outline:0!important;border-radius:0!important;
        background:transparent!important;color:#243137!important;-webkit-text-fill-color:#243137!important;
        box-shadow:none!important;font:inherit!important;font-size:16px!important;line-height:38px!important;
        font-weight:800!important;text-align:start!important;direction:inherit!important;
        appearance:none!important;-webkit-appearance:none!important
      }
      .pb-store-hero #smSearchInput::placeholder{
        color:#7a878b!important;-webkit-text-fill-color:#7a878b!important;opacity:1!important;font-weight:700!important
      }
      .pb-store-hero input[type='search']::-webkit-search-cancel-button{display:none!important;-webkit-appearance:none!important}
      .pb-store-hero #smSearchClear{
        width:30px!important;height:30px!important;min-width:30px!important;margin:0!important;padding:0!important;
        display:grid!important;place-items:center!important;border:0!important;border-radius:10px!important;
        background:#f2f7f5!important;color:#65767a!important;box-shadow:none!important;font-size:15px!important;
        line-height:1!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important
      }
      .pb-store-hero #smSearchClear:active{transform:scale(.94)!important;background:#e6f1ed!important}
      .pb-store-hero #smSearchCount{
        width:100%!important;min-height:0!important;margin:0!important;padding:0 35px!important;
        color:#718086!important;font-size:8.5px!important;line-height:1.35!important;text-align:start!important
      }
      .pb-store-hero #smSearchCount:empty{display:none!important}
      .pb-store-hero #smSearchWrap:focus-within{
        border-color:rgba(79,143,131,.42)!important;
        box-shadow:0 0 0 3px rgba(79,143,131,.09),0 6px 18px rgba(50,111,101,.07)!important
      }
      @media(max-width:390px){
        .pb-search-host{margin-top:12px}
        .pb-store-hero #smSearchWrap{min-height:47px!important;border-radius:15px!important}
        .pb-store-hero #smSearchInput{font-size:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHero() {
    const header = document.querySelector('.sm-header');
    if (!header) return null;

    let hero = document.getElementById('pbStoreHeroV2');
    if (!hero) {
      hero = document.createElement('section');
      hero.id = 'pbStoreHeroV2';
      hero.className = 'pb-store-hero';
      hero.innerHTML = `
        <span class="pb-store-eyebrow"></span>
        <h2></h2>
        <p></p>
        <div id="pbSearchHostV3" class="pb-search-host" role="search" aria-label="Search products"></div>
      `;
      header.insertAdjacentElement('afterend', hero);
    } else if (!hero.querySelector('#pbSearchHostV3')) {
      hero.querySelector('#pbSearchLaunchV2')?.remove();
      const host = document.createElement('div');
      host.id = 'pbSearchHostV3';
      host.className = 'pb-search-host';
      host.setAttribute('role', 'search');
      host.setAttribute('aria-label', 'Search products');
      hero.appendChild(host);
    }

    document.getElementById('pbCategoryPanelV2')?.remove();

    const copy = COPY[lang()];
    hero.querySelector('.pb-store-eyebrow').textContent = copy.eyebrow;
    hero.querySelector('h2').textContent = copy.title;
    hero.querySelector('p').textContent = copy.sub;
    return hero;
  }

  function attachRealSearch() {
    installInlineSearchStyles();
    const hero = ensureHero();
    const host = hero?.querySelector('#pbSearchHostV3');
    if (!host) return false;

    const toggle = document.getElementById('smSearchToggle');
    if (toggle) {
      toggle.hidden = true;
      toggle.style.setProperty('display', 'none', 'important');
      toggle.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('tabindex', '-1');
    }

    const wrap = document.getElementById('smSearchWrap');
    if (!wrap) return false;

    if (wrap.parentElement !== host) host.appendChild(wrap);
    wrap.classList.add('pb-inline-search', 'open');
    wrap.removeAttribute('hidden');
    wrap.setAttribute('role', 'search');

    const input = document.getElementById('smSearchInput');
    if (input) {
      input.type = 'search';
      input.setAttribute('enterkeyhint', 'search');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'none');
    }

    if (!host.dataset.pbSearchBound) {
      host.dataset.pbSearchBound = '1';
      host.addEventListener('click', event => {
        if (event.target.closest('button,input')) return;
        document.getElementById('smSearchInput')?.focus({ preventScroll: true });
      });
    }

    return true;
  }

  function removeRestaurantGate() {
    document.querySelectorAll('.sm-dining-gate').forEach(element => element.remove());
    document.documentElement.classList.remove('sm-mode-dinein','sm-mode-takeaway');
    document.documentElement.removeAttribute('data-sm-dining-mode');
  }

  function sync() {
    removeRestaurantGate();
    installInlineSearchStyles();
    ensureHero();
    attachRealSearch();
    document.getElementById('pbCategoryPanelV2')?.remove();
  }

  function start() {
    sync();

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang],#smLangs button')) {
        setTimeout(sync, 30);
        setTimeout(sync, 180);
      }
    });

    window.addEventListener('restbr:ready', () => {
      sync();
      setTimeout(sync, 120);
    });

    const observer = new MutationObserver(() => {
      const host = document.getElementById('pbSearchHostV3');
      const wrap = document.getElementById('smSearchWrap');
      if (!host || (wrap && wrap.parentElement !== host)) sync();
      const toggle = document.getElementById('smSearchToggle');
      if (toggle && toggle.style.display !== 'none') attachRealSearch();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    [60,120,250,500,900,1600].forEach(delay => setTimeout(sync, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
