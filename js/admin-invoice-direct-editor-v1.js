(() => {
  if (window.__PASHA_INVOICE_DIRECT_EDITOR_V1__) return;
  window.__PASHA_INVOICE_DIRECT_EDITOR_V1__ = true;

  const STYLE_ID = 'pbInvoiceDirectEditorV1Style';
  const ELEMENTS = {
    logo: {
      label:'الشعار', fields:['logo_size_mm'], toggles:['show_logo'], step:1,
      zone:{left:36,top:2,width:28,height:16}
    },
    brand: {
      label:'اسم وهوية المتجر', fields:['title_size_pt','subtitle_size_pt'], toggles:['show_brand_title','show_brand_subtitle'], step:.5,
      zone:{left:18,top:16,width:64,height:12}
    },
    meta: {
      label:'رقم الطلب والتاريخ', fields:['meta_size_pt'], toggles:['show_order_number','show_date_time'], step:.5,
      zone:{left:5,top:28,width:90,height:7}
    },
    customer: {
      label:'بيانات الزبون', fields:['customer_size_pt','address_size_pt'], toggles:[], step:.5,
      zone:{left:5,top:35,width:90,height:11}
    },
    details: {
      label:'عنوان تفاصيل الطلب', fields:['details_size_pt'], toggles:['show_details_title'], step:.5,
      zone:{left:25,top:46,width:50,height:6}
    },
    prices: {
      label:'أسعار الأصناف', fields:['price_size_pt'], toggles:[], step:.5,
      zone:{left:4,top:51,width:28,height:34}
    },
    items: {
      label:'أسماء الأصناف', fields:['item_size_pt'], toggles:[], step:.5,
      zone:{left:55,top:51,width:41,height:34}
    },
    options: {
      label:'الخيارات والألوان', fields:['option_size_pt'], toggles:['show_options'], step:.5,
      zone:{left:34,top:55,width:20,height:28}
    },
    total: {
      label:'المجموع', fields:['total_size_pt'], toggles:[], step:.5,
      zone:{left:5,top:85,width:90,height:10}
    },
    footer: {
      label:'عبارة الشكر', fields:['footer_size_pt'], toggles:['show_footer'], step:.5,
      zone:{left:24,top:95,width:52,height:5}
    }
  };

  const FIELD_META = {
    logo_size_mm:[27,10,70,1], title_size_pt:[25,10,46,.5], subtitle_size_pt:[8,5,20,.5],
    meta_size_pt:[8,5,18,.5], customer_size_pt:[10.5,6,24,.5], address_size_pt:[9.5,6,22,.5],
    details_size_pt:[17,8,30,.5], item_size_pt:[12,7,24,.5], option_size_pt:[9.5,6,20,.5],
    price_size_pt:[12,7,24,.5], total_size_pt:[16,9,30,.5], footer_size_pt:[15,7,28,.5]
  };

  let multiMode = false;
  let selected = new Set();
  let activeModal = null;

  function invoiceConfig() {
    let raw = {};
    try { raw = adminRestaurantSettings?.ui_design_settings?.invoice || {}; } catch (_) {}
    const defaults = window.PashaInvoiceSettings?.defaults || {};
    const normalized = window.PashaInvoiceSettings?.normalize?.(raw) || raw;
    return { ...defaults, ...normalized, fit_one_page:true };
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pb-invoice-live[data-pb-direct-editor="1"]{padding:0!important;background:#171513!important;backdrop-filter:none!important}
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-invoice-live-card{
        width:100%!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;
        display:block!important;overflow:hidden!important;background:#171513!important
      }
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-invoice-live-controls{display:none!important}
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-invoice-live-preview{
        position:absolute!important;inset:0!important;width:100%!important;height:100dvh!important;max-height:none!important;min-height:0!important;
        display:block!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;padding:58px 8px 116px!important;
        background:#171513!important;border:0!important;box-sizing:border-box!important;overscroll-behavior:contain!important
      }
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-live-settings-preview-title{display:none!important}
      .pb-direct-stage{position:relative;width:min(100%,760px);height:auto;margin:0 auto 26px;line-height:0;touch-action:pan-y;background:#fff;box-shadow:0 12px 42px rgba(0,0,0,.38)}
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-direct-stage>[data-pb-live-preview]{
        display:block!important;position:relative!important;width:100%!important;height:auto!important;max-width:none!important;max-height:none!important;
        object-fit:contain!important;margin:0!important;transform:none!important;box-shadow:none!important;background:#fff!important
      }
      .pb-direct-hit-layer{position:absolute;inset:0;z-index:4;pointer-events:none;line-height:normal}
      .pb-direct-zone{position:absolute;border:2px solid transparent;background:transparent;border-radius:5px;pointer-events:auto;appearance:none;padding:0;margin:0;color:transparent;touch-action:manipulation}
      .pb-direct-zone::after{content:attr(data-label);position:absolute;right:4px;top:4px;padding:3px 6px;border-radius:999px;background:rgba(18,14,10,.88);color:#fff;font:800 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25)}
      .pb-direct-zone.is-selected{border-color:#d49a2d;background:rgba(226,181,94,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.55)}
      .pb-direct-zone.is-selected::after{opacity:1}
      .pb-direct-topbar{position:fixed;z-index:2147483005;top:calc(10px + env(safe-area-inset-top));left:62px;right:10px;display:flex;justify-content:flex-end;gap:7px;pointer-events:none}
      .pb-direct-topbar button{pointer-events:auto;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(20,18,16,.9);color:#fff;padding:9px 12px;font:800 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(12px)}
      .pb-direct-topbar button.is-active{background:#b9852b;color:#fff;border-color:#d9aa55}
      .pb-direct-tip{position:fixed;z-index:2147483004;top:calc(58px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:82vw;padding:7px 11px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:700 11px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;transition:opacity .3s;white-space:nowrap}
      .pb-direct-tip.is-hidden{opacity:0}
      .pb-direct-sheet{position:fixed;z-index:2147483010;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));background:rgba(25,22,19,.97);color:#fff;border:1px solid rgba(226,181,94,.28);border-radius:18px;padding:12px;box-shadow:0 18px 50px rgba(0,0,0,.46);backdrop-filter:blur(18px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transform:translateY(calc(100% + 28px));transition:transform .2s ease}
      .pb-direct-sheet.is-open{transform:translateY(0)}
      .pb-direct-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .pb-direct-sheet-title{font-size:14px;font-weight:900}.pb-direct-sheet-sub{font-size:10px;color:#bbb1a7;margin-top:2px}
      .pb-direct-sheet-close{border:0;background:#302b27;color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px}
      .pb-direct-size-row{display:grid;grid-template-columns:48px 1fr 48px;gap:8px;align-items:center}
      .pb-direct-size-row button{height:44px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:#302b27;color:#fff;font-size:25px;font-weight:800}
      .pb-direct-size-readout{text-align:center;border-radius:12px;background:#171411;padding:9px 8px}.pb-direct-size-readout strong{display:block;font-size:13px}.pb-direct-size-readout span{display:block;font-size:10px;color:#bdb3aa;margin-top:2px}
      .pb-direct-sheet-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
      .pb-direct-sheet-actions button{min-height:40px;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:#292521;color:#fff;font:850 11px/1.2 inherit}
      .pb-direct-sheet-actions button[disabled]{opacity:.35}
      .pb-direct-dock{position:fixed;z-index:2147483006;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1.15fr 1fr .72fr;gap:7px;transition:opacity .15s,transform .15s}
      .pb-direct-dock.is-hidden{opacity:0;transform:translateY(18px);pointer-events:none}
      .pb-direct-dock button{height:48px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(24,21,18,.95);color:#fff;font:900 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(14px)}
      .pb-direct-dock .print{background:#174f3e;border-color:#2f7c64}.pb-direct-dock .save{background:#a97524;border-color:#d09b42}
      .pb-invoice-live[data-pb-direct-editor="1"] .pb-live-close{position:fixed!important;z-index:2147483015!important;top:calc(10px + env(safe-area-inset-top))!important;left:10px!important;width:44px!important;height:44px!important;background:rgba(20,18,16,.92)!important}
      .pb-invoice-live[data-pb-direct-editor="1"].pb-direct-advanced-open .pb-invoice-live-controls{
        display:block!important;position:fixed!important;z-index:2147483020!important;inset:auto 0 0 0!important;max-height:72dvh!important;overflow:auto!important;
        border-radius:20px 20px 0 0!important;padding:16px 12px calc(20px + env(safe-area-inset-bottom))!important;background:#fffdf8!important;color:#151515!important;box-shadow:0 -14px 50px rgba(0,0,0,.35)!important
      }
      .pb-invoice-live[data-pb-direct-editor="1"].pb-direct-advanced-open .pb-invoice-live-controls h2,
      .pb-invoice-live[data-pb-direct-editor="1"].pb-direct-advanced-open .pb-invoice-live-controls p{color:#181818!important}
      @media(min-width:760px){
        .pb-invoice-live[data-pb-direct-editor="1"] .pb-invoice-live-preview{padding:70px 24px 120px!important}
        .pb-direct-sheet,.pb-direct-dock{left:50%;right:auto;width:min(620px,calc(100vw - 24px));transform:translate(-50%,calc(100% + 28px))}
        .pb-direct-sheet.is-open{transform:translate(-50%,0)}
        .pb-direct-dock{transform:translateX(-50%)}.pb-direct-dock.is-hidden{transform:translate(-50%,18px)}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureField(modal, key) {
    let input = modal.querySelector(`[data-pb-live-field="${key}"]`);
    if (input) return input;
    const cfg = invoiceConfig();
    const meta = FIELD_META[key] || [0,0,100,1];
    input = document.createElement('input');
    input.type = 'number';
    input.hidden = true;
    input.dataset.pbLiveField = key;
    input.min = String(meta[1]); input.max = String(meta[2]); input.step = String(meta[3]);
    input.value = String(cfg[key] ?? meta[0]);
    modal.appendChild(input);
    return input;
  }

  function ensureToggle(modal, key) {
    let input = modal.querySelector(`[data-pb-live-toggle="${key}"]`);
    if (input) return input;
    const cfg = invoiceConfig();
    input = document.createElement('input');
    input.type = 'checkbox'; input.hidden = true; input.dataset.pbLiveToggle = key;
    input.checked = cfg[key] !== false;
    modal.appendChild(input);
    return input;
  }

  function notifyRender(modal) {
    const trigger = modal.querySelector('[data-pb-live-field="base_size_pt"]') || modal.querySelector('[data-pb-live-field]');
    if (trigger) trigger.dispatchEvent(new Event('input', { bubbles:true }));
  }

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function adjustSelected(direction) {
    if (!activeModal || !selected.size) return;
    const fields = new Map();
    selected.forEach(key => {
      const spec = ELEMENTS[key];
      spec?.fields?.forEach(field => fields.set(field, spec.step || FIELD_META[field]?.[3] || .5));
    });
    fields.forEach((step,key) => {
      const input = ensureField(activeModal,key);
      const meta = FIELD_META[key] || [0,-999,999,step];
      const current = Number(input.value || meta[0]);
      input.value = String(clamp(current + direction * step, meta[1], meta[2]));
    });
    notifyRender(activeModal);
    updateSheet(activeModal);
  }

  function toggleSelectedVisibility() {
    if (!activeModal || !selected.size) return;
    const toggles = new Set();
    selected.forEach(key => ELEMENTS[key]?.toggles?.forEach(t => toggles.add(t)));
    if (!toggles.size) return;
    const inputs = [...toggles].map(key => ensureToggle(activeModal,key));
    const shouldShow = inputs.every(input => !input.checked);
    inputs.forEach(input => { input.checked = shouldShow; });
    notifyRender(activeModal);
    updateSheet(activeModal);
  }

  function selectionFields() {
    if (!activeModal) return [];
    const unique = new Set();
    selected.forEach(key => ELEMENTS[key]?.fields?.forEach(field => unique.add(field)));
    return [...unique].map(key => ({ key, value:Number(ensureField(activeModal,key).value || 0) }));
  }

  function updateSheet(modal) {
    const sheet = modal.querySelector('.pb-direct-sheet');
    const dock = modal.querySelector('.pb-direct-dock');
    if (!sheet || !dock) return;
    const zones = modal.querySelectorAll('.pb-direct-zone');
    zones.forEach(zone => zone.classList.toggle('is-selected', selected.has(zone.dataset.element)));
    if (!selected.size) {
      sheet.classList.remove('is-open'); dock.classList.remove('is-hidden'); return;
    }
    dock.classList.add('is-hidden'); sheet.classList.add('is-open');
    const labels = [...selected].map(key => ELEMENTS[key]?.label).filter(Boolean);
    sheet.querySelector('.pb-direct-sheet-title').textContent = selected.size > 1 ? `${selected.size} عناصر محددة` : labels[0];
    sheet.querySelector('.pb-direct-sheet-sub').textContent = selected.size > 1 ? labels.join('، ') : 'استخدم + و − لتغيير الحجم مباشرة';
    const values = selectionFields();
    const readout = sheet.querySelector('.pb-direct-size-readout strong');
    readout.textContent = values.length === 1 ? String(values[0].value) : 'تعديل جماعي';
    const toggleKeys = new Set(); selected.forEach(key => ELEMENTS[key]?.toggles?.forEach(t => toggleKeys.add(t)));
    const visibility = sheet.querySelector('[data-direct-visibility]');
    visibility.disabled = !toggleKeys.size;
    if (toggleKeys.size) {
      const inputs = [...toggleKeys].map(key => ensureToggle(modal,key));
      visibility.textContent = inputs.every(input => !input.checked) ? 'إظهار العنصر' : 'إخفاء العنصر';
    } else visibility.textContent = 'إظهار / إخفاء';
  }

  function selectElement(modal,key) {
    if (!ELEMENTS[key]) return;
    if (!multiMode) selected = new Set([key]);
    else if (selected.has(key)) selected.delete(key); else selected.add(key);
    updateSheet(modal);
    modal.querySelector('.pb-direct-tip')?.classList.add('is-hidden');
  }

  function buildZones(modal, stage) {
    const layer = document.createElement('div'); layer.className = 'pb-direct-hit-layer';
    Object.entries(ELEMENTS).forEach(([key,spec]) => {
      spec.fields.forEach(field => ensureField(modal,field));
      spec.toggles.forEach(toggle => ensureToggle(modal,toggle));
      const button = document.createElement('button');
      button.type='button'; button.className='pb-direct-zone'; button.dataset.element=key; button.dataset.label=spec.label; button.setAttribute('aria-label',`تعديل ${spec.label}`);
      const z=spec.zone; Object.assign(button.style,{left:`${z.left}%`,top:`${z.top}%`,width:`${z.width}%`,height:`${z.height}%`});
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); selectElement(modal,key); });
      layer.appendChild(button);
    });
    stage.appendChild(layer);
  }

  function proxyClick(modal,selector) {
    const target = modal.querySelector(selector); if (target) target.click();
  }

  function buildChrome(modal) {
    const top = document.createElement('div'); top.className='pb-direct-topbar';
    const advanced=document.createElement('button'); advanced.type='button'; advanced.textContent='⚙️ إعدادات'; advanced.addEventListener('click',()=>{
      const opened=modal.classList.toggle('pb-direct-advanced-open'); advanced.classList.toggle('is-active',opened);
    });
    const multi=document.createElement('button'); multi.type='button'; multi.textContent='تحديد متعدد'; multi.addEventListener('click',()=>{
      multiMode=!multiMode; multi.classList.toggle('is-active',multiMode); multi.textContent=multiMode?'✓ تحديد متعدد':'تحديد متعدد';
      if(!multiMode && selected.size>1){ const first=[...selected][0]; selected=new Set(first?[first]:[]); updateSheet(modal); }
    });
    top.append(advanced,multi); modal.appendChild(top);

    const tip=document.createElement('div'); tip.className='pb-direct-tip'; tip.textContent='اضغط على أي جزء من الفاتورة لتعديله'; modal.appendChild(tip); setTimeout(()=>tip.classList.add('is-hidden'),5200);

    const dock=document.createElement('div'); dock.className='pb-direct-dock';
    dock.innerHTML='<button class="print" type="button" data-direct-print>🖨 طباعة</button><button type="button" data-direct-pdf>PDF</button><button class="save" type="button" data-direct-save>حفظ</button>';
    dock.querySelector('[data-direct-print]').addEventListener('click',()=>proxyClick(modal,'[data-pb-live-print]'));
    dock.querySelector('[data-direct-pdf]').addEventListener('click',()=>proxyClick(modal,'[data-pb-live-pdf]'));
    dock.querySelector('[data-direct-save]').addEventListener('click',()=>proxyClick(modal,'[data-pb-live-save]'));
    modal.appendChild(dock);

    const sheet=document.createElement('div'); sheet.className='pb-direct-sheet';
    sheet.innerHTML=`<div class="pb-direct-sheet-head"><div><div class="pb-direct-sheet-title">العنصر</div><div class="pb-direct-sheet-sub"></div></div><button class="pb-direct-sheet-close" type="button" aria-label="إلغاء التحديد">×</button></div><div class="pb-direct-size-row"><button type="button" data-direct-minus>−</button><div class="pb-direct-size-readout"><strong>—</strong><span>الحجم</span></div><button type="button" data-direct-plus>+</button></div><div class="pb-direct-sheet-actions"><button type="button" data-direct-visibility>إظهار / إخفاء</button><button type="button" data-direct-clear>إنهاء التحديد</button></div>`;
    sheet.querySelector('[data-direct-minus]').addEventListener('click',()=>adjustSelected(-1));
    sheet.querySelector('[data-direct-plus]').addEventListener('click',()=>adjustSelected(1));
    sheet.querySelector('[data-direct-visibility]').addEventListener('click',toggleSelectedVisibility);
    const clear=()=>{selected.clear();updateSheet(modal);};
    sheet.querySelector('[data-direct-clear]').addEventListener('click',clear); sheet.querySelector('.pb-direct-sheet-close').addEventListener('click',clear);
    modal.appendChild(sheet);
  }

  function transform(modal) {
    if (!modal || modal.dataset.pbDirectEditor === '1') return;
    const preview=modal.querySelector('.pb-invoice-live-preview'); const img=modal.querySelector('[data-pb-live-preview]');
    if(!preview || !img) return;
    modal.dataset.pbDirectEditor='1'; activeModal=modal; selected.clear(); multiMode=false;

    preview.querySelector('.pb-live-settings-preview-title')?.remove();
    const stage=document.createElement('div'); stage.className='pb-direct-stage'; img.before(stage); stage.appendChild(img); buildZones(modal,stage); buildChrome(modal);

    const observer=new MutationObserver(()=>{ if(!modal.isConnected){observer.disconnect(); if(activeModal===modal)activeModal=null;} });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function scan(){ document.querySelectorAll('.pb-invoice-live').forEach(transform); }
  installStyles(); scan();
  const observer=new MutationObserver(scan); observer.observe(document.documentElement,{childList:true,subtree:true});
})();
