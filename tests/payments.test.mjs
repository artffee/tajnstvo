import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {ready,validSession,chargeValid,hash,verifiedEntitlements,signedReceipts,receipts,sameOrigin} from '../server/payments.js';
import {fulfill} from '../api/webhook.js';
import checkout from '../api/checkout.js';
import verify from '../api/verify.js';
import webhook from '../api/webhook.js';
process.env.STRIPE_WEBHOOK_SECRET='whsec_test_fixture_only';
const visitor='a'.repeat(64);
const paid=()=>({id:'cs_test_123',metadata:{site:'tajnstvo',product:'bundle',client:hash(visitor),fulfilled:'1'},mode:'payment',status:'complete',payment_status:'paid',currency:'usd',amount_total:1900,amount_subtotal:1900,payment_intent:{latest_charge:{paid:true,refunded:false,disputed:false,amount_refunded:0}}});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}}}
test('checkout and verification fail closed without payment configuration',async()=>{
 delete process.env.PAYMENTS_ENABLED;assert.equal(ready(),false);
 const r=response();await checkout({method:'POST',headers:{origin:'https://tajnstvoto.com'},body:{product:'bundle'}},r);assert.equal(r.statusCode,503);
 const v=response();await verify({method:'POST',headers:{origin:'https://tajnstvoto.com'},body:{sessionId:'cs_test_fake'}},v);assert.deepEqual(v.body.products,[]);
 assert.equal(sameOrigin({headers:{origin:'https://evil.example'}}),false);
});
test('unpaid, wrong amount, currency, site and unfulfilled sessions never unlock',()=>{
 assert.equal(validSession(paid()),true);
 for(const patch of [{payment_status:'unpaid'},{status:'open'},{amount_total:1},{currency:'eur'},{metadata:{...paid().metadata,site:'other'}},{metadata:{...paid().metadata,fulfilled:'0'}}])assert.equal(validSession({...paid(),...patch}),false);
 for(const patch of [{refunded:true},{disputed:true},{amount_refunded:1},{paid:false}])assert.equal(chargeValid({...paid(),payment_intent:{latest_charge:{...paid().payment_intent.latest_charge,...patch}}}),false);
});
test('entitlements belong to the purchasing browser, bundle grants both',async()=>{
 const api={checkout:{sessions:{retrieve:async()=>paid()}}};
 assert.deepEqual((await verifiedEntitlements(api,['cs_test_123'],visitor)).products,['bundle','report','starmap']);
 assert.deepEqual((await verifiedEntitlements(api,['cs_test_123'],'b'.repeat(64))).products,[]);
});
test('receipt tampering cannot create an entitlement',()=>{
 const value=signedReceipts(['cs_test_123']);
 assert.deepEqual(receipts({headers:{cookie:'tajnstvo_receipts='+value}}),['cs_test_123']);
 assert.deepEqual(receipts({headers:{cookie:'tajnstvo_receipts='+value+'x'}}),[]);
});
test('signed webhook fulfills once, retries and stale failed events are safe',async()=>{
 let s=paid(),updates=0;s.metadata.fulfilled='0';
 const api={checkout:{sessions:{retrieve:async()=>s,update:async(id,patch)=>{updates++;s.metadata={...s.metadata,...patch.metadata}}}}};
 const event={type:'checkout.session.completed',data:{object:{id:s.id}}};
 await fulfill(api,event);await fulfill(api,event);await fulfill(api,{...event,type:'checkout.session.async_payment_failed'});
 assert.equal(updates,1);assert.equal(s.metadata.fulfilled,'1');
 s.payment_status='unpaid';s.metadata.fulfilled='0';await fulfill(api,event);assert.equal(updates,1);
});
test('webhook handler rejects forged signatures before fulfillment',async()=>{
 process.env.STRIPE_SECRET_KEY='sk_test_fixture_only';
 const r=response();await webhook({method:'POST',headers:{'stripe-signature':'forged'},body:Buffer.from('{}')},r);assert.equal(r.statusCode,400);
 const sdk=new Stripe('sk_test_fixture_only');const payload=JSON.stringify({type:'unrelated.event',data:{object:{}}});
 const sig=sdk.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});const valid=response();
 await webhook({method:'POST',headers:{'stripe-signature':sig},body:Buffer.from(payload)},valid);assert.equal(valid.statusCode,200);
});
