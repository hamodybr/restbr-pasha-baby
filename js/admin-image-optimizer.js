(() => {
  if (window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V1__) return;
  window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V1__ = true;

  const MAX_EDGE = 1600;
  const WEBP_QUALITY = 0.82;
  const KEEP_SMALL_WEBP_UNDER = 420 * 1024;
  const PATH_REWRITE = new Map();

  function setProgress(text) {
    const el = document.getElementById('p_upload_progress');
    if (el) el.textContent = text || '';
  }

  function shouldSkip(file) {
    if (!file || !(file instanceof Blob)) return true;
    const type = String(file.type || '').toLowerCase();
    if (!type.startsWith('image/')) return true;
    if (type === 'image/gif' || type === 'image/svg+xml') return true;
    return false;
  }

  function baseName(name) {
    return String(name || 'product')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product';
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
      // Revoke later after the image is drawn; callers hold the decoded pixels.
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

      // If no resizing happened and WebP is not smaller, keep the original.
      if (scale === 1 && blob.size >= file.size) return file;

      const optimized = new File(
        [blob],
        `${baseName(file.name)}.webp`,
        { type: 'image/webp', lastModified: Date.now() }
      );

      return optimized;
    } catch (error) {
      console.debug('Pasha Baby image optimizer fallback:', error?.message || error);
      return file;
    }
  }

  function webpPath(path) {
    const clean = String(path || '');
    if (!clean) return clean;
    if (/\.webp$/i.test(clean)) return clean;
    if (/\.[a-z0-9]+$/i.test(clean)) return clean.replace(/\.[a-z0-9]+$/i, '.webp');
    return `${clean}.webp`;
  }

  function patchStorage() {
    const storage = window.supabaseClient?.storage;
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

              if (!isProductImage || shouldSkip(body)) {
                return target.upload(originalPath, body, options);
              }

              setProgress('جاري تحسين وضغط الصورة...');
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
                const before = Math.max(1, Number(body.size || 0));
                const after = Number(optimized.size || 0);
                const saved = Math.max(0, Math.round((1 - after / before) * 100));
                setProgress(`تم ضغط الصورة ${saved ? `— توفير ${saved}%` : ''}`.trim());
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

  function start() {
    if (patchStorage()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (patchStorage() || tries >= 80) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
