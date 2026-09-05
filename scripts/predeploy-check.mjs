import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const notes = [];

const fail = message => failures.push(message);
const note = message => notes.push(message);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const stripQuery = value => value.split('#')[0].split('?')[0];
const isExternal = value => /^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(value);

function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

function checkLocalRef(ref, source) {
  if (!ref || isExternal(ref) || ref.includes('${') || ref.includes('{{')) return;
  const clean = stripQuery(ref).replace(/^\.\//, '');
  if (!clean || clean.startsWith('../')) return;
  if (!exists(clean)) fail(`${source}: missing local asset ${ref}`);
}

function requireText(file, marker, label = marker) {
  if (!read(file).includes(marker)) fail(`${file}: missing ${label}`);
}

function forbidText(file, marker, label = marker) {
  if (read(file).includes(marker)) fail(`${file}: forbidden legacy/unsafe marker ${label}`);
}

// 1) JavaScript syntax: no deploy if any browser/service-worker file cannot parse.
const jsFiles = [
  ...walk('js', file => file.endsWith('.js')),
  'sw.js'
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: JavaScript syntax check failed\n${String(error?.stderr || error?.message || error)}`);
  }
}
note(`JavaScript syntax checked: ${jsFiles.length} files`);

// 2) Manifest must be valid JSON and remain Pasha Baby scoped.
try {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  if (!/Pasha Baby/i.test(String(manifest.name || ''))) fail('manifest.webmanifest: wrong app identity');
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 1) fail('manifest.webmanifest: no icons configured');
  for (const icon of manifest.icons || []) checkLocalRef(icon.src, 'manifest.webmanifest');
} catch (error) {
  fail(`manifest.webmanifest: invalid JSON (${error.message})`);
}

// 3) HTML local src/href references must exist.
for (const file of ['index.html', 'admin.html']) {
  const html = read(file);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    checkLocalRef(match[1], file);
  }
}

// 4) CSS local url(...) references must exist.
for (const file of walk('css', file => file.endsWith('.css'))) {
  const css = read(file);
  const base = path.posix.dirname(file);
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const ref = match[1].trim();
    if (!ref || isExternal(ref) || ref.includes('${') || ref.includes('{{')) continue;
    const clean = stripQuery(ref);
    const resolved = path.posix.normalize(path.posix.join(base, clean));
    if (!resolved.startsWith('..') && !exists(resolved)) fail(`${file}: missing CSS asset ${ref}`);
  }
}

// 5) Service worker cache list cannot point to missing files.
const sw = read('sw.js');
if (!/restbr-pasha-baby-v\d+/.test(sw)) fail('sw.js: Pasha cache namespace is missing');
for (const match of sw.matchAll(/["']\.\/([^"']+)["']/g)) {
  const ref = match[1];
  if (ref === '' || ref === 'index.html') continue;
  checkLocalRef(ref, 'sw.js');
}
if (!sw.includes('js/restbr-hardening.js?v=1.0')) fail('sw.js: hardening layer is not cached');

// 6) Pasha deployment identity / feature isolation.
const runtime = read('js/runtime-config.js');
const requiredRuntimeFragments = [
  "restaurantName: 'Pasha Baby'",
  "businessType: 'retail'",
  'enableDiningModes: false',
  'enableUserManagement: false',
  'enableRestaurantReset: false',
  "script.src = 'js/restbr-hardening.js?v=1.0'"
];
for (const fragment of requiredRuntimeFragments) {
  if (!runtime.includes(fragment)) fail(`js/runtime-config.js: missing required guard: ${fragment}`);
}

if (read('CNAME').trim() !== 'pashababy.restbr.com') fail('CNAME: expected pashababy.restbr.com');
if (read('index.html').includes('js/dining-mode.js')) fail('index.html: restaurant dining-mode script must not load in retail mode');

// 7) Detect secret keys accidentally committed to browser-delivered files.
const browserTextFiles = [
  'index.html',
  'admin.html',
  ...walk('js', file => file.endsWith('.js'))
];
for (const file of browserTextFiles) {
  const text = read(file);
  if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(text)) fail(`${file}: Supabase secret key detected`);
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i.test(text)) fail(`${file}: service-role key assignment detected`);

  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = match[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      if (decoded?.role === 'service_role') fail(`${file}: legacy service_role JWT detected`);
    } catch (_) {}
  }
}

// 8) Hardening features expected by this audit must remain present.
const hardening = read('js/restbr-hardening.js');
for (const marker of [
  'OFFLINE_CACHE_MAX_AGE_MS',
  "rpc('can_access_admin')",
  "rpc('apply_menu_excel_updates'",
  'RESTBR_EXCEL_TRANSACTIONAL_IMPORT'
]) {
  if (!hardening.includes(marker)) fail(`js/restbr-hardening.js: missing ${marker}`);
}

// 9) Core-flow invariants fixed by the audit must not regress.
requireText('js/app.js', 'const categoryKey =', 'UUID-backed category key');
requireText('js/app.js', 'data-cat="${escapeUi(category.id)}"', 'UUID category navigation');
requireText('js/app.js', 'String(product.category.id)===String(active)', 'UUID category render filter');
requireText('js/cart.js', 'const orderNonce=', 'random order ID nonce');
requireText('admin.html', "rpc('can_access_admin')", 'native admin role gate');
requireText('admin.html', 'result.products_updated ?? result.products ?? 0', 'bulk price result compatibility');
requireText('admin.html', "const PRICE_SAFETY_BACKUP_KEY='RESTBR_LAST_PRICE_BACKUP_V1';", 'client-neutral price backup key');
requireText('admin.html', "const ADMIN_SETTINGS_THEME_KEY='RESTBR_ADMIN_SETTINGS_THEME_V1';", 'client-neutral admin theme key');
forbidText('admin.html', "const PRICE_SAFETY_BACKUP_KEY='SHORASH_LAST_PRICE_BACKUP_V1';", 'Shorash price backup key');
forbidText('admin.html', "const ADMIN_SETTINGS_THEME_KEY='SHORASH_ADMIN_SETTINGS_THEME_V1';", 'Shorash admin theme key');
requireText('js/supabase-config.js', 'if (RESTBR_IS_ADMIN_PATH || RESTBR_RETAIL_MODE) return;', 'retail-only discount loader guard');
forbidText('js/supabase-config.js', 'testSupabaseConnection();', 'development connection-test request');

// 10) The live database hardening migration must be committed with the app.
const auditMigration = 'supabase/migrations/20260905223000_pasha_audit_hardening.sql';
if (!exists(auditMigration)) fail(`${auditMigration}: missing`);
else {
  requireText(auditMigration, 'restaurant_settings_singleton_idx', 'settings singleton guard');
  requireText(auditMigration, 'menu_analytics_minute_rate', 'analytics rate limiter');
  requireText(auditMigration, 'apply_menu_excel_updates', 'transactional Excel RPC');
}

for (const message of notes) console.log(`✓ ${message}`);
if (failures.length) {
  console.error('\nPre-deploy audit failed:');
  failures.forEach(item => console.error(`  ✗ ${item}`));
  process.exit(1);
}

console.log('✓ Pasha Baby pre-deploy audit passed');
