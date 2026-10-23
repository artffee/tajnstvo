(() => {
  'use strict';
  let lang='en';try{lang=localStorage.getItem('tajnstvo:lang')==='bg'?'bg':'en';}catch{}
  const choose=(en,bg)=>lang==='bg'?bg:en;
  function applyLanguage(value){
    lang=value==='bg'?'bg':'en';document.documentElement.lang=lang;
    document.querySelectorAll('[data-en][data-bg]').forEach(el=>{el.textContent=el.dataset[lang];});
    document.querySelectorAll('[data-placeholder-en]').forEach(el=>{el.placeholder=el.dataset[lang==='bg'?'placeholderBg':'placeholderEn'];});
    document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===lang)));
    try{localStorage.setItem('tajnstvo:lang',lang);}catch{}
    document.dispatchEvent(new Event('tajnstvo:language'));
  }
  document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>applyLanguage(b.dataset.language)));
  const menu=document.querySelector('#menuToggle'),nav=document.querySelector('#mainNav');
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
  nav?.addEventListener('click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}});
  const bgSigns=['Овен','Телец','Близнаци','Рак','Лъв','Дева','Везни','Скорпион','Стрелец','Козирог','Водолей','Риби'];
  const bgLines=[
    'Смелостта да започваш е твой ресурс. Оставяй място и за търпение, и за чуждата гледна точка.',
    'Постоянството и усетът към красотата дават опора. Различавай сигурността от страха пред промяната.',
    'Любопитството свързва идеи и хора. Избери една мисъл, на която да дадеш време да се разгърне.',
    'Грижата и принадлежността имат значение. Нуждите ти заслужават същото внимание, което даваш на другите.',
    'Творчеството и топлотата искат израз. Позволи си да създаваш и без публика или одобрение.',
    'Вниманието към детайла превръща намеренията в полезни действия. Достатъчно доброто също заслужава място.',
    'Усещането за хармония отваря разговори. Балансът включва и твоя честен отговор.',
    'Дълбочината и устойчивостта са теми за размисъл. Доверието расте с ясни граници и откритост.',
    'Търсенето на смисъл води към нови хоризонти. Свързвай голямата идея с една малка стъпка днес.',
    'Структурата и постоянството подкрепят дългия път. Почивката не отнема от стойността на труда ти.',
    'Независимостта на мисълта носи нови възможности. Дай място на близостта наред със свободата.',
    'Въображението и съпричастността обогатяват опита. Ясните граници помагат на чувствителността да намери форма.'
  ];
  function signName(short){const e=window.TajnstvoEngine;const i=e.SIGNS.indexOf(short);return lang==='bg'?bgSigns[i]:window.tajnstvoSoulData?.SIGN_FULL?.[short]||short;}
  function readingParagraphs(chart){
    const E=window.TajnstvoEngine,D=window.tajnstvoSoulData;
    return [['sun','Sun','Слънце'],['moon','Moon','Луна'],['rising','Rising','Асцендент']].filter(([key])=>key!=='rising'||!chart.profile.timeUnknown).map(([key,en,bg])=>{
      const s=E.lonToSign(key==='rising'?chart.ascendant:chart[key].lon).sign;
      return `${choose(en,bg)} · ${signName(s)}. ${lang==='bg'?bgLines[E.SIGNS.indexOf(s)]:D.SIGN_TEXTS[s][key]}`;
    });
  }
  window.TajnstvoUI={choose,signName,readingParagraphs,bgLines,get lang(){return lang;}};
  applyLanguage(lang);
  const sample=document.querySelector('#sampleDialog'),sampleImage=document.querySelector('#sampleImage');
  let page=0,opener=null;
  const pages=['/sample-3.png','/sample-4.png','/sample-2.png'];
  function paintSample(){if(!sampleImage)return;sampleImage.src=pages[page];sampleImage.alt=choose('Sample report page ','Примерна страница ')+(page+1);document.querySelector('#sampleCounter').textContent=(page+1)+' / '+pages.length;}
  document.querySelectorAll('[data-open-sample]').forEach(b=>b.addEventListener('click',()=>{opener=b;page=Number(b.dataset.openSample)||0;paintSample();sample.showModal();}));
  document.querySelector('#sampleClose')?.addEventListener('click',()=>sample.close());
  sample?.addEventListener('close',()=>opener?.focus());
  sample?.addEventListener('click',e=>{if(e.target===sample)sample.close();});
  document.querySelector('#samplePrevious')?.addEventListener('click',()=>{page=(page+pages.length-1)%pages.length;paintSample();});
  document.querySelector('#sampleNext')?.addEventListener('click',()=>{page=(page+1)%pages.length;paintSample();});
  sample?.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){page=(page+1)%pages.length;paintSample();}if(e.key==='ArrowLeft'){page=(page+pages.length-1)%pages.length;paintSample();}});
  let touchX=null;sample?.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;},{passive:true});sample?.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>65){page=(page+(dx<0?1:pages.length-1))%pages.length;paintSample();}touchX=null;},{passive:true});
  document.querySelector('#clearData')?.addEventListener('click',()=>{for(const storage of [localStorage,sessionStorage]){Object.keys(storage).filter(k=>/^(tajnstvo:|astra-arcana:)/.test(k)).forEach(k=>storage.removeItem(k));}document.querySelector('#clearDataStatus').textContent=choose('Local readings, preferences and API key cleared.','Локалните четения, настройки и API ключът са изтрити.');});
  if(document.querySelector('[data-support]'))fetch('/api/status',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(!data.supportEmail)return;document.querySelectorAll('[data-support]').forEach(el=>{const a=document.createElement('a');a.href='mailto:'+data.supportEmail;a.textContent=data.supportEmail;el.replaceChildren(a);});}).catch(()=>{});
})();
