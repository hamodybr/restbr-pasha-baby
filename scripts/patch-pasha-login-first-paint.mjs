import fs from 'node:fs';

const file = 'admin.html';
let html = fs.readFileSync(file, 'utf8');

const marker = 'PASHA_LOGIN_FIRST_PAINT_V1';
if (html.includes(marker)) {
  console.log('Pasha login first-paint patch already applied.');
  process.exit(0);
}

html = html.replace(
  '<title>Restaurant — Admin Dashboard</title>',
  '<title>Pasha Baby — Admin Dashboard</title>'
);

// Pasha Baby is a dedicated retail deployment: never paint the legacy coffee
// placeholder while the database/settings scripts are still loading.
html = html.replaceAll(
  'assets/restaurant-placeholder.svg',
  'assets/pasha-baby-logo-256.webp'
);

html = html.replace(
  '<h1>Restaurant Admin</h1>',
  '<h1>باشا بيبي Admin</h1>'
);

html = html.replace(
  '<p id="adminPageSubtitle">Restaurant Admin</p>',
  '<p id="adminPageSubtitle">Pasha Baby Admin</p>'
);

const firstPaint = `
<!-- PASHA_LOGIN_FIRST_PAINT_V1: synchronous login identity/theme to prevent FOUC -->
<link rel="preload" href="assets/pasha-baby-logo-256.webp" as="image" type="image/webp">
<script id="pashaLoginFirstPaintTheme">
(function(){
  var mode='dark';
  try{
    mode=localStorage.getItem('SHORASH_ADMIN_THEME_V2')||localStorage.getItem('SHORASH_ADMIN_SETTINGS_THEME_V1')||'dark';
  }catch(_){ }
  mode=mode==='light'?'light':'dark';
  document.documentElement.setAttribute('data-pasha-admin-first-theme',mode);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',mode==='light'?'#fffaf5':'#0e1716');
})();
</script>
<style id="pashaLoginFirstPaintStyle">
  /* This small synchronous layer mirrors the final Pasha admin theme and is
     intentionally limited to the locked login gate. Full dashboard styling
     still belongs to admin-light-theme-complete.js. */
  html[data-pasha-admin-first-theme="light"] body.auth-locked{
    background:#fffaf5!important;
    color:#2f3b42!important;
    color-scheme:light;
  }
  html[data-pasha-admin-first-theme="dark"] body.auth-locked{
    background:#0e1716!important;
    color:#f1f6f4!important;
    color-scheme:dark;
  }
  html[data-pasha-admin-first-theme="light"] body.auth-locked .admin-login-gate{
    background:
      radial-gradient(circle at 12% 10%,#d8eef8 0,transparent 26%),
      radial-gradient(circle at 88% 14%,#f8d6c5 0,transparent 25%),
      radial-gradient(circle at 52% 100%,#bfe5da 0,transparent 28%),
      linear-gradient(180deg,#fffaf5 0%,#f7f2ec 100%)!important;
  }
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .admin-login-gate{
    background:
      radial-gradient(circle at 8% 2%,rgba(183,223,240,.10) 0,transparent 25%),
      radial-gradient(circle at 92% 7%,rgba(244,195,170,.09) 0,transparent 24%),
      radial-gradient(circle at 52% 100%,rgba(143,205,189,.10) 0,transparent 28%),
      linear-gradient(180deg,#0c1514 0%,#101b1a 55%,#0d1716 100%)!important;
  }
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-card{
    background:rgba(255,255,255,.88)!important;
    color:#2f3b42!important;
    border:1px solid rgba(83,105,103,.14)!important;
    border-radius:26px!important;
    box-shadow:0 14px 36px rgba(72,58,47,.08)!important;
    backdrop-filter:blur(18px)!important;
    -webkit-backdrop-filter:blur(18px)!important;
  }
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-card{
    background:rgba(23,36,34,.92)!important;
    color:#f1f6f4!important;
    border:1px solid rgba(143,205,189,.14)!important;
    border-radius:26px!important;
    box-shadow:0 16px 42px rgba(0,0,0,.28)!important;
    backdrop-filter:blur(18px)!important;
    -webkit-backdrop-filter:blur(18px)!important;
  }
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-brand img,
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-brand img{
    background:#fff!important;
    border:1px solid rgba(47,139,115,.24)!important;
    box-shadow:0 7px 20px rgba(72,58,47,.06)!important;
  }
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-brand h1{color:#2f8b73!important}
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-brand h1{color:#8fcdbd!important}
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-brand p,
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-field label{color:#6e7b81!important}
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-brand p,
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-field label{color:#a7b6b2!important}
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-field input{
    background:#fff!important;
    color:#2f3b42!important;
    -webkit-text-fill-color:#2f3b42!important;
    border-color:rgba(83,105,103,.14)!important;
  }
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-field input{
    background:#192826!important;
    color:#f1f6f4!important;
    -webkit-text-fill-color:#f1f6f4!important;
    border-color:rgba(143,205,189,.14)!important;
  }
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-field input::placeholder{color:#9ba7aa!important;-webkit-text-fill-color:#9ba7aa!important}
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-field input::placeholder{color:#83938f!important;-webkit-text-fill-color:#83938f!important}
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-field input:focus{border-color:#2f8b73!important;box-shadow:0 0 0 3px rgba(47,139,115,.12)!important}
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-field input:focus{border-color:#8fcdbd!important;box-shadow:0 0 0 3px rgba(143,205,189,.12)!important}
  html[data-pasha-admin-first-theme="light"] body.auth-locked .login-submit{
    background:linear-gradient(135deg,#4ea78f,#2f8b73)!important;
    color:#fff!important;
    box-shadow:0 10px 24px rgba(47,139,115,.20)!important;
  }
  html[data-pasha-admin-first-theme="dark"] body.auth-locked .login-submit{
    background:linear-gradient(135deg,#69b39f,#8fcdbd)!important;
    color:#10201d!important;
    box-shadow:0 10px 24px rgba(105,179,159,.18)!important;
  }
</style>
`;

if (!html.includes('</head>')) throw new Error('admin.html is missing </head>');
html = html.replace('</head>', `${firstPaint}\n</head>`);

fs.writeFileSync(file, html, 'utf8');
console.log('Applied Pasha Baby synchronous login first-paint identity/theme.');
