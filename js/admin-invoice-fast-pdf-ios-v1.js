(() => {
  if (window.PashaFastSinglePagePdf) return;

  const emitStage = stage => {
    try { window.__PASHA_INVOICE_PDF_STAGE__?.(stage); } catch (_) {}
  };

  const ascii = value => new TextEncoder().encode(String(value));
  const mmToPt = value => Number(value || 0) * 72 / 25.4;

  function pageMetrics(format, orientation) {
    const name = Array.isArray(format) ? 'custom' : String(format || 'a4').toLowerCase();
    let width = 210;
    let height = 297;
    if (name === 'a5') { width = 148; height = 210; }
    else if (name === 'letter') { width = 215.9; height = 279.4; }
    else if (Array.isArray(format) && format.length >= 2) {
      width = Number(format[0]) || 210;
      height = Number(format[1]) || 297;
    }
    if (String(orientation || 'portrait').toLowerCase().startsWith('l')) [width, height] = [height, width];
    return { width, height };
  }

  function jpegBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (typeof data === 'string' && /^data:image\/jpe?g;base64,/i.test(data)) {
      const binary = atob(data.slice(data.indexOf(',') + 1));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 255;
      return bytes;
    }
    throw new Error('صيغة صورة الفاتورة غير مدعومة في مسار iPhone السريع.');
  }

  function jpegDimensions(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 10 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      throw new Error('صورة JPEG الناتجة للفاتورة غير صالحة.');
    }
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xFF) { offset += 1; continue; }
      while (offset < bytes.length && bytes[offset] === 0xFF) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xD9 || marker === 0xDA) break;
      if (offset + 1 >= bytes.length) break;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) break;
      const sof = (marker >= 0xC0 && marker <= 0xC3) ||
        (marker >= 0xC5 && marker <= 0xC7) ||
        (marker >= 0xC9 && marker <= 0xCB) ||
        (marker >= 0xCD && marker <= 0xCF);
      if (sof && length >= 7) {
        const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
        const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
        if (width > 0 && height > 0) return { width, height };
      }
      offset += length;
    }
    throw new Error('تعذر قراءة أبعاد صورة الفاتورة.');
  }

  class PashaFastSinglePagePdf {
    constructor(options = {}) {
      this.page = pageMetrics(options.format, options.orientation);
      this.image = null;
    }

    addImage(data, format, x, y, width, height) {
      if (!/^jpe?g$/i.test(String(format || ''))) {
        throw new Error('مسار iPhone السريع يتوقع JPEG فقط.');
      }
      const bytes = jpegBytes(data);
      const dimensions = jpegDimensions(bytes);
      this.image = {
        bytes,
        pixelWidth: dimensions.width,
        pixelHeight: dimensions.height,
        x: Number(x || 0),
        y: Number(y || 0),
        width: Number(width || 0),
        height: Number(height || 0)
      };
      emitStage('pack');
      return this;
    }

    output(type) {
      if (type !== 'blob') throw new Error('مسار iPhone السريع يدعم إخراج Blob فقط.');
      if (!this.image) throw new Error('لم يتم تجهيز صورة الفاتورة داخل PDF.');
      emitStage('pdf');

      const image = this.image;
      const pageWidthPt = mmToPt(this.page.width);
      const pageHeightPt = mmToPt(this.page.height);
      const xPt = mmToPt(image.x);
      const widthPt = mmToPt(image.width);
      const heightPt = mmToPt(image.height);
      const yPt = pageHeightPt - mmToPt(image.y + image.height);
      const content = `q\n${widthPt.toFixed(3)} 0 0 ${heightPt.toFixed(3)} ${xPt.toFixed(3)} ${yPt.toFixed(3)} cm\n/Im0 Do\nQ\n`;

      const chunks = [];
      const offsets = new Array(6).fill(0);
      let length = 0;
      const push = chunk => {
        const bytes = typeof chunk === 'string' ? ascii(chunk) : chunk;
        chunks.push(bytes);
        length += bytes.byteLength;
      };
      const beginObject = id => {
        offsets[id] = length;
        push(`${id} 0 obj\n`);
      };

      push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
      beginObject(1);
      push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
      beginObject(2);
      push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
      beginObject(3);
      push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(3)} ${pageHeightPt.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
      beginObject(4);
      push(`<< /Type /XObject /Subtype /Image /Width ${image.pixelWidth} /Height ${image.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.byteLength} >>\nstream\n`);
      push(image.bytes);
      push('\nendstream\nendobj\n');
      beginObject(5);
      const contentBytes = ascii(content);
      push(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
      push(contentBytes);
      push('endstream\nendobj\n');

      const xrefOffset = length;
      push('xref\n0 6\n0000000000 65535 f \n');
      for (let id = 1; id <= 5; id += 1) {
        push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
      }
      push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
      return new Blob(chunks, { type: 'application/pdf' });
    }
  }

  window.PashaFastSinglePagePdf = PashaFastSinglePagePdf;
  window.PashaFastSinglePagePdfInfo = Object.freeze({
    mode: 'direct-jpeg-one-page-pdf-v1',
    pageCount: 1
  });
})();
