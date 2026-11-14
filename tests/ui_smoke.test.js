'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const C=require('../core.js');
const nodes=new Map();
function node(sel){if(!nodes.has(sel))nodes.set(sel,{innerHTML:'',style:{},children:[],firstElementChild:{remove(){}},appendChild(c){this.children.push(c)},value:'',remove(){},click(){}});return nodes.get(sel);}
const listeners={},saved={},messages=[];
const document={querySelector:node,addEventListener(k,fn){listeners[k]=fn},createElement(k){return {className:'',textContent:'',href:'',download:'',style:{},remove(){},click(){}}},body:{appendChild(){}}};
const storage={getItem:k=>saved[k]||null,setItem:(k,v)=>{saved[k]=v}};
const windowObj={FormulaCore:C,scrollY:0,scrollTo() {}};
const ctx={document,window:windowObj,localStorage:storage,navigator:{},location:{protocol:'file:',hostname:''},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:class {},Date,Math,JSON,Number,String,Object,console,setInterval(){},setTimeout(){},clearTimeout(){}};
vm.runInNewContext(fs.readFileSync(require.resolve('../main.js'),'utf8'),ctx,{filename:'main.js'});
assert(node('#view').innerHTML.includes('整数計画ソルバ'));
function click(act,id,extra={}){listeners.click({target:{dataset:{act,id,...extra},closest(){return {dataset:{act,id,...extra}}}}});}
function screen(tab,fragment){click('tab',tab);const text=node('#view').innerHTML;assert(text.includes(fragment),`${tab}: missing ${fragment}`);assert(!text.includes('undefined'),`${tab}: undefined in HTML`);console.log('✓',tab,'rendered',text.length,'characters');}
screen('formulas','最低稼働の制約');
click('min',undefined,{delta:'1'});
click('min',undefined,{delta:'1'});
click('min',undefined,{delta:'1'});
assert(node('#view').innerHTML.includes('x ≥ 3'));
click('tab','command');assert(node('#view').innerHTML.includes('25 / 20'));
click('weight',undefined,{value:'1'});assert(node('#view').innerHTML.includes('λ = 1'));
screen('lab','最適化試験室');
screen('archive','セーブ・設定');
click('tab','formulas');click('open-slot',undefined,{index:'0'});assert(node('#overlay-root').innerHTML.includes('演算子選択')||node('#overlay-root').innerHTML.includes('OPERATOR LIBRARY'));
click('close-modal');assert.equal(node('#overlay-root').innerHTML,'');
click('tab','command');click('pause');assert(node('#view').innerHTML.includes('生産一時停止'));
console.log('UI smoke: PASS (4 tab renders, controls, modal, goal and pause).');
