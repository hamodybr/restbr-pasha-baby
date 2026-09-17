import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const files = {
  pipeline: read('js/admin-image-pipeline.js'),
  b2: read('js/admin-b2-storage.js'),
  colors: read('js/admin-color-image-upload.js'),
  legacy: read('js/admin-image-optimizer.js'),
  optionOrder: read('js/admin-option-order.js'),
  polish: read('js/pasha-baby-admin-polish-v3.js'),
  details: read('js/pasha-baby-product-description-v2.js'),
  gallery: read('js/pasha-product-gallery-thermal-v1.js'),
  arabic: read('js/pasha-arabic-only.js'),
  config: read('js/supabase-config.js')
};

for (const [name, source] of Object.entries(files)) {
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`${name} has invalid JavaScript: ${error.message}`);
  }
}

assert(files.pipeline.includes("profile === 'color'"), 'shared pipeline must expose the color profile');
assert(files.pipeline.includes('[1080, 0.72]') && files.pipeline.includes('[560, 0.48]'), 'color compression must use the bounded three-pass plan');
assert(files.pipeline.includes('[1280, 0.74]') && files.pipeline.includes('[620, 0.50]'), 'product compression must use the bounded three-pass plan');
assert(files.pipeline.includes('canvas.width = 1') && files.pipeline.includes('decoded.close?.()'), 'pipeline must release canvas and decoded image memory');
assert(!files.pipeline.includes('for (let i = 0; i < 10'), 'pipeline must not restore the old ten-pass loop');

assert(files.b2.includes('PASHA_ADMIN_IMAGE_PIPELINE'), 'product uploads must use the shared pipeline');
assert(!files.b2.includes('const attempts = ['), 'B2 uploader must not keep a second compression attempt list');
assert(!files.b2.includes('setInterval('), 'B2 uploader must not poll the admin page after boot');
assert(files.b2.includes('URL.revokeObjectURL(previous)'), 'product/settings previews must release replaced object URLs');

assert(files.colors.includes('PASHA_ADMIN_IMAGE_PIPELINE'), 'color image uploads must use the shared pipeline');
assert(!files.colors.includes('const attempts = [['), 'color upload must not keep the old seven-pass compressor');
assert(files.colors.includes("document.getElementById('editorModal')"), 'color upload observer must be scoped to the editor modal');
assert(!files.colors.includes('observe(document.body'), 'color upload must not watch the whole dashboard body');

assert(files.legacy.includes('__PASHA_BABY_ADMIN_IMAGE_OPTIMIZER_V3__ = true'), 'legacy optimizer kill-switch must protect cached loaders');
assert(!files.legacy.includes('setInterval(') && !files.legacy.includes('createImageBitmap('), 'legacy optimizer must not run duplicate polling/decoding');

assert(files.optionOrder.includes('label.textContent !== next'), 'option numbering writes must be idempotent');
assert(!files.optionOrder.includes('setInterval('), 'option editor must not poll for 30 seconds');
assert(!files.optionOrder.includes("await window.loadAdminDashboard()"), 'option-order wrapper must not trigger a second dashboard reload');
assert(files.optionOrder.includes("document.getElementById('editorModal')"), 'option observer must stay scoped to the editor modal');

assert(files.polish.includes('label.textContent !== next'), 'admin polish option labels must be idempotent');
assert(!files.polish.includes('setInterval('), 'admin polish must not keep the old 20-second polling loop');
assert(files.polish.includes("const modal = document.getElementById('editorModal')"), 'admin polish observer must be scoped to the editor modal');
assert(!files.polish.includes('observer.observe(document.body'), 'admin polish must not observe the whole dashboard body');

const realSheetMarker = "const SHEET_ID = 'pbProductDetailSheet'";
assert(files.details.includes(realSheetMarker), 'product details runtime must keep the expected live sheet id');
assert(files.gallery.includes(realSheetMarker), 'gallery polish must target the exact live product details sheet id');
assert(!files.gallery.includes('pbProductDetailsSheet'), 'gallery polish must not use the stale plural sheet id');
assert(files.gallery.includes('__PASHA_PRODUCT_GALLERY_THERMAL_V3__'), 'continuous iOS carousel generation must be active');
assert(files.gallery.includes('name.before(picker)'), 'color strip must be moved above the product name');
assert(files.gallery.includes("button.dataset.pbCarouselSrc = src"), 'color slide sources must survive observer passes');
assert(!files.gallery.includes("querySelectorAll('.pb-product-sheet-color-image').forEach(img => img.remove())"), 'base gallery color sources must not be removed');
assert(files.gallery.includes('min-height:40px!important') && files.gallery.includes('max-width:none!important'), 'color chips must fit compound color names comfortably');
assert(files.gallery.includes("stage.addEventListener('pointermove'"), 'carousel must follow the finger during a swipe');
assert(files.gallery.includes('pb-carousel-track'), 'carousel must render a real three-image track');
assert(files.gallery.includes("for (const position of ['prev', 'current', 'next'])"), 'carousel track must contain previous/current/next slides');
assert(files.gallery.includes('translate3d(calc(-33.333333% +'), 'current and neighboring images must translate together');
assert(files.gallery.includes('requestAnimationFrame(flushMove)'), 'finger tracking must be rAF-throttled');
assert(files.gallery.includes('performance.now()'), 'carousel must use swipe velocity as well as distance');
assert(files.gallery.includes('touch-action:pan-y'), 'carousel swipe must keep vertical page scrolling native');

assert(!files.gallery.includes('background:#101313!important'), 'category rail must never be forced to black');
assert(!files.gallery.includes('new IntersectionObserver'), 'category rail must not keep the obsolete sticky-state observer');
assert(files.gallery.includes('background:rgba(247,248,246,.97)!important'), 'category rail must keep the natural Pasha background');
assert(files.gallery.includes('content-visibility:visible!important'), 'mobile cards must disable Safari content-visibility virtualization');
assert(files.gallery.includes('contain-intrinsic-size:none!important'), 'mobile cards must not use synthetic intrinsic heights while scrolling');
assert(files.gallery.includes('.sm-live-sheen') && files.gallery.includes('display:none!important'), 'legacy card sheen must be disabled on mobile');
assert(files.gallery.includes('animation:none!important'), 'legacy living-card animations must be disabled on mobile');
assert(files.gallery.includes('.sm-card.sm-life-ready:active'), 'touch active-state card movement must be neutralized');
assert(files.gallery.includes('backdrop-filter:none!important'), 'scroll polish must disable expensive blur repainting');
assert(!files.gallery.includes('setInterval('), 'storefront gallery helper must not poll after boot');

const pipelinePos = files.arabic.indexOf('admin-image-pipeline.js?v=1.0');
const b2Pos = files.arabic.indexOf('admin-b2-storage.js?v=2.0');
assert(pipelinePos >= 0 && b2Pos > pipelinePos, 'shared image pipeline must load before B2 uploader');
assert(files.arabic.includes('admin-color-image-upload.js?v=2.0'), 'color uploader v2 must be loaded explicitly');
assert(files.arabic.includes('pasha-product-gallery-thermal-v1.js?v=1.3'), 'storefront gallery helper must be loaded');
assert(!files.arabic.includes('admin-image-optimizer.js?v=1.0'), 'Arabic admin loader must not boot the retired legacy optimizer');

assert(files.config.includes('pasha-arabic-only.js?v=2.2'), 'Arabic policy cache version must be bumped');
assert(files.config.includes('admin-option-order.js?v=3.0'), 'option-order cache version must be bumped');
assert(files.config.includes('pasha-baby-admin-polish-v3.js?v=3.1'), 'admin polish cache version must be bumped');

console.log('✅ Mobile image / continuous carousel / iOS scroll regression audit passed');
