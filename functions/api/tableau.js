// Tableau de bord de la mesure d'audience (chiffres anonymes et globaux uniquement).
const SCHEMA = "CREATE TABLE IF NOT EXISTS ev (ts INTEGER, jour TEXT, sid TEXT, plat TEXT, ref TEXT, langue TEXT, pays TEXT, age INTEGER, nom TEXT, n INTEGER, ecran TEXT)";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export async function onRequestGet({ request, env }) {
  if (!env.DB) return new Response("Base D1 non reliée (liaison DB).", { status: 503 });
  const jours = Math.max(1, Math.min(90, parseInt(new URL(request.url).searchParams.get("jours") || "7", 10) || 7));
  const depuis = Date.now() - jours * 86400000;
  await env.DB.prepare(SCHEMA).run();
  const q = (sql, ...b) => env.DB.prepare(sql).bind(depuis, ...b).all().then(r => r.results || []);
  const [parJour, parPlat, parPays, parRef, totaux, sessions, quitteAge, quitteEcran, mortAge, onglets, packs] = await Promise.all([
    q("SELECT jour, COUNT(DISTINCT sid) s, SUM(CASE WHEN nom='secondes' THEN n END) sec, SUM(CASE WHEN nom='vies_lancees' THEN n END) vies FROM ev WHERE ts>=? GROUP BY jour ORDER BY jour DESC"),
    q("SELECT plat k, COUNT(DISTINCT sid) v FROM ev WHERE ts>=? GROUP BY plat ORDER BY v DESC"),
    q("SELECT pays k, COUNT(DISTINCT sid) v FROM ev WHERE ts>=? GROUP BY pays ORDER BY v DESC LIMIT 15"),
    q("SELECT CASE WHEN ref='' THEN '(direct)' ELSE ref END k, COUNT(DISTINCT sid) v FROM ev WHERE ts>=? GROUP BY ref ORDER BY v DESC LIMIT 10"),
    q("SELECT nom k, SUM(n) v FROM ev WHERE ts>=? AND nom IN ('ouverture','vies_lancees','annees','choix','vies_terminees','achat') GROUP BY nom"),
    q("SELECT sid, SUM(CASE WHEN nom='secondes' THEN n ELSE 0 END) sec FROM ev WHERE ts>=? GROUP BY sid"),
    q("SELECT CASE WHEN age<0 THEN 'avant de jouer' WHEN age<10 THEN '0-9 ans' WHEN age<20 THEN '10-19 ans' WHEN age<40 THEN '20-39 ans' WHEN age<60 THEN '40-59 ans' ELSE '60 ans et +' END k, COUNT(*) v FROM ev WHERE ts>=? AND nom='quitte' GROUP BY k ORDER BY v DESC"),
    q("SELECT CASE WHEN ecran='' THEN '?' ELSE ecran END k, COUNT(*) v FROM ev WHERE ts>=? AND nom='quitte' GROUP BY k ORDER BY v DESC LIMIT 10"),
    q("SELECT nom k, SUM(n) v FROM ev WHERE ts>=? AND nom LIKE 'mort_age_%' GROUP BY nom ORDER BY nom"),
    q("SELECT substr(nom,8) k, SUM(n) v FROM ev WHERE ts>=? AND nom LIKE 'onglet_%' GROUP BY nom ORDER BY v DESC LIMIT 12"),
    q("SELECT nom k, SUM(n) v FROM ev WHERE ts>=? AND (nom LIKE 'achat%') GROUP BY nom ORDER BY v DESC")]);
  const T = Object.fromEntries(totaux.map(r => [r.k, r.v]));
  const secs = sessions.map(r => r.sec || 0).sort((a, b) => a - b);
  const med = secs.length ? secs[Math.floor(secs.length / 2)] : 0, moy = secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0;
  const tranches = [["< 30 s", 0, 30], ["30 s – 2 min", 30, 120], ["2 – 5 min", 120, 300], ["5 – 15 min", 300, 900], ["15 min +", 900, 1e9]].map(([k, a, b]) => ({ k, v: secs.filter(s => s >= a && s < b).length }));
  const mn = s => s >= 60 ? Math.floor(s / 60) + " min " + (s % 60) + " s" : s + " s";
  const table = (titre, rows, col = "Nombre") => `<section><h2>${titre}</h2><table>${rows.length ? rows.map(r => { const max = Math.max(...rows.map(x => x.v || 0), 1); return `<tr><td>${esc(r.k)}</td><td class="n">${r.v ?? 0}</td><td class="b"><i style="width:${Math.round(100 * (r.v || 0) / max)}%"></i></td></tr>`; }).join("") : `<tr><td>Pas encore de données</td></tr>`}</table></section>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Destins · Audience</title>
<style>body{font:15px system-ui,sans-serif;margin:0;background:#f5f6fa;color:#141826}header{background:#FFB020;padding:18px 20px}h1{margin:0;font-size:22px}main{max-width:900px;margin:auto;padding:16px;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}section{background:#fff;border-radius:14px;padding:14px}h2{font-size:14px;margin:0 0 10px;color:#6b7180;text-transform:uppercase;letter-spacing:.04em}table{width:100%;border-collapse:collapse}td{padding:4px 2px}.n{text-align:right;font-weight:700;width:60px}.b{width:40%}.b i{display:block;height:8px;background:#FFB020;border-radius:4px}.k{display:grid;grid-template-columns:1fr 1fr;gap:10px}.k div{background:#f5f6fa;border-radius:10px;padding:10px}.k b{display:block;font-size:22px}nav a{margin-right:10px;color:#141826}</style></head>
<body><header><h1>Destins · Audience anonyme</h1><nav>Période : <a href="?jours=1">24 h</a><a href="?jours=7">7 jours</a><a href="?jours=30">30 jours</a><a href="?jours=90">90 jours</a> (actuelle : ${jours} j)</nav></header><main>
<section><h2>Résumé</h2><div class="k"><div><b>${sessions.length}</b>sessions</div><div><b>${mn(moy)}</b>temps moyen</div><div><b>${mn(med)}</b>temps médian</div><div><b>${T.vies_lancees || 0}</b>vies lancées</div><div><b>${T.annees || 0}</b>années jouées</div><div><b>${T.choix || 0}</b>choix faits</div><div><b>${T.vies_terminees || 0}</b>vies terminées</div><div><b>${T.achat || 0}</b>achats</div></div></section>
${table("Temps passé par session", tranches, "Sessions")}
${table("Par jour (sessions)", parJour.map(r => ({ k: r.jour + " · " + mn(r.s ? Math.round((r.sec || 0) / r.s) : 0) + " en moy. · " + (r.vies || 0) + " vies", v: r.s })))}
${table("Plateforme", parPlat)}${table("Pays des joueurs", parPays)}${table("Provenance (site d'origine)", parRef)}
${table("Âge du personnage quand le joueur quitte", quitteAge)}${table("Écran au moment où le joueur quitte", quitteEcran)}
${table("Âge à la mort du personnage", mortAge.map(r => ({ k: r.k.replace("mort_age_", "") + " ans", v: r.v })))}
${table("Onglets les plus ouverts", onglets)}${table("Packs : clics et achats", packs)}
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
