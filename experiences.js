/* Small shared models for the daily ritual and share card. No network requests. */
(function(root){
 'use strict';
 const elements=['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
 const themes=[
  {title:['Make a little room','Направи малко място'],reflection:['You do not have to solve everything to begin. Notice what deserves your attention, and let one unnecessary demand fall away.','Не е нужно да решиш всичко, за да започнеш. Забележи какво заслужава вниманието ти и остави едно излишно изискване.'],action:['Clear one small surface. Leave it empty for the rest of today.','Освободи една малка повърхност. Остави я празна до края на деня.'],question:['What would I notice if I made more room?','Какво бих забелязал, ако си дам повече пространство?']},
  {title:['Return to one thing','Върни се към едно нещо'],reflection:['An unfinished beginning can wait quietly for you. Choose something small enough to meet with care, without making it a test of your worth.','Едно незавършено начало може да те изчака. Избери нещо достатъчно малко, за да му отделиш внимание, без да го превръщаш в изпит за стойността си.'],action:['Give one unfinished task five undistracted minutes. Stop when the time is up.','Отдели пет спокойни минути на една незавършена задача. Спри, когато времето изтече.'],question:['Which small promise to myself would I like to keep?','Кое малко обещание към себе си искам да спазя?']},
  {title:['Let kindness be specific','Дай форма на добротата'],reflection:['Care becomes easier to recognize when it takes a simple form. A few honest words or a practical gesture can be enough.','Грижата се разпознава по-лесно, когато има проста форма. Няколко искрени думи или практичен жест могат да бъдат достатъчни.'],action:['Offer one sincere thank-you. Name the particular thing you appreciated.','Благодари искрено на някого. Назови конкретното нещо, което цениш.'],question:['Where have I received care that I have not yet acknowledged?','Къде получих грижа, която още не съм признал?']},
  {title:['Listen before answering','Послушай, преди да отговориш'],reflection:['There is a little space between hearing and replying. Stay there briefly. You may discover a question beneath your first answer.','Между чуването и отговора има малко пространство. Остани там за миг. Може да откриеш въпрос под първия си отговор.'],action:['In one conversation, let the other person finish. Ask one curious question.','В един разговор остави другия да довърши. Задай един любопитен въпрос.'],question:['What am I ready to understand more generously?','Какво съм готов да разбера с повече великодушие?']},
  {title:['Make something imperfect','Създай нещо несъвършено'],reflection:['A small act of making needs no audience. Let the first version exist before deciding what it should become.','Малкият творчески жест няма нужда от публика. Остави първата версия да съществува, преди да решиш каква трябва да стане.'],action:['Draw, write or arrange something for five minutes. Keep the first version.','Рисувай, пиши или подреди нещо за пет минути. Запази първата версия.'],question:['What would I make if it did not need to impress anyone?','Какво бих създал, ако не трябваше да впечатлявам никого?']},
  {title:['Choose a gentle boundary','Избери спокойна граница'],reflection:['Your time has edges. You can respect those edges with a clear sentence and a little patience.','Времето ти има граници. Можеш да ги уважиш с едно ясно изречение и малко търпение.'],action:['Name one thing you can reasonably do today, and one thing that can wait.','Назови едно нещо, което можеш да направиш днес, и едно, което може да почака.'],question:['What does enough look like for me today?','Как изглежда достатъчното за мен днес?']},
  {title:['Notice what is already here','Забележи какво вече е тук'],reflection:['Not every meaningful moment announces itself. Notice one ordinary detail that you might otherwise pass by.','Не всеки значим миг се обявява сам. Забележи един обикновен детайл, който иначе би подминал.'],action:['Look around for one minute. Find three shapes or colors you had not noticed.','Огледай се за една минута. Намери три форми или цвята, които не си забелязал.'],question:['Which ordinary part of my life deserves a second look?','Коя обикновена част от живота ми заслужава втори поглед?']}
 ];
 const lenses={
  fire:['Let initiative be small and deliberate. One clear beginning is enough.','Нека инициативата бъде малка и обмислена. Едно ясно начало е достатъчно.'],
  earth:['Give the idea a practical shape. Notice what your hands can do with what is already available.','Дай практична форма на идеята. Забележи какво можеш да направиш с ръцете си и с наличното.'],
  air:['Put the thought into a few plain words. Leave some room for another point of view.','Изрази мисълта с няколко прости думи. Остави място и за друга гледна точка.'],
  water:['Name the feeling without rushing to explain it. Let care include your own needs.','Назови чувството, без да бързаш да го обясняваш. Нека грижата включва и твоите нужди.']
 };
 function dateKey(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
 function edition(date,chart,E){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('INVALID_DATE');
  const noon=new Date(date+'T12:00:00Z');if(!Number.isFinite(+noon)||noon.toISOString().slice(0,10)!==date)throw new Error('INVALID_DATE');
  const sign=chart?E.lonToSign(chart.sun.lon).sign:null,index=sign?E.SIGNS.indexOf(sign):-1;
  const day=Math.floor(+noon/86400000),themeIndex=((day+(index+1)*3)%themes.length+themes.length)%themes.length;
  const sky=E.computeChart(noon),aspects=chart?E.findAspects(sky,chart,.8):[];
  return {date,themeIndex,theme:themes[themeIndex],sign,lens:sign?lenses[elements[index]]:null,moon:E.lonToSign(sky.moon.lon).sign,aspect:aspects[0]||null};
 }
 function cardData(chart,E,signName,lang='en',includeName=false){
  if(!chart?.profile||!Number.isFinite(chart.sun?.lon)||!Number.isFinite(chart.moon?.lon))throw new Error('CHART_REQUIRED');
  const bg=lang==='bg';
  const signs=[{label:bg?'СЛЪНЦЕ':'SUN',symbol:'☉',sign:signName(E.lonToSign(chart.sun.lon).sign)},{label:bg?'ЛУНА':'MOON',symbol:'☾',sign:signName(E.lonToSign(chart.moon.lon).sign)}];
  if(!chart.profile.timeUnknown&&Number.isFinite(chart.ascendant))signs.push({label:bg?'АСЦЕНДЕНТ':'RISING',symbol:'↑',sign:signName(E.lonToSign(chart.ascendant).sign)});
  return {title:bg?'Моето небе.':'My sky.',subtitle:bg?'Малка карта на възможностите.':'A small map of possibilities.',name:includeName?String(chart.profile.name||'').slice(0,80):'',signs,note:chart.profile.timeUnknown?(bg?'Часът е неизвестен · Луната може да варира':'Birth time unknown · Moon may vary'):(bg?'Символен портрет · свободен избор':'A symbolic portrait · your choices are yours'),site:'tajnstvoto.com'};
 }
 root.TajnstvoExperiences={dateKey,edition,cardData};
})(globalThis);
