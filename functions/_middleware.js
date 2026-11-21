// Ajustements de la page du jeu : icône, titre, langue automatique et publicités AdSense.
const ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2972282317919508" crossorigin="anonymous" data-ad-frequency-hint="60s"></script>';
const TETE = '<link rel="icon" type="image/svg+xml" href="/icone.svg"><meta name="theme-color" content="#FFB020">' +
  '<script>try{if(!localStorage.getItem("destins.langue")){var l=(navigator.languages&&navigator.languages[0])||navigator.language||"fr";localStorage.setItem("destins.langue",/^fr\\b/i.test(l)?"fr":"en");}}catch(e){}</script>';
export async function onRequest({ next }) {
  const r = await next();
  if (!(r.headers.get("content-type") || "").includes("text/html")) return r;
  let h = await r.text();
  let tete = "";
  if (!h.includes("/icone.svg")) tete += TETE;
  if (!h.includes("ca-pub-2972282317919508")) tete += ADS;
  if (tete) h = h.replace("<head>", "<head>" + tete);
  h = h.replace('const PUB_CLIENT = "";', 'const PUB_CLIENT = "ca-pub-2972282317919508";');
  h = h.replace('  document.head.appendChild(s);\n  window.adsbygoogle', '  if (!document.querySelector(\'script[src*="adsbygoogle.js"]\')) document.head.appendChild(s);\n  window.adsbygoogle');
  h = h.replace("Destins : simulateur de vie (prototype)", "Destins : simulateur de vie");
  const out = new Response(h, r);
  out.headers.delete("content-length");
  return out;
}
