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

const MATIERES = ['maths', 'physique-chimie', 'francais', 'histoire-geographie'];
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

router.get('/me', admin, (req, res) => res.json({ username: req.admin.username }));

/* ------------------------- statistiques ------------------------- */
router.get('/stats', admin, (req, res) => {
  const parMatiere = {};
  for (const r of db.prepare('SELECT matiere, COUNT(*) c FROM cours GROUP BY matiere').all()) {
    parMatiere[r.matiere] = r.c;
  }
  res.json({
    totalEleves: db.prepare('SELECT COUNT(*) c FROM eleves').get().c,
    sessionsActives: db.prepare('SELECT COUNT(*) c FROM eleves WHERE actif = 1 AND session_jti IS NOT NULL').get().c,
    revoques: db.prepare('SELECT COUNT(*) c FROM eleves WHERE actif = 0').get().c,
    totalCours: db.prepare('SELECT COUNT(*) c FROM cours').get().c,
    totalMetiers: db.prepare('SELECT COUNT(*) c FROM metiers').get().c,
    parMatiere,
    derniersLogs: db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 25').all(),
  });
});

router.get('/logs', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 200').all());
});

/* ------------------------- élèves (accès, kill switch) ------------------------- */
router.get('/eleves', admin, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM eleves ORDER BY id DESC')
    .all()
    .map((e) => ({
      id: e.id,
      eleve_id: e.eleve_id,
      nom: e.nom,
      prenom: e.prenom,
      classe: e.classe,
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
  let id;
  do {
    id = generateEleveId();
  } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ?').get(id));
  db.prepare('INSERT INTO eleves (eleve_id, nom, prenom, classe) VALUES (?, ?, ?, ?)').run(
    id,
    String(nom).trim(),
    String(prenom).trim(),
    String(classe || 'Terminale S2').trim()
  );
  addLog('eleve_cree', { source: 'admin', req, details: `${prenom} ${nom} -> ${id}` });
  return res.status(201).json({ eleve_id: id });
});

// KILL SWITCH : invalide l'ID immédiatement et déconnecte l'appareil en cours.
router.post('/eleves/:id/revoquer', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Élève introuvable.' });
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
  if (!e) return res.status(404).json({ error: 'Élève introuvable.' });
  db.prepare('UPDATE eleves SET actif = 1, revoked_at = NULL WHERE id = ?').run(e.id);
  addLog('eleve_reactive', { source: 'admin', eleveDbId: e.id, eleveRef: e.eleve_id, req, details: `par ${req.admin.username}` });
  return res.json({ ok: true });
});

// Régénérer l'ID (si l'ancien a fuité) : l'ancien devient inutilisable.
router.post('/eleves/:id/regenerer', admin, (req, res) => {
  const e = db.prepare('SELECT * FROM eleves WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Élève introuvable.' });
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
  if (!e) return res.status(404).json({ error: 'Élève introuvable.' });
  sse.send(e.id, 'session', { type: 'revoque' });
  db.prepare('DELETE FROM eleves WHERE id = ?').run(e.id);
  addLog('eleve_supprime', { source: 'admin', eleveRef: e.eleve_id, req, details: `${e.prenom} ${e.nom}` });
  return res.json({ ok: true });
});

/* ------------------------- cours (vidéos + PDF) ------------------------- */
router.get('/cours', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM cours ORDER BY matiere, ordre, id').all());
});

router.post('/cours', admin, pdfUpload, (req, res) => {
  const { titre, matiere } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  if (!MATIERES.includes(matiere)) return res.status(400).json({ error: 'Matière invalide.' });
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

  const maxOrdre = db.prepare('SELECT MAX(ordre) m FROM cours WHERE matiere = ?').get(matiere).m || 0;
  const info = db
    .prepare('INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(titre).trim(), matiere, String(req.body.description || '').trim() || null, youtube_id, pdf_file, maxOrdre + 1);
  addLog('cours_cree', { source: 'admin', req, details: `${titre} (${matiere})` });
  return res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/cours/:id', admin, pdfUpload, (req, res) => {
  const c = db.prepare('SELECT * FROM cours WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cours introuvable.' });
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

router.delete('/cours/:id', admin, (req, res) => {
  const c = db.prepare('SELECT * FROM cours WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cours introuvable.' });
  if (c.pdf_file) tryUnlink(path.join(UPLOADS, c.pdf_file));
  db.prepare('DELETE FROM cours WHERE id = ?').run(c.id);
  addLog('cours_supprime', { source: 'admin', req, details: c.titre });
  return res.json({ ok: true });
});

/* ------------------------- catalogue métiers ------------------------- */
router.get('/metiers', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM metiers ORDER BY ordre, id').all());
});

router.post('/upload-image', admin, imageUpload, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucune image reçue.' });
  const dest = path.join(UPLOADS, 'metiers', `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(req.file.path)}`);
  fs.renameSync(req.file.path, dest);
  return res.json({ url: `/media/metiers/${path.basename(dest)}` });
});

router.post('/metiers', admin, (req, res) => {
  const { titre, domaine, description, debouches, image } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  const maxOrdre = db.prepare('SELECT MAX(ordre) m FROM metiers').get().m || 0;
  const info = db
    .prepare('INSERT INTO metiers (titre, domaine, description, debouches, image, ordre) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(titre).trim(), domaine || null, description || null, debouches || null, image || null, maxOrdre + 1);
  addLog('metier_cree', { source: 'admin', req, details: titre });
  return res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/metiers/:id', admin, (req, res) => {
  const m = db.prepare('SELECT * FROM metiers WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Métier introuvable.' });
  db.prepare('UPDATE metiers SET titre = ?, domaine = ?, description = ?, debouches = ?, image = ? WHERE id = ?').run(
    String(req.body.titre ?? m.titre).trim(),
    req.body.domaine ?? m.domaine,
    req.body.description ?? m.description,
    req.body.debouches ?? m.debouches,
    req.body.image ?? m.image,
    m.id
  );
  return res.json({ ok: true });
});

router.delete('/metiers/:id', admin, (req, res) => {
  const m = db.prepare('SELECT * FROM metiers WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Métier introuvable.' });
  db.prepare('DELETE FROM metiers WHERE id = ?').run(m.id);
  return res.json({ ok: true });
});

module.exports = router;
