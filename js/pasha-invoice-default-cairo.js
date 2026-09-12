(() => {
  if (window.__PASHA_INVOICE_DEFAULT_CAIRO_V1__) return;
  window.__PASHA_INVOICE_DEFAULT_CAIRO_V1__ = true;

  const DEFAULT_FONT_URL = 'https://wlollfpmjzenhkjwxrqo.supabase.co/storage/v1/object/public/invoice-assets/settings/fonts/1789198685761-rapdwp.ttf';
  const DEFAULT_FONT_NAME = 'Cairo-Bold.ttf';
  const DEFAULT_FONT_WEIGHT = 700;

  const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const hasLegacyUntouchedFont = source =>
    isObject(source) &&
    String(source.font_family || '') === 'modern_pro' &&
    !String(source.custom_font_url || '').trim() &&
    !String(source.custom_font_name || '').trim();

  function readCurrent(api) {
    const raw = {};
    document.querySelectorAll('[data-invoice-field]').forEach(input => {
      raw[input.dataset.invoiceField] = input.value;
    });
    document.querySelectorAll('[data-invoice-number]').forEach(input => {
      raw[input.dataset.invoiceNumber] = input.value;
    });
    document.querySelectorAll('[data-invoice-toggle]').forEach(input => {
      raw[input.dataset.invoiceToggle] = input.checked;
    });
    return api.normalize(raw);
  }

  function decorate() {
    const root = document.querySelector('.pb-invoice-settings');
    if (!root) return;
    const customOption = root.querySelector('[data-invoice-field="font_family"] option[value="custom"]');
    if (customOption) customOption.textContent = 'Cairo Bold / الخط المرفوع';

    const family = root.querySelector('[data-invoice-field="font_family"]')?.value;
    const url = root.querySelector('[data-invoice-field="custom_font_url"]')?.value;
    const name = root.querySelector('[data-invoice-font-name]');
    if (name && family === 'custom' && String(url || '') === DEFAULT_FONT_URL) {
      name.textContent = 'Cairo Bold — الافتراضي';
    }
  }

  function install() {
    const api = window.PashaInvoiceSettings;
    if (!api || api.__defaultCairoInstalled) return Boolean(api);

    const originalNormalize = api.normalize;
    const baseDefaults = isObject(api.defaults) ? api.defaults : {};
    const cairoDefaults = Object.freeze({
      ...baseDefaults,
      font_family: 'custom',
      font_weight: DEFAULT_FONT_WEIGHT,
      custom_font_url: DEFAULT_FONT_URL,
      custom_font_name: DEFAULT_FONT_NAME
    });

    api.defaults = cairoDefaults;
    api.defaultFont = Object.freeze({
      family: 'Cairo Bold',
      fileName: DEFAULT_FONT_NAME,
      url: DEFAULT_FONT_URL,
      weight: DEFAULT_FONT_WEIGHT
    });

    api.normalize = raw => {
      const source = isObject(raw) ? { ...raw } : {};
      if (!String(source.font_family || '').trim() || hasLegacyUntouchedFont(source)) {
        source.font_family = 'custom';
        source.font_weight = DEFAULT_FONT_WEIGHT;
        source.custom_font_url = DEFAULT_FONT_URL;
        source.custom_font_name = DEFAULT_FONT_NAME;
      }
      return originalNormalize(source);
    };

    api.__defaultCairoInstalled = true;

    document.addEventListener('click', event => {
      const reset = event.target.closest?.('[data-invoice-reset]');
      if (reset) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (confirm('ترجع كل إعدادات الفاتورة إلى التصميم الافتراضي؟')) {
          api.render(cairoDefaults);
          queueMicrotask(decorate);
        }
        return;
      }

      const clear = event.target.closest?.('[data-invoice-clear-font]');
      if (clear) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const current = readCurrent(api);
        api.render({
          ...current,
          font_family: 'custom',
          font_weight: DEFAULT_FONT_WEIGHT,
          custom_font_url: DEFAULT_FONT_URL,
          custom_font_name: DEFAULT_FONT_NAME
        });
        const file = document.querySelector('[data-invoice-font-file]');
        if (file) file.value = '';
        queueMicrotask(decorate);
      }
    }, true);

    const applyFreshDefaultIfNeeded = () => {
      const root = document.querySelector('.pb-invoice-settings');
      if (!root) return;
      const family = root.querySelector('[data-invoice-field="font_family"]')?.value;
      const url = root.querySelector('[data-invoice-field="custom_font_url"]')?.value;
      if (!family || (family === 'modern_pro' && !String(url || '').trim())) {
        api.render(cairoDefaults);
      }
      decorate();
    };

    applyFreshDefaultIfNeeded();
    const observer = new MutationObserver(() => applyFreshDefaultIfNeeded());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 120) clearInterval(timer);
    }, 100);
  }
})();
