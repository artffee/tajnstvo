(() => {
 'use strict';
 const E=window.TajnstvoEngine,U=window.TajnstvoUI,X=window.TajnstvoExperiences;
 const q=s=>document.querySelector(s),progressKey='tajnstvo:daily:v1';let chart=null,currentDate='',record={},seconds=60,running=false,deadline=0,tickId;
 try{record=JSON.parse(localStorage.getItem(progressKey)||'{}');if(!record||Array.isArray(record)||typeof record!=='object')record={};}catch{}
 try{const p=JSON.parse(sessionStorage.getItem('tajnstvo:profile')||'null');if(p){E.writeProfile(p);chart=E.getNatalChart();}}catch{}
 const select=pair=>pair[U.lang==='bg'?1:0];
 const planet={sun:['Sun','Слънце'],moon:['Moon','Луна'],mercury:['Mercury','Меркурий'],venus:['Venus','Венера'],mars:['Mars','Марс'],jupiter:['Jupiter','Юпитер'],saturn:['Saturn','Сатурн'],uranus:['Uranus','Уран'],neptune:['Neptune','Нептун']};
 const aspectNames={0:['conjunction','съвпад'],60:['sextile','секстил'],90:['square','квадрат'],120:['trine','тригон'],180:['opposition','опозиция']};
 function paint(){
  const date=X.dateKey();if(currentDate!==date){resetTimer();currentDate=date;}
  const v=X.edition(date,chart,E);
  q('#ritualDate').textContent=new Intl.DateTimeFormat(U.lang==='bg'?'bg-BG':'en-US',{dateStyle:'full'}).format(new Date(date+'T12:00:00'));
  q('#dailyTitle').textContent=select(v.theme.title);q('#dailyReflection').textContent=select(v.theme.reflection);q('#dailyAction').textContent=select(v.theme.action);q('#dailyQuestion').textContent=select(v.theme.question);
  q('#personalLens').textContent=v.lens?U.choose('Your Sun in ','Твоето Слънце в ')+U.signName(v.sign)+'. '+select(v.lens):U.choose('This is today’s general edition. Create a free birth reading to add a reflection based on your Sun sign.','Това е общото издание за днес. Създай безплатно четене, за да добавиш размисъл според слънчевия си знак.');
  q('#personalLabel').textContent=v.lens?U.choose('YOUR PERSONAL LENS','ТВОЯТА ЛИЧНА ГЛЕДНА ТОЧКА'):U.choose('A MOMENT FOR EVERYONE','МИГ ЗА ВСЕКИ');
  q('#moonToday').textContent=U.choose('Moon in ','Луна в ')+U.signName(v.moon);
  const a=v.aspect;
  q('#transitToday').textContent=a?select(planet[a.transit])+' · '+select(aspectNames[a.aspect.angle])+' · '+select(planet[a.natal])+U.choose(' in your birth chart',' в наталната ти карта')+' · '+a.exactness.toFixed(1)+'°':U.choose('A sky snapshot for reflection.','Небесен миг за размисъл.');
  q('#editionNote').textContent=U.choose('New edition each local calendar day. Sky positions sampled at 12:00 UTC with our approximate chart engine. Reflections are written prompts, not predictions.','Ново издание всеки местен календарен ден. Положенията са изчислени за 12:00 UTC с приблизителния ни модел. Размислите са авторски въпроси, а не предсказания.');
  paintCompletion();paintTimer();
  q('#timerStatus').textContent=running?U.choose('Let your breathing stay comfortable and natural.','Нека дишането ти остане спокойно и естествено.'):seconds===0?U.choose('Your quiet minute is complete.','Твоята тиха минута завърши.'):seconds<60?U.choose('Paused. Continue whenever you are ready.','На пауза. Продължи, когато си готов.') : '';
 }
 function paintCompletion(){const complete=record[currentDate]===true,b=q('#completeRitual');b.setAttribute('aria-pressed',String(complete));b.textContent=complete?U.choose('✓ Completed today · undo','✓ Завършено днес · отмени'):U.choose('Mark today’s ritual complete','Отбележи днешния ритуал като завършен');q('#completionNote').textContent=complete?U.choose('A small moment, kept. Come back tomorrow.','Малък миг, запазен. Ела отново утре.'):'';}
 q('#completeRitual').addEventListener('click',()=>{record[currentDate]=record[currentDate]!==true;const keys=Object.keys(record).sort().slice(-31);record=Object.fromEntries(keys.map(k=>[k,record[k]]));try{localStorage.setItem(progressKey,JSON.stringify(record));paintCompletion();}catch{paintCompletion();q('#completionNote').textContent=U.choose('Marked for this visit. Your browser could not save progress.','Отбелязано за това посещение. Браузърът не запази напредъка.');}});
 function paintTimer(){q('#timerValue').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');q('#ritualProgress').value=60-seconds;q('#timerToggle').textContent=running?U.choose('Pause','Пауза'):seconds===0?U.choose('Start again','Започни отново'):seconds<60?U.choose('Continue','Продължи'):U.choose('Begin one quiet minute','Започни една тиха минута');q('#quietOrb').classList.toggle('is-running',running);}
 function tick(){if(!running)return;seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(seconds===0){running=false;clearInterval(tickId);q('#timerStatus').textContent=U.choose('Your quiet minute is complete.','Твоята тиха минута завърши.');}paintTimer();}
 function resetTimer(){running=false;clearInterval(tickId);seconds=60;q('#timerStatus').textContent='';paintTimer();}
 q('#timerToggle').addEventListener('click',()=>{if(running){tick();running=false;clearInterval(tickId);}else{if(seconds===0)seconds=60;deadline=Date.now()+seconds*1000;running=true;tickId=setInterval(tick,250);q('#timerStatus').textContent=U.choose('Let your breathing stay comfortable and natural.','Нека дишането ти остане спокойно и естествено.');}paintTimer();});
 q('#timerReset').addEventListener('click',resetTimer);
 document.addEventListener('tajnstvo:language',paint);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();paint();}});window.addEventListener('pageshow',paint);setInterval(()=>{if(X.dateKey()!==currentDate)paint();},60000);paint();
})();
