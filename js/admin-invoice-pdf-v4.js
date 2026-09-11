(() => {
  const RENDER_MODE = 'native-canvas-v4';
  const PX_PER_MM = 96 / 25.4;
  const PT_TO_PX = 96 / 72;
  const SCALE = 2;
  const FONT_FAMILY = 'Pasha Invoice Native Canvas';

  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const timeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);

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
      orientation: landscape ? 'landscape' : 'portrait'
    };
  }

  function mm(value) { return Number(value || 0) * PX_PER_MM; }
  function pt(value) { return Number(value || 0) * PT_TO_PX; }

  async function installFont(fontBase64, cfg) {
    if (!String(fontBase64 || '').trim()) throw new Error('بيانات الخط المرفوع غير موجودة.');
    if (typeof FontFace !== 'function' || !document.fonts) {
      throw new Error('هذا المتصفح لا يدعم تحميل الخط المطلوب لإنشاء PDF.');
    }

    const weight = String(Math.max(100, Math.min(900, num(cfg.font_weight, 900))));
    let binary;
    try {
      const raw = atob(fontBase64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
      binary = bytes.buffer;
    } catch (_) {
      throw new Error('تعذر قراءة ملف الخط المرفوع.');
    }

    const face = new FontFace(FONT_FAMILY, binary, { style: 'normal', weight, display: 'block' });
    const loaded = await timeout(face.load(), 8000, 'انتهت مهلة تحميل الخط المرفوع.');
    document.fonts.add(loaded);
    await timeout(document.fonts.ready, 4000, 'انتهت مهلة تثبيت الخط المرفوع.');

    const probe = `${weight} 18px "${FONT_FAMILY}"`;
    if (!document.fonts.check(probe, 'باشا بيبي تفاصيل الطلب محمد')) {
      throw new Error('الخط المرفوع لم يُطبق، لذلك تم إيقاف PDF بدل استخدام خط بديل.');
    }
    return { family: FONT_FAMILY, weight };
  }

  async function loadImage(dataUrl) {
    if (!dataUrl) return null;
    const image = new Image();
    await timeout(new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('تعذر تجهيز شعار الفاتورة.'));
      image.src = dataUrl;
    }), 7000, 'انتهت مهلة تجهيز شعار الفاتورة.');
    return image;
  }

  function setFont(ctx, sizePt, weight, family = FONT_FAMILY) {
    ctx.font = `${weight} ${pt(sizePt)}px "${family}"`;
  }

  function wrapText(ctx, value, maxWidth) {
    const text = clean(value);
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
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

  function dottedLeader(ctx, x1, x2, y, width) {
    if (x2 <= x1) return;
    ctx.save();
    ctx.lineWidth = Math.max(1, pt(width || 1.2));
    ctx.setLineDash([2.2, 3.2]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  function itemOption(options, item) {
    if (typeof options.itemOptionText === 'function') return clean(options.itemOptionText(item));
    return clean(item?.option_name);
  }

  function displayMoney(options, value) {
    if (typeof options.money === 'function') return String(options.money(value));
    return `${Number(value || 0).toLocaleString('en-US')} د.ع`;
  }

  function displayWhen(options, value) {
    if (typeof options.when === 'function') return String(options.when(value));
    return String(value || '');
  }

  function digits(options, value) {
    return typeof options.englishDigits === 'function'
      ? String(options.englishDigits(value))
      : String(value ?? '');
  }

  function measureLayout(options, ctx, font) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const pad = mm(num(cfg.outer_padding_mm, 8));
    const innerWidth = mm(metrics.contentWidth) - pad * 2;
    const itemFont = num(cfg.item_size_pt, 12);
    const optionFont = num(cfg.option_size_pt, 9.5);
    const lineHeightFactor = num(cfg.line_height, 1.25);
    let height = pad;

    const logoSize = cfg.show_logo ? mm(num(cfg.logo_size_mm, 27)) + mm(3) : 0;
    height += logoSize;
    if (cfg.show_brand_title) height += pt(num(cfg.title_size_pt, 25)) * 1.15;
    if (cfg.show_brand_subtitle) height += pt(num(cfg.subtitle_size_pt, 8)) * 1.7;
    height += mm(8);
    if (cfg.show_order_number || cfg.show_date_time) height += pt(num(cfg.meta_size_pt, 8)) * 2.1;
    height += mm(2);

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font.weight);
    const customerLineH = pt(num(cfg.customer_size_pt, 10.5)) * lineHeightFactor * 1.2;
    height += customerLineH;
    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font.weight);
      height += Math.max(customerLineH, wrapText(ctx, `العنوان: ${order.address}`, innerWidth).length * pt(num(cfg.address_size_pt, 9.5)) * lineHeightFactor * 1.18);
    }
    height += mm(5);

    if (cfg.show_details_title) height += pt(num(cfg.details_size_pt, 17)) * 1.8;

    const priceWidth = mm(32);
    const productWidth = Math.max(mm(45), innerWidth - priceWidth - mm(18));
    for (const item of items) {
      setFont(ctx, itemFont, font.weight);
      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`;
      const productLines = Math.max(1, wrapText(ctx, product, productWidth).length);
      let row = productLines * pt(itemFont) * lineHeightFactor * 1.18;
      const option = cfg.show_options ? itemOption(options, item) : '';
      if (option) {
        setFont(ctx, optionFont, font.weight);
        row += Math.max(1, wrapText(ctx, digits(options, option), productWidth).length) * pt(optionFont) * lineHeightFactor * 1.1;
      }
      height += Math.max(mm(num(cfg.row_min_height_mm, 7)), row + mm(num(cfg.row_padding_mm, 1)) * 2);
    }

    if (Number(fee || 0) > 0) height += mm(Math.max(7, num(cfg.row_min_height_mm, 7)));
    if (cfg.show_notes && clean(notes)) {
      setFont(ctx, num(cfg.notes_size_pt, 9.5), font.weight);
      height += mm(5) + Math.max(1, wrapText(ctx, `ملاحظة: ${notes}`, innerWidth).length) * pt(num(cfg.notes_size_pt, 9.5)) * lineHeightFactor * 1.18;
    }
    height += mm(5) + pt(num(cfg.total_size_pt, 16)) * 2.7;
    if (cfg.show_footer) height += mm(5) + pt(num(cfg.footer_size_pt, 15)) * 1.7;
    height += pad;

    return Math.max(height, mm(Math.min(num(cfg.paper_min_height_mm, metrics.contentHeight), metrics.contentHeight)));
  }

  function renderInvoiceCanvas(options, font, logoImage) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const probe = document.createElement('canvas').getContext('2d');
    const cssWidth = Math.ceil(mm(metrics.contentWidth));
    const cssHeight = Math.ceil(measureLayout(options, probe, font));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(cssWidth * SCALE));
    canvas.height = Math.max(1, Math.ceil(cssHeight * SCALE));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('تعذر تشغيل Canvas على هذا الجهاز.');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';

    const pad = mm(num(cfg.outer_padding_mm, 8));
    const right = cssWidth - pad;
    const left = pad;
    const innerWidth = right - left;
    const lineHeightFactor = num(cfg.line_height, 1.25);
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
        ctx.font = `900 ${pt(13)}px Georgia, serif`;
        ctx.fillText('PASHA BABY', cssWidth / 2, y + logoSize * 0.53);
        ctx.restore();
      }
      y += logoSize + mm(3);
    }

    if (cfg.show_brand_title) {
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `900 ${pt(num(cfg.title_size_pt, 25))}px Georgia, serif`;
      ctx.fillText(digits(options, cfg.brand_title || 'PASHA BABY'), cssWidth / 2, y + pt(num(cfg.title_size_pt, 25)));
      y += pt(num(cfg.title_size_pt, 25)) * 1.25;
    }
    if (cfg.show_brand_subtitle) {
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.font = `900 ${pt(num(cfg.subtitle_size_pt, 8))}px Georgia, serif`;
      ctx.fillText(digits(options, cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE'), cssWidth / 2, y + pt(num(cfg.subtitle_size_pt, 8)));
      y += pt(num(cfg.subtitle_size_pt, 8)) * 1.7;
    }

    y += mm(2.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(cssWidth / 2 - mm(5), y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cssWidth / 2 + mm(5), y); ctx.lineTo(right, y); ctx.stroke();
    ctx.save(); ctx.translate(cssWidth / 2, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-mm(1.8), -mm(1.8), mm(3.6), mm(3.6)); ctx.restore();
    y += mm(6);

    if (cfg.show_order_number || cfg.show_date_time) {
      setFont(ctx, num(cfg.meta_size_pt, 8), font.weight);
      ctx.textBaseline = 'alphabetic';
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

    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); y += mm(4);

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font.weight);
    const customerBase = y + pt(num(cfg.customer_size_pt, 10.5));
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText(digits(options, order.customer_name || 'زبون'), right, customerBase);
    const customerLeftParts = [];
    if (cfg.show_customer_phone && order.customer_phone) customerLeftParts.push(digits(options, order.customer_phone));
    if (cfg.show_order_type) customerLeftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (customerLeftParts.length) {
      ctx.textAlign = 'left'; ctx.direction = 'rtl';
      ctx.fillText(customerLeftParts.join(' · '), left, customerBase);
    }
    y = customerBase + mm(2.5);

    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font.weight);
      const lineH = pt(num(cfg.address_size_pt, 9.5)) * lineHeightFactor * 1.18;
      y += drawWrappedRtl(ctx, `العنوان: ${digits(options, order.address)}`, right, y + pt(num(cfg.address_size_pt, 9.5)), innerWidth, lineH);
    }
    y += mm(2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); y += mm(4);

    if (cfg.show_details_title) {
      setFont(ctx, num(cfg.details_size_pt, 17), font.weight);
      ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.fillText(digits(options, cfg.details_title || 'تفاصيل الطلب'), cssWidth / 2, y + pt(num(cfg.details_size_pt, 17)));
      y += pt(num(cfg.details_size_pt, 17)) * 1.7;
    }

    const itemFont = num(cfg.item_size_pt, 12);
    const optionFont = num(cfg.option_size_pt, 9.5);
    const priceFont = num(cfg.price_size_pt, 12);
    const priceWidth = mm(32);
    const bulletWidth = mm(5);
    const productRight = right - bulletWidth;
    const priceRightEdge = left + priceWidth;
    const productWidth = Math.max(mm(45), innerWidth - priceWidth - mm(18));

    const drawRow = (product, option, price, isDelivery = false) => {
      const rowTop = y;
      setFont(ctx, itemFont, font.weight);
      const productLineH = pt(itemFont) * lineHeightFactor * 1.18;
      const productLines = wrapText(ctx, digits(options, product), productWidth);
      let rowHeight = Math.max(mm(num(cfg.row_min_height_mm, 7)), productLines.length * productLineH + mm(2));
      if (option) {
        setFont(ctx, optionFont, font.weight);
        rowHeight += Math.max(1, wrapText(ctx, digits(options, option), productWidth).length) * pt(optionFont) * lineHeightFactor * 1.08;
      }
      const baseline = rowTop + pt(itemFont) + mm(1);
      ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillStyle = '#000';
      ctx.fillText('◆', right, baseline);
      setFont(ctx, itemFont, font.weight);
      productLines.forEach((line, index) => ctx.fillText(line, productRight, baseline + index * productLineH));
      let textBottom = baseline + Math.max(0, productLines.length - 1) * productLineH;
      if (option) {
        setFont(ctx, optionFont, font.weight);
        const optLineH = pt(optionFont) * lineHeightFactor * 1.08;
        const optLines = wrapText(ctx, digits(options, option), productWidth);
        optLines.forEach((line, index) => ctx.fillText(line, productRight, textBottom + optLineH * (index + 1)));
      }
      setFont(ctx, priceFont, font.weight);
      ctx.textAlign = 'left'; ctx.direction = 'ltr';
      ctx.fillText(digits(options, price), left, baseline);
      dottedLeader(ctx, priceRightEdge + mm(5), Math.max(priceRightEdge + mm(7), productRight - productWidth - mm(3)), baseline - mm(1), num(cfg.leader_width_pt, 1.5));
      y = rowTop + rowHeight;
      if (!isDelivery) y += mm(num(cfg.row_padding_mm, 1));
    };

    for (const item of items) {
      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${item.product_name || ''}`;
      drawRow(product, cfg.show_options ? itemOption(options, item) : '', displayMoney(options, item.line_total));
    }
    if (Number(fee || 0) > 0) {
      drawRow(`${cfg.show_quantity ? '1× ' : ''}التوصيل`, cfg.show_options ? 'خدمة التوصيل' : '', displayMoney(options, fee), true);
    }

    if (cfg.show_notes && clean(notes)) {
      y += mm(2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); y += mm(3);
      setFont(ctx, num(cfg.notes_size_pt, 9.5), font.weight);
      const lineH = pt(num(cfg.notes_size_pt, 9.5)) * lineHeightFactor * 1.18;
      y += drawWrappedRtl(ctx, `ملاحظة: ${digits(options, notes)}`, right, y + pt(num(cfg.notes_size_pt, 9.5)), innerWidth, lineH);
    }

    y += mm(3);
    const totalBoxTop = y;
    const totalBoxH = pt(num(cfg.total_size_pt, 16)) * (Number(fee || 0) > 0 && cfg.show_subtotal ? 2.5 : 1.7) + mm(5);
    ctx.lineWidth = Math.max(1, pt(num(cfg.total_border_pt, 2)));
    ctx.strokeRect(left, totalBoxTop, innerWidth, totalBoxH);
    let totalY = totalBoxTop + mm(4) + pt(Math.max(8, num(cfg.total_size_pt, 16) - 4));
    if (Number(fee || 0) > 0 && cfg.show_subtotal) {
      setFont(ctx, Math.max(8, num(cfg.total_size_pt, 16) - 4), font.weight);
      ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillText('مجموع الأصناف', right - mm(3), totalY);
      ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillText(digits(options, displayMoney(options, order.subtotal)), left + mm(3), totalY);
      totalY += pt(num(cfg.total_size_pt, 16)) * 1.35;
    }
    setFont(ctx, num(cfg.total_size_pt, 16), font.weight);
    ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillText('المجموع الكلي', right - mm(3), totalY);
    ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillText(digits(options, displayMoney(options, order.total)), left + mm(3), totalY);
    y = totalBoxTop + totalBoxH;

    if (cfg.show_footer) {
      y += mm(5);
      setFont(ctx, num(cfg.footer_size_pt, 15), font.weight);
      ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.fillText(digits(options, cfg.footer_text || 'شكراً لاختياركم'), cssWidth / 2, y + pt(num(cfg.footer_size_pt, 15)));
    }

    return canvas;
  }

  function canvasToPdf(jsPDF, canvas, cfg) {
    const metrics = pageMetrics(cfg);
    const doc = new jsPDF({
      orientation: metrics.orientation,
      unit: 'mm',
      format: String(cfg.page_size || 'A4').toLowerCase() === 'letter'
        ? 'letter'
        : String(cfg.page_size || 'A4').toLowerCase()
    });

    const contentWidthMm = metrics.contentWidth;
    const contentHeightMm = metrics.contentHeight;
    const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (contentHeightMm / contentWidthMm)));
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const sliceCtx = slice.getContext('2d', { alpha: false });
      sliceCtx.fillStyle = '#fff';
      sliceCtx.fillRect(0, 0, slice.width, slice.height);
      sliceCtx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      const png = slice.toDataURL('image/png');
      const renderedHeightMm = contentWidthMm * (sliceHeight / canvas.width);
      if (pageIndex > 0) doc.addPage();
      doc.addImage(png, 'PNG', metrics.margin, metrics.margin, contentWidthMm, renderedHeightMm, undefined, 'FAST');
      sourceY += sliceHeight;
      pageIndex += 1;
    }

    return {
      blob: doc.output('blob'),
      embeddedFont: 'browser-native-canvas:PashaInvoiceCustom',
      renderMode: RENDER_MODE
    };
  }

  async function createNative(options) {
    const { jsPDF, cfg = {}, fontBase64 = '', logoDataUrl = '' } = options || {};
    if (typeof jsPDF !== 'function') throw new Error('محرك PDF غير متاح.');
    const font = await installFont(fontBase64, cfg);
    const logo = cfg.show_logo && cfg.logo_mode === 'image' && logoDataUrl
      ? await loadImage(logoDataUrl)
      : null;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = renderInvoiceCanvas(options, font, logo);
    return canvasToPdf(jsPDF, canvas, cfg);
  }

  async function create(options) {
    return timeout(
      createNative(options),
      18000,
      'تعذر إنهاء PDF خلال 18 ثانية على هذا الجهاز. أغلِق نافذة الطباعة وحاول مرة أخرى.'
    );
  }

  window.PashaInvoicePdf = { create, renderMode: RENDER_MODE };
})();
