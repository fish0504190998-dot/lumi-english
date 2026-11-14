function AddStory({state, onClose, onSave}){
  const [text,setText]=useState(''); const [title,setTitle]=useState(''); const [cover,setCover]=useState('📖'); const [level,setLevel]=useState(0); const [err,setErr]=useState('');
  const [coverMode,setCoverMode]=useState('emoji'); const [image,setImage]=useState(null); const [imgBusy,setImgBusy]=useState(false); const [tags,setTags]=useState(null);
  const [closing, close]=useClosing(onClose);
  const paras=useMemo(()=>splitParas(text),[text]);
  const stats=useMemo(()=>{ const keys=[...new Set(paras.flatMap(p=>(p.match(WORD_RE)||[]).map(w=>w.toLowerCase())))];
    return { words:paras.reduce((a,p)=>a+countWords(p),0), unique:keys.length, known:keys.filter(k=>state.words[k]==='known').length, fresh:keys.filter(k=>!state.words[k]&&!NAMES.has(k)).length, dict:keys.filter(k=>wordInfo(k).he).length }; },[paras]);
  const autoTags=useMemo(()=>detectTopics(text),[text]); const tagList=tags||autoTags;
  const auto=suggestLevel(stats.words); const lvl=level||auto;
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') close(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  const onFile=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; if(f.size>2e6){ setErr('הקובץ גדול מדי. נסו קובץ טקסט של עד 2MB.'); return; }
    const r=new FileReader(); r.onload=()=>{ setText(String(r.result||'')); setErr(''); if(!title) setTitle(f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')); }; r.onerror=()=>setErr('לא הצלחתי לקרוא את הקובץ.'); r.readAsText(f); };
  const onImage=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; setImgBusy(true); setErr('');
    try{ setImage(await compressImage(f, 300, .75)); setCoverMode('image'); }
    catch(x){ setErr(x.message==='type'?'אפשר להעלות רק תמונות JPG, PNG או WEBP.':x.message==='big'?'התמונה גדולה מדי (עד 15MB).':'לא הצלחתי לקרוא את התמונה. נסו תמונה אחרת.'); }
    setImgBusy(false); };
  const toggleTag=t=>{ const cur=tagList; const n=cur.includes(t)?cur.filter(x=>x!==t):[...cur,t]; setTags(n.length?n:['יומיום']); };
  const save=()=>{
    if(stats.words<5){ setErr('צריך טקסט באנגלית של לפחות כמה מילים.'); return; }
    if(stats.words>20000){ setErr('הטקסט ארוך מדי (מעל 20,000 מילים). חלקו אותו לכמה סיפורים.'); return; }
    const st={ id:'u_'+Date.now().toString(36), user:true, level:lvl, cover:cover||'📖', title:title.trim()||splitSentences(paras[0])[0].slice(0,48), he:'', blurb:'', tags:tagList, paras:paras.map(en=>({en})) };
    if(coverMode==='image'&&image) st.image=image;
    onSave(st, stats);
  };
  return (<div className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="הוספת סיפור חדש" className={`sheet card w-full sm:max-w-2xl rounded-b-none sm:rounded-[20px] flex flex-col ${closing?'out':''}`} style={{maxHeight:'92vh'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3 p-5 border-b border-line">
        <h2 className="text-xl font-extrabold me-auto">הוספת סיפור חדש</h2>
        <button className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button>
      </div>
      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap"><label htmlFor="add-text" className="font-bold me-auto">1. הטקסט באנגלית</label>
            <label className="btn btn-line px-3 py-1.5 text-sm cursor-pointer">העלאת קובץ <bdi dir="ltr">.txt</bdi><input id="add-file" type="file" accept=".txt,text/plain" className="sr-only" onChange={onFile}/></label></div>
          <textarea id="add-text" dir="ltr" className="field book text-left" rows={8} placeholder="Paste any English text here: an article, a page from a book, or a story you asked an AI to write…" value={text} onChange={e=>{ setText(e.target.value); setErr(''); }}></textarea>
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
        {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><Bi>{err}</Bi></div>}
      </div>
      <div className="p-5 border-t border-line flex gap-2 flex-wrap" style={{paddingBottom:'max(20px, env(safe-area-inset-bottom,0px))'}}>
        <button className="btn btn-go py-3 px-6" onClick={save} disabled={stats.words<5||imgBusy}><IconCheck size={18}/>שמור סיפור</button>
        <button className="btn btn-ghost py-3 px-5" onClick={close}>ביטול</button>
      </div>
    </div>
  </div>);
}
