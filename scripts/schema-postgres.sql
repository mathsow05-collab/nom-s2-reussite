-- Schéma PostgreSQL équivalent au schéma SQLite de server/db.js.
-- À utiliser si vous migrez vers Neon / Supabase / Aiven / RDS.
-- La migration du code consiste à remplacer better-sqlite3 par `pg`
-- (les requêtes utilisent déjà des paramètres positionnels compatibles).

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE eleves (
  id SERIAL PRIMARY KEY,
  eleve_id TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  classe TEXT NOT NULL DEFAULT 'Terminale S2',
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  session_jti TEXT,
  session_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE cours (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  matiere TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT,
  pdf_file TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE metiers (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  domaine TEXT,
  description TEXT,
  debouches TEXT,
  image TEXT,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'system',
  eleve_db_id INTEGER,
  eleve_ref TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eleves_eleve_id ON eleves(eleve_id);
CREATE INDEX idx_eleves_session ON eleves(session_jti);
CREATE INDEX idx_cours_matiere ON cours(matiere);
CREATE INDEX idx_logs_created ON logs(created_at);
