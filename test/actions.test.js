const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../stock-core.js');
const A = require('../stock-actions.js');
const item = (overrides={}) => C.validateItem({name:'water',category:'water',quantity:6,unit:'bottle',volumeMl:2000,expiry:'2027-01-01',createdAt:1,...overrides});
const state = () => ({...C.initial(),items:[item()]});

test('explicit bottle count and capacity survive validation and JSON',()=>{
  assert.equal(C.waterVolume(item()),12);
  assert.equal(C.waterVolume(item({quantity:24,volumeMl:500})),12);
  assert.deepEqual(C.validateState(JSON.parse(JSON.stringify(state()))),state());
  const total=C.validateItem({name:'12 L',category:'water',quantity:12,unit:'L',expiry:'',createdAt:1});
  assert.equal(total.volumeMl,undefined);
  assert.equal(C.waterVolume(total),12);
});
test('package validation rejects guessed units, fractional bottles and invalid sizes',()=>{
  for (const v of [0,-1,0.1,Infinity,1000001,null]) assert.throws(()=>item({volumeMl:v}));
  for (const change of [{unit:'L'},{category:'food'},{quantity:1.5}]) assert.throws(()=>item(change));
  assert.equal(C.validateState({...state(),meta:{app:'rollingstock-planner',ver:3}}).items.length,1);
  for (const meta of [null,false,0,[],{app:'other',ver:3}]) assert.throws(()=>C.validateState({...state(),meta}));
});
test('consume validates amount, keeps empty rows and never mutates the source',()=>{
  const before=state();
  assert.equal(A.consume(before,0,1).items[0].quantity,5);
  assert.equal(A.consume(before,0,6).items[0].quantity,0);
  assert.equal(before.items[0].quantity,6);
  for (const n of [0,-1,7,1.5,Infinity]) assert.throws(()=>A.consume(before,0,n));
  assert.throws(()=>A.consume(before,-1,1));
});
test('bulk units support decimals without subtraction residue',()=>{
  const s={...C.initial(),items:[item({quantity:0.3,unit:'L',volumeMl:undefined})]};
  assert.equal(A.consume(s,0,0.1).items[0].quantity,0.2);
});
test('replenishment uses the explicitly entered date, without extending old stock',()=>{
  const before=state();
  assert.equal(A.replenish(before,0,2,'2027-01-01').items[0].quantity,8);
  const next=A.replenish(before,0,2,'2028-01-01');
  assert.equal(next.items.length,2);
  assert.equal(next.items[0].expiry,'2027-01-01');
  assert.equal(next.items[0].quantity,6);
  assert.equal(next.items[1].expiry,'2028-01-01');
  assert.equal(A.replenish(before,0,2,'').items.length,2);
  assert.throws(()=>A.replenish(before,0,2,'2026-02-31'));
  const full={...before,items:Array.from({length:5000},()=>item())};
  assert.throws(()=>A.replenish(full,0,1,'2028-01-01'));
  assert.equal(before.items.length,1);
});
test('undo is a guarded one-step candidate, not an unconditional replacement',()=>{
  const before=state(), after=A.consume(before,0,1);
  const entry={before,after:JSON.stringify(after)};
  assert.deepEqual(A.undo(after,entry),before);
  assert.throws(()=>A.undo({...after,alertMonths:6},entry));
  assert.throws(()=>A.undo(after,null));
});
test('shopping quantities are separate, unknown targets stay unknown',()=>{
  const s=state(), day='2026-10-12';
  assert.equal(A.shopping(s,2000,day).bottles,5); // 21 L - 12 L = 9 L -> 5 bottles.
  assert.equal(A.shopping(s,500,day).bottles,18);
  s.family.dogs=1;
  assert.equal(A.shopping(s,2000,day).bottles,null);
  s.family.dogs=0; s.family.adults=0;
  assert.equal(A.shopping(s,2000,day).bottles,null);
});
