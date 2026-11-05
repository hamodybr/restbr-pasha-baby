(() => {
  if (window.__PASHA_OPTION_IMAGES__ || !/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  window.__PASHA_OPTION_IMAGES__ = true;
  window.PASHA_OPTION_IMAGE_UPLOADS = 0;
  const safe = value => {
    try { const u = new URL(String(value || '').trim()); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }
    catch (_) { return ''; }
  };
  const status = (box, text) => { box.querySelector('.pb-option-image-status').textContent = text; };
  function preview(box) {
    const url = safe(box.querySelector('.oe-image').value);
    const holder = box.querySelector('.pb-option-image-preview');
    const image = holder.querySelector('img');
    holder.hidden = !url;
    const thumb = window.RESTBR_OPTIMIZED_MEDIA_URL?.(url, 'category') || url;
    if (url && image.getAttribute('src') !== thumb) image.src = thumb;
    else if (!url) image.removeAttribute('src');
  }
  function assign(box, url) {
    box.querySelector('.oe-image').value = safe(url);
    box.querySelector('.pb-option-image-picker').hidden = true;
    preview(box);
    status(box, url ? 'تم ربط الصورة — اضغط حفظ الصنف.' : 'تم إلغاء الربط — اضغط حفظ الصنف.');
  }
  function pick(box) {
    const holder = box.querySelector('.pb-option-image-picker');
    if (!holder.hidden) { holder.hidden = true; return; }
    const urls = new Set();
    // Only this product's main image and color images; never fetch the catalog again.
    document.querySelectorAll('#p_image_url,#np_image_url,#pbEditorColorList .pb-edit-color-image,#optionsEditor .oe-image,#newOptionsEditor .oe-image').forEach(input => {
      const url = safe(input.value); if (url) urls.add(url);
    });
    holder.replaceChildren();
    if (!urls.size) { status(box, 'ارفع صورة للصنف أولاً أو ارفع صورة خاصة بهذا الخيار.'); return; }
    for (const url of urls) {
      const button = document.createElement('button'); button.type = 'button';
      button.setAttribute('aria-label', 'ربط هذه الصورة بالخيار');
      const image = document.createElement('img');
      image.src = window.RESTBR_OPTIMIZED_MEDIA_URL?.(url, 'category') || url;
      image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
      button.append(image); button.addEventListener('click', () => assign(box, url));
      holder.append(button);
    }
    holder.hidden = false;
    status(box, 'اختر الصورة التي تريد عرضها لهذا الخيار.');
  }
  async function upload(box, file) {
    if (!file) return;
    const controls = [...box.querySelectorAll('button,input')];
    window.PASHA_OPTION_IMAGE_UPLOADS++;
    controls.forEach(control => { control.disabled = true; });
    box.dataset.uploading = '1';
    try {
      const pipeline = window.PASHA_ADMIN_IMAGE_PIPELINE;
      if (!pipeline?.prepare || !pipeline?.thumbnail) throw new Error('معالج الصور غير جاهز. حدّث الصفحة.');
      const prepared = await pipeline.prepare(file, { profile: 'color', targetBytes: 620 * 1024, maxBytes: 700 * 1024, onProgress: text => status(box, text) });
      const thumbnail = await pipeline.thumbnail(prepared);
      status(box, 'جاري رفع صورة الخيار...');
      const form = new FormData();
      form.append('assetKey', 'opt-' + crypto.randomUUID());
      form.append('file', prepared, prepared.name || 'option.webp');
      form.append('thumbnail', thumbnail, thumbnail.name || 'card.webp');
      const sb = typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient;
      if (!sb?.functions?.invoke) throw new Error('خدمة الصور غير جاهزة.');
      const { data, error } = await sb.functions.invoke('r2-images', { headers: { 'x-pb-action': 'upload' }, body: form });
      if (error) throw error;
      if (!safe(data?.publicUrl)) throw new Error(data?.error || 'لم يرجع رابط الصورة.');
      // Detached rows are intentionally left untouched if the editor was closed.
      if (box.isConnected) assign(box, data.publicUrl);
    } catch (error) {
      if (box.isConnected) status(box, 'فشل رفع الصورة: ' + (error?.message || error));
    } finally {
      window.PASHA_OPTION_IMAGE_UPLOADS--;
      controls.forEach(control => { control.disabled = false; });
      delete box.dataset.uploading;
      box.querySelector('.pb-option-image-file').value = '';
    }
  }
  document.addEventListener('click', event => {
    const box = event.target.closest('.pb-option-image');
    if (!box || box.dataset.uploading) return;
    if (event.target.closest('[data-option-image-pick]')) pick(box);
    if (event.target.closest('[data-option-image-clear]')) assign(box, '');
    if (event.target.closest('[data-option-image-upload]')) box.querySelector('.pb-option-image-file').click();
  });
  document.addEventListener('change', event => {
    if (event.target.matches('.pb-option-image-file')) void upload(event.target.closest('.pb-option-image'), event.target.files?.[0]);
  });
  const style = document.createElement('style');
  style.textContent = `
    .pb-option-image{margin-top:10px;display:grid;gap:8px;min-width:0}
    .pb-option-image-actions{display:flex;flex-wrap:wrap;gap:6px}
    .pb-option-image button{border:1px solid #9eaca5;border-radius:9px;padding:7px 10px;color:var(--pba-primary,#2f8b73);background:var(--pba-surface-strong,#fff);font:inherit;font-size:12px;cursor:pointer;min-height:38px}
    .pb-option-image-preview{display:flex;align-items:center;gap:8px;font-size:12px}
    .pb-option-image-preview img{width:56px;height:56px;object-fit:cover;border-radius:9px}
    .pb-option-image-picker{display:flex;gap:7px;overflow-x:auto;max-width:100%;padding:4px}
    .pb-option-image-picker button{flex:0 0 64px;padding:3px}
    .pb-option-image-picker img{display:block;width:56px;height:60px;object-fit:cover;border-radius:6px}
    .pb-option-image [hidden]{display:none!important}
    .pb-option-image-status{font-size:12px;line-height:1.6}
    .pb-option-image button:disabled{opacity:.5}
  `;
  document.head.append(style);
  const body = document.getElementById('editorBody');
  if (body) {
    const enhance = root => {
      if (!(root instanceof Element)) return;
      if (root.matches('.pb-option-image')) preview(root);
      root.querySelectorAll('.pb-option-image').forEach(preview);
    };
    enhance(body);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element && !node.closest('.pb-option-image-picker')) enhance(node);
    }))).observe(body, {childList:true,subtree:true});
  }
})();
