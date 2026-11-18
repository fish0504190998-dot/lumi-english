const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const errs=[];const out={};
const ctx=await b.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true,acceptDownloads:true});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|net::/.test(m.text()))errs.push('console: '+m.text());});
await p.route(/fonts\.|lumienglish\.co\.il\/og|mymemory|dictionaryapi|supabase/,r=>r.abort());
await p.addInitScript(()=>{localStorage.setItem('lumi-profiles',JSON.stringify({list:[{id:'p1',name:'דנה',avatar:'🦊',key:'lumi-english-v1'}]}));
 window.__say=[];class U{constructor(t){this.text=t}};window.SpeechSynthesisUtterance=U;
 Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,speak(u){window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend({}),20)},cancel(){},getVoices(){return[]},addEventListener(){},removeEventListener(){}},configurable:true});});
await p.goto('file:///home/user/lumi-english/lumi-english-offline.html');await p.waitForTimeout(800);
await p.click('nav >> text=קורסים');await p.waitForTimeout(300);out.tabs=await p.$$eval('nav button',e=>e.map(x=>x.innerText.trim()));
out.tabsFit=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
await p.screenshot({path:S+'/e1.png'});
out.cards=await p.$$eval('[data-course]',e=>e.length);
await p.click('[data-course=a1]');await p.waitForTimeout(300);
out.locked=await p.$$eval('[data-topic]',e=>e.map(x=>x.dataset.open));
await p.screenshot({path:S+'/e2.png'});
// lesson 1
await p.click('[data-lesson=a1-greet-1]');await p.waitForTimeout(300);
out.learnCards=await p.$$eval('ul li button',e=>e.length);
await p.screenshot({path:S+'/e3.png'});
await p.click('text=מתחילים חידון');await p.waitForTimeout(300);
for(let i=0;i<10;i++){ await p.click('[data-correct="1"]');await p.waitForTimeout(150);await p.click("button.btn-primary.dock-mobile");await p.waitForTimeout(250);}
out.result=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' '));
await p.screenshot({path:S+'/e4.png'});
await p.click('text=חזרה לקורס');await p.waitForTimeout(300);
out.wordsLearning=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('lumi-english-v1')).words).filter(x=>x==='learning').length);
// finish other lessons by state injection, then topic quiz fail then pass
await p.evaluate(()=>{const k='lumi-english-v1';const s=JSON.parse(localStorage.getItem(k));s.courses.lessons['a1-greet-2']='x';s.talkDone={meet:'2026-11-15'};localStorage.setItem(k,JSON.stringify(s));});
await p.reload();await p.waitForTimeout(700);await p.click('nav >> text=קורסים');await p.waitForTimeout(300);await p.click('[data-course=a1]');await p.waitForTimeout(300);
out.quizEnabled=await p.$eval('[data-quiz=a1-greet]',e=>!e.disabled);
await p.click('[data-quiz=a1-greet]');await p.waitForTimeout(300);
for(let i=0;i<10;i++){ await p.click('[data-correct="0"] >> nth=0');await p.waitForTimeout(150);await p.click("button.btn-primary.dock-mobile");await p.waitForTimeout(250);}
out.failMsg=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' '));
out.topic2Locked=await p.$$eval('[data-topic]',e=>e.map(x=>x.dataset.open));
await p.click('[data-quiz=a1-greet]');await p.waitForTimeout(300);
for(let i=0;i<10;i++){ await p.click('[data-correct="1"]');await p.waitForTimeout(150);await p.click("button.btn-primary.dock-mobile");await p.waitForTimeout(250);}
out.passMsg=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' '));
out.topic2Open=await p.$$eval('[data-topic]',e=>e.map(x=>x.dataset.open));
await p.screenshot({path:S+'/e5.png'});
// complete whole course by injection -> certificate
await p.evaluate(()=>{const k='lumi-english-v1';const s=JSON.parse(localStorage.getItem(k));const C=window.COURSES||null;return 0;});
const ids=await p.evaluate(()=>{ return null; });
await p.evaluate(()=>{const k='lumi-english-v1';const s=JSON.parse(localStorage.getItem(k));
 for(const t of ['a1-greet','a1-family','a1-food','a1-home','a1-numbers','a1-actions']) s.courses.topics[t]={pct:90,date:'2026-11-15'};
 for(const t of ['a1-greet','a1-family','a1-food','a1-home','a1-numbers','a1-actions']) for(let i=1;i<=4;i++) s.courses.lessons[t+'-'+i]='x';
 s.talkDone={...(s.talkDone||{}),meet:'x',cafe:'x'}; s.storiesDone={...(s.storiesDone||{}),pizza:{date:'x',times:1},pasta:{date:'x',times:1},cleaning:{date:'x',times:1},coffee:{date:'x',times:1},dogwalk:{date:'x',times:1}};
 localStorage.setItem(k,JSON.stringify(s));});
await p.reload();await p.waitForTimeout(700);await p.click('nav >> text=קורסים');await p.waitForTimeout(300);await p.click('[data-course=a1]');await p.waitForTimeout(300);
await p.click('text=לתעודת הסיום');await p.waitForTimeout(500);
out.cert=await p.$eval('#cert-canvas',e=>[e.width,e.height]);
const nonblank=await p.$eval('#cert-canvas',e=>{const d=e.getContext('2d').getImageData(0,0,e.width,e.height).data;let n=0;for(let i=0;i<d.length;i+=400)if(d[i]<200)n++;return n;});out.certInk=nonblank;
await p.screenshot({path:S+'/e6.png'});
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('text=הורדת התעודה')]);out.dl=dl.suggestedFilename();
out.certState=await p.evaluate(()=>JSON.parse(localStorage.getItem('lumi-english-v1')).courses.certs);
// badges
await p.click('nav >> text=התקדמות');await p.waitForTimeout(500);
out.badges=await p.$$eval('.badge.is-on .font-extrabold',e=>e.map(x=>x.textContent));
// talk handoff + story open
await p.click('nav >> text=קורסים');await p.waitForTimeout(300);await p.click('[data-course=a2]');await p.waitForTimeout(300);
out.sw=await p.evaluate(()=>document.documentElement.scrollWidth);
out.errs=errs;console.log(JSON.stringify(out,null,1));await b.close();})();
