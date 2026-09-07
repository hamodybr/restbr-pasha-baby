(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_NEW_PRODUCT_COLORS_V1__) return;
  window.__PASHA_NEW_PRODUCT_COLORS_V1__ = true;

  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];

  const COLOR_ALIASES = [
    ['اوف وايت','#f5f1e6'],['اوفوايت','#f5f1e6'],['سكري','#f6e8c9'],['ابيض','#ffffff'],['اسود','#111111'],
    ['ازرق سماوي','#4fc3f7'],['سماوي','#4fc3f7'],['لبني','#87ceeb'],['ازرق','#1e88e5'],['كحلي','#1b2a49'],
    ['اخضر فاتح','#8bcf7b'],['اخضر غامق','#2e7d32'],['اخضر','#43a047'],['زيتي','#708238'],['نعناعي','#98d8c8'],
    ['احمر غامق','#b71c1c'],['احمر','#e53935'],['عنابي','#7b1e3a'],['وردي فاتح','#f8bbd0'],['وردي','#f48fb1'],
    ['زهري','#f48fb1'],['بنفسجي','#8e44ad'],['موف','#9c6ade'],['لافندر','#b39ddb'],['اصفر','#fdd835'],
    ['ذهبي','#d4af37'],['برتقالي','#fb8c00'],['بني','#795548'],['بيج','#d7c3a3'],['كريمي','#fff3d6'],
    ['رمادي فاتح','#cfd8dc'],['رمادي غامق','#616161'],['رمادي','#9e9e9e'],['رصاصي','#78909c'],['فضي','#b0bec5']
  ];

  function normalize(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'')
      .replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');
  }

  function detectHex(value) {
    const key = normalize(value);
    if (!key) return '#d8d0d3';
    const exact = COLOR_ALIASES.find(([name]) => key === name);
    if (exact) return exact[1];
    const partial = COLOR_ALIASES.slice().sort((a,b)=>b[0].length-a[0].length).find(([name]) => key.includes(name));
    return partial?.[1] || '#d8d0d3';
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function installStyle() {
    if (q('#pbNewProductColorsStyle')) return;
    const style = document.createElement('style');
    style.id = 'pbNewProductColorsStyle';
    style.textContent = `
      #pbNewProductColorsEditor{grid-column:1/-1;margin-top:12px;padding:14px;border:1px solid var(--pba-border,rgba(47,139,115,.16));border-radius:16px;background:var(--pba-surface-strong,#fff);color:var(--pba-ink,#2f3b42)}
      .pb-npc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
      .pb-npc-head strong{display:block;color:var(--pba-primary,#2f8b73);font-size:14px;margin-bottom:4px}
      .pb-npc-head small{display:block;color:var(--pba-muted,#6e7b81);font-size:10px;line-height:1.7}
      #pbNewProductAddColor{height:40px;padding:0 12px;border:1px solid color-mix(in srgb,var(--pba-primary,#2f8b73) 28%,transparent);border-radius:11px;background:color-mix(in srgb,var(--pba-primary,#2f8b73) 8%,var(--pba-surface-strong,#fff));color:var(--pba-primary,#2f8b73);font-weight:900;white-space:nowrap}
      #pbNewProductColorList{display:flex;flex-direction:column;gap:9px}
      .pb-npc-empty{padding:13px;text-align:center;border:1px dashed var(--pba-border,rgba(47,139,115,.18));border-radius:12px;color:var(--pba-muted,#6e7b81);font-size:11px}
      .pb-npc-row{padding:11px;border:1px solid var(--pba-border,rgba(47,139,115,.15));border-radius:13px;background:var(--pba-surface,#fffdfb)}
      .pb-npc-main{display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;align-items:start}
      .pb-npc-swatch{width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:var(--pb-npc-color,#d8d0d3);box-shadow:0 0 0 1px rgba(0,0,0,.15),0 4px 13px rgba(0,0,0,.12)}
      .pb-npc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .pb-npc-field{display:flex;flex-direction:column;gap:5px}.pb-npc-field.full{grid-column:1/-1}
      .pb-npc-field label{font-size:10px;color:var(--pba-muted,#6e7b81)}
      .pb-npc-field input,.pb-npc-field select{width:100%;min-width:0;height:40px;border:1px solid var(--pba-border,rgba(47,139,115,.16));border-radius:10px;background:var(--pba-surface-strong,#fff);color:var(--pba-ink,#2f3b42);-webkit-text-fill-color:var(--pba-ink,#2f3b42);padding:0 10px;outline:none}
      .pb-npc-field input:focus,.pb-npc-field select:focus{border-color:var(--pba-primary,#2f8b73);box-shadow:0 0 0 3px color-mix(in srgb,var(--pba-primary,#2f8b73) 11%,transparent)}
      .pb-npc-picker-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.pb-npc-picker{padding:4px!important;cursor:pointer}
      .pb-npc-auto{height:40px;padding:0 9px;border:1px solid var(--pba-border,rgba(47,139,115,.16));border-radius:10px;background:transparent;color:var(--pba-primary,#2f8b73);font-size:10px;font-weight:900}
      .pb-npc-actions{display:flex;justify-content:flex-end;margin-top:8px}.pb-npc-delete{height:32px;padding:0 11px;border:1px solid rgba(182,77,77,.24);border-radius:9px;background:rgba(182,77,77,.06);color:#b64d4d;font-weight:800}
      .pb-npc-note{margin-top:9px;color:var(--pba-muted,#6e7b81);font-size:10px;line-height:1.6}
      body.admin-global-dark #pbNewProductColorsEditor{background:var(--pba-surface-strong,#18211f)}
      body.admin-global-dark .pb-npc-row{background:var(--pba-surface,#101715)}
      body.admin-global-dark .pb-npc-field input,body.admin-global-dark .pb-npc-field select{background:var(--pba-surface-strong,#18211f)}
      @media(max-width:640px){.pb-npc-head{flex-direction:column;align-items:stretch}#pbNewProductAddColor{width:100%}.pb-npc-grid{grid-template-columns:1fr}.pb-npc-field.full{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function rowHtml() {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `
      <div class="pb-npc-row" data-pb-npc-row="${esc(id)}" data-manual-color="0">
        <div class="pb-npc-main">
          <span class="pb-npc-swatch" style="--pb-npc-color:#d8d0d3"></span>
          <div class="pb-npc-grid">
            <div class="pb-npc-field full"><label>اسم اللون *</label><input class="pb-npc-name" maxlength="80" placeholder="مثال: وردي"></div>
            <div class="pb-npc-field"><label>لون الدائرة</label><div class="pb-npc-picker-wrap"><input class="pb-npc-picker" type="color" value="#d8d0d3"><button class="pb-npc-auto" type="button">تلقائي</button></div></div>
            <div class="pb-npc-field"><label>الحالة</label><select class="pb-npc-available"><option value="true" selected>متوفر</option><option value="false">غير متوفر</option></select></div>
            <div class="pb-npc-field full"><label>صورة خاصة لهذا اللون (اختياري)</label><input class="pb-npc-image" type="url" placeholder="https://..."></div>
          </div>
        </div>
        <div class="pb-npc-actions"><button class="pb-npc-delete" type="button">حذف اللون</button></div>
      </div>`;
  }

  function renderEmpty() {
    const list = q('#pbNewProductColorList');
    if (list && !list.querySelector('.pb-npc-row')) list.innerHTML = '<div class="pb-npc-empty">ماكو ألوان مضافة. تقدر تضيف الألوان هسه وتُحفظ تلقائياً ويا الصنف.</div>';
  }

  function addRow() {
    const list = q('#pbNewProductColorList');
    if (!list) return;
    list.querySelector('.pb-npc-empty')?.remove();
    list.insertAdjacentHTML('beforeend', rowHtml());
    list.querySelector('.pb-npc-row:last-child .pb-npc-name')?.focus();
  }

  function updateAutoColor(row) {
    if (!row || row.dataset.manualColor === '1') return;
    const hex = detectHex(row.querySelector('.pb-npc-name')?.value || '');
    const picker = row.querySelector('.pb-npc-picker');
    const swatch = row.querySelector('.pb-npc-swatch');
    if (picker) picker.value = hex;
    if (swatch) swatch.style.setProperty('--pb-npc-color', hex);
  }

  function inject() {
    const modal = q('#editorModal');
    const body = q('#editorBody');
    if (!body || !modal?.classList.contains('open') || !q('#createProductBtn') || q('#pbNewProductColorsEditor')) return;

    const section = document.createElement('div');
    section.id = 'pbNewProductColorsEditor';
    section.innerHTML = `
      <div class="pb-npc-head">
        <div><strong>🎨 ألوان الصنف</strong><small>ضيف الألوان قبل حفظ الصنف؛ تنحفظ كلها تلقائياً بنفس عملية الإضافة.</small></div>
        <button id="pbNewProductAddColor" type="button">+ إضافة لون</button>
      </div>
      <div id="pbNewProductColorList"><div class="pb-npc-empty">ماكو ألوان مضافة. إذا الصنف عنده ألوان، ضيفها من هنا قبل الحفظ.</div></div>
      <div class="pb-npc-note">اسم اللون بالعربي يحدد لون الدائرة تلقائياً، وتكدر تغيّر الدرجة يدوياً إذا تريد.</div>`;

    const actions = body.querySelector('.modal-actions');
    if (actions) actions.before(section); else body.appendChild(section);
  }

  function readDrafts() {
    const rows = qa('#pbNewProductColorList .pb-npc-row');
    if (!rows.length) return [];
    const drafts = [];
    const seen = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.querySelector('.pb-npc-name')?.value.trim() || '';
      if (!name) {
        row.querySelector('.pb-npc-name')?.focus();
        throw new Error('اكتب اسم كل لون قبل إضافة الصنف.');
      }
      const key = normalize(name);
      if (seen.has(key)) {
        row.querySelector('.pb-npc-name')?.focus();
        throw new Error(`اللون «${name}» مكرر.`);
      }
      seen.add(key);
      drafts.push({
        name_ar: name,
        color_hex: row.querySelector('.pb-npc-picker')?.value || detectHex(name),
        image_url: row.querySelector('.pb-npc-image')?.value.trim() || null,
        is_available: row.querySelector('.pb-npc-available')?.value !== 'false',
        sort_order: i + 1
      });
    }
    return drafts;
  }

  function showMessage(text, ok = false) {
    try {
      if (typeof window.showEditorMsg === 'function') window.showEditorMsg(text, ok);
      else if (!ok) alert(text);
    } catch (_) { if (!ok) alert(text); }
  }

  function getClient() {
    try { if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient; } catch (_) {}
    return window.supabaseClient || null;
  }

  async function saveDraftsForCreatedProduct(drafts, startedAt, nameAr, categoryId) {
    if (!drafts.length) return true;
    const sb = getClient();
    if (!sb) throw new Error('قاعدة البيانات غير جاهزة لحفظ الألوان.');

    const since = new Date(startedAt - 5000).toISOString();
    let query = sb.from('products').select('id,name_ar,category_id,created_at').eq('name_ar', nameAr).eq('category_id', categoryId).gte('created_at', since).order('created_at', { ascending: false }).limit(3);
    const { data, error } = await query;
    if (error) throw error;
    const product = Array.isArray(data) ? data[0] : null;
    if (!product?.id) return false;

    const now = new Date().toISOString();
    const payloads = drafts.map(item => ({
      product_id: product.id,
      name_ar: item.name_ar,
      name_ku: item.name_ar,
      name_en: item.name_ar,
      color_hex: item.color_hex,
      image_url: item.image_url,
      sort_order: item.sort_order,
      is_active: true,
      is_available: item.is_available,
      updated_at: now
    }));

    const inserted = await sb.from('product_colors').insert(payloads);
    if (inserted.error) throw inserted.error;
    window.dispatchEvent(new CustomEvent('restbr:product-colors-updated', { detail: { productId: product.id, count: payloads.length } }));
    return true;
  }

  function installCreateHook() {
    if (typeof window.createAdminProduct !== 'function') return false;
    if (window.createAdminProduct.__pbNewColorsWrapped) return true;

    const original = window.createAdminProduct;
    async function wrappedCreateAdminProduct(...args) {
      let drafts = [];
      try { drafts = readDrafts(); }
      catch (error) { showMessage(error.message || String(error)); return; }

      const nameAr = q('#np_name_ar')?.value.trim() || '';
      const categoryId = q('#np_category_id')?.value || '';
      const startedAt = Date.now();

      const result = await original.apply(this, args);
      if (!drafts.length || !nameAr || !categoryId) return result;

      try {
        const saved = await saveDraftsForCreatedProduct(drafts, startedAt, nameAr, categoryId);
        if (saved) showMessage(`تمت إضافة الصنف مع ${drafts.length} لون ✓`, true);
      } catch (error) {
        console.error('NEW PRODUCT COLORS SAVE ERROR', error);
        alert('تمت إضافة الصنف، لكن تعذر حفظ الألوان: ' + (error?.message || error));
      }
      return result;
    }

    wrappedCreateAdminProduct.__pbNewColorsWrapped = true;
    wrappedCreateAdminProduct.__pbOriginal = original;
    window.createAdminProduct = wrappedCreateAdminProduct;
    return true;
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#pbNewProductAddColor')) { addRow(); return; }
      const row = event.target?.closest?.('.pb-npc-row');
      if (!row) return;
      if (event.target?.closest?.('.pb-npc-delete')) {
        row.remove();
        renderEmpty();
        return;
      }
      if (event.target?.closest?.('.pb-npc-auto')) {
        row.dataset.manualColor = '0';
        updateAutoColor(row);
      }
    }, true);

    document.addEventListener('input', event => {
      const row = event.target?.closest?.('.pb-npc-row');
      if (!row) return;
      if (event.target.matches('.pb-npc-name')) updateAutoColor(row);
      if (event.target.matches('.pb-npc-picker')) {
        row.dataset.manualColor = '1';
        row.querySelector('.pb-npc-swatch')?.style.setProperty('--pb-npc-color', event.target.value);
      }
    }, true);
  }

  function boot() {
    installStyle();
    bindEvents();
    inject();

    const observer = new MutationObserver(inject);
    observer.observe(q('#editorBody') || document.body, { childList: true, subtree: true });

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      inject();
      if (installCreateHook() || tries > 120) clearInterval(timer);
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
