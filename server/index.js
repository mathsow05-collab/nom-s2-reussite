require('./env');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[sécurité] JWT_SECRET non défini : un secret temporaire a été généré (les sessions seront perdues au redémarrage).');
}

const db = require('./db');
const { seed } = require('./seed');
const { UPLOADS_DIR, DIST_DIR } = require('./paths');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DIST = DIST_DIR;
const UPLOADS = UPLOADS_DIR;

app.disable('x-powered-by');
app.set('trust proxy', 1);

/* En-têtes de sécurité + CSP (les iframes YouTube nocookie restent autorisées). */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://i.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' https://www.youtube.com; " +
      "connect-src 'self'; media-src 'self' https://cdn.islamic.network; object-src 'none'; base-uri 'self'; form-action 'self'; " +
      "worker-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com"
  );
  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'S2 Réussite API', date: new Date().toISOString() }));

app.use('/api/admin', require('./routes/admin'));
app.use('/api/eleve', require('./routes/eleve'));

/* Images du catalogue métiers uploadées par les admins (contenu public). */
app.use('/media/metiers', express.static(path.join(UPLOADS, 'metiers')));

/* Frontend compilé (React/Vite) */
app.use(express.static(DIST));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/media/')) return next();
  const index = path.join(DIST, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  return res.status(503).send('Frontend non compilé. Lancez : npm run build');
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route API introuvable.' }));

/* Gestion d'erreurs centralisée */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux.' : 'Erreur lors de l’upload du fichier.';
    return res.status(400).json({ error: msg });
  }
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  if (err && err.message) return res.status(400).json({ error: err.message });
  console.error('[erreur]', err);
  return res.status(500).json({ error: 'Erreur serveur.' });
});

/* Seed au premier lancement + fichier récapitulatif des comptes démo. */
const seeded = seed(db);
if (seeded.createdIds.length || seeded.admins.length) {
  const lines = ['=== S2 Réussite – Comptes de démonstration ===', ''];
  if (seeded.admins.length) {
    lines.push('Administrateurs (espace /#/admin) :');
    for (const a of seeded.admins) lines.push(`  ${a.username} / ${a.password}`);
    lines.push('');
  }
  if (seeded.createdIds.length) {
    lines.push('Élèves de démonstration (espace élève /) :');
    for (const e of seeded.createdIds) lines.push(`  ${e.prenom} ${e.nom} (${e.classe}) -> ${e.id}`);
    lines.push('');
  }
  lines.push('IMPORTANT : changez ces mots de passe avant toute mise en production (.env).');
  fs.writeFileSync(path.join(__dirname, '..', 'demo-accounts.txt'), lines.join('\n'));
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎓 S2 Réussite démarré sur http://0.0.0.0:${PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`\n[${sig}] arrêt en cours…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
