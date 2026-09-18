import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const cartCode = fs.readFileSync('js/cart.js', 'utf8');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
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
    name: { ar: 'منتج تجريبي' },
    image: 'https://cdn.example.test/p1.webp',
    options: [{ id: 'o1', ar: 'قطعة', price: 10000 }]
  }]
};

window.eval(cartCode);

const fail = message => {
  console.error('Cart quantity regression failed:', message);
  process.exitCode = 1;
};

if (typeof window.RESTBR_CART_ADD_QUANTITY !== 'function') {
  fail('RESTBR_CART_ADD_QUANTITY API is missing.');
} else {
  const product = window.RESTBR_DB.products[0];

  const first = window.RESTBR_CART_ADD_QUANTITY(product, 0, 3);
  if (first !== true) fail('Adding quantity 3 did not report success.');

  let cart = JSON.parse(window.localStorage.getItem('RESTBR_CART_V1') || '[]');
  if (cart.length !== 1 || cart[0]?.qty !== 3) {
    fail('First quantity add did not create one row with qty 3.');
  }

  const second = window.RESTBR_CART_ADD_QUANTITY(product, 0, 2);
  if (second !== true) fail('Adding another quantity 2 did not report success.');

  cart = JSON.parse(window.localStorage.getItem('RESTBR_CART_V1') || '[]');
  if (cart.length !== 1 || cart[0]?.qty !== 5) {
    fail('Repeated quantity add did not merge into one row with qty 5.');
  }

  if (cart[0]?.price !== 10000 || cart[0]?.optionId !== 'o1') {
    fail('Quantity add changed the live price or option identity.');
  }

  const totalText = document.getElementById('smCartTotal')?.textContent || '';
  if (!totalText.includes('50,000')) {
    fail('Rendered cart total did not update to 50,000.');
  }
}

if (!process.exitCode) {
  console.log('Cart quantity regression passed.');
}

dom.window.close();
