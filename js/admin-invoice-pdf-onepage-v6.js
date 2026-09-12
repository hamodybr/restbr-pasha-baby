(() => {
  const RENDER_MODE = 'native-canvas-one-page-v6';
  if (window.PashaInvoiceOnePagePdf?.renderMode === RENDER_MODE) return;

  const PX_PER_MM = 96 / 25.4;
  const PT_TO_PX = 96 / 72;
  const CUSTOM_FAMILY_NAME = 'Pasha Invoice Raster V6';
  const CUSTOM_STACK = `"${CUSTOM_FAMILY_NAME}",Tahoma,Arial,sans-serif`;
  const FONT_STACKS = {
    modern_pro: '"Modern Pro Bold","Modern Pro","DIN Next Arabic","Geeza Pro",Tahoma,Arial,sans-serif',
    din: '"DIN Next Arabic","DIN Arabic",Tahoma,Arial,sans-serif',
    segoe: '"Segoe UI Variable Text","Segoe UI",Tahoma,Arial,sans-serif',
    tahoma: 'Tahoma,"Segoe UI",Arial,sans-serif',
    arial: 'Arial,Tahoma,sans-serif',
    kufi: '"Noto Kufi Arabic",Tahoma,Arial,sans-serif'
  };

  let cachedCustomFontFace = null;
  let cachedCustomFontSignature = '';
  let cachedLogoDataUrl = '';
  let cachedLogoImage = null;

  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const mm = value => Number(value || 0) * PX_PER_MM;
  const pt = value => Number(value || 0) * PT_TO_PX;
  const timeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
  const isIOS = () => /iPad|iPhone|iPod/i.test(navigator.userAgent || '') ||
    ((navigator.platform || '') === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);

  function pageMetrics(cfg) {
    const size = String(cfg.page_size || 'A4').toUpperCase();
    let width = 210;
    let height = 297;
    if (size === 'A5') { width = 148; height = 210; }
    if (size === 'LETTER') { width = 215.9; height = 279.4; }
    const landscape = String(cfg.page_orientation || 'portrait').toLowerCase() === 'landscape';
    if (landscape) [width, height] = [height, width];
    const margin = Math.max(0, num(cfg.page_margin_mm, 6));
    return {
      width,
      height,
      margin,
      contentWidth: Math.max(30, width - margin * 2),
      contentHeight: Math.max(30, height - margin * 2),
      orientation: landscape ? 'landscape' : 'portrait',
      format: size === 'LETTER' ? 'letter' : size.toLowerCase()
    };
  }

  function fontSignature(buffer, weight) {
    if (!(buffer instanceof ArrayBuffer)) return '';
    const bytes = new Uint8Array(buffer);
    const sample = [];
    const take = index => {
      if (index >= 0 && index < bytes.length) sample.push(bytes[index].toString(16).padStart(2, '0'));
    };
    for (let i = 0; i < Math.min(12, bytes.length); i += 1) take(i);
    for (let i = Math.max(12, bytes.length - 12); i < bytes.length; i += 1) take(i);
    return `${weight}:${bytes.length}:${sample.join('')}`;
  }

  async function prepareFont(fontBuffer, cfg) {
    const weight = String(Math.max(100, Math.min(900, num(cfg.font_weight, 900))));
    const custom = String(cfg.font_family || '') === 'custom';
    if (!custom) {
      return {
        family: FONT_STACKS[cfg.font_family] || FONT_STACKS.modern_pro,
        weight,
        custom: false
      };
    }

    if (!(fontBuffer instanceof ArrayBuffer) || fontBuffer.byteLength < 100) {
      throw new Error('ملف الخط المرفوع غير موجود. ارفع الخط واحفظ الإعدادات ثم حاول مرة أخرى.');
    }
    if (typeof FontFace !== 'function' || !document.fonts) {
      throw new Error('هذا الجهاز لا يدعم تحميل الخط داخل محرك PDF.');
    }

    const signature = fontSignature(fontBuffer, weight);
    const probe = `${weight} 18px "${CUSTOM_FAMILY_NAME}"`;
    const sampleText = 'باشا بيبي تفاصيل الطلب محمد Mustafa 123';
    if (cachedCustomFontSignature === signature && document.fonts.check(probe, sampleText)) {
      return { family: CUSTOM_STACK, weight, custom: true };
    }

    try {
      if (cachedCustomFontFace) {
        try { document.fonts.delete(cachedCustomFontFace); } catch (_) {}
        cachedCustomFontFace = null;
        cachedCustomFontSignature = '';
      }

      const face = new FontFace(CUSTOM_FAMILY_NAME, fontBuffer.slice(0), {
        style: 'normal',
        weight,
        display: 'block'
      });
      const loaded = await timeout(face.load(), 8000, 'انتهت مهلة تحميل الخط المرفوع.');
      document.fonts.add(loaded);
      await timeout(document.fonts.load(probe, sampleText), 4000, 'انتهت مهلة تفعيل الخط المرفوع.');
      if (!document.fonts.check(probe, sampleText)) {
        throw new Error('فشل التحقق من الخط بعد تحميله.');
      }
      cachedCustomFontFace = loaded;
      cachedCustomFontSignature = signature;
    } catch (error) {
      throw new Error(`تعذر تثبيت الخط المرفوع داخل PDF: ${error?.message || error}`);
    }

    return { family: CUSTOM_STACK, weight, custom: true };
  }

  async function loadImage(dataUrl) {
    if (!dataUrl) return null;
    if (cachedLogoImage && cachedLogoDataUrl === dataUrl) return cachedLogoImage;
    const image = new Image();
    await timeout(new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('تعذر تجهيز شعار الفاتورة.'));
      image.src = dataUrl;
    }), 6000, 'انتهت مهلة تجهيز شعار الفاتورة.');
    cachedLogoDataUrl = dataUrl;
    cachedLogoImage = image;
    return image;
  }

  function setFont(ctx, sizePt, font) {
    ctx.font = `${font.weight} ${pt(sizePt)}px ${font.family}`;
  }

  function wrapText(ctx, value, maxWidth) {
    const text = clean(value);
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(test).width <= maxWidth) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawWrappedRtl(ctx, value, xRight, y, maxWidth, lineHeight) {
    const lines = wrapText(ctx, value, maxWidth);
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    lines.forEach((line, index) => ctx.fillText(line, xRight, y + index * lineHeight));
    return Math.max(1, lines.length) * lineHeight;
  }

  function drawLeader(ctx, x1, x2, y, cfg) {
    if (x2 <= x1) return;
    ctx.save();
    ctx.lineWidth = Math.max(1, pt(num(cfg.leader_width_pt, 1.5)));
    const style = String(cfg.leader_style || 'dotted');
    if (style === 'dashed') ctx.setLineDash([6, 5]);
    else if (style === 'solid') ctx.setLineDash([]);
    else ctx.setLineDash([2, 3.2]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  const digits = (options, value) => typeof options.englishDigits === 'function'
    ? String(options.englishDigits(value))
    : String(value ?? '');
  const displayMoney = (options, value) => typeof options.money === 'function'
    ? String(options.money(value))
    : `${Number(value || 0).toLocaleString('en-US')} د.ع`;
  const displayWhen = (options, value) => typeof options.when === 'function'
    ? String(options.when(value))
    : String(value || '');
  const optionText = (options, item) => typeof options.itemOptionText === 'function'
    ? clean(options.itemOptionText(item))
    : clean(item?.option_name);

  function measureLayout(options, ctx, font) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const pad = mm(num(cfg.outer_padding_mm, 8));
    const innerWidth = mm(metrics.contentWidth) - pad * 2;
    const factor = num(cfg.line_height, 1.25);
    let height = pad;

    if (cfg.show_logo) height += mm(num(cfg.logo_size_mm, 27)) + mm(3);
    if (cfg.show_brand_title) height += pt(num(cfg.title_size_pt, 25)) * 1.25;
    if (cfg.show_brand_subtitle) height += pt(num(cfg.subtitle_size_pt, 8)) * 1.7;
    height += mm(8.5);
    if (cfg.show_order_number || cfg.show_date_time) height += pt(num(cfg.meta_size_pt, 8)) * 1.9;
    height += mm(5);

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);
    const customerH = pt(num(cfg.customer_size_pt, 10.5)) * factor * 1.3;
    height += customerH;
    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font);
      const addressH = pt(num(cfg.address_size_pt, 9.5)) * factor * 1.18;
      height += Math.max(addressH, wrapText(ctx, `العنوان: ${order.address}`, innerWidth).length * addressH);
    }
    height += mm(6);

    if (cfg.show_details_title) height += pt(num(cfg.details_size_pt, 17)) * 1.8;

    const priceWidth = mm(32);
    const productWidth = Math.max(mm(45), innerWidth - priceWidth - mm(18));
    for (const item of items) {
      const itemSize = num(cfg.item_size_pt, 12);
      const optionSize = num(cfg.option_size_pt, 9.5);
      setFont(ctx, itemSize, font);
      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`;
      const productLines = Math.max(1, wrapText(ctx, product, productWidth).length);
      let row = productLines * pt(itemSize) * factor * 1.18;
      const option = cfg.show_options ? optionText(options, item) : '';
      if (option) {
        setFont(ctx, optionSize, font);
        row += Math.max(1, wrapText(ctx, digits(options, option), productWidth).length) * pt(optionSize) * factor * 1.1;
      }
      height += Math.max(mm(num(cfg.row_min_height_mm, 7)), row + mm(num(cfg.row_padding_mm, 1)) * 2) + mm(num(cfg.row_padding_mm, 1));
    }

    if (Number(fee || 0) > 0) height += mm(Math.max(7, num(cfg.row_min_height_mm, 7))) + mm(num(cfg.row_padding_mm, 1));
    if (cfg.show_notes && clean(notes)) {
      const noteSize = num(cfg.notes_size_pt, 9.5);
      setFont(ctx, noteSize, font);
      const noteH = pt(noteSize) * factor * 1.18;
      height += mm(5) + Math.max(1, wrapText(ctx, `ملاحظة: ${notes}`, innerWidth).length) * noteH;
    }

    height += mm(5) + pt(num(cfg.total_size_pt, 16)) * (Number(fee || 0) > 0 && cfg.show_subtotal ? 3.1 : 2.2);
    if (cfg.show_footer) height += mm(num(cfg.footer_spacing_mm, 2.5) + 4) + pt(num(cfg.footer_size_pt, 15)) * 1.7;
    height += pad;
    return Math.max(height, mm(80));
  }

  function renderInvoiceCanvas(options, font, logoImage) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const probeCanvas = document.createElement('canvas');
    const probe = probeCanvas.getContext('2d');
    if (!probe) throw new Error('تعذر قياس الفاتورة على هذا الجهاز.');

    const cssWidth = Math.max(1, Math.ceil(mm(metrics.contentWidth)));
    const cssHeight = Math.max(1, Math.ceil(measureLayout(options, probe, font)));

    // Render only the pixels that can actually survive the final one-page fit.
    // The old V5 rendered a long invoice at 2x first and only then shrank it to A4,
    // which could create a very large PNG on iPhone and hit the 25-second timeout.
    const fitFactor = Math.min(1, mm(metrics.contentHeight) / cssHeight);
    const desiredScale = Math.max(0.55, 2 * fitFactor);
    const maxPixels = isIOS() ? 6_500_000 : 12_000_000;
    const maxDimension = isIOS() ? 4096 : 6144;
    const pixelScale = Math.sqrt(maxPixels / Math.max(1, cssWidth * cssHeight));
    const dimensionScale = maxDimension / Math.max(cssWidth, cssHeight);
    const renderScale = Math.max(0.5, Math.min(desiredScale, pixelScale, dimensionScale, 2));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(cssWidth * renderScale));
    canvas.height = Math.max(1, Math.ceil(cssHeight * renderScale));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('تعذر تشغيل Canvas على هذا الجهاز.');
    ctx.scale(renderScale, renderScale);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.textBaseline = 'alphabetic';

    const pad = mm(num(cfg.outer_padding_mm, 8));
    const right = cssWidth - pad;
    const left = pad;
    const innerWidth = right - left;
    const factor = num(cfg.line_height, 1.25);
    const frame = Math.max(1, pt(num(cfg.frame_width_pt, 3)));

    ctx.lineWidth = frame;
    ctx.strokeRect(frame / 2, frame / 2, cssWidth - frame, cssHeight - frame);
    ctx.lineWidth = Math.max(1, frame * 0.45);
    ctx.strokeRect(frame * 1.5, frame * 1.5, cssWidth - frame * 3, cssHeight - frame * 3);

    let y = pad;
    const logoSize = mm(num(cfg.logo_size_mm, 27));
    if (cfg.show_logo) {
      if (logoImage) {
        ctx.drawImage(logoImage, (cssWidth - logoSize) / 2, y, logoSize, logoSize);
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.arc(cssWidth / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.direction = 'ltr';
        ctx.font = `900 ${pt(12)}px Georgia,serif`;
        ctx.fillText('PASHA BABY', cssWidth / 2, y + logoSize * 0.54);
        ctx.restore();
      }
      y += logoSize + mm(3);
    }

    if (cfg.show_brand_title) {
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `900 ${pt(num(cfg.title_size_pt, 25))}px Georgia,"Times New Roman",serif`;
      ctx.fillText(digits(options, cfg.brand_title || 'PASHA BABY'), cssWidth / 2, y + pt(num(cfg.title_size_pt, 25)));
      y += pt(num(cfg.title_size_pt, 25)) * 1.25;
    }
    if (cfg.show_brand_subtitle) {
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `900 ${pt(num(cfg.subtitle_size_pt, 8))}px Georgia,"Times New Roman",serif`;
      ctx.fillText(digits(options, cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE'), cssWidth / 2, y + pt(num(cfg.subtitle_size_pt, 8)));
      y += pt(num(cfg.subtitle_size_pt, 8)) * 1.7;
    }

    y += mm(2.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(cssWidth / 2 - mm(5), y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cssWidth / 2 + mm(5), y); ctx.lineTo(right, y); ctx.stroke();
    ctx.save(); ctx.translate(cssWidth / 2, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-mm(1.5), -mm(1.5), mm(3), mm(3)); ctx.restore();
    y += mm(6);

    if (cfg.show_order_number || cfg.show_date_time) {
      setFont(ctx, num(cfg.meta_size_pt, 8), font);
      if (cfg.show_order_number) {
        ctx.textAlign = 'left'; ctx.direction = 'ltr';
        ctx.fillText(digits(options, order.order_number || ''), left, y);
      }
      if (cfg.show_date_time) {
        ctx.textAlign = 'right'; ctx.direction = 'rtl';
        ctx.fillText(digits(options, displayWhen(options, order.created_at)), right, y);
      }
      y += pt(num(cfg.meta_size_pt, 8)) * 1.8;
    }

    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += mm(4);

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);
    const customerBase = y + pt(num(cfg.customer_size_pt, 10.5));
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText(digits(options, order.customer_name || 'زبون'), right, customerBase);
    const leftParts = [];
    if (cfg.show_customer_phone && order.customer_phone) leftParts.push(digits(options, order.customer_phone));
    if (cfg.show_order_type) leftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (leftParts.length) {
      ctx.textAlign = 'left'; ctx.direction = 'rtl';
      ctx.fillText(leftParts.join(' · '), left, customerBase);
    }
    y = customerBase + mm(2.5);

    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font);
      const lineH = pt(num(cfg.address_size_pt, 9.5)) * factor * 1.18;
      y += drawWrappedRtl(ctx, `العنوان: ${digits(options, order.address)}`, right, y + pt(num(cfg.address_size_pt, 9.5)), innerWidth, lineH);
    }
    y += mm(2);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += mm(4);

    if (cfg.show_details_title) {
      setFont(ctx, num(cfg.details_size_pt, 17), font);
      ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.fillText(digits(options, cfg.details_title || 'تفاصيل الطلب'), cssWidth / 2, y + pt(num(cfg.details_size_pt, 17)));
      y += pt(num(cfg.details_size_pt, 17)) * 1.7;
    }

    const itemSize = num(cfg.item_size_pt, 12);
    const optionSize = num(cfg.option_size_pt, 9.5);
    const priceSize = num(cfg.price_size_pt, 12);
    const priceWidth = mm(32);
    const bulletWidth = mm(5);
    const productRight = right - bulletWidth;
    const priceRightEdge = left + priceWidth;
    const productWidth = Math.max(mm(45), innerWidth - priceWidth - mm(18));

    const drawRow = (product, option, price, delivery = false) => {
      const rowTop = y;
      setFont(ctx, itemSize, font);
      const productLineH = pt(itemSize) * factor * 1.18;
      const productLines = wrapText(ctx, digits(options, product), productWidth);
      let rowHeight = Math.max(mm(num(cfg.row_min_height_mm, 7)), Math.max(1, productLines.length) * productLineH + mm(2));
      let optionLines = [];
      if (option) {
        setFont(ctx, optionSize, font);
        optionLines = wrapText(ctx, digits(options, option), productWidth);
        rowHeight += Math.max(1, optionLines.length) * pt(optionSize) * factor * 1.08;
      }
      const baseline = rowTop + pt(itemSize) + mm(1);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      ctx.fillText('◆', right, baseline);
      setFont(ctx, itemSize, font);
      productLines.forEach((line, index) => ctx.fillText(line, productRight, baseline + index * productLineH));
      const textBottom = baseline + Math.max(0, productLines.length - 1) * productLineH;
      if (optionLines.length) {
        setFont(ctx, optionSize, font);
        const optLineH = pt(optionSize) * factor * 1.08;
        optionLines.forEach((line, index) => ctx.fillText(line, productRight, textBottom + optLineH * (index + 1)));
      }
      setFont(ctx, priceSize, font);
      ctx.textAlign = 'left'; ctx.direction = 'ltr';
      ctx.fillText(digits(options, price), left, baseline);
      drawLeader(ctx, priceRightEdge + mm(5), Math.max(priceRightEdge + mm(7), productRight - productWidth - mm(3)), baseline - mm(1), cfg);
      y = rowTop + rowHeight + (delivery ? 0 : mm(num(cfg.row_padding_mm, 1)));
    };

    for (const item of items) {
      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${item.product_name || ''}`;
      drawRow(product, cfg.show_options ? optionText(options, item) : '', displayMoney(options, item.line_total));
    }
    if (Number(fee || 0) > 0) {
      drawRow(`${cfg.show_quantity ? '1× ' : ''}التوصيل`, cfg.show_options ? 'خدمة التوصيل' : '', displayMoney(options, fee), true);
    }

    if (cfg.show_notes && clean(notes)) {
      y += mm(2);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      y += mm(3);
      setFont(ctx, num(cfg.notes_size_pt, 9.5), font);
      const lineH = pt(num(cfg.notes_size_pt, 9.5)) * factor * 1.18;
      y += drawWrappedRtl(ctx, `ملاحظة: ${digits(options, notes)}`, right, y + pt(num(cfg.notes_size_pt, 9.5)), innerWidth, lineH);
    }

    y += mm(3);
    const totalBoxTop = y;
    const totalSize = num(cfg.total_size_pt, 16);
    const totalBoxH = pt(totalSize) * (Number(fee || 0) > 0 && cfg.show_subtotal ? 2.5 : 1.7) + mm(5);
    ctx.lineWidth = Math.max(1, pt(num(cfg.total_border_pt, 2)));
    ctx.strokeRect(left, totalBoxTop, innerWidth, totalBoxH);
    let totalY = totalBoxTop + mm(4) + pt(Math.max(8, totalSize - 4));
    if (Number(fee || 0) > 0 && cfg.show_subtotal) {
      setFont(ctx, Math.max(8, totalSize - 4), font);
      ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillText('مجموع الأصناف', right - mm(3), totalY);
      ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillText(digits(options, displayMoney(options, order.subtotal)), left + mm(3), totalY);
      totalY += pt(totalSize) * 1.35;
    }
    setFont(ctx, totalSize, font);
    ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillText('المجموع الكلي', right - mm(3), totalY);
    ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillText(digits(options, displayMoney(options, order.total)), left + mm(3), totalY);
    y = totalBoxTop + totalBoxH;

    if (cfg.show_footer) {
      y += mm(num(cfg.footer_spacing_mm, 2.5) + 2);
      setFont(ctx, num(cfg.footer_size_pt, 15), font);
      ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.fillText(digits(options, cfg.footer_text || 'شكراً لاختياركم'), cssWidth / 2, y + pt(num(cfg.footer_size_pt, 15)));
    }

    return { canvas, cssWidth, cssHeight, renderScale, fitFactor };
  }

  async function encodeCanvas(canvas) {
    const ios = isIOS();
    const mime = ios ? 'image/jpeg' : 'image/png';
    const format = ios ? 'JPEG' : 'PNG';
    const quality = ios ? 0.98 : undefined;

    if (typeof canvas.toBlob === 'function') {
      const blob = await timeout(new Promise((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('تعذر ضغط صورة الفاتورة.')), mime, quality);
      }), 18000, 'استغرق تجهيز صورة الفاتورة وقتاً أطول من المتوقع.');
      const buffer = await timeout(blob.arrayBuffer(), 8000, 'تعذر قراءة صورة الفاتورة بعد تجهيزها.');
      return { data: new Uint8Array(buffer), format };
    }

    return { data: canvas.toDataURL(mime, quality), format };
  }

  async function canvasToSinglePagePdf(jsPDF, rendered, cfg) {
    const { canvas } = rendered;
    const metrics = pageMetrics(cfg);
    const doc = new jsPDF({ orientation: metrics.orientation, unit: 'mm', format: metrics.format });
    const ratio = canvas.height / canvas.width;
    let drawWidth = metrics.contentWidth;
    let drawHeight = drawWidth * ratio;
    if (drawHeight > metrics.contentHeight) {
      drawHeight = metrics.contentHeight;
      drawWidth = drawHeight / ratio;
    }
    const x = metrics.margin + (metrics.contentWidth - drawWidth) / 2;
    const y = metrics.margin + (metrics.contentHeight - drawHeight) / 2;
    const image = await encodeCanvas(canvas);
    doc.addImage(image.data, image.format, x, y, drawWidth, drawHeight, undefined, 'FAST');
    return {
      blob: doc.output('blob'),
      pageCount: 1,
      renderMode: RENDER_MODE,
      customFontBaked: String(cfg.font_family || '') === 'custom',
      fittedScale: Math.min(1, metrics.contentWidth / (rendered.cssWidth / PX_PER_MM), metrics.contentHeight / (rendered.cssHeight / PX_PER_MM)),
      renderScale: rendered.renderScale,
      rasterFormat: image.format
    };
  }

  async function create(options) {
    const { jsPDF, cfg = {}, fontBuffer = null, logoDataUrl = '' } = options || {};
    if (typeof jsPDF !== 'function') throw new Error('محرك PDF غير متاح.');

    // Font preparation and logo decoding do not depend on each other.
    // Running them together avoids wasting several seconds on mobile Safari.
    const [font, logo] = await Promise.all([
      prepareFont(fontBuffer, cfg),
      cfg.show_logo && cfg.logo_mode === 'image' && logoDataUrl ? loadImage(logoDataUrl) : Promise.resolve(null)
    ]);

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rendered = renderInvoiceCanvas(options, font, logo);
    await new Promise(resolve => setTimeout(resolve, 0));
    return canvasToSinglePagePdf(jsPDF, rendered, cfg);
  }

  window.PashaInvoiceOnePagePdf = Object.freeze({
    renderMode: RENDER_MODE,
    create: options => timeout(create(options), 60000, 'تعذر إنهاء PDF خلال 60 ثانية على هذا الجهاز. أغلق التطبيقات الثقيلة وحاول مرة أخرى.')
  });
})();