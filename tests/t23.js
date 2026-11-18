const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const errs=[];const out={};
const p=await (await b.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true})).newPage();
p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.|lumienglish\.co\.il\/og|mymemory|dictionaryapi|supabase/,r=>r.abort());
await p.addInitScript(()=>{localStorage.setItem('lumi-profiles',JSON.stringify({list:[{id:'p1',name:'דנה',avatar:'🦊',key:'lumi-english-v1'}]}));
 const now=Date.now();const words={};const srs={};['hello','friend','happy','teacher'].forEach(w=>{words[w]='learning';srs[w]={due:now+86400000*3,iv:3,ease:2.3,reps:2,last:now};});
 localStorage.setItem('lumi-english-v1',JSON.stringify({words,srs,history:{},goal:30,settings:{},storiesDone:{},quiz:{},totals:{answered:0,correct:0,reviews:2},userStories:[],unlocked:{}}));
 class U{constructor(t){this.text=t}};window.SpeechSynthesisUtterance=U;Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,speak(u){setTimeout(()=>u.onend&&u.onend({}),20)},cancel(){},getVoices(){return[]},addEventListener(){},removeEventListener(){}},configurable:true});});
await p.goto('file:///home/user/lumi-english/lumi-english-offline.html');await p.waitForTimeout(800);
await p.click('nav >> text=תרגול');await p.waitForTimeout(300);
out.dueDisabled=await p.$eval('.srs-card .btn-go',e=>e.disabled);out.early=await p.$eval('[data-early]',e=>e.innerText);
await p.screenshot({path:S+'/g1.png'});
await p.click('[data-early]');await p.waitForTimeout(300);
for(let i=0;i<8&&await p.$('text=הצגת התשובה');i++){ if(i===0){ out.choices=await p.$$eval('[data-choice]',e=>e.length); await p.click('[data-choice="0"] >> nth=0'); out.msg=await p.$eval('[role=status]',e=>e.innerText); } else await p.click('text=הצגת התשובה');await p.waitForTimeout(150);await p.click(i<2?'button.grade:has-text("שכחתי")':'button.grade:has-text("ידעתי")');await p.waitForTimeout(250);}
out.ask=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' ').slice(0,160));
await p.screenshot({path:S+'/g2.png'});
await p.click('[data-more]');await p.waitForTimeout(300);out.again=await p.$eval('.eyebrow',e=>e.textContent)+' '+await p.$eval('.num.text-sm',e=>e.textContent).catch(()=>'');
out.errs=errs;console.log(JSON.stringify(out,null,1));await b.close();})();
