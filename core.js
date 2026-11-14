/* FORMULA / ARK — deterministic, offline-first optimization game engine.
   MIT license. Pure functions; no DOM, timers or storage in this module. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FormulaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SAVE_VERSION = 3;
  const CYCLE_MS = 4000;
  const MAX_OFFLINE_CYCLES = 180;
  const MAX_UPGRADE_LEVEL = 22;
  const MAX_CURRENCY = 1e15;
  const FORMULAS = [
    { id:'helios', no:'01', name:'光子圧縮', en:'PHOTON PRESS', sigil:'◈', color:'#e9ae6b', matter:2, energy:2, light:7, data:0, cap:7, unlock:0, about:'少ない電力で光量を安定生産する基礎式。'},
    { id:'oracle', no:'02', name:'観測演算', en:'OBSERVATORY', sigil:'⌁', color:'#8dbcf9', matter:1, energy:3, light:1, data:4, cap:7, unlock:0, about:'観測値を知識へと変換する。研究の主力。'},
    { id:'prism', no:'03', name:'光学合成', en:'PRISM ARRAY', sigil:'◇', color:'#c7a7ff', matter:3, energy:4, light:10, data:3, cap:6, unlock:1, about:'光量と知識の両方を出力する複合式。'},
    { id:'inverse', no:'04', name:'反転導出', en:'INVERSE ENGINE', sigil:'⌬', color:'#77e2cf', matter:2, energy:4, light:2, data:8, cap:6, unlock:2, about:'知識を高密度で取り出す強力な演算。'},
    { id:'vector', no:'05', name:'位相増幅', en:'PHASE VECTOR', sigil:'✧', color:'#f29aaa', matter:4, energy:5, light:23, data:1, cap:5, unlock:3, about:'大量の光量を生成する高負荷の演算式。'},
    { id:'zero', no:'06', name:'零点炉', en:'ZERO-POINT CORE', sigil:'✳', color:'#d8ce8c', matter:5, energy:7, light:32, data:9, cap:5, unlock:4, about:'生産を次元上昇させる精密な複合式。'},
    { id:'recursion', no:'07', name:'自己再帰', en:'RECURSIVE ARRAY', sigil:'∞', color:'#91a8ff', matter:6, energy:9, light:62, data:14, cap:5, unlock:5, about:'巨大な生産量を生む最終世代の数式。'}
  ];
  const CHIPS = [
    { id:'light', name:'加算子 +4', tag:'光量', symbol:'+4', color:'gold', desc:'1稼働あたり光量+4。電力消費+1。', dL:4, dE:1 },
    { id:'data', name:'演繹子 +3', tag:'知識', symbol:'+3', color:'blue', desc:'1稼働あたり知識+3。物質消費+1。', dD:3, dM:1 },
    { id:'eco', name:'省電演算', tag:'節約', symbol:'E−1', color:'mint', desc:'1稼働あたり電力消費−1（下限1）。', dE:-1 },
    { id:'seed', name:'定数項 +12', tag:'初動', symbol:'+12', color:'gold', desc:'その式を1回以上稼働させると光量+12。', bL:12 },
    { id:'parallel', name:'並列化 +3', tag:'容量', symbol:'×+3', color:'violet', desc:'1周期の最大稼働回数+3。', dCap:3 },
    { id:'proof', name:'証明の余白', tag:'初動', symbol:'Σ+9', color:'blue', desc:'その式を1回以上稼働させると知識+9。', bD:9 },
    { id:'amplify', name:'過給演算 ×1.6', tag:'増幅', symbol:'×1.6', color:'rose', desc:'出力を1.6倍（切り捨て）。物質+1、電力+2。', mult:1.6, dM:1, dE:2 },
    { id:'compact', name:'圧縮構文', tag:'節約', symbol:'M−1', color:'mint', desc:'1稼働あたり物質消費−1（下限1）。', dM:-1 },
    { id:'duality', name:'双対の鍵', tag:'調和', symbol:'L+D', color:'violet', desc:'1稼働あたり光量+5、知識+2。電力+2。', dL:5, dD:2, dE:2 }
  ];
  const CHIP_MAP = Object.fromEntries(CHIPS.map(c=>[c.id,c]));
  const FORMULA_MAP = Object.fromEntries(FORMULAS.map(f=>[f.id,f]));
  const CONTRACTS = [
    {title:'点火の証明',sub:'光量と知識を同時に生産せよ',l:20,d:12,rewardL:36,rewardD:9,formula:'prism',chips:['light'],message:'光学合成式と加算子が解放された。'},
    {title:'二つの目的',sub:'限られた資源で両方の生産目標を突破',l:44,d:19,rewardL:80,rewardD:26,formula:'inverse',chips:['data','eco'],message:'反転導出式と2種類の演算子が解放された。'},
    {title:'ボトルネック突破',sub:'負荷を乗り越え、単周期の生産量を拡大',l:80,d:35,rewardL:188,rewardD:60,formula:'vector',chips:['seed','parallel'],message:'位相増幅式と定数項が解放された。'},
    {title:'夜明けの計算機',sub:'複数の式を組み合わせて高い効率を実現',l:145,d:60,rewardL:360,rewardD:136,formula:'zero',chips:['proof','compact'],message:'零点炉と高度な省資源演算が解放された。'},
    {title:'最適化の彼方',sub:'大規模な整数計画モデルを成立させる',l:260,d:115,rewardL:720,rewardD:288,formula:'recursion',chips:['amplify'],message:'自己再帰式と過給演算が解放された。'},
    {title:'方程式の星座',sub:'数式航路の全生産系を統合する',l:490,d:205,rewardL:1800,rewardD:720,formula:null,chips:['duality','light','data'],message:'主航路を完全踏破。究極の演算子を獲得した。'}
  ];
  const RESEARCH = [
    {id:'matter',icon:'layers',title:'物質展開',desc:'周期ごとの物質上限 +4',baseL:174,baseD:0,scale:1.56,max:20},
    {id:'energy',icon:'zap',title:'電力拡張',desc:'周期ごとの電力上限 +5',baseL:216,baseD:0,scale:1.56,max:20},
    {id:'calibration',icon:'aperture',title:'係数校正',desc:'すべての式の単位出力が約16%増加',baseL:90,baseD:285,scale:1.83,max:13},
    {id:'slots',icon:'network',title:'構文スロット',desc:'各式の演算子枠を増やす（最大3枠）',baseL:450,baseD:525,scale:2.9,max:2},
    {id:'bandwidth',icon:'cpu',title:'並列制御',desc:'すべての式の最大稼働回数 +1',baseL:390,baseD:255,scale:1.86,max:6}
  ];
  const RESEARCH_MAP = Object.fromEntries(RESEARCH.map(r=>[r.id,r]));
  const TRIALS = [
    {id:'t1',title:'二律背反',subtitle:'初期式2種類だけで、両資源を確保',l:23,d:8,m:9,e:12,forms:2,rewardL:150,rewardD:42},
    {id:'t2',title:'三角関係',subtitle:'3式の相互補完を利用して生産',l:29,d:18,m:13,e:19,forms:3,rewardL:250,rewardD:85},
    {id:'t3',title:'観測の壁',subtitle:'限られた電力で研究量を押し上げる',l:40,d:30,m:18,e:28,forms:4,rewardL:470,rewardD:160},
    {id:'t4',title:'相補性',subtitle:'5式の中から必要なものを選び抜く',l:79,d:30,m:24,e:36,forms:5,rewardL:850,rewardD:350},
    {id:'t5',title:'究極の定式化',subtitle:'全式と最新の演算子で突破を目指せ',l:160,d:75,m:36,e:51,forms:7,rewardL:720,rewardD:288}
  ];
  const ACHIEVEMENTS = [
    {id:'first',name:'最適解はここに',desc:'はじめて生産周期を実行',req:s=>s.cycles>=1},
    {id:'light100',name:'光の粒子',desc:'累計光量100を生産',req:s=>s.totalLight>=100},
    {id:'data100',name:'観測の習慣',desc:'累計知識100を生産',req:s=>s.totalData>=100},
    {id:'optimizer',name:'再計算の達人',desc:'20回の最適化計算を実行',req:s=>s.solves>=20},
    {id:'architect',name:'式の設計士',desc:'異なる式へ演算子を2つ装着',req:s=>Object.values(s.equipped).filter(v=>v.some(Boolean)).length>=2},
    {id:'chapter3',name:'第三の証明',desc:'契約3をクリア',req:s=>s.contract>=3},
    {id:'cycle100',name:'百回の鼓動',desc:'生産周期100回',req:s=>s.cycles>=100},
    {id:'trophy',name:'試験室の勝者',desc:'3つの最適化試験を突破',req:s=>s.trials.length>=3},
    {id:'final',name:'演算の星座',desc:'メイン契約をすべて達成',req:s=>s.contract>=CONTRACTS.length}
  ];
  const safeInt=(x,limit=MAX_CURRENCY)=>Number.isFinite(Number(x))?Math.max(0,Math.min(limit,Math.floor(Number(x)))):0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function initialState(now=Date.now()) {
    return {
      version:SAVE_VERSION,light:0,data:0,totalLight:0,totalData:0,contract:0,contractReady:false,
      upgrades:{matter:0,energy:0,calibration:0,slots:0,bandwidth:0},
      chips:{light:0,data:0,eco:0,seed:0,parallel:0,proof:0,amplify:0,compact:0,duality:0},
      equipped:Object.fromEntries(FORMULAS.map(f=>[f.id, [null,null,null]])),
      minRuns:Object.fromEntries(FORMULAS.map(f=>[f.id,0])),
      weight:3,paused:false,cycles:0,solves:0,activeTab:'command',trials:[],
      achievements:[],history:[],events:[],selected:'helios',tutorial:0,
      lastTick:now,created:now,updated:now,lastCycle:null
    };
  }
  function sanitize(raw,now=Date.now()){
    const v=initialState(now);
    if (!raw || typeof raw!=='object' || raw.version!==SAVE_VERSION) return v;
    for(const k of ['light','data','totalLight','totalData','contract','cycles','solves','tutorial','created','lastTick','updated']) if(k in raw) v[k]=safeInt(raw[k],k.endsWith('Tick')||k==='created'||k==='updated'?1e16:MAX_CURRENCY);
    v.contract=clamp(v.contract,0,CONTRACTS.length);
    v.weight=clamp(safeInt(raw.weight||3,10),1,10);
    v.paused=!!raw.paused;
    v.contractReady=!!raw.contractReady;
    v.selected=FORMULA_MAP[raw.selected] ? raw.selected : 'helios';
    v.activeTab=['command','formulas','lab','archive'].includes(raw.activeTab)?raw.activeTab:'command';
    if(raw.upgrades&&typeof raw.upgrades==='object')for(const r of RESEARCH)v.upgrades[r.id]=clamp(safeInt(raw.upgrades[r.id]),0,r.max);
    if(raw.chips&&typeof raw.chips==='object')for(const c of CHIPS)v.chips[c.id]=clamp(safeInt(raw.chips[c.id]),0,99);
    if(raw.equipped&&typeof raw.equipped==='object') {
      for(const f of FORMULAS){const a=raw.equipped[f.id];if(Array.isArray(a))v.equipped[f.id]=[0,1,2].map(i=>CHIP_MAP[a[i]]?a[i]:null);}
    }
    // Eliminate duplicate/illegally equipped chips and slots on corrupt/old saves.
    const used={};for(const f of FORMULAS){let slots=1+v.upgrades.slots;for(let i=0;i<3;i++){
      const id=v.equipped[f.id][i];if(i>=slots||f.unlock>v.contract||!id||(used[id]||0)>=v.chips[id])v.equipped[f.id][i]=null;
      else used[id]=(used[id]||0)+1;
    }}
    if(raw.minRuns&&typeof raw.minRuns==='object')for(const f of FORMULAS)v.minRuns[f.id]=clamp(safeInt(raw.minRuns[f.id]),0,30);
    v.trials=Array.isArray(raw.trials)?[...new Set(raw.trials.filter(id=>TRIALS.some(t=>t.id===id)))]:[];
    v.achievements=Array.isArray(raw.achievements)?[...new Set(raw.achievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))]:[];
    v.history=Array.isArray(raw.history)?raw.history.slice(-32).map(x=>({l:safeInt(x.l),d:safeInt(x.d)})):[];
    v.events=Array.isArray(raw.events)?raw.events.slice(-30).filter(e=>typeof e==='string').map(e=>e.slice(0,160)):[];
    v.lastCycle=raw.lastCycle&&typeof raw.lastCycle==='object'?{l:safeInt(raw.lastCycle.l),d:safeInt(raw.lastCycle.d),usageM:safeInt(raw.lastCycle.usageM),usageE:safeInt(raw.lastCycle.usageE)}:null;
    if(v.lastTick>now+60000)v.lastTick=now;
    return v;
  }
  function budgets(s) { return {m:14+4*s.upgrades.matter, e:18+5*s.upgrades.energy}; }
  function unlocked(f,s){return f.unlock<=s.contract;}
  function compile(f,s){
    let m=f.matter,e=f.energy,l=f.light,d=f.data,bL=0,bD=0,cap=f.cap+s.upgrades.bandwidth,mult=1;
    for(const id of s.equipped[f.id]||[]){const chip=CHIP_MAP[id];if(!chip)continue;
      m+=chip.dM||0;e+=chip.dE||0;l+=chip.dL||0;d+=chip.dD||0;bL+=chip.bL||0;bD+=chip.bD||0;cap+=chip.dCap||0;mult*=chip.mult||1;
    }
    const calibration=Math.pow(1.16,s.upgrades.calibration);
    return {id:f.id,name:f.name,color:f.color,min:clamp(safeInt(s.minRuns?.[f.id]),0,cap),m:Math.max(1,m),e:Math.max(1,e),l:Math.max(0,Math.floor(l*mult*calibration+1e-9)),d:Math.max(0,Math.floor(d*mult*calibration+1e-9)),bL:Math.floor(bL*calibration+1e-9),bD:Math.floor(bD*calibration+1e-9),cap:clamp(cap,1,30)};
  }
  function compileAll(s){return FORMULAS.filter(f=>unlocked(f,s)).map(f=>compile(f,s));}
  /** Exact bounded-integer two-resource knapsack DP, including activation bonuses.
    max Σ_i [ wL*(l_i*x_i + bL_i*[x_i>0]) + wD*(d_i*x_i+bD_i*[x_i>0]) ]
    s.t. Σ m_i*x_i ≤ M, Σ e_i*x_i ≤ E, x_i ∈ {0,..,cap_i}.
    Each DP layer enumerates the bounded integer decision for one formula.
    No heuristics, LP relaxation or rounding of feasible decisions. */
  function solve(forms,M,E,weight=3){
    M=clamp(Math.floor(M),0,200);E=clamp(Math.floor(E),0,220);
    const w=clamp(Number(weight)||3,1,10);
    const stride=E+1,size=(M+1)*stride;
    let old=new Float64Array(size);old.fill(-Infinity);old[0]=0;
    const parents=[],decisions=[];
    let evaluated=0;
    for(const f of forms){
      const next=new Float64Array(size);next.fill(-Infinity);
      const parent=new Int32Array(size);parent.fill(-1);
      const choice=new Uint8Array(size);
      const max=clamp(safeInt(f.cap),0,30);
      for(let m=0;m<=M;m++)for(let e=0;e<=E;e++){
        const from=m*stride+e,base=old[from];if(base===-Infinity)continue;
        const lim=Math.min(max,Math.floor((M-m)/f.m),Math.floor((E-e)/f.e));
        const lower=clamp(safeInt(f.min),0,max);
        for(let x=lower;x<=lim;x++){
          evaluated++;
          const nm=m+f.m*x,ne=e+f.e*x,at=nm*stride+ne;
          const l=f.l*x+(x>0?f.bL:0),d=f.d*x+(x>0?f.bD:0);
          const score=base+l+w*d;
          if(score>next[at]+1e-8){next[at]=score;parent[at]=from;choice[at]=x;}
        }
      }
      parents.push(parent);decisions.push(choice);old=next;
    }
    let best=-Infinity,at=0;
    for(let i=0;i<size;i++) if(old[i]>best+1e-8){best=old[i];at=i;}
    if(best===-Infinity)return {counts:{},l:0,d:0,score:0,usageM:0,usageE:0,M,E,weight:w,evaluated,feasible:false};
    const counts={};let l=0,d=0;
    for(let i=forms.length-1;i>=0;i--){
      const f=forms[i],x=decisions[i][at];counts[f.id]=x;
      l+=f.l*x+(x>0?f.bL:0);d+=f.d*x+(x>0?f.bD:0);
      at=parents[i][at];
      if(at<0)throw new Error('DP reconstruction failed');
    }
    const usageM=forms.reduce((a,f)=>a+f.m*(counts[f.id]||0),0);
    const usageE=forms.reduce((a,f)=>a+f.e*(counts[f.id]||0),0);
    return {counts,l,d,score:l+w*d,usageM,usageE,M,E,weight:w,evaluated,feasible:usageM<=M&&usageE<=E};
  }
  function plan(s){const {m,e}=budgets(s);return solve(compileAll(s),m,e,s.weight);}
  function insight(s){
    const forms=compileAll(s),b=budgets(s),base=solve(forms,b.m,b.e,s.weight);
    const m=solve(forms,b.m+1,b.e,s.weight),e=solve(forms,b.m,b.e+1,s.weight);
    return {base,marginalM:m.score-base.score,marginalE:e.score-base.score};
  }
  function addEvent(s,msg){s.events.unshift(msg);s.events=s.events.slice(0,30);}
  function cycle(s,p,repeat=1){
    const n=clamp(safeInt(repeat,MAX_OFFLINE_CYCLES),0,MAX_OFFLINE_CYCLES);
    if(!n||!p.feasible)return {success:false};
    s.light=clamp(s.light+p.l*n,0,MAX_CURRENCY);s.data=clamp(s.data+p.d*n,0,MAX_CURRENCY);
    s.totalLight=clamp(s.totalLight+p.l*n,0,MAX_CURRENCY);s.totalData=clamp(s.totalData+p.d*n,0,MAX_CURRENCY);
    s.cycles+=n;
    s.lastCycle={l:p.l,d:p.d,usageM:p.usageM,usageE:p.usageE};
    if(n===1){s.history.push({l:p.l,d:p.d});s.history=s.history.slice(-32);}
    else {for(let i=0;i<Math.min(n,32);i++)s.history.push({l:p.l,d:p.d});s.history=s.history.slice(-32);}
    const contract=CONTRACTS[s.contract];
    if(contract&&!s.contractReady&&p.l>=contract.l&&p.d>=contract.d){s.contractReady=true;addEvent(s,`契約「${contract.title}」の条件を達成`);}
    return {success:true,producedL:p.l*n,producedD:p.d*n,contractReady:s.contractReady};
  }
  function claimContract(s){
    const c=CONTRACTS[s.contract];if(!c||!s.contractReady)return {ok:false,reason:'まだ条件を達成していません'};
    s.light=clamp(s.light+c.rewardL,0,MAX_CURRENCY);s.data=clamp(s.data+c.rewardD,0,MAX_CURRENCY);
    for(const chip of c.chips)s.chips[chip]=(s.chips[chip]||0)+1;
    s.contract++;s.contractReady=false;addEvent(s,`契約達成「${c.title}」 — ${c.message}`);
    return {ok:true,contract:c};
  }
  function upgradePrice(s,id){
    const r=RESEARCH_MAP[id];if(!r)return null;
    const lvl=s.upgrades[id];return {l:Math.ceil(r.baseL*Math.pow(r.scale,lvl)),d:Math.ceil(r.baseD*Math.pow(r.scale,lvl))};
  }
  function buyUpgrade(s,id){
    const r=RESEARCH_MAP[id];if(!r)return {ok:false,reason:'研究が存在しません'};
    if(s.upgrades[id]>=r.max)return {ok:false,reason:'最大レベルです'};
    const p=upgradePrice(s,id);
    if(s.light<p.l||s.data<p.d)return {ok:false,reason:'研究資源が不足しています'};
    s.light-=p.l;s.data-=p.d;s.upgrades[id]++;
    addEvent(s,`研究完了「${r.title}」 Lv.${s.upgrades[id]}`);
    return {ok:true};
  }
  function setMinRun(s,formId,count){
    const f=FORMULA_MAP[formId];if(!f||!unlocked(f,s))return {ok:false,reason:'未解放の式です'};
    const compiled=compile(f,s);const val=clamp(safeInt(count),0,compiled.cap);
    const next={...s.minRuns,[formId]:val};const forms=compileAll({...s,minRuns:next});
    const b=budgets(s);
    if(forms.reduce((a,f)=>a+f.m*f.min,0)>b.m||forms.reduce((a,f)=>a+f.e*f.min,0)>b.e)return {ok:false,reason:'物質または電力の制約を超えます'};
    s.minRuns=next;return {ok:true};
  }
  function equippedCount(s,id){return FORMULAS.reduce((a,f)=>a+s.equipped[f.id].filter(x=>x===id).length,0);}
  function equip(s,formId,index,chipId){
    const f=FORMULA_MAP[formId];if(!f||!unlocked(f,s))return {ok:false,reason:'この式は未解放です'};
    if(!Number.isInteger(index)||index<0||index>=1+s.upgrades.slots)return {ok:false,reason:'このスロットは未解放です'};
    if(chipId!==null&&!CHIP_MAP[chipId])return {ok:false,reason:'演算子が存在しません'};
    if(chipId!==null && equippedCount(s,chipId)-(s.equipped[formId][index]===chipId?1:0)>=s.chips[chipId])return {ok:false,reason:'この演算子の空きがありません'};
    s.equipped[formId][index]=chipId;
    return {ok:true};
  }
  function trialUnlocked(s,t){return s.contract>=Math.max(0,t.forms-2);}
  function solveTrial(s,t,opts={}){
    const forms=FORMULAS.slice(0,t.forms).map(f=>compile(f,{...s,upgrades:{matter:0,energy:0,calibration:0,slots:s.upgrades.slots,bandwidth:0}}));
    return solve(forms,t.m,t.e,opts.weight||s.weight);
  }
  function claimTrial(s,trialId){
    const t=TRIALS.find(t=>t.id===trialId);if(!t||!trialUnlocked(s,t))return {ok:false,reason:'試験が未解放です'};
    if(s.trials.includes(trialId))return {ok:false,reason:'この報酬は受取済みです'};
    const p=solveTrial(s,t);
    if(p.l<t.l||p.d<t.d)return {ok:false,reason:'光量と知識の両方の目標に届いていません',plan:p};
    s.trials.push(trialId);s.light+=t.rewardL;s.data+=t.rewardD;
    addEvent(s,`最適化試験「${t.title}」に合格`);
    return {ok:true,plan:p,trial:t};
  }
  function evaluateAchievements(s){
    let newly=[];for(const a of ACHIEVEMENTS)if(!s.achievements.includes(a.id)&&a.req(s)){s.achievements.push(a.id);newly.push(a);}
    return newly;
  }
  function format(n){
    if(!Number.isFinite(Number(n)))return '—';
    if(Math.abs(n)<10000)return Math.floor(n).toLocaleString('ja-JP');
    if(Math.abs(n)<1e7)return (n/10000).toFixed(n<1e5?1:0)+'万';
    if(Math.abs(n)<1e11)return (n/1e8).toFixed(2)+'億';
    return n.toExponential(2).replace('e+',' × 10^');
  }
  return {SAVE_VERSION,CYCLE_MS,MAX_OFFLINE_CYCLES,FORMULAS,CHIPS,CONTRACTS,RESEARCH,TRIALS,ACHIEVEMENTS,FORMULA_MAP,CHIP_MAP,
    initialState,sanitize,budgets,unlocked,compile,compileAll,solve,plan,insight,cycle,claimContract,
    upgradePrice,buyUpgrade,setMinRun,equippedCount,equip,trialUnlocked,solveTrial,claimTrial,evaluateAchievements,format,addEvent};
});
