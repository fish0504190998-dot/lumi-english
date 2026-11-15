const {chromium}=require('playwright');const S=process.argv[2];const fs=require('fs');
(async()=>{const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:840},isMobile:true,hasTouch:true,acceptDownloads:true});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED|net::/.test(m.text())) errs.push('console: '+m.text()); });
await p.route(/fonts\.|netlify\.app|mymemory|dictionaryapi/,r=>r.abort());
await p.addInitScript(()=>{ if(!localStorage.getItem('lumi-profiles')) localStorage.setItem('lumi-profiles', JSON.stringify({list:[{id:'p1',name:'Dana',avatar:'🦊',key:'lumi-english-v1'}]}));
  window.__say=[]; class U{constructor(t){this.text=t}}; window.SpeechSynthesisUtterance=U;
  Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,speak(u){window.__say.push({t:u.text,r:u.rate});setTimeout(()=>u.onend&&u.onend({}),20)},cancel(){},getVoices(){return[]},addEventListener(){},removeEventListener(){}},configurable:true}); });
await p.goto('file:///home/user/lumi-english/lumi-english-offline.html');await p.waitForTimeout(700);
const out={};
await p.screenshot({path:S+'/v1.png',fullPage:false});
out.hero=await p.$eval('.hero',e=>e.innerText.replace(/\s+/g,' ').slice(0,90));
out.level1Count=await p.$$eval('section:has(h2:has-text("צעדים ראשונים")) .story-card',e=>e.length);
out.cardPill=await p.$eval('.story-card .pill-new',e=>e.textContent);
// filters + search
await p.fill('#lib-search','supermarket');await p.waitForTimeout(200);out.search=await p.$$eval('.story-card .story-title',e=>e.map(x=>x.textContent));
await p.fill('#lib-search','חיות');await p.waitForTimeout(200);out.topic=await p.$$eval('.story-card .story-title',e=>e.length);
await p.fill('#lib-search','');await p.click('.filter-pill:has-text("מומלצים")');await p.waitForTimeout(200);out.rec=await p.$$eval('.story-card',e=>e.length);
await p.selectOption('#lib-sort','short');await p.click('.filter-pill:has-text("הכל")');await p.waitForTimeout(200);out.shortest=await p.$eval('.story-card .story-title',e=>e.textContent);
await p.click('text=ניקוי הסינון');
// open recommended story via hero, click two words, mark one known
await p.click('.hero .btn-go');await p.waitForTimeout(400);
out.reader=await p.$eval('h1.book',e=>e.textContent);
const w=await p.$$('.reading .word');await w[1].click();await p.waitForTimeout(250);out.spokenOnClick=await p.evaluate(()=>window.__say.slice(-1)[0]);
await p.keyboard.press('Escape');await p.waitForTimeout(250);await w[4].click();await p.waitForTimeout(250);await p.click('[role=dialog] >> text=כבר מכיר!');await p.waitForTimeout(250);await p.keyboard.press('Escape');await p.waitForTimeout(250);
await w[6].click();await p.waitForTimeout(250);await p.keyboard.press('Escape');await p.waitForTimeout(250);
// back to library: hero says continue
await p.click('button:has-text("הספרייה")');await p.waitForTimeout(300);out.heroContinue=await p.$eval('.hero .btn-go',e=>e.textContent);
await p.click('.hero .btn-go');await p.waitForTimeout(300);
await p.click('text=סיימתי לקרוא');await p.waitForTimeout(600);
out.summary=await p.$eval('[role=dialog]',e=>e.innerText.replace(/\s+/g,' ').slice(0,260));
await p.screenshot({path:S+'/v2.png'});
out.badgeToast=await p.$eval('.toast',e=>e.textContent).catch(()=>null);
await p.click('[role=dialog] >> text=תרגל מילים קשות מהסיפור');await p.waitForTimeout(500);
out.flashTitle=await p.$eval('.eyebrow',e=>e.textContent).catch(()=>null);
await p.screenshot({path:S+'/v3.png'});
await p.click('.flash');await p.waitForTimeout(200);await p.screenshot({path:S+'/v4.png'});
await p.click('.grade-known');await p.waitForTimeout(300);await p.click('.flash');await p.waitForTimeout(150);await p.click('.grade-bad');await p.waitForTimeout(300);
for(let i=0;i<4;i++){ if(await p.$('.flash')){ await p.click('.flash');await p.waitForTimeout(120); await p.click('.grade-primary');await p.waitForTimeout(200);} }
out.flashEnd=await p.$eval('[role=status]',e=>e.innerText.replace(/\s+/g,' ').slice(0,120)).catch(()=>null);
await p.click('button:has-text("סיום")');await p.waitForTimeout(300);
out.srs=await p.$eval('.srs-card',e=>e.innerText.replace(/\s+/g,' ').slice(0,140));
// progress tab
await p.click('nav >> text=התקדמות');await p.waitForTimeout(400);
out.badges=await p.$$eval('.badge.is-on',e=>e.map(x=>x.innerText.split('\n')[1]));
await p.click('.vtab-known');await p.waitForTimeout(150);out.vKnown=await p.$$eval('.vword-known',e=>e.length);
await p.click('.vtab-new');await p.waitForTimeout(150);out.vNew=await p.$$eval('.vword-new',e=>e.length);
await p.click('.vword-new >> nth=0 >> button >> nth=0');await p.waitForTimeout(100);out.vSpeak=await p.evaluate(()=>window.__say.slice(-1)[0]);
out.weekBtns=await p.$$eval('button:has-text("שבוע קודם"), button:has-text("שבוע הבא")',e=>e.length);
// backup export
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null), p.click('text=הורד גיבוי (JSON)')]);
let backup=null; if(dl){ const f=S+'/backup.json'; await dl.saveAs(f); backup=JSON.parse(fs.readFileSync(f,'utf8')); out.backup={name:dl.suggestedFilename(), app:backup.app, words:Object.keys(backup.state.words).length}; }
// add story with image
await p.click('nav >> text=סיפורים');await p.waitForTimeout(200);await p.click('.add-tile');await p.waitForTimeout(300);
await p.fill('#add-text','My dog Rex loves the beach. Every summer we travel by train to the sea. Rex runs on the sand and swims in the water. Then we eat ice cream.');
await p.fill('#add-title','Rex at the Beach');await p.waitForTimeout(200);
out.analysis=await p.$eval('.analysis',e=>e.innerText.replace(/\s+/g,' '));
out.autoTags=await p.$$eval('.filter-pill[aria-pressed="true"]',e=>e.map(x=>x.textContent));
await p.click('button:has-text("תמונה משלי")');await p.setInputFiles('#add-image','/tmp/claude-0/-home-user-lumi-english/d0cf8880-94af-5395-b228-967c754cd632/scratchpad/brand/og-v2.png');await p.waitForTimeout(600);
out.imgPreview=await p.$eval('img[alt="תמונת השער"]',e=>({w:e.naturalWidth,h:e.naturalHeight,len:e.src.length,type:e.src.slice(0,23)})).catch(()=>null);
await p.screenshot({path:S+'/v5.png'});
await p.click('button:has-text("שמור סיפור")');await p.waitForTimeout(700);
out.readerImg=!!(await p.$('article img.object-cover'));
await p.click('button:has-text("הספרייה")');await p.waitForTimeout(300);out.cardImg=await p.$$eval('.story-card img.object-cover',e=>e.length);
await p.screenshot({path:S+'/v6.png'});
// restore from backup (taken before the story was added) -> story disappears
if(backup){ await p.click('nav >> text=התקדמות');await p.waitForTimeout(300);await p.setInputFiles('#backup-file',S+'/backup.json');await p.waitForTimeout(400);await p.click('text=כן, לשחזר');await p.waitForTimeout(400);
  out.afterRestore=await p.evaluate(()=>JSON.parse(localStorage.getItem('lumi-english-v1')).userStories.length); }
out.sw=await p.evaluate(()=>document.documentElement.scrollWidth);
out.errs=errs;
console.log(JSON.stringify(out,null,1));
await b.close();})();
