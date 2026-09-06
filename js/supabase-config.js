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
    script.src = 'js/pasha-arabic-only.js?v=1.0';
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

// Final admin-only light-theme completion layer for hard-coded dark components.
(() => {
  if (!RESTBR_IS_ADMIN_PATH) return;
  if (document.getElementById('restbrAdminLightThemeCompleteScript')) return;

  const script = document.createElement('script');
  script.id = 'restbrAdminLightThemeCompleteScript';
  script.src = 'js/admin-light-theme-complete.js?v=1.1';
  script.async = false;
  document.head.appendChild(script);
})();
