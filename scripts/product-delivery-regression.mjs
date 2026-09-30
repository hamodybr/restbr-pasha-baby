import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { JSDOM } from 'jsdom';
const dom=new JSDOM('<body class="pb-v3-page"></body>',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.RESTBR_HOURS_READY=true;w.RESTBR_LANG=()=> 'ar';
w.RESTBR_DB={restaurant:{isOpen:true,ordersEnabled:true,whatsappNumber:'9647500000000'},products:[
 {id:'a',name:{ar:'صنف صغير'},deliveryFee:5000,options:[{id:'oa',ar:'قطعة',price:10000}]},
 {id:'b',name:{ar:'صنف كبير'},deliveryFee:15000,options:[{id:'ob',ar:'قطعة',price:20000}]},
 {id:'c',name:{ar:'صنف آخر'},deliveryFee:5000,options:[{id:'oc',ar:'قطعة',price:3000}]}
]};
w.eval(fs.readFileSync('js/cart.js','utf8'));
const add=(id,qty)=>w.RESTBR_CART_ADD_QUANTITY(w.RESTBR_DB.products.find(p=>p.id===id),0,qty);
add('a',3);add('c',2);d.getElementById('smCartContinue').click();
assert.match(d.getElementById('smCheckoutTotal').textContent,/41,000/,'5000 once, regardless of products/quantity');
add('b',2);d.getElementById('smCartContinue').click();
assert.match(d.getElementById('smCheckoutTotal').textContent,/91,000/,'highest fee only');
d.getElementById('smPickupBtn').click();assert.match(d.getElementById('smCheckoutTotal').textContent,/76,000/);
d.getElementById('smDeliveryBtn').click();assert.match(d.getElementById('smCheckoutTotal').textContent,/91,000/);
d.querySelector('[data-cart-remove="b:0"]').click();d.getElementById('smCartContinue').click();assert.match(d.getElementById('smCheckoutTotal').textContent,/41,000/);
w.RESTBR_DB.products[0].deliveryFee=0;w.RESTBR_DB.products[2].deliveryFee=0;w.dispatchEvent(new w.Event('restbr:prices-updated'));assert.match(d.getElementById('smCheckoutTotal').textContent,/36,000/);
dom.window.close();
const pid='11111111-1111-4111-8111-111111111111',p2='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
let handler,writes=[],existing=null;
const data=t=>({orders:existing,restaurant_settings:{is_open:true,orders_enabled:true},products:[{id:pid,category_id:cid,base_price:10000,delivery_fee:5000},{id:p2,category_id:cid,base_price:20000,delivery_fee:15000}],product_options:[],product_colors:[],discounts:[],categories:[{id:cid}]}[t]);
const db={from(t){return {select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},maybeSingle(){return Promise.resolve({data:data(t)})},then(a,b){return Promise.resolve({data:data(t)}).then(a,b)}}},async rpc(n,args){if(n==='claim_pasha_order_rate_limit')return {data:true};writes.push(args);return {data:{delivery_fee:args.p_order.delivery_fee,total:args.p_items.reduce((s,i)=>s+i.quantity*i.unit_price,0)+args.p_order.delivery_fee}}}};
vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/pasha-orders/index.ts','utf8').replace(/^import .*;\n/gm,'')),{Deno:{env:{get:()=> 'test'},serve:fn=>handler=fn},createClient:()=>db,Request,Response,TextDecoder,RangeError,SyntaxError,Error,console:{error(){}}});
const payload={name:'اختبار محلي',phone:'07500000000',address:'اختبار',orderType:'delivery',expectedDeliveryFee:15000,deliveryFee:1,clientToken:'44444444-4444-4444-8444-444444444444',items:[{productId:pid,quantity:3,delivery_fee:999999},{productId:p2,quantity:2,delivery_fee:0}]};
const req=p=>new Request('https://example.test',{method:'POST',headers:{origin:'https://pashababyiq.com'},body:JSON.stringify(p)});
assert.equal((await handler(req(payload))).status,201);assert.equal(writes.at(-1).p_order.delivery_fee,15000);
assert.equal((await handler(req({...payload,expectedDeliveryFee:5000}))).status,409);
assert.equal((await handler(req({...payload,expectedDeliveryFee:undefined}))).status,409);
assert.equal((await handler(req({...payload,orderType:'pickup'}))).status,201);assert.equal(writes.at(-1).p_order.delivery_fee,0);
existing={id:'old',order_number:'PB-old',customer_phone:'+9647500000000',subtotal:70000,delivery_fee:5000,total:75000};const before=writes.length;const duplicate=await (await handler(req(payload))).json();assert.equal(duplicate.delivery_fee,5000);assert.equal(writes.length,before);
console.log('✓ Delivery fees: multiple products, quantity, max removal, free pickup, free delivery, authoritative server fee, stale quote rejection and unchanged duplicate orders');
