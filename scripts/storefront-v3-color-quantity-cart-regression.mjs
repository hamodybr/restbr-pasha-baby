import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const cartCode = fs.readFileSync('js/cart.js', 'utf8');
const detailsCode = fs.readFileSync('storefront-v3/product-details-v3.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.test/storefront-v3/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

window.RESTBR_SAFE_MEDIA_URL = value => String(value || '');
window.RESTBR_LANG = () => 'ar';
window.RESTBR_HOURS_READY = true;
window.RESTBR_CONFIG = { orderIdPrefix: 'PB' };
window.RESTBR_DB = {
  restaurant: {
    isOpen: true,
    ordersEnabled: true,
    deliveryEnabled: true,
    pickupEnabled: true,
    whatsappNumber: '9647500200660'
  },
  products: [{
    id: 'p1',
    name: { ar: 'عربة أطفال' },
    category: { id: 'c1', ar: 'العربات' },
    image: 'https://cdn.example.test/main.webp',
    badges: {},
    options: [
      { id: 'o1', ar: 'صغير', price: 10000, originalPrice: 10000 },
      { id: 'o2', ar: 'كبير', price: 15000, originalPrice: 15000 }
    ],
    colors: [
      { id: 'green', ar: 'أخضر', hex: '#5f7868', image: 'https://cdn.example.test/green.webp', isAvailable: true },
      { id: 'beige', ar: 'بيج', hex: '#eadfcd', image: 'https://cdn.example.test/beige.webp', isAvailable: true }
    ]
  }]
};

window.supabaseClient = {
  from() {
    return {
      select() { return this; },
      eq() { return this; },
      async maybeSingle() {
        return { data: { id: 'p1', description_ar: '' }, error: null };
      }
    };
  }
};

document.getElementById('smMenu').innerHTML = `
  <article data-product-card="p1" class="sm-card">
    <div class="sm-img"><img class="sm-product-image" src="https://cdn.example.test/main.webp" alt="عربة أطفال"></div>
    <div class="sm-info">
      <div class="sm-name">عربة أطفال</div>
      <button class="sm-choose-options" type="button" data-product-id="p1">اختيار</button>
    </div>
  </article>`;

window.eval(cartCode);
window.eval(detailsCode);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));

const fail = message => {
  console.error('V3 color + quantity cart regression failed:', message);
  process.exitCode = 1;
};

document.querySelector('.pb-v3-details-btn')?.click();
await new Promise(resolve => window.requestAnimationFrame(() => resolve()));
await new Promise(resolve => setTimeout(resolve, 0));

document.querySelector('[data-v3-option-index="1"]')?.click();
document.querySelector('[data-v3-color-id="green"]')?.click();
document.getElementById('pbV3QtyPlus')?.click();
document.getElementById('pbV3QtyPlus')?.click();
document.getElementById('pbV3ProductAdd')?.click();

const cart = JSON.parse(window.localStorage.getItem('RESTBR_CART_V1') || '[]');

if (cart.length !== 1) {
  fail('Expected exactly one cart line after one color/quantity add.');
} else {
  const item = cart[0];
  if (item.qty !== 3) fail('Cart did not store quantity 3.');
  if (item.productId !== 'p1') fail('Cart product identity changed.');
  if (item.optionId !== 'o2') fail('Cart did not preserve the selected live option ID.');
  if (!String(item.option?.ar || '').includes('كبير')) fail('Selected option name is missing.');
  if (!String(item.option?.ar || '').includes('اللون: أخضر')) fail('Selected color name is missing.');
  if (!String(item.image || '').includes('green.webp')) fail('Selected color image is missing.');
  if (item.price !== 15000) fail('Selected live option price is wrong.');
}

const total = document.getElementById('smCartTotal')?.textContent || '';
if (!total.includes('45,000')) {
  fail('Rendered cart total did not equal 45,000.');
}

if (!process.exitCode) {
  console.log('V3 color + quantity cart regression passed.');
}

dom.window.close();
