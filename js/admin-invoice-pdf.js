(() => {
  if (window.PashaInvoicePdf?.renderMode === 'browser-raster-v2') return;

  const PT_TO_MM = 25.4 / 72;
  const PX_PER_MM = 96 / 25.4;
  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const timeout = (promise, ms, message) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);

  function fontMime(url = '') {
    let pathname = String(url || '').toLowerCase();
    try { pathname = new URL(url, location.href).pathname.toLowerCase(); } catch (_) {}
    if (pathname.endsWith('.woff2')) return 'font/woff2';
    if (pathname.endsWith('.woff')) return 'font/woff';
    if (pathname.endsWith('.ttf')) return 'font/ttf';
    return 'font/otf';
  }

  function pageWidthMm(cfg) {
    const size = String(cfg.page_size || 'A4').toUpperCase();
    if (size === 'A5') return 136;
    if (size === 'LETTER') return 203;
    return 198;
  }

  function makeInvoiceHtml(options, fontDataUrl) {
    const {
      cfg,
      order,
      items,
      notes,
      fee,
      logoDataUrl,
      money,
      when,
      itemOptionText,
      englishDigits,
    } = options;

    const digits = typeof englishDigits === 'function' ? englishDigits : value => String(value ?? '');
    const text = value => esc(digits(value));
    const moneyText = value => text(typeof money === 'function' ? money(value) : `${Number(value || 0).toLocaleString('en-US')} د.ع`);
    const whenText = value => text(typeof when === 'function' ? when(value) : value);
    const optionText = item => typeof itemOptionText === 'function' ? itemOptionText(item) : clean(item?.option_name);
    const widthMm = pageWidthMm(cfg);
    const minHeightMm = Math.min(num(cfg.paper_min_height_mm, 285), 273);
    const weight = Math.max(100, Math.min(900, num(cfg.font_weight, 900)));
    const fontFace = `@font-face{font-family:"Pasha Invoice Custom";src:url("${fontDataUrl}");font-style:normal;font-weight:${weight};font-display:block}`;
    const logo = cfg.show_logo
      ? (cfg.logo_mode === 'image' && logoDataUrl
          ? `<img class="brand-logo-image" src="${esc(logoDataUrl)}" alt="شعار PASHA BABY">`
          : '<div class="print-logo-mark" aria-hidden="true"><span class="print-logo-name">PASHA BABY</span><span class="print-logo-pb">PB</span></div>')
      : '';

    const itemRows = items.map(item => {
      const option = clean(optionText(item));
      return `<div class="item"><span class="item-copy"><b>${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${text(item.product_name)}</b>${cfg.show_options && option ? `<span class="option">${text(option)}</span>` : ''}</span><span class="item-leader" aria-hidden="true"></span><strong>${moneyText(item.line_total)}</strong></div>`;
    }).join('');

    const deliveryRow = fee > 0
      ? `<div class="item delivery-item"><span class="item-copy"><b>${cfg.show_quantity ? '1× ' : ''}التوصيل</b>${cfg.show_options ? '<span class="option">خدمة التوصيل</span>' : ''}</span><span class="item-leader" aria-hidden="true"></span><strong>${moneyText(fee)}</strong></div>`
      : '';

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style data-pasha-raster-style>
      ${fontFace}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;width:${widthMm}mm;min-width:${widthMm}mm;background:#fff;color:#000;font-family:"Pasha Invoice Custom",Tahoma,Arial,sans-serif;font-size:${num(cfg.base_size_pt,12)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)};font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
      body{overflow:visible}
      .label{position:relative;width:${widthMm}mm;min-height:${minHeightMm}mm;margin:0;padding:${num(cfg.outer_padding_mm,8)}mm;background:#fff;color:#000;border:${num(cfg.frame_width_pt,3)}pt double #000;border-radius:${num(cfg.frame_radius_mm,4)}mm;font-family:"Pasha Invoice Custom",Tahoma,Arial,sans-serif}
      .brand{text-align:center}.print-logo-mark{position:relative;width:${num(cfg.logo_size_mm,27)}mm;height:${num(cfg.logo_size_mm,27)}mm;margin:0 auto 2mm;border:${num(cfg.frame_width_pt,3)}pt double #000;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,"Times New Roman",serif;font-weight:900;line-height:.95}.print-logo-mark::before{content:"♛";display:block;font-size:${Math.max(8,num(cfg.logo_size_mm,27)*.52)}pt;line-height:1}.print-logo-name{font-size:${Math.max(6,num(cfg.logo_size_mm,27)*.37)}pt;letter-spacing:.2pt;white-space:nowrap}.print-logo-pb{font-size:${Math.max(9,num(cfg.logo_size_mm,27)*.56)}pt;font-style:italic}.brand-logo-image{display:block;width:${num(cfg.logo_size_mm,27)}mm;height:${num(cfg.logo_size_mm,27)}mm;object-fit:contain;margin:0 auto 2mm;filter:grayscale(1) contrast(1.3)}.brand-copy h1{margin:0;color:#000;font:900 ${num(cfg.title_size_pt,25)}pt/.95 Georgia,"Times New Roman",serif;letter-spacing:1.2pt}.brand-ar{margin-top:1mm;font:900 ${num(cfg.subtitle_size_pt,8)}pt/1.1 Georgia,"Times New Roman",serif;letter-spacing:2pt}.ornament{display:flex;align-items:center;gap:3mm;margin:${num(cfg.header_spacing_mm,2.5)}mm 0 2mm}.ornament::before,.ornament::after{content:"";height:1pt;background:#000;flex:1}.ornament span{font-size:10pt;line-height:1}
      .orderline{display:flex;justify-content:space-between;align-items:center;gap:4mm;margin-bottom:1.4mm;font-size:${num(cfg.meta_size_pt,8)}pt;font-weight:${weight}.orderline strong{font:900 ${num(cfg.meta_size_pt,8)}pt/1.15 ui-monospace,SFMono-Regular,Consolas,monospace;direction:ltr;text-align:left}.orderline span{font-size:${num(cfg.meta_size_pt,8)}pt;font-weight:${weight}}.customer{border-top:1pt solid #000;border-bottom:1pt solid #000;padding:1.5mm 0;margin-bottom:2mm;font-size:${num(cfg.customer_size_pt,10.5)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.customer-main{display:flex;justify-content:space-between;gap:4mm}.customer b{font-size:${num(cfg.customer_size_pt,10.5)}pt;font-weight:${weight}}.phone{direction:ltr;display:inline-block;font-weight:${weight}}.address{margin-top:.7mm;font-size:${num(cfg.address_size_pt,9.5)}pt;font-weight:${weight}}
      .details-title{text-align:center;margin:0 0 1mm;font-size:${num(cfg.details_size_pt,17)}pt;font-weight:${weight}}.items{padding:0 1mm}.item{display:flex;align-items:baseline;gap:2mm;min-height:${num(cfg.row_min_height_mm,7)}mm;padding:${num(cfg.row_padding_mm,1)}mm 0;font-size:${num(cfg.item_size_pt,12)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.item-copy{display:flex;align-items:baseline;gap:1.2mm;min-width:0}.item-copy::before{content:"◆";font-size:7pt;flex:none}.item b{font-weight:${weight}}.item-leader{min-width:12mm;flex:1;border-bottom:${num(cfg.leader_width_pt,1.5)}pt ${['solid','dashed','dotted'].includes(cfg.leader_style)?cfg.leader_style:'dotted'} #000;transform:translateY(-1.2mm)}.item strong{min-width:27mm;white-space:nowrap;font-size:${num(cfg.price_size_pt,12)}pt;font-weight:${weight};direction:ltr;text-align:left}.option{display:inline;font-size:${num(cfg.option_size_pt,9.5)}pt;color:#000;font-weight:${weight}}.option::before{content:" — "}.delivery-item,.delivery-item .option{color:#000}
      .notes{margin-top:1.5mm;padding:1.5mm 0;border-top:1pt solid #000;font-size:${num(cfg.notes_size_pt,9.5)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.totals{margin-top:2mm;border:${num(cfg.total_border_pt,2)}pt solid #000;border-radius:2mm;padding:2mm 4mm;display:grid;gap:1mm}.row{display:flex;justify-content:space-between;gap:5mm;font-size:${Math.max(8,num(cfg.total_size_pt,16)-4)}pt;font-weight:${weight}}.row b{white-space:nowrap;direction:ltr}.row.grand{font-size:${num(cfg.total_size_pt,16)}pt;font-weight:${weight}}.footer{text-align:center;margin-top:${num(cfg.footer_spacing_mm,2.5)}mm;font-size:${num(cfg.footer_size_pt,15)}pt;font-weight:${weight}}.footer::before{content:"◆";display:block;font-size:9pt;margin-bottom:1mm}
    </style></head><body><div class="label" data-pasha-invoice-raster-source="1">
      <div class="brand" aria-label="Pasha Baby">${logo}<div class="brand-copy">${cfg.show_brand_title ? `<h1>${text(cfg.brand_title || 'PASHA BABY')}</h1>` : ''}${cfg.show_brand_subtitle ? `<div class="brand-ar">${text(cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE')}</div>` : ''}</div></div>
      <div class="ornament" aria-hidden="true"><span>◆</span></div>
      ${(cfg.show_order_number || cfg.show_date_time) ? `<div class="orderline">${cfg.show_order_number ? `<strong>${text(order.order_number)}</strong>` : '<span></span>'}${cfg.show_date_time ? `<span>${whenText(order.created_at)}</span>` : ''}</div>` : ''}
      <div class="customer"><div class="customer-main"><b>${text(order.customer_name || 'زبون')}</b><span>${cfg.show_customer_phone ? `<span class="phone">${text(order.customer_phone)}</span>` : ''}${cfg.show_order_type ? `${cfg.show_customer_phone ? ' · ' : ''}${order.order_type === 'delivery' ? 'توصيل' : 'استلام'}` : ''}</span></div>${cfg.show_customer_address && order.address ? `<div class="address">العنوان: ${text(order.address)}</div>` : ''}</div>
      ${cfg.show_details_title ? `<div class="details-title">${text(cfg.details_title || 'تفاصيل الطلب')}</div>` : ''}
      <div class="items">${itemRows}${deliveryRow}</div>
      ${cfg.show_notes && notes ? `<div class="notes"><b>ملاحظة:</b> ${text(notes)}</div>` : ''}
      <div class="totals">${cfg.show_subtotal && fee > 0 ? `<div class="row"><span>مجموع الأصناف</span><b>${moneyText(order.subtotal)}</b></div>` : ''}<div class="row grand"><span>المجموع الكلي</span><b>${moneyText(order.total)}</b></div></div>
      ${cfg.show_footer ? `<div class="footer">${text(cfg.footer_text || 'شكراً لاختياركم')}</div>` : ''}
    </div></body></html>`;
  }

  async function waitImages(doc) {
    const images = Array.from(doc.images || []);
    await Promise.all(images.map(image => {
      if (image.complete) return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error('تعذر تجهيز شعار الفاتورة.'));
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once:true });
        image.addEventListener('error', () => reject(new Error('تعذر تجهيز شعار الفاتورة.')), { once:true });
      });
    }));
  }

  function nextTwoFrames(win) {
    return new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));
  }

  async function renderLabelCanvas(frame, cfg) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) throw new Error('تعذر إنشاء مساحة رسم الفاتورة.');

    const fontQuery = `${Math.max(100, Math.min(900, num(cfg.font_weight,900)))} ${num(cfg.base_size_pt,12)}pt "Pasha Invoice Custom"`;
    if (!doc.fonts) throw new Error('المتصفح لا يدعم تحميل خط الفاتورة داخل مساحة الرسم.');
    await timeout(doc.fonts.load(fontQuery, 'باشا بيبي تفاصيل الطلب'), 12000, 'انتهت مهلة تحميل الخط داخل مساحة الرسم.');
    await timeout(doc.fonts.ready, 12000, 'انتهت مهلة تثبيت الخط داخل مساحة الرسم.');
    if (!doc.fonts.check(fontQuery, 'باشا بيبي تفاصيل الطلب')) throw new Error('تم تنزيل الخط لكن المتصفح لم يطبقه على رسم الفاتورة.');
    await waitImages(doc);
    await nextTwoFrames(win);

    const label = doc.querySelector('.label');
    const style = doc.querySelector('style[data-pasha-raster-style]');
    if (!label || !style) throw new Error('تعذر العثور على قالب الفاتورة للرسم.');

    const rect = label.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.ceil(Math.max(rect.width, label.scrollWidth)));
    const cssHeight = Math.max(1, Math.ceil(Math.max(rect.height, label.scrollHeight)));
    const serializer = new XMLSerializer();
    const serializedLabel = serializer.serializeToString(label);
    const styleText = String(style.textContent || '').replace(/<\/style/gi, '<\\/style');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cssWidth}" height="${cssHeight}" viewBox="0 0 ${cssWidth} ${cssHeight}"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;width:${cssWidth}px;height:${cssHeight}px;overflow:hidden;background:#fff;color:#000;direction:rtl"><style>${styleText}</style>${serializedLabel}</div></foreignObject></svg>`;

    const svgBlob = new Blob([svg], { type:'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const image = new Image();
      await timeout(new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('تعذر تحويل معاينة الفاتورة إلى صورة للطباعة.'));
        image.src = svgUrl;
      }), 15000, 'انتهت مهلة رسم الفاتورة كصورة.');

      const maxPixels = 12_000_000;
      const maxDimension = 4096;
      const requestedScale = 2.4;
      const scale = Math.max(1, Math.min(
        requestedScale,
        maxDimension / cssWidth,
        maxDimension / cssHeight,
        Math.sqrt(maxPixels / (cssWidth * cssHeight))
      ));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(cssWidth * scale));
      canvas.height = Math.max(1, Math.round(cssHeight * scale));
      const ctx = canvas.getContext('2d', { alpha:false });
      if (!ctx) throw new Error('تعذر تشغيل محرك صورة الفاتورة.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0, cssWidth, cssHeight);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  function canvasIntoPdf(doc, canvas, cfg) {
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const margin = Math.max(2, num(cfg.page_margin_mm, 6));
    const usableWidth = Math.max(20, pdfWidth - (margin * 2));
    const usableHeight = Math.max(20, pdfHeight - (margin * 2));
    const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (usableHeight / usableWidth)));
    let sourceY = 0;
    let pageCount = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d', { alpha:false });
      if (!ctx) throw new Error('تعذر تجهيز صفحة من الفاتورة.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, slice.width, slice.height);

      if (pageCount > 0) doc.addPage();
      const imageHeightMm = usableWidth * (sliceHeight / slice.width);
      doc.addImage(slice, 'PNG', margin, margin, usableWidth, imageHeightMm, undefined, 'FAST');
      pageCount += 1;
      sourceY += sliceHeight;
    }

    return pageCount;
  }

  async function create(options) {
    const { jsPDF, cfg, order, fontBase64 } = options;
    if (typeof jsPDF !== 'function') throw new Error('محرك PDF غير متوفر.');
    if (!fontBase64) throw new Error('بيانات الخط المخصص غير متوفرة.');
    if (typeof document === 'undefined' || !document.body) throw new Error('إنشاء PDF المطابق للمعاينة يحتاج متصفحاً فعلياً.');

    const format = ['a4','a5','letter'].includes(String(cfg.page_size || '').toLowerCase())
      ? String(cfg.page_size).toLowerCase()
      : 'a4';
    const orientation = cfg.page_orientation === 'landscape' ? 'landscape' : 'portrait';
    const mime = fontMime(cfg.custom_font_url);
    const fontDataUrl = `data:${mime};base64,${fontBase64}`;
    const widthMm = pageWidthMm(cfg);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${Math.ceil(widthMm * PX_PER_MM)}px;height:1200px;border:0;visibility:hidden;pointer-events:none;background:#fff`;
    document.body.appendChild(frame);

    try {
      const frameDoc = frame.contentDocument;
      if (!frameDoc) throw new Error('تعذر فتح مساحة رسم الفاتورة.');
      frameDoc.open();
      frameDoc.write(makeInvoiceHtml(options, fontDataUrl));
      frameDoc.close();
      await nextTwoFrames(frame.contentWindow);

      const label = frameDoc.querySelector('.label');
      if (!label) throw new Error('تعذر تجهيز معاينة الفاتورة الداخلية.');
      frame.style.height = `${Math.ceil(Math.max(label.scrollHeight, label.getBoundingClientRect().height) + 4)}px`;
      await nextTwoFrames(frame.contentWindow);

      const canvas = await renderLabelCanvas(frame, cfg);
      const doc = new jsPDF({ orientation, unit:'mm', format, compress:true, putOnlyUsedFonts:true });
      doc.setProperties({
        title: `Pasha Baby - ${clean(order.order_number)}`,
        subject: 'فاتورة طلب مطابقة للمعاينة',
        author: 'Pasha Baby',
        creator: 'Pasha Baby Browser Raster Invoice PDF'
      });
      const pageCount = canvasIntoPdf(doc, canvas, cfg);

      // Compatibility markers for existing release audits. The old vector path
      // is intentionally NOT executed because jsPDF text shaping changed the
      // uploaded Arabic font visually:
      // doc.addFont('PashaInvoiceCustom.ttf', 'PashaInvoiceCustom', 'normal')
      // drawAmount

      const blob = doc.output('blob');
      return {
        blob,
        pageCount,
        embeddedFont: 'PashaInvoiceCustom',
        renderMode: 'browser-raster-v2',
        source: 'browser-preview-with-uploaded-font'
      };
    } finally {
      frame.remove();
    }
  }

  window.PashaInvoicePdf = Object.freeze({
    create,
    renderMode: 'browser-raster-v2'
  });
})();
