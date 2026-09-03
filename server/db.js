const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { DATA_DIR } = require('./paths');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 's2reussite.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  classe TEXT NOT NULL DEFAULT 'Terminale S2',
  actif INTEGER NOT NULL DEFAULT 1,
  session_jti TEXT,
  session_started_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS cours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  matiere TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT,
  pdf_file TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS metiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  domaine TEXT,
  description TEXT,
  debouches TEXT,
  image TEXT,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'system',
  eleve_db_id INTEGER,
  eleve_ref TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS annales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filiere TEXT NOT NULL,
  matiere TEXT NOT NULL,
  annee INTEGER NOT NULL,
  titre TEXT NOT NULL,
  sujet_pdf TEXT,
  corrige_pdf TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filiere TEXT NOT NULL,
  matiere TEXT NOT NULL,
  lecon TEXT NOT NULL,
  question TEXT NOT NULL,
  choix TEXT NOT NULL,
  bonne INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS questions_eleves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_db_id INTEGER NOT NULL,
  eleve_ref TEXT,
  filiere TEXT,
  sujet TEXT,
  message TEXT NOT NULL,
  reponse TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  repondu_at TEXT
);

CREATE TABLE IF NOT EXISTS idees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_db_id INTEGER,
  eleve_ref TEXT,
  message TEXT NOT NULL,
  lu INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS parcours_univ (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cible TEXT NOT NULL DEFAULT 'all',
  titre TEXT NOT NULL,
  intro TEXT,
  blocs TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS culture (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categorie TEXT NOT NULL DEFAULT 'actualite',
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  date_publi TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS lexique (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mot_ar TEXT NOT NULL,
  mot_fr TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'général'
);

CREATE TABLE IF NOT EXISTS echeances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre',
  date_debut TEXT NOT NULL,
  date_fin TEXT,
  lieu TEXT,
  description TEXT,
  conseils TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_eleves_eleve_id ON eleves(eleve_id);
CREATE INDEX IF NOT EXISTS idx_eleves_session ON eleves(session_jti);
CREATE INDEX IF NOT EXISTS idx_cours_matiere ON cours(matiere);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
`);

/* Migrations légères : ajout de colonnes si elles manquent (filières S2/L2,
   noms affichés et périmètre des admins). */
function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
}
ensureColumn('eleves', 'filiere', "TEXT NOT NULL DEFAULT 'S2'");
ensureColumn('eleves', 'consentement_at', 'TEXT');
ensureColumn('eleves', 'create_par', "TEXT NOT NULL DEFAULT 'admin'");
ensureColumn('eleves', 'essai_debut', 'TEXT');
ensureColumn('eleves', 'abo_expire', 'TEXT');
ensureColumn('eleves', 'device_id', 'TEXT');
ensureColumn('eleves', 'tel', 'TEXT');
ensureColumn('eleves', 'fp_hash', 'TEXT');
ensureColumn('eleves', 'fp_mark', 'TEXT');
ensureColumn('eleves', 'code_verif', 'TEXT');
ensureColumn('eleves', 'code_expires', 'TEXT');
db.exec(`CREATE TABLE IF NOT EXISTS payements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_db_id INTEGER NOT NULL,
  montant INTEGER NOT NULL,
  methode TEXT NOT NULL,
  numero_envoyeur TEXT,
  reference TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`);
ensureColumn('cours', 'filiere', "TEXT NOT NULL DEFAULT 'S2'");
ensureColumn('admins', 'filiere', "TEXT NOT NULL DEFAULT 'all'");
ensureColumn('admins', 'display_name', 'TEXT');
ensureColumn('metiers', 'filiere', "TEXT NOT NULL DEFAULT 'all'");
ensureColumn('parcours_univ', 'image', 'TEXT');
ensureColumn('metiers', 'parcours', 'TEXT');
ensureColumn('cours', 'niveau', 'INTEGER');
ensureColumn('cours', 'duree_min', 'INTEGER');
ensureColumn('cours', 'difficulte', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('cours', 'acquis', 'TEXT');
ensureColumn('eleves', 'avatar', 'TEXT');
ensureColumn('eleves', 'xp', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('eleves', 'minutes_tot', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('eleves', 'streak_j', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('questions_eleves', 'public', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('questions_eleves', 'likes', "TEXT NOT NULL DEFAULT '[]'");

/* ------------------------- Examens maison ------------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS examens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  filiere TEXT NOT NULL,
  matiere TEXT,
  consignes TEXT,
  durees TEXT NOT NULL DEFAULT '120',
  sujet_pdf TEXT NOT NULL,
  corrige_pdf TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS examens_tentatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  examen_id INTEGER NOT NULL,
  eleve_db_id INTEGER NOT NULL,
  duree INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  paused_at TEXT,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  finished_at TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  copie_pdf TEXT,
  score TEXT,
  commentaire TEXT,
  corrected_at TEXT
);
`);
ensureColumn('examens_tentatives', 'done', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('examens_tentatives', 'copie_corrigee_pdf', 'TEXT');

/* ------------------------- Flashcards (type Anki) ------------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS flash_decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  filiere TEXT NOT NULL DEFAULT 'all',
  matiere TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS flash_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL,
  recto TEXT NOT NULL,
  verso TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0
);
`);

/* ------------------------------ Chat & binômes ----------------------------
   Espace de discussion entre élèves : invitations (par lien ou découverte),
   relations « ami » ou « binôme de travail », messages texte / audio / image. */
db.exec(`
CREATE TABLE IF NOT EXISTS flammes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_a INTEGER NOT NULL,
  eleve_b INTEGER NOT NULL,
  compteur INTEGER NOT NULL DEFAULT 0,
  record INTEGER NOT NULL DEFAULT 0,
  dernier_a TEXT,
  dernier_b TEXT,
  UNIQUE(eleve_a, eleve_b)
);
CREATE TABLE IF NOT EXISTS chat_amis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_a INTEGER NOT NULL,
  eleve_b INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'ami',
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  accepted_at TEXT
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  de_id INTEGER NOT NULL,
  vers_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'texte',
  texte TEXT,
  fichier TEXT,
  mime TEXT,
  lu INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS chat_liens (
  eleve_id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_pair ON chat_messages (de_id, vers_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_lu ON chat_messages (vers_id, lu);
`);

/* ------------------------- Duels de quiz entre binômes -------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS duels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lien_id INTEGER NOT NULL,
  createur INTEGER NOT NULL,
  adversaire INTEGER NOT NULL,
  matiere TEXT NOT NULL,
  question_ids TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  score_a INTEGER,
  score_b INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  fini_at TEXT
);
CREATE TABLE IF NOT EXISTS duel_reponses (
  duel_id INTEGER NOT NULL,
  eleve_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  reponse INTEGER NOT NULL,
  UNIQUE (duel_id, eleve_id, question_id)
);

/* ------------------- Devoirs communs proposés par l'admin ------------------
   Le binôme doit se mettre d'accord : une réponse n'est validée que si les
   deux membres choisissent la même option.                                  */
CREATE TABLE IF NOT EXISTS devoirs_binomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  description TEXT,
  filiere TEXT NOT NULL DEFAULT 'all',
  serie TEXT,
  duree_min INTEGER,
  deadline TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS devoir_binome_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devoir_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  choix TEXT NOT NULL,
  bonne INTEGER NOT NULL,
  image TEXT,
  ordre INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS devoir_binome_participations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devoir_id INTEGER NOT NULL,
  lien_id INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'propose',
  propose_par INTEGER NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (devoir_id, lien_id)
);
CREATE TABLE IF NOT EXISTS devoir_binome_expliques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devoir_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  lien_id INTEGER NOT NULL,
  eleve_id INTEGER NOT NULL,
  fichier TEXT NOT NULL,
  mime TEXT,
  note INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (question_id, lien_id, eleve_id)
);
CREATE TABLE IF NOT EXISTS devoir_binome_reponses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devoir_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  lien_id INTEGER NOT NULL,
  eleve_id INTEGER NOT NULL,
  choix INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (question_id, lien_id, eleve_id)
);
CREATE INDEX IF NOT EXISTS idx_devoir_rep_pair ON devoir_binome_reponses (devoir_id, lien_id);
`);

/* ------------------------- ESPACE ÉTUDIANT (gratuit) ----------------------
   Espace universitaire : inscription gratuite vérifiée par code WhatsApp,
   groupes de travail par filière, boutique de packs vendus par les étudiants
   (commission % pour la plateforme), culture par filière, orientation,
   planning personnel, opportunités (bourses & stages). */
db.exec(`
CREATE TABLE IF NOT EXISTS etudiants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etu_id TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  filiere TEXT NOT NULL,
  universite TEXT,
  tel TEXT NOT NULL,
  fp_hash TEXT, fp_mark TEXT, device_id TEXT,
  avatar TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  session_jti TEXT, session_started_at TEXT,
  code_verif TEXT, code_expires TEXT, verifie INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS etu_groupes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  filiere TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'etude',
  description TEXT,
  createur_id INTEGER NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS etu_membres (
  groupe_id INTEGER NOT NULL,
  etudiant_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'membre',
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(groupe_id, etudiant_id)
);
CREATE TABLE IF NOT EXISTS etu_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupe_id INTEGER NOT NULL,
  etudiant_id INTEGER NOT NULL,
  texte TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS etu_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendeur_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  filiere TEXT NOT NULL,
  matiere TEXT,
  prix INTEGER NOT NULL,
  description TEXT,
  contenu TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  ventes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS etu_achats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id INTEGER NOT NULL,
  acheteur_id INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  methode TEXT, reference TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  valide_at TEXT
);
CREATE TABLE IF NOT EXISTS etu_planning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etudiant_id INTEGER NOT NULL,
  jour INTEGER NOT NULL,
  debut TEXT NOT NULL,
  fin TEXT,
  titre TEXT NOT NULL,
  salle TEXT
);
CREATE TABLE IF NOT EXISTS etu_culture (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filiere TEXT NOT NULL,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  date_publi TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS etu_orientation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filiere TEXT NOT NULL,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS etu_opportunites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'bourse',
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  lien TEXT,
  date_limite TEXT
);
CREATE INDEX IF NOT EXISTS idx_etu_id ON etudiants(etu_id);
CREATE INDEX IF NOT EXISTS idx_etu_groupes_fil ON etu_groupes(filiere);
CREATE INDEX IF NOT EXISTS idx_etu_msg ON etu_messages(groupe_id, id);
CREATE INDEX IF NOT EXISTS idx_etu_packs_fil ON etu_packs(filiere, statut);
`);

module.exports = db;
