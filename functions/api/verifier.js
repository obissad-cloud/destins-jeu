// Cloudflare Pages Function : confirme auprès de Stripe qu'un paiement a bien eu lieu, puis indique le pack acheté.
// Variable d'environnement à définir sur Cloudflare : STRIPE_SECRET_KEY (clé secrète, jamais dans le jeu).
const PRODUITS = new Set(["destins_pack_vikings", "destins_pack_prohibition", "destins_pack_yakuza", "destins_pack_destins", "destins_pack_pouvoirs", "destins_pack_talents", "destins_pack_sans_pub", "destins_pack_complet"]);
const rep = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
export async function onRequestGet({ request, env }) {
  const sid = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return rep({ paye: false, erreur: "reçu invalide" }, 400);
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    if (!r.ok) return rep({ paye: false }, 404);
    const s = await r.json();
    const produit = s.client_reference_id;
    const paye = s.payment_status === "paid" && PRODUITS.has(produit);
    return rep({ paye, produits: paye ? [produit] : [] });
  } catch (e) { return rep({ paye: false }, 500); }
}
