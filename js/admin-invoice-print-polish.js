(() => {
  if (window.__PASHA_INVOICE_PRINT_POLISH_V1__) return;
  window.__PASHA_INVOICE_PRINT_POLISH_V1__ = true;

  const STYLE_ID = 'pbInvoicePrintPolishStyle';
  const JPDF_ID = 'pashaJsPdfScript';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pb-invoice-live-controls{
        background:#f7f4ee!important;
        color:#263238!important;
      }
      .pb-invoice-live-controls h2{
        color:#1f2933!important;
        font-weight:950!important;
      }
      .pb-invoice-live-controls>p,
      .pb-invoice-live-controls .pb-invoice-actions span,
      .pb-live-scale,.pb-live-status{
        color:#59636d!important;
        opacity:1!important;
      }
      .pb-live-settings-groups .pb-invoice-group{
        background:#fff!important;
        border-color:#d7dce0!important;
        box-shadow:0 1px 0 rgba(0,0,0,.02)!important;
      }
      .pb-live-settings-groups .pb-invoice-group>summary{
        color:#25313b!important;
        font-weight:950!important;
        opacity:1!important;
      }
      .pb-live-settings-groups .pb-invoice-field,
      .pb-live-settings-groups .pb-invoice-select-grid label,
      .pb-live-settings-groups .pb-invoice-field>span,
      .pb-live-settings-groups .pb-invoice-select-grid label>span{
        color:#48545e!important;
        -webkit-text-fill-color:#48545e!important;
        font-weight:900!important;
        opacity:1!important;
      }
      .pb-live-settings-groups .pb-invoice-number input[type=number],
      .pb-live-settings-groups .pb-invoice-select-grid select{
        background:#fff!important;
        color:#1f2933!important;
        -webkit-text-fill-color:#1f2933!important;
        border-color:#ccd3d8!important;
        font-weight:850!important;
      }
      .pb-live-settings-groups .pb-invoice-number b{
        color:#5a6570!important;
        opacity:1!important;
      }
      .pb-live-settings-toggles label{
        background:#fff!important;
        color:#263238!important;
        border-color:#d7dce0!important;
        font-weight:900!important;
      }
      .pb-invoice-live-controls .pb-invoice-actions button,
      .pb-live-settings-actions button{
        background:#fff!important;
        color:#263238!important;
        -webkit-text-fill-color:#263238!important;
        border-color:#cfd6db!important;
      }
      .pb-live-settings-actions .green{
        background:#155844!important;
        color:#fff!important;
        -webkit-text-fill-color:#fff!important;
        border-color:#155844!important;
      }
      .pb-live-settings-actions .primary{
        background:linear-gradient(135deg,#e8b94f,#c68424)!important;
        color:#18120a!important;
        -webkit-text-fill-color:#18120a!important;
      }
      .pb-live-scale,.pb-live-status{
        background:#fff!important;
        border:1px solid #e0e4e7!important;
      }
      .pb-live-settings-groups input[type=range]{accent-color:#2f8b73!important}
    `;
    document.head.appendChild(style);
  }

  function ensureJsPdf() {
    if (window.jspdf?.jsPDF) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(JPDF_ID);
      const script = existing || document.createElement('script');
      const done = () => window.jspdf?.jsPDF ? resolve() : reject(new Error('تعذر تشغيل محرك PDF.'));
      script.addEventListener('load', done, { once:true });
      script.addEventListener('error', () => reject(new Error('تعذر تحميل محرك PDF.')), { once:true });
      if (!existing) {
        script.id = JPDF_ID;
        script.src = 'js/vendor/jspdf-2.5.2.umd.min.js';
        document.head.appendChild(script);
      } else if (window.jspdf?.jsPDF) resolve();
    });
  }

  function paperSpec(modal) {
    const size = String(modal.querySelector('[data-pb-live-field="page_size"]')?.value || 'A4');
    const orientation = String(modal.querySelector('[data-pb-live-field="page_orientation"]')?.value || 'portrait');
    const specs = {
      A4:[210,297], A5:[148,210], Letter:[215.9,279.4]
    };
    let [w,h] = specs[size] || specs.A4;
    if (orientation === 'landscape') [w,h] = [h,w];
    return { size, orientation, width:w, height:h };
  }

  async function buildCurrentPdf(modal) {
    await ensureJsPdf();
    const img = modal.querySelector('[data-pb-live-preview]');
    if (!img?.src) throw new Error('المعاينة غير جاهزة بعد.');
    if (!img.complete) await new Promise((resolve, reject) => {
      img.addEventListener('load', resolve, { once:true });
      img.addEventListener('error', reject, { once:true });
    });
    const p = paperSpec(modal);
    const format = p.size.toLowerCase() === 'letter' ? 'letter' : p.size.toLowerCase();
    const doc = new window.jspdf.jsPDF({ orientation:p.orientation, unit:'mm', format });
    const type = /^data:image\/png/i.test(img.src) ? 'PNG' : 'JPEG';
    doc.addImage(img.src, type, 0, 0, p.width, p.height, undefined, 'FAST');
    return doc.output('blob');
  }

  function printPdfBlob(blob, popup, status) {
    const url = URL.createObjectURL(blob);
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title></title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}iframe{border:0;width:100%;height:100%}button{position:fixed;z-index:2;inset:auto 14px calc(14px + env(safe-area-inset-bottom)) 14px;border:0;border-radius:14px;padding:14px;background:#155844;color:#fff;font:800 17px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style></head><body><iframe id="pdfFrame" title="فاتورة PDF"></iframe><button id="fallback" hidden>فتح ملف PDF</button><script>const frame=document.getElementById('pdfFrame');const fallback=document.getElementById('fallback');frame.src=${JSON.stringify(url)};frame.addEventListener('load',()=>{setTimeout(()=>{try{frame.contentWindow.focus();frame.contentWindow.print();}catch(e){fallback.hidden=false;}},350);});fallback.onclick=()=>location.replace(${JSON.stringify(url)});<\/script></body></html>`);
    popup.document.close();
    if (status) status.textContent = 'تم تجهيز PDF للطباعة بدون ترويسة أو رابط الموقع.';
    setTimeout(() => URL.revokeObjectURL(url), 300000);
  }

  async function handleDirectPrint(event) {
    const button = event.target instanceof Element ? event.target.closest('[data-pb-live-print]') : null;
    if (!button) return;
    const modal = button.closest('.pb-invoice-live');
    if (!modal) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      alert('اسمح بالنوافذ المنبثقة للطباعة.');
      return;
    }
    popup.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:700 17px -apple-system;padding:30px;text-align:center">جاري تجهيز ملف الطباعة…</body>');
    popup.document.close();
    const status = modal.querySelector('[data-pb-live-status]');
    if (status) status.textContent = 'جاري تجهيز PDF للطباعة المباشرة…';
    try {
      const blob = await buildCurrentPdf(modal);
      printPdfBlob(blob, popup, status);
    } catch (error) {
      popup.close();
      if (status) status.textContent = error?.message || 'تعذر تجهيز الطباعة.';
    }
  }

  installStyles();
  document.addEventListener('click', handleDirectPrint, true);
  const observer = new MutationObserver(installStyles);
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
