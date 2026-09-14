
(() => {
 'use strict';
 const sb=()=>typeof supabaseClient==='undefined'?null:supabaseClient;
 const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 let button,dialog;
 async function rpc(name,args){const r=await sb().rpc(name,args);if(r.error)throw r.error;return r.data;}
 async function open(){
  dialog?.remove();dialog=n('dialog');dialog.className='pb-reviews';dialog.dir='rtl';
  const close=n('button','إغلاق');close.onclick=()=>dialog.close();dialog.append(close,n('h2','تقييمات الزبائن'));
  const msg=n('p');msg.setAttribute('role','status');dialog.append(msg);document.body.append(dialog);dialog.showModal();
  const run=async(fn,btn)=>{if(btn)btn.disabled=true;msg.textContent='';try{await fn();}catch(e){msg.textContent='تعذر تنفيذ العملية. تأكد من الصلاحية وإعداد نظام التقييمات. '+(e.message||'');}finally{if(btn)btn.disabled=false;}};
  await run(async()=>{
   const cfg=await rpc('pasha_reviews_config');
   const enabled=n('input');enabled.type='checkbox';enabled.checked=cfg.enabled;enabled.style.width='20px';
   const el=n('label','إظهار التقييمات واستقبالها');el.prepend(enabled);
   const url=n('input');url.type='url';url.value=cfg.google_url;url.placeholder='https://g.page/r/.../review';url.dir='ltr';
   const ul=n('label','رابط تقييم Google (اختياري)');ul.append(url);
   const save=n('button','حفظ الإعدادات');save.onclick=()=>run(async()=>{await rpc('pasha_reviews_settings',{p_enabled:enabled.checked,p_google_url:url.value});msg.textContent='تم الحفظ';},save);
   dialog.append(el,ul,save,n('h3','رابط تقييم لطلب مكتمل'));
   const order=n('input');order.placeholder='رقم الطلب PB-…';order.dir='ltr';order.setAttribute('aria-label','رقم الطلب');
   const invite=n('button','إنشاء رابط التقييم');const result=n('input');result.readOnly=true;result.hidden=true;result.dir='ltr';result.setAttribute('aria-label','رابط التقييم الخاص بالزبون');
   const copy=n('button','نسخ الرابط');copy.hidden=true;copy.onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(result.value);msg.textContent='تم نسخ الرابط';}catch(_){result.select();msg.textContent='حدد الرابط وانسخه يدويًا';}},copy);
   invite.onclick=()=>run(async()=>{const token=await rpc('pasha_reviews_invite',{p_order_number:order.value});result.value=new URL('reviews.html',location.href).href+'#'+token;result.hidden=false;copy.hidden=false;msg.textContent='الرابط خاص بهذا الزبون، صالح لمدة 90 يومًا ويقبل تقييمًا واحدًا.';},invite);
   dialog.append(order,invite,result,copy,n('p','اطلب التقييم من جميع الزبائن بشكل محايد. الرفض مخصص للإساءة أو كشف البيانات الشخصية أو المحتوى غير المرتبط بالتجربة؛ لا ترفض تقييمًا بسبب انخفاض عدد النجوم.'));
   const filter=n('select');filter.setAttribute('aria-label','حالة التقييمات');
   for(const [key,text] of [['pending','بانتظار المراجعة'],['approved','منشور'],['rejected','مرفوض']]){const o=n('option',text);o.value=key;filter.append(o);}
   const list=n('div');const more=n('button','عرض المزيد');let offset=0;
   async function load(reset){
    if(reset){offset=0;list.replaceChildren();}
    const r=await sb().from('pasha_reviews').select('id,first_name,rating,comment,status,created_at').eq('status',filter.value).order('created_at',{ascending:false}).order('id').range(offset,offset+19);
    if(r.error)throw r.error;
    for(const review of r.data){const card=n('article');card.append(n('strong',review.first_name+' · '+review.rating+' / 5'),n('p',review.comment),n('small',new Date(review.created_at).toLocaleString('en-GB',{timeZone:'Asia/Baghdad'})));
     for(const [status,title] of [['approved','نشر'],['rejected','رفض'],['pending','إعادة للمراجعة']]){
      if(status===review.status)continue;
      const action=n('button',title);action.onclick=()=>run(async()=>{
       const reason=prompt('سبب القرار (لا يُسمح بالرفض بسبب عدد النجوم):',status==='approved'?'مراجعة المحتوى: صالح للنشر':'');
       if(!reason?.trim())return;
       await rpc('pasha_reviews_moderate',{p_id:review.id,p_status:status,p_reason:reason});await load(true);msg.textContent='تم تحديث حالة التقييم';
      },action);card.append(action);
     }list.append(card);
    }
    offset+=r.data.length;more.hidden=r.data.length<20;
    if(!offset)list.append(n('p','لا توجد تقييمات بهذه الحالة.'));
   }
   filter.onchange=()=>run(()=>load(true),more);more.onclick=()=>run(()=>load(false),more);dialog.append(n('h3','مراجعة التقييمات'),filter,list,more);await load(true);
  });
 }
 async function sync(){
  if(!sb())return;
  const session=await sb().auth.getSession();
  let allowed=false;
  if(session.data.session){const r=await sb().from('admin_users').select('role,is_active').eq('user_id',session.data.session.user.id).maybeSingle();allowed=!r.error&&r.data?.is_active===true&&['super_admin','owner','manager'].includes(r.data.role);}
  if(!allowed){button?.remove();button=null;dialog?.close();dialog?.remove();dialog=null;return;}
  if(button)return;
  const host=document.getElementById('viewHome');if(!host)return;
  button=n('button','⭐ تقييمات الزبائن');button.type='button';button.className='btn';button.onclick=()=>void open();host.prepend(button);
 }
 function init(){if(!sb())return;void sync();sb().auth.onAuthStateChange(()=>setTimeout(()=>void sync(),0));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
