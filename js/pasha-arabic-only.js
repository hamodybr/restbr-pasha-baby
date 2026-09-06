(() => {
  if (window.__PASHA_ARABIC_ONLY_V1__) return;
  window.__PASHA_ARABIC_ONLY_V1__ = true;

  const IS_ADMIN = /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);
  const q = selector => document.querySelector(selector);

  function forceArabicState() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    try {
      localStorage.setItem('RESTBR_LANG_V1', 'ar');
      localStorage.removeItem('RESTBR_ENABLED_LANGUAGES_V1');
    } catch (_) {}
  }

  function installArabicOnlyStyle() {
    if (q('#pashaArabicOnlyStyle')) return;
    const style = document.createElement('style');
    style.id = 'pashaArabicOnlyStyle';
    style.textContent = `
      #smLangs,#smLangToggle,#smLanguageSettingCard{display:none!important}
      [data-pasha-multilang-hidden="1"]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function isLanguageField(el) {
    const id = String(el?.id || '');
    return /_(?:ku|en)$/.test(id) && !/_enabled$/.test(id);
  }

  function fieldWrapper(el) {
    return el?.closest?.(
      '.field,.tri-pane,.settings-field-clean,.dynamic-field,.pb-editor-color-field,.sm-language-setting-option'
    ) || null;
  }

  function syncArabicFallback(arField) {
    if (!arField?.id || !/_ar$/.test(arField.id)) return;
    const value = arField.value ?? '';
    for (const code of ['ku', 'en']) {
      const fallback = document.getElementById(arField.id.replace(/_ar$/, `_${code}`));
      if (fallback && String(fallback.value || '') !== String(value || '')) fallback.value = value;
    }
  }

  function cleanupAdminLanguages(root = document) {
    if (!IS_ADMIN) return;

    root.querySelectorAll?.('input[id],textarea[id],select[id]').forEach(el => {
      if (/_ar$/.test(el.id)) syncArabicFallback(el);
      if (!isLanguageField(el)) return;
      const wrap = fieldWrapper(el);
      if (wrap) wrap.dataset.pashaMultilangHidden = '1';
      else el.dataset.pashaMultilangHidden = '1';
    });

    const languageToggle = q('#rs_show_language_switch');
    const toggleWrap = languageToggle?.closest?.('.settings-toggle-card,.settings-field-clean,.field');
    if (toggleWrap) toggleWrap.dataset.pashaMultilangHidden = '1';

    const languageCard = q('#smLanguageSettingCard');
    if (languageCard) languageCard.dataset.pashaMultilangHidden = '1';
  }

  function loadScript(id, src, adminOnly = false) {
    if ((adminOnly && !IS_ADMIN) || q(`#${id}`)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }

  function loadArabicAdminTools() {
    if (!IS_ADMIN) return;
    loadScript('pashaBabyAdminCopyScript', 'js/pasha-baby-admin-copy.js?v=1.1', true);
    loadScript('pashaBabyImageOptimizerScript', 'js/admin-image-optimizer.js?v=1.0', true);
    loadScript('pashaBabyLargeCatalogScript', 'js/admin-large-catalog.js?v=1.0', true);
    loadScript('pashaBabyRetailDiscountsScript', 'js/admin-retail-discounts.js?v=3.0', true);
    loadScript('pashaBabyProductColorsScript', 'js/admin-product-colors.js?v=3.0', true);
  }

  function boot() {
    forceArabicState();
    installArabicOnlyStyle();

    if (IS_ADMIN) {
      cleanupAdminLanguages(document);
      loadArabicAdminTools();

      document.addEventListener('input', event => {
        const target = event.target;
        if (target?.id && /_ar$/.test(target.id)) syncArabicFallback(target);
      }, true);

      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            cleanupAdminLanguages(node);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    loadScript('pashaArabicNewsTickerScript', 'js/arabic-news-ticker.js?v=1.0');

    const keepArabic = () => {
      forceArabicState();
      const langs = q('#smLangs');
      if (langs) langs.style.setProperty('display', 'none', 'important');
      const toggle = q('#smLangToggle');
      if (toggle) toggle.style.setProperty('display', 'none', 'important');
    };

    keepArabic();
    window.addEventListener('restbr:ready', keepArabic);
    window.addEventListener('pageshow', keepArabic, { passive: true });

    const observer = new MutationObserver(keepArabic);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();