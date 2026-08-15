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
ensureColumn('cours', 'filiere', "TEXT NOT NULL DEFAULT 'S2'");
ensureColumn('admins', 'filiere', "TEXT NOT NULL DEFAULT 'all'");
ensureColumn('admins', 'display_name', 'TEXT');
ensureColumn('metiers', 'filiere', "TEXT NOT NULL DEFAULT 'all'");
ensureColumn('metiers', 'parcours', 'TEXT');
ensureColumn('cours', 'niveau', 'INTEGER');
ensureColumn('eleves', 'avatar', 'TEXT');

module.exports = db;
