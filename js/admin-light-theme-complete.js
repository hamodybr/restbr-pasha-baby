(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const STYLE_ID = 'smAdminLightThemeCompleteStyles';
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    /* =========================================================
       PASHA BABY ADMIN V2 — DAY + NIGHT BRAND THEME
       Mint is the primary action color. Peach / sky / lavender /
       butter are supporting accents, matching the public store.
       ========================================================= */

    body.admin-global-light{
      --pba-bg:#fffaf5;
      --pba-bg-2:#f7f2ec;
      --pba-surface:rgba(255,255,255,.88);
      --pba-surface-strong:#ffffff;
      --pba-surface-soft:#fff7f2;
      --pba-ink:#2f3b42;
      --pba-muted:#6e7b81;
      --pba-border:rgba(83,105,103,.14);
      --pba-border-strong:rgba(47,139,115,.24);
      --pba-primary:#2f8b73;
      --pba-primary-2:#4ea78f;
      --pba-mint:#bfe5da;
      --pba-peach:#f8d6c5;
      --pba-sky:#d8eef8;
      --pba-lavender:#e7e1f7;
      --pba-butter:#f9e9b5;
      --pba-danger:#c65f67;
      --pba-shadow:0 14px 36px rgba(72,58,47,.08);
      --pba-shadow-soft:0 7px 20px rgba(72,58,47,.06);
      color-scheme:light;
    }

    body.admin-global-dark{
      --pba-bg:#0e1716;
      --pba-bg-2:#101d1b;
      --pba-surface:rgba(23,36,34,.92);
      --pba-surface-strong:#192826;
      --pba-surface-soft:#1d2d2a;
      --pba-ink:#f1f6f4;
      --pba-muted:#a7b6b2;
      --pba-border:rgba(143,205,189,.14);
      --pba-border-strong:rgba(143,205,189,.28);
      --pba-primary:#8fcdbd;
      --pba-primary-2:#69b39f;
      --pba-mint:rgba(143,205,189,.18);
      --pba-peach:rgba(244,195,170,.16);
      --pba-sky:rgba(183,223,240,.15);
      --pba-lavender:rgba(208,196,239,.15);
      --pba-butter:rgba(247,223,160,.16);
      --pba-danger:#ee9297;
      --pba-shadow:0 16px 42px rgba(0,0,0,.28);
      --pba-shadow-soft:0 8px 22px rgba(0,0,0,.20);
      color-scheme:dark;
    }

    body.admin-global-light,
    body.admin-global-dark{
      min-height:100vh !important;
      color:var(--pba-ink) !important;
      background:
        radial-gradient(circle at 7% 4%,var(--pba-sky) 0,transparent 24%),
        radial-gradient(circle at 94% 7%,var(--pba-peach) 0,transparent 24%),
        radial-gradient(circle at 52% 96%,var(--pba-mint) 0,transparent 27%),
        linear-gradient(180deg,var(--pba-bg) 0%,var(--pba-bg-2) 100%) !important;
      background-attachment:fixed !important;
    }

    body.admin-global-dark{
      background:
        radial-gradient(circle at 8% 2%,rgba(183,223,240,.10) 0,transparent 25%),
        radial-gradient(circle at 92% 7%,rgba(244,195,170,.09) 0,transparent 24%),
        radial-gradient(circle at 52% 100%,rgba(143,205,189,.10) 0,transparent 28%),
        linear-gradient(180deg,#0c1514 0%,#101b1a 55%,#0d1716 100%) !important;
    }

    body.admin-global-light .admin-main,
    body.admin-global-dark .admin-main,
    body.admin-global-light .admin-view,
    body.admin-global-dark .admin-view{
      color:var(--pba-ink) !important;
    }

    /* Header / brand shell */
    body.admin-global-light .admin-header,
    body.admin-global-dark .admin-header{
      background:color-mix(in srgb,var(--pba-surface-strong) 86%,transparent) !important;
      border-bottom:1px solid var(--pba-border) !important;
      box-shadow:0 10px 32px rgba(35,66,59,.08) !important;
      backdrop-filter:blur(18px) saturate(1.15) !important;
      -webkit-backdrop-filter:blur(18px) saturate(1.15) !important;
    }

    body.admin-global-dark .admin-header{
      box-shadow:0 12px 34px rgba(0,0,0,.24) !important;
    }

    body.admin-global-light .admin-logo,
    body.admin-global-dark .admin-logo{
      border-radius:16px !important;
      border:1px solid var(--pba-border-strong) !important;
      background:var(--pba-surface-strong) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }

    body.admin-global-light .admin-header h1,
    body.admin-global-dark .admin-header h1,
    body.admin-global-light .view-title,
    body.admin-global-dark .view-title,
    body.admin-global-light .admin-view h2,
    body.admin-global-dark .admin-view h2,
    body.admin-global-light .admin-view h3,
    body.admin-global-dark .admin-view h3,
    body.admin-global-light .admin-view h4,
    body.admin-global-dark .admin-view h4,
    body.admin-global-light .panel-header h2,
    body.admin-global-dark .panel-header h2{
      color:var(--pba-primary) !important;
    }

    body.admin-global-light .admin-header p,
    body.admin-global-dark .admin-header p,
    body.admin-global-light .view-subtitle,
    body.admin-global-dark .view-subtitle{
      color:var(--pba-muted) !important;
    }

    body.admin-global-light .admin-header-actions .header-refresh,
    body.admin-global-dark .admin-header-actions .header-refresh,
    body.admin-global-light .admin-global-theme-btn,
    body.admin-global-dark .admin-global-theme-btn{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-primary) !important;
      border:1px solid var(--pba-border-strong) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }

    /* Main surfaces */
    body.admin-global-light .panel,
    body.admin-global-dark .panel,
    body.admin-global-light .stat-card,
    body.admin-global-dark .stat-card,
    body.admin-global-light .category-row,
    body.admin-global-dark .category-row,
    body.admin-global-light .connection-box,
    body.admin-global-dark .connection-box,
    body.admin-global-light .tools-card,
    body.admin-global-dark .tools-card,
    body.admin-global-light .backup-card,
    body.admin-global-dark .backup-card,
    body.admin-global-light .bulk-price-card,
    body.admin-global-dark .bulk-price-card,
    body.admin-global-light .analytics-card,
    body.admin-global-dark .analytics-card,
    body.admin-global-light .analytics-kpi,
    body.admin-global-dark .analytics-kpi,
    body.admin-global-light .metric-card,
    body.admin-global-dark .metric-card,
    body.admin-global-light .chart-card,
    body.admin-global-dark .chart-card,
    body.admin-global-light .home-card,
    body.admin-global-dark .home-card,
    body.admin-global-light .quick-card,
    body.admin-global-dark .quick-card,
    body.admin-global-light .activity-card,
    body.admin-global-dark .activity-card,
    body.admin-global-light .dynamic-manager,
    body.admin-global-dark .dynamic-manager,
    body.admin-global-light .dynamic-item,
    body.admin-global-dark .dynamic-item,
    body.admin-global-light .compact-details,
    body.admin-global-dark .compact-details,
    body.admin-global-light .compact-details-body,
    body.admin-global-dark .compact-details-body,
    body.admin-global-light .sort-section,
    body.admin-global-dark .sort-section,
    body.admin-global-light .sortable-item,
    body.admin-global-dark .sortable-item{
      background:var(--pba-surface) !important;
      color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }

    body.admin-global-light .panel,
    body.admin-global-dark .panel,
    body.admin-global-light .compact-details,
    body.admin-global-dark .compact-details,
    body.admin-global-light .analytics-card,
    body.admin-global-dark .analytics-card{
      border-radius:20px !important;
      overflow:hidden;
    }

    body.admin-global-light .panel-header,
    body.admin-global-dark .panel-header,
    body.admin-global-light .compact-details > summary,
    body.admin-global-dark .compact-details > summary{
      border-color:var(--pba-border) !important;
      background:linear-gradient(135deg,var(--pba-surface-strong),var(--pba-surface-soft)) !important;
      color:var(--pba-ink) !important;
    }

    /* Pastel stat cards, still restrained */
    body.admin-global-light .stat-card:nth-child(3n+1),
    body.admin-global-dark .stat-card:nth-child(3n+1){
      background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-mint)) !important;
    }
    body.admin-global-light .stat-card:nth-child(3n+2),
    body.admin-global-dark .stat-card:nth-child(3n+2){
      background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-sky)) !important;
    }
    body.admin-global-light .stat-card:nth-child(3n+3),
    body.admin-global-dark .stat-card:nth-child(3n+3){
      background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-peach)) !important;
    }

    body.admin-global-light .stat-card strong,
    body.admin-global-dark .stat-card strong,
    body.admin-global-light .product-price,
    body.admin-global-dark .product-price,
    body.admin-global-light .analytics-kpi strong,
    body.admin-global-dark .analytics-kpi strong,
    body.admin-global-light .analytics-value,
    body.admin-global-dark .analytics-value{
      color:var(--pba-primary) !important;
    }

    body.admin-global-light .stat-card span,
    body.admin-global-dark .stat-card span,
    body.admin-global-light .category-meta,
    body.admin-global-dark .category-meta,
    body.admin-global-light .product-meta,
    body.admin-global-dark .product-meta,
    body.admin-global-light .loading,
    body.admin-global-dark .loading,
    body.admin-global-light .empty,
    body.admin-global-dark .empty,
    body.admin-global-light .analytics-label,
    body.admin-global-dark .analytics-label,
    body.admin-global-light .analytics-note,
    body.admin-global-dark .analytics-note,
    body.admin-global-light .sort-item-meta,
    body.admin-global-dark .sort-item-meta,
    body.admin-global-light .sort-help,
    body.admin-global-dark .sort-help,
    body.admin-global-light .admin-view small,
    body.admin-global-dark .admin-view small,
    body.admin-global-light .admin-view p,
    body.admin-global-dark .admin-view p{
      color:var(--pba-muted) !important;
    }

    body.admin-global-light .category-name,
    body.admin-global-dark .category-name,
    body.admin-global-light .product-name,
    body.admin-global-dark .product-name,
    body.admin-global-light .sort-item-name,
    body.admin-global-dark .sort-item-name,
    body.admin-global-light .admin-view strong,
    body.admin-global-dark .admin-view strong,
    body.admin-global-light .admin-view label,
    body.admin-global-dark .admin-view label{
      color:var(--pba-ink) !important;
    }

    /* Quick actions */
    body.admin-global-light .quick-action,
    body.admin-global-dark .quick-action{
      border:1px solid var(--pba-border) !important;
      color:var(--pba-ink) !important;
      background:var(--pba-surface) !important;
      box-shadow:var(--pba-shadow-soft) !important;
      border-radius:18px !important;
    }

    body.admin-global-light .quick-action:nth-child(2),
    body.admin-global-dark .quick-action:nth-child(2){background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-sky)) !important}
    body.admin-global-light .quick-action:nth-child(3),
    body.admin-global-dark .quick-action:nth-child(3){background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-lavender)) !important}
    body.admin-global-light .quick-action:nth-child(4),
    body.admin-global-dark .quick-action:nth-child(4){background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-butter)) !important}
    body.admin-global-light .quick-action:nth-child(5),
    body.admin-global-dark .quick-action:nth-child(5){background:linear-gradient(145deg,var(--pba-surface-strong),var(--pba-peach)) !important}

    body.admin-global-light .quick-action.gold,
    body.admin-global-dark .quick-action.gold,
    body.admin-global-light .btn-gold,
    body.admin-global-dark .btn-gold{
      color:#fff !important;
      background:linear-gradient(135deg,var(--pba-primary-2),var(--pba-primary)) !important;
      border:1px solid transparent !important;
      box-shadow:0 9px 22px color-mix(in srgb,var(--pba-primary) 26%,transparent) !important;
    }

    /* Filters / navigation */
    body.admin-global-light .filter-chip,
    body.admin-global-dark .filter-chip,
    body.admin-global-light .mini-btn,
    body.admin-global-dark .mini-btn,
    body.admin-global-light .edit-product-btn,
    body.admin-global-dark .edit-product-btn,
    body.admin-global-light .btn-dark,
    body.admin-global-dark .btn-dark{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-muted) !important;
      border-color:var(--pba-border) !important;
      box-shadow:none !important;
    }

    body.admin-global-light .filter-chip.active,
    body.admin-global-dark .filter-chip.active{
      background:var(--pba-mint) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border-strong) !important;
      font-weight:900 !important;
    }

    body.admin-global-light .bottom-nav,
    body.admin-global-dark .bottom-nav{
      background:color-mix(in srgb,var(--pba-surface-strong) 91%,transparent) !important;
      border:1px solid var(--pba-border) !important;
      box-shadow:0 14px 38px rgba(30,59,52,.12) !important;
      backdrop-filter:blur(18px) saturate(1.15) !important;
      -webkit-backdrop-filter:blur(18px) saturate(1.15) !important;
    }

    body.admin-global-light .bottom-nav .nav-btn,
    body.admin-global-dark .bottom-nav .nav-btn{color:var(--pba-muted) !important}
    body.admin-global-light .bottom-nav .nav-btn.active,
    body.admin-global-dark .bottom-nav .nav-btn.active{
      color:var(--pba-primary) !important;
      background:var(--pba-mint) !important;
      border-radius:14px !important;
    }

    /* Forms */
    body.admin-global-light input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
    body.admin-global-dark input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
    body.admin-global-light textarea,
    body.admin-global-dark textarea,
    body.admin-global-light select,
    body.admin-global-dark select{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-ink) !important;
      -webkit-text-fill-color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
      box-shadow:inset 0 1px 0 color-mix(in srgb,var(--pba-surface-strong) 72%,transparent) !important;
    }

    body.admin-global-light input:focus,
    body.admin-global-dark input:focus,
    body.admin-global-light textarea:focus,
    body.admin-global-dark textarea:focus,
    body.admin-global-light select:focus,
    body.admin-global-dark select:focus{
      border-color:var(--pba-primary) !important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--pba-primary) 14%,transparent) !important;
      outline:none !important;
    }

    body.admin-global-light input::placeholder,
    body.admin-global-dark input::placeholder,
    body.admin-global-light textarea::placeholder,
    body.admin-global-dark textarea::placeholder{
      color:color-mix(in srgb,var(--pba-muted) 72%,transparent) !important;
      -webkit-text-fill-color:color-mix(in srgb,var(--pba-muted) 72%,transparent) !important;
    }

    body.admin-global-light .field label,
    body.admin-global-dark .field label,
    body.admin-global-light .settings-field label,
    body.admin-global-dark .settings-field label{
      color:var(--pba-muted) !important;
    }

    /* Checkbox/status cards */
    body.admin-global-light .check-card,
    body.admin-global-dark .check-card,
    body.admin-global-light .settings-toggle-card,
    body.admin-global-dark .settings-toggle-card{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
      box-shadow:none !important;
    }

    body.admin-global-light .check-card:has(input:checked),
    body.admin-global-dark .check-card:has(input:checked){
      background:linear-gradient(135deg,var(--pba-surface-strong),var(--pba-mint)) !important;
      border-color:var(--pba-border-strong) !important;
    }

    body.admin-global-light input[type="checkbox"],
    body.admin-global-dark input[type="checkbox"]{
      accent-color:var(--pba-primary) !important;
    }

    body.admin-global-light .settings-switch input:checked + i,
    body.admin-global-dark .settings-switch input:checked + i{
      background:color-mix(in srgb,var(--pba-primary) 35%,var(--pba-surface-strong)) !important;
      border-color:var(--pba-primary) !important;
    }
    body.admin-global-light .settings-switch input:checked + i::after,
    body.admin-global-dark .settings-switch input:checked + i::after{background:var(--pba-primary) !important}

    /* Product options / drag & drop */
    body.admin-global-light #optionsEditor .option-editor,
    body.admin-global-dark #optionsEditor .option-editor,
    body.admin-global-light #newOptionsEditor .option-editor,
    body.admin-global-dark #newOptionsEditor .option-editor,
    body.admin-global-light .option-editor,
    body.admin-global-dark .option-editor{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }

    body.admin-global-light .sm-option-order-bar,
    body.admin-global-dark .sm-option-order-bar{border-bottom-color:var(--pba-border) !important}
    body.admin-global-light .sm-option-order-number,
    body.admin-global-dark .sm-option-order-number{color:var(--pba-primary) !important}

    body.admin-global-light .sm-option-drag,
    body.admin-global-dark .sm-option-drag,
    body.admin-global-light .drag-handle,
    body.admin-global-dark .drag-handle{
      background:var(--pba-mint) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border-strong) !important;
    }

    body.admin-global-light .sm-option-delete,
    body.admin-global-dark .sm-option-delete,
    body.admin-global-light .danger-mini,
    body.admin-global-dark .danger-mini,
    body.admin-global-light .danger-action-btn,
    body.admin-global-dark .danger-action-btn,
    body.admin-global-light .danger,
    body.admin-global-dark .danger{
      background:color-mix(in srgb,var(--pba-danger) 10%,var(--pba-surface-strong)) !important;
      color:var(--pba-danger) !important;
      border-color:color-mix(in srgb,var(--pba-danger) 28%,transparent) !important;
    }

    body.admin-global-light .option-editor.sm-option-dragging,
    body.admin-global-dark .option-editor.sm-option-dragging,
    body.admin-global-light .sortable-item.sortable-chosen,
    body.admin-global-dark .sortable-item.sortable-chosen,
    body.admin-global-light .sortable-item.sortable-ghost,
    body.admin-global-dark .sortable-item.sortable-ghost{
      border-color:var(--pba-primary) !important;
      background:linear-gradient(135deg,var(--pba-surface-strong),var(--pba-mint)) !important;
      box-shadow:0 14px 30px color-mix(in srgb,var(--pba-primary) 16%,transparent) !important;
    }

    /* Settings / plugin surfaces */
    body.admin-global-light #viewTools .settings-clean-wrap,
    body.admin-global-dark #viewTools .settings-clean-wrap,
    body.admin-global-light #viewTools .settings-accordion-body,
    body.admin-global-dark #viewTools .settings-accordion-body{color:var(--pba-ink) !important}

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
    body.admin-global-light #viewTools .ui-design-topbar,
    body.admin-global-dark #viewTools .ui-design-topbar,
    body.admin-global-light #viewTools .ui-design-group,
    body.admin-global-dark #viewTools .ui-design-group,
    body.admin-global-light #viewTools .sm-discount-row,
    body.admin-global-dark #viewTools .sm-discount-row,
    body.admin-global-light #viewTools .sm-discount-empty,
    body.admin-global-dark #viewTools .sm-discount-empty{
      background:var(--pba-surface) !important;
      border-color:var(--pba-border) !important;
      color:var(--pba-ink) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }

    body.admin-global-light #viewTools .settings-accordion > summary,
    body.admin-global-dark #viewTools .settings-accordion > summary{
      background:linear-gradient(135deg,var(--pba-surface-strong),var(--pba-surface-soft)) !important;
      border-color:var(--pba-border) !important;
      color:var(--pba-ink) !important;
    }

    body.admin-global-light #viewTools .tri-tabs,
    body.admin-global-dark #viewTools .tri-tabs,
    body.admin-global-light #viewTools .settings-tabs,
    body.admin-global-dark #viewTools .settings-tabs{
      background:color-mix(in srgb,var(--pba-muted) 10%,var(--pba-surface-strong)) !important;
      border-color:var(--pba-border) !important;
    }
    body.admin-global-light #viewTools .tri-tabs button,
    body.admin-global-dark #viewTools .tri-tabs button,
    body.admin-global-light #viewTools .settings-tabs button,
    body.admin-global-dark #viewTools .settings-tabs button{color:var(--pba-muted) !important}
    body.admin-global-light #viewTools .tri-tabs button.active,
    body.admin-global-dark #viewTools .tri-tabs button.active,
    body.admin-global-light #viewTools .settings-tabs button.active,
    body.admin-global-dark #viewTools .settings-tabs button.active{
      background:var(--pba-mint) !important;
      color:var(--pba-primary) !important;
    }

    /* Restaurant hours and analytics plugins */
    body.admin-global-light #smRestaurantHoursBox,
    body.admin-global-dark #smRestaurantHoursBox,
    body.admin-global-light .sm-hours-content,
    body.admin-global-dark .sm-hours-content,
    body.admin-global-light .sm-hours-day,
    body.admin-global-dark .sm-hours-day,
    body.admin-global-light .sm-hours-preview,
    body.admin-global-dark .sm-hours-preview{
      background:var(--pba-surface) !important;
      color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
      box-shadow:var(--pba-shadow-soft) !important;
    }
    body.admin-global-light .sm-hours-toggle,
    body.admin-global-dark .sm-hours-toggle{
      background:linear-gradient(135deg,var(--pba-surface-strong),var(--pba-mint)) !important;
      color:var(--pba-ink) !important;
    }
    body.admin-global-light .sm-hours-toggle-title,
    body.admin-global-dark .sm-hours-toggle-title,
    body.admin-global-light .sm-hours-day-name,
    body.admin-global-dark .sm-hours-day-name{color:var(--pba-primary) !important}
    body.admin-global-light .sm-hours-chevron,
    body.admin-global-dark .sm-hours-chevron{
      background:var(--pba-mint) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border-strong) !important;
    }

    body.admin-global-light .analytics-bar,
    body.admin-global-dark .analytics-bar{background:color-mix(in srgb,var(--pba-muted) 16%,transparent) !important}

    /* Modal */
    body.admin-global-light .admin-modal,
    body.admin-global-dark .admin-modal{
      background:rgba(18,31,29,.46) !important;
      backdrop-filter:blur(10px) !important;
      -webkit-backdrop-filter:blur(10px) !important;
    }

    body.admin-global-light .admin-modal-card,
    body.admin-global-dark .admin-modal-card,
    body.admin-global-light .admin-modal .modal-head,
    body.admin-global-dark .admin-modal .modal-head,
    body.admin-global-light .admin-modal .modal-actions,
    body.admin-global-dark .admin-modal .modal-actions{
      background:var(--pba-surface-strong) !important;
      color:var(--pba-ink) !important;
      border-color:var(--pba-border) !important;
    }

    body.admin-global-light .admin-modal-card,
    body.admin-global-dark .admin-modal-card{
      border-radius:26px 26px 0 0 !important;
      box-shadow:0 30px 80px rgba(0,0,0,.28) !important;
    }

    body.admin-global-light .admin-modal .modal-head h2,
    body.admin-global-dark .admin-modal .modal-head h2{color:var(--pba-primary) !important}

    body.admin-global-light .admin-modal .modal-close,
    body.admin-global-dark .admin-modal .modal-close{
      background:var(--pba-surface-soft) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border) !important;
    }

    body.admin-global-light .image-upload-box,
    body.admin-global-dark .image-upload-box,
    body.admin-global-light .image-upload-btn,
    body.admin-global-dark .image-upload-btn{
      background:var(--pba-surface-soft) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border-strong) !important;
    }

    body.admin-global-light .image-file-name,
    body.admin-global-dark .image-file-name,
    body.admin-global-light .upload-progress,
    body.admin-global-dark .upload-progress{color:var(--pba-muted) !important}

    /* Login gate */
    body.admin-global-light .admin-login-gate,
    body.admin-global-dark .admin-login-gate{
      background:
        radial-gradient(circle at 12% 10%,var(--pba-sky),transparent 26%),
        radial-gradient(circle at 88% 14%,var(--pba-peach),transparent 25%),
        linear-gradient(180deg,var(--pba-bg),var(--pba-bg-2)) !important;
    }
    body.admin-global-light .login-card,
    body.admin-global-dark .login-card{
      background:var(--pba-surface) !important;
      color:var(--pba-ink) !important;
      border:1px solid var(--pba-border) !important;
      box-shadow:var(--pba-shadow) !important;
      border-radius:26px !important;
      backdrop-filter:blur(18px) !important;
      -webkit-backdrop-filter:blur(18px) !important;
    }
    body.admin-global-light .login-brand h1,
    body.admin-global-dark .login-brand h1{color:var(--pba-primary) !important}
    body.admin-global-light .login-brand p,
    body.admin-global-dark .login-brand p,
    body.admin-global-light .login-field label,
    body.admin-global-dark .login-field label{color:var(--pba-muted) !important}
    body.admin-global-light .login-submit,
    body.admin-global-dark .login-submit{
      background:linear-gradient(135deg,var(--pba-primary-2),var(--pba-primary)) !important;
      color:#fff !important;
      border:0 !important;
      box-shadow:0 10px 24px color-mix(in srgb,var(--pba-primary) 25%,transparent) !important;
    }

    /* Messages */
    body.admin-global-light .msg.ok,
    body.admin-global-dark .msg.ok{
      background:color-mix(in srgb,var(--pba-primary) 11%,var(--pba-surface-strong)) !important;
      color:var(--pba-primary) !important;
      border-color:var(--pba-border-strong) !important;
    }
    body.admin-global-light .msg.err,
    body.admin-global-dark .msg.err{
      background:color-mix(in srgb,var(--pba-danger) 10%,var(--pba-surface-strong)) !important;
      color:var(--pba-danger) !important;
      border-color:color-mix(in srgb,var(--pba-danger) 28%,transparent) !important;
    }

    @media(max-width:650px){
      body.admin-global-light .admin-modal-card,
      body.admin-global-dark .admin-modal-card{border-radius:24px 24px 0 0 !important}
      body.admin-global-light .panel,
      body.admin-global-dark .panel,
      body.admin-global-light .compact-details,
      body.admin-global-dark .compact-details{border-radius:18px !important}
      body.admin-global-light input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
      body.admin-global-dark input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
      body.admin-global-light textarea,
      body.admin-global-dark textarea,
      body.admin-global-light select,
      body.admin-global-dark select{font-size:16px !important}
    }
  `;

  /*
    Confirm option deletion before admin-option-order's document-level
    capture listener runs. Window capture is intentionally used because
    its phase occurs before document capture, regardless of load order.
  */
  if (!window.__PB_OPTION_DELETE_CONFIRM_V1__) {
    window.__PB_OPTION_DELETE_CONFIRM_V1__ = true;

    window.addEventListener('click', event => {
      const button = event.target?.closest?.('[data-sm-option-delete]');
      if (!button) return;

      const row = button.closest('.option-editor');
      if (!row) return;

      const name = String(
        row.querySelector('.oe-name,.noe-name')?.value ||
        row.querySelector('.oe-name,.noe-name')?.getAttribute('value') ||
        ''
      ).trim();

      const label = name ? ` «${name}»` : '';
      const ok = window.confirm(`هل أنت متأكد من حذف الخيار${label}؟`);

      if (!ok) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
})();