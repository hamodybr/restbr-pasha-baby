(() => {
  if (window.__PASHA_INVOICE_LIVE_EDITOR_V1__) return;
  window.__PASHA_INVOICE_LIVE_EDITOR_V1__ = true;

  const SCALE = 1.65;
  const PX_PER_MM = 96 / 25.4;
  const PT_TO_PX = 96 / 72;
  const FONT_FAMILY = 'Pasha Invoice Live Custom';
  const styleId = 'pbInvoiceLiveEditorStyles';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const mm = value => Number(value || 0) * PX_PER_MM;
  const pt = value => Number(value || 0) * PT_TO_PX;
  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const digits = value => String(value ?? '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
  const money = value => `${Number(value || 0).toLocaleString('en-US')} د.ع`;
  const when = value => {
    try {
      return digits(new Date(value).toLocaleString('ar-IQ', {
        timeZone:'Asia/Baghdad', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
      }));
    } catch (_) { return digits(value); }
  };

  let active = null;
  let renderTicket = 0;
  let customFontKey = '';
  let customFontReady = false;
  const imageCache = new Map();

  function pageMetrics(cfg) {
    const size = String(cfg.page_size || 'A4').toUpperCase();
    let width = 210, height = 297;
    if (size === 'A5') { width = 148; height = 210; }
    if (size === 'LETTER') { width = 215.9; height = 279.4; }
    if (String(cfg.page_orientation || 'portrait') === 'landscape') [width, height] = [height, width];
    const margin = Math.max(0, num(cfg.page_margin_mm, 6));
    return { width, height, margin, contentWidth: Math.max(40, width - margin * 2), contentHeight: Math.max(40, height - margin * 2) };
  }

  function settings() {
    let raw = {};
    try { raw = adminRestaurantSettings?.ui_design_settings?.invoice || {}; } catch (_) {}
    const normalized = window.PashaInvoiceSettings?.normalize?.(raw);
    const fallback = window.PashaInvoiceSettings?.defaults || {};
    return { ...fallback, ...(normalized || raw), fit_one_page:true };
  }

  function orderOption(item) {
    const option = clean(item?.option_name);
    const color = clean(item?.selected_color);
    if (option && color) return `${option} • اللون: ${color}`;
    if (color) return `اللون: ${color}`;
    return option;
  }

  async function fetchOrder(id) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('قاعدة البيانات غير متاحة.');
    const result = await supabaseClient
      .from('orders')
      .select('id,order_number,customer_name,customer_phone,order_type,address,notes,subtotal,delivery_fee,total,created_at,order_items(id,product_name,option_name,selected_color,quantity,line_total)')
      .eq('id', id)
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  function cleanNotes(value) {
    return String(value || '').replace(/^\s*🎨\s*الألوان:\s*\r?\n(?:\s*•[^\r\n]*(?:\r?\n|$))+\s*/i, '').trim();
  }

  async function bytesDataUrl(url) {
    if (!url) return '';
    if (imageCache.has(url)) return imageCache.get(url);
    const promise = fetch(url, { mode:'cors', credentials:'omit', cache:'force-cache' }).then(async response => {
      if (!response.ok) throw new Error(`تعذر تنزيل الملف (${response.status}).`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `data:${response.headers.get('content-type') || 'application/octet-stream'};base64,${btoa(binary)}`;
    });
    imageCache.set(url, promise);
    return promise;
  }

  async function ensureFont(cfg) {
    if (cfg.font_family !== 'custom' || !cfg.custom_font_url) return { family:'Tahoma, Arial, sans-serif', weight:String(cfg.font_weight || 900) };
    const key = `${cfg.custom_font_url}|${cfg.font_weight}`;
    if (customFontReady && customFontKey === key) return { family:`"${FONT_FAMILY}"`, weight:String(cfg.font_weight || 900) };
    if (typeof FontFace !== 'function' || !document.fonts) throw new Error('المتصفح لا يدعم الخط المرفوع.');
    const dataUrl = await bytesDataUrl(cfg.custom_font_url);
    const face = new FontFace(FONT_FAMILY, `url(${JSON.stringify(dataUrl)})`, { weight:String(cfg.font_weight || 900), style:'normal', display:'block' });
    const loaded = await face.load();
    document.fonts.add(loaded);
    await document.fonts.ready;
    customFontKey = key;
    customFontReady = true;
    return { family:`"${FONT_FAMILY}"`, weight:String(cfg.font_weight || 900) };
  }

  async function loadImage(url) {
    if (!url) return null;
    try {
      const dataUrl = await bytesDataUrl(url);
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
    } catch (_) { return null; }
  }

  function setFont(ctx, size, weight, family) {
    ctx.font = `${weight} ${pt(size)}px ${family}`;
  }

  function wrap(ctx, value, maxWidth) {
    const text = clean(value);
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(next).width <= maxWidth) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawRtlLines(ctx, lines, x, y, lineHeight) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return lines.length * lineHeight;
  }

  function measure(order, cfg, font) {
    const metrics = pageMetrics(cfg);
    const probe = document.createElement('canvas').getContext('2d');
    const pad = mm(num(cfg.outer_padding_mm, 8));
    const inner = mm(metrics.contentWidth) - pad * 2;
    let h = pad + mm(4);
    if (cfg.show_logo) h += mm(num(cfg.logo_size_mm, 27)) + mm(3);
    if (cfg.show_brand_title) h += pt(num(cfg.title_size_pt, 25)) * 1.25;
    if (cfg.show_brand_subtitle) h += pt(num(cfg.subtitle_size_pt, 8)) * 1.7;
    h += mm(11);
    if (cfg.show_order_number || cfg.show_date_time) h += pt(num(cfg.meta_size_pt, 8)) * 2;
    h += pt(num(cfg.customer_size_pt, 10.5)) * 1.9;
    if (cfg.show_customer_address && order.address) h += pt(num(cfg.address_size_pt, 9.5)) * 1.8;
    h += mm(5);
    if (cfg.show_details_title) h += pt(num(cfg.details_size_pt, 17)) * 1.8;
    const itemWidth = Math.max(mm(45), inner - mm(58));
    for (const item of order.order_items || []) {
      setFont(probe, num(cfg.item_size_pt, 12), font.weight, font.family);
      const title = `${cfg.show_quantity ? `${Number(item.quantity || 0)}× ` : ''}${digits(item.product_name)}`;
      const titleLines = Math.max(1, wrap(probe, title, itemWidth).length);
      let row = titleLines * pt(num(cfg.item_size_pt, 12)) * num(cfg.line_height, 1.25) * 1.2;
      const option = cfg.show_options ? orderOption(item) : '';
      if (option) row += pt(num(cfg.option_size_pt, 9.5)) * num(cfg.line_height, 1.25) * 1.15;
      h += Math.max(mm(num(cfg.row_min_height_mm, 7)), row + mm(num(cfg.row_padding_mm, 1)) * 2);
    }
    if (Number(order.delivery_fee || 0) > 0) h += mm(Math.max(6, num(cfg.row_min_height_mm, 7)));
    if (cfg.show_notes && cleanNotes(order.notes)) h += mm(5) + pt(num(cfg.notes_size_pt, 9.5)) * 2.2;
    h += mm(5) + pt(num(cfg.total_size_pt, 16)) * 2.8;
    if (cfg.show_footer) h += mm(5) + pt(num(cfg.footer_size_pt, 15)) * 1.8;
    return Math.max(h + pad, mm(120));
  }

  async function renderSource(order, cfg) {
    const font = await ensureFont(cfg);
    const metrics = pageMetrics(cfg);
    const cssWidth = Math.ceil(mm(metrics.contentWidth));
    const cssHeight = Math.ceil(measure(order, cfg, font));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(cssWidth * SCALE);
    canvas.height = Math.ceil(cssHeight * SCALE);
    const ctx = canvas.getContext('2d', { alpha:false });
    if (!ctx) throw new Error('تعذر تشغيل Canvas.');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.textBaseline = 'alphabetic';
    const pad = mm(num(cfg.outer_padding_mm, 8));
    const left = pad, right = cssWidth - pad, inner = right - left;
    const frame = Math.max(1, pt(num(cfg.frame_width_pt, 3)));
    ctx.lineWidth = frame; ctx.strokeRect(frame / 2, frame / 2, cssWidth - frame, cssHeight - frame);
    ctx.lineWidth = Math.max(1, frame * .45); ctx.strokeRect(frame * 1.5, frame * 1.5, cssWidth - frame * 3, cssHeight - frame * 3);
    let y = pad;

    if (cfg.show_logo) {
      const size = mm(num(cfg.logo_size_mm, 27));
      const logo = cfg.logo_mode === 'image' ? await loadImage(cfg.logo_url) : null;
      if (logo) ctx.drawImage(logo, (cssWidth - size) / 2, y, size, size);
      else {
        ctx.save(); ctx.beginPath(); ctx.lineWidth = 2; ctx.arc(cssWidth / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.direction = 'ltr'; ctx.font = `900 ${pt(13)}px Georgia, serif`; ctx.fillText('PASHA BABY', cssWidth / 2, y + size * .54); ctx.restore();
      }
      y += size + mm(3);
    }
    if (cfg.show_brand_title) {
      ctx.textAlign='center'; ctx.direction='ltr'; ctx.font=`900 ${pt(num(cfg.title_size_pt,25))}px Georgia, serif`;
      ctx.fillText(digits(cfg.brand_title || 'PASHA BABY'), cssWidth/2, y + pt(num(cfg.title_size_pt,25))); y += pt(num(cfg.title_size_pt,25))*1.25;
    }
    if (cfg.show_brand_subtitle) {
      ctx.textAlign='center'; ctx.direction='ltr'; ctx.font=`900 ${pt(num(cfg.subtitle_size_pt,8))}px Georgia, serif`;
      ctx.fillText(digits(cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE'), cssWidth/2, y + pt(num(cfg.subtitle_size_pt,8))); y += pt(num(cfg.subtitle_size_pt,8))*1.65;
    }
    y += mm(2.5); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(cssWidth/2-mm(5),y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cssWidth/2+mm(5),y); ctx.lineTo(right,y); ctx.stroke(); ctx.save(); ctx.translate(cssWidth/2,y); ctx.rotate(Math.PI/4); ctx.fillRect(-mm(1.8),-mm(1.8),mm(3.6),mm(3.6)); ctx.restore(); y += mm(6);

    setFont(ctx, num(cfg.meta_size_pt,8), font.weight, font.family);
    if (cfg.show_order_number) { ctx.textAlign='left'; ctx.direction='ltr'; ctx.fillText(digits(order.order_number), left, y); }
    if (cfg.show_date_time) { ctx.textAlign='right'; ctx.direction='rtl'; ctx.fillText(when(order.created_at), right, y); }
    y += pt(num(cfg.meta_size_pt,8))*1.8; ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke(); y += mm(4);

    setFont(ctx, num(cfg.customer_size_pt,10.5), font.weight, font.family);
    const customerBase = y + pt(num(cfg.customer_size_pt,10.5));
    ctx.textAlign='right'; ctx.direction='rtl'; ctx.fillText(digits(order.customer_name || 'زبون'), right, customerBase);
    const leftParts=[]; if (cfg.show_customer_phone && order.customer_phone) leftParts.push(digits(order.customer_phone)); if (cfg.show_order_type) leftParts.push(order.order_type === 'delivery' ? 'توصيل' : 'استلام');
    if (leftParts.length) { ctx.textAlign='left'; ctx.direction='rtl'; ctx.fillText(leftParts.join(' · '), left, customerBase); }
    y = customerBase + mm(2.5);
    if (cfg.show_customer_address && order.address) {
      setFont(ctx,num(cfg.address_size_pt,9.5),font.weight,font.family); const lh=pt(num(cfg.address_size_pt,9.5))*num(cfg.line_height,1.25)*1.18;
      const lines=wrap(ctx,`العنوان: ${digits(order.address)}`,inner); y += drawRtlLines(ctx,lines,right,y+pt(num(cfg.address_size_pt,9.5)),lh);
    }
    y += mm(2); ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke(); y += mm(4);
    if (cfg.show_details_title) { setFont(ctx,num(cfg.details_size_pt,17),font.weight,font.family); ctx.textAlign='center';ctx.direction='rtl';ctx.fillText(digits(cfg.details_title || 'تفاصيل الطلب'),cssWidth/2,y+pt(num(cfg.details_size_pt,17)));y+=pt(num(cfg.details_size_pt,17))*1.7; }

    const itemSize=num(cfg.item_size_pt,12), optionSize=num(cfg.option_size_pt,9.5), priceSize=num(cfg.price_size_pt,12); const productWidth=Math.max(mm(45),inner-mm(58));
    const drawItem=(title,option,price)=>{
      const top=y; setFont(ctx,itemSize,font.weight,font.family); const lh=pt(itemSize)*num(cfg.line_height,1.25)*1.18; const lines=wrap(ctx,digits(title),productWidth); let row=Math.max(mm(num(cfg.row_min_height_mm,7)),lines.length*lh+mm(num(cfg.row_padding_mm,1))*2+mm(1)); const baseline=top+pt(itemSize)+mm(1);
      ctx.textAlign='right';ctx.direction='rtl';ctx.fillText('◆',right,baseline); lines.forEach((line,i)=>ctx.fillText(line,right-mm(5),baseline+i*lh));
      if(option){setFont(ctx,optionSize,font.weight,font.family);ctx.fillText(digits(option),right-mm(5),baseline+lines.length*lh);row+=pt(optionSize)*num(cfg.line_height,1.25)*1.1;}
      setFont(ctx,priceSize,font.weight,font.family);ctx.textAlign='left';ctx.direction='ltr';ctx.fillText(digits(price),left,baseline);
      ctx.save();ctx.setLineDash([2.2,3.2]);ctx.lineWidth=Math.max(1,pt(num(cfg.leader_width_pt,1.5)));ctx.beginPath();ctx.moveTo(left+mm(38),baseline-mm(1));ctx.lineTo(Math.max(left+mm(45),right-productWidth-mm(5)),baseline-mm(1));ctx.stroke();ctx.restore(); y=top+row+mm(num(cfg.row_padding_mm,1));
    };
    for(const item of order.order_items || []) drawItem(`${cfg.show_quantity ? `${Number(item.quantity||0)}× ` : ''}${item.product_name||''}`,cfg.show_options?orderOption(item):'',money(item.line_total));
    if(Number(order.delivery_fee||0)>0) drawItem(`${cfg.show_quantity?'1× ':''}التوصيل`,cfg.show_options?'خدمة التوصيل':'',money(order.delivery_fee));
    const notes=cleanNotes(order.notes); if(cfg.show_notes&&notes){y+=mm(2);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();y+=mm(3);setFont(ctx,num(cfg.notes_size_pt,9.5),font.weight,font.family);const lh=pt(num(cfg.notes_size_pt,9.5))*num(cfg.line_height,1.25)*1.18;const lines=wrap(ctx,`ملاحظة: ${digits(notes)}`,inner);y+=drawRtlLines(ctx,lines,right,y+pt(num(cfg.notes_size_pt,9.5)),lh);}
    y+=mm(3); const totalTop=y; const totalH=pt(num(cfg.total_size_pt,16))*(Number(order.delivery_fee||0)>0&&cfg.show_subtotal?2.5:1.7)+mm(5); ctx.lineWidth=Math.max(1,pt(num(cfg.total_border_pt,2)));ctx.strokeRect(left,totalTop,inner,totalH); let ty=totalTop+mm(4)+pt(Math.max(8,num(cfg.total_size_pt,16)-4));
    if(Number(order.delivery_fee||0)>0&&cfg.show_subtotal){setFont(ctx,Math.max(8,num(cfg.total_size_pt,16)-4),font.weight,font.family);ctx.textAlign='right';ctx.direction='rtl';ctx.fillText('مجموع الأصناف',right-mm(3),ty);ctx.textAlign='left';ctx.direction='ltr';ctx.fillText(digits(money(order.subtotal)),left+mm(3),ty);ty+=pt(num(cfg.total_size_pt,16))*1.35;}
    setFont(ctx,num(cfg.total_size_pt,16),font.weight,font.family);ctx.textAlign='right';ctx.direction='rtl';ctx.fillText('المجموع الكلي',right-mm(3),ty);ctx.textAlign='left';ctx.direction='ltr';ctx.fillText(digits(money(order.total)),left+mm(3),ty);y=totalTop+totalH;
    if(cfg.show_footer){y+=mm(5);setFont(ctx,num(cfg.footer_size_pt,15),font.weight,font.family);ctx.textAlign='center';ctx.direction='rtl';ctx.fillText(digits(cfg.footer_text||'شكراً لاختياركم'),cssWidth/2,y+pt(num(cfg.footer_size_pt,15)));}
    return canvas;
  }

  function pageCanvas(source, cfg) {
    const m = pageMetrics(cfg);
    const widthPx = Math.ceil(mm(m.width) * SCALE);
    const heightPx = Math.ceil(mm(m.height) * SCALE);
    const page = document.createElement('canvas'); page.width=widthPx; page.height=heightPx;
    const ctx=page.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,widthPx,heightPx);
    const marginPx=mm(m.margin)*SCALE; const availW=widthPx-marginPx*2; const availH=heightPx-marginPx*2;
    const scale=Math.min(availW/source.width, availH/source.height, 1); const drawW=source.width*scale, drawH=source.height*scale;
    ctx.drawImage(source,(widthPx-drawW)/2,marginPx,drawW,drawH);
    return { canvas:page, fitScale:scale };
  }

  function multiPagePdf(jsPDF, source, cfg) {
    const m=pageMetrics(cfg); const orientation=m.width>m.height?'landscape':'portrait'; const format=String(cfg.page_size||'A4').toLowerCase(); const doc=new jsPDF({orientation,unit:'mm',format:format==='letter'?'letter':format});
    const sourcePageH=Math.max(1,Math.floor(source.width*(m.contentHeight/m.contentWidth))); let y=0,page=0;
    while(y<source.height){const h=Math.min(sourcePageH,source.height-y);const slice=document.createElement('canvas');slice.width=source.width;slice.height=h;const c=slice.getContext('2d',{alpha:false});c.fillStyle='#fff';c.fillRect(0,0,slice.width,slice.height);c.drawImage(source,0,y,source.width,h,0,0,source.width,h);if(page)doc.addPage();doc.addImage(slice.toDataURL('image/png'),'PNG',m.margin,m.margin,m.contentWidth,m.contentWidth*(h/source.width),undefined,'FAST');y+=h;page++;}
    return doc;
  }

  function installStyles(){if(document.getElementById(styleId))return;const s=document.createElement('style');s.id=styleId;s.textContent=`
    .pb-invoice-live{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.82);display:flex;align-items:stretch;justify-content:center;padding:10px;backdrop-filter:blur(8px)}
    .pb-invoice-live-card{width:min(1180px,100%);height:calc(100dvh - 20px);background:#11100f;color:#f7f4ef;border:1px solid rgba(226,181,94,.3);border-radius:20px;overflow:hidden;display:grid;grid-template-columns:minmax(300px,390px) 1fr;box-shadow:0 30px 90px rgba(0,0,0,.6)}
    .pb-invoice-live-controls{padding:16px;overflow:auto;border-inline-end:1px solid rgba(255,255,255,.08)}.pb-invoice-live-controls h2{margin:0 0 4px;color:#e2b55e;font-size:20px}.pb-invoice-live-controls p{margin:0 0 14px;color:#9f978e;font-size:12px}.pb-live-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pb-live-field{display:grid;gap:5px}.pb-live-field span{font-size:11px;color:#bdb4aa}.pb-live-field input,.pb-live-field select{width:100%;border:1px solid rgba(255,255,255,.1);background:#090807;color:#fff;border-radius:10px;padding:9px;font:inherit;font-size:14px}.pb-live-checks{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}.pb-live-check{display:flex;align-items:center;gap:7px;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#171411;font-size:11px}.pb-live-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.pb-live-actions button{border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:11px 9px;background:#1a1713;color:#eee;font:inherit;font-weight:850}.pb-live-actions .primary{background:linear-gradient(135deg,#e2b55e,#b67c2d);color:#171009;border:0}.pb-live-actions .green{background:#174638;color:#d7fff1;border-color:#2c705b}.pb-live-actions .wide{grid-column:1/-1}.pb-live-status{min-height:34px;margin-top:10px;color:#a99f94;font-size:11px;line-height:1.5}.pb-live-preview{min-width:0;background:#2a2826;overflow:auto;padding:18px;display:flex;align-items:flex-start;justify-content:center}.pb-live-preview img{display:block;max-width:100%;height:auto;background:#fff;box-shadow:0 12px 50px rgba(0,0,0,.45)}.pb-live-close{position:absolute;top:18px;left:18px;z-index:2;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:#171411;color:#fff;font-size:22px}.pb-live-scale{margin-top:9px;padding:8px 10px;border-radius:9px;background:#1a1713;color:#d3c7ba;font-size:11px}
    @media(max-width:760px){.pb-invoice-live{padding:0}.pb-invoice-live-card{height:100dvh;border-radius:0;grid-template-columns:1fr;grid-template-rows:auto 1fr}.pb-invoice-live-controls{max-height:48dvh;border-inline-end:0;border-bottom:1px solid rgba(255,255,255,.08);padding:14px}.pb-invoice-live-preview{padding:10px}.pb-live-grid{grid-template-columns:1fr 1fr}.pb-live-close{top:10px;left:10px}.pb-invoice-live-controls h2{padding-inline-start:44px}.pb-live-actions{position:sticky;bottom:-14px;background:#11100f;padding:9px 0 4px;z-index:3}}
  `;document.head.appendChild(s);}

  function field(key,label,min,max,step){return `<label class="pb-live-field"><span>${label}</span><input type="number" inputmode="decimal" data-pb-live-field="${key}" min="${min}" max="${max}" step="${step}"></label>`;}

  function modalMarkup(cfg){return `<div class="pb-invoice-live" role="dialog" aria-modal="true"><button class="pb-live-close" type="button" data-pb-live-close>×</button><div class="pb-invoice-live-card"><section class="pb-invoice-live-controls"><h2>تعديل وطباعة الفاتورة</h2><p>كل تعديل ينعكس مباشرة على نفس الطلب. الإعدادات مؤقتة إلى أن تضغط «حفظ كافتراضي».</p><div class="pb-live-grid"><label class="pb-live-field"><span>حجم الورقة</span><select data-pb-live-field="page_size"><option>A4</option><option>A5</option><option>Letter</option></select></label><label class="pb-live-field"><span>الاتجاه</span><select data-pb-live-field="page_orientation"><option value="portrait">طولي</option><option value="landscape">عرضي</option></select></label>${field('base_size_pt','الخط الأساسي',8,20,.5)}${field('item_size_pt','اسم الصنف',8,20,.5)}${field('option_size_pt','الخيار واللون',7,18,.5)}${field('price_size_pt','السعر',8,20,.5)}${field('row_min_height_mm','ارتفاع الصف',4,18,.5)}${field('row_padding_mm','المسافة بين الصفوف',0,8,.25)}${field('outer_padding_mm','الحشو داخل الإطار',2,24,.5)}${field('page_margin_mm','هامش الصفحة',0,20,.5)}${field('logo_size_mm','حجم الشعار',12,55,1)}${field('line_height','تباعد السطور',1,2,.05)}</div><div class="pb-live-checks"><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="fit_one_page"><span>ملاءمة في صفحة واحدة</span></label><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="show_logo"><span>إظهار الشعار</span></label><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="show_customer_address"><span>إظهار العنوان</span></label><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="show_notes"><span>إظهار الملاحظات</span></label><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="show_footer"><span>إظهار عبارة الشكر</span></label><label class="pb-live-check"><input type="checkbox" data-pb-live-toggle="show_subtotal"><span>مجموع قبل التوصيل</span></label></div><div class="pb-live-actions"><button type="button" data-pb-live-fit>ملاءمة تلقائية A4</button><button type="button" data-pb-live-reset>إرجاع الإعدادات</button><button class="green" type="button" data-pb-live-print>🖨 طباعة مباشرة</button><button type="button" data-pb-live-pdf>فتح PDF</button><button class="primary wide" type="button" data-pb-live-save>حفظ هذه الإعدادات كافتراضية</button></div><div class="pb-live-scale" data-pb-live-scale></div><div class="pb-live-status" data-pb-live-status>جاري تجهيز المعاينة…</div></section><section class="pb-invoice-live-preview"><img data-pb-live-preview alt="معاينة الفاتورة الحالية"></section></div></div>`;}

  function syncFields(root,cfg){root.querySelectorAll('[data-pb-live-field]').forEach(el=>{const key=el.dataset.pbLiveField;el.value=cfg[key]??'';});root.querySelectorAll('[data-pb-live-toggle]').forEach(el=>{el.checked=cfg[el.dataset.pbLiveToggle]!==false;});}
  function readFields(root,cfg){const next={...cfg};root.querySelectorAll('[data-pb-live-field]').forEach(el=>{const key=el.dataset.pbLiveField;next[key]=el.tagName==='SELECT'?el.value:Number(el.value);});root.querySelectorAll('[data-pb-live-toggle]').forEach(el=>next[el.dataset.pbLiveToggle]=el.checked);return window.PashaInvoiceSettings?.normalize?.(next)?{...window.PashaInvoiceSettings.normalize(next),fit_one_page:next.fit_one_page}:{...next};}

  async function renderActive(){if(!active)return;const ticket=++renderTicket;const status=active.root.querySelector('[data-pb-live-status]');status.textContent='جاري تحديث المعاينة…';try{active.cfg=readFields(active.root,active.cfg);const source=await renderSource(active.order,active.cfg);if(ticket!==renderTicket)return;active.source=source;const page=pageCanvas(source,active.cfg);active.page=page.canvas;active.fitScale=page.fitScale;active.root.querySelector('[data-pb-live-preview]').src=page.canvas.toDataURL('image/jpeg',.92);active.root.querySelector('[data-pb-live-scale]').textContent=active.cfg.fit_one_page?`ملاءمة صفحة واحدة — حجم الطباعة ${Math.round(page.fitScale*100)}%`:'الوضع متعدد الصفحات عند فتح PDF';status.textContent='المعاينة جاهزة.';}catch(error){if(ticket!==renderTicket)return;status.textContent=error?.message||'تعذر تجهيز المعاينة.';}}
  function debounceRender(){clearTimeout(active?.timer);if(active)active.timer=setTimeout(()=>void renderActive(),120);}

  function autoFit(){if(!active)return;const c=active.cfg;Object.assign(c,{page_size:'A4',page_orientation:'portrait',fit_one_page:true,base_size_pt:Math.min(num(c.base_size_pt,12),11.5),item_size_pt:Math.min(num(c.item_size_pt,12),11),option_size_pt:Math.min(num(c.option_size_pt,9.5),8.5),price_size_pt:Math.min(num(c.price_size_pt,12),11),row_min_height_mm:Math.min(num(c.row_min_height_mm,7),5.5),row_padding_mm:Math.min(num(c.row_padding_mm,1),.5),outer_padding_mm:Math.min(num(c.outer_padding_mm,8),6),line_height:Math.min(num(c.line_height,1.25),1.15),logo_size_mm:Math.min(num(c.logo_size_mm,27),24),page_margin_mm:Math.min(num(c.page_margin_mm,6),5)});syncFields(active.root,c);void renderActive();}

  async function ensureJsPdf(){if(window.jspdf?.jsPDF)return;await new Promise((resolve,reject)=>{const existing=document.getElementById('pashaJsPdfScript');const script=existing||document.createElement('script');script.addEventListener('load',resolve,{once:true});script.addEventListener('error',reject,{once:true});if(!existing){script.id='pashaJsPdfScript';script.src='js/vendor/jspdf-2.5.2.umd.min.js';document.head.appendChild(script);}});}

  async function openPdf(){if(!active)return;const status=active.root.querySelector('[data-pb-live-status]');status.textContent='جاري إنشاء PDF…';await renderActive();await ensureJsPdf();const cfg=active.cfg;const m=pageMetrics(cfg);let doc;if(cfg.fit_one_page){const orientation=m.width>m.height?'landscape':'portrait';const format=String(cfg.page_size||'A4').toLowerCase();doc=new window.jspdf.jsPDF({orientation,unit:'mm',format:format==='letter'?'letter':format});doc.addImage(active.page.toDataURL('image/png'),'PNG',0,0,m.width,m.height,undefined,'FAST');}else doc=multiPagePdf(window.jspdf.jsPDF,active.source,cfg);const url=URL.createObjectURL(doc.output('blob'));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),300000);status.textContent='تم فتح PDF.';}

  async function directPrint(){if(!active)return;const popup=window.open('','_blank','width=900,height=1000');if(!popup){alert('اسمح بالنوافذ المنبثقة للطباعة.');return;}const status=active.root.querySelector('[data-pb-live-status]');status.textContent='جاري تجهيز الطباعة المباشرة…';try{await renderActive();const cfg=active.cfg;const m=pageMetrics(cfg);const printable=cfg.fit_one_page?active.page:active.source;const data=printable.toDataURL('image/png');const size=`${cfg.page_size||'A4'} ${cfg.page_orientation||'portrait'}`;popup.document.open();popup.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@page{size:${size};margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:100%;height:auto;max-height:100vh;object-fit:contain}</style></head><body><img src="${data}" onload="setTimeout(()=>{window.focus();window.print()},180)"></body></html>`);popup.document.close();status.textContent='تم فتح نافذة الطباعة.';}catch(error){popup.close();status.textContent=error?.message||'تعذر فتح الطباعة.';}}

  async function saveDefaults(){if(!active)return;const status=active.root.querySelector('[data-pb-live-status]');status.textContent='جاري حفظ الإعدادات كافتراضية…';try{const cfg=readFields(active.root,active.cfg);const persisted={...cfg};delete persisted.fit_one_page;let current={};let id='';try{current=adminRestaurantSettings?.ui_design_settings&&typeof adminRestaurantSettings.ui_design_settings==='object'?{...adminRestaurantSettings.ui_design_settings}:{};id=adminRestaurantSettings?.id||'';}catch(_){}if(!id)throw new Error('تعذر تحديد سجل إعدادات المتجر.');const next={...current,invoice:persisted};const result=await supabaseClient.from('restaurant_settings').update({ui_design_settings:next}).eq('id',id).select('ui_design_settings').single();if(result.error)throw result.error;try{adminRestaurantSettings.ui_design_settings=result.data?.ui_design_settings||next;}catch(_){}window.PashaInvoiceSettings?.render?.(persisted);status.textContent='✓ تم حفظ الإعدادات كافتراضية للفواتير القادمة.';}catch(error){status.textContent=error?.message||'تعذر حفظ الإعدادات.';}}

  async function openEditor(orderId){installStyles();const cfg=settings();const root=document.createElement('div');root.innerHTML=modalMarkup(cfg);const modal=root.firstElementChild;document.body.appendChild(modal);active={root:modal,order:null,cfg,original:{...cfg},source:null,page:null,fitScale:1,timer:null};syncFields(modal,cfg);modal.querySelector('[data-pb-live-close]').addEventListener('click',()=>{modal.remove();active=null;});modal.addEventListener('click',e=>{if(e.target===modal){modal.remove();active=null;}});modal.querySelectorAll('[data-pb-live-field],[data-pb-live-toggle]').forEach(el=>el.addEventListener('input',debounceRender));modal.querySelector('[data-pb-live-fit]').addEventListener('click',autoFit);modal.querySelector('[data-pb-live-reset]').addEventListener('click',()=>{active.cfg={...active.original};syncFields(modal,active.cfg);void renderActive();});modal.querySelector('[data-pb-live-print]').addEventListener('click',()=>void directPrint());modal.querySelector('[data-pb-live-pdf]').addEventListener('click',()=>void openPdf());modal.querySelector('[data-pb-live-save]').addEventListener('click',()=>void saveDefaults());try{active.order=await fetchOrder(orderId);await renderActive();}catch(error){modal.querySelector('[data-pb-live-status]').textContent=error?.message||'تعذر تحميل الطلب.';}}

  document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('[data-print-order]'):null;if(!button)return;event.preventDefault();event.stopImmediatePropagation();void openEditor(button.dataset.printOrder);},true);
})();
