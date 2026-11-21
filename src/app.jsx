const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- helpers ---------- */
const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
function tokenize(text){
  const out=[]; let last=0, m, wi=0; const re=new RegExp(WORD_RE.source,'g');
  while((m=re.exec(text))){
    if(m.index>last) out.push({t:'s', text:text.slice(last,m.index)});
    out.push({t:'w', text:m[0], key:m[0].toLowerCase(), start:m.index, wi:wi++});
    last=m.index+m[0].length;
  }
  if(last<text.length) out.push({t:'s', text:text.slice(last)});
  return out;
}
const countWords=t=>(t.match(WORD_RE)||[]).length;
const splitSentences=t=>(t.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g)||[t]).map(s=>s.trim()).filter(Boolean);
const TOK_CACHE=new Map();
function storyData(story){
  let d=TOK_CACHE.get(story.id);
  if(!d || d.n!==story.paras.length){
    const tokens=story.paras.map(p=>tokenize(p.en));
    const pw=tokens.map(ts=>ts.filter(t=>t.t==='w').length);
    d={ n:story.paras.length, tokens, pw, words:pw.reduce((a,b)=>a+b,0), keys:[...new Set(tokens.flat().filter(t=>t.t==='w').map(t=>t.key))] };
    TOK_CACHE.set(story.id,d);
  }
  return d;
}
function findExample(key, stories, preferId){
  const order=[...stories].sort((a,b)=>(b.id===preferId)-(a.id===preferId));
  const re=new RegExp("(^|[^A-Za-z'])"+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"($|[^A-Za-z'])",'i');
  for(const s of order){ if(!storyData(s).keys.includes(key)) continue;
    for(const p of s.paras) for(const sen of splitSentences(p.en)) if(re.test(sen)) return sen; }
  return null;
}
const QUIZ_POOL = Object.keys(MEANING).filter(k=>!NAMES.has(k) && !k.includes("'") && !MEANING[k].includes('('));

const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey=()=>dayKey(new Date());
const addDays=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const shuffle=a=>{ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
const pick=a=>a[Math.floor(Math.random()*a.length)];
const readMinutes=w=>Math.max(1, Math.round(w/90));

/* ---------- levels ---------- */
const LEVELS=[
  {n:1, name:'צעדים ראשונים', min:0, next:41, desc:'סיפורים קצרצרים, משפטים פשוטים מאוד'},
  {n:2, name:'מתחילים בתנופה', min:41, next:121, desc:'סיפורים קצרים עם אוצר מילים יומיומי'},
  {n:3, name:'סיפורים אמיתיים קצרים', min:121, next:251, desc:'עובדות מרתקות וסיפורים שקרו באמת'},
  {n:4, name:'קריאה שוטפת', min:251, next:null, desc:'סיפורים אמיתיים וארוכים ברמה טבעית'}
];
const levelFor=known=>known>=251?4:known>=121?3:known>=41?2:1;
const suggestLevel=words=>words<=60?1:words<=120?2:words<=250?3:4;

/* ---------- storage ---------- */
let LS_KEY='lumi-english-v1';        // storage key of the active learner; set before the app mounts
/* learner profiles: each person on this device/browser has a name, an avatar and separate progress */
const PROFILES_KEY='lumi-profiles';
const AVATARS=['🦊','🐼','🦁','🐸','🐙','🦉','🐬','🦄','🐢','🐝','🌟','🚀'];
function loadProfiles(){ try{ const p=JSON.parse(localStorage.getItem(PROFILES_KEY)||'null'); if(p&&Array.isArray(p.list)) return p; }catch(e){} return {list:[]}; }
function saveProfiles(p){ try{ localStorage.setItem(PROFILES_KEY, JSON.stringify(p)); }catch(e){} }
/* profile password: only a salted hash is stored, never the password itself */
async function hashPin(pin, salt){
  const text=salt+'|'+pin;
  try{ if(window.crypto&&crypto.subtle){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return 's:'+[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); } }catch(e){}
  let h1=0x811c9dc5, h2=0x01000193; for(let r=0;r<2000;r++) for(let i=0;i<text.length;i++){ h1=Math.imul(h1^text.charCodeAt(i),16777619); h2=Math.imul(h2+text.charCodeAt(i)+r,2246822519)^(h1>>>7); }
  return 'f:'+(h1>>>0).toString(16)+(h2>>>0).toString(16);
}
async function makePin(pin){ const salt=Math.random().toString(36).slice(2)+Date.now().toString(36); return {salt, hash:await hashPin(pin, salt)}; }
async function checkPin(pin, stored){ if(!stored) return true; const h=await hashPin(pin, stored.salt); return h===stored.hash; }
const PIN_MIN=4;
const DEFAULT_STATE={ words:{}, history:{}, goal:30, settings:{pron:true, rate:1, voice:'', font:1, pane:false}, storiesDone:{}, quiz:{}, bestCombo:0, totals:{answered:0, correct:0}, userStories:[], unlocked:{}, customDict:{}, netDict:{}, notes:{}, readToday:{date:'', ids:{}}, courses:{lessons:{},topics:{},certs:{},perfect:0} };
function loadState(){
  try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const p=JSON.parse(raw); return {...DEFAULT_STATE, ...p, settings:{...DEFAULT_STATE.settings, ...(p.settings||{})}, totals:{...DEFAULT_STATE.totals, ...(p.totals||{})}}; } }catch(e){}
  return DEFAULT_STATE;
}
function saveState(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); return true; }catch(e){ return false; } }
function withXP(s, n){
  if(!n) return s;
  const d=todayKey(); const h=s.history[d]||{xp:0, met:false};
  const xp=h.xp+n; const met=h.met || xp>=s.goal;
  return {...s, history:{...s.history, [d]:{...h, xp, met}}};
}
function withRead(s, story, idxs){
  const d=todayKey(); const rt=s.readToday&&s.readToday.date===d ? s.readToday : {date:d, ids:{}};
  const pw=storyData(story).pw; const ids={...rt.ids}; let add=0;
  for(const p of idxs){ const k=story.id+':'+p; if(!ids[k]){ ids[k]=1; add+=pw[p]||0; } }
  if(!add) return s;
  const h=s.history[d]||{xp:0, met:false};
  return {...s, readToday:{date:d, ids}, history:{...s.history, [d]:{...h, words:(h.words||0)+add}}};
}
function computeStreak(history){
  let d=new Date(); if(!history[dayKey(d)]?.met) d=addDays(d,-1);
  let n=0; while(history[dayKey(d)]?.met){ n++; d=addDays(d,-1); }
  return n;
}
function bestStreak(history){
  const days=Object.keys(history).filter(k=>history[k].met).sort(); let best=0, cur=0, prev=null;
  for(const k of days){ const d=new Date(k+'T12:00:00'); cur = prev && dayKey(addDays(prev,1))===k ? cur+1 : 1; best=Math.max(best,cur); prev=d; }
  return best;
}

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
  {id:'lesson1', icon:'🎓', name:'שיעור ראשון', desc:'סיימת שיעור בקורס', need:1, of:'lessons'},
  {id:'topic1', icon:'🧩', name:'מבחן נושא ראשון', desc:'עברת מבחן נושא', need:1, of:'topics'},
  {id:'course1', icon:'📜', name:'תעודת סיום', desc:'סיימת קורס שלם וקיבלת תעודה', need:1, of:'certs'},
  {id:'perfect', icon:'💯', name:'ציון מושלם', desc:'100% במבחן נושא', need:1, of:'perfect'},
  {id:'team', icon:'🤝', name:'לומדים ביחד', desc:'הצטרפת לקבוצת לימוד', need:1, of:'group'}
];
function badgeStats(s){ const st=computeStreak(s.history), best=Math.max(st, bestStreak(s.history));
  return { stories:Object.keys(s.storiesDone||{}).length, known:Object.keys(s.words).filter(k=>s.words[k]==='known'&&!NAMES.has(k)).length, streak:best,
    reviews:(s.totals&&s.totals.reviews)||0, talks:Object.keys(s.talkDone||{}).filter(id=>TALKS.some(t=>t.id===id)).length, sounds:Object.values(s.phon||{}).filter(x=>x.c>=2).length,
    mine:(s.userStories||[]).length, group:s.group?1:0, lessons:Object.keys(csOf(s).lessons).length, topics:Object.keys(csOf(s).topics).length, certs:Object.keys(csOf(s).certs).length, perfect:csOf(s).perfect||0 }; }

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
  return stories.filter(x=>!x.community && !(s.storiesDone||{})[x.id] && isOpenLevel(x.level, known, s.unlocked))
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
  if(story.image) return <img src={story.image} alt={`תמונת שער של הסיפור ${story.title}`} className={`object-cover shrink-0 ${className}`} style={{width:size, height:size, borderRadius:radius}}/>;
  return <span className={`grid place-items-center shrink-0 ${className}`} style={{width:size, height:size, borderRadius:radius, fontSize:size*.55, background:'var(--sunk)'}} role="img" aria-label="איור הסיפור">{story.cover||'📖'}</span>;
}
function StatusPill({kind, n, label}){
  const L={new:'חדשות', learning:'בלמידה', known:'מוכרות'};
  return <span className={`pill pill-${kind}`}><span className="pill-dot" aria-hidden="true"></span>{n!=null&&<b className="num">{n}</b>}{label||L[kind]}</span>;
}

/* ---------- optional online translation (only when the reader presses the button) ---------- */
async function fetchTranslation(text, pair){
  const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+(pair||'en|he'));
  const j=await r.json(); const t=j&&j.responseData&&j.responseData.translatedText;
  if(!t || /MYMEMORY WARNING|QUERY LENGTH|INVALID/i.test(t)) throw new Error('no translation');
  return t;
}

const POS_HE={noun:'שם עצם',verb:'פועל',adjective:'שם תואר',adverb:'תואר הפועל',preposition:'מילת יחס',pronoun:'כינוי גוף',conjunction:'מילת קישור',interjection:'קריאה',exclamation:'קריאה',numeral:'מספר',determiner:'מילית'};
/* full online lookup: Free Dictionary API for definition, synonyms and examples; MyMemory for Hebrew */
async function lookupOnline(word, haveHe){
  const out={t:Date.now()};
  try{ const r=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word));
    if(r.ok){ const j=await r.json(); const ms=(j&&j[0]&&j[0].meanings)||[];
      out.pos=[...new Set(ms.map(m=>m.partOfSpeech).filter(Boolean))].slice(0,2);
      const defs=ms.flatMap(m=>m.definitions||[]);
      if(defs[0]) out.def=String(defs[0].definition).slice(0,240);
      out.syn=[...new Set([...ms.flatMap(m=>m.synonyms||[]), ...defs.flatMap(d=>d.synonyms||[])].map(s=>String(s).toLowerCase()).filter(s=>/^[a-z'-]+$/.test(s) && s!==word))].slice(0,6);
      out.ex=defs.filter(d=>d.example && countWords(d.example)<=16).slice(0,2).map(d=>({en:String(d.example)})); } }catch(e){}
  if(!haveHe){ try{ out.he=await fetchTranslation(word); }catch(e){} }
  if(out.def){ try{ out.defHe=await fetchTranslation(out.def); }catch(e){} }
  for(const x of (out.ex||[])){ try{ x.he=await fetchTranslation(x.en); }catch(e){} }
  if(!out.def && !out.he) throw new Error('nothing found');
  return out;
}

/* ---------- example sentences: hand-written bank + story sentences with aligned Hebrew ---------- */
const LEMMA_CACHE=new Map();
const baseOf=k=>{ let b=LEMMA_CACHE.get(k); if(b===undefined){ const l=MEANING[k]?null:findLemma(k); b=l?l[0]:k; LEMMA_CACHE.set(k,b); } return b; };
let EX_LIST=null, EX_SIG='';
function exampleList(stories){
  const sig=stories.map(s=>s.id+':'+s.paras.length).join(',');
  if(EX_LIST && sig===EX_SIG) return EX_LIST;
  const list=[]; const push=(en,he,src)=>{ const keys=(en.match(WORD_RE)||[]).map(w=>w.toLowerCase()); if(keys.length<2) return; list.push({en, he:he||null, n:keys.length, keys:new Set(keys), bases:new Set(keys.map(baseOf)), src}); };
  BANK_SRC.split('\n').forEach(l=>{ const i=l.indexOf('|'); if(i>0) push(l.slice(0,i).trim(), l.slice(i+1).trim(), 0); });
  for(const s of stories) for(const p of s.paras){ const en=splitSentences(p.en), he=p.he?splitSentences(p.he):[];
    en.forEach((sen,i)=>push(sen, he.length===en.length?he[i]:null, 1)); }
  EX_LIST=list; EX_SIG=sig; return list;
}
function examplesFor(key, stories){
  const b=baseOf(key); const seen=new Set();
  const all=exampleList(stories).filter(x=>x.keys.has(key)||x.bases.has(b)||x.bases.has(key)).map(x=>({...x, sc:(x.he?0:10)+(x.keys.has(key)?0:3)+x.n/20}))
    .sort((p,q)=>p.sc-q.sc).filter(x=>{ if(seen.has(x.en)) return false; seen.add(x.en); return true; });
  const net=(NET[key]&&NET[key].ex||[]).map(x=>({en:x.en, he:x.he||null, net:true, n:(x.en.match(WORD_RE)||[]).length}));
  // SHORT sentences only (up to 10 words), at most 2 per word; when a word only has longer story sentences, the shortest one (up to 14 words) stands in
  const pool=[...all, ...net]; let hits=pool.filter(x=>x.n<=10).slice(0,2);
  if(!hits.length){ const s=pool.filter(x=>x.n<=14).sort((p,q)=>p.n-q.n)[0]; if(s) hits=[s]; }
  return hits;
}

/* ---------- dictionary search (both directions) ---------- */
const stripHe=s=>s.replace(/[\u0591-\u05C7]/g,'').replace(/\([^)]*\)/g,' ').replace(/[־"'׳״.,!?–-]/g,' ').replace(/\s+/g,' ').trim();
const isHebrew=s=>/[\u05D0-\u05EA]/.test(s);
let HE_IDX=null, HE_SIG='';
function allKeys(){ return [...new Set([...Object.keys(MEANING), ...Object.keys(CUSTOM), ...Object.keys(NET).filter(k=>NET[k].he)])]; }
function searchDict(raw){
  const q=raw.trim(); if(!q) return [];
  if(isHebrew(q)){
    const sig=Object.keys(CUSTOM).length+':'+Object.keys(NET).length;
    if(!HE_IDX || sig!==HE_SIG){ HE_IDX=allKeys().filter(k=>!NAMES.has(k)).map(k=>({k, alts:String(wordInfo(k).he||'').split(/[\/·]/).map(stripHe).filter(Boolean)})); HE_SIG=sig; }
    const h=stripHe(q); const out=[];
    for(const e of HE_IDX){ let best=9;
      for(const a of e.alts){ const r = a===h?0 : (a==='ל'+h||a.replace(/^(ה|ל)/,'')===h)?1 : a.startsWith(h)?2 : (' '+a+' ').includes(' '+h+' ')?3 : (h.length>=3&&a.includes(h))?4 : 9; if(r<best) best=r; }
      if(best<9) out.push({k:e.k, r:best}); }
    return out.sort((a,b)=>a.r-b.r||a.k.length-b.k.length).slice(0,8).map(x=>x.k);
  }
  const e=q.toLowerCase().replace(/[^a-z' -]/g,'').trim(); if(!e) return [];
  const keys=allKeys(); const res=[];
  if(wordInfo(e).he) res.push(e);
  keys.filter(k=>k!==e&&k.startsWith(e)).sort((a,b)=>a.length-b.length||a.localeCompare(b)).slice(0,7).forEach(k=>res.push(k));
  if(res.length<4 && e.length>=3) keys.filter(k=>!res.includes(k)&&k.includes(e)).sort((a,b)=>a.length-b.length).slice(0,4).forEach(k=>res.push(k));
  return res.slice(0,8);
}

/* ---------- voice input ---------- */
const SR = typeof window!=='undefined' && (window.SpeechRecognition||window.webkitSpeechRecognition);
let DICTATION=null;
try{ if(window.claude&&window.claude.use) window.claude.use('dictation').then(d=>{ DICTATION=d; }).catch(()=>{}); }catch(e){}
const LISTEN_ERR={
  not_granted:'אין הרשאה למיקרופון. לחצו על סמל המנעול ליד כתובת האתר, אשרו מיקרופון ונסו שוב.',
  unavailable:'זיהוי דיבור לא זמין כאן. אפשר להקליד.',
  rate_limited:'יותר מדי ניסיונות. נסו שוב בעוד רגע.',
  upstream_error:'המיקרופון או שירות זיהוי הדיבור לא הגיבו. בדקו שהמיקרופון מחובר ונסו שוב.',
  nospeech:'לא שמעתי כלום. לחצו על המיקרופון ודברו מיד.',
  network:'זיהוי הדיבור צריך חיבור לאינטרנט.',
  unsupported:'הדפדפן הזה לא תומך בזיהוי דיבור. נסו ב־Chrome או ב־Edge, או הקלידו.',
  failed:'זיהוי הדיבור לא הצליח. נסו שוב או הקלידו.'
};
/* listen for one phrase. lang: 'en' | 'he'. Returns a stop function. */
let ACTIVE_LISTEN=null;
function listenOnce({lang, onPartial, onText, onError, onState}){
  if(ACTIVE_LISTEN){ try{ ACTIVE_LISTEN(); }catch(e){} ACTIVE_LISTEN=null; }
  try{ synth&&synth.cancel(); }catch(e){}
  let done=false, partial='';
  const finish=(text,err)=>{ if(done) return; done=true; ACTIVE_LISTEN=null; onState&&onState(false);
    if(text&&text.trim()) onText(text.trim()); else if(err) onError&&onError(LISTEN_ERR[err]||LISTEN_ERR.failed); };
  if(DICTATION){ const d=DICTATION; const offs=[];
    offs.push(d.onPartial(({text})=>{ if(text&&text.trim()){ partial=text; onPartial&&onPartial(text.trim()); } }));
    offs.push(d.onFinal(({text})=>{ if(String(text||'').trim()){ cleanup(); d.stop().catch(()=>{}); finish(text); } }));
    offs.push(d.onState(({state, reason})=>{ if(state==='idle'){ cleanup(); finish(partial, partial?null:(LISTEN_ERR[reason]?reason:(reason==='stopped'||reason==='viewer_stopped'?null:'failed'))); } else onState&&onState(true); }));
    function cleanup(){ offs.splice(0).forEach(f=>{ try{ f(); }catch(e){} }); }
    onState&&onState(true);
    d.start({language: lang==='he'?'he':'en'}).catch(e=>{ cleanup(); finish(partial, e&&LISTEN_ERR[e.code]?e.code:(e&&e.code==='stopped'?null:'failed')); });
    ACTIVE_LISTEN=()=>{ d.stop().catch(()=>{}); };
    return ACTIVE_LISTEN; }
  if(!SR){ onError&&onError(LISTEN_ERR.unsupported); return ()=>{}; }
  const r=new SR(); r.lang=lang==='he'?'he-IL':'en-US'; r.interimResults=true; r.maxAlternatives=1;
  r.onresult=e=>{ let fin='', tmp=''; for(let i=0;i<e.results.length;i++){ const t=e.results[i][0].transcript; if(e.results[i].isFinal) fin+=t; else tmp+=t; }
    if(tmp||fin){ partial=fin||tmp; onPartial&&onPartial(partial.trim()); } if(fin){ try{ r.stop(); }catch(x){} finish(fin); } };
  r.onerror=e=>{ const c=e.error==='not-allowed'||e.error==='service-not-allowed'?'not_granted':e.error==='no-speech'?'nospeech':e.error==='network'?'network':e.error==='aborted'?null:'failed'; finish(partial, c); };
  r.onend=()=>finish(partial, partial?null:'nospeech');
  try{ r.start(); onState&&onState(true); }catch(e){ finish('', 'failed'); }
  ACTIVE_LISTEN=()=>{ try{ r.stop(); }catch(e){} };
  return ACTIVE_LISTEN;
}
let DOWNLOADS=null; try{ if(window.claude&&window.claude.use) window.claude.use('downloads').then(d=>{ DOWNLOADS=d; }).catch(()=>{}); }catch(e){}
let MIC_LANG='en'; try{ MIC_LANG=localStorage.getItem('lumi-mic-lang')==='he'?'he':'en'; }catch(e){}

/* ---------- speech ---------- */
const synth = typeof window!=='undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const KEEP=[]; const BOUNDARY_OK=new Set();
try{ synth&&synth.getVoices(); }catch(e){}   // warm up the voice list so the first click speaks without delay
const UNIT_MS=175;   // rough length of one spoken "beat" at normal speed, refined per voice
let CAL={}; try{ CAL=JSON.parse(localStorage.getItem('lumi-voice-cal')||'{}')||{}; }catch(e){ CAL={}; }
const wordWeight=w=>0.5+((w.toLowerCase().match(/[aeiouy]+/g)||[]).length||1)+w.length*0.06;
const pauseWeight=sep=>/[.!?]/.test(sep)?1.6:/[,;:\u2014\u2013]/.test(sep)?1.0:0;
function useVoices(){
  const [voices,setVoices]=useState([]);
  useEffect(()=>{ if(!synth) return;
    const load=()=>setVoices(synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang)||v.lang==='en'));
    load(); synth.addEventListener&&synth.addEventListener('voiceschanged', load);
    const t=setTimeout(load, 800);
    return ()=>{ synth.removeEventListener&&synth.removeEventListener('voiceschanged', load); clearTimeout(t); };
  },[]);
  return voices;
}
function chooseVoice(voices, name){
  if(!voices.length) return null;
  // the audience prefers a clear male voice: the owner chose Microsoft Christopher and Brian (Online Natural, Edge); other natural male voices next; then the old defaults
  return voices.find(v=>v.name===name)
    || voices.find(v=>/Microsoft Christopher Online \(Natural\)/i.test(v.name))
    || voices.find(v=>/Microsoft Brian Online \(Natural\)/i.test(v.name))
    || voices.find(v=>/(Guy|Ryan|Eric|Roger|Steffan|Andrew|Davis|Jason|Tony) Online \(Natural\)/i.test(v.name) && /en[-_]/i.test(v.lang))
    || voices.find(v=>/en[-_]US/i.test(v.lang) && v.localService)
    || voices.find(v=>/en[-_]US/i.test(v.lang))
    || voices.find(v=>/en[-_]GB/i.test(v.lang)) || voices[0];
}
let NOTIFY=()=>{}; let lastNote=0;
const notify=m=>{ const t=Date.now(); if(t-lastNote>2500){ lastNote=t; NOTIFY(m); } };
const NO_SPEECH='הדפדפן הזה לא תומך בהשמעה קולית. נסו ב־Chrome, ב־Edge או ב־Safari.';
const SPEECH_FAIL='ההשמעה נכשלה. בדקו שהשמע במכשיר פועל ונסו שוב.';
function speakText(text, rate, voice){
  if(!synth){ notify(NO_SPEECH); return; }
  try{ const busy=synth.speaking||synth.pending; if(busy) synth.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang=(voice&&voice.lang)||'en-US'; u.rate=rate; if(voice) u.voice=voice;
    u.onerror=e=>{ if(e.error!=='interrupted'&&e.error!=='canceled') notify(SPEECH_FAIL); };
    KEEP.push(u); if(KEEP.length>30) KEEP.shift();
    if(busy) setTimeout(()=>synth.speak(u), 40); else synth.speak(u); }catch(e){ notify(SPEECH_FAIL); }
}
/* Hebrew sentence with English words inside: each Latin run is isolated so punctuation never jumps */
function Bi({children}){
  if(typeof children!=='string') return <>{children}</>;
  const parts=children.split(/([A-Za-z][A-Za-z0-9'’+-]*(?:[ .][A-Za-z][A-Za-z0-9'’+-]*)*)/);
  return <>{parts.map((p,i)=> i%2 ? <bdi key={i} dir="ltr" lang="en">{p}</bdi> : p)}</>;
}
/* number that counts up smoothly when its value changes */
function Count({value}){
  const [shown,setShown]=useState(value); const from=useRef(value);
  useEffect(()=>{ const a=from.current, b=value; if(a===b) return;
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){ from.current=b; setShown(b); return; }
    let raf, t0=null; const step=t=>{ if(t0===null) t0=t; const f=Math.min(1,(t-t0)/500); const e=1-Math.pow(1-f,3); setShown(Math.round(a+(b-a)*e)); if(f<1) raf=requestAnimationFrame(step); else from.current=b; };
    raf=requestAnimationFrame(step); return ()=>{ cancelAnimationFrame(raf); from.current=b; }; },[value]);
  return <>{shown}</>;
}
/* ---------- shared dialog behavior (DEMO a11y): focus moves into the dialog, Tab is trapped, Escape closes the top dialog,
   the page behind is inert, and focus returns to the control that opened it ---------- */
const MODAL_STACK=[];
const FOCUSABLE_SEL='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
function useModal(onClose){
  const ref=useRef(null); const closeRef=useRef(onClose); closeRef.current=onClose;
  useEffect(()=>{
    const root=ref.current; if(!root) return;
    const dlg=root.querySelector('[role="dialog"],[role="alertdialog"]')||root;
    const trigger=document.activeElement;
    const parent=root.parentElement; const inerted=[];
    if(parent) [...parent.children].forEach(c=>{ if(c===root||c.hasAttribute('inert')||c.getAttribute('role')==='status'||c.classList.contains('toast-region')||c.classList.contains('confetti')||c.classList.contains('skip-link')) return; c.setAttribute('inert',''); inerted.push(c); });
    MODAL_STACK.push(root);
    if(!dlg.hasAttribute('tabindex')) dlg.setAttribute('tabindex','-1');
    const auto=dlg.querySelector('[data-autofocus]'); try{ (auto||dlg).focus({preventScroll:true}); }catch(e){}
    const key=e=>{
      if(MODAL_STACK[MODAL_STACK.length-1]!==root) return;
      if(e.key==='Escape'){ e.stopPropagation(); closeRef.current&&closeRef.current(); return; }
      if(e.key!=='Tab') return;
      const f=[...dlg.querySelectorAll(FOCUSABLE_SEL)].filter(el=>el.getClientRects().length>0);
      const a=document.activeElement;
      if(!f.length){ e.preventDefault(); dlg.focus(); return; }
      const first=f[0], last=f[f.length-1];
      if(!dlg.contains(a)){ e.preventDefault(); first.focus(); }
      else if(e.shiftKey&&(a===first||a===dlg)){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey&&a===last){ e.preventDefault(); first.focus(); } };
    document.addEventListener('keydown',key,true);
    return ()=>{ document.removeEventListener('keydown',key,true); const i=MODAL_STACK.indexOf(root); if(i>=0) MODAL_STACK.splice(i,1);
      inerted.forEach(c=>c.removeAttribute('inert'));
      const t=(trigger&&trigger.isConnected&&trigger!==document.body)?trigger:null;
      try{ if(t&&!t.closest('[inert]')) t.focus({preventScroll:true}); else if(!MODAL_STACK.length){ const m=document.getElementById('main'); m&&m.focus({preventScroll:true}); } }catch(e){} };
  },[]);
  return ref;
}
/* closing animation for dialogs: fade out, then unmount */
function useClosing(onClose){
  const [closing,setClosing]=useState(false);
  const close=useCallback(()=>{ setClosing(c=>{ if(!c) setTimeout(onClose,170); return true; }); },[onClose]);
  return [closing, close];
}
function useStoryPlayer(story, rate, voice, cbs){
  const [active,setActive]=useState(null);
  const [playing,setPlaying]=useState(false);
  const [curP,setCurP]=useState(0);
  const run=useRef(0), timers=useRef([]), cur=useRef({p:0, si:0, continuous:true});
  const rateRef=useRef(rate), voiceRef=useRef(voice), cbRef=useRef(cbs);
  rateRef.current=rate; voiceRef.current=voice; cbRef.current=cbs;
  const tokens=storyData(story).tokens;
  const clearTimers=()=>{ timers.current.forEach(clearTimeout); timers.current=[]; };
  const stop=useCallback(()=>{ run.current++; clearTimers(); try{ synth&&synth.cancel(); }catch(e){} setPlaying(false); setActive(null); },[]);
  // Each paragraph is read sentence by sentence: the highlight re-syncs at every sentence start,
  // and when a voice gives no word events its real speed is measured and used for the next sentences.
  const units=useMemo(()=>story.paras.map((para,p)=>{
    const text=para.en, toks=tokens[p], out=[]; const re=/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g; let m;
    const parts=[]; while((m=re.exec(text))){ const seg=m[0]; const wc=(seg.match(WORD_RE)||[]).length;
      if(wc>9){ const cut=/[\s\S]*?[,;:](?=\s)\s*|[\s\S]+$/g; let c; while((c=cut.exec(seg))) if(c[0].trim()) parts.push({index:m.index+c.index, 0:c[0]}); }
      else parts.push({index:m.index, 0:seg}); }
    for(const m of parts){ const s=m.index, e=s+m[0].length;
      const words=[]; toks.forEach((t,i)=>{ if(t.t==='w'&&t.start>=s&&t.start<e){ const sep=toks[i+1]&&toks[i+1].t==='s'?toks[i+1].text:''; words.push({wi:t.wi, start:t.start, w:wordWeight(t.text), pause:pauseWeight(sep)}); } });
      if(words.length) out.push({s, lead:m[0].length-m[0].trimStart().length, text:m[0].trim(), words}); }
    if(!out.length) out.push({s:0, lead:0, text, words:toks.filter(t=>t.t==='w').map(t=>({wi:t.wi, start:t.start, w:wordWeight(t.text), pause:0}))});
    return out; }),[story, tokens]);
  const speakUnit=useCallback((p, si, continuous, chained)=>{
    if(!synth) return;
    const id=++run.current; clearTimers(); if(!chained){ try{ synth.cancel(); }catch(e){} }
    const unit=units[p][si]; if(!unit){ setPlaying(false); setActive(null); return; }
    cur.current={p, si, continuous}; setCurP(p); setPlaying(true); if(!chained) setActive({p, wi:unit.words[0]?unit.words[0].wi:0});
    const r=rateRef.current, v=voiceRef.current, vkey=(v&&v.name)||'default', ckey=vkey+'|'+r;
    const u=new SpeechSynthesisUtterance(unit.text);
    u.lang=(v&&v.lang)||'en-US'; u.rate=r; if(v) u.voice=v;
    let gotBoundary=false, startedAt=0, estTotal=0;
    const fallback=()=>{ const k=(CAL[ckey]||CAL[vkey]||1)*UNIT_MS/r; let t=0; const elapsed=performance.now()-startedAt;
      unit.words.forEach((w,i)=>{ const at=t*k; timers.current.push(setTimeout(()=>{ if(id===run.current && !gotBoundary) setActive({p, wi:w.wi}); }, Math.max(0, at-elapsed)));
        t+=w.w+(i<unit.words.length-1?w.pause:0); }); };
    u.onstart=()=>{ if(id!==run.current) return; startedAt=performance.now(); setActive({p, wi:unit.words[0]?unit.words[0].wi:0});
      estTotal=unit.words.reduce((a,w,i)=>a+w.w+(i<unit.words.length-1?w.pause:0),0)+0.4;
      if(BOUNDARY_OK.has(vkey)) return;
      timers.current.push(setTimeout(()=>{ if(!gotBoundary && id===run.current) fallback(); }, 250)); };
    u.onboundary=(e)=>{ if(id!==run.current) return; if(e.name && e.name!=='word') return;
      if(!gotBoundary){ gotBoundary=true; BOUNDARY_OK.add(vkey); clearTimers(); }
      const abs=e.charIndex+unit.s+unit.lead; let hit=unit.words[0]; for(const w of unit.words){ if(w.start<=abs) hit=w; else break; }
      if(hit) setActive({p, wi:hit.wi}); };
    const done=(ok)=>{ if(id!==run.current) return; clearTimers();
      if(ok && !gotBoundary && startedAt && estTotal>2){ const k=(performance.now()-startedAt)/(estTotal*UNIT_MS/r);   // learn this voice's real speed
        if(k>0.4&&k<2.5){ CAL[ckey]=CAL[ckey]?CAL[ckey]*0.4+k*0.6:k; CAL[vkey]=CAL[ckey]; try{ localStorage.setItem('lumi-voice-cal', JSON.stringify(CAL)); }catch(e){} } }
      if(ok && si+1<units[p].length){ speakUnit(p, si+1, continuous, true); return; }
      if(ok && cbRef.current.onPara) cbRef.current.onPara(p);
      if(ok && continuous && p+1<story.paras.length){ speakUnit(p+1, 0, true, true); return; }
      setPlaying(false); setActive(null);
      if(ok && continuous && p+1>=story.paras.length){ setCurP(0); cbRef.current.onFinish&&cbRef.current.onFinish(); } };
    u.onend=()=>done(true);
    u.onerror=(e)=>{ if(e.error==='interrupted'||e.error==='canceled') return; notify(SPEECH_FAIL); done(false); };
    KEEP.push(u); if(KEEP.length>30) KEEP.shift();
    if(chained) synth.speak(u); else setTimeout(()=>{ if(id===run.current) synth.speak(u); }, 70);
  },[story, tokens, units]);
  const speakPara=useCallback((p, continuous)=>speakUnit(p, 0, continuous, false),[speakUnit]);
  useEffect(()=>{ if(playing) speakUnit(cur.current.p, cur.current.si||0, cur.current.continuous, false); },[rate, voice]);
  useEffect(()=>()=>{ run.current++; clearTimers(); try{ synth&&synth.cancel(); }catch(e){} },[story.id]);
  const jump=(p)=>{ const q=Math.max(0, Math.min(story.paras.length-1, p)); if(playing) speakPara(q, true); else setCurP(q); return q; };
  return { active, playing, curP, play:()=>speakPara(curP,true), playPara:(p)=>speakPara(p,false), stop, jump };
}

/* ---------- icons ---------- */
const Svg=({children, size=20, stroke=true, className=''})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke?'none':'currentColor'} stroke={stroke?'currentColor':'none'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
const IconSpeaker=p=><Svg {...p}><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></Svg>;
const IconPlay=p=><Svg {...p} stroke={false}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></Svg>;
const IconStop=p=><Svg {...p} stroke={false}><rect x="5.5" y="5.5" width="13" height="13" rx="2.5"/></Svg>;
const IconCheck=p=><Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5"/></Svg>;
const IconFlame=p=><Svg {...p} stroke={false}><path d="M12.6 2.4c.4 3.2 4.9 5.4 4.9 10.6a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4 2.4-5.1.3 1.7 1.1 2.8 2.2 3.2.4-3.4-.6-6 1.5-8.7z"/></Svg>;
const IconChevR=p=><Svg {...p}><path d="M9 6l6 6-6 6"/></Svg>;
const IconChevL=p=><Svg {...p}><path d="M15 6l-6 6 6 6"/></Svg>;
const IconX=p=><Svg {...p}><path d="M6 6l12 12M18 6 6 18"/></Svg>;
const IconCap=p=><Svg {...p}><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/></Svg>;
const IconBook=p=><Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></Svg>;
const IconBolt=p=><Svg {...p} stroke={false}><path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z"/></Svg>;
const IconChart=p=><Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></Svg>;
const IconEar=p=><Svg {...p}><path d="M6 9a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3.5 3.5 0 0 1-7 0"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3"/></Svg>;
const IconPlus=p=><Svg {...p}><path d="M12 5v14M5 12h14"/></Svg>;
const IconEye=p=><Svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Svg>;
const IconEyeOff=p=><Svg {...p}><path d="M10.7 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A16.7 16.7 0 0 0 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></Svg>;
const IconSlow=p=><Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>;
const IconLock=p=><Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Svg>;
const IconClock=p=><Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>;
const IconPrev=p=><Svg {...p} stroke={false}><path d="M6 5h2v14H6zM20 5.5v13a.8.8 0 0 1-1.2.7L9 12.7a.8.8 0 0 1 0-1.4l9.8-6.5a.8.8 0 0 1 1.2.7z"/></Svg>;
const IconNext=p=><Svg {...p} stroke={false}><path d="M16 5h2v14h-2zM4 5.5v13a.8.8 0 0 0 1.2.7L15 12.7a.8.8 0 0 0 0-1.4L5.2 4.8A.8.8 0 0 0 4 5.5z"/></Svg>;
const IconSearch=p=><Svg {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></Svg>;
const IconMic=p=><Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></Svg>;
const IconCopy=p=><Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></Svg>;
const IconPen=p=><Svg {...p}><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/></Svg>;
const IconWave=p=><Svg {...p}><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/></Svg>;
const IconChat=p=><Svg {...p}><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/></Svg>;
const IconUsers=p=><Svg {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3.2 3.2 0 0 1 0 6.3M18 14.3c1.9.9 3 2.9 3 5.7"/></Svg>;
const IconHome=p=><Svg {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/></Svg>;
const IconUser=p=><Svg {...p}><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8"/></Svg>;
const IconTrophy=p=><Svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7"/></Svg>;
/* brand mark: a white "L" with a warm light dot (Lumi = light) on a sage tile */
function LogoMark({size=44, radius=12}){
  const u=React.useId().replace(/[^a-zA-Z0-9]/g,'');   // unique gradient ids: a hidden copy must not break the visible ones
  return (<svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Lumi English" style={{display:'block', borderRadius:radius}}>
    <defs><linearGradient id={'lb'+u} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3A9486"/><stop offset="1" stopColor="#1F5F57"/></linearGradient>
      <radialGradient id={'lg'+u}><stop offset="0" stopColor="#FFE7A3" stopOpacity=".95"/><stop offset="1" stopColor="#FFE7A3" stopOpacity="0"/></radialGradient></defs>
    <rect width="64" height="64" rx="16" fill={`url(#lb${u})`}/>
    <circle cx="44.5" cy="19.5" r="14" fill={`url(#lg${u})`}/>
    <path d="M18 13h9.5v28.5H46V50H18z" fill="#FFFEFB"/>
    <circle cx="44.5" cy="19.5" r="6.2" fill="#F4C55B"/>
  </svg>);
}
const IconTrash=p=><Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></Svg>;

/* ---------- small UI ---------- */
function Confetti({big}){
  const colors=['var(--sun)','var(--coral)','var(--primary)','var(--good)','#7CC4FF','#FF9BD2'];
  const n=big?90:28;
  const pieces=useMemo(()=>Array.from({length:n},(_,i)=>({ left:Math.random()*100, delay:Math.random()*(big?.6:.25), dur:1.3+Math.random()*1.4, dx:(Math.random()-.5)*240, rot:(Math.random()*900-450)+'deg', c:colors[i%colors.length], w:6+Math.random()*7 })),[]);
  return <div className="confetti" aria-hidden="true">{pieces.map((p,i)=><i key={i} style={{left:p.left+'%', background:p.c, width:p.w, height:p.w*1.4, animationDuration:p.dur+'s', animationDelay:p.delay+'s', '--dx':p.dx+'px', '--rot':p.rot}}/>)}</div>;
}
function Ring({value, max, size=46, stroke=6, children}){
  const r=(size-stroke)/2, c=2*Math.PI*r, f=Math.min(1, max?value/max:0);
  return (<div className="relative inline-grid place-items-center" style={{width:size, height:size}}>
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={f>=1?'var(--good)':'var(--sun)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-f)} style={{transition:'stroke-dashoffset .5s ease-out'}}/>
    </svg>
    <div className="absolute inset-0 grid place-items-center">{children}</div>
  </div>);
}
function Toggle({checked, onChange, label, hint, id}){
  return (<label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
    <button id={id} type="button" role="switch" aria-checked={checked} className="toggle" onClick={()=>onChange(!checked)}></button>
    <span className="leading-tight"><span className="font-semibold block">{label}</span>{hint&&<span className="text-xs text-muted">{hint}</span>}</span>
  </label>);
}

/* ---------- level meter (top of screen) ---------- */
function LevelMeter({known, unlocked}){
  const lv=levelFor(known); const L=LEVELS[lv-1]; const left=L.next?L.next-known:0;
  return (<div className="rounded-2xl border border-line bg-surface px-4 py-3 flex flex-col gap-2">
    <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
      <span className="font-bold">שלב <span className="num">{lv}</span> מתוך 4 · {L.name}</span>
      <span className="text-sm text-muted ms-auto">{L.next ? <>עוד <b className="num text-ink"><Count value={left}/></b> {left===1?'מילה מוכרת':'מילים מוכרות'} לפתיחת שלב <span className="num">{lv+1}</span></> : 'הגעת לשלב הגבוה ביותר. כל הסיפורים פתוחים.'}</span>
    </div>
    <div className="grid grid-cols-4 gap-1.5" dir="rtl" role="img" aria-label={`שלב ${lv} מתוך 4, ${known} מילים מוכרות`}>
      {LEVELS.map(l=>{ const span=(l.next||l.min+150)-l.min; const f=known>=(l.next||Infinity)?1:known<l.min?0:Math.min(1,(known-l.min+(l.n===1?0:1))/span);
        const done=l.n<lv, cur=l.n===lv;
        return (<div key={l.n} className="flex flex-col gap-1">
          <div className="h-2 rounded-full bg-sunk overflow-hidden"><div className="h-full rounded-full bar" style={{width:(done?100:cur?Math.max(4,f*100):0)+'%', background:done?'var(--good)':'var(--primary)'}}></div></div>
          <div className={`text-[11px] leading-tight flex items-center gap-1 ${cur?'font-semibold text-ink':'text-muted'}`}>
            {done?<IconCheck size={12}/>:(!cur&&!unlocked[l.n])?<IconLock size={11}/>:null}<span className="num">{l.n}</span><span className="hidden sm:inline truncate">· {l.name}</span><span className="num ms-auto hidden md:inline whitespace-nowrap" dir="ltr">{l.next?`${l.min}–${l.next-1}`:`${l.min-1}+`}</span>
          </div>
        </div>); })}
    </div>
  </div>);
}

/* ---------- header ---------- */
function Header({known, streak, todayXP, goal, unlocked, onNav, profile, onProfile, onHome, onSearch}){
  const [bump,setBump]=useState(false); const prev=useRef(known);
  useEffect(()=>{ if(known>prev.current){ setBump(true); const t=setTimeout(()=>setBump(false),550); prev.current=known; return ()=>clearTimeout(t);} prev.current=known; },[known]);
  return (<header aria-label="כותרת האתר" className="bg-surface border-b border-line">
    <div className="gutter"><div className="max-w-[860px] mx-auto py-3 flex flex-col gap-3">
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap hc-hdr-row">
        <button type="button" onClick={onHome} className="hc-brand" aria-label="Lumi English, חזרה לדף הבית"><LogoMark size={36} radius={11}/><span className="hc-brand-name" dir="ltr" lang="en" aria-hidden="true">Lumi English</span></button>
        <button type="button" onClick={onSearch} className="btn btn-ghost hc-searchicon" aria-label="חיפוש מילה במילון"><IconSearch size={20}/></button>
        <button type="button" onClick={onProfile} className="hc-profile flex items-center gap-2.5 rounded-xl ps-1.5 pe-3 min-h-[48px] me-auto text-start" style={{background:'var(--sunk)'}} aria-haspopup="dialog">
          <span className="w-9 h-9 rounded-lg grid place-items-center text-xl bg-surface" aria-hidden="true">{profile.avatar}</span>
          <span className="leading-tight"><span className="font-bold block">שלום, <bdi>{profile.name}</bdi></span><span className="text-xs text-muted block hc-hide-sm"><bdi dir="ltr" lang="en">Lumi English</bdi> · הגדרות</span><span className="sr-only">. פתיחת הגדרות המשתמש</span></span>
        </button>
        {LOCAL_ONLY&&<span className="tag demo-badge" role="note" title="העותק הזה לא מתחבר לענן ולא שולח שום דבר לשרת">גרסת דמו</span>}
        <button type="button" onClick={()=>onNav('progress')} className={`goal-chip ${todayXP>=goal?'is-done':''}`} title="היעד היומי. לחיצה פותחת את ההתקדמות">
          <span className="flex items-baseline gap-1.5 w-full"><span className="text-[11px] font-bold">יעד יומי</span><b className="num ms-auto text-sm">{Math.min(todayXP,goal)}/{goal}<span className="sr-only"> נקודות</span></b></span>
          <span className="goal-track" dir="ltr" aria-hidden="true"><span className="goal-fill bar" style={{width:Math.min(100,todayXP/goal*100)+'%'}}></span></span>
          <span className="text-[11px] text-muted w-full text-start">{todayXP>=goal?'הושלם היום ✓':todayXP>0?`עוד ${goal-todayXP} נק׳ להיום`:'סיפור קצר אחד ואתה בדרך'}</span>
        </button>
      </div>
    </div></div>
  </header>);
}
/* 4 places instead of 6. Each screen ("view") belongs to one place; the old screens live inside them unchanged. */
const PLACE_OF={home:'home', courses:'learn', read:'learn', sounds:'learn', practice:'train', talk:'train', progress:'me', group:'me', community:'me'};
const SCREEN_NAMES={home:'בית', courses:'קורסים', read:'הספרייה', sounds:'צלילים ואותיות', practice:'תרגול', talk:'שיחה', progress:'התקדמות', group:'קבוצת לימוד', community:'סיפורי קהילה'};
const PLACE_SUBS={
  learn:[['courses','קורסים',IconCap],['read','סיפורים',IconBook],['sounds','צלילים',IconWave]],
  train:[['practice','כרטיסי חזרה ותרגול',IconBolt],['talk','שיחה',IconChat]],
  me:[['progress','התקדמות',IconChart],['group','קבוצת לימוד',IconUsers],['community','סיפורי קהילה',IconBook]]
};
function Tabs({tab, setTab, due}){
  const place=PLACE_OF[tab]||'home';
  const tabs=[['home','בית',IconHome],['learn','לימוד',IconCap],['train','תרגול',IconBolt],['me','אני',IconUser]];
  return (<nav className="sticky z-30 bg-surface border-b border-line" style={{top:'calc(env(safe-area-inset-top,0px) + 64px)'}} aria-label="ניווט ראשי">
    <div className="gutter"><div className="max-w-[860px] mx-auto flex gap-1">
      {tabs.map(([k,l,I])=><button key={k} type="button" onClick={()=>setTab(k)} aria-current={place===k?'page':undefined}
        className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 flex-1 px-1 sm:px-3 py-2 sm:py-3 text-sm font-semibold border-b-2 -mb-px relative ${place===k?'border-primary text-primary':'border-transparent text-muted hover:text-ink'}`}><I size={18}/>{l}{k==='train'&&due>0&&<span className="num text-[11px] rounded-full px-1.5 py-0.5 absolute sm:static top-1 end-1" style={{background:'var(--learn-bg)', color:'var(--ink)'}} title="כרטיסים שמחכים לחזרה">{due}<span className="sr-only"> כרטיסים מחכים לחזרה</span></span>}</button>)}
    </div></div>
  </nav>);
}
/* the site's segmented control, used to switch between the screens inside one place */
function SubNav({tab, setTab}){
  const subs=PLACE_SUBS[PLACE_OF[tab]]; if(!subs) return null;
  return (<nav className="seg self-start mb-5" aria-label="מסכים באזור הזה" style={{flexWrap:'wrap', maxWidth:'100%'}}>
    {subs.map(([k,l,I])=><button key={k} type="button" aria-current={tab===k?'page':undefined} onClick={()=>setTab(k)} className="flex items-center gap-1.5"><I size={16}/>{l}</button>)}
  </nav>);
}

/* ---------- one heading row for every main screen: same place, same height, same size; only the words change ---------- */
const TAB_HEAD={
  courses:['קורסים','שלב אחרי שלב, בקצב שלך'], read:['סיפורים','קוראים אנגלית ולומדים מילים בדרך'], sounds:['צלילים','לשמוע ולהגות כל אות'],
  practice:['תרגול','כמה דקות של חזרה בכל יום'], talk:['שיחה','להשתמש באנגלית, בקול'],
  progress:['ההתקדמות שלי','מה למדת ואיפה אתה עומד'], group:['קבוצת לימוד','לומדים יחד עם חברים'], community:['סיפורי קהילה','סיפורים שכתבו לומדים']};
const MOTIVATE=['כל מילה חדשה היא עוד צעד. אין צורך למהר.','מי שלומד קצת בכל יום, מגיע רחוק.','אין בושה לטעות. כך לומדים.','כמה דקות בשקט עם אנגלית, וזה מספיק להיום.','הסבלנות היא חצי מהלמידה.','חוזרים על מה שלמדת, והמילים נשארות.','אפשר להתחיל מחדש בכל רגע.','הלימוד הולך בקצב שלך.'];
const dayIndex=()=>Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
function TabHead({tab, place, name, known, showSub, setTab, onSettings}){
  const home=tab==='home'; const [title,sub]=home?[<>שלום, <bdi>{name}</bdi></>, known>0?'כמה דקות של אנגלית, ומתקדמים.':'כאן לומדים אנגלית בסבלנות, כמה דקות ביום.']:(TAB_HEAD[tab]||['','']);
  return (<div className="tab-head">
    <div className="tab-head-top"><div className="tab-head-text"><h1 className="tab-h1" data-tab-h1>{title}</h1><p className="tab-sub">{sub}</p></div>
      {place==='me'?<button type="button" className="btn btn-ghost tab-head-btn" onClick={onSettings}><IconUser size={18}/>הגדרות וחשבון</button>
        :<span className="lx-uri-avatar tab-head-uri" aria-hidden="true"><img src="assets/uri.png" alt="" width="475" height="642" decoding="async" draggable="false"/></span>}</div>
    <div className="tab-slot">{home?<p className="tab-quote">{MOTIVATE[dayIndex()%MOTIVATE.length]}</p>:(showSub&&<SubNav tab={tab} setTab={setTab}/>)}</div>
  </div>);
}

/* ---------- cloud (Supabase): accounts, progress sync, community stories ---------- */
/* The publishable key is meant to be public: it ships inside every Supabase web app. Access is decided by the
   row level security rules in supabase-setup.sql and supabase-community.sql, not by hiding this key. */
const CLOUD_CFG={ url:'https://jiwsiutwvqdcafmiqxox.supabase.co', key:'sb_publishable_EfvswdyANwtEjarf0FhQrA_K6-KgDZj' };
const ANALYTICS_CODE='';   // GoatCounter site code (the part before .goatcounter.com). Empty = no visit counting and no policy section.
const SUPPORT_EMAIL='info@lumienglish.co.il';
const LOCAL_ONLY=false;  // production: Supabase cloud card, community, study groups and the AI talk are live
const ACCOUNTS=false;    // the new e-mail + password account flow (sign-up, sign-in, forgot password, backup code) is still a localStorage mock: hidden here until Supabase Auth + an e-mail sender are connected (docs/16 in lumi-future-lab)
let SB=null;
try{ if(!LOCAL_ONLY && !/claudeusercontent\.com$|(^|\.)claude\.ai$/.test(location.hostname) && window.supabase&&window.supabase.createClient) SB=window.supabase.createClient(CLOUD_CFG.url, CLOUD_CFG.key, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'lumi-auth'}}); }catch(e){ SB=null; }
const CLOUD_ERR={ 'Invalid login credentials':'המייל או הסיסמה לא נכונים.', 'Email not confirmed':'עוד לא אישרת את המייל. בדקו את תיבת הדואר (גם בספאם) ולחצו על הקישור.',
  'User already registered':'כבר יש חשבון עם המייל הזה. נסו להתחבר.', 'Password should be at least 6 characters':'הסיסמה צריכה לפחות 6 תווים.' };
const cloudMsg=e=>{ const m=(e&&e.message)||''; for(const k in CLOUD_ERR) if(m.includes(k)) return CLOUD_ERR[k]; if(/fetch|network|Failed to/i.test(m)) return 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.'; if(/rate|too many/i.test(m)) return 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.'; return 'משהו השתבש: '+m; };
let SESSION=null; const SESSION_SUBS=new Set(); let RECOVERY=false;
if(SB){ SB.auth.getSession().then(({data})=>{ SESSION=data.session; SESSION_SUBS.forEach(f=>f()); }).catch(()=>{});
  SB.auth.onAuthStateChange((ev,s)=>{ SESSION=s; if(ev==='PASSWORD_RECOVERY') RECOVERY=true; SESSION_SUBS.forEach(f=>f()); }); }
function useSession(){ const [,set]=useState(0); useEffect(()=>{ const f=()=>set(x=>x+1); SESSION_SUBS.add(f); return ()=>SESSION_SUBS.delete(f); },[]); return SESSION; }
async function cloudPull(){ const u=SESSION&&SESSION.user; if(!u) return null;
  const {data,error}=await SB.from('progress').select('data,updated_at').eq('user_id',u.id).maybeSingle(); if(error) throw error; return data; }
async function cloudPush(payload){ const u=SESSION&&SESSION.user; if(!u) return null; const at=new Date().toISOString();
  const {error}=await SB.from('progress').upsert({user_id:u.id, data:payload, updated_at:at}); if(error) throw error; return at; }
/* remove anything that could be markup or invisible control characters from user text */
function cleanText(s, max){ return String(s||'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g,'').replace(/[ \t]+/g,' ').trim().slice(0,max||60000); }

function AuthForm({onDone, intro}){
  const [mode,setMode]=useState('in'); const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(null);
  if(!SB) return <p className="text-sm text-muted">{LOCAL_ONLY?'בגרסת הדמו ההתחברות כבויה. באתר האמיתי היא עובדת כרגיל.':<>שמירה בענן זמינה באתר <bdi dir="ltr" lang="en">lumienglish.co.il</bdi>.</>}</p>;
  const submit=async e=>{ e.preventDefault(); setBusy(true); setMsg(null);
    try{
      if(mode==='forgot'){ const {error}=await SB.auth.resetPasswordForEmail(email.trim(),{redirectTo:SITE_URL+'/'}); if(error) throw error; setMsg({ok:true, t:'שלחנו לך מייל עם קישור לבחירת סיסמה חדשה.'}); }
      else if(mode==='up'){ const nm=cleanText(name,40); if(nm.length<2){ setMsg({ok:false, t:'כתבו את השם שלכם (לפחות 2 תווים).'}); setBusy(false); return; }
        const {data,error}=await SB.auth.signUp({email:email.trim(), password:pw, options:{emailRedirectTo:SITE_URL+'/', data:{name:nm}}}); if(error) throw error;
        if(data.session) onDone(data.session); else setMsg({ok:true, t:'נרשמת! שלחנו מייל אישור. לחצו על הקישור במייל, ואז התחברו כאן.'}); }
      else { const {data,error}=await SB.auth.signInWithPassword({email:email.trim(), password:pw}); if(error) throw error; onDone(data.session); }
    }catch(x){ setMsg({ok:false, t:cloudMsg(x)}); } setBusy(false); };
  return (<form className="flex flex-col gap-3" onSubmit={submit}>
    {intro&&<p className="text-sm text-muted">{intro}</p>}
    {mode!=='forgot'&&<div className="seg self-start" role="group" aria-label="כניסה או הרשמה"><button type="button" aria-pressed={mode==='in'} onClick={()=>setMode('in')}>התחברות</button><button type="button" aria-pressed={mode==='up'} onClick={()=>setMode('up')}>הרשמה</button></div>}
    {mode==='up'&&<label className="flex flex-col gap-1"><span className="text-sm font-semibold">שם</span><input id="auth-name" type="text" className="field" autoComplete="name" required minLength={2} maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label>}
    <label className="flex flex-col gap-1"><span className="text-sm font-semibold">מייל</span><input id="auth-email" type="email" dir="ltr" className="field text-left" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    {mode!=='forgot'&&<label className="flex flex-col gap-1"><span className="text-sm font-semibold">סיסמה{mode==='up'?' (לפחות 6 תווים)':''}</span><input id="auth-pw" type="password" dir="ltr" className="field text-left" autoComplete={mode==='up'?'new-password':'current-password'} minLength={6} required value={pw} onChange={e=>setPw(e.target.value)}/></label>}
    {msg&&<div className="rounded-xl p-3 text-sm" role={msg.ok?'status':'alert'} style={{background:msg.ok?'var(--known-bg)':'var(--bad-soft)', color:msg.ok?'var(--known)':'var(--bad)'}}><Bi>{msg.t}</Bi></div>}
    <div className="flex gap-2 flex-wrap items-center">
      <button className="btn btn-primary px-5" disabled={busy}>{busy?'רגע…':mode==='in'?'התחברות':mode==='up'?'יצירת חשבון':'שליחת קישור'}</button>
      {mode==='in'&&<button type="button" className="hit text-sm text-primary font-semibold" onClick={()=>{ setMode('forgot'); setMsg(null); }}>שכחתי סיסמה</button>}
      {mode==='forgot'&&<button type="button" className="hit text-sm text-muted underline" onClick={()=>setMode('in')}>חזרה להתחברות</button>}
    </div>
  </form>);
}
function RecoveryDialog({onClose}){
  const [pw,setPw]=useState(''); const [msg,setMsg]=useState(null); const [busy,setBusy]=useState(false);
  const save=async e=>{ e.preventDefault(); setBusy(true); const {error}=await SB.auth.updateUser({password:pw}); setBusy(false);
    if(error) setMsg({ok:false,t:cloudMsg(error)}); else { setMsg({ok:true,t:'הסיסמה עודכנה. אפשר להמשיך ללמוד.'}); RECOVERY=false; setTimeout(onClose,1500); } };
  return (<div className="overlay fixed inset-0 z-[60] grid place-items-center gutter" style={{background:'color-mix(in srgb,var(--ink) 45%,transparent)'}}>
    <form role="dialog" aria-modal="true" aria-label="בחירת סיסמה חדשה" className="sheet card w-full p-6 flex flex-col gap-3" style={{maxWidth:'26rem'}} onSubmit={save}>
      <h2 className="text-xl font-extrabold">בחירת סיסמה חדשה</h2>
      <input id="recovery-pw" type="password" dir="ltr" className="field text-left" autoComplete="new-password" minLength={6} required autoFocus placeholder="לפחות 6 תווים" value={pw} onChange={e=>setPw(e.target.value)}/>
      {msg&&<div className="rounded-xl p-3 text-sm" role="status" style={{background:msg.ok?'var(--known-bg)':'var(--bad-soft)'}}>{msg.t}</div>}
      <div className="flex gap-2"><button className="btn btn-primary px-5" disabled={busy}>שמירה</button><button type="button" className="btn btn-ghost px-4" onClick={()=>{ RECOVERY=false; onClose(); }}>ביטול</button></div>
    </form></div>);
}

/* community stories */
let COMMUNITY=[]; let COMMUNITY_AT=0; const COMMUNITY_SUBS=new Set(); let COMMUNITY_ERR='';
const toStory=r=>({ id:'c_'+r.id, cid:r.id, community:true, ownerId:r.user_id, author:r.author_name, hidden:r.is_approved===false, level:r.level||1, title:cleanText(r.title,120), he:'', blurb:'',
  tags:[r.topic||'יומיום'], cover:r.cover_emoji||'🌍', image:(r.cover_image&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(r.cover_image))?r.cover_image:null,
  paras:splitParas(cleanText(r.content)).map(en=>({en})), raw:r });
async function loadCommunity(force){
  if(!SB) return; if(!force&&Date.now()-COMMUNITY_AT<60000) return;
  try{ const {data,error}=await SB.from('community_stories').select('id,user_id,author_name,title,content,level,topic,cover_emoji,cover_image,is_approved,created_at').order('created_at',{ascending:false}).limit(60);
    if(error) throw error; COMMUNITY=(data||[]).map(toStory); COMMUNITY_AT=Date.now(); COMMUNITY_ERR=''; }
  catch(e){ COMMUNITY_ERR=cloudMsg(e); }
  COMMUNITY_SUBS.forEach(f=>f());
}
function useCommunity(){ const [,set]=useState(0); useEffect(()=>{ const f=()=>set(x=>x+1); COMMUNITY_SUBS.add(f); loadCommunity(); return ()=>COMMUNITY_SUBS.delete(f); },[]); return COMMUNITY; }
async function publishStory(st, author, editId){
  const row={ author_name:cleanText(author,40)||'לומד/ת', title:cleanText(st.title,120), content:cleanText(st.paras.map(p=>p.en).join('\n\n')), level:st.level, topic:(st.tags&&st.tags[0])||'יומיום',
    cover_emoji:st.image?null:(st.cover||'📖'), cover_image:st.image||null };
  const q=editId ? SB.from('community_stories').update(row).eq('id',editId).select().single() : SB.from('community_stories').insert({...row, user_id:SESSION.user.id}).select().single();
  const {data,error}=await q; if(error) throw error; await loadCommunity(true); return toStory(data);
}
async function deleteCommunityStory(id){ const {error}=await SB.from('community_stories').delete().eq('id',id); if(error) throw error; await loadCommunity(true); }
const REPORT_REASONS=[['inappropriate','תוכן לא הולם או פוגעני'],['copyright','הפרת זכויות יוצרים'],['spam','ספאם או פרסומת'],['other','סיבה אחרת']];
function ReportDialog({story, onClose, toast}){
  const [closing, close]=useClosing(onClose); const [reason,setReason]=useState(''); const [details,setDetails]=useState(''); const [busy,setBusy]=useState(false); const [err,setErr]=useState('');
  const mref=useModal(close);
  const send=async e=>{ e.preventDefault(); setBusy(true); setErr('');
    const {error}=await SB.from('story_reports').insert({story_id:story.cid, reason, details:cleanText(details,500)||null, reporter_id:(SESSION&&SESSION.user&&SESSION.user.id)||null});
    setBusy(false); if(error) setErr(cloudMsg(error)); else { toast('תודה, הדיווח נשלח ונבדוק אותו'); close(); } };
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <form role="dialog" aria-modal="true" aria-label="דיווח על תוכן" className={`sheet card w-full sm:max-w-md rounded-b-none sm:rounded-[20px] p-5 flex flex-col gap-3 ${closing?'out':''}`} onClick={e=>e.stopPropagation()} onSubmit={send}>
      <div className="flex items-center gap-3"><h2 className="text-xl font-extrabold me-auto">דיווח על תוכן</h2><button type="button" className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <p className="text-sm text-muted">על הסיפור <bdi dir="ltr" lang="en" className="book">{story.title}</bdi>. הדיווח אנונימי, ומנהלי האתר יבדקו אותו.</p>
      <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold mb-1">מה הבעיה?</legend>
        {REPORT_REASONS.map(([k,l])=><label key={k} className="flex items-center gap-3 rounded-xl bg-sunk px-3 min-h-[44px] cursor-pointer"><input type="radio" className="w-5 h-5" name="report-reason" value={k} checked={reason===k} onChange={()=>setReason(k)}/>{l}</label>)}</fieldset>
      <label className="flex flex-col gap-1"><span className="text-sm font-semibold">פרטים נוספים (לא חובה)</span><textarea id="report-details" className="field" rows={3} maxLength={500} value={details} onChange={e=>setDetails(e.target.value)}></textarea></label>
      {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{err}</div>}
      <div className="flex gap-2"><button className="btn btn-primary px-5" disabled={!reason||busy}>{busy?'שולח…':'שליחת דיווח'}</button><button type="button" className="btn btn-ghost px-4" onClick={close}>ביטול</button></div>
    </form></div>);
}

/* ---------- legal pages ---------- */
const LEGAL={
  terms:{title:'תנאי שימוש', body:[
    ['על השירות','Lumi English היא פלטפורמה לימודית לתרגול אישי של השפה האנגלית. השימוש באתר חינמי ומיועד ללמידה אישית בלבד.'],
    ['תוכן שמשתמשים מעלים','המשתמש אחראי באופן בלעדי לחוקיות התוכן שהוא מעלה, כולל סיפורים ותמונות, ולכך שיש לו את הזכויות לעשות בו שימוש, בין אם הוא נשמר באופן פרטי ובין אם הוא משותף בספריית הקהילה. אין להעלות תוכן המוגן בזכויות יוצרים בלי רשות מבעל הזכויות, ואין להעלות תוכן פוגעני, מאיים, גזעני או בלתי חוקי.'],
    ['סיפורי קהילה','בפרסום סיפור בספריית הקהילה, המשתמש מאשר שהסיפור נכתב על ידו או שאינו מוגן בזכויות יוצרים, ומסכים שהוא יוצג לכלל משתמשי האתר. הנהלת האתר רשאית להסיר כל סיפור מספריית הקהילה, לפי שיקול דעתה ובלי הודעה מוקדמת, ובכלל זה בעקבות דיווחים של משתמשים.'],
    ['אחריות','השירות ניתן כפי שהוא (As-Is). איננו מתחייבים שהשירות יפעל ללא הפסקות או תקלות, ולא נישא באחריות לנזק שייגרם בשל הפסקות זמניות, תקלות טכניות או אובדן נתונים. מומלץ להוריד מדי פעם גיבוי של ההתקדמות.'],
    ['שינויים','אנו רשאים לעדכן את תנאי השימוש מעת לעת. המשך השימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים.']]},
  privacy:{title:'מדיניות פרטיות', draft:'טיוטה: הסעיף "חשבון ושמירת התקדמות" נכתב לגרסת הדמו ועדיין לא אושר על ידי איש מקצוע. בדמו לא נוצר חשבון אמיתי ושום מידע לא נשלח.', body:[
    ['חשבון ושמירת התקדמות',['אפשר ללמוד ב־Lumi English בלי הרשמה. אם תבחר להירשם, נשמור את כתובת המייל שלך, סיסמה מוצפנת (אנחנו לא רואים את הסיסמה עצמה) ואת ההתקדמות שלך בלימוד: שיעורים שהשלמת, מילים שנשמרו והגדרות.','אנחנו משתמשים במידע הזה רק כדי להפעיל את החשבון: לשמור את ההתקדמות, לאפשר לך להיכנס ממכשירים שונים, ולשלוח מיילים שקשורים לחשבון בלבד (אישור כתובת ושחזור סיסמה).','איננו מוכרים את המידע, איננו מעבירים אותו למפרסמים, ואיננו שולחים הודעות פרסומיות בלי הסכמה נפרדת מפורשת.','המידע נשמר אצל ספק שירותי הענן שלנו (Supabase). [להשלים: באיזה אזור גאוגרפי נשמרים הנתונים.]','נשמור את המידע כל עוד החשבון קיים. אפשר למחוק את החשבון בכל עת בלשונית "אני", ואז נמחק את המייל ואת ההתקדמות השמורה.','אפשר לבקש לעיין במידע שנשמר עליך, לתקן אותו או למחוק אותו, בפנייה אל info@lumienglish.co.il.','מי שלא נרשם: ההתקדמות שלו נשמרת רק במכשיר שלו ואינה נשלחת אלינו.']],
    ['איזה מידע נאסף','כשנרשמים לשמירה בענן, נשמרים השם וכתובת המייל שמסרתם (לצורך התחברות וקשר), התקדמות הלמידה (מילים מוכרות ומילים בלמידה, היסטוריית תרגול, רצף והישגים), הסיפורים והתמונות שהעליתם, ושם התצוגה שבחרתם. בלי הרשמה, כל המידע נשמר רק בדפדפן שלכם ולא נשלח אלינו.'],
    ['איפה המידע נשמר','המידע נשמר בתשתית ענן מאובטחת של Supabase. כל משתמש מבודד ברמת השורה, באמצעות מנגנון ההרשאות של Supabase: רק אתם יכולים לקרוא ולשנות את ההתקדמות שלכם. סיפורים שבחרתם לפרסם כציבוריים גלויים לכל המשתמשים יחד עם שם התצוגה שבחרתם, ללא כתובת המייל.'],
    ['שיתוף עם צדדים שלישיים','איננו מוכרים את המידע שלכם, ואיננו משתפים אותו עם מפרסמים או עם צדדים שלישיים לצורכי שיווק. המידע משמש רק להפעלת השירות.'],
    ['שירותים חיצוניים','חיפוש מילה שאינה במילון המובנה נשלח לשירותי מילון ותרגום חיצוניים (dictionaryapi.dev ו־MyMemory). שיחה חופשית עם ה־AI שולחת את ההודעות שלכם לספק הבינה המלאכותית של האתר (Groq או Google Gemini) כדי לקבל תשובה, ואיננו שומרים אותן. זיהוי דיבור מתבצע על ידי הדפדפן שלכם. קבוצות לימוד שומרות שם, דמות ונקודות בלבד.'],
    ...(ANALYTICS_CODE?[['ספירת כניסות','האתר משתמש ב־GoatCounter, שירות סטטיסטיקה ידידותי לפרטיות, כדי לספור כניסות: דפים שנצפו, מדינה וסוג דפדפן. השירות לא משתמש בעוגיות, לא עוקב אחרי אנשים בנפרד, ולא נמכר או משותף לצורכי פרסום. הוא פועל רק באתר עצמו, לא בהתקדמות הלימוד שלכם.']]:[]),
    ['מחיקת חשבון ונתונים','אפשר למחוק את החשבון וכל הנתונים בכל רגע: לוחצים על השם שלכם בראש המסך ובוחרים "מחק את החשבון והנתונים שלי". המחיקה סופית. אפשר גם לבקש מחיקה במייל לכתובת שבעמוד "צור קשר".']]},
  access:{title:'הצהרת נגישות', draft:'טיוטה: הצהרה זו נכתבה כטיוטה לגרסת הדמו ועדיין לא אושרה על ידי בעל האתר. אין לראות בה הצהרה משפטית סופית.', body:[
    ['המחויבות שלנו','אנו פועלים להנגיש את האתר לאנשים עם מוגבלויות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג־2013, ולתקן הישראלי ת"י 5568 המבוסס על הנחיות WCAG 2.1. היעד שלנו הוא רמת AA. האתר עדיין בתהליך שיפור, ואיננו מצהירים על עמידה מלאה בתקן.'],
    ['תאריך הבדיקה האחרונה','19 בנובמבר 2026. זו בדיקה פנימית של צוות האתר ולא סקירה של מומחה נגישות מוסמך.'],
    ['מה נבדק',['בדיקה אוטומטית עם הכלי axe-core, לפי כללי WCAG 2.1 ברמות A ו־AA, בכל מסכי האתר, במסך רחב ובמסך טלפון, במצב בהיר ובמצב כהה.','חישוב ניגודיות לכל צמד צבעים בטקסט וברכיבי ממשק.','מעבר מלא במקלדת: Tab, Shift+Tab, Enter, רווח ו־Escape, כולל חלונות קופצים.','הגדלת טקסט עד 200% ובדיקת הקטנת תנועה לפי הגדרת מערכת ההפעלה.','לא נבדקנו עד כה עם קוראי מסך אמיתיים (NVDA, JAWS, VoiceOver).']],
    ['התאמות שבוצעו באתר',['מבנה כותרות ואזורי דף (כותרת, ניווט, תוכן ראשי, תחתית) עם שמות בעברית, וקישור לדילוג לתוכן.','כל הפקדים נגישים במקלדת, עם סימון מיקוד ברור בשני מצבי הצבע.','חלונות קופצים שומרים את המיקוד בתוכם, נסגרים ב־Escape ומחזירים את המיקוד.','תוויות לכל שדה וכפתור סמלים, והודעות מערכת מוקראות לקורא מסך.','כפתורים בגודל נוח למגע (לפחות 44 פיקסלים), וגודל טקסט מינימלי של 14 פיקסלים.','התאמה לבקשת מערכת ההפעלה להפחתת תנועה.']],
    ['מגבלות ידועות',['לסרטוני השיעורים אין עדיין כתוביות ותמלול. בינתיים מופיעה הערה "תמלול זמין בקרוב".','תעתיקי ההגייה האוטומטיים למילים שאינן במילון הם משוערים.','זיהוי הדיבור והמיקרופון תלויים בדפדפן ופועלים ב־Chrome וב־Edge.','בתרגול המהיר יש מגבלת זמן של שתי דקות שאי אפשר להאריך.','סיפורים שמשתמשים מוסיפים בעצמם עשויים לכלול תמונות בלי תיאור.']],
    ['רכז הנגישות',['שם הרכז: [להשלמה על ידי הבעלים]','טלפון: [להשלמה על ידי הבעלים]','דואר אלקטרוני: info@lumienglish.co.il','נתקלתם בבעיית נגישות? כתבו לנו וציינו את העמוד, את הבעיה ואת הדפדפן. נשתדל לענות תוך 14 ימים.']],
    ['עדכון ההצהרה','טיוטה מתאריך 19 בנובמבר 2026.']]},
  contact:{title:'צור קשר', body:[['שאלות, בקשות ודיווחים','לכל שאלה, בקשה למחיקת נתונים, דיווח על בעיית נגישות או על תוכן, כתבו לנו:']]}
};
function LegalModal({page, onClose}){
  const [closing, close]=useClosing(onClose); const P=LEGAL[page]; const [copied,setCopied]=useState(false);
  const mref=useModal(close);
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-labelledby="legal-title" className={`sheet card w-full sm:max-w-2xl rounded-b-none sm:rounded-[20px] flex flex-col ${closing?'out':''}`} style={{maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3 p-5 border-b border-line"><h2 id="legal-title" className="text-2xl font-extrabold me-auto">{P.title}</h2>
        <button className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 legal" tabIndex={0} role="region" aria-label={P.title+': התוכן'} style={{paddingBottom:'max(24px, env(safe-area-inset-bottom,0px))'}}>
        {P.draft&&<p className="draft-banner" role="note">{P.draft}</p>}
        {P.body.map(([h,t])=><section key={h}><h3 className="text-lg font-extrabold mb-1">{h}</h3>{Array.isArray(t)?<ul className="legal-list leading-relaxed">{t.map(x=><li key={x}><Bi>{x}</Bi></li>)}</ul>:<p className="leading-relaxed"><Bi>{t}</Bi></p>}</section>)}
        {page==='access'&&<div className="flex items-center gap-2 flex-wrap"><a className="btn btn-line px-4" href={'mailto:'+SUPPORT_EMAIL}>כתיבה לרכז הנגישות: <bdi dir="ltr" lang="en">{SUPPORT_EMAIL}</bdi></a></div>}
        {page==='contact'&&<div className="flex items-center gap-2 flex-wrap"><bdi dir="ltr" className="text-xl font-bold select-all rounded-xl bg-sunk px-4 py-2">{SUPPORT_EMAIL}</bdi>
          <button className="btn btn-line px-4" onClick={async()=>{ if(await copyText(SUPPORT_EMAIL)) setCopied(true); }}>{copied?'הועתק ✓':'העתקת הכתובת'}</button></div>}
      </div>
    </div></div>);
}
function Footer({onOpen}){
  const L=[['terms','תנאי שימוש'],['privacy','מדיניות פרטיות'],['access','הצהרת נגישות'],['contact','צור קשר']];
  return (<footer aria-label="תחתית האתר" className="gutter border-t border-line mt-10" style={{paddingBlock:'20px 32px'}}><div className="max-w-[860px] mx-auto flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted">
    <span className="me-auto"><bdi dir="ltr" lang="en">Lumi English</bdi> · לומדים אנגלית בסבלנות</span>
    <nav aria-label="מידע משפטי ונגישות"><ul className="ft-links">{L.map(([k,l])=><li key={k}><a href={'#'+k} onClick={e=>{ e.preventDefault(); onOpen(k); }} aria-haspopup="dialog">{l}</a></li>)}</ul></nav>
  </div></footer>);
}

/* ---------- cloud account card + progress sync ---------- */
const cloudPayload=s=>{ const {cloud, ...rest}=s; return {...rest, settings:{...rest.settings, voice:''}}; };
function CloudSync({state, actions, toast}){
  const session=useSession(); const uid=session&&session.user&&session.user.id;
  const [ask,setAsk]=useState(null); const timer=useRef(null); const lastPushed=useRef(''); const stateRef=useRef(state); stateRef.current=state;
  useEffect(()=>{ if(!SB||!uid) return; let dead=false;
    (async()=>{ try{ const r=await cloudPull(); if(dead) return; const s=stateRef.current; const linked=s.cloud&&s.cloud.uid===uid;
      if(!r){ const at=await cloudPush(cloudPayload(s)); actions.setCloud({uid, at}); lastPushed.current=JSON.stringify(cloudPayload(s)); toast('ההתקדמות הועלתה לענן'); }
      else if(linked){ if(Date.parse(r.updated_at)>Date.parse(s.cloud.at)+1500){ lastPushed.current=JSON.stringify(r.data); actions.restore({...r.data, cloud:{uid, at:r.updated_at}}); toast('ההתקדמות עודכנה מהענן'); } else lastPushed.current=''; }
      else setAsk(r);
    }catch(e){ toast(cloudMsg(e)); } })(); return ()=>{ dead=true; }; },[uid]);
  useEffect(()=>{ if(!SB||!uid||!(state.cloud&&state.cloud.uid===uid)) return; const body=JSON.stringify(cloudPayload(state)); if(body===lastPushed.current) return;
    clearTimeout(timer.current); timer.current=setTimeout(async()=>{ try{ const at=await cloudPush(JSON.parse(body)); lastPushed.current=body; actions.setCloud({uid, at}); }catch(e){} },4000);
    return ()=>clearTimeout(timer.current); },[state, uid]);
  if(!ask) return null;
  const nk=o=>Object.keys((o&&o.words)||{}).filter(k=>o.words[k]==='known').length;
  const useRemote=()=>{ lastPushed.current=JSON.stringify(ask.data); actions.restore({...ask.data, cloud:{uid, at:ask.updated_at}}); setAsk(null); toast('ההתקדמות נטענה מהענן'); };
  const useLocal=async()=>{ try{ const at=await cloudPush(cloudPayload(state)); actions.setCloud({uid, at}); lastPushed.current=JSON.stringify(cloudPayload(state)); setAsk(null); toast('ההתקדמות מהמכשיר הועלתה לענן'); }catch(e){ toast(cloudMsg(e)); } };
  return (<div className="overlay fixed inset-0 z-[60] grid place-items-center gutter" style={{background:'color-mix(in srgb,var(--ink) 45%,transparent)'}}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="sync-title" className="sheet card w-full p-6 flex flex-col gap-4" style={{maxWidth:'30rem'}}>
      <h2 id="sync-title" className="text-xl font-extrabold">נמצאה התקדמות בענן</h2>
      <p className="text-sm text-muted leading-relaxed">בחשבון הזה כבר שמורה התקדמות ({nk(ask.data)} מילים מוכרות). במכשיר הזה יש התקדמות אחרת ({nk(state)} מילים מוכרות). איזו להשאיר?</p>
      <button className="btn btn-go py-3 px-5" onClick={useRemote}>להשתמש בהתקדמות מהענן ({nk(ask.data)} מילים)</button>
      <button className="btn btn-line py-3 px-5" onClick={useLocal}>להחליף את הענן במה שבמכשיר ({nk(state)} מילים)</button>
      <button className="hit text-sm text-muted underline self-start" onClick={()=>{ setAsk(null); SB.auth.signOut(); }}>ביטול והתנתקות</button>
    </div></div>);
}
function CloudCard({state, actions, toast, onClose}){
  const session=useSession(); const user=session&&session.user; const [busy,setBusy]=useState(false); const [confirm,setConfirm]=useState(false); const [typed,setTyped]=useState('');
  const linked=user&&state.cloud&&state.cloud.uid===user.id;
  const del=async()=>{ setBusy(true); try{ const {error}=await SB.rpc('delete_my_account'); if(error) throw error; await SB.auth.signOut().catch(()=>{}); actions.setCloud(null); COMMUNITY_AT=0; toast('החשבון והנתונים בענן נמחקו'); onClose&&onClose(); }catch(e){ toast(cloudMsg(e)); setBusy(false); } };
  return (<div className="border-t border-line pt-4 flex flex-col gap-3">
    <div className="font-semibold flex items-center gap-2">☁️ שמירה בענן{user&&<span className="tag" style={{background:'var(--known-bg)', color:'var(--known)'}}>מחובר</span>}</div>
    {!SB ? <p className="text-sm text-muted">{LOCAL_ONLY?'בגרסת הדמו השמירה בענן כבויה. ההתקדמות נשמרת רק בדפדפן הזה.':<>שמירה בענן זמינה באתר <bdi dir="ltr" lang="en">lumienglish.co.il</bdi>.</>}</p>
    : !user ? <AuthForm intro="עם חשבון ההתקדמות שלכם נשמרת בענן, וזמינה בכל מכשיר. בלי חשבון, הכול נשמר רק בדפדפן הזה." onDone={()=>{}}/>
    : <>
      <p className="text-sm text-muted leading-relaxed">מחוברים כ־<bdi dir="ltr" className="font-bold text-ink">{user.email}</bdi>. {linked?<>ההתקדמות מסונכרנת אוטומטית{state.cloud.at?<> · עודכן לאחרונה ב־<span className="num">{new Date(state.cloud.at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span></>:null}.</>:'ההתקדמות של המשתמש הזה עדיין לא מחוברת לחשבון.'}</p>
      <div className="flex gap-2 flex-wrap"><button className="btn btn-ghost px-4 text-sm" onClick={async()=>{ await SB.auth.signOut(); actions.setCloud(null); toast('התנתקת'); }}>התנתקות</button></div>
      {!confirm ? <button className="hit text-sm underline self-start" style={{color:'var(--bad)'}} onClick={()=>setConfirm(true)}>מחק את החשבון והנתונים שלי</button>
      : <div className="rounded-xl border p-3 flex flex-col gap-2" style={{borderColor:'var(--bad)'}} role="alertdialog" aria-label="אישור מחיקת חשבון">
          <div className="text-sm leading-relaxed"><b>מחיקה סופית.</b> החשבון, ההתקדמות בענן והסיפורים שפרסמתם יימחקו ולא ניתן לשחזר אותם. ההתקדמות השמורה בדפדפן הזה תישאר, אלא אם תמחקו אותה בנפרד. כדי לאשר, כתבו <b>מחק</b>:</div>
          <input id="del-confirm" className="field" value={typed} onChange={e=>setTyped(e.target.value)} aria-label="כתבו מחק לאישור" autoComplete="off"/>
          <div className="flex gap-2"><button className="btn py-2 px-4" style={{background:'var(--bad)', color:'var(--surface)'}} disabled={typed.trim()!=='מחק'||busy} onClick={del}>{busy?'מוחק…':'מחק את הכול'}</button><button className="btn btn-ghost py-2 px-4" onClick={()=>{ setConfirm(false); setTyped(''); }}>ביטול</button></div>
        </div>}
    </>}
  </div>);
}

/* ---------- free conversation with AI (Gemini through the site's /api/talk function) ---------- */
const AI_OK=!LOCAL_ONLY && !/claudeusercontent\.com$|(^|\.)claude\.ai$/.test(location.hostname);
const aiApi=()=>ON_SITE?'/api/talk':SITE_URL+'/api/talk';   // evaluated lazily: ON_SITE and SITE_URL are defined further down
const AI_SCEN=[['free','💬','שיחה חופשית'],['smalltalk','👋','מה נשמע?'],['cafe','☕','בבית קפה'],['travel','🗺️','טיולים'],['shop','👕','בחנות'],['job','💼','ראיון עבודה'],['doctor','🩺','אצל הרופא']];
const AI_ERR={ not_configured:'ה־AI עוד לא הופעל באתר. בעל האתר צריך להוסיף מפתח לשירות ה־AI.', anon_limit:'הגעתם למגבלה היומית של אורחים. התחברו לחשבון כדי להמשיך (למשתמשים רשומים יש יותר הודעות).', user_limit:'הגעתם למגבלה היומית. נמשיך מחר!',
  site_limit:'השיחה עם ה־AI עמוסה היום. נסו שוב מחר.', busy:'ה־AI עמוס כרגע. נסו שוב בעוד רגע.', bad_key:'המפתח של שירות ה־AI לא תקין. בעל האתר צריך ליצור מפתח חדש ולהדביק אותו ב־Cloudflare.', no_model:'ה־AI לא זמין כרגע. נסו שוב מאוחר יותר.', upstream:'ה־AI לא הגיב. נסו שוב בעוד רגע.', empty:'ה־AI לא הגיב. נסו שוב.', bad_messages:'משהו השתבש בשיחה. התחילו שיחה חדשה.', net:'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.', no_credits:'שיחת ה־AI לא זמינה כרגע: הקרדיט בחשבון שירות ה־AI של האתר נגמר. שאר האפליקציה ושיחות ההכנה ממשיכות לעבוד.' };
async function aiCall(body){
  if(LOCAL_ONLY) throw new Error('local');
  const headers={'content-type':'application/json'}; const tok=SESSION&&SESSION.access_token; if(tok) headers.authorization='Bearer '+tok;
  let r; try{ r=await fetch(aiApi(),{method:'POST', headers, body:JSON.stringify(body)}); }catch(e){ throw new Error('net'); }
  let j=null; try{ j=await r.json(); }catch(e){} if(!r.ok||!j||j.error){ const er=new Error((j&&j.error)||'net'); er.detail=(j&&j.detail)||String(r.status); throw er; } return j;
}
function AiChat({scenario, level, name, voice, actions, settings, onBack}){
  const [msgs,setMsgs]=useState([]); const [text,setText]=useState(''); const [busy,setBusy]=useState(true); const [err,setErr]=useState(''); const [listening,setListening]=useState(false); const [sent,setSent]=useState(0); const [detail,setDetail]=useState('');
  const endRef=useRef(null), stopRef=useRef(null), started=useRef(false); const showHe=settings.talkHe!==false; const scen=AI_SCEN.find(x=>x[0]===scenario)||AI_SCEN[0];
  const hist=m=>m.filter(x=>x.from==='bot'||x.from==='me').map(x=>x.from==='bot'?{role:'model',text:x.en}:{role:'user',text:x.text});
  const ask=async(list)=>{ setBusy(true); setErr('');
    try{ const r=await aiCall({messages:hist(list), scenario, level, name});
      setMsgs(m=>{ const n=[...m]; if(r.correction&&n.length&&n[n.length-1].from==='me') n[n.length-1]={...n[n.length-1], correction:r.correction, tip:r.tip_he}; n.push({from:'bot', en:r.reply, he:r.reply_he}); return n; });
      speakText(r.reply,.9,voice); }
    catch(e){ setErr(AI_ERR[e.message]||AI_ERR.net); setDetail(e.detail||''); }
    setBusy(false); };
  useEffect(()=>{ if(started.current) return; started.current=true; ask([]); return ()=>{ stopRef.current&&stopRef.current(); }; },[]);
  useEffect(()=>{ endRef.current&&endRef.current.scrollIntoView&&endRef.current.scrollIntoView({block:'end', behavior:'smooth'}); },[msgs.length, busy, err]);
  const submit=(raw,spoken)=>{ const t=String(raw||'').trim().slice(0,400); if(!t||busy) return; setText(''); const next=[...msgs,{from:'me', text:t, spoken}]; setMsgs(next); setSent(n=>n+1); if(sent<12) actions.addXP(1); ask(next); };
  const mic=()=>{ setErr(''); if(listening){ stopRef.current&&stopRef.current(); return; } stopRef.current=listenOnce({lang:'en', onPartial:t=>setText(t), onText:t=>submit(t,true), onError:m=>setErr(m), onState:setListening}); };
  const finish=()=>{ stopRef.current&&stopRef.current(); if(sent>=3) actions.finishTalk('ai'); onBack(); };
  return (<div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn btn-ghost px-3 text-sm" onClick={finish}><IconChevR size={18}/>סיום השיחה</button>
      <span className="text-2xl" aria-hidden="true">{scen[1]}</span><div className="leading-tight me-auto"><div className="font-extrabold">שיחה עם לומי 🤖</div><div className="text-xs text-muted">{scen[2]} · שלב <span className="num">{level}</span></div></div>
      <Toggle id="tg-aihe" checked={showHe} onChange={v=>actions.setSetting('talkHe',v)} label="תרגום"/>
    </div>
    <section className="card p-3 sm:p-5 flex flex-col gap-3" style={{minHeight:'50vh'}} role="log" aria-live="polite" aria-label="השיחה">
      {msgs.map((m,i)=> m.from==='bot' ? (<div key={i} className="flex gap-2 items-start rise" dir="ltr">
          <div className="shrink-0 mt-1"><LogoMark size={34} radius={10}/></div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]" style={{background:'var(--sunk)'}}>
            <div className="book text-lg leading-relaxed text-left">{m.en}</div>{showHe&&m.he&&<div dir="rtl" className="text-sm text-muted mt-1 text-right">{m.he}</div>}</div>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1" style={{background:'var(--sunk)', color:'var(--muted)'}} onClick={()=>speakText(m.en,.9,voice)} aria-label="השמע שוב"><IconSpeaker size={15}/></button>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1 text-sm" style={{background:'var(--sunk)'}} onClick={()=>speakText(m.en,.55,voice)} aria-label="השמעה איטית"><IconSlow size={18}/></button></div>)
        : (<div key={i} className="flex flex-col items-end gap-1.5 rise" dir="ltr">
          <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]" style={{background:'var(--primary)', color:'var(--primary-ink)'}}>
            {m.spoken&&<div dir="rtl" className="text-xs opacity-80 mb-0.5 text-right flex items-center gap-1"><IconMic size={12}/>שמעתי:</div>}<div dir="auto" className="book text-lg leading-relaxed">{m.text}</div></div>
          {m.correction&&<div className="rounded-xl px-3 py-2 max-w-[85%] text-sm flex flex-col gap-1" style={{background:'var(--known-bg)', color:'var(--ink)'}}>
            <div className="flex items-center gap-2"><span className="font-bold" style={{color:'var(--known)'}} dir="rtl">ניסוח טוב יותר:</span>
              <button className="hit w-8 h-8 rounded-full grid place-items-center" onClick={()=>speakText(m.correction,.85,voice)} aria-label="השמעת הנוסח המתוקן"><IconSpeaker size={14}/></button></div>
            <div dir="ltr" lang="en" className="book text-base text-left">{m.correction}</div>{m.tip&&<div dir="rtl" className="text-xs text-muted text-right">{m.tip}</div>}</div>}
        </div>))}
      {busy&&<div className="flex gap-2 items-center text-muted text-sm" dir="rtl" role="status"><LogoMark size={28} radius={8}/>לומי חושבת…</div>}
      <div ref={endRef}></div>
    </section>
    {err&&<div className="rounded-xl p-3 text-sm flex items-center gap-3 flex-wrap" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><span className="flex-1"><Bi>{err}</Bi>{detail&&<details className="mt-1 text-xs opacity-80"><summary className="cursor-pointer">פרטים טכניים</summary><bdi dir="ltr" className="block text-left break-words select-all">{detail}</bdi></details>}</span>
      {msgs.length===0&&<button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>ask([])}>ניסיון חוזר</button>}{msgs.length>0&&msgs[msgs.length-1].from==='me'&&<button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>ask(msgs)}>שליחה מחדש</button>}</div>}
    <div className="talk-composer card p-2 flex items-center gap-2" dir="ltr">
      <button className={`btn w-14 h-14 shrink-0 ${listening?'pop':''}`} style={{borderRadius:'50%', background:listening?'var(--bad)':'var(--primary)', color:'var(--primary-ink)'}} onClick={mic} disabled={busy&&!listening} aria-label={listening?'עצירת ההקשבה':'דברו באנגלית'} aria-pressed={listening}><IconMic size={24}/></button>
      <form className="flex-1 min-w-0 flex items-center gap-2" onSubmit={e=>{ e.preventDefault(); submit(text,false); }}>
        <input id="ai-input" dir="ltr" className="field book text-lg flex-1 min-w-0" style={{minHeight:'48px'}} autoComplete="off" maxLength={400} placeholder={listening?'מקשיב…':'דבר או הקלד באנגלית'} value={text} onChange={e=>setText(e.target.value)}/>
        <button className="btn btn-primary h-12 px-4 shrink-0" disabled={!text.trim()||busy} aria-label="שליחה"><span dir="rtl">שלח</span></button></form>
    </div>
  </div>);
}
function AiTalkCard({known, onStart}){
  const [lv,setLv]=useState(levelFor(known)); const session=useSession();
  return (<section className="card ai-card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3"><span className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0" style={{background:'var(--primary-soft)'}} aria-hidden="true">🤖</span>
      <div><div className="eyebrow">למתקדמים</div><h2 className="text-xl sm:text-2xl font-extrabold">שיחה חופשית עם לומי (בינה מלאכותית)</h2></div></div>
    <p className="text-sm text-muted leading-relaxed">אפשר לדבר או להקליד כל דבר, ולומי עונה, שואלת ומתקנת בעדינות. היא מתאימה את האנגלית לרמה שלך.</p>
    {!AI_OK ? <p className="text-sm rounded-xl p-3" style={{background:'var(--sun-soft)'}}>{LOCAL_ONLY?'בגרסת הדמו השיחה החופשית כבויה, כדי שלא יהיו עלויות. באתר האמיתי היא עובדת כרגיל.':<>השיחה עם ה־AI זמינה באתר <bdi dir="ltr" lang="en">lumienglish.co.il</bdi>.</>}</p> : <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="בחירת נושא לשיחה">{AI_SCEN.map(([k,e,l])=><button key={k} className="filter-pill flex items-center gap-1.5" onClick={()=>onStart(k,lv)}><span aria-hidden="true">{e}</span>{l}</button>)}</div>
      <div className="flex items-center gap-2 flex-wrap text-sm"><span className="text-muted">רמת האנגלית:</span>
        <div className="seg" role="group" aria-label="רמת האנגלית">{LEVELS.map(L=><button key={L.n} aria-pressed={lv===L.n} onClick={()=>setLv(L.n)}>שלב {L.n}</button>)}</div></div>
      <p className="text-xs text-muted">{session?'מחוברים: עד 80 הודעות ביום.':'כאורחים אפשר עד 15 הודעות ביום. עם חשבון יש עד 80.'} ההודעות נשלחות לספק הבינה המלאכותית של האתר (Groq או Google Gemini) כדי לקבל תשובה, ואינן נשמרות אצלנו.</p></>}
  </section>);
}

/* ---------- library ---------- */
function StoryCard({story, state, locked, onOpen, onLocked}){
  const st=storyStats(story, state); const mins=readMinutes(st.d.words);
  return (<button type="button" onClick={locked?onLocked:onOpen} aria-disabled={locked||undefined}
    className={`story-card card card-btn text-start flex flex-col w-full ${locked?'is-locked':''} ${st.done?'is-read':''}`}>
    <div className={`lx-story-tile lx-lv${((story.level||1)-1)%4+1}`}>
      {story.image?<img src={story.image} alt={`תמונת שער של הסיפור ${story.title}`} className="lx-story-img"/>
        :<span className="lx-story-emoji" role="img" aria-label="איור הסיפור">{story.cover||'📖'}</span>}
      <span className="lx-lvchip">שלב <span className="num">{story.level}</span></span>
      {st.done&&<span className="read-badge lx-read"><IconCheck size={12}/>נקרא</span>}
      {locked&&<span className="lx-lock" role="img" aria-label="הסיפור נעול"><IconLock size={14}/></span>}
    </div>
    <div className="px-4 pt-3 flex flex-col gap-1">
      <div dir="ltr" className="story-title lx-story-title book text-left">{story.title}</div>
      {(story.he||story.blurb)&&<div className="text-sm text-muted lx-clamp1">{story.he}{story.he&&story.blurb?' · ':''}{story.blurb}</div>}
      {story.author&&<div className="meta">מאת <bdi>{story.author}</bdi></div>}
      <div className="meta"><span className="num">{mins}</span> דק׳ קריאה · <span className="num">{st.d.words}</span> מילים{(story.tags||[]).length?' · '+story.tags.slice(0,2).join(' · '):''}</div>
    </div>
    <div className="p-4 pt-3 mt-auto flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {st.newW>0?<StatusPill kind="new" n={st.newW} label={st.newW===1?'מילה חדשה':'מילים חדשות'}/>:<StatusPill kind="known" label="אין מילים חדשות"/>}
        {st.learnW>0&&<StatusPill kind="learning" n={st.learnW}/>}
        {story.real&&<span className="tag tag-real">סיפור אמיתי</span>}{story.user&&<span className="tag">שלי</span>}{story.community&&<span className="tag">🌍 קהילה</span>}{story.hidden&&<span className="tag" style={{background:'var(--bad-soft)',color:'var(--bad)'}}>מוסתר עד בדיקה</span>}
      </div>
      <div className="h-1.5 rounded-full bg-sunk overflow-hidden flex" dir="ltr" role="img" aria-label={`${st.pct}% מהמילים מוכרות`}>
        <div className="bar" style={{width:st.pct+'%', background:'var(--known)'}}></div><div className="bar" style={{width:Math.round(st.learnW/Math.max(1,st.d.keys.length)*100)+'%', background:'var(--learn)'}}></div>
      </div>
    </div>
  </button>);
}
function HeroCard({state, stories, known, openStory}){
  const last=state.lastStory&&stories.find(s=>s.id===state.lastStory.id);
  const recs=useMemo(()=>recommendStories(stories, state, known),[stories, state.words, state.storiesDone, known, state.unlocked]);
  const [i,setI]=useState(0);
  const story=last||recs[i%Math.max(1,recs.length)];
  if(!story) return (<section className="hero card p-5 sm:p-6"><div className="text-xl font-extrabold">סיימת את כל הסיפורים הפתוחים! 🎉</div><p className="text-muted mt-1">פתח שלב חדש, או הוסף סיפור משלך.</p></section>);
  const st=storyStats(story, state);
  return (<section className="hero card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
    <StoryCover story={story} size={96} radius={22}/>
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="eyebrow">{last?'המשך מאיפה שעצרת':'הסיפור המומלץ הבא בשבילך'}</div>
      <div dir="ltr" lang="en" className="book text-2xl sm:text-3xl font-bold text-left leading-tight">{story.title}</div>
      {story.he&&<div className="text-muted">{story.he}</div>}
      <div className="flex flex-wrap gap-1.5 items-center mt-1">
        <span className="meta">שלב {story.level} · {readMinutes(st.d.words)} דק׳ · {st.d.words} מילים</span>
        {st.newW>0&&<StatusPill kind="new" n={st.newW} label="מילים חדשות"/>}
      </div>
    </div>
    <div className="flex sm:flex-col gap-2 shrink-0">
      <button className="btn btn-go px-6 text-lg" style={{minHeight:'52px'}} onClick={()=>openStory(story.id)}><IconPlay size={18}/>{last?'המשך לקרוא':'בוא נקרא'}</button>
      {!last&&recs.length>1&&<button className="btn btn-ghost px-4 text-sm" onClick={()=>setI(x=>x+1)}>הצע סיפור אחר</button>}
    </div>
  </section>);
}
function LevelTracker({state, stories, known}){
  const lv=levelFor(known); const L=LEVELS[lv-1];
  const inLv=stories.filter(s=>s.level===lv&&!s.user); const readLv=inLv.filter(s=>(state.storiesDone||{})[s.id]).length;
  const pct=L.next?Math.min(100,Math.round((known-L.min+(lv===1?0:1))/(L.next-L.min)*100)):100; const left=L.next?L.next-known:0;
  return (<section className="card p-5 flex flex-col gap-3">
    <div className="flex items-end gap-3 flex-wrap">
      <div className="me-auto"><div className="eyebrow">ההתקדמות לשלב הבא</div>
        <div className="text-xl font-extrabold">{L.next?<>שלב {lv} ← שלב {lv+1}: {LEVELS[lv].name}</>:'הגעת לשלב הגבוה ביותר'}</div></div>
      <div className="num text-4xl font-extrabold" style={{color:'var(--primary)'}}>{pct}%</div>
    </div>
    <div className="h-3.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full rounded-full bar level-fill" style={{width:Math.max(3,pct)+'%'}}></div></div>
    <div className="grid sm:grid-cols-2 gap-2 text-sm">
      <div className="rounded-xl bg-sunk p-3 flex items-center gap-3"><StatusPill kind="known" n={known} label="מילים מוכרות"/>
        <span className="text-muted">{L.next?<>עוד <b className="num text-ink">{left}</b> לפתיחת שלב {lv+1}</>:'כל השלבים פתוחים'}</span></div>
      <div className="rounded-xl bg-sunk p-3 flex items-center gap-3"><span className="pill pill-read"><IconBook size={13}/><b className="num">{readLv}/{inLv.length}</b>סיפורים</span>
        <span className="text-muted">נקראו בשלב {lv}</span></div>
    </div>
  </section>);
}
const FILTERS=[['all','הכל'],['unread','לא נקראו'],['read','נקראו'],['rec','מומלצים']];
const SORTS=[['level','לפי שלב'],['short','קצרים קודם'],['long','ארוכים קודם'],['mostnew','הכי הרבה מילים חדשות'],['leastnew','הכי מעט מילים חדשות']];
function AddStoryTile({onAdd}){
  return (<button onClick={onAdd} className="add-tile text-center flex flex-col items-center justify-center gap-2 p-6">
    <span className="w-12 h-12 rounded-full grid place-items-center" style={{background:'var(--primary-soft)', color:'var(--primary)'}}><IconPlus size={24}/></span>
    <span className="font-bold text-lg">הוסף סיפור משלך</span><span className="text-sm text-muted">הדבק טקסט באנגלית או העלה קובץ</span>
  </button>);
}
function CommunityCard({story, state, session, onOpen, onReport, onEdit, onDelete}){
  const mine=!!(session&&session.user&&story.ownerId===session.user.id); const [confirm,setConfirm]=useState(false);
  return (<div className="flex flex-col gap-1.5">
    <StoryCard story={story} state={state} onOpen={onOpen}/>
    <div className="flex items-center gap-1 px-2 text-sm flex-wrap">
      {mine ? <>
        <button className="hit px-2 min-h-[44px] text-primary font-semibold" onClick={onEdit} aria-label={`עריכת הסיפור ${story.title}`}>עריכה</button>
        {!confirm?<button className="hit px-2 min-h-[44px] underline" style={{color:'var(--bad)'}} onClick={()=>setConfirm(true)} aria-label={`מחיקת הסיפור ${story.title}`}>מחיקה</button>
          :<><span className="text-muted">למחוק לצמיתות?</span><button className="btn py-1.5 px-3" style={{background:'var(--bad)',color:'var(--surface)'}} onClick={onDelete}>כן, למחוק</button><button className="btn btn-ghost py-1.5 px-3" onClick={()=>setConfirm(false)}>ביטול</button></>}
      </> : <button className="hit px-2 min-h-[44px] text-muted underline ms-auto" onClick={onReport} aria-label={`דיווח על תוכן: ${story.title}`}>דווח על תוכן</button>}
    </div></div>);
}
function Library({state, known, actions, openStory, onAdd, toast, stories, community, session, onReport, onEdit, onDeleteCommunity, mode, onGo}){
  const lv=levelFor(known);
  const view=mode==='community'?'community':'mine';     // the community library now lives under "אני"
  useEffect(()=>{ if(view==='community') loadCommunity(true); },[view]);
  const [tools,setTools]=useState(false);
  const [q,setQ]=useState(''); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('level'); const [lvF,setLvF]=useState(0);
  const recIds=useMemo(()=>new Set(recommendStories(stories, state, known).slice(0,6).map(s=>s.id)),[stories, state.words, state.storiesDone, known, state.unlocked]);
  const active=!!(q.trim()||filter!=='all'||sort!=='level'||lvF);   // a boolean: a bare 0 here used to print a stray "0" under the title
  const list=useMemo(()=>{ if(!active) return [];
    const t=q.trim().toLowerCase();
    let r=stories.filter(s=>!t || [s.title,s.he,s.blurb,...(s.tags||[])].join(' ').toLowerCase().includes(t));
    if(lvF) r=r.filter(s=>s.level===lvF);
    if(filter==='unread') r=r.filter(s=>!state.storiesDone[s.id]); if(filter==='read') r=r.filter(s=>state.storiesDone[s.id]); if(filter==='rec') r=r.filter(s=>recIds.has(s.id));
    const S=x=>storyStats(x,state);
    const by={level:(a,b)=>a.level-b.level, short:(a,b)=>S(a).d.words-S(b).d.words, long:(a,b)=>S(b).d.words-S(a).d.words, mostnew:(a,b)=>S(b).newW-S(a).newW, leastnew:(a,b)=>S(a).newW-S(b).newW}[sort];
    return [...r].sort(by); },[active, q, filter, sort, lvF, stories, state.words, state.storiesDone, recIds]);
  const card=s=>{ const open=isOpenLevel(s.level, known, state.unlocked)||s.user||s.community; const need=LEVELS[s.level-1].min-known;
    return <li key={s.id} className="flex"><StoryCard story={s} state={state} locked={!open} onOpen={()=>openStory(s.id)} onLocked={()=>toast(`הסיפור נעול. חסרות ${need} מילים מוכרות, או לחץ "בא לי אתגר, פתח עכשיו" בכותרת של שלב ${s.level}.`)}/></li>; };
  return (<div className="flex flex-col gap-6">
    {view==='community' ? <section className="flex flex-col gap-4" aria-label="סיפורי קהילה">
      <div className="flex items-center gap-3 flex-wrap"><h2 className="page-title me-auto">סיפורי קהילה</h2>
        <button className="btn btn-primary px-4 text-sm" onClick={onAdd}><IconPlus size={18}/>פרסם סיפור</button></div>
      <p className="text-sm text-muted leading-relaxed">סיפורים שמשתמשים כתבו ושיתפו עם כולם. לחץ על סיפור כדי לקרוא. מצאת תוכן לא הולם או מוגן בזכויות יוצרים? לחץ על "דווח על תוכן".</p>
      <label className="focus-within-ring flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 h-12 focus-within:border-primary" htmlFor="comm-search" style={{borderColor:'var(--line-strong)'}}><IconSearch size={18}/>
        <input id="comm-search" className="flex-1 min-w-0 bg-transparent outline-none text-base h-full" placeholder="חיפוש לפי כותרת, נושא או שם הכותב" value={q} onChange={e=>setQ(e.target.value)}/></label>
      {!SB ? <EmptyState icon={<IconBook size={22}/>} title="סיפורי הקהילה יחכו לך כאן" text={LOCAL_ONLY?'בגרסת הדמו סיפורי הקהילה כבויים: לא נטען ולא מתפרסם שום דבר. בינתיים יש הרבה סיפורים בספרייה של אורי.':'סיפורי קהילה זמינים באתר lumienglish.co.il. בינתיים אפשר לקרוא בספרייה של אורי.'} action="לסיפורים של אורי" onAction={onGo}/>
      : COMMUNITY_ERR&&!community.length ? <div className="card p-6 text-center flex flex-col gap-3 items-center" role="alert"><span style={{color:'var(--bad)'}}>{COMMUNITY_ERR}</span><button className="btn btn-line px-4" onClick={()=>loadCommunity(true)}>ניסיון חוזר</button></div>
      : (()=>{ const t=q.trim().toLowerCase(); const list=community.filter(s=>!t||[s.title,s.author,...(s.tags||[])].join(' ').toLowerCase().includes(t));
          return list.length ? <ul className="grid gap-4 md:grid-cols-2 lx-cards">{list.map(s=><li key={s.id}><CommunityCard story={s} state={state} session={session} onOpen={()=>openStory(s.id)} onReport={()=>onReport(s)} onEdit={()=>onEdit(s)} onDelete={()=>onDeleteCommunity(s)}/></li>)}</ul>
            : (t?<EmptyState icon={<IconSearch size={22}/>} title="לא נמצאו סיפורים" text="נסה מילה אחרת, או נקה את החיפוש." action="ניקוי החיפוש" onAction={()=>setQ('')}/>
              :<EmptyState icon={<IconPlus size={22}/>} title="עוד אין סיפורי קהילה" text="אפשר להיות הראשון: כתוב סיפור קצר באנגלית ושתף אותו." action="פרסם סיפור" onAction={onAdd}/>); })()}
    </section> : <>
    <HeroCard state={state} stories={stories} known={known} openStory={openStory}/>
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="page-title me-auto">הספרייה שלך</h2>
        <button className="btn btn-ghost px-4 text-sm" aria-expanded={tools||!!active} onClick={()=>{ if(tools||active){ setTools(false); setQ(''); setFilter('all'); setSort('level'); setLvF(0); } else setTools(true); }}><IconSearch size={18}/>{tools||active?'סגירת החיפוש':'חיפוש וסינון'}</button>
      </div>
      {(tools||active)&&<div className="flex flex-col gap-2.5 rise">
        <label className="focus-within-ring flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 h-12 focus-within:border-primary" htmlFor="lib-search" style={{borderColor:'var(--line-strong)'}}>
          <IconSearch size={18}/><input id="lib-search" className="flex-1 min-w-0 bg-transparent outline-none text-base h-full" placeholder="חיפוש סיפור לפי שם או נושא (חיות, נסיעות, עבודה…)" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<button className="hit text-muted" onClick={()=>setQ('')} aria-label="ניקוי החיפוש"><IconX size={16}/></button>}
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="סינון">{FILTERS.map(([k,l])=><button key={k} className="filter-pill" aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div>
          <div className="flex gap-2 ms-auto">
            <select id="lib-level" className="select-pill" value={lvF} onChange={e=>setLvF(+e.target.value)} aria-label="סינון לפי שלב"><option value={0}>כל השלבים</option>{LEVELS.map(L=><option key={L.n} value={L.n}>שלב {L.n}</option>)}</select>
            <select id="lib-sort" className="select-pill" value={sort} onChange={e=>setSort(e.target.value)} aria-label="מיון">{SORTS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-muted flex-wrap items-center"><span>מקרא:</span><StatusPill kind="new" label="חדשה"/><StatusPill kind="learning" label="בלמידה"/><StatusPill kind="known" label="מוכרת"/></div>
      </div>}
    </section>

    {active ? <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><h2 className="section-title me-auto">תוצאות</h2><span className="meta num">{list.length} סיפורים</span>
        <button className="hit text-primary font-semibold text-sm" onClick={()=>{ setQ(''); setFilter('all'); setSort('level'); setLvF(0); }}>ניקוי הסינון</button></div>
      {list.length?<ul className="grid gap-4 md:grid-cols-2 lx-cards">{list.map(card)}</ul>
        :<EmptyState icon={<IconSearch size={22}/>} title="לא נמצאו סיפורים" text="נסה מילה אחרת או סינון אחר, ונמצא סיפור שמתאים לך." action="ניקוי הסינון" onAction={()=>{ setQ(''); setFilter('all'); setSort('level'); setLvF(0); }}/>}
    </section> : <>
      {state.userStories.length>0&&<section className="flex flex-col gap-3">
        <div className="flex items-center gap-3"><h2 className="section-title me-auto">הסיפורים שלי</h2><span className="meta num">{state.userStories.length}</span></div>
        <ul className="grid gap-4 md:grid-cols-2 lx-cards">{state.userStories.map(card)}</ul>
      </section>}
      {LEVELS.map(L=>{ const open=L.n<=lv || state.unlocked[L.n]; const ls=STORIES.filter(s=>s.level===L.n); const need=L.min-known; const read=ls.filter(s=>state.storiesDone[s.id]).length;
        return (<section key={L.n} className="flex flex-col gap-3">
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
            <div className={`w-10 h-10 rounded-full grid place-items-center font-extrabold num ${open?'':'text-muted'}`} style={open?{background:'var(--primary)', color:'var(--primary-ink)'}:{background:'var(--sunk)'}}>{open?L.n:<IconLock size={15}/>}</div>
            <div className="min-w-0 me-auto"><h2 className="section-title">שלב <span className="num">{L.n}</span> · {L.name}</h2>
              <div className="meta">{L.desc} · <span className="num">{read}/{ls.length}</span> נקראו</div></div>
            {L.n===lv&&<span className="tag tag-level">השלב שלך</span>}
            {!open&&<><span className="text-sm text-muted">נפתח בעוד <b className="num text-ink">{need}</b> מילים</span>
              <button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>{ actions.unlock(L.n); toast(`שלב ${L.n} נפתח. בהצלחה!`); }}>בא לי אתגר, פתח עכשיו</button></>}
            {open&&L.n>lv&&<><span className="tag">נפתח ידנית</span><button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>{ actions.lock(L.n); toast(`שלב ${L.n} ננעל שוב. הוא ייפתח לבד כשתגיעו ל־${L.min} מילים מוכרות.`); }}><IconLock size={14}/>נעילה מחדש</button></>}
          </div>
          <ul className="grid gap-4 md:grid-cols-2 lx-cards">{ls.map(card)}</ul>
        </section>); })}
    </>}
      <AddStoryTile onAdd={onAdd}/>
    </>}
  </div>);
}

/* ---------- add-story dialog ---------- */
const EMOJI=['📖','📰','🌍','🚀','🐾','🍎','⚽','🎵','💡','🏰','🌊','❤️','🧪','🎬','✈️','🌳'];
function splitParas(raw){
  const text=raw.replace(/\r\n?/g,'\n').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/ /g,' ');
  let blocks=text.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  if(blocks.length===1){ const lines=blocks[0].split('\n').map(l=>l.trim()).filter(Boolean);
    if(lines.length>1 && lines.reduce((a,l)=>a+l.length,0)/lines.length>70) blocks=lines; }
  const out=[];
  for(const b of blocks){ const para=b.replace(/\s+/g,' ').trim(); if(!countWords(para)) continue;
    if(countWords(para)<=85){ out.push(para); continue; }
    let cur='';
    for(const sen of splitSentences(para)){ if(cur && countWords(cur)+countWords(sen)>65){ out.push(cur); cur=sen; } else cur=cur?cur+' '+sen:sen; }
    if(cur) out.push(cur);
  }
  return out;
}
function AddStory({state, onClose, onSave, profile, editing, onPublished, toast}){
  const session=useSession(); const emailName=(session&&session.user&&session.user.email||'').split('@')[0];
  const [text,setText]=useState(editing?editing.paras.map(p=>p.en).join('\n\n'):''); const [title,setTitle]=useState(editing?editing.title:''); const [cover,setCover]=useState(editing&&!editing.image?editing.cover:'📖'); const [level,setLevel]=useState(editing?editing.level:0); const [err,setErr]=useState('');
  const [coverMode,setCoverMode]=useState(editing&&editing.image?'image':'emoji'); const [image,setImage]=useState(editing?editing.image:null); const [imgBusy,setImgBusy]=useState(false); const [tags,setTags]=useState(editing?editing.tags:null);
  const [vis,setVis]=useState(editing?'public':'private'); const [consent,setConsent]=useState(!!editing); const [author,setAuthor]=useState(editing?editing.author:(profile&&profile.name)||''); const [publishing,setPublishing]=useState(false);
  useEffect(()=>{ if(!editing&&!author&&emailName) setAuthor(emailName); },[emailName]);
  const [closing, close]=useClosing(onClose);
  const paras=useMemo(()=>splitParas(cleanText(text)),[text]);
  const stats=useMemo(()=>{ const keys=[...new Set(paras.flatMap(p=>(p.match(WORD_RE)||[]).map(w=>w.toLowerCase())))];
    return { words:paras.reduce((a,p)=>a+countWords(p),0), unique:keys.length, known:keys.filter(k=>state.words[k]==='known').length, fresh:keys.filter(k=>!state.words[k]&&!NAMES.has(k)).length, dict:keys.filter(k=>wordInfo(k).he).length }; },[paras]);
  const autoTags=useMemo(()=>detectTopics(text),[text]); const tagList=tags||autoTags;
  const auto=suggestLevel(stats.words); const lvl=level||auto;
  const mref=useModal(close);
  const onFile=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; if(f.size>2e6){ setErr('הקובץ גדול מדי. נסו קובץ טקסט של עד 2MB.'); return; }
    const r=new FileReader(); r.onload=()=>{ setText(String(r.result||'')); setErr(''); if(!title) setTitle(f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')); }; r.onerror=()=>setErr('לא הצלחתי לקרוא את הקובץ.'); r.readAsText(f); };
  const onImage=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; setImgBusy(true); setErr('');
    try{ setImage(await compressImage(f, 300, .75)); setCoverMode('image'); }
    catch(x){ setErr(x.message==='type'?'אפשר להעלות רק תמונות JPG, PNG או WEBP.':x.message==='big'?'התמונה גדולה מדי (עד 15MB).':'לא הצלחתי לקרוא את התמונה. נסו תמונה אחרת.'); }
    setImgBusy(false); };
  const toggleTag=t=>{ const cur=tagList; const n=cur.includes(t)?cur.filter(x=>x!==t):[...cur,t]; setTags(n.length?n:['יומיום']); };
  const publicBlocked=vis==='public'&&(!consent||!session||!cleanText(author));
  const save=async()=>{
    if(stats.words<5){ setErr('צריך טקסט באנגלית של לפחות כמה מילים.'); return; }
    if(stats.words>20000||(vis==='public'&&cleanText(text).length>60000)){ setErr('הטקסט ארוך מדי. חלקו אותו לכמה סיפורים.'); return; }
    const st={ id:'u_'+Date.now().toString(36), user:true, level:lvl, cover:cover||'📖', title:cleanText(title,120)||splitSentences(paras[0])[0].slice(0,48), he:'', blurb:'', tags:tagList, paras:paras.map(en=>({en})) };
    if(coverMode==='image'&&image) st.image=image;
    if(vis==='public'){ if(publicBlocked) return; setPublishing(true); setErr('');
      try{ const pub=await publishStory(st, author, editing&&editing.cid); onPublished(pub, !!editing); }
      catch(e){ setErr(/row-level|permission|policy/i.test((e&&e.message)||'')?'אין הרשאה לפרסם. התחברו מחדש ונסו שוב.':cloudMsg(e)); setPublishing(false); } return; }
    onSave(st, stats);
  };
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="הוספת סיפור חדש" className={`sheet card w-full sm:max-w-2xl rounded-b-none sm:rounded-[20px] flex flex-col ${closing?'out':''}`} style={{maxHeight:'92vh'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3 p-5 border-b border-line">
        <h2 className="text-xl font-extrabold me-auto">{editing?'עריכת סיפור קהילה':'הוספת סיפור חדש'}</h2>
        <button className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button>
      </div>
      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap"><label htmlFor="add-text" className="font-bold me-auto">1. הטקסט באנגלית</label>
            <label className="btn btn-line px-3 py-1.5 text-sm cursor-pointer">העלאת קובץ <bdi dir="ltr" lang="en">.txt</bdi><input id="add-file" type="file" accept=".txt,text/plain" className="sr-only" onChange={onFile}/></label></div>
          <textarea id="add-text" dir="ltr" className="field book text-left" rows={8} placeholder="הדבק כאן טקסט באנגלית: כתבה, עמוד מספר או סיפור…" value={text} onChange={e=>{ setText(e.target.value); setErr(''); }}></textarea>
          {stats.words>0&&<div className="analysis grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" aria-live="polite">
            {[[stats.words.toLocaleString('he-IL'),'מילים'],[readMinutes(stats.words)+' דק׳','זמן קריאה משוער'],[`שלב ${auto}`,LEVELS[auto-1].name],[stats.fresh,'מילים חדשות לך']].map(([v,l])=><div key={l} className="rounded-xl bg-sunk py-2 px-1"><div className="num font-extrabold text-lg">{v}</div><div className="text-[11px] text-muted leading-tight">{l}</div></div>)}
          </div>}
          {stats.words>0&&<p className="text-xs text-muted"><span className="num">{paras.length}</span> פסקאות · <span className="num">{stats.known}</span> מילים שכבר מוכרות לך · <span className="num">{stats.dict}/{stats.unique}</span> נמצאות במילון. מילים שלא במילון יקבלו תעתיק הגייה אוטומטי.</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2"><label htmlFor="add-title" className="font-bold">2. כותרת</label>
            <input id="add-title" dir="auto" className="field" placeholder="למשל: My first article" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></div>
          <div className="flex flex-col gap-2"><span className="font-bold">רמת קושי</span>
            <div className="seg self-start" role="group" aria-label="רמת קושי">{LEVELS.map(L=><button key={L.n} aria-pressed={lvl===L.n} onClick={()=>setLevel(L.n)} title={L.name}>שלב {L.n}</button>)}</div>
            <span className="text-xs text-muted">{level?<button className="hit text-primary font-semibold" onClick={()=>setLevel(0)}>חזרה להצעה האוטומטית (שלב {auto})</button>:'נקבע אוטומטית לפי האורך: עד 60 מילים שלב 1, עד 120 שלב 2, עד 250 שלב 3, מעל זה שלב 4.'}</span></div>
        </div>
        <div className="flex flex-col gap-2"><span className="font-bold">נושאים</span>
          <div className="flex flex-wrap gap-1.5">{TOPICS.map(t=><button key={t} className="filter-pill" aria-pressed={tagList.includes(t)} onClick={()=>toggleTag(t)}>{t}</button>)}</div>
          {!tags&&stats.words>0&&<span className="text-xs text-muted">זוהו אוטומטית מהטקסט. אפשר לשנות.</span>}</div>
        <div className="flex flex-col gap-2"><span className="font-bold">3. תמונת שער</span>
          <div className="seg self-start" role="group" aria-label="סוג שער"><button aria-pressed={coverMode==='emoji'} onClick={()=>setCoverMode('emoji')}>אימוג׳י</button><button aria-pressed={coverMode==='image'} onClick={()=>setCoverMode('image')}>תמונה משלי</button></div>
          {coverMode==='emoji' ? <div className="flex flex-wrap gap-1.5 items-center">{EMOJI.map(e=><button key={e} aria-pressed={cover===e} aria-label={'אימוג׳י '+e} onClick={()=>setCover(e)} className="w-11 h-11 rounded-xl text-xl grid place-items-center" style={{background:cover===e?'var(--primary-soft)':'var(--sunk)', boxShadow:cover===e?'0 0 0 2px var(--primary) inset':'none'}}>{e}</button>)}
              <input id="add-emoji" className="field text-center text-xl" style={{width:'3.5rem', padding:'.35rem', minHeight:'44px'}} value={EMOJI.includes(cover)?'':cover} onChange={e=>setCover(e.target.value.slice(0,4))} placeholder="אחר" aria-label="אימוג׳י אחר"/></div>
          : <div className="flex items-center gap-4 flex-wrap">
              {image?<img src={image} alt="תמונת השער" className="w-24 h-24 rounded-2xl object-cover border border-line"/>:<div className="w-24 h-24 rounded-2xl border-2 border-dashed border-line grid place-items-center text-muted text-xs text-center p-2">אין תמונה</div>}
              <div className="flex flex-col gap-2">
                <label className="btn btn-line px-4 cursor-pointer">{imgBusy?'מכין את התמונה…':image?'החלפת תמונה':'בחירת תמונה (JPG, PNG, WEBP)'}<input id="add-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage}/></label>
                {image&&<button className="hit text-muted underline text-sm self-start" onClick={()=>setImage(null)}>הסרת התמונה</button>}
                <span className="text-xs text-muted">התמונה מוקטנת ונשמרת רק בדפדפן שלך.</span>
              </div>
            </div>}
        </div>
        <fieldset className="flex flex-col gap-2"><legend className="font-bold mb-1">4. מי יכול לראות את הסיפור?</legend>
          {[['private','פרטי (רק עבורי)','נשמר בספרייה האישית שלכם בלבד.'],['public','ציבורי (שתף עם כל משתמשי האתר)','מתפרסם בספריית הקהילה ונראה לכולם.']].map(([k,l,d])=>(
            <label key={k} className="flex items-start gap-3 rounded-xl p-3 cursor-pointer" style={{background:vis===k?'var(--primary-soft)':'var(--sunk)', boxShadow:vis===k?'0 0 0 1.5px var(--primary) inset':'none'}}>
              <input type="radio" name="story-vis" className="mt-1 w-5 h-5 shrink-0" value={k} checked={vis===k} disabled={!!editing&&k==='private'} onChange={()=>setVis(k)}/><span><span className="font-semibold block">{l}</span><span className="text-sm text-muted">{d}</span></span></label>))}
          {vis==='public'&&<div className="flex flex-col gap-3 rise rounded-xl border border-line p-3">
            {!session ? <AuthForm intro="כדי לפרסם סיפור צריך להתחבר או להירשם. זה לוקח חצי דקה." onDone={()=>{}}/> : <>
              <label className="flex flex-col gap-1"><span className="text-sm font-semibold">שם הכותב לתצוגה</span>
                <input id="add-author" dir="auto" className="field" maxLength={40} value={author} onChange={e=>setAuthor(e.target.value)} placeholder={emailName||'השם שיוצג ליד הסיפור'}/>
                <span className="text-xs text-muted">השם הזה יוצג לכולם. כתובת המייל שלכם לא תוצג.</span></label>
              <label className="flex items-start gap-3 cursor-pointer"><input id="add-consent" type="checkbox" className="mt-1.5 w-5 h-5" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
                <span className="text-sm leading-relaxed">אני מצהיר/ה שסיפור זה נכתב על ידי או שאינו מוגן בזכויות יוצרים, ושאני מסכים/ה לפרסומו לכלל המשתמשים באתר.</span></label></>}
          </div>}
        </fieldset>
        {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
      </div>
      <div className="p-5 border-t border-line flex gap-2 flex-wrap" style={{paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}}>
        <button className="btn btn-go py-3 px-6" onClick={save} disabled={stats.words<5||imgBusy||publishing||publicBlocked}><IconCheck size={18}/>{publishing?'מפרסם…':vis==='public'?(editing?'עדכון הסיפור':'פרסם לכולם'):'שמור סיפור'}</button>
        <button className="btn btn-ghost py-3 px-5" onClick={close}>ביטול</button>
      </div>
    </div>
  </div>);
}

/* ---------- dictionary bar: always on top ---------- */
function DictBar({state, onOpen, onAdd, onHome, voiceRef, onListening, hideSm}){
  const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const [sel,setSel]=useState(0);
  const [listening,setListening]=useState(false); const [vmsg,setVmsg]=useState(''); const [busy,setBusy]=useState(false);
  const inputRef=useRef(null), boxRef=useRef(null);
  const results=useMemo(()=>searchDict(q),[q, state.customDict, state.netDict]);
  const typed=q.trim(); const heQ=isHebrew(typed); const enWord=!heQ?typed.toLowerCase().replace(/[^a-z'-]/g,''):'';
  const offerOnline=typed.length>=2 && ((!heQ && enWord && !results.includes(enWord)) || (heQ && results.length<3));
  const rows=results.length+(offerOnline?1:0);
  useEffect(()=>{ setSel(0); },[q]);
  useEffect(()=>{
    const key=e=>{ const t=e.target; const typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT');
      if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K'))){ e.preventDefault(); inputRef.current&&inputRef.current.focus(); inputRef.current&&inputRef.current.select(); setOpen(true); } };
    const click=e=>{ if(boxRef.current&&!boxRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown',key); window.addEventListener('mousedown',click);
    return ()=>{ window.removeEventListener('keydown',key); window.removeEventListener('mousedown',click); };
  },[]);
  const go=(k)=>{ setOpen(false); setVmsg(''); inputRef.current&&inputRef.current.blur(); onOpen(k, k); };
  const online=async(text)=>{
    const src=typeof text==='string'?text:typed;
    if(!isHebrew(src)){ go(src.toLowerCase().replace(/[^a-z'-]/g,'')); return; }
    setBusy(true); try{ const t=(await fetchTranslation(src,'he|en')).toLowerCase().replace(/[^a-z' -]/g,'').trim(); const w=t.split(/\s+/).filter(x=>!['to','a','an','the'].includes(x))[0]; if(!w) throw 0; setQ(w); go(w); }
    catch(e){ setVmsg('לא הצלחתי לתרגם ברשת כרגע (אין חיבור, או שהדפדפן חוסם את השירות).'); } setBusy(false); };
  const pickRow=(i)=>{ if(i<results.length) go(results[i]); else if(offerOnline) online(); };
  const onKey=e=>{ if(e.key==='ArrowDown'){ e.preventDefault(); setOpen(true); setSel(s=>Math.min(rows-1,s+1)); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setSel(s=>Math.max(0,s-1)); }
    else if(e.key==='Enter'){ e.preventDefault(); if(rows) pickRow(sel); }
    else if(e.key==='Escape'){ setOpen(false); e.target.blur(); } };
  const [micLang,setMicLangRaw]=useState(MIC_LANG);
  const setMicLang=l=>{ MIC_LANG=l; setMicLangRaw(l); try{ localStorage.setItem('lumi-mic-lang',l); }catch(e){} };
  const gotVoice=(text, lang)=>{
    if(lang==='he'){ const t=String(text||'').replace(/[^א-ת ]/g,' ').replace(/\s+/g,' ').trim();
      if(!t){ setVmsg('לא זיהיתי מילה בעברית. נסו שוב, לאט וברור.'); return; }
      setQ(t); const r=searchDict(t); if(r.length){ go(r[0]); } else online(t); return; }
    const t=String(text||'').toLowerCase().replace(/[^a-z' -]/g,' ').trim(); const w=t.split(/\s+/)[0];
    if(!w){ setVmsg(isHebrew(String(text||''))?'שמעתי עברית. כדי לחפש בעברית, החלף את שפת המיקרופון ל"עברית".':'לא זיהיתי מילה באנגלית. נסה שוב, לאט וברור.'); return; } setQ(t); go(w); };
  const stopRef=useRef(null);
  const voice=()=>{
    setVmsg('');
    if(listening){ stopRef.current&&stopRef.current(); return; }
    const lang=MIC_LANG;
    stopRef.current=listenOnce({lang, onPartial:t=>{ setQ(t); }, onText:t=>gotVoice(t, lang), onError:m=>setVmsg(m), onState:setListening});
  };
  voiceRef.current=voice;
  useEffect(()=>{ onListening(listening); },[listening]);
  return (<div role="search" aria-label="חיפוש מילה במילון" id="dict-bar" className={'sticky z-40 bg-surface border-b border-line'+(hideSm?' dict-hide-sm':'')} style={{top:'env(safe-area-inset-top,0px)'}}>
    <div className="gutter"><div className="max-w-[860px] mx-auto h-16 flex items-center gap-2">
      <button type="button" onClick={onHome} className="w-11 h-11 rounded-xl shrink-0 hidden min-[400px]:block hc-dict-logo" aria-label="חזרה לדף הבית" title="חזרה לדף הבית"><LogoMark size={44}/></button>
      <div ref={boxRef} className="relative flex-1 min-w-0">
        <div className="dict-field flex items-center gap-1 rounded-xl border-[1.5px] bg-bg ps-2.5 pe-1 h-12" style={{borderColor:open?'var(--primary)':'var(--line)'}}>
          <span className="text-muted shrink-0"><IconSearch size={18}/></span>
          <input id="dict-search" ref={inputRef} dir="auto" autoComplete="off" spellCheck={false} role="combobox" aria-autocomplete="list" aria-expanded={open&&rows>0} aria-controls="dict-results" aria-label="חיפוש במילון"
            className="flex-1 min-w-0 h-full bg-transparent outline-none px-2 text-base" placeholder={listening?(micLang==='he'?'מקשיב… אמור מילה בעברית':'מקשיב… אמור מילה באנגלית'):'חיפוש מילה במילון'}
            value={q} onChange={e=>{ setQ(e.target.value); setOpen(true); setVmsg(''); }} onFocus={()=>setOpen(true)} onKeyDown={onKey}/>
          {q&&<button type="button" className="hit w-8 h-8 grid place-items-center text-muted rounded-lg" onClick={()=>{ setQ(''); inputRef.current&&inputRef.current.focus(); }} aria-label="ניקוי החיפוש"><IconX size={16}/></button>}
          <button className="hit h-8 px-1.5 rounded-md text-xs font-bold shrink-0" style={{background:'var(--sunk)', color:'var(--ink)', minWidth:'2.8rem'}} onClick={()=>setMicLang(micLang==='he'?'en':'he')} aria-label={`שפת המיקרופון: ${micLang==='he'?'עברית':'אנגלית'}. לחיצה מחליפה`} title="באיזו שפה תדבר למיקרופון. לחיצה מחליפה">{micLang==='he'?'עברית':'אנגלית'}</button>
          <button className={`hit w-10 h-10 grid place-items-center rounded-lg shrink-0 ${listening?'pop':''}`} style={listening?{background:'var(--bad)', color:'var(--surface)'}:{background:'var(--primary)', color:'var(--primary-ink)'}} onClick={voice} aria-label={listening?'עצירת ההקשבה':`חיפוש קולי: אמרו מילה ב${micLang==='he'?'עברית':'אנגלית'}`} aria-pressed={listening} title="חיפוש קולי"><IconMic size={18}/></button>
        </div>
        {(typed||vmsg)&&<div id="dict-results" role="listbox" className={`dropdown dict-drop absolute inset-x-0 top-full mt-1.5 card overflow-hidden ${(open&&(rows>0||typed))||vmsg?'show':''}`} style={{maxHeight:'70vh', overflowY:'auto'}}>
          {vmsg&&<div className="px-4 py-3 text-sm" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{vmsg}</Bi></div>}
          {open&&results.map((k,i)=>{ const info=wordInfo(k); const st=state.words[k];
            return (<button key={k} role="option" aria-selected={sel===i} onMouseEnter={()=>setSel(i)} onClick={()=>go(k)} className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[52px] text-start border-b border-line" style={{background:sel===i?'var(--sunk)':'transparent'}}>
              <span dir="ltr" lang="en" className="book font-semibold text-lg shrink-0 text-left">{k}</span>
              {info.pos&&<span className="hidden sm:inline"><span className="tag">{info.pos}</span></span>}
              <span className="flex-1 min-w-0 truncate text-muted"><Bi>{info.he}</Bi></span>
              {st&&<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:st==='known'?'var(--good)':'var(--sun)'}} title={st==='known'?'מוכרת':'בלמידה'}></span>}
            </button>); })}
          {open&&offerOnline&&<button role="option" aria-selected={sel===results.length} onMouseEnter={()=>setSel(results.length)} onClick={online} disabled={busy} className="w-full flex items-center gap-3 px-4 py-3 text-start text-sm font-semibold text-primary" style={{background:sel===results.length?'var(--sunk)':'transparent'}}>
            <IconSearch size={16}/>{busy?'מחפש ברשת…':heQ?<>חיפוש „{typed}” במילון המקוון</>:<>חיפוש <span dir="ltr" lang="en" className="book">{enWord}</span> במילון המקוון</>}</button>}
          {open&&typed&&!rows&&!vmsg&&<div className="px-4 py-3 text-sm text-muted">לא נמצאו מילים מתאימות.</div>}
        </div>}
      </div>
    </div></div>
  </div>);
}

/* ---------- dictionary card ---------- */
/* Hebrew-letters spelling (תעתיק) of an English word: the site's own curated pronunciation first (never the auto-guessed one),
   then the vetted sound-alike list borrowed from the video lessons (TR_VIDEO). A word with neither stays English in place. */
function heSpell(key){ const i=wordInfo(key); if(i&&i.pron&&!i.auto) return i.pron; return (typeof TR_VIDEO!=='undefined'&&TR_VIDEO[key])||''; }
function translitParts(en){
  const toks=tokenize(en).filter(t=>t.t==='w'); if(!toks.length) return null; let n=0;
  const parts=toks.map(t=>{ const h=heSpell(t.key); if(h){ n++; return {he:h}; } return {en:t.text}; });
  return n?{parts, n, total:toks.length}:null;
}
/* an example sentence you can tap: speaks with the current English voice and speed, Hebrew translation, then the Hebrew spelling */
function ExampleLine({x, wordKey, voice, rate, showTr}){
  const b=baseOf(wordKey); const [playing,setPlaying]=useState(false); const tmr=useRef(0);
  useEffect(()=>()=>clearInterval(tmr.current),[]);
  const play=()=>{ if(!synth){ speakText(x.en, rate||1, voice); return; }
    speakText(x.en, rate||1, voice); setPlaying(true); clearInterval(tmr.current); let n=0;
    tmr.current=setInterval(()=>{ n++; if((n>3&&!(synth.speaking||synth.pending))||n>80){ clearInterval(tmr.current); setPlaying(false); } },250); };
  const tl=useMemo(()=>translitParts(x.en),[x.en]);
  return (<li className="ex-item">
    <button type="button" className={`ex-play ${playing?'is-playing':''}`} onClick={play} aria-label={'השמע את המשפט: '+x.en}>
      <span dir="ltr" lang="en" className="book ex-en">{tokenize(x.en).map((t,i)=> t.t==='w'&&(t.key===wordKey||baseOf(t.key)===b||baseOf(t.key)===wordKey) ? <b key={i} className="ex-hit">{t.text}</b> : <span key={i}>{t.text}</span>)}</span>
      <span className="ex-ic" aria-hidden="true"><IconSpeaker size={16}/></span>
    </button>
    {x.he&&<p className="ex-he">{x.he}</p>}
    {showTr&&tl&&<p className="ex-tr" lang="he">{tl.parts.map((p,i)=>p.he?<span key={i}>{p.he}{' '}</span>:<bdi key={i} dir="ltr" lang="en">{p.en}{' '}</bdi>)}</p>}
  </li>);
}
/* the examples of one word: ONE sentence by default ("עוד משפט" for a second); the Hebrew spelling hides behind "איך זה נשמע", remembered per user */
const exTrKey=()=>'lumi-ex-tr:'+LS_KEY;
function ExampleSet({examples, wordKey, voice, rate}){
  const [open,setOpen]=useState(()=>{ try{ return localStorage.getItem(exTrKey())==='1'; }catch(e){ return false; } });
  const [more,setMore]=useState(false);
  const toggle=()=>setOpen(o=>{ const v=!o; try{ localStorage.setItem(exTrKey(), v?'1':'0'); }catch(e){} return v; });
  const shown=more?examples:examples.slice(0,1); const anyTr=examples.some(x=>translitParts(x.en));
  return (<div className="ex-set">
    <ul className="ex-list">{shown.map(x=><ExampleLine key={x.en} x={x} wordKey={wordKey} voice={voice} rate={rate} showTr={open}/>)}</ul>
    {(anyTr||(!more&&examples.length>1))&&<div className="ex-actions">
      {anyTr&&<button type="button" className="ex-link" aria-expanded={open} onClick={toggle}>איך זה נשמע</button>}
      {!more&&examples.length>1&&<button type="button" className="ex-link" onClick={()=>setMore(true)}>עוד משפט</button>}</div>}
  </div>);
}
function DictCard({wordKey, display, state, stories, voice, actions, onClose, onOpenWord}){
  const info=wordInfo(wordKey); const status=state.words[wordKey]; const net=state.netDict[wordKey];
  const [edit,setEdit]=useState(false); const [draft,setDraft]=useState(''); const [busy,setBusy]=useState('');
  const alive=useRef(wordKey); alive.current=wordKey;
  const [closing, close]=useClosing(onClose);
  const isName=NAMES.has(wordKey);
  const goOnline=async()=>{ const k=wordKey; setBusy('loading');
    try{ const e=await lookupOnline(k, !!wordInfo(k).he); actions.setNet(k, e); if(alive.current===k) setBusy(''); }
    catch(e){ if(alive.current===k) setBusy('fail'); } };
  useEffect(()=>{ setEdit(false); setDraft(''); setBusy(''); speakText(display, .9, voice);
    if(!info.he && !isName && !net) goOnline(); },[wordKey]);
  const mref=useModal(close);
  const examples=examplesFor(wordKey, stories);
  const pos=info.pos || (net&&net.pos&&net.pos.length?net.pos.map(p=>POS_HE[p]||p).join(' / '):null);
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label={`המילה ${display}`} className={`sheet card w-full sm:max-w-lg rounded-b-none sm:rounded-[20px] flex flex-col ${closing?'out':''}`} style={{maxHeight:'92vh'}} onClick={e=>e.stopPropagation()}>
      <div className="p-5 pb-4 flex items-start gap-3 border-b border-line">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {pos&&<span className="tag tag-level">{pos}</span>}
            <span className="tag" style={status==='known'?{background:'var(--good-soft)',color:'var(--good)'}:status==='learning'?{background:'var(--learn-bg)',color:'var(--ink)'}:{}}>{status==='known'?'מוכרת לי':status==='learning'?'ברשימת הלמידה':'מילה חדשה'}</span>
            {info.net&&<span className="tag">מהמילון המקוון</span>}
          </div>
          <div dir="ltr" className="flex items-center gap-2 flex-wrap">
            <span className="book text-4xl sm:text-5xl font-bold break-words">{display}</span>
            <button className="btn btn-primary w-11 h-11" style={{borderRadius:'50%'}} onClick={()=>speakText(display,.95,voice)} aria-label="השמעה" title="השמעה"><IconSpeaker/></button>
            <button className="btn btn-ghost w-11 h-11 text-xl" style={{borderRadius:'50%'}} onClick={()=>speakText(display,.45,voice)} aria-label="השמעה איטית" title="השמעה איטית"><IconSlow size={18}/></button>
          </div>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap"><span className="text-xs text-muted">איך קוראים את זה:</span><span className="text-2xl font-semibold">{info.pron}</span>{info.auto&&<span className="text-xs text-muted">(תעתיק אוטומטי, משוער)</span>}</div>
        </div>
        <button className="btn btn-ghost w-11 h-11 shrink-0" onClick={close} aria-label="סגירה"><IconX size={18}/></button>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto">
        <section>
          <div className="text-xs font-semibold text-muted mb-1 flex items-center gap-2">פירוש בעברית{(info.he||edit)&&<button className="hit text-primary font-semibold ms-auto" onClick={()=>{ setDraft(info.custom?info.he:''); setEdit(e=>!e); }}>{edit?'ביטול':'עריכה'}</button>}</div>
          {info.he&&!edit ? <><div className="text-2xl font-bold leading-snug break-words"><Bi>{info.he}</Bi></div>
              {info.note&&<div className="text-sm text-muted mt-0.5"><Bi>{info.note}</Bi></div>}{info.custom&&<div className="text-xs text-muted mt-0.5">תרגום שהוספת</div>}</>
          : busy==='loading'&&!edit ? <div className="text-muted">מחפש את המילה במילון המקוון…</div>
          : <form className="flex flex-col gap-2" onSubmit={e=>{ e.preventDefault(); if(draft.trim()){ actions.setCustom(wordKey, draft.trim()); setEdit(false); } }}>
              {!info.he&&<div className="text-sm text-muted leading-snug">{isName?'זה שם פרטי.':busy==='fail'?'המילה לא במילון המובנה, והמילון המקוון לא זמין כרגע (אין חיבור, או שהדפדפן חוסם אותו).':'המילה לא נמצאת במילון המובנה.'}</div>}
              <div className="flex gap-2 flex-wrap"><input id="custom-he" className="field text-sm flex-1" style={{padding:'.5rem .7rem', minWidth:'10rem'}} placeholder="כתבו תרגום משלכם" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={60}/>
                <button className="btn btn-primary py-2 px-4 text-sm" disabled={!draft.trim()}>שמירה</button></div>
              {!info.he&&!isName&&<div className="flex gap-3 flex-wrap items-center text-sm"><button type="button" className="hit text-primary font-semibold underline" onClick={goOnline}>נסה שוב ברשת</button>
                <a className="text-primary font-semibold underline" target="_blank" rel="noopener noreferrer" href={'https://translate.google.com/?sl=en&tl=iw&text='+encodeURIComponent(wordKey)}>פתח ב־<bdi dir="ltr" lang="en">Google Translate</bdi></a></div>}
            </form>}
        </section>

        {net&&net.def&&<section className="rounded-xl bg-sunk p-3">
          <div className="text-xs font-semibold text-muted mb-1">הגדרה פשוטה</div>
          <div dir="ltr" lang="en" className="book text-left leading-relaxed">{net.def}</div>
          {net.defHe&&<div className="text-sm text-muted mt-1 leading-relaxed">{net.defHe}</div>}
        </section>}

        {examples.length>0&&<section>
          <div className="text-xs font-semibold text-muted mb-2">משפטים לדוגמה</div>
          <ExampleSet key={wordKey} examples={examples} wordKey={wordKey} voice={voice} rate={state.settings.rate}/>
        </section>}

        {net&&net.syn&&net.syn.length>0&&<section>
          <div className="text-xs font-semibold text-muted mb-1.5">מילים נרדפות</div>
          <div className="flex flex-wrap gap-1.5" dir="ltr">{net.syn.map(s=><button key={s} className="word chip book" style={{background:'var(--sunk)'}} onClick={()=>onOpenWord(s, s)}>{s}</button>)}</div>
        </section>}

        {!isName&&!(net&&net.def)&&busy!=='loading'&&info.he&&<button className="btn btn-line py-2.5 px-4 text-sm self-start" onClick={goOnline}><IconSearch size={16}/>הגדרה, מילים נרדפות ועוד דוגמאות מהרשת</button>}
        {busy==='loading'&&info.he&&<div className="text-sm text-muted">טוען מהמילון המקוון…</div>}
        {busy==='fail'&&info.he&&<div className="text-sm text-muted">המילון המקוון לא זמין כרגע (אין חיבור, או שהדפדפן חוסם אותו). הפירוש והדוגמאות המובנים זמינים תמיד.</div>}
      </div>

      <div className="p-4 border-t border-line flex gap-2 flex-wrap" style={{paddingBottom:'max(16px, env(safe-area-inset-bottom,0px))'}}>
        {isName ? <button className="btn btn-ghost py-3 px-4 flex-1" onClick={()=>{ actions.setWordStatus(wordKey,'known'); close(); }}>זה שם. סמן כמוכר</button> : <>
          {status==='learning'
            ? <button className="btn py-3 px-4 flex-1" style={{background:'var(--learn-bg)', color:'var(--ink)', boxShadow:'0 0 0 2px var(--sun) inset'}} onClick={()=>actions.clearWord(wordKey)} title="לחיצה מסירה מהרשימה"><IconCheck size={18}/>ברשימת הלמידה שלך</button>
            : <button className="btn py-3 px-4 flex-1" style={{background:'var(--learn-bg)', color:'var(--ink)'}} onClick={()=>actions.setWordStatus(wordKey,'learning')}><IconPlus size={18}/>הוסף לרשימת הלמידה שלי</button>}
          <button className="btn py-3 px-4" style={{background:'var(--good-soft)', color:'var(--good)', boxShadow:status==='known'?'0 0 0 2px var(--good) inset':'none'}} onClick={()=>actions.setWordStatus(wordKey,'known')}><IconCheck size={18}/>כבר מכיר!</button>
        </>}
      </div>
    </div>
  </div>);
}

/* ---------- practice pane: writing area, dictation, checking ---------- */
const DIFF_RE=/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g;
const normWord=w=>w.toLowerCase().replace(/[’`]/g,"'");
/* word-level comparison (longest common subsequence): which original words were written, which typed words are extra */
function diffWords(orig, typed){
  const A=orig.match(DIFF_RE)||[], B=typed.match(DIFF_RE)||[]; const a=A.map(normWord), b=B.map(normWord); const n=a.length, m=b.length;
  const W=m+1, dp=new Uint16Array((n+1)*W);
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) dp[i*W+j]= a[i]===b[j] ? dp[(i+1)*W+j+1]+1 : Math.max(dp[(i+1)*W+j], dp[i*W+j+1]);
  const okA=new Array(n).fill(false), okB=new Array(m).fill(false); let i=0,j=0;
  while(i<n&&j<m){ if(a[i]===b[j]){ okA[i]=okB[j]=true; i++; j++; } else if(dp[(i+1)*W+j]>=dp[i*W+j+1]) i++; else j++; }
  return { orig:A.map((t,k)=>({t, ok:okA[k]})), typed:B.map((t,k)=>({t, ok:okB[k]})), hit:okA.filter(Boolean).length, total:n };
}
async function copyText(text){ try{ await navigator.clipboard.writeText(text); return true; }catch(e){ return false; } }
function PracticePane({story, text, setText, voice, toast, dictation, setDictation, areaRef}){
  const sentences=useMemo(()=>story.paras.flatMap(p=>splitSentences(p.en)),[story]);
  const [scope,setScope]=useState('sentence'); const [si,setSi]=useState(0); const [result,setResult]=useState(null); const [undo,setUndo]=useState(null);
  useEffect(()=>{ setResult(null); },[dictation, scope, si]);
  const words=countWords(text);
  const lastLine=()=>{ const ls=text.split('\n').map(l=>l.trim()).filter(Boolean); return ls[ls.length-1]||''; };
  const play=(i,rate)=>{ const k=Math.max(0,Math.min(sentences.length-1,i)); setSi(k); speakText(sentences[k], rate||.9, voice); };
  const check=()=>{ const target=scope==='sentence'?sentences[si]:story.paras.map(p=>p.en).join(' '); const mine=scope==='sentence'?lastLine():text;
    if(!countWords(mine)){ toast('עוד לא כתבת טקסט באנגלית לבדיקה.'); return; }
    setResult({...diffWords(target, mine), scope}); };
  const readMine=()=>{ if(!/[A-Za-z]/.test(text)){ toast('אין באזור הכתיבה טקסט באנגלית להקראה.'); return; } speakText(text.replace(/[֐-׿]+/g,' '), .9, voice); };
  const copyAll=async()=>{ if(!text.trim()){ toast('אזור הכתיבה ריק.'); return; }
    if(await copyText(text)) toast('הועתק!'); else { const el=areaRef.current; if(el){ el.focus(); el.select(); } toast('הטקסט סומן. לחצו Ctrl+C כדי להעתיק.'); } };
  const clear=()=>{ if(!text) return; setUndo(text); setText(''); setResult(null); };
  const pct=result?Math.round(result.hit/Math.max(1,result.total)*100):0;
  return (<aside className="card practice-pane p-4 sm:p-5 flex flex-col gap-3" aria-label="אזור כתיבה ותרגול">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{background:'var(--primary-soft)', color:'var(--primary)'}}><IconPen size={18}/></span>
      <div className="me-auto leading-tight"><h2 className="font-bold text-lg">אזור הכתיבה שלי</h2><div className="text-xs text-muted">{dictation?'הקשיבו וכתבו מה ששמעתם':'העתיקו משפטים, כתבו תרגום, סיכום או הערות'}</div></div>
      <Toggle id="tg-dict" checked={dictation} onChange={setDictation} label="מצב הכתבה"/>
    </div>

    {dictation&&<div className="rounded-xl p-3 flex flex-col gap-3" style={{background:'var(--sunk)'}}>
      <div className="seg self-start" role="group" aria-label="היקף ההכתבה">
        <button aria-pressed={scope==='sentence'} onClick={()=>setScope('sentence')}>משפט אחר משפט</button>
        <button aria-pressed={scope==='story'} onClick={()=>setScope('story')}>כל הסיפור</button>
      </div>
      {scope==='sentence' ? <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5" dir="ltr">
          <button className="btn btn-line w-11 h-11" onClick={()=>play(si-1)} disabled={si<=0} aria-label="המשפט הקודם"><IconPrev size={16}/></button>
          <button className="btn btn-primary h-11 px-4" onClick={()=>play(si)} aria-label="השמעת המשפט"><IconSpeaker size={18}/><span dir="rtl">השמע משפט</span></button>
          <button className="btn btn-line w-11 h-11 text-lg" onClick={()=>play(si,.55)} aria-label="השמעה איטית של המשפט" title="לאט"><IconSlow size={18}/></button>
          <button className="btn btn-line w-11 h-11" onClick={()=>play(si+1)} disabled={si>=sentences.length-1} aria-label="המשפט הבא"><IconNext size={16}/></button>
        </div>
        <span className="text-sm text-muted num">משפט {si+1} מתוך {sentences.length}</span>
      </div> : <p className="text-sm text-muted">הפעל את הסיפור בנגן שבתחתית המסך, וכתוב כאן את מה שאתה שומע.</p>}
    </div>}

    <textarea id="practice-text" ref={areaRef} dir="auto" spellCheck={false} autoCapitalize="sentences" className="practice-text field book" rows={dictation?6:9}
      placeholder={dictation?(scope==='sentence'?'כתוב כאן את המשפט ששמעת, כל משפט בשורה חדשה':'כתוב כאן את הסיפור כפי ששמעת אותו'):'כתוב כאן באנגלית…'}
      value={text} onChange={e=>{ setText(e.target.value); if(undo) setUndo(null); }}></textarea>

    <div className="flex items-center gap-2 flex-wrap">
      {dictation&&<button className="btn btn-primary px-4" onClick={check}><IconCheck size={18}/>בדיקת הכתיבה שלי</button>}
      <button className="btn btn-ghost px-3 text-sm" onClick={readMine}><IconSpeaker size={16}/>הקראת הכתיבה שלי</button>
      <button className="btn btn-ghost px-3 text-sm" onClick={copyAll}><IconCopy size={16}/>העתק הכול</button>
      <button className="btn btn-ghost px-3 text-sm" onClick={clear} disabled={!text}><IconTrash size={16}/>ניקוי</button>
      {undo!==null&&<button className="btn btn-line px-3 text-sm" onClick={()=>{ setText(undo); setUndo(null); }}>ביטול הניקוי</button>}
      <span className="text-xs text-muted num ms-auto">{words} מילים</span>
    </div>
    {dictation&&scope==='sentence'&&!result&&<p className="text-xs text-muted">הבדיקה משווה את השורה האחרונה שכתבת למשפט <span className="num">{si+1}</span>.</p>}

    {result&&<div className="rise rounded-xl border border-line p-3 flex flex-col gap-3" role="status">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-bold text-lg">{pct>=90?'מצוין!':pct>=60?'כמעט שם':'ממשיכים לתרגל'}</span>
        <span className="text-sm text-muted num">{result.hit} מתוך {result.total} מילים ({pct}%)</span>
        <div className="h-2 flex-1 min-w-[80px] rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:pct+'%', background:'var(--good)'}}></div></div>
      </div>
      <div><div className="text-xs font-semibold text-muted mb-1">הטקסט המקורי</div>
        <p dir="ltr" lang="en" className="book text-left leading-loose diff">{result.orig.map((w,k)=><span key={k} className={w.ok?'d-ok':'d-miss'}>{w.t}</span>)}</p></div>
      {result.typed.some(w=>!w.ok)&&<div><div className="text-xs font-semibold text-muted mb-1">מה שכתבת</div>
        <p dir="ltr" lang="en" className="book text-left leading-loose diff">{result.typed.map((w,k)=><span key={k} className={w.ok?'d-ok':'d-miss'}>{w.t}</span>)}</p></div>}
      <div className="flex items-center gap-3 text-xs text-muted flex-wrap"><span className="flex items-center gap-1.5"><span className="d-ok" dir="ltr">word</span>נכתב נכון</span><span className="flex items-center gap-1.5"><span className="d-miss" dir="ltr">word</span>חסר או שגוי</span>
        {result.scope==='sentence'&&si<sentences.length-1&&<button className="btn btn-line px-3 text-sm ms-auto" onClick={()=>play(si+1)}>למשפט הבא<IconChevL size={16}/></button>}</div>
    </div>}
  </aside>);
}
/* floating menu above a text selection inside the story */
function SelectionPopover({rootRef, disabled, onSpeak, onCopy}){
  const [sel,setSel]=useState(null);
  useEffect(()=>{
    if(disabled){ setSel(null); return; }
    let t=null;
    const read=()=>{ const s=window.getSelection&&window.getSelection(); const root=rootRef.current;
      if(!s||s.isCollapsed||!s.rangeCount||!root||!root.contains(s.anchorNode)||!root.contains(s.focusNode)){ setSel(null); return; }
      const text=s.toString().replace(/[֐-׿‎‏]+/g,' ').replace(/\s+/g,' ').trim();
      if(!/[A-Za-z]/.test(text)){ setSel(null); return; }
      const r=s.getRangeAt(0).getBoundingClientRect(); if(!r.width&&!r.height){ setSel(null); return; }
      const above=r.top>150; setSel({text, x:Math.max(110, Math.min(window.innerWidth-110, r.left+r.width/2)), y:above?r.top-8:r.bottom+8, above}); };
    const later=()=>{ clearTimeout(t); t=setTimeout(read,120); };
    const esc=e=>{ if(e.key==='Escape'){ const s=window.getSelection(); s&&s.removeAllRanges(); setSel(null); } };
    document.addEventListener('selectionchange',later); window.addEventListener('scroll',later,true); window.addEventListener('resize',later); window.addEventListener('keydown',esc);
    return ()=>{ clearTimeout(t); document.removeEventListener('selectionchange',later); window.removeEventListener('scroll',later,true); window.removeEventListener('resize',later); window.removeEventListener('keydown',esc); };
  },[disabled]);
  if(!sel) return null;
  const keep=e=>e.preventDefault();   // keep the selection while pressing the buttons
  return (<div className="sel-pop" role="toolbar" aria-label="פעולות על הטקסט המסומן" style={{left:sel.x, top:sel.y, transform:`translate(-50%, ${sel.above?'-100%':'0'})`}}>
    <button onMouseDown={keep} onClick={()=>onSpeak(sel.text)}><IconSpeaker size={18}/>השמע</button>
    <button onMouseDown={keep} onClick={()=>{ onCopy(sel.text); const s=window.getSelection(); s&&s.removeAllRanges(); setSel(null); }}><IconCopy size={18}/>העתק לתרגול</button>
  </div>);
}

/* ---------- flashcards (spaced repetition session) ---------- */
function FlashSession({keys, state, actions, voice, title, onDone, celebrate}){
  const [queue,setQueue]=useState(()=>keys.slice()); const [flipped,setFlipped]=useState(false);
  const [stats,setStats]=useState({seen:0, ok:0, again:0, graduated:[], hard:[]}); const requeued=useRef(new Set());
  const k=queue[0]; const info=k?wordInfo(k):null; const card=k?srsCard(state,k):null;
  const [picked,setPicked]=useState(null);
  const choices=useMemo(()=>{ if(!k||!info||!info.he) return null; const seen=new Set([info.he]); const ds=[]; for(const w of shuffle(QUIZ_POOL)){ const t=MEANING[w]; if(w!==k&&!seen.has(t)){ seen.add(t); ds.push(t); } if(ds.length===3) break; } return shuffle([info.he,...ds]); },[k, stats.seen]);
  useEffect(()=>{ if(k){ setFlipped(false); setPicked(null); speakText(k,.9,voice); } },[k, stats.seen]);
  const grade=g=>{ if(!k) return; const next=srsNext(card,g);
    actions.reviewWord(k,g);
    const grad=next.iv>=GRADUATE_DAYS;
    setStats(s=>({seen:s.seen+1, ok:s.ok+(g>=2?1:0), again:s.again+(g===0?1:0), graduated:grad?[...s.graduated,k]:s.graduated, hard:g<=1&&!s.hard.includes(k)?[...s.hard,k]:s.hard}));
    setQueue(q=>{ const rest=q.slice(1); if(g===0&&!requeued.current.has(k)){ requeued.current.add(k); return [...rest,k]; } return rest; });
    if(grad) celebrate&&celebrate(false); };
  useEffect(()=>{ const h=e=>{ const t=e.target; if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if((e.key===' '||e.key==='Enter')&&!(t&&/^(BUTTON|A)$/.test(t.tagName)&&!t.classList.contains('flash'))){ e.preventDefault(); if(!flipped) setFlipped(true); else grade(2); }
      else if(flipped&&/^[1-4]$/.test(e.key)) grade(+e.key-1); };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); });
  if(!k) return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status">
    <div className="eyebrow">{title}</div>
    <h1 className="text-3xl font-extrabold">{stats.seen?'סיימת את החזרה!':'אין כרגע מילים לחזרה'}</h1>
    {stats.seen>0&&<div className="grid grid-cols-3 gap-3 w-full max-w-md">
      {[[stats.seen,'כרטיסים'],[stats.ok,'ידעת'],[stats.graduated.length,'עברו למוכרות']].map(([v,l])=><div key={l} className="rounded-xl bg-sunk p-3 text-center"><div className="num text-2xl font-extrabold">{v}</div><div className="text-xs text-muted">{l}</div></div>)}
    </div>}
    {stats.graduated.length>0&&<div className="flex flex-wrap gap-1.5" dir="ltr">{stats.graduated.map(w=><span key={w} className="pill pill-known book">{w}</span>)}</div>}
    <p className="text-muted">{stats.seen?'המילים יחזרו בדיוק כשהזיכרון מתחיל להיחלש. ככה הן נשארות לתמיד.':'כל מילה ששמרת לתרגול תופיע כאן כשיגיע הזמן לחזור עליה.'}</p>
    {stats.seen>0&&stats.hard.length>0&&<div className="rounded-xl bg-sunk p-4 flex flex-col gap-2 w-full max-w-md"><div className="font-bold">לדעתך צריך עוד חזרה?</div>
      <p className="text-sm text-muted"><span className="num">{stats.hard.length}</span> מילים סימנתם "שכחתי" או "קשה". אפשר לעבור עליהן שוב עכשיו.</p>
      <button data-more className="btn btn-go px-5 self-start" onClick={()=>{ requeued.current=new Set(); setQueue(stats.hard); setStats(s=>({...s,hard:[]})); }}>כן, עוד סבב ({stats.hard.length})</button></div>}
    <button className="btn btn-primary px-6" onClick={onDone}>{stats.hard.length?'לא, מספיק לעכשיו':'סיום'}</button>
  </section>);
  const total=stats.seen+queue.length; const ex=examplesFor(k, STORIES)[0];
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 text-sm" onClick={onDone}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(stats.seen/Math.max(1,total)*100)+'%', background:'var(--primary)'}}></div></div>
      <span className="num text-sm text-muted">{stats.seen}/{total}</span>
    </div>
    <h1 className="eyebrow">{title}</h1>
    <button type="button" key={k+stats.seen} className={`flash card rise ${flipped?'is-flipped':''}`} onClick={()=>!flipped&&setFlipped(true)} aria-pressed={flipped}>
      <div className="flex items-center justify-center gap-3" dir="ltr">
        <span className="book text-5xl sm:text-6xl font-bold">{k}</span>
      </div>
      {!flipped ? <span className="text-muted text-sm mt-4">נסה להיזכר מה פירוש המילה, או בחר תשובה למטה</span>
      : <div className="flex flex-col items-center gap-2 mt-4 rise">
          <div className="text-3xl font-extrabold"><Bi>{info.he||'(אין תרגום)'}</Bi></div>
          <div className="text-xl" style={{color:'var(--primary)'}}>{info.pron}</div>
        </div>}
    </button>
    {ex&&<div className="ex-flash-slot" style={{visibility:flipped?'visible':'hidden'}} aria-hidden={flipped?undefined:true}><ExampleSet key={k+ex.en} examples={[ex]} wordKey={k} voice={voice} rate={state.settings.rate}/></div>}
    <div className="flex justify-center gap-2">
      <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.9,voice)}><IconSpeaker size={18}/>השמעה</button>
      <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.45,voice)}><IconSlow size={18}/>לאט</button>
    </div>
    {choices&&<div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="בחרו את הפירוש">{choices.map(c=>{ const right=c===info.he; const st=picked===null?'':right?'ok':c===picked?'bad':'dim';
      return <button key={c} data-choice={right?'1':'0'} disabled={picked!==null} onClick={()=>{ setPicked(c); setFlipped(true); if(right) celebrate&&0; }} className="btn btn-ghost py-3 px-4 text-lg justify-center" style={st==='ok'?{background:'var(--good-soft)',borderColor:'var(--known)'}:st==='bad'?{background:'var(--bad-soft)',borderColor:'var(--bad)'}:st==='dim'?{opacity:.5}:{}}><Bi>{c}</Bi></button>; })}</div>}
    {picked!==null&&<p className="text-center font-bold" role="status" style={{color:picked===info.he?'var(--known)':'var(--bad)'}}>{picked===info.he?'נכון! עכשיו דרגו כמה קל היה לכם:':'לא בדיוק. הפירוש הוא למעלה. דרגו בכנות:'}</p>}
    {flipped ? <div className="grade-row grid grid-cols-4 gap-2">
      {[[0,'שכחתי','bad'],[1,'קשה','learn'],[2,'ידעתי','primary'],[3,'קל','known']].map(([g,l,c])=><button key={g} className={`btn grade grade-${c} flex-col py-2`} style={{minHeight:'60px'}} onClick={()=>grade(g)}>
        <span className="font-extrabold">{l}</span><span className="text-[11px] opacity-80 num">{gradeLabel(card,g)}</span></button>)}
    </div> : <button className="btn btn-primary py-3 dock-mobile" onClick={()=>setFlipped(true)}>הצגת התשובה</button>}
  </div>);
}

/* ---------- post-reading summary ---------- */
function SummaryModal({story, snap, state, actions, voice, onClose, onPractice}){
  const [closing, close]=useClosing(onClose);
  const mref=useModal(close);
  const d=storyData(story); const keys=d.keys.filter(k=>!NAMES.has(k));
  const metNew=keys.filter(k=>!snap[k] && state.words[k]); const promoted=keys.filter(k=>snap[k]==='learning'&&state.words[k]==='known');
  const stillNew=keys.filter(k=>!state.words[k]); const learning=keys.filter(k=>state.words[k]==='learning');
  const [bulk,setBulk]=useState(false);
  const Chips=({list,kind})=> <div className="flex flex-wrap gap-1.5" dir="ltr">{list.slice(0,40).map(k=><button key={k} className={`pill pill-${kind} book`} onClick={()=>speakText(k,.9,voice)} title={wordInfo(k).he||''}>{k}</button>)}{list.length>40&&<span className="meta">+{list.length-40}</span>}</div>;
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="סיכום הקריאה" className={`sheet card w-full sm:max-w-lg rounded-b-none sm:rounded-[22px] p-5 sm:p-6 flex flex-col gap-4 ${closing?'out':''}`} style={{maxHeight:'92vh', overflowY:'auto', paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-start gap-3"><StoryCover story={story} size={56}/>
        <div className="flex-1 min-w-0"><div className="eyebrow">סיימת לקרוא</div><h2 className="text-2xl font-extrabold leading-tight">כל הכבוד! +10 נקודות</h2><div dir="ltr" lang="en" className="book text-muted text-left truncate">{story.title}</div></div>
        <button className="btn btn-ghost w-11 h-11 shrink-0" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl p-3 tint-new"><div className="num text-2xl font-extrabold">{metNew.length}</div><div className="text-xs">מילים חדשות שפגשת</div></div>
        <div className="rounded-xl p-3 tint-known"><div className="num text-2xl font-extrabold">{promoted.length}</div><div className="text-xs">עברו מבלמידה למוכרות</div></div>
        <div className="rounded-xl p-3 tint-learn"><div className="num text-2xl font-extrabold">{learning.length}</div><div className="text-xs">ממתינות לתרגול</div></div>
      </div>
      {metNew.length>0&&<div className="flex flex-col gap-1.5"><div className="text-sm font-bold">מילים חדשות שפגשת בסיפור</div><Chips list={metNew} kind={'learning'}/></div>}
      {promoted.length>0&&<div className="flex flex-col gap-1.5"><div className="text-sm font-bold">מילים שקידמת למוכרות 🎉</div><Chips list={promoted} kind="known"/></div>}
      {stillNew.length>0&&<div className="rounded-xl bg-sunk p-3 flex flex-col gap-2">
        <div className="text-sm">נשארו <b className="num">{stillNew.length}</b> מילים חדשות (מסומנות בכחול ובקו מנוקד) שלא לחצת עליהן. מכירים אותן?</div>
        {!bulk?<button className="btn btn-line px-4 text-sm self-start" onClick={()=>{ actions.finishStory(story,true); setBulk(true); }}>כן, סמנו את כולן כמוכרות</button>
          :<span className="text-sm font-semibold" style={{color:'var(--known)'}}>סומנו כמוכרות</span>}
      </div>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button className="btn btn-go px-5 py-3 flex-1" onClick={()=>onPractice(learning)} disabled={!learning.length}><IconBolt size={18}/>תרגל מילים קשות מהסיפור{learning.length?` (${learning.length})`:''}</button>
        <button className="btn btn-ghost px-5 py-3" onClick={close}>חזרה לסיפור</button>
      </div>
    </div>
  </div>);
}

/* ---------- reader ---------- */
const FONT_SIZES=['1.15rem','1.32rem','1.5rem','1.72rem'];
const READ_SNAPS={};
function Reader({story, stories, state, actions, voice, voices, back, toast, onWord, onPractice, session, onReport, onEdit, onDeleteCommunity}){
  const {settings}=state; const d=storyData(story);
  const [summary,setSummary]=useState(false);
  // word statuses when this reading began; kept across leaving and reopening the story until "finished"
  const snap=useRef(null); if(!snap.current){ if(!READ_SNAPS[story.id]){ const o={}; storyData(story).keys.forEach(k=>{ if(state.words[k]) o[k]=state.words[k]; }); READ_SNAPS[story.id]=o; } snap.current=READ_SNAPS[story.id]; }
  useEffect(()=>{ actions.setLastStory(story.id, 0); },[story.id]);
  const [confirmDel,setConfirmDel]=useState(false);
  const [trans,setTrans]=useState({});
  const paraRefs=useRef([]);
  const [dictation,setDictationRaw]=useState(false);
  const storyRef=useRef(null), areaRef=useRef(null);
  // words are keyboard-focusable only while the keyboard is in use: a focusable span blocks mouse text selection
  const [kbd,setKbd]=useState(false);
  useEffect(()=>{ const k=e=>{ if(e.key==='Tab') setKbd(true); }, m=()=>setKbd(false); window.addEventListener('keydown',k); window.addEventListener('mousedown',m); window.addEventListener('touchstart',m,{passive:true});
    return ()=>{ window.removeEventListener('keydown',k); window.removeEventListener('mousedown',m); window.removeEventListener('touchstart',m); }; },[]);
  const split=settings.pane===true||dictation;
  // Hebrew translation: on by default when the story has a ready translation; an explicit choice of the learner wins
  const hasHe=story.paras.some(p=>p.he);
  const parallel=settings.parallel===undefined?hasHe:!!settings.parallel;
  const [moreSet,setMoreSet]=useState(false);
  const note=(state.notes&&state.notes[story.id])||'';
  const setDictation=v=>{ setDictationRaw(v); if(v){ player.stop(); const s=window.getSelection&&window.getSelection(); s&&s.removeAllRanges(); } };
  const copyToPractice=(t)=>{ actions.setNote(story.id, (note&&!note.endsWith('\n')?note+'\n':note)+t+'\n'); if(settings.pane!==true) actions.setSetting('pane',true);
    copyText(t); toast('הועתק לאזור הכתיבה'); const el=areaRef.current; if(el) setTimeout(()=>{ el.scrollTop=el.scrollHeight; },60); };
  const player=useStoryPlayer(story, settings.rate, voice, {
    onPara:(p)=>actions.markRead(story,[p]),
    onFinish:()=>{ actions.addXP(5); toast('האזנת לסיפור עד הסוף! ‎+5'); } });
  const newCount=d.keys.filter(k=>!state.words[k]).length;
  const knownCount=d.keys.filter(k=>state.words[k]==='known').length;
  const doneToday=state.storiesDone[story.id]&&state.storiesDone[story.id].date===todayKey();
  useEffect(()=>{ if(player.playing){ const el=paraRefs.current[player.curP]; if(el&&el.scrollIntoView) el.scrollIntoView({block:'center', behavior:'smooth'}); } },[player.curP, player.playing]);

  const openWord=(tok)=>{ const s=window.getSelection&&window.getSelection(); if(s&&!s.isCollapsed&&s.toString().trim().length>tok.text.length) return;   // a drag-selection is not a click
    if(player.playing) player.stop(); if(!state.words[tok.key]) actions.setWordStatus(tok.key,'learning'); onWord(tok.key, tok.text); };
  const statusCls=k=>{ const s=state.words[k]; return s==='known'?'':s==='learning'?'w-learn':'w-new'; };
  const jump=(p)=>{ const q=player.jump(p); const el=paraRefs.current[q]; if(el&&el.scrollIntoView) el.scrollIntoView({block:'center', behavior:'smooth'}); };
  const translatePara=async(p)=>{ setTrans(t=>({...t,[p]:'loading'}));
    try{ const out=[]; for(const sen of splitSentences(story.paras[p].en)) out.push(await fetchTranslation(sen.slice(0,480))); actions.setParaHe(story.id, p, out.join(' ')); setTrans(t=>({...t,[p]:''})); }
    catch(e){ setTrans(t=>({...t,[p]:'fail'})); } };

  return (<div className="flex flex-col gap-4" style={{paddingBottom:'130px'}}>
    <div className="flex items-center gap-3 flex-wrap">
      <button className="btn btn-ghost px-3 py-2 text-sm" onClick={()=>{ player.stop(); back(); }}><IconChevR size={18}/>הספרייה</button>
      <span className="tag tag-level">שלב <span className="num">{story.level}</span></span>
      {story.real&&<span className="tag tag-real">סיפור אמיתי</span>}{story.user&&<span className="tag">שלי</span>}{story.community&&<span className="tag">🌍 קהילה · מאת <bdi>{story.author}</bdi></span>}
      <span className="tag"><IconClock size={11}/>כ־<span className="num">{readMinutes(d.words)}</span> דק׳ · <span className="num">{d.words}</span> מילים</span>
      <span className="text-sm text-muted num ms-auto">{knownCount}/{d.keys.length} מילים מוכרות</span>
    </div>

    <section className="card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
        <Toggle id="tg-par" checked={parallel} onChange={v=>actions.setSetting('parallel',v)} label="תרגום לעברית" hint="תרגום מלא מתחת לכל פסקה"/>
        <Toggle id="tg-pron" checked={settings.pron} onChange={v=>actions.setSetting('pron',v)} label="עזרי הגייה" hint={settings.pronAll?'תעתיק עברי מתחת לכל מילה':'תעתיק עברי מתחת למילים קשות'}/>
        <button className="btn btn-ghost px-3 py-1.5 text-sm ms-auto" aria-expanded={moreSet} onClick={()=>setMoreSet(x=>!x)}>{moreSet?'סגירת ההגדרות':'עוד הגדרות קריאה'}</button>
      </div>
      {moreSet&&<div className="flex flex-wrap gap-x-6 gap-y-3 items-center border-t border-line pt-4 rise">
        {settings.pron&&<div className="flex items-center gap-2 flex-wrap"><span className="text-sm text-muted">הגייה מתחת ל:</span><div className="seg" role="group" aria-label="מתחת לאילו מילים">
          <button aria-pressed={!settings.pronAll} onClick={()=>actions.setSetting('pronAll',false)}>מילים קשות</button>
          <button aria-pressed={!!settings.pronAll} onClick={()=>actions.setSetting('pronAll',true)}>כל המילים</button>
        </div></div>}
        <Toggle id="tg-pane" checked={split} onChange={v=>{ actions.setSetting('pane',v); if(!v) setDictationRaw(false); }} label="אזור כתיבה והכתבה" hint="תצוגה מפוצלת: סיפור וכתיבה"/>
        <div className="flex items-center gap-2 ms-auto">
          <span className="text-sm text-muted">גודל אות</span>
          <div className="seg" role="group" aria-label="גודל אות" dir="ltr">
            <button onClick={()=>actions.setSetting('font',Math.max(0,settings.font-1))} disabled={settings.font<=0} aria-label="הקטנת האותיות" title="הקטנת האותיות" className="book">A−</button>
            <button onClick={()=>actions.setSetting('font',Math.min(3,settings.font+1))} disabled={settings.font>=3} aria-label="הגדלת האותיות" title="הגדלת האותיות" className="book text-lg">A+</button>
          </div>
        </div>
      </div>}
    </section>

    <a href="#finish-box" className="skip-link" onClick={e=>{ e.preventDefault(); const el=document.getElementById('finish-box'); if(el){ el.scrollIntoView({block:'center'}); const b=el.querySelector('button'); b&&b.focus({preventScroll:true}); } }}>דילוג לסוף הסיפור</a>
    <div className={split?'split-view':''}>
    <article ref={storyRef} className={`card px-5 py-8 sm:px-10 sm:py-10 ${split?'split-story':''} ${dictation?'dictation':''}`}>
      {dictation&&<div className="rounded-xl px-4 py-3 mb-6 text-sm font-semibold flex items-center gap-2 mx-auto" style={{maxWidth:'38rem', background:'var(--sun-soft)', color:'var(--ink)'}}><IconEar size={18}/>מצב הכתבה פעיל: הטקסט מוסתר. הקשיבו, וכתבו באזור הכתיבה.</div>}
      <div className="mx-auto" style={{maxWidth:'38rem'}}>
        <header dir="ltr" lang="en" className="text-left border-b border-line pb-6 mb-8">
          <div className="mb-5"><StoryCover story={story} size={84} radius={20}/></div>
          <h1 className="book text-[2rem] sm:text-[2.75rem] font-extrabold leading-tight tracking-tight">{story.title}</h1>
          {story.he&&<div dir="rtl" className="text-muted mt-2 text-right">{story.he}</div>}
        </header>
        <div className="flex flex-col gap-6" style={{'--read-size':FONT_SIZES[settings.font]||FONT_SIZES[1]}}>
          {story.paras.map((para,p)=>{ const isCur=player.playing&&player.curP===p;
            return (<div key={p} ref={el=>paraRefs.current[p]=el} className="flex flex-col gap-2">
              <p dir="ltr" lang="en" aria-hidden={dictation||undefined} className={`reading text-left ${settings.pron&&!dictation?'pron':''} ${settings.pron&&settings.pronAll&&!dictation?'pron-all':''}`}>
                {d.tokens[p].map((tok,i,all)=>{
                  // punctuation right after a word stays glued to it, so a lone "." never wraps to a new line
                  if(tok.t==='s'){ const prevW=all[i-1]&&all[i-1].t==='w'; const t=prevW?tok.text.replace(/^[^\s]+/,''):tok.text; return t?<span key={i}>{t}</span>:null; }
                  const nx=all[i+1]; const glue=nx&&nx.t==='s'?(nx.text.match(/^[^\s]+/)||[''])[0]:'';
                  const act=player.active && player.active.p===p && player.active.wi===tok.wi;
                  const info=settings.pron&&!dictation?wordInfo(tok.key):null; const showPron=info&&(settings.pronAll||(info.hard&&state.words[tok.key]!=='known'));
                  const el=<span key={i} role="button" tabIndex={kbd?0:undefined} className={`word ${statusCls(tok.key)} ${act?'w-active':''}`}
                    onClick={()=>openWord(tok)} onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openWord(tok);} }}>
                    {showPron ? <span className="wstack"><span>{tok.text}</span><span className="pron-hint" dir="rtl">{info.pron}</span></span> : tok.text}
                  </span>;
                  return glue ? <span key={i} className="whitespace-nowrap">{el}{glue}</span> : el; })}
                <button className="hit inline-grid place-items-center align-middle ms-2 w-8 h-8 rounded-full" style={isCur?{background:'var(--karaoke)',color:'var(--karaoke-ink)'}:{background:'var(--sunk)',color:'var(--muted)'}} onClick={()=>player.playPara(p)} aria-label={`הקראת פסקה ${p+1}`} title="הקראת הפסקה הזו"><IconSpeaker size={14}/></button>
              </p>
              {parallel&&!dictation&&(para.he ? <p dir="rtl" className="para-he rise">{para.he}</p>
                : <div dir="rtl" className="para-he text-sm flex items-center gap-2 flex-wrap">
                    <button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>translatePara(p)} disabled={trans[p]==='loading'}>{trans[p]==='loading'?'מתרגם…':'תרגם פסקה (מקוון)'}</button>
                    {trans[p]==='fail'&&<span>התרגום המקוון לא זמין כרגע. לחיצה על מילה עדיין מציגה תרגום מהמילון.</span>}
                  </div>)}
            </div>); })}
        </div>

        <div id="finish-box" className="finish-box mt-12 rounded-2xl p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1"><div className="text-xl font-extrabold">{doneToday?'קראת את הסיפור הזה היום ✓':'הגעת לסוף הסיפור'}</div>
            <div className="text-sm text-muted">{doneToday?'אפשר לראות שוב את הסיכום ולתרגל את המילים הקשות.':'לחץ כדי לראות מה למדת ולתרגל את המילים הקשות.'}</div></div>
          <button className="btn btn-go px-6 py-3 text-lg" onClick={()=>{ if(!doneToday){ player.stop(); actions.finishStory(story,false); } setSummary(true); }}><IconCheck/>סיימתי לקרוא</button>
        </div>
        {story.community&&<div className="mt-5 flex items-center gap-3 flex-wrap text-sm">
          {session&&session.user&&story.ownerId===session.user.id
            ? <><button className="hit text-primary font-semibold" onClick={()=>onEdit(story)}>עריכת הסיפור</button>
                {!confirmDel?<button className="hit underline" style={{color:'var(--bad)'}} onClick={()=>setConfirmDel(true)}>מחיקת הסיפור</button>
                  :<><span>למחוק את הסיפור לצמיתות?</span><button className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={async()=>{ player.stop(); await onDeleteCommunity(story); back(); }}>כן, למחוק</button><button className="btn btn-ghost py-2 px-3" onClick={()=>setConfirmDel(false)}>ביטול</button></>}</>
            : <button className="hit text-muted underline" onClick={()=>onReport(story)} aria-label={`דיווח על תוכן: ${story.title}`}>דווח על תוכן</button>}
        </div>}
        {story.user&&<div className="mt-5 flex items-center gap-3 flex-wrap text-sm">
          {!confirmDel ? <button className="hit text-muted underline flex items-center gap-1" onClick={()=>setConfirmDel(true)}><IconTrash size={15}/>מחיקת הסיפור הזה</button>
          : <><span>למחוק את הסיפור? המילים שלמדת ממנו יישמרו.</span><button className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={()=>{ player.stop(); actions.deleteStory(story.id); back(); }}>כן, למחוק</button><button className="btn btn-ghost py-2 px-3" onClick={()=>setConfirmDel(false)}>ביטול</button></>}
        </div>}
      </div>
    </article>
    {split&&<PracticePane story={story} text={note} setText={t=>actions.setNote(story.id,t)} voice={voice} toast={toast} dictation={dictation} setDictation={setDictation} areaRef={areaRef}/>}
    </div>
    <SelectionPopover rootRef={storyRef} disabled={dictation} onSpeak={t=>{ if(player.playing) player.stop(); speakText(t,.9,voice); }} onCopy={copyToPractice}/>

    {summary&&<SummaryModal story={story} snap={snap.current} state={state} actions={actions} voice={voice} onClose={()=>{ setSummary(false); delete READ_SNAPS[story.id]; snap.current=null; }} onPractice={ks=>{ setSummary(false); onPractice(ks, story.title); }}/>}
    <div className="player" dir="rtl" role="region" aria-label="נגן הקראה">
      <div className="h-1 bg-sunk" dir="ltr"><div className="h-full bar" style={{width:((player.curP+(player.playing?1:0))/story.paras.length*100)+'%', background:'var(--karaoke)'}} ></div></div>
      <div className="gutter"><div className="max-w-[860px] mx-auto py-2.5 flex items-center gap-x-3 gap-y-2 flex-wrap">
        <div className="flex items-center gap-1.5" dir="ltr">
          <button className="btn btn-ghost w-11 h-11" onClick={()=>jump(player.curP-1)} disabled={player.curP<=0} aria-label="הפסקה הקודמת"><IconPrev size={18}/></button>
          {player.playing
            ? <button className="btn w-14 h-14" style={{borderRadius:'50%', background:'var(--karaoke)', color:'var(--karaoke-ink)'}} onClick={player.stop} aria-label="עצירה"><IconStop size={24}/></button>
            : <button className="btn btn-primary w-14 h-14" style={{borderRadius:'50%'}} onClick={player.play} disabled={!synth} aria-label="הקראת הסיפור"><IconPlay size={24}/></button>}
          <button className="btn btn-ghost w-11 h-11" onClick={()=>jump(player.curP+1)} disabled={player.curP>=story.paras.length-1} aria-label="הפסקה הבאה"><IconNext size={18}/></button>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div dir="ltr" lang="en" className="book font-semibold text-sm truncate hidden sm:block text-left">{story.title}</div>
          <div className="text-xs text-muted num whitespace-nowrap">{synth?<>פסקה {player.curP+1}/{story.paras.length}<span className="hidden sm:inline">{player.playing?' · מוקרא עכשיו':''}</span></>:'אין תמיכה בהקראה'}</div>
        </div>
        <div className="hidden sm:block"><div className="seg" role="group" aria-label="מהירות הקראה">
          {[[1,'רגיל','מהירות רגילה'],[0.75,'איטי','קצת יותר לאט'],[0.5,'לאט מאוד','חצי מהירות']].map(([r,l,t])=><button key={r} aria-pressed={settings.rate===r} title={t} onClick={()=>actions.setSetting('rate',r)}>{l}</button>)}
        </div></div>
        <div className="sm:hidden"><button className="btn btn-ghost px-3" onClick={()=>actions.setSetting('rate', settings.rate===1?0.75:settings.rate===0.75?0.5:1)} aria-label={`מהירות הקראה: ${settings.rate===1?'רגיל':settings.rate===0.75?'איטי':'לאט מאוד'}. לחיצה מחליפה מהירות`}>{settings.rate===1?'רגיל':settings.rate===0.75?'איטי':'לאט מאוד'}</button></div>
        {voices.length>1&&<select id="voice-select" className="rounded-xl bg-sunk px-2 py-2 text-xs max-w-[150px] hidden sm:block" value={(voice&&voice.name)||''} onChange={e=>actions.setSetting('voice',e.target.value)} aria-label="קול הקראה" dir="ltr">
          {voices.map(v=><option key={v.name} value={v.name}>{v.name.replace(/Microsoft |Google /,'')} ({v.lang})</option>)}
        </select>}
      </div></div>
    </div>

  </div>);
}

/* ---------- speaking game: the word is shown, the learner says it ---------- */
function levenshtein(a,b){ const m=a.length,n=b.length; if(!m) return n; if(!n) return m; let prev=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; } return prev[n]; }
function saidIt(target, heard){
  const t=target.toLowerCase(); const pr=wordInfo(t).pron;
  const toks=String(heard||'').toLowerCase().replace(/[’`]/g,"'").replace(/[^a-z' ]+/g,' ').split(/\s+/).filter(Boolean);
  return toks.some(w=> w===t || w.replace(/'/g,'')===t.replace(/'/g,'') || (t.length>=6 && levenshtein(w,t)<=1) || (wordInfo(w).pron===pr && pr));
}
const SPEAK_LEN=10;
function SpeakGame({pool, state, actions, voice, celebrate, onDone}){
  const words=useMemo(()=>shuffle(pool.filter(k=>k.length>=3&&!NAMES.has(k)&&!k.includes("'"))).slice(0,SPEAK_LEN),[]);
  const [i,setI]=useState(0); const [tries,setTries]=useState(0); const [heard,setHeard]=useState(''); const [result,setResult]=useState(null);
  const [listening,setListening]=useState(false); const [err,setErr]=useState(''); const [score,setScore]=useState(0); const stopRef=useRef(null);
  const k=words[i]; const info=k?wordInfo(k):null;
  useEffect(()=>()=>{ stopRef.current&&stopRef.current(); },[]);
  const judge=(text)=>{ setHeard(text); const ok=saidIt(k,text);
    if(ok){ setResult('ok'); setScore(s=>s+1); if(state.words[k]==='learning') actions.recordAnswer(k,true); else actions.addXP(2); if((score+1)%3===0) celebrate(false); }
    else { const n=tries+1; setTries(n); setResult(n>=3?'fail':'retry'); if(n>=3&&state.words[k]==='learning') actions.recordAnswer(k,false); } };
  const mic=()=>{ setErr(''); if(listening){ stopRef.current&&stopRef.current(); return; }
    setHeard(''); stopRef.current=listenOnce({lang:'en', onPartial:t=>setHeard(t), onText:judge, onError:m=>setErr(m), onState:setListening}); };
  const next=()=>{ setI(x=>x+1); setTries(0); setHeard(''); setResult(null); setErr(''); };
  if(!words.length) return (<section className="card p-6 flex flex-col gap-3 items-start"><h1 className="text-2xl font-extrabold">אין מספיק מילים למשחק</h1><p className="text-muted">קראו סיפור קצר ולחצו על כמה מילים, ואז נסו שוב.</p><button className="btn btn-primary px-5" onClick={onDone}>חזרה</button></section>);
  if(!k) return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status">
    <div className="eyebrow">תגיד את המילה</div><h1 className="text-3xl font-extrabold">{score>=8?'הגייה מצוינת!':score>=5?'יפה מאוד!':'כל ניסיון משפר את ההגייה'}</h1>
    <div className="num text-2xl font-extrabold">{score}/{words.length} <span className="text-base text-muted font-semibold">מילים נאמרו נכון</span></div>
    <p className="text-muted text-sm">טיפ: לפני שאומרים, אפשר ללחוץ על הרמקול ולחזור אחרי הקול.</p>
    <button className="btn btn-primary px-6" onClick={onDone}>סיום</button></section>);
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 text-sm" onClick={()=>{ stopRef.current&&stopRef.current(); onDone(); }}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(i/words.length*100)+'%', background:'var(--primary)'}}></div></div>
      <span className="num text-sm text-muted">{i+1}/{words.length}</span>
    </div>
    <h1 className="eyebrow">תגיד את המילה בקול</h1>
    <section className={`card p-6 sm:p-8 flex flex-col items-center gap-3 text-center ${result==='retry'?'shake':''}`} key={k}>
      <div dir="ltr" lang="en" className="book text-5xl sm:text-6xl font-bold">{k}</div>
      <div className="text-lg text-muted"><Bi>{info.he||''}</Bi></div>
      <div className="flex gap-2"><button className="btn btn-ghost px-4" onClick={()=>speakText(k,.9,voice)}><IconSpeaker size={18}/>איך אומרים?</button>
        <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.45,voice)}><IconSlow size={18}/>לאט</button></div>
      {(tries>0||result==='fail')&&<div className="text-xl font-semibold" style={{color:'var(--primary)'}}>{info.pron}</div>}
      {heard&&<div className="text-sm text-muted">שמעתי: <bdi dir="ltr" lang="en" className="book text-base text-ink">{heard}</bdi></div>}
      {result==='ok'&&<div className="rise text-2xl font-extrabold" style={{color:'var(--known)'}} role="status">{pick(CHEERS)} +2</div>}
      {result==='retry'&&<div className="rise font-bold" style={{color:'var(--bad)'}} role="status">כמעט! הקשיבו לדוגמה ונסו שוב ({3-tries} ניסיונות נשארו)</div>}
      {result==='fail'&&<div className="rise font-bold" role="status">לא נורא. ככה אומרים את זה: <span style={{color:'var(--primary)'}}>{info.pron}</span></div>}
    </section>
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
    {result==='ok'||result==='fail'
      ? <button className="btn btn-primary py-3 px-6 self-center dock-mobile" onClick={next} autoFocus>{i+1>=words.length?'לסיכום':'המילה הבאה'}</button>
      : <div className="flex flex-col items-center gap-2">
          <button className={`btn w-20 h-20 ${listening?'pop':''}`} style={{borderRadius:'50%', background:listening?'var(--bad)':'var(--primary)', color:'var(--primary-ink)'}} onClick={mic} aria-label={listening?'עצירת ההקשבה':`הקליטו את עצמכם אומרים ${k}`} aria-pressed={listening}><IconMic size={34}/></button>
          <span className="text-sm text-muted">{listening?'מקשיב… אמרו את המילה':'לחצו ואמרו את המילה'}</span>
          <button className="hit text-sm text-muted underline" onClick={()=>{ setResult('fail'); }}>דלג</button>
        </div>}
  </div>);
}

/* ---------- practice ---------- */
function SrsCard({state, onStart}){
  const due=dueWords(state); const learning=Object.values(state.words).filter(s=>s==='learning').length; const next=nextDueAt(state);
  const reviews=(state.totals&&state.totals.reviews)||0;
  return (<section className="card srs-card p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
    <span className="w-14 h-14 rounded-2xl grid place-items-center shrink-0 text-2xl" style={{background:'var(--primary-soft)'}} aria-hidden="true">🧠</span>
    <div className="flex-1 min-w-0">
      <div className="eyebrow">כרטיסי חזרה</div>
      <h2 className="text-2xl font-extrabold">{due.length?<><span className="num">{due.length}</span> מילים מחכות לחזרה</>:'אין מילים לחזרה כרגע'}</h2>
      <p className="text-sm text-muted">{due.length?'כל מילה חוזרת בדיוק כשמתחילים לשכוח אותה. כמה דקות ביום מספיקות.':next?`החזרה הבאה ${relTime(next)}. בינתיים אפשר לקרוא סיפור.`:learning?'':'לחץ על מילים בסיפורים או סיים שיעור, והמילים יופיעו כאן.'}
        {' '}<span className="num">{learning}</span> בלמידה · <span className="num">{reviews}</span> חזרות עד היום</p>
    </div>
    <div className="flex flex-col gap-2 shrink-0">
      <button className="btn btn-go px-6 py-3 text-lg" disabled={!due.length} onClick={()=>onStart(due.slice(0,30),'חזרה מרווחת')}><IconPlay size={18}/>{due.length?`התחל חזרה (${Math.min(30,due.length)})`:'אין חזרות'}</button>
      {!due.length&&learning>0&&<button data-early className="btn btn-ghost px-4 py-2" onClick={()=>{ const ks=Object.keys(state.words).filter(k=>state.words[k]==='learning').sort((x,y)=>srsCard(state,x).due-srsCard(state,y).due).slice(0,20); onStart(ks,'תרגול מוקדם'); }}>רוצה לתרגל בכל זאת ({Math.min(20,learning)})</button>}
    </div>
  </section>);
}
const CHEERS=['מעולה!','בדיוק!','יפה מאוד!','כל הכבוד!','איזה יופי!','נכון!'];
const COMFORT=['לא נורא! כל טעות עוזרת למוח לזכור טוב יותר.','כמעט! בפעם הבאה זה כבר ייזכר.','זה בסדר לטעות. ככה בדיוק לומדים.','שווה לנסות שוב. המילה הזו תחזור עוד מעט.'];
const SESSION_SEC=120;
function makeQuestion(learning, quiz, lastKey, mode){
  const pool=learning.length>1?learning.filter(k=>k!==lastKey):learning;
  const weights=pool.map(k=>1/(1+((quiz[k]&&quiz[k].c)||0)));
  let r=Math.random()*weights.reduce((a,b)=>a+b,0), key=pool[0];
  for(let i=0;i<pool.length;i++){ r-=weights[i]; if(r<=0){ key=pool[i]; break; } }
  const info=wordInfo(key);
  const type=!info.he||mode==='listen' ? 'listen' : mode==='meaning' ? 'meaning' : (Math.random()<.5?'meaning':'listen');
  let options;
  if(type==='meaning'){
    const seen=new Set([info.he]); const ds=[];
    for(const k of shuffle(QUIZ_POOL)){ const t=MEANING[k]; if(k!==key && !seen.has(t)){ seen.add(t); ds.push(k); } if(ds.length===3) break; }
    options=shuffle([{key, label:info.he}, ...ds.map(k=>({key:k, label:MEANING[k]}))]);
  } else {
    const seenPr=new Set([info.pron]); const ds=[];
    const near=shuffle(QUIZ_POOL).sort((a,b)=>Math.abs(a.length-key.length)-Math.abs(b.length-key.length)).slice(0,60);
    for(const k of shuffle(near)){ const pr=wordInfo(k).pron; if(k!==key && !seenPr.has(pr)){ seenPr.add(pr); ds.push(k); } if(ds.length===3) break; }
    options=shuffle([key,...ds]).map(k=>({key:k, label:k}));
  }
  return {key, type, options, id:Math.random()};
}
/* ---------- practice home helpers (today strip, last finished lesson) ---------- */
function lastLessonPick(state){
  const ls=csOf(state).lessons; let best=null;
  for(const c of COURSES) for(const t of c.topics) for(const l of t.lessons){ const d=ls[l.id]; if(!d||l.type==='story'||l.type==='talk') continue; if(!best||d>=best.d) best={l,d}; }
  // the newest finished unit of the video series (its words were added to the review cards by the unit practice)
  const uw=csOf(state).unitWords||{}; let ub=null; for(const n in uw){ if(!ub||uw[n]>=ub.d) ub={n:+n, d:uw[n]}; }
  if(ub&&typeof UNIT_CONTENT!=='undefined'&&UNIT_CONTENT[ub.n]&&(!best||ub.d>=best.d)){ const keys=UNIT_CONTENT[ub.n].words.map(w=>w.en.toLowerCase()).filter(k=>state.words[k]==='learning'); if(keys.length>=3) return {title:UNIT_CONTENT[ub.n].title, keys, unit:true}; }
  if(!best) return null;
  const keys=lessonWordsOf(best.l).filter(k=>state.words[k]==='learning');
  return keys.length>=3?{title:best.l.title, keys}:null;
}
const minsLabel=secs=>{ const m=Math.round(secs/60); return secs>0&&m<1?1:m; };
function PracticeToday({state}){
  const th=state.history[todayKey()]||{}; const mins=minsLabel(th.secs||0); const xp=th.xp||0; const goal=state.goal; const streak=computeStreak(state.history);
  const started=mins>0||xp>0;
  return (<section className="card p-4 sm:p-5 flex flex-col gap-3" aria-labelledby="pr-today">
    <h2 id="pr-today" className="section-title">היום שלך</h2>
    <div className="pr-today">
      <div className="pr-cell"><div className="num text-2xl font-extrabold">{mins}<span className="text-base font-semibold text-muted"> דק׳</span></div><div className="text-sm text-muted">זמן למידה היום</div></div>
      <div className="pr-cell"><div className="num text-2xl font-extrabold">{Math.min(xp,goal)}<span className="text-base font-semibold text-muted">/{goal}</span></div><div className="text-sm text-muted">נקודות ליעד</div>
        <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{background:'var(--line-strong)'}} dir="ltr" aria-hidden="true"><div className="h-full" style={{width:Math.min(100,xp/goal*100)+'%', background:'var(--primary)'}}></div></div></div>
      <div className="pr-cell"><div className="num text-2xl font-extrabold">{streak}<span className="text-base font-semibold text-muted"> {streak===1?'יום':'ימים'}</span></div><div className="text-sm text-muted">ברצף</div></div>
    </div>
    <p className="text-sm text-muted">{state.history[todayKey()]&&state.history[todayKey()].met?'היעד של היום הושלם. כל הכבוד, אפשר להמשיך בלי לחץ.':started?`עוד ${Math.max(0,goal-xp)} נקודות להשלמת היעד היומי.`:'עוד לא התחלת היום. סבב קצר אחד מספיק כדי להתחיל.'}</p>
  </section>);
}

function Practice({state, stories, known, actions, voice, celebrate, goRead, goTalk, goCourses, onWord, onSrs}){
  const learning=Object.keys(state.words).filter(k=>state.words[k]==='learning');
  const lvNow=levelFor(known);
  const fallback=[...new Set(STORIES.filter(s=>s.level<=lvNow).flatMap(s=>storyData(s).keys))].filter(k=>k.length>2 && !NAMES.has(k) && state.words[k]!=='known' && MEANING[k] && !MEANING[k].includes('('));
  const pool=learning.length?learning:fallback;
  const [mode,setMode]=useState('mix');
  const [phase,setPhase]=useState('intro');
  const [q,setQ]=useState(null);
  const [picked,setPicked]=useState(null);
  const [combo,setCombo]=useState(0);
  const [stats,setStats]=useState({n:0, c:0, best:0, xp:0});
  const [left,setLeft]=useState(SESSION_SEC);
  const [msg,setMsg]=useState('');
  const [graduated,setGraduated]=useState({});
  const timeUp=left<=0;
  const start=(m)=>{ const md=m||mode; if(!pool.length) return; setMode(md); setStats({n:0,c:0,best:0,xp:0}); setCombo(0); setLeft(SESSION_SEC); setPicked(null); setGraduated({}); setQ(makeQuestion(pool, state.quiz, null, md)); setPhase('play'); };
  useEffect(()=>{ if(phase!=='play') return; const t=setInterval(()=>setLeft(l=>Math.max(0,l-1)),1000); return ()=>clearInterval(t); },[phase]);
  useEffect(()=>{ if(phase==='play' && timeUp && picked===null) setPhase('done'); },[timeUp, phase, picked]);
  useEffect(()=>{ if(phase==='play' && q && q.type==='listen') speakText(q.key, .85, voice); },[q&&q.id]);
  const answer=(opt)=>{
    if(picked!==null) return;
    const ok=opt.key===q.key; setPicked(opt.key);
    actions.recordAnswer(q.key, ok); actions.markDaily('practice');
    if(ok){ const nc=combo+1; setCombo(nc); setMsg(pick(CHEERS)); setStats(s=>({n:s.n+1, c:s.c+1, best:Math.max(s.best,nc), xp:s.xp+3})); celebrate(nc>=3 && nc%3===0); actions.noteCombo(nc); if(q.type==='meaning') speakText(q.key,.9,voice); }
    else { setCombo(0); setMsg(pick(COMFORT)); setStats(s=>({...s, n:s.n+1, xp:s.xp+1})); }
  };
  const next=()=>{
    if(timeUp){ setPhase('done'); return; }
    if(!pool.length){ setPhase('done'); return; }
    setPicked(null); setQ(makeQuestion(pool, state.quiz, q.key, mode));
  };
  useEffect(()=>{ if(phase!=='play') return;
    const h=e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
      if(picked===null && /^[1-4]$/.test(e.key) && q){ answer(q.options[+e.key-1]); }
      else if(picked!==null && e.key==='Enter' && !/^(BUTTON|A)$/.test(e.target.tagName)){ e.preventDefault(); next(); } };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); });

  if(phase==='speak') return <SpeakGame pool={pool} state={state} actions={actions} voice={voice} celebrate={celebrate} onDone={()=>{ actions.markDaily('practice'); setPhase('intro'); }}/>;
  if(phase==='intro'){
    const due=dueWords(state); const dueN=due.length; const nCards=Math.min(30,dueN); const lastL=lastLessonPick(state);
    const est=n=>Math.max(1,Math.round(n/5));
    const early=()=>{ const ks=learning.slice().sort((x,y)=>srsCard(state,x).due-srsCard(state,y).due).slice(0,20); onSrs(ks,'תרגול מוקדם'); };
    const noPool=!pool.length;
    let rec;
    const lastDue=lastL&&lastL.unit?lastL.keys.filter(k=>due.includes(k)):[];
    if(lastDue.length>=3) rec={ title:<>מילים מהשיעור האחרון: <bdi>{lastL.title}</bdi></>, sub:`${lastDue.length} מילים מהשיעור שסיימת, כ־${est(Math.min(20,lastDue.length))} דקות.`, btn:`תרגל את מילות השיעור (${Math.min(20,lastDue.length)})`, run:()=>onSrs(lastDue.slice(0,20),'מילים מהשיעור האחרון'), alt:dueN>lastDue.length?{label:`כל מילות החזרה (${nCards})`, run:()=>onSrs(due.slice(0,30),'חזרה מרווחת')}:null };
    else if(dueN>0) rec={ title:<>חזרה על <span className="num">{dueN}</span> {dueN===1?'מילה':'מילים'} שכדאי לרענן</>, sub:`כרטיסי חזרה, כ־${est(nCards)} ${est(nCards)===1?'דקה':'דקות'}. כל מילה חוזרת בדיוק כשמתחילים לשכוח אותה.`, btn:`התחל חזרה (${nCards})`, run:()=>onSrs(due.slice(0,30),'חזרה מרווחת'), alt:null };
    else if(lastL) rec={ title:<>תרגול של השיעור האחרון: <bdi>{lastL.title}</bdi></>, sub:`${lastL.keys.length} מילים מהשיעור, כ־${est(Math.min(20,lastL.keys.length))} דקות.`, btn:'תרגל את השיעור', run:()=>onSrs(lastL.keys.slice(0,20),'תרגול השיעור האחרון'), alt:{label:'סבב מהיר של 2 דקות', run:()=>start('mix')} };
    else if(learning.length>0) rec={ title:'אין מילים שמחכות לחזרה. אפשר סבב מהיר', sub:`שתי דקות של שאלות על ${learning.length} המילים ששמרת לתרגול.`, btn:'סבב מהיר של 2 דקות', run:()=>start('mix'), alt:{label:`תרגול מוקדם (${Math.min(20,learning.length)})`, run:early} };
    else rec={ title:'עוד אין מה לחזור עליו', sub:'התחל בשיעור הראשון ונבנה לך תרגול מהמילים שתלמד.', btn:'לשיעור הראשון', run:goCourses, alt:noPool?null:{label:'או סבב היכרות של 2 דקות', run:()=>start('mix')}, first:true };
    const modes=[
      { k:'srs', icon:<IconBook size={22}/>, title:'כרטיסי חזרה', desc:dueN?'מילים שהגיע הזמן לחזור עליהן, בדיוק לפני שנשכחות.':learning.length?'אין חזרות כרגע. אפשר לתרגל מוקדם.':'מילים ששמרת יחכו לך כאן לחזרה.', meta:dueN?`${dueN} מחכות`:`${learning.length} בלמידה`, off:!learning.length, run:()=>dueN?onSrs(due.slice(0,30),'חזרה מרווחת'):early() },
      { k:'mix', icon:<IconBolt size={22}/>, title:'סבב מהיר', desc:'שאלות פירוש ושמיעה בערבוביה, בשתי דקות.', meta:'2 דק׳', off:noPool, run:()=>start('mix') },
      { k:'meaning', icon:<IconBook size={22}/>, title:'מה הפירוש?', desc:'רואים מילה באנגלית ובוחרים את התרגום מתוך ארבעה.', meta:'2 דק׳', off:noPool, run:()=>start('meaning') },
      { k:'listen', icon:<IconEar size={22}/>, title:'אתגר שמיעה', desc:'שומעים מילה בלי לראות אותה ובוחרים מה נאמר.', meta:'2 דק׳', off:noPool, run:()=>start('listen') },
      { k:'speak', icon:<IconMic size={22}/>, title:'תגיד את המילה', desc:'רואים מילה ואומרים אותה בקול. האתר בודק אם אמרת נכון.', meta:`${Math.min(pool.length,10)||0} מילים`, off:noPool, run:()=>setPhase('speak') },
      { k:'talk', icon:<IconChat size={22}/>, title:'שיחות מוכנות', desc:'מקשיבים לשיחה קצרה ועונים בקול.', meta:`${TALKS.length} שיחות`, off:false, run:goTalk },
      { k:'lessons', icon:<IconPen size={22}/>, title:'תרגילי השיעורים', desc:'השלמת משפט, סידור משפט וכתיבה מהזיכרון, בתוך כל שיעור.', meta:'בקורסים', off:false, run:goCourses }
    ];
    return (<div className="flex flex-col gap-4">
      
      <PracticeToday state={state}/>
      <section className="card hero pr-hero" aria-labelledby="pr-rec">
        <div className="pr-hero-body">
          <div className="eyebrow">{rec.first?'הצעד הראשון':'מומלץ לך עכשיו'}</div>
          <h2 id="pr-rec" className="text-2xl sm:text-3xl font-extrabold leading-tight">{rec.title}</h2>
          <p className="text-muted">{rec.sub}</p>
          <div className="flex gap-2 flex-wrap items-center mt-1">
            <button className="btn btn-go px-6 text-lg" style={{minHeight:'52px'}} onClick={rec.run}><IconPlay size={18}/>{rec.btn}</button>
            {rec.alt&&<button className="btn btn-ghost px-4" onClick={rec.alt.run}>{rec.alt.label}</button>}
          </div>
        </div>
        <img className="pr-uri" src="assets/uri.png" alt="" aria-hidden="true" width="475" height="642" decoding="async" draggable="false"/>
      </section>
      <section aria-labelledby="pr-modes" className="flex flex-col gap-3">
        <h2 id="pr-modes" className="section-title">דרכים לתרגל</h2>
        <ul className="pr-modes">{modes.map(m=><li key={m.k}><button type="button" className="card pr-mode" disabled={m.off} onClick={m.run}>
          <span className="pr-ico" aria-hidden="true">{m.icon}</span>
          <span className="flex-1 min-w-0"><span className="font-bold block">{m.title}</span><span className="text-sm text-muted block">{m.desc}</span></span>
          <span className="tag pr-meta"><IconClock size={13}/>{m.meta}</span>
        </button></li>)}</ul>
      </section>
      {learning.length>0&&<details className="card p-4"><summary className="hit text-sm text-primary font-semibold cursor-pointer">הצגת המילים שבתרגול ({learning.length})</summary>
        <div className="flex flex-wrap gap-2 mt-2" dir="ltr">{learning.slice(0,24).map(k=><button key={k} className="word chip w-learn book text-base" onClick={()=>onWord(k,k)} title="פתיחת המילה במילון">{k}</button>)}{learning.length>24&&<span className="text-muted text-sm self-center">+{learning.length-24}</span>}</div></details>}
    </div>);
  }

  if(phase==='done') return (<section className="card p-6 sm:p-8 flex flex-col gap-5 items-start rise">
    <h1 className="text-3xl font-bold">{stats.n===0?'נגמר הזמן':'סיימת סבב!'}</h1>
    <p className="text-muted">{stats.c>=stats.n*0.8&&stats.n>0?'תוצאה מצוינת. המילים האלה כבר כמעט שלך.':'כל סבב מחזק את הזיכרון. מחר זה יהיה קל יותר.'}</p>
    <div className="grid grid-cols-3 gap-3 w-full max-w-md">
      {[[`${stats.c}/${stats.n}`,'תשובות נכונות'],[stats.best,'קומבו הכי ארוך'],[`+${stats.xp}`,'נקודות היום']].map(([v,l])=>
        <div key={l} className="rounded-xl bg-sunk p-3 text-center"><div className="num text-2xl font-bold" dir="ltr">{v}</div><div className="text-xs text-muted">{l}</div></div>)}
    </div>
    <div className="flex gap-2 flex-wrap">
      <button className="btn btn-primary py-3 px-5" onClick={()=>start(mode)} disabled={!pool.length}>סבב נוסף</button>
      <button className="btn btn-ghost py-3 px-5" onClick={goRead}>חזרה לסיפורים</button>
    </div>
  </section>);

  const correct=q.key; const ci=wordInfo(correct); const mastered=((state.quiz[correct]&&state.quiz[correct].c)||0)>=3;
  const example=findExample(correct, stories); const pi=picked&&picked!==correct?wordInfo(picked):null;
  const mm=Math.floor(left/60), ss=pad(left%60);
  return (<div className="flex flex-col gap-4 pb-24 sm:pb-0">
    <h1 className="sr-only">חזרה מהירה: שאלה {stats.n+1}</h1>
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 py-2 text-sm" onClick={()=>setPhase('done')}><IconX size={16}/>סיום</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full" style={{width:(left/SESSION_SEC*100)+'%', background:left<20?'var(--coral)':'var(--primary)', transition:'width 1s linear'}}></div></div>
      <span className="num font-semibold" dir="ltr">{mm}:{ss}</span>
    </div>
    <section className={`card p-5 sm:p-8 flex flex-col gap-5 ${picked!==null&&picked!==correct?'shake':''}`} key={q.id}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted flex items-center gap-1.5">{q.type==='meaning'?<><IconBook size={16}/>מה הפירוש של המילה?</>:<><IconEar size={16}/>איזו מילה שמעת?</>}</span>
        {combo>=2&&<span key={combo} className="combo-badge font-bold rounded-full px-3 py-1 text-sm flex items-center gap-1" style={{background:'var(--sun)', color:'#3B2A00'}}><IconFlame size={15}/>קומבו ×{combo}</span>}
      </div>
      {q.type==='meaning'
        ? <div dir="ltr" className="flex items-center gap-3"><span className="book text-4xl sm:text-5xl font-semibold">{correct}</span><button className="btn btn-ghost w-11 h-11" onClick={()=>speakText(correct,.9,voice)} aria-label="השמעה"><IconSpeaker/></button></div>
        : <div className="flex items-center gap-3 flex-wrap">
            <button className="btn btn-primary w-20 h-20" style={{borderRadius:'50%'}} onClick={()=>speakText(correct,.85,voice)} aria-label="השמע שוב"><IconSpeaker size={34}/></button>
            <button className="btn btn-ghost h-12 px-4" onClick={()=>speakText(correct,.45,voice)}><IconSlow size={18}/>לאט</button>
          </div>}
      <div className="grid sm:grid-cols-2 gap-3" dir={q.type==='listen'?'ltr':'rtl'}>
        {q.options.map((o,i)=>{ const cls=picked===null?'':o.key===correct?'correct':o.key===picked?'wrong':'';
          return <button key={o.key} disabled={picked!==null} className={`opt flex items-center gap-3 ${cls} ${q.type==='listen'?'book text-xl text-left':'text-lg'}`} onClick={()=>answer(o)}>
            <span className="num text-xs font-bold w-6 h-6 rounded-md grid place-items-center bg-sunk text-muted shrink-0">{i+1}</span><span className="min-w-0">{q.type==='meaning'?<Bi>{o.label}</Bi>:o.label}</span></button>; })}
      </div>
      {picked!==null&&<div ref={el=>{ if(el&&window.innerWidth<640&&el.scrollIntoView) setTimeout(()=>el.scrollIntoView({block:'end', behavior:'smooth'}),60); }} className="rise rounded-xl p-4 pb-24 sm:pb-4 flex flex-col gap-3 scroll-mb-4" style={{background:picked===correct?'var(--good-soft)':'var(--bad-soft)'}}>
        <div className="text-xl font-bold" style={{color:picked===correct?'var(--good)':'var(--bad)'}}>{msg}{picked===correct&&<span className="text-base font-semibold"> ‎+3</span>}</div>
        {pi&&<div className="leading-relaxed">התשובה הנכונה: <b dir="ltr" lang="en" className="book">{correct}</b>{ci.he?<> · <Bi>{ci.he}</Bi></>:null} · נשמע כמו <b>{ci.pron}</b>.
          {q.type==='listen'&&<> בחרת <span dir="ltr" lang="en" className="book">{picked}</span> ({pi.pron}). הקשיבו לשתיהן והשוו את הצליל.</>}
          {q.type==='meaning'&&pi.he&&<div className="text-sm text-muted mt-1">ומה שבחרת, „<Bi>{pi.he}</Bi>”, באנגלית זה <span dir="ltr" lang="en" className="book">{picked}</span>.</div>}</div>}
        {example&&<div dir="ltr" lang="en" className="book text-left text-sm text-muted">“{example}”</div>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary py-3 px-6 dock-mobile" onClick={next} autoFocus>{timeUp?'לסיכום':'המשך'}</button>
          {pi&&q.type==='listen'&&<button className="btn btn-ghost py-3 px-4" style={{background:'var(--surface)'}} onClick={()=>{ speakText(correct,.7,voice); setTimeout(()=>speakText(picked,.7,voice),1300); }}><IconSpeaker size={18}/>השוואת צלילים</button>}
          {picked===correct&&mastered&&!graduated[correct]&&<button className="btn py-3 px-4" style={{background:'var(--surface)', color:'var(--good)'}} onClick={()=>{ actions.setWordStatus(correct,'known'); setGraduated(g=>({...g,[correct]:true})); }}><IconCheck size={18}/>אני כבר מכיר! הוצא מהתרגול</button>}
          {graduated[correct]&&<span className="self-center font-semibold" style={{color:'var(--good)'}}>הועברה למילים המוכרות</span>}
        </div>
      </div>}
    </section>
  </div>);
}

/* ---------- sounds (phonics) ---------- */
const PH_POOL = PHONICS.flatMap(c=>c.items.flatMap(it=>it.words.map(([w,he,pr])=>({w,he,pr,it}))));
function PatternLabel({p}){ return <bdi dir="ltr" lang="en" className="book">{p}</bdi>; }
function SoundSheet({item, voice, onClose, onWord}){
  const [closing, close]=useClosing(onClose);
  const mref=useModal(close);
  const playAll=()=>{ item.words.forEach(([w],i)=>setTimeout(()=>speakText(w,.8,voice), i*1300)); };
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label={`הצליל ${item.p}`} className={`sheet card w-full sm:max-w-lg rounded-b-none sm:rounded-[20px] p-5 flex flex-col gap-4 ${closing?'out':''}`} style={{maxHeight:'92vh', overflowY:'auto', paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <div className="flex-1 flex items-center gap-4 flex-wrap">
          <span dir="ltr" lang="en" className="book text-5xl font-bold">{item.p}</span>
          <span className="text-3xl text-muted" aria-hidden="true">=</span>
          <span className="text-4xl font-bold" style={{color:'var(--primary)'}}>{item.he}</span>
        </div>
        <button className="btn btn-ghost w-11 h-11 shrink-0" onClick={close} aria-label="סגירה"><IconX size={18}/></button>
      </div>
      <p className="text-lg leading-relaxed"><Bi>{item.tip}</Bi></p>
      {item.ex&&<p className="rounded-xl p-3 text-sm leading-relaxed" style={{background:'var(--sun-soft)'}}><b>יוצא מהכלל: </b><Bi>{item.ex.replace(/^יוצא(ים)? מהכלל:\s*/,'')}</Bi></p>}
      <div className="flex items-center gap-2"><h2 className="font-bold me-auto">מילים לדוגמה</h2><button className="btn btn-ghost px-3 text-sm" onClick={playAll}><IconPlay size={16}/>השמע את כולן</button></div>
      <ul className="flex flex-col gap-2">{item.words.map(([w,he,pr])=>(<li key={w} className="flex items-center gap-3 rounded-xl bg-sunk p-2.5">
        <button className="btn btn-primary w-11 h-11 shrink-0" style={{borderRadius:'50%'}} onClick={()=>speakText(w,.85,voice)} aria-label={`השמעת ${w}`}><IconSpeaker size={18}/></button>
        <button className="btn btn-line w-11 h-11 shrink-0 text-lg" style={{borderRadius:'50%'}} onClick={()=>speakText(w,.45,voice)} aria-label={`השמעה איטית של ${w}`}><IconSlow size={18}/></button>
        <button className="flex-1 min-w-0 text-start" onClick={()=>onWord(w,w)} title="פתיחה במילון">
          <div dir="ltr" lang="en" className="book text-xl font-semibold text-left">{w}</div>
          <div className="text-sm text-muted"><span className="font-semibold text-ink">{pr}</span> · {he}</div>
        </button>
      </li>))}</ul>
    </div>
  </div>);
}
function makeSoundQ(last){
  const pool=PH_POOL.filter(x=>x.w!==last);
  const c=pick(pool); const type=Math.random()<.5?'read':'listen';
  const others=shuffle(PH_POOL.filter(x=>x.it.key!==c.it.key && x.pr!==c.pr && x.w!==c.w));
  const ds=[]; for(const x of others){ if(type==='read'?!ds.some(d=>d.pr===x.pr):!ds.some(d=>d.w===x.w)) ds.push(x); if(ds.length===3) break; }
  return {c, type, opts:shuffle([c,...ds]), id:Math.random()};
}
const SOUND_QUIZ_LEN=10;
function Sounds({state, actions, voice, celebrate, onWord}){
  const [item,setItem]=useState(null); const [table,setTable]=useState(false);
  const [quiz,setQuiz]=useState(null); // {n, right, q, picked}
  const phon=state.phon||{};
  const learned=k=>((phon[k]||{}).c||0)>=2;
  const total=PHONICS.reduce((a,c)=>a+c.items.length,0); const done=PHONICS.reduce((a,c)=>a+c.items.filter(i=>learned(i.key)).length,0);
  useEffect(()=>{ if(quiz&&quiz.q&&quiz.q.type==='listen'&&quiz.picked==null) speakText(quiz.q.c.w,.8,voice); },[quiz&&quiz.q&&quiz.q.id]);
  const answer=o=>{ if(quiz.picked!=null) return; const ok=o.w===quiz.q.c.w; actions.recordSound(quiz.q.c.it.key, ok);
    if(ok&&quiz.right+1>=3&&(quiz.right+1)%3===0) celebrate(false);
    if(quiz.q.type==='read') speakText(quiz.q.c.w,.85,voice);
    setQuiz(z=>({...z, picked:o.w, right:z.right+(ok?1:0)})); };
  const next=()=>setQuiz(z=> z.n+1>=SOUND_QUIZ_LEN ? {...z, done:true} : {...z, n:z.n+1, q:makeSoundQ(z.q.c.w), picked:null});

  if(quiz&&!quiz.done){ const {q}=quiz; const ok=quiz.picked===q.c.w;
    return (<div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost px-3 text-sm" onClick={()=>setQuiz(null)}><IconX size={16}/>יציאה</button>
        <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:((quiz.n+(quiz.picked!=null?1:0))/SOUND_QUIZ_LEN*100)+'%', background:'var(--primary)'}}></div></div>
        <span className="num text-sm text-muted">{quiz.n+1}/{SOUND_QUIZ_LEN}</span>
      </div>
      <section className={`card p-5 sm:p-8 flex flex-col gap-5 ${quiz.picked!=null&&!ok?'shake':''}`} key={q.id}>
        <div className="text-sm font-semibold text-muted">{q.type==='read'?'איך קוראים את המילה הזו?':'איזו מילה שמעת?'}</div>
        {q.type==='read' ? <div dir="ltr" lang="en" className="book text-5xl font-bold text-left">{q.c.w}</div>
          : <div className="flex gap-3 items-center"><button className="btn btn-primary w-20 h-20" style={{borderRadius:'50%'}} onClick={()=>speakText(q.c.w,.8,voice)} aria-label="השמע שוב"><IconSpeaker size={34}/></button>
              <button className="btn btn-ghost h-12 px-4" onClick={()=>speakText(q.c.w,.45,voice)}><IconSlow size={18}/>לאט</button></div>}
        <div className="grid sm:grid-cols-2 gap-3" dir={q.type==='listen'?'ltr':'rtl'}>
          {q.opts.map((o,i)=>{ const cls=quiz.picked==null?'':o.w===q.c.w?'correct':o.w===quiz.picked?'wrong':'';
            return <button key={o.w} disabled={quiz.picked!=null} className={`opt flex items-center gap-3 ${cls} ${q.type==='listen'?'book text-xl text-left':'text-2xl font-semibold'}`} onClick={()=>answer(o)}>
              <span className="num text-xs font-bold w-6 h-6 rounded-md grid place-items-center bg-sunk text-muted shrink-0">{i+1}</span><span>{q.type==='read'?o.pr:o.w}</span></button>; })}
        </div>
        {quiz.picked!=null&&<div className="rise rounded-xl p-4 flex flex-col gap-2 pb-24 sm:pb-4" style={{background:ok?'var(--good-soft)':'var(--bad-soft)'}}>
          <div className="text-xl font-bold" style={{color:ok?'var(--good)':'var(--bad)'}}>{ok?pick(CHEERS)+' +2':'כמעט! ככה זה נשמע:'}</div>
          <div className="text-lg"><bdi dir="ltr" lang="en" className="book font-semibold">{q.c.w}</bdi> = <b>{q.c.pr}</b> · {q.c.he}</div>
          <div className="text-sm leading-relaxed">הצליל: <PatternLabel p={q.c.it.p}/> = <b>{q.c.it.he}</b>. <Bi>{q.c.it.tip}</Bi></div>
          <button className="btn btn-primary py-3 px-6 self-start dock-mobile" onClick={next} autoFocus>{quiz.n+1>=SOUND_QUIZ_LEN?'לסיכום':'המשך'}</button>
        </div>}
      </section>
    </div>); }

  return (<div className="flex flex-col gap-6">
    {quiz&&quiz.done&&<section className="card p-5 flex items-center gap-4 flex-wrap rise" role="status">
      <div className="text-2xl font-bold me-auto">{quiz.right>=8?'מצוין!':quiz.right>=5?'יפה מאוד!':'ממשיכים לתרגל'} <span className="num text-muted text-lg">{quiz.right}/{SOUND_QUIZ_LEN}</span></div>
      <button className="btn btn-primary px-5" onClick={()=>setQuiz({n:0,right:0,q:makeSoundQ(),picked:null})}>בוחן נוסף</button>
      <button className="btn btn-ghost px-4" onClick={()=>setQuiz(null)}>סגירה</button>
    </section>}
    <section className="card p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]"><h2 className="text-2xl sm:text-3xl font-bold">צלילים ואותיות</h2>
          <p className="text-muted mt-1 leading-relaxed">באנגלית אותן אותיות לא תמיד נשמעות אותו דבר. כאן לומדים את הצירופים החשובים, עם הצליל המקביל בעברית ומילים לדוגמה.</p></div>
        <div className="text-center"><div className="num text-3xl font-bold" style={{color:'var(--good)'}}>{done}<span className="text-muted text-lg">/{total}</span></div><div className="text-xs text-muted">צלילים שלמדת</div></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary px-5" onClick={()=>setQuiz({n:0,right:0,q:makeSoundQ(),picked:null})}><IconPlay size={18}/>בוחן צלילים (10 שאלות)</button>
        <button className="btn btn-ghost px-4" onClick={()=>setTable(t=>!t)} aria-expanded={table}>{table?'הסתרת':'הצגת'} הטבלה: איך כותבים צליל עברי באנגלית</button>
      </div>
      {table&&<div className="rise overflow-x-auto"><table className="w-full text-sm border-collapse">
        <thead><tr className="text-muted text-xs"><th className="text-start py-1.5 px-2">צליל בעברית</th><th className="text-start py-1.5 px-2">כותבים באנגלית</th></tr></thead>
        <tbody>{HE2EN.map(([h,e])=><tr key={h} className="border-t border-line"><td className="py-1.5 px-2 font-bold text-lg">{h}</td><td className="py-1.5 px-2"><Bi>{e}</Bi></td></tr>)}</tbody>
      </table><p className="text-xs text-muted mt-2">שימו לב: באנגלית אין צליל ח ואין ע. ch באנגלית נשמע כמעט תמיד צ׳ (chair), וח כותבים כ־ch או kh רק בשמות עבריים (Chanukah).</p></div>}
    </section>
    {PHONICS.map(cat=>(<section key={cat.id} className="flex flex-col gap-3">
      <div><h2 className="text-lg font-bold">{cat.title}</h2><p className="text-sm text-muted"><Bi>{cat.desc}</Bi></p></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{cat.items.map(it=>(<button key={it.key} onClick={()=>setItem(it)} className="card card-btn card-lift p-4 text-start flex flex-col gap-1.5 relative">
        {learned(it.key)&&<span className="absolute top-2 end-2 w-6 h-6 rounded-full grid place-items-center" style={{background:'var(--good)', color:'var(--surface)'}} title="נלמד"><IconCheck size={14}/></span>}
        <span dir="ltr" lang="en" className="book text-3xl font-bold text-left">{it.p}</span>
        <span className="text-xl font-bold" style={{color:'var(--primary)'}}>{it.he}</span>
        <span className="text-sm text-muted"><bdi dir="ltr" lang="en" className="book">{it.words[0][0]}</bdi> · {it.words[0][2]}</span>
      </button>))}</div>
    </section>))}
    {item&&<SoundSheet item={item} voice={voice} onClose={()=>setItem(null)} onWord={onWord}/>}
  </div>);
}

/* ---------- talk: spoken conversations ---------- */
const NUM_WORDS=/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/;
function talkFits(step, text){
  const t=' '+text.toLowerCase().replace(/[’`]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  if(!/[a-z0-9]/.test(t)) return false;
  if(step.free) return true;
  return step.ok.some(o=> o==='#' ? (/\d/.test(t)||NUM_WORDS.test(t)) : t.includes(' '+o+' ') || (o.length>3 && t.includes(' '+o)));
}
function takeName(text){
  const m=text.match(/(?:name is|name's|i am|i'm|im|call me|it's)\s+([A-Za-zא-ת][A-Za-zא-ת'-]*)/i);
  let n=m?m[1]:text.trim().split(/\s+/).filter(w=>!/^(hi|hello|hey|my|name|is|i|am|i'm)$/i.test(w)).pop()||'';
  n=n.replace(/[^A-Za-zא-ת'-]/g,''); return n?n[0].toUpperCase()+n.slice(1):'';
}
function TalkChat({talk, voice, actions, onBack, onNext, settings, defaultName}){
  const [msgs,setMsgs]=useState([]); const [si,setSi]=useState(0); const [text,setText]=useState(''); const [listening,setListening]=useState(false);
  const [hints,setHints]=useState(false); const [vars,setVars]=useState({name:defaultName||'friend'}); const [finished,setFinished]=useState(false); const [err,setErr]=useState('');
  const endRef=useRef(null), stopRef=useRef(null), timer=useRef(null);
  const fill=(s,v)=>s.replace(/\{name\}/g,(v||vars).name);
  const showHe=settings.talkHe!==false;
  const botSay=(i,v)=>{ const st=talk.steps[i]; const en=fill(st.bot,v), he=fill(st.he,v); setMsgs(m=>[...m,{from:'bot', en, he}]); speakText(en,.9,voice); setHints(false); };
  useEffect(()=>{ timer.current=setTimeout(()=>botSay(0),350); return ()=>{ clearTimeout(timer.current); stopRef.current&&stopRef.current(); }; },[]);
  useEffect(()=>{ endRef.current&&endRef.current.scrollIntoView&&endRef.current.scrollIntoView({block:'end', behavior:'smooth'}); },[msgs.length, hints, finished]);
  const step=talk.steps[si];
  const advance=(v)=>{ const nx=si+1;
    if(nx>=talk.steps.length){ setFinished(true); actions.finishTalk(talk.id); return; }
    setSi(nx); timer.current=setTimeout(()=>botSay(nx,v),700); };
  const submit=(raw, spoken)=>{
    const t=String(raw||'').trim(); if(!t||finished) return; setText(''); setErr('');
    if(isHebrew(t)&&!/[A-Za-z]/.test(t)){ setMsgs(m=>[...m,{from:'me', text:t, ok:false, spoken},{from:'sys', text:'נסו לענות באנגלית. הנה כמה דוגמאות:'}]); setHints(true); return; }
    const ok=talkFits(step,t);
    setMsgs(m=>[...m,{from:'me', text:t, ok, spoken}]);
    if(ok){ let v=vars; if(step.save==='name'){ const n=takeName(t); if(n){ v={...vars, name:n}; setVars(v); } } actions.addXP(2); advance(v); }
    else { setMsgs(m=>[...m,{from:'sys', text:'לא בטוח שהבנתי. נסו לענות על השאלה, למשל:'}]); setHints(true); }
  };
  const mic=()=>{ setErr('');
    if(listening){ stopRef.current&&stopRef.current(); return; }
    stopRef.current=listenOnce({lang:'en', onPartial:t=>setText(t), onText:t=>submit(t,true), onError:m=>setErr(m), onState:setListening}); };
  return (<div className="flex flex-col gap-3">
    <h1 className="sr-only">שיחה: {talk.he}</h1>
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn btn-ghost px-3 text-sm" onClick={()=>{ stopRef.current&&stopRef.current(); onBack(); }}><IconChevR size={18}/>כל השיחות</button>
      <span className="text-2xl" aria-hidden="true">{talk.cover}</span>
      <div className="leading-tight me-auto"><div dir="ltr" lang="en" className="book font-bold text-left">{talk.title}</div><div className="text-xs text-muted">{talk.he}</div></div>
      <Toggle id="tg-talkhe" checked={showHe} onChange={v=>actions.setSetting('talkHe',v)} label="תרגום"/>
    </div>
    <div className="h-1.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:((finished?talk.steps.length:si)/talk.steps.length*100)+'%', background:'var(--good)'}}></div></div>
    <section className="card p-3 sm:p-5 flex flex-col gap-3" style={{minHeight:'50vh'}} role="log" aria-live="polite" aria-label="השיחה">
      {msgs.map((m,i)=> m.from==='bot' ? (<div key={i} className="flex gap-2 items-start rise" dir="ltr">
          <div className="shrink-0 mt-1"><LogoMark size={34} radius={10}/></div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]" style={{background:'var(--sunk)'}}>
            <div className="book text-lg leading-relaxed text-left">{m.en}</div>
            {showHe&&<div dir="rtl" className="text-sm text-muted mt-1 text-right">{m.he}</div>}
          </div>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1" style={{background:'var(--sunk)', color:'var(--muted)'}} onClick={()=>speakText(m.en,.9,voice)} aria-label="השמע שוב"><IconSpeaker size={15}/></button>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1 text-sm" style={{background:'var(--sunk)'}} onClick={()=>speakText(m.en,.55,voice)} aria-label="השמעה איטית"><IconSlow size={18}/></button>
        </div>)
      : m.from==='me' ? (<div key={i} className="flex justify-end rise" dir="ltr">
          <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]" style={{background:m.ok?'var(--primary)':'var(--bad-soft)', color:m.ok?'var(--primary-ink)':'var(--ink)'}}>
            {m.spoken&&<div dir="rtl" className="text-xs opacity-80 mb-0.5 text-right flex items-center gap-1"><IconMic size={12}/>שמעתי:</div>}
            <div dir="auto" className="book text-lg leading-relaxed">{m.text}</div>
          </div>
        </div>)
      : (<div key={i} className="text-sm text-center text-muted rise"><Bi>{m.text}</Bi></div>))}
      {finished&&<div className="rounded-2xl p-5 text-center flex flex-col gap-3 items-center rise" style={{background:'var(--good-soft)'}} role="status">
        <div className="text-2xl font-bold" style={{color:'var(--good)'}}>כל הכבוד! סיימת את השיחה +10</div>
        <p className="text-sm">שיחה היא הדרך הכי טובה להתרגל לדבר. נסו שוב בלי להסתכל על הדוגמאות.</p>
        <div className="flex gap-2 flex-wrap justify-center"><button className="btn btn-primary px-5" onClick={onNext}>לשיחה הבאה</button><button className="btn btn-ghost px-4" style={{background:'var(--surface)'}} onClick={onBack}>כל השיחות</button></div>
      </div>}
      {!finished&&step&&(hints ? <div className="rounded-xl border border-line p-3 flex flex-col gap-2 rise">
          <div className="text-xs font-semibold text-muted">אפשר לענות למשל (לחיצה ממלאת את התשובה):</div>
          {step.say.map(([en,he])=>(<div key={en} className="flex items-center gap-2" dir="ltr">
            <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0" style={{background:'var(--sunk)'}} onClick={()=>speakText(fill(en),.85,voice)} aria-label={`השמע: ${fill(en)}`}><IconSpeaker size={15}/></button>
            <button className="flex-1 min-w-0 text-left rounded-xl px-3 py-2 hover:bg-sunk" onClick={()=>setText(fill(en))}><span className="book text-lg">{fill(en)}</span><span dir="rtl" className="block text-sm text-muted text-right">{he}</span></button>
          </div>))}
          <button className="btn btn-ghost px-3 text-sm self-start" onClick={()=>{ setMsgs(m=>[...m,{from:'sys', text:'דילגת. ממשיכים.'}]); advance(vars); }}>דלג על השאלה</button>
        </div>
        : <button className="text-sm text-primary font-semibold self-start hit" onClick={()=>setHints(true)}>לא יודע מה לענות? הצג דוגמאות</button>)}
      <div ref={endRef}></div>
    </section>
    {!finished&&<div className="talk-composer card p-2 flex items-center gap-2" dir="ltr">
      <button className={`btn w-14 h-14 shrink-0 ${listening?'pop':''}`} style={{borderRadius:'50%', background:listening?'var(--bad)':'var(--primary)', color:'var(--primary-ink)'}} onClick={mic} aria-label={listening?'עצירת ההקשבה':'דברו באנגלית'} aria-pressed={listening}><IconMic size={24}/></button>
      <form className="flex-1 min-w-0 flex items-center gap-2" onSubmit={e=>{ e.preventDefault(); submit(text,false); }}>
        <input id="talk-input" aria-label="התשובה שלך באנגלית" dir="ltr" className="field book text-lg flex-1 min-w-0" style={{minHeight:'48px'}} autoComplete="off" placeholder={listening?'מקשיב…':'דבר או הקלד את התשובה באנגלית'} value={text} onChange={e=>setText(e.target.value)}/>
        <button className="btn btn-primary h-12 px-4 shrink-0" disabled={!text.trim()}><span dir="rtl">שלח</span></button>
      </form>
    </div>}
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
  </div>);
}
function Talk({state, actions, voice, profileName, known}){
  const [id,setId]=useState(()=>{ const p=PENDING_TALK; PENDING_TALK=null; return p; }); const [run,setRun]=useState(0); const [ai,setAi]=useState(null);
  if(ai) return <AiChat key={ai.id} scenario={ai.scen} level={ai.lv} name={profileName} voice={voice} actions={actions} settings={state.settings} onBack={()=>setAi(null)}/>;
  const t=TALKS.find(x=>x.id===id); const done=state.talkDone||{};
  if(t) return <TalkChat key={t.id+':'+run} talk={t} voice={voice} actions={actions} settings={state.settings} defaultName={profileName}
    onBack={()=>setId(null)} onNext={()=>{ const i=TALKS.indexOf(t); setId(TALKS[(i+1)%TALKS.length].id); setRun(r=>r+1); window.scrollTo({top:0}); }}/>;
  return (<div className="flex flex-col gap-5">
    <section className="card p-5 sm:p-6 flex flex-col gap-3">
      <h2 className="text-2xl sm:text-3xl font-bold">מדברים אנגלית</h2>
      <p className="text-muted leading-relaxed">שיחות קצרות מהחיים. לומי אומרת משפט, ואתה עונה בקול (כפתור המיקרופון) או בהקלדה. אם התשובה לא מתאימה, תקבל דוגמאות לתשובות טובות.</p>
      <p className="text-sm text-muted">המיקרופון עובד בדפדפנים כרום ואדג'. בפעם הראשונה הדפדפן יבקש רשות.</p>
    </section>
    <h2 className="section-title">שיחות מוכנות</h2>
    <ul className="grid gap-3 sm:grid-cols-2">{TALKS.map(x=>(<li key={x.id} className="flex"><button type="button" onClick={()=>{ setId(x.id); window.scrollTo({top:0}); }} className="card card-btn card-lift p-4 flex items-center gap-4 text-start w-full">
      <span className="w-14 h-14 rounded-xl grid place-items-center text-3xl bg-sunk shrink-0" aria-hidden="true">{x.cover}</span>
      <span className="flex-1 min-w-0"><span className="font-bold text-lg block">{x.he}</span><span className="text-sm text-muted block"><bdi dir="ltr" lang="en" className="book">{x.title}</bdi> · <span className="num">{x.steps.length}</span> שאלות · שלב <span className="num">{x.level}</span></span></span>
      {done[x.id]?<span className="tag" style={{background:'var(--good-soft)', color:'var(--good)'}}><IconCheck size={12}/>בוצע</span>:<IconChevL size={18}/>}
    </button></li>))}</ul>
    <AiTalkCard known={known} onStart={(scen,lv)=>{ setAi({scen,lv,id:Math.random()}); window.scrollTo({top:0}); }}/>
  </div>);
}

/* ---------- courses: course -> topics -> lessons -> topic quiz -> certificate ---------- */
let PENDING_TALK=null;
const PASS_PCT=80;
const csOf=s=>({lessons:{},topics:{},certs:{},perfect:0,...(s.courses||{})});
function lessonWordsOf(l){
  if(l.words) return l.words;
  if(l.fromStories){ const seen=new Set(); const out=[];
    for(const id of l.fromStories){ const st=STORIES.find(x=>x.id===id); if(!st) continue; for(const k of storyData(st).keys) if(!seen.has(k)&&!NAMES.has(k)&&MEANING[k]&&k.length>=5&&!k.includes("'")&&!MEANING[k].includes('(')){ seen.add(k); out.push(k); } }
    return out.sort((a,b)=>b.length-a.length||(a<b?-1:1)).slice(0,l.count||10); }
  return [];
}
function lessonDone(l, s){ if(l.type==='story') return !!(s.storiesDone&&s.storiesDone[l.story]); if(l.type==='talk') return !!(s.talkDone&&s.talkDone[l.talk]); return !!csOf(s).lessons[l.id]; }
function topicQuizWords(t){ const set=new Set(); t.lessons.forEach(l=>lessonWordsOf(l).forEach(k=>set.add(k))); return [...set]; }
function topicProgress(t, s){ const done=t.lessons.filter(l=>lessonDone(l,s)).length; return {done, total:t.lessons.length, all:done===t.lessons.length, passed:!!csOf(s).topics[t.id]}; }
function courseProgress(c, s){ const lessons=c.topics.reduce((a,t)=>a+topicProgress(t,s).done,0); const passed=c.topics.filter(t=>csOf(s).topics[t.id]).length;
  return {lessons, total:c.lessonCount, passed, topics:c.topics.length, complete:passed===c.topics.length, pct:Math.round(100*(lessons+passed)/(c.lessonCount+c.topics.length))}; }
const topicUnlocked=()=>true;     // nothing in the courses is locked: every unit and lesson can be opened (the recommended order is only a gentle hint)
function courseAvg(c,s){ const v=c.topics.map(t=>(csOf(s).topics[t.id]||{}).pct||0); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0; }
function nextStep(c, s){ for(let i=0;i<c.topics.length;i++){ const t=c.topics[i]; if(csOf(s).topics[t.id]) continue; if(!topicUnlocked(c,i,s)) return null;
  const l=t.lessons.find(x=>!lessonDone(x,s)); return l?{topic:t, lesson:l}:{topic:t, quiz:true}; } return null; }

function QuizRunner({words, title, state, actions, voice, celebrate, onFinish, onExit, n=10}){
  const seq=useMemo(()=>{ let w=shuffle(words); while(w.length<n&&words.length) w=w.concat(shuffle(words)); w=w.slice(0,Math.min(n,Math.max(words.length,1)>=n?n:words.length)); return w.map((k,i)=>makeQuestion([k],{},null,i%2?'listen':'meaning')); },[]);
  const [i,setI]=useState(0); const [picked,setPicked]=useState(null); const [score,setScore]=useState(0);
  const q=seq[i];
  useEffect(()=>{ if(q&&q.type==='listen') speakText(q.key,.9,voice); },[i]);
  const answer=(o)=>{ if(picked!==null) return; const ok=o.key===q.key; setPicked(o.key); actions.recordAnswer(q.key,ok); if(ok){ setScore(s=>s+1); if(q.type==='meaning') speakText(q.key,.9,voice); } };
  const next=()=>{ if(i+1>=seq.length){ onFinish(Math.round(100*score/seq.length)); } else { setI(i+1); setPicked(null); } };
  const info=wordInfo(q.key);
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 text-sm" onClick={onExit}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(i/seq.length*100)+'%', background:'var(--primary)'}}></div></div>
      <span className="num text-sm text-muted">{i+1}/{seq.length}</span></div>
    <h1 className="eyebrow">{title}</h1>
    <section className="card p-6 flex flex-col items-center gap-3 text-center" key={i} data-qtype={q.type}>
      {q.type==='meaning'
        ? <><div className="text-sm text-muted">מה פירוש המילה?</div><div dir="ltr" lang="en" className="book text-4xl sm:text-5xl font-bold">{q.key}</div><button className="btn btn-ghost px-4" onClick={()=>speakText(q.key,.9,voice)}><IconSpeaker size={18}/>השמעה</button></>
        : <><div className="text-sm text-muted">איזו מילה שמעתם?</div><button className="btn btn-primary px-6 py-3" onClick={()=>speakText(q.key,.9,voice)}><IconSpeaker size={20}/>השמעה</button><div className="text-lg text-muted"><Bi>{info.he}</Bi></div></>}
    </section>
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="תשובות">
      {q.options.map(o=>{ const right=o.key===q.key; const st=picked===null?'':right?'ok':o.key===picked?'bad':'dim';
        return <button type="button" key={o.key} data-correct={right?'1':'0'} aria-disabled={picked!==null&&st==='dim'?true:undefined} onClick={()=>answer(o)} className="btn btn-ghost py-3 px-4 text-lg justify-center" style={st==='ok'?{background:'var(--good-soft)',borderColor:'var(--known)',borderWidth:2,borderStyle:'solid'}:st==='bad'?{background:'var(--bad-soft)',borderColor:'var(--bad)',borderWidth:2,borderStyle:'dashed'}:st==='dim'?{color:'var(--muted)'}:{}}>
          {st==='ok'&&<span aria-hidden="true">✓ </span>}{st==='bad'&&<span aria-hidden="true">✗ </span>}{q.type==='meaning'?<Bi>{o.label}</Bi>:<bdi dir="ltr" lang="en" className="book">{o.label}</bdi>}{st==='ok'&&<span className="sr-only"> (תשובה נכונה)</span>}{st==='bad'&&<span className="sr-only"> (תשובה שגויה)</span>}</button>; })}
    </div>
    {picked!==null&&<div className="flex flex-col items-center gap-2 rise" role="status">
      <div className="font-bold" style={{color:picked===q.key?'var(--known)':'var(--bad)'}}>{picked===q.key?pick(CHEERS):pick(COMFORT)}</div>
      <button className="btn btn-primary py-3 px-6 dock-mobile" onClick={next} autoFocus>{i+1>=seq.length?'לתוצאה':'הבא'}</button></div>}
  </div>);
}

function LessonWords({course, topic, lesson, state, actions, voice, celebrate, onBack}){
  const words=useMemo(()=>lessonWordsOf(lesson),[]);
  const [phase,setPhase]=useState(csOf(state).lessons[lesson.id]?'learn':'learn'); const [pct,setPct]=useState(null);
  const finish=(p)=>{ setPct(p); actions.completeLesson(lesson.id, words); setPhase('result'); if(p>=90) celebrate(false); };
  if(phase==='quiz') return <QuizRunner words={words} title={'חידון: '+lesson.title} state={state} actions={actions} voice={voice} celebrate={celebrate} onFinish={finish} onExit={()=>setPhase('learn')}/>;
  if(phase==='speak') return <SpeakGame pool={words} state={state} actions={actions} voice={voice} celebrate={celebrate} onDone={()=>setPhase('result')}/>;
  if(phase==='result') return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status">
    <div className="eyebrow">{topic.title}</div><h1 className="text-3xl font-extrabold">השיעור הושלם!</h1>
    <div className="num text-2xl font-extrabold">{pct}% <span className="text-base text-muted font-semibold">בחידון השיעור</span></div>
    <p className="text-muted">המילים נוספו לכרטיסי החזרה שלכם, ואפשר לחזור עליהן בלשונית "תרגול".</p>
    <div className="flex gap-2 flex-wrap"><button className="btn btn-primary px-6" onClick={onBack}>חזרה לקורס</button><button className="btn btn-ghost px-4" onClick={()=>setPhase('speak')}><IconMic size={18}/>תרגול הגייה בקול</button></div></section>);
  return (<div className="flex flex-col gap-4">
    <button className="btn btn-ghost px-3 text-sm self-start" onClick={onBack}><IconX size={16}/>חזרה לקורס</button>
    <section className="card p-5 flex flex-col gap-1"><div className="eyebrow">{topic.title}</div><h1 className="text-2xl font-extrabold">{lesson.title}</h1><p className="text-muted text-sm">הקשיבו לכל מילה ולחצו עליה כדי לשמוע שוב. אחר כך חידון קצר.</p></section>
    <ul className="grid gap-2 sm:grid-cols-2">{words.map(k=>{ const i=wordInfo(k); return (<li key={k}><button className="card card-btn card-lift p-3 w-full flex items-center gap-3 text-start" onClick={()=>speakText(k,.9,voice)} aria-label={`השמעת ${k}`}>
      <span className="flex-1 min-w-0"><bdi dir="ltr" lang="en" className="book font-bold text-xl block text-left">{k}</bdi><span className="text-sm block"><Bi>{i.he}</Bi></span><span className="text-xs text-muted block">{i.pron}</span></span><IconSpeaker size={18}/></button></li>); })}</ul>
    <button className="btn btn-primary py-3 px-6 self-center dock-mobile" onClick={()=>{ words.forEach(k=>speakText&&0); setPhase('quiz'); }}>מתחילים חידון</button>
  </div>);
}

function certificateCanvas({name, course, avg, date}){
  const W=1200,H=850; const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  x.fillStyle='#fffaf0'; x.fillRect(0,0,W,H);
  x.strokeStyle='#c8a24a'; x.lineWidth=14; x.strokeRect(30,30,W-60,H-60); x.lineWidth=3; x.strokeRect(54,54,W-108,H-108);
  x.textAlign='center'; x.direction='rtl'; x.fillStyle='#2b2a33';
  x.font='700 30px system-ui, Arial'; x.fillText('Lumi English',W/2,130);
  x.font='800 68px system-ui, Arial'; x.fillText('תעודת סיום',W/2,240);
  x.font='400 30px system-ui, Arial'; x.fillStyle='#6b6a75'; x.fillText('מוענקת בזאת ל',W/2,320);
  x.fillStyle='#b4531f'; x.font='800 76px system-ui, Arial'; x.fillText(name||'לומד/ת',W/2,420);
  x.fillStyle='#2b2a33'; x.font='400 32px system-ui, Arial'; x.fillText('על השלמת הקורס',W/2,495);
  x.font='800 54px system-ui, Arial'; x.fillText(course.title,W/2,570);
  x.font='600 30px system-ui, Arial'; x.fillStyle='#6b6a75'; x.fillText(`רמה ${course.level} · ${course.topics.length} נושאים · ${course.lessonCount} שיעורים`,W/2,630);
  x.fillStyle='#2b2a33'; x.font='700 36px system-ui, Arial'; x.fillText(`ציון ממוצע במבחני הנושאים: ${avg}%`,W/2,700);
  x.font='400 26px system-ui, Arial'; x.fillStyle='#6b6a75'; x.fillText(date,W/2,775);
  return c;
}
async function saveCertificate(canvas, filename, toast){
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
  if(DOWNLOADS){ try{ await DOWNLOADS.save({filename, data:blob}); toast('התעודה נשמרה'); return; }catch(e){ toast('השמירה בוטלה'); return; } }
  try{ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('התעודה ירדה למכשיר'); }catch(e){ toast('ההורדה נכשלה'); }
}
function CertificateView({course, state, profile, onBack, toast}){
  const cert=csOf(state).certs[course.id]; const ref=useRef(null);
  const data={name:profile.name, course, avg:cert?cert.avg:courseAvg(course,state), date:new Date(cert?cert.date+'T12:00:00':Date.now()).toLocaleDateString('he-IL',{year:'numeric',month:'long',day:'numeric'})};
  useEffect(()=>{ const c=certificateCanvas(data); c.style.width='100%'; c.style.height='auto'; c.style.borderRadius='12px'; c.setAttribute('role','img'); c.setAttribute('aria-label',`תעודת סיום של ${profile.name} בקורס ${course.title}`); c.id='cert-canvas'; ref.current.innerHTML=''; ref.current.appendChild(c); },[]);
  return (<div className="flex flex-col gap-4">
    <button className="btn btn-ghost px-3 text-sm self-start" onClick={onBack}><IconX size={16}/>חזרה לקורס</button>
    <section className="card p-3"><div ref={ref}></div></section>
    <button className="btn btn-primary py-3 px-6 self-center" onClick={()=>saveCertificate(document.getElementById('cert-canvas'),`lumi-certificate-${course.id}.png`,toast)}>הורדת התעודה (PNG)</button>
  </div>);
}

/* ---------- rich lessons: dialogue, rule in Hebrew, vocabulary, mixed exercises ---------- */
const normTxt=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/\b(i)'m\b/g,'$1 am').replace(/\b(you|we|they)'re\b/g,'$1 are').replace(/\b(he|she|it|what|where|who)'s\b/g,'$1 is').replace(/[^a-z0-9' ]/g,' ').replace(/\s+/g,' ').trim();
const sentOk=(target,heard)=>{ const t=normTxt(target).split(' '), h=new Set(normTxt(heard).split(' ')); return t.filter(w=>h.has(w)).length/t.length>=.7; };

function ExItem({e, voice, onDone, copySeen, onCopy}){
  const opts=useMemo(()=>e.o?shuffle(e.o):[],[]);
  const bank=useMemo(()=>e.t==='order'?shuffle(e.words.map((w,i)=>({w,i}))):[],[]);
  const hidden=useMemo(()=>e.t==='copy'&&((copySeen||{})[e.en]||0)>=2&&Math.random()<.6,[]); const [hint,setHint]=useState(false);
  const [picked,setPicked]=useState(null); const [chosen,setChosen]=useState([]); const [val,setVal]=useState('');
  const [res,setRes]=useState(null); const [listening,setListening]=useState(false); const [heard,setHeard]=useState(''); const [err,setErr]=useState(''); const [tip,setTip]=useState(''); const stopRef=useRef(null);
  useEffect(()=>{ if(e.t==='listen'||hidden) speakText(e.en,.9,voice); return ()=>{ stopRef.current&&stopRef.current(); }; },[]);
  const finish=(ok)=>{ setRes(ok?'ok':'bad'); if(ok&&(e.t==='fill'||e.t==='order'||e.t==='type'||e.t==='copy')&&e.en) speakText(e.en,.9,voice); };
  const answerOf=()=>e.t==='order'?e.en:(e.t==='type'||e.t==='copy')?e.ans[0]:e.o?e.o[0]:'';
  const pickOpt=(o)=>{ if(res) return; setPicked(o); finish(o===e.o[0]); };
  const checkOrder=()=>{ if(res) return; finish(normTxt(chosen.map(i=>e.words[i]).join(' '))===normTxt(e.en)); };
  const checkType=()=>{ if(res||!val.trim()) return; if(e.t==='copy'){ const v=val.trim(); setTip((/^[A-Z]/.test(e.en)&&!/^[A-Z]/.test(v))?'שימו לב: התחלת משפט באות גדולה.':(/[.!?]$/.test(e.en)&&!/[.!?]$/.test(v))?'שימו לב: חסר סימן סיום (נקודה, סימן שאלה או קריאה).':''); } const ok=e.ans.some(a=>normTxt(a)===normTxt(val)); if(ok&&e.t==='copy'&&onCopy) onCopy(e.en); finish(ok); };
  const mic=()=>{ setErr(''); if(listening){ stopRef.current&&stopRef.current(); return; } setHeard('');
    stopRef.current=listenOnce({lang:'en', onPartial:t=>setHeard(t), onText:t=>{ setHeard(t); setRes(sentOk(e.en,t)?'ok':'bad'); }, onError:m=>setErr(m), onState:setListening}); };
  const fb=res&&(<div className="flex flex-col items-center gap-2 rise" role="status">
    {e.t==='speak'?<div className="font-bold" style={{color:res==='ok'?'var(--known)':'var(--bad)'}}>{res==='ok'?pick(CHEERS):'כמעט! הקשיבו לדוגמה ונסו שוב'}</div>
    :<div className="font-bold" style={{color:res==='ok'?'var(--known)':'var(--bad)'}}>{res==='ok'?pick(CHEERS):<>התשובה הנכונה: <bdi dir="ltr" lang="en" className="book">{e.t==='fill'?e.o[0]:answerOf()}</bdi></>}</div>}
    {tip&&res==='ok'&&<div className="text-sm text-center font-semibold" style={{color:'var(--bad)'}}><Bi>{tip}</Bi></div>}
    {e.x&&<div className="rounded-xl bg-sunk p-3 text-sm leading-relaxed text-start w-full"><b>למה? </b><Bi>{e.x}</Bi></div>}
    <button data-next className="btn btn-primary py-3 px-6 dock-mobile" autoFocus onClick={()=>onDone(res==='ok')}>הבא</button></div>);
  if(e.t==='speak') return (<div className="flex flex-col gap-4 items-center">
    <section className="card p-6 w-full flex flex-col items-center gap-3 text-center"><div className="text-sm text-muted">אמרו בקול</div><div dir="ltr" lang="en" className="book text-2xl sm:text-3xl font-bold">{e.en}</div>
      <button className="btn btn-ghost px-4" onClick={()=>speakText(e.en,.85,voice)}><IconSpeaker size={18}/>השמעה</button>{heard&&<div className="text-sm text-muted">שמעתי: <bdi dir="ltr" lang="en" className="book text-ink">{heard}</bdi></div>}</section>
    {err&&<div className="rounded-xl p-3 text-sm w-full" role="alert" style={{background:'var(--bad-soft)',color:'var(--bad)'}}><Bi>{err}</Bi></div>}
    {res?fb:<div className="flex flex-col items-center gap-2"><button className={`btn w-20 h-20 ${listening?'pop':''}`} style={{borderRadius:'50%',background:listening?'var(--bad)':'var(--primary)',color:'var(--primary-ink)'}} onClick={mic} aria-label="הקלטה"><IconMic size={34}/></button>
      <span className="text-sm text-muted">{listening?'מקשיב…':'לחצו ואמרו את המשפט'}</span><button data-skip className="hit text-sm text-muted underline" onClick={()=>onDone(true)}>דלג</button></div>}
  </div>);
  return (<div className="flex flex-col gap-4">
    <section className="card p-6 flex flex-col items-center gap-3 text-center">
      {e.t==='choose'&&<div className="text-lg font-bold"><Bi>{e.q}</Bi></div>}
      {e.t==='fill'&&<><div className="text-sm text-muted">השלימו את המשפט</div><div dir="ltr" lang="en" className="book text-2xl sm:text-3xl font-bold">{res?e.en.replace('___',e.o[0]):e.en}</div><div className="text-muted"><Bi>{e.he}</Bi></div></>}
      {e.t==='listen'&&<><div className="text-sm text-muted">מה שמעתם?</div><button className="btn btn-primary px-6 py-3" onClick={()=>speakText(e.en,.9,voice)}><IconSpeaker size={20}/>השמעה</button></>}
      {e.t==='order'&&<><div className="text-sm text-muted">סדרו את המשפט באנגלית</div><div className="text-xl font-bold"><Bi>{e.he}</Bi></div></>}
      {e.t==='copy'&&hidden&&!hint&&!res&&<><div className="text-sm text-muted">כתבו מהזיכרון, בלי להסתכל. זה המשפט שהעתקתם:</div><div className="text-xl font-bold"><Bi>{e.he}</Bi></div><div className="flex gap-2"><button className="btn btn-ghost px-4" onClick={()=>speakText(e.en,.9,voice)}><IconSpeaker size={18}/>השמעה</button><button data-hint className="btn btn-ghost px-4" onClick={()=>setHint(true)}>רמז: הצגת המשפט</button></div></>}
      {e.t==='copy'&&(!hidden||hint||res)&&<><div className="text-sm text-muted">{hidden?'הנה המשפט:':'העתיקו את המשפט (הקלידו אותו בדיוק)'}</div><div dir="ltr" lang="en" className="book text-2xl sm:text-3xl font-bold">{e.en}</div><div className="text-muted"><Bi>{e.he}</Bi></div><button className="btn btn-ghost px-4" onClick={()=>speakText(e.en,.9,voice)}><IconSpeaker size={18}/>השמעה</button></>}
      {e.t==='type'&&<><div className="text-sm text-muted">כתבו באנגלית</div><div className="text-xl font-bold"><Bi>{e.he}</Bi></div></>}
    </section>
    {(e.t==='choose'||e.t==='fill'||e.t==='listen')&&<div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="תשובות">{opts.map(o=>{ const right=o===e.o[0]; const st=!res?'':right?'ok':o===picked?'bad':'dim';
      return <button key={o} data-correct={right?'1':'0'} disabled={!!res&&st==='dim'} onClick={()=>pickOpt(o)} className="btn btn-ghost py-3 px-4 text-lg justify-center" style={st==='ok'?{background:'var(--good-soft)',borderColor:'var(--known)'}:st==='bad'?{background:'var(--bad-soft)',borderColor:'var(--bad)'}:st==='dim'?{opacity:.5}:{}}>{/[א-ת]/.test(o)?<Bi>{o}</Bi>:<bdi dir="ltr" lang="en" className="book">{o}</bdi>}</button>; })}</div>}
    {e.t==='order'&&<>
      <div dir="ltr" className="card p-3 min-h-[3.5rem] flex flex-wrap gap-2 items-center" data-answer aria-label="המשפט שלכם">{chosen.map(i=><button key={i} disabled={!!res} onClick={()=>setChosen(c=>c.filter(x=>x!==i))} className="btn btn-ghost px-3 book text-lg">{e.words[i]}</button>)}{!chosen.length&&<span className="text-muted text-sm">לחצו על המילים לפי הסדר</span>}</div>
      <div dir="ltr" className="flex flex-wrap gap-2 justify-center">{bank.map(b=>chosen.includes(b.i)?<span key={b.i} className="px-3 py-2 rounded-xl bg-sunk opacity-40 book text-lg">{b.w}</span>:<button key={b.i} data-w={b.w} disabled={!!res} onClick={()=>setChosen(c=>[...c,b.i])} className="btn btn-ghost px-3 book text-lg">{b.w}</button>)}</div>
      {!res&&<button className="btn btn-primary py-3 px-6 self-center" disabled={!chosen.length} onClick={checkOrder}>בדיקה</button>}</>}
    {(e.t==='type'||e.t==='copy')&&<>
      <input dir="ltr" className="field book text-xl text-center" value={val} onChange={ev=>setVal(ev.target.value)} onKeyDown={ev=>{ if(ev.key==='Enter') checkType(); }} disabled={!!res} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="התשובה באנגלית" />
      {!res&&<button className="btn btn-primary py-3 px-6 self-center" disabled={!val.trim()} onClick={checkType}>בדיקה</button>}</>}
    {fb}
  </div>);
}

function ExerciseRunner({items, title, onFinish, onExit, voice, copySeen, onCopy}){
  const scored=useMemo(()=>items.filter(e=>e.t!=='speak').length,[]);
  const [queue,setQueue]=useState(()=>items.map(e=>({e,first:true}))); const [i,setI]=useState(0); const [good,setGood]=useState(0);
  const cur=queue[i];
  const done=(ok)=>{ let g=good; if(cur.first&&cur.e.t!=='speak'){ if(ok) g=good+1; else setQueue(q=>[...q,{e:cur.e,first:false}]); }
    setGood(g); if(i+1>=queue.length+(cur.first&&!ok&&cur.e.t!=='speak'?1:0)){ onFinish(scored?Math.round(100*g/scored):100); } else setI(i+1); };
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3"><button className="btn btn-ghost px-3 text-sm" onClick={onExit}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(i/queue.length*100)+'%',background:'var(--primary)'}}></div></div><span className="num text-sm text-muted">{Math.min(i+1,queue.length)}/{queue.length}</span></div>
    <div className="eyebrow">{title}{!cur.first&&' · חזרה על טעות'}</div>
    <ExItem key={i} e={cur.e} voice={voice} onDone={done} copySeen={copySeen} onCopy={onCopy}/>
  </div>);
}

function LessonRich({topic, lesson, state, actions, voice, celebrate, onBack}){
  const [step,setStep]=useState('dialogue'); const [pct,setPct]=useState(null); const [he,setHe]=useState(true);
  const items=useMemo(()=>{ const idx=topic.lessons.findIndex(l=>l.id===lesson.id); const prev=shuffle(topic.lessons.slice(0,Math.max(idx,0)).flatMap(l=>(l.ex||[]).filter(e=>e.t==='copy'))).slice(0,2); const arr=lesson.ex.slice();
    prev.forEach(e=>{ const at=Math.floor(arr.length/2)+Math.floor(Math.random()*(arr.length/2)); arr.splice(at,0,e); }); return arr; },[]);
  const STEPS=['dialogue','rule','vocab','ex']; const si=STEPS.indexOf(step);
  const finish=(p)=>{ setPct(p); actions.completeLesson(lesson.id, lesson.vocab.map(v=>v[0]).filter(w=>/^[a-z]+$/.test(w)&&MEANING[w])); if(p>=90) celebrate(false); setStep('result'); };
  if(step==='ex') return <ExerciseRunner items={items} title={'תרגול: '+lesson.title} voice={voice} copySeen={state.copySeen} onCopy={actions.noteCopy} onExit={()=>setStep('vocab')} onFinish={finish}/>;
  if(step==='result') return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status"><div className="eyebrow">{topic.title}</div><h1 className="text-3xl font-extrabold">השיעור הושלם!</h1>
    <div className="num text-2xl font-extrabold">{pct}% <span className="text-base text-muted font-semibold">הצלחה בניסיון הראשון</span></div>
    <p className="text-muted">המילים נוספו לכרטיסי החזרה ויחזרו בלשונית "תרגול" בזמן הנכון.</p><button className="btn btn-primary px-6" onClick={onBack}>חזרה ליחידה</button></section>);
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3"><button className="btn btn-ghost px-3 text-sm" onClick={onBack}><IconX size={16}/>יציאה</button>
      <div className="flex-1 flex gap-1.5" dir="ltr">{STEPS.map((s,k)=><span key={s} className="flex-1 h-2.5 rounded-full" style={{background:k<=si?'var(--primary)':'var(--sunk)'}}></span>)}</div></div>
    <section className="card p-5 flex flex-col gap-1"><div className="eyebrow">{topic.title}</div><h1 className="text-2xl font-extrabold">{lesson.title}</h1></section>
    {step==='dialogue'&&<><section className="card p-4 flex flex-col gap-3" aria-label="דיאלוג">
      <div className="flex items-center gap-2"><h2 className="font-extrabold me-auto">① דיאלוג: הקשב וקרא</h2><button className="btn btn-ghost px-3 text-sm" onClick={()=>speakText(lesson.dialogue.map(d=>d[1]).join(' '),.9,voice)}><IconSpeaker size={16}/>הכול</button><button className="btn btn-ghost px-3 text-sm" aria-pressed={he} onClick={()=>setHe(x=>!x)}>עברית {he?'✓':''}</button></div>
      {lesson.dialogue.map((d,k)=><button key={k} onClick={()=>speakText(d[1],.9,voice)} className="rounded-xl border border-line p-3 text-start hover:border-primary flex gap-3 items-start"><span className="tag shrink-0 mt-1">{d[0]}</span><span className="flex-1 min-w-0"><bdi dir="ltr" lang="en" className="book text-lg font-semibold block text-left">{d[1]}</bdi>{he&&<span className="text-sm text-muted block"><Bi>{d[2]}</Bi></span>}</span><IconSpeaker size={16}/></button>)}
    </section><button className="btn btn-primary py-3 px-6 self-center dock-mobile" onClick={()=>setStep('rule')}>הבנתי, לכלל</button></>}
    {step==='rule'&&<><section className="card p-5 flex flex-col gap-3" aria-label="הכלל"><h2 className="font-extrabold">② {lesson.rule.title}</h2><p className="leading-relaxed"><Bi>{lesson.rule.he}</Bi></p>
      <ul className="flex flex-col gap-2">{lesson.rule.ex.map((x,k)=><li key={k}><button onClick={()=>speakText(x[0],.9,voice)} className="w-full rounded-xl bg-sunk p-3 text-start flex gap-3 items-center"><span className="flex-1"><bdi dir="ltr" lang="en" className="book font-bold text-lg block text-left">{x[0]}</bdi><span className="text-sm text-muted"><Bi>{x[1]}</Bi></span></span><IconSpeaker size={16}/></button></li>)}</ul>
      <div className="rounded-xl p-3 text-sm leading-relaxed" style={{background:'var(--learn-bg)'}}><b>שים לב: </b><Bi>{lesson.rule.pit}</Bi></div></section>
      <button className="btn btn-primary py-3 px-6 self-center dock-mobile" onClick={()=>setStep('vocab')}>למילים</button></>}
    {step==='vocab'&&<><h2 className="font-extrabold">③ מילים וביטויים חדשים</h2><ul className="grid gap-2 sm:grid-cols-2">{lesson.vocab.map(v=><li key={v[0]}><button className="card card-btn card-lift p-3 w-full flex items-center gap-3 text-start" onClick={()=>speakText(v[0],.9,voice)} aria-label={'השמעת '+v[0]}><span className="flex-1 min-w-0"><bdi dir="ltr" lang="en" className="book font-bold text-xl block text-left">{v[0]}</bdi><span className="text-sm block"><Bi>{v[1]}</Bi></span><span className="text-xs text-muted block">{v[2]}</span></span><IconSpeaker size={18}/></button></li>)}</ul>
      <button className="btn btn-primary py-3 px-6 self-center dock-mobile" onClick={()=>setStep('ex')}>מתחילים לתרגל</button></>}
  </div>);
}

/* video files live on R2 (not in the Pages build). Base address: window.__VIDEO_BASE_URL__ (injected by scripts/build.mjs from env VITE_VIDEO_BASE_URL), default https://lumienglish.co.il.
   videoUrl('videos/a1-01.mp4') -> <base>/videos/a1-01.mp4 (a leading "videos/" or "/" is normalised; full http(s) addresses and "assets/..." files, which ship with the site, are kept as they are) */
const VIDEO_BASE_URL=String((typeof window!=='undefined' && window.__VIDEO_BASE_URL__) || 'https://lumienglish.co.il').replace(/\/+$/,'');
const videoUrl=(p)=>{ p=String(p||''); if(!p) return ''; if(/^(https?:)?\/\//i.test(p)||/^assets\//.test(p)) return p; return VIDEO_BASE_URL+'/videos/'+p.replace(/^\/+/,'').replace(/^videos\//,''); };
/* a small word button (word + Hebrew meaning + speaker): used by the topic cards and the "before the video" block */
function WordChip({en, he, onSay}){
  return (<button type="button" className="tp-chip" onClick={onSay} aria-label={'השמע את המילה '+en+(he?' '+he:'')}><span className="tp-chip-row"><bdi dir="ltr" lang="en" className="book tp-chip-w">{en}</bdi><IconSpeaker size={14} className="tp-chip-ic"/></span>{' '}<span className="tp-chip-he"><Bi>{he}</Bi></span></button>);
}
/* unit 0: all 26 letters. [capital, small, name (Hebrew sound-alike), name spoken in English, the sound in Hebrew, example word, meaning] */
const LETTERS=[
 ['A','a','אֵי','ay','אַ קצרה','apple','תפוח'],['B','b','בִּי','bee','ב','ball','כדור'],['C','c','סִי','see','ק (לפני e ו־i: ס)','cat','חתול'],['D','d','דִּי','dee','ד','dog','כלב'],
 ['E','e','אִי','ee','אֶ','egg','ביצה'],['F','f','אֶף','eff','פ','fish','דג'],['G','g','ג׳י','jee','ג','go','ללכת'],['H','h','אֵייץ׳','aych','ה','hat','כובע'],
 ['I','i','אַי','eye','אִ קצרה','ink','דיו'],['J','j','ג׳יי','jay','ג׳','jump','לקפוץ'],['K','k','קֵי','kay','ק','key','מפתח'],['L','l','אֶל','ell','ל','lamp','מנורה'],
 ['M','m','אֶם','em','מ','milk','חלב'],['N','n','אֶן','en','נ','nut','אגוז'],['O','o','אוֹ','oh','אוֹ קצרה','hot','חם'],['P','p','פִּי','pee','פ','pen','עט'],
 ['Q','q','קְיוּ','queue','קוו (תמיד עם u)','queen','מלכה'],['R','r','אָר','are','ר (רכה, בלי גרון)','red','אדום'],['S','s','אֶס','ess','ס','sun','שמש'],['T','t','טִי','tee','ט','tea','תה'],
 ['U','u','יוּ','you','אַ קצרה','bus','אוטובוס'],['V','v','וִי','vee','ו (כמו ב רפה)','van','טנדר'],['W','w','דַבְּלְיוּ','double you','וו','water','מים'],['X','x','אֶקְס','ex','קס','box','קופסה'],
 ['Y','y','וַואי','why','י','yes','כן'],['Z','z','זִי','zee','ז','zoo','גן חיות']];
const LETTER_VOWELS=new Set(['A','E','I','O','U']);
function LettersGuide({voice, rate, go}){
  const say=t=>speakText(t, rate||1, voice);
  const pairs=(typeof PHONICS!=='undefined'&&PHONICS[0]&&PHONICS[0].items.filter(it=>['sh','ch','th','wh','ph','ck'].includes(it.p)))||[];
  return (<section className="card ul-box" aria-labelledby="lt-h" data-letters="1">
    <h2 id="lt-h" className="section-title">האותיות</h2>
    <p className="ul-promise">באנגלית יש 26 אותיות. לכל אות יש שם, וגם צליל שהיא עושה בתוך מילה. כדי לקרוא, מחברים צלילים. לחץ על האות כדי לשמוע את שמה, ועל המילה כדי לשמוע אותה.</p>
    <ul className="lt-grid">{LETTERS.map(([cap,sm,nameHe,nameEn,sound,word,he])=>(<li key={cap} className={'lt-card'+(LETTER_VOWELS.has(cap)?' is-vowel':'')}>
      <button type="button" className="lt-letter" onClick={()=>say(nameEn)} aria-label={cap+sm+': השמע את שם האות, נשמע '+nameHe}><bdi dir="ltr" lang="en" className="book">{cap}{sm}</bdi><IconSpeaker size={14}/></button>
      <div className="lt-info"><span className="lt-name">שם: {nameHe}</span><span className="lt-sound">צליל: {sound}</span></div>
      <WordChip en={word} he={he} onSay={()=>say(word)}/></li>))}</ul>
    <p className="ul-sub">התנועות הן a, e, i, o, u (מסומנות ברקע שונה). כל שאר האותיות הן עיצורים.</p>
    {pairs.length>0&&<><h3 className="ul-h3">שתי אותיות, צליל אחד</h3>
      <ul className="lt-pairs">{pairs.map(it=>(<li key={it.p+(it.key||'')} className="lt-pair"><span className="lt-pair-top"><bdi dir="ltr" lang="en" className="book lt-pair-p">{it.p}</bdi><span className="lt-pair-he">{it.he}</span></span><WordChip en={it.words[0][0]} he={it.words[0][1]} onSay={()=>say(it.words[0][0])}/></li>))}</ul></>}
    {go&&<div><button type="button" className="btn btn-line" onClick={()=>go('sounds')}>לכל הצלילים והצירופים</button></div>}
  </section>);
}
/* a video lesson: a calm "lecture" page (poster, what you will learn, speed control, what comes next); "I watched it" marks the lesson done */
function LessonVideo({topic, lesson, state, actions, celebrate, onBack, eyebrow, backLabel, voice, go}){
  const done=lessonDone(lesson,state); const [err,setErr]=useState(false); const [rate,setRate]=useState(1); const [play,setPlay]=useState(false); const ref=useRef(null);
  const idx=topic.lessons.findIndex(l=>l.id===lesson.id); const next=topic.lessons.slice(idx+1);
  useEffect(()=>{ if(ref.current) ref.current.playbackRate=rate; },[rate,play]);
  useEffect(()=>{ if(!done&&actions.noteOpen) actions.noteOpen(lesson.id); },[]);   // "continue where you stopped" on the home page
  const start=()=>{ setPlay(true); setTimeout(()=>{ try{ if(ref.current){ ref.current.playbackRate=rate; ref.current.play(); } }catch(e){} },50); };
  // ---- unit content (UNIT_CONTENT): the learning loop around the video ----
  const unitN=(()=>{ const m=/^series-(\d+)$/.exec(lesson.id); if(m) return +m[1]; return lesson.id==='a1u-u1-v'?1:null; })();
  const UC=unitN!==null&&typeof UNIT_CONTENT!=='undefined'?UNIT_CONTENT[unitN]:null;
  const [run,setRun]=useState(null); const [res,setRes]=useState(null); const lessonsDone=csOf(state).lessons;
  const practiceDone=!!lessonsDone[lesson.id+'-practice'], quizDone=!!lessonsDone[lesson.id+'-quiz']; const added=!!((csOf(state).unitWords||{})[unitN]);
  if(run&&UC) return <ExerciseRunner key={run} items={run==='ex'?UC.ex:UC.quiz} title={(run==='ex'?'תרגול: ':'חידון: ')+UC.title} voice={voice} copySeen={state.copySeen} onCopy={actions.noteCopy} onExit={()=>setRun(null)}
    onFinish={pct=>{ if(run==='ex'){ actions.completeLesson(lesson.id+'-practice',[]); actions.addUnitWords(unitN); } else if(pct>=PASS_PCT) actions.completeLesson(lesson.id+'-quiz',[]); setRes({kind:run, pct}); setRun(null); window.scrollTo({top:0}); }}/>;
  return (<div className="flex flex-col gap-5 pb-28 sm:pb-0">
    <div className="flex items-center gap-3"><button className="btn btn-ghost px-3 text-sm" onClick={onBack}><IconX size={16}/>{backLabel||'חזרה ליחידה'}</button><span className="text-sm text-muted me-auto">{topic.title}</span></div>
    {UC&&<section className="card ul-box" aria-labelledby="ul-before">
      <h2 id="ul-before" className="section-title">לפני הסרטון</h2>
      <p className="ul-promise">{UC.promise}</p>
      <ul className="ul-bullets">{UC.before.learn.map((x,i)=><li key={i}><Bi>{x}</Bi></li>)}</ul>
      <p className="ul-sub">חמש מילים להכיר</p>
      <ul className="ul-meet">{UC.before.meet.map(([en,he])=><li key={en}><WordChip en={en} he={he} onSay={()=>speakText(en, state.settings.rate||1, voice)}/></li>)}</ul>
    </section>}
    <section className="card" style={{padding:0, overflow:'hidden'}}>
      <div style={{position:'relative', background:'#0F2742', aspectRatio:'16 / 9'}}>
        {err?<p className="p-8 text-center" style={{color:'#CFE0FF'}}>הסרטון לא נטען. בדקו את החיבור לאינטרנט ונסו שוב.</p>
          :<video ref={ref} src={videoUrl(lesson.src)} poster={videoUrl(lesson.poster)||undefined} controls playsInline preload="metadata" onError={()=>setErr(true)} onEnded={()=>{}} style={{width:'100%', height:'100%', display:'block', background:'#0F2742'}} aria-label={lesson.title} title={lesson.title} aria-describedby="video-transcript-note"></video>}
        {!play&&!err&&<button type="button" onClick={start} aria-label={'הפעלת הסרטון: '+lesson.title} style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:14, padding:'0 20px 7%', background:'linear-gradient(to top, rgba(15,39,66,.92) 0%, rgba(15,39,66,.45) 45%, rgba(15,39,66,0) 75%)', border:0, cursor:'pointer', color:'#fff'}}>
          <span style={{width:68, height:68, borderRadius:'50%', background:'#fff', display:'grid', placeItems:'center', boxShadow:'0 10px 30px rgba(0,0,0,.35)'}}><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#0F2742"/></svg></span>
          <span style={{fontWeight:800, fontSize:'clamp(18px,3.4vw,28px)'}}>{lesson.title}</span>
          <span style={{fontSize:'clamp(12px,2vw,15px)', opacity:.85}} className="num">{lesson.mins} דקות · שיעור וידאו</span></button>}
      </div>
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div><div className="eyebrow">{eyebrow||<>שיעור {idx+1} מתוך {topic.lessons.length} · {topic.title}</>}</div><h1 className="text-2xl font-extrabold mt-1">{lesson.title}</h1>{lesson.blurb&&<p className="text-muted leading-relaxed mt-1">{lesson.blurb}</p>}<p id="video-transcript-note" className="transcript-note mt-2">כתוביות ותמלול: תמלול זמין בקרוב.</p></div>
        {lesson.learn&&<div><h2 className="font-extrabold mb-2">מה תלמדו בסרטון</h2><ul className="flex flex-col gap-2">{lesson.learn.map((x,k)=><li key={k} className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{background:'var(--primary)', color:'#fff'}} aria-hidden="true"><IconCheck size={14}/></span><span className="leading-relaxed">{x[0]}{x[1]&&<>{': '}<bdi dir="ltr" lang="en" className="book font-bold">{x[1]}</bdi></>}</span></li>)}</ul></div>}
        <div className="flex items-center gap-2 flex-wrap"><span className="text-sm text-muted">מהירות:</span>
          {[0.75,1,1.25].map(r=><button key={r} className="btn btn-ghost px-3 text-sm num" aria-pressed={rate===r} style={rate===r?{borderColor:'var(--primary)', color:'var(--primary)', fontWeight:800}:undefined} onClick={()=>setRate(r)}>{r}x</button>)}
          <span className="text-xs text-muted me-auto"></span></div>
      </div>
    </section>

    {unitN===0&&<LettersGuide voice={voice} rate={state.settings.rate} go={go}/>}

    {UC&&<section className="card ul-box" aria-labelledby="ul-after">
      <h2 id="ul-after" className="section-title">אחרי השיעור</h2>
      {res&&<div className="ul-res" role="status"><b>{res.kind==='ex'?'התרגול הושלם':(res.pct>=PASS_PCT?'עברת את החידון':'כמעט, צריך '+PASS_PCT+'% בחידון')}</b><span className="num">{res.pct}%</span>{res.kind==='ex'?<span>המילים נוספו לכרטיסי החזרה.</span>:res.pct<PASS_PCT&&<span>אפשר לחזור על המילים ולנסות שוב.</span>}</div>}
      <div className="ul-actions">
        <button type="button" className="btn btn-primary" onClick={()=>{ setRes(null); setRun('ex'); window.scrollTo({top:0}); }}>תרגול ({UC.ex.length} תרגילים){practiceDone&&<IconCheck size={16}/>}</button>
        <button type="button" className="btn btn-line" onClick={()=>{ setRes(null); setRun('quiz'); window.scrollTo({top:0}); }}>חידון קצר ({UC.quiz.length} שאלות){quizDone&&<IconCheck size={16}/>}</button>
      </div>
      <h3 className="ul-h3">המילים של היחידה</h3>
      <ul className="ul-words">{UC.words.map(w=><li key={w.en} className="ul-word"><div className="ul-word-top"><bdi dir="ltr" lang="en" className="book ul-word-en">{w.en}</bdi><span className="ul-word-he"><Bi>{w.he}</Bi></span>{w.tr&&<span className="ul-word-tr">{w.tr}</span>}</div>
        <ul className="ex-list"><ExampleLine x={{en:w.ex, he:w.exHe}} wordKey={w.en.toLowerCase()} voice={voice} rate={state.settings.rate} showTr={false}/></ul></li>)}</ul>
      <div><button type="button" className="btn btn-line" disabled={added} onClick={()=>{ actions.addUnitWords(unitN); }}>{added?'המילים נוספו לכרטיסי החזרה':'הוספה לכרטיסי חזרה'}</button></div>
      <h3 className="ul-h3">מה למדת</h3>
      <ul className="ul-bullets">{UC.recap.bullets.map((x,i)=><li key={i}><Bi>{x}</Bi></li>)}</ul>
      <p className="ul-rule"><b>הכלל:</b> <Bi>{UC.recap.rule}</Bi></p>
      <p className="ul-sub">שלושה משפטים לומר בקול</p>
      <ul className="ex-list">{UC.recap.say.map(([en,he])=><ExampleLine key={en} x={{en, he}} wordKey="~" voice={voice} rate={state.settings.rate} showTr={false}/>)}</ul>
    </section>}
    {next.length>0&&!UC&&<section className="card p-5"><h2 className="font-extrabold mb-2">אחרי הסרטון: מתרגלים</h2><ol className="flex flex-col gap-1.5 list-none p-0 m-0">{next.map((l,k)=><li key={l.id} className="flex gap-3 items-center text-sm"><span className="w-6 h-6 rounded-full grid place-items-center shrink-0 text-xs num" style={{background:'var(--sunk)', color:'var(--muted)'}}>{k+1}</span><span className="font-semibold">{l.title}</span></li>)}</ol>
      <p className="text-sm text-muted mt-4 leading-relaxed">כל שיעור כולל דיאלוג, כלל קצר בעברית, מילים ותרגילים. מומלץ לצפות בסרטון פעם אחת ברצף, ואז לחזור אליו אחרי התרגול.</p></section>}
    <button className="btn btn-primary py-3 px-8 self-center dock-mobile" onClick={()=>{ actions.completeLesson(lesson.id, []); if(!done) celebrate(false); onBack(); }}>{done?(backLabel||'חזרה ליחידה'):(backLabel?'סיימתי לצפות':'סיימתי לצפות, להמשך לתרגול')}</button>
  </div>);
}

function CourseView({course, state, actions, voice, celebrate, profile, toast, onBack, openStory, openTalk, jump}){
  // opened from the home page: go straight into the lesson ("בוא נמשיך")
  const [lesson,setLesson]=useState(()=>{ if(!jump||!jump.lid) return null; const t=course.topics.find(x=>x.id===jump.tid); const l=t&&t.lessons.find(x=>x.id===jump.lid); return l&&l.type!=='story'&&l.type!=='talk'?{t,l}:null; }); const [quiz,setQuiz]=useState(null); const [res,setRes]=useState(null); const [cert,setCert]=useState(false);
  const cp=courseProgress(course,state); const ns=nextStep(course,state); const cs=csOf(state);
  const go=(t,l)=>{ if(l.type==='story') openStory(l.story); else if(l.type==='talk') openTalk(l.talk); else { setLesson({t,l}); window.scrollTo({top:0}); } };
  if(cert) return <CertificateView course={course} state={state} profile={profile} toast={toast} onBack={()=>setCert(false)}/>;
  if(lesson&&lesson.l.type==='video') return <LessonVideo key={lesson.l.id} topic={lesson.t} lesson={lesson.l} state={state} actions={actions} celebrate={celebrate} voice={voice} onBack={()=>setLesson(null)}/>;
  if(lesson&&lesson.l.type==='rich') return <LessonRich key={lesson.l.id} topic={lesson.t} lesson={lesson.l} state={state} actions={actions} voice={voice} celebrate={celebrate} onBack={()=>setLesson(null)}/>;
  if(lesson) return <LessonWords key={lesson.l.id} course={course} topic={lesson.t} lesson={lesson.l} state={state} actions={actions} voice={voice} celebrate={celebrate} onBack={()=>setLesson(null)}/>;
  const finishQuiz=pct=>{ const passed=pct>=PASS_PCT; actions.passTopic(quiz.id,pct,course.id); setRes({t:quiz,pct,passed}); setQuiz(null); if(passed) celebrate(pct===100); window.scrollTo({top:0}); };
  if(quiz&&quiz.items) return <ExerciseRunner items={quiz.items} title={'מבחן יחידה: '+quiz.title} voice={voice} copySeen={state.copySeen} onCopy={actions.noteCopy} onExit={()=>setQuiz(null)} onFinish={finishQuiz}/>;
  if(quiz) return <QuizRunner words={topicQuizWords(quiz)} title={'מבחן יחידה: '+quiz.title} n={10} state={state} actions={actions} voice={voice} celebrate={celebrate} onExit={()=>setQuiz(null)} onFinish={finishQuiz}/>;
  return (<div className="flex flex-col gap-5">
    <button className="btn btn-ghost px-3 text-sm self-start" onClick={onBack}>← כל הקורסים</button>
    <section className="card p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex items-center gap-4"><span className="w-16 h-16 rounded-2xl grid place-items-center text-4xl bg-sunk shrink-0" aria-hidden="true">{course.cover}</span>
        <div className="min-w-0"><div className="eyebrow">רמה {course.level}</div><h1 className="text-2xl sm:text-3xl font-bold">{course.title}</h1><p className="text-sm text-muted">{course.sub}</p></div></div>
      <p className="text-muted leading-relaxed">{course.desc}</p>
      <div className="flex items-center gap-3"><div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr" role="progressbar" aria-label="התקדמות בקורס" aria-valuemin="0" aria-valuemax="100" aria-valuenow={cp.pct}><div className="h-full bar" style={{width:cp.pct+'%', background:'var(--primary)'}}></div></div><span className="num text-sm font-bold">{cp.pct}%</span></div>
      <div className="text-xs text-muted"><span className="num">{cp.lessons}/{cp.total}</span> שיעורים · <span className="num">{cp.passed}/{cp.topics}</span> מבחני יחידה · כ־<span className="num">{course.minutes}</span> דקות</div>
      <ol className="text-sm text-muted grid gap-1 sm:grid-cols-3 list-none p-0"><li>① לומדים שיעור</li><li>② עוברים מבחן יחידה ({PASS_PCT}% ומעלה)</li><li>③ מסיימים וזוכים בתעודה</li></ol>
      {cp.complete?<div className="flex gap-2 flex-wrap"><button className="btn btn-primary px-6" onClick={()=>{ if(!cs.certs[course.id]) actions.issueCert(course.id,courseAvg(course,state)); setCert(true); }}><IconTrophy size={18}/>לתעודת הסיום</button></div>
        : ns&&<button className="btn btn-primary px-6 self-start" onClick={()=>ns.quiz?setQuiz(ns.topic):go(ns.topic,ns.lesson)}>{cp.lessons===0?'מתחילים':'המשך'}: {ns.quiz?'מבחן '+ns.topic.title:ns.lesson.title}</button>}
    </section>
    {res&&<section className="card p-5 rise flex flex-col gap-2" role="status" style={{borderColor:res.passed?'var(--known)':'var(--bad)'}}>
      <div className="font-extrabold text-xl">{res.passed?'עברת את מבחן היחידה!':'כמעט! צריך '+PASS_PCT+'% כדי להמשיך'}</div><div className="num">{res.pct}% · {res.t.title}</div>
      {!res.passed&&<div className="text-sm text-muted">חזור על המילים של היחידה ונסה שוב. אפשר כמה פעמים שרוצים.</div>}</section>}
    {course.topics.map((t,ti)=>{ const tp=topicProgress(t,state); const open=topicUnlocked(course,ti,state); const passed=tp.passed;
      return (<section key={t.id} className="card p-4 sm:p-5 flex flex-col gap-3" data-topic={t.id} data-open="1">
        <div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">{t.icon}</span><div className="me-auto"><h2 className="font-extrabold text-lg">{t.title}</h2><div className="text-xs text-muted"><span className="num">{tp.done}/{tp.total}</span> שיעורים{passed?` · עברת ב־${cs.topics[t.id].pct}%`:''}</div></div>
          {passed&&<span className="tag" style={{background:'var(--good-soft)',color:'var(--good)'}}><IconCheck size={12}/>הושלם</span>}</div>
        {open?<ul className="flex flex-col gap-1.5">
          {t.lessons.map(l=>{ const d=lessonDone(l,state); return (<li key={l.id}><button className="w-full flex items-center gap-3 rounded-xl border border-line px-3 py-3 text-start hover:border-primary" data-lesson={l.id} onClick={()=>go(t,l)}>
            <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 text-xs" style={{background:d?'var(--known)':'var(--sunk)',color:d?'#fff':'var(--muted)'}} aria-hidden="true">{d?'✓':l.type==='story'?'📖':l.type==='talk'?'💬':l.type==='video'?'▶':'🔤'}</span>
            <span className="flex-1 font-semibold">{l.title}</span><span className="text-xs text-muted">{l.type==='story'?'סיפור':l.type==='talk'?'שיחה':l.type==='video'?'סרטון':'מילים'}</span></button></li>); })}
          <li><button data-quiz={t.id} className={`btn ${tp.all?'btn-primary':'btn-ghost'} w-full py-3`} onClick={()=>{ setRes(null); const rich=t.lessons.filter(l=>l.type==='rich'); setQuiz(rich.length?{...t,items:shuffle(rich.flatMap(l=>l.ex.filter(x=>x.t!=='speak'))).slice(0,12)}:t); window.scrollTo({top:0}); }}>{tp.all?(passed?'מבחן יחידה: לנסות שוב':'מבחן יחידה'):'מבחן יחידה (מומלץ אחרי כל השיעורים)'}</button></li></ul>
        :<div className="text-sm text-muted">נפתח אחרי שתעבור את המבחן של "{course.topics[ti-1].title}".</div>}
      </section>); })}
  </div>);
}

/* ---------- Uri and the video series (posters are real frames from the lesson videos, in assets/posters) ---------- */
const SERIES=[
  {n:1, name:'שלב 1 · יסודות', lessons:['היכרות','משפחה ועבודה','מה זה?','היום שלי','לא ושאלות']},
  {n:2, name:'שלב 2 · הווה ושאלות', lessons:['מה אתה עושה עכשיו?','בבית על השולחן בשש','שאלות שימושיות','רוצה צריך חייב','בשוק: מחירים']},
  {n:3, name:'שלב 3 · עבר ועתיד', lessons:['הייתי והיית','מה עשיתי בשבוע שעבר','פעלים שמשנים צורה','לא עשיתי? האם עשית?','תוכניות לעתיד']}];
// lessons listed in LIVE_LESSONS (top of src/courses.js) play real files from R2 (<video base>/videos/lessonNN.mp4, minutes measured with ffprobe); every other lesson (6-15 for now) shows "בקרוב" until the owner adds its number to LIVE_LESSONS.
// lesson 1 is also the video lesson of the structured course (so its completion counts there); 2-5 open the series player.
const SERIES_META={1:{cid:'a1u', tid:'a1u-u1', lid:'a1u-u1-v', mins:7}, 2:{mins:10}, 3:{mins:9}, 4:{mins:10}, 5:{mins:10}};   // minutes per lesson; a lesson without an entry defaults to 10
const SERIES_LIVE=Object.fromEntries(LIVE_LESSONS.map(n=>[n, SERIES_META[n]||{mins:10}]));
const pad2=n=>String(n).padStart(2,'0');
const posterSrc=n=>'assets/posters/lesson'+pad2(n)+'.jpg';
const SERIES_ALL=SERIES.flatMap(s=>s.lessons.map((title,i)=>({n:(s.n-1)*5+i+1, title, stage:s, m:i+1})));
const seriesJump=n=>{ const l=SERIES_LIVE[n]; return l&&l.cid?{cid:l.cid, tid:l.tid, lid:l.lid}:{series:n}; };
const seriesChip=n=>{ const x=SERIES_ALL[n-1]; return 'שלב '+x.stage.n+' · שיעור '+x.m; };
function seriesLesson(n){ const x=SERIES_ALL[n-1]; return {id:'series-'+pad2(n), type:'video', title:x.title, src:'videos/lesson'+pad2(n)+'.mp4', poster:posterSrc(n), mins:SERIES_LIVE[n].mins, blurb:'שיעור '+x.m+' בשלב '+x.stage.n+' של הסדרה של אורי.'}; }
const UNIT0_LESSON={id:'series-00', type:'video', title:'קוראים אנגלית', src:'videos/lesson00.mp4', poster:posterSrc(0), mins:8, blurb:'יחידה 0: איך קוראים אנגלית, לפני שמתחילים. מתאים למי שעדיין לא מכיר את האותיות.'};
function seriesDone(n,state){ const l=SERIES_LIVE[n]; if(!l) return false;
  if(!l.cid) return !!csOf(state).lessons['series-'+pad2(n)];
  const c=COURSES.find(x=>x.id===l.cid); const t=c&&c.topics.find(x=>x.id===l.tid); const ls=t&&t.lessons.find(x=>x.id===l.lid); return !!ls&&lessonDone(ls,state); }
function PlayBadge({size=52}){ return <span className="lx-play" style={{width:size, height:size}} aria-hidden="true"><svg width={size*.42} height={size*.42} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>; }
function PosterCard({n, title, done, onOpen}){
  const live=!!SERIES_LIVE[n]; const st=SERIES_ALL[n-1].stage.n;
  return (<li className="lx-pc-li"><button type="button" className={`lx-pc lx-st${st} ${live?'is-live':'is-soon'} ${done?'is-done':''}`} onClick={onOpen} data-series={n}>
    <span className="lx-pc-img"><img src={posterSrc(n)} alt="" width="640" height="360" decoding="async" loading={n<=5?'eager':'lazy'} draggable="false"/><PlayBadge size={52}/>
      <span className="lx-chip">{seriesChip(n)}</span>
      {!live&&<span className="lx-ribbon">בקרוב</span>}
      {done&&<span className="lx-pc-done"><IconCheck size={15}/><span className="sr-only">הושלם</span></span>}</span>
    <span className="lx-pc-body"><b className="lx-pc-title">{title}</b>
      <span className="meta">{live?<>כ־<span className="num">{SERIES_LIVE[n].mins}</span> דקות · שיעור וידאו</>:'שיעור וידאו'}</span>
      {live&&<span className="lx-pc-bar" aria-hidden="true"><span style={{width:done?'100%':'0%'}}></span></span>}</span>
  </button></li>);
}
function SoonDialog({item, onClose}){
  const mref=useModal(onClose);
  return (<div ref={mref} className="overlay fixed inset-0 z-50 flex items-center justify-center gutter" style={{background:'color-mix(in srgb,var(--ink) 45%,transparent)'}} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="soon-title" className="card w-full overflow-hidden rise" style={{maxWidth:'30rem'}} onClick={e=>e.stopPropagation()}>
      <div className="lx-pc-img" style={{borderRadius:0}}><img src={posterSrc(item.n)} alt="" width="640" height="360" decoding="async"/></div>
      <div className="p-5 flex flex-col gap-2"><div className="eyebrow">שיעור {item.n} · {item.stage.name}</div><h2 id="soon-title" className="text-xl font-extrabold">{item.title}</h2>
        <p className="text-muted leading-relaxed">הסרטון יעלה בקרוב. בינתיים אפשר להמשיך בשיעורי התרגול, בסיפורים ובכרטיסי החזרה.</p>
        <button className="btn btn-primary px-6 self-start mt-2" onClick={onClose}>הבנתי</button></div></div></div>);
}
/* ---------- the learner's next step (shared by the home page and the courses tab) ----------
   A "unit" is one lesson of the video series (1-15). Only the units listed in LIVE_LESSONS can be opened; the rest say "בקרוב". */
const UNIT_LEARN={
  1:['להגיד שלום ולשאול מה שלומך','להציג את עצמך','לשאול מאיפה אתה'],
  2:['להגיד של מי זה: my, his, her','לספר על המשפחה','להגיד מה המקצוע: a או an'],
  3:['לשאול מה זה: this ו־that','להגיד מה יש ואיפה: there is, there are','לתרגל משפטים קצרים'],
  4:['לספר על היום שלך','פועל בהווה עם I, you, we, they','הוא והיא מוסיפים s'],
  5:['להגיד "לא" במשפט','לשאול שאלות של כן ולא','לענות בקצרה'],
  6:['לשאול ולענות מה עושים עכשיו','הווה מתמשך','משפטים קצרים על מה שקורה עכשיו'],
  7:['להגיד איפה דברים נמצאים','מילות מקום ושעות','לספר על סדר היום'],
  8:['לשאול מי, מה, איפה ומתי','שאלות לשימוש יומיומי','לענות במשפט קצר'],
  9:['להגיד מה רוצים, מה צריכים ומה חייבים','אחרי want, need ו־have בא to ופועל','לבקש בנימוס: I would like'],
  10:['לשאול כמה זה עולה','מספרים ומחירים','לקנות בשוק בנימוס'],
  11:['להגיד איפה היית: was ו־were','לספר על אתמול','משפטי עבר קצרים'],
  12:['לספר מה עשית בשבוע שעבר','עבר פשוט','ימים וזמנים בעבר'],
  13:['פעלים שמשנים צורה בעבר','להכיר את הנפוצים שבהם','לזכור אותם בעזרת דוגמאות'],
  14:['להגיד "לא עשיתי"','לשאול "האם עשית?"','לענות על שאלות בעבר'],
  15:['להגיד מה אתה הולך לעשות','עתיד עם going to','לספר על תוכניות']};
const STAGE_LINE={1:'שלום והיכרות, משפחה, שאלות ומשפטים קצרים',2:'להבין ולשאול בהווה, ולהסתדר בשוק',3:'לספר על מה שהיה ועל מה שיהיה'};
const LIVE_UNITS=()=>SERIES_ALL.map(x=>x.n).filter(n=>SERIES_LIVE[n]);
const unitLid=n=>{ const l=SERIES_LIVE[n]; return l?(l.lid||'series-'+pad2(n)):''; };
const unitDate=(n,s)=>csOf(s).lessons[unitLid(n)]||'';
function startUnit(state){ const live=LIVE_UNITS(); const want=(state.onboard&&state.onboard.level==='some')?3:1; return live.find(n=>n>=want)||live[0]||0; }   // the onboarding answer "יודע קצת" starts at unit 3
function unitHero(state){            // {kind:'new'|'mid'|'next', n} or null
  const live=LIVE_UNITS(); if(!live.length) return null;
  const open=live.find(n=>unitLid(n)===csOf(state).opened&&!seriesDone(n,state)); if(open) return {kind:'mid', n:open};
  const pending=live.filter(n=>!seriesDone(n,state)); if(!pending.length) return null;
  const st=startUnit(state); const n=pending.find(x=>x>=st)||pending[0];
  return {kind:live.some(x=>seriesDone(x,state))?'next':'new', n};
}
// a brand-new learner starts at unit 0 (reading and sounds); once any unit is done, or "יודע קצת" was chosen, the normal order applies
function zeroFirst(state){ if(csOf(state).lessons[UNIT0_LESSON.id]) return false; if(state.onboard&&state.onboard.level==='some') return false;
  if(LIVE_UNITS().some(n=>seriesDone(n,state))) return false; const u=unitHero(state); return !(u&&u.kind==='mid'); }
const zeroHero=(run)=>({kind:'new', zero:true, title:'יחידה 0: '+UNIT_CONTENT[0].title, meta:<>כ־<span className="num">{UNIT_CONTENT[0].videoMins}</span> דקות סרטון · האותיות והצלילים, לפני שמתחילים</>, btn:'התחל כאן', run});
function lastDoneUnit(state){ let best=null; for(const n of LIVE_UNITS()){ const d=unitDate(n,state); if(d&&seriesDone(n,state)&&(!best||d>=best.date)) best={n, date:d}; } return best; }
function homeHero(state, due){       // mid-lesson > practice what was just learned > next unit
  const u=unitHero(state); if(u&&u.kind==='mid') return u;
  const ld=lastDoneUnit(state);
  if(ld&&due.length>0&&ld.date>=dayKey(addDays(new Date(),-2))) return {kind:'practice', n:ld.n, words:Math.min(due.length,10), next:u};
  return u;
}
function ProgressRing({done, total, size=56}){
  const r=(size-8)/2, c=2*Math.PI*r, p=total?done/total:0;
  return (<svg className="hc-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
    <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="6" className="hc-ring-track"/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="hc-ring-fill" strokeDasharray={c} strokeDashoffset={c*(1-p)} transform={`rotate(-90 ${size/2} ${size/2})`}/>
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="hc-ring-num">{done}</text></svg>);
}
// the one big card with the next step: poster, one-line title, duration and ONE primary button
function NextStepCard({hero, eyebrow, titleTag}){
  const T=titleTag||'h2';
  return (<section className={`hc-hero card ${hero.kind||''}`} aria-labelledby="hc-hero-title" data-hero={hero.kind}>
    {hero.zero?<div className="hc-poster lx-st1" onClick={hero.run}><img src={posterSrc(0)} alt="" width="640" height="360" decoding="async" draggable="false"/><PlayBadge size={56}/><span className="lx-chip">יחידה 0 · לפני שמתחילים</span></div>
      :hero.posterN?<div className={`hc-poster lx-st${SERIES_ALL[hero.posterN-1].stage.n}`} onClick={hero.run}><img src={posterSrc(hero.posterN)} alt="" width="640" height="360" decoding="async" draggable="false"/><PlayBadge size={56}/><span className="lx-chip">{seriesChip(hero.posterN)}</span></div>
      :<div className="hc-poster hc-poster-icon" aria-hidden="true"><IconBook size={64}/></div>}
    <div className="hc-hero-body">
      <p className="eyebrow">{eyebrow||'הצעד הבא שלך'}</p>
      <T id="hc-hero-title" className="hc-hero-title">{hero.title}</T>
      <p className="hc-hero-meta">{hero.meta}</p>
      <button type="button" className="btn btn-go hc-hero-btn" onClick={hero.run}><IconPlay size={18}/>{hero.btn}</button>
      {hero.alt&&<button type="button" className="hc-linkbtn" onClick={hero.alt.run}>{hero.alt.label}</button>}
    </div></section>);
}
const unitMeta=n=>SERIES_LIVE[n]?<>כ־<span className="num">{SERIES_LIVE[n].mins}</span> דקות · שיעור וידאו עם אורי</>:'שיעור וידאו עם אורי';
// the path of one stage: 5 numbered nodes joined by a line, each with a unit card (poster, title, minutes, what you will learn)
/* opening a unit beyond where the learner is: never blocked, only a calm, dismissible suggestion */
function OrderDialog({chosenN, nextN, onGo, onStay, onClose}){
  const mref=useModal(onClose); const nx=SERIES_ALL[nextN-1];
  return (<div ref={mref} className="overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center gutter" style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)', paddingBottom:'max(16px, env(safe-area-inset-bottom,0px))'}} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="ord-title" className="card w-full rise bk-dialog" style={{maxWidth:'30rem'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-start gap-3"><h2 id="ord-title" className="text-xl font-extrabold me-auto" data-autofocus tabIndex={-1}>כדאי להתחיל מההתחלה</h2>
        <button type="button" className="btn btn-ghost w-11 h-11 shrink-0" onClick={onClose} aria-label="סגירה"><IconX size={18}/></button></div>
      <p className="leading-relaxed">השיעורים בנויים צעד אחר צעד, וכל אחד נשען על הקודם. מי שלומד לפי הסדר מבין יותר וזוכר יותר. מומלץ להתחיל מיחידה <span className="num">{nextN}</span>: {nx.title}.</p>
      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-go px-5" style={{minHeight:'52px'}} onClick={onGo}>קח אותי להתחלה</button>
        <button type="button" className="btn btn-line px-5" onClick={onStay}>המשך בכל זאת</button></div>
    </div></div>);
}
function UnitPath({stage, state, nextN, onLive, onSoon, onAsk}){
  const items=SERIES_ALL.filter(x=>x.stage===stage);
  return (<ol className="hc-path">{items.map(x=>{ const n=x.n; const live=!!SERIES_LIVE[n]; const done=seriesDone(n,state); const isNext=n===nextN;
    const UC=typeof UNIT_CONTENT!=='undefined'?UNIT_CONTENT[n]:null; const kind=done?'done':isNext?'next':!live?'soon':(nextN&&n>nextN)?'later':'open';
    const badge={done:'כבר למדת', next:'הבא', soon:'בקרוב', later:'', open:''}[kind];
    const open=()=>live?(kind==='later'&&onAsk?onAsk(n):onLive(n)):onSoon(x);
    const cta=done?'צפייה חוזרת':isNext?(csOf(state).opened===unitLid(n)?'המשך':'התחל כאן'):live?'פתיחת היחידה':'מה יהיה בשיעור';
    return (<li key={n} className={`hc-unit is-${kind}`} data-unit={n}>
      <span className="hc-node" aria-hidden="true">{done?<IconCheck size={18}/>:n}</span>
      <article className="hc-card" aria-labelledby={'hc-u-'+n}>
        <div className="hc-card-poster" onClick={open}><img src={posterSrc(n)} alt="" width="640" height="360" decoding="async" loading={n<=6?'eager':'lazy'} draggable="false"/><PlayBadge size={isNext?52:40}/></div>
        <div className="hc-card-head">
          {badge&&<span className={`hc-badge hc-badge-${kind}`}>{kind==='done'&&<IconCheck size={13}/>}{badge}</span>}
          <h3 id={'hc-u-'+n} className="hc-card-title"><span className="hc-card-n">יחידה <span className="num">{n}</span></span> {x.title}</h3>
          <p className="hc-card-meta">{UC?<><span className="num">{UC.videoMins}</span> דק׳ סרטון · <span className="num">{UC.practiceMins}</span> דק׳ תרגול</>:(live?<>כ־<span className="num">{SERIES_LIVE[n].mins}</span> דקות</>:'יעלה בקרוב')}</p>{isNext&&UC&&<p className="hc-card-promise">{UC.promise}</p>}</div>
        <div className="hc-card-learn"><p className="hc-learn-h">מה תלמד</p><ul>{((UC&&UC.before.learn)||UNIT_LEARN[n]||[]).map((t,i)=><li key={i}><Bi>{t}</Bi></li>)}</ul></div>
        <button type="button" className={`btn ${isNext?'btn-go':'btn-line'} hc-card-btn`} onClick={open} aria-label={cta+': יחידה '+n+', '+x.title}>{cta}</button>
      </article></li>); })}</ol>);
}
// Uri: the transparent figure in a soft circle, with a speech bubble
function UriBubble({children, size='md'}){
  return (<div className={`lx-uri-stage lx-uri-${size}`}><span className="lx-uri-fig"><img src="assets/uri.png" alt="אורי, המורה שלך" width="475" height="642" decoding="async" className="lx-uri-img" draggable="false"/></span><div className="lx-bubble" aria-live="polite">{children}</div></div>);
}

/* word-list courses, shown as three calm "vocabulary by topic" cards under the main path */
const TOPIC_META={
  a1:{title:'מילים ומשפטים ראשונים', can:'תדע להציג את עצמך ולהזמין קפה', icon:IconChat},
  a2:{title:'חיי היום-יום', can:'תסתדר בחנות, בנסיעה ואצל הרופא', icon:IconHome},
  b1:{title:'סיפורים אמיתיים', can:'תקרא סיפורים קצרים באנגלית בשטף', icon:IconBook}};
function TopicCard({c, i, state, voice, onOpen}){
  const m=TOPIC_META[c.id]||{title:c.title, can:c.sub, icon:IconBook}; const Ic=m.icon; const p=courseProgress(c,state);
  const words=useMemo(()=>{ const all=new Set(); c.topics.forEach(t=>t.lessons.forEach(l=>{ if(l.type==='words') lessonWordsOf(l).forEach(k=>all.add(k)); })); return all.size; },[c.id]);
  const picks=useMemo(()=>{ const out=[]; for(const t of c.topics){ for(const l of t.lessons){ if(l.type!=='words') continue; for(const k of lessonWordsOf(l)){ if(MEANING[k]&&!NAMES.has(k)&&!out.includes(k)&&k.length>=3&&k.length<=7) out.push(k); if(out.length>=3) return out; } } } return out; },[c.id]);
  const started=p.lessons>0;
  return (<li className={`tp-card tp-t${i%3+1}`} data-course={c.id}>
    <div className="tp-top"><span className="tp-ic" aria-hidden="true"><Ic size={22}/></span>
      <div className="min-w-0 flex-1"><h3 className="tp-title">{m.title}</h3><p className="tp-can">{m.can}</p></div>
      <span className="tp-level" title="רמה לפי הסולם האירופי">{c.level}<span className="sr-only"> (רמה לפי הסולם האירופי)</span></span></div>
    <p className="tp-nums"><span className="num">{words}</span> מילים · <span className="num">{c.lessonCount}</span> שיעורים · כ־<span className="num">{c.minutes}</span> דקות</p>
    {started&&<div className="tp-prog"><div className="tp-bar" dir="ltr" role="progressbar" aria-label={'התקדמות: '+m.title} aria-valuemin="0" aria-valuemax="100" aria-valuenow={p.pct}><span style={{width:p.pct+'%'}}></span></div><span className="num tp-pct">{p.pct}%</span></div>}
    {picks.length>0&&<ul className="tp-chips" aria-label="דוגמאות למילים בקורס">{picks.map(k=>{ const he=wordInfo(k).he||''; return <li key={k}><button type="button" className="tp-chip" onClick={()=>speakText(k, state.settings.rate||1, voice)} aria-label={'השמע את המילה '+k+(he?' '+he:'')}><span className="tp-chip-row"><bdi dir="ltr" lang="en" className="book tp-chip-w">{k}</bdi><IconSpeaker size={14} className="tp-chip-ic"/></span>{' '}<span className="tp-chip-he"><Bi>{he}</Bi></span></button></li>; })}</ul>}
    <button type="button" className="btn btn-primary tp-btn" onClick={onOpen} aria-label={(started?'המשך':'התחל')+': '+m.title}>{started?'המשך':'התחל'}</button>
  </li>);
}

/* soft review points and stage tests (no locks): after units 3/5/8/10/13/15 and at the end of each stage */
function StageExtras({stage, state, onRun}){
  const st=typeof UNIT_STAGES!=='undefined'&&UNIT_STAGES.find(x=>x.n===stage); if(!st) return null;
  const lessons=csOf(state).lessons;
  const items=[...UNIT_REVIEWS.filter(r=>st.units.includes(r.after)).map(r=>({id:'review-'+r.after, label:'חזרה אחרי יחידה '+r.after, count:r.items.length, after:r.after, data:r})),
    ...(STAGE_TESTS[stage]?[{id:'stagetest-'+stage, label:'מבחן סיום שלב '+stage, count:STAGE_TESTS[stage].items.filter(i=>i.t!=='speak').length, after:STAGE_TESTS[stage].after, data:STAGE_TESTS[stage], test:true}]:[])];
  if(!items.length) return null;
  return (<div className="hc-extras"><h3 className="hc-extras-h">חזרה ובדיקה</h3><ul className="hc-extras-list">{items.map(it=>{ const done=!!lessons[it.id]; const ready=seriesDone(it.after,state);
    return (<li key={it.id}><button type="button" className="hc-extra" onClick={()=>onRun(it)}>
      <span className="hc-extra-ic" aria-hidden="true">{it.test?<IconCap size={18}/>:<IconBolt size={18}/>}</span>
      <span className="min-w-0 flex-1"><b className="block">{it.label}</b><span className="meta block"><span className="num">{it.count}</span> שאלות · {ready?'אפשר עכשיו':'מומלץ אחרי יחידה '+it.after}</span></span>
      {done?<span className="tag" style={{background:'var(--good-soft)', color:'var(--good)'}}><IconCheck size={12}/>עברת</span>:<IconChevL size={18}/>}</button></li>); })}</ul></div>);
}
function ReviewRunner({item, state, actions, voice, onBack}){
  const [pct,setPct]=useState(null); const d=item.data;
  if(pct===null) return <ExerciseRunner items={d.items} title={d.title} voice={voice} copySeen={state.copySeen} onCopy={actions.noteCopy} onExit={onBack} onFinish={p=>{ if(p>=d.pass) actions.completeLesson(item.id,[]); setPct(p); window.scrollTo({top:0}); }}/>;
  const pass=pct>=d.pass;
  return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status"><div className="eyebrow">{d.title}</div><h1 className="text-3xl font-extrabold">{pass?'עברת':'כמעט'}</h1>
    <div className="num text-2xl font-extrabold">{pct}% <span className="text-base text-muted font-semibold">(צריך {d.pass}%)</span></div>
    <p className="text-muted leading-relaxed">{pass?'כל הכבוד, אפשר להמשיך ליחידה הבאה.':'אפשר לנסות שוב, או לחזור על היחידות הקודמות ולהמשיך בקצב שלך.'}</p>
    <div className="flex gap-2 flex-wrap"><button type="button" className="btn btn-primary" onClick={onBack}>חזרה לקורסים</button><button type="button" className="btn btn-line" onClick={()=>setPct(null)}>לנסות שוב</button></div></section>);
}
function Courses({state, actions, voice, celebrate, profile, toast, openStory, openTalk, jump, go}){
  const [id,setId]=useState(jump?jump.cid:null); const [q,setQ]=useState(''); const [lj,setLj]=useState(null); const [soon,setSoon]=useState(null); const [ask,setAsk]=useState(0); const [runner,setRunner]=useState(null); const [askRun,setAskRun]=useState(null);
  const [play,setPlay]=useState(jump&&jump.series||null);     // a series lesson (2-5) playing in the series player
  const [zero,setZero]=useState(!!(jump&&jump.zero));     // unit 0 (reading and sounds): sits before stage 1, outside SERIES_ALL so units 1-15 keep their numbers
  const course=COURSES.find(c=>c.id===id);
  const used=useRef(false); const jj=lj||(used.current?null:jump);   // the home page jump is used once, on the first render only
  if(runner&&!course) return <div className="lx-narrow"><ReviewRunner key={runner.id} item={runner} state={state} actions={actions} voice={voice} onBack={()=>{ setRunner(null); window.scrollTo({top:0}); }}/></div>;
  if(zero&&!course){ const lesson=UNIT0_LESSON;
    return <div className="lx-narrow"><LessonVideo key={lesson.id} topic={{title:'לפני שמתחילים', lessons:[lesson]}} lesson={lesson} state={state} actions={actions} celebrate={celebrate} voice={voice} go={go} eyebrow="יחידה 0 · לפני שמתחילים" backLabel="חזרה לשיעורים" onBack={()=>{ setZero(false); window.scrollTo({top:0}); }}/></div>; }
  if(play&&SERIES_LIVE[play]&&!course){ const lesson=seriesLesson(play); const x=SERIES_ALL[play-1];
    return <div className="lx-narrow"><LessonVideo key={lesson.id} topic={{title:x.stage.name, lessons:[lesson]}} lesson={lesson} state={state} actions={actions} celebrate={celebrate} voice={voice} eyebrow={seriesChip(play)+' · '+x.stage.name.split(' · ')[1]} backLabel="חזרה לשיעורים" onBack={()=>{ setPlay(null); window.scrollTo({top:0}); }}/></div>; }
  if(course){ used.current=true; return <div className="lx-narrow"><CourseView course={course} state={state} actions={actions} voice={voice} celebrate={celebrate} profile={profile} toast={toast} onBack={()=>{ setId(null); setLj(null); window.scrollTo({top:0}); }} openStory={openStory} openTalk={openTalk} jump={jj&&jj.cid===course.id?jj:null}/></div>; }
  const list=COURSES.filter(c=>c.id!=='a1u');
  const onLive=n=>{ const j=seriesJump(n); if(j.cid){ setLj(j); setId(j.cid); } else setPlay(n); window.scrollTo({top:0}); };
  const unit0Done=!!csOf(state).lessons[UNIT0_LESSON.id];
  const uh=unitHero(state); const doneN=LIVE_UNITS().filter(n=>seriesDone(n,state)).length; const totalN=SERIES_ALL.length;
  const hx=uh&&SERIES_ALL[uh.n-1];
  const heroObj=uh?{kind:uh.kind, posterN:uh.n, title:'יחידה '+uh.n+': '+hx.title, meta:<>{seriesChip(uh.n)} · <span className="num">{SERIES_LIVE[uh.n].mins}</span> דקות</>, btn:uh.kind==='new'?'התחל כאן':'המשך', run:()=>onLive(uh.n)}:null;
  return (<div className="flex flex-col gap-6">
    <header className="hc-page-head">
      <p className="text-muted leading-relaxed">{doneN>0?<>השלמת <span className="num">{doneN}</span> מתוך <span className="num">{totalN}</span> יחידות. אפשר להמשיך בקצב שלך, בלי לחץ.</>:<>חמש־עשרה יחידות קצרות, שלב אחרי שלב. כל יחידה כ־8 דקות, בעברית ובלי לחץ.</>}</p></header>
    {zeroFirst(state)?null
      :heroObj?<NextStepCard hero={heroObj} eyebrow={uh.kind==='new'?'התחל כאן':'המשך ללמוד'}/>
      :<EmptyState icon={<IconCheck size={22}/>} title="השלמת את כל היחידות שזמינות" text="יחידות נוספות יעלו בקרוב. בינתיים אפשר לחזק את מה שלמדת בכרטיסי חזרה ובסיפורים." action="לכרטיסי חזרה" onAction={()=>go('practice')}/>}
    <section className="hc-stage lx-st1" aria-labelledby="hc-stage-0" data-unit-zero="1">
      <div className="hc-stage-head"><div className="min-w-0"><h2 id="hc-stage-0" className="hc-stage-title">לפני שמתחילים</h2>
        <p className="hc-stage-line">לקרוא אנגלית: האותיות והצלילים, בלי תעתיק. מתאים למי שעדיין לא מכיר את האותיות. מי שיודע לקרוא יכול לדלג.</p></div></div>
      <ol className="hc-path"><li className={`hc-unit is-${unit0Done?'done':'open'}`} data-unit="0">
        <span className="hc-node" aria-hidden="true">{unit0Done?<IconCheck size={18}/>:0}</span>
        <article className="hc-card" aria-labelledby="hc-u-0">
          <div className="hc-card-poster" onClick={()=>{ setZero(true); window.scrollTo({top:0}); }}><img src={posterSrc(0)} alt="" width="640" height="360" decoding="async" loading="eager" draggable="false"/><PlayBadge size={40}/></div>
          <div className="hc-card-head">
            {unit0Done&&<span className="hc-badge hc-badge-done"><IconCheck size={13}/>כבר למדת</span>}
            <h3 id="hc-u-0" className="hc-card-title"><span className="hc-card-n">יחידה <span className="num">0</span></span> {UNIT_CONTENT[0].title}</h3>
            <p className="hc-card-meta"><span className="num">{UNIT_CONTENT[0].videoMins}</span> דק׳ סרטון · <span className="num">{UNIT_CONTENT[0].practiceMins}</span> דק׳ תרגול · כולל מדריך כל 26 האותיות</p></div>
          <div className="hc-card-learn"><p className="hc-learn-h">מה תלמד</p><ul>{UNIT_CONTENT[0].before.learn.map((t,i)=><li key={i}><Bi>{t}</Bi></li>)}</ul></div>
          <button type="button" className={`btn ${zeroFirst(state)?'btn-go':'btn-line'} hc-card-btn`} onClick={()=>{ setZero(true); window.scrollTo({top:0}); }} aria-label={(unit0Done?'צפייה חוזרת':zeroFirst(state)?'התחל כאן':'פתיחת היחידה')+': יחידה 0, '+UNIT_CONTENT[0].title}>{unit0Done?'צפייה חוזרת':zeroFirst(state)?'התחל כאן':'פתיחת היחידה'}</button>
        </article></li></ol>
    </section>
    <div className="flex flex-col gap-5">{SERIES.map(s=>{ const items=SERIES_ALL.filter(x=>x.stage===s); const d=items.filter(x=>seriesDone(x.n,state)).length; const sub=s.name.split(' · ')[1]; const anyLive=items.some(x=>SERIES_LIVE[x.n]);
      return (<section key={s.n} className={`hc-stage lx-st${s.n}`} aria-labelledby={'hc-stage-'+s.n}>
        <div className="hc-stage-head"><ProgressRing done={d} total={items.length}/>
          <div className="min-w-0"><h2 id={'hc-stage-'+s.n} className="hc-stage-title">שלב <span className="num">{s.n}</span> · {sub}</h2>
            <p className="hc-stage-line">{((typeof UNIT_STAGES!=='undefined'&&UNIT_STAGES.find(x=>x.n===s.n))||{}).promise||STAGE_LINE[s.n]}</p>
            <p className="hc-stage-count"><span className="num">{d}</span> מתוך <span className="num">{items.length}</span> יחידות{!anyLive&&' · השיעורים של השלב הזה יעלו בקרוב'}</p></div></div>
        <UnitPath stage={s} state={state} nextN={uh?uh.n:0} onLive={onLive} onSoon={setSoon} onAsk={setAsk}/>
        <StageExtras stage={s.n} state={state} onRun={it=>{ if(!seriesDone(it.after,state)&&uh&&uh.n<=it.after) setAskRun(it); else { setRunner(it); window.scrollTo({top:0}); } }}/>
      </section>); })}</div>
    {soon&&<SoonDialog item={soon} onClose={()=>setSoon(null)}/>}
    {askRun&&uh&&<OrderDialog chosenN={askRun.after} nextN={uh.n} onClose={()=>setAskRun(null)} onGo={()=>{ setAskRun(null); onLive(uh.n); }} onStay={()=>{ const it=askRun; setAskRun(null); setRunner(it); window.scrollTo({top:0}); }}/>}
    {ask>0&&uh&&<OrderDialog chosenN={ask} nextN={uh.n} onClose={()=>setAsk(0)} onGo={()=>{ setAsk(0); onLive(uh.n); }} onStay={()=>{ const n=ask; setAsk(0); onLive(n); }}/>}
    <section className="tp-section" aria-labelledby="tp-h">
      <div className="tp-head-row"><h2 id="tp-h" className="section-title">אוצר מילים לפי נושא</h2><p className="tp-intro">מילים ומשפטים לתרגול, לצד הסדרה של אורי. הרמה (A1, A2, B1) היא לפי הסולם האירופי.</p></div>
      <ul className="tp-grid">{list.map((c,i)=><TopicCard key={c.id} c={c} i={i} state={state} voice={voice} onOpen={()=>{ setId(c.id); window.scrollTo({top:0}); }}/>)}</ul>
    </section>
  </div>);
}

/* ---------- study groups: weekly leaderboard shared through the site's small API ---------- */
// the site answers on two addresses: links (join codes, e-mail confirmation, password reset) keep the address the visitor is on
const PROD_HOST=/(^|\.)lumienglish\.co\.il$/;                 // the real site (also used for visit counting)
const NEW_HOST=/(^|\.)lumienglish\.co\.il$|(^|\.)pages\.dev$/; // real site + Cloudflare Pages preview/default addresses
const SITE_URL=(typeof location!=='undefined' && NEW_HOST.test(location.hostname))?location.origin:'https://lumienglish.co.il';
const ON_SITE=typeof location!=='undefined' && (/^localhost$/.test(location.hostname) || NEW_HOST.test(location.hostname));
const GROUP_API=ON_SITE?'/api/groups':SITE_URL+'/api/groups';
let JOIN_CODE=''; try{ const m=(location.search+location.hash).match(/join[=-]([A-Za-z2-9]{6})/); if(m) JOIN_CODE=m[1].toUpperCase(); }catch(e){}
const GERR={not_found:'לא מצאתי קבוצה עם הקוד הזה. בדקו שהקוד נכון.', bad_code:'קוד קבוצה הוא 6 אותיות ומספרים באנגלית.', full:'הקבוצה מלאה (עד 40 חברים).', not_member:'החיבור שלך לקבוצה כבר לא בתוקף. הצטרפו שוב עם הקוד.', bad_name:'צריך שם.', bad_group_name:'צריך לתת שם לקבוצה.', local:'בגרסת הדמו קבוצות לימוד כבויות. באתר האמיתי הן עובדות כרגיל.', net:ON_SITE?'אין חיבור לשרת כרגע. בדקו את האינטרנט ונסו שוב.':'קבוצות עובדות רק באתר lumienglish.co.il. פתחו את האפליקציה שם.'};
async function groupCall(body){
  if(LOCAL_ONLY) throw new Error('local');
  let r; try{ r=await fetch(GROUP_API, body?{method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)}:undefined); }catch(e){ throw new Error('net'); }
  let j=null; try{ j=await r.json(); }catch(e){} if(!r.ok) throw new Error((j&&j.error)||'net'); return j;
}
const weekStartKey=()=>{ const d=new Date(); return dayKey(addDays(d,-d.getDay())); };
function weekTotals(history){ const s=new Date(weekStartKey()+'T12:00:00'); let xp=0, words=0; for(let i=0;i<7;i++){ const h=history[dayKey(addDays(s,i))]; if(h){ xp+=h.xp||0; words+=h.words||0; } } return {xp, words}; }
function groupStats(state, profile, known, streak){ const w=weekTotals(state.history); return {name:profile.name, avatar:profile.avatar, known, streak, week:weekStartKey(), weekXp:w.xp, weekWords:w.words}; }
const MEDALS=['🥇','🥈','🥉'];
function GroupCard({state, actions, profile, known, streak, toast}){
  const g=state.group; const [data,setData]=useState(null); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState(JOIN_CODE?'join':''); const [gname,setGname]=useState(''); const [code,setCode]=useState(JOIN_CODE); const [confirm,setConfirm]=useState(false);
  const refresh=useCallback(async()=>{ if(!g) return; try{ const d=await groupCall({action:'report', code:g.code, memberId:g.memberId, token:g.token, stats:groupStats(state,profile,known,streak)}); setData(d); setErr(''); }
    catch(e){ if(e.message==='not_member'||e.message==='not_found'){ actions.setGroup(null); toast(GERR[e.message]); } else setErr(GERR[e.message]||GERR.net); } },[g&&g.code, known, streak, state.history]);
  useEffect(()=>{ refresh(); if(!g) return; const t=setInterval(()=>{ if(!document.hidden) refresh(); },60000); return ()=>clearInterval(t); },[g&&g.code]);
  const create=async e=>{ e.preventDefault(); setBusy(true); setErr('');
    try{ const r=await groupCall({action:'create', name:gname, member:{name:profile.name, avatar:profile.avatar}}); actions.setGroup({code:r.code, memberId:r.memberId, token:r.token, name:r.group.name}); setData(r.group); toast('הקבוצה נוצרה! שלחו את הקוד לחברים'); }
    catch(e){ setErr(GERR[e.message]||GERR.net); } setBusy(false); };
  const join=async e=>{ e.preventDefault(); setBusy(true); setErr('');
    try{ const r=await groupCall({action:'join', code, member:{name:profile.name, avatar:profile.avatar}}); actions.setGroup({code:r.code, memberId:r.memberId, token:r.token, name:r.group.name}); setData(r.group); JOIN_CODE=''; toast(`הצטרפת לקבוצה ${r.group.name}`); }
    catch(e){ setErr(GERR[e.message]||GERR.net); } setBusy(false); };
  const leave=async()=>{ setBusy(true); try{ await groupCall({action:'leave', code:g.code, memberId:g.memberId, token:g.token}); }catch(e){} actions.setGroup(null); setData(null); setConfirm(false); setBusy(false); setMode(''); setCode(''); toast('עזבת את הקבוצה'); };
  const link=g?`${SITE_URL}/?join=${g.code}`:'';
  const invite=g?`בואו ללמוד איתי אנגלית ב־Lumi English ולהתחרות מי לומד יותר השבוע!\nקוד הקבוצה: ${g.code}\n${link}`:'';
  const copy=async()=>{ if(await copyText(invite)) toast('ההזמנה הועתקה'); else toast(`קוד הקבוצה: ${g.code}`); };

  if(!g) return (<section className="card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{background:'var(--sun-soft)'}}><IconTrophy size={22}/></span>
      <div><h2 className="text-lg font-bold">קבוצת לימוד</h2><p className="text-sm text-muted">"קנאת סופרים תרבה חכמה": לומדים יחד עם חברים או משפחה, ורואים מי צבר הכי הרבה נקודות השבוע.</p></div></div>
    {!mode&&<div className="flex gap-2 flex-wrap"><button className="btn btn-primary px-5" onClick={()=>setMode('create')}><IconPlus size={18}/>יצירת קבוצה</button><button className="btn btn-ghost px-5" onClick={()=>setMode('join')}><IconUsers size={18}/>הצטרפות עם קוד</button></div>}
    {mode==='create'&&<form className="flex flex-col gap-2" onSubmit={create}><label htmlFor="g-name" className="font-semibold">שם הקבוצה</label>
      <input id="g-name" className="field" maxLength={40} placeholder="למשל: משפחת כהן" value={gname} onChange={e=>setGname(e.target.value)} autoFocus/>
      <div className="flex gap-2"><button className="btn btn-primary px-5" disabled={!gname.trim()||busy}>{busy?'יוצר…':'יצירה'}</button><button type="button" className="btn btn-ghost px-4" onClick={()=>setMode('')}>ביטול</button></div></form>}
    {mode==='join'&&<form className="flex flex-col gap-2" onSubmit={join}><label htmlFor="g-code" className="font-semibold">קוד הקבוצה</label>
      <input id="g-code" dir="ltr" className="field text-left num text-xl tracking-widest uppercase" maxLength={6} placeholder="ABC123" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} autoFocus/>
      <div className="flex gap-2"><button className="btn btn-primary px-5" disabled={code.length!==6||busy}>{busy?'מצטרף…':'הצטרפות'}</button><button type="button" className="btn btn-ghost px-4" onClick={()=>setMode('')}>ביטול</button></div></form>}
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
    {LOCAL_ONLY&&<p className="text-sm rounded-xl p-3" style={{background:'var(--sun-soft)'}}>בגרסת הדמו קבוצות לימוד כבויות. באתר האמיתי הן עובדות כרגיל.</p>}
    <p className="text-xs text-muted">בקבוצה רואים רק שם, דמות ונקודות. הסיפורים, הכתיבה והסיסמה שלך לא נשלחים לשום מקום.</p>
  </section>);

  const week=weekStartKey();
  const rows=(data?data.members:[]).map(m=>({...m, wx:m.week===week?m.weekXp:0})).sort((a,b)=>b.wx-a.wx||b.known-a.known);
  const max=Math.max(1,...rows.map(r=>r.wx));
  return (<section className="card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3 flex-wrap">
      <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{background:'var(--sun-soft)'}}><IconTrophy size={22}/></span>
      <div className="me-auto min-w-0"><h2 className="text-lg font-bold truncate">{g.name}</h2><div className="text-sm text-muted">טבלת השבוע · קוד <bdi dir="ltr" className="num font-bold text-ink tracking-wider">{g.code}</bdi></div></div>
      <a className="btn btn-primary px-4 text-sm" href={'https://wa.me/?text='+encodeURIComponent(invite)} target="_blank" rel="noopener noreferrer">הזמנה בוואטסאפ</a>
      <button className="btn btn-ghost px-3 text-sm" onClick={copy}><IconCopy size={16}/>העתקת הזמנה</button>
    </div>
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
    {!data&&!err&&<div className="text-sm text-muted">טוען את הטבלה…</div>}
    {data&&<ol className="flex flex-col gap-2">{rows.map((m,i)=>{ const me=m.id===g.memberId; return (<li key={m.id} className="rounded-xl p-3 flex items-center gap-3" style={{background:me?'var(--primary-soft)':'var(--sunk)'}}>
      <span className="w-8 text-center text-xl shrink-0 num font-bold">{m.wx>0&&i<3?MEDALS[i]:i+1}</span>
      <span className="w-10 h-10 rounded-lg grid place-items-center text-2xl bg-surface shrink-0" aria-hidden="true">{m.avatar}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate"><bdi>{m.name}</bdi>{me&&<span className="tag ms-2">את/ה</span>}</div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden mt-1" dir="ltr"><div className="h-full bar" style={{width:(m.wx/max*100)+'%', background:i===0&&m.wx>0?'var(--sun)':'var(--primary)'}}></div></div>
        <div className="text-xs text-muted mt-1 num">{m.known} מילים מוכרות · <span style={{color:'var(--coral)'}}>🔥 {m.streak}</span></div>
      </div>
      <div className="text-center shrink-0"><div className="num text-2xl font-bold">{m.wx}</div><div className="text-[11px] text-muted">נק׳ השבוע</div></div>
    </li>); })}</ol>}
    {data&&rows.length===1&&<p className="text-sm text-muted">אתם הראשונים בקבוצה. שלחו את ההזמנה לחברים כדי שיצטרפו.</p>}
    <div className="flex items-center gap-3 flex-wrap text-sm">
      <button className="hit text-primary font-semibold" onClick={refresh}>רענון</button>
      {!confirm?<button className="hit text-muted underline" onClick={()=>setConfirm(true)}>עזיבת הקבוצה</button>
        :<><span>לעזוב את <bdi>{g.name}</bdi>?</span><button className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={leave} disabled={busy}>כן, לעזוב</button><button className="btn btn-ghost py-2 px-3" onClick={()=>setConfirm(false)}>ביטול</button></>}
    </div>
  </section>);
}

/* ---------- vocabulary explorer ---------- */
function VocabExplorer({state, stories, known, voice, onWord}){
  const [tab,setTab]=useState('learning'); const [q,setQ]=useState(''); const [limit,setLimit]=useState(120);
  const lists=useMemo(()=>{ const kn=[], le=[]; for(const k in state.words){ if(NAMES.has(k)) continue; if(state.words[k]==='known') kn.push(k); else if(state.words[k]==='learning') le.push(k); }
    const fresh=new Set(); for(const s of stories){ if(!(isOpenLevel(s.level, known, state.unlocked)||s.user)) continue; for(const k of storyData(s).keys) if(!state.words[k]&&!NAMES.has(k)&&wordInfo(k).he) fresh.add(k); }
    return {known:kn.sort(), learning:le.sort(), new:[...fresh].sort()}; },[state.words, stories, known, state.unlocked]);
  useEffect(()=>setLimit(120),[tab,q]);
  const t=q.trim().toLowerCase(); const heQ=isHebrew(t);
  const items=lists[tab].filter(k=>!t || (heQ?String(wordInfo(k).he||'').includes(q.trim()):k.includes(t)));
  const T=[['known','מוכרות'],['learning','בלמידה'],['new','חדשות']];
  return (<section className="card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3 flex-wrap"><h2 className="section-title me-auto">אוצר המילים שלי</h2><span className="meta">לחיצה על מילה משמיעה אותה</span></div>
    <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="סוג מילים" onKeyDown={e=>{ const i=T.findIndex(x=>x[0]===tab); let j=-1; if(e.key==='ArrowLeft') j=(i+1)%T.length; else if(e.key==='ArrowRight') j=(i+T.length-1)%T.length; else if(e.key==='Home') j=0; else if(e.key==='End') j=T.length-1; if(j>=0){ e.preventDefault(); setTab(T[j][0]); setTimeout(()=>{ const b=document.getElementById('vt-'+T[j][0]); b&&b.focus(); },0); } }}>{T.map(([k,l])=><button key={k} id={'vt-'+k} type="button" role="tab" aria-selected={tab===k} aria-controls="vt-panel" tabIndex={tab===k?0:-1} className={`vtab vtab-${k==='learning'?'learning':k}`} onClick={()=>setTab(k)}>{l} <b className="num">{lists[k].length}</b></button>)}</div>
    <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 h-11" htmlFor="vocab-search"><IconSearch size={17}/>
      <input id="vocab-search" dir="auto" className="flex-1 min-w-0 h-full bg-transparent outline-none" placeholder="חיפוש מילה באנגלית או בעברית" value={q} onChange={e=>setQ(e.target.value)}/></label>
    <div role="tabpanel" id="vt-panel" aria-labelledby={'vt-'+tab}>{items.length===0 ? <p className="text-sm text-muted text-center py-4">{t?'לא נמצאו מילים.':tab==='known'?'עוד אין מילים מוכרות. סמנו "כבר מכיר!" על מילים בסיפורים.':tab==='learning'?'עוד אין מילים בלמידה. לחצו על מילה בסיפור כדי להוסיף.':'קראתם את כל המילים בסיפורים הפתוחים!'}</p>
    : <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">{items.slice(0,limit).map(k=>{ const i=wordInfo(k); const c=tab==='learning'?srsCard(state,k):null;
        return (<li key={k} className={`vword vword-${tab}`}>
          <button className="flex-1 min-w-0 text-start" onClick={()=>speakText(k,.9,voice)}>
            <span dir="ltr" lang="en" className="book font-bold text-lg block text-left truncate">{k}</span>
            <span className="text-xs text-muted block truncate"><Bi>{i.he||''}</Bi></span>
            {c&&c.last>0&&<span className="text-xs text-muted block">חזרה {relTime(c.due)}</span>}<span className="sr-only">. השמעה</span>
          </button>
          <button className="hit w-8 h-8 grid place-items-center rounded-lg text-muted shrink-0" onClick={()=>onWord(k,k)} aria-label={`פרטים על ${k}`}><IconBook size={15}/></button>
        </li>); })}</ul>}</div>
    {items.length>limit&&<button className="btn btn-ghost px-4 self-center" onClick={()=>setLimit(l=>l+240)}>הצגת עוד ({items.length-limit})</button>}
  </section>);
}
/* ---------- achievements ---------- */
/* ---------- empty state: friendly text and ONE action, never a blank block ---------- */
function EmptyState({icon, title, text, action, onAction}){
  return (<div className="empty-state card"><span className="empty-ic" aria-hidden="true">{icon}</span>
    <div className="empty-body"><p className="font-extrabold text-lg">{title}</p><p className="text-muted leading-relaxed">{text}</p></div>
    {action&&<button type="button" className="btn btn-primary px-5" onClick={onAction}>{action}</button>}</div>);
}

/* ---------- backup code: client side ----------
   Everything that knows WHERE a backup lives is in saveBackup/loadBackup below. In this demo (LOCAL_ONLY) the backup is a copy in this
   browser's localStorage and nothing is ever sent to a server. To wire the real server later, replace only these two functions
   (SQL + API contract: C:\claude\lumi-future-lab\13_Backup_Code_Design.md). */
const BK_ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';           // 32 symbols: no 0, O, 1, I
const BK_PREFIX='lumi-backup:';
function makeBackupCode(){ const a=new Uint8Array(8); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<8;i++) a[i]=Math.floor(Math.random()*256); }
  const s=Array.from(a,v=>BK_ALPHABET[v%32]).join(''); return 'LUMI-'+s.slice(0,4)+'-'+s.slice(4); }
function normalizeBackupCode(x){ let s=String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,''); if(s.length===12&&s.startsWith('LUMI')) s=s.slice(4);
  return /^[2-9A-HJ-NP-Z]{8}$/.test(s)?'LUMI-'+s.slice(0,4)+'-'+s.slice(4):''; }
async function saveBackup(code, state, profile){
  try{ const data={app:'lumi-english', version:3, saved:new Date().toISOString(), profile:profile?{name:profile.name, avatar:profile.avatar}:null, state};
    localStorage.setItem(BK_PREFIX+code, JSON.stringify(data)); return {ok:true, savedAt:data.saved}; }
  catch(e){ return {ok:false, error:'storage'}; } }
async function loadBackup(code){
  const c=normalizeBackupCode(code); if(!c) return {ok:false, error:'bad_code'};
  try{ const raw=localStorage.getItem(BK_PREFIX+c); if(!raw) return {ok:false, error:'not_found'};
    const d=JSON.parse(raw); if(!d||d.app!=='lumi-english'||!d.state||typeof d.state.words!=='object') return {ok:false, error:'not_found'};
    return {ok:true, data:d}; }
  catch(e){ return {ok:false, error:'storage'}; } }
const BK_ERR={ bad_code:'הקוד לא נראה תקין. הוא נראה כך: LUMI-7K4P-9XQ2 (בלי האותיות O ו־I ובלי הספרות 0 ו־1).',
  not_found:LOCAL_ONLY?'בגרסת הדמו הקוד מזהה רק גיבוי ששמור במכשיר הזה. כדי לעבור למכשיר אחר, השתמש ב"ייבוא מגיבוי" עם קובץ הגיבוי.':'לא מצאנו גיבוי עם הקוד הזה. בדוק שהקוד נכון.',
  storage:'הדפדפן חוסם את האחסון המקומי, ולכן אי אפשר לשמור או לשחזר.' };
const backupWaLink=code=>'https://wa.me/?text='+encodeURIComponent('הקוד האישי שלי ב־Lumi English: '+code+'\nכדי לשחזר את ההתקדמות: אני ← שמירת ההתקדמות ← יש לי קוד.');
function CodeActions({code, toast}){
  return (<div className="flex gap-2 flex-wrap">
    <button type="button" className="btn btn-primary px-5" onClick={async()=>{ toast((await copyText(code))?'הקוד הועתק':'לא הצלחתי להעתיק. סמן את הקוד והעתק אותו ידנית'); }}><IconCopy size={18}/>העתק</button>
    <a className="btn btn-line px-5" href={backupWaLink(code)} target="_blank" rel="noopener noreferrer">שלח לעצמי בוואטסאפ<span className="sr-only"> (נפתח בחלון חדש)</span></a></div>);
}
// shown once, calmly, after the first finished lesson
function BackupPrompt({code, toast, onClose}){
  const mref=useModal(onClose);
  return (<div ref={mref} className="overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center gutter" style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)', paddingBottom:'max(16px, env(safe-area-inset-bottom,0px))'}} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="bk-title" className="card w-full rise bk-dialog" style={{maxWidth:'30rem'}} onClick={e=>e.stopPropagation()}>
      <h2 id="bk-title" className="text-xl font-extrabold" data-autofocus tabIndex={-1}>שמור את ההתקדמות שלך</h2>
      <p className="leading-relaxed">ההתקדמות שלך שמורה במכשיר הזה. כדי לא לאבד אותה, שמור את הקוד האישי שלך:</p>
      <div className="bk-code" dir="ltr" lang="en">{code}</div>
      <CodeActions code={code} toast={toast}/>
      <p className="text-sm text-muted">אפשר גם למצוא את הקוד תמיד תחת "אני", ב"שמירת ההתקדמות".</p>
      <button type="button" className="bk-later" onClick={onClose}>אחר כך</button>
    </div></div>);
}
function BackupCodePanel({state, actions, profile, toast, onFound}){
  const code=state.backup&&state.backup.code; const [restore,setRestore]=useState(false); const [val,setVal]=useState(''); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);
  const create=async()=>{ const c=makeBackupCode(); actions.setBackup({code:c}); await saveBackup(c,{...state, backup:{...(state.backup||{}), code:c}}, profile); toast('הקוד האישי נוצר'); };
  const saveNow=async()=>{ const r=await saveBackup(code,state,profile); toast(r.ok?'הגיבוי המקומי עודכן':BK_ERR.storage); };
  const doRestore=async e=>{ e.preventDefault(); if(busy) return; setBusy(true); setMsg(''); const r=await loadBackup(val); setBusy(false);
    if(r.ok){ onFound({...r.data, exported:r.data.saved}); setRestore(false); setVal(''); } else setMsg(BK_ERR[r.error]||BK_ERR.not_found); };
  return (<div className="bk-panel">
    <h3 className="font-extrabold text-lg">קוד אישי לשחזור</h3>
    {code ? <>
      <p className="text-sm text-muted leading-relaxed">הקוד הזה הוא המפתח להתקדמות שלך. מי שיש לו את הקוד יכול לשחזר אותה, ולכן שמור אותו לעצמך.</p>
      <div className="bk-code" dir="ltr" lang="en">{code}</div>
      <CodeActions code={code} toast={toast}/>
      <div><button type="button" className="hit text-primary font-semibold text-sm" onClick={saveNow}>שמירת גיבוי עכשיו</button></div>
    </> : <>
      <p className="text-sm text-muted leading-relaxed">אפשר לקבל קוד קצר, כמו <bdi dir="ltr" lang="en" className="num">LUMI-7K4P-9XQ2</bdi>, ולשמור אותו בוואטסאפ או בפתק. בעזרתו תוכל להחזיר את ההתקדמות אחרי החלפת מכשיר.</p>
      <div><button type="button" className="btn btn-primary px-5" onClick={create}>יצירת קוד אישי</button></div></>}
    <div>{!restore ? <button type="button" className="btn btn-line px-5" onClick={()=>setRestore(true)}>יש לי קוד</button>
      : <form className="flex flex-col gap-2" onSubmit={doRestore}><label htmlFor="bk-restore" className="font-semibold">הקוד האישי שלך</label>
        <div className="flex gap-2 flex-wrap"><input id="bk-restore" dir="ltr" lang="en" className="field bk-input" placeholder="LUMI-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} value={val} onChange={e=>{ setVal(e.target.value.toUpperCase()); setMsg(''); }} autoFocus/>
          <button className="btn btn-primary px-5" disabled={!val.trim()||busy}>שחזור</button><button type="button" className="btn btn-ghost px-4" onClick={()=>{ setRestore(false); setMsg(''); setVal(''); }}>ביטול</button></div>
        {msg&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{msg}</div>}</form>}</div>
    {LOCAL_ONLY&&<p className="text-sm text-muted">בגרסת הדמו הגיבוי נשמר רק במכשיר הזה ולא נשלח לשום שרת. באתר האמיתי הוא יישמר בשרת, ואפשר יהיה לשחזר גם במכשיר אחר.</p>}
  </div>);
}

/* ---------- account: classic e-mail + password (MOCK layer, demo only) ----------
   Everything here lives in THIS browser's localStorage and nothing is ever sent to a server. `Auth` is the only thing that knows where accounts live:
   to go live, re-implement signUp / signIn / signOut / resetPassword / completeReset / confirm / saveProgress / deleteAccount with Supabase Auth
   (flow and copy: C:\claude\lumi-future-lab\14_Account_Flow_and_Copy.md, section 6). The screens below do not change. */
const AUTH_KEY='lumi-mock-auth';
const AUTH_SUBS=new Set();
const authLoad=()=>{ try{ const d=JSON.parse(localStorage.getItem(AUTH_KEY)||'null'); if(d&&d.users) return d; }catch(e){} return {users:{}, session:null, pending:null}; };
const authSave=d=>{ try{ localStorage.setItem(AUTH_KEY, JSON.stringify(d)); }catch(e){ return false; } AUTH_SUBS.forEach(f=>f()); return true; };
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normEmail=e=>String(e||'').trim().toLowerCase();
const RESET_TTL=60*60*1000;      // the reset link is valid for one hour
let AUTH_FAILS=0, AUTH_LOCK=0;
const authOffline=()=>typeof navigator!=='undefined'&&navigator.onLine===false;
const Auth={
  mode:'mock',
  session(){ const d=authLoad(); return d.session&&d.users[d.session]?{email:d.session}:null; },
  pending(){ const d=authLoad(); return d.pending&&d.users[d.pending]?d.pending:null; },
  hasReset(email){ const u=authLoad().users[normEmail(email)]; return !!(u&&u.reset); },
  resetValid(email){ const u=authLoad().users[normEmail(email)]; return !!(u&&u.reset&&Date.now()-u.reset.at<=RESET_TTL); },
  async signUp(email, password, state){
    email=normEmail(email); if(!EMAIL_RE.test(email)) return {ok:false, error:'invalid_email'}; if(String(password||'').length<8) return {ok:false, error:'weak_password'};
    if(authOffline()) return {ok:false, error:'offline'};
    const d=authLoad(); if(d.users[email]) return {ok:false, error:'exists'};
    d.users[email]={lock:await makePin(password), confirmed:false, created:Date.now(), progress:state||null}; d.pending=email;
    return authSave(d)?{ok:true, email}:{ok:false, error:'server'}; },
  async signIn(email, password){
    email=normEmail(email); if(!EMAIL_RE.test(email)) return {ok:false, error:'invalid_email'}; if(authOffline()) return {ok:false, error:'offline'};
    if(Date.now()<AUTH_LOCK) return {ok:false, error:'rate'};
    const d=authLoad(); const u=d.users[email]; const good=u?await checkPin(String(password||''), u.lock):false;
    if(!u||!good||!password){ if(++AUTH_FAILS>=5){ AUTH_LOCK=Date.now()+5*60*1000; AUTH_FAILS=0; return {ok:false, error:'rate'}; } return {ok:false, error:'bad_credentials'}; }
    AUTH_FAILS=0; if(!u.confirmed) return {ok:false, error:'not_confirmed'};
    d.session=email; d.pending=null; authSave(d); return {ok:true, email, progress:u.progress||null}; },
  async signOut(){ const d=authLoad(); d.session=null; authSave(d); return {ok:true}; },
  async resetPassword(email){     // the answer is the same whether or not the address exists (nobody can find out who is registered)
    email=normEmail(email); if(!EMAIL_RE.test(email)) return {ok:false, error:'invalid_email'}; if(authOffline()) return {ok:false, error:'offline'};
    const d=authLoad(); if(d.users[email]){ d.users[email].reset={at:Date.now()}; authSave(d); } return {ok:true}; },
  async completeReset(email, newPassword){   // what the "choose a new password" link leads to
    email=normEmail(email); const d=authLoad(); const u=d.users[email];
    if(!u||!u.reset||Date.now()-u.reset.at>RESET_TTL) return {ok:false, error:'expired'};
    if(String(newPassword||'').length<8) return {ok:false, error:'weak_password'};
    u.lock=await makePin(newPassword); u.reset=null; u.confirmed=true; d.session=email; d.pending=null; authSave(d); return {ok:true, email, progress:u.progress||null}; },
  async confirm(email){ email=normEmail(email); const d=authLoad(); const u=d.users[email]; if(!u) return {ok:false, error:'expired'}; u.confirmed=true; d.session=email; d.pending=null; authSave(d); return {ok:true, email, progress:u.progress||null}; },
  async resendConfirm(email){ return authOffline()?{ok:false, error:'offline'}:{ok:true}; },
  saveProgress(state){ const d=authLoad(); if(!d.session||!d.users[d.session]) return false; d.users[d.session].progress=state; d.users[d.session].progressAt=Date.now(); try{ localStorage.setItem(AUTH_KEY, JSON.stringify(d)); return true; }catch(e){ return false; } },
  async deleteAccount(){ const d=authLoad(); if(d.session) delete d.users[d.session]; d.session=null; d.pending=null; authSave(d); return {ok:true}; }
};
function useAuth(){ const [,setV]=useState(0); useEffect(()=>{ const f=()=>setV(x=>x+1); AUTH_SUBS.add(f); return ()=>AUTH_SUBS.delete(f); },[]); return {session:Auth.session(), pending:Auth.pending()}; }
/* signing in on a device that also has progress: nothing is asked, the two are merged (the higher of each metric, words from both) */
function mergeProgress(local, remote){
  if(!remote) return local; if(!local) return remote;
  const a=local, b=remote; const rank={known:2, learning:1};
  const maxNum=(x,y)=>{ const o={...(y||{}), ...(x||{})}; for(const k in o){ const p=(x||{})[k], q=(y||{})[k]; if(typeof p==='number'||typeof q==='number') o[k]=Math.max(p||0,q||0); } return o; };
  const words={...(b.words||{})}; for(const k in (a.words||{})) if(!words[k]||(rank[a.words[k]]||0)>(rank[words[k]]||0)) words[k]=a.words[k];
  const srs={...(b.srs||{}), ...(a.srs||{})}; for(const k in (b.srs||{})){ const x=a.srs&&a.srs[k], y=b.srs[k]; if(x&&y) srs[k]=(y.reps||0)>(x.reps||0)?y:x; }
  const history={}; new Set([...Object.keys(a.history||{}), ...Object.keys(b.history||{})]).forEach(d=>{ const x=(a.history||{})[d], y=(b.history||{})[d]; history[d]=x&&y?{...y, ...x, ...maxNum(x,y), met:!!(x.met||y.met)}:(x||y); });
  const ca=csOf(a), cb=csOf(b); const topics={...cb.topics, ...ca.topics}; for(const k in cb.topics) if(ca.topics[k]) topics[k]=(cb.topics[k].pct||0)>(ca.topics[k].pct||0)?cb.topics[k]:ca.topics[k];
  const courses={...cb, ...ca, lessons:{...cb.lessons, ...ca.lessons}, topics, certs:{...cb.certs, ...ca.certs}, perfect:Math.max(ca.perfect||0, cb.perfect||0), opened:ca.opened||cb.opened};
  const storiesDone={...(b.storiesDone||{}), ...(a.storiesDone||{})}; for(const k in (b.storiesDone||{})) if(a.storiesDone&&a.storiesDone[k]) storiesDone[k]={...b.storiesDone[k], ...a.storiesDone[k], times:Math.max(a.storiesDone[k].times||0, b.storiesDone[k].times||0)};
  const quiz={}; new Set([...Object.keys(a.quiz||{}), ...Object.keys(b.quiz||{})]).forEach(k=>{ quiz[k]=maxNum((a.quiz||{})[k], (b.quiz||{})[k]); });
  const mine=new Set((a.userStories||[]).map(s=>s.id));
  return {...b, ...a, words, srs, history, courses, storiesDone, quiz, totals:maxNum(a.totals,b.totals), bestCombo:Math.max(a.bestCombo||0, b.bestCombo||0),
    badges:{...(b.badges||{}), ...(a.badges||{})}, talkDone:{...(b.talkDone||{}), ...(a.talkDone||{})}, phon:{...(b.phon||{}), ...(a.phon||{})}, notes:{...(b.notes||{}), ...(a.notes||{})},
    customDict:{...(b.customDict||{}), ...(a.customDict||{})}, netDict:{...(b.netDict||{}), ...(a.netDict||{})}, unlocked:{...(b.unlocked||{}), ...(a.unlocked||{})},
    userStories:[...(a.userStories||[]), ...(b.userStories||[]).filter(s=>!mine.has(s.id))], onboard:a.onboard||b.onboard, acct:a.acct||b.acct, backup:a.backup||b.backup, settings:a.settings||b.settings, goal:a.goal||b.goal};
}
/* when to offer saving the progress: after the first finished lesson (or ~10 active minutes / 20 saved words, the earlier), never mid-exercise, at most once per 3 learning days, never more than 3 times */
function accountOfferDue(state, kind){      // kind: 'lesson' (a lesson was just finished) | 'idle' (the learner is on the home page)
  const a=state.acct||{}; const n=a.offers||0; if(n>=3) return false;
  if(n===0){ if(kind==='lesson') return true;
    const secs=Object.values(state.history||{}).reduce((s,h)=>s+(h.secs||0),0); const saved=Object.values(state.words||{}).filter(w=>w==='known'||w==='learning').length;
    return kind==='idle'&&(secs>=600||saved>=20); }
  const since=Object.keys(state.history||{}).filter(d=>d>(a.lastOffer||'')&&((state.history[d].xp||0)>0||(state.history[d].secs||0)>0)).length;
  return kind==='idle'&&since>=3;
}
const AU_ERR={
  invalid_email:'כתובת המייל לא נראית תקינה. בדוק אותה ונסה שוב.', weak_password:'הסיסמה צריכה להיות לפחות 8 תווים.',
  exists:'הכתובת הזו כבר רשומה. אפשר להיכנס, או לשחזר את הסיסמה.', bad_credentials:'המייל או הסיסמה לא נכונים. אפשר לנסות שוב או לשחזר סיסמה.',
  rate:'ניסית כמה פעמים. נסה שוב בעוד כמה דקות.', offline:'אין חיבור לאינטרנט כרגע. ההתקדמות שלך שמורה במכשיר, ונסנכרן אותה כשהחיבור יחזור.',
  server:'משהו השתבש מצדנו. ההתקדמות שלך שמורה במכשיר. נסה שוב עוד מעט.', not_confirmed:'עוד לא אישרת את המייל. שלחנו קישור לאישור, ואפשר לשלוח שוב.' };
function AuEmail({value, onChange, invalid, errId}){
  return (<div className="au-field"><label htmlFor="au-email">כתובת מייל</label>
    <input id="au-email" type="email" inputMode="email" dir="ltr" lang="en" autoComplete="email" autoCapitalize="off" spellCheck={false} className="field au-input" value={value} onChange={e=>onChange(e.target.value)} aria-invalid={invalid?'true':undefined} aria-describedby={invalid?errId:undefined}/></div>);
}
function AuPassword({id, label, value, onChange, autoComplete, show, onToggle, invalid, errId}){
  return (<div className="au-field"><label htmlFor={id}>{label}</label>
    <div className="au-pwrow"><input id={id} type={show?'text':'password'} dir="rtl" lang="en" autoComplete={autoComplete} autoCapitalize="off" spellCheck={false} className="field au-input au-pw-input" value={value} onChange={e=>onChange(e.target.value)} aria-invalid={invalid?'true':undefined} aria-describedby={invalid?errId:undefined}/>
      <button type="button" className="au-eye" onClick={onToggle} aria-label={show?'הסתר סיסמה':'הצג סיסמה'} aria-pressed={show}>{show?<IconEyeOff size={20}/>:<IconEye size={20}/>}</button></div></div>);
}
// the card that offers saving the progress: bottom of the screen, does not block anything, "לא עכשיו" always there
function AccountOffer({onSave, onLater}){
  const ref=useRef(null);
  useEffect(()=>{ const h=ref.current&&ref.current.querySelector('h2'); h&&h.focus({preventScroll:true});
    const key=e=>{ if(e.key==='Escape'&&!MODAL_STACK.length){ onLater(); } }; document.addEventListener('keydown',key); return ()=>document.removeEventListener('keydown',key); },[]);
  return (<section ref={ref} role="dialog" aria-modal="false" aria-labelledby="ao-title" className="card au-offer rise">
    <h2 id="ao-title" tabIndex={-1} className="text-xl font-extrabold">כל הכבוד, סיימת את השיעור הראשון</h2>
    <p className="leading-relaxed">כדי שההתקדמות שלך לא תלך לאיבוד, אפשר לשמור אותה בחשבון. כך תוכל להמשיך מכל טלפון או מחשב.</p>
    <div className="au-offer-btns"><button type="button" className="btn btn-primary px-5" onClick={onSave}>שמור את ההתקדמות שלי</button><button type="button" className="btn btn-ghost px-5" onClick={onLater}>לא עכשיו</button></div>
    <p className="text-sm text-muted">ההרשמה לוקחת דקה, ואפשר להמשיך ללמוד גם בלעדיה.</p></section>);
}
function AuthDialog({start, state, toast, openLegal, onClose, onSignedIn}){
  const [view,setView]=useState(start||'signup'); const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [show,setShow]=useState(false);
  const [err,setErr]=useState(''); const [busy,setBusy]=useState(false); const titleRef=useRef(null); const first=useRef(true);
  const mref=useModal(onClose);
  useEffect(()=>{ if(first.current){ first.current=false; return; } setErr(''); setPw(''); setShow(false); const t=setTimeout(()=>{ titleRef.current&&titleRef.current.focus(); },0); return ()=>clearTimeout(t); },[view]);
  const fail=(key, field)=>{ setErr(key); setTimeout(()=>{ const el=document.getElementById(field); el&&el.focus(); },0); };
  const bad=err&&(err==='invalid_email'||err==='exists'||err==='bad_credentials'||err==='not_confirmed')?'au-email':'au-pw';
  const errBox=<div id="au-err" className="au-err" role="alert" aria-live="assertive">{err&&<span>{AU_ERR[err]||AU_ERR.server}</span>}</div>;
  const finishSignIn=(r)=>{ onSignedIn(r.progress); };
  const submitSignUp=async e=>{ e.preventDefault(); if(busy) return; setBusy(true); const r=await Auth.signUp(email,pw,state); setBusy(false);
    if(!r.ok){ fail(r.error, r.error==='invalid_email'||r.error==='exists'?'au-email':'au-pw'); return; } setView('sent'); };
  const submitSignIn=async e=>{ e.preventDefault(); if(busy) return; setBusy(true); const r=await Auth.signIn(email,pw); setBusy(false);
    if(!r.ok){ fail(r.error, r.error==='invalid_email'?'au-email':r.error==='rate'||r.error==='offline'||r.error==='server'?'au-email':'au-pw'); return; } finishSignIn(r); toast('התחברת לחשבון'); onClose(); };
  const submitForgot=async e=>{ e.preventDefault(); if(busy) return; setBusy(true); const r=await Auth.resetPassword(email); setBusy(false); if(!r.ok){ fail(r.error,'au-email'); return; } setView('forgot_sent'); };
  const submitReset=async e=>{ e.preventDefault(); if(busy) return; setBusy(true); const r=await Auth.completeReset(email,pw); setBusy(false);
    if(!r.ok){ if(r.error==='expired'){ setView('expired'); return; } fail(r.error,'au-pw'); return; } finishSignIn(r); setView('reset_done'); };
  const demoConfirm=async()=>{ const r=await Auth.confirm(email); if(r.ok){ Auth.saveProgress(state); setView('confirmed'); } };
  const T=(txt)=><h2 id="au-title" ref={titleRef} tabIndex={-1} data-autofocus className="text-xl font-extrabold me-auto">{txt}</h2>;
  const legal=<p className="au-fine">בלחיצה על הכפתור אתה מאשר את <a href="#terms" onClick={e=>{ e.preventDefault(); openLegal('terms'); }}>תנאי השימוש</a> ואת <a href="#privacy" onClick={e=>{ e.preventDefault(); openLegal('privacy'); }}>מדיניות הפרטיות</a>. את המייל נשתמש רק לחשבון שלך. לא נשלח הודעות פרסומיות.</p>;
  const demoBox=(label, fn)=>LOCAL_ONLY&&<div className="au-demo"><p>בגרסת הדמו לא נשלח מייל אמיתי. כדי לראות את השלב הבא:</p><button type="button" className="btn btn-line px-4" onClick={fn}>{label}</button></div>;
  let body=null, title='';
  if(view==='signup'){ title='שמירת ההתקדמות'; body=<form noValidate onSubmit={submitSignUp} className="au-form"><p className="text-muted leading-relaxed">נשמור את מה שלמדת, ותוכל לחזור אליו מכל מכשיר.</p>
      <AuEmail value={email} onChange={setEmail} invalid={err==='invalid_email'||err==='exists'} errId="au-err"/>
      <AuPassword id="au-pw" label="סיסמה (לפחות 8 תווים)" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={()=>setShow(s=>!s)} invalid={err==='weak_password'} errId="au-err"/>
      {errBox}
      {err==='exists'&&<div className="au-links"><button type="button" className="au-link" onClick={()=>setView('signin')}>כניסה</button><button type="button" className="au-link" onClick={()=>setView('forgot')}>שחזור סיסמה</button></div>}
      <button className="btn btn-primary au-submit" disabled={busy}>שמור את ההתקדמות</button>
      <button type="button" className="au-link" onClick={()=>setView('signin')}>כבר יש לי חשבון, כניסה</button>{legal}</form>; }
  else if(view==='sent'){ title='שלחנו לך מייל'; body=<div className="au-form"><p className="leading-relaxed">שלחנו קישור לאישור אל <bdi dir="ltr" lang="en" className="num">{normEmail(email)}</bdi>. לחץ עליו כדי להשלים את ההרשמה. עד אז ההתקדמות שלך שמורה במכשיר הזה.</p>
      <button type="button" className="btn btn-primary au-submit" onClick={onClose}>המשך ללמוד</button>
      <button type="button" className="au-link" onClick={async()=>{ const r=await Auth.resendConfirm(email); toast(r.ok?'שלחנו שוב':AU_ERR[r.error]); }}>לא הגיע מייל? שלח שוב</button>
      <p className="text-sm text-muted">בדוק גם בתיקיית הספאם. אם טעית בכתובת, אפשר להירשם מחדש.</p>{demoBox('הדמיית לחיצה על קישור האישור', demoConfirm)}</div>; }
  else if(view==='confirmed'){ title='החשבון אושר'; body=<div className="au-form"><p className="leading-relaxed">ההתקדמות שלך נשמרת עכשיו בחשבון. תודה.</p><button type="button" className="btn btn-primary au-submit" onClick={onClose}>המשך ללמוד</button></div>; }
  else if(view==='signin'){ title='כניסה לחשבון'; body=<form noValidate onSubmit={submitSignIn} className="au-form">
      <AuEmail value={email} onChange={setEmail} invalid={err==='invalid_email'||err==='bad_credentials'||err==='not_confirmed'} errId="au-err"/>
      <AuPassword id="au-pw" label="סיסמה" value={pw} onChange={setPw} autoComplete="current-password" show={show} onToggle={()=>setShow(s=>!s)} invalid={err==='bad_credentials'} errId="au-err"/>
      {errBox}
      {err==='not_confirmed'&&<div className="au-links"><button type="button" className="au-link" onClick={async()=>{ const r=await Auth.resendConfirm(email); toast(r.ok?'שלחנו שוב':AU_ERR[r.error]); }}>שלח שוב</button>{LOCAL_ONLY&&<button type="button" className="au-link" onClick={demoConfirm}>הדמיית קישור האישור (דמו)</button>}</div>}
      <button className="btn btn-primary au-submit" disabled={busy}>כניסה</button>
      <button type="button" className="au-link" onClick={()=>setView('forgot')}>שכחתי סיסמה</button>
      <button type="button" className="au-link" onClick={onClose}>אין לי חשבון עדיין, אפשר להמשיך ללמוד בלי הרשמה</button></form>; }
  else if(view==='forgot'){ title='שחזור סיסמה'; body=<form noValidate onSubmit={submitForgot} className="au-form"><p className="text-muted leading-relaxed">הזן את כתובת המייל שבה נרשמת, ונשלח אליה קישור לבחירת סיסמה חדשה.</p>
      <AuEmail value={email} onChange={setEmail} invalid={err==='invalid_email'} errId="au-err"/>{errBox}
      <button className="btn btn-primary au-submit" disabled={busy}>שלח קישור</button><button type="button" className="au-link" onClick={()=>setView('signin')}>חזרה לכניסה</button></form>; }
  else if(view==='forgot_sent'){ title='שחזור סיסמה'; body=<div className="au-form"><p className="leading-relaxed" role="status">אם הכתובת רשומה אצלנו, שלחנו אליה קישור. בדוק גם בתיקיית הספאם. הקישור תקף לשעה.</p>
      {Auth.hasReset(email)&&demoBox('הדמיית לחיצה על קישור השחזור', ()=>setView(Auth.resetValid(email)?'reset':'expired'))}
      <button type="button" className="au-link" onClick={()=>setView('signin')}>חזרה לכניסה</button></div>; }
  else if(view==='reset'){ title='בחירת סיסמה חדשה'; body=<form noValidate onSubmit={submitReset} className="au-form">
      <AuPassword id="au-pw" label="סיסמה חדשה (לפחות 8 תווים)" value={pw} onChange={setPw} autoComplete="new-password" show={show} onToggle={()=>setShow(s=>!s)} invalid={err==='weak_password'} errId="au-err"/>{errBox}
      <button className="btn btn-primary au-submit" disabled={busy}>שמור סיסמה</button></form>; }
  else if(view==='reset_done'){ title='בחירת סיסמה חדשה'; body=<div className="au-form"><p className="leading-relaxed" role="status">הסיסמה עודכנה, והתחברת לחשבון.</p><button type="button" className="btn btn-primary au-submit" onClick={onClose}>המשך ללמוד</button></div>; }
  else if(view==='expired'){ title='בחירת סיסמה חדשה'; body=<div className="au-form"><p className="leading-relaxed" role="status">הקישור כבר לא תקף. אפשר לבקש קישור חדש.</p><button type="button" className="btn btn-primary au-submit" onClick={()=>setView('forgot')}>בקשת קישור חדש</button></div>; }
  return (<div ref={mref} className="overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center gutter" style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)', paddingBottom:'max(16px, env(safe-area-inset-bottom,0px))'}}>
    <div role="dialog" aria-modal="true" aria-labelledby="au-title" className="card w-full rise bk-dialog au-dialog" style={{maxWidth:'28rem'}}>
      <div className="flex items-start gap-3">{T(title)}<button type="button" className="btn btn-ghost w-11 h-11 shrink-0" onClick={onClose} aria-label="סגירה"><IconX size={18}/></button></div>{body}</div></div>);
}
// after signing in on a device that also had progress
function MergeNotice({onClose}){
  const mref=useModal(onClose);
  return (<div ref={mref} className="overlay fixed inset-0 z-50 flex items-center justify-center gutter" style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}}>
    <div role="dialog" aria-modal="true" aria-labelledby="mn-text" className="card w-full rise bk-dialog" style={{maxWidth:'26rem'}}>
      <p id="mn-text" className="leading-relaxed" data-autofocus tabIndex={-1}>מצאנו את ההתקדמות שלך בחשבון, ואיחדנו אותה עם מה שלמדת במכשיר הזה. לא אבד שום דבר.</p>
      <button type="button" className="btn btn-primary px-5" onClick={onClose}>הבנתי</button></div></div>);
}
// "אני" > שמירת ההתקדמות: the quiet, permanent place of the account
function AccountPanel({auth, openAuth, toast}){
  const [del,setDel]=useState(false); const {session, pending}=auth;
  if(session) return (<div className="ac-panel">
    <p className="font-bold">מחובר כ־<bdi dir="ltr" lang="en" className="num">{session.email}</bdi></p>
    <div className="flex gap-2 flex-wrap items-center"><button type="button" className="btn btn-line px-5" onClick={async()=>{ await Auth.signOut(); toast('יצאת מהחשבון'); }}>יציאה מהחשבון</button><span className="text-sm text-muted">(ההתקדמות נשארת בחשבון)</span></div>
    {!del ? <div><button type="button" className="au-link au-danger" onClick={()=>setDel(true)}>מחיקת החשבון שלי</button></div>
    : <div className="ac-confirm" role="group" aria-labelledby="ac-del-q"><p id="ac-del-q" className="leading-relaxed">פעולה זו תמחק את החשבון ואת ההתקדמות השמורה בו, ולא אפשר לשחזר אותה. להמשיך?</p>
        <div className="flex gap-2 flex-wrap"><button type="button" className="btn py-2 px-4" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={async()=>{ await Auth.deleteAccount(); setDel(false); toast('החשבון נמחק'); }}>מחק את החשבון</button><button type="button" className="btn btn-ghost py-2 px-4" onClick={()=>setDel(false)}>ביטול</button></div></div>}
  </div>);
  return (<div className="ac-panel">
    <p className="leading-relaxed"><b>ההתקדמות שמורה במכשיר הזה בלבד. כדי לשמור אותה בחשבון:</b></p>
    {pending&&<p className="text-sm text-muted leading-relaxed">עוד לא אישרת את המייל <bdi dir="ltr" lang="en" className="num">{pending}</bdi>. שלחנו קישור לאישור, ואפשר לשלוח שוב.</p>}
    <div className="flex gap-2 flex-wrap items-center"><button type="button" className="btn btn-primary px-5" onClick={()=>openAuth('signup')}>שמור את ההתקדמות שלי</button><button type="button" className="au-link" onClick={()=>openAuth('signin')}>כבר יש לי חשבון, כניסה</button></div>
    <p className="text-sm text-muted">ניקוי נתוני הגלישה או מעבר למכשיר אחר מתחילים מאפס. אפשר גם לשמור קובץ גיבוי, בהמשך הכרטיס הזה.</p>
  </div>);
}

/* ---------- backup ---------- */
function BackupCard({state, actions, profile, toast, auth, openAuth}){
  const [pending,setPending]=useState(null); const [err,setErr]=useState(''); const fileRef=useRef(null);
  const size=useMemo(()=>{ try{ return JSON.stringify(state).length; }catch(e){ return 0; } },[state]);
  useEffect(()=>{ if(pending){ const el=document.getElementById('bk-pending'); if(el){ el.scrollIntoView({block:'center'}); el.focus({preventScroll:true}); } } },[pending]);
  const exportJson=async()=>{ const data={app:'lumi-english', version:3, exported:new Date().toISOString(), profile:{name:profile.name, avatar:profile.avatar}, state};
    const text=JSON.stringify(data); const name=`lumi-english-${profile.name.replace(/[^\wא-ת-]+/g,'')||'backup'}-${todayKey()}.json`;
    if(DOWNLOADS){ try{ await DOWNLOADS.save({filename:name, data:text}); toast('קובץ הגיבוי נשמר'); }catch(e){ toast('השמירה בוטלה'); } return; }
    try{ const url=URL.createObjectURL(new Blob([text],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('קובץ הגיבוי ירד למחשב'); }
    catch(e){ copyText(text).then(ok=>toast(ok?'ההורדה חסומה כאן, אז הגיבוי הועתק ללוח':'ההורדה חסומה כאן. פתחו את האתר lumienglish.co.il')); } };
  const onFile=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; setErr('');
    const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(String(r.result)); if(!d||d.app!=='lumi-english'||!d.state||typeof d.state.words!=='object') throw 0; setPending(d); }catch(x){ setErr('הקובץ הזה לא נראה כמו גיבוי של Lumi English.'); } }; r.readAsText(f); };
  return (<section className="card p-5 sm:p-6 flex flex-col gap-3" aria-labelledby="me-backup">
    <h2 id="me-backup" className="section-title">שמירת ההתקדמות</h2>
    {ACCOUNTS?<AccountPanel auth={auth} openAuth={openAuth} toast={toast}/>:<p className="leading-relaxed text-muted">ההתקדמות שמורה במכשיר הזה. אפשר לשמור אותה גם בקובץ גיבוי, כדי לשחזר במכשיר אחר.</p>}
    <h3 className="font-extrabold text-lg mt-1">גיבוי לקובץ</h3>
    <div className="flex gap-2 flex-wrap items-center">
      <button className="btn btn-line px-5" onClick={exportJson}>ייצוא גיבוי (קובץ JSON)</button>
      <button className="btn btn-line px-5" onClick={()=>fileRef.current&&fileRef.current.click()}>ייבוא מגיבוי</button>
      <input ref={fileRef} id="backup-file" type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="בחירת קובץ גיבוי לשחזור" onChange={onFile}/>
      <span className="meta num">גודל הנתונים: {(size/1024).toFixed(0)} KB</span>
    </div>
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{err}</div>}
    {pending&&<div id="bk-pending" tabIndex={-1} className="rounded-xl border border-line p-3 flex flex-col gap-2" role="alertdialog" aria-label="אישור שחזור">
      <div className="text-sm">לשחזר את הגיבוי של <b><bdi>{(pending.profile&&pending.profile.name)||'משתמש'}</bdi></b> מ־<span className="num">{String(pending.exported||'').slice(0,10)}</span>? <b>ההתקדמות הנוכחית של המשתמש הזה תוחלף.</b></div>
      <div className="flex gap-2"><button className="btn py-2 px-4" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={()=>{ actions.restore(pending.state); setPending(null); toast('הגיבוי שוחזר'); }}>כן, לשחזר</button><button className="btn btn-ghost py-2 px-4" onClick={()=>setPending(null)}>ביטול</button></div>
    </div>}
    {ACCOUNTS&&<details className="bk-adv"><summary>אפשרויות מתקדמות: קוד אישי לשחזור</summary>
      <BackupCodePanel state={state} actions={actions} profile={profile} toast={toast} onFound={setPending}/></details>}
  </section>);
}

/* ---------- progress ---------- */
const HE_DAYS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
function Progress({state, stories, actions, streak, known, profile, toast, voice, voices, onWord, go, openLegal, auth, openAuth}){
  const [off,setOff]=useState(0);
  const [confirmReset,setConfirmReset]=useState(false);
  const today=new Date(); const tk=todayKey();
  const weekStart=addDays(today, -today.getDay()+off*7);
  const days=Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const curStart=addDays(today, -today.getDay());
  const fmt=new Intl.DateTimeFormat('he-IL',{day:'numeric', month:'long'});
  const todayH=state.history[tk]||{xp:0,met:false};
  const secsOf=d=>(state.history[dayKey(d)]&&state.history[dayKey(d)].secs)||0;
  const weekSecs=Array.from({length:7},(_,i)=>secsOf(addDays(curStart,i))).reduce((a,b)=>a+b,0);
  const weekMin=minsLabel(weekSecs);
  const lessonsDone=Object.keys(csOf(state).lessons).length;
  const activeDays=days.filter(d=>{ const h=state.history[dayKey(d)]; return h&&(h.xp>0||h.words>0||h.secs>0); }).length;
  const mins=days.map(secsOf).map(minsLabel);
  const maxM=Math.max(10,...mins);
  const weekTotal=mins.reduce((a,b)=>a+b,0);
  const learning=Object.values(state.words).filter(s=>s==='learning').length;
  const acc=state.totals.answered?Math.round(state.totals.correct/state.totals.answered*100):null;
  const best=Math.max(bestStreak(state.history), streak);
  const pct=Math.min(100, Math.round(todayH.xp/state.goal*100));
  const doneCount=stories.filter(s=>state.storiesDone[s.id]).length;
  const lv=levelFor(known); const L=LEVELS[lv-1]; const lvPct=L.next?Math.min(100,Math.round((known-L.min+(lv===1?0:1))/(L.next-L.min)*100)):100; const left=L.next?L.next-known:0;
  const initial=[...String(profile.name||'').trim()][0]||'?';
  const fresh=known===0&&lessonsDone===0&&weekSecs===0&&doneCount===0;

  return (<div className="flex flex-col gap-4">
    

    <section className="card me-head" aria-labelledby="me-name">
      <span className="me-av" aria-hidden="true">{initial}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <h2 id="me-name" className="text-2xl font-extrabold leading-tight truncate"><bdi>{profile.name}</bdi></h2>
        <div className="flex items-center gap-2 flex-wrap"><span className="tag tag-level">שלב <span className="num">{lv}</span> מתוך 4</span><span className="font-semibold">{L.name}</span></div>
        <div className="flex items-center gap-3"><div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{background:'var(--line-strong)'}} dir="ltr" aria-hidden="true"><div className="h-full rounded-full bar" style={{width:Math.max(3,lvPct)+'%', background:'var(--primary)'}}></div></div><span className="num text-sm font-bold">{lvPct}%</span></div>
        <div className="text-sm text-muted">{L.next?<>עוד <b className="num text-ink">{left}</b> {left===1?'מילה מוכרת':'מילים מוכרות'} לשלב {lv+1}: {LEVELS[lv].name}</>:'הגעת לשלב הגבוה ביותר. כל הסיפורים פתוחים.'}</div>
      </div>
    </section>

    <section aria-labelledby="me-stats" className="flex flex-col gap-3">
      <h2 id="me-stats" className="sr-only">המספרים שלי</h2>
      <dl className="me-stats">
        {[['מילים שלמדתי',known,'tint-known'],['שיעורים שהושלמו',lessonsDone,''],['דקות השבוע',weekMin,''],['ימים ברצף',streak,'']].map(([l,v,c])=>
          <div key={l} className={`me-stat ${c}`}><dt className="text-sm">{l}</dt><dd className="num text-3xl font-extrabold"><Count value={v}/></dd></div>)}
      </dl>
      {fresh?<div className="card me-empty"><div className="flex-1 min-w-0"><div className="font-bold text-lg">עוד לא התחלת, הנה הצעד הראשון</div><p className="text-sm text-muted">שיעור קצר אחד, והמספרים כאן יתחילו לזוז.</p></div><button className="btn btn-go px-6" style={{minHeight:'48px'}} onClick={()=>go('courses')}><IconPlay size={18}/>לשיעור הראשון</button></div>
      :<p className="text-sm text-muted">בלמידה: <b className="num text-ink">{learning}</b> · סיפורים שנקראו: <b className="num text-ink">{doneCount}/{stories.length}</b> · דיוק בתרגול: <b className="num text-ink">{acc===null?'עוד אין נתון':acc+'%'}</b> · רצף שיא: <b className="num text-ink">{best}</b></p>}
    </section>

    <section className="card p-5 sm:p-6 flex items-center gap-5 flex-wrap" aria-label="היעד היומי">
      <Ring value={todayH.xp} max={state.goal} size={104} stroke={11}>
        <div className="text-center leading-none">{todayH.met ? <span style={{color:'var(--good)'}}><IconCheck size={36} className="mx-auto"/></span> : <><div className="num text-2xl font-bold"><Count value={todayH.xp}/></div><div className="text-xs text-muted mt-1 num">מתוך {state.goal}</div></>}</div>
      </Ring>
      <div className="flex-1 min-w-[180px] flex flex-col gap-2">
        <h2 className="section-title">היעד היומי</h2>
        <div className="text-muted">{todayH.met?`היעד הושלם היום. צברת ${todayH.xp} נקודות.`:todayH.xp>0?`עוד ${state.goal-todayH.xp} נקודות להשלמת היעד.`:'עוד לא התחלת היום. נקודות נצברות בקריאה, בחזרה ובשיעורים.'}</div>
        <div className="seg self-start" style={{flexWrap:'wrap', maxWidth:'100%'}} role="group" aria-label="גודל יעד יומי">
          {[[20,'קליל'],[30,'רגיל'],[50,'רציני']].map(([g,l])=><button key={g} aria-pressed={state.goal===g} onClick={()=>actions.setGoal(g)} style={{padding:'.38rem .55rem'}}>{l} <span className="num">{g}</span></button>)}
        </div>
      </div>
    </section>

    <section className="card p-5 sm:p-6 flex flex-col gap-4" aria-labelledby="me-week">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost px-3 text-sm" onClick={()=>setOff(o=>o-1)}><IconChevR size={16}/>שבוע קודם</button>
        <div className="flex-1 text-center">
          <h2 id="me-week" className="font-bold text-lg">{off===0?'השבוע שלי':off===-1?'שבוע שעבר':off===1?'שבוע הבא':`שבוע ${fmt.format(days[0])}`}</h2>
          <div className="text-sm text-muted num">{fmt.format(days[0])} – {fmt.format(days[6])}</div>
        </div>
        <button className="btn btn-ghost px-3 text-sm" onClick={()=>setOff(o=>o+1)} disabled={off>=0}>שבוע הבא<IconChevL size={16}/></button>
      </div>
      <div className="me-chart" aria-hidden="true">
        {days.map((d,i)=>{ const k=dayKey(d); const h=state.history[k]||{}; const isToday=k===tk; const m=mins[i];
          return (<div key={k} className="me-col">
            <span className="num text-sm font-semibold" style={{color:m?'var(--ink)':'var(--muted)'}}>{m||'–'}</span>
            <div className="me-track"><div className="me-bar bar" style={{height:(m?Math.max(6,m/maxM*100):0)+'%', background:h.met?'var(--good)':'var(--primary)'}}></div></div>
            <span className="me-dot" style={h.met?{background:'var(--good)', color:'var(--surface)'}:{}}>{h.met?<IconCheck size={14}/>:null}</span>
            <span className={`text-sm leading-tight text-center rounded-md px-1.5 py-0.5 ${isToday?'font-bold':'text-muted'}`} style={isToday?{background:'var(--primary-soft)', color:'var(--primary)'}:{}}>{HE_DAYS[i]}<br/><span className="num">{d.getDate()}</span></span>
          </div>); })}
      </div>
      <div className="sr-only"><table><caption>פעילות לפי יום, {fmt.format(days[0])} עד {fmt.format(days[6])}</caption>
        <thead><tr><th scope="col">יום</th><th scope="col">דקות למידה</th><th scope="col">מילים שנקראו או נשמעו</th><th scope="col">היעד היומי</th></tr></thead>
        <tbody>{days.map((d,i)=>{ const h=state.history[dayKey(d)]||{}; return <tr key={i}><th scope="row">{fmt.format(d)}</th><td>{mins[i]}</td><td>{h.words||0}</td><td>{h.met?'הושלם':'לא הושלם'}</td></tr>; })}</tbody></table></div>
      <p className="text-sm text-muted">{weekTotal>0?<>בשבוע הזה: <b className="num text-ink">{weekTotal}</b> דקות ב־<b className="num text-ink">{activeDays}</b> {activeDays===1?'יום פעיל':'ימים פעילים'}. העמודה היא דקות למידה, והסימון מעל היום מראה שהושלם היעד היומי.</>:'עוד אין פעילות בשבוע הזה. הדקות הראשונות שלך יופיעו כאן.'}</p>
    </section>

    <Achievements state={state}/>

    <BackupCard state={state} actions={actions} profile={profile} toast={toast} auth={auth} openAuth={openAuth}/>

    <MeSettings state={state} actions={actions} voices={voices} voice={voice}/>

    <VocabExplorer state={state} stories={stories} known={known} voice={voice} onWord={onWord}/>

    <section className="card p-5 sm:p-6 flex flex-col gap-2" aria-labelledby="me-about">
      <div className="flex items-center gap-2 flex-wrap"><h2 id="me-about" className="section-title me-auto">מי אנחנו</h2></div>
      <p className="leading-relaxed"><bdi dir="ltr" lang="en">Lumi English</bdi> הוא מיזם ללימוד אנגלית בעברית, בצורה פשוטה, ברורה ונעימה.</p>
      <p className="text-sm text-muted">שאלות, הצעות ודיווח על תקלה: <a className="hit px-1 underline underline-offset-4 font-semibold text-primary" href={'mailto:'+SUPPORT_EMAIL}><bdi dir="ltr">{SUPPORT_EMAIL}</bdi></a></p>
    </section>

    <nav className="card p-2 sm:p-3" aria-label="מידע, פרטיות ונגישות">
      <ul className="me-links">{[['privacy','מדיניות פרטיות'],['terms','תנאי שימוש'],['access','הצהרת נגישות'],['contact','צור קשר']].map(([k,l])=><li key={k}><button type="button" onClick={()=>openLegal(k)} aria-haspopup="dialog"><span className="flex-1 text-start font-semibold">{l}</span><IconChevL size={18}/></button></li>)}</ul>
    </nav>

    <details className="card p-5 sm:p-6">
      <summary className="text-lg font-bold cursor-pointer min-h-[44px] flex items-center">איך צוברים נקודות</summary>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
        {[['לחיצה על מילה חדשה','+1'],['סימון מילה כ"כבר מכיר"','+2'],['האזנה לסיפור עד הסוף','+5'],['סיום קריאת סיפור','+10'],['תשובה נכונה בתרגול','+3'],['תשובה שגויה (גם ניסיון שווה!)','+1']].map(([a,b])=>
          <li key={a} className="flex justify-between gap-3 border-b border-line py-1.5"><span>{a}</span><b className="num" dir="ltr">{b}</b></li>)}
      </ul>
    </details>

    <div className="flex items-center gap-3 flex-wrap text-sm">
      {!confirmReset ? <button className="hit text-muted underline" onClick={()=>setConfirmReset(true)}>איפוס כל ההתקדמות</button>
      : <><span>למחוק את כל המילים, הרצף, ההיסטוריה והסיפורים שהוספת?</span><button className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={()=>{ actions.reset(); setConfirmReset(false); }}>כן, לאפס</button><button className="btn btn-ghost py-2 px-3" onClick={()=>setConfirmReset(false)}>ביטול</button></>}
    </div>
  </div>);
}
const FONT_NAMES=['קטן','רגיל','גדול','גדול מאוד'];
const SAMPLE_EN='Welcome to Lumi English';
const WOTD_POOL=['hello','friend','family','morning','teacher','house','water','book','happy','school','garden','music','weather','together','answer','kitchen','market','journey','simple','careful'];
function MeSettings({state, actions, voices, voice}){
  const st=state.settings; const theme=st.theme||'auto';
  const [voiceWait,setVoiceWait]=useState(false); useEffect(()=>{ const t=setTimeout(()=>setVoiceWait(true),1500); return ()=>clearTimeout(t); },[]);   // the voice list loads late in some browsers: the "no voice" note only appears after that
  const row=(id,label,hint,ctl)=><li className="me-row"><div className="min-w-0"><div className="font-semibold" id={id}>{label}</div>{hint&&<div className="text-sm text-muted">{hint}</div>}</div><div className="me-ctl">{ctl}</div></li>;
  return (<section className="card p-5 sm:p-6 flex flex-col gap-1" aria-labelledby="me-set">
    <h2 id="me-set" className="section-title">הגדרות מהירות</h2>
    <ul className="me-rows">
      {row('mr-voice','קול הקראה','הקול שמקריא מילים וסיפורים', voices.length>1
        ? <select id="me-voice" className="field" aria-labelledby="mr-voice" dir="ltr" value={(voice&&voice.name)||''} onChange={e=>actions.setSetting('voice',e.target.value)}>{voices.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select>
        : <span className="text-sm text-muted">הקול של המכשיר</span>)}
      {row('mr-rate','מהירות הקראה',null,<div className="seg" role="group" aria-labelledby="mr-rate">{[[1,'רגיל'],[0.75,'איטי'],[0.5,'לאט מאוד']].map(([r,l])=><button key={r} aria-pressed={st.rate===r} onClick={()=>actions.setSetting('rate',r)}>{l}</button>)}</div>)}
      {row('mr-sample','שמע דוגמה','כך נשמעים הקול והמהירות שבחרת',<div className="me-sample">
        <button type="button" className="btn btn-line px-5" aria-label="שמע דוגמה: השמע משפט לדוגמה" disabled={!synth} onClick={()=>speakText(SAMPLE_EN, st.rate, voice)}><IconSpeaker size={18}/>שמע דוגמה</button>
        <p className="me-sample-cap">ברוכים הבאים ללומי אינגליש</p>
        <bdi className="me-sample-en" dir="ltr" lang="en">{SAMPLE_EN}</bdi>
        <p className="me-sample-note" role="status">{!synth?NO_SPEECH:(voices.length===0&&voiceWait)?'לא נמצא קול באנגלית במכשיר הזה, וייתכן שההשמעה תישמע בקול ברירת המחדל.':''}</p></div>)}
      {row('mr-font','גודל אותיות בקריאה',FONT_NAMES[st.font]||FONT_NAMES[1],<div className="seg" role="group" aria-labelledby="mr-font">
        <button onClick={()=>actions.setSetting('font',Math.max(0,st.font-1))} disabled={st.font<=0} className="book" dir="ltr" lang="en">A−<span className="sr-only"> הקטנת האותיות</span></button>
        <button onClick={()=>actions.setSetting('font',Math.min(3,st.font+1))} disabled={st.font>=3} className="book text-lg" dir="ltr" lang="en">A+<span className="sr-only"> הגדלת האותיות</span></button></div>)}
      {row('mr-level','איפה להתחיל','קובע איזו יחידה מומלצת לך בעמוד הבית',<div className="seg" role="group" aria-labelledby="mr-level">{[['zero','מאפס'],['some','יודע קצת']].map(([k,l])=><button key={k} aria-pressed={((state.onboard&&state.onboard.level)||'zero')===k} onClick={()=>actions.setOnboard({level:k})}>{l}</button>)}</div>)}
      {row('mr-theme','מצב תצוגה','אוטומטי לפי המכשיר',<div className="seg" role="group" aria-labelledby="mr-theme">{[['auto','אוטומטי'],['light','בהיר'],['dark','כהה']].map(([k,l])=><button key={k} aria-pressed={theme===k} onClick={()=>actions.setSetting('theme',k)}>{l}</button>)}</div>)}
    </ul>
  </section>);
}
const ME_UNITS={stories:'סיפורים', known:'מילים מוכרות', streak:'ימים ברצף', reviews:'חזרות', talks:'שיחות', sounds:'צלילים', mine:'סיפורים משלך', group:'קבוצה', lessons:'שיעורים', topics:'מבחני נושא', certs:'תעודות', perfect:'מבחנים מושלמים'};
function Achievements({state}){
  const [all,setAll]=useState(false);
  const st=badgeStats(state); const got=state.badges||{}; const n=BADGES.filter(b=>got[b.id]).length;
  const list=BADGES.map(b=>({b, have:!!got[b.id], v:Math.min(b.need, st[b.of]||0)})).sort((x,y)=>(y.have-x.have)||((y.v/y.b.need)-(x.v/x.b.need)));
  const shown=all?list:list.slice(0,6);
  return (<section className="card p-5 sm:p-6 flex flex-col gap-4" aria-labelledby="me-ach">
    <div className="flex items-center gap-3"><h2 id="me-ach" className="section-title me-auto">הישגים</h2><span className="meta num">{n}/{BADGES.length} נפתחו</span></div>
    {n===0&&<p className="text-sm text-muted">עוד לא נפתח הישג. ההישג הראשון קרוב: מספיק לסיים סיפור אחד או שיעור אחד.</p>}
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">{shown.map(({b,have,v})=>
      <li key={b.id} className={`badge ${have?'is-on':''}`}>
        <span className="badge-icon" aria-hidden="true">{b.icon}</span>
        <span className="font-extrabold leading-tight">{b.name}</span>
        <span className="text-sm text-muted leading-snug">{b.desc}</span>
        {have ? <span className="text-sm font-bold" style={{color:'var(--known)'}}>✓ נפתח</span>
          : <span className="w-full flex flex-col gap-1"><span className="text-sm font-semibold flex items-center justify-center gap-1"><IconLock size={13}/>נעול{b.need>1?` · עוד ${b.need-v} ${ME_UNITS[b.of]||''}`:''}</span><span className="block h-1.5 rounded-full overflow-hidden" style={{background:'var(--line-strong)'}} dir="ltr" aria-hidden="true"><span className="block h-full bar" style={{width:(v/b.need*100)+'%', background:'var(--primary)'}}></span></span><span className="text-sm text-muted num">{v}/{b.need}</span></span>}
      </li>)}</ul>
    <button type="button" className="btn btn-ghost px-4 self-center" aria-expanded={all} onClick={()=>setAll(a=>!a)}>{all?'הצגת פחות':`הצגת כל ההישגים (${BADGES.length})`}</button>
  </section>);
}

/* ---------- learner profiles ---------- */
function ProfileForm({first, onCreate, onCancel, onSignIn}){
  const [name,setName]=useState(''); const [avatar,setAvatar]=useState(AVATARS[0]); const [goal,setGoal]=useState(30); const [pin,setPin]=useState('');
  const [more,setMore]=useState(false);     // avatar, daily goal and password are optional: folded away behind "עוד אפשרויות" (defaults: first avatar, regular goal, no password)
  const pinOk=pin.length===0||pin.length>=PIN_MIN;
  const ok=name.trim().length>0&&pinOk;
  const POINTS=[[<IconBook size={18}/>,'הכול בעברית'],[<IconSpeaker size={18}/>,'אפשר לשמוע כל משפט'],[<IconLock size={18}/>,'אפשר ללמוד בלי הרשמה']];
  const form=(<form className="card lx-welcome-card p-6 sm:p-8 flex flex-col gap-4 rise" onSubmit={e=>{ e.preventDefault(); if(ok) onCreate({name:name.trim().slice(0,24), avatar, goal, pin}); }}>
      <div><h2 className="text-2xl font-bold"><label htmlFor="pf-name">{first?'איך קוראים לך?':'איך קוראים למשתמש החדש?'}</label></h2>
        {!first&&<p className="text-muted text-sm mt-1">לכל משתמש יש התקדמות, מילים וכתיבה משלו.</p>}</div>
      <input id="pf-name" dir="auto" className="field text-xl" style={{paddingBlock:'.85rem'}} autoFocus autoComplete="given-name" maxLength={24} placeholder="הקלידו את השם שלכם" value={name} onChange={e=>setName(e.target.value)}/>
      <button className="btn btn-primary py-4 px-6 text-xl w-full" style={{minHeight:'56px'}} disabled={!ok}><IconPlay size={18}/>{first?'מתחילים':'יצירת משתמש'}</button>
      {onCancel&&<button type="button" className="btn btn-ghost py-3 px-5" onClick={onCancel}>ביטול</button>}
      <button type="button" className="hit text-muted underline text-sm self-start" aria-expanded={more} onClick={()=>setMore(m=>!m)}>{more?'פחות אפשרויות':'עוד אפשרויות'}</button>
      {more&&<div className="flex flex-col gap-4 rise border-t border-line pt-4">
        <div className="flex flex-col gap-2"><span className="font-semibold">בחרו דמות</span>
          <div className="flex flex-wrap gap-1.5">{AVATARS.map(e=><button type="button" key={e} aria-pressed={avatar===e} aria-label={'דמות '+e} onClick={()=>setAvatar(e)} className="w-11 h-11 rounded-xl text-2xl grid place-items-center" style={{background:avatar===e?'var(--primary-soft)':'var(--sunk)', boxShadow:avatar===e?'0 0 0 2px var(--primary) inset':'none'}}>{e}</button>)}</div></div>
        <div className="flex flex-col gap-2"><span className="font-semibold">כמה רוצים ללמוד כל יום?</span>
          <div className="seg self-start" style={{flexWrap:'wrap'}} role="group" aria-label="יעד יומי">{[[20,'קליל, כ־5 דקות'],[30,'רגיל, כ־10 דקות'],[50,'רציני, כ־15 דקות']].map(([g,l])=><button type="button" key={g} aria-pressed={goal===g} onClick={()=>setGoal(g)}>{l}</button>)}</div>
          <span className="text-xs text-muted">אפשר לשנות את זה בכל רגע בלשונית ההתקדמות.</span></div>
        <div className="flex flex-col gap-2"><label htmlFor="pf-pin" className="font-semibold">קוד נעילה למשתמש <span className="text-muted font-normal text-sm">(לא חובה)</span></label>
          <input id="pf-pin" type="password" dir="ltr" className="field text-left" autoComplete="new-password" maxLength={32} placeholder="••••" value={pin} onChange={e=>setPin(e.target.value)}/>
          <span className="text-xs" style={{color:pinOk?'var(--muted)':'var(--bad)'}}>{pinOk?'קוד קצר שנועל את המשתמש הזה במכשיר הזה בלבד. הוא לא קשור לחשבון ולמייל. אין דרך לשחזר קוד שנשכח.':`הקוד צריך לפחות ${PIN_MIN} תווים.`}</span></div>
      </div>}
      {first&&onSignIn
        ? <><p className="text-xs text-muted">ההתקדמות שמורה במכשיר הזה בלבד. את הדמות והיעד אפשר להגדיר אחר כך תחת "אני", ושם גם אפשר לשמור את ההתקדמות בחשבון.</p>
            <button type="button" className="hit text-primary underline text-sm self-start" onClick={onSignIn}>כבר יש לי חשבון, כניסה</button></>
        : <p className="text-xs text-muted">ההתקדמות נשמרת רק בדפדפן הזה. את הדמות, היעד וקוד הנעילה אפשר להגדיר אחר כך תחת "אני".</p>}
    </form>);
  if(!first) return (<main id="main" dir="rtl" className="min-h-full font-he grid place-items-center gutter" style={{paddingBlock:'32px'}}><div className="w-full" style={{maxWidth:'30rem'}}>{form}</div></main>);
  return (<main id="main" dir="rtl" className="min-h-full font-he lx-welcome gutter">
    <div className="lx-welcome-grid">
      <div className="lx-welcome-uri rise">
        <UriBubble size="lg"><b className="block">שלום, אני אורי.</b>בוא נלמד אנגלית ביחד</UriBubble>
      </div>
      <div className="lx-welcome-text rise">
        <div className="lx-welcome-brand"><LogoMark size={44} radius={13}/><h1 className="lx-welcome-title">ברוכים הבאים ל־<bdi dir="ltr" lang="en">Lumi English</bdi></h1></div>
        <p className="lx-welcome-lead">לומדים אנגלית בקצב שלך: סרטונים, סיפורים ותרגול קצר.</p>
        {form}
        <ul className="lx-points">{POINTS.map(([ic,t])=><li key={t}><span className="lx-point-ic" aria-hidden="true">{ic}</span><b>{t}</b></li>)}</ul>
      </div>
    </div>
  </main>);
}
function ProfilePicker({list, onPick, onAdd, onForget}){
  const [ask,setAsk]=useState(null); const [pin,setPin]=useState(''); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false); const [forgot,setForgot]=useState(false);
  const fails=useRef(0), lockedUntil=useRef(0);
  const choose=p=>{ if(p.pin){ setAsk(p); setPin(''); setErr(''); setForgot(false); } else onPick(p.id); };
  const submit=async e=>{ e.preventDefault(); if(busy||!pin) return;
    const wait=Math.ceil((lockedUntil.current-Date.now())/1000); if(wait>0){ setErr(`יותר מדי ניסיונות. נסו שוב בעוד ${wait} שניות.`); return; }
    setBusy(true); const ok=await checkPin(pin, ask.pin); setBusy(false);
    if(ok){ fails.current=0; onPick(ask.id); return; }
    fails.current++; setPin(''); if(fails.current>=5){ lockedUntil.current=Date.now()+30000; fails.current=0; setErr('יותר מדי ניסיונות שגויים. נסו שוב בעוד 30 שניות.'); } else setErr('הקוד לא נכון. נסו שוב.'); };
  return (<main id="main" dir="rtl" className="min-h-full font-he grid place-items-center gutter" style={{paddingBlock:'32px'}}>
    <div className="card w-full p-6 sm:p-8 flex flex-col gap-5 rise" style={{maxWidth:'30rem'}}>
      {!ask ? <>
        <h1 className="text-2xl font-bold">מי לומד עכשיו?</h1>
        <div className="flex flex-col gap-2">{list.map(p=><button key={p.id} onClick={()=>choose(p)} className="btn-line rounded-xl p-3 flex items-center gap-3 text-start">
          <span className="w-12 h-12 rounded-xl grid place-items-center text-2xl bg-sunk" aria-hidden="true">{p.avatar}</span><span className="font-bold text-lg flex-1"><bdi>{p.name}</bdi></span>
          {p.pin&&<span className="text-muted" title="נעול בקוד"><IconLock size={16}/></span>}<IconChevL size={18}/></button>)}</div>
        <button className="btn btn-ghost py-3 px-5 self-start" onClick={onAdd}><IconPlus size={18}/>משתמש נוסף</button>
      </> : <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex items-center gap-3"><span className="w-14 h-14 rounded-xl grid place-items-center text-3xl bg-sunk" aria-hidden="true">{ask.avatar}</span>
          <div><h1 className="text-2xl font-bold">שלום, <bdi>{ask.name}</bdi></h1><p className="text-sm text-muted flex items-center gap-1"><IconLock size={13}/>המשתמש הזה נעול בקוד</p></div></div>
        <label htmlFor="pf-unlock" className="font-semibold">קוד הנעילה</label>
        <input id="pf-unlock" type="password" dir="ltr" className="field text-left text-lg" autoFocus autoComplete="off" maxLength={32} value={pin} onChange={e=>{ setPin(e.target.value); setErr(''); }}/>
        {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{err}</div>}
        <div className="flex gap-2 flex-wrap"><button className="btn btn-primary py-3 px-6" disabled={!pin||busy}>כניסה</button>
          <button type="button" className="btn btn-ghost py-3 px-5" onClick={()=>setAsk(null)}>חזרה</button></div>
        <div className="text-sm flex items-center gap-3 flex-wrap">
          {!forgot ? <button type="button" className="hit text-muted underline" onClick={()=>setForgot(true)}>שכחתי את הקוד</button>
          : <><span>אי אפשר לשחזר את הקוד. אפשר רק למחוק את המשתמש <bdi>{ask.name}</bdi> ואת כל ההתקדמות שלו.</span>
              <button type="button" className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={()=>{ onForget(ask.id); setAsk(null); }}>מחיקת המשתמש</button>
              <button type="button" className="btn btn-ghost py-2 px-3" onClick={()=>setForgot(false)}>ביטול</button></>}
        </div>
      </form>}
    </div>
  </main>);
}
function ProfileSheet({profile, count, onClose, onRename, onSwitch, onAdd, onDelete, onSetPin, toast, state, actions}){
  const [closing, close]=useClosing(onClose);
  const [name,setName]=useState(profile.name); const [avatar,setAvatar]=useState(profile.avatar); const [confirm,setConfirm]=useState(false);
  const mref=useModal(close);
  const changed=name.trim()&&(name.trim()!==profile.name||avatar!==profile.avatar);
  const [cur,setCur]=useState(''); const [next,setNext]=useState(''); const [pinErr,setPinErr]=useState('');
  const savePin=async(remove)=>{ setPinErr('');
    if(profile.pin && !(await checkPin(cur, profile.pin))){ setPinErr('הקוד הנוכחי לא נכון.'); return; }
    if(remove){ onSetPin(null); setCur(''); setNext(''); toast('קוד הנעילה הוסר'); return; }
    if(next.length<PIN_MIN){ setPinErr(`הקוד צריך לפחות ${PIN_MIN} תווים.`); return; }
    onSetPin(await makePin(next)); setCur(''); setNext(''); toast(profile.pin?'קוד הנעילה הוחלף':'קוד הנעילה נשמר. מעכשיו הכניסה למשתמש הזה במכשיר הזה דורשת קוד'); };
  return (<div ref={mref} className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="הגדרות המשתמש" className={`sheet card w-full sm:max-w-md rounded-b-none sm:rounded-[20px] p-5 flex flex-col gap-4 ${closing?'out':''}`} style={{maxHeight:'92vh', overflowY:'auto', paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3"><h2 className="text-xl font-bold me-auto">המשתמש שלי</h2><button className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <form className="flex flex-col gap-3" onSubmit={e=>{ e.preventDefault(); if(changed){ onRename(name.trim().slice(0,24), avatar); close(); } }}>
        <label htmlFor="pf-rename" className="font-semibold">שם</label>
        <input id="pf-rename" dir="auto" className="field" maxLength={24} value={name} onChange={e=>setName(e.target.value)}/>
        <div className="flex flex-wrap gap-1.5">{AVATARS.map(e=><button type="button" key={e} aria-pressed={avatar===e} aria-label={'דמות '+e} onClick={()=>setAvatar(e)} className="w-11 h-11 rounded-xl text-2xl grid place-items-center" style={{background:avatar===e?'var(--primary-soft)':'var(--sunk)', boxShadow:avatar===e?'0 0 0 2px var(--primary) inset':'none'}}>{e}</button>)}</div>
        <button className="btn btn-primary py-2.5 px-5 self-start" disabled={!changed}>שמירה</button>
      </form>
      <CloudCard state={state} actions={actions} toast={toast} onClose={close}/>
      <form className="border-t border-line pt-4 flex flex-col gap-3" onSubmit={e=>{ e.preventDefault(); savePin(false); }}>
        <div className="font-semibold flex items-center gap-2"><IconLock size={16}/>נעילת המשתמש במכשיר הזה<span className="tag" style={profile.pin?{background:'var(--good-soft)', color:'var(--good)'}:{}}>{profile.pin?'נעול בקוד':'לא נעול'}</span></div>
        <p className="text-xs text-muted leading-relaxed">קוד קצר שמונע מאחרים במכשיר הזה להיכנס למשתמש שלך. זה לא החשבון: הוא לא קשור למייל ולא נשמר בענן.</p>
        {profile.pin&&<input id="pf-pin-cur" type="password" dir="ltr" className="field text-left" autoComplete="off" maxLength={32} placeholder="הקוד הנוכחי" aria-label="הקוד הנוכחי" value={cur} onChange={e=>{ setCur(e.target.value); setPinErr(''); }}/>}
        <input id="pf-pin-new" type="password" dir="ltr" className="field text-left" autoComplete="off" maxLength={32} placeholder={profile.pin?'קוד חדש':'קוד נעילה (לפחות 4 תווים)'} aria-label="קוד נעילה חדש" value={next} onChange={e=>{ setNext(e.target.value); setPinErr(''); }}/>
        {pinErr&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{pinErr}</div>}
        <div className="flex gap-2 flex-wrap"><button className="btn btn-primary py-2.5 px-5" disabled={!next||(profile.pin&&!cur)}>{profile.pin?'החלפת קוד':'הגדרת קוד נעילה'}</button>
          {profile.pin&&<button type="button" className="btn btn-ghost py-2.5 px-4" disabled={!cur} onClick={()=>savePin(true)}>הסרת הקוד</button>}</div>
      </form>
      <div className="border-t border-line pt-4 flex gap-2 flex-wrap">
        <button className="btn btn-ghost py-2.5 px-4" onClick={onSwitch}>{count>1?'החלפת משתמש':'מסך המשתמשים'}</button>
        <button className="btn btn-ghost py-2.5 px-4" onClick={onAdd}><IconPlus size={18}/>משתמש נוסף</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {!confirm ? <button className="hit text-muted underline flex items-center gap-1" onClick={()=>setConfirm(true)}><IconTrash size={15}/>מחיקת המשתמש הזה</button>
        : <><span>למחוק את <bdi>{profile.name}</bdi> ואת כל ההתקדמות שלו? אי אפשר לשחזר.</span><button className="btn py-2 px-3" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={onDelete}>כן, למחוק</button><button className="btn btn-ghost py-2 px-3" onClick={()=>setConfirm(false)}>ביטול</button></>}
      </div>
      <p className="text-xs text-muted">המשתמשים נשמרים בדפדפן הזה בלבד. קוד הנעילה נועל את הכניסה למשתמש במכשיר הזה בלבד. אין דרך לשחזר קוד שנשכח.</p>
    </div>
  </div>);
}
/* ---------- home: where the site opens. Built only from existing state and screens ---------- */
function homeNext(state){       // the next step in the course the learner is in (the structured course first)
  const open=COURSES.filter(c=>!courseProgress(c,state).complete);
  const course=open.find(c=>courseProgress(c,state).lessons>0)||open[0]; if(!course) return null;
  const ns=nextStep(course,state); return ns?{course, ...ns}:null;
}
const LESSON_KIND={video:'שיעור וידאו', rich:'שיעור', story:'סיפור', talk:'שיחה', words:'מילים'};
function Home({state, stories, known, streak, profile, go, openStory, openTalk, openCourse, startReview, onSearch, voice, rate}){
  const tk=todayKey(); const t0=(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const nx=homeNext(state);
  const last=state.lastStory&&stories.find(s=>s.id===state.lastStory.id);
  const recs=useMemo(()=>recommendStories(stories, state, known),[stories, state.words, state.storiesDone, known, state.unlocked]);
  const shortStory=useMemo(()=>recs.slice(0,6).sort((a,b)=>storyData(a).words-storyData(b).words)[0]||null,[recs]);
  const fallback=last||recs[0]||null;
  // the "סיפור מומלץ" card below: not the same story as the one already offered as the next step
  const featured=recs.find(s=>(!shortStory||s.id!==shortStory.id)&&(nx||!fallback||s.id!==fallback.id))||null;
  const due=dueWords(state); const [ask,setAsk]=useState(0); const [runner,setRunner]=useState(null); const [askRun,setAskRun]=useState(null); const rn0=(unitHero(state)||{}).n||0;

  // ONE clear direction: the next step as a single hero card (mid-lesson > practice what was just learned > next unit > course step > story)
  const hh=homeHero(state, due); const unitRun=n=>()=>openCourse(seriesJump(n));
  let hero=null;
  if(hh){ const x=SERIES_ALL[hh.n-1]; const mins=SERIES_LIVE[hh.n].mins; const ut='יחידה '+hh.n+': '+x.title;
    if(hh.kind==='mid') hero={kind:'mid', posterN:hh.n, title:ut, meta:unitMeta(hh.n), btn:'המשך מאיפה שעצרת: יחידה '+hh.n, run:unitRun(hh.n)};
    else if(hh.kind==='practice') hero={kind:'practice', posterN:hh.n, title:'חזרה קצרה על מה שלמדת', meta:<>כ־2 דקות · כרטיסי חזרה אחרי יחידה <span className="num">{hh.n}</span></>, btn:`תרגל את מה שלמדת · ${hh.words} מילים`, run:()=>startReview(due.slice(0,hh.words)), alt:hh.next?{label:'או המשך ישר ליחידה '+hh.next.n, run:unitRun(hh.next.n)}:null};
    else if(hh.kind==='next') hero={kind:'next', posterN:hh.n, title:ut, meta:unitMeta(hh.n), btn:`המשך ליחידה ${hh.n} · ${mins} דקות`, run:unitRun(hh.n)};
    else hero={kind:'new', posterN:hh.n, title:ut, meta:unitMeta(hh.n), btn:hh.n===1?`התחל מהשיעור הראשון · ${mins} דקות`:`התחל מיחידה ${hh.n} · ${mins} דקות`, run:unitRun(hh.n)};
  } else if(nx){ const l=nx.lesson;
    hero={kind:'next', icon:nx.course.cover, title:nx.quiz?'מבחן יחידה: '+nx.topic.title:l.title, meta:nx.quiz?'סיימת את כל השיעורים ביחידה':nx.topic.title+' · '+(LESSON_KIND[l.type]||'שיעור'), btn:'המשך',
      run:()=>{ if(nx.quiz) openCourse({cid:nx.course.id}); else if(l.type==='story') openStory(l.story); else if(l.type==='talk') openTalk(l.talk); else openCourse({cid:nx.course.id, tid:nx.topic.id, lid:l.id}); } };
  } else if(fallback){ const st=storyStats(fallback,state);
    hero={kind:'next', icon:'📖', title:fallback.title, meta:(fallback.he?fallback.he+' · ':'')+readMinutes(st.d.words)+' דק׳ קריאה', btn:last?'המשך לקרוא':'בוא נקרא', run:()=>openStory(fallback.id)}; }
  else hero={kind:'new', icon:'📖', title:'סיפור קצר', meta:'כמה דקות של קריאה', btn:'לספרייה', run:()=>go('read')};
  if(zeroFirst(state)) hero=zeroHero(()=>openCourse({zero:true}));

  // "עוד להיום": three short, optional steps that open existing screens
  const reviewedToday=Object.values(state.srs||{}).some(c=>c&&c.last>=t0);
  const readToday=Object.values(state.storiesDone||{}).some(d=>d&&d.date===tk);
  const practicedToday=!!(state.daily&&state.daily.date===tk&&state.daily.practice) || Object.values(state.talkDone||{}).includes(tk);
  const steps=[
    { icon:<IconBolt size={20}/>, done:reviewedToday&&!due.length, title:due.length?<><span className="num">{due.length}</span> כרטיסים מחכים לחזרה</>:'כרטיסי חזרה',
      sub:due.length?'כל מילה חוזרת בדיוק כשמתחילים לשכוח אותה':reviewedToday?'חזרת על כל הכרטיסים של היום':'אין כרטיסים שמחכים כרגע', run:()=>due.length?startReview(due.slice(0,30)):go('practice') },
    { icon:<IconBook size={20}/>, done:readToday, title:'סיפור קצר אחד', sub:shortStory?<bdi dir="ltr" lang="en" className="book">{shortStory.title}</bdi>:'מהספרייה', run:()=>shortStory?openStory(shortStory.id):go('read') },
    { icon:<IconChat size={20}/>, done:practicedToday, title:'תרגול קצר: מילים ומשפטים', sub:'שתי דקות, או שיחה מוכנה עם לומי', run:()=>go('practice') }
  ];
  const doneN=steps.filter(s=>s.done).length;

  // compact progress row: the same numbers the site already computes
  const ws=new Date(); const weekStart=addDays(ws,-ws.getDay());
  const activeDays=Array.from({length:7},(_,i)=>state.history[dayKey(addDays(weekStart,i))]).filter(h=>h&&(h.xp>0||h.words>0)).length;
  const nm=profile.name; const started=known>0||Object.keys((state.courses&&state.courses.lessons)||{}).length>0;
  const sub=doneN===3?'סיימת את הדקות של היום. אפשר לנוח, או לקרוא עוד סיפור.':!started?'כאן לומדים אנגלית בסבלנות, כמה דקות ביום.':'כמה דקות של אנגלית, ומתקדמים.';
  // "הסדרה של אורי": the next lesson first, then the ones after it (3 cards)
  const startN=(hh&&hh.kind==='practice'&&hh.next)?hh.next.n:(hh?hh.n:rn0)||1; let teaser=SERIES_ALL.filter(x=>x.n>=startN).slice(0,3); if(teaser.length<3) teaser=SERIES_ALL.slice(-3);
  // "השבוע שלך": minutes per day of this week + the same numbers the site already computes
  const weekDays=Array.from({length:7},(_,i)=>{ const d=addDays(weekStart,i); const h=state.history[dayKey(d)]||{}; return {i, mins:h.secs?minsLabel(h.secs):0, today:dayKey(d)===tk}; });
  const weekMax=Math.max(15,...weekDays.map(d=>d.mins)); const weekMins=weekDays.reduce((s,d)=>s+d.mins,0);
  // "מילים לחזרה": a few words with a speaker that reads an example sentence (or the word itself)
  // "המילה של היום": one easy everyday word with its meaning, a speaker and one short example (changes every day)
  const wotd=useMemo(()=>{ const pool=WOTD_POOL.filter(k=>MEANING[k]&&examplesFor(k, STORIES).length>0); if(!pool.length) return null; const k=pool[dayIndex()%pool.length]; const i=wordInfo(k); return {k, he:i.he||'', pron:i.pron||'', exs:examplesFor(k, STORIES)}; },[]);
  // "מה למדת השבוע": one human sentence instead of bare numbers
  const weekWords=Array.from({length:7},(_,i)=>(state.history[dayKey(addDays(weekStart,i))]||{}).learned||0).reduce((a,b)=>a+b,0);
  const weekSentence=weekWords>0?`השבוע למדת ${weekWords===1?'מילה חדשה אחת':weekWords+' מילים חדשות'}. כל הכבוד`:weekMins>0?`השבוע למדת ${weekMins} דקות ב־${activeDays} ${activeDays===1?'יום':'ימים'}. כל הכבוד`:'השבוע עוד לא התחלנו. כל התחלה קטנה נחשבת.';  const lastU=lastLessonPick(state); const lastKeys=new Set(lastU?lastU.keys:[]); const dueSorted=[...due.filter(k=>lastKeys.has(k)), ...due.filter(k=>!lastKeys.has(k))]; const fromLast=lastU&&due.filter(k=>lastKeys.has(k)).length>=3;
  const reviewKey=dueSorted.slice(0,8).join(',');
  const reviewWords=useMemo(()=>dueSorted.slice(0,8).map(k=>{ const ex=examplesFor(k, STORIES)[0]; return {k, he:wordInfo(k).he||'', ex, say:ex?ex.en:k}; }),[reviewKey]);

  return (<div className="hc-home">
    <NextStepCard hero={hero}/>

    <div className="hc-calm">
      <div className="hc-grid">
        <div className="hc-col">
          {wotd&&<section className="hm-card hm-wotd" aria-labelledby="hc-wotd">
            <img className="hm-david" src="assets/david_face.png" alt="" width="160" height="160" decoding="async" draggable="false" loading="lazy"/>
            <h2 id="hc-wotd" className="section-title">המילה של היום</h2>
            <div className="hm-wotd-row"><span dir="ltr" lang="en" className="book hm-word">{wotd.k}</span>
              <button type="button" className="btn btn-primary hm-say" onClick={()=>speakText(wotd.k, rate||1, voice)} aria-label={'השמע את המילה '+wotd.k}><IconSpeaker size={20}/></button></div>
            <p className="hm-wotd-he"><Bi>{wotd.he}</Bi><span className="hm-wotd-pron">{wotd.pron}</span></p>
            <ExampleSet examples={wotd.exs} wordKey={wotd.k} voice={voice} rate={rate}/>
          </section>}

          <section className="hm-card hc-week" aria-labelledby="hc-week">
            <div className="flex items-center gap-3"><h2 id="hc-week" className="section-title me-auto">מה למדת השבוע</h2><button type="button" className="hit text-primary font-semibold text-sm" onClick={()=>go('progress')}>לכל ההתקדמות</button></div>
            <p className="hm-week-sentence">{weekSentence}</p>
            <div className="hc-bars" aria-hidden="true">{weekDays.map(d=><div key={d.i} className={`hc-bar-col ${d.today?'is-today':''}`}><div className="hc-bar-track"><div className="hc-bar-fill" style={{height:Math.round(d.mins/weekMax*100)+'%'}}></div></div><span className="hc-bar-day">{HE_DAYS[d.i]}</span></div>)}</div>
            <p className="sr-only">{weekDays.map(d=>'יום '+HE_DAYS[d.i]+': '+d.mins+' דקות').join(', ')}</p>
            <p className="hc-week-sum">{weekMins>0||activeDays>0?<><b className="num">{weekMins}</b> דקות · <b className="num">{activeDays}</b> מתוך <span className="num">7</span> ימים פעילים · <b className="num">{known}</b> מילים מוכרות</>:'הדקות הראשונות שלך יופיעו כאן אחרי השיעור הראשון.'}</p>
          </section>
        </div>

        <div className="hc-col">
          <section className="hc-series" aria-labelledby="hc-series-h">
            <div className="flex items-center gap-3"><h2 id="hc-series-h" className="section-title me-auto">הסדרה של אורי</h2><button className="hit text-primary font-semibold text-sm" onClick={()=>go('courses')}>לכל 15 השיעורים</button></div>
            <ul className="hc-series-grid">{teaser.map(x=><PosterCard key={x.n} n={x.n} title={x.title} done={seriesDone(x.n,state)} onOpen={()=>{ if(!SERIES_LIVE[x.n]) go('courses'); else if(rn0&&x.n>rn0&&!seriesDone(x.n,state)) setAsk(x.n); else openCourse(seriesJump(x.n)); }}/>)}</ul>
          </section>

          {featured&&<section className="hc-story" aria-labelledby="hc-story-h">
            <div className="flex items-center gap-3"><h2 id="hc-story-h" className="section-title me-auto">סיפור מומלץ</h2><button className="hit text-primary font-semibold text-sm" onClick={()=>go('read')}>לכל הסיפורים</button></div>
            <StoryCard story={featured} state={state} onOpen={()=>openStory(featured.id)}/>
          </section>}
        </div>

        <div className="hc-wide hc-pair">
          <section className="hm-card" aria-labelledby="hc-today">
            <div className="flex items-center gap-3"><h2 id="hc-today" className="section-title me-auto">עוד להיום, אם בא לך</h2><span className="meta num">{doneN}/3</span></div>
            <ul className="flex flex-col gap-2">
              {steps.map((s,i)=><li key={i}><button onClick={s.run} className="hm-step">
                <span className="hm-step-ic" style={s.done?{background:'var(--known-bg)', color:'var(--known)'}:undefined} aria-hidden="true">{s.icon}</span>
                <span className="flex-1 min-w-0"><span className="font-semibold block">{s.title}</span><span className="text-sm text-muted block truncate">{s.sub}</span></span>
                {s.done?<span className="tag" style={{background:'var(--good-soft)', color:'var(--good)'}}><IconCheck size={12}/>בוצע היום</span>:<IconChevL size={18}/>}
              </button></li>)}
            </ul>
          </section>

          <section className="hm-card" aria-labelledby="hc-review">
            <div className="flex items-center gap-3 flex-wrap"><h2 id="hc-review" className="section-title me-auto">{fromLast?'מילים מהשיעור האחרון':'מילים לחזרה'}</h2>{due.length>0&&<button type="button" className="btn btn-line px-4" onClick={()=>startReview(due.slice(0,30))}>התחל חזרה (<span className="num">{Math.min(30,due.length)}</span>)</button>}</div>
            {due.length>0
              ? <ul className="hc-chips">{reviewWords.map(w=><li key={w.k} className="hc-chip"><span className="hc-chip-txt"><bdi dir="ltr" lang="en" className="book font-bold">{w.k}</bdi><span className="hc-chip-he"><Bi>{w.he}</Bi></span></span>
                  <button type="button" className="hc-chip-btn" onClick={()=>speakText(w.say, rate||1, voice)} aria-label={w.ex?'השמע משפט לדוגמה עם '+w.k:'השמע את המילה '+w.k}><IconSpeaker size={16}/></button></li>)}</ul>
              : <EmptyState icon={started?<IconCheck size={22}/>:<IconBook size={22}/>} title={started?'אין מילים שמחכות לחזרה כרגע':'המילים שתלמד יחכו כאן לחזרה'} text={started?'כל מילה חוזרת בדיוק כשמתחילים לשכוח אותה, ולכן עכשיו אפשר לנוח או לקרוא סיפור.':'אחרי השיעור הראשון נבנה לך כאן חזרה קצרה מהמילים שלמדת.'} action={started?'לסיפורים':'לכל השיעורים'} onAction={()=>go(started?'read':'courses')}/>}
          </section>
        </div>
      </div>
      <button type="button" className="hc-searchbtn" onClick={onSearch}><IconSearch size={18}/>חיפוש מילה במילון</button>
    </div>
    {ask>0&&rn0&&<OrderDialog chosenN={ask} nextN={rn0} onClose={()=>setAsk(0)} onGo={()=>{ setAsk(0); openCourse(seriesJump(rn0)); }} onStay={()=>{ const n=ask; setAsk(0); openCourse(seriesJump(n)); }}/>}
  </div>);
}

function Root(){
  const [profiles,setProfiles]=useState(loadProfiles);
  const [active,setActive]=useState(()=>{ const p=loadProfiles(); return p.list.length===1&&!p.list[0].pin?p.list[0].id:null; });
  const [adding,setAdding]=useState(false); const [signIn,setSignIn]=useState(false); const [legal,setLegal]=useState(null);
  useEffect(()=>saveProfiles(profiles),[profiles]);
  const create=async({name,avatar,goal,pin,extra,start})=>{
    const lock=pin?await makePin(pin):null;
    const first=profiles.list.length===0; const id='p'+Date.now().toString(36);
    const key=first?'lumi-english-v1':'lumi-english-v1:'+id;        // the first learner keeps any progress saved before profiles existed
    try{ if(!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({...DEFAULT_STATE, goal, ...(extra||{})})); }catch(e){}
    setProfiles(p=>({list:[...p.list,{id,name,avatar,key,...(lock?{pin:lock}:{})}]})); setActive(id); setAdding(false); };
  const remove=(id)=>{ const x=profiles.list.find(q=>q.id===id); if(!x) return; try{ synth&&synth.cancel(); localStorage.removeItem(x.key); }catch(e){} setProfiles(p=>({list:p.list.filter(q=>q.id!==id)})); setActive(null); };
  const prof=profiles.list.find(x=>x.id===active);
  if(adding||!profiles.list.length){ const first=!profiles.list.length;
    // first visit = the original welcome (name, then straight to learning). Signing in with an account restores the saved progress into a new profile.
    return <><ProfileForm first={first} onCreate={create} onCancel={profiles.list.length?()=>setAdding(false):null} onSignIn={first&&ACCOUNTS?()=>setSignIn(true):null}/>
      {signIn&&<AuthDialog start="signin" state={DEFAULT_STATE} toast={()=>{}} openLegal={setLegal} onClose={()=>setSignIn(false)} onSignedIn={remote=>{ setSignIn(false); create({name:'חבר', avatar:AVATARS[0], goal:(remote&&remote.goal)||30, pin:'', extra:remote||{}}); }}/>}
      {legal&&<LegalModal page={legal} onClose={()=>setLegal(null)}/>}</>; }
  if(!prof) return <ProfilePicker list={profiles.list} onPick={setActive} onAdd={()=>setAdding(true)} onForget={remove}/>;
  LS_KEY=prof.key;
  return <App key={prof.id} profile={prof} count={profiles.list.length}
    onSwitch={()=>{ try{ synth&&synth.cancel(); }catch(e){} setActive(null); }} onAddProfile={()=>{ try{ synth&&synth.cancel(); }catch(e){} setAdding(true); }}
    onRename={(name,avatar)=>setProfiles(p=>({list:p.list.map(x=>x.id===prof.id?{...x,name,avatar}:x)}))}
    onSetPin={(pin)=>setProfiles(p=>({list:p.list.map(x=>{ if(x.id!==prof.id) return x; const y={...x}; if(pin) y.pin=pin; else delete y.pin; return y; })}))}
    onDelete={()=>remove(prof.id)}/>;
}

/* ---------- app ---------- */
function App({profile, count, startAt, onSwitch, onAddProfile, onRename, onDelete, onSetPin}){
  const [state,setState]=useState(loadState);
  const [profileOpen,setProfileOpen]=useState(false);
  const [tab,setTab]=useState('home');    // the site opens on the home page
  const lastSub=useRef({learn:'courses', train:'practice', me:'progress'});
  if(PLACE_OF[tab]&&PLACE_OF[tab]!=='home') lastSub.current[PLACE_OF[tab]]=tab;
  const [courseJump,setCourseJump]=useState(null);
  useEffect(()=>{ if(!ANALYTICS_CODE||!PROD_HOST.test(location.hostname)||document.getElementById('gc-count')) return; const s=document.createElement('script'); s.id='gc-count'; s.async=true; s.src='https://gc.zgo.at/count.js'; s.setAttribute('data-goatcounter','https://'+ANALYTICS_CODE+'.goatcounter.com/count'); document.head.appendChild(s); },[]);
  const [storyId,setStoryId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [burst,setBurst]=useState(null);
  const [toastMsg,setToastMsg]=useState(null);
  const voices=useVoices();
  const voice=useMemo(()=>chooseVoice(voices, state.settings.voice),[voices, state.settings.voice]);
  const warned=useRef(false);
  useEffect(()=>{ if(!saveState(state) && !warned.current){ warned.current=true; setTimeout(()=>NOTIFY('הדפדפן חוסם שמירה מקומית, ולכן ההתקדמות לא תישמר אחרי סגירת העמוד.'),600); } },[state]);
  CUSTOM=state.customDict||{}; NET=state.netDict||{};
  const voiceRef=useRef(()=>{}); const [listening,setListening]=useState(false);
  const [flash,setFlash]=useState(null);
  const [card,setCard]=useState(null);
  const openCard=useCallback((key, display)=>{ const k=String(key).toLowerCase(); if(k) setCard({key:k, display:display||k}); },[]);
  const session=useSession();
  const community=useCommunity();
  const [legal,setLegal]=useState(null); const [reporting,setReporting]=useState(null); const [recovery,setRecovery]=useState(RECOVERY);
  useEffect(()=>{ const f=()=>{ if(RECOVERY) setRecovery(true); }; SESSION_SUBS.add(f); return ()=>SESSION_SUBS.delete(f); },[]);
  const stories=useMemo(()=>[...STORIES, ...state.userStories, ...community],[state.userStories, community]);

  const toast=useCallback((m)=>{ const id=Math.random(); setToastMsg({m,id});
    setTimeout(()=>setToastMsg(t=>t&&t.id===id?{...t,out:true}:t),3600); setTimeout(()=>setToastMsg(t=>t&&t.id===id?null:t),3850); },[]);
  NOTIFY=toast;
  // the greeting toast on every visit was removed (the home page greets by name); only the group invitation is announced
  useEffect(()=>{ if(!(JOIN_CODE&&!state.group)) return; const t=setTimeout(()=>toast(`הוזמנת לקבוצת לימוד! הקוד ${JOIN_CODE} כבר ממולא`),500); setTab('group'); return ()=>clearTimeout(t); },[]);
  const reading=useRef(false);
  const celebrate=useCallback((big)=>{ /* no confetti in this version: a dignified, quiet learning space (the toast messages stay) */ },[]);
  useEffect(()=>{ if(!burst) return; const t=setTimeout(()=>setBurst(null), burst.big?3200:2000); return ()=>clearTimeout(t); },[burst]);

  const tk=todayKey(); const todayH=state.history[tk]||{xp:0,met:false};
  const prevMet=useRef(todayH.met);
  useEffect(()=>{ if(todayH.met && !prevMet.current){ celebrate(true); toast('השלמת את היעד היומי! הרצף ממשיך'); } prevMet.current=todayH.met; },[todayH.met]);
  const known=Object.keys(state.words).filter(k=>state.words[k]==='known' && !NAMES.has(k)).length;
  useEffect(()=>{ const st=badgeStats(state); const got=state.badges; const earned=BADGES.filter(b=>(st[b.of]||0)>=b.need && !(got&&got[b.id]));
    const o={}; earned.forEach(b=>{ o[b.id]=todayKey(); });
    if(!got){ actions.setBadges(o); return; }          // first run: record what is already earned, silently
    if(!earned.length) return; actions.setBadges(o);
    const t=setTimeout(()=>{ toast(`הישג חדש: ${earned[0].icon} ${earned[0].name}`+(earned.length>1?` ועוד ${earned.length-1}`:'')); celebrate(false); },400); return ()=>clearTimeout(t); },[state.storiesDone, state.words, state.history, state.totals, state.talkDone, state.phon, state.userStories, state.group, state.courses]);
  const lv=levelFor(known); const prevLv=useRef(lv);
  useEffect(()=>{ if(lv>prevLv.current){ celebrate(true); toast(`עלית לשלב ${lv}: ${LEVELS[lv-1].name}. נפתחו סיפורים חדשים!`); } prevLv.current=lv; },[lv]);

  const actions=useMemo(()=>({
    addXP:(n)=>setState(s=>withXP(s,n)),
    addSecs:(n)=>setState(s=>{ const d=todayKey(); const h=s.history[d]||{xp:0,met:false}; return {...s, history:{...s.history,[d]:{...h, secs:(h.secs||0)+n}}}; }),   // active learning time, counted while the page is visible and the learner is interacting
    setSetting:(k,v)=>setState(s=>({...s, settings:{...s.settings,[k]:v}})),
    setGoal:(g)=>setState(s=>{ const d=todayKey(); const h=s.history[d]; const n={...s, goal:g}; if(h && h.xp>=g && !h.met) n.history={...s.history,[d]:{...h, met:true}}; return n; }),
    setWordStatus:(k,st)=>setState(s=>{ const prev=s.words[k]; if(prev===st) return s;
      let xp=0; if(st==='known' && !NAMES.has(k)) xp=2; else if(st==='learning' && !prev) xp=1;
      return withXP(withStatus(s,k,st), xp); }),
    reviewWord:(k, grade)=>setState(s=>{ const c=srsNext(srsCard(s,k), grade); let n={...s, srs:{...(s.srs||{}),[k]:c}, totals:{...s.totals, reviews:((s.totals&&s.totals.reviews)||0)+1}};
      if(c.iv>=GRADUATE_DAYS && s.words[k]==='learning') n=withStatus(n,k,'known');
      return withXP(n, grade>=2?2:1); }),
    setLastStory:(id,p)=>setState(s=>({...s, lastStory:id?{id, p:p||0, at:Date.now()}:null})),
    setBadges:(b)=>setState(s=>({...s, badges:{...(s.badges||{}),...b}})),
    restore:(data)=>setState(()=>({...DEFAULT_STATE, ...data, settings:{...DEFAULT_STATE.settings, ...(data.settings||{})}, totals:{...DEFAULT_STATE.totals, ...(data.totals||{})}})),
    setCustom:(k,he)=>setState(s=>({...s, customDict:{...s.customDict,[k]:he}})),
    setNet:(k,e)=>setState(s=>({...s, netDict:{...(s.netDict||{}),[k]:e}})),
    clearWord:(k)=>setState(s=>{ const w={...s.words}; delete w[k]; return {...s, words:w}; }),
    markRead:(story, idxs)=>setState(s=>withRead(s, story, idxs)),
    finishStory:(story, markAll)=>setState(s=>{ let words=s.words, bonus=0;
      let base=s;
      if(markAll){ for(const k of storyData(story).keys) if(!base.words[k]&&!NAMES.has(k)){ base=withStatus(base,k,'known'); bonus++; } else if(!base.words[k]) base=withStatus(base,k,'known'); }
      words=base.words; s=base;
      const prev=s.storiesDone[story.id]; const already=prev&&prev.date===todayKey();
      const n=withRead({...s, lastStory:s.lastStory&&s.lastStory.id===story.id?null:s.lastStory, words, storiesDone:{...s.storiesDone,[story.id]:{date:todayKey(), times:((prev&&prev.times)||0)+1}}}, story, story.paras.map((_,i)=>i));
      return withXP(n, (already?0:10)+Math.min(bonus,15)); }),
    recordAnswer:(k, ok)=>setState(s=>{ const q=s.quiz[k]||{c:0,w:0};
      if(s.words[k]==='learning'){ const c=srsNext(srsCard(s,k), ok?2:0); s={...s, srs:{...(s.srs||{}),[k]:c}}; }
      return withXP({...s, quiz:{...s.quiz,[k]:{c:q.c+(ok?1:0), w:q.w+(ok?0:1)}}, totals:{...s.totals, answered:s.totals.answered+1, correct:s.totals.correct+(ok?1:0)}}, ok?3:1); }),
    recordSound:(k, ok)=>setState(s=>{ const ph=s.phon||{}; const q=ph[k]||{c:0,w:0}; return withXP({...s, phon:{...ph,[k]:{c:q.c+(ok?1:0), w:q.w+(ok?0:1)}}}, ok?2:0); }),
    completeLesson:(id,words)=>setState(s=>{ const cs=csOf(s); const first=!cs.lessons[id]; let n=s; for(const k of words||[]) if(!n.words[k]&&!NAMES.has(k)) n=withStatus(n,k,'learning'); return withXP({...n, courses:{...cs, lessons:{...cs.lessons,[id]:todayKey()}}}, first?8:2); }),
    passTopic:(tid,pct,cid)=>setState(s=>{ const cs=csOf(s); const ok=pct>=PASS_PCT; if(!ok) return withXP(s,1); const first=!cs.topics[tid]; const prev=cs.topics[tid];
      return withXP({...s, courses:{...cs, topics:{...cs.topics,[tid]:{pct:Math.max(pct,(prev&&prev.pct)||0), date:todayKey()}}, perfect:(cs.perfect||0)+(pct===100&&!(prev&&prev.pct===100)?1:0)}}, first?15:3); }),
    issueCert:(cid,avg)=>setState(s=>{ const cs=csOf(s); if(cs.certs[cid]) return s; return withXP({...s, courses:{...cs, certs:{...cs.certs,[cid]:{date:todayKey(), avg}}}}, 30); }),
    noteCopy:(en)=>setState(s=>({...s, copySeen:{...(s.copySeen||{}),[en]:((s.copySeen||{})[en]||0)+1}})),
    finishTalk:(id)=>setState(s=>{ const td=s.talkDone||{}; const first=!td[id]||td[id]!==todayKey(); return withXP({...s, talkDone:{...td,[id]:todayKey()}}, first?10:0); }),
    noteCombo:(n)=>setState(s=>n>s.bestCombo?{...s, bestCombo:n}:s),
    noteOpen:(id)=>setState(s=>{ const cs=csOf(s); return cs.opened===id?s:{...s, courses:{...cs, opened:id}}; }),   // the video lesson the learner opened last
    addUnitWords:(n)=>setState(s=>{ const U=typeof UNIT_CONTENT!=='undefined'&&UNIT_CONTENT[n]; if(!U) return s; let st=s; const cd={...(s.customDict||{})};   // adapter: a card for every word of the unit straight from en/he (phrases like "wake up" or "I'll" included)
      for(const w of U.words){ const k=w.en.toLowerCase(); if(!MEANING[k]&&!cd[k]) cd[k]=w.he; if(!st.words[k]) st=withStatus(st,k,'learning'); }
      const cs=csOf(st); return {...st, customDict:cd, courses:{...cs, unitWords:{...(cs.unitWords||{}), [n]:todayKey()}}}; }),    setOnboard:(o)=>setState(s=>({...s, onboard:{...(s.onboard||{}), ...o}})),   // quiet optional choice in "אני": where to start
    setAcct:(a)=>setState(s=>({...s, acct:{...(s.acct||{}), ...a}})),   // account offer bookkeeping: how many times it was offered, and when
    setBackup:(b)=>setState(s=>({...s, backup:{...(s.backup||{}), ...b}})),   // personal backup code + "prompt already shown" flag
    markDaily:(k)=>setState(s=>{ const d=todayKey(); const cur=s.daily&&s.daily.date===d?s.daily:{date:d}; if(cur[k]) return s; return {...s, daily:{...cur,[k]:true}}; }),   // home page "today" checklist
    setNote:(id,t)=>setState(s=>({...s, notes:{...(s.notes||{}),[id]:t}})),
    setGroup:(g)=>setState(s=>({...s, group:g})),
    setCloud:(c)=>setState(s=>{ const n={...s}; if(c) n.cloud=c; else delete n.cloud; return n; }),
    unlock:(n)=>setState(s=>({...s, unlocked:{...s.unlocked,[n]:true}})),
    lock:(n)=>setState(s=>{ const u={...s.unlocked}; for(const k in u) if(+k>=n) delete u[k]; return {...s, unlocked:u}; }),
    addStory:(story)=>setState(s=>({...s, userStories:[story, ...s.userStories]})),
    deleteStory:(id)=>setState(s=>{ const sd={...s.storiesDone}; delete sd[id]; return {...s, userStories:s.userStories.filter(x=>x.id!==id), storiesDone:sd}; }),
    setParaHe:(id,p,he)=>setState(s=>({...s, userStories:s.userStories.map(x=>x.id!==id?x:{...x, paras:x.paras.map((q,i)=>i===p?{...q, he}:q)})})),
    reset:()=>{ setState(DEFAULT_STATE); prevMet.current=false; prevLv.current=1; setStoryId(null); },
  }),[]);

  const learning=Object.values(state.words).filter(s=>s==='learning').length;
  const streak=computeStreak(state.history);
  // time tracker: +15 seconds every 15s while the page is visible and there was input in the last minute (feeds "minutes today / this week")
  const lastAct=useRef(Date.now());
  useEffect(()=>{ const mark=()=>{ lastAct.current=Date.now(); }; const ev=['pointerdown','keydown','scroll','touchstart'];
    ev.forEach(e=>window.addEventListener(e,mark,{passive:true,capture:true}));
    const t=setInterval(()=>{ if(document.visibilityState==='visible' && Date.now()-lastAct.current<60000) actions.addSecs(15); },15000);
    return ()=>{ ev.forEach(e=>window.removeEventListener(e,mark,true)); clearInterval(t); }; },[]);
  // display mode: auto (follows the device), light or dark
  useEffect(()=>{ const t=state.settings.theme; const r=document.documentElement; if(t==='light'||t==='dark') r.setAttribute('data-theme',t); else r.removeAttribute('data-theme'); },[state.settings.theme]);
  const story=stories.find(s=>s.id===storyId);
  reading.current=tab==='read'&&!!story;   // no confetti over the page while reading
  // a place ("learn", "practice", "me") opens on the screen the learner used last inside it
  const [homeSearch,setHomeSearch]=useState(false);     // on a phone the home page hides the dictionary bar (one calm top row); "חיפוש מילה" brings it back
  const changeTab=(t)=>{ const v=lastSub.current[t]||t; setTab(v); setHomeSearch(false); try{ synth&&synth.cancel(); }catch(e){} window.scrollTo({top:0}); };
  const openTalk=(id)=>{ PENDING_TALK=id; setTab('talk'); window.scrollTo({top:0}); };
  const openStory=(id)=>{ setStoryId(id); setTab('read'); window.scrollTo({top:0}); };
  const openCourse=(j)=>{ setCourseJump({...j, id:Math.random()}); setTab('courses'); window.scrollTo({top:0}); };
  useEffect(()=>{ if(startAt) openCourse(seriesJump(startAt)); },[]);     // first visit: the onboarding "התחל את השיעור" opens the starting lesson
  // account (e-mail + password, MOCK in the demo): the offer to save the progress, the dialogs, and the quiet sync of the saved copy
  const auth=useAuth(); const [authDlg,setAuthDlg]=useState(null); const [offer,setOffer]=useState(false); const [mergeNote,setMergeNote]=useState(false);
  const stRef=useRef(state); stRef.current=state; const bkDirty=useRef(false);
  const lessonN=Object.keys(csOf(state).lessons).length; const prevLN=useRef(lessonN);
  const showOffer=()=>{ actions.setAcct({offers:((stRef.current.acct&&stRef.current.acct.offers)||0)+1, lastOffer:todayKey()}); setOffer(true); };
  const offerBlocked=!ACCOUNTS||auth.session||auth.pending||offer||authDlg;
  useEffect(()=>{ const was=prevLN.current; prevLN.current=lessonN;
    if(lessonN>was&&!offerBlocked&&accountOfferDue(stRef.current,'lesson')){ const t=setTimeout(showOffer,1400); return ()=>clearTimeout(t); } },[lessonN]);
  useEffect(()=>{ if(tab!=='home'||offerBlocked||!accountOfferDue(state,'idle')) return; const t=setTimeout(showOffer,1500); return ()=>clearTimeout(t); },[tab, state.history, state.words, state.acct, offerBlocked]);
  const onSignedIn=(remote)=>{ if(remote){ actions.restore(mergeProgress(stRef.current, remote)); setMergeNote(true); } setTimeout(()=>Auth.saveProgress(stRef.current),800); };
  useEffect(()=>{ bkDirty.current=true; },[state]);
  useEffect(()=>{ const t=setInterval(()=>{ if(!bkDirty.current) return; bkDirty.current=false; const s=stRef.current; const c=s.backup&&s.backup.code; if(c) saveBackup(c,s,profile); if(Auth.session()) Auth.saveProgress(s); },30000); return ()=>clearInterval(t); },[]);
  const due=dueWords(state).length;
  const place=PLACE_OF[tab]||'home';
  // DEMO a11y: a real page title per screen, a polite announcement of the screen name, and focus lands in the content when the old focus target vanished
  const screenName=(tab==='read'&&story)?story.title:(SCREEN_NAMES[tab]||'Lumi English');
  const [announce,setAnnounce]=useState('');
  const firstNav=useRef(true);
  useEffect(()=>{ document.title=screenName+' · Lumi English'; if(firstNav.current){ firstNav.current=false; return; }
    setAnnounce('עברת למסך: '+screenName);
    const t=setTimeout(()=>{ const a=document.activeElement; if(!a||a===document.body){ const m=document.getElementById('main'); m&&m.focus({preventScroll:true}); } },60); return ()=>clearTimeout(t); },[tab,storyId]);
  const showSub=place!=='home' && !(tab==='read'&&story) && !(tab==='practice'&&flash);
  // one heading row for every main screen; screens that open a lesson, a story or a session bring their own h1, and then the row steps aside
  const mainRef=useRef(null); const [inner1,setInner1]=useState(false);
  useEffect(()=>{ const m=mainRef.current; if(!m) return; const chk=()=>{ const has=!!m.querySelector('h1:not([data-tab-h1])'); setInner1(v=>v===has?v:has); }; chk(); const mo=new MutationObserver(chk); mo.observe(m,{childList:true,subtree:true}); return ()=>mo.disconnect(); },[]);

  const dictOff=!homeSearch;     // on a phone the dictionary bar is closed on every screen (so the heading row sits at the same height everywhere); the search icon in the top bar opens it
  return (<div dir="rtl" className={'min-h-full font-he'+(dictOff?' dict-off':'')} style={{overflowX:'clip'}}>
    <a href="#main" className="skip-link" onClick={e=>{ e.preventDefault(); const m=document.getElementById('main'); if(m){ m.focus(); m.scrollIntoView(); } }}>דילוג לתוכן הראשי</a>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="screen-announce">{announce}</div>
    <DictBar state={state} onOpen={openCard} onAdd={()=>setAdding(true)} onHome={()=>{ setStoryId(null); changeTab('home'); }} voiceRef={voiceRef} onListening={setListening} hideSm={dictOff}/>
    <Header known={known} streak={streak} todayXP={todayH.xp} goal={state.goal} unlocked={state.unlocked} onNav={changeTab} profile={profile} onProfile={()=>setProfileOpen(true)} onHome={()=>{ setStoryId(null); changeTab('home'); }} onSearch={()=>{ setHomeSearch(true); setTimeout(()=>{ const i=document.getElementById('dict-search'); i&&i.focus(); },80); }}/>
    <Tabs tab={tab} setTab={changeTab} due={due}/>
    <main id="main" ref={mainRef} tabIndex={-1} aria-label="תוכן ראשי" className="gutter" style={{paddingBlock:'24px 24px', minHeight:'60vh'}}>
      <div className="mx-auto" style={{maxWidth:tab==='read'&&story&&state.settings.pane===true?'1240px':'1120px'}}>
        {!inner1&&<TabHead tab={tab} place={place} name={profile.name} known={known} showSub={showSub} setTab={t=>{ setTab(t); try{ synth&&synth.cancel(); }catch(e){} }} onSettings={()=>setProfileOpen(true)}/>}
        {inner1&&showSub&&<div className="flex items-center gap-3 flex-wrap mb-5">
          <SubNav tab={tab} setTab={t=>{ setTab(t); try{ synth&&synth.cancel(); }catch(e){} }}/>
          {place==='me'&&<button className="btn btn-ghost px-4 text-sm ms-auto" onClick={()=>setProfileOpen(true)}><IconUser size={18}/>הגדרות וחשבון</button>}
        </div>}
        {tab==='home' && <Home state={state} stories={stories.filter(s=>!s.community)} known={known} streak={streak} profile={profile} go={changeTab} openStory={openStory} openTalk={openTalk} openCourse={openCourse} voice={voice} rate={state.settings.rate} onSearch={()=>{ setHomeSearch(true); setTimeout(()=>{ const i=document.getElementById('dict-search'); i&&i.focus(); },80); }}
          startReview={keys=>{ setFlash({keys, title:'חזרה מרווחת', id:Math.random()}); changeTab('practice'); }}/>}
        {tab==='group' && <GroupCard state={state} actions={actions} profile={profile} known={known} streak={streak} toast={toast}/>}
        {tab==='community' && <Library mode="community" onGo={()=>{ setStoryId(null); changeTab('read'); }} state={state} known={known} actions={actions} openStory={openStory} onAdd={()=>setAdding(true)} toast={toast} stories={stories} community={community} session={session} onReport={setReporting} onEdit={s=>setAdding({edit:s})} onDeleteCommunity={async s=>{ try{ await deleteCommunityStory(s.cid); toast('הסיפור נמחק'); }catch(e){ toast(cloudMsg(e)); } }}/>}
        {tab==='read' && (story
          ? <Reader key={story.id} story={story} stories={stories} state={state} actions={actions} voice={voice} voices={voices} back={()=>{ setStoryId(null); window.scrollTo({top:0}); }} toast={toast} session={session} onReport={setReporting} onEdit={s=>setAdding({edit:s})} onDeleteCommunity={async s=>{ try{ await deleteCommunityStory(s.cid); toast('הסיפור נמחק'); }catch(e){ toast(cloudMsg(e)); } }} onWord={openCard} onPractice={(keys,title)=>{ setFlash({keys,title:'מילים קשות מ־'+title,id:Math.random()}); setStoryId(null); changeTab('practice'); }}/>
          : <Library state={state} known={known} actions={actions} openStory={openStory} onAdd={()=>setAdding(true)} toast={toast} stories={stories} community={community} session={session} onReport={setReporting} onEdit={s=>setAdding({edit:s})} onDeleteCommunity={async s=>{ try{ await deleteCommunityStory(s.cid); toast('הסיפור נמחק'); }catch(e){ toast(cloudMsg(e)); } }}/>)}
        {tab==='courses' && <Courses key={courseJump?courseJump.id:'courses'} jump={courseJump} state={state} actions={actions} voice={voice} celebrate={celebrate} profile={profile} toast={toast} openStory={openStory} openTalk={openTalk} go={changeTab}/>}
        {tab==='sounds' && <Sounds state={state} actions={actions} voice={voice} celebrate={celebrate} onWord={openCard}/>}
        {tab==='talk' && <Talk state={state} actions={actions} voice={voice} profileName={profile.name} known={known}/>}
        {tab==='practice' && (flash ? <FlashSession key={flash.id} keys={flash.keys} title={flash.title} state={state} actions={actions} voice={voice} celebrate={celebrate} onDone={()=>setFlash(null)}/>
          : <Practice state={state} stories={stories} known={known} actions={actions} voice={voice} celebrate={celebrate} goRead={()=>changeTab('read')} goTalk={()=>setTab('talk')} goCourses={()=>changeTab('courses')} onWord={openCard} onSrs={(keys,title)=>setFlash({keys,title,id:Math.random()})}/>)}
        {tab==='progress' && <Progress state={state} stories={stories.filter(s=>!s.community)} actions={actions} streak={streak} known={known} profile={profile} toast={toast} voice={voice} voices={voices} onWord={openCard} go={changeTab} openLegal={setLegal} auth={auth} openAuth={setAuthDlg}/>}
      </div>
    </main>
    <Footer onOpen={setLegal}/>
    <CloudSync state={state} actions={actions} toast={toast}/>
    {authDlg&&<AuthDialog start={authDlg} state={state} toast={toast} openLegal={setLegal} onClose={()=>setAuthDlg(null)} onSignedIn={onSignedIn}/>}
    {legal&&<LegalModal page={legal} onClose={()=>setLegal(null)}/>}
    {mergeNote&&!authDlg&&<MergeNotice onClose={()=>setMergeNote(false)}/>}
    {offer&&!authDlg&&<AccountOffer onSave={()=>{ setOffer(false); setAuthDlg('signup'); }} onLater={()=>setOffer(false)}/>}
    {reporting&&SB&&<ReportDialog story={reporting} toast={toast} onClose={()=>setReporting(null)}/>}
    {recovery&&SB&&<RecoveryDialog onClose={()=>setRecovery(false)}/>}
    {adding&&<AddStory state={state} profile={profile} editing={adding.edit} toast={toast} onClose={()=>setAdding(false)} onPublished={(pub,wasEdit)=>{ setAdding(false); toast(wasEdit?'הסיפור עודכן':'הסיפור פורסם בספריית הקהילה'); if(!wasEdit){ setTab('read'); setStoryId(pub.id); window.scrollTo({top:0}); } }} onSave={(st, stats)=>{ actions.addStory(st); setAdding(false); try{ synth&&synth.cancel(); }catch(e){} openStory(st.id);
      toast(`הסיפור נשמר: ${stats.words} מילים, ${stats.known} מהן כבר מוכרות לך`); }}/>}
    {card&&<DictCard wordKey={card.key} display={card.display} state={state} stories={stories} voice={voice} actions={actions} onClose={()=>setCard(null)} onOpenWord={openCard}/>}
    {profileOpen&&<ProfileSheet profile={profile} count={count} onClose={()=>setProfileOpen(false)} onRename={onRename} onSwitch={onSwitch} onAdd={onAddProfile} onDelete={onDelete} onSetPin={onSetPin} toast={toast} state={state} actions={actions}/>}
    {burst&&<Confetti key={burst.id} big={burst.big}/>}
    <div role="status" aria-live="polite" aria-atomic="true" className="toast-region">{toastMsg&&<div className={`toast fixed z-[70] rounded-xl px-5 py-3 ${toastMsg.out?'out':''}`+" font-semibold flex items-center gap-2 text-sm"} style={{background:'var(--ink)', color:'var(--bg)', width:'max-content', maxWidth:'calc(100vw - 32px)'}}><IconCheck size={18} className="shrink-0" aria-hidden="true"/><span><Bi>{toastMsg.m}</Bi></span></div>}</div>
  </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
