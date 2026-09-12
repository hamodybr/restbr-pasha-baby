(() => {
  if (window.__PASHA_INVOICE_PRINT_V2__) return;
  window.__PASHA_INVOICE_PRINT_V2__ = true;

  const JS_PDF_SRC = 'js/vendor/jspdf-2.5.2.umd.min.js?v=2.5.2';
  const PDF_ENGINE_SRC = 'js/admin-invoice-pdf-onepage-v5.js?v=5.0';
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

  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';
  const when = value => {
    try {
      return englishDigits(new Date(value).toLocaleString('ar-IQ', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric', month: '2-digit', day: '2-digit',
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
    try {
      if (typeof supabaseClient !== 'undefined') return supabaseClient;
    } catch (_) {}
    return window.supabaseClient || null;
  }

  function invoiceSettings() {
    let raw = {};
    try {
      raw = (typeof adminRestaurantSettings !== 'undefined' && adminRestaurantSettings?.ui_design_settings?.invoice) || {};
    } catch (_) {}
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
          if (ready()) {
            clearInterval(timer);
            resolve();
          } else if (Date.now() - started > 12000) {
            clearInterval(timer);
            reject(new Error(`انتهت مهلة تحميل ${src}`));
          }
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
    await loadScript('pbInvoiceJsPdfV252', JS_PDF_SRC, () => typeof window.jspdf?.jsPDF === 'function');
    await loadScript('pbInvoiceOnePagePdfV5', PDF_ENGINE_SRC, () => typeof window.PashaInvoiceOnePagePdf?.create === 'function');
    if (window.PashaInvoiceOnePagePdf?.renderMode !== 'native-canvas-one-page-v5') {
      throw new Error('تم تحميل محرك PDF غير متوقع.');
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
    const response = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) throw new Error('الملف فارغ أو غير صالح.');
    return buffer;
  }

  async function urlToDataUrl(url) {
    const response = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الصورة.'));
      reader.readAsDataURL(blob);
    });
  }

  function writeStatus(popup, title, detail = '') {
    try {
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body{margin:0;min-height:100%;background:#111;color:#fff;font-family:Tahoma,Arial,sans-serif}body{display:grid;place-items:center;padding:28px;box-sizing:border-box}.box{width:min(92vw,520px);padding:26px;border:1px solid #333;border-radius:18px;background:#191919;text-align:center;box-shadow:0 18px 60px #0008}.spin{width:34px;height:34px;margin:0 auto 16px;border:4px solid #444;border-top-color:#fff;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}h1{margin:0 0 10px;font-size:20px}p{margin:0;color:#bbb;line-height:1.7;font-size:14px}</style></head><body><div class="box"><div class="spin"></div><h1>${title}</h1><p>${detail}</p></div></body></html>`);
      popup.document.close();
    } catch (_) {}
  }

  function writeError(popup, error) {
    const message = String(error?.message || error || 'خطأ غير معروف').replace(/[&<>]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
    try {
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تعذر تجهيز الفاتورة</title><style>html,body{margin:0;min-height:100%;background:#111;color:#fff;font-family:Tahoma,Arial,sans-serif}body{display:grid;place-items:center;padding:26px}.box{max-width:520px;padding:24px;border:1px solid #5a2929;border-radius:18px;background:#211414;text-align:center}h1{font-size:20px}p{color:#efc2c2;line-height:1.8}button{border:0;border-radius:12px;padding:12px 20px;font:800 15px inherit;cursor:pointer}</style></head><body><div class="box"><h1>تعذر تجهيز PDF</h1><p>${message}</p><button onclick="window.close()">إغلاق</button></div></body></html>`);
      popup.document.close();
    } catch (_) {}
  }

  async function generate(orderId, button) {
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      alert('اسمح بالنوافذ المنبثقة حتى تفتح فاتورة PDF.');
      return;
    }

    const oldText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = '⏳ جاري تجهيز صفحة واحدة…';
    }
    writeStatus(popup, 'جاري تجهيز PDF من صفحة واحدة', 'يتم تثبيت الخط داخل صورة الفاتورة أولاً، ثم إنشاء PDF حقيقي من صفحة واحدة.');

    try {
      await ensureEngines();
      const [order] = await Promise.all([fetchOrder(orderId)]);
      const cfg = invoiceSettings();
      const items = orderItemsWithColors(order);
      const notes = cleanOrderNotes(order.notes);
      const fee = Number(order.delivery_fee || 0);

      let fontBuffer = null;
      if (String(cfg.font_family || '') === 'custom') {
        const fontUrl = safeHttpsUrl(cfg.custom_font_url);
        if (!fontUrl) throw new Error('أنت مختار «الخط المرفوع»، لكن رابط الخط غير محفوظ. أعد رفع الخط واحفظ إعدادات الفاتورة.');
        writeStatus(popup, 'جاري تثبيت الخط المرفوع', cfg.custom_font_name ? `الخط: ${cfg.custom_font_name}` : 'لن يتم استخدام أي خط بديل إذا فشل الخط المرفوع.');
        try {
          fontBuffer = await fetchBuffer(fontUrl);
        } catch (error) {
          throw new Error(`تعذر تنزيل ملف الخط المرفوع نفسه: ${error?.message || error}`);
        }
      }

      let logoDataUrl = '';
      if (cfg.show_logo && cfg.logo_mode === 'image') {
        const logoUrl = safeHttpsUrl(cfg.logo_url);
        if (logoUrl) {
          try { logoDataUrl = await urlToDataUrl(logoUrl); }
          catch (error) { console.warn('Pasha invoice logo raster fallback:', error); }
        }
      }

      writeStatus(popup, 'جاري رسم الفاتورة', 'هذه المرة لا نرسل HTML إلى طابعة iPhone؛ الخط والتصميم يتحولان إلى صورة عالية الدقة داخل PDF.');
      const result = await window.PashaInvoiceOnePagePdf.create({
        jsPDF: window.jspdf.jsPDF,
        cfg,
        order,
        items,
        notes,
        fee,
        fontBuffer,
        logoDataUrl,
        money,
        when,
        itemOptionText,
        englishDigits
      });

      if (!(result?.blob instanceof Blob) || result.pageCount !== 1) {
        throw new Error('فشل ضمان الصفحة الواحدة؛ تم إيقاف الفاتورة بدلاً من إرسال ملف متعدد الصفحات.');
      }
      if (String(cfg.font_family || '') === 'custom' && result.customFontBaked !== true) {
        throw new Error('لم يتم تثبيت الخط المرفوع داخل صورة PDF؛ تم إيقاف الطباعة بدلاً من استخدام خط بديل.');
      }

      const blobUrl = URL.createObjectURL(result.blob);
      popup.location.replace(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
    } catch (error) {
      console.error('Pasha deterministic invoice PDF failed:', error);
      writeError(popup, error);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText || '🖨 PDF / طباعة ليزر واضحة';
      }
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
  window.PashaInvoicePrintV2 = Object.freeze({ generate, renderMode: 'pdf-first-one-page' });
})();
