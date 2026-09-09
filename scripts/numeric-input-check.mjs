import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/pasha-number-normalizer.js', 'utf8');

function createRuntime(pathname, textNodes = []) {
  const listeners = new Map();

  class FakeInput {
    constructor(type = 'number') {
      this.type = type;
      this.value = '';
      this.inputMode = 'numeric';
      this.lang = '';
      this.dir = '';
      this.events = [];
    }
    matches() { return true; }
    hasAttribute(name) { return name === 'data-pb-numeric'; }
    getAttribute() { return ''; }
    focus() {}
    dispatchEvent(event) { this.events.push(event); return true; }
  }

  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
  }

  class FakeEvent {
    constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
  }

  const document = {
    readyState: 'complete',
    body: { nodeType: 1, querySelectorAll: () => [] },
    addEventListener(type, callback) { listeners.set(type, callback); },
    querySelectorAll() { return []; },
    execCommand() { return true; },
    createTreeWalker() {
      let index = 0;
      return { nextNode: () => textNodes[index++] || null };
    }
  };

  const window = {};
  vm.runInNewContext(source, {
    window,
    document,
    location: { pathname },
    HTMLInputElement: FakeInput,
    MutationObserver: FakeMutationObserver,
    NodeFilter: { SHOW_TEXT: 4 },
    Event: FakeEvent,
    InputEvent: FakeEvent,
    console
  });

  return { listeners, FakeInput, window };
}

const storefront = createRuntime('/');
const input = new storefront.FakeInput('number');
const beforeInput = storefront.listeners.get('beforeinput');

for (const [localized, expected] of [['١', '1'], ['٢', '12'], ['۳', '123'], ['٤', '1234']]) {
  let prevented = false;
  beforeInput({
    target: input,
    data: localized,
    inputType: 'insertText',
    preventDefault() { prevented = true; }
  });
  if (!prevented || input.value !== expected) {
    throw new Error(`Localized number typing failed: ${localized} produced ${input.value}, expected ${expected}`);
  }
}

const parentElement = { tagName: 'DIV', closest: () => null };
const dashboardText = { nodeType: 3, data: '٢٠٢٦/٠٩/٠٩ ٧:٤٤ — ۱۲۳ طلب', parentElement };
createRuntime('/admin', [dashboardText]);
if (dashboardText.data !== '2026/09/09 7:44 — 123 طلب') {
  throw new Error(`Dashboard digit normalization failed: ${dashboardText.data}`);
}

console.log('✓ Arabic/Persian numeric input and dashboard English-digit checks passed');
