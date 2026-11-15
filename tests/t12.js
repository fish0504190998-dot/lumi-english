const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:820},isMobile:true,hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\./,r=>r.abort());
await p.route(/mymemory/,r=>r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({responseData:{translatedText:'Cucumber'}})}));
await p.addInitScript(()=>{
  localStorage.setItem('lumi-profiles', JSON.stringify({list:[{id:'p1',name:'Dana',avatar:'🦊',key:'lumi-english-v1'}]}));
  window.__say=[]; window.__next='';
  class U{constructor(t){this.text=t}}; window.SpeechSynthesisUtterance=U;
  Object.defineProperty(window,'speechSynthesis',{value:{speak(u){window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend({}),30)},cancel(){},getVoices(){return[]},addEventListener(){},removeEventListener(){}},configurable:true});
  // fake speech recognition: says whatever window.__next holds, in the requested language
  class SR{ start(){ const me=this; window.__lang=this.lang; setTimeout(()=>{ me.onresult&&me.onresult({results:[Object.assign([{transcript:window.__next}],{isFinal:true})]}); me.onend&&me.onend(); },120); } stop(){} }
  Object.defineProperty(window,'webkitSpeechRecognition',{value:SR,configurable:true,writable:true});Object.defineProperty(window,'SpeechRecognition',{value:SR,configurable:true,writable:true});
});
await p.goto('file:///home/user/lumi-english/lumi-english-offline.html');await p.waitForTimeout(600);
// 1. Hebrew mic
await p.click('[aria-label^="שפת המיקרופון"]');
await p.evaluate(()=>{ window.__next='מלפפון'; });
await p.click('[aria-label^="חיפוש קולי"]');await p.waitForTimeout(700);
const card=await p.$eval('[role=dialog]',e=>e.textContent.slice(0,80)).catch(()=>null);console.log('CARD',card,errs,await p.evaluate(()=>window.__lang), await p.$$eval('[aria-label]',els=>els.map(e=>e.getAttribute('aria-label')).filter(x=>/קול|הקשב/.test(x))));
const lang=await p.evaluate(()=>window.__lang);
await p.screenshot({path:S+'/h1.png'});
await p.keyboard.press('Escape');await p.waitForTimeout(300);
// Hebrew word not in dictionary -> online translation (mocked)
await p.evaluate(()=>{ window.__next='חציל'; });
await p.click('[aria-label^="חיפוש קולי"]');await p.waitForTimeout(900);
const card2=await p.$eval('[role=dialog] .book',e=>e.textContent).catch(()=>null);
await p.keyboard.press('Escape');await p.waitForTimeout(300);
// 2. sounds tab
await p.click('nav >> text=צלילים');await p.waitForTimeout(300);
await p.screenshot({path:S+'/h2.png'});
await p.click('button:has-text("ch")>>nth=0');await p.waitForTimeout(300);
const sheet=await p.$eval('[role=dialog]',e=>e.textContent.slice(0,120));
await p.screenshot({path:S+'/h3.png'});
await p.keyboard.press('Escape');await p.waitForTimeout(300);
await p.click('text=בוחן צלילים');await p.waitForTimeout(300);
for(let i=0;i<10;i++){ await p.click('.opt >> nth=0');await p.waitForTimeout(120);await p.click('button:has-text("המשך"), button:has-text("לסיכום")');await p.waitForTimeout(150); }
const qdone=await p.textContent('[role=status]').catch(()=>null);
// 3. talk
await p.click('nav >> text=שיחה');await p.waitForTimeout(300);
await p.click('text=Nice to meet you');await p.waitForTimeout(700);
await p.evaluate(()=>{ window.__next="my name is Meir"; });
await p.click('[aria-label="דברו באנגלית"]');await p.waitForTimeout(1500);
const bot2=await p.evaluate(()=>window.__say.slice(-1)[0]);
await p.fill('#talk-input','banana');await p.click('[aria-label="שליחה"]');await p.waitForTimeout(400);
const hintShown=!!(await p.$('text=אפשר לענות למשל'));
await p.screenshot({path:S+'/h4.png'});
await p.fill('#talk-input',"I'm fine, thank you");await p.click('[aria-label="שליחה"]');await p.waitForTimeout(1200);
const bot3=await p.evaluate(()=>window.__say.slice(-1)[0]);
for(const ans of ["I'm from Israel","I'm 30","I like music","bye"]){ await p.fill('#talk-input',ans);await p.click('[aria-label="שליחה"]');await p.waitForTimeout(1100); }
const fin=await p.textContent('[role=status]').catch(()=>null);
await p.screenshot({path:S+'/h5.png'});
const st=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lumi-english-v1'));return {talkDone:s.talkDone,phon:Object.keys(s.phon||{}).length,xp:Object.values(s.history)[0]}});
console.log(JSON.stringify({errs,lang,card,card2,sheet,qdone,bot2,hintShown,bot3,fin,st,sw:await p.evaluate(()=>document.documentElement.scrollWidth)},null,1));
await b.close();})();
