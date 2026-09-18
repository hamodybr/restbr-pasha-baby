import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('storefront-v3/index.html', 'utf8');
const shellCode = fs.readFileSync('storefront-v3/storefront-v3.js', 'utf8');
const unavailableCode = fs.readFileSync('js/unavailable-card-state.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.test/storefront-v3/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

window.matchMedia = query => ({
  matches: String(query).includes('max-width:680px'),
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return false; }
});
window.localStorage.setItem('RESTBR_CART_V1', JSON.stringify([
  { key: 'p1:o1', qty: 2 },
  { key: 'p2:o1', qty: 1 }
]));
window.RESTBR_SAFE_MEDIA_URL = value => String(value || '');
window.RESTBR_OPTIMIZED_MEDIA_URL = value => String(value || '');
window.RESTBR_DB = {
  restaurant: {
    nameAr: 'پاشا بيبي',
    nameEn: 'Pasha Baby',
    announcementEnabled: true,
    announcement: { ar: 'التوصيل متوفر لجميع محافظات العراق 🇮🇶' },
    deliveryInfo: { ar: 'التوصيل متوفر لجميع محافظات العراق 🇮🇶' },
    footerLocation: { ar: 'دهوك — بروشكي' },
    deliveryEnabled: true,
    pickupEnabled: true,
    phone: '07500200660',
    location: 'https://maps.example.test/pasha',
    whatsapp: 'https://wa.me/9647500200660'
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

document.querySelector('.pb-v3-compat-header').insertAdjacentHTML('beforeend', `
  <div id="smSearchWrap">
    <div class="sm-search-row">
      <button id="smSearchToggle" type="button">Search</button>
      <input id="smSearchInput" class="sm-search-input">
      <button id="smSearchClear" type="button">×</button>
    </div>
    <div id="smSearchCount" class="sm-search-count"></div>
  </div>`);

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
      <article class="sm-card" data-product-card="ghost-unavailable">
        <div class="sm-off">غير متوفر</div>
        <div class="sm-img"></div>
        <div class="sm-info"><div class="sm-name">غير متوفر</div></div>
      </article>
    </div>
  </section>`;

window.eval(unavailableCode);
window.eval(shellCode);
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 30));

const fail = message => {
  console.error('Storefront V3 shell regression failed:', message);
  process.exitCode = 1;
};

const topCartCount = document.getElementById('pbV3CartCount');
const bottomCartCount = document.getElementById('pbV3BottomCartCount');
if (topCartCount?.hidden || bottomCartCount?.hidden) {
  fail('Cart count should be visible in both V3 navigation surfaces.');
}
if (topCartCount?.textContent !== '3' || bottomCartCount?.textContent !== '3') {
  fail('Header and bottom cart counts are not synchronized.');
}

const unavailableCard = document.querySelector('[data-product-card="ghost-unavailable"]');
if (!unavailableCard?.classList.contains('sm-unavailable-card')) {
  fail('Unavailable V3 card did not sync through the event-driven API.');
}
const unavailableStyle = document.getElementById('smUnavailableCardStyles')?.textContent || '';
if (!unavailableStyle.includes('backdrop-filter:none')) {
  fail('Unavailable V3 card still injects backdrop blur.');
}

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
if (!document.getElementById('pbV3PromoBanner')?.hidden) {
  fail('Promo banner should stay hidden with no real offers.');
}

let openedPromoProduct = '';
window.PASHA_V3_OPEN_PRODUCT_DETAILS = id => {
  openedPromoProduct = String(id || '');
  return true;
};

window.RESTBR_DB.products[0].badges.offer = true;
window.dispatchEvent(new window.CustomEvent('restbr:prices-updated'));
await new Promise(resolve => setTimeout(resolve, 0));

const promo = document.getElementById('pbV3PromoBanner');
if (!promo || promo.hidden) {
  fail('Promo banner did not appear for a real offer product.');
}
if (document.getElementById('pbV3PromoTitle')?.textContent !== 'حفاضات أطفال') {
  fail('Promo banner title did not come from the offer product.');
}
if (!document.getElementById('pbV3PromoImage')?.src.includes('diaper.webp')) {
  fail('Promo banner image did not come from the offer product.');
}
if (document.getElementById('pbV3PromoDiscount')?.textContent !== '-17%') {
  fail('Promo banner discount did not reflect real discount data.');
}
if (document.getElementById('pbV3OfferSection')?.hidden ||
    document.querySelectorAll('[data-v3-highlight-list="offer"] .pb-v3-feature-card').length !== 1) {
  fail('Offer rail did not appear with the same real offer product.');
}
if (document.getElementById('pbV3DrawerOffers')?.hidden) {
  fail('Drawer offers action stayed hidden after a real offer appeared.');
}

document.getElementById('pbV3PromoOpen')?.click();
if (openedPromoProduct !== 'p1') {
  fail('Promo banner details action did not open the real offer product.');
}

window.RESTBR_DB.products[0].badges.offer = false;
window.dispatchEvent(new window.CustomEvent('restbr:prices-updated'));
await new Promise(resolve => setTimeout(resolve, 0));

if (!document.getElementById('pbV3PromoBanner')?.hidden ||
    !document.getElementById('pbV3OfferSection')?.hidden ||
    !document.getElementById('pbV3DrawerOffers')?.hidden) {
  fail('Offer surfaces did not hide after the real offer was removed.');
}

const whatsappFab = document.getElementById('pbV3WhatsAppFab');
if (!whatsappFab || whatsappFab.hidden || !whatsappFab.href.includes('wa.me/9647500200660')) {
  fail('Floating WhatsApp action did not sync from store settings.');
}

if (!document.getElementById('pbV3DrawerOffers')?.hidden) {
  fail('Drawer offers action should stay hidden without real offers.');
}

const mapLink = document.getElementById('pbV3InfoMap');
const callLink = document.getElementById('pbV3InfoCall');
if (!mapLink?.href.includes('maps.example.test/pasha')) {
  fail('Store info map did not sync from restaurant settings.');
}
if (callLink?.getAttribute('href') !== 'tel:07500200660') {
  fail('Store info call link did not sync from restaurant settings.');
}
if (!document.getElementById('pbV3InfoPickup')?.textContent.includes('يمكن اختيار')) {
  fail('Pickup availability did not sync from restaurant settings.');
}
if (!document.getElementById('pbV3InfoDelivery')?.textContent.includes('جميع محافظات العراق')) {
  fail('Store info delivery text did not sync from restaurant settings.');
}

window.RESTBR_DB.restaurant.deliveryEnabled = false;
window.RESTBR_DB.restaurant.pickupEnabled = false;
window.dispatchEvent(new window.CustomEvent('restbr:prices-updated'));
await new Promise(resolve => setTimeout(resolve, 0));

if (!document.getElementById('pbV3DeliveryBenefitCard')?.hidden ||
    !document.getElementById('pbV3PickupBenefitCard')?.hidden) {
  fail('Disabled delivery/pickup benefits remained visible.');
}

window.RESTBR_DB.restaurant.deliveryEnabled = true;
window.RESTBR_DB.restaurant.pickupEnabled = true;
window.dispatchEvent(new window.CustomEvent('restbr:prices-updated'));
await new Promise(resolve => setTimeout(resolve, 0));

if (document.getElementById('pbV3DeliveryBenefitCard')?.hidden ||
    document.getElementById('pbV3PickupBenefitCard')?.hidden) {
  fail('Re-enabled delivery/pickup benefits did not return.');
}

document.getElementById('pbV3SearchBtn')?.click();
await new Promise(resolve => window.requestAnimationFrame(() => resolve()));
const searchOverlay = document.getElementById('pbV3SearchOverlay');
const searchWrap = document.getElementById('smSearchWrap');
if (!searchOverlay || searchOverlay.hidden || !searchOverlay.classList.contains('open')) {
  fail('Mobile search overlay did not open.');
}
if (searchWrap?.parentElement?.id !== 'pbV3SearchOverlayHost') {
  fail('Search UI was not moved into the mobile overlay.');
}

window.dispatchEvent(new window.CustomEvent('restbr:prices-updated'));
await new Promise(resolve => setTimeout(resolve, 0));
if (searchWrap?.parentElement?.id !== 'pbV3SearchOverlayHost') {
  fail('Live data sync moved search out of the open overlay.');
}

const searchClose = document.getElementById('pbV3SearchClose');
const searchResults = document.getElementById('pbV3SearchShowResults');

searchResults?.focus();
searchResults?.dispatchEvent(new window.KeyboardEvent('keydown', {
  key: 'Tab',
  bubbles: true,
  cancelable: true
}));
if (document.activeElement !== searchClose) {
  fail('Tab did not wrap from the last mobile-search control to the first.');
}

searchClose?.focus();
searchClose?.dispatchEvent(new window.KeyboardEvent('keydown', {
  key: 'Tab',
  shiftKey: true,
  bubbles: true,
  cancelable: true
}));
if (document.activeElement !== searchResults) {
  fail('Shift+Tab did not wrap from the first mobile-search control to the last.');
}

document.getElementById('pbV3SearchClose')?.click();
await new Promise(resolve => setTimeout(resolve, 170));
if (!searchOverlay?.hidden || searchWrap?.parentElement?.id !== 'pbV3SearchHost') {
  fail('Closing mobile search did not restore the hero search host.');
}

const hero = document.querySelector('.pb-v3-hero-art img');
if (!hero?.src.includes('diaper.webp')) {
  fail('Hero did not select a real catalog product.');
}

if (!process.exitCode) {
  console.log('Storefront V3 shell regression passed.');
}

dom.window.close();
