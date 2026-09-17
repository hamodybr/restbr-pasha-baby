(() => {
  if (window.__PASHA_B2_STORAGE_V2__) return;
  window.__PASHA_B2_STORAGE_V2__ = true;
  // Also block an old cached copy from booting a second compression pipeline.
  window.__PASHA_B2_STORAGE_V1__ = true;

  const TARGET_BYTES = 620 * 1024;
  const SERVER_MAX_BYTES = 700 * 1024;
  const FUNCTION_NAME = 'b2-images';
  const GB = 1024 * 1024 * 1024;
  const previewUrls = new Map();

  const $ = id => document.getElementById(id);

  function client() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function pipeline() {
    return window.PASHA_ADMIN_IMAGE_PIPELINE || null;
  }

  function setProgress(id, text) {
    const el = $(id);
    if (el) el.textContent = text || '';
  }

  function fmt(bytes) {
    const helper = pipeline()?.formatBytes;
    if (typeof helper === 'function') return helper(bytes);
    const n = Math.max(0, Number(bytes || 0));
    if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${Math.round(n / 1024)} KB`;
  }

  async function prepareForB2(file, progressId) {
    const helper = pipeline();
    if (!helper?.prepare) {
      if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) {
        throw new Error('الملف المختار ليس صورة.');
      }
      if (file.size > SERVER_MAX_BYTES) {
        throw new Error('معالج الصور غير جاهز. اعمل Refresh للوحة وحاول مرة ثانية.');
      }
      return file;
    }

    return helper.prepare(file, {
      profile: 'product',
      targetBytes: TARGET_BYTES,
      maxBytes: SERVER_MAX_BYTES,
      onProgress: text => setProgress(progressId, text)
    });
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
    setProgress(
      progressId,
      prepared === original
        ? `الصورة جاهزة. جاري الرفع... ${fmt(prepared.size)}`
        : `تم تجهيز الصورة ${fmt(original.size)} → ${fmt(prepared.size)}. جاري الرفع...`
    );

    const form = new FormData();
    form.append('productId', String(productId || ''));
    form.append('file', prepared, prepared.name || original.name || 'product.webp');

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

  function setLocalPreview(file, nameId, previewId, slot) {
    if (!file) return;
    const name = $(nameId);
    const preview = $(previewId);
    if (name) name.textContent = file.name || '';
    if (!preview) return;

    const previous = previewUrls.get(slot);
    if (previous) URL.revokeObjectURL(previous);
    const url = URL.createObjectURL(file);
    previewUrls.set(slot, url);
    preview.src = url;
  }

  function patchPreviewFunctions() {
    window.previewAdminImage = input => {
      const file = input?.files?.[0];
      if (file) setLocalPreview(file, 'p_image_file_name', 'p_image_preview', 'edit-product');
    };

    window.previewNewProductImage = input => {
      const file = input?.files?.[0];
      if (file) setLocalPreview(file, 'np_image_file_name', 'np_image_preview', 'new-product');
    };

    window.previewRestaurantLogo = input => {
      const file = input?.files?.[0];
      if (file) setLocalPreview(file, '', 'rs_logo_preview', 'restaurant-logo');
    };
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
    if (!root) return false;
    if ($('pbB2Meter')) return true;
    const card = document.createElement('div');
    card.id = 'pbB2Meter';
    card.className = 'pb-b2-meter';
    card.innerHTML = `
      <div class="pb-b2-meter-head"><strong>☁️ مساحة صور المنتجات</strong><span id="pbB2MeterValue">جاري الفحص...</span></div>
      <div class="pb-b2-meter-track"><div id="pbB2MeterFill" class="pb-b2-meter-fill"></div></div>
      <div class="pb-b2-meter-note"><span>تنبيه عند 8 GB</span><span>منع الرفع قبل 9 GB</span></div>`;
    root.insertAdjacentElement('afterbegin', card);
    refreshMeterSoon(50);
    return true;
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

  function cleanupPreviewUrls() {
    previewUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
    previewUrls.clear();
  }

  function boot() {
    patchUploaders();
    patchPreviewFunctions();
    ensureMeter();

    // The old build repatched the page every 150ms for ~18 seconds. Admin
    // loads this file after unlock now, so one bounded retry is enough.
    if (!document.getElementById('viewTools')) {
      requestAnimationFrame(ensureMeter);
    }

    window.addEventListener('pageshow', () => refreshMeterSoon(100), { passive: true });
    window.addEventListener('pagehide', cleanupPreviewUrls, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();