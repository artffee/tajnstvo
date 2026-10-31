import {stripe,json,validSession,chargeValid,belongsToSite} from '../server/payments.js';
export const config={api:{bodyParser:false}};
export async function fulfill(api,event){
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type))return;
  const s=await api.checkout.sessions.retrieve(event.data.object.id,{expand:['payment_intent.latest_charge']});
  if(!belongsToSite(s))return;
  // Updating the same durable Stripe record is idempotent across webhook retries.
  // Re-read current status so an old failed event cannot revoke a later successful payment.
  if(validSession(s,false)&&chargeValid(s)){
    if(s.metadata.fulfilled!=='1')await api.checkout.sessions.update(s.id,{metadata:{fulfilled:'1',payment_failed:'0'}});
  }else if(event.type==='checkout.session.async_payment_failed'&&s.payment_status!=='paid'){
    if(s.metadata.payment_failed!=='1')await api.checkout.sessions.update(s.id,{metadata:{fulfilled:'0',payment_failed:'1'}});
  }
}
export const createWebhookHandler=(getStripe=stripe)=>async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return json(res,503,{error:'Webhook unavailable'});
  let event;
  try{
    let raw;
    if(Buffer.isBuffer(req.body))raw=req.body;
    else if(typeof req.body==='string')raw=Buffer.from(req.body);
    else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)throw new Error('Too large');chunks.push(Buffer.from(chunk));}raw=Buffer.concat(chunks);}
    event=getStripe().webhooks.constructEvent(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);
  }catch{return json(res,400,{error:'Invalid signature'});}
  try{await fulfill(getStripe(),event);json(res,200,{received:true});}catch{json(res,500,{error:'Please retry'});}
};
export default createWebhookHandler();
