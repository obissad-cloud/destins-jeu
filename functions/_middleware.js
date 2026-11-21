// Ajustements de la page du jeu : liens de paiement réels, icône, titre et langue automatique.
const LIENS = {
  "https://buy.stripe.com/test_6oUeVdfNJ4kYdnW8Gwe3e00": "https://buy.stripe.com/6oU00j0V68RT4p52wteEo05",
  "https://buy.stripe.com/test_4gM00j1WT7xabfOf4Ue3e01": "https://buy.stripe.com/dRm00j9rC0ln7Bh7QNeEo02",
  "https://buy.stripe.com/test_fZuaEX1WT7xa6Zy9KAe3e02": "https://buy.stripe.com/7sY00jbzK2tvf3Jdb7eEo03",
  "https://buy.stripe.com/test_dRm7sLcBx04IgA8bSIe3e03": "https://buy.stripe.com/14A28r0V68RTaNt5IFeEo01",
  "https://buy.stripe.com/test_dRmdR96d96t63Nm3mce3e04": "https://buy.stripe.com/fZufZh47i3xzcVB8UReEo04",
  "https://buy.stripe.com/test_9B6cN58lh4kY83C7Cse3e05": "https://buy.stripe.com/28E9AT6fq7NP3l10oleEo00"
};
const TETE = '<link rel="icon" type="image/svg+xml" href="/icone.svg"><meta name="theme-color" content="#FFB020">' +
  '<script>try{if(!localStorage.getItem("destins.langue")){var l=(navigator.languages&&navigator.languages[0])||navigator.language||"fr";localStorage.setItem("destins.langue",/^fr\\b/i.test(l)?"fr":"en");}}catch(e){}</script>';
export async function onRequest({ next }) {
  const r = await next();
  if (!(r.headers.get("content-type") || "").includes("text/html")) return r;
  let h = await r.text();
  for (const [a, b] of Object.entries(LIENS)) h = h.split(a).join(b);
  if (!h.includes("/icone.svg")) h = h.replace("<head>", "<head>" + TETE);
  h = h.replace("Destins : simulateur de vie (prototype)", "Destins : simulateur de vie");
  const out = new Response(h, r);
  out.headers.delete("content-length");
  return out;
}
