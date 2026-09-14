(() => {
  if (window.__PASHA_MANUAL_INVOICE_V1__) return;
  window.__PASHA_MANUAL_INVOICE_V1__ = true;

  const FAST_PDF_SRC = 'js/admin-invoice-fast-pdf-ios-v1.js?v=1.1';
  const PDF_ENGINE_SRC = 'js/admin-invoice-pdf-onepage-v8.js?v=8.2';

  const SNAPSHOT = Object.freeze({
    logo_url:'https://wlollfpmjzenhkjwxrqo.supabase.co/storage/v1/object/public/invoice-assets/settings/logos/1789220181344-o4lwqm.png',
    logo_mode:'image',page_size:'auto',show_logo:true,show_notes:true,brand_title:'PASHA BABY',font_family:'custom',font_weight:900,
    footer_text:'شكراً لاختياركم',line_height:1.5,show_footer:true,base_size_pt:8,item_size_pt:15,leader_style:'dotted',logo_size_mm:55,
    meta_size_pt:10,show_options:true,details_title:'تفاصيل الطلب',notes_size_pt:9.5,price_size_pt:15,show_quantity:true,show_subtotal:false,
    title_size_pt:19,total_size_pt:17,brand_subtitle:'PREMIUM BABY BOUTIQUE',footer_size_pt:10,frame_width_pt:2,option_size_pt:15,
    page_margin_mm:5,row_padding_mm:.75,show_date_time:true,address_size_pt:11,
    custom_font_url:'https://wlollfpmjzenhkjwxrqo.supabase.co/storage/v1/object/public/invoice-assets/settings/fonts/1789198685761-rapdwp.ttf',
    details_size_pt:15,frame_radius_mm:10,leader_width_pt:2.5,show_order_type:false,total_border_pt:1.5,custom_font_name:'Cairo-Bold.ttf',
    customer_size_pt:11,outer_padding_mm:3.5,page_orientation:'portrait',show_brand_title:true,subtitle_size_pt:6,footer_spacing_mm:0,
    header_spacing_mm:0,row_min_height_mm:6,show_order_number:true,show_details_title:false,paper_min_height_mm:285,show_brand_subtitle:true,
    show_customer_phone:true,show_customer_address:true
  });

  let rowSeed = 0;
  let manualUrls = [];
  let defaultsBridgeInstalled = false;

  const englishDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  const money = value => Number(value || 0).toLocaleString('en-US') + ' د.ع';
  const when = value => {
    try {
      return englishDigits(new Date(value).toLocaleString('ar-IQ', {
        timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
      }));
    } catch (_) { return englishDigits(String(value || '')); }
  };
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const liveSettings = () => {
    try {
      const ui = (typeof adminRestaurantSettings !== 'undefined' && adminRestaurantSettings?.ui_design_settings) || {};
      return ui && typeof ui === 'object' ? ui : {};
    } catch (_) { return {}; }
  };

  const savedSnapshot = () => {
    const raw = liveSettings().invoice_default_snapshot;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : SNAPSHOT;
  };

  function installDefaultsBridge() {
    if (defaultsBridgeInstalled) return true;
    const api = window.PashaInvoiceSettings;
    if (!api || typeof api.normalize !== 'function' || typeof api.render !== 'function') return false;
    const baseNormalize = api.normalize.bind(api);
    const normalize = raw => baseNormalize({ ...savedSnapshot(), ...(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) });
    window.PashaInvoiceSettings = { ...api, defaults: Object.freeze({ ...normalize({}) }), normalize };
    defaultsBridgeInstalled = true;

    document.addEventListener('click', event => {
      const button = event.target?.closest?.('[data-invoice-reset]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      if (confirm('ترجع تصميم الفاتورة إلى الإعدادات الافتراضية المحفوظة الحالية؟')) {
        window.PashaInvoiceSettings?.render?.(savedSnapshot());
      }
    }, true);
    return true;
  }

  function invoiceSettings() {
    const raw = liveSettings().invoice || {};
    if (window.PashaInvoiceSettings?.normalize) return window.PashaInvoiceSettings.normalize(raw);
    return { ...SNAPSHOT, ...(raw && typeof raw === 'object' ? raw : {}) };
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  }

  function parseNumber(value, fallback = 0) {
    const cleaned = englishDigits(value).replace(/[٬،,\s]/g,'').replace(/٫/g,'.');
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : fallback;
  }

  function itemOptionText(item) {
    const option = String(item?.option_name || '').trim();
    const color = String(item?.selected_color || '').trim();
    if (option && color) return `${option} • اللون: ${color}`;
    if (color) return `اللون: ${color}`;
    return option;
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
      throw new Error('محرك الفاتورة غير جاهز. حدّث الصفحة وحاول مرة أخرى.');
    }
  }

  async function fetchBuffer(url) {
    const response = await fetch(url, { cache:'force-cache',mode:'cors',credentials:'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) throw new Error('ملف الخط فارغ أو غير صالح.');
    return buffer;
  }

  async function urlToDataUrl(url) {
    const response = await fetch(url, { cache:'force-cache',mode:'cors',credentials:'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الشعار.'));
      reader.readAsDataURL(blob);
    });
  }

  async function extractEmbeddedJpeg(pdfBlob) {
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    let start = -1;
    for (let i = 0; i < bytes.length - 1; i += 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) { start = i; break; }
    }
    if (start < 0) throw new Error('تعذر استخراج صورة الفاتورة.');
    let end = -1;
    for (let i = bytes.length - 2; i > start; i -= 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) { end = i + 2; break; }
    }
    if (end <= start) throw new Error('صورة الفاتورة داخل PDF غير مكتملة.');
    return new Blob([bytes.slice(start, end)], { type:'image/jpeg' });
  }

  function revokeManualUrls() {
    manualUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
    manualUrls = [];
  }

  function closePrintReady() {
    document.getElementById('pbInvoicePrintReady')?.remove();
    document.getElementById('pbManualInvoicePrintStyle')?.remove();
    document.getElementById('pbManualInvoicePageStyle')?.remove();
    document.documentElement.classList.remove('pb-invoice-print-ready-open');
    revokeManualUrls();
  }

  function pageCss(cfg) {
    const sizeRaw = String(cfg.page_size || 'A4').toUpperCase();
    const size = sizeRaw === 'A5' ? 'A5' : sizeRaw === 'LETTER' ? 'Letter' : 'A4';
    const orientation = String(cfg.page_orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
    return `@page{size:${size} ${orientation};margin:0}`;
  }

  async function showPrintReady(pdfBlob, cfg, order) {
    window.PashaInvoicePrintV9?.closePrintReady?.();
    closePrintReady();
    const jpegBlob = await extractEmbeddedJpeg(pdfBlob);
    const imageUrl = URL.createObjectURL(jpegBlob);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    manualUrls = [imageUrl, pdfUrl];

    const style = document.createElement('style');
    style.id = 'pbManualInvoicePrintStyle';
    style.textContent = `
      #pbInvoicePrintReady{position:fixed;inset:0;z-index:2147483645;background:#090909;color:#fff;overflow:auto;-webkit-overflow-scrolling:touch;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl}
      #pbInvoicePrintReady .pb-ipr-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:calc(10px + env(safe-area-inset-top)) 10px 10px;background:rgba(10,10,10,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid #333}
      #pbInvoicePrintReady .pb-ipr-toolbar button{min-height:44px;border:1px solid #3b3b3b;border-radius:13px;padding:10px 16px;background:#1a1a1a;color:#fff;font:800 14px/1.1 inherit;cursor:pointer}
      #pbInvoicePrintReady .pb-ipr-toolbar [data-pb-print-now]{background:#fff;color:#111;border-color:#fff;min-width:150px}
      #pbInvoicePrintReady .pb-ipr-toolbar button:disabled{opacity:.5;cursor:wait}
      #pbInvoicePrintReady .pb-ipr-info{width:100%;text-align:center;color:#aaa;font-size:11px;line-height:1.5}
      #pbInvoicePrintReady .pb-ipr-stage{min-height:calc(100dvh - 92px);display:flex;justify-content:center;align-items:flex-start;padding:14px 8px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box}
      #pbInvoicePrintReady .pb-ipr-paper{display:block;width:min(100%,820px);height:auto;background:#fff;box-shadow:0 12px 45px #000;border:0}
      @media(max-width:520px){#pbInvoicePrintReady .pb-ipr-toolbar button{flex:1;min-width:0;padding-inline:10px}#pbInvoicePrintReady .pb-ipr-toolbar [data-pb-print-now]{flex:1.35}#pbInvoicePrintReady .pb-ipr-stage{padding-inline:4px}}
      @media print{html,body{margin:0!important;padding:0!important;background:#fff!important}body>*:not(#pbInvoicePrintReady){display:none!important}#pbInvoicePrintReady{position:static!important;background:#fff!important;overflow:visible!important}#pbInvoicePrintReady .pb-ipr-toolbar{display:none!important}#pbInvoicePrintReady .pb-ipr-stage{display:block!important;min-height:0!important;padding:0!important}#pbInvoicePrintReady .pb-ipr-paper{display:block!important;width:100%!important;max-width:none!important;height:auto!important;margin:0!important;box-shadow:none!important}}
    `;
    document.head.appendChild(style);

    const pageStyle = document.createElement('style');
    pageStyle.id = 'pbManualInvoicePageStyle';
    pageStyle.textContent = pageCss(cfg);
    document.head.appendChild(pageStyle);

    const root = document.createElement('section');
    root.id = 'pbInvoicePrintReady';
    root.setAttribute('aria-label','فاتورة خارجية جاهزة للطباعة');
    root.innerHTML = `
      <div class="pb-ipr-toolbar" data-print-ui>
        <button type="button" data-pb-print-back>رجوع</button>
        <button type="button" data-pb-open-pdf>فتح PDF</button>
        <button type="button" data-pb-print-now disabled>🖨 طباعة PDF</button>
        <div class="pb-ipr-info">فاتورة خارجية ${esc(order.order_number)} · نفس تصميم الفاتورة الحالي</div>
      </div>
      <main class="pb-ipr-stage"><img class="pb-ipr-paper" data-pb-print-image alt="فاتورة خارجية Pasha Baby"></main>`;
    document.body.appendChild(root);
    document.documentElement.classList.add('pb-invoice-print-ready-open');

    const image = root.querySelector('[data-pb-print-image]');
    if (image) image.src = imageUrl;
    root.querySelector('[data-pb-open-pdf]')?.addEventListener('click', () => window.location.assign(pdfUrl));
    root.querySelector('[data-pb-print-back]')?.addEventListener('click', closePrintReady);
    window.PashaInvoicePdfNativeShareV11?.sync?.();
  }

  function injectStyles() {
    if (document.getElementById('pbManualInvoiceStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbManualInvoiceStyles';
    style.textContent = `
      #pbManualInvoiceModal{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;padding:12px;background:rgba(0,0,0,.75);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);direction:rtl}
      #pbManualInvoiceModal.open{display:flex}.pb-mi-card{width:min(760px,100%);max-height:94dvh;overflow:auto;border:1px solid rgba(216,169,88,.3);border-radius:24px 24px 15px 15px;background:#0d0a07;color:#f5f1ec;box-shadow:0 24px 90px #000b;padding:16px}
      .pb-mi-head{position:sticky;top:-16px;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 2px 14px;background:#0d0a07;border-bottom:1px solid rgba(255,255,255,.07)}.pb-mi-head h2{margin:0;font-size:20px}.pb-mi-head small{display:block;margin-top:4px;color:#9f968d;font-size:11px}.pb-mi-close{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);border-radius:50%;background:#1c1712;color:#fff;font-size:23px}
      .pb-mi-note{margin:12px 0;padding:10px 12px;border:1px solid rgba(92,190,157,.2);border-radius:12px;background:rgba(92,190,157,.07);color:#b7dfd1;font-size:11px;line-height:1.7}.pb-mi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pb-mi-field{display:flex;flex-direction:column;gap:6px}.pb-mi-field.full{grid-column:1/-1}.pb-mi-field span{font-size:11px;color:#b2a89e;font-weight:800}.pb-mi-field input,.pb-mi-field textarea{width:100%;min-width:0;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#090705;color:#fff;padding:11px 12px;font:inherit;font-size:16px;outline:none}.pb-mi-field textarea{min-height:72px;resize:vertical}.pb-mi-field input:focus,.pb-mi-field textarea:focus{border-color:#d8a958;box-shadow:0 0 0 3px rgba(216,169,88,.08)}
      .pb-mi-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:17px 0 8px}.pb-mi-section-title h3{margin:0;font-size:14px}.pb-mi-add{border:1px solid rgba(216,169,88,.25);border-radius:10px;background:rgba(216,169,88,.09);color:#e9c786;padding:8px 10px;font:800 11px inherit}.pb-mi-items{display:grid;gap:9px}.pb-mi-item{position:relative;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) minmax(0,1fr);gap:7px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025)}.pb-mi-item .wide{grid-column:span 2}.pb-mi-item label{display:flex;flex-direction:column;gap:5px;min-width:0}.pb-mi-item label span{font-size:9px;color:#928a82}.pb-mi-item input{width:100%;min-width:0;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:#080604;color:#fff;padding:9px;font:inherit;font-size:15px;outline:none}.pb-mi-remove{position:absolute;top:7px;left:7px;width:28px;height:28px;border:1px solid rgba(248,113,113,.3);border-radius:9px;background:#2a1010;color:#fecaca;font:900 16px/1 inherit}.pb-mi-total{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:12px;border:1px solid rgba(216,169,88,.22);border-radius:13px;background:rgba(216,169,88,.06);font-weight:900}.pb-mi-total b{font-size:20px;color:#e2b55e}.pb-mi-actions{position:sticky;bottom:-16px;z-index:4;display:flex;gap:8px;margin-top:14px;padding:14px 0 2px;background:#0d0a07}.pb-mi-actions button{flex:1;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px;background:#19140f;color:#eee;font:900 12px inherit}.pb-mi-actions .primary{background:linear-gradient(135deg,#e2b55e,#b77b2b);color:#1a1007;border-color:#d7a94f}.pb-mi-actions button:disabled{opacity:.55;cursor:wait}.pb-mi-error{display:none;margin-top:10px;padding:10px;border-radius:10px;background:#351414;color:#fecaca;font-size:11px}.pb-mi-error.show{display:block}
      body.admin-global-light #pbManualInvoiceModal .pb-mi-card{background:#fffaf4;color:#33291f}body.admin-global-light #pbManualInvoiceModal .pb-mi-head,body.admin-global-light #pbManualInvoiceModal .pb-mi-actions{background:#fffaf4}body.admin-global-light #pbManualInvoiceModal input,body.admin-global-light #pbManualInvoiceModal textarea{background:#fff;color:#33291f;border-color:rgba(86,57,19,.14)}body.admin-global-light #pbManualInvoiceModal .pb-mi-item{background:#fff;border-color:rgba(86,57,19,.12)}
      @media(max-width:620px){.pb-mi-grid{grid-template-columns:1fr}.pb-mi-field.full{grid-column:auto}.pb-mi-item{grid-template-columns:1fr 1fr}.pb-mi-item .wide{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function itemMarkup() {
    rowSeed += 1;
    return `<div class="pb-mi-item" data-mi-item="${rowSeed}">
      <button class="pb-mi-remove" type="button" data-mi-remove aria-label="حذف الصنف">×</button>
      <label class="wide"><span>اسم الصنف *</span><input type="text" data-mi-name placeholder="مثال: حفاضات أطفال"></label>
      <label><span>التفاصيل / الخيار</span><input type="text" data-mi-option placeholder="مثال: قياس 3"></label>
      <label><span>اللون</span><input type="text" data-mi-color placeholder="اختياري"></label>
      <label><span>الكمية *</span><input type="text" inputmode="numeric" data-mi-qty value="1"></label>
      <label><span>سعر الوحدة *</span><input type="text" inputmode="numeric" data-mi-price placeholder="0"></label>
    </div>`;
  }

  function ensureModal() {
    let root = document.getElementById('pbManualInvoiceModal');
    if (root) return root;
    injectStyles();
    root = document.createElement('div');
    root.id = 'pbManualInvoiceModal';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.innerHTML = `<div class="pb-mi-card">
      <div class="pb-mi-head"><div><h2>فاتورة خارجية</h2><small>أدخل البيانات فقط — التصميم والطباعة نفس الفاتورة الحالية</small></div><button class="pb-mi-close" type="button" data-mi-close>×</button></div>
      <div class="pb-mi-note">هذه الفاتورة لا تُنشئ طلبًا ولا زبونًا في قاعدة البيانات. فقط تولّد PDF بنفس إعدادات Pasha Baby الحالية.</div>
      <div class="pb-mi-grid">
        <label class="pb-mi-field"><span>اسم الزبون</span><input type="text" data-mi-customer placeholder="زبون"></label>
        <label class="pb-mi-field"><span>رقم الهاتف</span><input type="tel" inputmode="tel" data-mi-phone placeholder="0750..."></label>
        <label class="pb-mi-field full"><span>العنوان</span><input type="text" data-mi-address placeholder="دهوك — ..."></label>
        <label class="pb-mi-field"><span>رقم الفاتورة</span><input type="text" data-mi-number placeholder="يُنشأ تلقائياً إذا تركته فارغاً"></label>
        <label class="pb-mi-field"><span>أجور التوصيل</span><input type="text" inputmode="numeric" data-mi-fee value="0"></label>
        <label class="pb-mi-field full"><span>ملاحظات</span><textarea data-mi-notes placeholder="اختياري"></textarea></label>
      </div>
      <div class="pb-mi-section-title"><h3>الأصناف</h3><button class="pb-mi-add" type="button" data-mi-add>＋ إضافة صنف</button></div>
      <div class="pb-mi-items" data-mi-items>${itemMarkup()}</div>
      <div class="pb-mi-total"><span>المجموع الكلي</span><b data-mi-total>0 د.ع</b></div>
      <div class="pb-mi-error" data-mi-error></div>
      <div class="pb-mi-actions"><button type="button" data-mi-clear>تفريغ</button><button class="primary" type="button" data-mi-generate>🧾 توليد الفاتورة</button></div>
    </div>`;
    document.body.appendChild(root);

    root.querySelector('[data-mi-close]')?.addEventListener('click', () => root.classList.remove('open'));
    root.addEventListener('click', event => { if (event.target === root) root.classList.remove('open'); });
    root.querySelector('[data-mi-add]')?.addEventListener('click', () => {
      root.querySelector('[data-mi-items]')?.insertAdjacentHTML('beforeend', itemMarkup());
    });
    root.querySelector('[data-mi-clear]')?.addEventListener('click', () => resetForm(root));
    root.querySelector('[data-mi-generate]')?.addEventListener('click', event => void generateManual(root, event.currentTarget));
    root.addEventListener('click', event => {
      const remove = event.target?.closest?.('[data-mi-remove]');
      if (!remove) return;
      const rows = root.querySelectorAll('[data-mi-item]');
      if (rows.length <= 1) {
        rows[0]?.querySelectorAll('input').forEach(input => { input.value = input.hasAttribute('data-mi-qty') ? '1' : ''; });
      } else remove.closest('[data-mi-item]')?.remove();
      recalc(root);
    });
    root.addEventListener('input', event => {
      if (event.target?.matches?.('[data-mi-qty],[data-mi-price],[data-mi-fee]')) {
        event.target.value = englishDigits(event.target.value);
        recalc(root);
      }
    });
    return root;
  }

  function resetForm(root) {
    root.querySelector('[data-mi-customer]').value = '';
    root.querySelector('[data-mi-phone]').value = '';
    root.querySelector('[data-mi-address]').value = '';
    root.querySelector('[data-mi-number]').value = '';
    root.querySelector('[data-mi-fee]').value = '0';
    root.querySelector('[data-mi-notes]').value = '';
    const items = root.querySelector('[data-mi-items]');
    if (items) items.innerHTML = itemMarkup();
    const error = root.querySelector('[data-mi-error]');
    if (error) { error.textContent = ''; error.classList.remove('show'); }
    recalc(root);
  }

  function recalc(root) {
    let subtotal = 0;
    root.querySelectorAll('[data-mi-item]').forEach(row => {
      const qty = Math.max(0, parseNumber(row.querySelector('[data-mi-qty]')?.value, 0));
      const price = Math.max(0, parseNumber(row.querySelector('[data-mi-price]')?.value, 0));
      subtotal += qty * price;
    });
    const fee = Math.max(0, parseNumber(root.querySelector('[data-mi-fee]')?.value, 0));
    const total = root.querySelector('[data-mi-total]');
    if (total) total.textContent = money(subtotal + fee);
    return { subtotal, fee, total: subtotal + fee };
  }

  function autoNumber() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:'Asia/Baghdad',year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(new Date()).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
    return `EXT-${parts.year || ''}${parts.month || ''}${parts.day || ''}-${parts.hour || ''}${parts.minute || ''}`;
  }

  function readOrder(root) {
    const items = [];
    root.querySelectorAll('[data-mi-item]').forEach((row, index) => {
      const name = String(row.querySelector('[data-mi-name]')?.value || '').trim();
      const option = String(row.querySelector('[data-mi-option]')?.value || '').trim();
      const color = String(row.querySelector('[data-mi-color]')?.value || '').trim();
      const qty = parseNumber(row.querySelector('[data-mi-qty]')?.value, 0);
      const price = parseNumber(row.querySelector('[data-mi-price]')?.value, NaN);
      if (!name && !Number.isFinite(price)) return;
      if (!name) throw new Error(`اكتب اسم الصنف رقم ${index + 1}.`);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`الكمية في الصنف رقم ${index + 1} غير صحيحة.`);
      if (!Number.isFinite(price) || price < 0) throw new Error(`السعر في الصنف رقم ${index + 1} غير صحيح.`);
      items.push({
        id:`manual-${index + 1}`,product_id:null,option_id:null,product_name:name,option_name:option,selected_color:color,
        quantity:qty,unit_price:price,line_total:qty * price
      });
    });
    if (!items.length) throw new Error('أضف صنفًا واحدًا على الأقل.');
    const fee = Math.max(0, parseNumber(root.querySelector('[data-mi-fee]')?.value, 0));
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
    const orderNumber = String(root.querySelector('[data-mi-number]')?.value || '').trim() || autoNumber();
    return {
      id:`manual-${Date.now()}`,order_number:orderNumber,customer_id:null,
      customer_name:String(root.querySelector('[data-mi-customer]')?.value || '').trim() || 'زبون',
      customer_phone:String(root.querySelector('[data-mi-phone]')?.value || '').trim(),
      order_type:fee > 0 ? 'delivery' : 'takeaway',
      address:String(root.querySelector('[data-mi-address]')?.value || '').trim(),location_url:'',
      notes:String(root.querySelector('[data-mi-notes]')?.value || '').trim(),status:'manual',subtotal,delivery_fee:fee,total:subtotal + fee,
      created_at:new Date().toISOString(),updated_at:new Date().toISOString(),order_items:items
    };
  }

  function statusOverlay(title, detail, error = false) {
    let root = document.getElementById('pbManualInvoiceWorking');
    if (!root) {
      root = document.createElement('div');
      root.id = 'pbManualInvoiceWorking';
      root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:24px;background:rgba(10,10,10,.94);color:#fff;font-family:Tahoma,Arial,sans-serif;direction:rtl';
      root.innerHTML = '<div style="width:min(92vw,520px);padding:28px 22px;border:1px solid #3a3a3a;border-radius:22px;background:#181818;text-align:center"><div data-mi-spin style="width:42px;height:42px;margin:0 auto 18px;border:5px solid #444;border-top-color:#fff;border-radius:50%;animation:pbMiSpin .8s linear infinite"></div><h2 data-mi-working-title style="margin:0 0 10px;font-size:22px"></h2><p data-mi-working-detail style="margin:0;color:#bbb;line-height:1.8;font-size:14px"></p><button type="button" data-mi-working-close hidden style="margin-top:18px;border:0;border-radius:12px;padding:11px 22px;font-weight:800">إغلاق</button></div>';
      const anim = document.createElement('style');
      anim.id = 'pbManualInvoiceSpinStyle';
      anim.textContent = '@keyframes pbMiSpin{to{transform:rotate(360deg)}}';
      document.head.appendChild(anim);
      document.body.appendChild(root);
      root.querySelector('[data-mi-working-close]')?.addEventListener('click', () => root.remove());
    }
    root.querySelector('[data-mi-working-title]').textContent = title;
    root.querySelector('[data-mi-working-detail]').textContent = detail || '';
    const spin = root.querySelector('[data-mi-spin]'); if (spin) spin.style.display = error ? 'none' : 'block';
    const close = root.querySelector('[data-mi-working-close]'); if (close) close.hidden = !error;
    return root;
  }

  async function generateManual(root, button) {
    const errorBox = root.querySelector('[data-mi-error]');
    if (errorBox) { errorBox.textContent = ''; errorBox.classList.remove('show'); }
    let order;
    try { order = readOrder(root); }
    catch (error) {
      if (errorBox) { errorBox.textContent = error.message || String(error); errorBox.classList.add('show'); }
      return;
    }

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = '⏳ جاري التوليد…';
    statusOverlay('جاري تجهيز الفاتورة الخارجية','نستخدم نفس محرك الفاتورة والطباعة الحالي.');
    const stageHandler = (name, detail) => {
      const titles = { font:'جاري تثبيت الخط والشعار',render:'جاري رسم الفاتورة',encode:'جاري ضغط الصفحة',pack:'جاري إنشاء PDF' };
      statusOverlay(titles[name] || 'جاري تجهيز الفاتورة', detail || '');
    };
    window.__PASHA_INVOICE_PDF_STAGE__ = stageHandler;

    try {
      installDefaultsBridge();
      await ensureEngines();
      const cfg = invoiceSettings();
      const fontUrl = String(cfg.font_family || '') === 'custom' ? safeHttpsUrl(cfg.custom_font_url) : '';
      if (String(cfg.font_family || '') === 'custom' && !fontUrl) throw new Error('الخط المرفوع غير محفوظ في إعدادات الفاتورة.');
      const logoUrl = cfg.show_logo && cfg.logo_mode === 'image' ? safeHttpsUrl(cfg.logo_url) : '';
      const [fontResult, logoResult] = await Promise.allSettled([
        fontUrl ? fetchBuffer(fontUrl) : Promise.resolve(null),
        logoUrl ? urlToDataUrl(logoUrl) : Promise.resolve('')
      ]);
      if (fontResult.status === 'rejected') throw new Error(`تعذر تحميل الخط: ${fontResult.reason?.message || fontResult.reason}`);
      const result = await window.PashaInvoiceOnePagePdf.create({
        PdfClass:window.PashaFastSinglePagePdf,cfg,order,items:order.order_items,notes:order.notes,fee:order.delivery_fee,
        fontBuffer:fontResult.value,logoDataUrl:logoResult.status === 'fulfilled' ? (logoResult.value || '') : '',
        money,when,itemOptionText,englishDigits
      });
      if (!(result?.blob instanceof Blob) || result.pageCount !== 1) throw new Error('تعذر ضمان صفحة واحدة للفاتورة.');
      if (String(cfg.font_family || '') === 'custom' && result.customFontBaked !== true) throw new Error('لم يتم تثبيت الخط داخل الفاتورة النهائية.');
      root.classList.remove('open');
      document.getElementById('pbManualInvoiceWorking')?.remove();
      await showPrintReady(result.blob, cfg, order);
    } catch (error) {
      console.error('Manual Pasha invoice failed:', error);
      statusOverlay('تعذر تجهيز الفاتورة الخارجية', String(error?.message || error || 'خطأ غير معروف'), true);
    } finally {
      if (window.__PASHA_INVOICE_PDF_STAGE__ === stageHandler) {
        try { delete window.__PASHA_INVOICE_PDF_STAGE__; } catch (_) { window.__PASHA_INVOICE_PDF_STAGE__ = null; }
      }
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function openModal() {
    const root = ensureModal();
    root.classList.add('open');
    setTimeout(() => root.querySelector('[data-mi-customer]')?.focus(), 40);
    recalc(root);
  }

  function injectLaunchers() {
    const toolbar = document.querySelector('#viewPashaOrders .pb-ops-toolbar');
    if (toolbar && !document.getElementById('pbManualInvoiceOpen')) {
      const button = document.createElement('button');
      button.id = 'pbManualInvoiceOpen';
      button.type = 'button';
      button.textContent = '＋ فاتورة خارجية';
      button.addEventListener('click', openModal);
      toolbar.appendChild(button);
    }

    const homeGrid = document.querySelector('#viewHome .quick-grid');
    if (homeGrid && !document.getElementById('pbManualInvoiceQuick')) {
      const quick = document.createElement('button');
      quick.id = 'pbManualInvoiceQuick';
      quick.className = 'quick-action';
      quick.type = 'button';
      quick.innerHTML = '<strong>🧾 فاتورة خارجية</strong><span>اكتب الأصناف والتفاصيل واطبع بنفس التصميم الحالي</span>';
      quick.addEventListener('click', openModal);
      homeGrid.appendChild(quick);
    }
    return Boolean(toolbar || homeGrid);
  }

  function boot() {
    installDefaultsBridge();
    injectLaunchers();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installDefaultsBridge();
      injectLaunchers();
      if (attempts > 80 || (defaultsBridgeInstalled && document.getElementById('pbManualInvoiceOpen'))) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  window.PashaManualInvoiceV1 = Object.freeze({ open:openModal, defaults:SNAPSHOT, version:'1.0' });
})();