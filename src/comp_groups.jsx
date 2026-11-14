/* ---------- study groups: weekly leaderboard shared through the site's small API ---------- */
const SITE_URL='https://lumi-english.netlify.app';
const ON_SITE=typeof location!=='undefined' && /(^|\.)netlify\.app$|^localhost$/.test(location.hostname);
const GROUP_API=ON_SITE?'/api/groups':SITE_URL+'/api/groups';
let JOIN_CODE=''; try{ const m=(location.search+location.hash).match(/join[=-]([A-Za-z2-9]{6})/); if(m) JOIN_CODE=m[1].toUpperCase(); }catch(e){}
const GERR={not_found:'לא מצאתי קבוצה עם הקוד הזה. בדקו שהקוד נכון.', bad_code:'קוד קבוצה הוא 6 אותיות ומספרים באנגלית.', full:'הקבוצה מלאה (עד 40 חברים).', not_member:'החיבור שלך לקבוצה כבר לא בתוקף. הצטרפו שוב עם הקוד.', bad_name:'צריך שם.', bad_group_name:'צריך לתת שם לקבוצה.', net:ON_SITE?'אין חיבור לשרת כרגע. בדקו את האינטרנט ונסו שוב.':'קבוצות עובדות רק באתר lumi-english.netlify.app. פתחו את האפליקציה שם.'};
async function groupCall(body){
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
  const leave=async()=>{ setBusy(true); try{ await groupCall({action:'leave', code:g.code, memberId:g.memberId, token:g.token}); }catch(e){} actions.setGroup(null); setData(null); setConfirm(false); setBusy(false); toast('עזבת את הקבוצה'); };
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
    <p className="text-xs text-muted">בקבוצה רואים רק שם, דמות ונקודות. הסיפורים, הכתיבה והסיסמה שלכם לא נשלחים לשום מקום.</p>
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

