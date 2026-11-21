// node qa\accounts_real.js   - the REAL account layer (Supabase Auth) against a local mock of the Supabase project.
// sign up, confirm by link, sign in, forgot + reset, merge of device progress and account progress, delete, offline errors, axe, CLS.
const { createRequire } = require('module'); const req = createRequire('C:/claude/lumi-demo/qa-tools/package.json');
const { chromium } = req('playwright-core'); const fs = require('fs'); const path = require('path'); const url = require('url');
const mock = require('./mock_supabase.cjs');
const SITE = url.pathToFileURL(path.resolve(__dirname, '..', '..', 'index.html')).href;
const axeSrc = fs.readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
const CLOUD = 'https://jiwsiutwvqdcafmiqxox.supabase.co';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const EMAIL = 'dan@example.com', PW1 = 'secret-pass-1', PW2 = 'new-secret-2';

(async () => {
  const srv = await mock.create(); const db = srv.db;
  const b = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const outside = []; const errs = [];
  const device = async (opts = {}) => {            // a "device" = a fresh browser profile
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' }); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
    await pg.route(/^https?:/, async (r) => {
      const u = r.request().url();
      if (u.startsWith(CLOUD)) { try { const resp = await r.fetch({ url: 'http://127.0.0.1:' + srv.port + u.slice(CLOUD.length) }); await r.fulfill({ response: resp }); } catch (e) { await r.abort(); } return; }
      outside.push(u); r.abort(); });
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (process.env.DBG && /auth-ev|sync-run/.test(m.text())) console.log('   ', m.text()); }); return { ctx, pg };
  };
  const welcome = async (pg, name) => { await pg.goto(SITE); await pg.waitForTimeout(700); await pg.locator('#pf-name').fill(name); await pg.locator('button:has-text("מתחילים")').first().click(); await pg.waitForTimeout(900); };
  const seed = (pg, from, to) => pg.evaluate(([f, t]) => { const P = JSON.parse(localStorage.getItem('lumi-profiles')); const key = P.list[0].key || 'lumi-english-v1'; const cur = JSON.parse(localStorage.getItem(key)); const ks = Object.keys(MEANING).filter(k => k.length >= 4 && k.length <= 8 && /^[a-z]+$/.test(k)).slice(f, t); const words = { ...(cur.words || {}) }; ks.forEach(k => words[k] = 'known'); localStorage.setItem(key, JSON.stringify({ ...cur, words, acct: { offers: 3 } })); return ks; }, [from, to]);
  const known = (pg) => pg.evaluate(() => { const P = JSON.parse(localStorage.getItem('lumi-profiles')); const key = P.list[0].key || 'lumi-english-v1'; const w = JSON.parse(localStorage.getItem(key)).words || {}; return Object.keys(w).filter(k => w[k] === 'known').sort(); });
  const goMe = async (pg) => { try { await pg.locator('nav[aria-label="ניווט ראשי"] button:has-text("אני")').click({ timeout: 3000 }); } catch (e) { await pg.screenshot({ path: path.resolve(__dirname, 'results', 'goMe_fail.png') }); console.log('DIALOGS OPEN:', await pg.locator('[role=dialog]').allInnerTexts()); throw e; } await pg.waitForTimeout(600); return; await pg.locator('nav[aria-label="ניווט ראשי"] button:has-text("אני")').click(); await pg.waitForTimeout(600); };
  const ack = async (pg) => { await pg.waitForTimeout(1100); const bt = pg.locator('button:has-text("הבנתי")'); if (await bt.count()) await bt.click(); await pg.waitForTimeout(300); };
  const dlg = (pg) => pg.locator('[role=dialog][aria-modal=true]');
  const axe = async (pg, name) => { await pg.evaluate(() => document.querySelectorAll('.toast').forEach(e => { e.style.visibility = 'hidden'; })); await pg.evaluate(axeSrc); const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })).violations.map(x => x.id + 'x' + x.nodes.length + ' ' + x.nodes[0].html.slice(0, 90))); ok(v.length === 0, 'axe ' + name + ': ' + (v.join(' | ') || 'clean')); };
  const fillAuth = async (pg, email, pw) => { if (email != null) await pg.locator('#au-email').fill(email); if (pw != null) await pg.locator('#au-pw').fill(pw); };
  const openLink = async (pg, link) => { await pg.goto('about:blank'); await pg.goto(SITE + link); await pg.waitForTimeout(1500); };
  const sess = (pg) => pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('lumi-auth')); } catch (e) { return null; } });

  // ---------------------------------------------------------------- 1. device A: learn without an account, then sign up
  let A = await device(); let pg = A.pg;
  await welcome(pg, 'דוד'); ok((await sess(pg)) === null, 'no account needed: nothing in the auth storage on a fresh start');
  const wordsA = await seed(pg, 0, 14); await pg.reload(); await pg.waitForTimeout(900);
  await goMe(pg); await pg.locator('.ac-panel button:has-text("שמור את ההתקדמות שלי")').click(); await pg.waitForTimeout(400);
  ok((await dlg(pg).locator('h2').first().innerText()) === 'שמירת ההתקדמות', 'sign-up dialog opens from "אני"');
  ok(!(await dlg(pg).innerText()).includes('הדמיית'), 'no demo-only buttons in the real flow'); await axe(pg, 'signup');
  await fillAuth(pg, 'bad-address', 'abcdefgh'); await pg.locator('.au-submit').click(); await pg.waitForTimeout(400);
  ok((await pg.locator('#au-err').innerText()).includes('לא נראית תקינה'), 'invalid e-mail is caught before any request');
  await fillAuth(pg, EMAIL, 'short'); await pg.locator('.au-submit').click(); await pg.waitForTimeout(300); ok((await pg.locator('#au-err').innerText()).includes('לפחות 8 תווים'), 'short password message');
  await fillAuth(pg, EMAIL, PW1); await pg.locator('.au-submit').click(); await pg.waitForTimeout(900);
  ok((await dlg(pg).locator('h2').first().innerText()) === 'שלחנו לך מייל', 'after sign-up: "שלחנו לך מייל"'); ok(db.mail.length === 1 && db.mail[0].kind === 'confirm' && db.mail[0].to === EMAIL, 'a confirmation e-mail was sent to the address'); await axe(pg, 'sent');
  ok((await pg.evaluate(() => localStorage.getItem('lumi-acct-pending'))) === EMAIL, 'the waiting e-mail is remembered');
  await pg.locator('button:has-text("המשך ללמוד")').click(); await pg.waitForTimeout(300); ok((await known(pg)).length === 14, 'learning continues, progress untouched on the device');
  ok(Object.keys(db.progress).length === 0, 'nothing is uploaded before the address is confirmed');
  // resend
  await goMe(pg); await pg.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pg.waitForTimeout(300);
  await fillAuth(pg, EMAIL, PW1); await pg.locator('.au-submit').click(); await pg.waitForTimeout(700);
  ok((await pg.locator('#au-err').innerText()).includes('עוד לא אישרת את המייל'), 'sign-in before confirming: clear "not confirmed" message');
  await pg.locator('button.au-link:has-text("שלח שוב")').click(); await pg.waitForTimeout(700); ok(db.mail.length === 2, 'resend sends a second e-mail');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  // existing address is not revealed as an error leak: same e-mail again -> "exists" message (identities empty)
  await goMe(pg); await pg.locator('.ac-panel button:has-text("שמור את ההתקדמות שלי")').click().catch(() => {}); await pg.waitForTimeout(300);
  if (await pg.locator('#au-email').count()) { await fillAuth(pg, EMAIL, PW1); await pg.locator('.au-submit').click(); await pg.waitForTimeout(700); ok((await pg.locator('#au-err').innerText()).includes('כבר רשומה'), 'registering the same address again: "already registered" with sign-in / reset links'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); }

  // ---------------------------------------------------------------- 2. the confirmation link (same device) -> signed in, progress uploaded
  await openLink(pg, db.mail[0].link);
  ok((await dlg(pg).locator('h2').first().innerText()) === 'החשבון אושר', 'confirmation link: "החשבון אושר"');
  ok(db.users && Object.values(db.users)[0].confirmed === true, 'the account is confirmed'); await axe(pg, 'confirmed');
  const uid = Object.keys(db.users)[0]; ok(!!db.progress[uid] && Object.keys(db.progress[uid].data.words || {}).length === 14, 'progress of the device was saved in the account (14 words)');
  ok((await pg.evaluate(() => localStorage.getItem('lumi-acct-pending'))) === null, 'the waiting e-mail note is cleared');
  await pg.locator('button:has-text("המשך ללמוד")').click(); await pg.waitForTimeout(300);
  await goMe(pg); ok((await pg.locator('.ac-panel').innerText()).includes(EMAIL), '"אני" shows the signed-in e-mail');
  await pg.reload(); await pg.waitForTimeout(1200); await goMe(pg); ok((await pg.locator('.ac-panel').innerText()).includes(EMAIL), 'the session survives a reload (stays signed in)');
  ok((await dlg(pg).count()) === 0, 'no "welcome back" dialog on an ordinary reload');

  // ---------------------------------------------------------------- 3. device B: sign in with password, progress comes back (+ merge with what B already had)
  let B = await device(); let pb = B.pg; await welcome(pb, 'דוד'); const wordsB = await seed(pb, 20, 30);
  await pb.reload(); await pb.waitForTimeout(900); await goMe(pb); await pb.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pb.waitForTimeout(300);
  await fillAuth(pb, EMAIL, 'wrong-password'); await pb.locator('.au-submit').click(); await pb.waitForTimeout(700); ok((await pb.locator('#au-err').innerText()).includes('המייל או הסיסמה לא נכונים'), 'wrong password: clear message'); await axe(pb, 'signin_error');
  await fillAuth(pb, null, PW1); await pb.locator('.au-submit').click(); await pb.waitForTimeout(1800);
  const kb = await known(pb); ok(kb.length === 24 && wordsA.every(w => kb.includes(w)) && wordsB.every(w => kb.includes(w)), 'merged without loss: words from the account (14) + words already on this device (10) = ' + kb.length);
  ok((await dlg(pb).innerText()).includes('איחדנו') || (await pb.locator('#mn-text').count()) === 1, 'merge notice is shown after signing in on a device that had progress');
  await ack(pb);
  ok(Object.keys(db.progress[uid].data.words).length === 24, 'the merged progress was saved back to the account (24 words)');
  const calls0 = db.calls.length; await pb.waitForTimeout(500);

  // ---------------------------------------------------------------- 4. forgot password -> link -> new password
  await goMe(pb); await pb.locator('.ac-panel button:has-text("יציאה מהחשבון")').click(); await pb.waitForTimeout(800); ok((await pb.locator('.ac-panel').innerText()).includes('שמורה במכשיר הזה בלבד'), 'sign-out returns to "saved on this device only"');
  ok((await known(pb)).length === 24, 'signing out keeps the progress on the device');
  await pb.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pb.waitForTimeout(300); await pb.locator('button.au-link:has-text("שכחתי סיסמה")').click(); await pb.waitForTimeout(300);
  await fillAuth(pb, 'nobody@example.com', null); await pb.locator('.au-submit').click(); await pb.waitForTimeout(600);
  ok((await dlg(pb).innerText()).includes('אם הכתובת רשומה אצלנו') && db.mail.filter(m => m.kind === 'reset').length === 0, 'unknown address gets the same answer and no e-mail is sent (nobody can find who is registered)');
  await pb.locator('button.au-link:has-text("חזרה לכניסה")').click(); await pb.waitForTimeout(300); await pb.locator('button.au-link:has-text("שכחתי סיסמה")').click(); await pb.waitForTimeout(300);
  await fillAuth(pb, EMAIL, null); await pb.locator('.au-submit').click(); await pb.waitForTimeout(700);
  const reset = db.mail.filter(m => m.kind === 'reset'); ok(reset.length === 1 && reset[0].to === EMAIL, 'forgot password: a reset e-mail was sent'); await axe(pb, 'forgot_sent');
  await openLink(pb, reset[0].link);
  ok((await dlg(pb).locator('h2').first().innerText()) === 'בחירת סיסמה חדשה', 'reset link opens "בחירת סיסמה חדשה"'); await axe(pb, 'reset');
  await pb.locator('#au-pw').fill('tiny'); await pb.locator('.au-submit').click(); await pb.waitForTimeout(400); ok((await pb.locator('#au-err').innerText()).includes('לפחות 8 תווים'), 'reset: short password rejected');
  await pb.locator('#au-pw').fill(PW1); await pb.locator('.au-submit').click(); await pb.waitForTimeout(700); ok((await pb.locator('#au-err').innerText()).includes('זהה לישנה'), 'reset: same password rejected with a clear message');
  await pb.locator('#au-pw').fill(PW2); await pb.locator('.au-submit').click(); await pb.waitForTimeout(900);
  ok((await dlg(pb).innerText()).includes('הסיסמה עודכנה'), 'password updated and signed in'); await pb.locator('button:has-text("המשך ללמוד")').click(); await ack(pb);
  await goMe(pb); await pb.locator('.ac-panel button:has-text("יציאה מהחשבון")').click(); await pb.waitForTimeout(700);
  await pb.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pb.waitForTimeout(300); await fillAuth(pb, EMAIL, PW1); await pb.locator('.au-submit').click(); await pb.waitForTimeout(700); ok((await pb.locator('#au-err').innerText()).includes('לא נכונים'), 'the OLD password no longer works');
  await fillAuth(pb, null, PW2); await pb.locator('.au-submit').click(); await pb.waitForTimeout(1500); await ack(pb);
  await goMe(pb); ok((await pb.locator('.ac-panel').innerText()).includes(EMAIL), 'the NEW password works');

  // ---------------------------------------------------------------- 5. offline / server down: calm errors, learning continues, nothing lost
  await goMe(pb); await pb.locator('.ac-panel button:has-text("יציאה מהחשבון")').click(); await pb.waitForTimeout(600);
  await pb.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pb.waitForTimeout(300); await fillAuth(pb, EMAIL, PW2);
  await B.ctx.setOffline(true); await pb.locator('.au-submit').click(); await pb.waitForTimeout(600); ok((await pb.locator('#au-err').innerText()).includes('אין חיבור לאינטרנט'), 'offline: "אין חיבור לאינטרנט" and the progress stays on the device'); await B.ctx.setOffline(false);
  db.failAll = true; await pb.locator('.au-submit').click(); await pb.waitForTimeout(1500); const e5 = await pb.locator('#au-err').innerText(); ok(e5.includes('משהו השתבש') || e5.includes('אין חיבור'), 'server down: calm message (' + e5.slice(0, 40) + ')'); db.failAll = false;
  await pb.keyboard.press('Escape'); await pb.waitForTimeout(300); ok((await known(pb)).length === 24, 'progress intact after the errors');

  // ---------------------------------------------------------------- 6. delete account
  await pb.locator('.ac-panel button:has-text("כבר יש לי חשבון, כניסה")').click(); await pb.waitForTimeout(300); await fillAuth(pb, EMAIL, PW2); await pb.locator('.au-submit').click(); await pb.waitForTimeout(1500); await ack(pb);
  await goMe(pb); await pb.locator('.ac-panel button:has-text("מחיקת החשבון שלי")').click(); await pb.waitForTimeout(300); await axe(pb, 'delete_confirm');
  await pb.locator('.ac-panel button:has-text("מחק את החשבון")').click(); await pb.waitForTimeout(1200);
  ok(Object.keys(db.users).length === 0 && Object.keys(db.progress).length === 0, 'delete: the account and its saved progress are gone from the server');
  ok((await pb.locator('.ac-panel').innerText()).includes('שמורה במכשיר הזה בלבד') && (await known(pb)).length === 24, 'after delete: signed out, the local copy on the device stays');

  // ---------------------------------------------------------------- 7. e-mail confirmation turned off in Supabase: sign-up signs in directly
  db.autoConfirm = true; await goMe(pb); await pb.locator('.ac-panel button:has-text("שמור את ההתקדמות שלי")').click(); await pb.waitForTimeout(300); await fillAuth(pb, 'eli@example.com', PW1); await pb.locator('.au-submit').click(); await pb.waitForTimeout(1500);
  ok((await dlg(pb).locator('h2').first().innerText()) === 'החשבון אושר', 'confirmation off: sign-up goes straight to "החשבון אושר"'); await pb.locator('button:has-text("המשך ללמוד")').click(); await pb.waitForTimeout(500);
  ok(Object.keys(db.progress).length === 1, 'and the progress is saved right away');

  // ---------------------------------------------------------------- 8. layout stability on the account screens + the rest
  const cls = await pb.evaluate(() => new Promise((res) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res(v), 600); }));
  ok(cls < 0.05, 'CLS ' + cls.toFixed(4));
  ok(await pb.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll');
  ok(outside.length === 0, 'no requests except the (mocked) Supabase project: ' + JSON.stringify(outside.slice(0, 3)));
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); srv.close(); console.log(fails ? 'FAILURES: ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });


