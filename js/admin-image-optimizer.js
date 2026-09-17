(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V4__) return;
  window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V4__ = true;

  // Compatibility kill-switch for older cached loaders. Product uploads now use
  // admin-image-pipeline.js through admin-b2-storage.js, and color uploads use
  // the same pipeline through admin-color-image-upload.js. Keeping a second
  // optimizer here would decode the same image twice and used to poll every
  // 100ms while waiting for upload functions.
  window.__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V3__ = true;
})();