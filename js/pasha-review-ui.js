
(() => {
 'use strict';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const en=()=>document.documentElement.lang==='en';
 const t=(ar,english)=>en()?english:ar;
 let serial=0;
 function stars(value){
  const box=el('span',null,'pb-rating-stars');box.setAttribute('role','img');box.setAttribute('aria-label',Number(value||0).toFixed(1)+' / 5');
  const empty=el('span','★★★★★','pb-rating-stars-base');empty.setAttribute('aria-hidden','true');
  const fill=el('span','★★★★★','pb-rating-stars-fill');fill.setAttribute('aria-hidden','true');fill.style.width=Math.max(0,Math.min(100,Number(value||0)*20))+'%';
  box.append(empty,fill);return box;
 }
 function summary(data){
  const count=Math.max(0,Number(data.count)||0),average=count?Number(data.average)||0:0;
  const root=el('div',null,'pb-rating-summary');
  const top=el('div',null,'pb-rating-overview');
  const score=el('div',count?average.toFixed(1):'—','pb-rating-score');
  score.append(el('small',t('من 5','out of 5')));
  const copy=el('div',null,'pb-rating-copy');copy.append(stars(average),el('p',count+' '+t('تقييم','ratings')));
  if(Number.isFinite(Number(data.comment_count)))copy.append(el('small',Number(data.comment_count)+' '+t('تعليق منشور','published comments')));
  top.append(score,copy);root.append(top);
  if(data.distribution){
   const toggle=el('button',t('تفاصيل التقييمات','Rating breakdown'),'pb-rating-toggle');toggle.type='button';
   const bars=el('div',null,'pb-rating-bars');bars.id='pbRatingBars'+(++serial);
   toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls',bars.id);
   toggle.onclick=()=>{bars.hidden=!bars.hidden;toggle.setAttribute('aria-expanded',String(!bars.hidden));};
   for(let rating=5;rating>=1;rating--){
    const amount=Math.max(0,Number(data.distribution[String(rating)])||0);
    const row=el('div',null,'pb-rating-bar-row');row.append(el('span',rating+' ★','pb-rating-bar-label'));
    const track=el('div',null,'pb-rating-track');const fill=el('span');fill.style.width=(count?Math.min(100,amount/count*100):0)+'%';track.append(fill);track.setAttribute('aria-hidden','true');
    const total=el('span',String(amount),'pb-rating-bar-count');row.append(track,total);
    row.setAttribute('aria-label',rating+' '+t('نجوم:','stars:')+' '+amount);bars.append(row);
   }
   root.append(toggle,bars);
  }
  if(!count)root.append(el('p',t('كن أول من يشارك تجربة طلبه','Be the first to share your ordering experience'),'pb-rating-empty'));
  return root;
 }
 function enhancePicker(group){
  group.classList.add('pb-star-picker');
  const inputs=[...group.querySelectorAll('input[type="radio"]')];
  inputs.forEach(input=>{
   const label=input.closest('label');if(!label)return;
   [...label.childNodes].forEach(n=>{if(n.nodeType===3)n.remove();});
   input.setAttribute('aria-label',input.value+' '+t('نجوم','stars'));
   const star=el('span','★');star.setAttribute('aria-hidden','true');label.append(star);
  });
  const feedback=el('p',t('اضغط على النجوم لتقييم تجربتك','Tap the stars to rate your experience'),'pb-star-feedback');feedback.setAttribute('aria-live','polite');group.after(feedback);
  function update(value,preview=false){
   inputs.forEach(i=>i.closest('label')?.classList.toggle('is-filled',Number(i.value)<=value));
   if(!preview)feedback.textContent=value?([t('بحاجة لتحسين','Needs improvement'),t('مقبول','Fair'),t('جيد','Good'),t('جيد جدًا','Very good'),t('ممتاز','Excellent')][value-1]):t('اضغط على النجوم لتقييم تجربتك','Tap the stars to rate your experience');
  }
  group.addEventListener('change',()=>update(Number(inputs.find(i=>i.checked)?.value||0)));
  group.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'){const label=e.target.closest('label');if(label)update(Number(label.querySelector('input').value),true);}});
  group.addEventListener('pointerleave',()=>update(Number(inputs.find(i=>i.checked)?.value||0)));
  update(Number(inputs.find(i=>i.checked)?.value||0));
 }
 window.PashaReviewUI={stars,summary,enhancePicker};
})();
