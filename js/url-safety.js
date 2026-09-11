// RESTBR URL safety guard
// Restricts clickable configured links to safe schemes while normalizing common shorthands.
(() => {
  if (window.__RESTBR_URL_SAFETY_V1__) return;
  window.__RESTBR_URL_SAFETY_V1__ = true;

  const ALLOWED_SCHEMES = new Set([
    'http:',
    'https:',
    'tel:',
    'mailto:',
    'geo:'
  ]);

  const SAFE_MEDIA_SCHEMES = new Set([
    'http:',
    'https:'
  ]);

  const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
  const RAW_WHITESPACE = /[\s\u00A0]/u;
  const PHONE_SHORTHAND = /^\+?[0-9][0-9().-]{5,}$/;
  const WEB_SHORTHAND = /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:\/[^\s]*)?$/i;

  const CONFIGURED_LINK_SELECTOR = [
    '#smActions a',
    '#smFooterLocation',
    '#smFooterCall',
    '#smFooterWhatsapp',
    '#smFacebook',
    '#smSnapchat',
    '#smTikTok',
    '#smInstagram',
    'a.sm-custom-footer-action',
    'a.sm-custom-social-link'
  ].join(', ');

  function normalizeConfiguredUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    // A phone number entered directly in the dashboard becomes a tel: action.
    if (PHONE_SHORTHAND.test(raw)) return `tel:${raw}`;

    // A normal hostname entered without https:// becomes a secure web URL.
    if (WEB_SHORTHAND.test(raw)) return `https://${raw}`;

    return raw;
  }

  function safeConfiguredUrl(value) {
    let raw = String(value ?? '').trim();
    if (!raw) return '';
    if (CONTROL_CHARACTERS.test(raw) || RAW_WHITESPACE.test(raw)) return '';

    raw = normalizeConfiguredUrl(raw);

    if (
      raw.startsWith('#') ||
      raw.startsWith('/') && !raw.startsWith('//') ||
      raw.startsWith('./') ||
      raw.startsWith('../')
    ) {
      return raw;
    }

    if (raw.startsWith('//')) return '';

    const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*:)/i);
    if (!schemeMatch) return '';

    const scheme = schemeMatch[1].toLowerCase();
    if (!ALLOWED_SCHEMES.has(scheme)) return '';

    try {
      const parsed = new URL(raw, window.location.href);
      if (!ALLOWED_SCHEMES.has(parsed.protocol.toLowerCase())) return '';
      return raw;
    } catch (_) {
      if (['tel:', 'mailto:', 'geo:'].includes(scheme)) return raw;
      return '';
    }
  }

  window.RESTBR_NORMALIZE_CONFIGURED_URL = normalizeConfiguredUrl;
  window.RESTBR_SAFE_CONFIGURED_URL = safeConfiguredUrl;

  function safeMediaUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw || CONTROL_CHARACTERS.test(raw) || RAW_WHITESPACE.test(raw)) return '';
    if (raw.startsWith('//') || raw.startsWith('\\')) return '';

    const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*:)/i);

    // Plain relative files such as assets/logo.png are allowed.
    if (!schemeMatch) return raw.startsWith('#') ? '' : raw;

    const scheme = schemeMatch[1].toLowerCase();
    if (!SAFE_MEDIA_SCHEMES.has(scheme)) return '';

    try {
      const parsed = new URL(raw, window.location.href);
      return SAFE_MEDIA_SCHEMES.has(parsed.protocol.toLowerCase()) ? raw : '';
    } catch (_) {
      return '';
    }
  }

  window.RESTBR_SAFE_MEDIA_URL = safeMediaUrl;

  const SUPABASE_STORAGE_HOST = 'wlollfpmjzenhkjwxrqo.supabase.co';
  const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/menu-images/';
  const PUBLIC_RENDER_PREFIX = '/storage/v1/render/image/public/menu-images/';
  const CURRENT_STORE_LOGO = '/storage/v1/object/public/menu-images/settings/logo/1788645406355-3ib1w5.png';
  const B2_STORAGE_HOST = 'f003.backblazeb2.com';
  const LOCAL_PRODUCT_THUMBNAILS = Object.freeze({
    '/file/pasha-baby-products/products/9c4f903c-a78b-4620-9279-3c696235e55c/main':
      'assets/product-thumbnails/9c4f903c-a78b-4620-9279-3c696235e55c.webp'
  });

  function optimizedMediaUrl(value, preset = 'product-card') {
    const safe = safeMediaUrl(value);
    if (!safe) return '';

    try {
      const parsed = new URL(safe, window.location.href);

      // This exact store logo is bundled locally so the header never downloads
      // the 2.2 MB source image or incurs a transformation request.
      if (
        preset === 'logo' &&
        parsed.hostname === SUPABASE_STORAGE_HOST &&
        parsed.pathname === CURRENT_STORE_LOGO
      ) {
        return 'assets/pasha-baby-logo-256.webp';
      }

      if (
        preset === 'product-card' &&
        parsed.hostname === B2_STORAGE_HOST &&
        LOCAL_PRODUCT_THUMBNAILS[parsed.pathname]
      ) {
        return LOCAL_PRODUCT_THUMBNAILS[parsed.pathname];
      }

      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== SUPABASE_STORAGE_HOST ||
        !parsed.pathname.startsWith(PUBLIC_OBJECT_PREFIX)
      ) {
        return safe;
      }

      parsed.pathname = parsed.pathname.replace(PUBLIC_OBJECT_PREFIX, PUBLIC_RENDER_PREFIX);
      parsed.search = '';
      parsed.searchParams.set('width', preset === 'logo' ? '256' : '480');
      parsed.searchParams.set('height', preset === 'logo' ? '256' : '480');
      parsed.searchParams.set('resize', preset === 'logo' ? 'contain' : 'cover');
      parsed.searchParams.set('quality', preset === 'logo' ? '75' : '72');
      return parsed.href;
    } catch (_) {
      return safe;
    }
  }

  window.RESTBR_OPTIMIZED_MEDIA_URL = optimizedMediaUrl;

  function isConfiguredLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;

    return anchor.matches(CONFIGURED_LINK_SELECTOR);
  }

  function sanitizeAnchor(anchor) {
    if (!isConfiguredLink(anchor)) return;

    const raw = anchor.getAttribute('href') || '';
    if (!raw) return;

    const safe = safeConfiguredUrl(raw);
    if (!safe) {
      anchor.removeAttribute('href');
      anchor.setAttribute('aria-disabled', 'true');
      anchor.dataset.restbrUnsafeUrl = '1';
      return;
    }

    if (safe !== raw) anchor.setAttribute('href', safe);

    delete anchor.dataset.restbrUnsafeUrl;
    anchor.removeAttribute('aria-disabled');

    if (/^https?:/i.test(safe)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
  }

  const CONFIGURED_MEDIA_SELECTOR = [
    '#smLogo',
    '#smBgVideo',
    '#smBgVideoB',
    '#smImageFull',
    '.sm-logo',
    '.sm-intro-logo',
    '.sm-product-image'
  ].join(', ');

  function sanitizeMedia(element) {
    if (!(element instanceof Element) || !element.matches(CONFIGURED_MEDIA_SELECTOR)) return;

    const raw = element.getAttribute('src') || '';
    if (raw && !safeMediaUrl(raw)) {
      element.removeAttribute('src');
      element.dataset.restbrUnsafeMedia = '1';
      return;
    }

    delete element.dataset.restbrUnsafeMedia;
  }

  function scan(root = document) {
    root.querySelectorAll?.(CONFIGURED_LINK_SELECTOR).forEach(sanitizeAnchor);
    root.querySelectorAll?.(CONFIGURED_MEDIA_SELECTOR).forEach(sanitizeMedia);
  }

  document.addEventListener('click', event => {
    const anchor = event.target?.closest?.('a');
    if (!anchor || !isConfiguredLink(anchor)) return;

    const raw = anchor.getAttribute('href') || '';
    const safe = safeConfiguredUrl(raw);
    if (!raw || !safe) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (safe !== raw) anchor.setAttribute('href', safe);
  }, true);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLAnchorElement) {
        sanitizeAnchor(record.target);
        continue;
      }

      if (record.type === 'attributes' && record.attributeName === 'src') {
        sanitizeMedia(record.target);
        continue;
      }

      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLAnchorElement) sanitizeAnchor(node);
        sanitizeMedia(node);
        scan(node);
      });
    }
  });

  const start = () => {
    scan(document);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'src']
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
