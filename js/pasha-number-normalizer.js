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
  const PREPARED = new WeakSet();

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
    if (!(input instanceof HTMLInputElement)) return false;
    if (PREPARED.has(input)) return isNumericInput(input);

    const isNumber = String(input.type || '').toLowerCase() === 'number';
    if (isNumber && !input.inputMode) input.inputMode = numericInputMode(input);

    // Safari/iPhone rejects Arabic/Persian glyphs in native type=number before
    // JavaScript gets a useful input value. Convert once, before editing starts.
    if (USE_IOS_TEXT_FALLBACK && isNumber) {
      input.setAttribute('data-pb-native-number', '1');
      input.setAttribute('data-pb-numeric', '');
      input.type = 'text';
      input.inputMode = numericInputMode(input);
      input.autocapitalize = 'off';
      input.spellcheck = false;
    }

    const numeric = isNumericInput(input);
    if (numeric) {
      input.lang = 'en';
      input.dir = 'ltr';
    }
    PREPARED.add(input);
    return numeric;
  }

  function normalizeCurrent(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!prepareInput(input)) return false;
    const current = String(input.value ?? '');
    const normalized = normalizeForInput(input, current);
    if (normalized === current) return false;

    // Important for performance: mutate the value inside the browser's own input
    // event and DO NOT dispatch a second synthetic input event. Because this
    // listener runs in capture phase, downstream dashboard listeners receive the
    // already-normalized English value in the same event.
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = normalized;
    try {
      if (Number.isInteger(start) && Number.isInteger(end) && input.type !== 'number') {
        const shift = current.length - normalized.length;
        input.setSelectionRange(Math.max(0, start - shift), Math.max(0, end - shift));
      }
    } catch (_) {}
    return true;
  }

  function emitNativeCompatibleInput(input, inputType = 'insertText', data = null) {
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Legacy fallback only for browsers that still use a native number field.
  // iPhone never reaches this path after prepareInput() converts the field to text.
  function insertIntoNativeNumber(input, text, inputType = 'insertText') {
    const normalized = normalizeForInput(input, text);
    input.value = normalizeForInput(input, `${input.value || ''}${normalized}`);
    emitNativeCompatibleInput(input, inputType, normalized);
  }

  function enhance(root = document) {
    const inputs = root instanceof HTMLInputElement
      ? [root]
      : [...(root.querySelectorAll?.(NUMERIC_SELECTOR) || [])];
    inputs.forEach(input => {
      prepareInput(input);
      normalizeCurrent(input);
    });
  }

  function normalizeTextNode(node) {
    const parent = node?.parentElement;
    if (!parent || SKIP_TEXT_TAGS.has(parent.tagName) || parent.closest?.('[contenteditable="true"]')) return;
    const current = String(node.data ?? '');
    if (!/[٠-٩۰-۹０-９]/.test(current)) return;
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

  // Critical iPhone path: this runs before the software keyboard edits the field.
  document.addEventListener('focusin', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    normalizeCurrent(input);
  }, true);

  // Fast path: let iPhone insert ١٢٣/۱۲۳ normally into the text-backed field,
  // then normalize the value in-place during the SAME native input event.
  document.addEventListener('input', event => {
    normalizeCurrent(event.target);
  }, true);

  document.addEventListener('change', event => {
    normalizeCurrent(event.target);
  }, true);

  document.addEventListener('compositionend', event => {
    normalizeCurrent(event.target);
  }, true);

  // Keep a compatibility path for non-iOS native number controls that may reject
  // localized glyphs before a normal input event is produced.
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (USE_IOS_TEXT_FALLBACK || String(input.type || '').toLowerCase() !== 'number') return;
    if (typeof event.data !== 'string' || !/[٠-٩۰-۹０-９٫٬،]/.test(event.data)) return;
    const normalized = normalizeForInput(input, event.data);
    if (!normalized || normalized === event.data) return;
    event.preventDefault();
    insertIntoNativeNumber(input, normalized, event.inputType || 'insertText');
  }, true);

  document.addEventListener('paste', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    prepareInput(input);
    if (USE_IOS_TEXT_FALLBACK || String(input.type || '').toLowerCase() !== 'number') return;
    const pasted = event.clipboardData?.getData('text') || '';
    if (!/[٠-٩۰-۹０-９٫٬،]/.test(pasted)) return;
    const normalized = normalizeForInput(input, pasted);
    if (!normalized || normalized === pasted) return;
    event.preventDefault();
    insertIntoNativeNumber(input, normalized, 'insertFromPaste');
  }, true);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        normalizeTextNode(mutation.target);
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          enhance(node);
          if (IS_ADMIN) normalizeTextTree(node);
        } else if (node.nodeType === 3 && IS_ADMIN) {
          normalizeTextNode(node);
        }
      }
    }
  });

  const boot = () => {
    enhance(document);
    if (IS_ADMIN) normalizeTextTree(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: IS_ADMIN });
  };

  window.RESTBR_TO_ENGLISH_DIGITS = toEnglishDigits;
  window.RESTBR_NORMALIZE_NUMERIC_INPUT = normalizeCurrent;
  window.RESTBR_IOS_NUMERIC_FALLBACK_ACTIVE = USE_IOS_TEXT_FALLBACK;
  window.RESTBR_NUMERIC_FAST_PATH_V2 = true;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
