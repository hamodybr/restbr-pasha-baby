(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_BABY_ADMIN_SETTINGS_THEME_V4__) return;
  window.__PASHA_BABY_ADMIN_SETTINGS_THEME_V4__ = true;

  const STYLE_ID = 'pbAdminSettingsThemeV4Styles';
  const LEGACY_SETTINGS_KEY = 'RESTBR_ADMIN_SETTINGS_THEME_V1';
  let syncing = false;

  function installStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         PASHA BABY ADMIN SETTINGS V4
         One day/night theme, no legacy gold island inside Settings.
         ========================================================= */

      body.admin-global-light #viewTools,
      body.admin-global-dark #viewTools{
        --pbs-accent:var(--pba-primary,#2f8b73);
        --pbs-accent-2:var(--pba-primary-2,#4ea78f);
        --pbs-ink:var(--pba-ink,#2f3b42);
        --pbs-muted:var(--pba-muted,#6e7b81);
        --pbs-surface:var(--pba-surface,rgba(255,255,255,.9));
        --pbs-surface-strong:var(--pba-surface-strong,#fff);
        --pbs-surface-soft:var(--pba-surface-soft,#f3fbf8);
        --pbs-border:var(--pba-border,rgba(47,139,115,.15));
        --pbs-border-strong:var(--pba-border-strong,rgba(47,139,115,.30));
        color:var(--pbs-ink)!important;
        background:transparent!important;
        box-shadow:none!important;
      }

      /* Kill the old Settings-only theme switch completely. */
      #adminSettingsThemeBtn{display:none!important}

      /* Main Settings surfaces — including all dynamically injected tools. */
      body.admin-global-light #viewTools .settings-save-bar,
      body.admin-global-dark #viewTools .settings-save-bar,
      body.admin-global-light #viewTools .settings-accordion,
      body.admin-global-dark #viewTools .settings-accordion,
      body.admin-global-light #viewTools .settings-element,
      body.admin-global-dark #viewTools .settings-element,
      body.admin-global-light #viewTools .settings-toggle-card,
      body.admin-global-dark #viewTools .settings-toggle-card,
      body.admin-global-light #viewTools .settings-field-clean,
      body.admin-global-dark #viewTools .settings-field-clean,
      body.admin-global-light #viewTools .tri-box,
      body.admin-global-dark #viewTools .tri-box,
      body.admin-global-light #viewTools .dynamic-manager,
      body.admin-global-dark #viewTools .dynamic-manager,
      body.admin-global-light #viewTools .dynamic-item,
      body.admin-global-dark #viewTools .dynamic-item,
      body.admin-global-light #viewTools .dynamic-item-body,
      body.admin-global-dark #viewTools .dynamic-item-body,
      body.admin-global-light #viewTools .social-setting-row,
      body.admin-global-dark #viewTools .social-setting-row,
      body.admin-global-light #viewTools .ui-design-topbar,
      body.admin-global-dark #viewTools .ui-design-topbar,
      body.admin-global-light #viewTools .ui-design-group,
      body.admin-global-dark #viewTools .ui-design-group,
      body.admin-global-light #viewTools .ui-size-field,
      body.admin-global-dark #viewTools .ui-size-field,
      body.admin-global-light #viewTools .excel-note,
      body.admin-global-dark #viewTools .excel-note,
      body.admin-global-light #viewTools .backup-type-box,
      body.admin-global-dark #viewTools .backup-type-box,
      body.admin-global-light #viewTools .backup-type-field,
      body.admin-global-dark #viewTools .backup-type-field,
      body.admin-global-light #viewTools .bulk-price-field,
      body.admin-global-dark #viewTools .bulk-price-field,
      body.admin-global-light #viewTools .bulk-price-preview,
      body.admin-global-dark #viewTools .bulk-price-preview,
      body.admin-global-light #viewTools .restbr-email-box,
      body.admin-global-dark #viewTools .restbr-email-box,
      body.admin-global-light #viewTools .restbr-password-box,
      body.admin-global-dark #viewTools .restbr-password-box,
      body.admin-global-light #viewTools .restbr-email-current,
      body.admin-global-dark #viewTools .restbr-email-current,
      body.admin-global-light #viewTools .sm-hours-box,
      body.admin-global-dark #viewTools .sm-hours-box,
      body.admin-global-light #viewTools .sm-hours-day,
      body.admin-global-dark #viewTools .sm-hours-day,
      body.admin-global-light #viewTools .sm-hours-preview,
      body.admin-global-dark #viewTools .sm-hours-preview{
        background:var(--pbs-surface)!important;
        color:var(--pbs-ink)!important;
        border-color:var(--pbs-border)!important;
        box-shadow:none!important;
      }

      body.admin-global-light #viewTools .settings-accordion[open],
      body.admin-global-dark #viewTools .settings-accordion[open],
      body.admin-global-light #viewTools .ui-design-group[open],
      body.admin-global-dark #viewTools .ui-design-group[open],
      body.admin-global-light #viewTools .dynamic-item[open],
      body.admin-global-dark #viewTools .dynamic-item[open]{
        border-color:var(--pbs-border-strong)!important;
      }

      body.admin-global-light #viewTools .settings-accordion>summary,
      body.admin-global-dark #viewTools .settings-accordion>summary,
      body.admin-global-light #viewTools .ui-design-group>summary,
      body.admin-global-dark #viewTools .ui-design-group>summary,
      body.admin-global-light #viewTools .dynamic-item>summary,
      body.admin-global-dark #viewTools .dynamic-item>summary{
        background:linear-gradient(135deg,var(--pbs-surface-strong),var(--pbs-surface-soft))!important;
        color:var(--pbs-ink)!important;
        border-color:var(--pbs-border)!important;
      }

      body.admin-global-light #viewTools .settings-accordion-body,
      body.admin-global-dark #viewTools .settings-accordion-body,
      body.admin-global-light #viewTools .ui-design-fields,
      body.admin-global-dark #viewTools .ui-design-fields,
      body.admin-global-light #viewTools .sm-hours-content,
      body.admin-global-dark #viewTools .sm-hours-content{
        background:transparent!important;
        color:var(--pbs-ink)!important;
        border-color:var(--pbs-border)!important;
      }

      /* Accent-bearing titles / icons / values. */
      body.admin-global-light #viewTools .settings-accordion-title strong,
      body.admin-global-dark #viewTools .settings-accordion-title strong,
      body.admin-global-light #viewTools .settings-section-title,
      body.admin-global-dark #viewTools .settings-section-title,
      body.admin-global-light #viewTools .settings-accordion-icon,
      body.admin-global-dark #viewTools .settings-accordion-icon,
      body.admin-global-light #viewTools .settings-chevron,
      body.admin-global-dark #viewTools .settings-chevron,
      body.admin-global-light #viewTools .ui-design-topbar strong,
      body.admin-global-dark #viewTools .ui-design-topbar strong,
      body.admin-global-light #viewTools .ui-size-label b,
      body.admin-global-dark #viewTools .ui-size-label b,
      body.admin-global-light #viewTools .bulk-price-preview strong,
      body.admin-global-dark #viewTools .bulk-price-preview strong,
      body.admin-global-light #viewTools .restbr-email-box h4,
      body.admin-global-dark #viewTools .restbr-email-box h4,
      body.admin-global-light #viewTools .restbr-password-box h4,
      body.admin-global-dark #viewTools .restbr-password-box h4,
      body.admin-global-light #viewTools .sm-hours-toggle-title,
      body.admin-global-dark #viewTools .sm-hours-toggle-title,
      body.admin-global-light #viewTools .sm-hours-chevron,
      body.admin-global-dark #viewTools .sm-hours-chevron{
        color:var(--pbs-accent)!important;
      }

      body.admin-global-light #viewTools .settings-accordion-icon,
      body.admin-global-dark #viewTools .settings-accordion-icon,
      body.admin-global-light #viewTools .sm-hours-chevron,
      body.admin-global-dark #viewTools .sm-hours-chevron{
        background:color-mix(in srgb,var(--pbs-accent) 9%,var(--pbs-surface-strong))!important;
        border-color:var(--pbs-border-strong)!important;
      }

      /* Normal copy and secondary labels. */
      body.admin-global-light #viewTools .settings-save-bar strong,
      body.admin-global-dark #viewTools .settings-save-bar strong,
      body.admin-global-light #viewTools .settings-element-head strong,
      body.admin-global-dark #viewTools .settings-element-head strong,
      body.admin-global-light #viewTools .settings-toggle-copy strong,
      body.admin-global-dark #viewTools .settings-toggle-copy strong,
      body.admin-global-light #viewTools .ui-design-group-title strong,
      body.admin-global-dark #viewTools .ui-design-group-title strong,
      body.admin-global-light #viewTools .dynamic-manager-head strong,
      body.admin-global-dark #viewTools .dynamic-manager-head strong,
      body.admin-global-light #viewTools .dynamic-item-title strong,
      body.admin-global-dark #viewTools .dynamic-item-title strong,
      body.admin-global-light #viewTools .sm-hours-day-name,
      body.admin-global-dark #viewTools .sm-hours-day-name{
        color:var(--pbs-ink)!important;
      }

      body.admin-global-light #viewTools .settings-save-bar span,
      body.admin-global-dark #viewTools .settings-save-bar span,
      body.admin-global-light #viewTools .settings-accordion-title small,
      body.admin-global-dark #viewTools .settings-accordion-title small,
      body.admin-global-light #viewTools .settings-element-head small,
      body.admin-global-dark #viewTools .settings-element-head small,
      body.admin-global-light #viewTools .settings-toggle-copy span,
      body.admin-global-dark #viewTools .settings-toggle-copy span,
      body.admin-global-light #viewTools .ui-design-group-title small,
      body.admin-global-dark #viewTools .ui-design-group-title small,
      body.admin-global-light #viewTools .ui-design-note,
      body.admin-global-dark #viewTools .ui-design-note,
      body.admin-global-light #viewTools .ui-size-label span,
      body.admin-global-dark #viewTools .ui-size-label span,
      body.admin-global-light #viewTools .dynamic-item-title small,
      body.admin-global-dark #viewTools .dynamic-item-title small,
      body.admin-global-light #viewTools .dynamic-empty,
      body.admin-global-dark #viewTools .dynamic-empty,
      body.admin-global-light #viewTools .excel-note,
      body.admin-global-dark #viewTools .excel-note,
      body.admin-global-light #viewTools .backup-type-note,
      body.admin-global-dark #viewTools .backup-type-note,
      body.admin-global-light #viewTools .bulk-price-warning,
      body.admin-global-dark #viewTools .bulk-price-warning,
      body.admin-global-light #viewTools .bulk-price-field label,
      body.admin-global-dark #viewTools .bulk-price-field label,
      body.admin-global-light #viewTools .backup-type-field span,
      body.admin-global-dark #viewTools .backup-type-field span,
      body.admin-global-light #viewTools .restbr-email-box p,
      body.admin-global-dark #viewTools .restbr-email-box p,
      body.admin-global-light #viewTools .restbr-password-box p,
      body.admin-global-dark #viewTools .restbr-password-box p,
      body.admin-global-light #viewTools .restbr-email-field span,
      body.admin-global-dark #viewTools .restbr-email-field span,
      body.admin-global-light #viewTools .restbr-password-field span,
      body.admin-global-dark #viewTools .restbr-password-field span,
      body.admin-global-light #viewTools .sm-hours-help,
      body.admin-global-dark #viewTools .sm-hours-help,
      body.admin-global-light #viewTools .sm-hours-note,
      body.admin-global-dark #viewTools .sm-hours-note,
      body.admin-global-light #viewTools .sm-hours-toggle-summary,
      body.admin-global-dark #viewTools .sm-hours-toggle-summary,
      body.admin-global-light #viewTools .sm-hours-status,
      body.admin-global-dark #viewTools .sm-hours-status{
        color:var(--pbs-muted)!important;
      }

      /* Every normal Settings field follows the global day/night surface. */
      body.admin-global-light #viewTools input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']),
      body.admin-global-dark #viewTools input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']),
      body.admin-global-light #viewTools textarea,
      body.admin-global-dark #viewTools textarea,
      body.admin-global-light #viewTools select,
      body.admin-global-dark #viewTools select{
        background:var(--pbs-surface-strong)!important;
        color:var(--pbs-ink)!important;
        -webkit-text-fill-color:var(--pbs-ink)!important;
        border-color:var(--pbs-border)!important;
        box-shadow:none!important;
        color-scheme:inherit!important;
      }

      body.admin-global-light #viewTools input::placeholder,
      body.admin-global-dark #viewTools input::placeholder,
      body.admin-global-light #viewTools textarea::placeholder,
      body.admin-global-dark #viewTools textarea::placeholder{
        color:var(--pbs-muted)!important;
        -webkit-text-fill-color:var(--pbs-muted)!important;
        opacity:.72!important;
      }

      body.admin-global-light #viewTools input:focus,
      body.admin-global-dark #viewTools input:focus,
      body.admin-global-light #viewTools textarea:focus,
      body.admin-global-dark #viewTools textarea:focus,
      body.admin-global-light #viewTools select:focus,
      body.admin-global-dark #viewTools select:focus{
        border-color:var(--pbs-accent)!important;
        box-shadow:0 0 0 3px color-mix(in srgb,var(--pbs-accent) 12%,transparent)!important;
        outline:none!important;
      }

      /* Arabic / Kurdish / English tab bars no longer turn black or gold. */
      body.admin-global-light #viewTools .tri-tabs,
      body.admin-global-dark #viewTools .tri-tabs,
      body.admin-global-light #viewTools .settings-tabs,
      body.admin-global-dark #viewTools .settings-tabs{
        background:color-mix(in srgb,var(--pbs-accent) 5%,var(--pbs-surface-soft))!important;
        border-color:var(--pbs-border)!important;
      }

      body.admin-global-light #viewTools .tri-tabs button,
      body.admin-global-dark #viewTools .tri-tabs button,
      body.admin-global-light #viewTools .settings-tabs button,
      body.admin-global-dark #viewTools .settings-tabs button{
        background:transparent!important;
        color:var(--pbs-muted)!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }

      body.admin-global-light #viewTools .tri-tabs button.active,
      body.admin-global-dark #viewTools .tri-tabs button.active,
      body.admin-global-light #viewTools .settings-tabs button.active,
      body.admin-global-dark #viewTools .settings-tabs button.active{
        background:color-mix(in srgb,var(--pbs-accent) 13%,var(--pbs-surface-strong))!important;
        color:var(--pbs-accent)!important;
        border-color:var(--pbs-border-strong)!important;
      }

      /* Switches, mini visibility toggles, checks and sliders. */
      body.admin-global-light #viewTools input[type='checkbox'],
      body.admin-global-dark #viewTools input[type='checkbox'],
      body.admin-global-light #viewTools input[type='radio'],
      body.admin-global-dark #viewTools input[type='radio'],
      body.admin-global-light #viewTools input[type='range'],
      body.admin-global-dark #viewTools input[type='range']{
        accent-color:var(--pbs-accent)!important;
      }

      body.admin-global-light #viewTools .settings-switch input + i,
      body.admin-global-dark #viewTools .settings-switch input + i,
      body.admin-global-light #viewTools .mini-visibility input + i,
      body.admin-global-dark #viewTools .mini-visibility input + i{
        background:color-mix(in srgb,var(--pbs-muted) 15%,var(--pbs-surface-strong))!important;
        border-color:var(--pbs-border)!important;
      }

      body.admin-global-light #viewTools .settings-switch input + i::after,
      body.admin-global-dark #viewTools .settings-switch input + i::after,
      body.admin-global-light #viewTools .mini-visibility input + i::after,
      body.admin-global-dark #viewTools .mini-visibility input + i::after{
        background:var(--pbs-muted)!important;
      }

      body.admin-global-light #viewTools .settings-switch input:checked + i,
      body.admin-global-dark #viewTools .settings-switch input:checked + i,
      body.admin-global-light #viewTools .mini-visibility input:checked + i,
      body.admin-global-dark #viewTools .mini-visibility input:checked + i{
        background:color-mix(in srgb,var(--pbs-accent) 24%,var(--pbs-surface-strong))!important;
        border-color:var(--pbs-border-strong)!important;
      }

      body.admin-global-light #viewTools .settings-switch input:checked + i::after,
      body.admin-global-dark #viewTools .settings-switch input:checked + i::after,
      body.admin-global-light #viewTools .mini-visibility input:checked + i::after,
      body.admin-global-dark #viewTools .mini-visibility input:checked + i::after{
        background:var(--pbs-accent)!important;
      }

      body.admin-global-light #viewTools .ui-size-control input[type='range'],
      body.admin-global-dark #viewTools .ui-size-control input[type='range']{
        accent-color:var(--pbs-accent)!important;
      }

      /* Primary actions: mint in both modes. */
      body.admin-global-light #viewTools .btn-gold,
      body.admin-global-dark #viewTools .btn-gold,
      body.admin-global-light #viewTools #restbrChangeEmailBtn,
      body.admin-global-dark #viewTools #restbrChangeEmailBtn,
      body.admin-global-light #viewTools #restbrChangePasswordBtn,
      body.admin-global-dark #viewTools #restbrChangePasswordBtn,
      body.admin-global-light #viewTools .sm-hours-actions .btn-gold,
      body.admin-global-dark #viewTools .sm-hours-actions .btn-gold{
        background:linear-gradient(135deg,var(--pbs-accent-2),var(--pbs-accent))!important;
        color:#fff!important;
        -webkit-text-fill-color:#fff!important;
        border-color:transparent!important;
        box-shadow:0 8px 20px color-mix(in srgb,var(--pbs-accent) 20%,transparent)!important;
      }

      /* Secondary actions: clean neutral surface, mint hover/focus. */
      body.admin-global-light #viewTools .btn-dark,
      body.admin-global-dark #viewTools .btn-dark,
      body.admin-global-light #viewTools .ui-design-reset,
      body.admin-global-dark #viewTools .ui-design-reset,
      body.admin-global-light #viewTools .dynamic-row-actions button:not(.danger),
      body.admin-global-dark #viewTools .dynamic-row-actions button:not(.danger),
      body.admin-global-light #viewTools .image-upload-btn,
      body.admin-global-dark #viewTools .image-upload-btn{
        background:var(--pbs-surface-strong)!important;
        color:var(--pbs-accent)!important;
        -webkit-text-fill-color:var(--pbs-accent)!important;
        border-color:var(--pbs-border-strong)!important;
        box-shadow:none!important;
      }

      body.admin-global-light #viewTools .ui-reset-all,
      body.admin-global-dark #viewTools .ui-reset-all,
      body.admin-global-light #viewTools .danger,
      body.admin-global-dark #viewTools .danger,
      body.admin-global-light #viewTools .danger-mini,
      body.admin-global-dark #viewTools .danger-mini{
        background:color-mix(in srgb,#d76565 8%,var(--pbs-surface-strong))!important;
        color:#d76565!important;
        -webkit-text-fill-color:#d76565!important;
        border-color:color-mix(in srgb,#d76565 28%,transparent)!important;
      }

      /* File pickers and account boxes were two of the remaining legacy islands. */
      body.admin-global-light #viewTools input[type='file']::file-selector-button,
      body.admin-global-dark #viewTools input[type='file']::file-selector-button{
        background:var(--pbs-surface-strong)!important;
        color:var(--pbs-accent)!important;
        border:1px solid var(--pbs-border-strong)!important;
        border-radius:9px!important;
        padding:8px 10px!important;
      }

      body.admin-global-light #viewTools .restbr-email-current,
      body.admin-global-dark #viewTools .restbr-email-current{
        background:var(--pbs-surface-strong)!important;
        color:var(--pbs-ink)!important;
        border:1px solid var(--pbs-border)!important;
      }

      /* Opening-hours plugin follows the same theme instead of its old dark/gold palette. */
      body.admin-global-light #viewTools .sm-hours-mode,
      body.admin-global-dark #viewTools .sm-hours-mode,
      body.admin-global-light #viewTools .sm-hours-times input,
      body.admin-global-dark #viewTools .sm-hours-times input,
      body.admin-global-light #viewTools .sm-hours-day-times input,
      body.admin-global-dark #viewTools .sm-hours-day-times input{
        background:var(--pbs-surface-strong)!important;
        color:var(--pbs-ink)!important;
        -webkit-text-fill-color:var(--pbs-ink)!important;
        border-color:var(--pbs-border)!important;
      }

      body.admin-global-light #viewTools .sm-hours-day-toggle,
      body.admin-global-dark #viewTools .sm-hours-day-toggle{
        color:var(--pbs-muted)!important;
      }

      /* No accidental black bars in light mode. */
      body.admin-global-light #viewTools .tri-tabs,
      body.admin-global-light #viewTools .settings-tabs,
      body.admin-global-light #viewTools .ui-design-topbar,
      body.admin-global-light #viewTools .ui-design-group,
      body.admin-global-light #viewTools .ui-size-field,
      body.admin-global-light #viewTools .bulk-price-preview,
      body.admin-global-light #viewTools .restbr-email-box,
      body.admin-global-light #viewTools .restbr-password-box,
      body.admin-global-light #viewTools .sm-hours-preview{
        color-scheme:light!important;
      }

      body.admin-global-dark #viewTools{
        color-scheme:dark!important;
      }
    `;
    document.head.appendChild(style);
  }

  function globalMode(){
    return document.body?.classList.contains('admin-global-light') ? 'light' : 'dark';
  }

  function syncLegacySettingsTheme(){
    if (syncing) return;
    const body = document.body;
    const view = document.getElementById('viewTools');
    if (!body || !view) return;

    syncing = true;
    try {
      const light = body.classList.contains('admin-global-light');
      view.classList.toggle('admin-settings-light', light);
      view.dataset.pashaTheme = light ? 'light' : 'dark';
      document.getElementById('adminSettingsThemeBtn')?.remove();
      try { localStorage.setItem(LEGACY_SETTINGS_KEY, light ? 'light' : 'dark'); } catch (_) {}
    } finally {
      syncing = false;
    }
  }

  function init(){
    installStyles();
    syncLegacySettingsTheme();

    const body = document.body;
    if (!body) return;

    const observer = new MutationObserver(() => {
      requestAnimationFrame(syncLegacySettingsTheme);
    });

    observer.observe(body, { attributes:true, attributeFilter:['class'] });

    const waitForView = new MutationObserver(() => {
      if (!document.getElementById('viewTools')) return;
      syncLegacySettingsTheme();
      waitForView.disconnect();
    });
    waitForView.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => waitForView.disconnect(), 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
