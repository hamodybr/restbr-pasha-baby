
(() => {
 'use strict';
 const c=window.RESTBR_CONFIG||{};
 const endpoint=String(c.supabaseUrl||'').replace(/\/$/,'')+'/rest/v1/rpc/';
 const headers={apikey:c.supabasePublishableKey,'Content-Type':'application/json'};
 let configuration=null;
 // Optional feature: unavailable configuration never blocks the order handoff.
 fetch(endpoint+'pasha_reviews_config',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(5000)})
 .then(r=>r.ok?r.json():null).then(r=>{configuration=r;}).catch(()=>{});
 const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 let active=false;
 window.PashaCheckoutReview={
  open({order,clientToken,continueToWhatsApp}){
   if(active||!configuration?.enabled||!order?.order_id||!clientToken||typeof HTMLDialogElement==='undefined')return false;
   const dialog=n('dialog');dialog.id='pbCheckoutReview';dialog.className='pb-reviews pb-checkout-review pb-reviews-premium';dialog.dir='rtl';
   dialog.setAttribute('aria-labelledby','pbCheckoutReviewTitle');
   const title=n('h2','رأيك يهمنا');title.id='pbCheckoutReviewTitle';
   const header=n('header');header.className='pb-review-heading';
   const emblem=n('span','☆');emblem.className='pb-review-emblem';emblem.setAttribute('aria-hidden','true');
   const copy=n('div');const brand=n('small','PASHA BABY');brand.className='pb-review-eyebrow';copy.append(brand,title,n('p','تم تثبيت طلبك بنجاح ✓'));header.append(emblem,copy);dialog.append(header);
   const close=n('button','×');close.type='button';close.className='pb-review-close';close.setAttribute('aria-label','تخطي التقييم والمتابعة للواتساب');dialog.append(close);
   const form=n('form');const group=n('fieldset');group.append(n('legend','قيّم المتجر من 1 إلى 5 نجوم'));
   const stars=n('div');stars.className='pb-stars';
   for(let i=1;i<=5;i++){const label=n('label',i+' ★');const input=n('input');input.type='radio';input.name='rating';input.value=String(i);input.required=true;label.append(input);stars.append(label);}
   group.append(stars);form.append(group);window.PashaReviewUI?.enhancePicker(stars);
   const comment=n('textarea');comment.maxLength=1000;comment.rows=3;comment.placeholder='تعليقك (اختياري)';
   const label=n('label','تحب تضيف تعليق؟');label.append(comment);form.append(label);
   const policy=n('p','بالإرسال توافق على نشر اسمك الأول وتقييمك. النجوم تُنشر مباشرة، وأي تعليق ينتظر المراجعة.');policy.className='pb-review-policy';form.append(policy);
   const message=n('p');message.setAttribute('role','status');
   const send=n('button','إرسال التقييم والمتابعة للواتساب');send.type='submit';send.className='pb-review-primary';
   const skip=n('button','تخطي والمتابعة للواتساب');skip.type='button';skip.className='pb-review-skip';
   form.append(send,skip,message);dialog.append(form);
   try{const u=new URL(configuration.google_url);if(u.protocol==='https:'&&['g.page','maps.app.goo.gl','search.google.com'].includes(u.hostname)){const a=n('a','شارك تقييمك على Google');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.className='pb-review-action';dialog.append(a);}}catch(_){}
   let finished=false,controller;
   function finish(){
    if(finished)return;finished=true;controller?.abort();dialog.close();dialog.remove();active=false;
    continueToWhatsApp();
   }
   close.onclick=finish;skip.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
   form.onsubmit=async e=>{
    e.preventDefault();if(send.disabled||finished)return;
    send.disabled=true;message.textContent='جاري إرسال التقييم…';
    controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
    try{
     const response=await fetch(endpoint+'pasha_checkout_review',{method:'POST',headers,signal:controller.signal,body:JSON.stringify({
      p_order_id:order.order_id,p_client_token:clientToken,p_rating:Number(new FormData(form).get('rating')),p_comment:comment.value
     })});
     const data=await response.json();if(!response.ok||data.ok!==true)throw Error();
     if(!finished){window.dispatchEvent(new Event('pasha:review-submitted'));finish();}
    }catch(_){if(!finished){message.textContent='طلبك محفوظ. تعذر إرسال التقييم؛ حاول مجددًا أو تابع للواتساب.';send.disabled=false;}}
    finally{clearTimeout(timeout);}
   };
   document.body.append(dialog);
   try{dialog.showModal();active=true;return true;}catch(_){dialog.remove();return false;}
  }
 };
})();
