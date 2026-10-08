import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const PORT = 4173;
const NETWORK_TIMEOUT = Number(process.env.PASHA_QA_NETWORK_TIMEOUT_MS || 15000);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', BASE);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/storefront-v3' || pathname === '/storefront-v3/') {
      pathname = '/storefront-v3/index.html';
    }
    if (pathname === '/') pathname = '/index.html';

    const relative = pathname.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const stat = fs.existsSync(file) ? fs.statSync(file) : null;
    const target = stat?.isDirectory() ? path.join(file, 'index.html') : file;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  } catch (error) {
    res.writeHead(500).end(String(error?.message || error));
  }
});

const listen = () => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, HOST, resolve);
});

const closeServer = () => new Promise(resolve => server.close(() => resolve()));

function chromePath() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || '';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function pageBox(page, selector) {
  return page.locator(selector).first().evaluate(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility
    };
  });
}

async function assertInsideViewport(page, selector, label) {
  const box = await pageBox(page, selector);
  const viewport = page.viewportSize();
  assert(box.display !== 'none' && box.visibility !== 'hidden', `${label} is not visible`);
  assert(box.width > 0 && box.height > 0, `${label} has zero size`);
  assert(box.left >= -2, `${label} overflows left: ${box.left}`);
  assert(box.right <= viewport.width + 2, `${label} overflows right: ${box.right} > ${viewport.width}`);
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  const width = Math.max(metrics.html, metrics.body);
  assert(width <= metrics.viewport + 2,
    `${label} has horizontal overflow: content ${width}px vs viewport ${metrics.viewport}px`);
}

async function waitForCatalog(page) {
  await page.waitForFunction(() =>
    Array.isArray(window.RESTBR_DB?.products) && window.RESTBR_DB.products.length > 0,
    null,
    { timeout: NETWORK_TIMEOUT }
  );
  await page.waitForFunction(() =>
    document.querySelectorAll('#smMenu [data-product-card]').length > 0,
    null,
    { timeout: NETWORK_TIMEOUT }
  );
}

async function assertDetailsOnCards(page, label) {
  const state = await page.locator('#smMenu [data-product-card]:visible').evaluateAll(cards => ({
    total: cards.length,
    good: cards.filter(card => {
      const details = card.querySelector('.pb-product-action-row > .pb-v3-details-btn');
      const image = card.querySelector('.sm-product-image[role="button"][tabindex="0"][aria-label]');
      const action = card.querySelector('.pb-product-action-row > .sm-direct-add, .pb-product-action-row > .sm-choose-options');
      const visible = node => node && node.getBoundingClientRect().width > 0 &&
        getComputedStyle(node).visibility !== 'hidden';
      return visible(action) && (visible(details) || visible(image));
    }).length
  }));
  assert(state.total > 0 && state.total === state.good,
    `${label}: details/actions missing on ${state.total - state.good} of ${state.total} cards`);
  if (page.viewportSize().width <= 680) {
    const invalid = await page.locator('#smMenu .pb50-product-card:visible').evaluateAll(cards => cards.filter(card => {
      const info = card.querySelector('.sm-info');
      const action = card.querySelector('.sm-direct-add,.sm-choose-options');
      if (!info || !action) return false;
      const style = getComputedStyle(info), buttonStyle = getComputedStyle(action);
      const available = info.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const labels = [...card.querySelectorAll('.pb36-product-badge,.sm-badges > *')]
        .filter(node => node.getBoundingClientRect().height > 0);
      return Math.abs(action.getBoundingClientRect().width - available) > 1 ||
        buttonStyle.height !== '32px' || buttonStyle.borderRadius !== '8px' || labels.length > 1 ||
        !!card.querySelector('.pb36-catalog-heart');
    }).length);
    assert(invalid === 0, `${label}: ${invalid} inconsistent mobile cart actions or labels`);
  }
}

async function openProductDetails(page) {
  const button = page.locator('#smMenu .pb-v3-details-btn').first();
  const trigger = await button.isVisible() ? button : page.locator('#smMenu .sm-product-image[role="button"][tabindex="0"]').first();
  const productId = await trigger.evaluate(n => n.closest('[data-product-card]').dataset.productCard);
  await trigger.scrollIntoViewIfNeeded();
  const started = Date.now();
  await trigger.click();
  await page.locator('#pbV3ProductSheet.open').waitFor({ state: 'visible', timeout: 5000 });
  assert(await page.locator('#pbV3ProductSheet').getAttribute('data-product-id') === productId,
    'Details trigger opened the wrong product');
  const elapsed = Date.now() - started;
  assert(elapsed <= 1600, `Product details interaction is too slow: ${elapsed}ms`);
  await assertInsideViewport(page, '#pbV3ProductSheet', 'Product details sheet');
  await assertNoHorizontalOverflow(page, 'Product details');
  await page.locator('#pbV3ProductClose').click();
  await page.waitForTimeout(180);
  return elapsed;
}

async function prepareCartAndCheckout(page) {
  await page.waitForFunction(() => window.RESTBR_HOURS_READY === true, null, { timeout: NETWORK_TIMEOUT });
  const cartResult = await page.evaluate(() => {
    const product = window.RESTBR_DB?.products?.find(item =>
      item?.badges?.unavailable !== true &&
      Array.isArray(item?.options) &&
      item.options.length > 0
    );
    if (!product || typeof window.RESTBR_CART_ADD_QUANTITY !== 'function') return { added: false };
    const before = JSON.parse(localStorage.getItem('RESTBR_CART_V1') || '[]')
      .reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const added = window.RESTBR_CART_ADD_QUANTITY(product, 0, 1) !== false;
    const badge = document.getElementById('pbV3BottomCartCount');
    return { added, before, actual: badge?.textContent, hidden: badge?.hidden };
  });
  assert(cartResult.added, 'Could not seed the cart through the real cart API');
  assert(cartResult.actual === String(cartResult.before + 1) && !cartResult.hidden,
    'Cart badge did not update synchronously after adding a product with options');

  const cartTrigger = page.locator('#pbV3BottomCart:visible, #pbV3CartBtn:visible').first();
  const cartStarted = Date.now();
  await cartTrigger.click();
  await page.locator('#smCartDrawer.open').waitFor({ state: 'visible', timeout: 5000 });
  const cartElapsed = Date.now() - cartStarted;
  assert(cartElapsed <= 1200, `Cart interaction is too slow: ${cartElapsed}ms`);
  await assertInsideViewport(page, '#smCartDrawer', 'Cart drawer');
  await assertNoHorizontalOverflow(page, 'Cart drawer');

  const bottomNavDisplay = await page.locator('.pb-v3-bottom-nav').evaluate(node => getComputedStyle(node).display);
  assert(bottomNavDisplay === 'none', 'Bottom navigation remained visible over the cart drawer');

  const continueButton = page.locator('#smCartContinue');
  const checkoutStarted = Date.now();
  await continueButton.click();
  await page.locator('#smCheckoutSheet.open').waitFor({ state: 'visible', timeout: 5000 });
  const checkoutElapsed = Date.now() - checkoutStarted;
  assert(checkoutElapsed <= 1600, `Checkout interaction is too slow: ${checkoutElapsed}ms`);
  await assertInsideViewport(page, '#smCheckoutSheet', 'Checkout sheet');
  await assertNoHorizontalOverflow(page, 'Checkout');

  const checkoutBottomNavDisplay = await page.locator('.pb-v3-bottom-nav').evaluate(node => getComputedStyle(node).display);
  assert(checkoutBottomNavDisplay === 'none', 'Bottom navigation remained visible over checkout');

  const checkoutTopbarVisibility = await page.locator('.pb-v3-topbar').evaluate(node => getComputedStyle(node).visibility);
  assert(checkoutTopbarVisibility === 'hidden', 'Sticky topbar remained interactive over checkout');

  const send = page.locator('#smSendWhatsApp');
  assert(await send.count() === 1, 'Checkout submit button is missing');

  await page.locator('#smCheckoutClose').click();
  await page.waitForTimeout(120);

  return { cartElapsed, checkoutElapsed };
}

async function assertCatalogNavigation(page, spec) {
  const announcement = await page.evaluate(() => {
    const restaurant = window.RESTBR_DB.restaurant;
    const original = { announcement: restaurant.announcement, announcementEnabled: restaurant.announcementEnabled };
    const message = 'عرض تجريبي طويل للتأكد من أن شريط الإعلان يعرض كامل المحتوى بدون اقتصاص أو إخفاء، بما فيه السطر الثاني والثالث وجميع تفاصيل الإعلان حتى آخر كلمة: النهاية.';
    restaurant.announcement = { ar: message };
    restaurant.announcementEnabled = true;
    window.dispatchEvent(new Event('restbr:commerce-ready'));
    const node = document.getElementById('pbV3Announcement');
    const copy = document.getElementById('pbV3AnnouncementText');
    const style = getComputedStyle(node);
    const result = {
      full: copy?.textContent === message,
      visible: style.display !== 'none' && node.getBoundingClientRect().height > 0,
      scrollWidth: copy?.scrollWidth || 0,
      clientWidth: copy?.clientWidth || 0,
      clipping: getComputedStyle(copy).overflow,
      lastWord: copy?.textContent?.endsWith('النهاية.')
    };
    restaurant.announcement = original.announcement;
    restaurant.announcementEnabled = original.announcementEnabled;
    window.dispatchEvent(new Event('restbr:commerce-ready'));
    return result;
  });
  assert(announcement.full && announcement.visible && announcement.lastWord &&
    announcement.clipping === 'visible' && announcement.scrollWidth <= announcement.clientWidth + 2,
    spec.name + ': full announcement is clipped or hidden: ' + JSON.stringify(announcement));

  await page.locator('#pbV3SeeProducts').click();
  await page.waitForTimeout(140);
  const full = await page.evaluate(() => ({
    expected: window.RESTBR_DB.products.filter(p => p && p.category).length,
    actual: document.querySelectorAll('#smMenu [data-product-card]').length,
    title: document.querySelector('#smMenu .sm-section-title')?.textContent?.trim(),
    allActive: !!document.querySelector('#smCats .sm-cat[data-cat="__all__"].active')
  }));
  assert(full.expected > 0 && full.actual === Math.min(32, full.expected) &&
    full.title === 'كل المنتجات' && full.allActive,
    spec.name + ': View all did not show all real products: ' + JSON.stringify(full));

  const category = page.locator('#smCats .sm-cat:not([data-cat="__all__"])').first();
  const id = await category.getAttribute('data-cat');
  assert(id, spec.name + ': missing real category');
  await category.click();
  await page.waitForTimeout(160);
  const filtered = await page.evaluate(id => {
    const cards = [...document.querySelectorAll('#smMenu [data-product-card]')];
    const expected = window.RESTBR_DB.products.filter(p => String(p?.category?.id || '') === id);
    return {
      expected: expected.length,
      actual: cards.length,
      matching: cards.every(card => expected.some(p => String(p.id) === card.dataset.productCard)),
      active: !!document.querySelector('#smCats .sm-cat[data-cat="' + CSS.escape(id) + '"].active')
    };
  }, id);
  assert(filtered.expected > 0 && filtered.actual === Math.min(32, filtered.expected) &&
    filtered.matching && filtered.active,
    spec.name + ': category did not display matching real products: ' + JSON.stringify(filtered));
  await assertDetailsOnCards(page, spec.name + ' after selecting real category');

  const highlighted = page.locator('#pbV3Highlights .pb-v3-highlight-group:visible [data-v3-highlight-jump]').first();
  if (await highlighted.count()) {
    const mode = await highlighted.getAttribute('data-v3-highlight-jump');
    await highlighted.click();
    await page.waitForTimeout(160);
    const stats = await page.evaluate(mode => {
      const products = window.RESTBR_DB.products;
      const badges = products.filter(p => p?.badges?.unavailable !== true &&
        (mode === 'popular' ? p?.badges?.popular === true :
         mode === 'new' ? p?.badges?.new === true :
         mode === 'offer' ? p?.badges?.offer === true || Number(p.discountPercent || 0) > 0 ||
           Number(p.discountAmount || 0) > 0 || (p.options || []).some(o =>
             Number(o.originalPrice ?? o.__retailOriginalPrice ?? o.price) > Number(o.price)
           ) : false));
      const cards = [...document.querySelectorAll('#smMenu [data-product-card]')];
      return { expected: badges.length, actual: cards.length, matching: cards.every(card =>
        badges.some(p => String(p.id) === card.dataset.productCard)) };
    }, mode);
    assert(stats.expected > 0 && stats.actual === Math.min(32, stats.expected) && stats.matching,
      spec.name + ': View all in highlight did not show the full matching set: ' + JSON.stringify(stats));
  }

  await page.locator('#pbV3SeeProducts').click();
  await page.waitForTimeout(160);
  await assertNoHorizontalOverflow(page, spec.name + ' after catalog filters');
}

async function runViewport(browser, spec) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: Boolean(process.env.HTTPS_PROXY),
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: spec.scale || 1,
    isMobile: spec.mobile,
    hasTouch: spec.mobile,
    serviceWorkers: 'block',
    locale: 'ar-IQ'
  });

  await context.addInitScript(() => {
    window.__V3_LONG_TASKS__ = [];
    try {
      const supported = window.PerformanceObserver?.supportedEntryTypes || [];
      if (supported.includes('longtask')) {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            window.__V3_LONG_TASKS__.push(Math.round(entry.duration));
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      }
    } catch (_) {}
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(String(error?.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!/favicon|Failed to load resource/i.test(text)) consoleErrors.push(text);
    }
  });

  const catalogStarted = Date.now();
  await page.goto(`${BASE}/storefront-v3/`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  const domReadyElapsed = Date.now() - catalogStarted;
  assert(domReadyElapsed <= 3000,
    `${spec.name} DOMContentLoaded is too slow: ${domReadyElapsed}ms`);

  let earlyMenuElapsed = 0;
  if (spec.mobile) {
    const menuStarted = Date.now();
    await page.locator('#pbV3MenuBtn').click({ timeout: 1500 });
    await page.locator('#pbV3Drawer.open').waitFor({ state: 'visible', timeout: 800 });
    earlyMenuElapsed = Date.now() - menuStarted;
    assert(earlyMenuElapsed <= 800,
      `${spec.name} early menu interaction is too slow: ${earlyMenuElapsed}ms`);
    await page.locator('#pbV3DrawerClose').click();
    await page.waitForTimeout(80);
  }

  await waitForCatalog(page);
  const catalogElapsed = Date.now() - catalogStarted;
  assert(catalogElapsed <= (process.env.PASHA_QA_NETWORK_TIMEOUT_MS ? NETWORK_TIMEOUT : 5000),
    `${spec.name} catalog first-open is too slow: ${catalogElapsed}ms`);
  await page.waitForTimeout(500);

  await assertNoHorizontalOverflow(page, `${spec.name} home`);
  assert(await page.locator('.pb-ref-home').isHidden(), 'Demo order tracking / sample products must stay hidden');
  await assertInsideViewport(page, '#pbV3Topbar', `${spec.name} topbar`);
  await assertInsideViewport(page, '#pbV3Hero', `${spec.name} hero`);

  let searchElapsed = 0;

  if (spec.mobile) {
    await assertInsideViewport(page, '.pb-v3-bottom-nav', `${spec.name} bottom navigation`);
    const desktopDisplay = await page.locator('.pb-v3-desktop-nav').evaluate(node => getComputedStyle(node).display);
    assert(desktopDisplay === 'none', `${spec.name} desktop navigation should be hidden`);

    const searchStarted = Date.now();
    await page.locator('#pbV3SearchBtn').click();
    await page.locator('#pbV3SearchOverlay.open').waitFor({ state: 'visible', timeout: 3000 });
    searchElapsed = Date.now() - searchStarted;
    assert(searchElapsed <= 1200, `${spec.name} search interaction is too slow: ${searchElapsed}ms`);
    await assertInsideViewport(page, '#pbV3SearchOverlay .pb-v3-search-overlay-card', `${spec.name} search overlay`);
    await assertNoHorizontalOverflow(page, `${spec.name} search overlay`);

    const realProductName = await page.evaluate(() => {
      const product = window.RESTBR_DB?.products?.find(item => item?.badges?.unavailable !== true);
      const name = product?.name;
      if (name && typeof name === 'object') return String(name.ar || name.en || name.ku || '').trim();
      return String(name || '').trim();
    });
    assert(realProductName, `${spec.name} could not resolve a real product name for search QA`);

    const searchInput = page.locator('#smSearchInput');
    await searchInput.fill(realProductName);
    await page.waitForTimeout(120);
    const matchingCards = await page.locator('#smMenu [data-product-card]:visible').count();
    assert(matchingCards > 0, `${spec.name} real product search returned no visible products`);
    await assertDetailsOnCards(page, `${spec.name} after search`);

    await searchInput.fill('__V3_NO_MATCH_9XQ__');
    await page.waitForTimeout(120);
    const noMatchCards = await page.locator('#smMenu [data-product-card]:visible').count();
    assert(noMatchCards === 0, `${spec.name} impossible search still showed product cards`);
    const emptyVisible = await page.locator('#smMenu .analytics-empty:visible').count();
    assert(emptyVisible > 0, `${spec.name} no-result search did not show the empty state`);

    await searchInput.fill('');
    await page.waitForTimeout(120);
    const restoredCards = await page.locator('#smMenu [data-product-card]:visible').count();
    assert(restoredCards > 0, `${spec.name} clearing search did not restore the catalog`);
    await assertDetailsOnCards(page, `${spec.name} after clearing search`);

    await page.locator('#pbV3SearchClose').click();
    await page.waitForTimeout(180);
  } else {
    await assertInsideViewport(page, '.pb-v3-desktop-nav', 'Desktop navigation');
    const bottomDisplay = await page.locator('.pb-v3-bottom-nav').evaluate(node => getComputedStyle(node).display);
    assert(bottomDisplay === 'none', 'Desktop bottom navigation should be hidden');
    await assertDetailsOnCards(page, 'Desktop initial render');
    const tabs = page.locator('#smCats .sm-cat');
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(150);
      await assertDetailsOnCards(page, 'Desktop after category switch');
    }
    const realProductName = await page.evaluate(() => {
      const name = window.RESTBR_DB?.products?.[0]?.name;
      return String(name?.ar || name?.en || '').trim();
    });
    if (realProductName) {
      const input = page.locator('#smSearchInput');
      await input.fill(realProductName);
      await page.waitForTimeout(150);
      await assertDetailsOnCards(page, 'Desktop after search');
      await input.fill('');
      await page.waitForTimeout(150);
      await assertDetailsOnCards(page, 'Desktop after clearing search');
    }
  }

  await assertCatalogNavigation(page, spec);

  const productElapsed = await openProductDetails(page);
  const { cartElapsed, checkoutElapsed } = await prepareCartAndCheckout(page);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  await assertNoHorizontalOverflow(page, `${spec.name} footer`);
  await assertInsideViewport(page, spec.width <= 680 ? '.pb-ref-footer' : '.sm-footer-card', `${spec.name} footer card`);

  const perf = await page.evaluate(() => ({
    longTasks: Array.isArray(window.__V3_LONG_TASKS__) ? window.__V3_LONG_TASKS__ : [],
    domNodes: document.getElementsByTagName('*').length
  }));

  const maxLongTask = perf.longTasks.length ? Math.max(...perf.longTasks) : 0;
  assert(maxLongTask <= 1500,
    `${spec.name} has a severe long task: ${maxLongTask}ms`);
  assert(perf.domNodes <= 5000,
    `${spec.name} DOM is unexpectedly large: ${perf.domNodes} nodes`);

  assert(consoleErrors.length === 0,
    `${spec.name} browser errors: ${consoleErrors.join(' | ')}`);

  console.log(
    `Browser QA passed: ${spec.name} (${spec.width}x${spec.height}) | ` +
    `dom-ready ${domReadyElapsed}ms | early-menu ${earlyMenuElapsed}ms | catalog ${catalogElapsed}ms | ` +
    `search ${searchElapsed}ms | product ${productElapsed}ms | ` +
    `cart ${cartElapsed}ms | checkout ${checkoutElapsed}ms | ` +
    `max-long-task ${maxLongTask}ms | DOM ${perf.domNodes}`
  );
  await context.close();
}

async function assertLargeCatalog(page) {
  await page.evaluate(() => {
    const source = window.RESTBR_DB.products;
    window.RESTBR_DB.products = Array.from({ length: 5000 }, (_, i) => ({
      ...source[i % source.length], id: 'scale-' + i,
      name: { ar: 'صنف اختبار ' + i, en: 'Scale ' + i }
    }));
    window.__SCALE_LONG_TASKS__ = [];
    new PerformanceObserver(list => window.__SCALE_LONG_TASKS__.push(...list.getEntries().map(entry => entry.duration)))
      .observe({ type: 'longtask' });
    window.RESTBR_V3_SHOW_CATALOG('all');
  });
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => ({
    cards: document.querySelectorAll('#smMenu [data-product-card]').length,
    nodes: document.querySelectorAll('*').length,
    longest: Math.max(0, ...window.__SCALE_LONG_TASKS__)
  }));
  assert(state.cards === 32 && state.nodes < 6000, '5000-product catalog grew the DOM: ' + JSON.stringify(state));
  assert(state.longest < 2000, '5000-product catalog caused a sustained freeze: ' + JSON.stringify(state));
  await page.locator('#smMenu [data-catalog-page="2"]').click();
  await page.waitForTimeout(160);
  assert(await page.locator('#smMenu [data-product-card]').first().getAttribute('data-product-card') === 'scale-32', 'Next page skipped products');
  await page.evaluate(() => { const input = document.getElementById('smSearchInput'); input.value = 'صنف اختبار 4999'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(350);
  assert(await page.locator('#smMenu [data-product-card]').count() === 1, 'Debounced search did not reset the page');
  await page.locator('#smMenu [data-product-card] img').first().click();
  assert(await page.locator('#pbV3ProductSheet').evaluate(node => !node.hidden && node.dataset.productId === 'scale-4999'), 'Searched product opened the wrong details');
  console.log('Production scale QA passed: ' + JSON.stringify(state));
}

async function runProductionLoad(browser, spec) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: Boolean(process.env.HTTPS_PROXY),
    viewport: { width: spec.width, height: spec.height },
    isMobile: spec.mobile, hasTouch: spec.mobile, serviceWorkers: 'block', locale: 'ar-IQ'
  });
  let releaseCatalog;
  const gate = new Promise(resolve => { releaseCatalog = resolve; });
  await context.route('**/rest/v1/**', async route => {
    await gate;
    await route.continue();
  });
  await context.addInitScript(() => {
    window.__ROOT_CLS__ = 0;
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__ROOT_CLS__ += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  });
  const page = await context.newPage();
  const originalsRequested = [];
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  if(process.env.PASHA_QA_DIAGNOSTIC) {page.on('console',msg=>console.log(msg.type(),msg.text()));page.on('requestfailed',r=>console.log('Failed request:',r.url(),r.failure()));}
  page.on('request', request => {
    if (/backblazeb2\.com\/file\/pasha-baby-products\/products\/.*\/main/.test(request.url())) {
      originalsRequested.push(request.url());
    }
  });
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(220);
    assert(await page.locator('body[data-pb-loading]').count() === 1, 'Root loading shell was lost before catalog data');
    const before = {
      hero: await pageBox(page, '#pbV3Hero'),
      categories: await pageBox(page, '#smCats'),
      offer: await pageBox(page, '#pb36OfferBanner')
    };
    assert(before.categories.height >= 100, 'Empty category rail did not reserve its space');
    releaseCatalog();
    await waitForCatalog(page);
    await page.locator('body[data-pb-loading]').waitFor({ state: 'detached', timeout: 5000 });
    await page.waitForTimeout(700);
    const after = {
      hero: await pageBox(page, '#pbV3Hero'),
      categories: await pageBox(page, '#smCats'),
      offer: await pageBox(page, '#pb36OfferBanner')
    };
    assert(Math.abs(after.hero.top - before.hero.top) <= 2,
      `${spec.name} production hero shifted ${after.hero.top - before.hero.top}px after catalog load`);
    assert(Math.abs(after.categories.height - before.categories.height) <= 2,
      `${spec.name} category rail height changed after catalog load`);
    assert(Math.abs(after.offer.top - before.offer.top) <= 5,
      `${spec.name} offer moved ${after.offer.top - before.offer.top}px when loading placeholders were replaced`);
    assert(await page.locator('.pb-load-card').count() === 0, 'Loading placeholders remained after catalog load');
    await assertNoHorizontalOverflow(page, `${spec.name} production homepage`);
    assert(originalsRequested.length === 0,
      'Production homepage fetched original B2 photos: ' + originalsRequested.join(', '));
    const state = await page.evaluate(() => ({
      cairo: document.fonts.check('700 16px Cairo'),
      cls: window.__ROOT_CLS__,
      externalCode: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')]
        .map(node => node.src || node.href).filter(url => /cdn\.jsdelivr\.net|fonts\.googleapis\.com/.test(url)),
      categories: [...document.querySelectorAll('#smCats .pb-v3-cat-media img')].map(img => ({ loading: img.loading, priority: img.fetchPriority }))
    }));
    assert(state.cairo && state.externalCode.length === 0, 'Root typography or same-origin assets were not loaded');
    assert(state.categories.every(img => img.loading === 'lazy' && img.priority === 'low'), 'Category photos still compete with the hero');
    const whatsapp = await page.locator('#pbV3WhatsAppFab svg').evaluate(svg => {
      const style = getComputedStyle(svg);
      return { fill: style.fill, stroke: style.stroke, width: svg.getBoundingClientRect().width,
        parentWidth: svg.parentElement.getBoundingClientRect().width };
    });
    assert(whatsapp.fill === 'none' && whatsapp.stroke === 'rgb(255, 255, 255)' &&
      whatsapp.width > 0 && whatsapp.width <= whatsapp.parentWidth,
      spec.name + ': WhatsApp outline icon is filled, missing or oversized: ' + JSON.stringify(whatsapp));
    assert(errors.length === 0, 'Production root browser errors: ' + errors.join(' | '));
    console.log(`Production load QA passed: ${spec.name} | CLS ${state.cls.toFixed(4)} | hero movement ${after.hero.top - before.hero.top}px | offer movement ${after.offer.top - before.offer.top}px | no original B2 image downloads`);
    await page.locator('#pbV3SeeProducts').click();
    await page.waitForTimeout(160);
    await assertDetailsOnCards(page, spec.name + ' production catalog');
    await openProductDetails(page);
    await prepareCartAndCheckout(page);
    if (spec.mobile) await assertLargeCatalog(page);
  } finally {
    releaseCatalog();
    await context.close();
  }
}

let browser;
try {
  await listen();

  const executablePath = chromePath();
  assert(executablePath, 'Chrome/Chromium executable not found on the runner');

  browser = await chromium.launch({
    executablePath,
    headless: true,
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  for (const spec of [
    { name: 'Production-mobile', width: 390, height: 844, mobile: true },
    { name: 'Production-desktop', width: 1366, height: 900, mobile: false }
  ]) await runProductionLoad(browser, spec);

  for (const spec of [
    { name: 'iPhone-Pro-Max', width: 440, height: 956, scale: 3, mobile: true },
    { name: 'iPhone-like', width: 390, height: 844, scale: 2, mobile: true },
    { name: 'Android-small', width: 360, height: 800, scale: 2, mobile: true },
    { name: 'Tiny-mobile', width: 320, height: 568, scale: 2, mobile: true },
    { name: 'Mobile-landscape', width: 844, height: 390, scale: 2, mobile: true },
    { name: 'Tablet', width: 820, height: 1180, scale: 2, mobile: true },
    { name: 'Desktop', width: 1366, height: 900, scale: 1, mobile: false }
  ]) {
    await runViewport(browser, spec);
  }

  console.log('Storefront V3 real-browser QA passed.');
} finally {
  await browser?.close().catch(() => {});
  await closeServer().catch(() => {});
}
