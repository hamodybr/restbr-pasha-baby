(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_OPTION_PRICE_FAST_V1__) return;
  window.__PASHA_OPTION_PRICE_FAST_V1__ = true;

  const PRICE_SELECTOR = '.oe-price,.noe-price';
  const LOCALIZED_DIGITS = /[٠-٩۰-۹０-９]/;
  const LOCALIZED_NUMBER_CHARS = /[٠-٩۰-۹０-９٫٬،]/;
  const prepared = new WeakSet();

  function toEnglishDigits(value) {
    const helper = window.RESTBR_TO_ENGLISH_DIGITS;
    if (typeof helper === 'function') return helper(value);
    return String(value ?? '')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296));
  }

  function normalizePriceText(value) {
    return toEnglishDigits(value)
      .replace(/[٫]/g, '.')
      .replace(/[٬،,]/g, '')
      .replace(/[^0-9]/g, '');
  }

  function isPriceInput(input) {
    return input instanceof HTMLInputElement && input.matches(PRICE_SELECTOR);
  }

  function prepare(input) {
    if (!isPriceInput(input)) return false;
    if (prepared.has(input)) return true;

    // These prices are integer IQD values. Keep them text-backed from the first
    // interaction so iOS never has to switch a native number field while the
    // keyboard is already open.
    input.type = 'text';
    input.inputMode = 'numeric';
    input.pattern = '[0-9٠-٩۰-۹]*';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.lang = 'en';
    input.dir = 'ltr';
    input.setAttribute('data-pb-native-number', '1');
    input.setAttribute('data-pb-numeric', '');
    input.setAttribute('data-pb-fast-option-price', '1');

    const normalized = normalizePriceText(input.value);
    if (normalized && normalized !== input.value) input.value = normalized;
    prepared.add(input);
    return true;
  }

  function replaceSelection(input, text, inputType = 'insertText') {
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    input.setRangeText(text, start, end, 'end');
    try {
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType,
        data: text
      }));
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Important iPhone fast path: cancel the localized glyph BEFORE Safari puts it
  // in the text-backed price field, then insert the ASCII digit once. This avoids
  // rewriting the whole value + caret on every ١/٢/٣ keypress.
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!isPriceInput(input)) return;
    prepare(input);
    if (typeof event.data !== 'string' || !LOCALIZED_NUMBER_CHARS.test(event.data)) return;

    const normalized = normalizePriceText(event.data);
    if (!normalized) return;
    event.preventDefault();
    replaceSelection(input, normalized, event.inputType || 'insertText');
  }, true);

  document.addEventListener('paste', event => {
    const input = event.target;
    if (!isPriceInput(input)) return;
    prepare(input);
    const text = event.clipboardData?.getData('text') || '';
    if (!LOCALIZED_DIGITS.test(text)) return;

    const normalized = normalizePriceText(text);
    if (!normalized) return;
    event.preventDefault();
    replaceSelection(input, normalized, 'insertFromPaste');
  }, true);

  document.addEventListener('focusin', event => {
    if (isPriceInput(event.target)) prepare(event.target);
  }, true);

  function prepareAll(root = document) {
    if (root instanceof HTMLInputElement) prepare(root);
    root.querySelectorAll?.(PRICE_SELECTOR).forEach(prepare);
  }

  function boot() {
    prepareAll(document);
    const modal = document.getElementById('editorModal');
    if (!modal) return;
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) prepareAll(node);
        }
      }
    }).observe(modal, { childList: true, subtree: true });
  }

  window.RESTBR_OPTION_PRICE_FAST_INPUT_V1 = true;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
