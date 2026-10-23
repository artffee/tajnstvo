import {ready,stripe,json,sameOrigin,clientId,receipts,signedReceipts,cookie,readJSON,verifiedEntitlements} from '../server/payments.js';
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'Invalid origin'});
  if(!ready())return json(res,200,{products:[],pending:false});
  try{
    const body=await readJSON(req),ids=receipts(req),newId=body.sessionId;
    if(newId&&!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(newId))return json(res,400,{error:'INVALID_SESSION'});
    if(newId&&!ids.includes(newId))ids.push(newId);
    const result=await verifiedEntitlements(stripe(),ids.slice(-3),clientId(req));
    res.setHeader('Set-Cookie',cookie('tajnstvo_receipts',signedReceipts(result.ids)));
    json(res,200,{products:result.products,pending:!!newId&&!result.ids.includes(newId)});
  }catch{json(res,502,{error:'VERIFICATION_FAILED'});}
}
