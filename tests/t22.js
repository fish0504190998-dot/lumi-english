const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const errs=[];const out={};
const ctx=await b.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|net::/.test(m.text()))errs.push('console: '+m.text());});
await p.route(/fonts\.|netlify\.app\/og|mymemory|dictionaryapi|supabase/,r=>r.abort());
await p.addInitScript(()=>{localStorage.setItem('lumi-profiles',JSON.stringify({list:[{id:'p1',name:'דנה',avatar:'🦊',key:'lumi-english-v1'}]}));
 class U{constructor(t){this.text=t}};window.SpeechSynthesisUtterance=U;
 Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,speak(u){setTimeout(()=>u.onend&&u.onend({}),20)},cancel(){},getVoices(){return[]},addEventListener(){},removeEventListener(){}},configurable:true});});
await p.goto('file:///home/user/lumi-english/lumi-english-offline.html');await p.waitForTimeout(800);
await p.click('nav >> text=קורסים');await p.waitForTimeout(300);
out.firstCard=await p.$eval('[data-course]',e=>e.dataset.course);
await p.click('[data-course=a1u]');await p.waitForTimeout(300);
out.locked=await p.$eval('[data-quiz=a1u-u1]',e=>e.disabled);
await p.screenshot({path:S+'/f1.png'});
async function runEx(allRight,wrongFirst){ // drive exercise screens until result/title changes
  const log=[];
  for(let n=0;n<40;n++){
    if(await p.$('text=השיעור הושלם')||await p.$('text=עברתם את מבחן')||await p.$('text=כמעט! צריך')) break;
    const he=await p.evaluate(()=>{const s=document.querySelector('section.card');return s?s.innerText:'';});
    if(await p.$('[data-skip]')){ await p.click('[data-skip]'); log.push('speak'); await p.waitForTimeout(150); continue; }
    if(await p.$('[data-correct]')){ await p.click(wrongFirst&&n===0?'[data-correct="0"] >> nth=0':'[data-correct="1"]'); log.push('choice'); }
    else if(await p.$('[data-answer]')){ const heTxt=he.split('\n').filter(x=>/[א-ת]/.test(x)).pop();
      const en=await p.evaluate(t=>{ for(const c of COURSES) for(const tp of c.topics) for(const l of tp.lessons) for(const e of (l.ex||[])) if(e.t==='order'&&t.includes(e.he)) return e.en; return null; },he);
      for(const w of en.split(' ')){ await p.click(`[data-w="${w}"]:not([disabled]) >> nth=0`); }
      await p.click('button:has-text("בדיקה")'); log.push('order'); }
    else if(await p.$('input.field')){ const heTxt=he;
      if(await p.$('[data-hint]')){ await p.click('[data-hint]'); await p.waitForTimeout(100); } const he2=await p.evaluate(()=>document.querySelector('section.card').innerText); const ans=await p.evaluate(t=>{ for(const c of COURSES) for(const tp of c.topics) for(const l of tp.lessons) for(const e of (l.ex||[])) if(e.t==='copy'&&t.includes(e.en)) return e.en; for(const c1 of COURSES) for(const tp1 of c1.topics) for(const l1 of tp1.lessons) for(const e1 of (l1.ex||[])) if(e1.t==='type'&&t.includes(e1.he)) return e1.ans[0]; for(const c2 of COURSES) for(const tp2 of c2.topics) for(const l2 of tp2.lessons) for(const e2 of (l2.ex||[])) if(e2.t==='copy'&&t.includes(e2.en)) return e2.en; return null; },he);
      await p.fill('input.field',ans); await p.click('button:has-text("בדיקה")'); log.push('type'); }
    else { log.push('??'+he.slice(0,30)); break; }
    await p.waitForTimeout(100);
    if(await p.$('text=התשובה הנכונה')){ out.miss=(out.miss||[]).concat((await p.evaluate(()=>document.body.innerText)).split('התשובה הנכונה')[0].slice(-120)); } if(await p.$('[data-next]')){ await p.click('[data-next]'); await p.waitForTimeout(150); }
  }
  return log;
}
const lessons=['a1u-u1-1','a1u-u1-2','a1u-u1-3','a1u-u1-4','a1u-u1-5'];
for(let k=0;k<lessons.length;k++){
  await p.click(`[data-lesson=${lessons[k]}]`);await p.waitForTimeout(300);
  if(k===0) await p.screenshot({path:S+'/f2.png'});
  await p.click('text=הבנתי, לכלל');await p.waitForTimeout(200); if(k===0) await p.screenshot({path:S+'/f3.png'});
  await p.click('text=למילים');await p.waitForTimeout(200);await p.click('text=מתחילים לתרגל');await p.waitForTimeout(300);
  if(k===0) await p.screenshot({path:S+'/f4.png'});
  const log=await runEx(true,k===1); out['l'+k]={n:log.length,kinds:[...new Set(log)].join(','),done:await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' ').slice(0,60)).catch(()=>'NO STATUS '+log.slice(-2))};
  if(k===1) await p.screenshot({path:S+'/f5.png'});
  await p.click('text=חזרה ליחידה');await p.waitForTimeout(300);
}
out.quizEnabled=await p.$eval('[data-quiz=a1u-u1]',e=>!e.disabled);
await p.click('[data-quiz=a1u-u1]');await p.waitForTimeout(300);
const log=await runEx(true,false);out.quizLog=log.length;
out.quizRes=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' ').slice(0,80)).catch(()=>'none');
await p.screenshot({path:S+'/f6.png'});
out.state=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lumi-english-v1'));return {lessons:Object.keys(s.courses.lessons).length,topics:s.courses.topics,learning:Object.values(s.words).filter(x=>x==='learning').length};});
out.copyTip=null;out.sw=await p.evaluate(()=>document.documentElement.scrollWidth);out.errs=errs;console.log(JSON.stringify(out,null,1));await b.close();})();
