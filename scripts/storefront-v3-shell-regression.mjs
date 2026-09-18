import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const shellCode = fs.readFileSync('storefront-v3/storefront-v3.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.test/storefront-v3/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

window.RESTBR_SAFE_MEDIA_URL = value => String(value || '');
window.RESTBR_OPTIMIZED_MEDIA_URL = value => String(value || '');
window.RESTBR_DB = {
  restaurant: {
    nameAr: 'پاشا بيبي',
    nameEn: 'Pasha Baby',
    announcementEnabled: true,
    announcement: { ar: 'التوصيل متوفر لجميع محافظات العراق 🇮🇶' },
    deliveryInfo: { ar: 'التوصيل متوفر لجميع محافظات العراق 🇮🇶' },
    footerLocation: { ar: 'دهوك — بروشكي' }
  },
  products: [{
    id: 'p1',
    name: { ar: 'حفاضات أطفال' },
    category: { id: 'c1', ar: 'الحفاضات والمناديل' },
    image: 'https://cdn.example.test/diaper.webp',
    badges: { popular: true },
    discountPercent: 16.7,
    options: [{ ar: 'باكيت', price: 10000, originalPrice: 12000 }]
  }, {
    id: 'p2',
    name: { ar: 'مناديل مبللة' },
    category: { id: 'c1', ar: 'الحفاضات والمناديل' },
    image: 'https://cdn.example.test/wipes.webp',
    badges: { new: true },
    options: [{ ar: 'علبة', price: 5000, originalPrice: 5000 }]
  }]
};

document.getElementById('smCats').innerHTML = `
  <button class="sm-cat active" data-cat="c1" data-cat-id="c1">الحفاضات والمناديل</button>`;

document.getElementById('smMenu').innerHTML = `
  <section class="sm-section">
    <div class="sm-grid">
      <article class="sm-card" data-product-card="p1">
        <div class="sm-img"><img class="sm-product-image" src="https://cdn.example.test/diaper.webp" alt=""></div>
        <div class="sm-info">
          <div class="sm-name">حفاضات أطفال</div>
          <button class="sm-direct-add" type="button" data-product-id="p1" data-option-index="0"><b>إضافة للسلة</b></button>
        </div>
      </article>
    </div>
  </section>`;

window.eval(shellCode);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 30));

const fail = message => {
  console.error('Storefront V3 shell regression failed:', message);
  process.exitCode = 1;
};

const announcement = document.getElementById('pbV3Announcement');
if (!announcement || announcement.hidden) fail('Store announcement should be visible.');
if (!document.getElementById('pbV3AnnouncementText')?.textContent.includes('جميع محافظات العراق')) {
  fail('Announcement did not come from restaurant settings.');
}
if (!document.getElementById('pbV3DeliveryBenefit')?.textContent.includes('جميع محافظات العراق')) {
  fail('Delivery benefit did not sync from restaurant settings.');
}

const cat = document.querySelector('#smCats .sm-cat');
if (!cat?.querySelector('.pb-v3-cat-media.has-image img')) {
  fail('Category did not use a real product image.');
}
if (!cat?.querySelector('.pb-v3-cat-copy small')?.textContent.includes('2 منتج')) {
  fail('Category product count is missing or wrong.');
}

const summary = document.querySelector('[data-product-card="p1"] .pb-v3-card-summary');
if (!summary) fail('Compact card price summary was not added.');
if (!summary?.textContent.includes('10,000') || !summary?.textContent.includes('12,000')) {
  fail('Card price summary did not include current and old price.');
}

if (document.querySelectorAll('[data-v3-highlight-list="popular"] .pb-v3-feature-card').length !== 1) {
  fail('Popular rail did not use real popular products.');
}
if (document.querySelectorAll('[data-v3-highlight-list="new"] .pb-v3-feature-card').length !== 1) {
  fail('New rail did not use real new products.');
}
if (!document.getElementById('pbV3OfferSection')?.hidden) {
  fail('Offer rail should stay hidden with no real offers.');
}

const hero = document.querySelector('.pb-v3-hero-art img');
if (!hero?.src.includes('diaper.webp')) {
  fail('Hero did not select a real catalog product.');
}

if (!process.exitCode) {
  console.log('Storefront V3 shell regression passed.');
}

dom.window.close();
