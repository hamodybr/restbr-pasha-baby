import fs from 'node:fs';
const file='admin.html';
let html=fs.readFileSync(file,'utf8');

html=html.replace(
  "firstExisting(product,['image_url','image'],'assets/pasha-baby-logo-256.webp')",
  "firstExisting(product,['image_url','image'],'assets/restaurant-placeholder.svg')"
);
html=html.replace(
  '<img id="np_image_preview" class="image-preview" src="assets/pasha-baby-logo-256.webp" alt="">',
  '<img id="np_image_preview" class="image-preview" src="assets/restaurant-placeholder.svg" alt="">'
);
html=html.replace(
  "product.image ||\n          'assets/pasha-baby-logo-256.webp';",
  "product.image ||\n          'assets/restaurant-placeholder.svg';"
);
html=html.replace(
  "this.src='assets/pasha-baby-logo-256.webp';",
  "this.src='assets/restaurant-placeholder.svg';"
);
fs.writeFileSync(file,html,'utf8');
console.log('Kept Pasha logo fallback only for admin/store branding, not product image placeholders.');
