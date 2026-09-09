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

  function toEnglishDigits(value) {
    return String(value ?? '')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  }

  function isNumericInput(input) {
    return input instanceof HTMLInputElement && input.matches(NUMERIC_SELECTOR);
  }

  function normalizeForInput(input, value) {
    let next = toEnglishDigits(value);
    const type = String(input.type || '').toLowerCase();
    const mode = String(input.inputMode || '').toLowerCase();
    if (type === 'number' || mode === 'numeric' || mode === 'decimal' || input.hasAttribute('data-pb-numeric')) {
      next = next
        .replace(/[٫]/g, '.')
        .replace(/[٬،]/g, ',');
      if (type === 'number') next = next.replace(/,(?=\d{3}(?:\D|$))/g, '');
    }
    return next;
  }

  function emitInput(input, inputType = 'insertText', data = null) {
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function insertNormalized(input, text, inputType = 'insertText') {
    const normalized = normalizeForInput(input, text);
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (Number.isInteger(start) && Number.isInteger(end) && typeof input.setRangeText === 'function') {
      input.setRangeText(normalized, start, end, 'end');
      emitInput(input, inputType, normalized);
      return;
    }

    try {
      input.focus({ preventScroll: true });
      if (document.execCommand?.('insertText', false, normalized)) return;
    } catch (_) {}

    input.value = normalizeForInput(input, `${input.value || ''}${normalized}`);
    emitInput(input, inputType, normalized);
  }

  function normalizeCurrent(input) {
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
      if (!isNumericInput(input)) return;
      input.lang = 'en';
      input.dir = 'ltr';
      if (input.type === 'number' && !input.inputMode) {
        const step = String(input.getAttribute('step') || '');
        input.inputMode = step && !/^\d+$/.test(step) ? 'decimal' : 'numeric';
      }
      normalizeCurrent(input);
    });
  }

  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!isNumericInput(input) || typeof event.data !== 'string') return;
    const normalized = normalizeForInput(input, event.data);
    if (normalized === event.data) return;
    event.preventDefault();
    insertNormalized(input, normalized, event.inputType || 'insertText');
  }, true);

  document.addEventListener('paste', event => {
    const input = event.target;
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
    for (const mutation of mutations) for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) enhance(node);
    }
  });

  const boot = () => {
    enhance(document);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  window.RESTBR_TO_ENGLISH_DIGITS = toEnglishDigits;
  window.RESTBR_NORMALIZE_NUMERIC_INPUT = normalizeCurrent;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
