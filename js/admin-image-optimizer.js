(() => {
  if (window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V2__) return;
  window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V2__ = true;

  const MAX_EDGE = 1600;
  const WEBP_QUALITY = 0.82;
  const KEEP_SMALL_WEBP_UNDER = 420 * 1024;
  const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
  const MAX_UNOPTIMIZED_BYTES = 10 * 1024 * 1024;
  const MAX_OPTIMIZED_BYTES = 5 * 1024 * 1024;
  const PATH_REWRITE = new Map();

  function setProgressFor(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function setAnyUploadProgress(text) {
    setProgressFor('p_upload_progress', text);
    setProgressFor('np_upload_progress', text);
  }

  function isImage(file) {
    return !!file && file instanceof Blob && String(file.type || '').toLowerCase().startsWith('image/');
  }

  function isNonRasterOptimizable(file) {
    const type = String(file?.type || '').toLowerCase();
    return type === 'image/gif' || type === 'image/svg+xml';
  }

  function shouldSkip(file) {
    return !isImage(file) || isNonRasterOptimizable(file);
  }

  function baseName(name) {
    return String(name || 'product')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product';
  }

  function extensionFor(file) {
    const type = String(file?.type || '').toLowerCase();
    const mapped = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
      'image/heic': 'heic',
      'image/heif': 'heif'
    }[type];
    if (mapped) return mapped;
    const fromName = String(file?.name || '').match(/\.([a-z0-9]{2,6})$/i)?.[1];
    return fromName ? fromName.toLowerCase() : 'jpg';
  }

  function formatMb(bytes) {
    const value = Number(bytes || 0) / (1024 * 1024);
    return `${value.toFixed(value >= 10 ? 1 : 2)}MB`;
  }

  async function decodeImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      if (typeof img.decode === 'function') {
        await img.decode();
      } else {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      }
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function optimizeImage(file) {
    if (shouldSkip(file)) return file;

    try {
      const img = await decodeImage(file);
      const sourceWidth = Number(img.naturalWidth || img.width || 0);
      const sourceHeight = Number(img.naturalHeight || img.height || 0);
      if (!sourceWidth || !sourceHeight) return file;

      const maxSourceEdge = Math.max(sourceWidth, sourceHeight);
      if (
        String(file.type || '').toLowerCase() === 'image/webp' &&
        maxSourceEdge <= MAX_EDGE &&
        Number(file.size || 0) <= KEEP_SMALL_WEBP_UNDER
      ) {
        return file;
      }

      const scale = Math.min(1, MAX_EDGE / maxSourceEdge);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return file;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
      if (!blob || blob.type !== 'image/webp') return file;

      if (scale === 1 && blob.size >= file.size) return file;

      const optimized = new File(
        [blob],
        `${baseName(file.name)}.webp`,
        { type: 'image/webp', lastModified: Date.now() }
      );
      try { optimized.__pbOptimized = true; } catch (_) {}
      return optimized;
    } catch (error) {
      console.debug('Pasha Baby image optimizer fallback:', error?.message || error);
      return file;
    }
  }

  function getSupabaseClient() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  async function prepareImage(file, progressId) {
    if (!isImage(file)) throw new Error('الملف المختار ليس صورة.');
    if (file.size > MAX_SOURCE_BYTES) {
      throw new Error(`حجم الصورة الأصلية ${formatMb(file.size)}. الحد الأقصى قبل الضغط هو 30MB.`);
    }

    if (isNonRasterOptimizable(file)) {
      if (file.size > MAX_UNOPTIMIZED_BYTES) {
        throw new Error('ملفات GIF وSVG لا يتم ضغطها تلقائياً، والحد الأقصى لها 10MB.');
      }
      return file;
    }

    setProgressFor(progressId, `جاري تحسين وضغط الصورة ${formatMb(file.size)}...`);
    const optimized = await optimizeImage(file);

    if (optimized === file && file.size > MAX_UNOPTIMIZED_BYTES) {
      throw new Error('تعذر ضغط الصورة الكبيرة على هذا الجهاز. جرّب صورة أخرى أو حوّلها إلى JPG/WebP ثم أعد الرفع.');
    }

    if (optimized.size > MAX_OPTIMIZED_BYTES) {
      throw new Error(`الصورة بعد المعالجة ما زالت كبيرة (${formatMb(optimized.size)}). جرّب صورة أخرى.`);
    }

    return optimized;
  }

  async function uploadProductImage({ inputId, urlInputId, progressId, productId }) {
    const input = document.getElementById(inputId);
    const file = input?.files?.[0];
    if (!file) return String(document.getElementById(urlInputId)?.value || '').trim();

    const prepared = await prepareImage(file, progressId);
    const before = Math.max(1, Number(file.size || 0));
    const after = Number(prepared.size || 0);
    const saved = Math.max(0, Math.round((1 - after / before) * 100));

    const client = getSupabaseClient();
    if (!client?.storage) throw new Error('Supabase Storage غير متاح.');

    const ext = extensionFor(prepared);
    const safeProductId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `products/${safeProductId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    setProgressFor(
      progressId,
      prepared !== file
        ? `تم التحسين إلى ${formatMb(after)}${saved ? ` — توفير ${saved}%` : ''}. جاري الرفع...`
        : 'جاري رفع الصورة...'
    );

    try { prepared.__pbOptimized = true; } catch (_) {}

    const upload = await client.storage
      .from('menu-images')
      .upload(path, prepared, {
        cacheControl: '31536000',
        upsert: false,
        contentType: prepared.type || file.type
      });

    if (upload.error) throw upload.error;

    const result = client.storage.from('menu-images').getPublicUrl(path);
    const publicUrl = result?.data?.publicUrl;
    if (!publicUrl) throw new Error('تم رفع الصورة لكن تعذر إنشاء رابطها العام.');

    const urlInput = document.getElementById(urlInputId);
    if (urlInput) urlInput.value = publicUrl;

    setProgressFor(
      progressId,
      prepared !== file
        ? `تم رفع الصورة ✓ ${formatMb(before)} → ${formatMb(after)}${saved ? ` (${saved}% أقل)` : ''}`
        : 'تم رفع الصورة ✓'
    );

    return publicUrl;
  }

  function patchLegacyUploadFunctions() {
    let patched = false;

    if (typeof window.uploadAdminProductImage === 'function' && !window.uploadAdminProductImage.__pbOptimizedWrapper) {
      const editUploader = async productId => uploadProductImage({
        inputId: 'p_image_file',
        urlInputId: 'p_image_url',
        progressId: 'p_upload_progress',
        productId
      });
      editUploader.__pbOptimizedWrapper = true;
      window.uploadAdminProductImage = editUploader;
      patched = true;
    }

    if (typeof window.uploadNewProductImage === 'function' && !window.uploadNewProductImage.__pbOptimizedWrapper) {
      const newUploader = async productId => uploadProductImage({
        inputId: 'np_image_file',
        urlInputId: 'np_image_url',
        progressId: 'np_upload_progress',
        productId
      });
      newUploader.__pbOptimizedWrapper = true;
      window.uploadNewProductImage = newUploader;
      patched = true;
    }

    return patched;
  }

  function webpPath(path) {
    const clean = String(path || '');
    if (!clean) return clean;
    if (/\.webp$/i.test(clean)) return clean;
    if (/\.[a-z0-9]+$/i.test(clean)) return clean.replace(/\.[a-z0-9]+$/i, '.webp');
    return `${clean}.webp`;
  }

  // Fallback protection for any future product uploader that writes directly to Storage.
  function patchStorage() {
    const storage = getSupabaseClient()?.storage;
    if (!storage || typeof storage.from !== 'function') return false;
    if (storage.__pbImageOptimizerPatched) return true;

    const originalFrom = storage.from.bind(storage);

    storage.from = function patchedFrom(bucketName) {
      const bucket = originalFrom(bucketName);
      if (String(bucketName) !== 'menu-images' || !bucket) return bucket;

      return new Proxy(bucket, {
        get(target, prop, receiver) {
          if (prop === 'upload') {
            return async (path, body, options = {}) => {
              const originalPath = String(path || '');
              const isProductImage = /^products\//i.test(originalPath);

              if (!isProductImage || shouldSkip(body) || body?.__pbOptimized) {
                return target.upload(originalPath, body, options);
              }

              setAnyUploadProgress('جاري تحسين وضغط الصورة...');
              const optimized = await optimizeImage(body);
              const converted = optimized !== body && optimized.type === 'image/webp';
              const uploadPath = converted ? webpPath(originalPath) : originalPath;

              const nextOptions = {
                ...options,
                contentType: optimized.type || options.contentType || body.type,
                cacheControl: '31536000'
              };

              const result = await target.upload(uploadPath, optimized, nextOptions);
              if (!result?.error && converted && uploadPath !== originalPath) {
                PATH_REWRITE.set(originalPath, uploadPath);
              }
              return result;
            };
          }

          if (prop === 'getPublicUrl') {
            return (path, options) => {
              const mapped = PATH_REWRITE.get(String(path || '')) || path;
              return target.getPublicUrl(mapped, options);
            };
          }

          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    };

    storage.__pbImageOptimizerPatched = true;
    return true;
  }

  function sanitizeSocialUrlInputs() {
    const ids = [
      'rs_instagram_url',
      'rs_facebook_url',
      'rs_tiktok_url',
      'rs_snapchat_url'
    ];

    ids.forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      const raw = String(input.value || '').trim();
      const match = raw.match(/https?:\/\/[^\s]+/i);
      if (match && match[0] !== raw) input.value = match[0];
    });
  }

  document.addEventListener('blur', event => {
    if (event.target?.matches?.('#rs_instagram_url,#rs_facebook_url,#rs_tiktok_url,#rs_snapchat_url')) {
      sanitizeSocialUrlInputs();
    }
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest?.('#saveRestaurantSettingsBtn')) {
      sanitizeSocialUrlInputs();
    }
  }, true);

  function install() {
    patchStorage();
    patchLegacyUploadFunctions();
  }

  function start() {
    install();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      install();
      if (
        tries >= 100 ||
        (
          window.uploadAdminProductImage?.__pbOptimizedWrapper &&
          window.uploadNewProductImage?.__pbOptimizedWrapper
        )
      ) {
        clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();