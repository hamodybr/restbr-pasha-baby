(() => {
  if (window.__PASHA_ADMIN_BRAND_V1__) return;
  window.__PASHA_ADMIN_BRAND_V1__ = true;

  const FALLBACK_LOGO = 'assets/pasha-baby-logo-256.webp';
  const LEGACY_PLACEHOLDER = 'restaurant-placeholder.svg';

  const isLegacyOrEmpty = image => {
    const raw = String(image?.getAttribute?.('src') || '').trim();
    return !raw || raw.includes(LEGACY_PLACEHOLDER);
  };

  const applyImageFallback = (image, forceVisible = false) => {
    if (!image) return;
    if (isLegacyOrEmpty(image)) image.setAttribute('src', FALLBACK_LOGO);
    if (forceVisible && image.getAttribute('src') === FALLBACK_LOGO) {
      image.style.visibility = 'visible';
    }
    if (!image.dataset.pashaBrandErrorBound) {
      image.dataset.pashaBrandErrorBound = '1';
      image.addEventListener('error', () => {
        if (!String(image.getAttribute('src') || '').includes('pasha-baby-logo-256.webp')) {
          image.setAttribute('src', FALLBACK_LOGO);
          if (forceVisible) image.style.visibility = 'visible';
        }
      });
    }
  };

  const applyBrand = () => {
    const headerLogo = document.querySelector('.admin-logo');
    const loginLogo = document.querySelector('.login-brand img');
    const settingsLogo = document.getElementById('rs_logo_preview');
    applyImageFallback(headerLogo);
    applyImageFallback(loginLogo);
    applyImageFallback(settingsLogo, true);

    const loginTitle = document.querySelector('.login-brand h1');
    if (loginTitle && /^restaurant\s+admin$/i.test(String(loginTitle.textContent || '').trim())) {
      loginTitle.textContent = 'Pasha Baby Admin';
    }
  };

  const watchImage = (image, forceVisible = false) => {
    if (!image) return;
    const observer = new MutationObserver(() => applyImageFallback(image, forceVisible));
    observer.observe(image, { attributes: true, attributeFilter: ['src', 'style'] });
  };

  const init = () => {
    applyBrand();
    watchImage(document.querySelector('.admin-logo'));
    watchImage(document.querySelector('.login-brand img'));
    watchImage(document.getElementById('rs_logo_preview'), true);

    const loginTitle = document.querySelector('.login-brand h1');
    if (loginTitle) {
      new MutationObserver(applyBrand).observe(loginTitle, { childList: true, characterData: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.PashaAdminBrand = Object.freeze({ fallbackLogo: FALLBACK_LOGO, apply: applyBrand });
})();
