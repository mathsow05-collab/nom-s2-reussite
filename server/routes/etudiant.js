/* ESPACE ÉTUDIANT — espace universitaire gratuit (100 % gratuit après le code
   WhatsApp de vérification). Groupes de travail par filière, boutique de packs
   vendus entre étudiants (commission % pour la plateforme), culture dédiée par
   filière, orientation, planning personnel et opportunités (bourses/stages). */
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { signToken, verifyToken, rateLimiter, generateEleveId } = require('../security');
const { addLog } = require('../log');

const router = express.Router();

const FILIERES_ETU = {
  mi: 'Maths-Info',
  pc: 'Physique-Chimie',
  sante: 'Médecine / Santé',
  droit: 'Droit',
  eco: 'Économie-Gestion',
  lettres: 'Lettres & Anglais',
  ing: 'Ingénierie',
};

const COMMISSION_DEFAUT = 25; // % pour la plateforme

function commission() {
  const v = db.prepare("SELECT value FROM settings WHERE key = 'commission_packs'").get()?.value;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 90 ? n : COMMISSION_DEFAUT;
}

/* ------------------------------ Auth middleware ---------------------------- */
function requireEtu(req, res, next) {
  const auth = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!auth) return res.status(401).json({ error: 'Connexion requise.' });
  const payload = parseToken(auth);
  if (!payload || payload.role !== 'etudiant') return res.status(401).json({ error: 'Session invalide.' });
  const e = db.prepare('SELECT * FROM etudiants WHERE id = ?').get(payload.sub);
  if (!e || !e.actif || !e.verifie) return res.status(401).json({ error: 'Compte introuvable.' });
  if (e.session_jti && payload.jti !== e.session_jti)
    return res.status(401).json({ error: 'Session remplacée.' });
  req.etu = e;
  next();
}
function parseToken(t) {
  try {
    return verifyToken(t);
  } catch {
    return null;
  }
}

async function envoyerWhatsApp(tel, texte) {
  const token = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_token'").get()?.value;
  const phoneId = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_phone_id'").get()?.value;
  if (!token || !phoneId) return false;
  let num = tel;
  if (num.length === 9) num = '221' + num;
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: num, type: 'text', text: { body: texte } }),
    });
    const d = await r.json();
    return !!d?.messages?.length;
  } catch {
    return false;
  }
}

/* ------------------------------- Inscription ------------------------------ */
router.post(
  '/inscrire',
  rateLimiter({ max: 6, windowMs: 60 * 60 * 1000, message: 'Trop d’inscriptions. Réessaie plus tard.' }),
  async (req, res) => {
    const { prenom, nom, filiere, universite, device_id, fp_hash, fp_mark } = req.body || {};
    const telNorm = String(req.body?.tel || '').replace(/\D/g, '');
    if (!prenom || !nom) return res.status(400).json({ error: 'Prénom et nom obligatoires.' });
    if (!FILIERES_ETU[filiere]) return res.status(400).json({ error: 'Choisis ta filière.' });
    if (telNorm.length < 8) return res.status(400).json({ error: 'Un numéro WhatsApp valide est obligatoire pour recevoir ton code.' });
    const dejaVerifie = db.prepare('SELECT 1 FROM etudiants WHERE tel = ? AND verifie = 1').get(telNorm);
    if (dejaVerifie) return res.status(400).json({ error: 'Ce numéro a déjà un compte étudiant. Connecte-toi avec ton ID.' });
    const code = String(crypto.randomInt(100000, 999999));
    let id;
    do {
      id = generateEleveId('ETU');
    } while (db.prepare('SELECT 1 FROM etudiants WHERE etu_id = ?').get(id));
    const existant = db.prepare('SELECT id FROM etudiants WHERE tel = ? AND verifie = 0').get(telNorm);
    if (existant) {
      db.prepare('UPDATE etudiants SET prenom = ?, nom = ?, filiere = ?, universite = ?, code_verif = ?, code_expires = ? WHERE id = ?').run(
        String(prenom).trim(), String(nom).trim(), filiere, String(universite || '').trim() || null,
        code, new Date(Date.now() + 24 * 3600 * 1000).toISOString(), existant.id
      );
    } else {
      db.prepare(
        'INSERT INTO etudiants (etu_id, nom, prenom, filiere, universite, tel, fp_hash, fp_mark, device_id, code_verif, code_expires) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).run(
        id, String(nom).trim(), String(prenom).trim(), filiere, String(universite || '').trim() || null,
        telNorm, String(fp_hash || ''), String(fp_mark || ''), String(device_id || ''),
        code, new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      );
    }
    addLog('inscription_etudiant', { eleveRef: id, req });
    const texte = `SCHOOBY Étudiant — Ton code de vérification : ${code} — Ton identifiant : ${id}. Espace 100 % gratuit. Garde ton ID précieusement.`;
    const envoye = await envoyerWhatsApp(telNorm, texte);
    res.json({ ok: true, etu_id: id, envoi_auto: envoye });
  }
);

router.post(
  '/verifier',
  rateLimiter({ max: 8, windowMs: 15 * 60 * 1000, message: 'Trop de tentatives. Attends un peu.' }),
  (req, res) => {
    const code = String(req.body?.code || '').trim();
    const telNorm = String(req.body?.tel || '').replace(/\D/g, '');
    const e = db.prepare('SELECT * FROM etudiants WHERE tel = ? AND verifie = 0 ORDER BY id DESC').get(telNorm);
    if (!e || !e.code_verif) return res.status(400).json({ error: 'Aucun compte à vérifier pour ce numéro.' });
    if (e.code_expires && new Date(e.code_expires) < new Date())
      return res.status(400).json({ error: 'Code expiré. Refais une inscription pour recevoir un nouveau code.' });
    if (code !== e.code_verif) return res.status(400).json({ error: 'Code incorrect. Vérifie le message WhatsApp.' });
    const now = new Date();
    const jti = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE etudiants SET code_verif = NULL, verifie = 1, session_jti = ?, session_started_at = ? WHERE id = ?').run(
      jti, now.toISOString(), e.id
    );
    addLog('inscription_etudiant_verifiee', { eleveRef: e.etu_id, req });
    const token = signToken({ sub: e.id, role: 'etudiant', jti }, 30 * 24 * 3600); // gratuit : session longue
    res.json({ token, etu_id: e.etu_id });
  }
);

router.post('/login', rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), (req, res) => {
  const etuId = String(req.body?.etu_id || '').trim().toUpperCase();
  const e = db.prepare('SELECT * FROM etudiants WHERE etu_id = ? AND verifie = 1').get(etuId);
  if (!e || !e.actif) return res.status(401).json({ error: 'ID introuvable ou non activé.' });
  const jti = crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE etudiants SET session_jti = ?, session_started_at = ? WHERE id = ?').run(jti, new Date().toISOString(), e.id);
  res.json({ token: signToken({ sub: e.id, role: 'etudiant', jti }, 30 * 24 * 3600), etu_id: e.etu_id });
});

router.post('/logout', requireEtu, (req, res) => {
  db.prepare('UPDATE etudiants SET session_jti = NULL WHERE id = ?').run(req.etu.id);
  res.json({ ok: true });
});

router.get('/me', requireEtu, (req, res) => {
  const e = req.etu;
  res.json({
    etu_id: e.etu_id, nom: e.nom, prenom: e.prenom, filiere: e.filiere,
    filiere_label: FILIERES_ETU[e.filiere], universite: e.universite, avatar: e.avatar,
    commission: commission(),
  });
});

router.post('/profil', requireEtu, (req, res) => {
  const avatar = String(req.body?.avatar || '').slice(0, 20);
  if (avatar) db.prepare('UPDATE etudiants SET avatar = ? WHERE id = ?').run(avatar, req.etu.id);
  res.json({ ok: true });
});

/* --------------------------------- Groupes -------------------------------- */
router.get('/groupes', requireEtu, (req, res) => {
  const fil = String(req.query.filiere || '');
  const type = String(req.query.type || '');
  let q = `SELECT g.*, (SELECT COUNT(*) FROM etu_membres m WHERE m.groupe_id = g.id) AS membres,
           (SELECT 1 FROM etu_membres m WHERE m.groupe_id = g.id AND m.etudiant_id = ?) AS dedans,
           (SELECT prenom FROM etudiants WHERE id = g.createur_id) AS createur
           FROM etu_groupes g WHERE g.actif = 1`;
  const args = [req.etu.id];
  if (FILIERES_ETU[fil]) { q += ' AND g.filiere = ?'; args.push(fil); }
  if (type === 'projet' || type === 'etude') { q += ' AND g.type = ?'; args.push(type); }
  q += ' ORDER BY g.id DESC LIMIT 60';
  res.json(db.prepare(q).all(...args));
});

router.post('/groupes', requireEtu, (req, res) => {
  const { titre, filiere, type, description } = req.body || {};
  if (!titre || String(titre).trim().length < 3) return res.status(400).json({ error: 'Donne un nom au groupe.' });
  if (!FILIERES_ETU[filiere]) return res.status(400).json({ error: 'Choisis la filière du groupe.' });
  const t = type === 'projet' ? 'projet' : 'etude';
  const n = db.prepare('SELECT COUNT(*) c FROM etu_groupes WHERE createur_id = ?').get(req.etu.id).c;
  if (n >= 5) return res.status(400).json({ error: 'Tu as déjà créé 5 groupes.' });
  const r = db.prepare('INSERT INTO etu_groupes (titre, filiere, type, description, createur_id) VALUES (?,?,?,?,?)').run(
    String(titre).trim().slice(0, 80), filiere, t, String(description || '').trim().slice(0, 300), req.etu.id
  );
  db.prepare("INSERT INTO etu_membres (groupe_id, etudiant_id, role) VALUES (?, ?, 'createur')").run(r.lastInsertRowid, req.etu.id);
  res.json({ ok: true, id: r.lastInsertRowid });
});

router.post('/groupes/:id/rejoindre', requireEtu, (req, res) => {
  const g = db.prepare('SELECT * FROM etu_groupes WHERE id = ? AND actif = 1').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupe introuvable.' });
  const membres = db.prepare('SELECT COUNT(*) c FROM etu_membres WHERE groupe_id = ?').get(g.id).c;
  if (membres >= 30) return res.status(400).json({ error: 'Groupe complet (30 max).' });
  db.prepare('INSERT OR IGNORE INTO etu_membres (groupe_id, etudiant_id) VALUES (?, ?)').run(g.id, req.etu.id);
  res.json({ ok: true });
});

router.post('/groupes/:id/quitter', requireEtu, (req, res) => {
  db.prepare('DELETE FROM etu_membres WHERE groupe_id = ? AND etudiant_id = ?').run(req.params.id, req.etu.id);
  res.json({ ok: true });
});

router.get('/groupes/:id/messages', requireEtu, (req, res) => {
  const membre = db.prepare('SELECT 1 FROM etu_membres WHERE groupe_id = ? AND etudiant_id = ?').get(req.params.id, req.etu.id);
  if (!membre) return res.status(403).json({ error: 'Rejoins le groupe pour discuter.' });
  res.json(
    db.prepare(
      `SELECT m.id, m.texte, m.created_at, m.etudiant_id, e.prenom, e.filiere
       FROM etu_messages m JOIN etudiants e ON e.id = m.etudiant_id
       WHERE m.groupe_id = ? ORDER BY m.id DESC LIMIT 100`
    ).all(req.params.id).reverse()
  );
});

router.post(
  '/groupes/:id/messages',
  requireEtu,
  rateLimiter({ max: 20, windowMs: 60 * 1000, message: 'Doucement sur les messages.' }),
  (req, res) => {
    const membre = db.prepare('SELECT 1 FROM etu_membres WHERE groupe_id = ? AND etudiant_id = ?').get(req.params.id, req.etu.id);
    if (!membre) return res.status(403).json({ error: 'Rejoins le groupe pour discuter.' });
    const texte = String(req.body?.texte || '').trim().slice(0, 600);
    if (!texte) return res.status(400).json({ error: 'Message vide.' });
    db.prepare('INSERT INTO etu_messages (groupe_id, etudiant_id, texte) VALUES (?,?,?)').run(req.params.id, req.etu.id, texte);
    res.json({ ok: true });
  }
);

/* ------------------------ Culture dédiée par filière ---------------------- */
router.get('/culture', requireEtu, (req, res) => {
  const fil = String(req.query.filiere || '');
  let q = 'SELECT * FROM etu_culture';
  const args = [];
  if (FILIERES_ETU[fil]) { q += ' WHERE filiere = ?'; args.push(fil); }
  q += ' ORDER BY date_publi DESC LIMIT 50';
  res.json(db.prepare(q).all(...args));
});

/* -------------------------------- Orientation ------------------------------ */
router.get('/orientation', requireEtu, (req, res) => {
  res.json(db.prepare('SELECT * FROM etu_orientation ORDER BY filiere').all());
});

/* ------------------------------- Opportunités ------------------------------ */
router.get('/opportunites', requireEtu, (req, res) => {
  res.json(db.prepare('SELECT * FROM etu_opportunites ORDER BY date_limite IS NULL, date_limite LIMIT 30').all());
});

/* ---------------------------- Planning personnel --------------------------- */
router.get('/planning', requireEtu, (req, res) => {
  res.json(db.prepare('SELECT * FROM etu_planning WHERE etudiant_id = ? ORDER BY jour, debut').all(req.etu.id));
});

router.post('/planning', requireEtu, (req, res) => {
  const { jour, debut, fin, titre, salle } = req.body || {};
  const j = Number(jour);
  if (!(j >= 0 && j <= 6) || !debut || !titre) return res.status(400).json({ error: 'Jour, heure et matière obligatoires.' });
  const n = db.prepare('SELECT COUNT(*) c FROM etu_planning WHERE etudiant_id = ?').get(req.etu.id).c;
  if (n >= 40) return res.status(400).json({ error: 'Planning complet (40 créneaux max).' });
  db.prepare('INSERT INTO etu_planning (etudiant_id, jour, debut, fin, titre, salle) VALUES (?,?,?,?,?,?)').run(
    req.etu.id, j, String(debut).slice(0, 5), String(fin || '').slice(0, 5), String(titre).trim().slice(0, 60), String(salle || '').slice(0, 30)
  );
  res.json({ ok: true });
});

router.delete('/planning/:id', requireEtu, (req, res) => {
  db.prepare('DELETE FROM etu_planning WHERE id = ? AND etudiant_id = ?').run(req.params.id, req.etu.id);
  res.json({ ok: true });
});

/* --------------------------- Boutique de packs ---------------------------- */
router.get('/packs', requireEtu, (req, res) => {
  const fil = String(req.query.filiere || '');
  let q = `SELECT p.id, p.titre, p.filiere, p.matiere, p.prix, p.description, p.ventes,
           e.prenom AS vendeur_prenom, e.nom AS vendeur_nom,
           (SELECT 1 FROM etu_achats a WHERE a.pack_id = p.id AND a.acheteur_id = ? AND a.statut = 'valide') AS possede
           FROM etu_packs p JOIN etudiants e ON e.id = p.vendeur_id WHERE p.statut = 'en_ligne'`;
  const args = [req.etu.id];
  if (FILIERES_ETU[fil]) { q += ' AND p.filiere = ?'; args.push(fil); }
  q += ' ORDER BY p.id DESC LIMIT 60';
  res.json(db.prepare(q).all(...args));
});

router.post('/packs', requireEtu, (req, res) => {
  const { titre, filiere, matiere, prix, description, contenu } = req.body || {};
  if (!titre || String(titre).trim().length < 3) return res.status(400).json({ error: 'Donne un titre au pack.' });
  if (!FILIERES_ETU[filiere]) return res.status(400).json({ error: 'Choisis la filière du pack.' });
  const prixN = Math.round(Number(prix));
  if (!(prixN >= 500 && prixN <= 25000)) return res.status(400).json({ error: 'Prix entre 500 et 25 000 F CFA.' });
  if (!contenu || String(contenu).trim().length < 30)
    return res.status(400).json({ error: 'Décris le contenu du pack (au moins 30 caractères) : chapitres, exercices, annales…' });
  const n = db.prepare('SELECT COUNT(*) c FROM etu_packs WHERE vendeur_id = ?').get(req.etu.id).c;
  if (n >= 10) return res.status(400).json({ error: '10 packs maximum par étudiant.' });
  db.prepare('INSERT INTO etu_packs (vendeur_id, titre, filiere, matiere, prix, description, contenu) VALUES (?,?,?,?,?,?,?)').run(
    req.etu.id, String(titre).trim().slice(0, 90), filiere, String(matiere || '').trim().slice(0, 40),
    prixN, String(description || '').trim().slice(0, 300), String(contenu).trim().slice(0, 2000)
  );
  addLog('pack_cree', { eleveRef: req.etu.etu_id, req, details: titre });
  res.json({ ok: true });
});

router.get('/mes-packs', requireEtu, (req, res) => {
  const t = commission() / 100;
  res.json(
    db.prepare('SELECT * FROM etu_packs WHERE vendeur_id = ? ORDER BY id DESC').all(req.etu.id).map((p) => ({
      ...p,
      ventes_ok: db.prepare("SELECT COUNT(*) c FROM etu_achats WHERE pack_id = ? AND statut = 'valide'").get(p.id).c,
      gain: Math.round(p.prix * (1 - t)),
    }))
  );
});

router.post('/packs/:id/acheter', requireEtu, (req, res) => {
  const p = db.prepare("SELECT * FROM etu_packs WHERE id = ? AND statut = 'en_ligne'").get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Pack introuvable.' });
  if (p.vendeur_id === req.etu.id) return res.status(400).json({ error: 'Impossible d’acheter ton propre pack.' });
  const deja = db.prepare("SELECT 1 FROM etu_achats WHERE pack_id = ? AND acheteur_id = ? AND statut IN ('en_attente','valide')").get(p.id, req.etu.id);
  if (deja) return res.status(400).json({ error: 'Achat déjà en cours ou validé.' });
  const { methode, reference } = req.body || {};
  db.prepare('INSERT INTO etu_achats (pack_id, acheteur_id, methode, reference) VALUES (?,?,?,?)').run(
    p.id, req.etu.id, methode === 'om' ? 'Orange Money' : 'Wave', String(reference || '').trim().slice(0, 60)
  );
  addLog('pack_achat_declare', { eleveDbId: p.id, eleveRef: req.etu.etu_id, req, details: p.titre });
  res.json({ ok: true, montant: p.prix });
});

router.get('/mes-achats', requireEtu, (req, res) => {
  res.json(
    db.prepare(
      `SELECT a.id, a.statut, a.created_at, p.id pack_id, p.titre, p.filiere, p.prix, p.contenu,
              e.prenom vendeur_prenom
       FROM etu_achats a JOIN etu_packs p ON p.id = a.pack_id JOIN etudiants e ON e.id = p.vendeur_id
       WHERE a.acheteur_id = ? ORDER BY a.id DESC`
    ).all(req.etu.id)
  );
});

/* --------------------------- Seed contenu curaté --------------------------- */
(function seedEtudiant() {
  if (db.prepare('SELECT COUNT(*) c FROM etu_orientation').get().c > 0) return;
  const ORI = [
    ['mi', 'Maths-Info', 'Analyse, algèbre, probabilités, algorithmique et programmation (Python, C, Java). Débouchés : data scientist, développeur, actuaire, enseignant-chercheur, ingénieur logiciel. Au Sénégal : UCAD (FST, FASE), UGB, UAM, ESP, INPTIC. Salaires débutants : 150 000 à 400 000 F selon le secteur (tech = le plus haut). Conseil : soigne l’algèbre 1 et l’analyse 1 dès le S1, ce sont les UE qui font échouer le plus.'],
    ['pc', 'Physique-Chimie', 'Mécanique, thermodynamique, électricité, chimie organique et minérale. Débouchés : enseignant, ingénieur procédés, qualité en industrie, recherche, énergies renouvelables. Au Sénégal : UCAD FST, UGB, UCZ, UASZ. Conseil : les TP comptent souvent 30 % de la note — ne les néglige jamais.'],
    ['sante', 'Médecine / Santé', 'PASS/année santé, anatomie, physiologie, pharmacologie, puis externat/internat. Débouchés : médecin, pharmacien, dentiste, sage-femme, infirmier d’État. Écoles : UCAD (FMPOS, FMPLO), UGB santé, USS, écoles privées agréées (attention aux frais : 1 à 3 M/an). Conseil : la sélection est rude la 1re année — groupes de travail et annales obligatoires.'],
    ['droit', 'Droit', 'Droit civil, pénal, public, international, OHADA. Débouchés : avocat (CAPA), magistrat (ENAM), juriste d’entreprise, notaire, huissier, fonctionnaire international. Au Sénégal : UCAD (FASEG), UGB, UASZ. Conseil : la méthode de dissertation et le cas pratique s’apprennent dès la L1 — rejoins un groupe de TD.'],
    ['eco', 'Économie-Gestion', 'Micro/macroéconomie, comptabilité, finance, marketing, statistiques. Débouchés : comptable (DECOFI), banquier, analyste financier, chargé de marketing, entrepreneur. Écoles : UCAD FASEG, BEM Dakar, ISM, UGB, ESG. Conseil : Excel et l’anglais font la différence à l’embauche — utilise l’espace Anglais ici.'],
    ['lettres', 'Lettres & Anglais', 'Littérature, linguistique, civilisation, traduction. Débouchés : enseignant, traducteur/interprète, journalisme, communication, ONG internationales (l’anglais paie !). Au Sénégal : UCAD (FASTEF, UFR lettres), UGB. Conseil : passe le TOEFL/IELTS en L3, c’est un passeport pour les masters à l’étranger et les bourses.'],
    ['ing', 'Ingénierie', 'Génie civil, électromécanique, énergie, télécoms, hydraulique. Débouchés : ingénieur BTP, énergie (Senelec, centrales), télécoms (Sonatel, Free, Orange), mines. Écoles : EPT (École Polytechnique de Thiès), ESP, UCAD FST, INPTIC. Conseil : maths + physique solides exigés ; vise les concours d’entrée et les stages dès la L3.'],
  ];
  const ins = db.prepare('INSERT INTO etu_orientation (filiere, titre, contenu) VALUES (?,?,?)');
  ORI.forEach(([f, t, c]) => ins.run(f, t, c));

  const auj = new Date().toISOString().slice(0, 10);
  const CUL = [
    ['mi', 'Ada Lovelace, première programmeuse', 'En 1843, Ada Lovelace écrit le premier algorithme destiné à être exécuté par une machine, un siècle avant les premiers ordinateurs. Le langage « Ada » porte son nom.'],
    ['mi', 'Le nombre d’or en architecture', '1,618… : la suite de Fibonacci et le nombre d’or structurent le Parthénon comme les pyramides. Les maths sont partout, même dans l’art.'],
    ['pc', 'Marie Curie, double Nobel', 'Seule femme à avoir reçu deux prix Nobel (physique 1903, chimie 1911). Ses carnets sont encore radioactifs aujourd’hui !'],
    ['pc', 'Pourquoi le ciel est bleu ?', 'La diffusion de Rayleigh : les courtes longueurs d’onde (bleu) sont plus diffusées par l’atmosphère. Au coucher du soleil, la lumière traverse plus d’air → le rouge domine.'],
    ['sante', 'Ibn Sina (Avicenne)', 'Son « Canon de la médecine » a été la référence des facultés européennes pendant 600 ans. L’histoire de la médecine est aussi une histoire du monde arabe.'],
    ['sante', 'La vaccination, une invention africaine ?', 'Bien avant Jenner, des pratiques de variolisation existaient en Afrique de l’Ouest et ont inspiré les premières immunisations en Europe au XVIIIe siècle.'],
    ['droit', 'Le Code noir et les luttes juridiques', 'Comprendre les textes juridiques historiques éclaire les combats modernes pour les droits humains — le droit n’est pas neutre, il se conquiert.'],
    ['droit', 'L’OHADA, un droit pour 17 pays', 'L’Organisation pour l’Harmonisation en Afrique du Droit des Affaires unifie le droit des affaires de 17 pays africains dont le Sénégal. Spécialité très recherchée.'],
    ['eco', 'Le franc CFA, comment ça marche ?', 'Le FCFA est garanti par le Trésor français et lié à l’euro par une parité fixe. Débat économique majeur en Afrique de l’Ouest — parfait sujet d’exposé.'],
    ['eco', 'Cheikh Hamidou Kane et l’économie du savoir', '« L’Aventure ambiguë » pose la question du prix du développement : l’économie n’est pas que des chiffres, c’est aussi un choix de société.'],
    ['lettres', 'Sembène Ousmane, père du cinéma africain', 'Écrivain et cinéaste sénégalais, il a porté la voix africaine dans le monde entier. À lire : « Les Bouts de bois de Dieu ».'],
    ['lettres', 'Shakespeare a inventé 1 700 mots', '« lonely », « eyeball », « fashionable »… Shakespeare a créé des centaines de mots anglais encore utilisés aujourd’hui.'],
    ['ing', 'Les pyramides, prouesse d’ingénierie', '2,3 millions de blocs, 20 ans de chantier : la grande pyramide de Khéops reste une leçon de logistique et de génie civil.'],
    ['ing', 'L’énergie solaire au Sahel', 'Le Sénégal vise 30 % d’énergies renouvelables. Les ingénieurs énergie seront parmi les profils les plus recherchés de la décennie.'],
  ];
  const insC = db.prepare('INSERT INTO etu_culture (filiere, titre, contenu, date_publi) VALUES (?,?,?,?)');
  CUL.forEach(([f, t, c], i) => insC.run(f, t, c, new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)));

  const OPP = [
    ['bourse', 'Bourse nationale du Sénégal', 'Bourse d’études attribuée par l’État aux bacheliers inscrits dans le public. Inscription via campusen.sn après le bac. Montant : ~40 000 F/mois selon le cycle.', 'https://campusen.sn', '2026-10-31'],
    ['bourse', 'MasterCard Foundation Scholars Program', 'Bourse complète (scolarité, logement, matériel) pour étudiants africains méritants dans plusieurs universités partenaires.', 'https://mastercardfdn.org', null],
    ['bourse', 'Bourse d’excellence Eiffel (France)', 'Pour masters et doctorats en France : allocation mensuelle ~1 181 € + voyage. Dossier via l’université.', 'https://www.campusfrance.org/fr/eiffel', '2027-01-08'],
    ['stage', 'Stages Sonatel / Orange Digital Center', 'Stages tech (dev, data, réseaux) + formations gratuites à Orange Digital Center Dakar. Candidature spontanée bienvenue.', 'https://orangedigitalcenter.sn', null],
    ['stage', 'Programme Xëyu Ndaw ñi', 'Programme d’insertion et de stages rémunérés pour les jeunes diplômés au Sénégal.', null, null],
    ['concours', 'Concours ENAM (magistrature, administration)', 'École Nationale d’Administration et de Magistrature : concours après la licence. Prépare-toi 6 mois à l’avance.', 'https://enam.sn', null],
  ];
  const insO = db.prepare('INSERT INTO etu_opportunites (type, titre, contenu, lien, date_limite) VALUES (?,?,?,?,?)');
  OPP.forEach(([t, ti, c, l, d]) => insO.run(t, ti, c, l, d));
})();

module.exports = router;
