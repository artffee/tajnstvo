import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const c={Date,Intl,Math,console,localStorage:{removeItem(){}},sessionStorage:{getItem(){return null}}};c.window=c;c.globalThis=c;vm.createContext(c);
for(const f of ['birth.js','engine.js','personal-models.js'])vm.runInContext(await readFile(new URL('../'+f,import.meta.url),'utf8'),c);
const P=c.TajnstvoPersonal,E=c.TajnstvoEngine;
const note={id:'sample-1',title:'Личен запис',text:'<script>not executable</script>',updated:'2026-10-23T12:00:00Z'};
test('journal backup accepts plain text and rejects malformed or duplicate entries',()=>{
 const n=P.validateNotes({version:1,entries:[note]});assert.equal(n[0].text,note.text);assert.equal(n[0].title,'Личен запис');
 for(const data of [{version:2,entries:[]},{version:1,entries:[{...note,text:''}]},{version:1,entries:[{...note,updated:'bad date'}]},{version:1,entries:[note,note]},{version:1,entries:Array.from({length:101},()=>note)}])assert.throws(()=>P.validateNotes(data),/INVALID_JOURNAL/);
});
test('relationship reading uses actual angular aspects and omits uncertain Moon comparisons',()=>{
 const a=E.computeChart(new Date('1990-01-15T10:00:00Z'));a.profile={timeUnknown:false};const b=E.computeChart(new Date('1992-03-21T10:00:00Z'));b.profile={timeUnknown:false};
 const full=P.compare(a,b,E);assert.ok(full.length>0);for(const x of full)assert.ok(Number.isFinite(x.exactness));
 a.profile.timeUnknown=true;b.profile.timeUnknown=true;for(const x of P.compare(a,b,E)){assert.notEqual(x.natal,'moon');assert.notEqual(x.transit,'moon');}
 assert.equal(a.profile.timeUnknown,true);
});
