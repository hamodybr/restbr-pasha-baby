(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_PROGRESSIVE_DISCLOSURE_V1__) return;
  window.__PASHA_ADMIN_PROGRESSIVE_DISCLOSURE_V1__ = true;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function installStyle() {
    if (q('#pbAdminProgressiveDisclosureStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbAdminProgressiveDisclosureStyle';
    style.textContent = `
      #editorBody .pb-fold{
        grid-column:1/-1;
        width:100%;
        min-width:0;
        margin:10px 0 0;
        border:1px solid var(--pba-border,rgba(47,139,115,.15));
        border-radius:15px;
        overflow:hidden;
        background:var(--pba-surface-strong,#fff);
        box-shadow:none;
      }
      #editorBody .pb-fold[open]{
        border-color:color-mix(in srgb,var(--pba-primary,#2f8b73) 30%,var(--pba-border,rgba(47,139,115,.15)));
      }
      #editorBody .pb-fold > summary{
        list-style:none;
        cursor:pointer;
        display:grid;
        grid-template-columns:minmax(0,1fr) 30px;
        gap:10px;
        align-items:center;
        min-height:58px;
        padding:11px 13px;
        user-select:none;
        -webkit-user-select:none;
        background:linear-gradient(145deg,color-mix(in srgb,var(--pba-primary,#2f8b73) 4%,transparent),transparent);
      }
      #editorBody .pb-fold > summary::-webkit-details-marker{display:none}
      #editorBody .pb-fold-copy{min-width:0}
      #editorBody .pb-fold-copy strong{
        display:block;
        color:var(--pba-primary,#2f8b73);
        font-size:14px;
        line-height:1.45;
        margin:0 0 3px;
      }
      #editorBody .pb-fold-copy small{
        display:block;
        color:var(--pba-muted,#6e7b81);
        font-size:10px;
        line-height:1.55;
      }
      #editorBody .pb-fold-chevron{
        width:30px;
        height:30px;
        display:grid;
        place-items:center;
        border:1px solid var(--pba-border,rgba(47,139,115,.15));
        border-radius:10px;
        color:var(--pba-primary,#2f8b73);
        background:var(--pba-surface,#fffdfb);
        font-size:17px;
        font-weight:900;
        transition:transform .18s ease,background .18s ease;
      }
      #editorBody .pb-fold[open] .pb-fold-chevron{transform:rotate(180deg)}
      #editorBody .pb-fold-body{
        padding:0 12px 12px;
        border-top:1px solid var(--pba-border,rgba(47,139,115,.12));
      }
      #editorBody .pb-fold[open] .pb-fold-body{animation:pbFoldIn .16s ease both}
      @keyframes pbFoldIn{from{opacity:.35;transform:translateY(-3px)}to{opacity:1;transform:none}}

      #editorBody .pb-fold-source[data-pb-fold-hide-head="1"] > .schedule-editor-head:first-child{display:none!important}
      #editorBody .pb-fold-source[data-pb-fold-hide-label="1"] > label:first-child{display:none!important}
      #editorBody .pb-fold-source .schedule-editor-head[data-pb-fold-compact-head="1"] > :first-child{display:none!important}
      #editorBody .pb-fold-source .schedule-editor-head[data-pb-fold-compact-head="1"]{
        justify-content:flex-end!important;
        margin:9px 0 8px!important;
      }

      #editorBody .pb-fold .pb-category-badges-clean,
      #editorBody .pb-fold #pbProductColorsEditor,
      #editorBody .pb-fold #pbNewProductColorsEditor,
      #editorBody .pb-fold .field.full,
      #editorBody .pb-fold .checks{
        margin-left:0!important;
        margin-right:0!important;
      }
      #editorBody .pb-fold .pb-category-badges-clean,
      #editorBody .pb-fold #pbProductColorsEditor,
      #editorBody .pb-fold #pbNewProductColorsEditor{
        margin-top:10px!important;
      }

      body.admin-global-dark #editorBody .pb-fold{
        background:var(--pba-surface-strong,#18211f)!important;
      }
      body.admin-global-dark #editorBody .pb-fold > summary,
      body.admin-global-dark #editorBody .pb-fold-chevron{
        background:var(--pba-surface,#101715)!important;
      }

      @media(max-width:640px){
        #editorBody .pb-fold{border-radius:14px;margin-top:9px}
        #editorBody .pb-fold > summary{min-height:54px;padding:10px 11px}
        #editorBody .pb-fold-copy strong{font-size:13px}
        #editorBody .pb-fold-copy small{font-size:9.5px}
        #editorBody .pb-fold-body{padding:0 9px 10px}
      }

      @media(prefers-reduced-motion:reduce){
        #editorBody .pb-fold-chevron{transition:none}
        #editorBody .pb-fold[open] .pb-fold-body{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  function closeDefaultDetails(root = document) {
    const selector = [
      'details.settings-accordion',
      'details.ui-design-group',
      'details.dynamic-item',
      'details.compact-details'
    ].join(',');

    qa(selector, root).forEach(details => {
      if (details.dataset.pbDefaultFoldInitialized === '1') return;
      details.dataset.pbDefaultFoldInitialized = '1';
      details.removeAttribute('open');
    });
  }

  function text(el) {
    return String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function sourceMeta(block, fallbackTitle, fallbackSubtitle) {
    const head = q('.schedule-editor-head', block) || q('.pb-editor-colors-head', block) || q('.pb-npc-head', block);
    const directLabel = block.matches('.field') ? q(':scope > label', block) : null;
    const titleEl = q('strong', head || block) || directLabel;
    const subtitleEl = q('small', head || block);
    return {
      head,
      directLabel,
      title: text(titleEl) || fallbackTitle,
      subtitle: text(subtitleEl) || fallbackSubtitle
    };
  }

  function foldElement(block, options = {}) {
    if (!(block instanceof Element)) return null;
    if (block.dataset.pbFoldWrapped === '1' || block.closest('details.pb-fold')) return block.closest('details.pb-fold');
    if (!block.parentElement) return null;

    const meta = sourceMeta(
      block,
      options.title || 'خيارات إضافية',
      options.subtitle || 'افتح هذا القسم فقط عند الحاجة.'
    );
    const title = options.title || meta.title || 'خيارات إضافية';
    const subtitle = options.subtitle || meta.subtitle || 'افتح هذا القسم فقط عند الحاجة.';

    block.dataset.pbFoldWrapped = '1';
    block.classList.add('pb-fold-source');

    if (options.hideDirectLabel && meta.directLabel) block.dataset.pbFoldHideLabel = '1';
    if (meta.head) {
      const headHasInteractive = !!q('input,select,textarea,button,a', meta.head);
      if (!headHasInteractive && options.keepSourceHead !== true) {
        block.dataset.pbFoldHideHead = '1';
      } else if (headHasInteractive && options.compactInteractiveHead !== false) {
        meta.head.dataset.pbFoldCompactHead = '1';
      }
    }

    const details = document.createElement('details');
    details.className = 'pb-fold';
    details.dataset.pbAutoFold = '1';
    details.dataset.pbDefaultFoldInitialized = '1';

    const summary = document.createElement('summary');
    const copy = document.createElement('span');
    copy.className = 'pb-fold-copy';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = subtitle;
    copy.append(strong, small);

    const chevron = document.createElement('span');
    chevron.className = 'pb-fold-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '⌄';
    summary.append(copy, chevron);

    const body = document.createElement('div');
    body.className = 'pb-fold-body';

    block.parentElement.insertBefore(details, block);
    details.append(summary, body);
    body.appendChild(block);
    return details;
  }

  function foldEditorSections() {
    const modal = q('#editorModal');
    const body = q('#editorBody');
    if (!body || !modal?.classList.contains('open')) return;

    // Category bulk badges in both edit/add flows (when present).
    qa('.pb-category-badges-clean,.schedule-editor', body).forEach(block => {
      const content = text(block);
      if (!/ليبلات.*أصناف القسم|ليبلات أصناف القسم|ليبلات كل أصناف القسم/.test(content)) return;
      foldElement(block, {
        title: '🏷 ليبلات أصناف القسم',
        subtitle: 'اختياري — افتحه فقط إذا تريد تطبيق ليبلات على أصناف القسم.'
      });
    });

    // Product options: this can become very tall, so keep it closed until needed.
    ['#optionsEditor', '#newOptionsEditor'].forEach(selector => {
      const editor = q(selector, body);
      const field = editor?.closest('.field.full,.field');
      if (!field) return;
      foldElement(field, {
        title: '🧩 خيارات الصنف والأسعار',
        subtitle: 'المقاسات أو النسخ والأسعار الإضافية.',
        hideDirectLabel: true
      });
    });

    // Existing-product and new-product color managers.
    const existingColors = q('#pbProductColorsEditor', body);
    if (existingColors) {
      foldElement(existingColors, {
        title: '🎨 ألوان الصنف',
        subtitle: 'الألوان، التوفر والصورة الخاصة بكل لون.'
      });
    }
    const newColors = q('#pbNewProductColorsEditor', body);
    if (newColors) {
      foldElement(newColors, {
        title: '🎨 ألوان الصنف',
        subtitle: 'أضف ألوان الصنف قبل الحفظ إذا كان المنتج يحتاجها.'
      });
    }

    // Product state / badge grid gets noisy when many switches are present.
    qa('.checks', body).forEach(checks => {
      if (checks.children.length < 4) return;
      foldElement(checks, {
        title: '⚙️ حالة الصنف والليبلات',
        subtitle: 'التفعيل، الظهور، التوفر وليبلات البيع.'
      });
    });

    // Any other long schedule/advanced block: progressively disclose only when it has several controls.
    qa('.schedule-editor', body).forEach(block => {
      if (block.dataset.pbFoldWrapped === '1' || block.closest('details.pb-fold')) return;
      const controls = qa('input,select,textarea,button', block).length;
      if (controls < 3) return;
      const meta = sourceMeta(block, 'خيارات متقدمة', 'افتح هذا القسم فقط عند الحاجة.');
      foldElement(block, {
        title: meta.title || 'خيارات متقدمة',
        subtitle: meta.subtitle || 'افتح هذا القسم فقط عند الحاجة.'
      });
    });
  }

  function revealTarget(target) {
    if (!(target instanceof Element)) return;
    let details = target.closest('details');
    while (details) {
      if (!details.open) details.open = true;
      details = details.parentElement?.closest('details') || null;
    }
  }

  function process(root = document) {
    installStyle();
    closeDefaultDetails(root);
    foldEditorSections();
  }

  function boot() {
    process(document);

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        process(document);
      });
    };

    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.addedNodes.length || m.removedNodes.length)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('invalid', event => revealTarget(event.target), true);
    document.addEventListener('focusin', event => revealTarget(event.target), true);
    document.addEventListener('click', event => {
      if (event.target.closest('[onclick*="editAdmin"],[onclick*="openAdd"],.edit-product-btn,.mini-btn')) {
        setTimeout(schedule, 0);
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
