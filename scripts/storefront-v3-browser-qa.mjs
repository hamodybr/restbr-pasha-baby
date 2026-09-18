import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const PORT = 4173;
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
    { timeout: 15000 }
  );
  await page.waitForFunction(() =>
    document.querySelectorAll('#smMenu [data-product-card]').length > 0,
    null,
    { timeout: 15000 }
  );
}

async function openProductDetails(page) {
  const button = page.locator('#smMenu .pb-v3-details-btn').first();
  await button.scrollIntoViewIfNeeded();
  const started = Date.now();
  await button.click();
  await page.locator('#pbV3ProductSheet.open').waitFor({ state: 'visible', timeout: 5000 });
  const elapsed = Date.now() - started;
  assert(elapsed <= 1600, `Product details interaction is too slow: ${elapsed}ms`);
  await assertInsideViewport(page, '#pbV3ProductSheet', 'Product details sheet');
  await assertNoHorizontalOverflow(page, 'Product details');
  await page.locator('#pbV3ProductClose').click();
  await page.waitForTimeout(180);
  return elapsed;
}

async function prepareCartAndCheckout(page) {
  const added = await page.evaluate(() => {
    const product = window.RESTBR_DB?.products?.find(item =>
      item?.badges?.unavailable !== true &&
      Array.isArray(item?.options) &&
      item.options.length > 0
    );
    if (!product || typeof window.RESTBR_CART_ADD_QUANTITY !== 'function') return false;
    return window.RESTBR_CART_ADD_QUANTITY(product, 0, 1) !== false;
  });
  assert(added, 'Could not seed the cart through the real cart API');

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

async function runViewport(browser, spec) {
  const context = await browser.newContext({
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

  await page.goto(`${BASE}/storefront-v3/`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });

  await waitForCatalog(page);
  await page.waitForTimeout(500);

  await assertNoHorizontalOverflow(page, `${spec.name} home`);
  await assertInsideViewport(page, '#pbV3Topbar', `${spec.name} topbar`);
  await assertInsideViewport(page, '#pbV3Hero', `${spec.name} hero`);

  if (spec.mobile) {
    await assertInsideViewport(page, '.pb-v3-bottom-nav', `${spec.name} bottom navigation`);
    const desktopDisplay = await page.locator('.pb-v3-desktop-nav').evaluate(node => getComputedStyle(node).display);
    assert(desktopDisplay === 'none', `${spec.name} desktop navigation should be hidden`);

    const searchStarted = Date.now();
    await page.locator('#pbV3SearchBtn').click();
    await page.locator('#pbV3SearchOverlay.open').waitFor({ state: 'visible', timeout: 3000 });
    const searchElapsed = Date.now() - searchStarted;
    assert(searchElapsed <= 1200, `${spec.name} search interaction is too slow: ${searchElapsed}ms`);
    await assertInsideViewport(page, '#pbV3SearchOverlay .pb-v3-search-overlay-card', `${spec.name} search overlay`);
    await assertNoHorizontalOverflow(page, `${spec.name} search overlay`);
    await page.locator('#pbV3SearchClose').click();
    await page.waitForTimeout(180);
  } else {
    await assertInsideViewport(page, '.pb-v3-desktop-nav', 'Desktop navigation');
    const bottomDisplay = await page.locator('.pb-v3-bottom-nav').evaluate(node => getComputedStyle(node).display);
    assert(bottomDisplay === 'none', 'Desktop bottom navigation should be hidden');
  }

  const productElapsed = await openProductDetails(page);
  const { cartElapsed, checkoutElapsed } = await prepareCartAndCheckout(page);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  await assertNoHorizontalOverflow(page, `${spec.name} footer`);
  await assertInsideViewport(page, '.sm-footer-card', `${spec.name} footer card`);

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
    `product ${productElapsed}ms | cart ${cartElapsed}ms | checkout ${checkoutElapsed}ms | ` +
    `max-long-task ${maxLongTask}ms | DOM ${perf.domNodes}`
  );
  await context.close();
}

let browser;
try {
  await listen();

  const executablePath = chromePath();
  assert(executablePath, 'Chrome/Chromium executable not found on the runner');

  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  for (const spec of [
    { name: 'iPhone-Pro-Max', width: 440, height: 956, scale: 3, mobile: true },
    { name: 'iPhone-like', width: 390, height: 844, scale: 2, mobile: true },
    { name: 'Android-small', width: 360, height: 800, scale: 2, mobile: true },
    { name: 'Tiny-mobile', width: 320, height: 568, scale: 2, mobile: true },
    { name: 'Desktop', width: 1366, height: 900, scale: 1, mobile: false }
  ]) {
    await runViewport(browser, spec);
  }

  console.log('Storefront V3 real-browser QA passed.');
} finally {
  await browser?.close().catch(() => {});
  await closeServer().catch(() => {});
}
