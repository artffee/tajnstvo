import test from 'node:test';
import assert from 'node:assert/strict';
import '../birth.js';
const B=globalThis.TajnstvoBirth;
test('Sofia uses historical summer and winter offsets',()=>{
 assert.equal(B.toUTC('1990-01-15','12:00','Europe/Sofia').toISOString(),'1990-01-15T10:00:00.000Z');
 assert.equal(B.toUTC('1990-07-15','12:00','Europe/Sofia').toISOString(),'1990-07-15T09:00:00.000Z');
});
test('half and quarter hour zones remain exact',()=>{
 assert.equal(B.toUTC('2000-01-01','12:00','Asia/Kolkata').toISOString(),'2000-01-01T06:30:00.000Z');
 assert.equal(B.toUTC('2000-01-01','12:00','Asia/Kathmandu').toISOString(),'2000-01-01T06:15:00.000Z');
});
test('skipped and repeated civil times cannot silently produce a wrong chart',()=>{
 assert.throws(()=>B.toUTC('2024-03-10','02:30','America/New_York'),/NONEXISTENT_TIME/);
 assert.throws(()=>B.toUTC('2024-11-03','01:30','America/New_York'),/AMBIGUOUS_TIME/);
 assert.equal(B.toUTC('2024-11-03','01:30','America/New_York','earlier').toISOString(),'2024-11-03T05:30:00.000Z');
 assert.equal(B.toUTC('2024-11-03','01:30','America/New_York','later').toISOString(),'2024-11-03T06:30:00.000Z');
});
test('bad dates and out-of-range dates are rejected',()=>{
 for(const date of ['2023-02-29','2024-00-10','1899-12-31','2101-01-01'])assert.throws(()=>B.toUTC(date,'12:00','Europe/Sofia'),/INVALID_DATE/);
 assert.equal(B.exactCity('София').timeZone,'Europe/Sofia');
});
