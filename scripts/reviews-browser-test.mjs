
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
const server=createServer(async(req,res)=>{
 try{const path=resolve('.','.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(resolve('.')+'/'))throw Error();
 const body=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(8765,'127.0.0.1',r));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/reviews.html?demo=1');
 await page.locator('input[autocomplete="given-name"]').fill('Sara');
 await page.locator('input[name="rating"][value="1"]').check();
 await page.locator('textarea').fill('Test');
 await page.locator('input[type="checkbox"]').check();
 await page.getByRole('button',{name:'إرسال التقييم',exact:true}).click();
 await page.getByText('تمت تجربة الإرسال فقط، لم يُحفظ تقييم.').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Real request path is mocked; no production reads or writes.
 await page.route('https://*.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.endsWith('pasha_reviews_config')?{enabled:true,google_url:'https://g.page/r/test/review'}:
   path.endsWith('pasha_reviews_public')?{count:1,average:1,comment_count:1,distribution:{'1':1,'2':0,'3':0,'4':0,'5':0},reviews:[{first_name:'<img src=x>',rating:1,comment:'<script>alert(1)</script>',created_at:'2026-09-14T00:00:00Z',verified_purchase:true}]}:{ok:true};
  await route.fulfill({json:data});
 });
 await page.goto('http://127.0.0.1:8765/reviews.html#11111111-1111-4111-8111-111111111111');
 await page.locator('article').waitFor();
 assert.equal(await page.locator('.pb-rating-bar-row').count(),5);
 assert.equal(await page.locator('.pb-rating-score').innerText(),'1.0\nمن 5');
 assert.equal(await page.locator('.pb-rating-bar-row').last().locator('.pb-rating-track span').evaluate(e=>e.style.width),'100%');
 await page.getByRole('button',{name:'تفاصيل التقييمات'}).click();
 assert.equal(await page.locator('.pb-rating-bars').isVisible(),false);
 await page.getByRole('button',{name:'تفاصيل التقييمات'}).click();
 assert.equal(new URL(page.url()).hash,'');
 assert.equal(await page.locator('article img,article script').count(),0);
 assert.equal(await page.getByRole('link',{name:'شارك تقييمك على Google'}).count(),1);
 await page.locator('input[autocomplete="given-name"]').fill('Sara');
 await page.locator('input[name="rating"][value="1"]').check();
 await page.locator('input[type="checkbox"]').check();
 const request=page.waitForRequest(r=>r.url().endsWith('/rpc/pasha_reviews_submit'));
 await page.getByRole('button',{name:'إرسال التقييم',exact:true}).click();
 assert.equal((await request).postDataJSON().p_rating,1);
 await page.getByText('شكرًا! تم تسجيل تقييمك.').waitFor();
 assert.equal(await page.getByRole('link',{name:'شارك تقييمك على Google'}).count(),1);
 assert.deepEqual(errors,[]);
 console.log('Mobile demo, submission, token privacy, XSS rendering and neutral Google link passed');
}finally{await browser.close();await new Promise(r=>server.close(r));}
