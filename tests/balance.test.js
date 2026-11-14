'use strict';
const assert=require('node:assert/strict');
const C=require('../core.js');
const targets=[{matter:0,energy:0,calibration:0,bandwidth:0,slots:0},
 {matter:1,energy:1,calibration:0,bandwidth:0,slots:0},
 {matter:3,energy:3,calibration:1,bandwidth:1,slots:1},
 {matter:5,energy:5,calibration:2,bandwidth:1,slots:1},
 {matter:6,energy:6,calibration:3,bandwidth:2,slots:2},
 {matter:8,energy:8,calibration:4,bandwidth:2,slots:2}];
const pref=[['light','helios'],['data','oracle'],['eco','prism'],['seed','vector'],['parallel','inverse'],['proof','oracle'],['amplify','recursion'],['compact','zero'],['duality','zero']];
function gear(s){for(const [chip,form] of pref){if(!s.chips[chip]||!C.unlocked(C.FORMULA_MAP[form],s))continue;
 if(C.equippedCount(s,chip)>=s.chips[chip])continue;
 const slots=s.equipped[form],free=slots.findIndex((v,i)=>i<1+s.upgrades.slots&&!v);
 if(free>=0)C.equip(s,form,free,chip);
}}
function choose(s){
 const goal=C.CONTRACTS[s.contract];if(!goal)return C.plan(s);
 const zero=Object.fromEntries(C.FORMULAS.map(f=>[f.id,0]));
 const forms=C.compileAll(s),weight=3;
 let best={fitness:-Infinity,mins:zero,p:null};
 for(const formL of forms){for(const formD of forms){if(formL.id===formD.id)continue;
   for(const a of [0,1,2,3,4,5,7])for(const b of [0,1,2,3,4,5,7]){
    if(a>formL.cap||b>formD.cap)continue;
    s.minRuns={...zero,[formL.id]:a,[formD.id]:b};s.weight=weight;
    const p=C.plan(s);if(!p.feasible)continue;
    const f=Math.min(p.l/goal.l,p.d/goal.d) + .000001*(p.l+p.d);
    if(f>best.fitness)best={fitness:f,mins:{...s.minRuns},p};
    if(p.l>=goal.l && p.d>=goal.d){s.minRuns={...s.minRuns};return p;}
   }
 }}
 s.minRuns=best.mins;return best.p;
}
function run(){
 const s=C.initialState();let ticks=0,researchBought=0,lastUpgrade=-1;const log=[];
 while(ticks<1000 && s.contract<C.CONTRACTS.length){
   const stage=s.contract,need=targets[stage];
   // A player periodically returns to the lab and purchases relevant research.
   for(const id of ['matter','energy','calibration','bandwidth','slots']){
     if(s.upgrades[id]<need[id] && C.buyUpgrade(s,id).ok){researchBought++;}
   }
   gear(s);
   const p=choose(s);assert(p&&p.feasible);
   C.cycle(s,p,1);
   ticks++;
   if(s.contractReady){const reward=C.claimContract(s);assert(reward.ok);log.push({stage:s.contract,cycle:ticks,l:p.l,d:p.d,upgrade:{...s.upgrades}});}
   if(ticks%10===0&&ticks===lastUpgrade)throw Error('progress stalled');
 }
 assert.equal(s.contract,C.CONTRACTS.length,'All main contracts should be reachable through regular play');
 assert(researchBought>10);
 assert(ticks<700,'Main progression should not require an excessive number of cycles');
 return {ticks,minutes:(ticks*C.CYCLE_MS/60000).toFixed(1),researchBought,log};
}
const result=run();console.log('Full progression cleared by scripted strategy:');
for(const entry of result.log)console.log(`  Contract ${entry.stage}: cycle=${entry.cycle}, L=${entry.l}, D=${entry.d}, upgrades=${JSON.stringify(entry.upgrade)}`);
console.log(`PASS: ${result.ticks} production cycles (${result.minutes} min theoretical active production), ${result.researchBought} research upgrades`);
