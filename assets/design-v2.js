const root=document.documentElement;
const state={lang:localStorage.getItem('maksr.lang')||'en'};
function setLanguage(lang){
  state.lang=lang==='ar'?'ar':'en';
  localStorage.setItem('maksr.lang',state.lang);
  root.lang=state.lang;root.dir=state.lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-en][data-ar]').forEach(el=>{el.textContent=el.dataset[state.lang]});
  document.querySelectorAll('[data-placeholder-en][data-placeholder-ar]').forEach(el=>{el.placeholder=state.lang==='ar'?el.dataset.placeholderAr:el.dataset.placeholderEn});
  document.querySelectorAll('[data-lang-toggle]').forEach(el=>{el.textContent=state.lang==='ar'?'EN':'AR';el.setAttribute('aria-label',state.lang==='ar'?'Switch to English':'التبديل إلى العربية')});
}
document.addEventListener('click',e=>{
  const lang=e.target.closest('[data-lang-toggle]');if(lang){setLanguage(state.lang==='ar'?'en':'ar');return}
  const trigger=e.target.closest('[data-menu-trigger]');
  if(trigger){
    const wrap=trigger.closest('.nav-wrap');document.querySelectorAll('.nav-wrap.open').forEach(n=>{if(n!==wrap)n.classList.remove('open')});
    wrap.classList.toggle('open');trigger.setAttribute('aria-expanded',wrap.classList.contains('open')?'true':'false');return;
  }
  if(!e.target.closest('.nav-wrap'))document.querySelectorAll('.nav-wrap.open').forEach(n=>n.classList.remove('open'));
  const mobile=e.target.closest('[data-mobile-menu]');
  if(mobile){const drawer=document.querySelector('.mobile-drawer');if(drawer){drawer.classList.toggle('open');mobile.setAttribute('aria-expanded',drawer.classList.contains('open')?'true':'false')}return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.nav-wrap.open').forEach(n=>n.classList.remove('open'));const d=document.querySelector('.mobile-drawer');if(d)d.classList.remove('open')}});

function attachFooterYear(){document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear())}
setLanguage(state.lang);attachFooterYear();
function bindWizard(){document.querySelectorAll('[data-wizard]').forEach(wizard=>{const steps=[...wizard.querySelectorAll('[data-wizard-step]')],dots=[...wizard.querySelectorAll('.wizard-dot')];let current=0;const review=()=>{const list=wizard.querySelector('[data-review-list]');if(!list)return;const rows=[];wizard.querySelectorAll('[data-review-label]').forEach(el=>{let value='';if(el.type==='radio'){if(!el.checked)return;value=el.value}else value=(el.value||'').trim();if(value)rows.push([el.dataset.reviewLabel,value])});list.innerHTML=rows.length?rows.map(([k,v])=>'<div class="review-row"><span>'+escapeHtml(k)+'</span><b>'+escapeHtml(v)+'</b></div>').join(''):'<p class="muted">No information entered yet.</p>'};const show=i=>{current=Math.max(0,Math.min(i,steps.length-1));steps.forEach((s,n)=>s.classList.toggle('active',n===current));dots.forEach((d,n)=>{d.classList.toggle('active',n===current);d.classList.toggle('done',n<current)});wizard.querySelectorAll('[data-step-current]').forEach(el=>el.textContent=String(current+1));if(current===steps.length-1)review()};wizard.addEventListener('click',e=>{const n=e.target.closest('[data-wizard-next]'),p=e.target.closest('[data-wizard-prev]');if(n){e.preventDefault();show(current+1)}if(p){e.preventDefault();show(current-1)}});show(0)})}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
bindWizard();
