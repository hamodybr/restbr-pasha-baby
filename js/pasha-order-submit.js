(() => {
  if (window.__PASHA_ORDER_SUBMIT_V1__) return;
  window.__PASHA_ORDER_SUBMIT_V1__ = true;

  const CART_KEY = 'RESTBR_CART_V1';
  const TOKEN_KEY = 'PASHA_ORDER_TOKEN_V1';
  const LAST_ORDER_KEY = 'PASHA_LAST_ORDER_V1';
  let submitting = false;

  const config = () => window.RESTBR_CONFIG || {};
  const db = () => window.RESTBR_DB || {};

  function normalizeDigits(value) {
    return String(value ?? '')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
  }

  function normalizePhone(value) {
    let raw = normalizeDigits(value).trim().replace(/[\s().-]+/g, '');
    if (raw.startsWith('00')) raw = '+' + raw.slice(2);
    const digits = raw.replace(/\D/g, '');
    if (/^07\d{9}$/.test(digits)) return '+964' + digits.slice(1);
    if (/^7\d{9}$/.test(digits)) return '+964' + digits;
    if (/^9647\d{9}$/.test(digits)) return '+' + digits;
    if (raw.startsWith('+') && /^\+[1-9]\d{7,14}$/.test('+' + digits)) return '+' + digits;
    if (/^[1-9]\d{7,14}$/.test(digits)) return '+' + digits;
    return '';
  }

  function whatsappNumber() {
    const restaurant = db().restaurant || {};
    let digits = String(restaurant.whatsappNumber || restaurant.whatsapp || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (/^07\d{9}$/.test(digits)) digits = '964' + digits.slice(1);
    if (/^7\d{9}$/.test(digits)) digits = '964' + digits;
    return digits;
  }

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 100) : [];
    } catch (_) {
      return [];
    }
  }

  function currentOrderType() {
    return document.querySelector('[data-order-type].active')?.dataset?.orderType || 'delivery';
  }

  function toast(message, error = false) {
    let el = document.getElementById('smCartToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pbOrderToast';
      el.style.cssText = 'position:fixed;z-index:99999;left:50%;bottom:22px;transform:translateX(-50%);max-width:min(92vw,420px);padding:12px 16px;border-radius:14px;background:#1b1714;color:#fff;font:700 13px/1.6 system-ui;text-align:center;box-shadow:0 12px 35px #0005';
      document.body.appendChild(el);
    }
    el.textContent = message;
    if (el.id === 'smCartToast') {
      el.classList.add('show');
      clearTimeout(el.__pbTimer);
      el.__pbTimer = setTimeout(() => el.classList.remove('show'), error ? 3000 : 1800);
    } else {
      el.style.display = 'block';
      clearTimeout(el.__pbTimer);
      el.__pbTimer = setTimeout(() => { el.style.display = 'none'; }, error ? 3500 : 2000);
    }
  }

  function money(value) {
    return Number(value || 0).toLocaleString('en-US') + ' د.ع';
  }

  function itemName(item) {
    return String(item?.name?.ar || item?.name?.ku || item?.name?.en || 'منتج').trim();
  }

  function optionName(item) {
    const name = itemName(item);
    const option = String(item?.option?.ar || item?.option?.ku || item?.option?.en || '').trim();
    return option && option !== name ? option : '';
  }

  function stableToken(signature) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
      if (saved?.signature === signature && /^[0-9a-f-]{36}$/i.test(saved?.token || '')) {
        return saved.token;
      }
    } catch (_) {}

    const token = globalThis.crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(16).padStart(12, '0')}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`.slice(0, 36);
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ signature, token })); } catch (_) {}
    return token;
  }

  function buildSignature(payload) {
    return JSON.stringify({
      name: payload.name,
      phone: payload.phone,
      orderType: payload.orderType,
      address: payload.address,
      notes: payload.notes,
      items: payload.items.map(item => [item.productId, item.optionId || '', item.optionIndex, item.quantity]),
    });
  }

  async function saveOrder(payload) {
    const supabaseUrl = String(config().supabaseUrl || '').replace(/\/$/, '');
    const publishableKey = String(config().supabasePublishableKey || '').trim();
    if (!supabaseUrl || !publishableKey) throw new Error('تعذر الاتصال بنظام الطلبات.');

    const response = await fetch(`${supabaseUrl}/functions/v1/pasha-orders`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true) {
      throw new Error(String(data?.error || 'تعذر تسجيل الطلب. حاول مرة ثانية.'));
    }
    return data;
  }

  function openWhatsApp(order, checkout, cart) {
    const number = whatsappNumber();
    if (!number) throw new Error('رقم واتساب المتجر غير مضبوط.');

    const lines = [
      '🛍️ *PASHA BABY*',
      `🧾 رقم الطلب: \`${order.order_number || order.orderNumber || ''}\``,
      '',
      `👤 *${checkout.name}*`,
      `📞 ${checkout.phone}`,
      `${checkout.orderType === 'delivery' ? '🚚 توصيل' : '🥡 استلام'}`,
    ];

    if (checkout.orderType === 'delivery' && checkout.address) {
      lines.push(`📍 ${checkout.address}`);
    }

    lines.push('', '━━━━━━━━━━━━', '🛒 *تفاصيل الطلب*', '');
    cart.forEach((item, index) => {
      const option = optionName(item);
      lines.push(`${index + 1}. *${itemName(item)}*`);
      lines.push(option ? `   └ ${option} × ${item.qty}` : `   └ × ${item.qty}`);
      lines.push(`   \`${money(Number(item.price || 0) * Number(item.qty || 0))}\``);
      if (index < cart.length - 1) lines.push('');
    });

    lines.push('', '━━━━━━━━━━━━', `💰 *الإجمالي*: \`${money(order.total)}\``);
    if (checkout.notes) lines.push('', '📝 *ملاحظات الطلب*', checkout.notes);

    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
        orderNumber: order.order_number || order.orderNumber || '',
        orderId: order.order_id || order.orderId || '',
        total: Number(order.total || 0),
        phone: checkout.phone,
        savedAt: new Date().toISOString(),
      }));
    } catch (_) {}

    window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  async function submit(event, button) {
    if (submitting) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const cart = readCart();
    if (!cart.length) return;

    const name = String(document.getElementById('smCustomerName')?.value || '').trim().slice(0, 80);
    const rawPhone = document.getElementById('smCustomerPhone')?.value || '';
    const phone = normalizePhone(rawPhone);
    const orderType = currentOrderType();
    const address = String(document.getElementById('smCustomerAddress')?.value || '').trim().slice(0, 300);
    const notes = String(document.getElementById('smCustomerNotes')?.value || '').trim().slice(0, 500);

    if (!name || !phone || (orderType === 'delivery' && !address)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const items = cart.map(item => ({
      productId: String(item?.productId || ''),
      optionId: item?.optionId == null ? '' : String(item.optionId),
      optionIndex: Math.max(0, Math.trunc(Number(item?.optionIndex || 0))),
      quantity: Math.max(1, Math.min(99, Math.trunc(Number(item?.qty || 1)))),
    }));

    const checkout = { name, phone, orderType, address, notes, items };
    const signature = buildSignature(checkout);
    const clientToken = stableToken(signature);
    const payload = { ...checkout, clientToken, locationUrl: '' };

    submitting = true;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '⏳ جاري تثبيت الطلب...';

    try {
      const order = await saveOrder(payload);
      button.textContent = '✓ تم تسجيل الطلب';
      toast(`تم تسجيل الطلب ${order.order_number || ''} ✓`);
      setTimeout(() => openWhatsApp(order, checkout, cart), 180);
    } catch (error) {
      console.error('PASHA ORDER SUBMIT ERROR:', error);
      button.disabled = false;
      button.textContent = originalText;
      submitting = false;
      toast(error instanceof Error ? error.message : 'تعذر تسجيل الطلب. حاول مرة ثانية.', true);
    }
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#smSendWhatsApp');
    if (!button) return;
    void submit(event, button);
  }, true);
})();
