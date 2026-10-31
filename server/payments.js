import Stripe from 'stripe';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export const PRODUCTS={report:{name:'Tajnstvo Soul Report — English / Bulgarian PDF',amount:1500},starmap:{name:'Tajnstvo Star Map — PDF',amount:900},bundle:{name:'Tajnstvo Soul Report + Star Map — PDFs',amount:1900}};
export const RECEIPT_LIMIT = 3;
export const ORIGIN='https://tajnstvoto.com';
export function paymentMode(){return process.env.PAYMENTS_MODE==='live'?'live':'test';}
export function appOrigin(){
  if(paymentMode()==='live')return ORIGIN;
  try{
    const url=new URL(process.env.TEST_APP_ORIGIN||ORIGIN);
    if(url.origin!==url.href.replace(/\/$/,'')||url.username||url.password)return null;
    if(url.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return null;
    return url.origin;
  }catch{return null;}
}
export function verificationReady(){
  return new RegExp('^[sr]k_'+paymentMode()+'_').test(process.env.STRIPE_SECRET_KEY||'')&&
    !!process.env.STRIPE_WEBHOOK_SECRET&&(process.env.RECEIPT_SIGNING_SECRET||'').length>=32&&!!appOrigin();
}
export function ready(){return process.env.PAYMENTS_ENABLED==='true'&&verificationReady()&&
  (paymentMode()!=='live'||(process.env.LIVE_PAYMENTS_APPROVED==='true'&&process.env.VERCEL_ENV==='production'))&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL||'');}
let client;
export function stripe(){return client ||= new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2,timeout:20000});}
export function json(res,status,data){res.setHeader('Cache-Control','no-store');res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
export function sameOrigin(req){return !!appOrigin()&&req.headers.origin===appOrigin();}
export function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)).filter(p=>p.length===2));}
export function cookie(name,value){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;}
export function clientId(req){const v=cookies(req).tajnstvo_client;return /^[a-f0-9]{64}$/.test(v||'')?v:randomBytes(32).toString('hex');}
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function signedReceipts(ids){const body=Buffer.from(JSON.stringify([...new Set(ids)].slice(-RECEIPT_LIMIT))).toString('base64url');return body+'.'+createHmac('sha256',process.env.RECEIPT_SIGNING_SECRET).update(body).digest('hex');}
export function receipts(req){try{const [body,sig,extra]=(cookies(req).tajnstvo_receipts||'').split('.');if(extra!==undefined)return [];const expected=createHmac('sha256',process.env.RECEIPT_SIGNING_SECRET).update(body||'').digest('hex');if(!safeEqual(sig,expected))return [];const ids=JSON.parse(Buffer.from(body,'base64url'));return Array.isArray(ids)?ids.filter(x=>/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(x)).slice(-RECEIPT_LIMIT):[];}catch{return [];}}
export function belongsToSite(s){const product=Object.hasOwn(PRODUCTS,s?.metadata?.product||'')&&PRODUCTS[s.metadata.product];return !!product&&s.metadata.site==='tajnstvo'&&s.livemode===(paymentMode()==='live')&&s.mode==='payment'&&s.currency==='usd'&&s.amount_total===product.amount&&s.amount_subtotal===product.amount;}
export function validSession(s,requireFulfillment=true){
  return belongsToSite(s)&&s.status==='complete'&&s.payment_status==='paid'&&(!requireFulfillment||s.metadata.fulfilled==='1');
}
export function chargeValid(s){const charge=s.payment_intent?.latest_charge;return !!charge&&charge.paid===true&&!charge.refunded&&!charge.disputed&&charge.amount_refunded===0;}
export async function readJSON(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body)){if(JSON.stringify(req.body).length>8192)throw new Error('BODY_TOO_LARGE');return req.body;}
  let raw=typeof req.body==='string'?req.body:'';
  if(raw.length>8192)throw new Error('BODY_TOO_LARGE');
  if(!raw)for await(const part of req){raw+=part;if(raw.length>8192)throw new Error('BODY_TOO_LARGE');}
  return JSON.parse(raw||'{}');
}
export function isPaidOrPending({state}) {
  return state === 'paid' || state === 'pending';
}

export function recoveryIds(sessions, newCheckoutId) {
  const attempts = sessions.filter(s => s.state === 'open' || s.state === 'failed').map(s => s.id);
  if (newCheckoutId) attempts.push(newCheckoutId);
  const purchases = sessions.filter(isPaidOrPending).map(s => s.id);
  return [...new Set([...attempts, ...purchases])].slice(-RECEIPT_LIMIT);
}

export async function verifiedEntitlements(api,ids,visitor){
  const products=new Set(),sessions=[];
  // Check the signed cookie and one return ID before deciding what to retain.
  for(const id of [...new Set(ids)].slice(0, RECEIPT_LIMIT + 1)){
    let s;
    try{s=await api.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']});}
    catch(error){if(error.code==='resource_missing')continue;throw error;}
    if(!belongsToSite(s)||!safeEqual(s.metadata.client,hash(visitor)))continue;
    const charge=s.payment_intent?.latest_charge;
    let state='unavailable';
    if(charge?.refunded||charge?.amount_refunded>0)state='refunded';
    else if(charge?.disputed)state='disputed';
    else if(validSession(s)&&chargeValid(s))state='paid';
    else if(s.status==='expired')state='expired';
    else if(s.payment_status!=='paid'&&s.metadata.payment_failed==='1')state='failed';
    else if(s.status==='complete')state='pending';
    else if(s.status==='open')state='open';
    sessions.push({id,product:s.metadata.product,state,reportLanguage:s.metadata.report_language==='bg'?'bg':'en'});
    if(state!=='paid')continue;
    products.add(s.metadata.product);
    if(s.metadata.product==='bundle'){products.add('report');products.add('starmap');}
  }
  return {products:[...products],ids:recoveryIds(sessions),sessions};
}
