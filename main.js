/* FORMULA / ARK — UI controller. All production rules live in core.js. */
(function(){
'use strict';
const C=window.FormulaCore;
const KEY='formula-ark-save-v3';
const UI_KEY='formula-ark-ui-v1';
let s, currentPlan, selection={formula:'helios',slot:0}, modal=null, margin=null;
let dirty=false, lastRender=0, resetting=false;
let soundEnabled=false, audioContext=null;
const GUIDE_KEY='formula-ark-guide-v1';
let guideStep=0, guideVisible=true;
try {const g=JSON.parse(localStorage.getItem(GUIDE_KEY)||'{}');guideStep=Math.max(0,Math.min(5,Number(g.step)||0));guideVisible=g.visible!==false;}catch(e){}
function saveGuide(){try{localStorage.setItem(GUIDE_KEY,JSON.stringify({step:guideStep,visible:guideVisible}));}catch(e){}}
const qs=(sel)=>document.querySelector(sel);
const money=(n)=>C.format(n);
const num=(n)=>Number(n).toLocaleString('ja-JP');
const esc=(value)=>String(value).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const icons={
  grid:'<path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/>',
  sigma:'<path d="M18 4H7l6 8-6 8h11"/>',
  flask:'<path d="M9 3h6M10 3v7l-6 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9V3M8 16h8"/>',
  award:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  activity:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  wand:'<path d="m4 20 16-16M14 3l1-2M20 10l2 1M5 4 4 2M18 17l2 2"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  refresh:'<path d="M20 7V3l-4 4M20 7A8 8 0 1 0 21 14"/>',
  file:'<path d="M6 2h9l5 5v15H6zM15 2v6h5M9 12h8M9 16h8"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 19h16"/>',
  upload:'<path d="M12 21V8m-5 5 5-5 5 5M4 5h16"/>',
  alert:'<path d="m12 2 10 18H2L12 2ZM12 9v5M12 17h.01"/>',
  arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-45 12 12)"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  close:'<path d="M5 5 19 19M19 5 5 19"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  gauge:'<path d="M3 16a9 9 0 1 1 18 0M12 14l4-5M9 20h6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 3"/>'
};
function icon(name,cl=''){return `<svg class="btn-icon ${cl}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.orbit}</svg>`;}
const menu=[['command','管制室','grid'],['formulas','式の設計','sigma'],['lab','研究・試験','flask'],['archive','記録','award']];
function readSave(){try {const raw=localStorage.getItem(KEY);return raw?C.sanitize(JSON.parse(raw)):C.initialState();}catch(err){console.warn('Save could not be read',err);return C.initialState();}}
function save(){s.updated=Date.now();try{localStorage.setItem(KEY,JSON.stringify(s));dirty=false;}catch(e){if(!window.__saveWarned){toast('保存に失敗しました。空き容量またはプライベートモードを確認してください。','error');window.__saveWarned=true;}}}
function checkAchievements(){const a=C.evaluateAchievements(s);for(const ach of a){toast('実績解除：'+ach.name,'success');C.addEvent(s,'実績解除「'+ach.name+'」');}}
function replan(announce=false){currentPlan=C.plan(s);s.solves++;margin=null;checkAchievements();dirty=true;if(announce)toast(currentPlan.feasible?'整数計画の最適解を更新しました':'制約により実行可能解がありません',currentPlan.feasible?'success':'error');}
function toast(msg,type='normal'){
  const stack=qs('#toast-stack');if(!stack)return;const element=document.createElement('div');element.className='toast '+type;element.textContent=msg;stack.appendChild(element);
  while(stack.children.length>3)stack.firstElementChild.remove();setTimeout(()=>element.remove(),3800);
}
function playSound(kind='tap'){
  if(!soundEnabled)return;
  try {
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
    audioContext=audioContext||new Context();
    const notes=kind==='win'?[523,659,880]:kind==='build'?[440,660]:[530];
    const t=audioContext.currentTime;
    notes.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=t+i*.075;
      osc.type='sine';osc.frequency.setValueAtTime(freq,at);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.035,at+.016);gain.gain.exponentialRampToValueAtTime(.0001,at+.17);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+.175);
    });
  }catch(e){}
}
function start(){
  try{soundEnabled=JSON.parse(localStorage.getItem(UI_KEY)||'{}').sound===true;}catch(e){}
  s=readSave();selection.formula=s.selected;
  replan();
  const now=Date.now();
  if(!s.paused){const elapsed=Math.max(0,now-s.lastTick);const periods=Math.min(C.MAX_OFFLINE_CYCLES,Math.floor(elapsed/C.CYCLE_MS));
    if(periods>0){const result=C.cycle(s,currentPlan,periods);if(result.success){checkAchievements();if(periods>1)C.addEvent(s,`不在中に${periods}周期を生産（最大12分まで）`);s.lastTick=now-elapsed%C.CYCLE_MS;if(periods>1)toast(`オフライン生産 +${money(result.producedL)} 光量 / +${money(result.producedD)} 知識`,'success');}}
  }else s.lastTick=now;
  save();render();
  document.addEventListener('click',onClick);
  document.addEventListener('change',onChange);
  document.addEventListener('keydown',onKey);
  setInterval(tick,110);
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
function tick(){
  const now=Date.now(),bar=qs('#tick-fill'),time=qs('#tick-countdown');
  if(s.paused){if(bar)bar.style.width='0%';if(time)time.textContent='一時停止中';return;}
  const delta=now-s.lastTick;
  if(delta>=C.CYCLE_MS){
    const count=Math.min(C.MAX_OFFLINE_CYCLES,Math.floor(delta/C.CYCLE_MS));
    s.lastTick=now-(delta%C.CYCLE_MS);
    const r=C.cycle(s,currentPlan,count);if(r.success){checkAchievements();if(s.contractReady&&!window.__missionToastShown){toast('契約の生産条件を達成！ 報酬を受け取りましょう。','success');window.__missionToastShown=true;}save();render(true);}
  }
  if(bar)bar.style.width=`${Math.min(100,Math.max(0,(now-s.lastTick)/C.CYCLE_MS*100))}%`;
  if(time)time.textContent=`次の生産まで ${((C.CYCLE_MS-(now-s.lastTick))/1000).toFixed(1)}s`;
}
function navigate(tab){s.activeTab=tab;save();render();window.scrollTo({top:0,behavior:'instant'});}
function guidePanel(){
 const steps=[
  ['何を目指す？','4秒ごとに「光量 L」と「知識 D」を生産します。契約の2つの目標を両方満たすのが最初のゴールです。','command','契約を見る'],
  ['何が変数？','xᵢ は生産式 i を1周期に何回稼働するかを表す整数変数です。回数そのものはソルバが決定します。','command','稼働計画を見る'],
  ['制約を編集しよう','「式の設計」で「光子圧縮」を選び、最低稼働を3にします。これは xᵢ ≥ 3 という制約を追加する操作です。','formulas','式の設計へ'],
  ['最適解を確認','管制室に戻り、光量・知識と各式の稼働回数を確認。下限を追加すると、ほかの式への配分も変わります。','command','最適解を見る'],
  ['報酬と研究','契約の生産条件を達成したら報酬を受け取ります。「研究・試験」で資源上限や式の性能を強化できます。','lab','研究・試験へ'],
  ['紙の定式化と照合','目的関数は max Z = L + λD、制約は物質・電力の上限と各式の稼働範囲です。下の「数理モデルを見る」で現在の係数を確認できます。','command','数理モデルを見る']
 ];
 if(!guideVisible)return `<div class="guide-reopen"><button class="btn sm soft" data-act="guide-restart">${icon('info')} はじめてガイドを開く</button><button class="btn sm" data-act="model-toggle">${icon('sigma')} 数理モデルを見る</button></div>`;
 const a=steps[guideStep];return `<section class="guide-panel" aria-label="操作チュートリアル"><div class="guide-top"><span class="guide-kicker">GUIDED TUTORIAL · ${guideStep+1} / ${steps.length}</span><button class="btn sm" data-act="guide-hide" aria-label="チュートリアルを閉じる">× 閉じる</button></div><div class="guide-dots">${steps.map((_,i)=>`<span class="${i<=guideStep?'active':''}"></span>`).join('')}</div><h2>${a[0]}</h2><p>${a[1]}</p>${guideStep===2?`<p class="guide-status">現在の光子圧縮の最低稼働：<strong>${s.minRuns.helios||0}</strong> / 3 ${s.minRuns.helios>=3?'✓ 達成':'（「＋」を押してください）'}</p>`:''}<div class="guide-actions"><button class="btn sm soft" data-act="guide-back" ${guideStep===0?'disabled':''}>戻る</button><button class="btn sm" data-act="guide-go" data-id="${a[2]}">${a[3]}</button><button class="btn sm primary" data-act="guide-next">${guideStep===steps.length-1?'完了':'次へ'} ${icon('arrow')}</button></div></section>`;
}
function modelPanel(){
 const b=C.budgets(s),fs=C.compileAll(s),lambda=s.weight;
 const terms=(key)=>fs.map(f=>`${f[key]}x${f.id===fs[0].id?'₁':'₍'+(fs.indexOf(f)+1)+'₎'}`).join(' + ');
 const rows=fs.map((f,i)=>`<tr><td>${i+1}：${esc(f.name)}</td><td>${f.m}</td><td>${f.e}</td><td>${f.l}</td><td>${f.d}</td><td>${f.bL}</td><td>${f.bD}</td><td>${f.min}〜${f.cap}</td><td>${currentPlan.counts[f.id]||0}</td></tr>`).join('');
 return `<section class="model-panel"><div class="flex between center gap8"><h2>現在の数理最適化モデル</h2><button class="btn sm" data-act="model-toggle">閉じる</button></div><p>変数 xᵢ：式 i の整数稼働回数、yᵢ：式 i を1回以上稼働するなら1（それ以外0）</p><div class="model-math">最大化 Z = L + ${lambda}D<br>L = Σ(ℓᵢxᵢ + aᵢyᵢ)、D = Σ(dᵢxᵢ + bᵢyᵢ)<br>Σmᵢxᵢ ≤ ${b.m} （物質）<br>Σeᵢxᵢ ≤ ${b.e} （電力）<br>kᵢ ≤ xᵢ ≤ uᵢ、xᵢ は非負整数<br>yᵢ ≤ xᵢ ≤ uᵢyᵢ、yᵢ ∈ {0,1}</div><p class="caption">定数項は稼働回数に関係なく、1回以上稼働したときだけ発生します。これは起動変数 yᵢ に対応します。</p><div class="model-table-wrap"><table class="model-table"><thead><tr><th>式 i</th><th>mᵢ</th><th>eᵢ</th><th>ℓᵢ</th><th>dᵢ</th><th>aᵢ</th><th>bᵢ</th><th>kᵢ〜uᵢ</th><th>最適 xᵢ</th></tr></thead><tbody>${rows}</tbody></table></div><p class="caption">係数は現在装着中の演算子・研究を反映。右端がソルバの計算結果です。</p></section>`;
}
let modelVisible=false;
function render(keepScroll=false){
  lastRender=Date.now();const y=keepScroll?window.scrollY:0;
  qs('#side-nav').innerHTML=`<p class="side-caption">NAVIGATION</p>${menu.map(([id,name,glyph])=>`<button class="side-link ${s.activeTab===id?'active':''}" data-act="tab" data-id="${id}" aria-current="${s.activeTab===id?'page':'false'}">${icon(glyph)}<span>${name}</span></button>`).join('')}<div class="side-footer">ENGINE : EXACT INTEGER DP<br>NETWORK : OFFLINE READY<br>BUILD 0.9.0 / LOCAL</div>`;
  qs('#bottom-nav').innerHTML=menu.map(([id,name,glyph])=>`<button class="bottom-link ${s.activeTab===id?'active':''}" data-act="tab" data-id="${id}" aria-label="${name}" aria-current="${s.activeTab===id?'page':'false'}">${icon(glyph)}<span>${name}</span></button>`).join('');
  qs('#view').innerHTML=guidePanel()+(modelVisible?modelPanel():'')+(s.activeTab==='command'?renderCommand():s.activeTab==='formulas'?renderFormulas():s.activeTab==='lab'?renderLab():renderArchive())+'<div class="footer-note">FORMULA / ARK · 独立したオフラインゲーム · 数式と制約が、次の航路を決める。</div>';
  if(keepScroll&&Math.abs(window.scrollY-y)>2)window.scrollTo({top:y,behavior:'instant'});
}
function pageHeading(k,title,desc,aside=''){return `<div class="page-head"><div><div class="eyebrow">${k}</div><h1>${title}</h1><p>${desc}</p></div><div class="head-aside">${aside}</div></div>`;}
function section(no,title,right=''){return `<div class="section-title"><h2><span class="index">${no}&nbsp; / &nbsp;</span>${title}</h2>${right?`<small>${right}</small>`:''}</div>`;}
function progress(label,val,target,isData=false){return `<div class="progress-row"><span class="progress-name">${label}</span><div class="progress-track"><span class="progress-fill ${isData?'bluefill':''}" style="width:${Math.min(100,val/target*100)}%"></span></div><span class="progress-value mono">${money(val)} / ${money(target)}</span></div>`;}
function renderCommand(){
  const p=currentPlan,b=C.budgets(s),c=C.CONTRACTS[s.contract],solved=p.feasible;
  let mission=c?`<div class="panel contract"><div class="contract-header"><div><div class="mission-step">CONTRACT ${String(s.contract+1).padStart(2,'0')} / ${String(C.CONTRACTS.length).padStart(2,'0')}</div><h2 class="mission-title">${esc(c.title)}</h2><div class="mission-desc">${esc(c.sub)}</div></div><span class="pill ${s.contractReady?'good':'cool'}">${s.contractReady?'達成':'進行中'}</span></div>${progress('光量',p.l,c.l)}${progress('知識',p.d,c.d,true)}<div class="contract-claim"><div class="rewards">報酬：光量 +${num(c.rewardL)} / 知識 +${num(c.rewardD)}<br>${c.formula?`新たな数式「${C.FORMULA_MAP[c.formula].name}」`:'メイン航路完了'} + 演算子</div><button class="btn ${s.contractReady?'primary':'soft'}" data-act="claim" ${!s.contractReady?'disabled':''}>${s.contractReady?'報酬を受け取る':'生産条件を達成する'} ${icon('arrow')}</button></div></div>`:
    `<div class="panel contract"><span class="pill good">ALL CONTRACTS COMPLETE</span><h2 class="mission-title">航路完全踏破</h2><p class="mission-desc">すべてのメイン契約を達成しました。研究・最適化試験・実績のコンプリートに挑戦できます。</p><div class="contract-done">${icon('check')}　数式航路のメインミッションをクリアしました。</div></div>`;
  const helper=!p.feasible?'最低稼働の制約が物質か電力の上限を超えています。「式の設計」で下限を減らしてください。':
    c&&p.l<c.l?'光量が不足しています。光子圧縮の最低稼働回数を増やすか、出力係数を強化しましょう。':
    c&&p.d<c.d?'知識が不足しています。観測演算の最低稼働を増やすか、知識を重視する設定に変更しましょう。':
    c?'目標を満たす最適解が見つかりました。次の生産周期で契約を達成します。':
    '完了済み。係数校正や新しい演算子で、さらに効率的な数式を探求しましょう。';
  return `${pageHeading('COMMAND DECK','数式航路を、最適化する。','資源と数式を設計し、ソルバの最適解で船を前進させよう。',`<span class="pill good">${icon('check')} LOCAL ENGINE</span>`)}
  <div class="panel hero"><div class="hero-content"><span class="eyebrow">THE EQUATION ENGINE IS ONLINE</span><h1>世界は、<br><span>式から生まれる。</span></h1><p>限られた資源。無限の組み合わせ。<br>正しい数式が、航路を切り拓く。</p><button class="btn hero-button" data-act="tab" data-id="formulas">${icon('sigma')} 数式を設計する ${icon('arrow')}</button></div><div class="orbit" aria-hidden="true"><div class="orbit-ring r1"></div><div class="orbit-ring r2"></div><div class="orbit-ring r3"></div><div class="orbit-core"><b>Σ</b></div><div class="orbit-small">∑ xᵢ · fᵢ → max Z</div></div></div>
  ${section('01','生成資源',s.paused?'生産一時停止':'4秒ごとに最適化計画を実行')}
  <div class="grid-2"><div class="panel stat-card"><div class="flex between center"><span class="label">光量 / LUMEN</span><span class="gold">✧</span></div><div class="stat-value mono gold">${money(s.light)}</div><div class="rate mono">+${money(p.l)} / cycle</div></div><div class="panel stat-card"><div class="flex between center"><span class="label">知識 / INSIGHT</span><span class="blue">⌁</span></div><div class="stat-value mono blue">${money(s.data)}</div><div class="rate data mono">+${money(p.d)} / cycle</div></div></div>
  <div class="panel" style="padding:14px 20px;margin-top:13px"><div class="flex between center" style="margin-bottom:9px"><div class="flex center gap8"><span class="opt-badge">${solved?'OPTIMAL SOLUTION':'INFEASIBLE'}</span><span id="tick-countdown" class="muted tiny">次の生産まで 4.0s</span></div><button data-act="pause" class="mini-action">${s.paused?'▶ 再開':'Ⅱ 一時停止'}</button></div><div class="tick-progress"><div id="tick-fill"></div></div></div>
  ${section('02','今の契約と目標')}${mission}
  <div class="split" style="margin-top:16px"><div>${renderPlanner(p,b,helper)}</div><div>${renderOptimizer(p)}</div></div>
  ${section('03','生産履歴','直近32周期')}${renderHistory()}`;
}
function renderPlanner(p,b,helper){
  return `<div class="panel panel-inner"><div class="flex between center"><div><h3 class="panel-title">整数計画ソルバ</h3><div class="panel-sub">有限資源の下で、生産目的関数を最大化</div></div><span class="pill ${p.feasible?'good':'warn'}">${p.feasible?'OPTIMAL':'INFEASIBLE'}</span></div><div class="budget"><div class="budget-chip"><span class="label">物質 / M</span><div class="big mono">${p.usageM}<small> / ${b.m}</small></div><div class="small-track"><b style="width:${Math.min(100,p.usageM/b.m*100)}%"></b></div></div><div class="budget-chip"><span class="label">電力 / E</span><div class="big mono">${p.usageE}<small> / ${b.e}</small></div><div class="small-track"><b style="width:${Math.min(100,p.usageE/b.e*100)}%"></b></div></div></div><div class="plan-headline"><span class="label">最大目的値 Z*</span><span class="score mono">${money(p.score)}</span></div><div class="small muted mono">maximize Z = L + ${s.weight}D</div><div class="plan-list">${C.compileAll(s).map(f=>{const data=C.FORMULA_MAP[f.id],n=p.counts[f.id]||0;return `<div class="plan-line"><div><div class="formula-name">${esc(f.name)}</div><div class="formula-sub mono">x ≥ ${f.min} · max ${f.cap}</div></div><div class="planbar"><b style="width:${f.cap?n/f.cap*100:0}%;--bar-color:${data.color}"></b></div><span class="plan-num mono">${n}<span class="faint tiny">/${f.cap}</span></span></div>`}).join('')}</div><div class="hint">${icon('info')} ${helper}</div><div class="divider"></div><div class="flex between center gap8 wrap"><span class="muted tiny">評価した状態遷移：${num(p.evaluated)}</span><button class="btn sm soft" data-act="replan">${icon('refresh')} 再最適化</button></div></div>`;
}
function renderOptimizer(p){
  const btns=[1,2,3,5,8];
  return `<div class="panel panel-inner"><div class="flex between center"><h3 class="panel-title">目的関数を調整する</h3><span class="pill cool">MULTI-OBJECTIVE</span></div><div class="panel-sub">知識の評価重みを変えると、最適な資源配分が変化します。</div><div class="equation" style="margin-top:13px">max&nbsp; Z = <span>L</span> + <span>λ</span> D<br><span class="muted small">λ = ${s.weight}</span></div><div class="weight-tabs">${btns.map(n=>`<button class="weight-chip ${s.weight===n?'active':''}" data-act="weight" data-value="${n}" aria-pressed="${s.weight===n}">λ=${n}<small>${n===1?'光量':n===2?'やや光':n===3?'標準':n===5?'知識': '研究'}</small></button>`).join('')}</div><div class="explanation">目的値が最大でも、契約に必要な両方の生産量が足りるとは限りません。式ごとの「最低稼働」を制約として追加することが攻略の鍵です。</div><div class="divider"></div><div class="flex between center"><h3 class="panel-title">制約の感度分析</h3><button class="btn sm" data-act="insight">${icon('gauge')} 解析</button></div><div class="panel-sub">物質または電力が1だけ増えると、最適目的値はどれだけ改善するか。</div>${margin?`<div class="margin-line"><div class="margin-stat"><span class="label">物質 +1 の価値</span><strong class="mono">+${num(margin.marginalM)}</strong><span class="tiny muted">目的値 Z の変化</span></div><div class="margin-stat"><span class="label">電力 +1 の価値</span><strong class="mono">+${num(margin.marginalE)}</strong><span class="tiny muted">目的値 Z の変化</span></div></div><p class="caption">整数最適化で再計算した差分です。線形計画の双対価格とは異なります。</p>`:`<p class="hint">［解析］を押すと、制約を緩めた最適化問題を2回解き、改善量を表示します。</p>`}</div>`;
}
function renderHistory(){
  const history=s.history.length?s.history:[{l:currentPlan.l,d:currentPlan.d}];
  const max=Math.max(1,...history.map(x=>Math.max(x.l,x.d)));
  const space=490/(Math.max(32,history.length)),bars=history.map((h,i)=>{const x=4+i*space,lh=Math.max(1,h.l/max*73),dh=Math.max(1,h.d/max*73);return `<rect x="${x}" y="${80-lh}" width="${Math.max(3,space*.31)}" height="${lh}" rx="1" fill="#e9ae6b" opacity=".88"/><rect x="${x+space*.33}" y="${80-dh}" width="${Math.max(3,space*.31)}" height="${dh}" rx="1" fill="#8abcfb" opacity=".85"/>`}).join('');
  return `<div class="panel panel-inner"><div class="flex between center"><div class="flex center gap12"><span class="tiny gold">■ 光量</span><span class="tiny blue">■ 知識</span></div><span class="faint tiny">LAST ${s.history.length} CYCLES</span></div><div class="chart-box"><svg class="chart-svg" viewBox="0 0 500 86" preserveAspectRatio="none" role="img" aria-label="最近の生産量履歴。オレンジが光量、青が知識"><path d="M0 80H500 M0 41H500" fill="none" stroke="#7890b1" stroke-opacity=".16" stroke-dasharray="4 5"/>${bars}</svg></div><div class="history-labels"><span>PAST</span><span>NOW</span></div></div>`;
}
function formulaSummary(f){const isOpen=C.unlocked(f,s),live=isOpen?C.compile(f,s):null,active=s.selected===f.id;
  return `<button class="formula-choice ${active?'active':''} ${!isOpen?'locked':''}" data-act="select-formula" data-id="${f.id}" ${!isOpen?'disabled':''} style="--sigil-bg:${f.color}18;--sigil-color:${f.color}"><span class="formula-sigil">${esc(f.sigil)}</span><div><div class="choice-name">${esc(f.name)}</div><div class="choice-en">${esc(f.en)}</div></div><div class="choice-stat">${isOpen?`<strong class="mono">${currentPlan.counts[f.id]||0}/${live.cap}</strong><small>稼働数</small>`:icon('lock')}</div></button>`;
}
function renderFormulas(){
  const f=C.FORMULA_MAP[s.selected]||C.FORMULAS[0],active=C.unlocked(f,s)?f:C.FORMULAS[0];if(active.id!==s.selected)s.selected=active.id;
  const comp=C.compile(active,s),chips=s.equipped[active.id],avail=1+s.upgrades.slots;
  return `${pageHeading('EQUATION EDITOR','式の設計','演算子の装着と稼働下限制約を編集し、生産モデルそのものを改造しよう。')}
  <div class="formula-layout"><div><div class="flex between center" style="margin-bottom:12px"><span class="eyebrow">FORMULA LIBRARY</span><span class="muted tiny">${C.compileAll(s).length} / ${C.FORMULAS.length} 解放済</span></div><div class="formula-list">${C.FORMULAS.map(formulaSummary).join('')}</div><div class="explanation formula-how"><div class="title">数式編集のヒント</div>最低稼働回数はソルバにとって必ず守るべき制約です。一方、演算子は数式の係数・定数項・消費資源・最大稼働数を変化させます。<p>上限を超える指定はできません。いろいろな組合せで最大目的値と契約達成条件を両立させてください。</p></div></div>
  <div><div class="panel"><div class="editor-top"><div class="editor-head"><div class="editor-sigil" style="--sigil-bg:${active.color}18;--sigil-color:${active.color}">${esc(active.sigil)}</div><div><span class="eyebrow">FORMULA ${active.no} / ${esc(active.en)}</span><h2>${esc(active.name)}</h2><span class="muted small">${esc(active.about)}</span></div></div><div class="equation"><div><span>L</span>(x) = ${comp.l}x ${comp.bL?`+ ${comp.bL}·[x&gt;0]`:''}</div><div><span style="color:var(--blue)">D</span>(x) = ${comp.d}x ${comp.bD?`+ ${comp.bD}·[x&gt;0]`:''}</div></div><div class="muted tiny" style="text-align:center;margin-top:10px">x ∈ ℤ, &nbsp; ${comp.min} ≤ x ≤ ${comp.cap}</div></div>
  <div class="formula-editor"><div class="flex between center"><div class="panel-title">最低稼働の制約</div><span class="pill cool mono">x ≥ ${comp.min}</span></div><p class="caption" style="margin:5px 0">必ずこの回数以上稼働させます。ほかの式への資源配分が変わります。</p><div class="min-control"><span class="label">稼働下限 / MIN RUNS</span><div class="stepper"><button aria-label="最低稼働を1減らす" data-act="min" data-delta="-1">−</button><strong class="mono">${comp.min}</strong><button aria-label="最低稼働を1増やす" data-act="min" data-delta="1">+</button></div></div><div class="metrics-table"><div class="metric"><span>物質 / 1稼働</span><strong class="mono">${comp.m} M</strong></div><div class="metric"><span>電力 / 1稼働</span><strong class="mono">${comp.e} E</strong></div><div class="metric"><span>現在の最適稼働</span><strong class="mono">${currentPlan.counts[active.id]||0} / ${comp.cap}</strong></div><div class="metric"><span>現在の式出力（光量 / 知識）</span><strong class="mono">${comp.l*(currentPlan.counts[active.id]||0)+((currentPlan.counts[active.id]||0)>0?comp.bL:0)} / ${comp.d*(currentPlan.counts[active.id]||0)+((currentPlan.counts[active.id]||0)>0?comp.bD:0)}</strong></div></div><div class="flex between center"><h3 class="panel-title">演算子スロット</h3><span class="muted tiny">${avail} / 3 利用可能</span></div><div class="chip-slots">${[0,1,2].map(i=>`<button class="slot ${chips[i]?'filled':''} ${i>=avail?'locked':''}" data-act="open-slot" data-index="${i}" ${i>=avail?'disabled':''}>${i>=avail?icon('lock'):`<span style="font-size:19px">${chips[i]?esc(C.CHIP_MAP[chips[i]].symbol):'+'}</span>`}<span>${i>=avail?'研究で解放':chips[i]?esc(C.CHIP_MAP[chips[i]].name):'演算子を装着'}</span><span class="slot-label">SLOT ${i+1}</span></button>`).join('')}</div><div class="divider"></div><div class="flex gap8 wrap"><button class="btn primary" data-act="tab" data-id="command">${icon('check')} 管制室で結果を見る</button><button class="btn" data-act="clear-min">最低稼働をすべて解除</button></div></div></div>
  ${section('02','所有する演算子',`${C.CHIPS.reduce((a,c)=>a+s.chips[c.id],0)} 枚`)}<div class="inventory">${C.CHIPS.map(c=>{const owned=s.chips[c.id],free=owned-C.equippedCount(s,c.id);return `<button class="chip-item ${owned?'':'unowned'}" data-act="open-slot" data-index="0" ${owned?'':'disabled'}><div class="chip-head"><span class="symbol">${esc(c.symbol)}</span><span class="chip-qty">${free} / ${owned}</span></div><strong>${esc(c.name)}</strong><div class="description">${esc(c.desc)}</div></button>`}).join('')}</div></div></div>`;
}
function renderLab(){
  return `${pageHeading('RESEARCH & TRIALS','研究と最適化試験','恒久的な拡張で制約を緩め、特殊な条件下でも最適解を探そう。')}
  <div class="grid-2"><div class="panel stat-card"><div class="label">所持光量 / LUMEN</div><div class="stat-value mono gold">${money(s.light)}</div></div><div class="panel stat-card"><div class="label">所持知識 / INSIGHT</div><div class="stat-value mono blue">${money(s.data)}</div></div></div>
  ${section('01','研究設備',`5種類の恒久研究`)}<div class="research-grid">${C.RESEARCH.map(r=>{const lvl=s.upgrades[r.id],p=C.upgradePrice(s,r.id),capped=lvl>=r.max,buyable=!capped&&s.light>=p.l&&s.data>=p.d;return `<div class="panel research-card"><div class="research-header"><span class="research-icon">${icon(r.id==='matter'?'layers':r.id==='energy'?'bolt':r.id==='slots'?'chip':r.id==='bandwidth'?'gauge':'orbit')}</span><span class="research-lvl mono">LV ${lvl} / ${r.max}</span></div><h3>${r.title}</h3><p>${r.desc}</p><div class="bottom"><div class="price mono">${capped?'MAX LEVEL':`✧ ${money(p.l)}${p.d?`<br><span class="data">⌁ ${money(p.d)}</span>`:''}`}</div><button class="btn ${buyable?'primary':''} sm" data-act="buy" data-id="${r.id}" ${buyable?'':'disabled'}>${capped?'最大':'研究する'} ${icon('arrow')}</button></div></div>`}).join('')}</div>
  ${section('02','最適化試験室','独立した資源制約で腕試し')}
  <div class="explanation"><div class="title">試験ルール</div>現在の演算子、稼働下限、目的関数の重みは試験にも適用されます。ただし研究設備による物質・電力増加、係数校正、並列制御の強化は無効です。試験に合った数式を設計しましょう。各試験の報酬は一度だけ受け取れます。</div>
  <div class="trial-list" style="margin-top:13px">${C.TRIALS.map((t,i)=>{const open=C.trialUnlocked(s,t),complete=s.trials.includes(t.id),p=open?C.solveTrial(s,t):null,ready=p&&p.feasible&&p.l>=t.l&&p.d>=t.d;return `<div class="panel trial-card"><div class="trial-top"><div><div class="eyebrow">TRIAL ${String(i+1).padStart(2,'0')}</div><h3>${esc(t.title)}</h3><div class="caption">${esc(t.subtitle)}</div></div><span class="pill ${complete?'good':!open?'warn':ready?'good':'cool'}">${complete?'合格済':!open?'LOCKED':ready?'合格条件達成':'挑戦可能'}</span></div><div class="trial-body"><div><div class="trial-values"><span>物質 <b>${t.m}</b></span><span>電力 <b>${t.e}</b></span><span>数式 <b>${t.forms}種</b></span></div><div style="margin-top:11px">${open?`<div class="small muted">現在の試験解：<span class="gold mono">L ${p.l}/${t.l}</span> &nbsp; <span class="blue mono">D ${p.d}/${t.d}</span></div>`:`<div class="small muted">契約 ${Math.max(1,t.forms-2)} 以降に解放</div>`}</div><div class="small muted" style="margin-top:5px">初回報酬：光量+${t.rewardL} / 知識+${t.rewardD}</div></div><button class="btn ${ready&&!complete?'primary':''}" data-act="trial" data-id="${t.id}" ${(!open||complete)?'disabled':''}>${complete?'獲得済':ready?'合格・報酬受取':'解を判定'} ${icon('arrow')}</button></div></div>`}).join('')}</div>`;
}
function renderArchive(){const completed=s.achievements.length;
 return `${pageHeading('LOGBOOK','航路の記録','数式の研究記録、達成した実績、ローカルセーブの管理。')}
 <div class="archive-grid"><div class="panel archive-stat"><div class="label">生産周期</div><strong class="mono">${money(s.cycles)}</strong><span class="muted tiny">CYCLES</span></div><div class="panel archive-stat"><div class="label">最適化回数</div><strong class="mono">${money(s.solves)}</strong><span class="muted tiny">SOLVES</span></div><div class="panel archive-stat"><div class="label">契約</div><strong class="mono">${s.contract}/${C.CONTRACTS.length}</strong><span class="muted tiny">CONTRACTS</span></div></div>
 ${section('01','累計の生産記録')}<div class="grid-2"><div class="panel stat-card"><div class="label">累計光量</div><div class="stat-value mono gold">${money(s.totalLight)}</div></div><div class="panel stat-card"><div class="label">累計知識</div><div class="stat-value mono blue">${money(s.totalData)}</div></div></div>
 ${section('02','実績',`${completed} / ${C.ACHIEVEMENTS.length} 解除`)}<div class="achievements">${C.ACHIEVEMENTS.map(a=>{const yes=s.achievements.includes(a.id);return `<div class="achievement ${yes?'earned':''}"><div class="ach-symbol">${yes?'✧':'◇'}</div><strong>${a.name}</strong><p>${a.desc}</p></div>`}).join('')}</div>
 ${section('03','プレイガイド')}<div class="panel guide"><div class="guide-step"><span class="guide-number">1</span><div><strong>数式を最適化する</strong><p>「物質」と「電力」は1周期ごとの供給上限です。ソルバはこれらを超えない整数の稼働回数を選び、Z = 光量 + λ×知識 を最大化します。</p></div></div><div class="guide-step"><span class="guide-number">2</span><div><strong>制約を設計する</strong><p>単純な加重和の最大化は、一方の資源に偏る場合があります。式の最低稼働 x≥k を指定することで、必ず稼働する式を決められます。</p></div></div><div class="guide-step"><span class="guide-number">3</span><div><strong>演算子を収集する</strong><p>契約に合格すると新たな式と演算子を獲得します。演算子を装着すると生産係数や初回起動時の定数項、資源制約、稼働上限が変化します。</p></div></div><div class="guide-step"><span class="guide-number">4</span><div><strong>知識と光量を再投資する</strong><p>研究で物質・電力を増強し、係数校正や構文スロットを解放します。最適化試験では研究による強化が制限され、式の設計力が問われます。</p></div></div></div>
 ${section('04','最近の航路ログ')}<div class="panel panel-inner"><ul class="activity">${s.events.length?s.events.slice(0,10).map(e=>`<li>${esc(e)}</li>`).join(''):'<li>まだ記録はありません。最初の生産周期を開始してください。</li>'}</ul></div>
 ${section('05','セーブ・設定')}<div class="panel panel-inner"><div class="panel-title">ローカルセーブ</div><p class="caption">この端末のブラウザ内に自動保存されます。バックアップはJSONで書き出し、別の端末でも読み込めます。</p><div class="flex gap8 wrap" style="margin-top:12px"><button class="btn soft" data-act="export">${icon('download')} セーブを書き出す</button><button class="btn" data-act="import">${icon('upload')} セーブを読み込む</button><input id="import-save" type="file" accept="application/json,.json" style="display:none" aria-label="セーブファイルを選択"></div><div class="divider"></div><div class="flex between center gap12 wrap"><span class="caption">アニメーションを減らすには、端末のアクセシビリティ設定から「視差効果を減らす」を有効にしてください。</span><div class="flex gap8 wrap"><button class="btn sm" data-act="sound" aria-pressed="${soundEnabled}">効果音：${soundEnabled?'ON':'OFF'}</button><button class="btn sm" data-act="pause">${s.paused?'生産を再開':'生産を一時停止'}</button></div></div></div><div class="danger-zone" style="margin-top:14px"><div class="panel-title rose">初期化</div><p>すべてのゲーム進行と実績を削除して、最初から開始します。先にセーブを書き出すことをおすすめします。</p><button class="btn danger" data-act="reset">${icon('alert')} 全進行を初期化</button></div>`;
}
function openSlot(index){selection={formula:s.selected,slot:index};modal='chip';renderModal();}
function renderModal(){
 if(!modal){qs('#overlay-root').innerHTML='';return;}
 if(modal==='chip'){
 const index=selection.slot,form=C.FORMULA_MAP[selection.formula],current=s.equipped[form.id][index];
 qs('#overlay-root').innerHTML=`<div class="overlay" data-act="outside"><div class="modal" role="dialog" aria-modal="true" aria-label="演算子選択"><div class="modal-header"><div><div class="eyebrow">OPERATOR LIBRARY</div><h2>${esc(form.name)} · SLOT ${index+1}</h2><div class="caption">装着する演算子を選択。選択中の演算子を外してから付け替えることもできます。</div></div><button class="modal-close" data-act="close-modal" aria-label="閉じる">×</button></div><div class="modal-chip-list"><button class="modal-chip" data-act="equip" data-id="none"><div><b>空のスロット</b><p>演算子を外す</p></div><span class="chip-mark">∅</span></button>${C.CHIPS.filter(c=>s.chips[c.id]>0).map(c=>{const free=s.chips[c.id]-C.equippedCount(s,c.id)+(current===c.id?1:0);return `<button class="modal-chip" data-act="equip" data-id="${c.id}" ${free<=0?'disabled':''}><div><b>${esc(c.name)} ${current===c.id?'<span class="pill good">装着中</span>':''}</b><p>${esc(c.desc)}</p><div class="tiny muted" style="margin-top:6px">利用可能：${free} / 所有 ${s.chips[c.id]}</div></div><span class="chip-mark">${esc(c.symbol)}</span></button>`}).join('')}</div></div></div>`;
 }
 if(modal==='reset')qs('#overlay-root').innerHTML=`<div class="overlay" data-act="outside"><div class="modal" role="alertdialog" aria-modal="true" aria-label="進行初期化の確認"><div class="eyebrow">CONFIRM RESET</div><h2>最初から航路を始めますか？</h2><p class="caption">現在の光量・知識・数式・演算子・研究・実績・試験結果はすべて失われます。この操作は元に戻せません。</p><div class="flex gap8" style="margin-top:22px"><button class="btn" data-act="close-modal">キャンセル</button><button class="btn danger" data-act="reset-confirm">完全に初期化する</button></div></div></div>`;
}
function closeModal(){modal=null;renderModal();}
function onClick(e){
 const el=e.target.closest('[data-act]');if(!el)return;
 const act=el.dataset.act,id=el.dataset.id;
 if(act==='outside'){if(e.target===el)closeModal();return;}
 if(act==='close-modal'){closeModal();return;}
 if(act==='tab'){closeModal();navigate(id);return;}
 if(act==='weight'){s.weight=Number(el.dataset.value);replan();save();render(true);return;}
 if(act==='pause'){s.paused=!s.paused;s.lastTick=Date.now();save();render(true);toast(s.paused?'生産を一時停止しました':'生産を再開しました');return;}
 if(act==='replan'){replan(true);save();render(true);return;}
 if(act==='insight') {if(!currentPlan.feasible){toast('実行可能な制約へ戻してください','error');return;}margin=C.insight(s);save();render(true);return;}
 if(act==='claim'){
   const r=C.claimContract(s);if(!r.ok){toast(r.reason,'error');return;}
   window.__missionToastShown=false;replan();checkAchievements();save();render(true);playSound('win');toast('契約クリア！ '+r.contract.message,'success');return;
 }
 if(act==='select-formula'){s.selected=id;save();render(true);return;}
 if(act==='min'){
   const f=C.FORMULA_MAP[s.selected],compiled=C.compile(f,s),target=compiled.min+Number(el.dataset.delta);
   const r=C.setMinRun(s,f.id,target);
   if(!r.ok){toast(r.reason,'error');return;}
   replan();save();render(true);return;
 }
 if(act==='clear-min'){for(const f of C.FORMULAS)s.minRuns[f.id]=0;replan();save();render(true);toast('すべての稼働下限制約を解除しました');return;}
 if(act==='open-slot'){openSlot(Number(el.dataset.index));return;}
 if(act==='equip'){
   const r=C.equip(s,selection.formula,selection.slot,id==='none'?null:id);
   if(!r.ok){toast(r.reason,'error');return;}
   closeModal();replan();save();render(true);playSound('build');toast('数式に演算子を適用しました','success');return;
 }
 if(act==='buy'){
   const r=C.buyUpgrade(s,id);if(!r.ok){toast(r.reason,'error');return;}
   replan();save();render(true);playSound('build');toast('研究が完了しました','success');return;
 }
 if(act==='trial'){
   const r=C.claimTrial(s,id);if(!r.ok){toast(r.reason,'error');return;}
   checkAchievements();save();render(true);playSound('win');toast('最適化試験合格！ 光量と知識を獲得','success');return;
 }
 if(act==='guide-hide'){guideVisible=false;saveGuide();render(true);return;}
 if(act==='guide-restart'){guideVisible=true;guideStep=0;saveGuide();render();return;}
 if(act==='guide-back'){guideStep=Math.max(0,guideStep-1);saveGuide();render(true);return;}
 if(act==='guide-next'){if(guideStep===2&&(s.minRuns.helios||0)<3){toast('まず光子圧縮の最低稼働を3に設定してください','error');navigate('formulas');return;}if(guideStep===5){guideVisible=false;}else guideStep++;saveGuide();render(true);return;}
 if(act==='guide-go'){if(guideStep===5){modelVisible=true;navigate('command');}else navigate(id);return;}
 if(act==='model-toggle'){modelVisible=!modelVisible;render(true);return;}
 if(act==='sound'){
   soundEnabled=!soundEnabled;try{localStorage.setItem(UI_KEY,JSON.stringify({sound:soundEnabled}));}catch(e){}
   if(soundEnabled)playSound('build');render(true);toast(soundEnabled?'効果音を有効にしました':'効果音を無効にしました');return;
 }
 if(act==='export'){
   const str=JSON.stringify({game:'FORMULA / ARK',exportedAt:new Date().toISOString(),save:s},null,2),blob=new Blob([str],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='formula-ark-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('セーブデータを書き出しました','success');return;
 }
 if(act==='import'){qs('#import-save')?.click();return;}
 if(act==='reset'){modal='reset';renderModal();return;}
 if(act==='reset-confirm'){
   s=C.initialState();s.lastTick=Date.now();closeModal();replan();save();render();window.scrollTo({top:0});toast('新しい航路を開始しました','success');return;
 }
}
async function onChange(e){
 if(e.target.id==='import-save'&&e.target.files?.length){
   try{const raw=JSON.parse(await e.target.files[0].text()),data=raw?.save||raw;
     if(!data||data.version!==C.SAVE_VERSION)throw new Error('対応していないセーブ形式です');
     if(!window.confirm('現在のセーブデータを読み込んだデータで置き換えますか？'))return;
     s=C.sanitize(data);s.lastTick=Date.now();replan();save();render();toast('セーブデータを読み込みました','success');
   }catch(err){toast('読み込み失敗：'+err.message,'error');}
   e.target.value='';
 }
}
function onKey(e){
 if(e.key==='Escape'&&modal){closeModal();return;}
 if(modal||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select'))return;
 if(['1','2','3','4'].includes(e.key)){navigate(menu[Number(e.key)-1][0]);}
}
start();
})();
