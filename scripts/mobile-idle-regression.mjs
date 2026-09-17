// Deterministic DOM/MutationObserver regression. No production network or orders.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const files = [
  'js/pasha-baby-product-description-v2.js',
  'js/pasha-baby-details-button-v3.js',
  'js/pasha-color-image-gallery.js',
  'js/pasha-baby-ui.js',
  'js/pasha-baby-fixed-discounts.js'
];
const baseline = process.env.PERF_SOURCE_REF;
const source = file => baseline
  ? execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' })
  : fs.readFileSync(file, 'utf8');

async function fixture(scripts) {
  const dom = new JSDOM(`<!doctype html><html lang="ar"><head></head><body>
    <header class="sm-header"><h1>Shop</h1><img class="sm-logo" src="logo.svg"></header>
    <div id="smIntro"><b class="sm-intro-brand">Brand</b></div>
    <div id="smMenu"><article class="sm-card" data-product-card="p1">
      <div class="sm-img"><img class="sm-product-image" src="main.svg"></div>
      <div class="sm-info"><h2 class="sm-name">Car seat</h2>
        <div class="pb-product-description">Long description</div>
        <button class="pb-product-description-more">المزيد</button>
        <div class="pb-product-action-row"><button class="sm-choose-options">اختيار اللون</button></div>
        <div class="sm-options-scroll"><div class="sm-option"><button class="sm-option-buy">80000</button></div></div>
      </div></article></div>
    <div id="pbCommerceBody"><button class="pb-color-choice selected" data-pb-color-id="gray">Gray</button>
      <button class="pb-color-choice" data-pb-color-id="black">Black</button></div>
    </body></html>`, { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
  const w = dom.window;
  await new Promise(resolve => w.addEventListener('load', resolve, { once: true }));
  let frameId = 0;
  const frames = new Map();
  const timers = [];
  w.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.setTimeout = fn => { timers.push(fn); return timers.length; };
  w.clearTimeout = () => {};
  w.RESTBR_DB = { products: [{ id: 'p1', ar: 'Car seat', image: 'main.svg',
    description_ar: 'A long product description that certainly exceeds forty six characters.',
    colors: [{ id: 'gray', ar: 'رمادي', image: 'gray.svg' }, { id: 'black', ar: 'أسود', image: 'black.svg' }],
    options: [{ id: 'o1', price: 80000, originalPrice: 90000 }]
  }] };
  const discounts = [{ id: 'd1', discount_amount: 10000, scope_type: 'product', target_id: 'p1', is_active: true }];
  const query = { select() { return this; }, eq() { return this; }, order() { return this; },
    range: async () => ({ data: discounts }), then: resolve => resolve({ data: [] }) };
  const channel = { on() { return this; }, subscribe() { return this; } };
  w.supabaseClient = { from: () => query, channel: () => channel };
  let mutations = 0;
  const watcher = new w.MutationObserver(records => { mutations += records.length; });
  watcher.observe(w.document.body, { subtree: true, childList: true, attributes: true });
  for (const file of scripts) w.eval(source(file));
  async function flush(limit = 20) {
    let callbacks = 0;
    for (let i = 0; i < limit; i++) {
      await new Promise(resolve => setImmediate(resolve));
      if (!frames.size) return { idle: true, callbacks, mutations };
      const batch = [...frames.values()]; frames.clear();
      callbacks += batch.length;
      batch.forEach(fn => fn(i * 16));
    }
    await new Promise(resolve => setImmediate(resolve));
    return { idle: frames.size === 0, callbacks, mutations };
  }
  return { w, dom, flush, timers };
}

let failures = 0;
for (const scripts of [...files.map(file => [file]), files]) {
  const f = await fixture(scripts);
  try {
    // Trigger another pass even for observers attached after initial decoration.
    await f.flush();
    f.w.document.querySelector('#smMenu').append(f.w.document.createElement('span'));
    f.w.document.querySelector('#pbCommerceBody').append(f.w.document.createElement('span'));
    const state = await f.flush();
    assert.equal(state.idle, true, `does not settle: ${JSON.stringify(state)}`);
    // Run the finite initialization timers and ensure they also settle.
    f.timers.splice(0).forEach(fn => fn());
    assert.equal((await f.flush()).idle, true);
    if (scripts.length > 1) {
      const { w } = f;
      assert.equal(w.PASHA_OPEN_PRODUCT_DETAILS('p1'), true);
      await f.flush();
      const sheet = w.document.getElementById('pbProductDetailSheet');
      const button = sheet.querySelector('[data-pb-detail-color-id="gray"]');
      const image = sheet.querySelector('.pb-product-sheet-image');
      button.click();
      await f.flush();
      assert.equal(image.getAttribute('src'), 'gray.svg');
      assert.equal(button.getAttribute('aria-pressed'), 'true');
      let srcWrites = 0;
      const imageObserver = new w.MutationObserver(records => { srcWrites += records.length; });
      imageObserver.observe(image, { attributes: true, attributeFilter: ['src'] });
      for (let i = 0; i < 10; i++) button.click();
      w.document.querySelector('#smMenu').append(w.document.createElement('span'));
      w.dispatchEvent(new w.Event('restbr:prices-updated'));
      assert.equal((await f.flush()).idle, true);
      assert.equal(sheet.querySelector('[data-pb-detail-color-id="gray"]'), button, 'stable thumbnail DOM');
      assert.equal(srcWrites, 0, 'same color must not reload image');
      w.RESTBR_DB.products[0].description_ar = 'Updated description';
      w.document.querySelector('.sm-option-buy').textContent = '70000';
      w.dispatchEvent(new w.Event('restbr:prices-updated'));
      await f.flush();
      assert.equal(sheet.querySelector('.pb-product-sheet-description').textContent, 'Updated description');
      assert.equal(sheet.querySelector('.pb-product-sheet-image').getAttribute('src'), 'gray.svg');
      assert.equal(sheet.querySelector('[data-pb-detail-color-id="gray"]').getAttribute('aria-pressed'), 'true');
      sheet.querySelector('[data-pb-detail-color-id="black"]').click();
      await f.flush();
      assert.equal(image.getAttribute('src'), 'black.svg');
      sheet.querySelector('.pb-product-sheet-action').click();
      f.timers.splice(0).forEach(fn => fn());
      await f.flush();
      assert.equal(w.document.querySelector('.sm-choose-options').dataset.pbPreferredColorId, 'black');
      assert.equal(sheet.classList.contains('open'), false);
      assert.equal((await f.flush()).callbacks, 0, 'idle after closing');
      imageObserver.disconnect();
    }
    console.log(`PASS ${scripts.length > 1 ? 'combined idle, color switching, live update, cart handoff' : scripts[0]}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${scripts.join(', ')}: ${error.message}`);
  } finally { f.dom.window.close(); }
}
if (failures) process.exitCode = 1;
