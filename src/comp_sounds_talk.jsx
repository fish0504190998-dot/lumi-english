/* ---------- sounds (phonics) ---------- */
const PH_POOL = PHONICS.flatMap(c=>c.items.flatMap(it=>it.words.map(([w,he,pr])=>({w,he,pr,it}))));
function PatternLabel({p}){ return <bdi dir="ltr" className="book">{p}</bdi>; }
function SoundSheet({item, voice, onClose, onWord}){
  const [closing, close]=useClosing(onClose);
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') close(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  const playAll=()=>{ item.words.forEach(([w],i)=>setTimeout(()=>speakText(w,.8,voice), i*1300)); };
  return (<div className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label={`הצליל ${item.p}`} className={`sheet card w-full sm:max-w-lg rounded-b-none sm:rounded-[20px] p-5 flex flex-col gap-4 ${closing?'out':''}`} style={{maxHeight:'92vh', overflowY:'auto', paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <div className="flex-1 flex items-center gap-4 flex-wrap">
          <span dir="ltr" className="book text-5xl font-bold">{item.p}</span>
          <span className="text-3xl text-muted" aria-hidden="true">=</span>
          <span className="text-4xl font-bold" style={{color:'var(--primary)'}}>{item.he}</span>
        </div>
        <button className="btn btn-ghost w-11 h-11 shrink-0" onClick={close} aria-label="סגירה"><IconX size={18}/></button>
      </div>
      <p className="text-lg leading-relaxed"><Bi>{item.tip}</Bi></p>
      {item.ex&&<p className="rounded-xl p-3 text-sm leading-relaxed" style={{background:'var(--sun-soft)'}}><b>יוצא מהכלל: </b><Bi>{item.ex.replace(/^יוצא(ים)? מהכלל:\s*/,'')}</Bi></p>}
      <div className="flex items-center gap-2"><h3 className="font-bold me-auto">מילים לדוגמה</h3><button className="btn btn-ghost px-3 text-sm" onClick={playAll}><IconPlay size={16}/>השמע את כולן</button></div>
      <ul className="flex flex-col gap-2">{item.words.map(([w,he,pr])=>(<li key={w} className="flex items-center gap-3 rounded-xl bg-sunk p-2.5">
        <button className="btn btn-primary w-11 h-11 shrink-0" style={{borderRadius:'50%'}} onClick={()=>speakText(w,.85,voice)} aria-label={`השמעת ${w}`}><IconSpeaker size={18}/></button>
        <button className="btn btn-line w-11 h-11 shrink-0 text-lg" style={{borderRadius:'50%'}} onClick={()=>speakText(w,.45,voice)} aria-label={`השמעה איטית של ${w}`}><span aria-hidden="true">🐢</span></button>
        <button className="flex-1 min-w-0 text-start" onClick={()=>onWord(w,w)} title="פתיחה במילון">
          <div dir="ltr" className="book text-xl font-semibold text-left">{w}</div>
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
        {q.type==='read' ? <div dir="ltr" className="book text-5xl font-bold text-left">{q.c.w}</div>
          : <div className="flex gap-3 items-center"><button className="btn btn-primary w-20 h-20" style={{borderRadius:'50%'}} onClick={()=>speakText(q.c.w,.8,voice)} aria-label="השמע שוב"><IconSpeaker size={34}/></button>
              <button className="btn btn-ghost h-12 px-4" onClick={()=>speakText(q.c.w,.45,voice)}><span aria-hidden="true">🐢</span>לאט</button></div>}
        <div className="grid sm:grid-cols-2 gap-3" dir={q.type==='listen'?'ltr':'rtl'}>
          {q.opts.map((o,i)=>{ const cls=quiz.picked==null?'':o.w===q.c.w?'correct':o.w===quiz.picked?'wrong':'';
            return <button key={o.w} disabled={quiz.picked!=null} className={`opt flex items-center gap-3 ${cls} ${q.type==='listen'?'book text-xl text-left':'text-2xl font-semibold'}`} onClick={()=>answer(o)}>
              <span className="num text-xs font-bold w-6 h-6 rounded-md grid place-items-center bg-sunk text-muted shrink-0">{i+1}</span><span>{q.type==='read'?o.pr:o.w}</span></button>; })}
        </div>
        {quiz.picked!=null&&<div className="rise rounded-xl p-4 flex flex-col gap-2 pb-24 sm:pb-4" style={{background:ok?'var(--good-soft)':'var(--bad-soft)'}}>
          <div className="text-xl font-bold" style={{color:ok?'var(--good)':'var(--bad)'}}>{ok?pick(CHEERS)+' +2':'כמעט! ככה זה נשמע:'}</div>
          <div className="text-lg"><bdi dir="ltr" className="book font-semibold">{q.c.w}</bdi> = <b>{q.c.pr}</b> · {q.c.he}</div>
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
        <div className="flex-1 min-w-[220px]"><h1 className="text-2xl sm:text-3xl font-bold">צלילים ואותיות</h1>
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
        <span dir="ltr" className="book text-3xl font-bold text-left">{it.p}</span>
        <span className="text-xl font-bold" style={{color:'var(--primary)'}}>{it.he}</span>
        <span className="text-sm text-muted"><bdi dir="ltr" className="book">{it.words[0][0]}</bdi> · {it.words[0][2]}</span>
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
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn btn-ghost px-3 text-sm" onClick={()=>{ stopRef.current&&stopRef.current(); onBack(); }}><IconChevR size={18}/>כל השיחות</button>
      <span className="text-2xl" aria-hidden="true">{talk.cover}</span>
      <div className="leading-tight me-auto"><div dir="ltr" className="book font-bold text-left">{talk.title}</div><div className="text-xs text-muted">{talk.he}</div></div>
      <Toggle id="tg-talkhe" checked={showHe} onChange={v=>actions.setSetting('talkHe',v)} label="תרגום"/>
    </div>
    <div className="h-1.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><div className="h-full bar" style={{width:((finished?talk.steps.length:si)/talk.steps.length*100)+'%', background:'var(--good)'}}></div></div>
    <section className="card p-3 sm:p-5 flex flex-col gap-3" style={{minHeight:'50vh'}} aria-live="polite">
      {msgs.map((m,i)=> m.from==='bot' ? (<div key={i} className="flex gap-2 items-start rise" dir="ltr">
          <div className="shrink-0 mt-1"><LogoMark size={34} radius={10}/></div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]" style={{background:'var(--sunk)'}}>
            <div className="book text-lg leading-relaxed text-left">{m.en}</div>
            {showHe&&<div dir="rtl" className="text-sm text-muted mt-1 text-right">{m.he}</div>}
          </div>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1" style={{background:'var(--sunk)', color:'var(--muted)'}} onClick={()=>speakText(m.en,.9,voice)} aria-label="השמע שוב"><IconSpeaker size={15}/></button>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1 text-sm" style={{background:'var(--sunk)'}} onClick={()=>speakText(m.en,.55,voice)} aria-label="השמעה איטית"><span aria-hidden="true">🐢</span></button>
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
        <input id="talk-input" dir="ltr" className="field book text-lg flex-1 min-w-0" style={{minHeight:'48px'}} autoComplete="off" placeholder={listening?'Listening…':'Speak or type your answer'} value={text} onChange={e=>setText(e.target.value)}/>
        <button className="btn btn-primary h-12 px-4 shrink-0" disabled={!text.trim()} aria-label="שליחה"><span dir="rtl">שלח</span></button>
      </form>
    </div>}
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
  </div>);
}
function Talk({state, actions, voice, profileName}){
  const [id,setId]=useState(null); const [run,setRun]=useState(0);
  const t=TALKS.find(x=>x.id===id); const done=state.talkDone||{};
  if(t) return <TalkChat key={t.id+':'+run} talk={t} voice={voice} actions={actions} settings={state.settings} defaultName={profileName}
    onBack={()=>setId(null)} onNext={()=>{ const i=TALKS.indexOf(t); setId(TALKS[(i+1)%TALKS.length].id); setRun(r=>r+1); window.scrollTo({top:0}); }}/>;
  return (<div className="flex flex-col gap-5">
    <section className="card p-5 sm:p-6 flex flex-col gap-3">
      <h1 className="text-2xl sm:text-3xl font-bold">מדברים אנגלית</h1>
      <p className="text-muted leading-relaxed">שיחות קצרות מהחיים. לומי אומרת משפט, ואתם עונים בקול (כפתור המיקרופון) או בהקלדה. אם תשובה לא מתאימה, תקבלו דוגמאות לתשובות טובות.</p>
      <p className="text-xs text-muted">המיקרופון עובד ב־Chrome וב־Edge. בפעם הראשונה הדפדפן יבקש הרשאה.</p>
    </section>
    <div className="grid gap-3 sm:grid-cols-2">{TALKS.map(x=>(<button key={x.id} onClick={()=>{ setId(x.id); window.scrollTo({top:0}); }} className="card card-btn card-lift p-4 flex items-center gap-4 text-start">
      <span className="w-14 h-14 rounded-xl grid place-items-center text-3xl bg-sunk shrink-0" aria-hidden="true">{x.cover}</span>
      <span className="flex-1 min-w-0"><span dir="ltr" className="book font-bold text-lg block text-left">{x.title}</span><span className="text-sm text-muted block">{x.he} · <span className="num">{x.steps.length}</span> שאלות · שלב <span className="num">{x.level}</span></span></span>
      {done[x.id]?<span className="tag" style={{background:'var(--good-soft)', color:'var(--good)'}}><IconCheck size={12}/>בוצע</span>:<IconChevL size={18}/>}
    </button>))}</div>
  </div>);
}

