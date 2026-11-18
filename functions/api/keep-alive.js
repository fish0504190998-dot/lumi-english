// Cloudflare Pages Function: GET /api/keep-alive
// Pinged by an external cron (e.g. cron-job.org) so the free Supabase project is not paused for inactivity.
// Variables (Cloudflare Pages > Settings > Variables and Secrets): SUPABASE_URL, SUPABASE_ANON_KEY (the public anon/publishable key).
// Does one tiny read of a table that anonymous visitors may already read (community_stories). Never returns details or keys.
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export async function onRequest(context) {
  const url = String(context.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(context.env.SUPABASE_ANON_KEY || "").trim();
  if (!/^https:\/\//i.test(url) || !key) return reply({ status: "error" }, 502);
  try {
    const r = await fetch(`${url}/rest/v1/community_stories?select=id&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? reply({ status: "alive" }) : reply({ status: "error" }, 502);
  } catch {
    return reply({ status: "error" }, 502);
  }
}
