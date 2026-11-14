/* ---------- flashcards (spaced repetition session) ---------- */
function FlashSession({keys, state, actions, voice, title, onDone, celebrate}){
  const [queue,setQueue]=useState(()=>keys.slice()); const [flipped,setFlipped]=useState(false);
  const [stats,setStats]=useState({seen:0, ok:0, again:0, graduated:[]}); const requeued=useRef(new Set());
  const k=queue[0]; const info=k?wordInfo(k):null; const card=k?srsCard(state,k):null;
  useEffect(()=>{ if(k){ setFlipped(false); speakText(k,.9,voice); } },[k, stats.seen]);
  const grade=g=>{ if(!k) return; const next=srsNext(card,g);
    actions.reviewWord(k,g);
    const grad=next.iv>=GRADUATE_DAYS;
    setStats(s=>({seen:s.seen+1, ok:s.ok+(g>=2?1:0), again:s.again+(g===0?1:0), graduated:grad?[...s.graduated,k]:s.graduated}));
    setQueue(q=>{ const rest=q.slice(1); if(g===0&&!requeued.current.has(k)){ requeued.current.add(k); return [...rest,k]; } return rest; });
    if(grad) celebrate&&celebrate(false); };
  useEffect(()=>{ const h=e=>{ const t=e.target; if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if(e.key===' '||e.key==='Enter'){ e.preventDefault(); if(!flipped) setFlipped(true); else grade(2); }
      else if(flipped&&/^[1-4]$/.test(e.key)) grade(+e.key-1); };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); });
  if(!k) return (<section className="card p-6 sm:p-8 flex flex-col gap-4 items-start rise" role="status">
    <div className="eyebrow">{title}</div>
    <h2 className="text-3xl font-extrabold">{stats.seen?'סיימת את החזרה!':'אין כרגע מילים לחזרה'}</h2>
    {stats.seen>0&&<div className="grid grid-cols-3 gap-3 w-full max-w-md">
      {[[stats.seen,'כרטיסים'],[stats.ok,'ידעת'],[stats.graduated.length,'עברו למוכרות']].map(([v,l])=><div key={l} className="rounded-xl bg-sunk p-3 text-center"><div className="num text-2xl font-extrabold">{v}</div><div className="text-xs text-muted">{l}</div></div>)}
    </div>}
    {stats.graduated.length>0&&<div className="flex flex-wrap gap-1.5" dir="ltr">{stats.graduated.map(w=><span key={w} className="pill pill-known book">{w}</span>)}</div>}
    <p className="text-muted">{stats.seen?'המילים יחזרו בדיוק כשהזיכרון מתחיל להיחלש. ככה הן נשארות לתמיד.':'כל מילה ששמרת לתרגול תופיע כאן כשיגיע הזמן לחזור עליה.'}</p>
    <button className="btn btn-primary px-6" onClick={onDone}>סיום</button>
  </section>);
  const total=stats.seen+queue.length; const ex=examplesFor(k, STORIES)[0];
  return (<div className="flex flex-col gap-4 pb-28 sm:pb-0">
    <div className="flex items-center gap-3">
      <button className="btn btn-ghost px-3 text-sm" onClick={onDone}><IconX size={16}/>יציאה</button>
      <div className="flex-1 h-2.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:(stats.seen/Math.max(1,total)*100)+'%', background:'var(--primary)'}}></div></div>
      <span className="num text-sm text-muted">{stats.seen}/{total}</span>
    </div>
    <div className="eyebrow">{title}</div>
    <button key={k+stats.seen} className={`flash card rise ${flipped?'is-flipped':''}`} onClick={()=>!flipped&&setFlipped(true)} aria-label={flipped?'הכרטיס הפוך':'לחצו כדי לראות את הפירוש'}>
      <div className="flex items-center justify-center gap-3" dir="ltr">
        <span className="book text-5xl sm:text-6xl font-bold">{k}</span>
      </div>
      {!flipped ? <span className="text-muted text-sm mt-4">נסו להיזכר מה זה אומר, ואז לחצו כדי לבדוק</span>
      : <div className="flex flex-col items-center gap-2 mt-4 rise">
          <div className="text-3xl font-extrabold"><Bi>{info.he||'(אין תרגום)'}</Bi></div>
          <div className="text-xl" style={{color:'var(--primary)'}}>{info.pron}</div>
          {ex&&<div dir="ltr" className="book text-muted text-center max-w-md">“{ex.en}”{ex.he&&<div dir="rtl" className="text-sm">{ex.he}</div>}</div>}
        </div>}
    </button>
    <div className="flex justify-center gap-2">
      <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.9,voice)}><IconSpeaker size={18}/>השמעה</button>
      <button className="btn btn-ghost px-4" onClick={()=>speakText(k,.45,voice)}><span aria-hidden="true">🐢</span>לאט</button>
    </div>
    {flipped ? <div className="grade-row grid grid-cols-4 gap-2">
      {[[0,'שכחתי','bad'],[1,'קשה','learn'],[2,'ידעתי','primary'],[3,'קל','known']].map(([g,l,c])=><button key={g} className={`btn grade grade-${c} flex-col py-2`} style={{minHeight:'60px'}} onClick={()=>grade(g)}>
        <span className="font-extrabold">{l}</span><span className="text-[11px] opacity-80 num">{gradeLabel(card,g)}</span></button>)}
    </div> : <button className="btn btn-primary py-3 dock-mobile" onClick={()=>setFlipped(true)}>הצגת התשובה</button>}
    <p className="text-xs text-muted text-center hidden sm:block">מקשים: רווח להפוך · <bdi dir="ltr">1–4</bdi> לדרג</p>
  </div>);
}

/* ---------- post-reading summary ---------- */
function SummaryModal({story, snap, state, actions, voice, onClose, onPractice}){
  const [closing, close]=useClosing(onClose);
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') close(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  const d=storyData(story); const keys=d.keys.filter(k=>!NAMES.has(k));
  const metNew=keys.filter(k=>!snap[k] && state.words[k]); const promoted=keys.filter(k=>snap[k]==='learning'&&state.words[k]==='known');
  const stillNew=keys.filter(k=>!state.words[k]); const learning=keys.filter(k=>state.words[k]==='learning');
  const [bulk,setBulk]=useState(false);
  const Chips=({list,kind})=> <div className="flex flex-wrap gap-1.5" dir="ltr">{list.slice(0,40).map(k=><button key={k} className={`pill pill-${kind} book`} onClick={()=>speakText(k,.9,voice)} title={wordInfo(k).he||''}>{k}</button>)}{list.length>40&&<span className="meta">+{list.length-40}</span>}</div>;
  return (<div className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="סיכום הקריאה" className={`sheet card w-full sm:max-w-lg rounded-b-none sm:rounded-[22px] p-5 sm:p-6 flex flex-col gap-4 ${closing?'out':''}`} style={{maxHeight:'92vh', overflowY:'auto', paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-start gap-3"><StoryCover story={story} size={56}/>
        <div className="flex-1 min-w-0"><div className="eyebrow">סיימת לקרוא</div><h2 className="text-2xl font-extrabold leading-tight">כל הכבוד! +10 נקודות</h2><div dir="ltr" className="book text-muted text-left truncate">{story.title}</div></div>
        <button className="btn btn-ghost w-11 h-11 shrink-0" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl p-3 tint-new"><div className="num text-2xl font-extrabold">{metNew.length}</div><div className="text-xs">מילים חדשות שפגשת</div></div>
        <div className="rounded-xl p-3 tint-known"><div className="num text-2xl font-extrabold">{promoted.length}</div><div className="text-xs">עברו מבלמידה למוכרות</div></div>
        <div className="rounded-xl p-3 tint-learn"><div className="num text-2xl font-extrabold">{learning.length}</div><div className="text-xs">ממתינות לתרגול</div></div>
      </div>
      {metNew.length>0&&<div className="flex flex-col gap-1.5"><div className="text-sm font-bold">מילים חדשות שפגשת בסיפור</div><Chips list={metNew} kind={'learning'}/></div>}
      {promoted.length>0&&<div className="flex flex-col gap-1.5"><div className="text-sm font-bold">מילים שקידמת למוכרות 🎉</div><Chips list={promoted} kind="known"/></div>}
      {stillNew.length>0&&<div className="rounded-xl bg-sunk p-3 flex flex-col gap-2">
        <div className="text-sm">נשארו <b className="num">{stillNew.length}</b> מילים כחולות שלא לחצת עליהן. מכירים אותן?</div>
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

