import {PRODUCTS,ORIGIN,ready,stripe,json,sameOrigin,clientId,cookie,hash,readJSON} from '../server/payments.js';
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'Invalid origin'});
  if(!ready())return json(res,503,{error:'CHECKOUT_UNAVAILABLE'});
  try{
    const body=await readJSON(req),product=PRODUCTS[body.product];
    if(!product)return json(res,400,{error:'INVALID_PRODUCT'});
    const visitor=clientId(req),requestId=String(body.requestId||'');
    if(!/^[a-f0-9-]{36}$/.test(requestId))return json(res,400,{error:'INVALID_REQUEST'});
    const tag=Array.from(Buffer.from(hash(visitor+requestId).slice(0,16),'hex'),v=>String.fromCharCode(97+v%26)).join('');
    const s=await stripe().checkout.sessions.create({mode:'payment',locale:body.lang==='bg'?'bg':'en',integration_identifier:'tajnstvo_'+tag,
      line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:product.amount,product_data:{name:product.name}}}],
      success_url:ORIGIN+'/?session_id={CHECKOUT_SESSION_ID}#reading',cancel_url:ORIGIN+'/?checkout=cancelled#reading',
      metadata:{site:'tajnstvo',product:body.product,client:hash(visitor)},
      payment_intent_data:{metadata:{site:'tajnstvo',product:body.product}},
      custom_text:{submit:{message:'PDF download in your browser. 7-day refund: '+process.env.SUPPORT_EMAIL}}
    },{idempotencyKey:'tajnstvo-'+hash(visitor)+requestId});
    if(!s.url?.startsWith('https://checkout.stripe.com/'))throw new Error('INVALID_CHECKOUT');
    res.setHeader('Set-Cookie',cookie('tajnstvo_client',visitor));json(res,200,{url:s.url});
  }catch{json(res,502,{error:'CHECKOUT_FAILED'});}
}
