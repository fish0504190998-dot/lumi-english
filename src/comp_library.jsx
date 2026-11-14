/* ---------- library ---------- */
function StoryCard({story, state, locked, onOpen, onLocked}){
  const st=storyStats(story, state); const mins=readMinutes(st.d.words);
  return (<button onClick={locked?onLocked:onOpen} aria-disabled={locked||undefined}
    className={`story-card card card-btn text-start flex flex-col ${locked?'is-locked':''} ${st.done?'is-read':''}`}>
    <div className="flex gap-4 items-start p-4 pb-3">
      <div className="relative shrink-0"><StoryCover story={story} size={64} radius={16}/>
        {locked&&<span className="absolute -bottom-1.5 -end-1.5 w-6 h-6 rounded-full bg-surface border border-line grid place-items-center text-muted"><IconLock size={12}/></span>}</div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <div dir="ltr" className="story-title book text-left flex-1 min-w-0">{story.title}</div>
          {st.done&&<span className="read-badge shrink-0"><IconCheck size={12}/>נקרא</span>}
        </div>
        {(story.he||story.blurb)&&<div className="text-sm text-muted leading-snug line-clamp-2">{story.he}{story.he&&story.blurb?' · ':''}{story.blurb}</div>}
        <div className="meta">שלב <span className="num">{story.level}</span> · <span className="num">{mins}</span> דק׳ קריאה · <span className="num">{st.d.words}</span> מילים{(story.tags||[]).length?' · '+story.tags.join(' · '):''}</div>
      </div>
    </div>
    <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {st.newW>0?<StatusPill kind="new" n={st.newW} label={st.newW===1?'מילה חדשה':'מילים חדשות'}/>:<StatusPill kind="known" label="אין מילים חדשות"/>}
        {st.learnW>0&&<StatusPill kind="learning" n={st.learnW}/>}
        {story.real&&<span className="tag tag-real">סיפור אמיתי</span>}{story.user&&<span className="tag">שלי</span>}
      </div>
      <div className="h-1.5 rounded-full bg-sunk overflow-hidden flex" dir="ltr" aria-label={`${st.pct}% מהמילים מוכרות`}>
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
  if(!story) return (<section className="hero card p-5 sm:p-6"><div className="text-xl font-extrabold">סיימת את כל הסיפורים הפתוחים! 🎉</div><p className="text-muted mt-1">פתחו שלב חדש, או הוסיפו סיפור משלכם.</p></section>);
  const st=storyStats(story, state);
  return (<section className="hero card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
    <StoryCover story={story} size={96} radius={22}/>
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="eyebrow">{last?'המשך מאיפה שעצרת':'הסיפור המומלץ הבא בשבילך'}</div>
      <div dir="ltr" className="book text-2xl sm:text-3xl font-bold text-left leading-tight">{story.title}</div>
      {story.he&&<div className="text-muted">{story.he}</div>}
      <div className="flex flex-wrap gap-1.5 items-center mt-1">
        <span className="meta">שלב {story.level} · {readMinutes(st.d.words)} דק׳ · {st.d.words} מילים</span>
        {st.newW>0&&<StatusPill kind="new" n={st.newW} label="מילים חדשות"/>}
      </div>
    </div>
    <div className="flex sm:flex-col gap-2 shrink-0">
      <button className="btn btn-go px-6 text-lg" style={{minHeight:'52px'}} onClick={()=>openStory(story.id)}><IconPlay size={18}/>{last?'המשך לקרוא':'בואו נקרא'}</button>
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
    <span className="font-bold text-lg">הוסף סיפור חדש</span><span className="text-sm text-muted">הדביקו טקסט, העלו קובץ או תמונת שער</span>
  </button>);
}
function Library({state, known, actions, openStory, onAdd, toast, stories}){
  const lv=levelFor(known);
  const [q,setQ]=useState(''); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('level'); const [lvF,setLvF]=useState(0);
  const recIds=useMemo(()=>new Set(recommendStories(stories, state, known).slice(0,6).map(s=>s.id)),[stories, state.words, state.storiesDone, known, state.unlocked]);
  const active=q.trim()||filter!=='all'||sort!=='level'||lvF;
  const list=useMemo(()=>{ if(!active) return [];
    const t=q.trim().toLowerCase();
    let r=stories.filter(s=>!t || [s.title,s.he,s.blurb,...(s.tags||[])].join(' ').toLowerCase().includes(t));
    if(lvF) r=r.filter(s=>s.level===lvF);
    if(filter==='unread') r=r.filter(s=>!state.storiesDone[s.id]); if(filter==='read') r=r.filter(s=>state.storiesDone[s.id]); if(filter==='rec') r=r.filter(s=>recIds.has(s.id));
    const S=x=>storyStats(x,state);
    const by={level:(a,b)=>a.level-b.level, short:(a,b)=>S(a).d.words-S(b).d.words, long:(a,b)=>S(b).d.words-S(a).d.words, mostnew:(a,b)=>S(b).newW-S(a).newW, leastnew:(a,b)=>S(a).newW-S(b).newW}[sort];
    return [...r].sort(by); },[active, q, filter, sort, lvF, stories, state.words, state.storiesDone, recIds]);
  const card=s=>{ const open=isOpenLevel(s.level, known, state.unlocked)||s.user; const need=LEVELS[s.level-1].min-known;
    return <StoryCard key={s.id} story={s} state={state} locked={!open} onOpen={()=>openStory(s.id)} onLocked={()=>toast(`הסיפור נעול. חסרות ${need} מילים מוכרות, או לחצו "בא לי אתגר, פתח עכשיו" בכותרת של שלב ${s.level}.`)}/>; };
  return (<div className="flex flex-col gap-6">
    <HeroCard state={state} stories={stories} known={known} openStory={openStory}/>
    <LevelTracker state={state} stories={stories} known={known}/>
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="page-title me-auto">הספרייה שלך</h1>
        <button className="btn btn-primary px-4 text-sm" onClick={onAdd}><IconPlus size={18}/>הוסף סיפור חדש</button>
      </div>
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 h-12 focus-within:border-primary" htmlFor="lib-search">
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
      </div>
    </section>

    {active ? <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><h2 className="section-title me-auto">תוצאות</h2><span className="meta num">{list.length} סיפורים</span>
        <button className="hit text-primary font-semibold text-sm" onClick={()=>{ setQ(''); setFilter('all'); setSort('level'); setLvF(0); }}>ניקוי הסינון</button></div>
      {list.length?<div className="grid gap-4 md:grid-cols-2">{list.map(card)}</div>
        :<div className="card p-6 text-center text-muted">לא נמצאו סיפורים. נסו מילה אחרת או סינון אחר.</div>}
    </section> : <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3"><h2 className="section-title me-auto">הסיפורים שלי</h2>{state.userStories.length>0&&<span className="meta num">{state.userStories.length}</span>}</div>
        <div className="grid gap-4 md:grid-cols-2">{state.userStories.map(card)}<AddStoryTile onAdd={onAdd}/></div>
      </section>
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
          <div className="grid gap-4 md:grid-cols-2">{ls.map(card)}</div>
        </section>); })}
    </>}
  </div>);
}

