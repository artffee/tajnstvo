
(function(){
  const c=document.getElementById('starfield'); if(!c)return; const x=c.getContext('2d');
  let stars=[],dpr=Math.min(devicePixelRatio||1,2);
  function rs(){dpr=Math.min(devicePixelRatio||1,2);c.width=innerWidth*dpr;c.height=innerHeight*dpr;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';
    stars=Array.from({length:Math.min(160,Math.floor(innerWidth*innerHeight/12000))},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:(Math.random()*1.1+0.2)*dpr,p:Math.random()*6.28,s:0.3+Math.random()*0.7}));}
  function d(t){x.clearRect(0,0,c.width,c.height);const tm=t*0.001;for(const s of stars){const tw=0.55+0.45*Math.sin(tm*s.s+s.p);x.globalAlpha=tw;x.fillStyle='rgba(236,232,223,'+(0.5*tw+0.2)+')';x.beginPath();x.arc(s.x,s.y,s.r,0,6.28);x.fill();}x.globalAlpha=1;requestAnimationFrame(d);}
  rs();requestAnimationFrame(d);addEventListener('resize',rs);
})();
