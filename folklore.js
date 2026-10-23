(()=>{
 'use strict';let selected='all';
 const buttons=[...document.querySelectorAll('[data-season-filter]')],cards=[...document.querySelectorAll('[data-season]')];
 function paint(){for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.seasonFilter===selected));let count=0;for(const card of cards){card.hidden=selected!=='all'&&card.dataset.season!==selected;if(!card.hidden)count++;}document.querySelector('#storyCount').textContent=window.TajnstvoUI.choose(count+(count===1?' story':' stories'),count+(count===1?' история':' истории'));}
 buttons.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.seasonFilter;paint();}));document.addEventListener('tajnstvo:language',paint);paint();
})();
