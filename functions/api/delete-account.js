// Cloudflare Pages Function: POST /api/delete-account
// A backup route for "delete my account". The site first tries the database function delete_my_account() (see supabase-accounts.sql);
// only if that fails does it call this. It checks who is asking (the signed-in person's own token) and deletes exactly that person.
// Needs these environment variables in Cloudflare Pages > Settings > Variables and Secrets (values are NOT in the code):
//   SUPABASE_URL           (e.g. https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY   (secret: Supabase > Project Settings > API > service_role. Never put it in the website code.)
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const base = env.SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return json({ error: 'not_configured' }, 501);
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);
  // who is this? (asks Supabase to validate the person's own token)
  const who = await fetch(base + '/auth/v1/user', { headers: { authorization: 'Bearer ' + token, apikey: key } });
  if (!who.ok) return json({ error: 'unauthorized' }, 401);
  const user = await who.json(); if (!user || !user.id) return json({ error: 'unauthorized' }, 401);
  // delete that one person (progress, profile and community stories follow by cascade)
  const del = await fetch(base + '/auth/v1/admin/users/' + encodeURIComponent(user.id), { method: 'DELETE', headers: { authorization: 'Bearer ' + key, apikey: key } });
  if (!del.ok) return json({ error: 'delete_failed' }, 502);
  return json({ ok: true });
}
export const onRequest = () => json({ error: 'method_not_allowed' }, 405);   // any other method (POST is handled above)
