
(() => {
 'use strict';
 const sb=()=>typeof supabaseClient==='undefined'?null:supabaseClient;
 const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 let button,dialog,customerCard,allowedNow=false,mountObserver;
 async function rpc(name,args){const r=await sb().rpc(name,args);if(r.error)throw r.error;return r.data;}

 async function open(){
  dialog?.remove();const panel=n('dialog');dialog=panel;panel.className='pb-reviews pb-admin-reviews';panel.dir='rtl';
  panel.setAttribute('aria-labelledby','pbAdminReviewsTitle');
  const header=n('header');header.className='pb-admin-review-header';
  const title=n('h2','تقييمات الزبائن');title.id='pbAdminReviewsTitle';
  const close=n('button','×');close.type='button';close.className='pb-admin-review-close';close.setAttribute('aria-label','إغلاق');close.onclick=()=>panel.close();
  header.append(title,close);panel.append(header);
  const body=n('div');body.className='pb-admin-review-body';panel.append(body);
  const msg=n('p');msg.className='pb-admin-review-message';msg.setAttribute('role','status');body.append(msg);
  let busy=false;
  const run=async(fn)=>{
   if(busy)return;busy=true;msg.textContent='';panel.setAttribute('aria-busy','true');
   panel.querySelectorAll('button:not(.pb-admin-review-close),input,select').forEach(e=>e.disabled=true);
   try{await fn();}catch(_){msg.textContent='تعذر الحفظ أو التحميل. حاول مجددًا.';}
   finally{busy=false;panel.removeAttribute('aria-busy');panel.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}
  };
  document.body.append(panel);panel.showModal();
  await run(async()=>{
   let cfg=await rpc('pasha_reviews_config');
   if(!panel.isConnected)return;
   const system=n('section');system.className='pb-admin-review-system';
   const copy=n('div');copy.append(n('strong','نظام التقييمات'));const state=n('small');copy.append(state);
   const toggle=n('button');toggle.type='button';toggle.className='pb-admin-review-switch';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','تشغيل نظام التقييمات');
   const paint=()=>{toggle.setAttribute('aria-checked',String(!!cfg.enabled));toggle.textContent=cfg.enabled?'مفعّل':'متوقف';state.textContent=cfg.enabled?'ظاهر بالمتجر ويستقبل التقييمات':'مخفي بالمتجر — تقييماتك محفوظة';};
   paint();system.append(copy,toggle);body.append(system);
   toggle.onclick=()=>run(async()=>{
    const next=!cfg.enabled;
    await rpc('pasha_reviews_settings',{p_enabled:next,p_google_url:cfg.google_url||''});
    cfg={...cfg,enabled:next};paint();msg.textContent=next?'تم تشغيل نظام التقييمات':'تم إيقاف نظام التقييمات';
   });
   const settings=n('details');settings.className='pb-admin-review-settings';settings.append(n('summary','إعدادات رابط Google'));
   const url=n('input');url.type='url';url.value=cfg.google_url||'';url.placeholder='https://g.page/r/.../review';url.dir='ltr';
   const label=n('label','رابط تقييم Google');label.append(url);
   const save=n('button','حفظ الرابط');save.type='button';save.onclick=()=>run(async()=>{
    const value=url.value.trim();
    if(value){let u;try{u=new URL(value);}catch(_){msg.textContent='اكتب رابط تقييم Google صحيحًا.';return;}
     if(u.protocol!=='https:'||!['g.page','maps.app.goo.gl','search.google.com'].includes(u.hostname)){msg.textContent='استخدم رابط تقييم من Google.';return;}}
    await rpc('pasha_reviews_settings',{p_enabled:cfg.enabled,p_google_url:value});
    cfg={...cfg,google_url:value};msg.textContent='تم حفظ رابط Google';settings.open=false;
   });settings.append(label,save);body.append(settings);
   const filters=n('nav');filters.className='pb-admin-review-filters';filters.setAttribute('aria-label','حالة التقييمات');
   let status='pending',offset=0;
   const list=n('div');list.className='pb-admin-review-list';
   const more=n('button','عرض المزيد');more.type='button';more.hidden=true;
   const retry=n('button','تحديث القائمة');retry.type='button';retry.className='pb-admin-review-refresh';
   const paintFilters=()=>{filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===status)));};
   for(const [key,text] of [['pending','بانتظار الموافقة'],['approved','المنشورة'],['rejected','المرفوضة']]){
    const btn=n('button',text);btn.type='button';btn.dataset.status=key;btn.onclick=()=>run(async()=>{status=key;paintFilters();await load(true);});filters.append(btn);
   }
   paintFilters();body.append(filters,list,more,retry);
   async function decide(review,next,reason){
    await rpc('pasha_reviews_moderate',{p_id:review.id,p_status:next,p_reason:reason});
    await load(true);await refreshSummary();msg.textContent=next==='approved'?'تم نشر التقييم':next==='rejected'?'تم إخفاء التقييم':'أُعيد التقييم للمراجعة';
   }
   async function load(reset){
    const from=reset?0:offset;
    const r=await sb().from('pasha_reviews').select('id,first_name,rating,comment,status,created_at').eq('status',status).order('created_at',{ascending:false}).order('id').range(from,from+19);
    if(r.error)throw r.error;
    if(!panel.isConnected)return;
    if(reset){offset=0;list.replaceChildren();}
    for(const review of r.data){
     const card=n('article');const top=n('div');top.className='pb-admin-review-card-top';
     const stars=n('span','★'.repeat(review.rating)+'☆'.repeat(5-review.rating));stars.className='pb-admin-review-stars';stars.setAttribute('aria-label',review.rating+' من 5');
     top.append(n('strong',review.first_name),stars);
     card.append(top,n('p',review.comment||'تقييم بالنجوم فقط'),n('small',new Date(review.created_at).toLocaleString('en-GB',{timeZone:'Asia/Baghdad'})));
     const actions=n('div');actions.className='pb-admin-review-actions';
     if(review.status!=='approved'){
      const approve=n('button','موافقة ونشر');approve.type='button';approve.className='pb-admin-review-approve';
      approve.onclick=()=>run(()=>decide(review,'approved','مراجعة المحتوى: صالح للنشر'));actions.append(approve);
     }
     if(review.status!=='rejected'){
      const reject=n('button',review.status==='approved'?'إخفاء':'رفض');reject.type='button';
      const reasons=n('div');reasons.className='pb-admin-review-reasons';reasons.hidden=true;
      const reason=n('select');reason.setAttribute('aria-label','سبب الرفض');
      for(const text of ['اختر السبب','معلومات شخصية','إساءة أو ألفاظ غير مناسبة','إعلان أو محتوى غير متعلق بالتجربة','تقييم مكرر أو مزعج']){const o=n('option',text);o.value=text==='اختر السبب'?'':text;reason.append(o);}
      const confirm=n('button','تأكيد الرفض');confirm.type='button';
      const cancel=n('button','إلغاء');cancel.type='button';cancel.onclick=()=>{reasons.hidden=true;};
      confirm.onclick=()=>run(async()=>{if(!reason.value){msg.textContent='اختر سبب الرفض أولًا.';return;}await decide(review,'rejected',reason.value);});
      reasons.append(n('small','اختر سببًا متعلقًا بالمحتوى، وليس بعدد النجوم.'),reason,confirm,cancel);
      reject.onclick=()=>{reasons.hidden=!reasons.hidden;};actions.append(reject);card.append(actions,reasons);
     }else{
      const restore=n('button','إعادة للمراجعة');restore.type='button';restore.onclick=()=>run(()=>decide(review,'pending','إعادة فحص المحتوى'));actions.append(restore);card.append(actions);
     }
     list.append(card);
    }
    offset+=r.data.length;more.hidden=r.data.length<20;
    if(!offset){const empty=n('p',status==='pending'?'كل شيء مرتب ✓ لا توجد تعليقات تنتظر الموافقة':'لا توجد تقييمات هنا.');empty.className='pb-admin-review-empty';list.append(empty);}
   }
   more.onclick=()=>run(()=>load(false));retry.onclick=()=>run(()=>load(true));await load(true);
  });
  if(!body.querySelector('.pb-admin-review-system')){
   const retry=n('button','إعادة المحاولة');retry.onclick=()=>void open();body.append(retry);
  }
 }

 function makeCard(){
  const card=n('button');card.type='button';card.className='pb-review-dashboard-card';
  card.append(n('strong','⭐ تقييمات الزبائن'),n('span','عرض التقييمات والتعليقات الجديدة'));
  card.onclick=()=>void open();return card;
 }
 function mount(){
  if(!allowedNow)return;
  const home=document.querySelector('#viewHome .quick-grid');
  if(home&&!button){button=makeCard();home.append(button);}
  const customers=document.getElementById('viewPashaCustomers');
  if(customers&&!customerCard){customerCard=makeCard();const title=customers.querySelector('.view-title-row');if(title)title.after(customerCard);else customers.prepend(customerCard);}
 }
 async function refreshSummary(){
  if(!allowedNow)return;
  try{const d=await rpc('pasha_reviews_dashboard_summary');if(!allowedNow)return;mount();
   const text=(d.average===null?'لا توجد تقييمات منشورة':d.average+' / 5 · '+d.count+' تقييم')+' · '+d.pending+' تعليق بانتظار الموافقة';
   for(const card of [button,customerCard])if(card)card.querySelector('span').textContent=text;
  }catch(_){}
 }
 async function sync(){
  if(!sb())return;
  const session=await sb().auth.getSession();let allowed=false;
  if(session.data.session){const r=await sb().from('admin_users').select('role,is_active').eq('user_id',session.data.session.user.id).maybeSingle();allowed=!r.error&&r.data?.is_active===true&&['super_admin','owner','manager'].includes(r.data.role);}
  allowedNow=allowed;
  if(!allowed){button?.remove();customerCard?.remove();button=customerCard=null;dialog?.close();dialog?.remove();dialog=null;mountObserver?.disconnect();return;}
  mount();
  if(!mountObserver)mountObserver=new MutationObserver(mount);
  mountObserver.observe(document.querySelector('.admin-main')||document.body,{childList:true,subtree:true});
  await refreshSummary();
 }
 function init(){
  if(!sb())return;
  void sync();
  sb().auth.onAuthStateChange(()=>setTimeout(()=>void sync(),0));
  window.addEventListener('pageshow',()=>void refreshSummary());
  document.addEventListener('click',e=>{if(e.target.closest('#pbCustomersNav,[data-admin-nav="home"],#refreshBtn'))void refreshSummary();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
