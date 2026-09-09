(() => {
  if (window.__PASHA_COLOR_IMAGE_GALLERY_V2__) return;
  window.__PASHA_COLOR_IMAGE_GALLERY_V2__ = true;

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
    if (document.getElementById('pbColorImageGalleryStylesV2')) return;
    const style = document.createElement('style');
    style.id = 'pbColorImageGalleryStylesV2';
    style.textContent = `
      .pb-color-choice.has-image{min-height:66px;position:relative;padding-inline-start:8px}
      .pb-color-choice-image{width:48px;height:48px;flex:0 0 48px;object-fit:cover;border-radius:11px;border:1px solid #eadde2;background:#fff;box-shadow:0 4px 12px rgba(85,61,72,.08);cursor:zoom-in;-webkit-tap-highlight-color:transparent}
      .pb-color-choice.has-image > i{width:15px;height:15px;flex:0 0 15px;border-width:1.5px}
      .pb-color-large-preview{display:flex;align-items:center;gap:11px;margin:3px 0 12px;padding:10px;border:1px solid #eadde2;border-radius:15px;background:#fff7fa}
      .pb-color-large-preview img{width:82px;height:82px;object-fit:cover;border-radius:13px;background:#fff;border:1px solid #eadde2;cursor:zoom-in;-webkit-tap-highlight-color:transparent}
      .pb-color-large-preview-copy{min-width:0}.pb-color-large-preview-copy b{display:block;color:#5c4c53;font-size:13px;margin-bottom:4px}.pb-color-large-preview-copy span{display:block;color:#8f7882;font-size:10px;line-height:1.5}
      #pbColorImageLightbox{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(17,12,14,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #pbColorImageLightbox.open{display:flex}
      .pb-color-lightbox-card{position:relative;width:min(94vw,760px);max-height:92vh;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:rgba(255,250,252,.98);box-shadow:0 25px 70px rgba(0,0,0,.38)}
      .pb-color-lightbox-card img{display:block;max-width:100%;max-height:78vh;width:auto;height:auto;object-fit:contain;border-radius:16px;background:#fff}
      .pb-color-lightbox-caption{max-width:90%;text-align:center;color:#5c4c53;font-size:12px;font-weight:800}
      .pb-color-lightbox-close{position:absolute;top:8px;inset-inline-end:8px;width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(28,20,24,.82);color:#fff;font-size:24px;line-height:1;z-index:2}
      @media(max-width:390px){.pb-color-large-preview img{width:72px;height:72px}.pb-color-choice-image{width:44px;height:44px;flex-basis:44px}.pb-color-lightbox-card{padding:9px;border-radius:18px}.pb-color-lightbox-card img{max-height:76vh}}
    `;
    document.head.appendChild(style);
  }

  function colorName(color) {
    return String(color?.ar || color?.ku || color?.en || 'اللون المحدد');
  }

  function ensureLightbox() {
    let lightbox = document.getElementById('pbColorImageLightbox');
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.id = 'pbColorImageLightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = `
      <div class="pb-color-lightbox-card" role="dialog" aria-modal="true" aria-label="معاينة صورة اللون">
        <button class="pb-color-lightbox-close" type="button" aria-label="إغلاق">×</button>
        <img alt="">
        <div class="pb-color-lightbox-caption"></div>
      </div>`;
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function openLightbox(src, caption = '') {
    const safe = safeMedia(src);
    if (!safe) return;
    const box = ensureLightbox();
    const img = box.querySelector('img');
    const text = box.querySelector('.pb-color-lightbox-caption');
    img.src = safe;
    img.alt = caption || 'صورة اللون';
    text.textContent = caption || '';
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const box = document.getElementById('pbColorImageLightbox');
    if (!box?.classList.contains('open')) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function decorate() {
    installStyles();
    const body = document.getElementById('pbCommerceBody');
    if (!body) return;
    const colors = allColors();

    body.querySelectorAll('[data-pb-color-id]').forEach(button => {
      const entry = colors.get(String(button.dataset.pbColorId || ''));
      const image = safeMedia(entry?.image || '');
      let img = button.querySelector('.pb-color-choice-image');
      button.classList.toggle('has-image', !!image);
      if (!image) {
        img?.remove();
        return;
      }
      if (!img) {
        img = document.createElement('img');
        img.className = 'pb-color-choice-image';
        img.loading = 'lazy';
        img.decoding = 'async';
        button.insertBefore(img, button.firstChild);
      }
      if (img.src !== image) img.src = image;
      img.alt = colorName(entry);
      img.dataset.pbColorPreview = image;
      img.dataset.pbColorCaption = colorName(entry);
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
      preview.innerHTML = '<img decoding="async" alt=""><div class="pb-color-large-preview-copy"><b></b><span>اضغط على الصورة لعرضها بحجم كبير</span></div>';
      body.prepend(preview);
    }
    const img = preview.querySelector('img');
    const title = preview.querySelector('b');
    if (img.src !== image) img.src = image;
    img.alt = colorName(entry);
    img.dataset.pbColorPreview = image;
    img.dataset.pbColorCaption = colorName(entry);
    title.textContent = colorName(entry);
  }

  let scheduled = false;
  let commerceObserver = null;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate();
      ensureScopedObserver();
    });
  }

  function ensureScopedObserver() {
    if (commerceObserver) return;
    const body = document.getElementById('pbCommerceBody');
    if (!body) return;
    commerceObserver = new MutationObserver(schedule);
    commerceObserver.observe(body, { childList: true, subtree: true });
  }

  document.addEventListener('click', event => {
    const previewImage = event.target.closest?.('[data-pb-color-preview]');
    if (previewImage) {
      event.preventDefault();
      event.stopPropagation();
      openLightbox(previewImage.dataset.pbColorPreview || previewImage.src, previewImage.dataset.pbColorCaption || previewImage.alt || '');
      return;
    }

    const lightbox = event.target.closest?.('#pbColorImageLightbox');
    if (lightbox && (event.target === lightbox || event.target.closest('.pb-color-lightbox-close'))) {
      event.preventDefault();
      closeLightbox();
      return;
    }

    if (event.target.closest?.('[data-pb-color-id]')) setTimeout(schedule, 0);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
  });

  window.addEventListener('restbr:commerce-ready', schedule);
  window.addEventListener('restbr:ready', schedule);

  function boot() {
    installStyles();
    ensureLightbox();
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
