(() => {
  if (window.__PASHA_BABY_STOREFRONT_V2__) return;
  window.__PASHA_BABY_STOREFRONT_V2__ = true;

  const COPY = {
    ar: {
      eyebrow: 'كل احتياجات طفلك بمكان واحد',
      title: 'اختار القسم اللي تحتاجه',
      sub: 'أقسام واضحة، أسعار مباشرة، وطلب سهل.',
      search: 'ابحث عن منتج',
      searchHint: 'اكتب الاسم أو النوع'
    },
    ku: {
      eyebrow: 'هەمی پێداویستیێن زاروکی تە ل شوینەکی',
      title: 'پۆلا کو پێدڤی تەیە هەلبژێرە',
      sub: 'پۆلێن ئاشکرا، نرخێن دیار و داواکاریەکا ساناهی.',
      search: 'ل بەرهەمەکی بگەڕێ',
      searchHint: 'ناڤ یان جۆر بنڤیسە'
    },
    en: {
      eyebrow: 'Everything your baby needs in one place',
      title: 'Choose what you need',
      sub: 'Clear categories, simple prices, easy ordering.',
      search: 'Search products',
      searchHint: 'Type a name or product type'
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
        <button id="pbSearchLaunchV2" class="pb-search-launch" type="button">
          <span class="pb-search-icon">🔎</span>
          <span class="pb-search-label"></span>
          <small class="pb-search-hint"></small>
        </button>
      `;
      header.insertAdjacentElement('afterend', hero);

      hero.querySelector('#pbSearchLaunchV2')?.addEventListener('click', () => {
        const input = document.getElementById('smSearchInput');
        const toggle = document.getElementById('smSearchToggle');
        if (input && input.offsetParent !== null) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        toggle?.click();
        setTimeout(() => {
          const next = document.getElementById('smSearchInput');
          next?.focus();
          next?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      });
    }

    // Remove the retired duplicate category grid from older cached builds.
    document.getElementById('pbCategoryPanelV2')?.remove();

    const copy = COPY[lang()];
    hero.querySelector('.pb-store-eyebrow').textContent = copy.eyebrow;
    hero.querySelector('h2').textContent = copy.title;
    hero.querySelector('p').textContent = copy.sub;
    hero.querySelector('.pb-search-label').textContent = copy.search;
    hero.querySelector('.pb-search-hint').textContent = copy.searchHint;
    return hero;
  }

  function removeRestaurantGate() {
    document.querySelectorAll('.sm-dining-gate').forEach(element => element.remove());
    document.documentElement.classList.remove('sm-mode-dinein','sm-mode-takeaway');
    document.documentElement.removeAttribute('data-sm-dining-mode');
  }

  function sync() {
    removeRestaurantGate();
    ensureHero();
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

    [120,350,800,1600].forEach(delay => setTimeout(sync, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
