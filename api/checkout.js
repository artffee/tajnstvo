import {PRODUCTS,appOrigin,paymentMode,ready,stripe,json,sameOrigin,clientId,cookie,hash,readJSON,receipts,signedReceipts,verifiedEntitlements} from '../server/payments.js';
export const createCheckoutHandler=(getStripe=stripe)=>async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'Invalid origin'});
  if(!ready())return json(res,503,{error:'CHECKOUT_UNAVAILABLE'});
  try{
    const body=await readJSON(req),product=Object.hasOwn(PRODUCTS,body.product||'')&&PRODUCTS[body.product];
    if(!product)return json(res,400,{error:'INVALID_PRODUCT'});
    const visitor=clientId(req),requestId=String(body.requestId||'');
    if(!/^[a-f0-9-]{36}$/.test(requestId))return json(res,400,{error:'INVALID_REQUEST'});
    const api=getStripe(),prior=await verifiedEntitlements(api,receipts(req),visitor);
    if(prior.products.includes(body.product))return json(res,409,{error:'ALREADY_PURCHASED'});
    if(prior.sessions.some(s=>s.state==='pending'&&(s.product===body.product||s.product==='bundle'||body.product==='bundle')))return json(res,409,{error:'PAYMENT_PENDING'});
    const lang=body.lang==='bg'?'bg':'en',reportLanguage=body.reportLanguage==='bg'?'bg':'en';
    const tag=Array.from(Buffer.from(hash(visitor+requestId).slice(0,16),'hex'),v=>String.fromCharCode(97+v%26)).join('');
    res.setHeader('Set-Cookie',cookie('tajnstvo_client',visitor));
    const s=await api.checkout.sessions.create({mode:'payment',locale:lang,integration_identifier:'tajnstvo_'+tag,
      line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:product.amount,product_data:{name:product.name}}}],
      success_url:appOrigin()+'/?session_id={CHECKOUT_SESSION_ID}#reading',cancel_url:appOrigin()+'/?checkout=cancelled#reading',
      metadata:{site:'tajnstvo',product:body.product,client:hash(visitor),report_language:reportLanguage},
      payment_intent_data:{metadata:{site:'tajnstvo',product:body.product}},
      custom_text:{submit:{message:'PDF download in your browser. 7-day refund: '+process.env.SUPPORT_EMAIL}}
    },{idempotencyKey:'tajnstvo-'+hash(visitor+requestId+body.product+lang+reportLanguage)});
    if(!s.url?.startsWith('https://checkout.stripe.com/')||s.livemode!==(paymentMode()==='live'))throw new Error('INVALID_CHECKOUT');
    // Remember the order before navigation, even if the return page is never reached.
    res.setHeader('Set-Cookie',[cookie('tajnstvo_client',visitor),cookie('tajnstvo_receipts',signedReceipts([...prior.ids,s.id]))]);json(res,200,{url:s.url});
  }catch{json(res,502,{error:'CHECKOUT_FAILED'});}
};
export default createCheckoutHandler();
