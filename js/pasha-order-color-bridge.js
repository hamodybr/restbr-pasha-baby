(() => {
  if (window.__PASHA_ORDER_COLOR_BRIDGE_V1__) return;
  window.__PASHA_ORDER_COLOR_BRIDGE_V1__ = true;

  const CART_KEY = 'RESTBR_CART_V1';
  const TOKEN_KEY = 'PASHA_ORDER_TOKEN_V1';
  const COLOR_SIG_KEY = 'PASHA_ORDER_COLOR_SIGNATURE_V1';
  const originalFetch = window.fetch.bind(window);

  const norm = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');

  function readCart() {
    try {
      const rows = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart(rows) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(rows)); } catch (_) {}
  }

  function productFor(item) {
    const products = window.RESTBR_DB?.products || [];
    return products.find(row => String(row.id || '') === String(item?.productId || '')) || null;
  }

  function optionText(item) {
    return [item?.option?.ar, item?.option?.ku, item?.option?.en]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(' | ');
  }

  function itemName(item) {
    return String(item?.name?.ar || item?.name?.ku || item?.name?.en || 'منتج').trim();
  }

  function resolveColor(item) {
    const product = productFor(item);
    const colors = Array.isArray(product?.colors) ? product.colors.filter(color => color?.isAvailable !== false) : [];
    if (!colors.length) return null;

    if (item?.colorId) {
      const direct = colors.find(color => String(color.id) === String(item.colorId));
      if (direct) return direct;
    }

    const text = norm(optionText(item));
    if (text) {
      const matches = colors
        .map(color => ({ color, names: [color.ar, color.ku, color.en].map(norm).filter(Boolean) }))
        .filter(entry => entry.names.some(name => name && text.includes(name)));
      if (matches.length === 1) return matches[0].color;

      const markerMatch = text.match(/(?:اللون|رنگ|color)\s*[:：-]?\s*([^|•]+)/i);
      if (markerMatch?.[1]) {
        const wanted = norm(markerMatch[1]);
        const marked = colors.find(color => [color.ar, color.ku, color.en].map(norm).some(name => name === wanted));
        if (marked) return marked;
      }
    }

    const image = String(item?.image || '').split('?')[0];
    if (image) {
      const byImage = colors.find(color => String(color.image || '').split('?')[0] === image);
      if (byImage) return byImage;
    }

    return colors.length === 1 ? colors[0] : null;
  }

  function ensureColorLabel(item, color) {
    if (!item || !color) return false;
    item.option = item.option && typeof item.option === 'object' ? item.option : { ar: '', ku: '', en: '' };
    let changed = false;
    const labels = {
      ar: ['اللون', color.ar || color.ku || color.en || ''],
      ku: ['رەنگ', color.ku || color.ar || color.en || ''],
      en: ['Color', color.en || color.ar || color.ku || ''],
    };

    for (const locale of ['ar', 'ku', 'en']) {
      const [prefix, colorName] = labels[locale];
      if (!colorName) continue;
      const current = String(item.option[locale] || '').trim();
      const currentNorm = norm(current);
      const colorNorm = norm(colorName);
      if (currentNorm.includes(colorNorm) && /(?:اللون|رنگ|color)/i.test(current)) continue;
      item.option[locale] = current ? `${current} • ${prefix}: ${colorName}` : `${prefix}: ${colorName}`;
      changed = true;
    }
    return changed;
  }

  function enrichCart() {
    const cart = readCart();
    if (!cart.length) return cart;
    let changed = false;

    cart.forEach(item => {
      const color = resolveColor(item);
      if (!color) return;
      const next = {
        colorId: String(color.id || ''),
        colorName: String(color.ar || color.ku || color.en || ''),
        colorHex: String(color.hex || ''),
        colorImage: String(color.image || ''),
      };
      for (const [key, value] of Object.entries(next)) {
        if (String(item[key] || '') !== value) {
          item[key] = value;
          changed = true;
        }
      }
      if (ensureColorLabel(item, color)) changed = true;
      if (color.image && String(item.image || '') !== String(color.image)) {
        item.image = color.image;
        changed = true;
      }
    });

    if (changed) saveCart(cart);

    const colorSignature = cart.map(item => `${item.productId || ''}:${item.colorId || ''}:${item.qty || 1}`).join('|');
    try {
      const previous = sessionStorage.getItem(COLOR_SIG_KEY) || '';
      if (previous && previous !== colorSignature) sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.setItem(COLOR_SIG_KEY, colorSignature);
    } catch (_) {}

    return cart;
  }

  function colorSummary(cart) {
    const colored = cart.filter(item => String(item?.colorName || '').trim());
    if (!colored.length) return '';
    const lines = colored.map(item => `• ${itemName(item)} × ${Math.max(1, Number(item.qty || 1))}: ${String(item.colorName).trim()}`);
    return `🎨 الألوان:\n${lines.join('\n')}`;
  }

  document.addEventListener('click', event => {
    if (!event.target.closest?.('#smSendWhatsApp')) return;
    enrichCart();
  }, true);

  window.fetch = async function pashaColorAwareFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!url.includes('/functions/v1/pasha-orders') || method !== 'POST' || typeof init?.body !== 'string') {
      return originalFetch(input, init);
    }

    try {
      const payload = JSON.parse(init.body);
      const cart = enrichCart();
      const summary = colorSummary(cart);
      if (Array.isArray(payload?.items)) {
        payload.items = payload.items.map((item, index) => ({
          ...item,
          colorId: String(cart[index]?.colorId || ''),
        }));
      }
      if (summary) {
        const currentNotes = String(payload.notes || '').trim();
        payload.notes = `${summary}${currentNotes ? `\n\n${currentNotes}` : ''}`.slice(0, 500);
      }
      init = { ...init, body: JSON.stringify(payload) };
    } catch (_) {}

    return originalFetch(input, init);
  };

  window.PASHA_ENRICH_CART_COLORS = enrichCart;
})();
