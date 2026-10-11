import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,emptyState,demoState,monthlyCents,parseCSV,validateState,validDate} from '../dist/model.js';

const now=new Date('2026-10-11T12:00:00');
const income=(amount,frequency='monthly',date='2026-10-01')=>({id:'pay',name:'Take-home pay',amount,frequency,date});
const essential=amount=>({id:'bill',name:'Essential costs',amount,category:'Home'});
const budget=(pay=4000,cost=2000)=>{const s=emptyState();s.incomes=[income(pay)];s.bills=[essential(cost)];return s;};

test('normalizes all pay schedules, distinguishing fortnightly and twice monthly',()=>{
  assert.equal(monthlyCents(income(1000,'weekly'),'2026-10'),433333);
  assert.equal(monthlyCents(income(1000,'biweekly'),'2026-10'),216667);
  assert.equal(monthlyCents(income(1000,'semimonthly'),'2026-10'),200000);
  assert.equal(monthlyCents(income(60000,'yearly'),'2026-10'),500000);
});
test('one-time income only contributes in its own month',()=>{
  assert.equal(monthlyCents(income(500,'once','2026-09-01'),'2026-10'),0);
  assert.equal(monthlyCents(income(500,'once','2026-10-01'),'2026-10'),50000);
});
test('reserves essentials and savings before discretionary spending',()=>{
  const m=calculate(budget(),now);
  assert.equal(m.income,400000);assert.equal(m.essentials,200000);assert.equal(m.future,80000);assert.equal(m.spending,120000);
  assert.equal(m.daysLeft,21);assert.equal(m.daily,5714);
});
test('shortfalls never produce fictional spending or investment allocations',()=>{
  const m=calculate(budget(1000,1600),now);
  assert.equal(m.shortfall,60000);assert.equal(m.remaining,0);assert.equal(m.future,0);assert.equal(m.allocation.invest,0);
});
test('future target is capped by available money',()=>{
  const s=budget(3000,2800);s.settings.futurePercent=50;
  const m=calculate(s,now);assert.equal(m.future,20000);assert.equal(m.spending,0);
});
test('spending filters previous-month and future-dated transactions',()=>{
  const s=budget();s.transactions=[{id:'a',name:'Today',amount:200,category:'Other',date:'2026-10-11'},{id:'b',name:'Old',amount:500,category:'Other',date:'2026-09-30'},{id:'c',name:'Future',amount:500,category:'Other',date:'2026-10-12'}];
  const m=calculate(s,now);assert.equal(m.spent,20000);assert.equal(m.remaining,100000);
});
test('overspending is reported without negative daily allowance',()=>{
  const s=budget();s.transactions=[{id:'expense',name:'Large purchase',amount:1500,category:'Other',date:'2026-10-01'}];
  const m=calculate(s,now);assert.equal(m.overspent,30000);assert.equal(m.remaining,0);assert.equal(m.daily,0);
});
test('suggestions prioritize starter cushion then costly debt',()=>{
  const s=budget(10000,2000);s.settings.highInterestDebt=5000;
  assert.deepEqual(calculate(s,now).allocation,{emergency:100000,debt:100000,goals:0,invest:0});
});
test('completed starter cushion sends available money to high-interest debt',()=>{
  const s=budget();s.settings.emergencySaved=1000;s.settings.highInterestDebt=400;
  assert.deepEqual(calculate(s,now).allocation,{emergency:40000,debt:40000,goals:0,invest:0});
});
test('completed cushion and goals release future budget for investing education',()=>{
  const s=budget();s.settings.emergencySaved=6000;s.goals=[{id:'g',name:'Goal',target:1000,saved:900}];
  assert.deepEqual(calculate(s,now).allocation,{emergency:0,debt:0,goals:10000,invest:70000});
});
test('rounding conserves the budget across varied values',()=>{
  for(let i=0;i<200;i++){const s=budget(i*73.21,i*19.37);s.settings.futurePercent=i%81;s.settings.highInterestDebt=i*8.2;s.settings.emergencySaved=i*12.48;const m=calculate(s,now);
    assert.equal(m.income,m.essentials+m.spending+m.future);
    assert.equal(Object.values(m.allocation).reduce((a,b)=>a+b,0),m.future);
    assert.ok(Object.values(m.allocation).every(v=>Number.isInteger(v)&&v>=0));
  }
});
test('month-end and leap-year daily amounts use correct remaining days',()=>{
  assert.equal(calculate(budget(),new Date('2028-02-28T12:00:00')).daysLeft,2);
  assert.equal(calculate(budget(),new Date('2026-10-31T12:00:00')).daysLeft,1);
});
test('CSV parser accepts quoted names, currency separators, and CRLF',()=>{
  const rows=parseCSV('\uFEFFname,amount,frequency,date\r\n"Design, freelance","$1,200.50",once,2026-10-10\r\n');
  assert.deepEqual(rows,[{name:'Design, freelance',amount:1200.5,frequency:'once',date:'2026-10-10'}]);
});
test('CSV parser rejects missing amounts, unknown frequency, and invalid dates',()=>{
  assert.throws(()=>parseCSV('name,amount,frequency\nSalary,,monthly'));
  assert.throws(()=>parseCSV('name,amount,frequency\nSalary,1000,fortnightly'));
  assert.throws(()=>parseCSV('name,amount,frequency,date\nSalary,1000,monthly,2026-02-30'));
  assert.throws(()=>parseCSV('name,amount,frequency\n"Salary,1000,monthly'));
});
test('backups reject invalid structures, infinite amounts, and duplicate row IDs',()=>{
  assert.equal(validateState(emptyState()),true);assert.equal(validateState(demoState()),true);
  assert.equal(validateState({version:1}),false);
  const s=budget();s.incomes.push(income(2000));assert.equal(validateState(s),false);
  const b=budget();b.settings.highInterestDebt=Infinity;assert.equal(validateState(b),false);
  assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2028-02-29'),true);
});
