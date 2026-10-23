import Stripe from 'stripe';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export const PRODUCTS={report:{name:'Tajnstvo Soul Report — English PDF',amount:1500},starmap:{name:'Tajnstvo Star Map — PDF',amount:900},bundle:{name:'Tajnstvo Soul Report + Star Map — English PDFs',amount:1900}};
export const ORIGIN='https://tajnstvoto.com';
export function ready(){return process.env.PAYMENTS_ENABLED==='true'&&!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL||'');}
let client;
export function stripe(){return client ||= new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2,timeout:20000});}
export function json(res,status,data){res.setHeader('Cache-Control','no-store');res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
export function sameOrigin(req){return req.headers.origin===ORIGIN || (process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|terminal\.local):\d+$/.test(req.headers.origin||''));}
export function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)).filter(p=>p.length===2));}
export function cookie(name,value){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;}
export function clientId(req){const v=cookies(req).tajnstvo_client;return /^[a-f0-9]{64}$/.test(v||'')?v:randomBytes(32).toString('hex');}
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function safeEqual(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function signedReceipts(ids){const body=Buffer.from(JSON.stringify(ids.slice(-3))).toString('base64url');return body+'.'+createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(body).digest('hex');}
export function receipts(req){try{const [body,sig]=(cookies(req).tajnstvo_receipts||'').split('.');const expected=createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(body||'').digest('hex');if(!safeEqual(sig,expected))return [];const ids=JSON.parse(Buffer.from(body,'base64url'));return Array.isArray(ids)?ids.filter(x=>/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(x)).slice(-3):[];}catch{return [];}}
export function validSession(s,requireFulfillment=true){
  const product=PRODUCTS[s?.metadata?.product];
  return !!product&&s.metadata.site==='tajnstvo'&&s.mode==='payment'&&s.status==='complete'&&s.payment_status==='paid'&&s.currency==='usd'&&s.amount_total===product.amount&&s.amount_subtotal===product.amount&&(!requireFulfillment||s.metadata.fulfilled==='1');
}
export function chargeValid(s){const charge=s.payment_intent?.latest_charge;return !!charge&&charge.paid===true&&!charge.refunded&&!charge.disputed&&charge.amount_refunded===0;}
export async function readJSON(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  let raw=typeof req.body==='string'?req.body:'';
  if(!raw)for await(const part of req){raw+=part;if(raw.length>8192)throw new Error('BODY_TOO_LARGE');}
  return JSON.parse(raw||'{}');
}
export async function verifiedEntitlements(api,ids,visitor){
  const products=new Set(),validIds=[];
  for(const id of ids){
    const s=await api.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']});
    if(!validSession(s)||!chargeValid(s)||!safeEqual(s.metadata.client,hash(visitor)))continue;
    validIds.push(id);products.add(s.metadata.product);
    if(s.metadata.product==='bundle'){products.add('report');products.add('starmap');}
  }
  return {products:[...products],ids:validIds};
}
