(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_ADMIN_IMAGE_PIPELINE_V1__) return;
  window.__PASHA_ADMIN_IMAGE_PIPELINE_V1__ = true;

  const KB = 1024;
  const MB = KB * KB;
  const SOURCE_LIMIT = 30 * MB;
  const DEFAULT_TARGET = 620 * KB;
  const DEFAULT_MAX = 700 * KB;

  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

  const formatBytes = bytes => {
    const n = Math.max(0, Number(bytes || 0));
    if (n >= MB) return `${(n / MB).toFixed(n >= 10 * MB ? 1 : 2)} MB`;
    return `${Math.round(n / KB)} KB`;
  };

  const baseName = name => String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';

  function isImage(file) {
    return file instanceof Blob && String(file.type || '').toLowerCase().startsWith('image/');
  }

  function isPassthrough(file) {
    return /image\/(?:gif|svg\+xml)/i.test(String(file?.type || ''));
  }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { source: bitmap, close: () => bitmap.close?.() };
      } catch (_) {
        try {
          const bitmap = await createImageBitmap(file);
          return { source: bitmap, close: () => bitmap.close?.() };
        } catch (_) {}
      }
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    try {
      if (typeof image.decode === 'function') await image.decode();
      else await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('تعذر قراءة الصورة على هذا الجهاز.'));
      });
      return { source: image, close: () => URL.revokeObjectURL(url) };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر ضغط الصورة.')), type, quality);
      } catch (error) {
        reject(error);
      }
    });
  }

  function attemptsFor(profile) {
    if (profile === 'color') {
      return [
        [1080, 0.72],
        [760, 0.56],
        [560, 0.48]
      ];
    }

    return [
      [1280, 0.74],
      [860, 0.58],
      [620, 0.50]
    ];
  }

  async function prepare(file, options = {}) {
    if (!isImage(file)) throw new Error('الملف المختار ليس صورة.');
    if (file.size > SOURCE_LIMIT) throw new Error('الحد الأقصى للصورة الأصلية قبل الضغط هو 30MB.');

    const profile = options.profile === 'color' ? 'color' : 'product';
    const targetBytes = Math.max(64 * KB, Number(options.targetBytes || DEFAULT_TARGET));
    const maxBytes = Math.max(targetBytes, Number(options.maxBytes || DEFAULT_MAX));
    const progress = typeof options.onProgress === 'function' ? options.onProgress : () => {};

    if (isPassthrough(file)) {
      if (file.size > maxBytes) throw new Error(`GIF/SVG يجب أن يكون أقل من ${formatBytes(maxBytes)}.`);
      return file;
    }

    // Small files are already cheap to upload. Avoid decoding/re-encoding them.
    if (file.size <= targetBytes) return file;

    progress(`جاري تجهيز الصورة... ${formatBytes(file.size)}`);
    await nextPaint();

    const decoded = await decode(file);
    const source = decoded.source;
    const sourceWidth = Number(source.width || source.naturalWidth || 0);
    const sourceHeight = Number(source.height || source.naturalHeight || 0);
    if (!sourceWidth || !sourceHeight) {
      decoded.close?.();
      throw new Error('تعذر معرفة أبعاد الصورة.');
    }

    const canvas = document.createElement('canvas');
    let best = null;

    try {
      for (const [edge, quality] of attemptsFor(profile)) {
        const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('تعذر تشغيل معالج الصور.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(source, 0, 0, width, height);

        const blob = await canvasToBlob(canvas, 'image/webp', quality);
        const candidate = new File(
          [blob],
          `${baseName(file.name)}.webp`,
          { type: 'image/webp', lastModified: Date.now() }
        );

        if (!best || candidate.size < best.size) best = candidate;
        progress(`جاري تحسين الصورة... ${formatBytes(candidate.size)}`);
        if (candidate.size <= targetBytes) return candidate;
        await nextPaint();
      }

      if (best?.size <= maxBytes) return best;
      throw new Error(`الصورة بقيت كبيرة بعد المعالجة (${formatBytes(best?.size || 0)}). جرّب صورة أخرى.`);
    } finally {
      // Release the large backing store immediately on iPhone/Safari.
      canvas.width = 1;
      canvas.height = 1;
      try { decoded.close?.(); } catch (_) {}
    }
  }

  window.PASHA_ADMIN_IMAGE_PIPELINE = Object.freeze({
    prepare,
    formatBytes,
    targetBytes: DEFAULT_TARGET,
    maxBytes: DEFAULT_MAX,
    sourceLimit: SOURCE_LIMIT
  });
})();