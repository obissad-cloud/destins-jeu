// Cloudflare Pages Function (version itch.io) : retrouve les paiements Stripe faits avec le jeton d'un joueur.
// Le jeu itch.io ouvre le lien Stripe avec client_reference_id = "<jeton>-<produit>", puis interroge cette adresse.
const PRODUITS = new Set(["destins_pack_vikings", "destins_pack_prohibition", "destins_pack_yakuza", "destins_pack_decouverte", "destins_pack_destins", "destins_pack_pouvoirs", "destins_pack_talents", "destins_pack_sans_pub", "destins_pack_complet"]);
const ENTETES = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };
const rep = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: ENTETES });
export async function onRequestOptions() { return new Response(null, { status: 204, headers: { ...ENTETES, "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "*" } }); }
export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const jeton = q.get("jeton") || "";
  if (!/^[a-f0-9]{24}$/.test(jeton)) return rep({ paye: false, erreur: "jeton invalide" }, 400);
  const maintenant = Math.floor(Date.now() / 1000);
  const depuis = Math.max(maintenant - 4 * 86400, Math.min(maintenant, parseInt(q.get("depuis") || "0", 10) || 0));
  const produits = new Set(), sessions = [];
  try {
    let apres = "";
    for (let page = 0; page < 10; page++) {
      const u = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${depuis}${apres ? "&starting_after=" + apres : ""}`;
      const r = await fetch(u, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
      if (!r.ok) return rep({ paye: false }, 502);
      const l = await r.json();
      for (const s of l.data || []) {
        const ref = s.client_reference_id || "";
        if (!ref.startsWith(jeton + "-") || s.payment_status !== "paid") continue;
        const p = ref.slice(jeton.length + 1);
        if (PRODUITS.has(p)) { produits.add(p); sessions.push(s.id); }
      }
      if (!l.has_more || !l.data.length) break;
      apres = l.data[l.data.length - 1].id;
    }
    return rep({ paye: produits.size > 0, produits: [...produits], sessions });
  } catch (e) { return rep({ paye: false }, 500); }
}
