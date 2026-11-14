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
    {!SB ? <p className="text-sm text-muted">שמירה בענן זמינה באתר <bdi dir="ltr">lumi-english.netlify.app</bdi>.</p>
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

