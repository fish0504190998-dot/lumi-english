/* ---------- free conversation with AI (Gemini through the site's /api/talk function) ---------- */
const AI_OK=!/claudeusercontent\.com$|(^|\.)claude\.ai$/.test(location.hostname);
const AI_API=ON_SITE?'/api/talk':SITE_URL+'/api/talk';
const AI_SCEN=[['free','💬','שיחה חופשית'],['smalltalk','👋','מה נשמע?'],['cafe','☕','בבית קפה'],['travel','🗺️','טיולים'],['shop','👕','בחנות'],['job','💼','ראיון עבודה'],['doctor','🩺','אצל הרופא']];
const AI_ERR={ not_configured:'ה־AI עוד לא הופעל באתר. בעל האתר צריך להוסיף מפתח Gemini.', anon_limit:'הגעתם למגבלה היומית של אורחים. התחברו לחשבון כדי להמשיך (למשתמשים רשומים יש יותר הודעות).', user_limit:'הגעתם למגבלה היומית. נמשיך מחר!',
  site_limit:'השיחה עם ה־AI עמוסה היום. נסו שוב מחר.', busy:'ה־AI עמוס כרגע. נסו שוב בעוד רגע.', bad_key:'יש בעיה בהגדרת ה־AI באתר. נסו שוב מאוחר יותר.', no_model:'ה־AI לא זמין כרגע. נסו שוב מאוחר יותר.', upstream:'ה־AI לא הגיב. נסו שוב.', empty:'ה־AI לא הגיב. נסו שוב.', bad_messages:'משהו השתבש בשיחה. התחילו שיחה חדשה.', net:'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.' };
async function aiCall(body){
  const headers={'content-type':'application/json'}; const tok=SESSION&&SESSION.access_token; if(tok) headers.authorization='Bearer '+tok;
  let r; try{ r=await fetch(AI_API,{method:'POST', headers, body:JSON.stringify(body)}); }catch(e){ throw new Error('net'); }
  let j=null; try{ j=await r.json(); }catch(e){} if(!r.ok||!j||j.error) throw new Error((j&&j.error)||'net'); return j;
}
function AiChat({scenario, level, name, voice, actions, settings, onBack}){
  const [msgs,setMsgs]=useState([]); const [text,setText]=useState(''); const [busy,setBusy]=useState(true); const [err,setErr]=useState(''); const [listening,setListening]=useState(false); const [sent,setSent]=useState(0);
  const endRef=useRef(null), stopRef=useRef(null), started=useRef(false); const showHe=settings.talkHe!==false; const scen=AI_SCEN.find(x=>x[0]===scenario)||AI_SCEN[0];
  const hist=m=>m.filter(x=>x.from==='bot'||x.from==='me').map(x=>x.from==='bot'?{role:'model',text:x.en}:{role:'user',text:x.text});
  const ask=async(list)=>{ setBusy(true); setErr('');
    try{ const r=await aiCall({messages:hist(list), scenario, level, name});
      setMsgs(m=>{ const n=[...m]; if(r.correction&&n.length&&n[n.length-1].from==='me') n[n.length-1]={...n[n.length-1], correction:r.correction, tip:r.tip_he}; n.push({from:'bot', en:r.reply, he:r.reply_he}); return n; });
      speakText(r.reply,.9,voice); }
    catch(e){ setErr(AI_ERR[e.message]||AI_ERR.net); }
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
    <section className="card p-3 sm:p-5 flex flex-col gap-3" style={{minHeight:'50vh'}} aria-live="polite">
      {msgs.map((m,i)=> m.from==='bot' ? (<div key={i} className="flex gap-2 items-start rise" dir="ltr">
          <div className="shrink-0 mt-1"><LogoMark size={34} radius={10}/></div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]" style={{background:'var(--sunk)'}}>
            <div className="book text-lg leading-relaxed text-left">{m.en}</div>{showHe&&m.he&&<div dir="rtl" className="text-sm text-muted mt-1 text-right">{m.he}</div>}</div>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1" style={{background:'var(--sunk)', color:'var(--muted)'}} onClick={()=>speakText(m.en,.9,voice)} aria-label="השמע שוב"><IconSpeaker size={15}/></button>
          <button className="hit w-9 h-9 rounded-full grid place-items-center shrink-0 mt-1 text-sm" style={{background:'var(--sunk)'}} onClick={()=>speakText(m.en,.55,voice)} aria-label="השמעה איטית"><span aria-hidden="true">🐢</span></button></div>)
        : (<div key={i} className="flex flex-col items-end gap-1.5 rise" dir="ltr">
          <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]" style={{background:'var(--primary)', color:'var(--primary-ink)'}}>
            {m.spoken&&<div dir="rtl" className="text-xs opacity-80 mb-0.5 text-right flex items-center gap-1"><IconMic size={12}/>שמעתי:</div>}<div dir="auto" className="book text-lg leading-relaxed">{m.text}</div></div>
          {m.correction&&<div className="rounded-xl px-3 py-2 max-w-[85%] text-sm flex flex-col gap-1" style={{background:'var(--known-bg)', color:'var(--ink)'}}>
            <div className="flex items-center gap-2"><span className="font-bold" style={{color:'var(--known)'}} dir="rtl">ניסוח טוב יותר:</span>
              <button className="hit w-8 h-8 rounded-full grid place-items-center" onClick={()=>speakText(m.correction,.85,voice)} aria-label="השמעת הנוסח המתוקן"><IconSpeaker size={14}/></button></div>
            <div dir="ltr" className="book text-base text-left">{m.correction}</div>{m.tip&&<div dir="rtl" className="text-xs text-muted text-right">{m.tip}</div>}</div>}
        </div>))}
      {busy&&<div className="flex gap-2 items-center text-muted text-sm" dir="rtl" role="status"><LogoMark size={28} radius={8}/>לומי חושבת…</div>}
      <div ref={endRef}></div>
    </section>
    {err&&<div className="rounded-xl p-3 text-sm flex items-center gap-3 flex-wrap" role="alert" style={{background:'var(--bad-soft)', color:'var(--bad)'}}><span className="flex-1"><Bi>{err}</Bi></span>
      {msgs.length===0&&<button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>ask([])}>ניסיון חוזר</button>}{msgs.length>0&&msgs[msgs.length-1].from==='me'&&<button className="btn btn-line px-3 py-1.5 text-sm" onClick={()=>ask(msgs)}>שליחה מחדש</button>}</div>}
    <div className="talk-composer card p-2 flex items-center gap-2" dir="ltr">
      <button className={`btn w-14 h-14 shrink-0 ${listening?'pop':''}`} style={{borderRadius:'50%', background:listening?'var(--bad)':'var(--primary)', color:'var(--primary-ink)'}} onClick={mic} disabled={busy&&!listening} aria-label={listening?'עצירת ההקשבה':'דברו באנגלית'} aria-pressed={listening}><IconMic size={24}/></button>
      <form className="flex-1 min-w-0 flex items-center gap-2" onSubmit={e=>{ e.preventDefault(); submit(text,false); }}>
        <input id="ai-input" dir="ltr" className="field book text-lg flex-1 min-w-0" style={{minHeight:'48px'}} autoComplete="off" maxLength={400} placeholder={listening?'Listening…':'Speak or type in English'} value={text} onChange={e=>setText(e.target.value)}/>
        <button className="btn btn-primary h-12 px-4 shrink-0" disabled={!text.trim()||busy} aria-label="שליחה"><span dir="rtl">שלח</span></button></form>
    </div>
  </div>);
}
function AiTalkCard({state, actions, known, voice, profileName}){
  const [scen,setScen]=useState(null); const [lv,setLv]=useState(levelFor(known)); const session=useSession();
  if(scen) return <AiChat key={scen} scenario={scen} level={lv} name={profileName} voice={voice} actions={actions} settings={state.settings} onBack={()=>setScen(null)}/>;
  return (<section className="card ai-card p-5 sm:p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3"><span className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0" style={{background:'var(--primary-soft)'}} aria-hidden="true">🤖</span>
      <div><div className="eyebrow">חדש</div><h2 className="text-xl sm:text-2xl font-extrabold">שיחה חופשית עם לומי (AI)</h2></div></div>
    <p className="text-sm text-muted leading-relaxed">אפשר לדבר או להקליד כל דבר, ולומי עונה, שואלת ומתקנת בעדינות. היא מתאימה את האנגלית לרמה שלכם.</p>
    {!AI_OK ? <p className="text-sm rounded-xl p-3" style={{background:'var(--sun-soft)'}}>השיחה עם ה־AI זמינה באתר <bdi dir="ltr">lumienglish.co.il</bdi>.</p> : <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="בחירת נושא לשיחה">{AI_SCEN.map(([k,e,l])=><button key={k} className="filter-pill flex items-center gap-1.5" onClick={()=>setScen(k)}><span aria-hidden="true">{e}</span>{l}</button>)}</div>
      <div className="flex items-center gap-2 flex-wrap text-sm"><span className="text-muted">רמת האנגלית:</span>
        <div className="seg" role="group" aria-label="רמת האנגלית">{LEVELS.map(L=><button key={L.n} aria-pressed={lv===L.n} onClick={()=>setLv(L.n)}>שלב {L.n}</button>)}</div></div>
      <p className="text-xs text-muted">{session?'מחוברים: עד 80 הודעות ביום.':'כאורחים אפשר עד 15 הודעות ביום. עם חשבון יש עד 80.'} ההודעות נשלחות לשירות Gemini של גוגל כדי לקבל תשובה, ואינן נשמרות אצלנו.</p></>}
  </section>);
}

