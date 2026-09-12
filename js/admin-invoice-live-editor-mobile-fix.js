(() => {
  if (window.__PASHA_INVOICE_LIVE_EDITOR_MOBILE_FIX_V1__) return;
  window.__PASHA_INVOICE_LIVE_EDITOR_MOBILE_FIX_V1__ = true;

  const STYLE_ID = 'pbInvoiceLiveEditorMobileFixStyles';

  function install() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /*
       * Keep the invoice editor usable on iPhone/iPad even when Safari reports
       * a wider layout viewport. The preview is intentionally a bounded pane,
       * never a full-height scrolling invoice.
       */
      @media (max-width:1100px) {
        .pb-invoice-live{
          padding:0!important;
          overflow:hidden!important;
          overscroll-behavior:contain!important;
        }
        .pb-invoice-live-card{
          width:100%!important;
          max-width:none!important;
          height:100dvh!important;
          max-height:100dvh!important;
          border-radius:0!important;
          display:flex!important;
          flex-direction:column!important;
          overflow:hidden!important;
        }
        .pb-invoice-live-preview{
          order:0!important;
          flex:0 0 31dvh!important;
          width:100%!important;
          height:31dvh!important;
          min-height:170px!important;
          max-height:31dvh!important;
          overflow:hidden!important;
          padding:10px 12px!important;
          align-items:center!important;
          justify-content:center!important;
          border-bottom:1px solid rgba(255,255,255,.08)!important;
        }
        .pb-invoice-live-preview img{
          display:block!important;
          width:auto!important;
          height:auto!important;
          max-width:100%!important;
          max-height:100%!important;
          object-fit:contain!important;
          margin:auto!important;
          transform:none!important;
        }
        .pb-invoice-live-controls{
          order:1!important;
          flex:1 1 auto!important;
          min-height:0!important;
          max-height:none!important;
          overflow-y:auto!important;
          overflow-x:hidden!important;
          -webkit-overflow-scrolling:touch!important;
          border-inline-end:0!important;
          border-bottom:0!important;
          padding:14px 14px calc(16px + env(safe-area-inset-bottom))!important;
        }
        .pb-invoice-live-controls h2{
          padding-inline-start:0!important;
          padding-inline-end:46px!important;
        }
        .pb-live-close{
          position:fixed!important;
          top:calc(10px + env(safe-area-inset-top))!important;
          left:10px!important;
          z-index:2147483000!important;
          width:42px!important;
          height:42px!important;
          box-shadow:0 8px 24px rgba(0,0,0,.4)!important;
        }
        .pb-live-actions{
          position:sticky!important;
          bottom:calc(-14px - env(safe-area-inset-bottom))!important;
          z-index:4!important;
          margin-inline:-14px!important;
          padding:10px 14px calc(12px + env(safe-area-inset-bottom))!important;
          background:linear-gradient(180deg,rgba(17,16,15,.92),#11100f 18%)!important;
          border-top:1px solid rgba(255,255,255,.07)!important;
        }
      }

      @media (max-width:430px) {
        .pb-invoice-live-preview{
          flex-basis:28dvh!important;
          height:28dvh!important;
          max-height:28dvh!important;
          min-height:150px!important;
        }
        .pb-live-grid{
          grid-template-columns:1fr 1fr!important;
          gap:8px!important;
        }
        .pb-live-field input,.pb-live-field select{
          min-height:42px!important;
          font-size:16px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  install();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  }
})();
