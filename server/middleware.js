const { verifyToken } = require('./security');

function extractToken(req, { allowQuery = false } = {}) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  // Le token en query string n'est accepté que pour les ressources
  // intégrées dans des iframes (PDF, flux SSE) qui ne supportent pas
  // les en-têtes Authorization.
  if (allowQuery && typeof req.query.token === 'string') return req.query.token;
  return null;
}

function requireAdmin(db, { allowQuery = false } = {}) {
  return function (req, res, next) {
    const payload = verifyToken(extractToken(req, { allowQuery }));
    if (!payload || payload.role !== 'admin') {
      return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Authentification admin requise.' });
    }
    const admin = db.prepare('SELECT id, username, display_name, filiere FROM admins WHERE id = ?').get(payload.sub);
    if (!admin) return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Compte admin introuvable.' });
    req.admin = admin;
    // Périmètre de gestion : 'all' (toutes filières) ou une filière précise (S2, L2, AR).
    req.scope = ['S2', 'L2'].includes(admin.filiere) ? admin.filiere : 'all';
    return next();
  };
}

// Session unique stricte : le JWT présenté doit correspondre à la session
// actuellement stockée en base. Si l'élève s'est reconnecté ailleurs (ou a
// été révoqué), l'ancien token est immédiatement rejeté.
function requireEleve(db, { allowQuery = false } = {}) {
  return function (req, res, next) {
    const payload = verifyToken(extractToken(req, { allowQuery }));
    if (!payload || payload.role !== 'eleve') {
      return res.status(401).json({ code: 'SESSION_PERDUE', error: 'Session invalide.' });
    }
    const eleve = db.prepare('SELECT * FROM eleves WHERE id = ?').get(payload.sub);
    if (!eleve || !eleve.actif || eleve.session_jti !== payload.jti) {
      return res.status(401).json({ code: 'SESSION_PERDUE', error: 'Votre session a été fermée.' });
    }
    req.eleve = eleve;
    req.jti = payload.jti;
    return next();
  };
}

module.exports = { requireAdmin, requireEleve };
