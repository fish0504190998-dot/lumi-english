/* ---------- cloud (Supabase): accounts, progress sync, community stories ---------- */
/* The publishable key is meant to be public: it ships inside every Supabase web app. Access is decided by the
   row level security rules in supabase-setup.sql and supabase-community.sql, not by hiding this key. */
const CLOUD_CFG={ url:'https://jiwsiutwvqdcafmiqxox.supabase.co', key:'sb_publishable_EfvswdyANwtEjarf0FhQrA_K6-KgDZj' };
const SUPPORT_EMAIL='support@lumi-english.app';     // change to your real support address
let SB=null;
try{ if(window.supabase&&window.supabase.createClient) SB=window.supabase.createClient(CLOUD_CFG.url, CLOUD_CFG.key, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'lumi-auth'}}); }catch(e){ SB=null; }
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
  const [mode,setMode]=useState('in'); const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(null);
  if(!SB) return <p className="text-sm text-muted">שמירה בענן זמינה באתר <bdi dir="ltr">lumi-english.netlify.app</bdi>.</p>;
  const submit=async e=>{ e.preventDefault(); setBusy(true); setMsg(null);
    try{
      if(mode==='forgot'){ const {error}=await SB.auth.resetPasswordForEmail(email.trim(),{redirectTo:SITE_URL+'/'}); if(error) throw error; setMsg({ok:true, t:'שלחנו לך מייל עם קישור לבחירת סיסמה חדשה.'}); }
      else if(mode==='up'){ const {data,error}=await SB.auth.signUp({email:email.trim(), password:pw, options:{emailRedirectTo:SITE_URL+'/'}}); if(error) throw error;
        if(data.session) onDone(data.session); else setMsg({ok:true, t:'נרשמת! שלחנו מייל אישור. לחצו על הקישור במייל, ואז התחברו כאן.'}); }
      else { const {data,error}=await SB.auth.signInWithPassword({email:email.trim(), password:pw}); if(error) throw error; onDone(data.session); }
    }catch(x){ setMsg({ok:false, t:cloudMsg(x)}); } setBusy(false); };
  return (<form className="flex flex-col gap-3" onSubmit={submit}>
    {intro&&<p className="text-sm text-muted">{intro}</p>}
    {mode!=='forgot'&&<div className="seg self-start" role="group" aria-label="כניסה או הרשמה"><button type="button" aria-pressed={mode==='in'} onClick={()=>setMode('in')}>התחברות</button><button type="button" aria-pressed={mode==='up'} onClick={()=>setMode('up')}>הרשמה</button></div>}
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
  try{ const {data,error}=await SB.from('community_stories').select('id,user_id,author_name,title,content,level,topic,cover_emoji,cover_image,is_approved,created_at').order('created_at',{ascending:false}).limit(200);
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
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') close(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  const send=async e=>{ e.preventDefault(); setBusy(true); setErr('');
    const {error}=await SB.from('story_reports').insert({story_id:story.cid, reason, details:cleanText(details,500)||null, reporter_id:(SESSION&&SESSION.user&&SESSION.user.id)||null});
    setBusy(false); if(error) setErr(cloudMsg(error)); else { toast('תודה, הדיווח נשלח ונבדוק אותו'); close(); } };
  return (<div className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <form role="dialog" aria-modal="true" aria-label="דיווח על תוכן" className={`sheet card w-full sm:max-w-md rounded-b-none sm:rounded-[20px] p-5 flex flex-col gap-3 ${closing?'out':''}`} onClick={e=>e.stopPropagation()} onSubmit={send}>
      <div className="flex items-center gap-3"><h2 className="text-xl font-extrabold me-auto">דיווח על תוכן</h2><button type="button" className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה"><IconX size={18}/></button></div>
      <p className="text-sm text-muted">על הסיפור <bdi dir="ltr" className="book">{story.title}</bdi>. הדיווח אנונימי, ומנהלי האתר יבדקו אותו.</p>
      <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold mb-1">מה הבעיה?</legend>
        {REPORT_REASONS.map(([k,l])=><label key={k} className="flex items-center gap-3 rounded-xl bg-sunk px-3 min-h-[44px] cursor-pointer"><input type="radio" name="report-reason" value={k} checked={reason===k} onChange={()=>setReason(k)}/>{l}</label>)}</fieldset>
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
  privacy:{title:'מדיניות פרטיות', body:[
    ['איזה מידע נאסף','כשנרשמים לשמירה בענן, נשמרים כתובת המייל (לצורך התחברות), התקדמות הלמידה (מילים מוכרות ומילים בלמידה, היסטוריית תרגול, רצף והישגים), הסיפורים והתמונות שהעליתם, ושם התצוגה שבחרתם. בלי הרשמה, כל המידע נשמר רק בדפדפן שלכם ולא נשלח אלינו.'],
    ['איפה המידע נשמר','המידע נשמר בתשתית ענן מאובטחת של Supabase. כל משתמש מבודד ברמת השורה (Row Level Security): רק אתם יכולים לקרוא ולשנות את ההתקדמות שלכם. סיפורים שבחרתם לפרסם כציבוריים גלויים לכל המשתמשים יחד עם שם התצוגה שבחרתם, ללא כתובת המייל.'],
    ['שיתוף עם צדדים שלישיים','איננו מוכרים את המידע שלכם, ואיננו משתפים אותו עם מפרסמים או עם צדדים שלישיים לצורכי שיווק. המידע משמש רק להפעלת השירות.'],
    ['שירותים חיצוניים','חיפוש מילה שאינה במילון המובנה נשלח לשירותי מילון ותרגום חיצוניים (dictionaryapi.dev ו־MyMemory). זיהוי דיבור מתבצע על ידי הדפדפן שלכם. קבוצות לימוד שומרות שם, דמות ונקודות בלבד.'],
    ['מחיקת חשבון ונתונים','אפשר למחוק את החשבון וכל הנתונים בכל רגע: לוחצים על השם שלכם בראש המסך ובוחרים "מחק את החשבון והנתונים שלי". המחיקה סופית. אפשר גם לבקש מחיקה במייל לכתובת שבעמוד "צור קשר".']]},
  access:{title:'הצהרת נגישות', body:[
    ['המחויבות שלנו','אנו רואים חשיבות רבה בהנגשת האתר לאנשים עם מוגבלויות, ופועלים להתאים אותו לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג־2013, ולתקן הישראלי ת"י 5568 המבוסס על הנחיות WCAG 2.1 ברמה AA, ככל האפשר.'],
    ['התאמות שבוצעו באתר','פלטת צבעים חמה בניגודיות טובה, במצב בהיר ובמצב כהה. טקסט ברור עם אפשרות להגדלת גופן בעמוד הקריאה. ניווט מלא במקלדת: Tab למעבר, Enter לבחירה ו־Escape לסגירת חלונות. תוויות בעברית לקוראי מסך, וטקסט חלופי לתמונות. כפתורים בגודל נוח למגע (לפחות 44 פיקסלים). הקראה קולית של כל טקסט באנגלית, בשלוש מהירויות. התאמה לבקשת מערכת ההפעלה להפחתת תנועה.'],
    ['מגבלות ידועות','תעתיקי ההגייה האוטומטיים למילים שאינן במילון הם משוערים. זיהוי הדיבור תלוי בדפדפן ופועל ב־Chrome וב־Edge. אנו ממשיכים לשפר את הנגישות באופן שוטף.'],
    ['רכז/ת נגישות','נתקלתם בבעיית נגישות? נשמח לשמוע ולתקן. פנו אלינו במייל שבעמוד "צור קשר", וציינו את העמוד, את הבעיה ואת הדפדפן שבו השתמשתם. נשתדל לענות תוך 14 ימים.'],
    ['עדכון ההצהרה','הצהרה זו עודכנה לאחרונה בנובמבר 2026.']]},
  contact:{title:'צור קשר', body:[['שאלות, בקשות ודיווחים','לכל שאלה, בקשה למחיקת נתונים, דיווח על בעיית נגישות או על תוכן, כתבו לנו:']]}
};
function LegalModal({page, onClose}){
  const [closing, close]=useClosing(onClose); const P=LEGAL[page]; const [copied,setCopied]=useState(false);
  useEffect(()=>{ const k=e=>{ if(e.key==='Escape') close(); }; window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k); },[]);
  return (<div className={`overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center ${closing?'out':''}`} style={{background:'color-mix(in srgb,var(--ink) 40%,transparent)'}} onClick={close}>
    <div role="dialog" aria-modal="true" aria-labelledby="legal-title" className={`sheet card w-full sm:max-w-2xl rounded-b-none sm:rounded-[20px] flex flex-col ${closing?'out':''}`} style={{maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3 p-5 border-b border-line"><h2 id="legal-title" className="text-2xl font-extrabold me-auto">{P.title}</h2>
        <button className="btn btn-ghost w-11 h-11" onClick={close} aria-label="סגירה" autoFocus><IconX size={18}/></button></div>
      <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 legal" style={{paddingBottom:'max(24px, env(safe-area-inset-bottom,0px))'}}>
        {P.body.map(([h,t])=><section key={h}><h3 className="text-lg font-extrabold mb-1">{h}</h3><p className="leading-relaxed"><Bi>{t}</Bi></p></section>)}
        {page==='contact'&&<div className="flex items-center gap-2 flex-wrap"><bdi dir="ltr" className="text-xl font-bold select-all rounded-xl bg-sunk px-4 py-2">{SUPPORT_EMAIL}</bdi>
          <button className="btn btn-line px-4" onClick={async()=>{ if(await copyText(SUPPORT_EMAIL)) setCopied(true); }}>{copied?'הועתק ✓':'העתקת הכתובת'}</button></div>}
      </div>
    </div></div>);
}
function Footer({onOpen}){
  const L=[['terms','תנאי שימוש'],['privacy','מדיניות פרטיות'],['access','הצהרת נגישות'],['contact','צור קשר']];
  return (<footer className="gutter border-t border-line mt-10" style={{paddingBlock:'20px 32px'}}><div className="max-w-[860px] mx-auto flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted">
    <span className="me-auto"><bdi dir="ltr">Lumi English</bdi> · לומדים אנגלית בכיף</span>
    {L.map(([k,l])=><button key={k} className="hit px-2 min-h-[44px] underline-offset-4 hover:underline" onClick={()=>onOpen(k)}>{l}</button>)}
  </div></footer>);
}

