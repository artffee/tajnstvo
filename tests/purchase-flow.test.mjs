// Local contract tests use an in-memory Stripe adapter. They are NOT Stripe sandbox transactions.
import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {createCheckoutHandler} from '../api/checkout.js';
import {createVerifyHandler} from '../api/verify.js';
import {createWebhookHandler} from '../api/webhook.js';
import {ready,verificationReady,appOrigin,hash,receipts,signedReceipts,safeEqual,readJSON} from '../server/payments.js';

const origin='https://tajnstvo-qa.example';
const visitor='a'.repeat(64);
function configure(){
  Object.assign(process.env,{PAYMENTS_ENABLED:'true',PAYMENTS_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fixture_only',STRIPE_WEBHOOK_SECRET:'whsec_fixture_only',RECEIPT_SIGNING_SECRET:'receipt-fixture-only-never-a-production-secret',SUPPORT_EMAIL:'qa@example.test',TEST_APP_ORIGIN:origin});
  delete process.env.LIVE_PAYMENTS_APPROVED;
}
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};}
function fixture(){
  configure();
  const sessions=new Map(),calls=[],keys=new Map();let writes=0,failUpdate=false;
  let jar='tajnstvo_client='+visitor;
  const sdk=new Stripe(process.env.STRIPE_SECRET_KEY);
  const api={webhooks:sdk.webhooks,checkout:{sessions:{
    async create(params,opts){
      calls.push({params,opts});
      if(keys.has(opts.idempotencyKey))return sessions.get(keys.get(opts.idempotencyKey));
      const id='cs_test_'+(sessions.size+1),amount=params.line_items[0].price_data.unit_amount;
      const session={id,url:'https://checkout.stripe.com/c/pay/'+id,livemode:false,mode:'payment',status:'open',payment_status:'unpaid',amount_total:amount,amount_subtotal:amount,currency:'usd',metadata:{...params.metadata}};
      sessions.set(id,session);keys.set(opts.idempotencyKey,id);return session;
    },
    async retrieve(id){if(!sessions.has(id))throw Object.assign(new Error('missing'),{code:'resource_missing'});return structuredClone(sessions.get(id));},
    async update(id,patch){if(failUpdate)throw new Error('transient Stripe failure');writes++;Object.assign(sessions.get(id).metadata,patch.metadata);return sessions.get(id);}
  }}};
  const handlers={checkout:createCheckoutHandler(()=>api),verify:createVerifyHandler(()=>api),webhook:createWebhookHandler(()=>api)};
  async function request(name,body,overrides={}){
    const req={method:'POST',headers:{origin,cookie:jar},body,...overrides},res=response();await handlers[name](req,res);
    if(res.headers['Set-Cookie']){
      const values=Object.fromEntries(jar.split('; ').map(x=>x.split('=')));
      for(const line of [].concat(res.headers['Set-Cookie'])){const [k,v]=line.split(';')[0].split('=');values[k]=v;}
      jar=Object.entries(values).map(([k,v])=>k+'='+v).join('; ');
    }
    return res;
  }
  async function purchase(product='report',reportLanguage='en'){
    const res=await request('checkout',{product,lang:'en',reportLanguage,requestId:'12345678-1234-4234-8234-123456789abc',birthDate:'must-not-be-sent',name:'PRIVATE',birthTime:'04:37',cityName:'PrivateCity',lat:12.34567,lon:76.54321,chart:'PrivateChart',success_url:'https://evil.example'});
    assert.equal(res.statusCode,200);return [...sessions.values()].at(-1);
  }
  async function event(s,type='checkout.session.completed',bad=false){
    const body=JSON.stringify({id:'evt_fixture',type,livemode:false,data:{object:{id:s.id}}});
    const signature=sdk.webhooks.generateTestHeaderString({payload:body,secret:process.env.STRIPE_WEBHOOK_SECRET});
    return request('webhook',Buffer.from(body),{headers:{'stripe-signature':bad?'forged':signature}});
  }
  function pay(s){Object.assign(s,{status:'complete',payment_status:'paid',payment_intent:{status:'succeeded',latest_charge:{paid:true,refunded:false,amount_refunded:0,disputed:false}}});}
  return {sessions,calls,request,purchase,event,pay,get jar(){return jar;},get writes(){return writes;},set failUpdate(v){failUpdate=v;}};
}

test('mode guards reject live keys in default test mode, require explicit live approval and isolate origins',()=>{
  configure();assert.equal(ready(),true);
  process.env.STRIPE_SECRET_KEY='sk_live_fixture_only';assert.equal(ready(),false);
  process.env.PAYMENTS_MODE='live';assert.equal(appOrigin(),'https://tajnstvoto.com');assert.equal(ready(),false);
  process.env.LIVE_PAYMENTS_APPROVED='true';process.env.VERCEL_ENV='preview';assert.equal(ready(),false);
  process.env.VERCEL_ENV='production';assert.equal(ready(),true);
  configure();process.env.TEST_APP_ORIGIN='https://qa.example/path';assert.equal(ready(),false);
  configure();delete process.env.RECEIPT_SIGNING_SECRET;assert.equal(ready(),false);
});

test('all fixed prices and both report languages survive Checkout; birth data never enters Stripe',async()=>{
  for(const [product,amount] of [['report',1500],['starmap',900],['bundle',1900]])for(const lang of ['en','bg']){
    const f=fixture(),s=await f.purchase(product,lang),params=f.calls[0].params;
    assert.equal(s.amount_total,amount);assert.equal(s.metadata.report_language,lang);
    assert.equal(params.success_url,origin+'/?session_id={CHECKOUT_SESSION_ID}#reading');
    assert.equal(params.cancel_url,origin+'/?checkout=cancelled#reading');
    assert.equal(params.payment_method_types,undefined);
    assert.deepEqual(Object.keys(params.metadata).sort(), ['client','product','report_language','site']);
    assert.deepEqual(Object.keys(params.payment_intent_data.metadata).sort(), ['product','site']);
    assert.doesNotMatch(JSON.stringify(params),/PRIVATE|must-not-be-sent|04:37|PrivateCity|12\.34567|76\.54321|PrivateChart|evil\.example/);
    f.pay(s);assert.equal((await f.event(s)).statusCode,200);
    const checked=await f.request('verify',{sessionId:s.id});
    assert.equal(checked.body.state,'paid');assert.equal(checked.body.reportLanguage,lang);assert.equal(checked.body.purchasedProduct,product);
    assert.ok(checked.body.products.includes(product));
  }
});

test('same-browser recovery works without success redirect and repeated downloads survive checkout shutdown',async()=>{
  const f=fixture(),s=await f.purchase('bundle','bg');
  assert.deepEqual(receipts({headers:{cookie:f.jar}}),[s.id]);
  f.pay(s);await f.event(s);
  process.env.PAYMENTS_ENABLED='false';assert.equal(ready(),false);assert.equal(verificationReady(),true);
  for(let i=0;i<3;i++)assert.deepEqual((await f.request('verify',{})).body.products,['bundle','report','starmap']);
});

test('cancellation does not grant access; retry is idempotent and language changes do not collide',async()=>{
  const f=fixture(),s=await f.purchase();
  const open=await f.request('verify',{sessionId:s.id});assert.equal(open.body.state,'open');assert.deepEqual(open.body.products,[]);
  await f.purchase();assert.equal(f.sessions.size,1);
  await f.purchase('report','bg');assert.equal(f.sessions.size,2);
});

test('pending orders persist across refresh, block duplicate purchases, then unlock after a webhook',async()=>{
  const f=fixture(),s=await f.purchase();f.pay(s);
  const pending=await f.request('verify',{sessionId:s.id});assert.equal(pending.body.pending,true);assert.deepEqual(pending.body.products,[]);
  assert.deepEqual(receipts({headers:{cookie:f.jar}}),[s.id]);
  assert.deepEqual((await f.request('verify',{})).body.pendingProducts,['report']);
  const repeat=await f.request('checkout',{product:'report',requestId:'12345678-1234-4234-8234-123456789abc'});assert.equal(repeat.statusCode,409);assert.equal(repeat.body.error,'PAYMENT_PENDING');
  await f.event(s);assert.ok((await f.request('verify',{})).body.products.includes('report'));
});

test('signed webhook retries recover from a transient write failure and duplicate/stale events are safe',async()=>{
  const f=fixture(),s=await f.purchase();f.pay(s);f.failUpdate=true;
  assert.equal((await f.event(s)).statusCode,500);assert.deepEqual((await f.request('verify',{})).body.products,[]);
  f.failUpdate=false;assert.equal((await f.event(s)).statusCode,200);await f.event(s);await f.event(s,'checkout.session.async_payment_failed');
  assert.equal(f.writes,1);assert.ok((await f.request('verify',{})).body.products.includes('report'));
});

test('async failure, expired checkout, refund, partial refund and disputes deny further downloads',async()=>{
  for(const state of ['failed','expired','refunded','partial','disputed']){
    const f=fixture(),s=await f.purchase();
    if(state==='failed'){s.status='complete';await f.event(s,'checkout.session.async_payment_failed');await f.event(s,'checkout.session.async_payment_failed');assert.equal(f.writes,1);}
    else if(state==='expired')s.status='expired';
    else {f.pay(s);await f.event(s);Object.assign(s.payment_intent.latest_charge,state==='refunded'?{refunded:true,amount_refunded:1500}:state==='partial'?{amount_refunded:1}:{disputed:true});await f.event(s);}
    const res=await f.request('verify',{sessionId:s.id});assert.deepEqual(res.body.products,[]);assert.equal(res.body.pending,false);assert.equal(res.body.state,state==='partial'?'refunded':state);
  }
});

test('forged webhook, wrong browser, wrong mode, forged cookies and invalid orders cannot unlock',async()=>{
  const f=fixture(),s=await f.purchase();f.pay(s);
  assert.equal((await f.event(s,undefined,true)).statusCode,400);assert.equal(f.writes,0);await f.event(s);
  for(const cookie of ['tajnstvo_client='+ 'b'.repeat(64)+'; tajnstvo_receipts='+signedReceipts([s.id]),'tajnstvo_client='+visitor+'; tajnstvo_receipts=forged']){
    const res=await f.request('verify',{}, {headers:{origin,cookie}});assert.deepEqual(res.body.products,[]);
  }
  s.livemode=true;assert.deepEqual((await f.request('verify',{sessionId:s.id})).body.products,[]);
  assert.equal((await f.request('checkout',{product:'constructor',requestId:'12345678-1234-4234-8234-123456789abc'})).statusCode,400);
  assert.equal((await f.request('verify',{}, {headers:{origin:'https://evil.example'}})).statusCode,403);
});

test('missing/foreign session does not stop legitimate receipts and webhook secret rotation preserves them',async()=>{
  const f=fixture(),s=await f.purchase();f.pay(s);await f.event(s);
  process.env.STRIPE_WEBHOOK_SECRET='whsec_rotated_fixture';
  const res=await f.request('verify',{sessionId:'cs_test_missing'});assert.ok(res.body.products.includes('report'));assert.equal(res.body.state,'unavailable');
  assert.deepEqual(receipts({headers:{cookie:f.jar}}),[s.id]);
});

test('malformed unicode comparisons and oversized pre-parsed JSON fail safely',async()=>{
  assert.equal(safeEqual('é','a'),false);
  await assert.rejects(()=>readJSON({body:{data:'a'.repeat(9000)}}),/BODY_TOO_LARGE/);
  await assert.rejects(()=>readJSON({body:'a'.repeat(9000)}),/BODY_TOO_LARGE/);
});

test('abandoned checkouts cannot displace a paid same-browser receipt', async () => {
  const f = fixture();
  const paid = await f.purchase('report');
  f.pay(paid);
  await f.event(paid);
  for (let i = 1; i <= 4; i++) {
    const attempt = await f.request('checkout', {
      product: 'starmap', requestId: '12345678-1234-4234-8234-' + String(i).padStart(12, '0')
    });
    assert.equal(attempt.statusCode, 200);
  }
  const ids = receipts({headers: {cookie: f.jar}});
  assert.equal(ids.length, 3);
  assert.ok(ids.includes(paid.id));
  assert.deepEqual((await f.request('verify', {})).body.products, ['report']);
});

test('a missing return session cannot evict a receipt from a full cookie', async () => {
  const f = fixture();
  const paid = await f.purchase('report');
  for (const lang of ['en', 'bg']) await f.purchase('starmap', lang);
  f.pay(paid);
  await f.event(paid);
  const checked = await f.request('verify', {sessionId: 'cs_test_missing'});
  assert.equal(checked.body.state, 'unavailable');
  assert.deepEqual(checked.body.products, ['report']);
  assert.ok(receipts({headers: {cookie: f.jar}}).includes(paid.id));
});

test('a full cookie of unsettled purchases prevents another checkout', async () => {
  const f = fixture();
  for (let i = 1; i <= 3; i++) {
    const opened = await f.request('checkout', {
      product: 'report', requestId: '12345678-1234-4234-8234-' + String(i).padStart(12, '0')
    });
    assert.equal(opened.statusCode, 200);
  }
  // Earlier tabs may complete while webhook fulfillment is still pending.
  for (const session of f.sessions.values()) f.pay(session);
  const attempt = await f.request('checkout', {
    product: 'starmap', requestId: '12345678-1234-4234-8234-000000000004'
  });
  assert.equal(attempt.statusCode, 409);
  assert.equal(attempt.body.error, 'PURCHASE_RECOVERY_LIMIT');
  assert.equal(f.sessions.size, 3);
  assert.deepEqual(receipts({headers: {cookie: f.jar}}).sort(), [...f.sessions.keys()].sort());
});
