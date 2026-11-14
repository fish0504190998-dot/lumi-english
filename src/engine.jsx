/* ---------- spaced repetition (SM-2 style) ---------- */
const DAY_MS=864e5, MIN_MS=6e4;
const GRADUATE_DAYS=21;            // a learning word whose interval reaches this many days becomes "known"
function srsCard(s,k){ return (s.srs&&s.srs[k])||{due:0, iv:0, ease:2.3, reps:0, last:0}; }
function srsNext(c, grade){        // grade: 0 again, 1 hard, 2 good, 3 easy
  const now=Date.now(); let {iv,ease,reps}=c;
  if(grade===0){ return {due:now+10*MIN_MS, iv:0, ease:Math.max(1.3,ease-.2), reps:0, last:now}; }
  if(reps===0) iv = grade===1?1 : grade===2?1 : 3;
  else if(reps===1) iv = grade===1?2 : grade===2?3 : 6;
  else iv = Math.max(iv+1, Math.round(iv*(grade===1?1.2 : grade===2?ease : ease*1.3)));
  ease = Math.min(3, Math.max(1.3, ease+(grade===1?-.15:grade===3?.15:0)));
  return {due:now+iv*DAY_MS, iv, ease, reps:reps+1, last:now};
}
const gradeLabel=(c,g)=>{ const n=srsNext(c,g); return g===0?'10 דק׳':n.iv>=30?Math.round(n.iv/30)+' חו׳':n.iv+(n.iv===1?' יום':' ימים'); };
function dueWords(s){ const now=Date.now(); return Object.keys(s.words).filter(k=>s.words[k]==='learning').filter(k=>srsCard(s,k).due<=now)
  .sort((a,b)=>srsCard(s,a).due-srsCard(s,b).due); }
function nextDueAt(s){ let m=Infinity; for(const k in s.words) if(s.words[k]==='learning'){ const d=srsCard(s,k).due; if(d>Date.now()&&d<m) m=d; } return m===Infinity?null:m; }
function withLearned(s, n){ if(!n) return s; const d=todayKey(); const h=s.history[d]||{xp:0,met:false}; return {...s, history:{...s.history,[d]:{...h, learned:(h.learned||0)+n}}}; }
function withStatus(s, k, st){        // central place for status changes: keeps SRS, "learned today" and XP in step
  const prev=s.words[k]; if(prev===st) return s;
  const words={...s.words}; if(st) words[k]=st; else delete words[k];
  let n={...s, words};
  if(st==='learning' && !(s.srs&&s.srs[k])) n={...n, srs:{...(s.srs||{}),[k]:{due:Date.now(), iv:0, ease:2.3, reps:0, last:0}}};
  if(st==='known' && prev!=='known' && !NAMES.has(k)) n=withLearned(n,1);
  return n;
}
function relTime(t){ const d=t-Date.now(); if(d<=0) return 'עכשיו'; const m=Math.round(d/MIN_MS); if(m<60) return `בעוד ${m} דק׳`; const h=Math.round(m/60); if(h<24) return `בעוד ${h} שע׳`; const dd=Math.round(h/24); return dd===1?'מחר':`בעוד ${dd} ימים`; }

/* ---------- achievements ---------- */
const BADGES=[
  {id:'story1', icon:'📖', name:'סיפור ראשון', desc:'סיימת לקרוא סיפור', need:1, of:'stories'},
  {id:'story5', icon:'📚', name:'5 סיפורים', desc:'סיימת 5 סיפורים', need:5, of:'stories'},
  {id:'story10', icon:'🏅', name:'10 סיפורים נקראו', desc:'סיימת 10 סיפורים', need:10, of:'stories'},
  {id:'story25', icon:'🏆', name:'תולעת ספרים', desc:'סיימת 25 סיפורים', need:25, of:'stories'},
  {id:'known50', icon:'🌱', name:'50 מילים מוכרות', desc:'50 מילים בסטטוס מוכרת', need:50, of:'known'},
  {id:'known100', icon:'🌿', name:'100 מילים מוכרות', desc:'100 מילים בסטטוס מוכרת', need:100, of:'known'},
  {id:'known250', icon:'🌳', name:'250 מילים מוכרות', desc:'פתחת את שלב הקריאה השוטפת', need:250, of:'known'},
  {id:'known500', icon:'🌲', name:'500 מילים מוכרות', desc:'אוצר מילים של ממש', need:500, of:'known'},
  {id:'streak3', icon:'🔥', name:'רצף של 3 ימים', desc:'השלמת את היעד 3 ימים ברצף', need:3, of:'streak'},
  {id:'streak7', icon:'⚡', name:'רצף של 7 ימים', desc:'שבוע שלם ברצף', need:7, of:'streak'},
  {id:'streak30', icon:'👑', name:'רצף של 30 ימים', desc:'חודש שלם ברצף', need:30, of:'streak'},
  {id:'review50', icon:'🧠', name:'50 חזרות', desc:'50 כרטיסי חזרה מרווחת', need:50, of:'reviews'},
  {id:'talk1', icon:'💬', name:'שיחה ראשונה', desc:'סיימת שיחה בקול', need:1, of:'talks'},
  {id:'talkAll', icon:'🎤', name:'כל השיחות', desc:`סיימת את כל ${typeof TALKS!=='undefined'?TALKS.length:6} השיחות`, need:typeof TALKS!=='undefined'?TALKS.length:6, of:'talks'},
  {id:'sounds10', icon:'🔤', name:'10 צלילים', desc:'למדת 10 צירופי אותיות', need:10, of:'sounds'},
  {id:'mystory', icon:'✍️', name:'הסיפור שלי', desc:'הוספת סיפור משלך', need:1, of:'mine'},
  {id:'team', icon:'🤝', name:'לומדים ביחד', desc:'הצטרפת לקבוצת לימוד', need:1, of:'group'}
];
function badgeStats(s){ const st=computeStreak(s.history), best=Math.max(st, bestStreak(s.history));
  return { stories:Object.keys(s.storiesDone||{}).length, known:Object.keys(s.words).filter(k=>s.words[k]==='known'&&!NAMES.has(k)).length, streak:best,
    reviews:(s.totals&&s.totals.reviews)||0, talks:Object.keys(s.talkDone||{}).length, sounds:Object.values(s.phon||{}).filter(x=>x.c>=2).length,
    mine:(s.userStories||[]).length, group:s.group?1:0 }; }

/* ---------- story helpers ---------- */
const TOPICS=['יומיום','סיפור אמיתי','נסיעות','עבודה','חיות'];
const TOPIC_WORDS={
  'נסיעות':/\b(travel|trip|train|plane|airport|hotel|bus|taxi|ticket|passport|flight|station|beach|city|country|tourist|map|road|holiday|vacation)\b/i,
  'עבודה':/\b(work|works|worked|job|office|boss|meeting|company|money|team|manager|business|salary|computer|email|doctor|hospital|teacher|engineer)\b/i,
  'חיות':/\b(dog|dogs|cat|cats|animal|animals|bird|birds|fish|horse|cow|lion|bear|bee|bees|penguin|dragon|monkey|rabbit|pet|zoo)\b/i,
  'סיפור אמיתי':/\b(1[0-9]{3}|20[0-9]{2}|true story|history|famous|years ago|scientist|discovered|invented|born in)\b/i
};
function detectTopics(text){ const t=[]; for(const k in TOPIC_WORDS) if(TOPIC_WORDS[k].test(text)) t.push(k); if(!t.length) t.push('יומיום'); return t; }
function storyStats(story, s){ const d=storyData(story); const nw=d.keys.filter(k=>!s.words[k]&&!NAMES.has(k)).length, lw=d.keys.filter(k=>s.words[k]==='learning').length, kw=d.keys.filter(k=>s.words[k]==='known').length;
  return {d, newW:nw, learnW:lw, knownW:kw, pct:Math.round(kw/Math.max(1,d.keys.length)*100), done:!!(s.storiesDone||{})[story.id]}; }
function isOpenLevel(level, known, unlocked){ return level<=levelFor(known) || !!unlocked[level]; }
function recommendStories(stories, s, known){
  const lv=levelFor(known);
  return stories.filter(x=>!(s.storiesDone||{})[x.id] && isOpenLevel(x.level, known, s.unlocked))
    .map(x=>{ const st=storyStats(x,s); const ratio=st.newW/Math.max(1,st.d.keys.length); return {x, sc:Math.abs(x.level-lv)*2 + Math.abs(ratio-.12)*6 + (x.user?-.5:0)}; })
    .sort((a,b)=>a.sc-b.sc).map(r=>r.x);
}

/* ---------- covers: emoji or a compressed uploaded image ---------- */
function compressImage(file, max=300, quality=.75){
  return new Promise((resolve,reject)=>{
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('type'));
    if(file.size>15e6) return reject(new Error('big'));
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{ try{ const k=Math.min(1, max/Math.max(img.width,img.height)); const w=Math.max(1,Math.round(img.width*k)), h=Math.max(1,Math.round(img.height*k));
        const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#FFFFFF'; g.fillRect(0,0,w,h); g.drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality)); }catch(e){ URL.revokeObjectURL(url); reject(e); } };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src=url; });
}
function StoryCover({story, size=56, radius=14, className=''}){
  if(story.image) return <img src={story.image} alt="" className={`object-cover shrink-0 ${className}`} style={{width:size, height:size, borderRadius:radius}}/>;
  return <span className={`grid place-items-center shrink-0 ${className}`} style={{width:size, height:size, borderRadius:radius, fontSize:size*.55, background:'var(--sunk)'}} aria-hidden="true">{story.cover||'📖'}</span>;
}
function StatusPill({kind, n, label}){
  const L={new:'חדשות', learning:'בלמידה', known:'מוכרות'};
  return <span className={`pill pill-${kind}`}><span className="pill-dot" aria-hidden="true"></span>{n!=null&&<b className="num">{n}</b>}{label||L[kind]}</span>;
}

