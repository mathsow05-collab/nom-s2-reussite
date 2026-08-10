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

CREATE INDEX IF NOT EXISTS idx_eleves_eleve_id ON eleves(eleve_id);
CREATE INDEX IF NOT EXISTS idx_eleves_session ON eleves(session_jti);
CREATE INDEX IF NOT EXISTS idx_cours_matiere ON cours(matiere);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
`);

module.exports = db;
