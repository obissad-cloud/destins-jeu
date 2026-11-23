// Mesure d'audience anonyme : reçoit les compteurs envoyés par le jeu et les range dans la base D1 (liaison « DB »).
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const SCHEMA = "CREATE TABLE IF NOT EXISTS ev (ts INTEGER, jour TEXT, sid TEXT, plat TEXT, ref TEXT, langue TEXT, pays TEXT, age INTEGER, nom TEXT, n INTEGER, ecran TEXT)";
export const onRequestOptions = () => new Response(null, { status: 204, headers: H });
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return new Response("no db", { status: 503, headers: H });
    const t = await request.text(); if (t.length > 8000) return new Response("trop gros", { status: 413, headers: H });
    const d = JSON.parse(t);
    const c = (v, n) => String(v ?? "").slice(0, n);
    const sid = c(d.sid, 16).replace(/[^a-z0-9]/g, ""); if (!sid) return new Response("bad", { status: 400, headers: H });
    const now = Date.now(), jour = new Date(now).toISOString().slice(0, 10), pays = c(request.cf && request.cf.country, 2);
    const ev = (Array.isArray(d.ev) ? d.ev : []).slice(0, 60).filter(e => /^[a-z0-9_]{1,40}$/.test(e.nom || ""));
    if (!ev.length) return new Response(null, { status: 204, headers: H });
    await env.DB.prepare(SCHEMA).run();
    const st = env.DB.prepare("INSERT INTO ev VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    await env.DB.batch(ev.map(e => st.bind(now, jour, sid, c(d.plat, 12), c(d.ref, 60), c(d.langue, 2), pays, Number.isFinite(d.age) ? Math.max(-1, Math.min(200, d.age | 0)) : -1, e.nom, Math.max(0, Math.min(100000, e.n | 0)), c(e.ecran, 20))));
    return new Response(null, { status: 204, headers: H });
  } catch (e) { return new Response("err", { status: 400, headers: H }); }
}
