const db = require('./db');

// Journal d'audit centralisé (table `logs`).
function addLog(action, opts = {}) {
  const { source = 'system', eleveDbId = null, eleveRef = null, details = null, req = null } = opts;
  try {
    db.prepare(
      'INSERT INTO logs (source, eleve_db_id, eleve_ref, action, details, ip) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(source, eleveDbId, eleveRef, action, details, req ? req.ip : null);
  } catch (e) {
    console.error('[log] impossible d’écrire le log :', e.message);
  }
}

module.exports = { addLog };
