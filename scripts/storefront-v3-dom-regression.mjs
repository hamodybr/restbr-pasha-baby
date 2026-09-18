import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const detailsCode = fs.readFileSync('storefront-v3/product-details-v3.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.test/storefront-v3/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

window.RESTBR_SAFE_MEDIA_URL = value => String(value || '');
window.RESTBR_DB = {
  products: [{
    id: 'p1',
    name: { ar: 'منتج تجريبي' },
    category: { id: 'c1', ar: 'العناية' },
    image: 'https://cdn.example.test/main.webp',
    badges: {},
    options: [
      { id: 'o1', ar: 'صغير', price: 10000, originalPrice: 12000 },
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
        return { data: { id: 'p1', description_ar: 'وصف المنتج التجريبي' }, error: null };
      }
    };
  }
};

document.getElementById('smMenu').innerHTML = `
  <article data-product-card="p1" id="product-p1" class="sm-card">
    <div class="sm-img">
      <img class="sm-product-image" src="https://cdn.example.test/main.webp" alt="منتج تجريبي">
    </div>
    <div class="sm-info">
      <div class="sm-name">منتج تجريبي</div>
      <button class="sm-choose-options" type="button" data-product-id="p1">اختيار</button>
    </div>
  </article>`;

window.eval(detailsCode);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const fail = message => {
  console.error('Storefront V3 DOM regression failed:', message);
  process.exitCode = 1;
};

const detailsButton = document.querySelector('.pb-v3-details-btn');
if (!detailsButton) fail('Details button was not attached without observers.');

detailsButton?.click();
await new Promise(resolve => window.requestAnimationFrame(() => resolve()));
await new Promise(resolve => setTimeout(resolve, 0));

const sheet = document.getElementById('pbV3ProductSheet');
if (!sheet || sheet.hidden || !sheet.classList.contains('open')) {
  fail('Product details sheet did not open.');
}

if (document.querySelectorAll('.pb-v3-product-slide').length !== 3) {
  fail('Gallery did not build main image + two color images.');
}

const optionButtons = [...document.querySelectorAll('[data-v3-option-index]')];
const colorButtons = [...document.querySelectorAll('[data-v3-color-id]')];

if (optionButtons.length !== 2) fail('Expected two product options.');
if (colorButtons.length !== 2) fail('Expected two product colors.');

const add = document.getElementById('pbV3ProductAdd');
if (!add?.disabled) fail('Add button should require option and color selection.');

optionButtons[1]?.click();
if (!add?.disabled) fail('Add button should still require a color.');

colorButtons[0]?.click();
if (add?.disabled) fail('Add button did not enable after valid option + color.');

if (!document.querySelector('[data-v3-slide-index="1"]')?.classList.contains('selected')) {
  fail('Selecting color did not sync the gallery to the color image.');
}

const priceText = document.getElementById('pbV3ProductPrice')?.textContent || '';
if (!priceText.includes('15,000')) fail('Selected option price did not update.');

add?.click();
if (sheet?.classList.contains('open')) fail('Product details sheet did not close after add.');

if (!process.exitCode) {
  console.log('Storefront V3 DOM regression passed.');
}

dom.window.close();
