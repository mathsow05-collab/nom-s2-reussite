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

const MATIERES = ['maths', 'physique', 'chimie', 'svt', 'physique-chimie', 'francais', 'histoire-geographie', 'philosophie', 'anglais', 'espagnol', 'economie', 'lecture', 'sourates', 'tajwid', 'tafsir'];

// La « Culture du monde » est un contenu L2 : fermée au périmètre S2.
function refuseCulture(req, res, next) {
  if (req.scope === 'S2')
    return res.status(403).json({ error: 'Module réservé au périmètre L2.' });
  return next();
}
function refuseAR(req, res, next) {
  return next();
}
function refuseLexique(req, res, next) {
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
    serie: (() => {
      const jours = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        jours.push({
          d: key.slice(8) + '/' + key.slice(5, 7),
          copies: db.prepare("SELECT COUNT(*) c FROM examens_tentatives WHERE substr(finished_at,1,10) = ? AND statut != 'en_cours'").get(key).c,
          questions: db.prepare('SELECT COUNT(*) c FROM questions_eleves WHERE substr(created_at,1,10) = ?').get(key).c,
        });
      }
      return jours;
    })(),
    derniersLogs:
      req.scope === 'all'
        ? db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 25').all()
        : db
            .prepare('SELECT l.* FROM logs l JOIN eleves e ON e.id = l.eleve_db_id WHERE e.filiere = ? ORDER BY l.id DESC LIMIT 25')
            .all(req.scope),
  });
});

router.get('/logs', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
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
    id = generateEleveId(filiere === 'L2' ? 'L2' : 'S2');
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
    id = generateEleveId(e.filiere === 'L2' ? 'L2' : 'S2');
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
    .prepare('INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre, filiere, duree_min, difficulte, acquis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(
      String(titre).trim(),
      matiere,
      String(req.body.description || '').trim() || null,
      youtube_id,
      pdf_file,
      maxOrdre + 1,
      filiere,
      parseInt(req.body.duree_min, 10) || null,
      Math.min(3, Math.max(0, parseInt(req.body.difficulte, 10) || 0)),
      String(req.body.acquis || '').trim() || null
    );
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

  db.prepare('UPDATE cours SET titre = ?, matiere = ?, description = ?, youtube_id = ?, pdf_file = ?, duree_min = ?, difficulte = ?, acquis = ? WHERE id = ?').run(
    String(req.body.titre || c.titre).trim(),
    matiere,
    req.body.description !== undefined ? String(req.body.description).trim() || null : c.description,
    youtube_id,
    pdf_file,
    req.body.duree_min !== undefined ? parseInt(req.body.duree_min, 10) || null : c.duree_min,
    req.body.difficulte !== undefined ? Math.min(3, Math.max(0, parseInt(req.body.difficulte, 10) || 0)) : c.difficulte,
    req.body.acquis !== undefined ? String(req.body.acquis).trim() || null : c.acquis,
    c.id
  );
  addLog('cours_modifie', { source: 'admin', req, details: c.titre });
  return res.json({ ok: true });
});

/* ------------------------- Réglages (clé IA) ------------------------- */
router.get('/settings', admin, (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_key'").get();
  const g = db.prepare("SELECT value FROM settings WHERE key = 'groq_key'").get();
  const wave = db.prepare("SELECT value FROM settings WHERE key = 'wave_numero'").get();
  const om = db.prepare("SELECT value FROM settings WHERE key = 'om_numero'").get();
  res.json({
    ia: !!process.env.GEMINI_API_KEY || !!row,
    source: process.env.GEMINI_API_KEY ? 'env' : row ? 'admin' : null,
    groq: !!process.env.GROQ_API_KEY || !!g,
    wave: wave?.value || '',
    om: om?.value || '',
    cinetpay: !!(db.prepare("SELECT value FROM settings WHERE key = 'cinetpay_api_key'").get()?.value && db.prepare("SELECT value FROM settings WHERE key = 'cinetpay_site_id'").get()?.value),
  });
});

router.post('/settings/ia', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  const key = String(req.body?.key || '').trim();
  const groq = String(req.body?.groq || '').trim();
  if (!key && !groq) return res.status(400).json({ error: 'Clé vide.' });
  if (key)
    db.prepare("INSERT INTO settings (key, value) VALUES ('gemini_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key);
  if (groq)
    db.prepare("INSERT INTO settings (key, value) VALUES ('groq_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(groq);
  addLog('ia_cle_enregistree', { source: 'admin', req, details: req.admin.username });
  res.json({ ok: true });
});

router.post('/settings/paiements', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  const wave = String(req.body?.wave || '').trim();
  const om = String(req.body?.om || '').trim();
  const ck = String(req.body?.cinetpay_key || '').trim();
  const cs = String(req.body?.cinetpay_site || '').trim();
  if (ck)
    db.prepare("INSERT INTO settings (key, value) VALUES ('cinetpay_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(ck);
  if (cs)
    db.prepare("INSERT INTO settings (key, value) VALUES ('cinetpay_site_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(cs);
  if (wave)
    db.prepare("INSERT INTO settings (key, value) VALUES ('wave_numero', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(wave);
  if (om)
    db.prepare("INSERT INTO settings (key, value) VALUES ('om_numero', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(om);
  addLog('paiements_numeros_maj', { source: 'admin', req });
  res.json({ ok: true });
});

router.get('/paiements', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  res.json(
    db
      .prepare(
        `SELECT p.*, e.prenom, e.nom, e.classe, e.filiere, e.eleve_id
         FROM payements p JOIN eleves e ON e.id = p.eleve_db_id
         ORDER BY (p.statut = 'en_attente') DESC, p.id DESC LIMIT 100`
      )
      .all()
  );
});

function reglerPaiement(req, res, statut) {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  const p = db.prepare("SELECT * FROM payements WHERE id = ? AND statut = 'en_attente'").get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Paiement introuvable.' });
  db.prepare('UPDATE payements SET statut = ? WHERE id = ?').run(statut, p.id);
  if (statut === 'valide') {
    const e = db.prepare('SELECT abo_expire FROM eleves WHERE id = ?').get(p.eleve_db_id);
    const base = e?.abo_expire && new Date(e.abo_expire) > new Date() ? new Date(e.abo_expire) : new Date();
    const fin = new Date(base.getTime() + 30 * 86400000);
    db.prepare('UPDATE eleves SET abo_expire = ? WHERE id = ?').run(fin.toISOString(), p.eleve_db_id);
  }
  addLog('paiement_' + statut, { source: 'admin', req, eleveDbId: p.eleve_db_id, details: `#${p.id}` });
  res.json({ ok: true });
}
router.post('/paiements/:id/valider', admin, (req, res) => reglerPaiement(req, res, 'valide'));
router.post('/paiements/:id/rejeter', admin, (req, res) => reglerPaiement(req, res, 'rejete'));

router.delete('/settings/ia/groq', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  db.prepare("DELETE FROM settings WHERE key = 'groq_key'").run();
  res.json({ ok: true });
});

router.delete('/settings/ia', admin, (req, res) => {
  if (req.scope !== 'all') return res.status(403).json({ error: 'Réservé à la direction.' });
  db.prepare("DELETE FROM settings WHERE key = 'gemini_key'").run();
  res.json({ ok: true });
});

/* ------------------------- Filières universitaires ------------------------- */
router.get('/parcours-univ', admin, refuseAR, (req, res) => {
  res.json(db.prepare('SELECT * FROM parcours_univ ORDER BY id').all());
});

router.post('/parcours-univ', admin, refuseAR, (req, res) => {
  const { cible, titre, intro, blocs } = req.body || {};
  if (!titre || !String(titre).trim() || !blocs || !String(blocs).trim())
    return res.status(400).json({ error: 'Titre et contenu obligatoires.' });
  db.prepare('INSERT INTO parcours_univ (cible, titre, intro, blocs) VALUES (?, ?, ?, ?)')
    .run(['S2', 'L2', 'all'].includes(cible) ? cible : 'all', String(titre).trim(), String(intro || '').trim(), String(blocs).trim());
  addLog('filiere_univ_ajoutee', { source: 'admin', req, details: titre });
  res.status(201).json({ ok: true });
});

router.delete('/parcours-univ/:id', admin, refuseAR, (req, res) => {
  db.prepare('DELETE FROM parcours_univ WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------- Culture du monde ------------------------- */
router.get('/culture', admin, refuseCulture, (req, res) => {
  res.json(db.prepare('SELECT * FROM culture ORDER BY date_publi DESC, id DESC').all());
});

router.post('/culture', admin, refuseCulture, (req, res) => {
  const { categorie, titre, contenu } = req.body || {};
  if (!titre || !String(titre).trim() || !contenu || !String(contenu).trim())
    return res.status(400).json({ error: 'Titre et contenu obligatoires.' });
  const auj = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO culture (categorie, titre, contenu, date_publi) VALUES (?, ?, ?, ?)')
    .run(
      ['actualite', 'histoire', 'pratique', 'figure', 'geo', 'langue', 'debat', 'citation'].includes(categorie) ? categorie : 'actualite',
      String(titre).trim(),
      String(contenu).trim(),
      auj
    );
  addLog('culture_publiee', { source: 'admin', req, details: titre });
  res.status(201).json({ ok: true });
});

router.delete('/culture/:id', admin, refuseCulture, (req, res) => {
  db.prepare('DELETE FROM culture WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------- Lexique arabe ------------------------- */
router.get('/lexique', admin, refuseLexique, (req, res) => {
  res.json(db.prepare('SELECT * FROM lexique ORDER BY categorie, id').all());
});

router.post('/lexique', admin, refuseLexique, (req, res) => {
  const { mot_ar, mot_fr, categorie } = req.body || {};
  if (!mot_ar || !String(mot_ar).trim() || !mot_fr || !String(mot_fr).trim())
    return res.status(400).json({ error: 'Mot arabe et traduction obligatoires.' });
  db.prepare('INSERT INTO lexique (mot_ar, mot_fr, categorie) VALUES (?, ?, ?)')
    .run(String(mot_ar).trim(), String(mot_fr).trim(), String(categorie || 'général').trim());
  res.status(201).json({ ok: true });
});

router.delete('/lexique/:id', admin, refuseLexique, (req, res) => {
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
/* ------------------------- Flashcards ------------------------- */
router.get('/flash', admin, (req, res) => {
  const decks = db
    .prepare(req.scope === 'all' ? 'SELECT * FROM flash_decks ORDER BY id DESC' : "SELECT * FROM flash_decks WHERE filiere IN (?, 'all') ORDER BY id DESC")
    .all(...(req.scope === 'all' ? [] : [req.scope]));
  const cnt = db.prepare('SELECT deck_id, COUNT(*) c FROM flash_cards GROUP BY deck_id');
  const m = {};
  for (const r of cnt.all()) m[r.deck_id] = r.c;
  res.json(decks.map((d) => ({ ...d, nb: m[d.id] || 0 })));
});

router.post('/flash', admin, (req, res) => {
  const { titre, filiere, matiere, lignes } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  const cartes = String(lignes || '')
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p.length >= 2 && p[0] && p[1]);
  if (!cartes.length) return res.status(400).json({ error: 'Ajoutez au moins une carte (format : recto | verso).' });
  const f = req.scope !== 'all' ? req.scope : filiere === 'L2' ? 'L2' : 'all';
  const info = db.prepare('INSERT INTO flash_decks (titre, filiere, matiere) VALUES (?,?,?)').run(String(titre).trim(), f, String(matiere || '').trim() || null);
  const ins = db.prepare('INSERT INTO flash_cards (deck_id, recto, verso, ordre) VALUES (?,?,?,?)');
  cartes.forEach(([r, v], i) => ins.run(info.lastInsertRowid, r, v, i + 1));
  addLog('flash_deck_cree', { source: 'admin', req, details: `${titre} (${cartes.length} cartes)` });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/flash/:id', admin, (req, res) => {
  db.prepare('DELETE FROM flash_cards WHERE deck_id = ?').run(req.params.id);
  db.prepare('DELETE FROM flash_decks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------- Examens maison ------------------------- */
const examenUpload = makeUploader(['.pdf'], 25).fields([
  { name: 'sujet', maxCount: 1 },
  { name: 'corrige', maxCount: 1 },
]);

router.get('/examens', admin, (req, res) => {
  res.json(
    db
      .prepare(req.scope === 'all' ? 'SELECT * FROM examens ORDER BY id DESC' : 'SELECT * FROM examens WHERE filiere = ? ORDER BY id DESC')
      .all(...(req.scope === 'all' ? [] : [req.scope]))
  );
});

router.post('/examens', admin, examenUpload, (req, res) => {
  const { titre, matiere, consignes, durees } = req.body || {};
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est obligatoire.' });
  const f = req.files?.sujet?.[0];
  if (!f) return res.status(400).json({ error: 'Le PDF du sujet est obligatoire.' });
  const dir = path.join(UPLOADS, 'examens');
  fs.mkdirSync(dir, { recursive: true });
  const destS = path.join(dir, `sujet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
  fs.renameSync(f.path, destS);
  const sujet_pdf = `examens/${path.basename(destS)}`;
  let corrige_pdf = null;
  const cf = req.files?.corrige?.[0];
  if (cf) {
    const destC = path.join(dir, `corrige-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
    fs.renameSync(cf.path, destC);
    corrige_pdf = `examens/${path.basename(destC)}`;
  }
  const filiere = req.scope !== 'all' ? req.scope : req.body.filiere === 'L2' ? 'L2' : 'S2';
  const dur =
    String(durees || '120')
      .split(';')
      .filter((d) => ['60', '120', '180'].includes(d))
      .join(';') || '120';
  const info = db
    .prepare('INSERT INTO examens (titre, filiere, matiere, consignes, durees, sujet_pdf, corrige_pdf) VALUES (?,?,?,?,?,?,?)')
    .run(String(titre).trim(), filiere, String(matiere || '').trim() || null, String(consignes || '').trim() || null, dur, sujet_pdf, corrige_pdf);
  addLog('examen_cree', { source: 'admin', req, details: String(titre) });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/examens/:id', admin, (req, res) => {
  db.prepare('DELETE FROM examens WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM examens_tentatives WHERE examen_id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/examens/:id/tentatives', admin, (req, res) => {
  res.json(
    db
      .prepare('SELECT t.*, e.prenom, e.nom, e.eleve_id, e.classe FROM examens_tentatives t JOIN eleves e ON e.id = t.eleve_db_id WHERE t.examen_id = ? ORDER BY t.id DESC')
      .all(req.params.id)
  );
});

router.get('/examens/copie/:tid', requireAdmin(db, { allowQuery: true }), (req, res) => {
  const t = db.prepare('SELECT * FROM examens_tentatives WHERE id = ?').get(req.params.tid);
  if (!t?.copie_pdf) return res.status(404).json({ error: 'Copie absente.' });
  const file = path.join(UPLOADS, t.copie_pdf);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Fichier manquant.' });
  res.setHeader('Content-Type', 'application/pdf');
  return res.sendFile(file);
});

const copieCorrigeeUp = makeUploader(['.pdf'], 25).single('copie_corrigee');

router.post('/tentatives/:id/corriger', admin, copieCorrigeeUp, (req, res) => {
  const { score, commentaire } = req.body || {};
  let rel = null;
  if (req.file) {
    const dir = path.join(UPLOADS, 'examens');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `rendu-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`);
    fs.renameSync(req.file.path, dest);
    rel = `examens/${path.basename(dest)}`;
  }
  db.prepare('UPDATE examens_tentatives SET score = ?, commentaire = ?, copie_corrigee_pdf = COALESCE(?, copie_corrigee_pdf), statut = \'corrige\', corrected_at = ? WHERE id = ?')
    .run(String(score || '').trim(), String(commentaire || '').trim(), rel, new Date().toISOString(), req.params.id);
  addLog('examen_corrige', { source: 'admin', req, details: `tentative ${req.params.id}` });
  res.json({ ok: true });
});

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
  const rows = db
    .prepare(
      req.scope === 'all'
        ? "SELECT * FROM questions_eleves ORDER BY (statut = 'en_attente') DESC, id DESC"
        : "SELECT * FROM questions_eleves WHERE filiere = ? ORDER BY (statut = 'en_attente') DESC, id DESC"
    )
    .all(...(req.scope === 'all' ? [] : [req.scope]));
  const ep = db.prepare("SELECT value FROM settings WHERE key = 'question_semaine'").get();
  res.json(rows.map((r) => ({ ...r, epingle: !!ep && Number(ep.value) === r.id })));
});

router.post('/questions/:id/repondre', admin, (req, res) => {
  const q = db.prepare('SELECT * FROM questions_eleves WHERE id = ?').get(req.params.id);
  if (!checkScope(req, res, q)) return;
  const reponse = String(req.body?.reponse || '').trim();
  if (!reponse) return res.status(400).json({ error: 'La réponse est obligatoire.' });
  db.prepare("UPDATE questions_eleves SET reponse = ?, statut = 'repondu', repondu_at = ?, public = 1 WHERE id = ?")
    .run(reponse, new Date().toISOString(), q.id);
  // Temps réel : l'élève connecté reçoit la réponse immédiatement.
  sse.send(q.eleve_db_id, 'reponse', { id: q.id, reponse });
  addLog('question_repondu', { source: 'admin', eleveDbId: q.eleve_db_id, eleveRef: q.eleve_ref, req, details: `par ${req.admin.username}` });
  res.json({ ok: true });
});

/* ------------------------- Boîte à idées ------------------------- */
router.post('/questions/:id/epingler', admin, (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare("SELECT value FROM settings WHERE key = 'question_semaine'").get();
  const actuel = cur ? Number(cur.value) : 0;
  const next = actuel === id ? 0 : id;
  db.prepare("INSERT INTO settings (key, value) VALUES ('question_semaine', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(next));
  res.json({ ok: true, epingle: next });
});
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

/* ------------------------------------------------------------------ */
/* DEVOIRS COMMUNS (binômes) : l'admin crée un devoir QCM ; chaque     */
/* binôme doit se concerter dans son chat et donner UNE réponse        */
/* commune (validée uniquement si les deux choisissent pareil).        */
/* ------------------------------------------------------------------ */
router.get('/devoirs-binomes', admin, refuseAR, (req, res) => {
  const rows = db
    .prepare(
      req.scope === 'all'
        ? 'SELECT * FROM devoirs_binomes ORDER BY id DESC'
        : "SELECT * FROM devoirs_binomes WHERE filiere = ? OR filiere = 'all' ORDER BY id DESC"
    )
    .all(...(req.scope === 'all' ? [] : [req.scope]));
  res.json(
    rows.map((d) => {
      const nbQ = db.prepare('SELECT COUNT(*) AS n FROM devoir_binome_questions WHERE devoir_id = ?').get(d.id).n;
      const nbPairs = db.prepare('SELECT COUNT(DISTINCT lien_id) AS n FROM devoir_binome_reponses WHERE devoir_id = ?').get(d.id).n;
      return { ...d, nb_questions: nbQ, nb_binomes: nbPairs };
    })
  );
});

const DEVOIRS_DIR = path.join(UPLOADS, 'devoirs');
fs.mkdirSync(DEVOIRS_DIR, { recursive: true });
const devoirMedia = multer({
  storage: multer.diskStorage({
    destination: DEVOIRS_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return cb(new Error('Image non autorisée.'));
    return cb(null, true);
  },
}).any();

router.post('/devoirs-binomes', admin, refuseAR, (req, res) => {
  const estForm = !!req.headers['content-type']?.startsWith('multipart/form-data');
  if (!estForm) return creer();
  return devoirMedia(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Fichier refusé.' });
    return creer();
  });

  function creer() {
    const body = req.body || {};
    const titre = body.titre;
    const description = body.description;
    const filiere = body.filiere;
    const deadline = body.deadline;
    const serie = body.serie;
    const duree_min = body.duree_min;
    let questions = body.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch {
        questions = null;
      }
    }
    if (!titre || !Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ error: 'Titre et au moins une question requis.' });
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.choix) || q.choix.length < 2 || !Number.isInteger(Number(q.bonne)))
        return res.status(400).json({ error: 'Chaque question doit avoir un énoncé, au moins 2 choix et une bonne réponse.' });
    }
    const r = db
      .prepare('INSERT INTO devoirs_binomes (titre, description, filiere, serie, duree_min, deadline) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        String(titre).slice(0, 120),
        String(description || '').slice(0, 500),
        req.scope !== 'all' ? req.scope : ['S2', 'L2', 'all'].includes(filiere) ? filiere : 'all',
        serie ? String(serie).slice(0, 80) : null,
        duree_min ? Math.max(1, Math.min(240, Number(duree_min))) : null,
        /^\d{4}-\d{2}-\d{2}T/.test(String(deadline || '')) ? deadline : null
      );
    const insQ = db.prepare(
      'INSERT INTO devoir_binome_questions (devoir_id, question, choix, bonne, ordre) VALUES (?, ?, ?, ?, ?)'
    );
    questions.forEach((q, i) => {
      const qr = insQ.run(r.lastInsertRowid, String(q.question).slice(0, 500), JSON.stringify(q.choix.slice(0, 6)), Number(q.bonne), i);
      const img = (req.files || []).find((f) => f.fieldname === `img_${i}`);
      if (img) db.prepare('UPDATE devoir_binome_questions SET image = ? WHERE id = ?').run(`devoirs/${img.filename}`, qr.lastInsertRowid);
    });

  // Annonce dans le chat de chaque binôme actif de la filière ciblée.
  const liens = db.prepare("SELECT * FROM chat_amis WHERE statut = 'actif'").all();
  const cible = ['S2', 'L2'].includes(filiere) ? filiere : null;
  for (const l of liens) {
    const e = db.prepare('SELECT filiere FROM eleves WHERE id = ?').get(l.eleve_a);
    if (cible && e?.filiere !== cible) continue;
    const obj = { action: 'nouveau', devoir_id: r.lastInsertRowid, titre: String(titre).slice(0, 120) };
    db.prepare('INSERT INTO chat_messages (de_id, vers_id, type, texte) VALUES (0, ?, ?, ?)').run(l.eleve_a, 'devoir', JSON.stringify(obj));
    db.prepare('INSERT INTO chat_messages (de_id, vers_id, type, texte) VALUES (0, ?, ?, ?)').run(l.eleve_b, 'devoir', JSON.stringify(obj));
    sse.send(l.eleve_a, 'chat', { t: 'devoir' });
    sse.send(l.eleve_b, 'chat', { t: 'devoir' });
  }
    addLog('devoir_binome_cree', { source: 'admin', req, details: titre });
    res.status(201).json({ ok: true, id: r.lastInsertRowid });
  }
});

const devoirDansScope = (req, d) => !!d && (req.scope === 'all' || d.filiere === req.scope || d.filiere === 'all');
router.get('/devoirs-binomes/:id', admin, refuseAR, (req, res) => {
  const d = db.prepare('SELECT * FROM devoirs_binomes WHERE id = ?').get(req.params.id);
  if (!devoirDansScope(req, d)) return res.status(403).json({ error: 'Hors de votre périmètre.' });
  const questions = db.prepare('SELECT * FROM devoir_binome_questions WHERE devoir_id = ? ORDER BY ordre, id').all(d.id);
  const liens = db.prepare("SELECT * FROM chat_amis WHERE statut = 'actif'").all();
  const resultats = [];
  for (const l of liens) {
    let validees = 0;
    let score = 0;
    for (const q of questions) {
      const reps = db.prepare('SELECT * FROM devoir_binome_reponses WHERE question_id = ? AND lien_id = ?').all(q.id, l.id);
      if (reps.length === 2 && reps[0].choix === reps[1].choix) {
        validees++;
        if (q.bonne === reps[0].choix) score++;
      }
    }
    if (validees === 0 && !db.prepare('SELECT COUNT(*) AS n FROM devoir_binome_reponses WHERE devoir_id = ? AND lien_id = ?').get(d.id, l.id).n) continue;
    const ea = db.prepare('SELECT prenom, nom FROM eleves WHERE id = ?').get(l.eleve_a);
    const eb = db.prepare('SELECT prenom, nom FROM eleves WHERE id = ?').get(l.eleve_b);
    resultats.push({
      binome: `${ea?.prenom || '?'} ${ea?.nom || ''} + ${eb?.prenom || '?'} ${eb?.nom || ''}`,
      type: l.type,
      validees,
      score,
    });
  }
  resultats.sort((a, b) => b.score - a.score || b.validees - a.validees);
  res.json({ devoir: d, nb_questions: questions.length, resultats });
});

router.put('/devoirs-binomes/:id', admin, refuseAR, (req, res) => {
  const d = db.prepare('SELECT * FROM devoirs_binomes WHERE id = ?').get(req.params.id);
  if (!devoirDansScope(req, d)) return res.status(403).json({ error: 'Hors de votre périmètre.' });
  const { titre, description, deadline, actif, serie, duree_min } = req.body || {};
  db.prepare(
    'UPDATE devoirs_binomes SET titre = ?, description = ?, deadline = ?, actif = ?, serie = ?, duree_min = ? WHERE id = ?'
  ).run(
    titre ? String(titre).slice(0, 120) : d.titre,
    description != null ? String(description).slice(0, 500) : d.description,
    /^\d{4}-\d{2}-\d{2}T/.test(String(deadline || '')) ? deadline : d.deadline,
    actif === false || actif === 0 ? 0 : 1,
    serie !== undefined ? (serie ? String(serie).slice(0, 80) : null) : d.serie,
    duree_min !== undefined ? (duree_min ? Math.max(1, Math.min(240, Number(duree_min))) : null) : d.duree_min,
    d.id
  );
  res.json({ ok: true });
});

router.delete('/devoirs-binomes/:id', admin, refuseAR, (req, res) => {
  const dv = db.prepare('SELECT * FROM devoirs_binomes WHERE id = ?').get(req.params.id);
  if (!devoirDansScope(req, dv)) return res.status(403).json({ error: 'Hors de votre périmètre.' });
  db.prepare('DELETE FROM devoir_binome_reponses WHERE devoir_id = ?').run(req.params.id);
  db.prepare('DELETE FROM devoir_binome_questions WHERE devoir_id = ?').run(req.params.id);
  db.prepare('DELETE FROM devoirs_binomes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
