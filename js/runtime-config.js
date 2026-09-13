// PASHA BABY public configuration.
// This copy is connected to its own isolated Supabase project.
// Never put a Supabase service_role key in browser code.
window.RESTBR_CONFIG = Object.freeze({
  restaurantName: 'Pasha Baby',
  businessType: 'retail',
  enableDiningModes: false,
  orderIdPrefix: 'PB',
  supabaseUrl: 'https://wlollfpmjzenhkjwxrqo.supabase.co',
  supabasePublishableKey: 'sb_publishable_VOuh1-xvEayYsNBdDCzRnA_3bcFWUB2',
  enableUserManagement: false,
  enableRestaurantReset: false,
  legacyRestaurantNames: [],
  legacyBackupFormats: [],
  legacyLocalStorageKeys: {},
  legacySessionStorageKeys: {}
});

(() => {
  const config = window.RESTBR_CONFIG || {};

  const uniqueStrings = value => [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    )
  ];

  const legacyBackupFormats = new Set(
    uniqueStrings(config.legacyBackupFormats)
  );

  window.RESTBR_IS_SUPPORTED_BACKUP_FORMAT = value =>
    String(value || '') === 'RESTBR_MENU_BACKUP' ||
    legacyBackupFormats.has(String(value || ''));

  const migrateKeys = (storage, mappings) => {
    if (!storage || !mappings || typeof mappings !== 'object') return false;
    let migrated = false;

    Object.entries(mappings).forEach(([currentKey, legacyKey]) => {
      if (!currentKey || !legacyKey || storage.getItem(currentKey) !== null) return;
      const legacyValue = storage.getItem(String(legacyKey));
      if (legacyValue !== null) {
        storage.setItem(currentKey, legacyValue);
        migrated = true;
      }
    });

    return migrated;
  };

  try {
    const migratedLocal = migrateKeys(window.localStorage, config.legacyLocalStorageKeys);
    migrateKeys(window.sessionStorage, config.legacySessionStorageKeys);
    if (migratedLocal) localStorage.setItem('RESTBR_TEMPLATE_RESET_V1', 'done');
  } catch (_) {}

  const normalizeRestaurantIdentity = value =>
    String(value || '').trim().toLocaleLowerCase('en-US');

  const configuredRestaurantKey = normalizeRestaurantIdentity(config.restaurantName);
  const hasSpecificRestaurantIdentity =
    configuredRestaurantKey &&
    configuredRestaurantKey !== 'restaurant' &&
    configuredRestaurantKey !== 'restaurant name';

  window.RESTBR_RESTAURANT_KEY = hasSpecificRestaurantIdentity
    ? configuredRestaurantKey
    : '';

  window.RESTBR_READ_BRAND_CACHE = () => {
    try {
      const raw = window.localStorage.getItem('RESTBR_BRAND_CACHE_V1');
      if (!raw) return null;

      const cached = JSON.parse(raw);
      if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
        window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1');
        return null;
      }

      if (hasSpecificRestaurantIdentity) {
        const cachedKey = normalizeRestaurantIdentity(cached.restaurantKey);
        const cachedNames = [cached.nameAr, cached.nameKu, cached.nameEn]
          .map(normalizeRestaurantIdentity)
          .filter(Boolean);

        if (
          cachedKey !== configuredRestaurantKey &&
          !cachedNames.includes(configuredRestaurantKey)
        ) {
          window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1');
          return null;
        }
      }

      return cached;
    } catch (_) {
      try { window.localStorage.removeItem('RESTBR_BRAND_CACHE_V1'); } catch (_) {}
      return null;
    }
  };

  window.RESTBR_READ_BRAND_CACHE();

  const applyInitialBrand = () => {
    const name = String(config.restaurantName || '').trim();
    if (!name || name === 'Restaurant' || name === 'Restaurant Name') return;

    document.title = `${name} Store`;
    document.querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', name);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyInitialBrand, { once: true });
  } else {
    applyInitialBrand();
  }
})();

(() => {
  if (document.getElementById('restbrUrlSafetyScript')) return;
  const script = document.createElement('script');
  script.id = 'restbrUrlSafetyScript';
  script.src = 'js/url-safety.js?v=1.5';
  script.defer = true;
  document.head.appendChild(script);
})();

(() => {
  if (document.getElementById('restbrHardeningScript')) return;
  const script = document.createElement('script');
  script.id = 'restbrHardeningScript';
  script.src = 'js/restbr-hardening.js?v=1.0';
  script.defer = true;
  document.head.appendChild(script);
})();

(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  if (/(^|\/)admin(?:\.html)?\/?$/.test(path)) return;
  if (document.getElementById('pbProductDescriptionV2Script')) return;

  const script = document.createElement('script');
  script.id = 'pbProductDescriptionV2Script';
  script.src = 'js/pasha-baby-product-description-v2.js?v=3.0';
  script.defer = true;
  document.head.appendChild(script);
})();

(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  if (/(^|\/)admin(?:\.html)?\/?$/.test(path)) return;
  if (document.getElementById('pbCardDetailsButtonV3Script')) return;

  const script = document.createElement('script');
  script.id = 'pbCardDetailsButtonV3Script';
  script.src = 'js/pasha-baby-details-button-v3.js?v=3.1';
  script.defer = true;
  document.head.appendChild(script);
})();

(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  if (!/(^|\/)admin(?:\.html)?\/?$/.test(path)) return;
  if (document.getElementById('pashaAdminBrandV1Script')) return;

  const script = document.createElement('script');
  script.id = 'pashaAdminBrandV1Script';
  script.src = 'js/pasha-admin-brand-v1.js?v=1.0';
  script.defer = true;
  document.head.appendChild(script);
})();

// Invoice printing V9: keep the proven V8 renderer and print-ready preview.
(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  if (!/(^|\/)admin(?:\.html)?\/?$/.test(path)) return;
  if (document.getElementById('pbInvoicePrintReadyV9Script')) return;

  const script = document.createElement('script');
  script.id = 'pbInvoicePrintReadyV9Script';
  script.src = 'js/admin-invoice-print-ready-v9.js?v=9.0';
  script.defer = true;
  document.head.appendChild(script);
})();

// Invoice print bridge V11: on iPhone/iPad hand the exact final PDF file to the
// native iOS share sheet. Choosing Print there prints the PDF itself, avoiding
// Safari webpage URL/date headers and footers. Unsupported browsers fall back
// to opening the already-proven PDF file.
(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  if (!/(^|\/)admin(?:\.html)?\/?$/.test(path)) return;
  if (document.getElementById('pbInvoicePdfNativeShareV11Script')) return;

  const script = document.createElement('script');
  script.id = 'pbInvoicePdfNativeShareV11Script';
  script.src = 'js/admin-invoice-pdf-native-share-v11.js?v=11.1';
  script.defer = true;
  document.head.appendChild(script);
})();
