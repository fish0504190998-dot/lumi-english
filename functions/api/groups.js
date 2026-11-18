// Cloudflare Pages Function: /api/groups. Study groups for Lumi English: a tiny leaderboard API stored in Workers KV (binding LUMI_KV).
// POST {action:'create'|'join'|'report'|'leave', ...}   GET ?code=ABC123

const MAX_MEMBERS = 40;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const fail = (code, status = 400) => json({ error: code }, status);

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const avatarOk = (a) => (typeof a === "string" && a.length <= 8 ? a : "🙂");
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const publicView = (g) => ({
  code: g.code,
  name: g.name,
  members: Object.entries(g.members).map(([id, m]) => ({
    id, name: m.name, avatar: m.avatar, known: m.known || 0, streak: m.streak || 0,
    week: m.week || "", weekXp: m.weekXp || 0, weekWords: m.weekWords || 0, updated: m.updated || 0,
  })),
});

// thin wrapper giving KV the same get/setJSON shape the Netlify Blobs code used (values stored as JSON text)
const kv = (ns) => ({
  get: async (k, opts) => (opts && opts.type === "json" ? ns.get(k, "json") : ns.get(k)),
  setJSON: (k, v) => ns.put(k, JSON.stringify(v)),
});

async function handle(req, kvNs) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  const key = (code) => "g-" + code;
  const store = kv(kvNs);

  if (req.method === "GET") {
    const code = clean(new URL(req.url).searchParams.get("code"), 6).toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) return fail("bad_code");
    const g = await store.get(key(code), { type: "json" });
    return g ? json(publicView(g)) : fail("not_found", 404);
  }
  if (req.method !== "POST") return fail("method", 405);

  let body;
  try { body = await req.json(); } catch { return fail("bad_json"); }
  if (!body || typeof body !== "object") return fail("bad_json");
  const action = body.action;

  if (action === "create" || action === "join") {
    const memberName = clean(body.member?.name, 24);
    if (!memberName) return fail("bad_name");
    let g, code;
    if (action === "create") {
      const groupName = clean(body.name, 40);
      if (!groupName) return fail("bad_group_name");
      for (let i = 0; i < 6; i++) { code = newCode(); if (!(await store.get(key(code)))) break; }
      g = { code, name: groupName, created: Date.now(), members: {} };
    } else {
      code = clean(body.code, 6).toUpperCase();
      if (!/^[A-Z2-9]{6}$/.test(code)) return fail("bad_code");
      g = await store.get(key(code), { type: "json" });
      if (!g) return fail("not_found", 404);
      if (Object.keys(g.members).length >= MAX_MEMBERS) return fail("full", 409);
    }
    const id = crypto.randomUUID().slice(0, 12);
    const token = crypto.randomUUID() + crypto.randomUUID();
    g.members[id] = { name: memberName, avatar: avatarOk(body.member?.avatar), tokenHash: await sha(token), joined: Date.now() };
    await store.setJSON(key(code), g);
    return json({ code, memberId: id, token, group: publicView(g) });
  }

  if (action === "report" || action === "leave") {
    const code = clean(body.code, 6).toUpperCase();
    const g = /^[A-Z2-9]{6}$/.test(code) ? await store.get(key(code), { type: "json" }) : null;
    if (!g) return fail("not_found", 404);
    const m = g.members[String(body.memberId || "")];
    if (!m || m.tokenHash !== (await sha(String(body.token || "")))) return fail("not_member", 403);
    if (action === "leave") {
      delete g.members[body.memberId];
      await store.setJSON(key(code), g);
      return json({ ok: true });
    }
    const s = body.stats || {};
    m.name = clean(s.name, 24) || m.name;
    m.avatar = s.avatar ? avatarOk(s.avatar) : m.avatar;
    m.known = num(s.known, 100000);
    m.streak = num(s.streak, 10000);
    m.week = clean(s.week, 10);
    m.weekXp = num(s.weekXp, 100000);
    m.weekWords = num(s.weekWords, 10000000);
    m.updated = Date.now();
    await store.setJSON(key(code), g);
    return json(publicView(g));
  }
  return fail("bad_action");
}

export async function onRequest(context) {
  if (!context.env.LUMI_KV) return fail("no_kv", 503);
  return handle(context.request, context.env.LUMI_KV);
}
