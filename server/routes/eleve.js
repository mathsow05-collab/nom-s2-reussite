const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const sse = require('../sse');
const { UPLOADS_DIR } = require('../paths');
const { signToken, rateLimiter } = require('../security');
const { requireEleve } = require('../middleware');
const { addLog } = require('../log');

const router = express.Router();
const UPLOADS = UPLOADS_DIR;

/* ------------------------------------------------------------------ */
/* Connexion : un seul ID demandé. Session unique stricte : toute      */
/* nouvelle connexion écrase la précédente et l'ancien appareil est    */
/* déconnecté en temps réel via SSE.                                   */
/* ------------------------------------------------------------------ */
router.post(
  '/login',
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000, message: 'Trop de tentatives de connexion. Patientez quelques minutes.' }),
  (req, res) => {
    const raw = String(req.body?.eleve_id || '').trim().toUpperCase();
    if (!raw) return res.status(400).json({ code: 'MISSING_ID', error: 'Veuillez saisir votre ID.' });

    const eleve = db.prepare('SELECT * FROM eleves WHERE eleve_id = ?').get(raw);
    if (!eleve) return res.status(404).json({ code: 'ID_INVALIDE', error: 'ID introuvable. Vérifiez votre identifiant.' });
    if (!eleve.actif) {
      addLog('connexion_refusee', { eleveDbId: eleve.id, eleveRef: eleve.eleve_id, req, details: 'accès révoqué' });
      return res.status(403).json({ code: 'REVOQUE', error: 'Votre accès a été suspendu par l’administration.' });
    }

    if (eleve.session_jti) {
      // Un autre appareil était connecté : on le prévient immédiatement.
      sse.send(eleve.id, 'session', { type: 'session_remplacee' });
      addLog('session_remplacee', { eleveDbId: eleve.id, eleveRef: eleve.eleve_id, req, details: 'connexion sur un nouvel appareil' });
    }

    const jti = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE eleves SET session_jti = ?, session_started_at = ? WHERE id = ?').run(
      jti,
      new Date().toISOString(),
      eleve.id
    );
    const token = signToken({ sub: eleve.id, role: 'eleve', jti }, 12 * 3600);
    addLog('connexion', { eleveDbId: eleve.id, eleveRef: eleve.eleve_id, req });

    return res.json({
      token,
      eleve: { id: eleve.id, eleve_id: eleve.eleve_id, prenom: eleve.prenom, nom: eleve.nom, classe: eleve.classe },
    });
  }
);

router.get('/me', requireEleve(db), (req, res) => {
  res.json({
    id: req.eleve.id,
    eleve_id: req.eleve.eleve_id,
    prenom: req.eleve.prenom,
    nom: req.eleve.nom,
    classe: req.eleve.classe,
  });
});

router.get('/cours', requireEleve(db), (req, res) => {
  const matiere = String(req.query.matiere || '');
  const rows =
    matiere && matiere !== 'all'
      ? db.prepare('SELECT * FROM cours WHERE matiere = ? ORDER BY ordre, id').all(matiere)
      : db.prepare('SELECT * FROM cours ORDER BY matiere, ordre, id').all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      titre: r.titre,
      matiere: r.matiere,
      description: r.description,
      youtube_id: r.youtube_id,
      has_pdf: !!r.pdf_file,
    }))
  );
});

/* PDF servi derrière authentification (token en query : l'iframe ne
   peut pas envoyer d'en-tête Authorization). */
router.get('/cours/:id/pdf', requireEleve(db, { allowQuery: true }), (req, res) => {
  const cours = db.prepare('SELECT * FROM cours WHERE id = ?').get(req.params.id);
  if (!cours || !cours.pdf_file) return res.status(404).json({ error: 'PDF introuvable.' });
  const file = path.join(UPLOADS, cours.pdf_file);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'PDF manquant sur le serveur.' });
  addLog('pdf_consulte', { eleveDbId: req.eleve.id, eleveRef: req.eleve.eleve_id, req, details: cours.titre });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(file)}"`);
  return res.sendFile(file);
});

router.get('/metiers', requireEleve(db), (req, res) => {
  res.json(db.prepare('SELECT * FROM metiers ORDER BY ordre, id').all());
});

router.post('/logout', requireEleve(db), (req, res) => {
  db.prepare('UPDATE eleves SET session_jti = NULL WHERE id = ? AND session_jti = ?').run(req.eleve.id, req.jti);
  addLog('deconnexion', { eleveDbId: req.eleve.id, eleveRef: req.eleve.eleve_id, req });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Flux temps réel (SSE) : permet au serveur d'éjecter instantanément  */
/* un appareil (nouvelle connexion ailleurs, ou kill switch admin).    */
/* ------------------------------------------------------------------ */
router.get('/stream', (req, res) => {
  const auth = requireEleve(db, { allowQuery: true });
  auth(req, res, () => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    res.write(`event: bonjour\ndata: ${JSON.stringify({ eleve_id: req.eleve.eleve_id })}\n\n`);
    sse.add(req.eleve.id, res);
    const hb = setInterval(() => {
      try {
        res.write(': hb\n\n');
      } catch {
        /* fermé */
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(hb);
      sse.remove(req.eleve.id, res);
    });
  });
});

module.exports = router;
