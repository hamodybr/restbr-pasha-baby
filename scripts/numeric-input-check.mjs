import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/pasha-number-normalizer.js', 'utf8');

function createRuntime(pathname, textNodes = [], navigatorInfo = {}) {
  const listeners = new Map();

  class FakeInput {
    constructor(type = 'number') {
      this.type = type;
      this.value = '';
      this.inputMode = '';
      this.lang = '';
      this.dir = '';
      this.events = [];
      this.selectionStart = 0;
      this.selectionEnd = 0;
      this.attributes = new Map();
      this.autocapitalize = '';
      this.spellcheck = true;
    }
    matches() { return true; }
    hasAttribute(name) { return this.attributes.has(name); }
    getAttribute(name) { return this.attributes.get(name) ?? ''; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    focus() {}
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
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
    createTreeWalker() {
      let index = 0;
      return { nextNode: () => textNodes[index++] || null };
    }
  };

  const window = {};
  const navigator = {
    userAgent: '',
    platform: '',
    maxTouchPoints: 0,
    ...navigatorInfo
  };

  vm.runInNewContext(source, {
    window,
    document,
    navigator,
    location: { pathname },
    HTMLInputElement: FakeInput,
    MutationObserver: FakeMutationObserver,
    NodeFilter: { SHOW_TEXT: 4 },
    Event: FakeEvent,
    InputEvent: FakeEvent,
    WeakSet,
    console
  });

  return { listeners, FakeInput, window };
}

// Keep the generic fallback working on non-iOS native number inputs.
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
    throw new Error(`Localized native-number fallback failed: ${localized} produced ${input.value}, expected ${expected}`);
  }
}

// Simulate the actual iPhone admin path. The number field must become text-backed
// before the software keyboard edits it.
const iosAdmin = createRuntime('/admin', [], {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  platform: 'iPhone',
  maxTouchPoints: 5
});
const iosPrice = new iosAdmin.FakeInput('number');
iosPrice.setAttribute('min', '0');
iosPrice.setAttribute('step', '1');

iosAdmin.listeners.get('focusin')({ target: iosPrice });
if (iosPrice.type !== 'text' || iosPrice.getAttribute('data-pb-native-number') !== '1' || iosPrice.inputMode !== 'numeric') {
  throw new Error(`iOS numeric fallback was not armed before keyboard input: type=${iosPrice.type}, mode=${iosPrice.inputMode}`);
}
if (iosAdmin.window.RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE !== true) {
  throw new Error('iOS fallback flag is not active in the simulated iPhone admin runtime');
}
if (iosAdmin.window.RESTBR_NUMERIC_FAST_PATH_V2 !== true) {
  throw new Error('iOS fast input path is not enabled');
}

// On iPhone we now LET the browser insert the localized glyph, then normalize
// in-place during the SAME native input event. No preventDefault and no synthetic
// input event should be generated.
const iosBeforeInput = iosAdmin.listeners.get('beforeinput');
const iosInput = iosAdmin.listeners.get('input');
for (const [localized, expected] of [['١', '1'], ['٢', '12'], ['۳', '123'], ['٤', '1234']]) {
  let prevented = false;
  iosBeforeInput({
    target: iosPrice,
    data: localized,
    inputType: 'insertText',
    preventDefault() { prevented = true; }
  });
  if (prevented) throw new Error(`iPhone fast path incorrectly prevented native input for ${localized}`);

  iosPrice.value += localized;
  iosPrice.selectionStart = iosPrice.selectionEnd = iosPrice.value.length;
  iosInput({ target: iosPrice });

  if (iosPrice.value !== expected) {
    throw new Error(`iPhone fast typing failed: ${localized} produced ${iosPrice.value}, expected ${expected}`);
  }
  if (iosPrice.events.length !== 0) {
    throw new Error(`iPhone fast typing dispatched ${iosPrice.events.length} synthetic input event(s)`);
  }
}

// Persian digits use exactly the same single-event path.
iosPrice.value = '';
iosPrice.selectionStart = iosPrice.selectionEnd = 0;
for (const [localized, expected] of [['۱', '1'], ['۲', '12'], ['۳', '123']]) {
  iosPrice.value += localized;
  iosPrice.selectionStart = iosPrice.selectionEnd = iosPrice.value.length;
  iosInput({ target: iosPrice });
  if (iosPrice.value !== expected) {
    throw new Error(`iPhone Persian fast typing failed: ${localized} produced ${iosPrice.value}, expected ${expected}`);
  }
}

const parentElement = { tagName: 'DIV', closest: () => null };
const dashboardText = { nodeType: 3, data: '٢٠٢٦/٠٩/٠٩ ٧:٤٤ — ۱۲۳ طلب', parentElement };
createRuntime('/admin', [dashboardText]);
if (dashboardText.data !== '2026/09/09 7:44 — 123 طلب') {
  throw new Error(`Dashboard digit normalization failed: ${dashboardText.data}`);
}

console.log('✓ Arabic/Persian numeric input, iPhone single-event fast path, and dashboard English-digit checks passed');
