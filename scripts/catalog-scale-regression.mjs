import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Execute the production pagination functions, including every page boundary.
const app = fs.readFileSync('js/app.js', 'utf8');
const paging = app.slice(app.indexOf('const V3_CATALOG_PAGE_SIZE'), app.indexOf("document.addEventListener('click', event =>", app.indexOf('const V3_CATALOG_PAGE_SIZE')));
const scope = { IS_STOREFRONT_V3: true, active: '__all__', searchQuery: '', v3CatalogFilter: 'all' };
vm.createContext(scope);
vm.runInContext(paging + ';this.pageRows=catalogPageRows;this.setPage=n=>{v3CatalogPage=n};', scope);
const products = Array.from({ length: 5000 }, (_, i) => ({ id: 'p' + i }));
scope.pageRows(products);
const ids = [];
for (let page = 1; page <= 157; page++) {
  scope.setPage(page);
  const rows = scope.pageRows(products);
  assert(rows.length <= 32);
  ids.push(...rows.map(p => p.id));
}
assert.deepEqual(ids, products.map(p => p.id), 'every product remains reachable without duplicates');
scope.searchQuery = 'new search';
assert.equal(scope.pageRows(products)[0].id, 'p0', 'search resets the current page');

// Real dashboard renderer: 5000 products / 10000 options, no backend writes.
const html = fs.readFileSync('admin.html', 'utf8');
const dom = new JSDOM('<body><button class="active" data-admin-category-filter="c"></button><input id="adminSearch"><span id="productsShown"></span><div class="panel"><header class="panel-header"></header><div id="productsContainer"></div></div></body>', { runScripts: 'outside-only', url: 'https://example.test/admin.html' });
const w = dom.window;
w.HTMLElement.prototype.scrollIntoView = () => {};
w.eval(fs.readFileSync('js/admin-data-tools.js', 'utf8'));
w.eval(`var adminProducts=${JSON.stringify(products.map((p,i) => ({ ...p, category_id:'c', name_ar:'اختبار '+i, base_price:1000, sort_order:i+1 })))}, adminOptions=${JSON.stringify(products.flatMap(p => [0,1].map(i => ({ id:p.id+'o'+i, product_id:p.id, name_ar:'خيار '+i, price:1000+i, sort_order:i }))))}, adminCategories=[{id:'c',name_ar:'قسم'}], adminRestaurantSettings={}, adminProductFilter='all';
  function escapeAdminHtml(value){return String(value).replaceAll('<','&lt;').replaceAll('"','&quot;')}
  function formatAdminPrice(value){return String(value)}
  function productMatchesAdminFilter(){return true}`);
w.eval(html.slice(html.indexOf('  let optionIndexSource'), html.indexOf('  function hasField(')) + html.slice(html.indexOf('  let adminProductsPage'), html.indexOf('  function setSortStatus(')));
w.renderAdminProducts();
assert.equal(w.document.querySelectorAll('.product-row').length, 50);
assert(w.document.querySelectorAll('*').length < 1500, 'dashboard DOM must stay bounded');
w.document.querySelector('[data-admin-products-page="2"]').click();
assert.equal(JSON.parse(w.document.getElementById('productsContainer').dataset.pbPageIds)[0], 'p50');
w.renderAdminProducts('اختبار 4999');
assert.equal(w.document.querySelectorAll('.product-row').length, 1);
w.renderAdminProducts();

// Run the actual ordering RPC caller with a mocked server. All off-page IDs survive.
let saved;
w.supabaseClient = { rpc: async (name, args) => { saved = { name, args }; return { error:null }; } };
w.requestAnimationFrame = fn => w.setTimeout(fn, 0);
w.Sortable = class { constructor() {} option() {} destroy() {} };
let ordering = fs.readFileSync('js/admin-inline-list-ordering.js', 'utf8');
ordering = ordering.replace(/\}\)\(\);\s*$/, 'window.__testOrdering={saveProductOrderInline,decorateProductRows,productOrderingState};})();');
w.eval(ordering);
w.__testOrdering.decorateProductRows();
assert(w.__testOrdering.productOrderingState().enabled, JSON.stringify(w.__testOrdering.productOrderingState()) + w.document.getElementById("productsContainer").dataset.pbPageIds);
const container = w.document.getElementById('productsContainer');
container.insertBefore(container.children[1], container.children[0]);
await w.__testOrdering.saveProductOrderInline('c');
assert.equal(saved.name, 'reorder_products');
assert.equal(saved.args.p_ids.length, 5000);
assert.equal(saved.args.p_ids[0], 'p1');
assert.equal(saved.args.p_ids[1], 'p0');
assert.equal(saved.args.p_ids[50], 'p50');
assert.equal(new Set(saved.args.p_ids).size, 5000);
assert.throws(() => w.PashaAdminData.mergePageOrder(['a','b'], ['a'], ['missing']));
w.close();

// Read both real catalog pagers against a server cap of only 100 rows.
for (const [file, end] of [['js/pasha-baby-commerce.js','  function iraqMinutesNow('], ['js/admin-large-catalog.js','  function catalogMayBeTruncated(']]) {
  const source = fs.readFileSync(file, 'utf8');
  const all = Array.from({length:2105}, (_,id) => ({id}));
  const context = { PAGE_SIZE:1000, MAX_ROWS:50000, supabaseClient:{from(){let start=0;return {select(){return this},range(a){start=a;return this},order(){return this},eq(){return this},then(resolve){resolve({data:all.slice(start,start+100),count:all.length,error:null})}}}} };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  async function fetchAll('),source.indexOf(end))+';this.fetchAll=fetchAll;',context);
  assert.equal((await context.fetchAll('products')).length,2105,file+' must respect smaller server caps');
}
console.log('✓ 5000 products: 32 storefront cards / 50 admin rows, all pages reachable, search reset, full-category ordering and capped reads');
