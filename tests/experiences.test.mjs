import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={Date,Intl,Math,console,localStorage:{removeItem(){}},sessionStorage:{getItem(){return null}}};context.window=context;context.globalThis=context;vm.createContext(context);
for(const f of ['birth.js','engine.js','experiences.js'])vm.runInContext(await readFile(new URL('../'+f,import.meta.url),'utf8'),context);
const E=context.TajnstvoEngine,X=context.TajnstvoExperiences;
E.writeProfile({name:'Private Test',birthDate:'1990-01-15',birthTime:'12:00',cityName:'Sofia, Bulgaria',timeZone:'Europe/Sofia',lat:42.6977,lon:23.3219});const chart=E.getNatalChart();
test('share cards omit birth details and names unless the visitor opts in',()=>{
 const card=X.cardData(chart,E,s=>s);
 assert.equal(card.name,'');assert.equal(card.signs.length,3);
 const serialized=JSON.stringify(card);for(const privateValue of ['1990-01-15','12:00','Sofia','Europe/Sofia','42.6977','Private Test'])assert.ok(!serialized.includes(privateValue));
 assert.equal(X.cardData(chart,E,s=>s,'bg',true).name,'Private Test');
 assert.equal(X.cardData(chart,E,s=>s,'bg').signs[0].label,'СЛЪНЦЕ');
});
test('unknown birth time never invents a Rising sign on a shared card',()=>{
 const card=X.cardData({...chart,profile:{...chart.profile,timeUnknown:true}},E,s=>s);
 assert.equal(card.signs.length,2);assert.match(card.note,/unknown/);assert.match(card.note,/Moon may vary/);
});
test('daily edition is stable for a date, changes tomorrow and contains a real chart snapshot',()=>{
 const a=X.edition('2026-10-23',chart,E),b=X.edition('2026-10-23',chart,E),next=X.edition('2026-10-24',chart,E);
 assert.equal(a.themeIndex,b.themeIndex);assert.notEqual(a.themeIndex,next.themeIndex);assert.equal(a.sign,'Cap');assert.ok(a.lens.length===2);assert.ok(E.SIGNS.includes(a.moon));
 assert.ok(a.aspect);assert.ok(Number.isFinite(a.aspect.exactness));
 for(const content of ['title','reflection','action','question'])assert.ok(a.theme[content].every(x=>x.length>5));
 const general=X.edition('2026-10-23',null,E);assert.equal(general.sign,null);assert.equal(general.aspect,null);assert.equal(general.lens,null);
 assert.throws(()=>X.edition('2026-02-30',chart,E),/INVALID_DATE/);
});
test('daily date follows local calendar midnight',()=>{
 const lastMinute=new Date(2026,9,23,23,59);assert.equal(X.dateKey(lastMinute),'2026-10-23');assert.equal(X.dateKey(new Date(+lastMinute+120000)),'2026-10-24');
});
