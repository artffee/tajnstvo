import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const storage=()=>({getItem(){return null},removeItem(){},setItem(){}});
const context={console,Date,Intl,Math,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setTimeout,clearTimeout,localStorage:storage(),sessionStorage:storage(),navigator:{userAgent:'node'},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async url=>({ok:true,arrayBuffer:async()=>{const b=await readFile(new URL(url.slice(1),root));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}})};
context.window=context;context.self=context;context.globalThis=context;
vm.createContext(context);
for(const file of ['birth.js','engine.js','soulreport-data.js','vendor/jspdf.js','report.js','starmap.js','report-bg.js'])vm.runInContext(await readFile(new URL(file,root),'utf8'),context,{filename:file});
test('shared chart produces the original full report and star map without an API key',async()=>{
 const E=context.TajnstvoEngine;
 E.writeProfile({name:'Ивайло Test',birthDate:'1990-01-15',birthTime:'12:00',cityName:'Sofia, Bulgaria',lat:42.6977,lon:23.3219,timeZone:'Europe/Sofia'});
 const chart=E.getNatalChart();assert.equal(chart.date.toISOString(),'1990-01-15T10:00:00.000Z');assert.equal(E.lonToSign(chart.sun.lon).sign,'Cap');
 const outputs=[];context.jspdf.jsPDF.API.save=function(name){outputs.push({name,pages:this.getNumberOfPages(),bytes:this.output('arraybuffer')});return this;};
 await context.TajnstvoReport.generatePdfReport(chart,null);
 await context.tajnstvoStarMap(chart);
 assert.equal(outputs.length,2);assert.ok(outputs[0].pages>=12);assert.equal(outputs[1].pages,1);
 for(const [i,file] of outputs.entries()){assert.ok(file.bytes.byteLength>10000);assert.equal(Buffer.from(file.bytes).toString('ascii',0,4),'%PDF');await writeFile('/tmp/tajnstvo-test-'+i+'.pdf',Buffer.from(file.bytes));}
});

test('Bulgarian edition renders all report sections with a Cyrillic font',async()=>{
 const E=context.TajnstvoEngine;E.writeProfile({name:'Примерен профил',birthDate:'1990-01-15',birthTime:'12:00',cityName:'Sofia, Bulgaria',lat:42.6977,lon:23.3219,timeZone:'Europe/Sofia'});
 const outputs=[];context.jspdf.jsPDF.API.save=function(){outputs.push(this);return this;};
 await context.TajnstvoBulgarianReport.generate(E.getNatalChart(),{sample:true});
 const doc=outputs[0];assert.ok(doc);assert.ok(doc.getNumberOfPages()>=12&&doc.getNumberOfPages()<=20);
 const bytes=Buffer.from(doc.output('arraybuffer'));assert.ok(bytes.length>30000);await writeFile('/tmp/tajnstvo-bg-sample.pdf',bytes);
 await assert.rejects(()=>context.TajnstvoBulgarianReport.generate({...E.getNatalChart(),profile:{timeUnknown:true}}),/KNOWN_BIRTH_TIME_REQUIRED/);
});
