/* ------------------------------------------------------------------ */
/* Paiement automatique Wave / Orange Money via CinetPay (agrégateur   */
/* sénégalais). Si les clés ne sont pas configurées par la direction,  */
/* on retombe sur le mode manuel (déclaration + validation admin).     */
/* ------------------------------------------------------------------ */
const express = require('express');
const db = require('./db');
const { addLog } = require('./log');
const { requireEleve } = require('./middleware');

const router = express.Router();
const ABOS = { S2: 1500, L2: 1000 };

const cfg = () => ({
  key: db.prepare("SELECT value FROM settings WHERE key = 'cinetpay_api_key'").get()?.value || '',
  site: db.prepare("SELECT value FROM settings WHERE key = 'cinetpay_site_id'").get()?.value || '',
});
const actif = () => {
  const c = cfg();
  return !!(c.key && c.site);
};

function activerAbonnement(eleveDbId) {
  const e = db.prepare('SELECT abo_expire FROM eleves WHERE id = ?').get(eleveDbId);
  const base = e?.abo_expire && new Date(e.abo_expire) > new Date() ? new Date(e.abo_expire) : new Date();
  const fin = new Date(base.getTime() + 30 * 86400000);
  db.prepare('UPDATE eleves SET abo_expire = ? WHERE id = ?').run(fin.toISOString(), eleveDbId);
}

/* L'élève appuie « Payer » : on crée le checkout CinetPay et on renvoie l'URL. */
router.post('/checkout', requireEleve(db), async (req, res) => {
  const e = req.eleve;
  const methode = req.body?.methode === 'om' ? 'orange_money' : 'wave';
  if (!actif()) return res.status(503).json({ code: 'PAIEMENT_MANUEL', error: 'Le paiement automatique n’est pas encore activé par l’administration.' });
  const montant = ABOS[e.filiere] || 1000;
  const ref = `ABO-${e.id}-${Date.now()}`;
  const r = db.prepare('INSERT INTO payements (eleve_db_id, montant, methode, reference, statut) VALUES (?,?,?,?,\'en_attente\')').run(
    e.id,
    montant,
    req.body?.methode === 'om' ? 'om' : 'wave',
    ref
  );
  const base = `${req.protocol}://${req.get('host')}`;
  try {
    const c = cfg();
    const cp = await fetch('https://api.cinetpay.com/v2/payment/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: c.key,
        site_id: c.site,
        transaction_name: `Abonnement ${e.prenom} ${e.nom}`,
        description: `Abonnement 30 jours (${e.filiere})`,
        amount: montant,
        currency: 'XOF',
        payment_method: methode,
        return_url: `${base}/api/paiement/retour?ref=${ref}`,
        cancel_url: `${base}/#/app`,
        notify_url: `${base}/api/paiement/notify`,
        metadata: { pay_id: r.lastInsertRowid, eleve_id: e.id },
      }),
    });
    const data = await cp.json();
    if (data?.code !== '200' || !data?.data?.payment_url)
      return res.status(502).json({ error: data?.message || 'Le prestataire de paiement a refusé. Réessaie.' });
    return res.json({ url: data.data.payment_url, token: data.data.payment_token });
  } catch {
    return res.status(502).json({ error: 'Connexion au paiement impossible. Réessaie.' });
  }
});

/* Webhook CinetPay : activation automatique dès que le client a payé. */
router.post('/notify', express.json(), async (req, res) => {
  try {
    const c = cfg();
    const token = req.body?.data?.payment_token || req.body?.payment_token;
    if (!token || !c.key) return res.json({ ok: false });
    const chk = await fetch('https://api.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: c.key, site_id: c.site, payment_token: token }),
    });
    const data = await chk.json();
    if (data?.code === '200' && data?.data?.status === 'COMPLETED') {
      const ref = data.data.transaction_id || '';
      const p = db.prepare('SELECT * FROM payements WHERE reference = ? OR reference = ?').get(ref, data.data?.metadata?.ref || '');
      const pay = p || db.prepare('SELECT * FROM payements WHERE statut = \'en_attente\' ORDER BY id DESC LIMIT 1').get();
      if (pay && pay.statut !== 'valide') {
        db.prepare("UPDATE payements SET statut = 'valide' WHERE id = ?").run(pay.id);
        activerAbonnement(pay.eleve_db_id);
        addLog('paiement_auto_valide', { eleveDbId: pay.eleve_db_id, details: ref });
      }
    }
  } catch {
    /* jamais bloquant */
  }
  return res.json({ ok: true });
});

/* Retour navigateur après paiement : vérifie et active aussi (filet de sécurité). */
router.get('/retour', async (req, res) => {
  const ref = String(req.query.ref || '');
  const p = db.prepare('SELECT * FROM payements WHERE reference = ?').get(ref);
  if (p && p.statut !== 'valide') {
    const c = cfg();
    let ok = false;
    if (c.key) {
      try {
        const chk = await fetch('https://api.cinetpay.com/v2/payment/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: c.key, site_id: c.site, transaction_name: ref }),
        });
        const data = await chk.json();
        ok = data?.data?.status === 'COMPLETED';
      } catch {
        ok = false;
      }
    }
    if (ok) {
      db.prepare("UPDATE payements SET statut = 'valide' WHERE id = ?").run(p.id);
      activerAbonnement(p.eleve_db_id);
    }
  }
  return res.redirect('/#/app');
});

module.exports = { router, actif, ABOS };
