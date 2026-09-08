(() => {
  if (window.__PASHA_COLOR_IMAGE_GALLERY_V1__) return;
  window.__PASHA_COLOR_IMAGE_GALLERY_V1__ = true;

  const safeMedia = value => {
    try {
      const fn = window.RESTBR_SAFE_MEDIA_URL;
      if (typeof fn === 'function') return fn(value) || '';
    } catch (_) {}
    return String(value || '');
  };

  function allColors() {
    const products = window.RESTBR_DB?.products || [];
    const map = new Map();
    products.forEach(product => {
      (product.colors || []).forEach(color => {
        if (color?.id) map.set(String(color.id), { ...color, product });
      });
    });
    return map;
  }

  function installStyles() {
    if (document.getElementById('pbColorImageGalleryStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbColorImageGalleryStyles';
    style.textContent = `
      .pb-color-choice.has-image{min-height:66px;position:relative;padding-inline-start:8px}
      .pb-color-choice-image{width:48px;height:48px;flex:0 0 48px;object-fit:cover;border-radius:11px;border:1px solid #eadde2;background:#fff;box-shadow:0 4px 12px rgba(85,61,72,.08)}
      .pb-color-choice.has-image > i{width:15px;height:15px;flex:0 0 15px;border-width:1.5px}
      .pb-color-large-preview{display:flex;align-items:center;gap:11px;margin:3px 0 12px;padding:10px;border:1px solid #eadde2;border-radius:15px;background:#fff7fa}
      .pb-color-large-preview img{width:82px;height:82px;object-fit:cover;border-radius:13px;background:#fff;border:1px solid #eadde2}
      .pb-color-large-preview-copy{min-width:0}.pb-color-large-preview-copy b{display:block;color:#5c4c53;font-size:13px;margin-bottom:4px}.pb-color-large-preview-copy span{display:block;color:#8f7882;font-size:10px;line-height:1.5}
      @media(max-width:390px){.pb-color-large-preview img{width:72px;height:72px}.pb-color-choice-image{width:44px;height:44px;flex-basis:44px}}
    `;
    document.head.appendChild(style);
  }

  function colorName(color) {
    return String(color?.ar || color?.ku || color?.en || 'اللون المحدد');
  }

  function decorate() {
    installStyles();
    const body = document.getElementById('pbCommerceBody');
    if (!body) return;
    const colors = allColors();

    body.querySelectorAll('[data-pb-color-id]').forEach(button => {
      const entry = colors.get(String(button.dataset.pbColorId || ''));
      const image = safeMedia(entry?.image || '');
      button.querySelector('.pb-color-choice-image')?.remove();
      button.classList.toggle('has-image', !!image);
      if (image) {
        const img = document.createElement('img');
        img.className = 'pb-color-choice-image';
        img.src = image;
        img.alt = colorName(entry);
        img.loading = 'lazy';
        img.decoding = 'async';
        button.insertBefore(img, button.firstChild);
      }
    });

    const selected = body.querySelector('.pb-color-choice.selected[data-pb-color-id]');
    const entry = selected ? colors.get(String(selected.dataset.pbColorId || '')) : null;
    const image = safeMedia(entry?.image || '');
    let preview = body.querySelector('.pb-color-large-preview');

    if (!image) {
      preview?.remove();
      return;
    }

    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'pb-color-large-preview';
      body.prepend(preview);
    }
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = image;
    img.alt = colorName(entry);
    img.decoding = 'async';
    const copy = document.createElement('div');
    copy.className = 'pb-color-large-preview-copy';
    const title = document.createElement('b');
    title.textContent = colorName(entry);
    const note = document.createElement('span');
    note.textContent = 'معاينة صورة اللون المحدد';
    copy.append(title, note);
    preview.append(img, copy);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate();
    });
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-pb-color-id]')) setTimeout(schedule, 0);
  });
  window.addEventListener('restbr:commerce-ready', schedule);
  window.addEventListener('restbr:ready', schedule);

  function boot() {
    installStyles();
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
