import fs from 'node:fs';

function read(file){ return fs.readFileSync(file,'utf8'); }
function write(file,text){ fs.writeFileSync(file,text,'utf8'); }

function replaceExact(text, from, to, label, expected=1){
  const count=text.split(from).length-1;
  if(count!==expected) throw new Error(`${label}: expected ${expected} match(es), found ${count}`);
  return text.split(from).join(to);
}

function replaceRegex(text, pattern, to, label, expected=1){
  const matches=[...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))];
  if(matches.length!==expected) throw new Error(`${label}: expected ${expected} match(es), found ${matches.length}`);
  return text.replace(pattern,to);
}

// ---------------------------------------------------------------------------
// app.js — use immutable category UUIDs internally instead of Arabic names.
// ---------------------------------------------------------------------------
{
  const file='js/app.js';
  let text=read(file);

  const oldCategoryMap=`    if (\n      !product.category ||\n      !product.category.ar\n    ) return;\n\n    if (!map.has(product.category.ar)) {\n      map.set(\n        product.category.ar,\n        product.category\n      );\n    }`;

  const newCategoryMap=`    const categoryKey =\n      String(product.category?.id || "");\n\n    if (!categoryKey) return;\n\n    if (!map.has(categoryKey)) {\n      map.set(\n        categoryKey,\n        product.category\n      );\n    }`;

  text=replaceExact(text,oldCategoryMap,newCategoryMap,'category map');
  text=replaceExact(
    text,
    'class="sm-cat ${category.ar === active ? "active" : ""}"',
    'class="sm-cat ${String(category.id) === String(active) ? "active" : ""}"',
    'category active comparison'
  );
  text=replaceExact(
    text,
    'data-cat="${escapeUi(category.ar)}"',
    'data-cat="${escapeUi(category.id)}"',
    'category data key'
  );
  text=replaceExact(text,'active=product.category.ar;','active=String(product.category.id||"");','product deep-link category');
  text=replaceExact(text,'active=category.ar;','active=String(category.id||"");','category deep-link');
  text=replaceExact(text,'product.category.ar===active','String(product.category.id)===String(active)','menu category filter');
  text=replaceExact(text,'cats[0]?.ar || "";','String(cats[0]?.id || "");','initial category');

  write(file,text);
}

// ---------------------------------------------------------------------------
// cart.js — add cryptographic randomness to human-readable WhatsApp order IDs.
// ---------------------------------------------------------------------------
{
  const file='js/cart.js';
  let text=read(file);

  const idPattern=/    const id=\n      orderIdPrefix\(\)\+"-"\+\n      new Date\(\)\.toISOString\(\)\.slice\(2,10\)\.replaceAll\("-",""\)\+\n      "-"\+\n      String\(Date\.now\(\)\)\.slice\(-5\);/;

  const replacement=`    const orderNonce=\n      globalThis.crypto?.randomUUID\n        ? crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()\n        : Math.random().toString(36).slice(2,10).toUpperCase().padEnd(8,"0");\n\n    const id=\n      orderIdPrefix()+"-"+\n      new Date().toISOString().slice(2,10).replaceAll("-","")+\n      "-"+\n      String(Date.now()).slice(-5)+\n      "-"+\n      orderNonce;`;

  text=replaceRegex(text,idPattern,replacement,'order id');
  write(file,text);
}

// ---------------------------------------------------------------------------
// admin.html — enforce authorization in the native auth flow, preserve backward
// compatibility for bulk-price RPC responses, and remove Shorash-only storage keys.
// ---------------------------------------------------------------------------
{
  const file='admin.html';
  let text=read(file);

  text=replaceExact(
    text,
    "const PRICE_SAFETY_BACKUP_KEY='SHORASH_LAST_PRICE_BACKUP_V1';",
    "const PRICE_SAFETY_BACKUP_KEY='RESTBR_LAST_PRICE_BACKUP_V1';",
    'price backup key'
  );
  text=replaceExact(
    text,
    "const ADMIN_SETTINGS_THEME_KEY='SHORASH_ADMIN_SETTINGS_THEME_V1';",
    "const ADMIN_SETTINGS_THEME_KEY='RESTBR_ADMIN_SETTINGS_THEME_V1';",
    'settings theme key'
  );

  text=replaceExact(
    text,
    '`${result.products_updated ?? 0} سعر أساسي، `+\n        `${result.options_updated ?? 0} سعر خيار)`',
    '`${result.products_updated ?? result.products ?? 0} سعر أساسي، `+\n        `${result.options_updated ?? result.options ?? 0} سعر خيار)`',
    'bulk price result compatibility'
  );

  const unlockPattern=/  async function unlockAdminForSession\(session\)\{[\s\S]*?\n  \}\n\n  function lockAdmin\(\)\{/;
  const unlockReplacement=`  async function unlockAdminForSession(session){\n    const access=await supabaseClient.rpc('can_access_admin');\n\n    if(access.error){\n      adminSession=null;\n      adminDashboardLoaded=false;\n      setAdminLocked(true);\n      updateAdminAccountUI(null);\n      setLoginMessage('تعذر التحقق من صلاحية حساب الإدارة: '+(access.error.message||access.error));\n      return false;\n    }\n\n    if(access.data!==true){\n      adminSession=null;\n      adminDashboardLoaded=false;\n      setAdminLocked(true);\n      updateAdminAccountUI(null);\n      setLoginMessage('هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.');\n      try{await supabaseClient.auth.signOut({scope:'local'});}catch(_){}\n      return false;\n    }\n\n    adminSession=session;\n    setAdminLocked(false);\n    updateAdminAccountUI(session);\n    setLoginMessage('');\n\n    if(!adminDashboardLoaded){\n      adminDashboardLoaded=true;\n      switchAdminView('home');\n      await loadAdminDashboard();\n    }\n\n    return true;\n  }\n\n  function lockAdmin(){`;

  text=replaceRegex(text,unlockPattern,unlockReplacement,'native admin authorization');

  text=text
    .replaceAll('✅ SHORASH ADMIN DATA LOADED','✅ RESTBR ADMIN DATA LOADED')
    .replaceAll('SHORASH SAVE ERROR','RESTBR SAVE ERROR')
    .replaceAll('current SHORASH products table','current RESTBR products table');

  write(file,text);
}

// ---------------------------------------------------------------------------
// supabase-config.js — retail copy does not need restaurant discount-sync code;
// also remove the development-only connection test query from production loads.
// ---------------------------------------------------------------------------
{
  const file='js/supabase-config.js';
  let text=read(file);

  text=replaceExact(
    text,
    "  if (RESTBR_IS_ADMIN_PATH) return;\n  if (document.getElementById('restbrDiscountChoicePriceSyncScript')) return;",
    "  if (RESTBR_IS_ADMIN_PATH || RESTBR_RETAIL_MODE) return;\n  if (document.getElementById('restbrDiscountChoicePriceSyncScript')) return;",
    'retail discount sync guard'
  );

  text=replaceExact(
    text,
    'testSupabaseConnection();',
    "// Connection health is exercised by the real menu/admin queries; avoid an extra production request.",
    'development connection test call'
  );

  write(file,text);
}

console.log('Audit refactor applied successfully.');
