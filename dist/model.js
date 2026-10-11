export const FREQUENCIES = { monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Every 2 weeks', semimonthly: 'Twice a month', yearly: 'Yearly', once: 'One time' };
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const cents = n => Math.round(Number(n) * 100);
export const dollars = n => n / 100;
export const validAmount = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e9;
export const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(new Date(`${s}T12:00:00`)) === s;
export function monthlyCents(income, month) {
  const factors = { monthly: 1, weekly: 52/12, biweekly: 26/12, semimonthly: 2, yearly: 1/12 };
  return income.frequency === 'once' ? (income.date?.slice(0,7) === month ? cents(income.amount) : 0) : Math.round(cents(income.amount) * (factors[income.frequency] || 0));
}
export function calculate(state, now = new Date()) {
  const month = localDate(now).slice(0,7);
  const income = state.incomes.reduce((sum,i) => sum + monthlyCents(i,month),0);
  const essentials = state.bills.reduce((sum,b) => sum + cents(b.amount),0);
  const leftover = Math.max(0,income-essentials);
  const future = Math.min(leftover,Math.round(income * state.settings.futurePercent / 100));
  const spending = leftover-future;
  const transactions = state.transactions.filter(t => t.date.slice(0,7) === month && t.date <= localDate(now));
  const spent = transactions.reduce((sum,t)=>sum+cents(t.amount),0);
  const remaining = Math.max(0,spending-spent);
  const overspent = Math.max(0,spent-spending);
  const daysLeft = new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()+1;
  const emergencyTarget = essentials * state.settings.emergencyMonths;
  const cushion = cents(state.settings.emergencySaved);
  const starterGap = Math.max(0,Math.min(emergencyTarget,100000)-cushion);
  const cushionGap = Math.max(0,emergencyTarget-cushion);
  let available = future;
  const starter = Math.min(available,starterGap); available -= starter;
  const debt = Math.min(available,cents(state.settings.highInterestDebt)); available -= debt;
  const emergencyExtra = Math.min(available,Math.max(0,cushionGap-starter)); available -= emergencyExtra;
  const goalGap = state.goals.reduce((sum,g)=>sum+Math.max(0,cents(g.target)-cents(g.saved)),0);
  const goals = Math.min(available,goalGap); available -= goals;
  return {month,income,essentials,leftover,future,spending,spent,remaining,overspent,daysLeft,daily:Math.floor(remaining/daysLeft),shortfall:Math.max(0,essentials-income),emergencyTarget,cushion,transactions,allocation:{emergency:starter+emergencyExtra,debt,goals,invest:available}};
}
export function emptyState() {
  return { version:1,demo:false,incomes:[],bills:[],transactions:[],goals:[],settings:{currency:'USD',futurePercent:20,emergencySaved:0,emergencyMonths:3,highInterestDebt:0} };
}
export function demoState() {
  const state=emptyState(); state.demo=true;
  state.incomes=[{id:'salary',name:'Full-time salary',amount:4200,frequency:'monthly',date:localDate()},{id:'freelance',name:'Freelance projects',amount:600,frequency:'monthly',date:localDate()}];
  state.bills=[{id:'rent',name:'Rent & home',amount:1400,category:'Home'},{id:'groceries',name:'Groceries',amount:360,category:'Food'},{id:'utilities',name:'Utilities & internet',amount:180,category:'Bills'},{id:'transport',name:'Getting around',amount:180,category:'Transport'},{id:'insurance',name:'Insurance',amount:160,category:'Health'},{id:'subscriptions',name:'Subscriptions',amount:120,category:'Other'}];
  state.transactions=[{id:'coffee',name:'A little coffee break',amount:8.5,category:'Food & drinks',date:localDate()},{id:'book',name:'Weekend bookshop',amount:32,category:'Shopping',date:localDate()},{id:'dinner',name:'Dinner with friends',amount:64.5,category:'Food & drinks',date:localDate()}];
  state.settings.emergencySaved=2800;
  state.goals=[{id:'trip',name:'A well-earned getaway',target:2000,saved:650},{id:'laptop',name:'New laptop fund',target:1500,saved:450}];
  return state;
}
export function validateState(s) {
  if(!s || s.version!==1 || typeof s.demo!=='boolean' || !s.settings || !['USD','GBP','EUR','CAD','AUD'].includes(s.settings.currency)) return false;
  const conf=s.settings;
  if(!validAmount(conf.emergencySaved)||!validAmount(conf.highInterestDebt)||!Number.isFinite(conf.futurePercent)||conf.futurePercent<0||conf.futurePercent>80||![1,3,6,12].includes(conf.emergencyMonths)) return false;
  const base=r=>r && typeof r.id==='string' && r.id.length<200 && typeof r.name==='string' && r.name.trim().length>0 && r.name.length<=100;
  const collection=(rows,test)=>Array.isArray(rows)&&rows.length<=5000&&new Set(rows.map(r=>r?.id)).size===rows.length&&rows.every(test);
  return collection(s.incomes,r=>base(r)&&validAmount(r.amount)&&Object.hasOwn(FREQUENCIES,r.frequency)&&validDate(r.date)) && collection(s.bills,r=>base(r)&&validAmount(r.amount)&&typeof r.category==='string') && collection(s.transactions,r=>base(r)&&validAmount(r.amount)&&validDate(r.date)&&typeof r.category==='string') && collection(s.goals,r=>base(r)&&validAmount(r.target)&&r.target>0&&validAmount(r.saved));
}
export function parseCSV(text) {
  const rows=[]; let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(c==='"') { if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(field.trim());field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('There is an unclosed quote in your CSV. Please check the file.');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<2)throw new Error('Add a header and at least one income row.');
  if(rows.length>501)throw new Error('Import up to 500 income rows at a time.');
  const headers=rows.shift().map(s=>s.toLowerCase());
  if(!['name','amount','frequency'].every(s=>headers.includes(s)))throw new Error('Your CSV needs name, amount, and frequency columns. Download the example to get started.');
  return rows.map((r,index)=>{
    const get=k=>r[headers.indexOf(k)]||'';
    const raw=get('amount').replace(/[$£€,]/g,'').trim();
    const amount=raw===''?NaN:Number(raw); const frequency=get('frequency').toLowerCase(); const date=get('date')||localDate(); const name=get('name');
    if(!name||name.length>100||!validAmount(amount)||amount===0||!Object.hasOwn(FREQUENCIES,frequency)||!validDate(date))throw new Error(`Row ${index+2}: check the name, positive amount, frequency, and date (YYYY-MM-DD).`);
    return {name,amount,frequency,date};
  });
}
