
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 for(const mode of ['skip','stars','comment','failure','disabled']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let handoffs=0,submissions=0,savedOrders=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://test.local/**',r=>r.fulfill({contentType:'text/html',body:'<html dir="rtl"><head></head><body><input id="smCustomerName" value="Sara Test"><input id="smCustomerPhone" value="07500000000"><input id="smCustomerAddress" value="Duhok"><button id="smSendWhatsApp">تثبيت الطلب</button></body></html>'}));
  await page.route('https://wa.me/**',r=>{handoffs++;return r.fulfill({contentType:'text/html',body:'WhatsApp handoff'});});
  await page.route('https://test.supabase.co/**',async r=>{
   const path=new URL(r.request().url()).pathname;
   if(path.endsWith('pasha_reviews_config'))return r.fulfill({json:{enabled:mode!=='disabled',google_url:'https://g.page/r/test/review'}});
   if(path.endsWith('pasha-orders')){savedOrders++;return r.fulfill({json:{ok:true,order_id:'11111111-1111-4111-8111-111111111111',order_number:'PB-TEST',total:1000}});}
   if(path.endsWith('pasha_checkout_review')){
    submissions++;const p=r.request().postDataJSON();assert.equal(p.p_rating,1);assert.match(p.p_client_token,/^[0-9a-f-]{36}$/);
    if(mode==='failure')return r.fulfill({status:500,json:{error:'test'}});
    assert.equal(p.p_comment,mode==='comment'?'تعليق يحتاج موافقة':'');
    return r.fulfill({json:{ok:true,status:mode==='comment'?'pending':'approved'}});
   }
   throw Error(path);
  });
  await page.goto('https://test.local/');
  await page.evaluate(()=>{window.RESTBR_CONFIG={supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'test'};window.RESTBR_DB={restaurant:{whatsappNumber:'9647500200660'}};localStorage.setItem('RESTBR_CART_V1',JSON.stringify([{productId:'test',name:{ar:'Product'},qty:1,price:1000}]));});
  await page.addStyleTag({content:await readFile('css/pasha-reviews.css','utf8')});
  await page.addScriptTag({content:await readFile('js/pasha-checkout-review.js','utf8')});
  await page.addScriptTag({content:await readFile('js/pasha-order-submit.js','utf8')});
  await page.waitForTimeout(100);
  await page.locator('#smSendWhatsApp').click();
  if(mode==='disabled'){await page.waitForURL('https://wa.me/**');assert.equal(submissions,0);}
  else{
   await page.locator('#pbCheckoutReview').waitFor({state:'visible'});assert.equal(handoffs,0);assert.equal(savedOrders,1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.getByRole('link',{name:'شارك تقييمك على Google'}).count(),1);
   if(mode==='skip')await page.getByRole('button',{name:'تخطي والمتابعة للواتساب',exact:true}).click();
   else{
    await page.locator('input[name=rating][value="1"]').check();
    if(mode==='comment')await page.locator('textarea').fill('تعليق يحتاج موافقة');
    await page.getByRole('button',{name:'إرسال التقييم والمتابعة للواتساب',exact:true}).click();
    if(mode==='failure'){await page.getByText('طلبك محفوظ. تعذر إرسال التقييم؛ حاول مجددًا أو تابع للواتساب.').waitFor();assert.equal(handoffs,0);await page.getByRole('button',{name:'تخطي والمتابعة للواتساب',exact:true}).click();}
   }
   await page.waitForURL('https://wa.me/**');
  }
  assert.equal(handoffs,1);assert.equal(savedOrders,1);assert.deepEqual(errors,[]);await page.close();
 }
 const admin=await browser.newPage();
 await admin.setContent('<main class="admin-main"><section id="viewHome"><div class="quick-grid"></div></section><section id="viewPashaCustomers"><div class="view-title-row">الزبائن</div></section></main>');
 await admin.evaluate(()=>{
  const chain={select(){return this;},eq(){return this;},maybeSingle(){return Promise.resolve({data:{role:'owner',is_active:true}});},order(){return this;},range(){return Promise.resolve({data:[]});}};
  window.supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'test'}}}}),onAuthStateChange(){}},from:()=>chain,rpc:async(name)=>({data:name==='pasha_reviews_config'?{enabled:true,google_url:''}:{count:3,average:4,pending:2}})};
 });
 await admin.addScriptTag({content:await readFile('js/admin-pasha-reviews.js','utf8')});
 await admin.locator('#viewHome .quick-grid .pb-review-dashboard-card').waitFor();
 assert.equal(await admin.locator('#viewPashaCustomers .pb-review-dashboard-card').count(),1);
 await admin.getByText('4 / 5 · 3 تقييم · 2 تعليق بانتظار الموافقة').first().waitFor();
 await admin.locator('#viewPashaCustomers .pb-review-dashboard-card').click();
 assert.equal(await admin.getByRole('button',{name:'إنشاء رابط التقييم'}).count(),0);
 console.log('Checkout modal, skip, star/comment submission, failure handoff, disabled fallback, and dashboard placement passed');
}finally{await browser.close();}
