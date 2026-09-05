(() => {
  if (window.__PASHA_BABY_STOREFRONT_V2__) return;
  window.__PASHA_BABY_STOREFRONT_V2__ = true;

  const COPY = {
    ar: {
      eyebrow: 'كل احتياجات طفلك بمكان واحد',
      title: 'اختار القسم اللي تحتاجه',
      sub: 'أقسام واضحة، أسعار مباشرة، وطلب سهل.',
      categories: 'الأقسام',
      hint: 'اضغط على القسم',
      search: 'ابحث عن منتج',
      searchHint: 'اكتب الاسم أو النوع'
    },
    ku: {
      eyebrow: 'هەمی پێداویستیێن زاروکی تە ل شوینەکی',
      title: 'پۆلا کو پێدڤی تەیە هەلبژێرە',
      sub: 'پۆلێن ئاشکرا، نرخێن دیار و داواکاریەکا ساناهی.',
      categories: 'پۆل',
      hint: 'لسەر پۆلێ کلیک بکە',
      search: 'ل بەرهەمەکی بگەڕێ',
      searchHint: 'ناڤ یان جۆر بنڤیسە'
    },
    en: {
      eyebrow: 'Everything your baby needs in one place',
      title: 'Choose what you need',
      sub: 'Clear categories, simple prices, easy ordering.',
      categories: 'Categories',
      hint: 'Tap a category',
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

  function iconFor(value) {
    const text = String(value || '').toLowerCase();
    if (/حفاض|پەمپ|diaper|wipe|مناديل|دەستمال/.test(text)) return '🧷';
    if (/رضاع|حليب|bottle|feed|pacifier|لهاية|شیردان|پستانک/.test(text)) return '🍼';
    if (/عناي|كريم|شامبو|care|cream|shampoo|چاڤدێر/.test(text)) return '🧴';
    if (/استحم|حمام|منشف|bath|towel|خۆشوشتن/.test(text)) return '🛁';
    if (/ملابس|لباس|قطن|clothes|clothing|جل|بەرگ/.test(text)) return '👕';
    if (/نوم|بطاني|سرير|sleep|blanket|bed|نڤستن/.test(text)) return '🌙';
    if (/لعب|العاب|ألعاب|toy|game|یاری/.test(text)) return '🧸';
    if (/عربات|عربة|كرسي|stroller|seat|carriage|عەرەبان/.test(text)) return '🚼';
    if (/حقيبة|شنط|bag|سفر/.test(text)) return '🎒';
    if (/سلامة|حماية|safety|protect/.test(text)) return '🛡️';
    if (/غذاء|طعام|food|meal/.test(text)) return '🥣';
    return '✨';
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

    const copy = COPY[lang()];
    hero.querySelector('.pb-store-eyebrow').textContent = copy.eyebrow;
    hero.querySelector('h2').textContent = copy.title;
    hero.querySelector('p').textContent = copy.sub;
    hero.querySelector('.pb-search-label').textContent = copy.search;
    hero.querySelector('.pb-search-hint').textContent = copy.searchHint;
    return hero;
  }

  function ensureCategoryPanel() {
    const hero = ensureHero();
    if (!hero) return null;

    let panel = document.getElementById('pbCategoryPanelV2');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'pbCategoryPanelV2';
      panel.className = 'pb-category-panel';
      panel.innerHTML = `
        <div class="pb-category-head">
          <h2></h2>
          <span></span>
        </div>
        <div class="pb-category-grid"></div>
      `;
      hero.insertAdjacentElement('afterend', panel);
    }

    const copy = COPY[lang()];
    panel.querySelector('.pb-category-head h2').textContent = copy.categories;
    panel.querySelector('.pb-category-head span').textContent = copy.hint;
    return panel;
  }

  function syncCategoryGrid() {
    const panel = ensureCategoryPanel();
    if (!panel) return;
    const grid = panel.querySelector('.pb-category-grid');
    if (!grid) return;

    const sourceButtons = [...document.querySelectorAll('#smCats .sm-cat')];
    if (!sourceButtons.length) return;

    const signature = sourceButtons.map(button => String(button.textContent || '').trim()).join('|');
    if (grid.dataset.signature === signature) return;
    grid.dataset.signature = signature;
    grid.replaceChildren();

    sourceButtons.forEach((source, index) => {
      const label = String(source.textContent || '').trim();
      if (!label) return;

      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'pb-category-tile';
      tile.dataset.categoryIndex = String(index);
      tile.innerHTML = `
        <span class="pb-category-icon" aria-hidden="true">${iconFor(label)}</span>
        <span class="pb-category-label"></span>
      `;
      tile.querySelector('.pb-category-label').textContent = label;
      tile.setAttribute('aria-label', label);
      tile.addEventListener('click', () => {
        source.click();
        setTimeout(() => {
          const active = document.querySelector('#smMenu .sm-section:not([hidden])');
          (active || document.getElementById('smMenu'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      });
      grid.appendChild(tile);
    });
  }

  function removeRestaurantGate() {
    document.querySelectorAll('.sm-dining-gate').forEach(element => element.remove());
    document.documentElement.classList.remove('sm-mode-dinein','sm-mode-takeaway');
    document.documentElement.removeAttribute('data-sm-dining-mode');
  }

  function sync() {
    removeRestaurantGate();
    ensureHero();
    syncCategoryGrid();
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
    });
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

    const cats = document.getElementById('smCats');
    if (cats) {
      const observer = new MutationObserver(schedule);
      observer.observe(cats, { childList:true, subtree:true, characterData:true });
    }

    [120,350,800,1600].forEach(delay => setTimeout(sync, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
