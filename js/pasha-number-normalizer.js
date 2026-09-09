(() => {
  if (window.__PASHA_NUMBER_NORMALIZER_V1__) return;
  window.__PASHA_NUMBER_NORMALIZER_V1__ = true;

  const NUMERIC_SELECTOR = [
    'input[type="number"]',
    'input[type="tel"]',
    'input[inputmode="numeric"]',
    'input[inputmode="decimal"]',
    'input[data-pb-numeric]'
  ].join(',');
  const IS_ADMIN = /(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname);
  const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
  const UA = String(globalThis.navigator?.userAgent || '');
  const PLATFORM = String(globalThis.navigator?.platform || '');
  const TOUCH_POINTS = Number(globalThis.navigator?.maxTouchPoints || 0);
  const IS_IOS = /iP(?:hone|ad|od)/i.test(UA) || (PLATFORM === 'MacIntel' && TOUCH_POINTS > 1);
  const USE_IOS_TEXT_FALLBACK = IS_ADMIN && IS_IOS;

  function toEnglishDigits(value) {
    return String(value ?? '')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  }

  function isNumericInput(input) {
    return input instanceof HTMLInputElement && input.matches(NUMERIC_SELECTOR);
  }

  function hasNumberSemantics(input) {
    return String(input?.type || '').toLowerCase() === 'number' || input?.getAttribute?.('data-pb-native-number') === '1';
  }

  function allowsDecimal(input) {
    const mode = String(input?.inputMode || '').toLowerCase();
    const step = String(input?.getAttribute?.('step') || '').trim().toLowerCase();
    return mode === 'decimal' || step === 'any' || /\./.test(step);
  }

  function sanitizeNumberLike(input, value) {
    let next = String(value ?? '').replace(/,/g, '');
    const negative = /^\s*-/.test(next);
    next = next.replace(/-/g, '');

    if (allowsDecimal(input)) {
      next = next.replace(/[^0-9.]/g, '');
      const firstDot = next.indexOf('.');
      if (firstDot >= 0) {
        next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
      }
    } else {
      next = next.replace(/\D/g, '');
    }

    return (negative ? '-' : '') + next;
  }

  function normalizeForInput(input, value) {
    let next = toEnglishDigits(value);
    const type = String(input?.type || '').toLowerCase();
    const mode = String(input?.inputMode || '').toLowerCase();
    const numericMode = type === 'number' || mode === 'numeric' || mode === 'decimal' || input?.hasAttribute?.('data-pb-numeric');

    if (numericMode) {
      next = next
        .replace(/[٫]/g, '.')
        .replace(/[٬،]/g, ',');
      if (hasNumberSemantics(input)) next = sanitizeNumberLike(input, next);
    }
    return next;
  }

  function numericInputMode(input) {
    const step = String(input?.getAttribute?.('step') || '').trim().toLowerCase();
    return step === 'any' || /\./.test(step) ? 'decimal' : 'numeric';
  }

  function prepareInput(input) {
    if (!(input instanceof HTMLInputElement)) return;

    const isNumber = String(input.type || '').toLowerCase() === 'number';
    if (isNumber && !input.inputMode) input.inputMode = numericInputMode(input);

    // iOS/WebKit can reject Arabic/Persian glyphs inside type=number before JS can
    // normalize them. On the admin only, switch number controls to a text-backed
    // numeric field before the keyboard opens. The original constraints stay as
    // attributes and our normalizer keeps number-only semantics.
    if (USE_IOS_TEXT_FALLBACK && isNumber) {
      input.setAttribute('data-pb-native-number', '1');
      input.setAttribute('data-pb-numeric', '');
      input.type = 'text';
      input.inputMode = numericInputMode(input);
      input.autocapitalize = 'off';
      input.spellcheck = false;
    }

    if (!isNumericInput(input)) return;
    input.lang = 'en';
    input.dir = 'ltr';
  }

  function emitInput(input, inputType = 'insertText', data = null) {
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function insertNormalized(input, text, inputType = 'insertText') {
    prepareInput(input);
    const normalized = normalizeForInput(input, text);
    const type = String(input.type || '').toLowerCase();

    // Non-iOS native number fields have no usable selection range. Keep the old
    // direct-write path there; the iOS admin fallback is text-backed and therefore
    // uses setRangeText so editing in the middle of a price works correctly.
    if (type === 'number') {
      input.value = normalizeForInput(input, `${input.value || ''}${normalized}`);
      emitInput(input, inputType, normalized);
      return;
    }

    let start = null;
    let end = null;
    try {
      start = input.selectionStart;
      end = input.selectionEnd;
    } catch (_) {}

    if (Number.isInteger(start) && Number.isInteger(end) && typeof input.setRangeText === 'function') {
      try {
        input.setRangeText(normalized, start, end, 'end');
        emitInput(input, inputType, normalized);
        return;
      } catch (_) {}
    }

    const previous = String(input.value || '');
    try {
      input.focus({ preventScroll: true });
      document.execCommand?.('insertText', false, normalized);
      if (String(input.value || '') !== previous) return;
    } catch (_) {}

    input.value = normalizeForInput(input, `${input.value || ''}${normalized}`);
    emitInput(input, inputType, normalized);
  }

  function normalizeCurrent(input) {
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (!isNumericInput(input)) return;
    const current = String(input.value ?? '');
    const normalized = normalizeForInput(input, current);
    if (normalized === current) return;
    input.value = normalized;
    emitInput(input, 'insertReplacementText', normalized);
  }

  function enhance(root = document) {
    const inputs = root instanceof HTMLInputElement
      ? [root]
      : [...(root.querySelectorAll?.(NUMERIC_SELECTOR) || [])];
    inputs.forEach(input => {
      prepareInput(input);
      normalizeCurrent(input);
    });
    if (IS_ADMIN) normalizeTextTree(root);
  }

  function normalizeTextNode(node) {
    const parent = node?.parentElement;
    if (!parent || SKIP_TEXT_TAGS.has(parent.tagName) || parent.closest?.('[contenteditable="true"]')) return;
    const current = String(node.data ?? '');
    const normalized = toEnglishDigits(current);
    if (normalized !== current) node.data = normalized;
  }

  function normalizeTextTree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      normalizeTextNode(root);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) normalizeTextNode(node);
  }

  // focusin runs before the software keyboard starts editing. This is the critical
  // iPhone path: convert the control before WebKit gets a chance to reject ١٢٣/۱۲۳.
  document.addEventListener('focusin', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    normalizeCurrent(input);
  }, true);

  // Extra keyboard fallback for iOS versions that expose the localized digit on
  // keydown but do not provide a reliable beforeinput.data value.
  document.addEventListener('keydown', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (!isNumericInput(input) || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = typeof event.key === 'string' ? event.key : '';
    if (!/[٠-٩۰-۹０-９٫٬،]/.test(key)) return;
    const normalized = normalizeForInput(input, key);
    if (!normalized || normalized === key) return;
    event.preventDefault();
    insertNormalized(input, normalized, 'insertText');
  }, true);

  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (!isNumericInput(input) || typeof event.data !== 'string') return;
    const normalized = normalizeForInput(input, event.data);
    if (normalized === event.data) return;
    event.preventDefault();
    insertNormalized(input, normalized, event.inputType || 'insertText');
  }, true);

  document.addEventListener('paste', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (!isNumericInput(input)) return;
    const pasted = event.clipboardData?.getData('text') || '';
    const normalized = normalizeForInput(input, pasted);
    if (!pasted || normalized === pasted) return;
    event.preventDefault();
    insertNormalized(input, normalized, 'insertFromPaste');
  }, true);

  document.addEventListener('input', event => normalizeCurrent(event.target), true);
  document.addEventListener('change', event => normalizeCurrent(event.target), true);
  document.addEventListener('compositionend', event => normalizeCurrent(event.target), true);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') normalizeTextNode(mutation.target);
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) enhance(node);
        else if (node.nodeType === 3 && IS_ADMIN) normalizeTextNode(node);
      }
    }
  });

  const boot = () => {
    enhance(document);
    observer.observe(document.body, { childList: true, subtree: true, characterData: IS_ADMIN });
  };

  window.RESTBR_TO_ENGLISH_DIGITS = toEnglishDigits;
  window.RESTBR_NORMALIZE_NUMERIC_INPUT = normalizeCurrent;
  window.RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE = USE_IOS_TEXT_FALLBACK;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
