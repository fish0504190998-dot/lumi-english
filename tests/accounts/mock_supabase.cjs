// A tiny stand-in for the Supabase project, just enough for supabase-js: /auth/v1 (signup, token, recover, user, logout, resend) and /rest/v1 (progress, rpc delete_my_account).
// Everything lives in memory. `mail` records every e-mail "sent", with the link that would be inside it, so tests can click it.
const http = require('http');
const crypto = require('crypto');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u, exp) => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp, iat: Math.floor(Date.now() / 1000) }) + '.mocksig';

function create({ autoConfirm = false } = {}) {
  const db = { users: {}, tokens: {}, progress: {}, mail: [], calls: [], autoConfirm };
  const userOut = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.confirmed ? u.created : null, phone: '', created_at: u.created, updated_at: u.created, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: u.meta || {}, identities: [{ id: u.id, user_id: u.id, identity_data: { email: u.email, sub: u.id }, provider: 'email' }] });
  const session = (u) => { const exp = Math.floor(Date.now() / 1000) + 3600; const access = jwt(u, exp); const refresh = crypto.randomBytes(8).toString('hex'); db.tokens[access] = u.id; db.tokens[refresh] = u.id; return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: userOut(u) }; };
  const byEmail = (e) => Object.values(db.users).find((u) => u.email === String(e || '').toLowerCase());
  const authUser = (req) => { const t = String(req.headers.authorization || '').replace(/^Bearer /, ''); const id = db.tokens[t]; return id && db.users[id] ? db.users[id] : null; };
  const linkFor = (u, type) => { const s = session(u); return `#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=${type}`; };
  db.linkFor = linkFor;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x'); let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) {}
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
      const send = (code, obj, extra = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...cors, ...extra }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
      const err = (code, error_code, msg) => send(code, { code, error_code, msg, message: msg });
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      const p = url.pathname; db.calls.push(req.method + ' ' + p);
      if (db.failAll) return err(503, 'unexpected_failure', 'Service temporarily unavailable');
      // ---- auth
      if (p === '/auth/v1/signup' && req.method === 'POST') {
        const email = String(body.email || '').toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err(400, 'validation_failed', 'Unable to validate email address: invalid format');
        if (String(body.password || '').length < 8) return err(422, 'weak_password', 'Password should be at least 8 characters.');
        const ex = byEmail(email);
        if (ex) { const o = userOut(ex); o.identities = []; return send(200, o); }                       // Supabase hides "already registered" this way when e-mail confirmation is on
        const u = { id: crypto.randomUUID(), email, password: body.password, confirmed: db.autoConfirm, created: new Date().toISOString(), meta: body.data };
        db.users[u.id] = u;
        if (db.autoConfirm) return send(200, session(u));
        db.mail.push({ to: email, kind: 'confirm', get link() { u.confirmed = true; return linkFor(u, 'signup'); } }); return send(200, userOut(u));
      }
      if (p === '/auth/v1/token' && req.method === 'POST') {
        const gt = url.searchParams.get('grant_type');
        if (gt === 'password') { const u = byEmail(body.email); if (!u || u.password !== body.password) return err(400, 'invalid_credentials', 'Invalid login credentials'); if (!u.confirmed) return err(400, 'email_not_confirmed', 'Email not confirmed'); return send(200, session(u)); }
        if (gt === 'refresh_token') { const id = db.tokens[body.refresh_token]; const u = id && db.users[id]; if (!u) return err(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found'); return send(200, session(u)); }
        return err(400, 'bad_grant', 'unsupported grant');
      }
      if (p === '/auth/v1/recover' && req.method === 'POST') { const u = byEmail(body.email); if (u) db.mail.push({ to: u.email, kind: 'reset', link: linkFor(u, 'recovery') }); return send(200, {}); }
      if (p === '/auth/v1/resend' && req.method === 'POST') { const u = byEmail(body.email); if (u && !u.confirmed) db.mail.push({ to: u.email, kind: 'confirm', get link() { u.confirmed = true; return linkFor(u, 'signup'); } }); return send(200, {}); }
      if (p === '/auth/v1/user' && req.method === 'GET') { const u = authUser(req); return u ? send(200, userOut(u)) : err(401, 'bad_jwt', 'invalid JWT'); }
      if (p === '/auth/v1/user' && req.method === 'PUT') {
        const u = authUser(req); if (!u) return err(401, 'bad_jwt', 'invalid JWT');
        if (body.password) { if (String(body.password).length < 8) return err(422, 'weak_password', 'Password should be at least 8 characters.'); if (body.password === u.password) return err(422, 'same_password', 'New password should be different from the old password.'); u.password = body.password; u.confirmed = true; }
        return send(200, userOut(u));
      }
      if (p === '/auth/v1/logout' && req.method === 'POST') { res.writeHead(204, cors); return res.end(); }
      // ---- rest
      if (p === '/rest/v1/progress') {
        const u = authUser(req); if (!u) return send(401, { code: 'PGRST301', message: 'JWT expired or missing', hint: null, details: null });
        if (req.method === 'GET') { const row = db.progress[u.id]; const arr = row ? [row] : []; if (/object\+json/.test(req.headers.accept || '')) return row ? send(200, row) : send(406, { code: 'PGRST116', message: 'The result contains 0 rows', details: 'The result contains 0 rows', hint: null }); return send(200, arr); }
        if (req.method === 'POST') { const r = Array.isArray(body) ? body[0] : body; if (r.user_id !== u.id) return send(403, { code: '42501', message: 'new row violates row-level security policy for table "progress"' }); db.progress[u.id] = { user_id: u.id, data: r.data, updated_at: r.updated_at || new Date().toISOString() }; return send(201, undefined); }
        if (req.method === 'DELETE') { delete db.progress[u.id]; return send(204); }
      }
      if (p === '/rest/v1/rpc/delete_my_account' && req.method === 'POST') { const u = authUser(req); if (!u) return send(401, { code: 'PGRST301', message: 'JWT expired or missing' }); delete db.users[u.id]; delete db.progress[u.id]; return send(200, null); }
      return send(404, { message: 'not mocked: ' + req.method + ' ' + p });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ db, port: server.address().port, close: () => server.close() })));
}
module.exports = { create };
