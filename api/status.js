import {ready,json} from '../server/payments.js';
export default function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  json(res,200,{paymentsReady:ready(),supportEmail:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL||'')?process.env.SUPPORT_EMAIL:null,reportLanguage:'en',reportLanguages:['en','bg']});
}
