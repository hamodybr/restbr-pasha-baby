(() => {
  if (window.__PASHA_B2_STORAGE_V1__) return;
  window.__PASHA_B2_STORAGE_V1__ = true;

  const TARGET_BYTES = 620 * 1024;
  const SERVER_MAX_BYTES = 700 * 1024;
  const SOURCE_LIMIT = 30 * 1024 * 1024;
  const FUNCTION_NAME = 'b2-images';
  const GB = 1024 * 1024 * 1024;

  const $ = id => document.getElementById(id);
  const sleepPaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

  function client() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function setProgress(id, text) {
    const el = $(id);
    if (el) el.textContent = text || '';
  }

  function fmt(bytes) {
    const n = Number(bytes || 0);
    if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${Math.max(0, Math.round(n / 1024))} KB`;
  }

  function fileBase(name) {
    return String(name || 'product').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'product';
  }

  async function canvasBlob(canvas, type, quality) {
    return await new Promise((resolve, reject) => {
      try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر ضغط الصورة.')), type, quality); }
      catch (error) { reject(error); }
    });
  }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return { source: await createImageBitmap(file, { imageOrientation: 'from-image' }), close: source => source.close?.() }; }
      catch (_) {
        try { return { source: await createImageBitmap(file), close: source => source.close?.() }; } catch (_) {}
      }
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    if (typeof image.decode === 'function') await image.decode();
    else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    return { source: image, close: () => URL.revokeObjectURL(url) };
  }

  async function renderWebp(source, originalName, maxEdge, quality) {
    const sw = Number(source.width || source.naturalWidth || 0);
    const sh = Number(source.height || source.naturalHeight || 0);
    if (!sw || !sh) throw new Error('تعذر معرفة أبعاد الصورة.');
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('تعذر تشغيل معالج الصور.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    const blob = await canvasBlob(canvas, 'image/webp', quality);
    canvas.width = 1;
    canvas.height = 1;
    return new File([blob], `${fileBase(originalName)}.webp`, { type: 'image/webp', lastModified: Date.now() });
  }

  async function prepareForB2(file, progressId) {
    if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) throw new Error('الملف المختار ليس صورة.');
    if (file.size > SOURCE_LIMIT) throw new Error('الحد الأقصى للصورة الأصلية قبل الضغط هو 30MB.');

    if (/image\/(?:gif|svg\+xml)/i.test(file.type || '')) {
      if (file.size > TARGET_BYTES) throw new Error('GIF/SVG يجب أن يكون أقل من 620KB.');
      return file;
    }

    if (String(file.type).toLowerCase() === 'image/webp' && file.size <= TARGET_BYTES) return file;

    setProgress(progressId, `جاري ضغط الصورة تلقائياً... ${fmt(file.size)}`);
    await sleepPaint();

    const decoded = await decode(file);
    try {
      const attempts = [
        [1400, .78],
        [1280, .72],
        [1150, .68],
        [1024, .64],
        [900, .60],
        [800, .56],
        [720, .52],
        [640, .48],
        [560, .44],
        [480, .40]
      ];

      let best = null;
      for (const [edge, quality] of attempts) {
        const candidate = await renderWebp(decoded.source, file.name, edge, quality);
        if (!best || candidate.size < best.size) best = candidate;
        setProgress(progressId, `جاري تحسين الصورة... ${fmt(candidate.size)}`);
        await sleepPaint();
        if (candidate.size <= TARGET_BYTES) return candidate;
      }

      if (best?.size <= SERVER_MAX_BYTES) return best;
      throw new Error(`الصورة بقيت كبيرة بعد الضغط (${fmt(best?.size || 0)}). جرّب صورة أخرى.`);
    } finally {
      try { decoded.close?.(decoded.source); } catch (_) {}
    }
  }

  async function detailedInvokeError(error) {
    const fallback = String(error?.message || error || 'فشل الاتصال بخدمة الصور.');
    try {
      const response = error?.context;
      if (response && typeof response.clone === 'function') {
        const clone = response.clone();
        const text = await clone.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const message = String(parsed?.error || parsed?.message || '').trim();
            if (message) return message;
          } catch (_) {
            const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (clean) return clean.slice(0, 500);
          }
        }
        if (response.status) return `${fallback} (HTTP ${response.status})`;
      }
    } catch (_) {}
    return fallback;
  }

  async function invoke(action, body) {
    const sb = client();
    if (!sb?.functions?.invoke) throw new Error('خدمة رفع الصور غير جاهزة.');

    let timeoutId = 0;
    try {
      const call = sb.functions.invoke(FUNCTION_NAME, {
        headers: { 'x-pb-action': action },
        body
      });
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('انتهت مهلة الاتصال بخدمة الصور بعد 40 ثانية.')), 40000);
      });
      const { data, error } = await Promise.race([call, timeout]);
      if (error) throw new Error(await detailedInvokeError(error));
      if (data?.error) throw new Error(String(data.error));
      return data || {};
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function upload({ inputId, urlInputId, progressId, productId }) {
    const input = $(inputId);
    const original = input?.files?.[0];
    if (!original) return String($(urlInputId)?.value || '').trim();

    const prepared = await prepareForB2(original, progressId);
    setProgress(progressId, `تم الضغط ${fmt(original.size)} → ${fmt(prepared.size)}. جاري الرفع إلى التخزين...`);

    const form = new FormData();
    form.append('productId', String(productId || ''));
    form.append('file', prepared, prepared.name || 'product.webp');

    const data = await invoke('upload', form);
    if (!data.publicUrl) throw new Error('تم الرفع لكن لم يرجع رابط الصورة.');

    const urlInput = $(urlInputId);
    if (urlInput) urlInput.value = data.publicUrl;
    setProgress(progressId, `تم رفع الصورة ✓ ${fmt(prepared.size)}${data.warning ? ' — اقتربنا من حد التخزين' : ''}`);
    refreshMeterSoon();
    return data.publicUrl;
  }

  function patchUploaders() {
    const edit = async productId => upload({
      inputId: 'p_image_file',
      urlInputId: 'p_image_url',
      progressId: 'p_upload_progress',
      productId
    });
    edit.__pbOptimizedWrapper = true;
    edit.__pbB2Storage = true;

    const add = async productId => upload({
      inputId: 'np_image_file',
      urlInputId: 'np_image_url',
      progressId: 'np_upload_progress',
      productId
    });
    add.__pbOptimizedWrapper = true;
    add.__pbB2Storage = true;

    window.uploadAdminProductImage = edit;
    window.uploadNewProductImage = add;
  }

  function meterCss() {
    if ($('pbB2MeterStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbB2MeterStyle';
    style.textContent = `
      .pb-b2-meter{margin:0 0 14px;padding:14px;border:1px solid var(--pba-border,rgba(47,139,115,.15));border-radius:16px;background:var(--pba-surface-strong,#fff);color:var(--pba-ink,#2f3b42);box-shadow:none}
      .pb-b2-meter-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .pb-b2-meter-head strong{font-size:13px}.pb-b2-meter-head span{font-size:11px;color:var(--pba-muted,#6e7b81)}
      .pb-b2-meter-track{height:8px;border-radius:99px;overflow:hidden;background:color-mix(in srgb,var(--pba-primary,#2f8b73) 10%,transparent)}
      .pb-b2-meter-fill{height:100%;width:0;border-radius:inherit;background:var(--pba-primary,#2f8b73);transition:width .25s ease}
      .pb-b2-meter-note{display:flex;justify-content:space-between;gap:8px;margin-top:7px;font-size:10px;color:var(--pba-muted,#6e7b81)}
      .pb-b2-meter[data-state="warn"] .pb-b2-meter-fill{background:#c88a2e}.pb-b2-meter[data-state="blocked"] .pb-b2-meter-fill{background:#b64d4d}
    `;
    document.head.appendChild(style);
  }

  function ensureMeter() {
    meterCss();
    const root = $('viewTools') || document.querySelector('.admin-main');
    if (!root || $('pbB2Meter')) return;
    const card = document.createElement('div');
    card.id = 'pbB2Meter';
    card.className = 'pb-b2-meter';
    card.innerHTML = `
      <div class="pb-b2-meter-head"><strong>☁️ مساحة صور المنتجات</strong><span id="pbB2MeterValue">جاري الفحص...</span></div>
      <div class="pb-b2-meter-track"><div id="pbB2MeterFill" class="pb-b2-meter-fill"></div></div>
      <div class="pb-b2-meter-note"><span>تنبيه عند 8 GB</span><span>منع الرفع قبل 9 GB</span></div>`;
    root.insertAdjacentElement('afterbegin', card);
    refreshMeterSoon(50);
  }

  let meterTimer = 0;
  function refreshMeterSoon(delay = 400) {
    clearTimeout(meterTimer);
    meterTimer = setTimeout(refreshMeter, delay);
  }

  async function refreshMeter() {
    const card = $('pbB2Meter');
    const value = $('pbB2MeterValue');
    const fill = $('pbB2MeterFill');
    if (!card || !value || !fill) return;
    try {
      const data = await invoke('usage', {});
      const hard = Math.max(1, Number(data.hardStopBytes || 9 * GB));
      const current = Math.max(0, Number(data.currentBytes || 0));
      const percent = Math.min(100, current / hard * 100);
      fill.style.width = `${percent.toFixed(2)}%`;
      value.textContent = `${fmt(current)} / 9 GB • ${Number(data.fileCount || 0)} صورة`;
      card.dataset.state = data.blocked ? 'blocked' : data.warning ? 'warn' : 'ok';
    } catch (error) {
      value.textContent = String(error?.message || 'B2 قيد الإعداد').slice(0, 120);
      card.dataset.state = 'blocked';
    }
  }

  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      patchUploaders();
      ensureMeter();
      if (tries > 120) clearInterval(timer);
    }, 150);

    patchUploaders();
    ensureMeter();
    const observer = new MutationObserver(() => ensureMeter());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pageshow', () => refreshMeterSoon(100));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
