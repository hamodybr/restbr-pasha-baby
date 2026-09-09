(() => {
  if (window.__PASHA_ARABIC_ONLY_V1__) return;
  window.__PASHA_ARABIC_ONLY_V1__ = true;

  const IS_ADMIN = /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);
  const q = selector => document.querySelector(selector);

  function forceArabicState() {
    if (document.documentElement.lang !== 'ar') document.documentElement.lang = 'ar';
    if (document.documentElement.dir !== 'rtl') document.documentElement.dir = 'rtl';
    try {
      if (localStorage.getItem('RESTBR_LANG_V1') !== 'ar') {
        localStorage.setItem('RESTBR_LANG_V1', 'ar');
      }
      if (localStorage.getItem('RESTBR_ENABLED_LANGUAGES_V1') !== null) {
        localStorage.removeItem('RESTBR_ENABLED_LANGUAGES_V1');
      }
    } catch (_) {}
  }

  function installArabicOnlyStyle() {
    if (q('#pashaArabicOnlyStyle')) return;
    const style = document.createElement('style');
    style.id = 'pashaArabicOnlyStyle';
    style.textContent = `
      #smLangs,#smLangToggle,#smLanguageSettingCard{display:none!important}
      [data-pasha-multilang-hidden="1"]{display:none!important}

      #viewTools .tri-box[data-pasha-arabic-only-box="1"] > .tri-tabs{display:none!important}
      #viewTools .tri-box[data-pasha-arabic-only-box="1"]{gap:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #viewTools .tri-box[data-pasha-arabic-only-box="1"] > .tri-pane[data-pasha-lang="ku"],
      #viewTools .tri-box[data-pasha-arabic-only-box="1"] > .tri-pane[data-pasha-lang="en"]{display:none!important}
      #viewTools .tri-box[data-pasha-arabic-only-box="1"] > .tri-pane[data-pasha-lang="ar"]{display:block!important}

      body.admin-global-light #viewTools .appearance-mode-card,
      body.admin-global-dark #viewTools .appearance-mode-card{
        background:var(--pba-surface-strong,#fff)!important;
        color:var(--pba-ink,#2f3b42)!important;
        border-color:var(--pba-border,rgba(47,139,115,.15))!important;
        box-shadow:none!important;
        color-scheme:inherit!important;
      }
      body.admin-global-light #viewTools .appearance-mode-card span,
      body.admin-global-dark #viewTools .appearance-mode-card span{color:var(--pba-muted,#6e7b81)!important}
      body.admin-global-light #viewTools .appearance-mode-card input,
      body.admin-global-dark #viewTools .appearance-mode-card input,
      body.admin-global-light #viewTools .appearance-mode-card select,
      body.admin-global-dark #viewTools .appearance-mode-card select{
        background:var(--pba-surface,#fffdfb)!important;
        color:var(--pba-ink,#2f3b42)!important;
        -webkit-text-fill-color:var(--pba-ink,#2f3b42)!important;
        border-color:var(--pba-border,rgba(47,139,115,.15))!important;
        box-shadow:none!important;
      }
      body.admin-global-light #viewTools .appearance-mode-card input:focus,
      body.admin-global-dark #viewTools .appearance-mode-card input:focus,
      body.admin-global-light #viewTools .appearance-mode-card select:focus,
      body.admin-global-dark #viewTools .appearance-mode-card select:focus{
        border-color:var(--pba-primary,#2f8b73)!important;
        box-shadow:0 0 0 3px color-mix(in srgb,var(--pba-primary,#2f8b73) 12%,transparent)!important;
        outline:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isLanguageField(el) {
    const id = String(el?.id || '');
    return /_(?:ku|en)$/.test(id) && !/_enabled$/.test(id);
  }

  function fieldWrapper(el) {
    return el?.closest?.('.field,.tri-pane,.settings-field-clean,.dynamic-field,.pb-editor-color-field,.sm-language-setting-option') || null;
  }

  function syncArabicFallback(arField) {
    if (!arField?.id || !/_ar$/.test(arField.id)) return;
    const value = arField.value ?? '';
    for (const code of ['ku', 'en']) {
      const fallback = document.getElementById(arField.id.replace(/_ar$/, `_${code}`));
      if (fallback && String(fallback.value || '') !== String(value || '')) fallback.value = value;
    }
  }

  function languageCodeFromPane(pane) {
    const key = String(pane?.getAttribute?.('data-tri-pane') || '');
    const match = key.match(/:(ar|ku|en)$/i);
    if (match) return match[1].toLowerCase();
    const field = pane?.querySelector?.('input[id],textarea[id],select[id]');
    const idMatch = String(field?.id || '').match(/_(ar|ku|en)$/i);
    return idMatch ? idMatch[1].toLowerCase() : '';
  }

  function collapseTriBoxToArabic(box) {
    if (!(box instanceof Element)) return;
    const panes = [...box.querySelectorAll(':scope > .tri-pane')];
    const codes = panes.map(languageCodeFromPane).filter(Boolean);
    if (!codes.includes('ar') || (!codes.includes('ku') && !codes.includes('en'))) return;
    box.dataset.pashaArabicOnlyBox = '1';
    panes.forEach(pane => {
      const code = languageCodeFromPane(pane);
      if (!code) return;
      pane.dataset.pashaLang = code;
      if (code === 'ar') { pane.hidden = false; pane.classList.add('active'); }
      else { pane.hidden = true; pane.classList.remove('active'); }
    });
    const tabs = box.querySelector(':scope > .tri-tabs');
    if (tabs) tabs.setAttribute('aria-hidden', 'true');
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
    if (root instanceof Element && root.matches('.tri-box')) collapseTriBoxToArabic(root);
    root.querySelectorAll?.('.tri-box').forEach(collapseTriBoxToArabic);
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
    loadScript('pashaBabyB2StorageScript', 'js/admin-b2-storage.js?v=1.1', true);
    loadScript('pashaBabyB2CleanupScript', 'js/admin-b2-cleanup.js?v=1.0', true);
    loadScript('pashaBabyLargeCatalogScript', 'js/admin-large-catalog.js?v=1.0', true);
    loadScript('pashaBabyRetailDiscountsScript', 'js/admin-retail-discounts.js?v=4.0', true);
    loadScript('pashaBabyProductColorsScript', 'js/admin-product-colors.js?v=3.0', true);
    loadScript('pashaProductEditorCleanupScript', 'js/pasha-admin-product-editor-cleanup.js?v=1.0', true);
    loadScript('pashaCategoryRetailCleanupScript', 'js/admin-category-retail-cleanup.js?v=1.2', true);
    loadScript('pashaNewProductColorsScript', 'js/admin-new-product-colors.js?v=1.0', true);
    loadScript('pashaAdminProgressiveDisclosureScript', 'js/admin-progressive-disclosure.js?v=2.0', true);
    loadScript('pashaAdminInteractionPolishScript', 'js/admin-interaction-polish.js?v=1.5', true);
    loadScript('pashaOrdersCustomersScript', 'js/admin-orders-customers.js?v=1.2', true);
    loadScript('pashaOrdersNavHotfixScript', 'js/admin-orders-nav-hotfix.js?v=1.0', true);
  }

  function boot() {
    forceArabicState();
    installArabicOnlyStyle();
    loadScript('pashaNumberNormalizerScript', 'js/pasha-number-normalizer.js?v=1.2');
    if (IS_ADMIN) {
      cleanupAdminLanguages(document);
      loadArabicAdminTools();
      document.addEventListener('input', event => {
        const target = event.target;
        if (target?.id && /_ar$/.test(target.id)) syncArabicFallback(target);
      }, true);
      // Admin editors are created dynamically, so the scoped admin observer is
      // still required to hide/sync the generated Kurdish/English fields.
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) cleanupAdminLanguages(node);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    loadScript('pashaOrderColorBridgeScript', 'js/pasha-order-color-bridge.js?v=1.1');
    loadScript('pashaColorImageGalleryScript', 'js/pasha-color-image-gallery.js?v=1.0');
    loadScript('pashaOrderSubmitScript', 'js/pasha-order-submit.js?v=1.1');
    loadScript('pashaArabicNewsTickerScript', 'js/arabic-news-ticker.js?v=1.1');
    const keepArabic = () => {
      forceArabicState();
      const langs = q('#smLangs');
      if (langs) langs.style.setProperty('display', 'none', 'important');
      const toggle = q('#smLangToggle');
      if (toggle) toggle.style.setProperty('display', 'none', 'important');
    };
    keepArabic();
    window.addEventListener('restbr:ready', keepArabic, { once: true });
    window.addEventListener('pageshow', keepArabic, { passive: true });
    // No storefront-wide MutationObserver here. The CSS policy already keeps
    // language UI hidden, and restbr:ready/pageshow cover the only lifecycle
    // points that need an explicit Arabic state refresh.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
