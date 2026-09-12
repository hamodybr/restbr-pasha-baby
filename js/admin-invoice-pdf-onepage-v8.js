(() => {
  const RENDER_MODE = 'preview-matched-one-page-v8';
  if (window.PashaInvoiceOnePagePdf?.renderMode === RENDER_MODE) return;

  // IMPORTANT: these are intentionally the same visual units used by the
  // dashboard preview. The settings UI historically treats 1 mm ~= 2 px and
  // 1 pt ~= 1 px. Keeping that contract makes PDF and preview match.
  const LAYOUT_MM = 2;
  const LAYOUT_PT = 1;
  const CUSTOM_FAMILY_NAME = 'PashaInvoicePreviewV8';
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
  const mm = value => Number(value || 0) * LAYOUT_MM;
  const pt = value => Number(value || 0) * LAYOUT_PT;
  const timeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
  const stage = (name, detail = '') => {
    try { window.__PASHA_INVOICE_PDF_STAGE__?.(name, detail); } catch (_) {}
  };

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
    for (let i = 0; i < Math.min(12, bytes.length); i += 1) sample.push(bytes[i].toString(16).padStart(2, '0'));
    for (let i = Math.max(12, bytes.length - 12); i < bytes.length; i += 1) sample.push(bytes[i].toString(16).padStart(2, '0'));
    return `${weight}:${bytes.length}:${sample.join('')}`;
  }

  async function prepareFont(fontBuffer, cfg) {
    const weight = String(Math.max(100, Math.min(900, num(cfg.font_weight, 900))));
    const custom = String(cfg.font_family || '') === 'custom';
    if (!custom) {
      return { family: FONT_STACKS[cfg.font_family] || FONT_STACKS.modern_pro, weight, custom: false };
    }
    if (!(fontBuffer instanceof ArrayBuffer) || fontBuffer.byteLength < 100) {
      throw new Error('ملف الخط المرفوع غير موجود. ارفع الخط واحفظ الإعدادات ثم حاول مرة أخرى.');
    }
    if (typeof FontFace !== 'function' || !document.fonts) {
      throw new Error('هذا الجهاز لا يدعم تحميل الخط المرفوع داخل الفاتورة.');
    }

    const signature = fontSignature(fontBuffer, weight);
    const probe = `${weight} 18px "${CUSTOM_FAMILY_NAME}"`;
    const sample = 'باشا بيبي تفاصيل الطلب محمد Mustafa 123';
    if (cachedCustomFontSignature === signature && document.fonts.check(probe, sample)) {
      return { family: CUSTOM_STACK, weight, custom: true };
    }

    if (cachedCustomFontFace) {
      try { document.fonts.delete(cachedCustomFontFace); } catch (_) {}
      cachedCustomFontFace = null;
      cachedCustomFontSignature = '';
    }

    const face = new FontFace(CUSTOM_FAMILY_NAME, fontBuffer.slice(0), {
      style: 'normal', weight, display: 'block'
    });
    const loaded = await timeout(face.load(), 8000, 'انتهت مهلة تحميل الخط المرفوع.');
    document.fonts.add(loaded);
    await timeout(document.fonts.load(probe, sample), 4000, 'انتهت مهلة تفعيل الخط المرفوع.');
    if (!document.fonts.check(probe, sample)) throw new Error('فشل التحقق من الخط المرفوع بعد تحميله.');
    cachedCustomFontFace = loaded;
    cachedCustomFontSignature = signature;
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

  const digits = (options, value) => typeof options.englishDigits === 'function'
    ? String(options.englishDigits(value)) : String(value ?? '');
  const money = (options, value) => typeof options.money === 'function'
    ? String(options.money(value)) : `${Number(value || 0).toLocaleString('en-US')} د.ع`;
  const when = (options, value) => typeof options.when === 'function'
    ? String(options.when(value)) : String(value || '');
  const optionText = (options, item) => typeof options.itemOptionText === 'function'
    ? clean(options.itemOptionText(item)) : clean(item?.option_name);

  function setFont(ctx, size, font, family = null, weight = null) {
    ctx.font = `${weight || font.weight} ${Math.max(1, pt(size))}px ${family || font.family}`;
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
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawLeader(ctx, x1, x2, y, cfg) {
    if (x2 <= x1 + 3) return;
    ctx.save();
    ctx.lineWidth = Math.max(.5, pt(num(cfg.leader_width_pt, 1.5)));
    const style = String(cfg.leader_style || 'dotted');
    if (style === 'dashed') ctx.setLineDash([5, 4]);
    else if (style === 'solid') ctx.setLineDash([]);
    else if (style === 'double') {
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y - 1.5); ctx.lineTo(x2, y - 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y + 1.5); ctx.lineTo(x2, y + 1.5); ctx.stroke();
      ctx.restore();
      return;
    } else ctx.setLineDash([1.5, 2.5]);
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    ctx.restore();
  }

  function measureRow(ctx, cfg, font, product, option, maxProductWidth) {
    const itemSize = num(cfg.item_size_pt, 12);
    const optionSize = num(cfg.option_size_pt, 9.5);
    setFont(ctx, itemSize, font);
    const productLines = wrapText(ctx, product, maxProductWidth);
    const lineHeight = itemSize * num(cfg.line_height, 1.25);
    let height = Math.max(itemSize * 1.25, productLines.length * lineHeight);
    if (option && productLines.length > 1) {
      setFont(ctx, optionSize, font);
      height += optionSize * num(cfg.line_height, 1.25);
    }
    height = Math.max(mm(num(cfg.row_min_height_mm, 7)), height + mm(num(cfg.row_padding_mm, 1)) * 2);
    return { height, productLines };
  }

  function measureNatural(options, ctx, font) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const width = Math.max(180, Math.round(metrics.contentWidth * LAYOUT_MM));
    const pad = mm(num(cfg.outer_padding_mm, 8));
    const inner = width - pad * 2;
    const priceBlock = 62;
    const productMax = Math.max(90, inner - priceBlock - 18);
    let h = pad;
    if (cfg.show_logo) h += mm(num(cfg.logo_size_mm, 27)) + 5;
    if (cfg.show_brand_title) h += pt(num(cfg.title_size_pt, 25)) * 1.05;
    if (cfg.show_brand_subtitle) h += pt(num(cfg.subtitle_size_pt, 8)) * 1.6;
    h += Math.max(8, mm(num(cfg.header_spacing_mm, 2.5))) + 10;
    if (cfg.show_order_number || cfg.show_date_time) h += num(cfg.meta_size_pt, 8) * 1.6 + 5;
    h += 8;
    h += num(cfg.customer_size_pt, 10.5) * 1.55;
    if (cfg.show_customer_address && order.address) h += num(cfg.address_size_pt, 9.5) * 1.5;
    h += 9;
    if (cfg.show_details_title) h += num(cfg.details_size_pt, 17) * 1.45;
    const rows = [];
    for (const item of items) {
      const product = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`;
      rows.push(measureRow(ctx, cfg, font, product, cfg.show_options ? optionText(options, item) : '', productMax));
    }
    if (Number(fee || 0) > 0) rows.push(measureRow(ctx, cfg, font, `${cfg.show_quantity ? '1× ' : ''}أجور التوصيل`, '', productMax));
    h += rows.reduce((sum, row) => sum + row.height, 0);
    if (cfg.show_notes && clean(notes)) h += num(cfg.notes_size_pt, 9.5) * 1.6 + 8;
    h += num(cfg.total_size_pt, 16) * 1.8 + 13;
    if (cfg.show_footer) h += mm(num(cfg.footer_spacing_mm, 2.5)) + num(cfg.footer_size_pt, 15) * 1.6 + 9;
    h += pad;
    return { width, height: Math.ceil(h), rows, productMax, pad };
  }

  function renderCanvas(options, font, logoImage) {
    const { cfg = {}, order = {}, items = [], notes = '', fee = 0 } = options;
    const metrics = pageMetrics(cfg);
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) throw new Error('تعذر قياس الفاتورة على هذا الجهاز.');
    const measured = measureNatural(options, probe, font);
    const targetHeight = Math.max(420, Math.round(num(cfg.paper_min_height_mm, metrics.contentHeight) * LAYOUT_MM));
    const cssWidth = measured.width;
    const cssHeight = targetHeight;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(cssWidth * scale);
    canvas.height = Math.ceil(cssHeight * scale);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('تعذر تشغيل Canvas على هذا الجهاز.');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.textBaseline = 'alphabetic';

    const contentScale = Math.min(1, (cssHeight - 4) / Math.max(cssHeight - 4, measured.height));
    const offsetX = (cssWidth - cssWidth * contentScale) / 2;
    ctx.save();
    ctx.translate(offsetX, 2);
    ctx.scale(contentScale, contentScale);
    const drawWidth = cssWidth;
    const drawHeight = cssHeight / contentScale - 4;

    const border = Math.max(1, num(cfg.frame_width_pt, 3));
    const radius = Math.max(0, num(cfg.frame_radius_mm, 4) * 1.5);
    ctx.lineWidth = Math.max(1, border * .38);
    roundedRect(ctx, border * .45, border * .45, drawWidth - border * .9, drawHeight - border * .9, radius);
    ctx.stroke();
    const gap = Math.max(2, border * .9);
    roundedRect(ctx, gap + border * .45, gap + border * .45, drawWidth - (gap + border * .45) * 2, drawHeight - (gap + border * .45) * 2, Math.max(0, radius - gap));
    ctx.stroke();

    const pad = measured.pad;
    const left = pad;
    const right = drawWidth - pad;
    const inner = right - left;
    let y = pad;

    const logoSize = mm(num(cfg.logo_size_mm, 27));
    if (cfg.show_logo) {
      if (cfg.logo_mode === 'image' && logoImage) {
        ctx.drawImage(logoImage, (drawWidth - logoSize) / 2, y, logoSize, logoSize);
      } else {
        ctx.save();
        ctx.lineWidth = Math.max(1, border * .5);
        ctx.beginPath(); ctx.arc(drawWidth / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.direction = 'ltr';
        ctx.font = `700 ${Math.max(6, logoSize * .16)}px Georgia,serif`;
        ctx.fillText('♛ PASHA BABY', drawWidth / 2, y + logoSize * .48);
        ctx.font = `700 ${Math.max(8, logoSize * .23)}px Georgia,serif`;
        ctx.fillText('PB', drawWidth / 2, y + logoSize * .72);
        ctx.restore();
      }
      y += logoSize + 5;
    }

    if (cfg.show_brand_title) {
      ctx.textAlign = 'center'; ctx.direction = 'ltr';
      setFont(ctx, num(cfg.title_size_pt, 25), font, 'Georgia,"Times New Roman",serif', 700);
      ctx.fillText(digits(options, cfg.brand_title || 'PASHA BABY'), drawWidth / 2, y + num(cfg.title_size_pt, 25));
      y += num(cfg.title_size_pt, 25) * 1.05;
    }
    if (cfg.show_brand_subtitle) {
      ctx.textAlign = 'center'; ctx.direction = 'ltr';
      setFont(ctx, num(cfg.subtitle_size_pt, 8), font, 'Georgia,"Times New Roman",serif', 700);
      ctx.fillText(digits(options, cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE'), drawWidth / 2, y + num(cfg.subtitle_size_pt, 8));
      y += num(cfg.subtitle_size_pt, 8) * 1.5;
    }

    y += Math.max(4, mm(num(cfg.header_spacing_mm, 2.5)) * .6);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(drawWidth / 2 - 10, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(drawWidth / 2 + 10, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.save(); ctx.translate(drawWidth / 2, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    y += 10;

    if (cfg.show_order_number || cfg.show_date_time) {
      setFont(ctx, num(cfg.meta_size_pt, 8), font);
      if (cfg.show_order_number) {
        ctx.textAlign = 'right'; ctx.direction = 'ltr';
        ctx.fillText(digits(options, order.order_number || ''), right, y);
      }
      if (cfg.show_date_time) {
        ctx.textAlign = 'left'; ctx.direction = 'rtl';
        ctx.fillText(digits(options, when(options, order.created_at)), left, y);
      }
      y += num(cfg.meta_size_pt, 8) * 1.55 + 4;
    }

    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 7;

    setFont(ctx, num(cfg.customer_size_pt, 10.5), font);
    const customerY = y + num(cfg.customer_size_pt, 10.5);
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText(digits(options, order.customer_name || 'زبون'), right, customerY);
    const leftParts = [];
    if (cfg.show_customer_phone && order.customer_phone) leftParts.push(digits(options, order.customer_phone));
    if (cfg.show_order_type) leftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (leftParts.length) {
      ctx.textAlign = 'left'; ctx.direction = 'rtl';
      ctx.fillText(leftParts.join(' · '), left, customerY);
    }
    y = customerY + 5;
    if (cfg.show_customer_address && order.address) {
      setFont(ctx, num(cfg.address_size_pt, 9.5), font);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      const text = `العنوان: ${digits(options, order.address)}`;
      const lines = wrapText(ctx, text, inner);
      for (const line of lines) { y += num(cfg.address_size_pt, 9.5) * 1.25; ctx.fillText(line, right, y); }
      y += 2;
    }
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 7;

    if (cfg.show_details_title) {
      setFont(ctx, num(cfg.details_size_pt, 17), font);
      ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.fillText(digits(options, cfg.details_title || 'تفاصيل الطلب'), drawWidth / 2, y + num(cfg.details_size_pt, 17));
      y += num(cfg.details_size_pt, 17) * 1.45;
    }

    const renderRows = items.map(item => ({
      product: `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(options, item.product_name)}`,
      option: cfg.show_options ? digits(options, optionText(options, item)) : '',
      price: digits(options, money(options, item.line_total))
    }));
    if (Number(fee || 0) > 0) renderRows.push({
      product: `${cfg.show_quantity ? '1× ' : ''}أجور التوصيل`, option: '', price: digits(options, money(options, fee))
    });

    const fixedAfterRows = (cfg.show_notes && clean(notes) ? num(cfg.notes_size_pt, 9.5) * 1.6 + 8 : 0)
      + num(cfg.total_size_pt, 16) * 1.8 + 13
      + (cfg.show_footer ? mm(num(cfg.footer_spacing_mm, 2.5)) + num(cfg.footer_size_pt, 15) * 1.6 + 9 : 0)
      + pad;
    const rowNatural = renderRows.map(row => measureRow(ctx, cfg, font, row.product, row.option, measured.productMax));
    const naturalRowsH = rowNatural.reduce((sum, row) => sum + row.height, 0);
    const availableForRows = Math.max(naturalRowsH, drawHeight - y - fixedAfterRows);
    const extraPerRow = renderRows.length ? Math.max(0, availableForRows - naturalRowsH) / renderRows.length : 0;

    for (let index = 0; index < renderRows.length; index += 1) {
      const row = renderRows[index];
      const rowInfo = rowNatural[index];
      const rowHeight = rowInfo.height + extraPerRow;
      const centerY = y + rowHeight / 2;
      const itemSize = num(cfg.item_size_pt, 12);
      const optionSize = num(cfg.option_size_pt, 9.5);
      const priceSize = num(cfg.price_size_pt, 12);
      const priceText = row.price;
      setFont(ctx, priceSize, font);
      const priceW = ctx.measureText(priceText).width;
      ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillStyle = '#000';
      ctx.fillText(priceText, left, centerY + priceSize * .35);
      const priceEnd = left + priceW;

      setFont(ctx, itemSize, font);
      const productLines = wrapText(ctx, row.product, measured.productMax);
      const lineH = itemSize * num(cfg.line_height, 1.25);
      const baseY = centerY - ((productLines.length - 1) * lineH) / 2 + itemSize * .35;
      ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillStyle = '#000';
      productLines.forEach((line, lineIndex) => ctx.fillText(line, right, baseY + lineIndex * lineH));
      let leftEdge = right - Math.max(...productLines.map(line => ctx.measureText(line).width), 0);

      if (row.option) {
        setFont(ctx, optionSize, font);
        const option = `— ${row.option}`;
        const optionW = ctx.measureText(option).width;
        if (productLines.length === 1 && leftEdge - optionW - 5 > priceEnd + 18) {
          ctx.fillStyle = '#777';
          ctx.textAlign = 'right'; ctx.direction = 'rtl';
          ctx.fillText(option, leftEdge - 5, baseY);
          leftEdge -= optionW + 5;
        } else {
          ctx.fillStyle = '#777';
          ctx.textAlign = 'right'; ctx.direction = 'rtl';
          ctx.fillText(option, right, baseY + lineH);
        }
      }
      ctx.fillStyle = '#000';
      drawLeader(ctx, priceEnd + 8, leftEdge - 8, centerY + 1, cfg);
      y += rowHeight;
    }

    if (cfg.show_notes && clean(notes)) {
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      y += 6;
      setFont(ctx, num(cfg.notes_size_pt, 9.5), font);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      ctx.fillText(`ملاحظة: ${digits(options, notes)}`, right, y + num(cfg.notes_size_pt, 9.5));
      y += num(cfg.notes_size_pt, 9.5) * 1.6 + 2;
    }

    const totalSize = num(cfg.total_size_pt, 16);
    const boxH = totalSize * 1.55 + 10;
    ctx.lineWidth = Math.max(1, num(cfg.total_border_pt, 2));
    roundedRect(ctx, left, y, inner, boxH, 5);
    ctx.stroke();
    setFont(ctx, totalSize, font);
    ctx.textAlign = 'right'; ctx.direction = 'rtl';
    ctx.fillText('المجموع الكلي', right - 6, y + boxH / 2 + totalSize * .35);
    ctx.textAlign = 'left'; ctx.direction = 'ltr';
    ctx.fillText(digits(options, money(options, order.total)), left + 6, y + boxH / 2 + totalSize * .35);
    y += boxH;

    if (cfg.show_footer) {
      y += mm(num(cfg.footer_spacing_mm, 2.5)) + 3;
      ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = '#000';
      setFont(ctx, Math.max(6, num(cfg.footer_size_pt, 15) * .55), font);
      ctx.fillText('◆', drawWidth / 2, y + 4);
      y += 7;
      setFont(ctx, num(cfg.footer_size_pt, 15), font);
      ctx.fillText(digits(options, cfg.footer_text || 'شكراً لاختياركم'), drawWidth / 2, y + num(cfg.footer_size_pt, 15));
    }

    ctx.restore();
    return { canvas, cssWidth, cssHeight, contentScale };
  }

  async function encodeJpeg(canvas) {
    stage('encode', 'تم رسم التصميم بنفس نسب المعاينة. جاري ضغط صورة الصفحة.');
    const blob = await timeout(new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('تعذر ضغط صورة الفاتورة.')), 'image/jpeg', .96);
    }), 15000, 'استغرق ضغط صورة الفاتورة وقتاً أطول من المتوقع.');
    const buffer = await timeout(blob.arrayBuffer(), 6000, 'تعذر قراءة صورة الفاتورة بعد ضغطها.');
    return new Uint8Array(buffer);
  }

  async function create(options) {
    const { PdfClass, cfg = {}, fontBuffer = null, logoDataUrl = '' } = options || {};
    if (typeof PdfClass !== 'function') throw new Error('مولّد PDF المباشر غير متاح.');
    stage('font', 'جاري تثبيت الخط والشعار.');
    const [font, logo] = await Promise.all([
      prepareFont(fontBuffer, cfg),
      cfg.show_logo && cfg.logo_mode === 'image' && logoDataUrl ? loadImage(logoDataUrl) : Promise.resolve(null)
    ]);
    stage('render', 'جاري رسم نفس تخطيط المعاينة داخل صفحة واحدة.');
    await new Promise(resolve => requestAnimationFrame(resolve));
    const rendered = renderCanvas(options, font, logo);
    const jpeg = await encodeJpeg(rendered.canvas);
    stage('pack', 'جاري تغليف الصورة داخل PDF من صفحة واحدة.');
    const metrics = pageMetrics(cfg);
    const doc = new PdfClass({ orientation: metrics.orientation, unit: 'mm', format: metrics.format });
    doc.addImage(jpeg, 'JPEG', metrics.margin, metrics.margin, metrics.contentWidth, metrics.contentHeight);
    const blob = doc.output('blob');
    return {
      blob,
      pageCount: 1,
      renderMode: RENDER_MODE,
      customFontBaked: String(cfg.font_family || '') === 'custom',
      contentScale: rendered.contentScale,
      rasterFormat: 'JPEG'
    };
  }

  window.PashaInvoiceOnePagePdf = Object.freeze({
    renderMode: RENDER_MODE,
    create: options => timeout(create(options), 45000, 'تعذر إنهاء PDF خلال 45 ثانية على هذا الجهاز.')
  });
})();
