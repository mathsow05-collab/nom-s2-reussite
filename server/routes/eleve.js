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
    filiere: req.eleve.filiere || 'S2',
  });
});

router.get('/cours', requireEleve(db), (req, res) => {
  const filiere = req.eleve.filiere || 'S2';
  const matiere = String(req.query.matiere || '');
  const rows =
    matiere && matiere !== 'all'
      ? db.prepare('SELECT * FROM cours WHERE matiere = ? AND filiere = ? ORDER BY ordre, id').all(matiere, filiere)
      : db.prepare('SELECT * FROM cours WHERE filiere = ? ORDER BY matiere, ordre, id').all(filiere);
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
  const filiere = req.eleve.filiere || 'S2';
  res.json(
    db.prepare("SELECT * FROM metiers WHERE filiere = ? OR filiere = 'all' ORDER BY ordre, id").all(filiere)
  );
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

/* ------------------------- Annales (sujets + corrigés) ------------------------- */
router.get('/annales', requireEleve(db), (req, res) => {
  const filiere = req.eleve.filiere || 'S2';
  const annee = parseInt(req.query.annee || '0', 10);
  const matiere = String(req.query.matiere || '');
  let sql = 'SELECT id, filiere, matiere, annee, titre, sujet_pdf, corrige_pdf FROM annales WHERE filiere = ?';
  const args = [filiere];
  if (annee) {
    sql += ' AND annee = ?';
    args.push(annee);
  }
  if (matiere && matiere !== 'all') {
    sql += ' AND matiere = ?';
    args.push(matiere);
  }
  sql += ' ORDER BY annee DESC, id DESC';
  res.json(
    db.prepare(sql).all(...args).map((r) => ({
      id: r.id,
      filiere: r.filiere,
      matiere: r.matiere,
      annee: r.annee,
      titre: r.titre,
      has_sujet: !!r.sujet_pdf,
      has_corrige: !!r.corrige_pdf,
    }))
  );
});

router.get('/annales/:id/:type', requireEleve(db, { allowQuery: true }), (req, res) => {
  const type = req.params.type;
  if (type !== 'sujet' && type !== 'corrige') return res.status(400).json({ error: 'Type invalide.' });
  const a = db.prepare('SELECT * FROM annales WHERE id = ?').get(req.params.id);
  if (!a || (a.filiere || 'S2') !== (req.eleve.filiere || 'S2')) return res.status(404).json({ error: 'Annales introuvables.' });
  const rel = type === 'sujet' ? a.sujet_pdf : a.corrige_pdf;
  if (!rel) return res.status(404).json({ error: 'PDF absent.' });
  const file = path.join(UPLOADS, rel);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'PDF manquant sur le serveur.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(file)}"`);
  return res.sendFile(file);
});

/* ------------------------- Quiz d'auto-évaluation ------------------------- */
router.get('/quiz/lecons', requireEleve(db), (req, res) => {
  const filiere = req.eleve.filiere || 'S2';
  const matiere = String(req.query.matiere || '');
  let sql = 'SELECT DISTINCT matiere, lecon FROM quiz_questions WHERE filiere = ?';
  const args = [filiere];
  if (matiere && matiere !== 'all') {
    sql += ' AND matiere = ?';
    args.push(matiere);
  }
  res.json(db.prepare(sql).all(...args));
});

router.get('/quiz/questions', requireEleve(db), (req, res) => {
  const filiere = req.eleve.filiere || 'S2';
  const matiere = String(req.query.matiere || '');
  const lecon = String(req.query.lecon || '');
  const n = Math.max(5, Math.min(20, parseInt(req.query.n || '10', 10) || 10));
  let sql = 'SELECT id, question, choix, matiere, lecon, bonne FROM quiz_questions WHERE filiere = ?';
  const args = [filiere];
  if (matiere && matiere !== 'all') {
    sql += ' AND matiere = ?';
    args.push(matiere);
  }
  if (lecon) {
    sql += ' AND lecon = ?';
    args.push(lecon);
  }
  const rows = db.prepare(sql).all(...args);
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  res.json(rows.slice(0, n).map((r) => ({ ...r, choix: JSON.parse(r.choix) })));
});

/* ------------------------- Questions élèves & boîte à idées ------------------------- */
router.get('/questions', requireEleve(db), (req, res) => {
  res.json(db.prepare('SELECT * FROM questions_eleves WHERE eleve_db_id = ? ORDER BY id DESC').all(req.eleve.id));
});

router.post('/questions', requireEleve(db), (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Le message est obligatoire.' });
  const info = db
    .prepare('INSERT INTO questions_eleves (eleve_db_id, eleve_ref, filiere, sujet, message) VALUES (?, ?, ?, ?, ?)')
    .run(req.eleve.id, req.eleve.eleve_id, req.eleve.filiere || 'S2', String(req.body?.sujet || '').trim() || null, message);
  addLog('question_posee', { eleveDbId: req.eleve.id, eleveRef: req.eleve.eleve_id, req, details: req.body?.sujet || '' });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/idees', requireEleve(db), (req, res) => {
  res.json(db.prepare('SELECT id, message, lu, created_at FROM idees WHERE eleve_db_id = ? ORDER BY id DESC').all(req.eleve.id));
});

router.post('/idees', requireEleve(db), (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Le message est obligatoire.' });
  db.prepare('INSERT INTO idees (eleve_db_id, eleve_ref, message) VALUES (?, ?, ?)').run(req.eleve.id, req.eleve.eleve_id, message);
  addLog('idee_envoyee', { eleveDbId: req.eleve.id, eleveRef: req.eleve.eleve_id, req });
  res.status(201).json({ ok: true });
});

/* ------------------------- Agenda des échéances ------------------------- */
router.get('/echeances', requireEleve(db), (req, res) => {
  res.json(db.prepare('SELECT * FROM echeances ORDER BY date_debut').all());
});

module.exports = router;
