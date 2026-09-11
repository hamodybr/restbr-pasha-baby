import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { jsPDF } = require('../js/vendor/jspdf-2.5.2.umd.min.js');
const rendererSource = fs.readFileSync(new URL('../js/admin-invoice-pdf.js', import.meta.url), 'utf8');
const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
if (!fs.existsSync(fontPath)) throw new Error(`Missing Arabic-capable test font: ${fontPath}`);

const context = vm.createContext({ window: {}, Blob, console });
vm.runInContext(rendererSource, context);

const cfg = {
  page_size:'A4', page_orientation:'portrait', page_margin_mm:6, outer_padding_mm:8,
  frame_width_pt:3, frame_radius_mm:4, font_weight:900, line_height:1.25,
  logo_mode:'stamp', logo_size_mm:27, title_size_pt:25, subtitle_size_pt:8,
  header_spacing_mm:2.5, meta_size_pt:8, customer_size_pt:10.5, address_size_pt:9.5,
  details_size_pt:17, item_size_pt:12, option_size_pt:9.5, price_size_pt:12,
  row_min_height_mm:7, row_padding_mm:1, leader_width_pt:1.5, leader_style:'dotted',
  notes_size_pt:9.5, total_size_pt:16, total_border_pt:2, footer_size_pt:15,
  footer_spacing_mm:2.5, brand_title:'PASHA BABY', brand_subtitle:'PREMIUM BABY BOUTIQUE',
  details_title:'تفاصيل الطلب', footer_text:'شكراً لاختياركم', show_logo:true,
  show_brand_title:true, show_brand_subtitle:true, show_order_number:true,
  show_date_time:true, show_customer_phone:true, show_customer_address:true,
  show_order_type:true, show_details_title:true, show_quantity:true, show_options:true,
  show_notes:true, show_subtotal:true, show_footer:true,
};
const order = {
  order_number:'PB-TEST', created_at:'2026-09-11T12:00:00Z', customer_name:'محمد مصطفى',
  customer_phone:'07500200660', order_type:'delivery', address:'دهوك، الشارع العام',
  subtotal:124000, total:129000,
};
const items = [{ quantity:2, product_name:'حفاضات أطفال', option_name:'قياس 4', selected_color:'أزرق', line_total:38000 }];
const result = context.window.PashaInvoicePdf.create({
  jsPDF, cfg, order, items, notes:'الاتصال قبل التوصيل', fee:5000,
  fontBase64:fs.readFileSync(fontPath).toString('base64'), logoDataUrl:'',
  money:value => `${Number(value).toLocaleString('en-US')} د.ع`,
  when:() => '11/09/2026، 03:00 م',
  itemOptionText:item => [item.option_name, item.selected_color ? `اللون: ${item.selected_color}` : ''].filter(Boolean).join(' • '),
  englishDigits:value => String(value ?? ''),
});

const bytes = Buffer.from(await result.blob.arrayBuffer());
if (bytes.subarray(0, 4).toString() !== '%PDF') throw new Error('Renderer did not create a PDF file.');
if (!bytes.includes(Buffer.from('/FontFile2'))) throw new Error('Generated PDF does not contain an embedded TrueType font.');
if (result.embeddedFont !== 'PashaInvoiceCustom') throw new Error('Custom font was not selected by the renderer.');
if (result.pageCount !== 1) throw new Error(`Unexpected page count: ${result.pageCount}`);

console.log('✓ Direct invoice PDF contains an embedded Arabic TrueType font');
