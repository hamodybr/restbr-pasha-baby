(() => {
  if (window.__PASHA_INVOICE_PRINT_V9__) return;
  window.__PASHA_INVOICE_PRINT_V9__ = true;

  const FAST_PDF_SRC = 'js/admin-invoice-fast-pdf-ios-v1.js?v=1.1';
  const PDF_ENGINE_SRC = 'js/admin-invoice-pdf-onepage-v8.js?v=8.0';
  const SELECT = 'id,order_number,customer_id,customer_name,customer_phone,order_type,address,location_url,notes,status,subtotal,delivery_fee,total,created_at,updated_at,order_items(id,product_id,option_id,product_name,option_name,selected_color,quantity,unit_price,line_total)';

  const DEFAULTS = {
    page_size:'A4',page_orientation:'portrait',page_margin_mm:6,paper_min_height_mm:285,outer_padding_mm:8,
    frame_width_pt:3,frame_radius_mm:4,font_family:'modern_pro',font_weight:900,custom_font_url:'',custom_font_name:'',base_size_pt:12,line_height:1.25,
    logo_mode:'stamp',logo_url:'',logo_size_mm:27,title_size_pt:25,subtitle_size_pt:8,header_spacing_mm:2.5,meta_size_pt:8,
    customer_size_pt:10.5,address_size_pt:9.5,details_size_pt:17,item_size_pt:12,option_size_pt:9.5,price_size_pt:12,
    row_min_height_mm:7,row_padding_mm:1,leader_width_pt:1.5,leader_style:'dotted',notes_size_pt:9.5,total_size_pt:16,
    total_border_pt:2,footer_size_pt:15,footer_spacing_mm:2.5,brand_title:'PASHA BABY',brand_subtitle:'PREMIUM BABY BOUTIQUE',
    details_title:'تفاصيل الطلب',footer_text:'شكراً لاختياركم',show_logo:true,show_brand_title:true,show_brand_subtitle:true,
    show_order_number:true,show_date_time:true,show_customer_phone:true,show_customer_address:true,show_order_type:true,
    show_details_title:true,show_quantity:true,show_options:true,show_notes:true,show_subtotal:true,show_footer:true
  };

  let activeReadyUrls = [];

  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';
  const when = value => {
    try {
      return englishDigits(new Date(value).toLocaleString('ar-IQ', {
        timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }));
    } catch (_) { return englishDigits(String(value || '')); }
  };
  const itemKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function legacyColors(notes) {
    const queues = new Map();
    const text = String(notes || '');
    if (!/^🎨\s*الألوان:/m.test(text)) return queues;
    text.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*•\s*(.*?)\s*×\s*[0-9٠-٩۰-۹]+\s*:\s*(.+?)\s*$/);
      if (!match) return;
      const key = itemKey(match[1]);
      const color = String(match[2] || '').trim().slice(0, 80);
      if (!key || !color) return;
      if (!queues.has(key)) queues.set(key, []);
      queues.get(key).push(color);
    });
    return queues;
  }

  function orderItemsWithColors(order) {
    const queues = legacyColors(order?.notes);
    const rows = Array.isArray(order?.order_items) ? order.order_items : [];
    return rows.map(item => {
      const explicit = String(item?.selected_color || '').trim();
      if (explicit) return { ...item, selected_color: explicit };
      const queue = queues.get(itemKey(item?.product_name));
      return { ...item, selected_color: queue?.shift?.() || '' };
    });
  }

  function cleanOrderNotes(value) {
    return String(value || '')
      .replace(/^\s*🎨\s*الألوان:\s*\r?\n(?:\s*•[^\r\n]*(?:\r?\n|$))+\s*/i, '')
      .trim();
  }

  function itemOptionText(item) {
    const option = String(item?.option_name || '').trim();
    const color = String(item?.selected_color || '').trim();
    if (option && color) return `${option} • اللون: ${color}`;
    if (color) return `اللون: ${color}`;
    return option;
  }

  function client() {
    try { if (typeof supabaseClient !== 'undefined') return supabaseClient; } catch (_) {}
    return window.supabaseClient || null;
  }

  function invoiceSettings() {
    let raw = {};
    try { raw = (typeof adminRestaurantSettings !== 'undefined' && adminRestaurantSettings?.ui_design_settings?.invoice) || {}; } catch (_) {}
    if (window.PashaInvoiceSettings?.normalize) return window.PashaInvoiceSettings.normalize(raw);
    return { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  }

  function loadScript(id, src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        const started = Date.now();
        const timer = setInterval(() => {
          if (ready()) { clearInterval(timer); resolve(); }
          else if (Date.now() - started > 12000) { clearInterval(timer); reject(new Error(`انتهت مهلة تحميل ${src}`)); }
        }, 60);
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => ready() ? resolve() : reject(new Error(`تم تحميل ${src} لكن المحرك لم يبدأ.`));
      script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureEngines() {
    await loadScript('pbInvoiceFastPdfV11', FAST_PDF_SRC, () => typeof window.PashaFastSinglePagePdf === 'function');
    await loadScript('pbInvoiceOnePagePdfV8', PDF_ENGINE_SRC, () =>
      typeof window.PashaInvoiceOnePagePdf?.create === 'function' &&
      window.PashaInvoiceOnePagePdf?.renderMode === 'preview-matched-one-page-v8'
    );
    if (window.PashaInvoiceOnePagePdf?.renderMode !== 'preview-matched-one-page-v8') {
      throw new Error('تم تحميل محرك فاتورة قديم. حدّث الصفحة وحاول مرة أخرى.');
    }
  }

  async function fetchOrder(orderId) {
    const sb = client();
    if (!sb) throw new Error('قاعدة البيانات غير جاهزة. أعد فتح لوحة الإدارة وحاول مرة أخرى.');
    const result = await sb.from('orders').select(SELECT).eq('id', orderId).single();
    if (result.error) throw new Error(result.error.message || String(result.error));
    if (!result.data) throw new Error('تعذر العثور على الطلب.');
    return result.data;
  }

  async function fetchBuffer(url) {
    const response = await fetch(url, { cache: 'force-cache', mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) throw new Error('الملف فارغ أو غير صالح.');
    return buffer;
  }

  async function urlToDataUrl(url) {
    const response = await fetch(url, { cache: 'force-cache', mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الصورة.'));
      reader.readAsDataURL(blob);
    });
  }

  function overlay() {
    let root = document.getElementById('pbInvoiceForegroundOverlay');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'pbInvoiceForegroundOverlay';
    root.innerHTML = '<div class="pb-ifo-card"><div class="pb-ifo-spin"></div><h2 data-pb-ifo-title>جاري تجهيز الفاتورة</h2><p data-pb-ifo-detail>يتم العمل داخل الداشبورد حتى لا يوقف iPhone عملية الإنشاء.</p><button type="button" data-pb-ifo-close hidden>إغلاق</button></div>';
    const style = document.createElement('style');
    style.id = 'pbInvoiceForegroundOverlayStyle';
    style.textContent = '#pbInvoiceForegroundOverlay{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:24px;background:rgba(10,10,10,.94);color:#fff;font-family:Tahoma,Arial,sans-serif;direction:rtl}.pb-ifo-card{width:min(92vw,520px);padding:28px 22px;border:1px solid #3a3a3a;border-radius:22px;background:#181818;text-align:center;box-shadow:0 22px 80px #000a}.pb-ifo-spin{width:42px;height:42px;margin:0 auto 18px;border:5px solid #444;border-top-color:#fff;border-radius:50%;animation:pbifo .8s linear infinite}@keyframes pbifo{to{transform:rotate(360deg)}}.pb-ifo-card h2{margin:0 0 10px;font-size:22px}.pb-ifo-card p{margin:0;color:#bbb;line-height:1.8;font-size:14px}.pb-ifo-card button{margin-top:18px;border:0;border-radius:12px;padding:11px 22px;font:800 14px inherit;cursor:pointer}';
    document.head.appendChild(style);
    document.body.appendChild(root);
    root.querySelector('[data-pb-ifo-close]')?.addEventListener('click', () => root.remove());
    return root;
  }

  function setStatus(title, detail = '', error = false) {
    const root = overlay();
    const titleEl = root.querySelector('[data-pb-ifo-title]');
    const detailEl = root.querySelector('[data-pb-ifo-detail]');
    const spinner = root.querySelector('.pb-ifo-spin');
    const close = root.querySelector('[data-pb-ifo-close]');
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
    if (spinner) spinner.style.display = error ? 'none' : 'block';
    if (close) close.hidden = !error;
  }

  function clearOverlay() {
    document.getElementById('pbInvoiceForegroundOverlay')?.remove();
  }

  function revokeReadyUrls() {
    activeReadyUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
    activeReadyUrls = [];
  }

  function closePrintReady() {
    document.getElementById('pbInvoicePrintReady')?.remove();
    document.getElementById('pbInvoicePrintReadyStyle')?.remove();
    document.getElementById('pbInvoicePrintPageStyle')?.remove();
    document.documentElement.classList.remove('pb-invoice-print-ready-open');
    revokeReadyUrls();
  }

  async function extractEmbeddedJpeg(pdfBlob) {
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    let start = -1;
    for (let i = 0; i < bytes.length - 1; i += 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) { start = i; break; }
    }
    if (start < 0) throw new Error('تعذر استخراج صورة الفاتورة الجاهزة للطباعة.');
    let end = -1;
    for (let i = bytes.length - 2; i > start; i -= 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) { end = i + 2; break; }
    }
    if (end <= start) throw new Error('صورة الفاتورة داخل PDF غير مكتملة.');
    return new Blob([bytes.slice(start, end)], { type: 'image/jpeg' });
  }

  function pageCss(cfg) {
    const sizeRaw = String(cfg.page_size || 'A4').toUpperCase();
    const size = sizeRaw === 'A5' ? 'A5' : sizeRaw === 'LETTER' ? 'Letter' : 'A4';
    const orientation = String(cfg.page_orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
    const margin = Math.max(0, Math.min(20, Number(cfg.page_margin_mm || 6)));
    return `@page{size:${size} ${orientation};margin:${margin}mm}`;
  }

  async function showPrintReady(pdfBlob, cfg, order) {
    closePrintReady();
    const jpegBlob = await extractEmbeddedJpeg(pdfBlob);
    const imageUrl = URL.createObjectURL(jpegBlob);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    activeReadyUrls = [imageUrl, pdfUrl];

    const style = document.createElement('style');
    style.id = 'pbInvoicePrintReadyStyle';
    style.textContent = `
      #pbInvoicePrintReady{position:fixed;inset:0;z-index:2147483645;background:#090909;color:#fff;overflow:auto;-webkit-overflow-scrolling:touch;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl}
      .pb-ipr-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:calc(10px + env(safe-area-inset-top)) 10px 10px;background:rgba(10,10,10,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid #333}
      .pb-ipr-toolbar button{min-height:44px;border:1px solid #3b3b3b;border-radius:13px;padding:10px 16px;background:#1a1a1a;color:#fff;font:800 14px/1.1 inherit;cursor:pointer}
      .pb-ipr-toolbar [data-pb-print-now]{background:#fff;color:#111;border-color:#fff;min-width:150px}
      .pb-ipr-toolbar button:disabled{opacity:.5;cursor:wait}
      .pb-ipr-info{width:100%;text-align:center;color:#aaa;font-size:11px;line-height:1.5}
      .pb-ipr-stage{min-height:calc(100dvh - 92px);display:flex;justify-content:center;align-items:flex-start;padding:14px 8px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box}
      .pb-ipr-paper{display:block;width:min(100%,820px);height:auto;background:#fff;box-shadow:0 12px 45px #000;border:0}
      @media(max-width:520px){.pb-ipr-toolbar button{flex:1;min-width:0;padding-inline:10px}.pb-ipr-toolbar [data-pb-print-now]{flex:1.35}.pb-ipr-stage{padding-inline:4px}}
      @media print{
        html,body{margin:0!important;padding:0!important;background:#fff!important;width:auto!important;height:auto!important;overflow:visible!important}
        body>*:not(#pbInvoicePrintReady){display:none!important}
        #pbInvoicePrintReady{position:static!important;inset:auto!important;display:block!important;background:#fff!important;color:#000!important;overflow:visible!important;width:100%!important;height:auto!important}
        #pbInvoicePrintReady .pb-ipr-toolbar{display:none!important}
        #pbInvoicePrintReady .pb-ipr-stage{display:block!important;min-height:0!important;padding:0!important;margin:0!important}
        #pbInvoicePrintReady .pb-ipr-paper{display:block!important;width:100%!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important;box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}
      }
    `;
    document.head.appendChild(style);

    const pageStyle = document.createElement('style');
    pageStyle.id = 'pbInvoicePrintPageStyle';
    pageStyle.textContent = pageCss(cfg);
    document.head.appendChild(pageStyle);

    const root = document.createElement('section');
    root.id = 'pbInvoicePrintReady';
    root.setAttribute('aria-label', 'فاتورة جاهزة للطباعة');
    const orderNumber = englishDigits(order?.order_number || '');
    root.innerHTML = `
      <div class="pb-ipr-toolbar" data-print-ui>
        <button type="button" data-pb-print-back>رجوع</button>
        <button type="button" data-pb-open-pdf>فتح PDF</button>
        <button type="button" data-pb-print-now disabled>🖨 طباعة الآن</button>
        <div class="pb-ipr-info">${orderNumber ? `الطلب ${orderNumber} · ` : ''}الفاتورة نفسها التي تم توليدها بـ V8</div>
      </div>
      <main class="pb-ipr-stage"><img class="pb-ipr-paper" data-pb-print-image alt="فاتورة Pasha Baby"></main>
    `;
    document.body.appendChild(root);
    document.documentElement.classList.add('pb-invoice-print-ready-open');

    const image = root.querySelector('[data-pb-print-image]');
    const printButton = root.querySelector('[data-pb-print-now]');
    if (image) {
      image.addEventListener('load', () => { if (printButton) printButton.disabled = false; }, { once: true });
      image.addEventListener('error', () => { if (printButton) printButton.disabled = true; }, { once: true });
      image.src = imageUrl;
    }

    // Keep the call synchronous inside the user click. iPhone Safari is much
    // more reliable when window.print() is invoked directly by the gesture.
    printButton?.addEventListener('click', () => window.print());
    root.querySelector('[data-pb-open-pdf]')?.addEventListener('click', () => window.location.assign(pdfUrl));
    root.querySelector('[data-pb-print-back]')?.addEventListener('click', closePrintReady);
  }

  async function generate(orderId, button) {
    const oldText = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = '⏳ جاري تجهيز صفحة واحدة…'; }
    setStatus('جاري تجهيز الفاتورة', 'V9 يستخدم نفس تصميم V8 ثم يعرض زر طباعة مباشر.');

    const stageHandler = (name, detail) => {
      const map = {
        font: 'جاري تثبيت الخط والشعار',
        render: 'جاري رسم الفاتورة',
        encode: 'جاري ضغط صفحة الفاتورة',
        pack: 'جاري إنشاء PDF من صفحة واحدة'
      };
      setStatus(map[name] || 'جاري تجهيز الفاتورة', detail || '');
    };
    window.__PASHA_INVOICE_PDF_STAGE__ = stageHandler;

    try {
      await ensureEngines();
      const order = await fetchOrder(orderId);
      const cfg = invoiceSettings();
      const items = orderItemsWithColors(order);
      const notes = cleanOrderNotes(order.notes);
      const fee = Number(order.delivery_fee || 0);
      const fontUrl = String(cfg.font_family || '') === 'custom' ? safeHttpsUrl(cfg.custom_font_url) : '';
      if (String(cfg.font_family || '') === 'custom' && !fontUrl) {
        throw new Error('أنت مختار «الخط المرفوع»، لكن رابط الخط غير محفوظ. أعد رفع الخط واحفظ إعدادات الفاتورة.');
      }
      const logoUrl = cfg.show_logo && cfg.logo_mode === 'image' ? safeHttpsUrl(cfg.logo_url) : '';

      const [fontResult, logoResult] = await Promise.allSettled([
        fontUrl ? fetchBuffer(fontUrl) : Promise.resolve(null),
        logoUrl ? urlToDataUrl(logoUrl) : Promise.resolve('')
      ]);
      if (fontResult.status === 'rejected') {
        throw new Error(`تعذر تنزيل ملف الخط المرفوع نفسه: ${fontResult.reason?.message || fontResult.reason}`);
      }
      const fontBuffer = fontResult.value;
      const logoDataUrl = logoResult.status === 'fulfilled' ? (logoResult.value || '') : '';

      const result = await window.PashaInvoiceOnePagePdf.create({
        PdfClass: window.PashaFastSinglePagePdf,
        cfg, order, items, notes, fee, fontBuffer, logoDataUrl,
        money, when, itemOptionText, englishDigits
      });
      if (!(result?.blob instanceof Blob) || result.pageCount !== 1) {
        throw new Error('فشل ضمان الصفحة الواحدة؛ تم إيقاف الفاتورة بدلاً من إنشاء ملف متعدد الصفحات.');
      }
      if (String(cfg.font_family || '') === 'custom' && result.customFontBaked !== true) {
        throw new Error('لم يتم تثبيت الخط المرفوع داخل الصورة النهائية.');
      }

      setStatus('تم تجهيز الفاتورة ✓', 'جاري فتح صفحة الطباعة…');
      await showPrintReady(result.blob, cfg, order);
      clearOverlay();
    } catch (error) {
      console.error('Pasha V9 invoice generation failed:', error);
      setStatus('تعذر تجهيز الفاتورة', String(error?.message || error || 'خطأ غير معروف'), true);
    } finally {
      if (window.__PASHA_INVOICE_PDF_STAGE__ === stageHandler) {
        try { delete window.__PASHA_INVOICE_PDF_STAGE__; } catch (_) { window.__PASHA_INVOICE_PDF_STAGE__ = null; }
      }
      if (button) { button.disabled = false; button.textContent = oldText || '🖨 PDF / طباعة'; }
    }
  }

  function capture(event) {
    const button = event.target?.closest?.('[data-print-order]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    void generate(button.dataset.printOrder, button);
  }

  document.addEventListener('click', capture, true);
  window.PashaInvoicePrintV9 = Object.freeze({
    generate,
    closePrintReady,
    renderMode: 'print-ready-preview-matched-v9'
  });
})();
