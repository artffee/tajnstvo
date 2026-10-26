import {verificationReady,stripe,json,sameOrigin,clientId,receipts,signedReceipts,cookie,readJSON,verifiedEntitlements} from '../server/payments.js';
export const createVerifyHandler=(getStripe=stripe)=>async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'Invalid origin'});
  if(!verificationReady())return json(res,503,{error:'VERIFICATION_UNAVAILABLE'});
  try{
    const body=await readJSON(req),ids=receipts(req),newId=body.sessionId;
    if(newId&&!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(newId))return json(res,400,{error:'INVALID_SESSION'});
    if(newId&&!ids.includes(newId))ids.push(newId);
    const result=await verifiedEntitlements(getStripe(),ids.slice(-3),clientId(req));
    res.setHeader('Set-Cookie',cookie('tajnstvo_receipts',signedReceipts(result.ids)));
    const current=result.sessions.find(s=>s.id===newId);
    json(res,200,{products:result.products,pending:current?.state==='pending',state:newId?(current?.state||'unavailable'):null,
      purchasedProduct:current?.state==='paid'?current.product:null,reportLanguage:current?.state==='paid'?current.reportLanguage:null,
      pendingProducts:result.sessions.filter(s=>s.state==='pending').map(s=>s.product)});
  }catch{json(res,502,{error:'VERIFICATION_FAILED'});}
};
export default createVerifyHandler();
