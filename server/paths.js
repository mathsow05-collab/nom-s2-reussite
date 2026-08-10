const path = require('path');

// Centralise les chemins de données. En production (Render, Docker, VPS…),
// on redirige vers un disque persistant via les variables d'environnement
// DATA_DIR et UPLOADS_DIR (sinon : dossier local par défaut).
const ROOT = path.join(__dirname, '..');

const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT, 'uploads');
const DIST_DIR = process.env.DIST_DIR || path.join(ROOT, 'client', 'dist');

module.exports = { ROOT, DATA_DIR, UPLOADS_DIR, DIST_DIR };
