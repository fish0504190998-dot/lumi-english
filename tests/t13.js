// group UI against the real function logic (in-memory store), two learners in two browsers
const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{
const {handle}=await import(S+'/fn/groups.mjs');
const mem=new Map(); const store={ async get(k,o){ const v=mem.get(k); return v===undefined?null:(o&&o.type==='json'?JSON.parse(v):v); }, async setJSON(k,v){ mem.set(k,JSON.stringify(v)); } };
const route=async r=>{ const q=r.request(); const res=await handle(new Request(q.url(),{method:q.method(),headers:{'content-type':'application/json'},body:q.method()==='POST'?q.postData():undefined}),store); r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:await res.text()}); };
const b=await chromium.launch();const errs=[];
const open=async(name,avatar,xpWords,join)=>{ const ctx=await b.newContext({viewport:{width:390,height:820},isMobile:true,hasTouch:true}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(name+': '+e.message));
  await p.route(/fonts\./,r=>r.abort()); await p.route(/lumi-english\.netlify\.app\/api\/groups/,route);
  await p.addInitScript(([name,avatar,xp])=>{ localStorage.setItem('lumi-profiles', JSON.stringify({list:[{id:'p1',name,avatar,key:'lumi-english-v1'}]}));
    const d=new Date(); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(!localStorage.getItem('lumi-english-v1')) localStorage.setItem('lumi-english-v1', JSON.stringify({words:{cat:'known',dog:'known',sun:'known'},history:{[k]:{xp,met:xp>=30,words:300}},goal:30,settings:{},storiesDone:{},quiz:{},totals:{}})); },[name,avatar,xpWords]);
  await p.goto('file:///home/user/lumi-english/lumi-english-offline.html'+(join?'?join='+join:''));await p.waitForTimeout(700); return p; };
const a=await open('מאיר','🦊',42);
await a.click('nav >> text=התקדמות');await a.waitForTimeout(300);
await a.click('text=יצירת קבוצה');await a.fill('#g-name','משפחת פיש');await a.click('button:has-text("יצירה")');await a.waitForTimeout(800);
const code=await a.$eval('bdi.tracking-wider',e=>e.textContent);
const wa=await a.$eval('a[href^="https://wa.me"]',e=>decodeURIComponent(e.href));
// second learner arrives with an invite link
const d=await open('Dana','🐼',77,code);
const prefilled=await d.inputValue('#g-code').catch(()=>null); const onProgress=!!(await d.$('text=קבוצת לימוד'));
await d.click('button:has-text("הצטרפות")');await d.waitForTimeout(800);
await d.screenshot({path:S+'/g1.png',fullPage:false});
const rowsD=await d.$$eval('ol li',els=>els.map(e=>e.innerText.replace(/\s+/g,' ').slice(0,60)));
await a.click('text=רענון');await a.waitForTimeout(600);
const rowsA=await a.$$eval('ol li',els=>els.map(e=>e.innerText.replace(/\s+/g,' ').slice(0,60)));
// bad code
const c=await open('Noa','🦉',5);await c.click('nav >> text=התקדמות');await c.click('text=הצטרפות עם קוד');await c.fill('#g-code','ZZZZZZ');await c.click('button:has-text("הצטרפות")');await c.waitForTimeout(500);
const badMsg=await c.textContent('[role=alert]').catch(()=>null);
// leave
await d.click('text=עזיבת הקבוצה');await d.click('text=כן, לעזוב');await d.waitForTimeout(500);const left=!!(await d.$('text=יצירת קבוצה'));
console.log(JSON.stringify({errs,code,wa,prefilled,onProgress,rowsD,rowsA,badMsg,left,sw:await d.evaluate(()=>document.documentElement.scrollWidth)},null,1));
await b.close();})();
