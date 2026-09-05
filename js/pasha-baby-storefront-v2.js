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
    }

    document.getElementById('pbCategoryPanelV2')?.remove();

    const copy = COPY[lang()];
    hero.querySelector('.pb-store-eyebrow').textContent = copy.eyebrow;
    hero.querySelector('h2').textContent = copy.title;
    hero.querySelector('p').textContent = copy.sub;
    return hero;
  }

  function attachRealSearch() {
    const hero = ensureHero();
    const host = hero?.querySelector('#pbSearchHostV3');
    if (!host) return false;

    const toggle = document.getElementById('smSearchToggle');
    if (toggle) {
      toggle.hidden = true;
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
      if (!document.getElementById('pbSearchHostV3') || document.getElementById('smSearchWrap')?.parentElement !== document.getElementById('pbSearchHostV3')) {
        sync();
      }
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
