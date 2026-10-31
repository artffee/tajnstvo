(() => {
  'use strict';
  const E=window.TajnstvoEngine,B=window.TajnstvoBirth,U=window.TajnstvoUI,C=window.TajnstvoCommerce;
  const form=document.querySelector('#birthForm'),cityInput=document.querySelector('#birthCity'),list=document.querySelector('#cityResults');
  const status=document.querySelector('#formStatus'),result=document.querySelector('#previewResult'),button=document.querySelector('#previewButton');
  let selected=null,options=[],active=-1,searchAbort=null,timer=null,chart=null,busy=false;
  const message=(en,bg,error=false)=>{status.textContent=U.choose(en,bg);status.classList.toggle('error',error);};
  function closeCities(){list.hidden=true;cityInput.setAttribute('aria-expanded','false');cityInput.removeAttribute('aria-activedescendant');active=-1;}
  function confirmCity(loc){
    selected=loc;cityInput.value=loc.name;closeCities();
    const p=document.querySelector('#locationConfirmation');p.hidden=false;p.textContent=U.choose('Birthplace confirmed: ','Мястото е потвърдено: ')+loc.name+' · '+loc.timeZone;
  }
  function showCities(items){
    options=items;active=-1;list.replaceChildren();
    for(const [i,loc] of items.entries()){
      const li=document.createElement('li');li.role='option';li.id='city-option-'+i;li.setAttribute('aria-selected','false');
      const b=document.createElement('button');b.type='button';b.tabIndex=-1;b.textContent=loc.name+' · '+loc.timeZone;b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>confirmCity(loc));li.append(b);list.append(li);
    }
    list.hidden=!items.length;cityInput.setAttribute('aria-expanded',String(!!items.length));
  }
  async function search(){
    clearTimeout(timer);searchAbort?.abort();selected=null;document.querySelector('#locationConfirmation').hidden=true;
    const q=cityInput.value.trim();if(q.length<2){closeCities();return;}
    const local=B.matches(q);if(local.length){showCities(local);return;}
    closeCities();timer=setTimeout(async()=>{
      searchAbort=new AbortController();const signal=searchAbort.signal;
      try{const items=await B.searchCities(q,signal);if(cityInput.value.trim()!==q)return;showCities(items);if(!items.length)message('No city found. Try the city and country together.','Няма намерен град. Опитай с град и държава.',true);}
      catch(err){if(err.name!=='AbortError')message('City search is unavailable. Try again, or choose one of the listed cities.','Търсенето е временно недостъпно. Опитай отново или избери град от списъка.',true);}
    },450);
  }
  cityInput.addEventListener('input',search);
  cityInput.addEventListener('focus',()=>{const items=B.matches(cityInput.value);if(items.length)showCities(items);});
  cityInput.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeCities();return;}
    if(list.hidden)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();active=(active+(e.key==='ArrowDown'?1:options.length-1)+options.length)%options.length;
      [...list.children].forEach((li,i)=>li.setAttribute('aria-selected',String(i===active)));
      cityInput.setAttribute('aria-activedescendant','city-option-'+active);list.children[active].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'&&active>=0){e.preventDefault();confirmCity(options[active]);}
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.city-field'))closeCities();});
  document.querySelector('#timeUnknown').addEventListener('change',()=>{
    const unknown=form.elements.timeUnknown.checked;form.elements.birthTime.disabled=unknown;form.elements.birthTime.required=!unknown;document.querySelector('#unknownTimeNote').hidden=!unknown;
  });
  form.addEventListener('input',()=>{chart=null;result.hidden=true;try{sessionStorage.removeItem('tajnstvo:profile');}catch{}});
  form.elements.birthDate.max=new Date().toLocaleDateString('en-CA');
  function errorFor(error){
    const code=error.message;
    if(code==='AMBIGUOUS_TIME'){document.querySelector('#clockChoice').hidden=false;form.elements.occurrence.focus();return message('This local time happened twice during a clock change. Choose first or second occurrence.','Този местен час се е повторил при смяна на часовника. Избери първия или втория път.',true);}
    if(code==='NONEXISTENT_TIME')return message('This time did not exist because the clocks moved forward. Check the recorded birth time.','Този час не е съществувал заради преместване на часовника напред. Провери записания час.',true);
    if(code==='CITY_REQUIRED')return message('Choose your city from the suggestions to confirm its location.','Избери града от предложенията, за да потвърдиш мястото.',true);
    if(code==='INVALID_DATE')return message('Enter a valid past birth date and local time (1900 onward).','Въведи валидна минала дата и местен час на раждане (след 1900 г.).',true);
    message('Something went wrong. Your details remain in the form; please try again.','Възникна грешка. Данните остават във формуляра; опитай отново.',true);
  }
  function createChart(){
    const d=Object.fromEntries(new FormData(form));
    const unknown=form.elements.timeUnknown.checked;
    if(!d.birthDate||d.birthDate>new Date().toLocaleDateString('en-CA')||(!unknown&&!d.birthTime))throw new Error('INVALID_DATE');
    if(!selected)selected=B.exactCity(d.cityName);
    if(!selected)throw new Error('CITY_REQUIRED');
    confirmCity(selected);
    const localTime=unknown?'12:00':d.birthTime;
    const utc=B.toUTC(d.birthDate,localTime,selected.timeZone,d.occurrence);
    const p={name:d.name.trim().slice(0,80),birthDate:d.birthDate,birthTime:localTime,timeUnknown:unknown,cityName:selected.name,lat:selected.lat,lon:selected.lon,timeZone:selected.timeZone,occurrence:d.occurrence,tz:B.offsetAt(+utc,selected.timeZone)};
    E.writeProfile(p);chart=E.getNatalChart();
    try{sessionStorage.setItem('tajnstvo:profile',JSON.stringify(p));}catch{message('The preview works, but this browser cannot save your details across checkout.','Прегледът работи, но браузърът не може да запази данните при плащане.',true);}
    return chart;
  }
  function paintPreview(){
    if(!chart)return;
    const p=chart.profile,container=document.querySelector('#previewCards');container.replaceChildren();
    document.querySelector('#previewTitle').textContent=p.name?U.choose(p.name+', meet your sky.',p.name+', открий своето небе.'):U.choose('A first look at your sky.','Първи поглед към твоето небе.');
    document.querySelector('#previewMeta').textContent=p.birthDate+' · '+(p.timeUnknown?U.choose('Birth time unknown','Неизвестен час'):p.birthTime)+' · '+p.cityName+' · '+p.timeZone;
    const paras=U.readingParagraphs(chart);
    const keys=['sun','moon',...(p.timeUnknown?[]:['rising'])];
    keys.forEach((key,i)=>{
      const card=document.createElement('article'),label=document.createElement('p'),heading=document.createElement('h3'),body=document.createElement('p');
      label.className='eyebrow';label.textContent=[U.choose('☉ SUN','☉ СЛЪНЦЕ'),U.choose('☾ MOON','☾ ЛУНА'),U.choose('↑ RISING','↑ АСЦЕНДЕНТ')][i];
      const sign=E.lonToSign(key==='rising'?chart.ascendant:chart[key].lon);heading.textContent=U.signName(sign.sign);body.textContent=paras[i].split('. ').slice(1).join('. ');card.append(label,heading,body);container.append(card);
    });
    const life=document.createElement('article'),label=document.createElement('p'),h=document.createElement('h3'),body=document.createElement('p');
    label.className='eyebrow';label.textContent=U.choose('✧ LIFE PATH','✧ ЖИЗНЕН ПЪТ');h.textContent=String(chart.lifePath);
    const lp=window.tajnstvoSoulData.LIFE_PATH[chart.lifePath];
    body.textContent=U.choose(lp?.line||'A symbolic numerology number drawn from your birth date.','Символно нумерологично число, получено от цифрите в датата ти на раждане. Използвай го като отправна точка за размисъл, а не като предписание.');life.append(label,h,body);container.append(life);
    document.querySelector('#previewCaveat').textContent=p.timeUnknown?U.choose('Noon-based preview. The Moon may vary. Rising, houses and location-dependent products are omitted until a birth time is known.','Преглед за обяд. Луната може да варира. Асцендентът, домовете и зависимите от часа продукти са пропуснати до уточняване на часа.'):U.choose('A symbolic reading based on approximate astronomical calculations. Take what is useful; your choices remain yours.','Символен прочит на основата на приблизителни астрономически изчисления. Вземи полезното; изборите остават твои.');
    result.hidden=false;
    document.dispatchEvent(new CustomEvent('tajnstvo:chart',{detail:chart}));
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();if(busy)return;button.disabled=true;
    try{createChart();paintPreview();message('Your free reading is ready.','Безплатното ти четене е готово.');result.focus({preventScroll:true});result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}catch(err){errorFor(err);}finally{button.disabled=false;}
  });
  function paintOffers(){
    const checkout=document.querySelector('#checkoutStatus');
    checkout.textContent=C.status.paymentsReady?U.choose('Secure Stripe checkout · one-time purchase · 7-day refund','Сигурно плащане чрез Stripe · еднократна покупка · 7-дневен срок за възстановяване'):U.choose('PDF purchases are being prepared. Your personal preview and all free tools are available.','Подготвяме покупките на PDF. Личният преглед и всички безплатни инструменти са достъпни.');
    if(C.status.paymentsReady&&C.status.testMode)checkout.textContent=U.choose('Stripe TEST MODE — no real charges.','ТЕСТОВ РЕЖИМ на Stripe — без реални плащания.');
    document.querySelector('#restorePurchases').hidden=!C.status.verificationReady;
    document.querySelectorAll('[data-product]').forEach(b=>{
      const owned=C.has(b.dataset.product),pending=C.pending(b.dataset.product);
      b.disabled=busy||pending||(!owned&&!C.status.paymentsReady);
      b.textContent=owned?U.choose('Download again','Изтегли отново'):pending?U.choose('Payment confirmation pending','Очаква потвърждение'):C.status.paymentsReady?U.choose('Continue to checkout →','Продължи към плащане →'):U.choose('Purchases opening soon','Покупките ще бъдат достъпни скоро');
    });
  }
  const reportLanguage=document.querySelector('#reportLanguage');
  try{reportLanguage.value=localStorage.getItem('tajnstvo:reportLanguage')||U.lang;}catch{reportLanguage.value=U.lang;}
  reportLanguage.addEventListener('change',()=>{try{localStorage.setItem('tajnstvo:reportLanguage',reportLanguage.value);}catch{}});
  const loaded=new Map();
  function loadScript(src){if(loaded.has(src))return loaded.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('PDF_LOAD_FAILED'));document.head.append(s);});loaded.set(src,p);p.catch(()=>loaded.delete(src));return p;}
  async function download(product){
    const verification=await C.verify();if(!C.has(product))throw new Error('PAYMENT_NOT_VERIFIED');
    await loadScript('/vendor/jspdf.js');await loadScript('/report.js');await loadScript('/starmap.js');
    if(product==='report'||product==='bundle'){if(reportLanguage.value==='bg'){await loadScript('/report-bg.js');await window.TajnstvoBulgarianReport.generate(chart);}else await window.TajnstvoReport.generatePdfReport(chart,null);}
    if(product==='starmap'||product==='bundle')await window.tajnstvoStarMap(chart);
    message('Your PDF is ready. Keep this tab open to download it again.','PDF файлът е готов. Остави раздела отворен за повторно изтегляне.');
  }
  document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',async()=>{
    if(busy)return;
    try{
      createChart();paintPreview();
      if(chart.profile.timeUnknown){message('A known birth time is needed for the full report and star map. Your free preview remains available.','За пълния доклад и звездната карта е нужен известен час. Безплатният преглед остава достъпен.',true);form.scrollIntoView({block:'center'});return;}
      // Payment return must be able to recover the details; do not charge if tab storage is blocked.
      if(!sessionStorage.getItem('tajnstvo:profile'))throw new Error('STORAGE_UNAVAILABLE');
      busy=true;paintOffers();message('Preparing your download or secure checkout…','Подготвяме изтеглянето или сигурното плащане…');
      const previouslyOwned=C.has(b.dataset.product);
      await C.verify();
      if(previouslyOwned&&!C.has(b.dataset.product))throw new Error('PAYMENT_NOT_VERIFIED');
      if(C.has(b.dataset.product))await download(b.dataset.product);else await C.checkout(b.dataset.product,U.lang,reportLanguage.value);
    }catch(err){
      if(['CITY_REQUIRED','INVALID_DATE','AMBIGUOUS_TIME','NONEXISTENT_TIME'].includes(err.message)){errorFor(err);form.scrollIntoView({block:'center'});}
      else if(err.message==='STORAGE_UNAVAILABLE')message('This browser blocks tab storage. Enable it before purchasing so your details can be restored.','Браузърът блокира съхранението в раздела. Разреши го преди покупка, за да възстановим данните.',true);
      else if(err.message==='PURCHASE_RECOVERY_LIMIT')message(
        'This browser is already tracking three purchases. Check your purchases or contact support before starting another.',
        'В този браузър вече се пазят три покупки. Провери покупките си или се свържи с поддръжката, преди да започнеш нова.',true);
      else if(err.message==='PAYMENT_PENDING')message('Payment confirmation is pending. Use Check my purchases; do not pay again.','Очаква се потвърждение. Използвай „Провери покупките ми“; не плащай повторно.',true);
      else message('We could not complete this step. No second purchase is needed for a download problem; try again or visit Help.','Стъпката не завърши. Не е нужна повторна покупка при проблем с изтегляне; опитай отново или виж „Контакт“.',true);
    }finally{busy=false;paintOffers();}
  }));
  document.querySelector('#printPreview').addEventListener('click',()=>window.print());
  document.addEventListener('tajnstvo:language',()=>{paintOffers();paintPreview();if(selected)confirmCity(selected);if(chart)message('Your free reading is ready.','Безплатното ти четене е готово.');});
  document.querySelector('#restorePurchases').addEventListener('click',async()=>{
    try{
      await C.verify();
      if(C.has('report')||C.has('starmap'))message('Purchase found. Enter your birth details and choose Download again.','Покупката е намерена. Въведи данните си и избери „Изтегли отново“.');
      else if(C.pending('bundle'))message('Confirmation is still pending. Check again shortly; do not pay again.','Потвърждението още се обработва. Провери отново след малко; не плащай повторно.',true);
      else message('No verified purchase in this browser. If you already paid, contact support with your Stripe receipt; do not buy again.','Няма потвърдена покупка в този браузър. Ако вече си платил, свържи се с поддръжката с разписката от Stripe; не купувай повторно.',true);
    }catch{message('Purchase checking is temporarily unavailable. Try again later; do not pay twice.','Проверката временно не е достъпна. Опитай по-късно; не плащай два пъти.',true);}
  });
  C.subscribe(paintOffers);
  (async()=>{
    try{
      const p=JSON.parse(sessionStorage.getItem('tajnstvo:profile')||'null');
      if(p){for(const key of ['name','birthDate','birthTime','cityName','occurrence'])if(form.elements[key])form.elements[key].value=p[key]||'';form.elements.timeUnknown.checked=!!p.timeUnknown;form.elements.birthTime.disabled=!!p.timeUnknown;document.querySelector('#unknownTimeNote').hidden=!p.timeUnknown;selected={name:p.cityName,lat:p.lat,lon:p.lon,timeZone:p.timeZone};createChart();paintPreview();}
    }catch{}
    await C.init();
    const params=new URLSearchParams(location.search),id=params.get('session_id');
    // Strip old unlock claims without accepting them.
    if(params.has('unlock')){params.delete('unlock');history.replaceState({},'',location.pathname+(params.size?'?'+params:'')+location.hash);}
    if(params.get('checkout')==='cancelled')message('Checkout was cancelled. Your free reading is still here.','Плащането е отменено. Безплатното ти четене остава тук.');
    if(!id)return;
    params.delete('session_id');history.replaceState({},'',location.pathname+(params.size?'?'+params:'')+'#reading');
    message('Checking payment confirmation…','Проверяваме потвърждението за плащане…');
    try{
      let checked;
      for(let attempt=0;attempt<6;attempt++){checked=await C.verify(id);if(!checked.pending)break;await new Promise(r=>setTimeout(r,2000));}
      if(checked.pending){message('Payment confirmation is still pending. Keep this tab and refresh shortly, or contact support with your receipt. Do not pay again.','Потвърждението още се обработва. Запази раздела и презареди след малко или се свържи с поддръжката с разписката. Не плащай отново.',true);return;}
      if(checked.state!=='paid'){
        message(checked.state==='refunded'?'This purchase was refunded. Contact support if you need help.':checked.state==='failed'?'Payment failed. No PDF has been unlocked.':'This purchase could not be verified. Contact support with your receipt before purchasing again.',checked.state==='refunded'?'Сумата за тази покупка е възстановена. Свържи се с поддръжката при нужда.':checked.state==='failed'?'Плащането е неуспешно. PDF файлът не е отключен.':'Покупката не е потвърдена. Свържи се с поддръжката с разписката преди нова покупка.',true);return;
      }
      reportLanguage.value=checked.reportLanguage;
      if(chart){busy=true;paintOffers();await download(checked.purchasedProduct);}
      else message('Purchase verified. Re-enter your birth details to download; you will not be charged again in this browser.','Покупката е потвърдена. Въведи отново данните си за изтегляне; няма да бъдеш таксуван повторно в този браузър.');
    }catch{message('Payment could not be verified yet. Keep your receipt and try again; do not pay twice.','Плащането още не може да бъде потвърдено. Запази разписката и опитай отново; не плащай втори път.',true);}finally{busy=false;paintOffers();}
  })();
})();
