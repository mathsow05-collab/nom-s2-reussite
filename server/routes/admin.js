const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const sse = require('../sse');
const { UPLOADS_DIR } = require('../paths');
const { hashPassword, verifyPassword, signToken, generateEleveId, rateLimiter } = require('../security');
const { requireAdmin } = require('../middleware');
const { addLog } = require('../log');

const router = express.Router();
const UPLOADS = UPLOADS_DIR;
const TMP_DIR = path.join(UPLOADS, 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

const MATIERES = ['maths', 'physique-chimie', 'francais', 'histoire-geographie', 'philosophie', 'anglais', 'lecture', 'sourates', 'tajwid', 'tafsir'];

// Le périmètre Arabe (ex. Moustapha) ne gère QUE élèves + cours Coran :
// annales, quiz, agenda et catalogue métiers lui sont fermés.
function refuseAR(req, res, next) {
  if (req.scope === 'AR') return res.status(403).json({ error: 'Module réservé aux autres périmètres de gestion.' });
  return next();
}
const admin = requireAdmin(db);

/* ------------------------- helpers ------------------------- */
function parseYouTubeId(url) {
  if (!url) return null;
  const u = String(url).trim();
  const m =
    u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/) ||
    u.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

function tryUnlink(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    /* ignore */
  }
}

function makeUploader(allowed, maxMb) {
  return multer({
    storage: multer.diskStorage({
      destination: TMP_DIR,
      filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) return cb(new Error(`Type de fichier non autorisé (${ext}).`));
      return cb(null, true);
    },
  });
}

const pdfUpload = makeUploader(['.pdf'], 25).single('pdf');
const imageUpload = makeUploader(['.jpg', '.jpeg', '.png', '.webp'], 5).single('image');

/* ------------------------- authentification ------------------------- */
router.post(
  '/login',
  rateLimiter({ max: 8, windowMs: 15 * 60 * 1000, message: 'Trop de tentatives. Patientez quelques minutes.' }),
  (req, res) => {
    const { username, password } = req.body || {};
    const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username || '').trim());
    if (!row || !verifyPassword(password, row.password_hash)) {
      addLog('admin_login_echec', { source: 'admin', req, details: String(username || '') });
      return res.status(401).json({ code: 'BAD_CREDENTIALS', error: 'Identifiants incorrects.' });
    }
    const token = signToken({ sub: row.id, role: 'admin' }, 8 * 3600);
    addLog('admin_connexion', { source: 'admin', req, details: row.username });
    return res.json({ token, admin: { username: row.username } });
  }
);

router.get('/me', admin, (req, res) =>
  res.json({ username: req.admin.username, displayName: req.admin.display_name || req.admin.username, filiere: req.scope })
);

/* Périmètre (filière) de l'admin connecté : 'all', 'S2' ou 'L2'. */
const inScope = (req, filiere) => req.scope === 'all' || filiere === req.scope;

/* ------------------------- statistiques ------------------------- */
router.get('/stats', admin, (req, res) => {
  const cond = req.scope === 'all' ? '' : ' WHERE filiere = ?';
  const args = req.scope === 'all' ? [] : [req.scope];
  const parMatiere = {};
  for (const r of db.prepare(`SELECT matiere, COUNT(*) c FROM cours${cond} GROUP BY matiere`).all(...args)) {
    parMatiere[r.matiere] = r.c;
  }
  res.json({
    totalEleves: db.prepare(`SELECT COUNT(*) c FROM eleves${cond}`).get(...args).c,
    sessionsActives: db.prepare(`SELECT COUNT(*) c FROM eleves WHERE actif = 1 AND session_jti IS NOT NULL${req.scope === 'all' ? '' : ' AND filiere = ?'}`).get(...args).c,
    revoques: db.prepare(`SELECT COUNT(*) c FROM eleves WHERE actif = 0${req.scope === 'all' ? '' : ' AND filiere = ?'}`).get(...args).c,
    totalCours: db.prepare(`SELECT COUNT(*) c FROM cours${cond}`).get(...args).c,
    totalMetiers: db.prepare('SELECT COUNT(*) c FROM metiers').get().c,
    parMatiere,
    filiere: req.scope,
    derniersLogs: db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 25').all(),
  });
});

router.get('/logs', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 200').all());
});

/* ------------------------- élèves (accès, kill switch) ------------------------- */
router.get('/eleves', admin, (req, res) => {
  const rows = db
    .prepare(req.scope === 'all' ? 'SELECT * FROM eleves ORDER BY id DESC' : 'SELECT * FROM eleves WHERE filiere = ? ORDER BY id DESC')
    .all(...(req.scope === 'all' ? [] : [req.scope]))
    .map((e) => ({
      id: e.id,
      eleve_id: e.eleve_id,
      nom: e.nom,
      prenom: e.prenom,
      classe: e.classe,
      filiere: e.filiere || 'S2',
      actif: !!e.actif,
      en_session: !!e.session_jti,
      session_started_at: e.session_started_at,
      created_at: e.created_at,
      revoked_at: e.revoked_at,
    }));
  res.json(rows);
});

router.post('/eleves', admin, (req, res) => {
  const { prenom, nom, classe } = req.body || {};
  if (!prenom || !String(prenom).trim() || !nom || !String(nom).trim()) {
    return res.status(400).json({ error: 'Prénom et nom sont obligatoires.' });
  }
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';
  let id;
  do {
    id = generateEleveId();
  } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ?').get(id));
  db.prepare('INSERT INTO eleves (eleve_id, nom, prenom, classe, filiere) VALUES (?, ?, ?, ?, ?)').run(
    id,
    String(nom).trim(),
    String(prenom).trim(),
    String(classe || `Terminale ${filiere}`).trim(),
    filiere
  );
  addLog('eleve_cree', { source: 'admin', req, details: `${prenom} ${nom} (${filiere}) -> ${id}` });
  return res.status(201).json({ eleve_id: id });
});

function checkScope(req, res, row) {
  if (!row) {
    res.status(404).json({ error: 'Introuvable.' });
    return false;
  }
  if (req.scope !== 'all' && (row.filiere || 'S2') !== req.scope) {
    res.status(403).json({ error: 'Action hors de votre périmètre de gestion.' });
    return false;
  }
  return true;
}

// KILL SWITCH : invalide l'ID immédiatement et déconnecte l'appareil en cours.
router.post('/eleves/:id/revoquer', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, e)) return;
  db.prepare('UPDATE eleves SET actif = 0, session_jti = NULL, revoked_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    e.id
  );
  sse.send(e.id, 'session', { type: 'revoque' });
  addLog('eleve_revoque', { source: 'admin', eleveDbId: e.id, eleveRef: e.eleve_id, req, details: `par ${req.admin.username}` });
  return res.json({ ok: true });
});

router.post('/eleves/:id/reactiver', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, e)) return;
  db.prepare('UPDATE eleves SET actif = 1, revoked_at = NULL WHERE id = ?').run(e.id);
  addLog('eleve_reactive', { source: 'admin', eleveDbId: e.id, eleveRef: e.eleve_id, req, details: `par ${req.admin.username}` });
  return res.json({ ok: true });
});

// Régénérer l'ID (si l'ancien a fuité) : l'ancien devient inutilisable.
router.post('/eleves/:id/regenerer', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, e)) return;
  let id;
  do {
    id = generateEleveId();
  } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ? AND id != ?').get(id, e.id));
  db.prepare('UPDATE eleves SET eleve_id = ?, session_jti = NULL WHERE id = ?').run(id, e.id);
  sse.send(e.id, 'session', { type: 'session_remplacee' });
  addLog('eleve_id_regenerer', { source: 'admin', eleveDbId: e.id, eleveRef: id, req, details: `par ${req.admin.username}` });
  return res.json({ ok: true, eleve_id: id });
});

router.delete('/eleves/:id', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, e)) return;
  sse.send(e.id, 'session', { type: 'revoque' });
  db.prepare('DELETE FROM eleves WHERE id = ?').run(e.id);
  addLog('eleve_supprime', { source: 'admin', eleveRef: e.eleve_id, req, details: `${e.prenom} ${e.nom}` });
  return res.json({ ok: true });
});

/* ------------------------- cours (vidéos + PDF) ------------------------- */
router.get('/cours', admin, (req, res) => {
  res.json(
    db
      .prepare(req.scope === 'all' ? 'SELECT * FROM cours ORDER BY filiere, matiere, ordre, id' : 'SELECT * FROM cours WHERE filiere = ? ORDER BY matiere, ordre, id')
      .all(...(req.scope === 'all' ? [] : [req.scope]))
  );
});

router.post('/cours', admin, pdfUpload, (req, res) => {
  const { titre, matiere } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!MATIERES.includes(matiere)) return res.status(400).json({ error: 'Matière invalide.' });
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';
  const youtube_id = parseYouTubeId(req.body.youtube_url);
  if (req.body.youtube_url && !youtube_id) {
    return res.status(400).json({ error: 'Lien YouTube invalide (format attendu : https://www.youtube.com/watch?v=…).' });
  }

  let pdf_file = null;
  if (req.file) {
    const dir = path.join(UPLOADS, matiere);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
    fs.renameSync(req.file.path, dest);
    pdf_file = `${matiere}/${path.basename(dest)}`;
  }

  const maxOrdre = db.prepare('SELECT MAX(ordre) m FROM cours WHERE matiere = ? AND filiere = ?').get(matiere, filiere).m || 0;
  const info = db
    .prepare('INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre, filiere) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(String(titre).trim(), matiere, String(req.body.description || '').trim() || null, youtube_id, pdf_file, maxOrdre + 1, filiere);
  addLog('cours_cree', { source: 'admin', req, details: `${titre} (${filiere}/${matiere})` });
  return res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/cours/:id', admin, pdfUpload, (req, res) => {
  const c = db.prepare('SELECT * FROM cours WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, c)) return;
  const matiere = MATIERES.includes(req.body.matiere) ? req.body.matiere : c.matiere;

  let youtube_id = c.youtube_id;
  if (req.body.youtube_url !== undefined) {
    youtube_id = req.body.youtube_url ? parseYouTubeId(req.body.youtube_url) : null;
    if (req.body.youtube_url && !youtube_id) return res.status(400).json({ error: 'Lien YouTube invalide.' });
  }

  let pdf_file = c.pdf_file;
  if (req.file) {
    const dir = path.join(UPLOADS, matiere);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
    fs.renameSync(req.file.path, dest);
    if (c.pdf_file) tryUnlink(path.join(UPLOADS, c.pdf_file));
    pdf_file = `${matiere}/${path.basename(dest)}`;
  }

  db.prepare('UPDATE cours SET titre = ?, matiere = ?, description = ?, youtube_id = ?, pdf_file = ? WHERE id = ?').run(
    String(req.body.titre || c.titre).trim(),
    matiere,
    req.body.description !== undefined ? String(req.body.description).trim() || null : c.description,
    youtube_id,
    pdf_file,
    c.id
  );
  addLog('cours_modifie', { source: 'admin', req, details: c.titre });
  return res.json({ ok: true });
});

/* ------------------------- Culture du monde ------------------------- */
router.get('/culture', admin, refuseAR, (req, res) => {
  res.json(db.prepare('SELECT * FROM culture ORDER BY date_publi DESC, id DESC').all());
});

router.post('/culture', admin, refuseAR, (req, res) => {
  const { categorie, titre, contenu } = req.body || {};
  if (!titre || !String(titre).trim() || !contenu || !String(contenu).trim())
    return res.status(400).json({ error: 'Titre et contenu obligatoires.' });
  const auj = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO culture (categorie, titre, contenu, date_publi) VALUES (?, ?, ?, ?)')
    .run(
      ['actualite', 'histoire', 'pratique', 'figure', 'geo', 'langue', 'debat'].includes(categorie) ? categorie : 'actualite',
      String(titre).trim(),
      String(contenu).trim(),
      auj
    );
  addLog('culture_publiee', { source: 'admin', req, details: titre });
  res.status(201).json({ ok: true });
});

router.delete('/culture/:id', admin, refuseAR, (req, res) => {
  db.prepare('DELETE FROM culture WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------- Lexique arabe ------------------------- */
router.get('/lexique', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM lexique ORDER BY categorie, id').all());
});

router.post('/lexique', admin, (req, res) => {
  const { mot_ar, mot_fr, categorie } = req.body || {};
  if (!mot_ar || !String(mot_ar).trim() || !mot_fr || !String(mot_fr).trim())
    return res.status(400).json({ error: 'Mot arabe et traduction obligatoires.' });
  db.prepare('INSERT INTO lexique (mot_ar, mot_fr, categorie) VALUES (?, ?, ?)')
    .run(String(mot_ar).trim(), String(mot_fr).trim(), String(categorie || 'général').trim());
  res.status(201).json({ ok: true });
});

router.delete('/lexique/:id', admin, (req, res) => {
  db.prepare('DELETE FROM lexique WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/cours/:id', admin, (req, res) => {
  const c = db.prepare('SELECT * FROM cours WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, c)) return;
  if (c.pdf_file) tryUnlink(path.join(UPLOADS, c.pdf_file));
  db.prepare('DELETE FROM cours WHERE id = ?').run(c.id);
  addLog('cours_supprime', { source: 'admin', req, details: c.titre });
  return res.json({ ok: true });
});

/* ------------------------- catalogue métiers ------------------------- */
router.get('/metiers', admin, refuseAR, (req, res) => {
  const sql =
    req.scope === 'all'
      ? 'SELECT * FROM metiers ORDER BY filiere, ordre, id'
      : "SELECT * FROM metiers WHERE filiere = ? OR filiere = 'all' ORDER BY ordre, id";
  res.json(db.prepare(sql).all(...(req.scope === 'all' ? [] : [req.scope])));
});

router.post('/upload-image', admin, imageUpload, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucune image reçue.' });
  const dest = path.join(UPLOADS, 'metiers', `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(req.file.path)}`);
  fs.renameSync(req.file.path, dest);
  return res.json({ url: `/media/metiers/${path.basename(dest)}` });
});

router.post('/metiers', admin, refuseAR, (req, res) => {
  const { titre, domaine, description, debouches, image, parcours } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';
  const maxOrdre = db.prepare('SELECT MAX(ordre) m FROM metiers WHERE filiere = ?').get(filiere).m || 0;
  const info = db
    .prepare('INSERT INTO metiers (titre, domaine, description, debouches, image, ordre, filiere, parcours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(String(titre).trim(), domaine || null, description || null, debouches || null, image || null, maxOrdre + 1, filiere, parcours || null);
  addLog('metier_cree', { source: 'admin', req, details: titre });
  return res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/metiers/:id', admin, refuseAR, (req, res) => {
  const m = db.prepare('SELECT * FROM metiers WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Métier introuvable.' });
  db.prepare('UPDATE metiers SET titre = ?, domaine = ?, description = ?, debouches = ?, image = ?, parcours = ? WHERE id = ?').run(
    String(req.body.titre ?? m.titre).trim(),
    req.body.domaine ?? m.domaine,
    req.body.description ?? m.description,
    req.body.debouches ?? m.debouches,
    req.body.image ?? m.image,
    req.body.parcours ?? m.parcours,
    m.id
  );
  return res.json({ ok: true });
});

router.delete('/metiers/:id', admin, refuseAR, (req, res) => {
  const m = db.prepare('SELECT * FROM metiers WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Métier introuvable.' });
  db.prepare('DELETE FROM metiers WHERE id = ?').run(m.id);
  return res.json({ ok: true });
});

/* ------------------------- Annales ------------------------- */
const annalesUpload = makeUploader(['.pdf'], 25).fields([
  { name: 'sujet', maxCount: 1 },
  { name: 'corrige', maxCount: 1 },
]);

router.get('/annales', admin, refuseAR, (req, res) => {
  res.json(
    db
      .prepare(req.scope === 'all' ? 'SELECT * FROM annales ORDER BY annee DESC, id DESC' : 'SELECT * FROM annales WHERE filiere = ? ORDER BY annee DESC, id DESC')
      .all(...(req.scope === 'all' ? [] : [req.scope]))
  );
});

router.post('/annales', admin, refuseAR, annalesUpload, (req, res) => {
  const { titre, matiere, annee } = req.body || {};
  const an = parseInt(annee, 10);
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!MATIERES.includes(matiere)) return res.status(400).json({ error: 'Matière invalide.' });
  if (!an || an < 2000 || an > 2026) return res.status(400).json({ error: 'Année invalide (2000 à 2026).' });
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';

  function moveFile(field) {
    const f = req.files?.[field]?.[0];
    if (!f) return null;
    const dir = path.join(UPLOADS, 'annales');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
    fs.renameSync(f.path, dest);
    return `annales/${path.basename(dest)}`;
  }
  const sujet_pdf = moveFile('sujet');
  const corrige_pdf = moveFile('corrige');
  if (!sujet_pdf && !corrige_pdf) return res.status(400).json({ error: 'Ajoutez au moins un PDF (sujet ou corrigé).' });

  const info = db
    .prepare('INSERT INTO annales (filiere, matiere, annee, titre, sujet_pdf, corrige_pdf) VALUES (?, ?, ?, ?, ?, ?)')
    .run(filiere, matiere, an, String(titre).trim(), sujet_pdf, corrige_pdf);
  addLog('annales_ajoutees', { source: 'admin', req, details: `${titre} (${annee})` });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/annales/:id', admin, refuseAR, (req, res) => {
  const a = db.prepare('SELECT * FROM annales WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, a)) return;
  if (a.sujet_pdf) tryUnlink(path.join(UPLOADS, a.sujet_pdf));
  if (a.corrige_pdf) tryUnlink(path.join(UPLOADS, a.corrige_pdf));
  db.prepare('DELETE FROM annales WHERE id = ?').run(a.id);
  res.json({ ok: true });
});

/* ------------------------- Quiz ------------------------- */
router.get('/quiz', admin, refuseAR, (req, res) => {
  res.json(
    db
      .prepare(req.scope === 'all' ? 'SELECT * FROM quiz_questions ORDER BY filiere, matiere, lecon, id' : 'SELECT * FROM quiz_questions WHERE filiere = ? ORDER BY matiere, lecon, id')
      .all(...(req.scope === 'all' ? [] : [req.scope]))
      .map((r) => ({ ...r, choix: JSON.parse(r.choix) }))
  );
});

router.post('/quiz', admin, refuseAR, (req, res) => {
  const { question, lecon, matiere, choix, bonne } = req.body || {};
  if (!question || !String(question).trim()) return res.status(400).json({ error: 'La question est obligatoire.' });
  if (!lecon || !String(lecon).trim()) return res.status(400).json({ error: 'La leçon est obligatoire.' });
  if (!MATIERES.includes(matiere)) return res.status(400).json({ error: 'Matière invalide.' });
  if (!Array.isArray(choix) || choix.length !== 4 || choix.some((c) => !String(c).trim()))
    return res.status(400).json({ error: 'Il faut exactement 4 choix remplis.' });
  const b = parseInt(bonne, 10);
  if (!(b >= 0 && b <= 3)) return res.status(400).json({ error: 'Bonne réponse invalide.' });
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';
  db.prepare('INSERT INTO quiz_questions (filiere, matiere, lecon, question, choix, bonne) VALUES (?, ?, ?, ?, ?, ?)')
    .run(filiere, matiere, String(lecon).trim(), String(question).trim(), JSON.stringify(choix.map((c) => String(c).trim())), b);
  addLog('quiz_question_ajoutee', { source: 'admin', req, details: `${lecon} (${filiere})` });
  res.status(201).json({ ok: true });
});

router.delete('/quiz/:id', admin, refuseAR, (req, res) => {
  const q = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, q)) return;
  db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(q.id);
  res.json({ ok: true });
});

/* ------------------------- Questions des élèves ------------------------- */
router.get('/questions', admin, (req, res) => {
  res.json(
    db
      .prepare(
        req.scope === 'all'
          ? "SELECT * FROM questions_eleves ORDER BY (statut = 'en_attente') DESC, id DESC"
          : "SELECT * FROM questions_eleves WHERE filiere = ? ORDER BY (statut = 'en_attente') DESC, id DESC"
      )
      .all(...(req.scope === 'all' ? [] : [req.scope]))
  );
});

router.post('/questions/:id/repondre', admin, (req, res) => {
  const q = db.prepare('SELECT * FROM questions_eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, q)) return;
  const reponse = String(req.body?.reponse || '').trim();
  if (!reponse) return res.status(400).json({ error: 'La réponse est obligatoire.' });
  db.prepare("UPDATE questions_eleves SET reponse = ?, statut = 'repondu', repondu_at = ? WHERE id = ?")
    .run(reponse, new Date().toISOString(), q.id);
  // Temps réel : l'élève connecté reçoit la réponse immédiatement.
  sse.send(q.eleve_db_id, 'reponse', { id: q.id, reponse });
  addLog('question_repondu', { source: 'admin', eleveDbId: q.eleve_db_id, eleveRef: q.eleve_ref, req, details: `par ${req.admin.username}` });
  res.json({ ok: true });
});

/* ------------------------- Boîte à idées ------------------------- */
router.get('/idees', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM idees ORDER BY lu ASC, id DESC').all());
});

router.post('/idees/:id/lu', admin, (req, res) => {
  db.prepare('UPDATE idees SET lu = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------- Échéances (agenda) ------------------------- */
router.get('/echeances', admin, refuseAR, (req, res) => {
  res.json(db.prepare('SELECT * FROM echeances ORDER BY date_debut').all());
});

router.post('/echeances', admin, refuseAR, (req, res) => {
  const { titre, categorie, date_debut, date_fin, lieu, description, conseils } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date_debut || ''))) return res.status(400).json({ error: 'Date de début invalide.' });
  db.prepare('INSERT INTO echeances (titre, categorie, date_debut, date_fin, lieu, description, conseils) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(
      String(titre).trim(),
      ['bac', 'concours', 'examen', 'autre'].includes(categorie) ? categorie : 'autre',
      date_debut,
      /^\d{4}-\d{2}-\d{2}$/.test(String(date_fin || '')) ? date_fin : null,
      lieu || null,
      description || null,
      conseils || null
    );
  addLog('echeance_ajoutee', { source: 'admin', req, details: titre });
  res.status(201).json({ ok: true });
});

router.delete('/echeances/:id', admin, refuseAR, (req, res) => {
  db.prepare('DELETE FROM echeances WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
