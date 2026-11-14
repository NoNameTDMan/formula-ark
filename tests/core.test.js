'use strict';
const assert=require('node:assert/strict');
const C=require('../core.js');
let n=0;
function test(label,fn){fn();n++;console.log('✓',label);}
function exhaustive(forms,M,E,weight){
  let best=-Infinity,chosen=null;
  function dfs(i,m,e,l,d,counts){
    if(i===forms.length){const obj=l+weight*d;if(obj>best){best=obj;chosen={l,d,counts:{...counts},m,e};}return;}
    const f=forms[i];for(let x=f.min||0;x<=f.cap;x++){
      const mm=m+f.m*x,ee=e+f.e*x;
      if(mm>M||ee>E)break;
      counts[f.id]=x;dfs(i+1,mm,ee,l+f.l*x+(x?f.bL:0),d+f.d*x+(x?f.bD:0),counts);
    }
  }
  dfs(0,0,0,0,0,{});
  return chosen&&{...chosen,score:best};
}
function random(seed){let x=seed;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
test('初期の整数最適化モデルの整合性',()=>{
 const s=C.initialState();const p=C.plan(s);assert(p.feasible);assert.equal(p.score,p.l+3*p.d);assert(p.usageM<=p.M&&p.usageE<=p.E);
 assert.equal(p.d,24);
});
test('最低稼働制約によって最適解が変化し、契約1が達成できる',()=>{
 const s=C.initialState();assert(C.setMinRun(s,'helios',3).ok);
 const p=C.plan(s);assert(p.l>=20&&p.d>=12);assert(p.counts.helios>=3);
 const r=C.cycle(s,p);assert(r.success);assert(s.contractReady);
 const award=C.claimContract(s);assert(award.ok);assert.equal(s.contract,1);assert(s.chips.light>=1);assert(C.compileAll(s).some(f=>f.id==='prism'));
});
test('装着枚数、解放スロット、未解放式を適切に制限',()=>{
 const s=C.initialState();assert(!C.equip(s,'prism',0,'light').ok);
 s.chips.light=1;assert(C.equip(s,'helios',0,'light').ok);
 assert(!C.equip(s,'oracle',0,'light').ok);
 assert(!C.equip(s,'helios',1,'light').ok);
 assert(C.equip(s,'helios',0,null).ok);
 assert(C.equip(s,'oracle',0,'light').ok);
 const p=C.plan(s);assert(p.feasible);
});
test('物質・電力の制約超過はブロックされる',()=>{
 const s=C.initialState();assert(C.setMinRun(s,'helios',7).ok);
 assert(!C.setMinRun(s,'oracle',2).ok);
 assert(C.setMinRun(s,'helios',5).ok);assert(!C.setMinRun(s,'oracle',4).ok);
});
test('初回起動ボーナスはゼロ稼働では発生しない',()=>{
 const forms=[{id:'a',m:2,e:2,l:1,d:0,bL:100,bD:5,cap:1},{id:'b',m:1,e:1,l:10,d:0,bL:0,bD:0,cap:2}];
 const x=C.solve(forms,0,0,1);assert.equal(x.l,0);assert.equal(x.d,0);
 const y=C.solve(forms,2,2,1);assert.equal(y.counts.a,1);assert.equal(y.l,101);assert.equal(y.d,5);
});
test('解けない最低稼働制約は正しく infeasible と判定',()=>{
 const result=C.solve([{id:'A',m:3,e:2,l:1,d:2,cap:4,min:3}],4,4,3);
 assert(!result.feasible);assert.equal(result.evaluated,0);
});
test('ランダムな整数計画を全列挙解と照合（350件）',()=>{
 const rng=random(987654321);
 for(let j=0;j<350;j++){
  const k=1+Math.floor(rng()*4),forms=[];
  for(let i=0;i<k;i++)forms.push({id:'f'+i,m:1+Math.floor(rng()*4),e:1+Math.floor(rng()*4),l:Math.floor(rng()*12),d:Math.floor(rng()*8),bL:Math.floor(rng()*12),bD:Math.floor(rng()*9),cap:1+Math.floor(rng()*4),min:Math.floor(rng()*2)});
  const M=2+Math.floor(rng()*14),E=2+Math.floor(rng()*14),w=1+Math.floor(rng()*10);
  const a=C.solve(forms,M,E,w),b=exhaustive(forms,M,E,w);
  if(b){assert.equal(a.score,b.score,JSON.stringify({forms,M,E,w,a,b}));assert(a.feasible);assert(a.usageM<=M);assert(a.usageE<=E);for(const f of forms)assert(a.counts[f.id]>=f.min&&a.counts[f.id]<=f.cap);}
  else assert(!a.feasible);
 }
});
test('感度分析は容量増加に対する非負の最適値差分',()=>{
 const s=C.initialState();const a=C.insight(s);assert(a.marginalM>=0&&a.marginalE>=0);
});
test('研究費用・研究内容・ロード後の資源値',()=>{
 const s=C.initialState();const price=C.upgradePrice(s,'matter');assert.equal(price.l,174);s.light=200;s.data=150;
 assert(C.buyUpgrade(s,'matter').ok);assert.equal(s.upgrades.matter,1);assert.equal(C.budgets(s).m,18);
 const before=JSON.parse(JSON.stringify(s));const after=C.sanitize(before);assert.equal(after.upgrades.matter,1);assert.equal(after.light,s.light);
});
test('保存データの破損・重複演算子・不正な入力を無害化',()=>{
 const s=C.initialState();s.chips.light=1;s.equipped.helios=['light','light','light'];s.equipped.oracle=['light',null,null];s.upgrades.slots=2;
 s.contract=900;s.light=Infinity;s.minRuns.helios=-100;
 const restored=C.sanitize(s);assert.equal(restored.contract,C.CONTRACTS.length);assert.equal(restored.light,0);assert.equal(restored.minRuns.helios,0);
 assert.equal(C.equippedCount(restored,'light'),1);
});
test('累計生産・契約判定と非実行可能な生産を検証',()=>{
 const s=C.initialState();C.cycle(s,{feasible:false,l:999,d:999},3);assert.equal(s.light,0);
 const p=C.plan(s);C.cycle(s,p,4);assert.equal(s.light,4*p.l);assert.equal(s.totalData,4*p.d);assert.equal(s.cycles,4);
});
test('実績は二重計上されない',()=>{
 const s=C.initialState();C.cycle(s,C.plan(s),1);
 const a=C.evaluateAchievements(s);assert(a.some(x=>x.id==='first'));assert.equal(C.evaluateAchievements(s).length,0);
});
console.log(`\n${n} suites passed. Exact solver checked against 350 brute-force ground truths.`);
