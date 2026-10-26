(() => {
  'use strict';
  let status={paymentsReady:false,verificationReady:false,supportEmail:null},products=[],pendingProducts=[];
  const listeners=new Set();
  async function post(path,body){
    const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'REQUEST_FAILED');return data;
  }
  async function verify(sessionId){
    try{const data=await post('/api/verify',{sessionId});products=data.products||[];pendingProducts=data.pendingProducts||[];
      if(['paid','failed','expired','refunded'].includes(data.state))for(const key of Object.keys(sessionStorage))if(key.startsWith('tajnstvo:checkout:'))sessionStorage.removeItem(key);
      listeners.forEach(fn=>fn());return data;}
    catch(error){products=[];pendingProducts=[];listeners.forEach(fn=>fn());throw error;}
  }
  async function init(){
    try{const r=await fetch('/api/status',{cache:'no-store'});if(r.ok)status=await r.json();}catch{}
    if(status.verificationReady){try{await verify();}catch{}}
    listeners.forEach(fn=>fn());return status;
  }
  async function checkout(product,lang,reportLanguage){
    if(!status.paymentsReady)throw new Error('CHECKOUT_UNAVAILABLE');
    const key='tajnstvo:checkout:'+product+':'+lang+':'+reportLanguage;
    let record;try{record=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
    if(!record||Date.now()-record.created>30*60*1000){record={id:crypto.randomUUID(),created:Date.now()};sessionStorage.setItem(key,JSON.stringify(record));}
    const data=await post('/api/checkout',{product,lang,reportLanguage,requestId:record.id});
    const url=new URL(data.url);if(url.origin!=='https://checkout.stripe.com')throw new Error('CHECKOUT_FAILED');
    location.assign(url.href);
  }
  // Legacy client-side unlock flags never grant access.
  try{for(const p of ['report','starmap','bundle'])localStorage.removeItem('tajnstvo:unlock:'+p);localStorage.removeItem('tajnstvo:pending');}catch{}
  window.TajnstvoCommerce={init,verify,checkout,subscribe:fn=>listeners.add(fn),get status(){return status;},has:p=>products.includes(p),pending:p=>pendingProducts.some(x=>x===p||x==='bundle'||p==='bundle')};
})();
