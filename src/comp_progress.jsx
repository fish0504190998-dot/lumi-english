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
    <div className="flex gap-1.5 flex-wrap" role="tablist">{T.map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={`vtab vtab-${k==='learning'?'learning':k}`} onClick={()=>setTab(k)}>{l} <b className="num">{lists[k].length}</b></button>)}</div>
    <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3 h-11" htmlFor="vocab-search"><IconSearch size={17}/>
      <input id="vocab-search" dir="auto" className="flex-1 min-w-0 bg-transparent outline-none" placeholder="חיפוש מילה באנגלית או בעברית" value={q} onChange={e=>setQ(e.target.value)}/></label>
    {items.length===0 ? <p className="text-sm text-muted text-center py-4">{t?'לא נמצאו מילים.':tab==='known'?'עוד אין מילים מוכרות. סמנו "כבר מכיר!" על מילים בסיפורים.':tab==='learning'?'עוד אין מילים בלמידה. לחצו על מילה בסיפור כדי להוסיף.':'קראתם את כל המילים בסיפורים הפתוחים!'}</p>
    : <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">{items.slice(0,limit).map(k=>{ const i=wordInfo(k); const c=tab==='learning'?srsCard(state,k):null;
        return (<li key={k} className={`vword vword-${tab}`}>
          <button className="flex-1 min-w-0 text-start" onClick={()=>speakText(k,.9,voice)} aria-label={`השמעת ${k}`}>
            <span dir="ltr" className="book font-bold text-lg block text-left truncate">{k}</span>
            <span className="text-xs text-muted block truncate"><Bi>{i.he||''}</Bi></span>
            {c&&c.last>0&&<span className="text-[10px] text-muted block">חזרה {relTime(c.due)}</span>}
          </button>
          <button className="hit w-8 h-8 grid place-items-center rounded-lg text-muted shrink-0" onClick={()=>onWord(k,k)} aria-label={`פרטים על ${k}`}><IconBook size={15}/></button>
        </li>); })}</ul>}
    {items.length>limit&&<button className="btn btn-ghost px-4 self-center" onClick={()=>setLimit(l=>l+240)}>הצגת עוד ({items.length-limit})</button>}
  </section>);
}
/* ---------- achievements ---------- */
function Achievements({state}){
  const st=badgeStats(state); const got=state.badges||{}; const n=BADGES.filter(b=>got[b.id]).length;
  return (<section className="card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3"><h2 className="section-title me-auto">הישגים</h2><span className="meta num">{n}/{BADGES.length} נפתחו</span></div>
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{BADGES.map(b=>{ const have=!!got[b.id]; const v=Math.min(b.need, st[b.of]||0);
      return (<li key={b.id} className={`badge ${have?'is-on':''}`} title={b.desc}>
        <span className="badge-icon" aria-hidden="true">{b.icon}</span>
        <span className="font-extrabold leading-tight">{b.name}</span>
        <span className="text-xs text-muted leading-snug">{b.desc}</span>
        {have ? <span className="text-[11px] font-bold" style={{color:'var(--known)'}}>✓ נפתח</span>
          : <span className="w-full"><span className="block h-1.5 rounded-full bg-sunk overflow-hidden" dir="ltr"><span className="block h-full bar" style={{width:(v/b.need*100)+'%', background:'var(--primary)'}}></span></span><span className="text-[11px] text-muted num">{v}/{b.need}</span></span>}
      </li>); })}</ul>
  </section>);
}
/* ---------- backup ---------- */
function BackupCard({state, actions, profile, toast}){
  const [pending,setPending]=useState(null); const [err,setErr]=useState(''); const fileRef=useRef(null);
  const size=useMemo(()=>{ try{ return JSON.stringify(state).length; }catch(e){ return 0; } },[state]);
  const exportJson=()=>{ const data={app:'lumi-english', version:3, exported:new Date().toISOString(), profile:{name:profile.name, avatar:profile.avatar}, state};
    const text=JSON.stringify(data); const name=`lumi-english-${profile.name.replace(/[^\wא-ת-]+/g,'')||'backup'}-${todayKey()}.json`;
    try{ const url=URL.createObjectURL(new Blob([text],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('קובץ הגיבוי ירד למחשב'); }
    catch(e){ copyText(text).then(ok=>toast(ok?'ההורדה חסומה כאן, אז הגיבוי הועתק ללוח':'ההורדה חסומה כאן. פתחו את האתר lumi-english.netlify.app')); } };
  const onFile=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; setErr('');
    const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(String(r.result)); if(!d||d.app!=='lumi-english'||!d.state||typeof d.state.words!=='object') throw 0; setPending(d); }catch(x){ setErr('הקובץ הזה לא נראה כמו גיבוי של Lumi English.'); } }; r.readAsText(f); };
  return (<section className="card p-5 sm:p-6 flex flex-col gap-3">
    <h2 className="section-title">גיבוי ושחזור</h2>
    <div className="rounded-xl p-3 text-sm leading-relaxed" style={{background:'var(--sun-soft)'}}><b>חשוב לדעת: </b>ההתקדמות שלך שמורה רק בדפדפן הזה. ניקוי נתוני הגלישה, החלפת דפדפן או מכשיר חדש מתחילים מאפס. מומלץ להוריד גיבוי מדי פעם (כולל הסיפורים והתמונות שהוספת).</div>
    <div className="flex gap-2 flex-wrap items-center">
      <button className="btn btn-primary px-5" onClick={exportJson}>הורד גיבוי (JSON)</button>
      <button className="btn btn-line px-5" onClick={()=>fileRef.current&&fileRef.current.click()}>שחזר מגיבוי</button>
      <input ref={fileRef} id="backup-file" type="file" accept="application/json,.json" className="sr-only" onChange={onFile}/>
      <span className="meta num">גודל הנתונים: {(size/1024).toFixed(0)} KB</span>
    </div>
    {err&&<div className="rounded-xl p-3 text-sm" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}>{err}</div>}
    {pending&&<div className="rounded-xl border border-line p-3 flex flex-col gap-2" role="alertdialog" aria-label="אישור שחזור">
      <div className="text-sm">לשחזר את הגיבוי של <b><bdi>{(pending.profile&&pending.profile.name)||'משתמש'}</bdi></b> מ־<span className="num">{String(pending.exported||'').slice(0,10)}</span>? <b>ההתקדמות הנוכחית של המשתמש הזה תוחלף.</b></div>
      <div className="flex gap-2"><button className="btn py-2 px-4" style={{background:'var(--bad)', color:'var(--surface)'}} onClick={()=>{ actions.restore(pending.state); setPending(null); toast('הגיבוי שוחזר'); }}>כן, לשחזר</button><button className="btn btn-ghost py-2 px-4" onClick={()=>setPending(null)}>ביטול</button></div>
    </div>}
  </section>);
}

