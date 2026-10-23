(() => {
  'use strict';
  let status={paymentsReady:false,supportEmail:null},products=[];
  const listeners=new Set();
  async function post(path,body){
    const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'REQUEST_FAILED');return data;
  }
  async function verify(sessionId){const data=await post('/api/verify',{sessionId});products=data.products||[];listeners.forEach(fn=>fn());return data;}
  async function init(){
    try{const r=await fetch('/api/status',{cache:'no-store'});if(r.ok)status=await r.json();}catch{}
    if(status.paymentsReady){try{await verify();}catch{}}
    listeners.forEach(fn=>fn());return status;
  }
  async function checkout(product,lang){
    if(!status.paymentsReady)throw new Error('CHECKOUT_UNAVAILABLE');
    const key='tajnstvo:checkout:'+product;
    let record;try{record=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
    if(!record||Date.now()-record.created>30*60*1000){record={id:crypto.randomUUID(),created:Date.now()};sessionStorage.setItem(key,JSON.stringify(record));}
    const data=await post('/api/checkout',{product,lang,requestId:record.id});
    const url=new URL(data.url);if(url.origin!=='https://checkout.stripe.com')throw new Error('CHECKOUT_FAILED');
    location.assign(url.href);
  }
  // Legacy client-side unlock flags never grant access.
  try{for(const p of ['report','starmap','bundle'])localStorage.removeItem('tajnstvo:unlock:'+p);localStorage.removeItem('tajnstvo:pending');}catch{}
  window.TajnstvoCommerce={init,verify,checkout,subscribe:fn=>listeners.add(fn),get status(){return status;},has:p=>products.includes(p)};
})();
