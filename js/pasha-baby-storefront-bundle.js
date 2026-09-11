/* Generated storefront JavaScript bundle. Run scripts/build-storefront-bundles.mjs after source JavaScript changes. */
/* js/offline-status.js */
(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const TEXT = {
    ar: 'أنت الآن بدون إنترنت — نعرض آخر نسخة محفوظة',
    ku: 'ئێستا ئینتەرنێت نییە — دوایین وەشانی پاشەکەوتکراو پیشان دەدرێت',
    en: 'You are offline — showing the last saved menu'
  };

  function currentLang(){
    const value = localStorage.getItem('RESTBR_LANG_V1') || 'ar';
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function ensureStyle(){
    if (document.getElementById('smOfflineStatusStyle')) return;

    const style = document.createElement('style');
    style.id = 'smOfflineStatusStyle';
    style.textContent = `
      /* The old temporary fallback notice is replaced by this single persistent status. */
      #smOfflineBanner{display:none!important}

      #smOfflineStatus{
        position:fixed;
        z-index:12050;
        top:calc(10px + env(safe-area-inset-top));
        left:50%;
        transform:translate(-50%,-10px);
        width:max-content;
        max-width:min(92vw,460px);
        box-sizing:border-box;
        padding:9px 13px;
        border:1px solid rgba(226,181,94,.34);
        border-radius:999px;
        background:rgba(15,11,7,.94);
        color:#edc879;
        box-shadow:0 12px 34px rgba(0,0,0,.34);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        text-align:center;
        font:700 11px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;
        opacity:0;
        visibility:hidden;
        pointer-events:none;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      #smOfflineStatus.show{
        opacity:1;
        visibility:visible;
        transform:translate(-50%,0);
      }
      @media(max-width:520px){
        #smOfflineStatus{
          width:calc(100% - 24px);
          max-width:420px;
          border-radius:14px;
          font-size:10.5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBanner(){
    ensureStyle();
    let banner = document.getElementById('smOfflineStatus');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'smOfflineStatus';
      banner.setAttribute('role','status');
      banner.setAttribute('aria-live','polite');
      document.body.appendChild(banner);
    }
    return banner;
  }

  function sync(){
    const banner = ensureBanner();
    const offline = navigator.onLine === false;
    banner.textContent = `⚠️ ${TEXT[currentLang()] || TEXT.ar}`;
    banner.classList.toggle('show', offline);
  }

  function start(){
    sync();
    window.addEventListener('offline', sync);
    window.addEventListener('online', sync);

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(sync, 30);
      }
    });

    // Register as early as possible so the offline shell is ready before the user leaves the page.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .catch(error => console.debug('Offline SW:', error?.message || error));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

/* js/supabase-config.js */
// ==========================================
// RESTBR single-store menu — Supabase configuration
// ==========================================

const RESTBR_CONFIG = window.RESTBR_CONFIG || {};
const SUPABASE_URL = String(RESTBR_CONFIG.supabaseUrl || '').trim();
const SUPABASE_PUBLISHABLE_KEY = String(
  RESTBR_CONFIG.supabasePublishableKey || ''
).trim();

const RESTBR_CONFIGURED =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  !/YOUR_PROJECT_REF/i.test(SUPABASE_URL) &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !/YOUR_SUPABASE_PUBLISHABLE_KEY/i.test(SUPABASE_PUBLISHABLE_KEY);

const RESTBR_IS_ADMIN_PATH =
  /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);

const RESTBR_RETAIL_MODE =
  String(RESTBR_CONFIG.businessType || '').trim().toLowerCase() === 'retail' ||
  RESTBR_CONFIG.enableDiningModes === false;

if (!RESTBR_CONFIGURED) {
  console.error(
    'RESTBR setup is incomplete. Add this store Supabase URL and publishable key to js/runtime-config.js.'
  );

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('restbrSetupNotice')) return;
    const notice = document.createElement('div');
    notice.id = 'restbrSetupNotice';
    notice.dir = 'rtl';
    notice.textContent =
      'إعداد القالب غير مكتمل: أضف رابط Supabase والمفتاح العام داخل js/runtime-config.js';
    notice.style.cssText =
      'position:fixed;z-index:99999;inset-inline:12px;top:12px;padding:12px 14px;border:1px solid #f59e0b;border-radius:12px;background:#241607;color:#fff3d0;font:700 13px/1.7 system-ui;text-align:center;box-shadow:0 12px 35px #0008';
    document.body.appendChild(notice);
  }, { once: true });
}

// Create Supabase client.
// Public browsing must never share the same Auth storage/lock with the admin dashboard.
const RESTBR_PROJECT_REF = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0] || 'restbr';
  } catch (_) {
    return 'restbr';
  }
})();

const RESTBR_AUTH_OPTIONS = RESTBR_IS_ADMIN_PATH
  ? {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: `restbr-${RESTBR_PROJECT_REF}-admin-auth-v1`
    }
  : {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `restbr-${RESTBR_PROJECT_REF}-public-auth-v1`
    };

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: RESTBR_AUTH_OPTIONS }
);

if (RESTBR_CONFIGURED) {
  console.log(`✅ RESTBR connected for ${RESTBR_CONFIG.restaurantName || 'Store'}`);
}

(() => {
  const name = String(RESTBR_CONFIG.restaurantName || 'Store').trim();
  const isAdmin = RESTBR_IS_ADMIN_PATH;
  document.title = isAdmin ? `${name} — لوحة الإدارة` : name;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.setAttribute('content', name);
  if (isAdmin) {
    const loginTitle = document.querySelector('.login-brand h1');
    const subtitle = document.getElementById('adminPageSubtitle');
    if (loginTitle) loginTitle.textContent = `${name} Admin`;
    if (subtitle) subtitle.textContent = `${name} Admin`;
  }
})();

// Pasha Baby is Arabic-only. Load one lightweight policy layer instead of
// the former multilingual settings / dashboard translation stack.
(() => {
  const loadArabicOnly = () => {
    if (document.getElementById('pashaArabicOnlyScript')) return;
    const script = document.createElement('script');
    script.id = 'pashaArabicOnlyScript';
    script.src = 'js/pasha-arabic-only.js?v=1.3';
    script.async = false;
    document.head.appendChild(script);
  };

  if (!RESTBR_IS_ADMIN_PATH) {
    loadArabicOnly();
    return;
  }

  const startAfterUnlock = () => {
    if (!document.body || document.body.classList.contains('auth-locked')) return false;
    loadArabicOnly();
    return true;
  };

  const watchForUnlock = () => {
    if (startAfterUnlock()) return;
    const observer = new MutationObserver(() => {
      if (!startAfterUnlock()) return;
      observer.disconnect();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForUnlock, { once: true });
  } else {
    watchForUnlock();
  }
})();

// Public-store only: automatic opening hours.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrRestaurantHoursScript';
  script.src = 'js/restaurant-hours.js?v=1.3';
  script.async = false;
  document.head.appendChild(script);
})();

// Public-store only: use bullets instead of numeric sequencing in WhatsApp order items.
(() => {
  if (RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrWhatsappOrderBulletsScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrWhatsappOrderBulletsScript';
  script.src = 'js/whatsapp-order-bullets.js?v=1.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only sticky toolbar + GLOBAL dashboard light/dark theme.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminThemeToolbarScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminThemeToolbarScript';
  script.src = 'js/admin-theme-toolbar.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: slightly increase all dashboard text without changing layout sizing.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminFontScaleScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminFontScaleScript';
  script.src = 'js/admin-font-scale.js?v=1.3';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only native category filter inside the existing products filter system.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminProductCategoryFilterScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminProductCategoryFilterScript';
  script.src = 'js/admin-product-category-filter.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only tap ordering for product options inside the product editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminOptionOrderScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminOptionOrderScript';
  script.src = 'js/admin-option-order.js?v=1.4';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only: use the current store logo when a product has no image.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminProductImageFallbackScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminProductImageFallbackScript';
  script.src = 'js/admin-product-image-fallback.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();

// Admin-only store opening-hours editor.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminRestaurantHoursScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminRestaurantHoursScript';
  script.src = 'js/admin-restaurant-hours.js?v=1.2';
  script.async = false;
  document.head.appendChild(script);
})();

// Final admin-only day/night theme completion layer for hard-coded components.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminLightThemeCompleteScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminLightThemeCompleteScript';
  script.src = 'js/admin-light-theme-complete.js?v=2.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Pasha Baby admin polish: unified accents, sort controls above long lists,
// one discounts entry point, delete confirmation, and animated option ordering.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('pashaBabyAdminPolishV3Script')) return;

  const script = document.createElement('script');
  script.id = 'pashaBabyAdminPolishV3Script';
  script.src = 'js/pasha-baby-admin-polish-v3.js?v=3.0';
  script.async = false;
  document.head.appendChild(script);
})();

// Final Settings-only bridge: sync legacy Settings internals to the same
// Pasha Baby global day/night theme and remove remaining gold/dark islands.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('pashaBabyAdminSettingsThemeV4Script')) return;

  const script = document.createElement('script');
  script.id = 'pashaBabyAdminSettingsThemeV4Script';
  script.src = 'js/pasha-baby-admin-settings-theme-v4.js?v=4.0';
  script.async = false;
  document.head.appendChild(script);
})();

/* js/unavailable-card-state.js */
(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const inactiveCategoryIds = new Set();

  function transformResult(table, result) {
    if (!result || !Array.isArray(result.data)) return result;

    if (table === 'categories') {
      result.data = result.data.map(row => {
        if (!row || row.id == null) return row;

        const id = String(row.id);
        const visible = row.is_visible !== false;
        const inactive = visible && row.is_active === false;

        if (inactive) {
          inactiveCategoryIds.add(id);
          return {
            ...row,
            // Category policy: inactive + visible means the category stays
            // visible, but every product inside it becomes unavailable.
            is_active: true
          };
        }

        inactiveCategoryIds.delete(id);
        return row;
      });

      return result;
    }

    if (table === 'products') {
      result.data = result.data.map(row => {
        if (!row) return row;

        const visible = row.is_visible !== false;
        const productInactive = visible && row.is_active === false;

        // Product policy: "active" is the master switch. When it is off,
        // keep the original row untouched so app.js filters the product out.
        if (productInactive) return row;

        const categoryInactive =
          visible &&
          row.category_id != null &&
          inactiveCategoryIds.has(String(row.category_id));

        if (!categoryInactive) return row;

        return {
          ...row,
          // The category is inactive but visible: keep this active product in
          // the menu and route it through the existing unavailable state.
          is_available: false
        };
      });
    }

    return result;
  }

  function wrapBuilder(table, builder) {
    if (!builder || (typeof builder !== 'object' && typeof builder !== 'function')) {
      return builder;
    }

    return new Proxy(builder, {
      get(target, prop) {
        if (prop === 'then') {
          return (onFulfilled, onRejected) =>
            target.then(
              value => {
                const transformed = transformResult(table, value);
                return typeof onFulfilled === 'function'
                  ? onFulfilled(transformed)
                  : transformed;
              },
              onRejected
            );
        }

        const value = Reflect.get(target, prop, target);

        if (typeof value !== 'function') return value;

        return (...args) => {
          const next = value.apply(target, args);

          if (
            next &&
            (typeof next === 'object' || typeof next === 'function') &&
            typeof next.then === 'function'
          ) {
            return wrapBuilder(table, next);
          }

          return next;
        };
      }
    });
  }

  function installSupabaseAvailabilityBridge() {
    let client = null;

    try {
      if (typeof supabaseClient !== 'undefined') client = supabaseClient;
    } catch (_) {}

    if (!client) client = window.supabaseClient || null;
    if (!client || typeof client.from !== 'function') return false;
    if (client.__smUnavailableBridgeInstalled) return true;

    const originalFrom = client.from.bind(client);

    client.from = function(table) {
      return wrapBuilder(String(table || ''), originalFrom(table));
    };

    Object.defineProperty(client, '__smUnavailableBridgeInstalled', {
      value: true,
      configurable: true
    });

    return true;
  }

  function installStyles() {
    if (document.getElementById('smUnavailableCardStyles')) return;

    const style = document.createElement('style');
    style.id = 'smUnavailableCardStyles';
    style.textContent = `
      .sm-card.sm-unavailable-card{
        position:relative !important;
        isolation:isolate;
      }

      .sm-card.sm-unavailable-card::after{
        content:"";
        position:absolute;
        inset:0;
        z-index:40;
        border-radius:inherit;
        background:rgba(2,2,2,.58);
        backdrop-filter:grayscale(.58) saturate(.44) brightness(.58);
        -webkit-backdrop-filter:grayscale(.58) saturate(.44) brightness(.58);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.025);
        pointer-events:none;
      }

      .sm-card.sm-unavailable-card .sm-img,
      .sm-card.sm-unavailable-card .sm-info,
      .sm-card.sm-unavailable-card .sm-badges,
      .sm-card.sm-unavailable-card .sm-share-product{
        filter:saturate(.48) brightness(.70);
      }

      .sm-card.sm-unavailable-card .sm-off{
        position:absolute !important;
        z-index:52 !important;
        top:50% !important;
        left:50% !important;
        right:auto !important;
        bottom:auto !important;
        transform:translate(-50%,-50%) !important;
        width:max-content !important;
        max-width:calc(100% - 28px) !important;
        margin:0 !important;
        padding:9px 16px !important;
        border:1px solid rgba(238,199,116,.62) !important;
        border-radius:999px !important;
        background:rgba(8,6,4,.94) !important;
        color:#f2cf82 !important;
        box-shadow:0 10px 30px rgba(0,0,0,.52) !important;
        font-size:11.5px !important;
        font-weight:900 !important;
        line-height:1.35 !important;
        text-align:center !important;
        white-space:nowrap;
        pointer-events:none;
        filter:none !important;
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
      }
    `;

    document.head.appendChild(style);
  }

  function syncCard(card) {
    if (!(card instanceof Element) || !card.matches('.sm-card')) return;
    card.classList.toggle('sm-unavailable-card', !!card.querySelector('.sm-off'));
  }

  function scan(root = document) {
    if (root instanceof Element && root.matches('.sm-card')) syncCard(root);
    root.querySelectorAll?.('.sm-card').forEach(syncCard);
  }

  installSupabaseAvailabilityBridge();
  installStyles();

  function startObserver() {
    scan();

    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.target instanceof Element) {
          const card = record.target.closest?.('.sm-card');
          if (card) syncCard(card);
        }

        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          scan(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();

/* js/app.js */
const I18N = {
  ar: {
    subtitle: "اكتشف منيو {name}",
    location: "موقعنا",
    call: "اتصال",
    whatsapp: "واتساب منيو",
    popular: "الأكثر طلباً",
    fresh: "جديد",
    hot: "حار 🌶",
    offer: "عرض",
    unavailable: "غير متوفر حالياً",
    currency: "د.ع",
    search: "ابحث عن صنف...",
    searchResults: "نتائج البحث",
    noResults: "ما لقينا صنف مطابق",
    share: "مشاركة",
    copied: "تم نسخ الرابط",
    languageLabel: "اختيار اللغة",
    refreshPage: "تحديث الصفحة",
    closeSearch: "إغلاق البحث",
    backToTop: "الرجوع إلى الأعلى"
  },

  ku: {
    subtitle: "مێنیوی {name} ببینە",
    location: "شوێنی مە",
    call: "پەیوەندی",
    whatsapp: "مێنیوی واتساپ",
    popular: "زۆرترین داواکراو",
    fresh: "نوێ",
    hot: "توند 🌶",
    offer: "ئۆفەر",
    unavailable: "بەردەست نییە",
    currency: "د.ع",
    search: "لێگەڕان بۆ بەرهەم...",
    searchResults: "ئەنجامی گەڕان",
    noResults: "هیچ بەرهەمێک نەدۆزرایەوە",
    share: "هاوبەشکردن",
    copied: "لینک کۆپی کرا",
    languageLabel: "هەڵبژاردنی زمان",
    refreshPage: "نوێکردنەوەی پەڕە",
    closeSearch: "داخستنی لێگەڕان",
    backToTop: "گەڕانەوە بۆ سەرەوە"
  },

  en: {
    subtitle: "Discover {name} Menu",
    location: "Location",
    call: "Call",
    whatsapp: "WhatsApp Menu",
    popular: "Most Popular",
    fresh: "New",
    hot: "Spicy 🌶",
    offer: "Offer",
    unavailable: "Currently unavailable",
    currency: "IQD",
    search: "Search menu...",
    searchResults: "Search results",
    noResults: "No matching items",
    share: "Share",
    copied: "Link copied",
    languageLabel: "Choose language",
    refreshPage: "Refresh page",
    closeSearch: "Close search",
    backToTop: "Back to top"
  }
};


let DB = null;
let lang = localStorage.getItem("RESTBR_LANG_V1") || "ar";
let active = "";
let searchQuery = "";
let searchTracked = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const safeArray=value=>{if(Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return Array.isArray(p)?p:[]}catch(_){return []}}return []};
const safeObject=value=>{if(value&&typeof value==="object"&&!Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return p&&typeof p==="object"&&!Array.isArray(p)?p:{}}catch(_){return {}}}return {}};
const escapeUi=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const safeConfiguredUrl=value=>typeof window.RESTBR_SAFE_CONFIGURED_URL==="function"?window.RESTBR_SAFE_CONFIGURED_URL(value):"";
const safeMediaUrl=(value,fallback="")=>{const safe=typeof window.RESTBR_SAFE_MEDIA_URL==="function"?window.RESTBR_SAFE_MEDIA_URL(value):"";return safe||(fallback&&typeof window.RESTBR_SAFE_MEDIA_URL==="function"?window.RESTBR_SAFE_MEDIA_URL(fallback):fallback)||""};
const actionLabel=(item,currentLang=lang)=>String(item?.[`label_${currentLang}`]??item?.label_ar??item?.label_en??"").trim();



function txt(obj) {
  if (!obj) return "";
  return obj[lang] || obj.ar || obj.en || "";
}


function money(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) return "";

  return (
    Number(value).toLocaleString("en-US") +
    " " +
    I18N[lang].currency
  );
}


function installMenuDiscoveryUI(){

  if(document.getElementById("smDiscoveryStyle"))return;

  const style=document.createElement("style");
  style.id="smDiscoveryStyle";

  style.textContent=`
    .sm-search-wrap{
      width:min(calc(100% - 4px),680px);
      margin:12px auto 4px;
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      gap:7px;
      padding:7px 9px;
      border:1px solid rgba(232,184,98,.18);
      border-radius:14px;
      background:rgba(10,7,4,.68);
      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);
      box-sizing:border-box;
    }

    .sm-search-icon{
      font-size:14px;
      opacity:.8;
    }

    .sm-search-input{
      width:100%;
      min-width:0;
      border:0;
      outline:0;
      background:transparent;
      color:#f4efe9;
      font:inherit;
      font-size:16px;
      line-height:1.4;
    }

    .sm-search-input::placeholder{
      color:#817971;
    }

    .sm-search-clear{
      width:28px;
      height:28px;
      display:grid;
      place-items:center;
      border:0;
      border-radius:9px;
      background:rgba(255,255,255,.05);
      color:#a69e95;
      font-size:15px;
    }

    .sm-search-count{
      width:min(calc(100% - 14px),680px);
      margin:5px auto 2px;
      color:#8e867d;
      font-size:9px;
      text-align:center;
      min-height:14px;
    }

    .sm-section-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:8px;
    }

    .sm-section-head .sm-section-title{
      margin:0 !important;
    }

    .sm-card .sm-badges,
    .sm-card .sm-badge,
    .sm-card .sm-off{
      position:relative;
      z-index:30;
    }

    .sm-share-category,
    .sm-share-product{
      display:grid;
      place-items:center;
      border:1px solid rgba(232,184,98,.2);
      background:rgba(12,8,5,.76);
      color:#e8b862;
      border-radius:10px;
      cursor:pointer;
    }

    .sm-share-category{
      min-width:34px;
      height:34px;
      padding:0 8px;
      font-size:14px;
    }

    .sm-card{
      position:relative;
    }

    .sm-share-product{
      position:absolute;
      z-index:45;
      top:7px;
      inset-inline-start:7px;
      width:29px;
      height:29px;
      font-size:12px;
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      pointer-events:auto;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }

    .sm-search-category{
      color:#91877d;
      font-size:8.5px;
      line-height:1.3;
      margin:-1px 0 4px;
    }

    .sm-deep-highlight{
      animation:smDeepPulse 1.8s ease;
    }

    @keyframes smDeepPulse{
      0%,100%{box-shadow:inherit}
      30%,65%{box-shadow:0 0 0 2px rgba(232,184,98,.65),0 12px 35px rgba(0,0,0,.35)}
    }

    .sm-offline-banner{
      position:fixed;
      z-index:85;
      left:50%;
      bottom:calc(82px + env(safe-area-inset-bottom));
      transform:translateX(-50%);
      width:max-content;
      max-width:88%;
      padding:7px 11px;
      border:1px solid rgba(232,184,98,.2);
      border-radius:999px;
      background:rgba(10,7,4,.9);
      color:#d6aa5b;
      font-size:9px;
      text-align:center;
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }
  `;

  document.head.appendChild(style);
}


function installV44PolishStyles(){
  if(document.getElementById("smV44PolishStyles"))return;

  const style=document.createElement("style");
  style.id="smV44PolishStyles";
  style.textContent=`
    .sm-header{position:relative!important}

    .sm-header-tools{
      position:absolute;
      z-index:70;
      top:calc(8px + env(safe-area-inset-top));
      right:10px;
      display:flex;
      align-items:center;
      gap:7px;
      direction:ltr;
    }

    .sm-header-icon-btn{
      position:relative;
      width:38px;
      height:38px;
      display:grid;
      place-items:center;
      padding:0;
      border:1px solid rgba(232,184,98,.22);
      border-radius:12px;
      background:rgba(8,5,3,.54);
      color:#e8b862;
      box-shadow:0 8px 22px rgba(0,0,0,.16);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      font:inherit;
      font-size:17px;
      cursor:pointer;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }

    .sm-header-icon-btn:active{transform:scale(.94)}

    #smRefreshBtn.is-refreshing svg{
      animation:smHeaderRefreshSpin .62s linear infinite;
    }

    @keyframes smHeaderRefreshSpin{
      to{transform:rotate(360deg)}
    }

    .sm-lang-code{
      position:absolute;
      right:-3px;
      bottom:-3px;
      min-width:17px;
      height:17px;
      display:grid;
      place-items:center;
      padding:0 3px;
      border:1px solid rgba(232,184,98,.34);
      border-radius:999px;
      background:#171008;
      color:#e8b862;
      font-size:7px;
      line-height:1;
      font-weight:900;
      box-sizing:border-box;
    }

    .sm-lang-glyph{
      width:24px;
      height:24px;
      position:relative;
      display:grid;
      place-items:center;
      border:1px solid rgba(232,184,98,.55);
      border-radius:50%;
      background:
        radial-gradient(circle at 35% 30%,rgba(232,184,98,.18),transparent 45%),
        rgba(22,14,8,.72);
      box-shadow:
        inset 0 0 0 2px rgba(232,184,98,.045),
        0 0 15px rgba(216,169,88,.08);
    }

    .sm-lang-glyph b{
      position:absolute;
      right:4px;
      top:2px;
      color:#efc86f;
      font-size:12px;
      line-height:1;
      font-weight:900;
    }

    .sm-lang-glyph i{
      position:absolute;
      left:4px;
      bottom:3px;
      color:#d3c5b4;
      font-size:8px;
      line-height:1;
      font-weight:900;
      font-style:normal;
    }

    .sm-header-icon-btn svg{
      width:19px;
      height:19px;
      display:block;
      stroke:#e8b862;
      stroke-width:1.8;
      fill:none;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    #smLangs.sm-lang-menu{
      position:absolute;
      z-index:75;
      top:45px;
      right:0;
      width:132px;
      display:none !important;
      gap:5px;
      padding:6px;
      border:1px solid rgba(232,184,98,.2);
      border-radius:12px;
      background:rgba(8,5,3,.92);
      box-shadow:0 16px 38px rgba(0,0,0,.34);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      direction:rtl;
      box-sizing:border-box;
    }

    #smLangs.sm-lang-menu.open{display:grid!important}

    .sm-lang-menu button{
      width:100%;
      min-height:34px;
      border:0;
      border-radius:8px;
      background:transparent;
      color:#d8d1c9;
      font:inherit;
      font-size:11px;
      cursor:pointer;
    }

    .sm-lang-menu button.active{
      background:rgba(232,184,98,.12);
      color:#e8b862;
      font-weight:900;
    }

    .sm-header-tools .sm-search-wrap{
      position:absolute!important;
      z-index:76;
      top:45px;
      right:0;
      width:min(330px,calc(100vw - 20px))!important;
      margin:0!important;
      padding:7px!important;
      display:none!important;
      grid-template-columns:1fr!important;
      gap:5px!important;
      border-radius:12px!important;
      background:rgba(8,5,3,.94)!important;
      box-shadow:0 16px 38px rgba(0,0,0,.34);
      box-sizing:border-box;
    }

    .sm-header-tools .sm-search-wrap.open{display:grid!important}

    .sm-search-row{
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      gap:7px;
      min-width:0;
    }

    .sm-header-tools .sm-search-input{
      min-width:0;
      width:100%;
      font-size:16px!important;
    }

    .sm-header-tools .sm-search-count{
      width:100%!important;
      margin:0!important;
      min-height:0!important;
      padding:0 4px 1px;
      font-size:8px!important;
      text-align:center;
      box-sizing:border-box;
    }

    .sm-header .sm-logo-wrap{overflow:visible!important}

    .sm-header h1::after{
      content:"";
      display:block;
      width:clamp(92px,28vw,150px);
      height:1px;
      margin:10px auto 7px;
      background:
        linear-gradient(
          90deg,
          transparent 0%,
          rgba(196,139,52,.45) 18%,
          #efc86f 50%,
          rgba(196,139,52,.45) 82%,
          transparent 100%
        );
      box-shadow:0 0 10px rgba(232,184,98,.16);
    }

    #smSubtitle{
      letter-spacing:.15px;
      text-shadow:0 1px 8px rgba(0,0,0,.28);
    }

    .sm-header .sm-logo{
      animation:smLogoWaveV44 4.6s ease-in-out infinite;
      transform-origin:50% 68%;
      will-change:transform;
    }

    @keyframes smLogoWaveV44{
      0%,100%{transform:translateY(0) rotate(0deg) scale(1)}
      22%{transform:translateY(-3px) rotate(-1.2deg) scale(1.014)}
      48%{transform:translateY(1px) rotate(.9deg) scale(.998)}
      74%{transform:translateY(-2px) rotate(1.1deg) scale(1.01)}
    }

    @media(prefers-reduced-motion:reduce){
      .sm-header .sm-logo{animation:none!important}
    }

    .sm-news-ticker{
      direction:rtl;
      width:min(calc(100% - 18px),680px);
      height:30px;
      display:none;
      align-items:stretch;
      margin:0 auto 9px;
      border:1px solid rgba(232,184,98,.22);
      border-radius:9px;
      background:rgba(12,8,5,.48);
      overflow:hidden;
      box-sizing:border-box;
      box-shadow:0 7px 22px rgba(0,0,0,.12);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }

    .sm-news-label{
      flex:0 0 auto;
      min-width:43px;
      display:grid;
      place-items:center;
      padding:0 7px;
      background:linear-gradient(135deg,#edc46d,#c98e2d);
      color:#171008;
      font-size:8px;
      font-weight:1000;
      white-space:nowrap;
    }

    .sm-news-window{
      flex:1 1 auto;
      min-width:0;
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:flex-start;
      direction:rtl;
    }

    .sm-news-track{
      display:flex;
      align-items:center;
      direction:rtl;
      width:max-content;
      min-width:max-content;
      white-space:nowrap;
      will-change:transform;
      animation:smNewsTickerV44 var(--sm-news-duration,16s) linear infinite;
    }

    .sm-news-copy{
      display:inline-flex;
      align-items:center;
      gap:18px;
      min-width:max-content;
      padding:0 8px;
      color:#e4d9cd;
      font-size:9.5px;
      font-weight:700;
    }

    .sm-news-dot{color:#d7a54c;font-size:8px}

    @keyframes smNewsTickerV44{
      from{transform:translateX(0)}
      to{transform:translateX(-50%)}
    }

    @media(max-width:650px){
      .sm-header-tools{
        top:calc(7px + env(safe-area-inset-top));
        right:8px;
        gap:6px;
      }

      .sm-header-icon-btn{
        width:36px;
        height:36px;
        border-radius:11px;
        font-size:16px;
      }

      .sm-lang-menu,
      .sm-header-tools .sm-search-wrap{top:43px}
    }
  `;

  document.head.appendChild(style);
}


function ensureHeaderTools(){
  const header=document.querySelector(".sm-header");
  if(!header)return null;

  let tools=document.getElementById("smHeaderTools");
  if(!tools){
    tools=document.createElement("div");
    tools.id="smHeaderTools";
    tools.className="sm-header-tools";
    header.appendChild(tools);
  }

  let searchToggle=document.getElementById("smSearchToggle");
  if(!searchToggle){
    searchToggle=document.createElement("button");
    searchToggle.id="smSearchToggle";
    searchToggle.type="button";
    searchToggle.className="sm-header-icon-btn";
    searchToggle.innerHTML=`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="5.5"></circle>
        <path d="M14.8 14.8 20 20"></path>
      </svg>
    `;
    searchToggle.setAttribute("aria-label","Search");
    tools.appendChild(searchToggle);
  }

  let langToggle=document.getElementById("smLangToggle");
  if(!langToggle){
    langToggle=document.createElement("button");
    langToggle.id="smLangToggle";
    langToggle.type="button";
    langToggle.className="sm-header-icon-btn";
    langToggle.setAttribute("aria-label","Language");
    tools.appendChild(langToggle);
  }

  let refreshToggle=document.getElementById("smRefreshBtn");
  if(!refreshToggle){
    refreshToggle=document.createElement("button");
    refreshToggle.id="smRefreshBtn";
    refreshToggle.type="button";
    refreshToggle.className="sm-header-icon-btn";
    refreshToggle.innerHTML=`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11a8 8 0 1 0-2.3 5.7"></path>
        <path d="M20 4v7h-7"></path>
      </svg>
    `;
    refreshToggle.setAttribute("aria-label","تحديث الصفحة");
    refreshToggle.setAttribute("title","تحديث الصفحة");
    tools.insertBefore(refreshToggle,searchToggle);
  }

  if(!refreshToggle.dataset.bound){
    refreshToggle.dataset.bound="1";
    refreshToggle.addEventListener("click",()=>{
      refreshToggle.classList.add("is-refreshing");
      refreshToggle.disabled=true;
      window.setTimeout(()=>window.location.reload(),120);
    });
  }

  const langHolder=document.getElementById("smLangs");
  if(langHolder && langHolder.parentElement!==tools){
    tools.appendChild(langHolder);
  }

  return tools;
}


function setLanguageMenuOpen(open){
  const menu=document.getElementById("smLangs");
  if(menu)menu.classList.toggle("open",!!open);
}


function setSearchPanelOpen(open,{clear=false}={}){
  const wrap=document.getElementById("smSearchWrap");
  if(!wrap)return;

  if(clear){
    const input=document.getElementById("smSearchInput");
    if(input)input.value="";
    searchQuery="";
    searchTracked=false;
    render();
    updateSearchCount();
  }

  wrap.classList.toggle("open",!!open);

  if(open){
    setLanguageMenuOpen(false);
    setTimeout(()=>document.getElementById("smSearchInput")?.focus(),40);
  }
}


function normalizeSearchText(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/[أإآ]/g,"ا")
    .replace(/ة/g,"ه")
    .replace(/ى/g,"ي")
    .replace(/\s+/g," ")
    .trim();
}


function productMatchesSearch(product,query){
  const q=normalizeSearchText(query);

  if(!q)return true;

  const parts=[
    product.name?.ar,
    product.name?.ku,
    product.name?.en,
    product.category?.ar,
    product.category?.ku,
    product.category?.en,
    ...(product.options||[]).flatMap(option=>[
      option.ar,
      option.ku,
      option.en
    ])
  ];

  return normalizeSearchText(
    parts.filter(Boolean).join(" ")
  ).includes(q);
}


function ensureSearchUI(){
  const tools=ensureHeaderTools();
  if(!tools)return;

  let wrap=document.getElementById("smSearchWrap");

  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="smSearchWrap";
    wrap.className="sm-search-wrap";

    wrap.innerHTML=`
      <div class="sm-search-row">
        <span class="sm-search-icon">⌕</span>
        <input id="smSearchInput" class="sm-search-input" type="search" autocomplete="off" enterkeyhint="search">
        <button id="smSearchClear" class="sm-search-clear" type="button" aria-label="Close search">×</button>
      </div>
      <div id="smSearchCount" class="sm-search-count"></div>
    `;

    tools.appendChild(wrap);

    const input=document.getElementById("smSearchInput");
    const clear=document.getElementById("smSearchClear");

    input.addEventListener("input",()=>{
      const next=input.value.trim();
      const wasEmpty=!searchQuery;
      searchQuery=next;

      if(next && wasEmpty && !searchTracked){
        searchTracked=true;
        trackMenuEvent("search_use");
      }

      if(!next)searchTracked=false;

      render();
      updateSearchCount();
    });

    clear.addEventListener("click",()=>{
      setSearchPanelOpen(false,{clear:true});
    });
  }

  const searchToggle=document.getElementById("smSearchToggle");
  if(searchToggle && !searchToggle.dataset.bound){
    searchToggle.dataset.bound="1";
    searchToggle.addEventListener("click",event=>{
      event.stopPropagation();
      const open=!wrap.classList.contains("open");
      setSearchPanelOpen(open);
    });
  }

  const langToggle=document.getElementById("smLangToggle");
  if(langToggle && !langToggle.dataset.bound){
    langToggle.dataset.bound="1";
    langToggle.addEventListener("click",event=>{
      event.stopPropagation();
      const menu=document.getElementById("smLangs");
      const open=!menu?.classList.contains("open");
      setSearchPanelOpen(false);
      setLanguageMenuOpen(open);
    });
  }

  updateSearchUiLanguage();
}

function updateSearchUiLanguage(){
  const input=document.getElementById("smSearchInput");
  if(input)input.placeholder=I18N[lang].search;

  const toggle=document.getElementById("smSearchToggle");
  if(toggle){
    toggle.setAttribute(
      "aria-label",
      lang==="en" ? "Search menu" : lang==="ku" ? "لێگەڕان" : "البحث في المنيو"
    );
  }

  const refresh=document.getElementById("smRefreshBtn");
  if(refresh){
    const label=I18N[lang].refreshPage;
    refresh.setAttribute("aria-label",label);
    refresh.setAttribute("title",label);
  }

  const clear=document.getElementById("smSearchClear");
  if(clear)clear.setAttribute("aria-label",I18N[lang].closeSearch);

  const language=document.getElementById("smLangToggle");
  if(language)language.setAttribute("aria-label",I18N[lang].languageLabel);

  const top=document.getElementById("smTopBtn");
  if(top)top.setAttribute("aria-label",I18N[lang].backToTop);
}


function updateSearchCount(count=null){
  const holder=document.getElementById("smSearchCount");
  if(!holder)return;

  if(!searchQuery){
    holder.textContent="";
    return;
  }

  const total=count===null
    ? DB.products.filter(p=>productMatchesSearch(p,searchQuery)).length
    : count;

  holder.textContent=
    lang==="en"
      ? `${total} result${total===1?"":"s"}`
      : lang==="ku"
        ? `${total} ئەنجام`
        : `${total} نتيجة`;
}


function makeDeepLink(type,id){
  const cleanId=String(id||"").trim();
  const url=new URL(window.location.origin+window.location.pathname);
  url.searchParams.set(type,cleanId);
  if(type==="product")url.hash=`product-${cleanId}`;
  return url.toString();
}

async function shareMenuLink(url,title,eventType,refId){
  trackMenuEvent(eventType,refId);

  try{
    if(navigator.share){
      await navigator.share({
        title:title||document.title,
        url
      });
      return;
    }
  }catch(error){
    if(error?.name==="AbortError")return;
  }

  try{
    await navigator.clipboard.writeText(url);
  }catch(_){
    const area=document.createElement("textarea");
    area.value=url;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  const toast=document.getElementById("smCartToast");

  if(toast){
    toast.textContent=I18N[lang].copied;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),1600);
  }
}


function setUrlForCategory(categoryId){
  const url=new URL(window.location.href);

  url.searchParams.delete("product");
  url.searchParams.delete("q");

  if(categoryId){
    url.searchParams.set("category",String(categoryId));
  }else{
    url.searchParams.delete("category");
  }

  history.replaceState(
    {},
    "",
    url.pathname+url.search
  );
}


function applyDeepLinkBeforeRender(){
  const params=new URLSearchParams(window.location.search);

  const productId=params.get("product");
  const categoryId=params.get("category");
  const q=params.get("q");

  if(q){
    searchQuery=q;
  }

  if(productId){
    const product=DB.products.find(p=>String(p.id)===String(productId));

    if(product?.category){
      active=String(product.category.id||"");
      return;
    }
  }

  if(categoryId){
    const category=categories().find(c=>String(c.id)===String(categoryId));

    if(category){
      active=String(category.id||"");
    }
  }
}


function scrollToDeepLink(){
  const productId=String(new URLSearchParams(window.location.search).get("product")||"").trim();
  if(!productId)return;
  const locate=()=>{
    const card=[...document.querySelectorAll("[data-product-card]")].find(
      element=>String(element.dataset.productCard)===productId
    )||document.getElementById(`product-${productId}`);
    if(!card)return false;
    card.scrollIntoView({behavior:"smooth",block:"center"});
    card.classList.add("sm-deep-highlight");
    setTimeout(()=>card.classList.remove("sm-deep-highlight"),2400);
    return true;
  };
  [80,250,650,1200,2200].forEach(delay=>setTimeout(locate,delay));
}

function trackMenuEvent(type,refId="",languageValue=lang){
  if(
    typeof supabaseClient==="undefined" ||
    !supabaseClient
  ) return;

  supabaseClient
    .rpc(
      "track_menu_event",
      {
        p_event_type:String(type||""),
        p_ref_id:String(refId||""),
        p_language:String(languageValue||"")
      }
    )
    .then(({error})=>{
      if(error){
        console.debug("Analytics skipped:",error.message||error);
      }
    })
    .catch(()=>{});
}


function trackPageViewOnce(){
  const day=new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:"Asia/Baghdad",
      year:"numeric",
      month:"2-digit",
      day:"2-digit"
    }
  ).format(new Date());

  const key=`restbr:view:${day}`;

  if(sessionStorage.getItem(key))return;

  sessionStorage.setItem(key,"1");
  trackMenuEvent("menu_view");
}


function saveMenuOfflineCache(db){
  try{
    localStorage.setItem(
      "RESTBR_MENU_OFFLINE_CACHE_V1",
      JSON.stringify({
        saved_at:Date.now(),
        db
      })
    );
  }catch(_){}
}


function loadMenuOfflineCache(){
  try{
    const raw=localStorage.getItem("RESTBR_MENU_OFFLINE_CACHE_V1");
    if(!raw)return null;

    const parsed=JSON.parse(raw);

    if(
      !parsed?.db ||
      !Array.isArray(parsed.db.products)
    ) return null;

    return parsed.db;
  }catch(_){
    return null;
  }
}


function showOfflineDataBanner(){
  if(document.getElementById("smOfflineBanner"))return;

  const el=document.createElement("div");
  el.id="smOfflineBanner";
  el.className="sm-offline-banner";
  el.textContent=
    lang==="en"
      ?"Offline mode — showing last saved menu"
      :lang==="ku"
        ?"دۆخی ئۆفلاین — دوایین مینیو نیشان دەدرێت"
        :"وضع أوفلاين — نعرض آخر نسخة محفوظة";

  document.body.appendChild(el);

  setTimeout(()=>el.remove(),4500);
}


function registerPwa(){
  if(!("serviceWorker" in navigator))return;

  window.addEventListener(
    "load",
    ()=>{
      navigator.serviceWorker
        .register("./sw.js")
        .catch(error=>console.debug("SW:",error));
    },
    {once:true}
  );
}


const UI_DESIGN_DEFAULTS={card_height:160,image_percent:50,card_glass_transparency:0,card_radius:18,card_gap:10,info_padding:10,product_name_font:14,option_font:10.5,price_font:11,section_title_font:21,add_button_height:30,add_button_font:10,category_height:41,category_font:12,top_action_height:48,top_action_font:11,cart_width:180,cart_height:56,cart_font:13,cart_horizontal:50,cart_bottom:16,logo_size:84,menu_title_font:26,subtitle_font:12,search_height:46,search_font:16,footer_title_font:17,footer_action_font:10.5,footer_phone_font:17};
function uiDesignValue(k){const v=Number(DB?.restaurant?.uiDesign?.[k]);return Number.isFinite(v)?v:UI_DESIGN_DEFAULTS[k]}
function applyUiDesignSettings(){
  if(!DB)return;
  const root=document.documentElement;
  ['card_height','card_radius','card_gap','info_padding','product_name_font','option_font','price_font','section_title_font','add_button_height','add_button_font','category_height','category_font','top_action_height','top_action_font','cart_width','cart_height','cart_font','cart_bottom','logo_size','menu_title_font','subtitle_font','search_height','search_font','footer_title_font','footer_action_font','footer_phone_font'].forEach(k=>root.style.setProperty(`--sm-ui-${k.replaceAll('_','-')}`,`${uiDesignValue(k)}px`));
  root.style.setProperty('--sm-ui-image-percent',`${uiDesignValue('image_percent')}%`);
  root.style.setProperty('--sm-ui-info-percent',`${100-uiDesignValue('image_percent')}%`);

  const cardGlassTransparency=
    Math.max(
      0,
      Math.min(
        100,
        uiDesignValue('card_glass_transparency')
      )
    );

  /*
    V4.5.2:
    0% = EXACT footer glass alphas (.91 / .88)
    100% = fully transparent.
    New key intentionally ignores the old V4.4/V4.5 transparency value.
  */
  const glassFactor=
    1-(cardGlassTransparency/100);

  root.style.setProperty(
    '--sm-ui-card-glass-a1',
    String(
      Math.round(.91*glassFactor*1000)/1000
    )
  );

  root.style.setProperty(
    '--sm-ui-card-glass-a2',
    String(
      Math.round(.88*glassFactor*1000)/1000
    )
  );

  root.style.setProperty('--sm-ui-cart-horizontal',`${uiDesignValue('cart_horizontal')}%`);
  let style=document.getElementById('smUiDesignRuntime');if(!style){style=document.createElement('style');style.id='smUiDesignRuntime';document.head.appendChild(style)}
  style.textContent=`
    @media(max-width:768px){
      .sm-grid{gap:var(--sm-ui-card-gap,10px)!important}
      html[dir="ltr"] .sm-card{grid-template-columns:var(--sm-ui-image-percent,50%) var(--sm-ui-info-percent,50%)!important}
      html[dir="rtl"] .sm-card{grid-template-columns:var(--sm-ui-info-percent,50%) var(--sm-ui-image-percent,50%)!important}
      .sm-card{
        position:relative!important;
        isolation:isolate!important;
        overflow:hidden!important;

        grid-template-rows:var(--sm-ui-card-height,160px)!important;
        height:var(--sm-ui-card-height,160px)!important;
        min-height:var(--sm-ui-card-height,160px)!important;
        max-height:var(--sm-ui-card-height,160px)!important;

        border-radius:var(--sm-ui-card-radius,18px)!important;
      }

      /*
        V4.5.3:
        Background / border / blur / shadow are NOT hard-coded here.
        They are copied from the live rendered footer with inline !important
        by syncProductGlassFromLiveFooter().
      */

      .sm-card::before,
      .sm-card::after{
        content:none!important;
        display:none!important;
        background:none!important;
        background-image:none!important;
        box-shadow:none!important;
      }

      .sm-card .sm-img,.sm-card .sm-info{
        height:var(--sm-ui-card-height,160px)!important;
        min-height:var(--sm-ui-card-height,160px)!important;
        max-height:var(--sm-ui-card-height,160px)!important;
      }

      .sm-card .sm-info,
      .sm-cold-card .sm-info{
        position:relative!important;
        z-index:10!important;

        padding:var(--sm-ui-info-padding,10px)!important;

        background:transparent!important;
        background-image:none!important;

        box-shadow:none!important;

        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      /* Remove every old text-side glass layer.
         Only the full .sm-card glass remains. */
      .sm-card .sm-info::before,
      .sm-card .sm-info::after,
      .sm-cold-card .sm-info::before,
      .sm-cold-card .sm-info::after{
        content:none!important;
        display:none!important;
        background:none!important;
        background-image:none!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      .sm-card .sm-img{
        position:relative!important;
        z-index:5!important;

        width:100%!important;
        min-width:0!important;
        max-width:100%!important;

        overflow:hidden!important;
        background:transparent!important;
      }

      /* No separate image overlay; the card itself provides the glass/reflection. */
      .sm-card .sm-img::before,
      .sm-card .sm-img::after{
        content:none!important;
        display:none!important;
        background:none!important;
      }

      .sm-card .sm-img img,.sm-card .sm-product-image{
        position:relative!important;
        z-index:1;
        display:block!important;
        width:100%!important;
        height:100%!important;
        min-width:0!important;
        min-height:0!important;
        max-width:none!important;
        max-height:none!important;
        object-fit:cover!important;
        object-position:center center!important;

        filter:
          saturate(1.025)
          contrast(1.018)
          brightness(.985)!important;

        margin:0!important;
        padding:0!important;
        transform:none!important;
      }

      .sm-options-scroll{
        flex:1 1 auto;
        min-height:0;
        max-height:100%;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
        overscroll-behavior:contain;
        scrollbar-width:thin;
        scrollbar-color:rgba(226,181,94,.48) transparent;
        padding-inline-end:3px;
        margin-inline-end:-3px;
      }

      .sm-options-scroll::-webkit-scrollbar{width:3px}
      .sm-options-scroll::-webkit-scrollbar-thumb{
        background:rgba(226,181,94,.48);
        border-radius:999px;
      }
      .sm-options-scroll .sm-option:last-child{border-bottom:0}
      .sm-card .sm-info{
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        min-width:0!important;
        overflow:hidden!important;
      }

      .sm-card .sm-name{
        flex:0 0 auto;
        font-size:var(--sm-ui-product-name-font,14px)!important;
      }

      .sm-card .sm-option{
        font-size:var(--sm-ui-option-font,10.5px)!important;
      }
      .sm-card .sm-price{font-size:var(--sm-ui-price-font,11px)!important}
      .sm-section-title{font-size:var(--sm-ui-section-title-font,21px)!important}
      .sm-card .sm-choose-options,.sm-card .sm-direct-add{min-height:var(--sm-ui-add-button-height,30px)!important;font-size:var(--sm-ui-add-button-font,10px)!important}
      #smCats .sm-cat,.sm-cats .sm-cat{height:var(--sm-ui-category-height,41px)!important;min-height:var(--sm-ui-category-height,41px)!important;font-size:var(--sm-ui-category-font,12px)!important}
      .sm-quick-actions a,#smActions a{min-height:var(--sm-ui-top-action-height,48px)!important;font-size:var(--sm-ui-top-action-font,11px)!important}
      .sm-quick-actions a b,#smActions a b{font-size:var(--sm-ui-top-action-font,11px)!important}
      .sm-logo,.sm-intro-logo-wrap{width:var(--sm-ui-logo-size,84px)!important;height:var(--sm-ui-logo-size,84px)!important}
      .sm-header h1,.sm-hero h1,.sm-title{font-size:var(--sm-ui-menu-title-font,26px)!important}
      #smSubtitle,#smHeroSubtitle,.sm-subtitle{font-size:var(--sm-ui-subtitle-font,12px)!important}
      .sm-search-wrap{min-height:var(--sm-ui-search-height,46px)!important}
      .sm-search-input{font-size:max(16px,var(--sm-ui-search-font,16px))!important}
      .sm-footer h2,.sm-footer-brand strong{font-size:var(--sm-ui-footer-title-font,17px)!important}
      .sm-footer-main-actions a,.sm-footer-actions a{font-size:var(--sm-ui-footer-action-font,10.5px)!important}
      .sm-footer-phone,.sm-phone{font-size:var(--sm-ui-footer-phone-font,17px)!important}
    }`;
}

// ==========================================
// V4.5.3 — LIVE FOOTER GLASS ENGINE
// ==========================================

let footerGlassObserver=null;
let footerGlassRaf=0;


function multiplyRgbaAlpha(cssText,factor){

  if(
    !cssText ||
    cssText==="none"
  ){
    return cssText;
  }


  const cleanFactor=
    Math.max(
      0,
      Math.min(
        1,
        Number(factor)
      )
    );


  // rgba(12, 10, 7, 0.54)
  let result=
    String(cssText).replace(
      /rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/gi,
      (_,r,g,b,a)=>{
        const next=
          Math.max(
            0,
            Math.min(
              1,
              Number(a)*cleanFactor
            )
          );

        return `rgba(${r}, ${g}, ${b}, ${Math.round(next*1000)/1000})`;
      }
    );


  // rgba modern syntax: rgba(12 10 7 / 0.54)
  result=
    result.replace(
      /rgba\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\/\s*([0-9.]+)\s*\)/gi,
      (_,r,g,b,a)=>{
        const next=
          Math.max(
            0,
            Math.min(
              1,
              Number(a)*cleanFactor
            )
          );

        return `rgba(${r} ${g} ${b} / ${Math.round(next*1000)/1000})`;
      }
    );


  return result;
}


function footerGlassSnapshot(){

  const footer=
    document.querySelector(
      ".sm-footer"
    );


  if(!footer)return null;


  const style=
    getComputedStyle(
      footer
    );


  return {
    backgroundImage:
      style.backgroundImage,

    backgroundColor:
      style.backgroundColor,

    borderTop:
      style.borderTop,

    borderRight:
      style.borderRight,

    borderBottom:
      style.borderBottom,

    borderLeft:
      style.borderLeft,

    boxShadow:
      style.boxShadow,

    backdropFilter:
      style.backdropFilter ||
      "none",

    webkitBackdropFilter:
      style.webkitBackdropFilter ||
      style.getPropertyValue(
        "-webkit-backdrop-filter"
      ) ||
      "none"
  };
}


function syncProductGlassFromLiveFooter(){

  if(!DB)return;


  const snapshot=
    footerGlassSnapshot();


  if(!snapshot)return;


  const transparency=
    Math.max(
      0,
      Math.min(
        100,
        uiDesignValue(
          "card_glass_transparency"
        )
      )
    );


  /*
    0%   = exact live footer.
    100% = same footer recipe, but background alpha becomes 0.
    Blur, border and shadow stay footer-style.
  */
  const factor=
    1-(transparency/100);


  const backgroundImage=
    multiplyRgbaAlpha(
      snapshot.backgroundImage,
      factor
    );


  const backgroundColor=
    multiplyRgbaAlpha(
      snapshot.backgroundColor,
      factor
    );


  document
    .querySelectorAll(
      "#smMenu .sm-card"
    )
    .forEach(card=>{

      /*
        INLINE !important deliberately beats:
        - style.css
        - category-specific .sm-*-card backgrounds
        - old mobile CSS
        - any previous runtime style
      */
      card.style.setProperty(
        "background-image",
        backgroundImage || "none",
        "important"
      );

      card.style.setProperty(
        "background-color",
        backgroundColor || "transparent",
        "important"
      );


      card.style.setProperty(
        "border-top",
        snapshot.borderTop,
        "important"
      );

      card.style.setProperty(
        "border-right",
        snapshot.borderRight,
        "important"
      );

      card.style.setProperty(
        "border-bottom",
        snapshot.borderBottom,
        "important"
      );

      card.style.setProperty(
        "border-left",
        snapshot.borderLeft,
        "important"
      );


      card.style.setProperty(
        "box-shadow",
        snapshot.boxShadow,
        "important"
      );


      card.style.setProperty(
        "backdrop-filter",
        snapshot.backdropFilter,
        "important"
      );

      card.style.setProperty(
        "-webkit-backdrop-filter",
        snapshot.webkitBackdropFilter,
        "important"
      );


      // Absolutely no second background behind the text.
      const info=
        card.querySelector(
          ".sm-info"
        );

      if(info){
        info.style.setProperty(
          "background",
          "transparent",
          "important"
        );

        info.style.setProperty(
          "background-image",
          "none",
          "important"
        );

        info.style.setProperty(
          "box-shadow",
          "none",
          "important"
        );

        info.style.setProperty(
          "backdrop-filter",
          "none",
          "important"
        );

        info.style.setProperty(
          "-webkit-backdrop-filter",
          "none",
          "important"
        );
      }
    });


  document.documentElement.dataset.smGlassSource=
    "live-footer";
}


function scheduleFooterGlassSync(){

  cancelAnimationFrame(
    footerGlassRaf
  );


  footerGlassRaf=
    requestAnimationFrame(
      syncProductGlassFromLiveFooter
    );
}


function initFooterGlassSync(){

  const menu=
    document.getElementById(
      "smMenu"
    );


  if(!menu)return;


  footerGlassObserver?.disconnect();


  footerGlassObserver=
    new MutationObserver(
      scheduleFooterGlassSync
    );


  footerGlassObserver.observe(
    menu,
    {
      childList:true,
      subtree:true
    }
  );


  window.addEventListener(
    "resize",
    scheduleFooterGlassSync,
    {
      passive:true
    }
  );


  scheduleFooterGlassSync();

  setTimeout(
    scheduleFooterGlassSync,
    80
  );

  setTimeout(
    scheduleFooterGlassSync,
    350
  );
}


function installMenuCardPolish(){
  if(document.getElementById("smMenuCardPolishV38"))return;

  const style=document.createElement("style");
  style.id="smMenuCardPolishV38";
  style.textContent=`
    @media(max-width:768px){
      .sm-card{
        grid-template-rows:160px !important;
        height:160px !important;
        min-height:160px !important;
        max-height:160px !important;
      }
      .sm-card .sm-img,.sm-card .sm-info{
        height:160px !important;
        min-height:160px !important;
        max-height:160px !important;
      }
      .sm-card .sm-info{padding:11px 10px !important}
      .sm-card .sm-name{font-size:14px !important;line-height:1.35 !important;margin-bottom:5px !important}
      .sm-card .sm-option{font-size:10.5px !important;line-height:1.45 !important}
      .sm-card .sm-price{font-size:11px !important;line-height:1.35 !important}
      .sm-card .sm-choose-options,.sm-card .sm-direct-add{min-height:30px !important;font-size:10px !important}
      .sm-schedule-note{margin-top:4px;font-size:8.5px;line-height:1.45;color:rgba(232,184,98,.82)}
    }
  `;
  document.head.appendChild(style);
}

function iraqMinutesNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Baghdad",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  }).formatToParts(new Date());

  const h=Number(parts.find(p=>p.type==="hour")?.value||0);
  const m=Number(parts.find(p=>p.type==="minute")?.value||0);
  return h*60+m;
}

function timeToMinutes(value){
  const match=String(value||"").match(/^(\d{1,2}):(\d{2})/);
  if(!match)return null;
  const h=Number(match[1]),m=Number(match[2]);
  if(!Number.isFinite(h)||!Number.isFinite(m))return null;
  return h*60+m;
}

function scheduledAvailability(product){
  if(product?.availability_schedule_enabled!==true){
    return true;
  }

  const from=timeToMinutes(product.available_from);
  const to=timeToMinutes(product.available_to);

  if(from===null||to===null||from===to){
    return true;
  }

  const now=iraqMinutesNow();

  return from<to
    ? now>=from&&now<to
    : now>=from||now<to;
}

function productScheduleText(product){
  if(
    product?.availability_schedule_enabled!==true ||
    !product.available_from ||
    !product.available_to
  ) return "";

  const from=String(product.available_from).slice(0,5);
  const to=String(product.available_to).slice(0,5);

  if(lang==="en")return `Available ${from}–${to}`;
  if(lang==="ku")return `بەردەستە ${from}–${to}`;
  return `متوفر ${from}–${to}`;
}

function refreshScheduledAvailability(){
  if(!DB?.products)return;

  DB.products.forEach(product=>{
    const scheduleUnavailable=
      product.availability_schedule_enabled===true &&
      scheduledAvailability(product)===false;

    const categoryScheduleUnavailable=
      product.category?.availability_schedule_enabled===true &&
      scheduledAvailability(product.category)===false;

    product.badges.unavailable=
      product.manualUnavailable===true ||
      categoryScheduleUnavailable ||
      scheduleUnavailable;

    if(categoryScheduleUnavailable){
      const from=String(product.category.available_from||"").slice(0,5);
      const to=String(product.category.available_to||"").slice(0,5);

      product.scheduleText=
        lang==="en"
          ? `Category available ${from}–${to}`
          : lang==="ku"
            ? `بەشەکە بەردەستە ${from}–${to}`
            : `القسم متوفر ${from}–${to}`;
    }else{
      product.scheduleText=
        productScheduleText(product);
    }
  });

  render();
}


function restaurantNameForLang(targetLang=lang) {

  const restaurant =
    DB?.restaurant || {};


  if (targetLang === "ar") {
    return String(
      restaurant.nameAr ??
      restaurant.name ??
      restaurant.nameEn ??
      ""
    ).trim();
  }


  if (targetLang === "ku") {
    return String(
      restaurant.nameKu ??
      restaurant.nameAr ??
      restaurant.name ??
      restaurant.nameEn ??
      ""
    ).trim();
  }


  return String(
    restaurant.nameEn ??
    restaurant.name ??
    restaurant.nameAr ??
    ""
  ).trim();
}


function formatRestaurantTemplate(value,targetLang=lang) {

  let text =
    String(value ?? "");

  const currentName =
    restaurantNameForLang(targetLang);


  text =
    text.replaceAll(
      "{name}",
      currentName
    );


  // Backward compatibility belongs to each restaurant's configuration so the
  // shared core never carries the identity of a specific restaurant.
  safeArray(window.RESTBR_CONFIG?.legacyRestaurantNames).forEach(value => {
    const alias = String(value || "").trim().slice(0,80);
    if (!alias) return;

    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const flags = /[A-Za-z]/.test(alias) ? "gi" : "g";

    text = text.replace(new RegExp(escaped,flags),currentName);
  });


  return text
    .replace(/\s{2,}/g," ")
    .trim();
}


/* ========================================
   CATEGORY EFFECTS
======================================== */

function effect(category) {

  const k = category?.ar || "";

  const effects = {

    "فطور صباحي": "sm-breakfast-card",

    "منسف": "sm-mansaf-card",

    "الأطباق الشرقية": "sm-eastern-card",
    "الاطباق الشرقية": "sm-eastern-card",

    "مشاوي": "sm-grill-card",

    "قلية": "sm-qalya-card",

    "الوجبات الغربية": "sm-western-card",

    "بركر": "sm-burger-card",

    "بيتزا": "sm-pizza-card",

    "السندويشات": "sm-sandwich-card",
    "سندويشات": "sm-sandwich-card",

    /* ❄️ Cold drinks */
    "مشروبات باردة": "sm-cold-card",
    "مشروبات بارده": "sm-cold-card",
    "المشروبات الباردة": "sm-cold-card",
    "المشروبات بارده": "sm-cold-card",

    "القهوة": "sm-coffee-card",

    "القهوة الباردة": "sm-icedcoffee-card",
    "القهوة بارده": "sm-icedcoffee-card",

    "موهيتو": "sm-mojito-card",

    "سموذي": "sm-smoothie-card",

    "ميلك شيك": "sm-milkshake-card",

    "حلويات": "sm-dessert-card"
  };

  return effects[k] || "";
}


/* ========================================
   CATEGORIES
======================================== */

function categories() {

  const map = new Map();

  DB.products.forEach(product => {

    const categoryKey =
      String(product.category?.id || "");

    if (!categoryKey) return;

    if (!map.has(categoryKey)) {
      map.set(
        categoryKey,
        product.category
      );
    }

  });

  return [...map.values()].sort(
    (a, b) =>
      Number(a.order || 999) -
      Number(b.order || 999)
  );
}


function renderCats() {

  const rail = $("#smCats");
  const sentinel = $("#smCatsSentinel");

  if (!rail) return;


  const show =
    DB?.restaurant?.display?.categoryNav !== false;


  rail.style.display =
    show
      ? ""
      : "none";


  if (sentinel && !show) {
    sentinel.style.height = "0";
  }


  if (!show) {
    rail.classList.remove("fixed");
    catsFixed = false;
    return;
  }


  const savedScroll = rail.scrollLeft;

  rail.innerHTML = categories()
    .map(category => `
      <button
        class="sm-cat ${String(category.id) === String(active) ? "active" : ""}"
        data-cat="${escapeUi(category.id)}"
        data-cat-id="${escapeUi(category.id)}">
        ${escapeUi(txt(category))}
      </button>
    `)
    .join("");


  requestAnimationFrame(() => {
    rail.scrollLeft = savedScroll;
  });
}


/* ========================================
   BADGES
======================================== */

function badges(product) {

  const b = product.badges || {};

  let html = "";

  if (b.popular) {

    html += `
      <span class="sm-display-badge gold">
        ⭐ ${I18N[lang].popular}
      </span>
    `;

  }

  if (b.new) {

    html += `
      <span class="sm-display-badge">
        ✨ ${I18N[lang].fresh}
      </span>
    `;

  }

  if (b.hot) {

    html += `
      <span class="sm-display-badge red">
        🔥 ${I18N[lang].hot}
      </span>
    `;

  }

  if (b.offer) {

    html += `
      <span class="sm-display-badge offer">
        🏷 ${I18N[lang].offer}
      </span>
    `;

  }

  if (!html) return "";

  return `
    <div class="sm-badges">
      ${html}
    </div>
  `;
}


/* ========================================
   PRODUCT CARD
======================================== */

function productCard(product) {

  const b = product.badges || {};

  const classes = [
    "sm-card",
    "sm-reveal",
    effect(product.category),

    b.popular
      ? "sm-popular-card"
      : "",

    b.hot
      ? "sm-hot-card"
      : ""
  ]
    .filter(Boolean)
    .join(" ");


  const productOptions = product.options || [];
  const hasVariants = productOptions.length > 1;
  const productId = escapeUi(product.id);
  const productName = escapeUi(txt(product.name));
  const productImageOriginal = safeMediaUrl(
    product.image,
    "assets/restaurant-placeholder.svg"
  );
  const productImage = escapeUi(
    typeof window.RESTBR_OPTIMIZED_MEDIA_URL === "function"
      ? window.RESTBR_OPTIMIZED_MEDIA_URL(productImageOriginal, "product-card") || productImageOriginal
      : productImageOriginal
  );
  const productFullImage = escapeUi(productImageOriginal);

  const optionRows = productOptions
    .map((option, optionIndex) => {

      const optionName = escapeUi(txt(option));

      return `
        <div class="sm-option">
          <span>${optionName}</span>

          <div class="sm-option-buy">
            <b class="sm-price">${money(option.price)}</b>
            ${""}
          </div>
        </div>
      `;
    })
    .join("");

  const options =
    optionRows
      ? `<div class="sm-options-scroll">${optionRows}</div>`
      : "";

  const variantButton = b.unavailable ? "" : hasVariants
    ? `<button class="sm-choose-options" type="button" data-product-id="${productId}">
         <span>+</span><b>${lang === "en" ? "Choose" : lang === "ku" ? "هەڵبژێرە" : "اختيار"}</b>
       </button>`
    : `<button class="sm-direct-add" type="button" data-product-id="${productId}" data-option-index="0">
         <span>+</span><b>${lang === "en" ? "Add to cart" : lang === "ku" ? "زیادکردن بۆ سەبەتە" : "إضافة للسلة"}</b>
       </button>`;


  return `
    <article
      id="product-${productId}"
      class="${classes}"
      data-product-card="${productId}"
    >

      <button
        class="sm-share-product"
        type="button"
        data-share-product="${productId}"
        aria-label="${I18N[lang].share}">
        ↗
      </button>

      ${badges(product)}

      ${
        b.unavailable
          ? `
            <div class="sm-off">
              ${I18N[lang].unavailable}
            </div>
          `
          : ""
      }

      <div class="sm-img">

        <img
          class="sm-product-image"
          data-full-image="${productFullImage}"
          data-original-image="${productFullImage}"
          data-product-name="${productName}"
          loading="lazy"
          decoding="async"
          src="${productImage}"
          alt="${productName}"
        >

      </div>

      <div class="sm-info">

        <div class="sm-name">
          ${productName}
        </div>

        ${
          searchQuery
            ? `<div class="sm-search-category">${escapeUi(txt(product.category))}</div>`
            : ""
        }

        ${options}

        ${
          b.unavailable && product.scheduleText
            ? `<div class="sm-schedule-note">${escapeUi(product.scheduleText)}</div>`
            : ""
        }

        ${variantButton}

      </div>

    </article>
  `;
}


/* ========================================
   MENU
======================================== */

function render() {

  const menu=$("#smMenu");

  if(!menu||!DB)return;


  if(searchQuery){

    const products=DB.products.filter(
      product=>productMatchesSearch(product,searchQuery)
    );

    updateSearchCount(products.length);


    if(!products.length){
      menu.innerHTML=`
        <section class="sm-section">
          <div class="analytics-empty" style="padding:30px 12px;text-align:center;color:#9a9188;">
            ${I18N[lang].noResults}
          </div>
        </section>
      `;
      return;
    }


    menu.innerHTML=`
      <section class="sm-section">

        <div class="sm-section-head">
          <h2 class="sm-section-title">
            ${I18N[lang].searchResults}
          </h2>
        </div>

        <div class="sm-grid">
          ${products.map(productCard).join("")}
        </div>

      </section>
    `;

    watchCards();
    scheduleFooterGlassSync();
    return;
  }


  const products=DB.products.filter(
    product=>
      product.category &&
      String(product.category.id)===String(active)
  );


  if(!products.length){
    menu.innerHTML="";
    return;
  }


  const category=products[0].category;


  menu.innerHTML=`
    <section class="sm-section">

      <div class="sm-section-head">
        <h2 class="sm-section-title">
          ${escapeUi(txt(category))}
        </h2>

        <button
          class="sm-share-category"
          type="button"
          data-share-category="${escapeUi(category.id)}"
          aria-label="${I18N[lang].share}">
          ↗
        </button>
      </div>

      <div class="sm-grid">
        ${products.map(productCard).join("")}
      </div>

    </section>
  `;


  watchCards();
  scheduleFooterGlassSync();
}

/* ========================================
   LANGUAGES
======================================== */

function renderLanguages() {
  ensureHeaderTools();

  const holder=$("#smLangs");
  const toggle=document.getElementById("smLangToggle");

  if(!holder)return;

  const show=
    DB?.restaurant?.display?.languageSwitch !== false;

  holder.className="sm-lang-menu";
  holder.removeAttribute("style");

  if(toggle){
    toggle.style.display=
      show
        ? "grid"
        : "none";

    toggle.innerHTML=`
      <span class="sm-lang-glyph" aria-hidden="true">
        <b>ع</b>
        <i>A</i>
      </span>
      <small class="sm-lang-code">${lang.toUpperCase()}</small>
    `;
  }

  if(!show){
    holder.style.setProperty(
      "display",
      "none",
      "important"
    );
    holder.innerHTML="";
    return;
  }

  holder.classList.remove("open");

  holder.innerHTML=`
    <button type="button" data-lang="ar" class="${lang==="ar"?"active":""}">عربي</button>
    <button type="button" data-lang="ku" class="${lang==="ku"?"active":""}">کوردی</button>
    <button type="button" data-lang="en" class="${lang==="en"?"active":""}">English</button>
  `;
}

/* ========================================
   TOP ACTIONS
======================================== */

function renderActions(){const holder=$("#smActions");if(!holder||!DB)return;const r=DB.restaurant||{},q=r.quickActions||{},a=[];const add=(icon,label,url)=>{const safe=safeConfiguredUrl(url);if(safe)a.push({icon,label,url:safe})};if(q.location?.enabled!==false&&String(r.location||"").trim()&&r.location!=="#")add("📍",q.location?.label?.[lang]||I18N[lang].location,r.location);if(q.call?.enabled!==false&&String(r.phone||"").trim())add("☎",q.call?.label?.[lang]||I18N[lang].call,"tel:"+String(r.phone).replace(/[^\d+().-]/g,""));if(q.whatsapp?.enabled!==false&&String(r.whatsapp||"").trim())add("💬",q.whatsapp?.label?.[lang]||I18N[lang].whatsapp,r.whatsapp);safeArray(r.customTopActions).forEach(i=>{const l=actionLabel(i);if(i?.enabled!==false&&l)add(String(i.icon||"🔗"),l,i?.url)});holder.className="sm-quick-actions";holder.innerHTML=a.map(i=>`<a href="${escapeUi(i.url)}" ${/^https?:/i.test(i.url)?'target="_blank" rel="noopener noreferrer"':''}><span>${escapeUi(i.icon)}</span><b>${escapeUi(i.label)}</b></a>`).join("");if(a.length){holder.style.display="grid";holder.style.gridTemplateColumns=`repeat(${a.length},minmax(0,1fr))`}else holder.style.display="none"}

/* ========================================
   APPLY LANGUAGE
======================================== */

function applyLang() {

  document.documentElement.lang = lang;

  document.documentElement.dir =
    lang === "en"
      ? "ltr"
      : "rtl";


  const subtitle = $("#smSubtitle");

  if (subtitle) {
    const customSubtitle =
      DB?.restaurant?.subtitle?.[lang];

    const sourceText =
      customSubtitle === null ||
      customSubtitle === undefined
        ? I18N[lang].subtitle
        : customSubtitle;

    subtitle.textContent =
      formatRestaurantTemplate(
        sourceText,
        lang
      );

    subtitle.style.display =
      DB?.restaurant?.display?.subtitle !== false &&
      subtitle.textContent
        ? ""
        : "none";
  }


  applyRestaurantBranding();
  updateRestaurantLanguageUI();

  updateSearchUiLanguage();
  renderLanguages();
  renderActions();
  renderCats();
  render();
}


/* ========================================
   CARD REVEAL
======================================== */

let observer = null;


if ("IntersectionObserver" in window) {

  observer =
    new IntersectionObserver(

      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add(
              "sm-visible"
            );

            observer.unobserve(
              entry.target
            );
          }

        });

      },

      {
        rootMargin:
          "0px 0px -6% 0px",

        threshold: 0.05
      }
    );
}


function watchCards() {

  $$(".sm-card:not(.watched)")
    .forEach(card => {

      card.classList.add(
        "watched"
      );


      if (observer) {

        observer.observe(card);

      } else {

        card.classList.add(
          "sm-visible"
        );
      }

    });
}


/* ========================================
   CLICK EVENTS
======================================== */

document.addEventListener(
  "click",
  event => {


    if(
      !event.target.closest("#smLangToggle") &&
      !event.target.closest("#smLangs")
    ){
      setLanguageMenuOpen(false);
    }


    const languageButton =
      event.target.closest(
        "[data-lang]"
      );


    if (languageButton) {

      lang =
        languageButton.dataset.lang;

      localStorage.setItem(
        "RESTBR_LANG_V1",
        lang
      );

      trackMenuEvent("language_change","",lang);

      applyLang();
      setLanguageMenuOpen(false);

      return;
    }


    const productShare=
      event.target.closest(
        "[data-share-product]"
      );

    if(productShare){
      event.preventDefault();
      event.stopImmediatePropagation();

      const id=String(productShare.dataset.shareProduct||"").trim();
      const product=DB?.products?.find(p=>String(p.id)===id);
      if(!id||!product)return;

      void shareMenuLink(
        makeDeepLink("product",id),
        txt(product.name)||document.title,
        "share_product",
        id
      );

      return;
    }


    const categoryShare=
      event.target.closest(
        "[data-share-category]"
      );

    if(categoryShare){
      event.preventDefault();
      event.stopPropagation();

      const id=categoryShare.dataset.shareCategory;
      const category=categories().find(c=>String(c.id)===String(id));

      shareMenuLink(
        makeDeepLink("category",id),
        category?txt(category):document.title,
        "share_category",
        id
      );

      return;
    }


    const categoryButton =
      event.target.closest(
        ".sm-cat"
      );


    if (
      categoryButton &&
      categoryButton.dataset.cat !== active
    ) {

      const rail = $("#smCats");

      const savedScroll =
        rail
          ? rail.scrollLeft
          : 0;


      active =
        categoryButton.dataset.cat;

      searchQuery="";
      const searchInput=document.getElementById("smSearchInput");
      if(searchInput)searchInput.value="";
      updateSearchCount();

      const categoryId=
        categoryButton.dataset.catId || "";

      setUrlForCategory(categoryId);
      trackMenuEvent("category_view",categoryId);


      renderCats();
      render();


      requestAnimationFrame(() => {

        if (rail) {
          rail.scrollLeft =
            savedScroll;
        }

      });
    }

  }
);


/* ========================================
   FOOTER
======================================== */

function setupFooter() {

  if (!DB) return;


  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};

  const footer =
    document.querySelector(".sm-footer");


  if (footer) {
    footer.style.display =
      display.footer === false
        ? "none"
        : "";
  }


  const location =
    $("#smFooterLocation");

  const call =
    $("#smFooterCall");

  const whatsapp =
    $("#smFooterWhatsapp");

  const quickActions =
    restaurant.quickActions || {};


  if (location) {
    location.textContent =
      quickActions.location?.label?.[lang] ||
      I18N[lang].location;
  }


  if (call) {
    call.textContent =
      quickActions.call?.label?.[lang] ||
      I18N[lang].call;
  }


  if (whatsapp) {
    whatsapp.textContent =
      quickActions.whatsapp?.label?.[lang] ||
      I18N[lang].whatsapp;
  }


  const safeLocation =
    safeConfiguredUrl(restaurant.location);

  const safeCall =
    safeConfiguredUrl(
      "tel:" + String(restaurant.phone || "").replace(/[^\d+().-]/g, "")
    );

  const safeWhatsapp =
    safeConfiguredUrl(restaurant.whatsapp);

  const hasLocation =
    !!safeLocation &&
    safeLocation !== "#";

  const hasPhone =
    String(restaurant.phone || "").trim();

  const hasWhatsapp =
    String(restaurant.whatsappNumber || "").trim();


  if (location) {
    if (safeLocation) location.href = safeLocation;
    else location.removeAttribute("href");

    const show =
      display.footerLocationButton !== false &&
      !!hasLocation;

    location.hidden = !show;
    location.style.display = show ? "" : "none";
  }


  if (call) {
    if (safeCall) call.href = safeCall;
    else call.removeAttribute("href");

    const show =
      display.footerCallButton !== false &&
      !!hasPhone;

    call.hidden = !show;
    call.style.display = show ? "" : "none";
  }


  if (whatsapp) {
    if (safeWhatsapp) whatsapp.href = safeWhatsapp;
    else whatsapp.removeAttribute("href");

    const show =
      display.footerWhatsappButton !== false &&
      !!hasWhatsapp;

    whatsapp.hidden = !show;
    whatsapp.style.display = show ? "" : "none";
  }


  const facebook =
    $("#smFacebook");

  const snapchat =
    $("#smSnapchat");

  const tiktok =
    $("#smTikTok");

  const instagram =
    $("#smInstagram");


  function applySocialLink(element,url,enabled) {

    if (!element) return;

    const clean =
      safeConfiguredUrl(url);

    const show =
      display.footerSocials !== false &&
      enabled !== false &&
      !!clean;

    if (show) {
      element.href = clean;
      if (/^https?:/i.test(clean)) {
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
      element.hidden = false;
      element.style.display = "";
    } else {
      element.removeAttribute("href");
      element.hidden = true;
      element.style.display = "none";
    }
  }


  applySocialLink(
    facebook,
    restaurant.social?.facebook,
    restaurant.socialEnabled?.facebook
  );

  applySocialLink(
    snapchat,
    restaurant.social?.snapchat,
    restaurant.socialEnabled?.snapchat
  );

  applySocialLink(
    tiktok,
    restaurant.social?.tiktok,
    restaurant.socialEnabled?.tiktok
  );

  applySocialLink(
    instagram,
    restaurant.social?.instagram,
    restaurant.socialEnabled?.instagram
  );


  const socialsWrap =
    document.querySelector(".sm-footer-socials, .sm-footer-social");

  if (socialsWrap) {
    socialsWrap.style.display =
      display.footerSocials === false
        ? "none"
        : "";
  }
  const footerActionsParent=location?.parentElement||call?.parentElement||whatsapp?.parentElement||document.querySelector(".sm-footer-actions");
  if(footerActionsParent){footerActionsParent.querySelectorAll(".sm-custom-footer-action").forEach(el=>el.remove());safeArray(restaurant.customFooterActions).forEach(item=>{const label=actionLabel(item),url=safeConfiguredUrl(item?.url);if(item?.enabled===false||!label||!url)return;const link=document.createElement("a");link.className=(location?.className||call?.className||whatsapp?.className||"")+" sm-custom-footer-action";link.href=url;if(/^https?:/i.test(url)){link.target="_blank";link.rel="noopener noreferrer"}const icon=document.createElement("span"),text=document.createElement("b");icon.textContent=String(item.icon||"🔗");text.textContent=label;link.append(icon,text);footerActionsParent.appendChild(link)})}
  const socialParent=instagram?.parentElement||facebook?.parentElement||tiktok?.parentElement||snapchat?.parentElement||document.querySelector(".sm-footer-socials, .sm-footer-social");
  if(socialParent){socialParent.querySelectorAll(".sm-custom-social-link").forEach(el=>el.remove());safeArray(restaurant.customSocialLinks).forEach(item=>{const url=safeConfiguredUrl(item?.url),name=String(item?.name||"Social").trim();if(item?.enabled===false||!url)return;const link=document.createElement("a");link.className=(instagram?.className||facebook?.className||"sm-social-link")+" sm-custom-social-link";link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.title=name;link.setAttribute("aria-label",name);const icon=document.createElement("span");icon.style.cssText="display:grid;place-items:center;min-width:1.25em;min-height:1.25em;font-size:1.05em";icon.textContent=String(item.icon||"🔗");link.appendChild(icon);socialParent.appendChild(link)})}

}


/* ========================================
   LANGUAGE-AWARE RESTAURANT UI
======================================== */

function updateRestaurantLanguageUI() {

  if (!DB) return;

  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};


  const footerLocation =
    document.querySelector(
      ".sm-footer-location, .sm-footer-brand span"
    );

  if (footerLocation) {
    const text =
      restaurant.footerLocation?.[lang] ??
      restaurant.footerLocation?.ar ??
      "";

    footerLocation.textContent =
      text;

    footerLocation.style.display =
      display.footerLocation !== false &&
      String(text).trim()
        ? ""
        : "none";
  }


  let announcement =
    document.getElementById(
      "smAnnouncement"
    );


  if (!announcement) {

    announcement =
      document.createElement("div");

    announcement.id =
      "smAnnouncement";

    announcement.className=
      "sm-news-ticker";


    const target =
      document.querySelector(
        ".sm-cats-wrap"
      ) ||
      document.getElementById(
        "smCatsSentinel"
      );


    if (target?.parentNode) {
      target.parentNode.insertBefore(
        announcement,
        target
      );
    } else {
      document.body.appendChild(
        announcement
      );
    }
  }


  const announcementText =
    restaurant.announcement?.[lang] ??
    restaurant.announcement?.ar ??
    "";


  const showAnnouncement =
    restaurant.announcementEnabled === true &&
    String(announcementText).trim();


  if(showAnnouncement){
    const label=lang==="en" ? "NEWS" : lang==="ku" ? "نوێ" : "عاجل";
    const safeText=escapeUi(String(announcementText));
    const duration=Math.max(6,Math.min(16,Math.round(String(announcementText).length*.11)));

    announcement.style.setProperty("--sm-news-duration",`${duration}s`);

    announcement.innerHTML=`
      <span class="sm-news-label">${label}</span>
      <div class="sm-news-window">
        <div class="sm-news-track">
          <span class="sm-news-copy" dir="auto">${safeText}<i class="sm-news-dot">●</i></span>
          <span class="sm-news-copy" dir="auto" aria-hidden="true">${safeText}<i class="sm-news-dot">●</i></span>
        </div>
      </div>
    `;

    announcement.style.display="flex";
  }else{
    announcement.innerHTML="";
    announcement.style.display="none";
  }
}


/* ========================================
   RESTAURANT BRANDING
======================================== */

function saveBrandCache(){

  if(!DB?.restaurant)return;

  const restaurant=
    DB.restaurant;

  try{
    localStorage.setItem(
      "RESTBR_BRAND_CACHE_V1",
      JSON.stringify({
        saved_at:Date.now(),
        restaurantKey:String(window.RESTBR_RESTAURANT_KEY||""),
        nameAr:restaurant.nameAr ?? "",
        nameKu:restaurant.nameKu ?? "",
        nameEn:restaurant.nameEn ?? "",
        logo:safeMediaUrl(restaurant.logo)
      })
    );
  }catch(_){}
}


function applyRestaurantBranding() {

  if (!DB) return;

  const restaurant =
    DB.restaurant || {};

  const display =
    restaurant.display || {};

  const currentName =
    restaurantNameForLang(lang);

  const englishName =
    restaurantNameForLang("en");


  document.title =
    currentName
      ? currentName + " | مستلزمات الأطفال في دهوك"
      : "باشا بيبي | مستلزمات الأطفال في دهوك";


  const originalLogo =
    safeMediaUrl(restaurant.logo);

  const logo =
    typeof window.RESTBR_OPTIMIZED_MEDIA_URL === "function"
      ? window.RESTBR_OPTIMIZED_MEDIA_URL(originalLogo, "logo") || originalLogo
      : originalLogo;


  [
    ...document.querySelectorAll(
      ".sm-intro-logo, #smLogo, .sm-logo, .sm-logo img"
    )
  ].forEach(img => {

    if (!img) return;

    const show =
      display.logo !== false &&
      !!logo;

    img.style.display =
      show
        ? ""
        : "none";

    img.style.visibility =
      show
        ? "visible"
        : "hidden";

    if (show) {
      img.dataset.originalImage = originalLogo;
      img.onerror = () => {
        if (originalLogo && img.getAttribute("src") !== originalLogo) {
          img.src = originalLogo;
        }
      };
      img.src = logo;
      img.alt = currentName || "Restaurant";
    }
  });


  document
    .querySelectorAll(".sm-logo-wrap")
    .forEach(el => {
      el.style.display =
        display.logo !== false &&
        !!logo
          ? ""
          : "none";
    });


  const introBrand =
    document.querySelector(
      ".sm-intro-brand"
    );

  if (introBrand) {
    introBrand.textContent =
      currentName;

    introBrand.style.display =
      currentName
        ? ""
        : "none";
  }


  const menuTitle =
    document.querySelector(
      ".sm-header h1, .sm-hero h1"
    );

  if (menuTitle) {

    const genericTitle =
      lang === "ar"
        ? "المنيو"
        : lang === "ku"
          ? "مینیو"
          : "MENU";

    const title =
      currentName
        ? (
            lang === "ar"
              ? "منيو " + currentName
              : lang === "ku"
                ? "مینیوی " + currentName
                : (englishName || currentName) + " MENU"
          )
        : genericTitle;


    menuTitle.textContent =
      title;

    menuTitle.style.display =
      display.menuTitle !== false
        ? ""
        : "none";
  }


  const footerTitle =
    document.querySelector(
      ".sm-footer h2, .sm-footer-brand strong"
    );

  if (footerTitle) {
    footerTitle.textContent =
      currentName;

    footerTitle.style.display =
      display.footerBrand !== false &&
      !!currentName
        ? ""
        : "none";
  }


  const footerPhone =
    document.querySelector(
      ".sm-footer-phone, .sm-phone"
    );

  if (footerPhone) {
    const phoneText =
      footerPhone.querySelector?.("bdi") ||
      footerPhone;

    if (phoneText) {
      phoneText.textContent =
        restaurant.phone || "";
    }

    footerPhone.style.display =
      display.footerPhone !== false &&
      String(restaurant.phone || "").trim()
        ? ""
        : "none";
  }


  const footerCopy =
    document.querySelector(
      ".sm-footer-copy"
    );

  if (footerCopy) {

    footerCopy.textContent =
      currentName
        ? (
            currentName +
            " — All Rights Reserved " +
            new Date().getFullYear() +
            " ©"
          )
        : (
            "All Rights Reserved " +
            new Date().getFullYear() +
            " ©"
          );

    footerCopy.style.display =
      display.footerCopy !== false
        ? ""
        : "none";
  }


  setupFooter();
}


/* ========================================
   BACKGROUND VIDEO
======================================== */

function setupBackground() {

  if (!DB) return;


  const video =
    $("#smBgVideo");


  if (!video) return;


  const enabled =
    DB.restaurant?.display?.backgroundVideo !== false;


  const url =
    safeMediaUrl(DB.restaurant?.backgroundVideo);


  if (!enabled || !url) {
    video.pause?.();
    video.removeAttribute("src");
    video.style.display = "none";
    return;
  }


  video.style.display = "";
  video.src = url;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;


  const promise =
    video.play();


  if (
    promise &&
    typeof promise.catch === "function"
  ) {

    promise.catch(() => {

      const resume = () => {

        video
          .play()
          .catch(() => {});

        document.removeEventListener(
          "touchstart",
          resume
        );

        document.removeEventListener(
          "click",
          resume
        );
      };


      document.addEventListener(
        "touchstart",
        resume,
        {
          once: true,
          passive: true
        }
      );


      document.addEventListener(
        "click",
        resume,
        {
          once: true
        }
      );

    });
  }
}


/* ========================================
   INTRO
======================================== */

function setupIntro() {

  const intro=
    $("#smIntro");

  if(!intro)return;


  if(
    DB?.restaurant?.display?.intro===false
  ){
    intro.style.display="none";
    return;
  }


  const alreadySeen=
    sessionStorage.getItem(
      "RESTBR_INTRO_SEEN_V1"
    );


  if(alreadySeen){
    intro.style.display="none";
    return;
  }


  sessionStorage.setItem(
    "RESTBR_INTRO_SEEN_V1",
    "1"
  );


  const totalDuration=
    Math.max(
      400,
      Math.min(
        3000,
        Number(
          DB?.restaurant?.introDurationMs
        ) || 900
      )
    );


  const bornAt=
    Number(
      window.__smIntroBornAt
    ) || Date.now();


  const elapsed=
    Math.max(
      0,
      Date.now()-bornAt
    );


  const remaining=
    Math.max(
      0,
      totalDuration-elapsed
    );


  const fadeDelay=
    Math.max(
      0,
      remaining-280
    );


  setTimeout(()=>{
    intro.classList.add("hide");
  },fadeDelay);


  setTimeout(()=>{
    intro.style.display="none";
  },remaining+80);
}

/* ========================================
   STICKY CATEGORIES
======================================== */

let catsFixed = false;
let savedCatsX = 0;


function pinCategories() {

  const cats =
    $("#smCats");

  const sentinel =
    $("#smCatsSentinel");


  if (
    !cats ||
    !sentinel ||
    catsFixed
  ) return;


  savedCatsX =
    cats.scrollLeft;


  sentinel.style.height =
    Math.ceil(
      cats.getBoundingClientRect().height
    ) + "px";


  cats.classList.add(
    "fixed"
  );


  cats.scrollLeft =
    savedCatsX;


  catsFixed = true;
}


function unpinCategories() {

  const cats =
    $("#smCats");

  const sentinel =
    $("#smCatsSentinel");


  if (
    !cats ||
    !sentinel ||
    !catsFixed
  ) return;


  savedCatsX =
    cats.scrollLeft;


  cats.classList.remove(
    "fixed"
  );


  sentinel.style.height =
    "1px";


  cats.scrollLeft =
    savedCatsX;


  catsFixed = false;
}


/* ========================================
   SCROLL EFFECTS
======================================== */

function scrollEffects() {

  const root =
    document.documentElement;


  const max =
    root.scrollHeight -
    root.clientHeight;


  const progress =
    $("#smProgress");


  if (progress) {

    progress.style.width =
      (
        max
          ? root.scrollTop /
            max *
            100
          : 0
      ) + "%";
  }


  const sentinel =
    $("#smCatsSentinel");


  if (sentinel) {

    if (
      !catsFixed &&
      sentinel
        .getBoundingClientRect()
        .top <= 0
    ) {

      pinCategories();

    }


    if (
      catsFixed &&
      window.scrollY <=
        sentinel.offsetTop
    ) {

      unpinCategories();

    }
  }


  const topButton =
    $("#smTopBtn");


  if (topButton) {

    const allowed =
      DB?.restaurant?.display?.backToTop !== false;

    topButton.classList.toggle(
      "show",
      allowed &&
      window.scrollY > 520
    );

    if (!allowed) {
      topButton.style.display = "none";
    } else {
      topButton.style.display = "";
    }
  }
}


window.addEventListener(
  "scroll",
  scrollEffects,
  {
    passive: true
  }
);


/* ========================================
   BACK TO TOP
======================================== */

const topButton =
  $("#smTopBtn");


if (topButton) {

  topButton.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );
}


/* ========================================
   SUPABASE MENU LOADER
======================================== */

async function loadMenuFromSupabase() {

  if (
    typeof supabaseClient === "undefined" ||
    !supabaseClient
  ) {
    throw new Error("Supabase client is not available");
  }

  console.log("🔄 Loading RESTBR menu from Supabase...");


  /* =========================
     RESTAURANT SETTINGS
  ========================= */

  const {
    data: settingsData,
    error: settingsError
  } = await supabaseClient
    .from("restaurant_settings")
    .select("*")
    .order("updated_at", {
      ascending: false
    })
    .limit(1);


  if (settingsError) {
    console.warn(
      "Restaurant settings error:",
      settingsError
    );
  }


  const settings =
    settingsData?.[0] || {};


  /* =========================
     CATEGORIES
  ========================= */

  const {
    data: categoriesData,
    error: categoriesError
  } = await supabaseClient
    .from("categories")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (categoriesError) {
    throw categoriesError;
  }


  /* =========================
     PRODUCTS
  ========================= */

  const {
    data: productsData,
    error: productsError
  } = await supabaseClient
    .from("products")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (productsError) {
    throw productsError;
  }


  /* =========================
     PRODUCT OPTIONS
  ========================= */

  const {
    data: optionsData,
    error: optionsError
  } = await supabaseClient
    .from("product_options")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (optionsError) {
    throw optionsError;
  }


  console.log(
    "📦 Supabase data:",
    {
      categories: categoriesData?.length || 0,
      products: productsData?.length || 0,
      options: optionsData?.length || 0
    }
  );

  window.RESTBR_INITIAL_CATALOG_COUNTS = {
    categories: categoriesData?.length || 0,
    products: productsData?.length || 0,
    options: optionsData?.length || 0
  };


  /* =========================
     CATEGORY MAP
  ========================= */

  const categoryMap =
    new Map();


  (categoriesData || [])
    .filter(category =>
      category.is_active !== false &&
      category.is_visible !== false
    )
    .forEach(category => {

      categoryMap.set(
        category.id,
        {
          id: category.id,

          ar:
            category.name_ar ||
            category.ar ||
            "",

          ku:
            category.name_ku ||
            category.ku ||
            category.name_ar ||
            "",

          en:
            category.name_en ||
            category.en ||
            category.name_ar ||
            "",

          order:
            category.sort_order ??
            category.order ??
            999,

          availability_schedule_enabled:
            category.availability_schedule_enabled === true,

          available_from:
            category.available_from || null,

          available_to:
            category.available_to || null
        }
      );

    });


  /* =========================
     OPTIONS MAP
  ========================= */

  const optionsMap =
    new Map();


  (optionsData || [])
    .forEach(option => {

      const productId =
        option.product_id;


      if (!optionsMap.has(productId)) {

        optionsMap.set(
          productId,
          []
        );

      }


      optionsMap
        .get(productId)
        .push({

          id: option.id,

          ar:
            option.name_ar ||
            option.ar ||
            "",

          ku:
            option.name_ku ||
            option.ku ||
            option.name_ar ||
            "",

          en:
            option.name_en ||
            option.en ||
            option.name_ar ||
            "",

          price:
            option.price ?? null,

          order:
            option.sort_order ??
            option.order ??
            999

        });

    });


  /* =========================
     BUILD PRODUCTS
  ========================= */

  const products =
    (productsData || [])
      .filter(product => {

        /*
          Only products connected
          to an existing category
          are displayed.
        */

        return (
          product.is_active !== false &&
          product.is_visible !== false &&
          product.category_id &&
          categoryMap.has(
            product.category_id
          )
        );

      })
      .map(product => {

        const category =
          categoryMap.get(
            product.category_id
          );


        let productOptions =
          optionsMap.get(
            product.id
          ) || [];


        productOptions =
          productOptions.sort(
            (a, b) =>
              Number(a.order || 999) -
              Number(b.order || 999)
          );


        /*
          Safety fallback:
          if a product has no option row
          but has a direct price,
          create one option for the cart.
        */

        if (
          !productOptions.length &&
          product.price !== null &&
          product.price !== undefined
        ) {

          productOptions.push({

            id:
              product.id +
              "-default",

            ar: "",

            ku: "",

            en: "",

            price:
              product.price,

            order: 1

          });

        }


        const manualUnavailable=
          product.is_available === false ||
          product.available === false;

        const scheduleUnavailable=
          product.availability_schedule_enabled === true &&
          scheduledAvailability(product) === false;

        const categoryScheduleUnavailable=
          category.availability_schedule_enabled === true &&
          scheduledAvailability(category) === false;

        const effectiveScheduleText=
          categoryScheduleUnavailable
            ? (
                lang==="en"
                  ? `Category available ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
                  : lang==="ku"
                    ? `بەشەکە بەردەستە ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
                    : `القسم متوفر ${String(category.available_from||"").slice(0,5)}–${String(category.available_to||"").slice(0,5)}`
              )
            : productScheduleText(product);


        return {

          id:
            product.id,

          manualUnavailable:
            manualUnavailable,

          availability_schedule_enabled:
            product.availability_schedule_enabled === true,

          available_from:
            product.available_from || null,

          available_to:
            product.available_to || null,

          scheduleText:
            effectiveScheduleText,

          name: {

            ar:
              product.name_ar ||
              product.ar ||
              "",

            ku:
              product.name_ku ||
              product.ku ||
              product.name_ar ||
              "",

            en:
              product.name_en ||
              product.en ||
              product.name_ar ||
              ""

          },


          category:
            category,


          image:
            product.image_url ||
            product.image ||
            "",


          order:
            product.sort_order ??
            product.order ??
            999,


          badges: {

            popular:
              Boolean(
                product.is_popular ??
                product.popular
              ),

            new:
              Boolean(
                product.is_new ??
                product.new
              ),

            hot:
              Boolean(
                product.is_hot ??
                product.hot
              ),

            offer:
              Boolean(
                product.is_offer ??
                product.offer
              ),

            unavailable:
              manualUnavailable ||
              categoryScheduleUnavailable ||
              scheduleUnavailable

          },


          options:
            productOptions

        };

      })
      .sort(
        (a, b) =>
          Number(a.order || 999) -
          Number(b.order || 999)
      );


  /* =========================
     RESTAURANT OBJECT
  ========================= */

  const whatsappRaw =
    String(
      settings.whatsapp_number ||
      settings.whatsapp ||
      settings.whatsapp_url ||
      ""
    );

  let whatsappNumber =
    whatsappRaw.replace(/\D/g,"");

  if (whatsappNumber.startsWith("00")) {
    whatsappNumber =
      whatsappNumber.slice(2);
  }

  if (/^07\d{9}$/.test(whatsappNumber)) {
    whatsappNumber =
      "964" +
      whatsappNumber.slice(1);
  }

  if (/^7\d{9}$/.test(whatsappNumber)) {
    whatsappNumber =
      "964" +
      whatsappNumber;
  }

  const value=(key,fallback="")=>{
    const v=settings[key];
    return v===null || v===undefined
      ? fallback
      : v;
  };


  const restaurant = {

    name:
      value(
        "name_en",
        value(
          "name_ar",
          value("name","")
        )
      ),

    nameAr:
      value(
        "name_ar",
        value("name","")
      ),

    nameKu:
      value("name_ku",""),

    nameEn:
      value(
        "name_en",
        value("name","")
      ),

    subtitle: {
      ar:
        value(
          "subtitle_ar",
          "اكتشف منيو {name}"
        ),

      ku:
        value(
          "subtitle_ku",
          "مینیوی {name} ببینە"
        ),

      en:
        value(
          "subtitle_en",
          "Discover {name} Menu"
        )
    },

    phone:
      value(
        "phone",
        ""
      ),

    whatsappNumber:
      whatsappNumber ||
      "",

    whatsapp:
      whatsappNumber
        ? "https://wa.me/" + whatsappNumber
        : "",

    quickActions: {
      location: {
        enabled:
          settings.top_location_enabled !== false,

        label: {
          ar:
            value(
              "top_location_label_ar",
              "موقعنا"
            ),

          ku:
            value(
              "top_location_label_ku",
              "شوێنی مە"
            ),

          en:
            value(
              "top_location_label_en",
              "Location"
            )
        }
      },

      call: {
        enabled:
          settings.top_call_enabled !== false,

        label: {
          ar:
            value(
              "top_call_label_ar",
              "اتصال"
            ),

          ku:
            value(
              "top_call_label_ku",
              "پەیوەندی"
            ),

          en:
            value(
              "top_call_label_en",
              "Call"
            )
        }
      },

      whatsapp: {
        enabled:
          settings.top_whatsapp_enabled !== false,

        label: {
          ar:
            value(
              "top_whatsapp_label_ar",
              "واتساب منيو"
            ),

          ku:
            value(
              "top_whatsapp_label_ku",
              "مێنیوی واتساپ"
            ),

          en:
            value(
              "top_whatsapp_label_en",
              "WhatsApp Menu"
            )
        }
      }
    },

    location:
      value(
        "location",
        value("location_url","#")
      ),

    footerLocation: {
      ar:
        value(
          "footer_location_ar",
          ""
        ),

      ku:
        value(
          "footer_location_ku",
          ""
        ),

      en:
        value(
          "footer_location_en",
          ""
        )
    },

    social: {
      instagram:
        value(
          "instagram_url",
          ""
        ),

      facebook:
        value(
          "facebook_url",
          ""
        ),

      tiktok:
        value(
          "tiktok_url",
          ""
        ),

      snapchat:
        value(
          "snapchat_url",
          ""
        )
    },

    socialEnabled: {
      instagram:
        settings.instagram_enabled !== false,

      facebook:
        settings.facebook_enabled !== false,

      tiktok:
        settings.tiktok_enabled !== false,

      snapchat:
        settings.snapchat_enabled !== false
    },

    customSocialLinks:
      safeArray(settings.custom_social_links),

    customTopActions:
      safeArray(settings.custom_top_actions),

    customFooterActions:
      safeArray(settings.custom_footer_actions),

    uiDesign:
      safeObject(settings.ui_design_settings),

    introDurationMs:
      Math.max(
        400,
        Math.min(
          3000,
          Number(settings.intro_duration_ms) || 900
        )
      ),

    display: {
      logo:
        settings.show_logo !== false,

      menuTitle:
        settings.show_menu_title !== false,

      subtitle:
        settings.show_subtitle !== false,

      languageSwitch:
        settings.show_language_switch !== false,

      categoryNav:
        settings.show_category_nav !== false,

      backToTop:
        settings.show_back_to_top !== false,

      intro:
        settings.intro_enabled !== false,

      backgroundVideo:
        settings.background_video_enabled !== false,

      footer:
        settings.show_footer !== false,

      footerBrand:
        settings.show_footer_brand !== false,

      footerLocation:
        settings.show_footer_location !== false,

      footerPhone:
        settings.show_footer_phone !== false,

      footerSocials:
        settings.show_footer_socials !== false,

      footerCopy:
        settings.show_footer_copy !== false,

      footerLocationButton:
        settings.footer_location_enabled !== false,

      footerCallButton:
        settings.footer_call_enabled !== false,

      footerWhatsappButton:
        settings.footer_whatsapp_enabled !== false
    },

    backgroundVideo:
      value(
        "background_video",
        value(
          "background_video_url",
          "assets/background.mp4"
        )
      ),

    logo:
      value(
        "logo_url",
        "assets/restaurant-placeholder.svg"
      ),

    isOpen:
      settings.is_open !== false,

    ordersEnabled:
      settings.orders_enabled !== false,

    deliveryEnabled:
      settings.delivery_enabled !== false,

    pickupEnabled:
      settings.pickup_enabled !== false,

    deliveryInfoEnabled:
      settings.delivery_info_enabled !== false,

    deliveryInfo: {
      ar:
        value("delivery_info_ar",""),

      ku:
        value("delivery_info_ku",""),

      en:
        value("delivery_info_en","")
    },

    announcementEnabled:
      settings.announcement_enabled === true,

    announcement: {
      ar:
        value("announcement_ar",""),

      ku:
        value("announcement_ku",""),

      en:
        value("announcement_en","")
    },

    closedMessage: {
      ar:
        value(
          "closed_message_ar",
          "المطعم مغلق حالياً. يسعدنا استقبال طلبك عند إعادة فتح الطلبات."
        ),

      ku:
        value(
          "closed_message_ku",
          "چێشتخانەکە لە ئێستادا داخراوە."
        ),

      en:
        value(
          "closed_message_en",
          "The restaurant is currently closed."
        )
    }

  };


  return {

    restaurant,

    products

  };
}



/* ========================================
   JSON FALLBACK
======================================== */

async function loadMenuFallback() {

  console.warn(
    "⚠️ Using menu.json fallback"
  );


  const response =
    await fetch(
      "data/menu.json?v=32",
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "menu.json HTTP " +
      response.status
    );

  }


  return await response.json();

}



/* ========================================
   START RESTBR
======================================== */

async function startRestbr() {

  /*
    Intro runs independently
    so it never gets stuck while
    Supabase is loading.
  */

  try {

    /* =========================
       TRY SUPABASE FIRST
    ========================= */

    try {

      DB =
        await loadMenuFromSupabase();


      console.log(
        "✅ RESTBR MENU LOADED FROM SUPABASE"
      );

      saveMenuOfflineCache(DB);


    } catch (supabaseError) {

      console.error(
        "❌ Supabase menu loading failed:",
        supabaseError
      );


      /* =========================
         FALLBACK TO JSON
      ========================= */

      try{
        DB=
          await loadMenuFallback();

        console.log(
          "✅ RESTBR MENU LOADED FROM JSON FALLBACK"
        );

        saveMenuOfflineCache(DB);

      }catch(jsonError){

        const cached=
          loadMenuOfflineCache();

        if(!cached){
          throw jsonError;
        }

        DB=cached;

        console.log(
          "✅ RESTBR MENU LOADED FROM OFFLINE CACHE"
        );

        showOfflineDataBanner();
      }

    }


    /* =========================
       VALIDATE DATABASE
    ========================= */

    if (
      !DB ||
      !Array.isArray(DB.products)
    ) {

      throw new Error(
        "Invalid menu data"
      );

    }


    console.log(
      "🍽 Products loaded:",
      DB.products.length
    );


    /* =========================
       FIND CATEGORIES
    ========================= */

    const cats =
      categories();


    active =
      String(cats[0]?.id || "");


    console.log(
      "📂 Categories loaded:",
      cats.length
    );


    /* =========================
       INITIALIZE WEBSITE
    ========================= */

    installMenuCardPolish();
    installMenuDiscoveryUI();
    installV44PolishStyles();
    applyUiDesignSettings();
    ensureSearchUI();

    applyDeepLinkBeforeRender();

    const searchInput=document.getElementById("smSearchInput");
    if(searchInput && searchQuery){
      searchInput.value=searchQuery;
    }

    setupBackground();
    setupFooter();

    applyRestaurantBranding();
    applyLang();

    initFooterGlassSync();

    saveBrandCache();
    setupIntro();


    /* =========================
       GLOBAL DATABASE
    ========================= */

    window.RESTBR_DB = DB;

    window.RESTBR_LANG =
      () => lang;

    window.RESTBR_TRACK=
      trackMenuEvent;

    trackPageViewOnce();
    registerPwa();
    scrollToDeepLink();


    if(!window.__RESTBR_SCHEDULE_TIMER__){
      window.__RESTBR_SCHEDULE_TIMER__=setInterval(
        refreshScheduledAvailability,
        60000
      );
    }


    window.dispatchEvent(
      new CustomEvent(
        "restbr:ready",
        {
          detail: {
            DB
          }
        }
      )
    );


    scrollEffects();


    console.log(
      "🚀 RESTBR MENU READY"
    );


  } catch (error) {

    console.error(
      "RESTBR MENU ERROR:",
      error
    );


    const menu =
      $("#smMenu");


    if (menu) {

      menu.innerHTML = `

        <div style="
          max-width:600px;
          margin:40px auto;
          padding:25px;
          text-align:center;
          border:1px solid #5b4024;
          border-radius:20px;
          background:rgba(10,8,6,.86);
        ">

          تعذر تحميل المنيو.

          <br><br>

          يرجى تحديث الصفحة.

        </div>

      `;

    }

  }

}


/* ========================================
   RUN
======================================== */

startRestbr();

/* js/pasha-baby-commerce.js */
(() => {
  if (window.__PASHA_BABY_COMMERCE_V2__) return;
  window.__PASHA_BABY_COMMERCE_V2__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  let commerceReady = false;
  let currentProduct = null;
  let selectedOptionIndex = null;
  let selectedColorId = '';
  let observer = null;
  let bootPromise = null;
  let discountTimer = null;
  let cachedDiscounts = [];
  let cachedColorRows = [];

  const lang = () => window.RESTBR_LANG
    ? window.RESTBR_LANG()
    : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');

  const txt = value => {
    if (!value) return '';
    const l = lang();
    return String(value[l] || value.ar || value.en || '').trim();
  };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const money = value => {
    const n = Number(value || 0);
    return n.toLocaleString('en-US') + ' ' + (lang() === 'en' ? 'IQD' : 'د.ع');
  };

  function t(ar, ku, en) {
    return lang() === 'en' ? en : lang() === 'ku' ? ku : ar;
  }

  async function fetchAll(table, { select = '*', order = null, ascending = true, activeOnly = false } = {}) {
    const rows = [];
    let from = 0;

    while (true) {
      let query = supabaseClient
        .from(table)
        .select(select)
        .range(from, from + PAGE_SIZE - 1);

      if (activeOnly) query = query.eq('is_active', true);
      if (order) query = query.order(order, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from >= MAX_ROWS) throw new Error(`${table} exceeded ${MAX_ROWS} row storefront safety limit`);
    }

    return rows;
  }

  function iraqMinutesNow() {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Baghdad',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date());
      const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
      const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
      return h * 60 + m;
    } catch (_) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
  }

  function timeToMinutes(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function scheduledAvailable(row) {
    if (row?.availability_schedule_enabled !== true) return true;
    const from = timeToMinutes(row.available_from);
    const to = timeToMinutes(row.available_to);
    if (from === null || to === null || from === to) return true;
    const now = iraqMinutesNow();
    return from < to ? now >= from && now < to : now >= from || now < to;
  }

  function scheduleText(row, category = false) {
    if (row?.availability_schedule_enabled !== true || !row.available_from || !row.available_to) return '';
    const from = String(row.available_from).slice(0, 5);
    const to = String(row.available_to).slice(0, 5);
    if (category) {
      return t(`القسم متوفر ${from}–${to}`, `بەشەکە بەردەستە ${from}–${to}`, `Category available ${from}–${to}`);
    }
    return t(`متوفر ${from}–${to}`, `بەردەستە ${from}–${to}`, `Available ${from}–${to}`);
  }

  function mapCatalog(categoriesData, productsData, optionsData) {
    const categoryMap = new Map();

    (categoriesData || [])
      .filter(category => category.is_active !== false && category.is_visible !== false)
      .forEach(category => {
        categoryMap.set(category.id, {
          id: category.id,
          ar: category.name_ar || category.ar || '',
          ku: category.name_ku || category.ku || category.name_ar || '',
          en: category.name_en || category.en || category.name_ar || '',
          order: category.sort_order ?? category.order ?? 999,
          availability_schedule_enabled: category.availability_schedule_enabled === true,
          available_from: category.available_from || null,
          available_to: category.available_to || null
        });
      });

    const optionsMap = new Map();
    (optionsData || []).forEach(option => {
      const productId = option.product_id;
      if (!optionsMap.has(productId)) optionsMap.set(productId, []);
      optionsMap.get(productId).push({
        id: option.id,
        ar: option.name_ar || option.ar || '',
        ku: option.name_ku || option.ku || option.name_ar || '',
        en: option.name_en || option.en || option.name_ar || '',
        price: option.price ?? null,
        order: option.sort_order ?? option.order ?? 999
      });
    });

    return (productsData || [])
      .filter(product =>
        product.is_active !== false &&
        product.is_visible !== false &&
        product.category_id &&
        categoryMap.has(product.category_id)
      )
      .map(product => {
        const category = categoryMap.get(product.category_id);
        let productOptions = (optionsMap.get(product.id) || [])
          .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));

        if (!productOptions.length) {
          const directPrice = product.base_price ?? product.price;
          if (directPrice !== null && directPrice !== undefined && directPrice !== '') {
            productOptions = [{
              id: `${product.id}-default`,
              ar: '', ku: '', en: '',
              price: directPrice,
              order: 1
            }];
          }
        }

        const manualUnavailable = product.is_available === false || product.available === false;
        const scheduleUnavailable = product.availability_schedule_enabled === true && !scheduledAvailable(product);
        const categoryScheduleUnavailable = category.availability_schedule_enabled === true && !scheduledAvailable(category);

        return {
          id: product.id,
          manualUnavailable,
          availability_schedule_enabled: product.availability_schedule_enabled === true,
          available_from: product.available_from || null,
          available_to: product.available_to || null,
          scheduleText: categoryScheduleUnavailable ? scheduleText(category, true) : scheduleText(product, false),
          name: {
            ar: product.name_ar || product.ar || '',
            ku: product.name_ku || product.ku || product.name_ar || '',
            en: product.name_en || product.en || product.name_ar || ''
          },
          category,
          image: product.image_url || product.image || '',
          order: product.sort_order ?? product.order ?? 999,
          badges: {
            popular: Boolean(product.is_popular ?? product.popular),
            new: Boolean(product.is_new ?? product.new),
            hot: Boolean(product.is_hot ?? product.hot),
            offer: Boolean(product.is_offer ?? product.offer),
            unavailable: manualUnavailable || categoryScheduleUnavailable || scheduleUnavailable
          },
          options: productOptions
        };
      })
      .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
  }

  async function ensureFullCatalog() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return false;
    const DB = window.RESTBR_DB;
    if (!DB) return false;

    const initialCounts = window.RESTBR_INITIAL_CATALOG_COUNTS;
    if (
      initialCounts &&
      ['categories', 'products', 'options'].every(key =>
        Number.isFinite(Number(initialCounts[key])) && Number(initialCounts[key]) < PAGE_SIZE
      )
    ) {
      window.RESTBR_CATALOG_COUNTS = {
        ...initialCounts,
        visibleProducts: Array.isArray(DB.products) ? DB.products.length : 0
      };
      window.RESTBR_LARGE_CATALOG_READY = true;
      return true;
    }

    try {
      const [categoriesData, productsData, optionsData] = await Promise.all([
        fetchAll('categories', { order: 'sort_order', ascending: true }),
        fetchAll('products', { order: 'sort_order', ascending: true }),
        fetchAll('product_options', { order: 'sort_order', ascending: true })
      ]);

      const products = mapCatalog(categoriesData, productsData, optionsData);
      DB.products = products;

      window.RESTBR_CATALOG_COUNTS = {
        categories: categoriesData.length,
        products: productsData.length,
        options: optionsData.length,
        visibleProducts: products.length
      };
      window.RESTBR_LARGE_CATALOG_READY = true;

      if (typeof window.renderCats === 'function') window.renderCats();
      if (typeof window.render === 'function') window.render();

      window.dispatchEvent(new CustomEvent('restbr:catalog-expanded', {
        detail: window.RESTBR_CATALOG_COUNTS
      }));

      console.log('✓ Pasha full storefront catalog hydrated', window.RESTBR_CATALOG_COUNTS);
      return true;
    } catch (error) {
      console.error('PASHA LARGE CATALOG ERROR:', error);
      return false;
    }
  }

  function discountIsLive(row, now = Date.now()) {
    if (!row || row.is_active === false) return false;
    const start = row.starts_at ? Date.parse(row.starts_at) : null;
    const end = row.ends_at ? Date.parse(row.ends_at) : null;
    if (Number.isFinite(start) && now < start) return false;
    if (Number.isFinite(end) && now >= end) return false;
    return true;
  }

  function effectiveDiscount(discounts, product) {
    const productId = String(product?.id || '');
    const categoryId = String(product?.category?.id || '');
    const live = discounts.filter(row => discountIsLive(row));
    const scopes = [
      live.filter(row => row.scope_type === 'product' && String(row.target_id || '') === productId),
      live.filter(row => row.scope_type === 'category' && String(row.target_id || '') === categoryId),
      live.filter(row => row.scope_type === 'restaurant')
    ];

    for (const rows of scopes) {
      if (!rows.length) continue;
      return rows.reduce((best, row) =>
        Number(row.discount_percent || 0) > Number(best.discount_percent || 0) ? row : best
      );
    }
    return null;
  }

  function discountedPrice(original, percent) {
    const value = Number(original);
    const p = Number(percent);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (!Number.isFinite(p) || p <= 0) return value;
    return Math.max(0, Math.round(value * (100 - Math.min(100, p)) / 100));
  }

  function normalizeColor(row) {
    return {
      id: row.id,
      ar: row.name_ar || '',
      ku: row.name_ku || row.name_ar || '',
      en: row.name_en || row.name_ar || '',
      hex: /^#[0-9a-f]{6}$/i.test(String(row.color_hex || '')) ? row.color_hex : '#d8d0d3',
      image: row.image_url || '',
      order: Number(row.sort_order || 0),
      isAvailable: row.is_available !== false
    };
  }

  function applyCommerceData(discounts, colorRows, { renderUi = true } = {}) {
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return false;

    const colorsByProduct = new Map();
    (colorRows || []).forEach(row => {
      const key = String(row.product_id || '');
      if (!key) return;
      if (!colorsByProduct.has(key)) colorsByProduct.set(key, []);
      colorsByProduct.get(key).push(normalizeColor(row));
    });

    DB.products.forEach(product => {
      const discount = effectiveDiscount(discounts || [], product);
      const percent = Math.max(0, Math.min(100, Number(discount?.discount_percent || 0)));

      if (product.__retailBaseOffer === undefined) product.__retailBaseOffer = product.badges?.offer === true;
      product.discountPercent = percent;
      product.discountScope = discount?.scope_type || '';
      product.colors = (colorsByProduct.get(String(product.id)) || []).sort((a, b) => a.order - b.order);

      if (product.badges) product.badges.offer = product.__retailBaseOffer || percent > 0;

      (product.options || []).forEach(option => {
        if (option.__retailOriginalPrice === undefined) option.__retailOriginalPrice = Number(option.price || 0);
        const original = Number(option.__retailOriginalPrice || 0);
        option.originalPrice = original;
        option.price = discountedPrice(original, percent);
      });
    });

    commerceReady = true;
    window.RESTBR_COMMERCE_READY = true;

    if (renderUi && typeof window.render === 'function') window.render();
    decorateCards();
    window.dispatchEvent(new CustomEvent('restbr:prices-updated', { detail: { retailDiscounts: true } }));
    window.dispatchEvent(new CustomEvent('restbr:commerce-ready', { detail: { discounts, colors: colorRows } }));
    return true;
  }

  function scheduleNextDiscountBoundary(discounts) {
    clearTimeout(discountTimer);
    discountTimer = null;

    const now = Date.now();
    const future = [];

    (discounts || []).forEach(row => {
      for (const raw of [row.starts_at, row.ends_at]) {
        if (!raw) continue;
        const stamp = Date.parse(raw);
        if (Number.isFinite(stamp) && stamp > now) future.push(stamp);
      }
    });

    if (!future.length) return;

    const next = Math.min(...future);
    const delay = Math.min(2147483000, Math.max(100, next - now + 120));

    discountTimer = setTimeout(() => {
      applyCommerceData(cachedDiscounts, cachedColorRows, { renderUi: true });
      scheduleNextDiscountBoundary(cachedDiscounts);
    }, delay);
  }

  async function loadCommerceData() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    try {
      const [discounts, colorRows] = await Promise.all([
        fetchAll('discounts', { order: 'created_at', ascending: false, activeOnly: true }),
        fetchAll('product_colors', { order: 'sort_order', ascending: true, activeOnly: true })
      ]);

      cachedDiscounts = discounts;
      cachedColorRows = colorRows;
      applyCommerceData(cachedDiscounts, cachedColorRows, { renderUi: true });
      scheduleNextDiscountBoundary(cachedDiscounts);
    } catch (error) {
      console.error('PASHA RETAIL COMMERCE LOAD ERROR:', error);
    }
  }

  function colorPreviewHtml(product) {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    if (!colors.length) return '';
    const shown = colors.slice(0, 6);
    return `
      <div class="pb-color-preview" data-pb-color-preview>
        <span class="pb-color-preview-label">${esc(t('الألوان', 'رەنگ', 'Colors'))}</span>
        ${shown.map(color => `
          <i class="pb-color-dot ${color.isAvailable ? '' : 'is-unavailable'}"
             style="--pb-color:${esc(color.hex)}"
             title="${esc(txt(color))}"></i>
        `).join('')}
        ${colors.length > shown.length ? `<span class="pb-color-more">+${colors.length - shown.length}</span>` : ''}
      </div>`;
  }

  function decorateCards() {
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = DB.products.find(p => String(p.id) === String(card.dataset.productCard));
      if (!product) return;

      card.querySelectorAll('.pb-discount-badge,[data-pb-color-preview]').forEach(node => node.remove());

      if (Number(product.discountPercent) > 0) {
        card.insertAdjacentHTML('beforeend', `<span class="pb-discount-badge">-${Math.round(Number(product.discountPercent))}%</span>`);
      }

      [...card.querySelectorAll('.sm-option')].forEach((row, index) => {
        const option = (product.options || [])[index];
        const buy = row.querySelector('.sm-option-buy');
        if (!option || !buy) return;

        const original = Number(option.originalPrice ?? option.price ?? 0);
        const current = Number(option.price ?? 0);
        if (original > current && current >= 0) {
          buy.innerHTML = `
            <span class="pb-price-stack">
              <span class="pb-old-price">${esc(money(original))}</span>
              <b class="sm-price">${esc(money(current))}</b>
            </span>`;
        }
      });

      const info = card.querySelector('.sm-info');
      const action = card.querySelector('.sm-direct-add,.sm-choose-options');
      if (info && action && Array.isArray(product.colors) && product.colors.length) {
        action.insertAdjacentHTML('beforebegin', colorPreviewHtml(product));
        action.dataset.retailColors = '1';
        if (action.classList.contains('sm-direct-add')) {
          const label = action.querySelector('b');
          if (label) label.textContent = t('اختيار اللون', 'رەنگ هەڵبژێرە', 'Choose color');
        }
      }
    });
  }

  function ensureChooser() {
    if (document.getElementById('pbCommerceSheet')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="pbCommerceBackdrop" class="pb-commerce-backdrop"></div>
      <section id="pbCommerceSheet" class="pb-commerce-sheet" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="pb-commerce-handle"></div>
        <div class="pb-commerce-head">
          <button id="pbCommerceClose" class="pb-commerce-close" type="button" aria-label="Close">×</button>
          <h3 id="pbCommerceTitle"></h3><span></span>
        </div>
        <div id="pbCommerceBody" class="pb-commerce-body"></div>
        <button id="pbCommerceAdd" class="pb-commerce-add" type="button"></button>
      </section>`);

    document.getElementById('pbCommerceClose').addEventListener('click', closeChooser);
    document.getElementById('pbCommerceBackdrop').addEventListener('click', closeChooser);
    document.getElementById('pbCommerceAdd').addEventListener('click', confirmChoice);
    document.getElementById('pbCommerceBody').addEventListener('click', event => {
      const optionButton = event.target.closest('[data-pb-option-index]');
      if (optionButton) {
        selectedOptionIndex = Number(optionButton.dataset.pbOptionIndex);
        renderChooserBody();
        return;
      }
      const colorButton = event.target.closest('[data-pb-color-id]');
      if (colorButton && !colorButton.disabled) {
        selectedColorId = String(colorButton.dataset.pbColorId || '');
        renderChooserBody();
      }
    });
  }

  function renderChooserBody() {
    if (!currentProduct) return;
    const options = currentProduct.options || [];
    const colors = currentProduct.colors || [];
    const body = document.getElementById('pbCommerceBody');
    const add = document.getElementById('pbCommerceAdd');

    const optionSection = options.length > 1 ? `
      <div class="pb-choice-section">
        <div class="pb-choice-section-title">${esc(t('اختار النوع', 'جۆر هەڵبژێرە', 'Choose an option'))}</div>
        <div class="pb-option-grid">
          ${options.map((option, index) => `
            <button class="pb-option-choice ${selectedOptionIndex === index ? 'selected' : ''}" type="button" data-pb-option-index="${index}">
              <span>${esc(txt(option) || txt(currentProduct.name))}</span>
              <b>${esc(money(option.price))}</b>
            </button>`).join('')}
        </div>
      </div>` : '';

    const colorSection = `
      <div class="pb-choice-section">
        <div class="pb-choice-section-title">${esc(t('اختار اللون', 'رەنگ هەڵبژێرە', 'Choose a color'))}</div>
        <div class="pb-color-grid">
          ${colors.map(color => `
            <button class="pb-color-choice ${selectedColorId === String(color.id) ? 'selected' : ''}" type="button"
                    data-pb-color-id="${esc(color.id)}" ${color.isAvailable ? '' : 'disabled'}>
              <i style="--pb-color:${esc(color.hex)}"></i>
              <span>${esc(txt(color))}${color.isAvailable ? '' : ` — ${esc(t('غير متوفر', 'بەردەست نییە', 'Unavailable'))}`}</span>
            </button>`).join('')}
        </div>
      </div>`;

    body.innerHTML = optionSection + colorSection;
    add.disabled = !(Number.isInteger(selectedOptionIndex) && !!selectedColorId);
    add.textContent = t('إضافة للسلة', 'زیادکردن بۆ سەبەتە', 'Add to cart');
  }

  function openChooser(product, preferredColorId = '') {
    ensureChooser();
    currentProduct = product;
    selectedOptionIndex = (product.options || []).length === 1 ? 0 : null;
    const preferredColor = (product.colors || []).find(color =>
      String(color?.id || '') === String(preferredColorId || '') && color?.isAvailable !== false
    );
    selectedColorId = preferredColor ? String(preferredColor.id || '') : '';
    document.getElementById('pbCommerceTitle').textContent = txt(product.name);
    renderChooserBody();
    document.getElementById('pbCommerceBackdrop').classList.add('open');
    const sheet = document.getElementById('pbCommerceSheet');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeChooser() {
    document.getElementById('pbCommerceBackdrop')?.classList.remove('open');
    const sheet = document.getElementById('pbCommerceSheet');
    sheet?.classList.remove('open');
    sheet?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedOptionIndex = null;
    selectedColorId = '';
  }

  function composeOption(product, option, color) {
    const compose = (locale, colorPrefix) => {
      const optionName = String(option?.[locale] || option?.ar || '').trim();
      const productName = String(product?.name?.[locale] || product?.name?.ar || '').trim();
      const colorName = String(color?.[locale] || color?.ar || '').trim();
      const parts = [];
      if (optionName && optionName !== productName) parts.push(optionName);
      parts.push(`${colorPrefix}: ${colorName}`);
      return parts.join(' • ');
    };

    return {
      ...option,
      ar: compose('ar', 'اللون'),
      ku: compose('ku', 'رەنگ'),
      en: compose('en', 'Color')
    };
  }

  function addSelectedToExistingCart(product, optionIndex, color) {
    const options = product.options || [];
    const option = options[optionIndex];
    if (!option || !color) return;

    const originalLength = options.length;
    const colorIndex = Math.max(0, (product.colors || []).findIndex(item => String(item.id) === String(color.id)));
    const syntheticIndex = originalLength + 1 + (colorIndex * 1000) + Math.max(0, optionIndex);
    const synthetic = composeOption(product, option, color);
    const originalImage = product.image;

    options[syntheticIndex] = synthetic;
    if (color.image) product.image = color.image;

    const proxy = document.createElement('button');
    proxy.type = 'button';
    proxy.className = 'sm-direct-add';
    proxy.dataset.productId = String(product.id);
    proxy.dataset.optionIndex = String(syntheticIndex);
    proxy.dataset.retailBypass = '1';
    proxy.style.display = 'none';
    document.body.appendChild(proxy);
    proxy.click();
    proxy.remove();

    options.length = originalLength;
    product.image = originalImage;
  }

  function confirmChoice() {
    if (!currentProduct || !Number.isInteger(selectedOptionIndex) || !selectedColorId) return;
    const color = (currentProduct.colors || []).find(item => String(item.id) === String(selectedColorId) && item.isAvailable);
    if (!color) return;
    addSelectedToExistingCart(currentProduct, selectedOptionIndex, color);
    closeChooser();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.sm-direct-add,.sm-choose-options');
    if (!button || button.dataset.retailBypass === '1') return;
    const DB = window.RESTBR_DB;
    const product = DB?.products?.find(item => String(item.id) === String(button.dataset.productId || ''));
    if (!commerceReady || !product || !Array.isArray(product.colors) || !product.colors.length) return;
    const preferredColorId = String(button.dataset.pbPreferredColorId || '');
    delete button.dataset.pbPreferredColorId;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openChooser(product, preferredColorId);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('pbCommerceSheet')?.classList.contains('open')) closeChooser();
  });

  function startObserver() {
    if (observer) return;
    const menu = document.getElementById('smMenu');
    if (!menu) return;
    observer = new MutationObserver(() => {
      if (commerceReady) requestAnimationFrame(decorateCards);
    });
    // Observe only top-level menu rerenders. Commerce decoration mutates inside
    // cards and must not recursively trigger itself.
    observer.observe(menu, { childList: true, subtree: false });
  }

  async function bootCommerce() {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      startObserver();
      await ensureFullCatalog();
      await loadCommerceData();
    })().finally(() => {
      bootPromise = null;
    });
    return bootPromise;
  }

  window.addEventListener('restbr:ready', () => void bootCommerce());

  if (window.RESTBR_DB?.products) {
    setTimeout(() => void bootCommerce(), 0);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-lang]') && commerceReady) {
      setTimeout(() => {
        decorateCards();
        if (document.getElementById('pbCommerceSheet')?.classList.contains('open')) renderChooserBody();
      }, 60);
    }
  });
})();

/* js/product-image-fallback.js */
(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  function safeMedia(value){
    return typeof window.RESTBR_SAFE_MEDIA_URL === 'function'
      ? window.RESTBR_SAFE_MEDIA_URL(value)
      : '';
  }

  function restaurantLogo(){
    const liveLogo = safeMedia(
      window.RESTBR_DB?.restaurant?.logo ||
      document.querySelector('.sm-logo')?.getAttribute('src') ||
      document.querySelector('.sm-intro-logo')?.getAttribute('src') ||
      ''
    );

    if (liveLogo) return liveLogo;

    const cached = typeof window.RESTBR_READ_BRAND_CACHE === 'function'
      ? window.RESTBR_READ_BRAND_CACHE()
      : null;
    return safeMedia(cached?.logo);
  }

  function installStyles(){
    if (document.getElementById('smProductImageFallbackStyles')) return;
    const style = document.createElement('style');
    style.id = 'smProductImageFallbackStyles';
    style.textContent = `
      .sm-product-image.sm-image-fallback{
        object-fit:contain !important;
        object-position:center center !important;
        padding:18px !important;
        box-sizing:border-box !important;
        background:rgba(8,6,4,.72) !important;
        filter:none !important;
      }
      .sm-img.sm-image-fallback-empty{
        background:rgba(8,6,4,.72) !important;
      }
      .sm-img.sm-image-fallback-empty .sm-product-image{
        visibility:hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyFallback(img){
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.classList.contains('sm-product-image')) return;
    if (img.dataset.smFallbackApplied === '1') return;

    img.dataset.smFallbackApplied = '1';
    img.classList.add('sm-image-fallback');

    const fallback = restaurantLogo();

    if (fallback) {
      img.dataset.fullImage = fallback;
      img.src = fallback;
      return;
    }

    img.closest('.sm-img')?.classList.add('sm-image-fallback-empty');
  }

  function tryOriginal(img){
    if (!(img instanceof HTMLImageElement)) return false;
    if (img.dataset.smOriginalAttempted === '1') return false;

    const original = safeMedia(img.dataset.originalImage || img.dataset.fullImage || '');
    const current = safeMedia(img.getAttribute('src'));
    if (!original || original === current) return false;

    img.dataset.smOriginalAttempted = '1';
    img.src = original;
    return true;
  }

  function inspect(img){
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.classList.contains('sm-product-image')) return;

    const raw = safeMedia(img.getAttribute('src'));
    if (!raw) {
      applyFallback(img);
      return;
    }

    if (img.complete && img.naturalWidth === 0) {
      applyFallback(img);
    }
  }

  function scan(root = document){
    root.querySelectorAll?.('.sm-product-image').forEach(inspect);
  }

  installStyles();

  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('sm-product-image')) return;

    if (tryOriginal(img)) return;

    if (img.dataset.smFallbackApplied === '1') {
      img.closest('.sm-img')?.classList.add('sm-image-fallback-empty');
      return;
    }

    applyFallback(img);
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('.sm-product-image')) inspect(node);
        scan(node);
      });
    });
  });

  function start(){
    scan();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();

/* js/price-safety.js */
(() => {
  if (/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const TEXT = {
    ar: 'السعر غير متوفر',
    ku: 'نرخ بەردەست نییە',
    en: 'Price unavailable'
  };

  function lang(){
    const value = window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function label(){
    return TEXT[lang()] || TEXT.ar;
  }

  function validPrice(value){
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && !value.trim()) return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  }

  function productById(id){
    return window.RESTBR_DB?.products?.find(
      product => String(product.id) === String(id)
    ) || null;
  }

  function optionFor(product,index,optionId){
    if (!product) return null;
    const options = product.options || [];

    if (optionId !== undefined && optionId !== null && optionId !== '') {
      const byId = options.find(option => String(option.id) === String(optionId));
      if (byId) return byId;
    }

    const numericIndex = Number(index);
    return Number.isInteger(numericIndex) ? (options[numericIndex] || null) : null;
  }

  function toast(message){
    const target = document.getElementById('smCartToast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('show');
    clearTimeout(target.__smPriceSafetyTimer);
    target.__smPriceSafetyTimer = setTimeout(
      () => target.classList.remove('show'),
      1600
    );
  }

  function installStyles(){
    if (document.getElementById('smPriceSafetyStyles')) return;
    const style = document.createElement('style');
    style.id = 'smPriceSafetyStyles';
    style.textContent = `
      .sm-price.sm-price-unavailable,
      .sm-choice-option .sm-price-unavailable{
        color:#9b9186 !important;
        font-size:.82em !important;
        font-weight:700 !important;
        white-space:normal !important;
      }
      .sm-price-disabled,
      .sm-choice-option:disabled{
        opacity:.48 !important;
        cursor:not-allowed !important;
      }
      .sm-choice-option:disabled i{
        display:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function patchCard(card){
    const product = productById(card.dataset.productCard);
    if (!product) return;

    const options = product.options || [];
    const rows = [...card.querySelectorAll('.sm-option')];

    rows.forEach((row,index) => {
      const priceNode = row.querySelector('.sm-price');
      if (!priceNode) return;
      const option = options[index];
      const invalid = !option || !validPrice(option.price);
      priceNode.classList.toggle('sm-price-unavailable', invalid);
      if (invalid) priceNode.textContent = label();
    });

    const direct = card.querySelector('.sm-direct-add');
    if (direct) {
      const option = optionFor(product,direct.dataset.optionIndex);
      const invalid = !option || !validPrice(option.price);
      direct.disabled = invalid;
      direct.classList.toggle('sm-price-disabled', invalid);
      direct.title = invalid ? label() : '';
    }

    const choose = card.querySelector('.sm-choose-options');
    if (choose) {
      const anyValid = options.some(option => validPrice(option.price));
      choose.disabled = !anyValid;
      choose.classList.toggle('sm-price-disabled', !anyValid);
      choose.title = anyValid ? '' : label();
    }
  }

  function patchChoices(root = document){
    root.querySelectorAll?.('[data-choice-product][data-choice-index]').forEach(button => {
      const product = productById(button.dataset.choiceProduct);
      const option = optionFor(product,button.dataset.choiceIndex);
      const invalid = !option || !validPrice(option.price);
      button.disabled = invalid;
      button.classList.toggle('sm-price-disabled', invalid);
      const priceNode = button.querySelector('b');
      if (priceNode && invalid) {
        priceNode.textContent = label();
        priceNode.classList.add('sm-price-unavailable');
      }
    });
  }

  function patchAll(root = document){
    root.querySelectorAll?.('[data-product-card]').forEach(patchCard);
    patchChoices(root);
  }

  function invalidTarget(target){
    const direct = target.closest?.('.sm-direct-add');
    if (direct) {
      const product = productById(direct.dataset.productId);
      const option = optionFor(product,direct.dataset.optionIndex);
      return !option || !validPrice(option.price);
    }

    const choice = target.closest?.('[data-choice-product][data-choice-index]');
    if (choice) {
      const product = productById(choice.dataset.choiceProduct);
      const option = optionFor(product,choice.dataset.choiceIndex);
      return !option || !validPrice(option.price);
    }

    return false;
  }

  function cartHasInvalidCurrentPrice(){
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('RESTBR_CART_V1') || '[]');
    } catch (_) {
      return false;
    }

    return cart.some(item => {
      const product = productById(item.productId);
      const option = optionFor(product,item.optionIndex,item.optionId);
      return !product || !option || !validPrice(option.price);
    });
  }

  installStyles();

  document.addEventListener('click', event => {
    if (invalidTarget(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(label());
      return;
    }

    if (event.target.closest?.('#smCartContinue,#smSendWhatsApp') && cartHasInvalidCurrentPrice()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(label());
    }
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('[data-product-card]')) patchCard(node);
        patchAll(node);
      });
    });
  });

  function start(){
    patchAll();
    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('restbr:ready',() => setTimeout(patchAll,0));
    window.addEventListener('restbr:prices-updated',() => setTimeout(patchAll,0));

    document.addEventListener('click',event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(patchAll,40);
      }
      if (event.target.closest('.sm-choose-options')) {
        setTimeout(() => patchChoices(),0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else {
    start();
  }
})();

/* js/cart.js */
(() => {
  const KEY="RESTBR_CART_V1";
  let cart=[];
  const T={
    ar:{cart:"السلة",empty:"السلة فارغة",total:"الإجمالي",continue:"متابعة الطلب",added:"تمت الإضافة للسلة",choose:"اختر النوع",add:"إضافة للسلة",close:"إغلاق",clear:"إفراغ السلة",clearConfirm:"هل تريد إفراغ السلة بالكامل؟",checkout:"إكمال الطلب",name:"الاسم",phone:"رقم الهاتف",orderType:"نوع الطلب",delivery:"توصيل",pickup:"استلام من المطعم",address:"العنوان",location:"الموقع",getLocation:"تحديد موقعي",notes:"ملاحظات الطلب (اختياري)",review:"مراجعة الطلب",send:"تثبيت الطلب",required:"يرجى إكمال الحقول المطلوبة",phoneInvalid:"يرجى إدخال رقم هاتف صحيح",locationOk:"تم تحديد الموقع",locationFail:"تعذر تحديد الموقع",back:"رجوع",increase:"زيادة الكمية",decrease:"تقليل الكمية",remove:"إزالة الصنف"},
    ku:{cart:"سەبەتە",empty:"سەبەتە بەتاڵە",total:"کۆی گشتی",continue:"بەردەوام بە",added:"زیاد کرا",choose:"جۆر هەڵبژێرە",add:"زیادکردن بۆ سەبەتە",close:"داخستن",clear:"بەتاڵکردنەوەی سەبەتە",clearConfirm:"دڵنیایت لە بەتاڵکردنەوەی تەواوی سەبەتە؟",checkout:"تەواوکردنی داواکاری",name:"ناو",phone:"ژمارەی مۆبایل",orderType:"جۆری داواکاری",delivery:"گەیاندن",pickup:"وەرگرتن لە چێشتخانە",address:"ناونیشان",location:"شوێن",getLocation:"شوێنم دیاری بکە",notes:"تێبینی (ئارەزوومەندانە)",review:"پێداچوونەوە",send:"پشتڕاستکردنەوەی داواکاری",required:"تکایە خانە پێویستەکان پڕ بکەرەوە",phoneInvalid:"ژمارەی مۆبایل دروست نییە",locationOk:"شوێن دیاری کرا",locationFail:"نەتوانرا شوێن دیاری بکرێت",back:"گەڕانەوە",increase:"زیادکردنی ژمارە",decrease:"کەمکردنەوەی ژمارە",remove:"لابردنی بەرهەم"},
    en:{cart:"Cart",empty:"Your cart is empty",total:"Total",continue:"Continue order",added:"Added to cart",choose:"Choose an option",add:"Add to cart",close:"Close",clear:"Clear cart",clearConfirm:"Clear the entire cart?",checkout:"Checkout",name:"Name",phone:"Phone number",orderType:"Order type",delivery:"Delivery",pickup:"Pickup",address:"Address",location:"Location",getLocation:"Use my location",notes:"Order notes (optional)",review:"Review order",send:"Confirm order",required:"Please complete the required fields",phoneInvalid:"Please enter a valid phone number",locationOk:"Location captured",locationFail:"Could not get location",back:"Back",increase:"Increase quantity",decrease:"Decrease quantity",remove:"Remove item"}
  };
  const lang=()=>window.RESTBR_LANG?window.RESTBR_LANG():(localStorage.getItem("RESTBR_LANG_V1")||"ar");
  const tr=k=>(T[lang()]||T.ar)[k]||T.ar[k];
  const txt=o=>(o&&(o[lang()]||o.ar||o.en))||"";
  const esc=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const safeMedia=(value,fallback="assets/restaurant-placeholder.svg")=>{const fn=window.RESTBR_SAFE_MEDIA_URL;const safe=typeof fn==="function"?fn(value):"";if(safe)return safe;return typeof fn==="function"?(fn(fallback)||""):fallback};
  const money=n=>Number(n||0).toLocaleString("en-US")+" "+(lang()==="en"?"IQD":"د.ع");
  const normalizeDigits=value=>String(value??"").replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776));
  const orderIdPrefix=()=>String(window.RESTBR_CONFIG?.orderIdPrefix||"ORD").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)||"ORD";
  const restaurant=()=>window.RESTBR_DB?.restaurant||{};
  const deliveryAllowed=()=>restaurant().deliveryEnabled!==false;
  const pickupAllowed=()=>restaurant().pickupEnabled!==false;
  const anyOrderMethodAllowed=()=>deliveryAllowed()||pickupAllowed();
  const ordersAllowed=()=>{
    const r=restaurant();
    return r.isOpen!==false && r.ordersEnabled!==false && anyOrderMethodAllowed() && Boolean(whatsappNumber());
  };
  const closedMessage=()=>{
    const r=restaurant();
    const msg=r.closedMessage||{};
    return msg[lang()]||msg.ar||(
      lang()==="en"
        ?"Ordering is currently unavailable."
        :lang()==="ku"
          ?"داواکاری لە ئێستادا بەردەست نییە."
          :"الطلبات متوقفة حالياً."
    );
  };
  const whatsappNumber=()=>{
    const r=restaurant();
    let raw=String(r.whatsappNumber||r.whatsapp||"");
    let digits=raw.replace(/\D/g,"");
    if(digits.startsWith("00"))digits=digits.slice(2);
    if(/^07\d{9}$/.test(digits))digits="964"+digits.slice(1);
    if(/^7\d{9}$/.test(digits))digits="964"+digits;
    return digits;
  };
  function syncOrderState(){
    ensureUI();
    const allowed=ordersAllowed();
    const hoursPending=window.RESTBR_HOURS_READY!==true;
    const banner=document.getElementById("smOrderStateBanner");
    if(banner){
      banner.hidden=hoursPending||allowed;
      banner.textContent=hoursPending||allowed?"":("⏸ "+closedMessage());
    }
    document.querySelectorAll(".sm-add-cart,.sm-direct-add,.sm-choose-options").forEach(btn=>{
      btn.disabled=!allowed;
      btn.style.opacity=allowed?"":"0.5";
      btn.title=allowed?"":closedMessage();
    });

    const checkout=document.getElementById("smCheckoutSheet");
    if(checkout?.classList.contains("open")){
      renderCheckout();
    }
  }
  const localized=value=>{const source=value&&typeof value==="object"?value:{ar:value,ku:value,en:value};return{ar:String(source.ar??"").slice(0,500),ku:String(source.ku??"").slice(0,500),en:String(source.en??"").slice(0,500)}};
  const load=()=>{try{const parsed=JSON.parse(localStorage.getItem(KEY)||"[]");cart=(Array.isArray(parsed)?parsed:[]).slice(0,200).map((item,index)=>{const price=Number(item?.price),qty=Math.trunc(Number(item?.qty));return{key:String(item?.key??`${item?.productId??"item"}:${item?.optionIndex??index}`).slice(0,300),productId:String(item?.productId??"").slice(0,200),optionId:item?.optionId===null||item?.optionId===undefined?null:String(item.optionId).slice(0,200),optionIndex:Math.max(0,Math.trunc(Number(item?.optionIndex)||0)),name:localized(item?.name),option:localized(item?.option),price:Number.isFinite(price)&&price>=0?Math.min(price,1e9):0,image:safeMedia(item?.image),qty:Number.isFinite(qty)?Math.max(1,Math.min(qty,99)):1}})}catch{cart=[]}};
  const save=()=>{localStorage.setItem(KEY,JSON.stringify(cart));render()};
  const totals=()=>({qty:cart.reduce((s,x)=>s+x.qty,0),sum:cart.reduce((s,x)=>s+x.qty*x.price,0)});

  function syncLivePrices(){
    const D=window.RESTBR_DB;
    if(!D?.products?.length||!cart.length)return false;

    let changed=false;

    cart.forEach(item=>{
      const product=D.products.find(
        p=>String(p.id)===String(item.productId)
      );
      if(!product)return;

      let option=null;

      if(item.optionId!==undefined&&item.optionId!==null){
        option=(product.options||[]).find(
          o=>String(o.id)===String(item.optionId)
        )||null;
      }

      if(!option){
        option=(product.options||[])[Number(item.optionIndex)]||null;
      }

      if(!option)return;

      const livePrice=Number(option.price);
      if(Number.isFinite(livePrice)&&Number(item.price)!==livePrice){
        item.price=livePrice;
        changed=true;
      }

      if((item.optionId===undefined||item.optionId===null)&&option.id!==undefined&&option.id!==null){
        item.optionId=option.id;
        changed=true;
      }
    });

    if(changed){
      localStorage.setItem(KEY,JSON.stringify(cart));
      render();

      const checkout=document.getElementById("smCheckoutSheet");
      if(checkout?.classList.contains("open")){
        renderCheckout();
      }
    }

    return changed;
  }

  function installIosFormZoomFix(){
    if(document.getElementById("smIosFormZoomFix"))return;

    const style=document.createElement("style");
    style.id="smIosFormZoomFix";

    style.textContent=`
      /* iPhone Safari auto-zooms inputs with font-size below 16px. */
      @media (max-width: 900px){
        #smCartFab{
          width:var(--sm-ui-cart-width,180px)!important;
          min-width:var(--sm-ui-cart-width,180px)!important;
          max-width:min(var(--sm-ui-cart-width,180px),92vw)!important;
          height:var(--sm-ui-cart-height,56px)!important;
          min-height:var(--sm-ui-cart-height,56px)!important;
          font-size:var(--sm-ui-cart-font,13px)!important;
          left:var(--sm-ui-cart-horizontal,50%)!important;
          right:auto!important;
          bottom:calc(var(--sm-ui-cart-bottom,16px) + env(safe-area-inset-bottom))!important;
          transform:translateX(-50%)!important;
        }
        #smCartFab span{font-size:inherit}

        #smCheckoutSheet input,
        #smCheckoutSheet textarea,
        #smCheckoutSheet select{
          font-size:16px !important;
        }

        #smCheckoutSheet,
        #smCheckoutSheet .sm-checkout-body,
        #smCheckoutSheet label,
        #smCheckoutSheet input,
        #smCheckoutSheet textarea{
          min-width:0;
          max-width:100%;
          box-sizing:border-box;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureUI(){
    installIosFormZoomFix();
    if(document.getElementById("smCartFab"))return;
    document.body.insertAdjacentHTML("beforeend",`
      <div
        id="smOrderStateBanner"
        hidden
        style="
          position:fixed;
          z-index:80;
          top:max(12px,env(safe-area-inset-top));
          left:50%;
          transform:translateX(-50%);
          width:min(92%,430px);
          box-sizing:border-box;
          padding:10px 13px;
          border:1px solid rgba(216,169,88,.35);
          border-radius:13px;
          background:rgba(12,9,6,.94);
          color:#e2b55e;
          text-align:center;
          font-size:12px;
          line-height:1.6;
          box-shadow:0 12px 35px rgba(0,0,0,.35);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
        "
      ></div>
      <button id="smCartFab" class="sm-cart-fab" type="button"><span aria-hidden="true">🛒</span><span id="smCartFabText"></span></button>
      <div id="smCartBackdrop" class="sm-cart-backdrop"></div>
      <aside id="smCartDrawer" class="sm-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="smCartTitle" aria-hidden="true">
        <div class="sm-cart-handle"></div>
        <div class="sm-cart-head"><button id="smCartClose" class="sm-cart-close" type="button">×</button><h3 id="smCartTitle"></h3><button id="smCartClear" class="sm-cart-clear" type="button"></button></div>
        <div id="smCartItems" class="sm-cart-items"></div>
        <div class="sm-cart-bottom"><div class="sm-cart-total-row"><span id="smCartTotalLabel"></span><b id="smCartTotal"></b></div><button id="smCartContinue" class="sm-cart-continue" type="button"></button></div>
      </aside>
      <div id="smCartToast" class="sm-cart-toast" role="status" aria-live="polite"></div>
      <div id="smCheckoutBackdrop" class="sm-checkout-backdrop"></div>
      <section id="smCheckoutSheet" class="sm-checkout-sheet" role="dialog" aria-modal="true" aria-labelledby="smCheckoutTitle" aria-hidden="true">
        <div class="sm-checkout-handle"></div>
        <div class="sm-checkout-head"><button id="smCheckoutClose" type="button">×</button><h3 id="smCheckoutTitle"></h3></div>
        <div class="sm-checkout-body">
          <label><span id="smNameLabel"></span><input id="smCustomerName" autocomplete="name" maxlength="80" required></label>
          <label><span id="smPhoneLabel"></span><input id="smCustomerPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required></label>
          <div class="sm-checkout-label" id="smTypeLabel"></div>
          <div class="sm-order-types"><button type="button" data-order-type="delivery" class="active" id="smDeliveryBtn"></button><button type="button" data-order-type="pickup" id="smPickupBtn"></button></div>
          <div id="smDeliveryFields">
            <div
              id="smDeliveryInfo"
              hidden
              style="
                margin:0 0 9px;
                padding:9px 10px;
                border:1px solid rgba(216,169,88,.18);
                border-radius:10px;
                background:rgba(216,169,88,.045);
                color:#b8afa4;
                font-size:11px;
                line-height:1.65;
              "
            ></div>
            <label><span id="smAddressLabel"></span><input id="smCustomerAddress" autocomplete="street-address" maxlength="300" required></label>
            <button id="smGetLocation" class="sm-location-btn" type="button">📍 <span></span></button>
            <div id="smLocationStatus" class="sm-location-status"></div>
          </div>
          <label><span id="smNotesLabel"></span><textarea id="smCustomerNotes" rows="3" maxlength="500"></textarea></label>
          <div class="sm-checkout-review"><h4 id="smReviewLabel"></h4><div id="smCheckoutSummary"></div><div class="sm-checkout-review-total"><span id="smCheckoutTotalLabel"></span><b id="smCheckoutTotal"></b></div></div>
        </div>
        <div class="sm-checkout-actions"><button id="smSendWhatsApp" type="button"></button></div>
      </section>
      <div id="smChoiceBackdrop" class="sm-choice-backdrop"></div>
      <div id="smChoiceSheet" class="sm-choice-sheet" role="dialog" aria-modal="true" aria-labelledby="smChoiceTitle" aria-hidden="true"><div class="sm-choice-handle"></div><div class="sm-choice-head"><button id="smChoiceClose" type="button">×</button><div><small id="smChoiceLabel"></small><h3 id="smChoiceTitle"></h3></div></div><div id="smChoiceList" class="sm-choice-list"></div></div>
      <div id="smImageViewer" class="sm-image-viewer" role="dialog" aria-modal="true" aria-labelledby="smImageCaption" aria-hidden="true"><button id="smImageClose" type="button">×</button><img id="smImageFull" alt=""><div id="smImageCaption"></div></div>`);
    document.getElementById("smCartFab").onclick=()=>open(true);
    document.getElementById("smCartClose").onclick=()=>open(false);
    document.getElementById("smCartBackdrop").onclick=()=>open(false);
    document.getElementById("smCartClear").onclick=()=>{if(!cart.length)return;if(confirm(tr("clearConfirm"))){cart=[];save();toast(tr("clear"))}};
    document.getElementById("smCartContinue").onclick=()=>{if(!cart.length)return;if(!ordersAllowed()){toast(closedMessage());syncOrderState();return}open(false);checkoutOpen(true)};
    document.getElementById("smCheckoutClose").onclick=()=>checkoutOpen(false);
    document.getElementById("smCheckoutBackdrop").onclick=()=>checkoutOpen(false);
    document.querySelectorAll("[data-order-type]").forEach(b=>b.onclick=()=>setOrderType(b.dataset.orderType));
    document.getElementById("smGetLocation").onclick=getCustomerLocation;
    document.getElementById("smSendWhatsApp").onclick=sendWhatsApp;
    document.getElementById("smChoiceClose").onclick=()=>choiceOpen(false);
    document.getElementById("smChoiceBackdrop").onclick=()=>choiceOpen(false);
    document.getElementById("smImageClose").onclick=closeImage;
    document.getElementById("smImageViewer").addEventListener("click",e=>{if(e.target.id==="smImageViewer")closeImage()});
  }
  function lock(){document.body.classList.toggle("sm-cart-lock",!!document.querySelector('.sm-cart-drawer.open,.sm-choice-sheet.open,.sm-image-viewer.open,.sm-checkout-sheet.open'))}
  function focusSoon(id){setTimeout(()=>{const el=document.getElementById(id);if(!el)return;try{el.focus({preventScroll:true})}catch(_){el.focus()}},0)}
  function open(v){ensureUI();if(v)syncLivePrices();document.getElementById("smCartDrawer").classList.toggle("open",v);document.getElementById("smCartBackdrop").classList.toggle("open",v);document.getElementById("smCartDrawer").setAttribute("aria-hidden",String(!v));lock();focusSoon(v?"smCartClose":"smCartFab")}
  let orderType="delivery", customerLocation="";
  function checkoutOpen(v){ensureUI();if(v)syncLivePrices();const sh=document.getElementById("smCheckoutSheet"),bd=document.getElementById("smCheckoutBackdrop");sh.classList.toggle("open",v);bd.classList.toggle("open",v);sh.setAttribute("aria-hidden",String(!v));if(v)renderCheckout();lock();focusSoon(v?"smCheckoutClose":"smCartFab")}
  function setOrderType(type){
    const delivery=deliveryAllowed();
    const pickup=pickupAllowed();

    if(type==="delivery"&&!delivery){
      type=pickup?"pickup":"delivery";
    }

    if(type==="pickup"&&!pickup){
      type=delivery?"delivery":"pickup";
    }

    orderType=type;

    document.querySelectorAll("[data-order-type]").forEach(b=>{
      b.classList.toggle("active",b.dataset.orderType===type);
    });

    const deliveryFields=document.getElementById("smDeliveryFields");

    if(deliveryFields){
      deliveryFields.hidden=type!=="delivery"||!delivery;
    }
  }
  function getCustomerLocation(){if(!navigator.geolocation){toast(tr("locationFail"));return}const b=document.getElementById("smGetLocation");b.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{customerLocation=`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;document.getElementById("smLocationStatus").textContent="✓ "+tr("locationOk");b.disabled=false},()=>{toast(tr("locationFail"));b.disabled=false},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}
  function renderCheckout(){
    const {sum}=totals();

    document.getElementById("smCheckoutTitle").textContent=tr("checkout");
    document.getElementById("smNameLabel").textContent=tr("name")+" *";
    document.getElementById("smPhoneLabel").textContent=tr("phone")+" *";
    document.getElementById("smTypeLabel").textContent=tr("orderType");

    const deliveryBtn=document.getElementById("smDeliveryBtn");
    const pickupBtn=document.getElementById("smPickupBtn");

    deliveryBtn.textContent=tr("delivery");
    pickupBtn.textContent=tr("pickup");

    deliveryBtn.hidden=!deliveryAllowed();
    pickupBtn.hidden=!pickupAllowed();

    deliveryBtn.style.display=deliveryAllowed()?"":"none";
    pickupBtn.style.display=pickupAllowed()?"":"none";

    document.getElementById("smAddressLabel").textContent=tr("address")+" *";
    document.querySelector("#smGetLocation span").textContent=tr("getLocation");
    document.getElementById("smNotesLabel").textContent=tr("notes");
    document.getElementById("smReviewLabel").textContent=tr("review");
    document.getElementById("smCheckoutTotalLabel").textContent=tr("total");
    document.getElementById("smCheckoutTotal").textContent=money(sum);
    document.getElementById("smSendWhatsApp").textContent=tr("send");

    document.getElementById("smCheckoutSummary").innerHTML=
      cart.map(x=>`<div class="sm-review-item"><span>${x.qty}× ${esc(txt(x.name))} <small>${esc(txt(x.option))}</small></span><b>${money(x.qty*x.price)}</b></div>`).join("");

    const info=document.getElementById("smDeliveryInfo");

    const infoText=
      restaurant().deliveryInfo?.[lang()] ??
      restaurant().deliveryInfo?.ar ??
      "";

    const showInfo=
      restaurant().deliveryInfoEnabled!==false &&
      String(infoText).trim();

    if(info){
      info.innerHTML=`<span class="pb-delivery-live-icon" aria-hidden="true"><i></i>🚚</span><strong>${esc(infoText)}</strong>`;
      info.setAttribute("role","status");
      info.hidden=!showInfo;
      info.style.display=showInfo?"block":"none";
    }

    if(!deliveryAllowed()&&pickupAllowed()){
      orderType="pickup";
    }else if(deliveryAllowed()&&!pickupAllowed()){
      orderType="delivery";
    }

    setOrderType(orderType);
  }
  function sendWhatsApp(){
    syncLivePrices();

    if(!ordersAllowed()){
      toast(closedMessage());
      syncOrderState();
      return;
    }

    const currentDB=window.RESTBR_DB;

    const unavailableItem=cart.find(item=>{
      const product=currentDB?.products?.find(
        p=>String(p.id)===String(item.productId)
      );
      return product?.badges?.unavailable===true;
    });

    if(unavailableItem){
      toast(
        lang()==="en"
          ?"One of the items in your cart is not available right now."
          :lang()==="ku"
            ?"یەکێک لە بەرهەمەکانی سەبەتەکەت لە ئێستادا بەردەست نییە."
            :"أحد الأصناف في السلة غير متوفر حالياً."
      );
      return;
    }

    const name=document.getElementById("smCustomerName").value.trim().slice(0,80);
    let phone=normalizeDigits(document.getElementById("smCustomerPhone").value).trim().slice(0,20);
    const address=document.getElementById("smCustomerAddress").value.trim().slice(0,300);
    const notes=document.getElementById("smCustomerNotes").value.trim().slice(0,500);

    if(!name||!phone||(orderType==="delivery"&&!address)){
      toast(tr("required"));
      return;
    }

    phone=phone.replace(/\s+/g,"");

    const phoneDigits=phone.replace(/\D/g,"");
    if(!/^[+\d().-]+$/.test(phone)||phoneDigits.length<7||phoneDigits.length>15){
      toast(tr("phoneInvalid"));
      return;
    }

    if(/^7\d{9}$/.test(phone)) phone="0"+phone;
    if(/^9647\d{9}$/.test(phone)) phone="+"+phone;

    const {sum}=totals();

    const orderNonce=
      globalThis.crypto?.randomUUID
        ? crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()
        : Math.random().toString(36).slice(2,10).toUpperCase().padEnd(8,"0");

    const id=
      orderIdPrefix()+"-"+
      new Date().toISOString().slice(2,10).replaceAll("-","")+
      "-"+
      String(Date.now()).slice(-5)+
      "-"+
      orderNonce;

    const mono=v=>"```"+v+"```";
    const bold=v=>"*"+v+"*";

    const cleanOption=x=>{
      const n=txt(x.name).trim();
      const o=txt(x.option).trim();
      return o&&o!==n?o:"";
    };

    const restaurantName=
      restaurant().nameEn ||
      restaurant().name ||
      restaurant().nameAr ||
      "Restaurant";

    let lines=[
      `🍽️ ${bold(restaurantName)}`,
      `🧾 رقم الطلب: ${mono(id)}`,
      ``,
      `👤 ${bold(name)}`,
      `📞 ${phone}`,
      `${orderType==="delivery"?"🚚":"🥡"} ${bold(tr(orderType))}`
    ];

    if(orderType==="delivery"){
      lines.push(`📍 ${address}`);
      if(customerLocation){
        lines.push(`🗺️ ${customerLocation}`);
      }
    }

    lines.push(
      ``,
      `━━━━━━━━━━━━`,
      `🛒 ${bold("تفاصيل الطلب")}`,
      ``
    );

    cart.forEach((x,i)=>{
      const option=cleanOption(x);

      lines.push(`${i+1}. ${bold(txt(x.name))}`);
      lines.push(
        option
          ? `   └ ${option} × ${x.qty}`
          : `   └ × ${x.qty}`
      );
      lines.push(`   ${mono(money(x.qty*x.price))}`);

      if(i<cart.length-1){
        lines.push(``);
      }
    });

    lines.push(
      ``,
      `━━━━━━━━━━━━`,
      `💰 ${bold("الإجمالي")}: ${mono(money(sum))}`
    );

    if(notes){
      lines.push(
        ``,
        `📝 ${bold("ملاحظات الطلب")}`,
        notes
      );
    }

    const url=
      `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(lines.join("\n"))}`;

    window.location.href=url;
  }
  function choiceOpen(v){ensureUI();document.getElementById("smChoiceSheet").classList.toggle("open",v);document.getElementById("smChoiceBackdrop").classList.toggle("open",v);document.getElementById("smChoiceSheet").setAttribute("aria-hidden",String(!v));lock();if(v)focusSoon("smChoiceClose")}

  function addItem(p,oi){if(!ordersAllowed()){toast(closedMessage());syncOrderState();return}const o=(p.options||[])[oi];if(!o)return;const key=`${p.id}:${oi}`,found=cart.find(x=>x.key===key);if(found){found.qty++;found.price=Number(o.price||0);if(o.id!==undefined&&o.id!==null)found.optionId=o.id}else cart.push({key,productId:p.id,optionId:o.id??null,optionIndex:oi,name:localized(p.name),option:localized({ar:o.ar,ku:o.ku,en:o.en}),price:Number(o.price||0),image:safeMedia(p.image),qty:1});window.RESTBR_TRACK?.("product_interest",p.id);save();toast(tr("added"))}
  function addFromButton(btn){const D=window.RESTBR_DB;if(!D)return;const p=D.products.find(x=>String(x.id)===String(btn.dataset.productId));if(!p)return;addItem(p,Number(btn.dataset.optionIndex))}
  function showChoices(productId){if(!ordersAllowed()){toast(closedMessage());syncOrderState();return}const D=window.RESTBR_DB;if(!D)return;const p=D.products.find(x=>String(x.id)===String(productId));if(!p)return;ensureUI();document.getElementById("smChoiceLabel").textContent=tr("choose");document.getElementById("smChoiceTitle").textContent=txt(p.name);document.getElementById("smChoiceList").innerHTML=(p.options||[]).map((o,i)=>`<button class="sm-choice-option" type="button" data-choice-product="${esc(p.id)}" data-choice-index="${i}"><span>${esc(txt(o))}</span><b>${money(o.price)}</b><i>+</i></button>`).join("");choiceOpen(true)}
  function showImage(img){ensureUI();const v=document.getElementById("smImageViewer"),full=document.getElementById("smImageFull"),source=safeMedia(img.dataset.fullImage||img.src,"");if(source)full.src=source;else full.removeAttribute("src");full.alt=img.alt||"";document.getElementById("smImageCaption").textContent=img.dataset.productName||img.alt||"";v.classList.add("open");v.setAttribute("aria-hidden","false");lock();focusSoon("smImageClose")}
  function closeImage(){const v=document.getElementById("smImageViewer");if(!v)return;v.classList.remove("open");v.setAttribute("aria-hidden","true");lock()}
  function change(key,d){const x=cart.find(i=>i.key===key);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.key!==key);save()}
  function remove(key){cart=cart.filter(i=>i.key!==key);save()}
  function render(){
    ensureUI();
    const {qty,sum}=totals();
    const fab=document.getElementById("smCartFab");
    document.getElementById("smCartFabText").textContent=qty?`${qty} • ${money(sum)}`:tr("cart");
    fab.classList.toggle("has-items",qty>0);
    fab.setAttribute("aria-label",qty?`${tr("cart")}: ${qty}، ${money(sum)}`:tr("cart"));
    ["smCartClose","smCheckoutClose","smChoiceClose","smImageClose"].forEach(id=>document.getElementById(id)?.setAttribute("aria-label",tr("close")));
    document.getElementById("smCartTitle").textContent=tr("cart");
    document.getElementById("smCartTotalLabel").textContent=tr("total");
    document.getElementById("smCartTotal").textContent=money(sum);
    document.getElementById("smCartContinue").textContent=tr("continue");
    const clearBtn=document.getElementById("smCartClear");
    clearBtn.textContent=tr("clear");
    clearBtn.disabled=!cart.length;
    const box=document.getElementById("smCartItems");
    if(!cart.length){box.innerHTML=`<div class="sm-cart-empty"><div aria-hidden="true">🛒</div><span>${tr("empty")}</span></div>`;return}
    box.innerHTML=cart.map(x=>{const name=txt(x.name);return `<div class="sm-cart-item"><img src="${esc(safeMedia(x.image))}" alt=""><div class="sm-cart-item-info"><strong>${esc(name)}</strong><small>${esc(txt(x.option))}</small><b>${money(x.price)}</b></div><div class="sm-cart-qty"><button data-cart-plus="${esc(x.key)}" type="button" aria-label="${esc(tr("increase")+": "+name)}">+</button><span>${x.qty}</span><button data-cart-minus="${esc(x.key)}" type="button" aria-label="${esc(tr("decrease")+": "+name)}">−</button></div><button class="sm-cart-remove" data-cart-remove="${esc(x.key)}" type="button" aria-label="${esc(tr("remove")+": "+name)}">×</button></div>`}).join("")
  }
  let timer;function toast(msg){ensureUI();const e=document.getElementById("smCartToast");e.textContent=msg;e.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>e.classList.remove("show"),1300)}
  document.addEventListener("click",e=>{const a=e.target.closest(".sm-add-cart,.sm-direct-add");if(a){e.preventDefault();addFromButton(a);return}const choose=e.target.closest(".sm-choose-options");if(choose){e.preventDefault();showChoices(choose.dataset.productId);return}const choice=e.target.closest("[data-choice-product]");if(choice){const D=window.RESTBR_DB,p=D&&D.products.find(x=>String(x.id)===String(choice.dataset.choiceProduct));if(p){addItem(p,Number(choice.dataset.choiceIndex));choiceOpen(false)}return}const image=e.target.closest(".sm-product-image");if(image){showImage(image);return}const p=e.target.closest("[data-cart-plus]");if(p){change(p.dataset.cartPlus,1);return}const m=e.target.closest("[data-cart-minus]");if(m){change(m.dataset.cartMinus,-1);return}const r=e.target.closest("[data-cart-remove]");if(r){remove(r.dataset.cartRemove);return}if(e.target.closest("[data-lang]"))setTimeout(()=>{render();syncOrderState()},40)});
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const image=document.getElementById("smImageViewer"),choice=document.getElementById("smChoiceSheet"),checkout=document.getElementById("smCheckoutSheet"),drawer=document.getElementById("smCartDrawer");if(image?.classList.contains("open")){closeImage();return}if(choice?.classList.contains("open")){choiceOpen(false);return}if(checkout?.classList.contains("open")){checkoutOpen(false);return}if(drawer?.classList.contains("open"))open(false)});
  document.addEventListener("dblclick",e=>{if(e.target.closest("button,.sm-product-image"))e.preventDefault()},{passive:false});
  window.addEventListener("restbr:prices-updated",()=>{syncLivePrices()});
  window.addEventListener("restbr:ready",()=>{syncLivePrices();render();syncOrderState()});load();ensureUI();render();syncOrderState();
})();

/* js/cart-stale-item-guard.js */
(() => {
  const KEY = 'RESTBR_CART_V1';

  const TEXT = {
    ar: 'تمت إزالة صنف لم يعد متوفراً من السلة',
    ku: 'بەرهەمێک کە چیتر بەردەست نەبوو لە سەبەتە لابرا',
    en: 'An item that is no longer available was removed from your cart'
  };

  function currentLang(){
    const value = window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem('RESTBR_LANG_V1') || 'ar');
    return ['ar','ku','en'].includes(value) ? value : 'ar';
  }

  function readCart(){
    try{
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch(_){
      return [];
    }
  }

  function optionStillExists(product, item){
    const options = Array.isArray(product?.options) ? product.options : [];

    if (item.optionId !== undefined && item.optionId !== null) {
      return options.some(option => String(option.id) === String(item.optionId));
    }

    const index = Number(item.optionIndex);
    return Number.isInteger(index) && index >= 0 && !!options[index];
  }

  function itemMustBeRemoved(product, item){
    if (!product) return true;

    // A product can still be visible in the menu while being temporarily
    // unavailable. It must not remain in an existing cart in that state.
    if (product.badges?.unavailable === true) return true;
    if (product.manualUnavailable === true) return true;

    return !optionStillExists(product, item);
  }

  function staleKeys(){
    const DB = window.RESTBR_DB;
    if (!DB || !Array.isArray(DB.products)) return [];

    return readCart()
      .filter(item => {
        const product = DB.products.find(
          p => String(p.id) === String(item.productId)
        );

        return itemMustBeRemoved(product, item);
      })
      .map(item => String(item.key));
  }

  function showNotice(){
    const toast = document.getElementById('smCartToast');
    if (!toast) return;

    toast.textContent = TEXT[currentLang()] || TEXT.ar;
    toast.classList.add('show');
    clearTimeout(window.__smStaleCartToastTimer);
    window.__smStaleCartToastTimer = setTimeout(
      () => toast.classList.remove('show'),
      2400
    );
  }

  function removeThroughCart(key){
    const button = [...document.querySelectorAll('[data-cart-remove]')]
      .find(btn => String(btn.dataset.cartRemove) === String(key));

    if (!button) return false;
    button.click();
    return true;
  }

  function sanitize(){
    const keys = staleKeys();
    if (!keys.length) return false;

    let removed = 0;

    keys.forEach(key => {
      if (removeThroughCart(key)) removed += 1;
    });

    if (!removed) {
      const stale = new Set(keys);
      const clean = readCart().filter(item => !stale.has(String(item.key)));
      localStorage.setItem(KEY, JSON.stringify(clean));

      // Cart UI may not be open yet, so ask the existing cart code to refresh
      // on the next menu event and still show the notice when possible.
      showNotice();
      return true;
    }

    showNotice();
    return true;
  }

  function schedule(){
    setTimeout(sanitize, 0);
    setTimeout(sanitize, 120);
    setTimeout(sanitize, 450);
  }

  window.addEventListener('restbr:ready', schedule);
  window.addEventListener('restbr:prices-updated', schedule);

  document.addEventListener('click', event => {
    if (
      event.target.closest('#smCartContinue') ||
      event.target.closest('#smSendWhatsApp') ||
      event.target.closest('#smCartFab')
    ) {
      sanitize();
    }
  }, true);
})();

/* js/live-prices.js */
(() => {
  if (window.__RESTBR_LIVE_PRICES_V3__) return;
  window.__RESTBR_LIVE_PRICES_V3__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  const PRICE_SYNC_INTERVAL_MS = 5 * 60 * 1000;
  let channel = null;
  let started = false;
  let activeChoiceProductId = null;
  let syncInFlight = null;

  const client = () =>
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : null;

  const lang = () =>
    window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem("RESTBR_LANG_V1") || "ar");

  const money = value => {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toLocaleString("en-US") + " " + (lang() === "en" ? "IQD" : "د.ع");
  };

  const db = () => window.RESTBR_DB;

  function productById(productId) {
    return db()?.products?.find(
      product => String(product.id) === String(productId)
    ) || null;
  }

  function optionById(product, optionId) {
    return product?.options?.find(
      option => String(option.id) === String(optionId)
    ) || null;
  }

  function productCard(productId) {
    return [...document.querySelectorAll("[data-product-card]")].find(
      card => String(card.dataset.productCard) === String(productId)
    ) || null;
  }

  function retailPrice(product, originalPrice) {
    const original = Number(originalPrice);
    if (!Number.isFinite(original) || original < 0) return null;

    const amount = Math.max(0, Number(product?.discountAmount || 0));
    if (Number.isFinite(amount) && amount > 0) {
      return Math.max(0, Math.round(original - amount));
    }

    // Legacy compatibility only. Pasha admin now creates fixed-IQD discounts.
    const percent = Math.max(
      0,
      Math.min(100, Number(product?.discountPercent || 0))
    );

    if (!percent) return original;
    return Math.max(0, Math.round(original * (100 - percent) / 100));
  }

  function refreshProductDom(productId) {
    const product = productById(productId);
    const card = productCard(productId);

    if (product && card) {
      const rows = [...card.querySelectorAll(".sm-option")];

      (product.options || []).forEach((option, index) => {
        const row = rows[index];
        const price = row?.querySelector(".sm-price");
        if (price) price.textContent = money(option.price);

        const old = row?.querySelector(".pb-old-price");
        const original = Number(option.originalPrice ?? option.__retailOriginalPrice);
        const current = Number(option.price);

        if (old && Number.isFinite(original) && original > current) {
          old.textContent = money(original);
        }
      });
    }

    if (
      product &&
      activeChoiceProductId !== null &&
      String(activeChoiceProductId) === String(productId)
    ) {
      const choiceRows = [...document.querySelectorAll("#smChoiceList .sm-choice-option")];

      (product.options || []).forEach((option, index) => {
        const price = choiceRows[index]?.querySelector("b");
        if (price) price.textContent = money(option.price);
      });
    }
  }

  function notifyPriceUpdate(detail = {}) {
    window.dispatchEvent(
      new CustomEvent("restbr:prices-updated", { detail })
    );
  }

  function applyRow(row, notify = true) {
    if (!row || row.id === undefined || row.product_id === undefined) return false;

    const product = productById(row.product_id);
    const option = optionById(product, row.id);
    if (!product || !option) return false;

    const originalPrice = Number(row.price);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) return false;

    const nextPrice = retailPrice(product, originalPrice);
    if (!Number.isFinite(nextPrice)) return false;

    const previousPrice = Number(option.price);
    const previousOriginal = Number(option.originalPrice ?? option.__retailOriginalPrice);
    const changed = previousPrice !== nextPrice || previousOriginal !== originalPrice;

    option.__retailOriginalPrice = originalPrice;
    option.originalPrice = originalPrice;
    option.price = nextPrice;

    if (changed) refreshProductDom(product.id);

    if (changed && notify) {
      notifyPriceUpdate({
        productId: product.id,
        optionId: option.id,
        price: nextPrice,
        originalPrice,
        discountAmount: Number(product.discountAmount || 0),
        discountPercent: Number(product.discountPercent || 0)
      });
    }

    return changed;
  }

  async function fetchAllPriceRows() {
    const sb = client();
    if (!sb) return [];

    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await sb
        .from("product_options")
        .select("id,product_id,price")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;

      if (from >= MAX_ROWS) {
        throw new Error(`product_options exceeded ${MAX_ROWS} row live-price safety limit`);
      }
    }

    return rows;
  }

  async function syncAllPrices() {
    if (syncInFlight) return syncInFlight;

    syncInFlight = (async () => {
      const sb = client();
      if (!sb || !db()?.products) return false;

      let data;
      try {
        data = await fetchAllPriceRows();
      } catch (error) {
        console.warn("Live price sync failed:", error?.message || error);
        return false;
      }

      const touchedProducts = new Set();
      let changed = false;

      data.forEach(row => {
        const didChange = applyRow(row, false);
        if (didChange) {
          changed = true;
          touchedProducts.add(String(row.product_id));
        }
      });

      touchedProducts.forEach(refreshProductDom);

      if (changed) {
        notifyPriceUpdate({
          bulk: true,
          rows: data.length,
          retailDiscountAware: true,
          fixedAmountAware: true
        });
      }

      return changed;
    })().finally(() => {
      syncInFlight = null;
    });

    return syncInFlight;
  }

  function start() {
    const sb = client();
    if (started || !sb || !db()?.products) return;
    started = true;

    // Realtime is the primary price-update path. One full sync after the channel
    // subscribes closes the small race window between the first menu load and
    // Realtime becoming active without doing two immediate catalog reads.
    channel = sb
      .channel("restbr-live-prices-v3")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_options"
        },
        payload => {
          if (payload.eventType === "DELETE") {
            void syncAllPrices();
            return;
          }

          applyRow(payload.new, true);
        }
      )
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          void syncAllPrices();
        }
      });

    // Reconciliation remains as a safety net for missed Realtime events, but it
    // no longer re-downloads every price every 30 seconds or while the tab is hidden.
    window.setInterval(() => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      void syncAllPrices();
    }, PRICE_SYNC_INTERVAL_MS);
  }

  document.addEventListener("click", event => {
    const choose = event.target.closest(".sm-choose-options");
    if (choose) {
      activeChoiceProductId = choose.dataset.productId || null;
    }

    if (event.target.closest("#smChoiceClose,#smChoiceBackdrop")) {
      activeChoiceProductId = null;
    }
  }, true);

  window.addEventListener("online", () => void syncAllPrices());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncAllPrices();
  });

  window.addEventListener("restbr:catalog-expanded", () => void syncAllPrices());
  window.addEventListener("restbr:commerce-ready", () => void syncAllPrices());
  window.addEventListener("restbr:fixed-discounts-ready", () => void syncAllPrices());

  window.addEventListener("restbr:ready", start, { once: true });

  if (db()?.products) {
    start();
  }
})();

/* js/pasha-baby-fixed-discounts.js */
(() => {
  if (window.__PASHA_BABY_FIXED_DISCOUNTS_V1__) return;
  window.__PASHA_BABY_FIXED_DISCOUNTS_V1__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  let cachedDiscounts = [];
  let loadPromise = null;
  let boundaryTimer = null;
  let channel = null;
  let decorationFrame = 0;

  const client = () =>
    typeof supabaseClient !== 'undefined' && supabaseClient
      ? supabaseClient
      : null;

  const amountOf = row => {
    const amount = Number(row?.discount_amount || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };

  function discountIsLive(row, now = Date.now()) {
    if (!row || row.is_active === false || amountOf(row) <= 0) return false;
    const start = row.starts_at ? Date.parse(row.starts_at) : null;
    const end = row.ends_at ? Date.parse(row.ends_at) : null;
    if (Number.isFinite(start) && now < start) return false;
    if (Number.isFinite(end) && now >= end) return false;
    return true;
  }

  function effectiveDiscount(discounts, product) {
    const productId = String(product?.id || '');
    const categoryId = String(product?.category?.id || '');
    const live = (discounts || []).filter(row => discountIsLive(row));
    const scopes = [
      live.filter(row => row.scope_type === 'product' && String(row.target_id || '') === productId),
      live.filter(row => row.scope_type === 'category' && String(row.target_id || '') === categoryId),
      live.filter(row => row.scope_type === 'restaurant')
    ];

    for (const rows of scopes) {
      if (!rows.length) continue;
      return rows.reduce((best, row) => amountOf(row) > amountOf(best) ? row : best);
    }
    return null;
  }

  function originalPrice(option) {
    const candidates = [option?.__retailOriginalPrice, option?.originalPrice, option?.price];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function fixedPrice(original, amount) {
    const value = Number(original);
    const discount = Number(amount);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (!Number.isFinite(discount) || discount <= 0) return value;
    return Math.max(0, Math.round(value - discount));
  }

  function applyToData(discounts = cachedDiscounts) {
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return false;

    DB.products.forEach(product => {
      const discount = effectiveDiscount(discounts, product);
      const amount = amountOf(discount);

      product.discountAmount = amount;
      product.discountPercent = 0;
      product.discountScope = discount?.scope_type || '';
      product.discountId = discount?.id || '';

      if (product.badges && product.__retailBaseOffer !== undefined) {
        product.badges.offer = product.__retailBaseOffer === true;
      }

      (product.options || []).forEach(option => {
        const original = originalPrice(option);
        option.__retailOriginalPrice = original;
        option.originalPrice = original;
        option.price = fixedPrice(original, amount);
        option._discountPercent = 0;
        option._discountAmount = amount;
      });
    });

    window.RESTBR_FIXED_DISCOUNTS_READY = true;
    return true;
  }

  function ensureActionRow(card, action) {
    if (!action) return null;
    let row = action.closest('.pb-product-action-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'pb-product-action-row';
      action.parentNode?.insertBefore(row, action);
      row.appendChild(action);
    }

    const preview = row.querySelector('[data-pb-color-preview]');
    if (preview) row.parentNode?.insertBefore(preview, row);
    return row;
  }

  function decorateCards() {
    decorationFrame = 0;
    const DB = window.RESTBR_DB;
    if (!DB?.products?.length) return;

    const byId = new Map(DB.products.map(product => [String(product.id), product]));

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = byId.get(String(card.dataset.productCard || ''));
      if (!product) return;

      card.querySelectorAll('.pb-discount-badge,.sm-live-discount').forEach(node => node.remove());

      const amount = Math.max(0, Number(product.discountAmount || 0));
      const action = card.querySelector('.sm-direct-add,.sm-choose-options');
      const row = ensureActionRow(card, action);
      let chip = row?.querySelector(':scope > .pb-fixed-discount-chip') || null;

      if (amount > 0 && row && action) {
        if (!chip) {
          chip = document.createElement('span');
          chip.className = 'pb-fixed-discount-chip';
          row.appendChild(chip);
        }
        chip.textContent = 'خصم';
        chip.title = 'يوجد خصم على هذا الصنف';
        chip.setAttribute('aria-label', 'خصم');
      } else {
        chip?.remove();
      }

      [...card.querySelectorAll('.sm-option')].forEach((optionRow, index) => {
        const option = (product.options || [])[index];
        const buy = optionRow.querySelector('.sm-option-buy');
        if (!option || !buy) return;

        const original = Number(option.originalPrice ?? option.__retailOriginalPrice ?? option.price ?? 0);
        const current = Number(option.price ?? 0);
        if (amount > 0 && Number.isFinite(original) && original > current && current >= 0) {
          buy.innerHTML = `
            <span class="pb-price-stack">
              <span class="pb-old-price">${Math.max(0, original).toLocaleString('en-US')} د.ع</span>
              <b class="sm-price">${Math.max(0, current).toLocaleString('en-US')} د.ع</b>
            </span>`;
        }
      });
    });
  }

  function scheduleDecoration() {
    if (decorationFrame) return;
    decorationFrame = requestAnimationFrame(decorateCards);
  }

  function publish({ render = true, detail = {} } = {}) {
    if (!applyToData()) return false;
    if (render && typeof window.render === 'function') window.render();
    scheduleDecoration();
    window.dispatchEvent(new CustomEvent('restbr:prices-updated', {
      detail: { fixedDiscounts: true, ...detail }
    }));
    window.dispatchEvent(new CustomEvent('restbr:fixed-discounts-ready', {
      detail: { discounts: cachedDiscounts }
    }));
    return true;
  }

  function scheduleBoundary() {
    clearTimeout(boundaryTimer);
    boundaryTimer = null;

    const now = Date.now();
    const future = [];
    cachedDiscounts.forEach(row => {
      for (const raw of [row.starts_at, row.ends_at]) {
        if (!raw) continue;
        const stamp = Date.parse(raw);
        if (Number.isFinite(stamp) && stamp > now) future.push(stamp);
      }
    });

    if (!future.length) return;
    const next = Math.min(...future);
    const delay = Math.min(2147483000, Math.max(100, next - now + 120));
    boundaryTimer = setTimeout(() => {
      publish({ render: true, detail: { boundary: true } });
      scheduleBoundary();
    }, delay);
  }

  async function fetchDiscounts() {
    const sb = client();
    if (!sb) return [];

    const rows = [];
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from('discounts')
        .select('id,discount_amount,discount_percent,price_mode,scope_type,target_id,is_active,starts_at,ends_at,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const page = Array.isArray(data) ? data : [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from >= MAX_ROWS) throw new Error(`discounts exceeded ${MAX_ROWS} row safety limit`);
    }

    return rows.filter(row => amountOf(row) > 0);
  }

  async function reload({ render = true } = {}) {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        cachedDiscounts = await fetchDiscounts();
        publish({ render, detail: { refreshed: true } });
        scheduleBoundary();
        return true;
      } catch (error) {
        console.error('PASHA FIXED DISCOUNTS LOAD ERROR:', error);
        return false;
      }
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  function subscribe() {
    const sb = client();
    if (!sb || channel) return;

    channel = sb
      .channel('pasha-fixed-discounts-v1')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'discounts'
      }, () => void reload({ render: true }))
      .subscribe();
  }

  function observeMenu() {
    const menu = document.getElementById('smMenu');
    if (!menu || menu.dataset.pbFixedDiscountObserver === '1') return;
    menu.dataset.pbFixedDiscountObserver = '1';
    new MutationObserver(scheduleDecoration).observe(menu, { childList: true, subtree: true });
  }

  function start() {
    observeMenu();
    subscribe();
    void reload({ render: true });
  }

  window.addEventListener('restbr:catalog-expanded', () => void reload({ render: true }));
  window.addEventListener('restbr:commerce-ready', () => {
    if (cachedDiscounts.length) publish({ render: true, detail: { afterCommerce: true } });
  });
  window.addEventListener('online', () => void reload({ render: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reload({ render: false });
  });

  window.addEventListener('restbr:ready', start, { once: true });
  if (window.RESTBR_DB?.products) start();
})();

/* js/live-card-badges.js */
(() => {
  'use strict';

  const LABELS = {
    ar: percent => `🏷 خصم ${percent}%`,
    ku: percent => `🏷 داشکاندنی ${percent}%`,
    en: percent => `🏷 ${percent}% OFF`
  };

  let frame = 0;

  const currentLanguage = () => {
    const value = document.documentElement.lang || localStorage.getItem('RESTBR_LANG_V1') || 'ar';
    return ['ar', 'ku', 'en'].includes(value) ? value : 'ar';
  };

  const discountPercent = product => Math.max(
    0,
    ...(Array.isArray(product?.options) ? product.options : [])
      .map(option => Number(option?._discountPercent || 0))
      .filter(value => Number.isFinite(value) && value > 0 && value <= 100)
  );

  function badgeHolder(card) {
    let holder = card.querySelector('.sm-badges');
    if (holder) return holder;

    holder = document.createElement('div');
    holder.className = 'sm-badges';
    holder.dataset.liveBadgesCreated = 'true';
    card.querySelector('.sm-img')?.before(holder);
    return holder;
  }

  function syncCard(card, product) {
    const percent = discountPercent(product);
    let holder = card.querySelector('.sm-badges');
    const manualOffer = holder?.querySelector('.sm-display-badge.offer:not(.sm-live-discount)');

    if (!percent) {
      manualOffer?.classList.remove('sm-badge-suppressed');
      holder?.querySelector('.sm-live-discount')?.remove();
      if (holder?.dataset.liveBadgesCreated === 'true' && !holder.children.length) holder.remove();
      return;
    }

    holder = holder || badgeHolder(card);
    manualOffer?.classList.add('sm-badge-suppressed');

    let badge = holder.querySelector('.sm-live-discount');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sm-display-badge offer sm-live-discount';
      badge.dataset.badgeKind = 'discount';
      holder.prepend(badge);
    }

    const label = LABELS[currentLanguage()](Number(percent.toFixed(2)));
    if (badge.textContent !== label) badge.textContent = label;
  }

  function syncAll() {
    frame = 0;
    const products = Array.isArray(window.RESTBR_DB?.products) ? window.RESTBR_DB.products : [];
    const byId = new Map(products.map(product => [String(product?.id ?? ''), product]));

    document.querySelectorAll('[data-product-card]').forEach(card => {
      const product = byId.get(String(card.dataset.productCard || ''));
      if (product) syncCard(card, product);
    });
  }

  function scheduleSync() {
    if (frame) return;
    frame = requestAnimationFrame(syncAll);
  }

  window.addEventListener('restbr:ready', scheduleSync);
  window.addEventListener('restbr:prices-updated', scheduleSync);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-lang]')) setTimeout(scheduleSync, 60);
  });

  const start = () => {
    const menu = document.getElementById('smMenu');
    if (menu) new MutationObserver(scheduleSync).observe(menu, { childList: true, subtree: true });
    scheduleSync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* js/card-life-effects.js */
(() => {
  const STYLE_ID = 'smCardLifeEffectsStyle';
  const MENU_ID = 'smMenu';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* RESTBR — correct logo motion wiring for the current HTML structure. */
      .sm-logo-wrap{
        width:94px;
        height:94px;
        margin:auto;
        border-radius:50%;
        border:1px solid rgba(185,137,69,.45);
        box-shadow:0 18px 50px #0008;
        position:relative;
        overflow:visible;
        animation:smLogoFloat 4.8s ease-in-out infinite;
        will-change:transform,filter;
      }
      .sm-logo-wrap::before{
        content:"";
        position:absolute;
        inset:-7px;
        border-radius:50%;
        border:1px solid rgba(232,184,98,.22);
        box-shadow:0 0 24px rgba(225,164,69,.10);
        animation:smLogoHalo 3.8s ease-in-out infinite;
        pointer-events:none;
      }
      .sm-logo{
        width:100%!important;
        height:100%!important;
        margin:0!important;
        border:0!important;
        display:block;
        object-fit:cover;
        border-radius:50%;
        overflow:hidden;
        box-shadow:0 10px 30px rgba(0,0,0,.55);
        animation:smLogoBreath 5.5s ease-in-out infinite!important;
        will-change:filter;
      }

      /* RESTBR — subtle living-card effects */
      #smMenu .sm-card.sm-life-ready{
        will-change:translate,filter;
      }

      /* Keep the existing reveal, but make the entrance feel softer/alive. */
      #smMenu .sm-card.sm-life-ready.sm-reveal:not(.sm-visible){
        filter:blur(2px) brightness(.92);
      }

      #smMenu .sm-card.sm-life-ready.sm-reveal.sm-visible{
        filter:none;
        transition:
          opacity .62s ease,
          transform .62s cubic-bezier(.2,.78,.2,1),
          filter .62s ease,
          outline-color .24s ease;
        animation:smCardMicroFloat 7.4s ease-in-out infinite;
        animation-delay:var(--sm-life-float-delay,.75s);
      }

      #smMenu .sm-grid .sm-card:nth-child(3n+1){
        --sm-life-float-delay:.75s;
        --sm-life-breathe-delay:.2s;
        --sm-life-sheen-delay:1.4s;
      }
      #smMenu .sm-grid .sm-card:nth-child(3n+2){
        --sm-life-float-delay:1.35s;
        --sm-life-breathe-delay:1.1s;
        --sm-life-sheen-delay:4.2s;
      }
      #smMenu .sm-grid .sm-card:nth-child(3n+3){
        --sm-life-float-delay:1.9s;
        --sm-life-breathe-delay:2s;
        --sm-life-sheen-delay:6.8s;
      }

      @keyframes smCardMicroFloat{
        0%,100%{translate:0 0}
        50%{translate:0 -2px}
      }

      /* Food-image breathing. Uses individual scale so it does not fight
         the existing mobile transform rules. */
      #smMenu .sm-card.sm-life-ready .sm-product-image{
        scale:1;
        transform-origin:50% 50%;
        will-change:scale,filter;
        animation:smFoodBreathing 7.8s ease-in-out infinite;
        animation-delay:var(--sm-life-breathe-delay,.2s);
      }

      @keyframes smFoodBreathing{
        0%,100%{scale:1;filter:brightness(1) saturate(1)}
        50%{scale:1.026;filter:brightness(1.025) saturate(1.025)}
      }

      /* Real overlay element, so it works even where the old card
         pseudo-elements are intentionally disabled on mobile. */
      #smMenu .sm-card .sm-live-sheen{
        position:absolute;
        z-index:18;
        top:-38%;
        bottom:-38%;
        left:-58%;
        width:28%;
        pointer-events:none;
        opacity:0;
        transform:skewX(-18deg) translateX(-180%);
        background:linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,226,166,.025) 22%,
          rgba(255,244,220,.16) 50%,
          rgba(232,184,98,.055) 76%,
          transparent 100%
        );
        filter:blur(1.4px);
        mix-blend-mode:screen;
        will-change:transform,opacity;
        animation:smCardLightSweep 9.6s ease-in-out infinite;
        animation-delay:var(--sm-life-sheen-delay,1.4s);
      }

      @keyframes smCardLightSweep{
        0%,56%{
          transform:skewX(-18deg) translateX(-180%);
          opacity:0;
        }
        62%{opacity:.22}
        74%{opacity:.72}
        88%{
          transform:skewX(-18deg) translateX(680%);
          opacity:.28;
        }
        93%,100%{
          transform:skewX(-18deg) translateX(680%);
          opacity:0;
        }
      }

      /* Touch response. Existing scale feedback stays intact. */
      #smMenu .sm-card.sm-life-ready:active{
        animation-play-state:paused;
        translate:0 -1px;
      }
      #smMenu .sm-card.sm-life-ready:active .sm-product-image{
        animation-play-state:paused;
        scale:1.02;
      }

      /* Mouse/trackpad lift only, so mobile never gets sticky :hover. */
      @media (hover:hover) and (pointer:fine){
        #smMenu .sm-card.sm-life-ready.sm-visible:hover{
          animation-play-state:paused;
          translate:0 -5px;
          filter:brightness(1.025) drop-shadow(0 12px 18px rgba(0,0,0,.24));
          outline:1px solid rgba(232,184,98,.24);
          outline-offset:-1px;
        }
        #smMenu .sm-card.sm-life-ready.sm-visible:hover .sm-product-image{
          animation-play-state:paused;
          scale:1.045;
          filter:brightness(1.04) saturate(1.035);
        }
      }

      /* Respect the device accessibility preference and save GPU work. */
      @media (prefers-reduced-motion:reduce){
        .sm-logo-wrap,
        .sm-logo-wrap::before,
        .sm-logo,
        #smMenu .sm-card.sm-life-ready,
        #smMenu .sm-card.sm-life-ready.sm-visible,
        #smMenu .sm-card.sm-life-ready .sm-product-image,
        #smMenu .sm-card .sm-live-sheen{
          animation:none!important;
          translate:0!important;
          scale:1!important;
        }
        #smMenu .sm-card.sm-life-ready.sm-reveal{
          filter:none!important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function decorateCards(root = document) {
    const cards = root.matches?.('.sm-card')
      ? [root]
      : [...root.querySelectorAll?.('.sm-card') || []];

    cards.forEach(card => {
      if (!card.classList.contains('sm-life-ready')) {
        card.classList.add('sm-life-ready');
      }

      if (!card.querySelector(':scope > .sm-live-sheen')) {
        const sheen = document.createElement('span');
        sheen.className = 'sm-live-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        card.appendChild(sheen);
      }
    });
  }

  function start() {
    installStyles();

    const menu = document.getElementById(MENU_ID);
    if (!menu) return;

    decorateCards(menu);

    const observer = new MutationObserver(mutations => {
      let needsDecorate = false;

      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('.sm-card') || node.querySelector('.sm-card')) {
            needsDecorate = true;
            break;
          }
        }
        if (needsDecorate) break;
      }

      if (needsDecorate) requestAnimationFrame(() => decorateCards(menu));
    });

    observer.observe(menu, { childList: true, subtree: true });

    window.addEventListener('restbr:ready', () => {
      requestAnimationFrame(() => decorateCards(menu));
      setTimeout(() => decorateCards(menu), 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* js/pasha-baby-ui.js */
(() => {
  if (window.__PASHA_BABY_UI_V13__) return;
  window.__PASHA_BABY_UI_V13__ = true;

  const COPY = {
    ar: {
      name: 'پاشا بيبي',
      tagline: 'مستلزمات الأطفال بشكل واضح وسهل',
      title: 'تسوّق حسب القسم',
      intro: 'مستلزمات الأطفال',
      search: 'ابحث عن منتج...',
      searchLabel: 'البحث في المنتجات',
      pickup: 'استلام من المحل'
    },
    ku: {
      name: 'پاشا بەیبی',
      tagline: 'پێداویستیێن زاروکان، ب شێوەیەکێ ساناهی',
      title: 'ب پۆلێ بگەڕێ',
      intro: 'پێداویستیێن زاروکان',
      search: 'ل بەرهەمەکی بگەڕێ...',
      searchLabel: 'لێگەڕان ل بەرهەمان',
      pickup: 'وەرگرتن ژ دوکانێ'
    },
    en: {
      name: 'Pasha Baby',
      tagline: 'Baby essentials made simple',
      title: 'Shop by category',
      intro: 'BABY ESSENTIALS',
      search: 'Search products...',
      searchLabel: 'Search products',
      pickup: 'Pick up from store'
    }
  };

  function setText(element, value) {
    if (!element) return;
    const next = String(value ?? '');
    if (element.textContent !== next) element.textContent = next;
  }

  function setAttribute(element, name, value) {
    if (!element) return;
    const next = String(value ?? '');
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  }

  function currentLang() {
    const value = String(
      (typeof window.RESTBR_LANG === 'function' ? window.RESTBR_LANG() : '') ||
      localStorage.getItem('RESTBR_LANG_V1') ||
      document.documentElement.lang ||
      'ar'
    ).toLowerCase();
    return ['ar', 'ku', 'en'].includes(value) ? value : 'ar';
  }

  function safeLogoUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (typeof window.RESTBR_SAFE_MEDIA_URL === 'function') {
      return window.RESTBR_SAFE_MEDIA_URL(raw) || '';
    }
    return raw;
  }

  function configuredLogo() {
    const sourceCandidates = [
      document.querySelector('.sm-logo')?.dataset?.originalImage,
      document.querySelector('.sm-intro-logo')?.dataset?.originalImage,
      document.querySelector('.sm-logo')?.getAttribute('src'),
      document.querySelector('.sm-intro-logo')?.getAttribute('src')
    ];

    try {
      if (typeof window.RESTBR_READ_BRAND_CACHE === 'function') {
        sourceCandidates.push(window.RESTBR_READ_BRAND_CACHE()?.logo || '');
      }
    } catch (_) {}

    for (const candidate of sourceCandidates) {
      const safe = safeLogoUrl(candidate);
      if (safe) return safe;
    }
    return '';
  }

  function installLogoStyles() {
    if (document.getElementById('pbDynamicLogoStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbDynamicLogoStyles';
    style.textContent = `
      .pb-brand-mark.has-store-logo,
      .pb-intro-mark.has-store-logo{
        padding:0!important;
        overflow:hidden!important;
        background:#fff!important;
        background-image:none!important;
        color:transparent!important;
      }
      .pb-brand-mark.has-store-logo::before,
      .pb-brand-mark.has-store-logo::after,
      .pb-brand-mark.has-store-logo small{
        display:none!important;
        content:none!important;
      }
      .pb-brand-logo,
      .pb-intro-logo-dynamic{
        display:block!important;
        width:100%!important;
        height:100%!important;
        max-width:100%!important;
        max-height:100%!important;
        object-fit:contain!important;
        object-position:center!important;
        border-radius:inherit!important;
        background:transparent!important;
      }
    `;
    document.head.appendChild(style);
  }

  function syncBrandLogo() {
    installLogoStyles();
    const originalLogo = configuredLogo();
    const logo = typeof window.RESTBR_OPTIMIZED_MEDIA_URL === 'function'
      ? window.RESTBR_OPTIMIZED_MEDIA_URL(originalLogo, 'logo') || originalLogo
      : originalLogo;

    const applyLogo = img => {
      if (!img || !logo) return;
      img.dataset.originalImage = originalLogo;
      img.width = 256;
      img.height = 256;
      img.onerror = () => {
        if (originalLogo && img.getAttribute('src') !== originalLogo) img.src = originalLogo;
      };
      if (img.getAttribute('src') !== logo) img.src = logo;
    };

    const mark = document.querySelector('#pbBrand .pb-brand-mark');
    if (mark) {
      let img = mark.querySelector('.pb-brand-logo');
      if (!img) {
        img = document.createElement('img');
        img.className = 'pb-brand-logo';
        img.alt = '';
        img.decoding = 'async';
        img.fetchPriority = 'high';
        mark.prepend(img);
      }

      if (logo) {
        applyLogo(img);
        img.style.display = 'block';
        mark.classList.add('has-store-logo');
      } else {
        img.removeAttribute('src');
        img.style.display = 'none';
        mark.classList.remove('has-store-logo');
      }
    }

    const introMark = document.getElementById('pbIntroMark');
    if (introMark) {
      let img = introMark.querySelector('.pb-intro-logo-dynamic');
      if (!img) {
        img = document.createElement('img');
        img.className = 'pb-intro-logo-dynamic';
        img.alt = '';
        img.decoding = 'async';
        introMark.prepend(img);
      }

      if (logo) {
        applyLogo(img);
        img.style.display = 'block';
        introMark.classList.add('has-store-logo');
      } else {
        img.removeAttribute('src');
        img.style.display = 'none';
        introMark.classList.remove('has-store-logo');
      }
    }
  }

  function iconFor(value) {
    const text = String(value || '').toLowerCase();
    if (/حفاض|پەمپ|diaper|wipe|مناديل|دەستمال/.test(text)) return '🧷';
    if (/رضاع|حليب|شيشة|bottle|feed|pacifier|لهاية|شیردان|پستانک/.test(text)) return '🍼';
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

  function ensureBrand() {
    const header = document.querySelector('.sm-header');
    if (!header) return;

    let brand = document.getElementById('pbBrand');
    if (!brand) {
      brand = document.createElement('div');
      brand.id = 'pbBrand';
      brand.className = 'pb-brand';
      brand.innerHTML = `
        <div class="pb-brand-mark" aria-hidden="true">PB<small></small></div>
        <div class="pb-brand-name"></div>
        <div class="pb-brand-tagline"></div>
      `;

      const title = header.querySelector('h1');
      if (title) header.insertBefore(brand, title);
      else header.prepend(brand);
    }

    const lang = currentLang();
    setText(brand.querySelector('.pb-brand-name'), COPY[lang].name);
    setText(brand.querySelector('.pb-brand-tagline'), COPY[lang].tagline);
    setAttribute(brand, 'aria-label', COPY[lang].name);
    syncBrandLogo();
  }

  function ensureIntroMark() {
    const intro = document.getElementById('smIntro');
    if (!intro) return;

    let mark = document.getElementById('pbIntroMark');
    if (!mark) {
      mark = document.createElement('div');
      mark.id = 'pbIntroMark';
      mark.className = 'pb-intro-mark';
      mark.append(document.createTextNode('PB'));
      const brand = intro.querySelector('.sm-intro-brand');
      if (brand) intro.insertBefore(mark, brand);
      else intro.prepend(mark);
    }
    syncBrandLogo();
  }

  function decorateCategories() {
    document.querySelectorAll('#smCats .sm-cat').forEach(button => {
      const label = String(button.textContent || '').trim();
      const icon = iconFor(label);
      if (button.dataset.pbIcon !== icon) button.dataset.pbIcon = icon;
    });
  }

  function decorateCards() {
    const sectionTitle = document.querySelector('.sm-section-title')?.textContent || '';

    document.querySelectorAll('#smMenu .sm-card').forEach(card => {
      const category =
        card.querySelector('.sm-search-category')?.textContent ||
        sectionTitle ||
        '';
      const holder = card.querySelector('.sm-img');
      const image = card.querySelector('.sm-product-image');
      if (!holder || !image) return;

      const raw = String(image.getAttribute('src') || '').trim();
      const placeholder =
        !raw ||
        /restaurant-placeholder\.svg(?:\?|$)/i.test(raw) ||
        image.dataset.pbBroken === '1';

      const currentlyPlaceholder = holder.classList.contains('pb-placeholder');
      if (currentlyPlaceholder !== placeholder) {
        holder.classList.toggle('pb-placeholder', placeholder);
      }

      const icon = iconFor(category || image.alt || '');
      if (holder.dataset.pbIcon !== icon) holder.dataset.pbIcon = icon;

      if (!image.dataset.pbErrorBound) {
        image.dataset.pbErrorBound = '1';
        image.addEventListener('error', () => {
          image.dataset.pbBroken = '1';
          if (!holder.classList.contains('pb-placeholder')) {
            holder.classList.add('pb-placeholder');
          }
        });
      }
    });
  }

  function updateStoreCopy() {
    const lang = currentLang();
    const copy = COPY[lang];

    ensureBrand();
    ensureIntroMark();
    syncBrandLogo();

    setText(document.querySelector('.sm-header h1'), copy.title);
    setText(document.querySelector('.sm-intro-brand'), copy.name);
    setText(document.querySelector('.sm-intro-sub'), copy.intro);
    setText(document.getElementById('smPickupBtn'), copy.pickup);
    setText(document.querySelector('.sm-footer h2'), copy.name);

    const search = document.getElementById('smSearchInput');
    if (search && search.placeholder !== copy.search) search.placeholder = copy.search;

    setAttribute(document.getElementById('smSearchToggle'), 'aria-label', copy.searchLabel);

    const currentTitle = `${copy.name} — ${copy.title}`;
    if (document.title !== currentTitle) document.title = currentTitle;

    setAttribute(
      document.querySelector('meta[name="apple-mobile-web-app-title"]'),
      'content',
      copy.name
    );
    setAttribute(document.querySelector('meta[name="theme-color"]'), 'content', '#fffaf5');

    decorateCategories();
    decorateCards();
  }

  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateStoreCopy();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);

  function start() {
    updateStoreCopy();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'class', 'data-lang']
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-lang],[data-sm-gate-lang]')) {
        setTimeout(updateStoreCopy, 30);
        setTimeout(updateStoreCopy, 180);
      }
    });

    window.addEventListener('restbr:ready', () => {
      updateStoreCopy();
      setTimeout(syncBrandLogo, 30);
      setTimeout(syncBrandLogo, 180);
    });

    [120, 350, 800, 1600, 3000].forEach(delay => setTimeout(updateStoreCopy, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* js/pasha-baby-storefront-v2.js */
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

/* js/pasha-baby-retail-interactions-v3.js */
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

/* js/pasha-baby-retail-v4.js */
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
    const card = image.closest('[data-product-card]');
    if (card && typeof window.PASHA_OPEN_PRODUCT_DETAILS === 'function') {
      window.PASHA_OPEN_PRODUCT_DETAILS(card, image);
    }
    event.preventDefault();
    event.stopPropagation();
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
