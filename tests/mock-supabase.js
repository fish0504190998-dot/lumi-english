// Tiny in-memory stand-in for the Supabase endpoints the app uses (auth, progress, community stories, reports, delete account)
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
module.exports=function makeMock(){
  const db={users:{}, byEmail:{}, progress:{}, stories:[], reports:[], log:[]};
  let n=0;
  const mkSession=u=>{ const exp=Math.floor(Date.now()/1000)+3600; const jwt=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:u.id,email:u.email,role:'authenticated',aud:'authenticated',exp})}.sig`;
    return {access_token:jwt, token_type:'bearer', expires_in:3600, expires_at:exp, refresh_token:'r_'+u.id, user:{id:u.id,email:u.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}}; };
  const uidFrom=req=>{ const a=req.headers()['authorization']||''; const t=a.replace('Bearer ',''); try{ const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()); return p.role==='authenticated'?p.sub:null; }catch(e){ return null; } };
  const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'*','content-type':'application/json'};
  async function handler(route){
    const req=route.request(); const url=new URL(req.url()); const p=url.pathname; const m=req.method();
    if(m==='OPTIONS') return route.fulfill({status:204,headers:H});
    const body=()=>{ try{ return JSON.parse(req.postData()||'null'); }catch(e){ return null; } };
    const ok=(o,s=200)=>route.fulfill({status:s,headers:H,body:JSON.stringify(o)});
    const uid=uidFrom(req); db.log.push(m+' '+p+(url.search?url.search.slice(0,60):''));
    if(p==='/auth/v1/signup'){ const b=body(); if(db.byEmail[b.email]) return ok({code:422,msg:'User already registered'},422); const u={id:'u'+(++n)+'-0000-0000-0000-000000000000'.slice(0,0)+'0000000000'.slice(0,0), email:b.email, pw:b.password}; u.id=`00000000-0000-0000-0000-0000000000${String(n).padStart(2,'0')}`; db.users[u.id]=u; db.byEmail[b.email]=u; return ok(mkSession(u)); }
    if(p==='/auth/v1/token'){ const b=body(); const u=db.byEmail[b.email]; if(!u||u.pw!==b.password) return ok({code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'},400); return ok(mkSession(u)); }
    if(p==='/auth/v1/user'){ const u=db.users[uid]; return u?ok(mkSession(u).user):ok({msg:'no'},401); }
    if(p==='/auth/v1/logout') return route.fulfill({status:204,headers:H});
    if(p==='/auth/v1/recover') return ok({});
    if(p==='/rest/v1/progress'){
      if(m==='GET'){ const w=url.searchParams.get('user_id'); const id=(w||'').replace('eq.',''); const row=uid&&id===uid&&db.progress[uid]?[db.progress[uid]]:[]; return (req.headers()['accept']||'').includes('pgrst.object')?(row.length?ok(row[0]):ok({code:'PGRST116',message:'none'},406)):ok(row); }
      if(m==='POST'){ if(!uid) return ok({code:'42501',message:'new row violates row-level security policy'},401); const b=body(); if(b.user_id!==uid) return ok({code:'42501',message:'new row violates row-level security policy'},403); db.progress[uid]={...b}; return route.fulfill({status:201,headers:H,body:''}); } }
    if(p==='/rest/v1/community_stories'){
      const acc=(req.headers()['accept']||'');
      if(m==='GET'){ const rows=db.stories.filter(s=>s.is_approved||s.user_id===uid).map(s=>({...s})); return ok(rows); }
      if(m==='POST'){ if(!uid) return ok({code:'42501',message:'new row violates row-level security policy'},401); const b=body(); if(b.user_id!==uid) return ok({code:'42501',message:'new row violates row-level security policy'},403);
        const row={...b,id:'s'+(++n)+'-aaaa-bbbb-cccc-ddddeeeeffff',is_approved:true,reports_count:0,created_at:new Date().toISOString()}; db.stories.push(row); return ok(acc.includes('pgrst.object')?row:[row],201); }
      if(m==='PATCH'){ const id=(url.searchParams.get('id')||'').replace('eq.',''); const s=db.stories.find(x=>x.id===id&&x.user_id===uid); if(!s) return ok(acc.includes('pgrst.object')?{code:'PGRST116',message:'none'}:[],acc.includes('pgrst.object')?406:200); const b=body(); delete b.is_approved; delete b.reports_count; Object.assign(s,b); return ok(acc.includes('pgrst.object')?s:[s]); }
      if(m==='DELETE'){ const id=(url.searchParams.get('id')||'').replace('eq.',''); db.stories=db.stories.filter(x=>!(x.id===id&&x.user_id===uid)); return route.fulfill({status:204,headers:H}); } }
    if(p==='/rest/v1/story_reports'&&m==='POST'){ const b=body(); db.reports.push(b); const s=db.stories.find(x=>x.id===b.story_id); if(s){ s.reports_count++; if(s.reports_count>=3) s.is_approved=false; } return route.fulfill({status:201,headers:H,body:''}); }
    if(p==='/rest/v1/rpc/delete_my_account'){ if(!uid) return ok({code:'42501',message:'permission denied for function delete_my_account'},401); const u=db.users[uid]; delete db.byEmail[u.email]; delete db.users[uid]; delete db.progress[uid]; db.stories=db.stories.filter(s=>s.user_id!==uid); return ok(null); }
    return ok({message:'unhandled '+m+' '+p},404);
  }
  return {db, handler};
};
