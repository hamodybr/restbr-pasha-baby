(() => {
  if (window.PashaInvoicePdf?.renderMode === 'html2canvas-v3') return;

  const PX_PER_MM = 96 / 25.4;
  const RENDER_MODE = 'html2canvas-v3';
  const HTML2CANVAS_SOURCES = [
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
  ];

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
      contentWidth: Math.max(30, width - (margin * 2)),
      contentHeight: Math.max(30, height - (margin * 2)),
      orientation: landscape ? 'landscape' : 'portrait'
    };
  }

  function detectFontMime(base64) {
    try {
      const raw = atob(String(base64 || '').slice(0, 24));
      const bytes = Array.from(raw, ch => ch.charCodeAt(0));
      const tag = raw.slice(0, 4);
      if (tag === 'OTTO') return 'font/otf';
      if (tag === 'wOFF') return 'font/woff';
      if (tag === 'wOF2') return 'font/woff2';
      if (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return 'font/ttf';
    } catch (_) {}
    return 'font/otf';
  }

  function makeInvoiceHtml(options, fontDataUrl) {
    const { cfg, order, items, notes, fee, logoDataUrl, money, when, itemOptionText, englishDigits } = options;
    const metrics = pageMetrics(cfg);
    const digits = typeof englishDigits === 'function' ? englishDigits : value => String(value ?? '');
    const text = value => esc(digits(value));
    const moneyText = value => text(typeof money === 'function' ? money(value) : `${Number(value || 0).toLocaleString('en-US')} د.ع`);
    const whenText = value => text(typeof when === 'function' ? when(value) : value);
    const optionText = item => typeof itemOptionText === 'function' ? itemOptionText(item) : clean(item?.option_name);
    const minHeightMm = Math.min(Math.max(0, num(cfg.paper_min_height_mm, metrics.contentHeight)), metrics.contentHeight);
    const weight = Math.max(100, Math.min(900, num(cfg.font_weight, 900)));
    const logoSize = num(cfg.logo_size_mm, 27);
    const leaderStyle = ['solid', 'dashed', 'dotted'].includes(cfg.leader_style) ? cfg.leader_style : 'dotted';

    const logo = cfg.show_logo
      ? (cfg.logo_mode === 'image' && logoDataUrl
          ? `<img class="brand-logo-image" src="${esc(logoDataUrl)}" alt="شعار PASHA BABY">`
          : '<div class="print-logo-mark" aria-hidden="true"><span class="print-logo-name">PASHA BABY</span><span class="print-logo-pb">PB</span></div>')
      : '';

    const itemRows = (Array.isArray(items) ? items : []).map(item => {
      const option = clean(optionText(item));
      return `<div class="item"><span class="item-copy"><b>${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${text(item.product_name)}</b>${cfg.show_options && option ? `<span class="option">${text(option)}</span>` : ''}</span><span class="item-leader" aria-hidden="true"></span><strong>${moneyText(item.line_total)}</strong></div>`;
    }).join('');

    const deliveryRow = Number(fee || 0) > 0
      ? `<div class="item delivery-item"><span class="item-copy"><b>${cfg.show_quantity ? '1× ' : ''}التوصيل</b>${cfg.show_options ? '<span class="option">خدمة التوصيل</span>' : ''}</span><span class="item-leader" aria-hidden="true"></span><strong>${moneyText(fee)}</strong></div>`
      : '';

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style data-pasha-canvas-style>
      @font-face{font-family:"Pasha Invoice Custom";src:url("${fontDataUrl}");font-style:normal;font-weight:${weight};font-display:block}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;width:${metrics.contentWidth}mm;min-width:${metrics.contentWidth}mm;background:#fff;color:#000;font-family:"Pasha Invoice Custom",Tahoma,Arial,sans-serif;font-size:${num(cfg.base_size_pt,12)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)};font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
      body{overflow:visible}
      .label{position:relative;width:${metrics.contentWidth}mm;min-height:${minHeightMm}mm;margin:0;padding:${num(cfg.outer_padding_mm,8)}mm;background:#fff;color:#000;border:${num(cfg.frame_width_pt,3)}pt double #000;border-radius:${num(cfg.frame_radius_mm,4)}mm;font-family:"Pasha Invoice Custom",Tahoma,Arial,sans-serif}
      .brand{text-align:center}.print-logo-mark{position:relative;width:${logoSize}mm;height:${logoSize}mm;margin:0 auto 2mm;border:${num(cfg.frame_width_pt,3)}pt double #000;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,"Times New Roman",serif;font-weight:900;line-height:.95}.print-logo-mark::before{content:"♛";display:block;font-size:${Math.max(8,logoSize*.52)}pt;line-height:1}.print-logo-name{font-size:${Math.max(6,logoSize*.37)}pt;letter-spacing:.2pt;white-space:nowrap}.print-logo-pb{font-size:${Math.max(9,logoSize*.56)}pt;font-style:italic}.brand-logo-image{display:block;width:${logoSize}mm;height:${logoSize}mm;object-fit:contain;margin:0 auto 2mm;filter:grayscale(1) contrast(1.3)}.brand-copy h1{margin:0;color:#000;font:900 ${num(cfg.title_size_pt,25)}pt/.95 Georgia,"Times New Roman",serif;letter-spacing:1.2pt}.brand-ar{margin-top:1mm;font:900 ${num(cfg.subtitle_size_pt,8)}pt/1.1 Georgia,"Times New Roman",serif;letter-spacing:2pt}.ornament{display:flex;align-items:center;gap:3mm;margin:${num(cfg.header_spacing_mm,2.5)}mm 0 2mm}.ornament::before,.ornament::after{content:"";height:1pt;background:#000;flex:1}.ornament span{font-size:10pt;line-height:1}
      .orderline{display:flex;justify-content:space-between;align-items:center;gap:4mm;margin-bottom:1.4mm;font-size:${num(cfg.meta_size_pt,8)}pt;font-weight:${weight}}.orderline strong{font:900 ${num(cfg.meta_size_pt,8)}pt/1.15 ui-monospace,SFMono-Regular,Consolas,monospace;direction:ltr;text-align:left}.orderline span{font-size:${num(cfg.meta_size_pt,8)}pt;font-weight:${weight}}.customer{border-top:1pt solid #000;border-bottom:1pt solid #000;padding:1.5mm 0;margin-bottom:2mm;font-size:${num(cfg.customer_size_pt,10.5)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.customer-main{display:flex;justify-content:space-between;gap:4mm}.customer b{font-size:${num(cfg.customer_size_pt,10.5)}pt;font-weight:${weight}}.phone{direction:ltr;display:inline-block;font-weight:${weight}}.address{margin-top:.7mm;font-size:${num(cfg.address_size_pt,9.5)}pt;font-weight:${weight}}
      .details-title{text-align:center;margin:0 0 1mm;font-size:${num(cfg.details_size_pt,17)}pt;font-weight:${weight}}.items{padding:0 1mm}.item{display:flex;align-items:baseline;gap:2mm;min-height:${num(cfg.row_min_height_mm,7)}mm;padding:${num(cfg.row_padding_mm,1)}mm 0;font-size:${num(cfg.item_size_pt,12)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.item-copy{display:flex;align-items:baseline;gap:1.2mm;min-width:0}.item-copy::before{content:"◆";font-size:7pt;flex:none}.item b{font-weight:${weight}}.item-leader{min-width:12mm;flex:1;border-bottom:${num(cfg.leader_width_pt,1.5)}pt ${leaderStyle} #000;transform:translateY(-1.2mm)}.item strong{min-width:27mm;white-space:nowrap;font-size:${num(cfg.price_size_pt,12)}pt;font-weight:${weight};direction:ltr;text-align:left}.option{display:inline;font-size:${num(cfg.option_size_pt,9.5)}pt;color:#000;font-weight:${weight}}.option::before{content:" — "}.delivery-item,.delivery-item .option{color:#000}
      .notes{margin-top:1.5mm;padding:1.5mm 0;border-top:1pt solid #000;font-size:${num(cfg.notes_size_pt,9.5)}pt;font-weight:${weight};line-height:${num(cfg.line_height,1.25)}}.totals{margin-top:2mm;border:${num(cfg.total_border_pt,2)}pt solid #000;border-radius:2mm;padding:2mm 4mm;display:grid;gap:1mm}.row{display:flex;justify-content:space-between;gap:5mm;font-size:${Math.max(8,num(cfg.total_size_pt,16)-4)}pt;font-weight:${weight}}.row b{white-space:nowrap;direction:ltr}.row.grand{font-size:${num(cfg.total_size_pt,16)}pt;font-weight:${weight}}.footer{text-align:center;margin-top:${num(cfg.footer_spacing_mm,2.5)}mm;font-size:${num(cfg.footer_size_pt,15)}pt;font-weight:${weight}}.footer::before{content:"◆";display:block;font-size:9pt;margin-bottom:1mm}
    </style></head><body><div class="label" data-pasha-invoice-canvas-source="1">
      <div class="brand" aria-label="Pasha Baby">${logo}<div class="brand-copy">${cfg.show_brand_title ? `<h1>${text(cfg.brand_title || 'PASHA BABY')}</h1>` : ''}${cfg.show_brand_subtitle ? `<div class="brand-ar">${text(cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE')}</div>` : ''}</div></div>
      <div class="ornament" aria-hidden="true"><span>◆</span></div>
      ${(cfg.show_order_number || cfg.show_date_time) ? `<div class="orderline">${cfg.show_order_number ? `<strong>${text(order.order_number)}</strong>` : '<span></span>'}${cfg.show_date_time ? `<span>${whenText(order.created_at)}</span>` : ''}</div>` : ''}
      <div class="customer"><div class="customer-main"><b>${text(order.customer_name || 'زبون')}</b><span>${cfg.show_customer_phone ? `<span class="phone">${text(order.customer_phone)}</span>` : ''}${cfg.show_order_type ? `${cfg.show_customer_phone ? ' · ' : ''}${order.order_type === 'delivery' ? 'توصيل' : 'استلام'}` : ''}</span></div>${cfg.show_customer_address && order.address ? `<div class="address">العنوان: ${text(order.address)}</div>` : ''}</div>
      ${cfg.show_details_title ? `<div class="details-title">${text(cfg.details_title || 'تفاصيل الطلب')}</div>` : ''}
      <div class="items">${itemRows}${deliveryRow}</div>
      ${cfg.show_notes && notes ? `<div class="notes"><b>ملاحظة:</b> ${text(notes)}</div>` : ''}
      <div class="totals">${cfg.show_subtotal && Number(fee || 0) > 0 ? `<div class="row"><span>مجموع الأصناف</span><b>${moneyText(order.subtotal)}</b></div>` : ''}<div class="row grand"><span>المجموع الكلي</span><b>${moneyText(order.total)}</b></div></div>
      ${cfg.show_footer ? `<div class="footer">${text(cfg.footer_text || 'شكراً لاختياركم')}</div>` : ''}
    </div></body></html>`;
  }

  function waitImages(doc) {
    return Promise.all(Array.from(doc.images || []).map(image => {
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

  async function loadHtml2Canvas(win) {
    if (typeof win.html2canvas === 'function') return win.html2canvas;
    let lastError = null;
    for (let index = 0; index < HTML2CANVAS_SOURCES.length; index += 1) {
      const src = HTML2CANVAS_SOURCES[index];
      try {
        await timeout(new Promise((resolve, reject) => {
          const script = win.document.createElement('script');
          script.src = src;
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.onload = () => typeof win.html2canvas === 'function'
            ? resolve()
            : reject(new Error('تم تنزيل محرك الرسم لكن لم يبدأ.'));
          script.onerror = () => reject(new Error('تعذر تنزيل محرك الرسم.'));
          win.document.head.appendChild(script);
        }), 12000, 'انتهت مهلة تنزيل محرك رسم الفاتورة.');
        return win.html2canvas;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('تعذر تشغيل محرك رسم الفاتورة.');
  }

  async function installAndVerifyFont(win, fontDataUrl, cfg) {
    const doc = win.document;
    const weight = Math.max(100, Math.min(900, num(cfg.font_weight, 900)));
    const size = num(cfg.base_size_pt, 12);
    const query = `${weight} ${size}pt "Pasha Invoice Custom"`;

    if (!doc.fonts) throw new Error('هذا المتصفح لا يدعم التحقق من خط الفاتورة.');
    if (typeof win.FontFace === 'function') {
      const face = new win.FontFace('Pasha Invoice Custom', `url(${JSON.stringify(fontDataUrl)})`, {
        style: 'normal',
        weight: String(weight),
        display: 'block'
      });
      const loaded = await timeout(face.load(), 12000, 'انتهت مهلة تحميل الخط المرفوع.');
      doc.fonts.add(loaded);
    }

    await timeout(doc.fonts.load(query, 'باشا بيبي تفاصيل الطلب محمد'), 12000, 'انتهت مهلة تفعيل الخط المرفوع.');
    await timeout(doc.fonts.ready, 12000, 'انتهت مهلة تثبيت الخط المرفوع.');
    if (!doc.fonts.check(query, 'باشا بيبي تفاصيل الطلب محمد')) {
      throw new Error('الخط المرفوع لم يُطبق داخل محرك الرسم، لذلك أوقفت إنشاء PDF بدل استخدام خط بديل.');
    }
  }

  function createRenderFrame(html, cfg) {
    const metrics = pageMetrics(cfg);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;left:-100000px;top:0;width:${Math.ceil(metrics.contentWidth * PX_PER_MM) + 4}px;height:1200px;border:0;opacity:0;pointer-events:none;background:#fff;`;
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      throw new Error('تعذر إنشاء صفحة داخلية لرسم الفاتورة.');
    }
    doc.open();
    doc.write(html);
    doc.close();
    return frame;
  }

  async function renderCanvas(frame, cfg, fontDataUrl) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) throw new Error('تعذر الوصول إلى صفحة رسم الفاتورة.');

    await installAndVerifyFont(win, fontDataUrl, cfg);
    await waitImages(doc);
    await nextTwoFrames(win);

    const label = doc.querySelector('[data-pasha-invoice-canvas-source="1"]');
    if (!label) throw new Error('تعذر العثور على الفاتورة داخل مساحة الرسم.');

    const html2canvas = await loadHtml2Canvas(win);
    await nextTwoFrames(win);

    const rect = label.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.ceil(Math.max(rect.width, label.scrollWidth)));
    const cssHeight = Math.max(1, Math.ceil(Math.max(rect.height, label.scrollHeight)));
    const maxPixels = 14_000_000;
    const maxDimension = 4096;
    const requestedScale = 2.25;
    const pixelScale = Math.sqrt(maxPixels / Math.max(1, cssWidth * cssHeight));
    const dimensionScale = maxDimension / Math.max(cssWidth, cssHeight);
    const scale = Math.max(1, Math.min(requestedScale, pixelScale, dimensionScale));

    const canvas = await timeout(html2canvas(label, {
      backgroundColor: '#ffffff',
      scale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      removeContainer: true,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
      windowWidth: cssWidth,
      windowHeight: cssHeight,
      onclone: clonedDoc => {
        const clonedLabel = clonedDoc.querySelector('[data-pasha-invoice-canvas-source="1"]');
        if (clonedLabel) clonedLabel.style.fontFamily = '"Pasha Invoice Custom",Tahoma,Arial,sans-serif';
      }
    }), 25000, 'انتهت مهلة رسم الفاتورة مباشرة من المتصفح.');

    if (!canvas || canvas.width < 10 || canvas.height < 10) throw new Error('فشل رسم الفاتورة كصورة عالية الدقة.');
    return canvas;
  }

  function pdfFromCanvas(jsPDF, canvas, cfg) {
    const metrics = pageMetrics(cfg);
    const doc = new jsPDF({
      orientation: metrics.orientation,
      unit: 'mm',
      format: String(cfg.page_size || 'A4').toLowerCase() === 'letter' ? 'letter' : String(cfg.page_size || 'A4').toLowerCase()
    });

    const pxPerMm = canvas.width / metrics.contentWidth;
    const pageSlicePx = Math.max(1, Math.floor(metrics.contentHeight * pxPerMm));
    let sourceY = 0;
    let pageCount = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pageSlicePx, canvas.height - sourceY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('تعذر تجهيز صفحة PDF.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, slice.width, slice.height);

      if (pageCount > 0) doc.addPage(undefined, metrics.orientation);
      const heightMm = sliceHeight / pxPerMm;
      doc.addImage(slice.toDataURL('image/png'), 'PNG', metrics.margin, metrics.margin, metrics.contentWidth, heightMm, undefined, 'FAST');
      pageCount += 1;
      sourceY += sliceHeight;
    }

    return {
      blob: doc.output('blob'),
      pageCount,
      embeddedFont: 'browser-canvas:PashaInvoiceCustom',
      renderMode: RENDER_MODE
    };
  }

  async function create(options) {
    const { jsPDF, cfg = {}, fontBase64 = '' } = options || {};
    if (typeof jsPDF !== 'function') throw new Error('محرك PDF غير متاح.');
    if (!String(fontBase64 || '').trim()) throw new Error('بيانات الخط المرفوع غير موجودة.');

    const mime = detectFontMime(fontBase64);
    const fontDataUrl = `data:${mime};base64,${fontBase64}`;
    const html = makeInvoiceHtml(options, fontDataUrl);
    const frame = createRenderFrame(html, cfg);

    try {
      const canvas = await renderCanvas(frame, cfg, fontDataUrl);
      return pdfFromCanvas(jsPDF, canvas, cfg);
    } finally {
      frame.remove();
    }
  }

  window.PashaInvoicePdf = Object.freeze({ create, renderMode: RENDER_MODE });
})();
