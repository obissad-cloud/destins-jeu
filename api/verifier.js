// Fonction serveur (Vercel) : confirme auprès de Stripe qu'un paiement a bien eu lieu, puis indique le pack acheté.
// Variable d'environnement à définir sur Vercel : STRIPE_SECRET_KEY (clé secrète, jamais dans le jeu).
const PRODUITS = new Set(["destins_pack_vikings", "destins_pack_prohibition", "destins_pack_yakuza", "destins_pack_destins", "destins_pack_pouvoirs", "destins_pack_complet"]);
module.exports = async (req, res) => {
  const sid = String(req.query.session_id || "");
  res.setHeader("Cache-Control", "no-store");
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return res.status(400).json({ paye: false, erreur: "reçu invalide" });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
    if (!r.ok) return res.status(404).json({ paye: false });
    const s = await r.json();
    const produit = s.client_reference_id;
    const paye = s.payment_status === "paid" && PRODUITS.has(produit);
    return res.status(200).json({ paye, produits: paye ? [produit] : [] });
  } catch (e) { return res.status(500).json({ paye: false }); }
};
