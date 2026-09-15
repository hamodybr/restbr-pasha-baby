
(() => {
 'use strict';
 const page=document.querySelector('[data-pb-review-page]');
 const demo=!!page && new URLSearchParams(location.search).get('demo')==='1';
 const en=document.documentElement.lang==='en';
 const t=(ar,eng)=>en?eng:ar;
 const config=window.RESTBR_CONFIG||{};
 const client=demo?null:window.supabase?.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=page?location.hash.slice(1):'';
 // Capability stays in memory and never goes to referrers, storage or analytics.
 if(token) history.replaceState(null,'',location.pathname+location.search);
 let offset=0,count=0;
 function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
 async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;}
 function safeGoogle(value){try{const u=new URL(value);return u.protocol==='https:'&&((u.hostname==='search.google.com'&&u.pathname==='/local/writereview'&&u.searchParams.has('placeid'))||(u.hostname==='g.page'&&u.pathname.startsWith('/r/'))||u.hostname==='maps.app.goo.gl')?u.href:'';}catch(_){return '';}}
 async function start(){
  let cfg;
  try{cfg=demo?{enabled:true,google_url:''}:await rpc('pasha_reviews_config');}catch(_){if(page)page.textContent=t('التقييمات غير متاحة حاليًا. حاول لاحقًا.','Reviews are unavailable. Please try later.');return;}
  if(!cfg?.enabled){if(page)page.textContent=t('التقييمات غير متاحة حاليًا.','Reviews are currently unavailable.');return;}
  const root=page||node('section',undefined,'pb-reviews');
  if(!page){const footer=document.querySelector('.sm-footer');if(!footer)return;footer.before(root);}
  root.classList.add('pb-reviews','pb-reviews-premium');root.replaceChildren();
  const heading=node('header',undefined,'pb-review-heading');
  const emblem=node('span','☆','pb-review-emblem');emblem.setAttribute('aria-hidden','true');
  const headingCopy=node('div');headingCopy.append(node('small','PASHA BABY','pb-review-eyebrow'),node('h2',t('تقييمات زبائننا','Customer reviews')),node('p',t('تجارب حقيقية، وثقة تكبر وياكم','Real experiences. Growing trust.')));
  heading.append(emblem,headingCopy);root.append(heading);
  if(demo)root.append(node('p',t('معاينة تجريبية — بيانات وهمية، لا يتم حفظ أي تقييم.','Demo — sample data; no reviews are saved.'),'pb-review-demo'));
  const summary=node('div',undefined,'pb-rating-summary-host');root.append(summary);
  const policy=node('p',t('النجوم تُنشر مباشرة، والتعليقات بعد المراجعة.','Stars publish immediately; comments follow moderation.'),'pb-review-policy');
  const google=safeGoogle(cfg.google_url);
  if(google){const a=node('a',t('شارك تقييمك على Google','Share your review on Google'),'pb-review-action');a.href=google;a.target='_blank';a.rel='noopener noreferrer';root.append(a);}
  if(page&&(token||demo)){
   const form=node('form');const first=node('input');first.required=true;first.maxLength=40;first.autocomplete='given-name';
   const label=node('label',t('الاسم الأول فقط (يظهر علنًا)','First name only (shown publicly)'));label.append(first);form.append(label);
   const group=node('fieldset');group.append(node('legend',t('كيف كانت تجربتك؟','How was your experience?')));
   const stars=node('div',undefined,'pb-stars');
   for(let n=1;n<=5;n++){const l=node('label',n+' ★');const i=node('input');i.type='radio';i.name='rating';i.value=String(n);i.required=true;l.append(i);stars.append(l);}group.append(stars);form.append(group);window.PashaReviewUI?.enhancePicker(stars);
   const comment=node('textarea');comment.maxLength=1000;comment.rows=4;const cl=node('label',t('تعليق اختياري — لا تكتب رقم هاتفك أو عنوانك','Optional comment — do not include your phone or address'));cl.append(comment);form.append(cl);
   const consent=node('input');consent.type='checkbox';consent.required=true;consent.style.width='20px';const co=node('label',t('أوافق على عرض اسمي الأول وتقييمي وتعليقي بعد المراجعة.','I agree to publish my first name, rating and comment after moderation.'));co.prepend(consent);form.append(co);
   const send=node('button',t('إرسال التقييم','Submit review'));send.type='submit';const message=node('p',undefined,'pb-review-message');message.setAttribute('role','status');form.append(send,message);root.append(form);
   form.addEventListener('submit',async event=>{
    event.preventDefault();const rating=Number(new FormData(form).get('rating'));
    const name=first.value.trim();if(!name||/\s/.test(name)){message.textContent=t('اكتب الاسم الأول فقط بدون مسافات.','Enter your first name without spaces.');return;}
    send.disabled=true;
    try{if(!demo)await rpc('pasha_reviews_submit',{p_token:token,p_first_name:name,p_rating:rating,p_comment:comment.value});
     form.replaceChildren(node('p',demo?t('تمت تجربة الإرسال فقط، لم يُحفظ تقييم.','Demo submission only; nothing was saved.'):(comment.value.trim()?t('شكرًا! تم استلام تقييمك للمراجعة.','Thank you! Your review was received for moderation.'):t('شكرًا! تم تسجيل تقييمك.','Thank you! Your rating was saved.'))));
    }catch(_){message.textContent=t('تعذر إرسال التقييم. تأكد من صلاحية رابط الدعوة والاتصال ثم حاول مجددًا.','Could not submit. Check your invitation and connection, then try again.');send.disabled=false;}
   });
  }else if(page){root.append(node('p',t('لإضافة تقييم موثّق، استخدم رابط التقييم الخاص بطلبك بعد استلامه.','To leave a verified review, use your order invitation after delivery.')));}
  const list=node('div');const more=node('button',t('عرض المزيد','Show more'));const error=node('p');error.setAttribute('role','status');list.className='pb-review-list';root.append(list,more,error,policy);
  const samples=[{first_name:'سارة',rating:5,comment:'مثال تجريبي: تعامل لطيف وتجهيز مرتب.',created_at:'2026-09-14T12:00:00Z',verified_purchase:true},{first_name:'آلان',rating:3,comment:'مثال تجريبي: المنتجات جيدة، والتوصيل احتاج وقتًا أكثر.',created_at:'2026-09-13T12:00:00Z',verified_purchase:true}];
  async function next(){
   more.disabled=true;error.textContent='';
   try{const data=demo?{count:2,average:4,comment_count:2,distribution:{'1':0,'2':0,'3':1,'4':0,'5':1},reviews:offset?[]:samples}:await rpc('pasha_reviews_public',{p_offset:offset});
    count=data.count;window.PashaReviewStats=data;if(window.PashaReviewUI)summary.replaceChildren(window.PashaReviewUI.summary(data));else summary.textContent=count?String(data.average)+' / 5 · '+count:t('لا توجد تقييمات منشورة بعد.','No published reviews yet.');
    for(const r of data.reviews){const card=node('article');const head=node('div',undefined,'pb-review-card-head');head.append(node('span',String(r.first_name||'').slice(0,1),'pb-review-avatar'),node('strong',r.first_name));if(window.PashaReviewUI)head.append(window.PashaReviewUI.stars(r.rating));else head.append(node('span',r.rating+' / 5'));card.append(head);if(r.comment)card.append(node('p',r.comment));
     card.append(node('div',(r.verified_purchase?(r.verification_kind==='order'?t('✓ طلب موثّق','✓ Verified order'):t('✓ مشتري موثّق','✓ Verified buyer')):'')+' · '+new Date(r.created_at).toLocaleDateString('en-GB',{timeZone:'Asia/Baghdad'}),'pb-review-meta'));list.append(card);}
    offset+=data.reviews.length;more.hidden=offset>=count||!data.reviews.length;
   }catch(_){error.textContent=t('تعذر تحميل التقييمات. اضغط للمحاولة مجددًا.','Could not load reviews. Please retry.');}
   finally{more.disabled=false;}
  }
  more.addEventListener('click',()=>void next());await next();
 }
 void start();
})();
