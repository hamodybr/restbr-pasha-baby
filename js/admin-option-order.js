(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  console.log('✅ ADMIN OPTION ORDER V2.0 LOADED');

  const VERSION = '2.0';
  const HOLDER_IDS = ['optionsEditor', 'newOptionsEditor'];
  let savePatched = false;
  let lockedScrollY = 0;
  let modalIsLocked = false;
  let dragState = null;

  function installStyles() {
    let style = document.getElementById('smAdminOptionOrderStyles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'smAdminOptionOrderStyles';
      document.head.appendChild(style);
    }

    style.textContent = `
      #optionsEditor .option-editor,
      #newOptionsEditor .option-editor{
        position:relative;
        padding:10px!important;
        margin-top:9px!important;
        border-radius:14px!important;
        transition:transform .14s ease,box-shadow .14s ease,opacity .14s ease,border-color .14s ease;
      }

      #optionsEditor .option-editor-grid,
      #newOptionsEditor .option-editor-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1.45fr) minmax(112px,.75fr)!important;
        gap:8px!important;
        align-items:end!important;
      }

      #optionsEditor .option-editor-grid > .danger-mini,
      #newOptionsEditor .option-editor-grid > .danger-mini{
        display:none!important;
      }

      #optionsEditor .option-editor .field,
      #newOptionsEditor .option-editor .field{
        min-width:0!important;
      }

      #optionsEditor .option-editor input,
      #newOptionsEditor .option-editor input{
        min-height:44px!important;
      }

      .sm-option-order-bar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        min-height:36px;
        margin:0 0 8px;
        padding:0 0 7px;
        border-bottom:1px solid rgba(216,169,88,.14);
        color:#9d9388;
        direction:rtl;
        user-select:none;
        -webkit-user-select:none;
      }

      .sm-option-order-number{
        color:#d9c196;
        font-weight:800;
        font-size:12px;
        white-space:nowrap;
      }

      .sm-option-order-actions{
        display:inline-flex;
        align-items:center;
        gap:6px;
        direction:ltr;
        flex:0 0 auto;
      }

      .sm-option-drag,
      .sm-option-delete{
        display:grid;
        place-items:center;
        width:34px;
        height:32px;
        padding:0;
        border-radius:9px;
        -webkit-tap-highlight-color:transparent;
      }

      .sm-option-drag{
        border:1px solid rgba(216,169,88,.28);
        background:rgba(216,169,88,.065);
        color:#b98531;
        font-size:20px;
        font-weight:900;
        line-height:1;
        cursor:grab;
        touch-action:none;
      }

      .sm-option-drag:active{cursor:grabbing;background:rgba(216,169,88,.14)}

      .sm-option-delete{
        border:1px solid rgba(198,74,66,.22);
        background:rgba(198,74,66,.055);
        color:#b84840;
        font-size:15px;
        cursor:pointer;
        touch-action:manipulation;
      }

      .sm-option-delete:active{transform:scale(.94);background:rgba(198,74,66,.12)}

      .option-editor.sm-option-dragging{
        opacity:.72!important;
        transform:scale(.985)!important;
        border-color:rgba(190,139,55,.52)!important;
        box-shadow:0 12px 28px rgba(0,0,0,.16)!important;
        z-index:4;
      }

      .option-editor.sm-option-drag-over{
        border-color:rgba(190,139,55,.5)!important;
      }

      .admin-modal{overscroll-behavior:none!important}
      .admin-modal-card{
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch!important;
        touch-action:pan-y!important;
      }
      body.sm-admin-modal-locked{overflow:hidden!important}
      body.sm-option-is-dragging{user-select:none!important;-webkit-user-select:none!important}

      body.admin-light-mode .sm-option-order-bar,
      body.sm-admin-light .sm-option-order-bar,
      html[data-admin-theme="light"] .sm-option-order-bar{
        border-bottom-color:rgba(139,94,30,.13);
      }

      body.admin-light-mode .sm-option-order-number,
      body.sm-admin-light .sm-option-order-number,
      html[data-admin-theme="light"] .sm-option-order-number{
        color:#8f6a2d;
      }

      body.admin-light-mode .sm-option-drag,
      body.sm-admin-light .sm-option-drag,
      html[data-admin-theme="light"] .sm-option-drag{
        background:#fff9ef;
        color:#a46f20;
        border-color:rgba(139,94,30,.22);
      }

      body.admin-light-mode .sm-option-delete,
      body.sm-admin-light .sm-option-delete,
      html[data-admin-theme="light"] .sm-option-delete{
        background:#fff7f5;
        color:#b34139;
        border-color:rgba(190,71,62,.20);
      }

      @media(max-width:650px){
        #optionsEditor .option-editor,
        #newOptionsEditor .option-editor{
          padding:9px!important;
          margin-top:8px!important;
        }

        #optionsEditor .option-editor-grid,
        #newOptionsEditor .option-editor-grid{
          grid-template-columns:minmax(0,1.35fr) minmax(96px,.72fr)!important;
          gap:7px!important;
        }

        #optionsEditor .option-editor .field label,
        #newOptionsEditor .option-editor .field label{
          font-size:12px!important;
          margin-bottom:2px!important;
        }

        #optionsEditor .option-editor input,
        #newOptionsEditor .option-editor input{
          font-size:16px!important;
          min-height:43px!important;
          padding:9px 10px!important;
        }

        .sm-option-order-bar{min-height:34px;margin-bottom:7px;padding-bottom:6px}
        .sm-option-order-number{font-size:11px}
        .sm-option-drag,.sm-option-delete{width:33px;height:31px}
        .sm-option-drag{font-size:19px}
        .sm-option-delete{font-size:14px}
      }
    `;
  }

  function holderFor(row) {
    return row?.closest?.('#optionsEditor,#newOptionsEditor') || null;
  }

  function activeRows(holderOrId = 'optionsEditor') {
    const holder = typeof holderOrId === 'string' ? document.getElementById(holderOrId) : holderOrId;
    if (!holder) return [];
    return [...holder.children]
      .filter(row => row instanceof Element && row.classList.contains('option-editor'))
      .filter(row => row.dataset.deleted !== '1' && row.style.display !== 'none');
  }

  function updatePositionLabels(holderOrId) {
    const holder = typeof holderOrId === 'string' ? document.getElementById(holderOrId) : holderOrId;
    if (!holder) return;
    activeRows(holder).forEach((row, index) => {
      const label = row.querySelector(':scope > .sm-option-order-bar .sm-option-order-number');
      if (label) label.textContent = `الخيار ${index + 1}`;
    });
  }

  function installRowControls(row) {
    if (!(row instanceof Element) || !row.classList.contains('option-editor')) return;

    row.querySelectorAll(':scope > .sm-option-order-bar').forEach(old => old.remove());

    const bar = document.createElement('div');
    bar.className = 'sm-option-order-bar';
    bar.dataset.smOptionOrderVersion = VERSION;
    bar.innerHTML = `
      <span class="sm-option-order-number"></span>
      <span class="sm-option-order-actions">
        <button class="sm-option-delete" type="button" data-sm-option-delete aria-label="حذف الخيار" title="حذف الخيار">✕</button>
        <button class="sm-option-drag" type="button" data-sm-option-drag aria-label="اسحب لترتيب الخيار" title="اسحب لترتيب الخيار">⠿</button>
      </span>
    `;

    row.insertBefore(bar, row.firstChild);
  }

  function enhanceHolder(holder) {
    if (!holder) return false;
    [...holder.children].forEach(row => {
      if (!(row instanceof Element) || !row.classList.contains('option-editor')) return;
      const current = row.querySelector(':scope > .sm-option-order-bar');
      if (!current || current.dataset.smOptionOrderVersion !== VERSION) installRowControls(row);
    });
    updatePositionLabels(holder);
    return true;
  }

  function enhanceEditors() {
    let found = false;
    HOLDER_IDS.forEach(id => {
      const holder = document.getElementById(id);
      if (holder) {
        found = true;
        enhanceHolder(holder);
      }
    });
    return found;
  }

  function removeRow(row) {
    if (!row) return;
    const holder = holderFor(row);
    if (row.dataset.optionId) {
      row.dataset.deleted = '1';
      row.style.display = 'none';
    } else {
      row.remove();
    }
    updatePositionLabels(holder);
  }

  function startDrag(event, handle) {
    const row = handle.closest('.option-editor');
    const holder = holderFor(row);
    if (!row || !holder || activeRows(holder).length < 2) return;

    event.preventDefault();
    event.stopPropagation();

    dragState = {
      pointerId:event.pointerId,
      row,
      holder,
      handle
    };

    row.classList.add('sm-option-dragging');
    document.body.classList.add('sm-option-is-dragging');
    try { handle.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function dragMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();

    const { row, holder } = dragState;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.option-editor');

    activeRows(holder).forEach(item => item.classList.toggle('sm-option-drag-over', item === target && item !== row));

    if (target && target !== row && holderFor(target) === holder) {
      const rect = target.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      if (before) holder.insertBefore(row, target);
      else holder.insertBefore(row, target.nextSibling);
      updatePositionLabels(holder);
    }

    const scroller = document.querySelector('.admin-modal-card');
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (event.clientY < rect.top + 58) scroller.scrollBy(0, -11);
      else if (event.clientY > rect.bottom - 58) scroller.scrollBy(0, 11);
    }
  }

  function endDrag(event) {
    if (!dragState || (event && event.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const { row, holder, handle, pointerId } = dragState;
    row.classList.remove('sm-option-dragging');
    activeRows(holder).forEach(item => item.classList.remove('sm-option-drag-over'));
    document.body.classList.remove('sm-option-is-dragging');
    try { handle.releasePointerCapture(pointerId); } catch (_) {}
    dragState = null;
    updatePositionLabels(holder);
  }

  function captureOrder() {
    return activeRows('optionsEditor')
      .map((row, index) => ({
        position:index + 1,
        id:row.dataset.optionId || '',
        name:row.querySelector('.oe-name')?.value.trim() || '',
        price:Number(row.querySelector('.oe-price')?.value || 0)
      }))
      .filter(item => item.id || item.name);
  }

  function sameNumber(a, b) {
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 0.0001;
  }

  async function persistOrder(productId, snapshot) {
    if (!productId || !snapshot.length || typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('product_options')
      .select('id,name_ar,price,sort_order,created_at')
      .eq('product_id', productId)
      .order('sort_order', { ascending:true })
      .order('created_at', { ascending:true });

    if (error) throw error;

    const serverRows = Array.isArray(data) ? data : [];
    const used = new Set();
    const resolved = [];

    for (const item of snapshot) {
      let target = item.id ? serverRows.find(row => String(row.id) === String(item.id)) : null;

      if (!target && item.name) {
        target = serverRows.find(row =>
          !used.has(String(row.id)) &&
          String(row.name_ar || '').trim() === item.name &&
          sameNumber(row.price, item.price)
        );
      }

      if (!target && item.name) {
        target = serverRows.find(row =>
          !used.has(String(row.id)) &&
          String(row.name_ar || '').trim() === item.name
        );
      }

      if (!target) continue;
      used.add(String(target.id));
      resolved.push({ id:target.id, position:item.position });
    }

    if (resolved.length !== snapshot.length) {
      throw new Error('تعذر مطابقة بعض الخيارات بعد الحفظ. افتح الصنف وحاول مرة ثانية.');
    }

    for (const item of resolved) {
      const payload = { sort_order:item.position };
      if (serverRows[0] && Object.prototype.hasOwnProperty.call(serverRows[0], 'updated_at')) payload.updated_at = new Date().toISOString();
      const { error:updateError } = await supabaseClient.from('product_options').update(payload).eq('id', item.id);
      if (updateError) throw updateError;
    }
  }

  function patchSaveFunction() {
    if (savePatched) return true;
    if (typeof window.saveAdminProduct !== 'function') return false;

    const oldSaveAdminProduct = window.saveAdminProduct;
    window.saveAdminProduct = async function(productId) {
      const snapshot = captureOrder();
      const result = await oldSaveAdminProduct.apply(this, arguments);

      const msg = document.getElementById('editorMsg');
      if (msg?.classList.contains('err')) return result;

      try {
        await persistOrder(productId, snapshot);
        if (typeof window.loadAdminDashboard === 'function') await window.loadAdminDashboard();
        if (typeof window.showEditorMsg === 'function') window.showEditorMsg('تم حفظ الصنف وترتيب الخيارات بنجاح ✓', true);
      } catch (error) {
        console.error('OPTION ORDER SAVE ERROR:', error);
        if (typeof window.showEditorMsg === 'function') {
          window.showEditorMsg('تم حفظ الصنف لكن فشل حفظ ترتيب الخيارات: ' + (error.message || error), false);
        }
      }

      return result;
    };

    savePatched = true;
    return true;
  }

  function lockBackgroundScroll() {
    if (modalIsLocked) return;
    modalIsLocked = true;
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add('sm-admin-modal-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockBackgroundScroll() {
    if (!modalIsLocked) return;
    modalIsLocked = false;
    document.body.classList.remove('sm-admin-modal-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, lockedScrollY);
  }

  function syncModalScrollLock() {
    const modal = document.getElementById('editorModal');
    if (!modal) return;
    if (modal.classList.contains('open')) lockBackgroundScroll();
    else unlockBackgroundScroll();
  }

  function bindModalScrollLock() {
    const modal = document.getElementById('editorModal');
    if (!modal || modal.dataset.smScrollLockBound === '1') return;
    modal.dataset.smScrollLockBound = '1';
    new MutationObserver(syncModalScrollLock).observe(modal, { attributes:true, attributeFilter:['class','aria-hidden'] });
    modal.addEventListener('touchmove', event => {
      if (event.target === modal) event.preventDefault();
    }, { passive:false });
    syncModalScrollLock();
  }

  document.addEventListener('click', event => {
    const deleteButton = event.target.closest('[data-sm-option-delete]');
    if (!deleteButton) return;
    event.preventDefault();
    event.stopPropagation();
    removeRow(deleteButton.closest('.option-editor'));
  }, true);

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-sm-option-drag]');
    if (handle) startDrag(event, handle);
  }, true);
  document.addEventListener('pointermove', dragMove, { capture:true, passive:false });
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  function boot() {
    installStyles();
    patchSaveFunction();
    bindModalScrollLock();
    enhanceEditors();

    const observer = new MutationObserver(() => {
      patchSaveFunction();
      bindModalScrollLock();
      if (document.getElementById('optionsEditor') || document.getElementById('newOptionsEditor')) {
        requestAnimationFrame(enhanceEditors);
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });

    const timer = setInterval(() => {
      patchSaveFunction();
      bindModalScrollLock();
      enhanceEditors();
    }, 350);
    setTimeout(() => clearInterval(timer), 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
