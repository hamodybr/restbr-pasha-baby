(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_COLOR_IMAGE_UPLOAD_V1__) return;
  window.__PASHA_ADMIN_COLOR_IMAGE_UPLOAD_V1__ = true;

  const TARGET_BYTES = 620 * 1024;
  const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
  const q = (selector, root = document) => root.querySelector(selector);

  function client() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function installStyles() {
    if (q('#pbColorUploadStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbColorUploadStyles';
    style.textContent = `
      .pb-color-upload-box{display:grid;gap:7px;margin-top:7px;padding:8px;border:1px solid var(--pba-border,rgba(47,139,115,.15));border-radius:11px;background:color-mix(in srgb,var(--pba-surface-strong,#fff) 92%,transparent)}
      .pb-color-upload-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
      .pb-color-upload-btn{min-height:38px;padding:0 12px;border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 28%,transparent);border-radius:10px;background:color-mix(in srgb,var(--pba-primary,#2f8b73) 8%,var(--pba-surface-strong,#fff));color:var(--pba-primary,#2f8b73);font-weight:900}
      .pb-color-upload-file{display:none!important}.pb-color-upload-progress{font-size:10px;color:var(--pba-muted,#6e7b81);line-height:1.5}.pb-color-upload-progress.is-error{color:#b64d4d}
      .pb-color-upload-preview{display:none;align-items:center;gap:8px}.pb-color-upload-preview.show{display:flex}.pb-color-upload-preview img{width:58px;height:58px;border-radius:10px;object-fit:cover;border:1px solid var(--pba-border,rgba(47,139,115,.15));background:#fff}.pb-color-upload-preview span{font-size:10px;color:var(--pba-muted,#6e7b81)}
      body.admin-global-dark .pb-color-upload-box{background:#111916!important;border-color:rgba(117,190,161,.16)!important}.pb-color-upload-btn:disabled{opacity:.55;cursor:not-allowed}
    `;
    document.head.appendChild(style);
  }

  const fmt = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  async function canvasBlob(canvas, quality) {
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر ضغط الصورة.')), 'image/webp', quality));
  }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return { image: await createImageBitmap(file, { imageOrientation: 'from-image' }), close: img => img.close?.() }; } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return { image, close: () => URL.revokeObjectURL(url) };
  }

  async function compress(file, progress) {
    if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) throw new Error('اختر ملف صورة.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('الصورة الأصلية أكبر من 30MB.');
    if (/image\/(?:gif|svg\+xml)/i.test(file.type || '')) {
      if (file.size > TARGET_BYTES) throw new Error('GIF/SVG لازم يكون أقل من 620KB.');
      return file;
    }
    if (String(file.type).toLowerCase() === 'image/webp' && file.size <= TARGET_BYTES) return file;

    progress.textContent = `جاري ضغط الصورة... ${fmt(file.size)}`;
    const decoded = await decode(file);
    try {
      const width0 = Number(decoded.image.width || decoded.image.naturalWidth || 0);
      const height0 = Number(decoded.image.height || decoded.image.naturalHeight || 0);
      if (!width0 || !height0) throw new Error('تعذر قراءة أبعاد الصورة.');
      const attempts = [[1400,.78],[1200,.72],[1024,.66],[900,.60],[760,.54],[640,.48],[520,.42]];
      let best = null;
      for (const [edge, quality] of attempts) {
        const scale = Math.min(1, edge / Math.max(width0, height0));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width0 * scale));
        canvas.height = Math.max(1, Math.round(height0 * scale));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('تعذر تشغيل معالج الصور.');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
        const blob = await canvasBlob(canvas, quality);
        const candidate = new File([blob], 'color.webp', { type: 'image/webp', lastModified: Date.now() });
        if (!best || candidate.size < best.size) best = candidate;
        progress.textContent = `جاري تحسين الصورة... ${fmt(candidate.size)}`;
        if (candidate.size <= TARGET_BYTES) return candidate;
      }
      if (best?.size <= 700 * 1024) return best;
      throw new Error('الصورة بقيت كبيرة بعد الضغط. جرّب صورة ثانية.');
    } finally {
      try { decoded.close?.(decoded.image); } catch (_) {}
    }
  }

  function existingAssetKey(url) {
    try {
      const decoded = decodeURIComponent(new URL(String(url || '')).pathname);
      const match = decoded.match(/\/products\/color-assets\/([-a-zA-Z0-9_]{12,120})$/);
      return match?.[1] || '';
    } catch (_) { return ''; }
  }

  function randomKey() {
    const raw = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `clr-${String(raw).replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 100)}`;
  }

  async function uploadColor(input, urlInput, box) {
    const file = input.files?.[0];
    if (!file) return;
    const progress = q('.pb-color-upload-progress', box);
    const button = q('.pb-color-upload-btn', box);
    progress.classList.remove('is-error');
    button.disabled = true;
    try {
      const prepared = await compress(file, progress);
      progress.textContent = `جاري الرفع إلى Backblaze... ${fmt(prepared.size)}`;
      const assetKey = box.dataset.assetKey || existingAssetKey(urlInput.value) || randomKey();
      box.dataset.assetKey = assetKey;
      const form = new FormData();
      form.append('assetKey', assetKey);
      form.append('file', prepared, prepared.name || 'color.webp');
      const sb = client();
      if (!sb?.functions?.invoke) throw new Error('خدمة رفع الصور غير جاهزة.');
      const { data, error } = await sb.functions.invoke('b2-color-images', {
        headers: { 'x-pb-action': 'upload' },
        body: form,
      });
      if (error) throw error;
      if (!data?.publicUrl) throw new Error(data?.error || 'لم يرجع رابط الصورة.');
      urlInput.value = data.publicUrl;
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
      urlInput.dispatchEvent(new Event('change', { bubbles: true }));
      progress.textContent = 'تم رفع صورة اللون ✓ — اضغط حفظ اللون.';
      renderPreview(urlInput, box);
    } catch (error) {
      progress.textContent = 'فشل رفع الصورة: ' + (error?.message || error);
      progress.classList.add('is-error');
    } finally {
      button.disabled = false;
      input.value = '';
    }
  }

  function renderPreview(urlInput, box) {
    const preview = q('.pb-color-upload-preview', box);
    const img = q('img', preview);
    const url = String(urlInput.value || '').trim();
    preview.classList.toggle('show', !!url);
    if (url) img.src = url;
    else img.removeAttribute('src');
  }

  function enhance(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.pbColorUploadReady === '1') return;
    input.dataset.pbColorUploadReady = '1';
    const box = document.createElement('div');
    box.className = 'pb-color-upload-box';
    const currentKey = existingAssetKey(input.value);
    if (currentKey) box.dataset.assetKey = currentKey;
    box.innerHTML = `
      <div class="pb-color-upload-actions">
        <button class="pb-color-upload-btn" type="button">📷 رفع صورة اللون</button>
        <input class="pb-color-upload-file" type="file" accept="image/*">
      </div>
      <div class="pb-color-upload-progress">تقدر ترفع الصورة مباشرة بدل لصق رابط.</div>
      <div class="pb-color-upload-preview"><img alt="معاينة صورة اللون"><span>معاينة الصورة الخاصة بهذا اللون</span></div>`;
    input.insertAdjacentElement('afterend', box);
    const fileInput = q('.pb-color-upload-file', box);
    q('.pb-color-upload-btn', box)?.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => void uploadColor(fileInput, input, box));
    input.addEventListener('input', () => {
      const key = existingAssetKey(input.value);
      if (key) box.dataset.assetKey = key;
      renderPreview(input, box);
    });
    renderPreview(input, box);
  }

  function scan() {
    installStyles();
    document.querySelectorAll('.pb-edit-color-image,.pb-npc-image').forEach(enhance);
  }

  function boot() {
    installStyles();
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
