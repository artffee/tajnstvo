(() => {
 'use strict';
 const panel=document.querySelector('#skyShare');if(!panel)return;
 const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),theme=panel.querySelector('#cardTheme'),include=panel.querySelector('#cardName'),status=panel.querySelector('#shareStatus'),download=panel.querySelector('#downloadSky'),share=panel.querySelector('#shareSky');
 let chart=null,busy=false;
 function fit(text,max,size,family='Georgia'){do{ctx.font=`${size}px ${family}`;if(ctx.measureText(text).width<=max)break;size--;}while(size>16);return size;}
 function line(text,y,size,color,align='center'){ctx.fillStyle=color;ctx.textAlign=align;fit(text,880,size);ctx.fillText(text,align==='center'?540:100,y,880);}
 function paint(){
  if(!chart)return;
  const U=window.TajnstvoUI,data=window.TajnstvoExperiences.cardData(chart,window.TajnstvoEngine,U.signName,U.lang,include.checked),dawn=theme.value==='dawn';
  const bg=dawn?'#efe7d8':'#10141e',ink=dawn?'#20232b':'#efe6d3',muted=dawn?'#625743':'#b5aa94',accent=dawn?'#955b31':'#e6ae70';
  ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(44,44,992,1262);ctx.lineWidth=1;ctx.globalAlpha=.3;ctx.strokeRect(57,57,966,1236);
  for(const radius of [180,250,320]){ctx.beginPath();ctx.arc(540,375,radius,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  // Deterministic decorative stars, not an astronomical star map.
  let seed=271828;for(let i=0;i<65;i++){seed=(seed*1664525+1013904223)>>>0;const x=95+seed%890;seed=(seed*1664525+1013904223)>>>0;const y=115+seed%490;ctx.fillStyle=accent;ctx.globalAlpha=.2+(i%4)*.16;ctx.beginPath();ctx.arc(x,y,i%7===0?3:1.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  line('T A J N S T V O',140,22,accent);line(data.title,365,108,ink);line(data.subtitle,427,28,muted);
  if(data.name)line(data.name,505,36,ink);
  const start=630,gap=data.signs.length===3?139:180;
  data.signs.forEach((s,i)=>{const y=start+i*gap;line(s.symbol+'  '+s.label,y,24,accent);line(s.sign,y+62,55,ink);});
  ctx.strokeStyle=accent;ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(160,1100);ctx.lineTo(920,1100);ctx.stroke();ctx.globalAlpha=1;
  line(data.note,1155,22,muted);line(data.site,1222,28,accent);
  canvas.setAttribute('aria-label',[data.title,data.name,...data.signs.map(s=>s.label+': '+s.sign),data.note].filter(Boolean).join('. '));
  share.hidden=typeof navigator.share!=='function';
 }
 const feedback=(en,bg)=>{status.textContent=window.TajnstvoUI.choose(en,bg);};
 async function blob(){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('IMAGE_FAILED')),'image/png'));}
 function save(b){const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='tajnstvo-my-sky.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 download.addEventListener('click',async()=>{if(busy)return;busy=true;download.disabled=true;try{save(await blob());feedback('Your PNG is ready. You can post it wherever you choose.','PNG файлът е готов. Можеш да го споделиш където избереш.');}catch{feedback('The image could not be saved. Please try again.','Изображението не се запази. Опитай отново.');}finally{busy=false;download.disabled=false;}});
 share.addEventListener('click',async()=>{if(busy)return;busy=true;share.disabled=true;try{const b=await blob(),file=new File([b],'tajnstvo-my-sky.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});feedback('Shared through your device.','Споделено чрез устройството ти.');}else{save(b);feedback('Image downloaded. Attach it to your chosen app.','Изображението е изтеглено. Прикачи го в избраното приложение.');}}catch(e){if(e.name!=='AbortError')feedback('Sharing is unavailable. Use Download PNG.','Споделянето е недостъпно. Използвай „Изтегли PNG“.');}finally{busy=false;share.disabled=false;}});
 theme.addEventListener('change',paint);include.addEventListener('change',paint);
 document.addEventListener('tajnstvo:chart',e=>{chart=e.detail;status.textContent='';if(chart)paint();});
 document.addEventListener('tajnstvo:language',()=>{status.textContent='';paint();});
})();
