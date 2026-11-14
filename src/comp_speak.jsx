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
  if(!words.length) return (<section className="card p-6 flex flex-col gap-3 items-start"><h2 className="text-2xl font-extrabold">אין מספיק מילים למשחק</h2><p className="text-muted">קראו סיפור קצר ולחצו על כמה מילים, ואז נסו שוב.</p><button className="btn btn-primary px-5" onClick={onDone}>חזרה</button></section>);
  if(!k) return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status">
    <div className="eyebrow">תגיד את המילה</div><h2 className="text-3xl font-extrabold">{score>=8?'הגייה מצוינת!':score>=5?'יפה מאוד!':'כל ניסיון משפר את ההגייה'}</h2>
    <div className="num text-2xl font-extrabold">{score}/{words.length} <span className="text-base text-muted font-semibold">מילים נאמרו נכון</span></div>
    <p className="text-muted text-sm">טיפ: לפני שאומרים, אפשר ללחוץ על הרמקול ולחזור אחרי הקול.</p>
    <button className="btn btn-primary px-6" onClick={onDone}>סיום</button></section>);
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 text-sm" onClick={()=>{ stopRef.current&&stopRef.current(); onDone(); }}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(i/words.length*100)+'%', background:'var(--primary)'}}></div></div>
      <span className="num text-sm text-muted">{i+1}/{words.length}</span>
    </div>
    <div className="eyebrow">תגיד את המילה בקול</div>
    <section className={`card p-6 sm:p-8 flex flex-col items-center gap-3 text-center ${result==='retry'?'shake':''}`} key={k}>
      <div dir="ltr" className="book text-5xl sm:text-6xl font-bold">{k}</div>
      <div className="text-lg text-muted"><Bi>{info.he||''}</Bi></div>
      <div className="flex gap-2"><button className="btn btn-ghost px-4" onClick={()=>speakText(k,.9,voice)}><IconSpeaker size={18}/>איך אומרים?</button>
        <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.45,voice)}><span aria-hidden="true">🐢</span>לאט</button></div>
      {(tries>0||result==='fail')&&<div className="text-xl font-semibold" style={{color:'var(--primary)'}}>{info.pron}</div>}
      {heard&&<div className="text-sm text-muted">שמעתי: <bdi dir="ltr" className="book text-base text-ink">{heard}</bdi></div>}
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

