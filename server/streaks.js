/* ------------------------------------------------------------------ */
/* FLAMMES 🔥 entre élèves (façon Snapchat) :                          */
/* un geste par jour et par personne (message, défi, devoir) maintient */
/* la flamme ; 48 h sans geste de l'un → elle s'éteint.                */
/* ------------------------------------------------------------------ */
const db = require('./db');
const sse = require('./sse');

const FENETRE_MS = 48 * 3600 * 1000;
const auj = () => new Date().toISOString().slice(0, 10);
const recent = (d) => !!d && Date.now() - new Date(d).getTime() <= FENETRE_MS;
const prenomDe = (id) => db.prepare('SELECT prenom FROM eleves WHERE id = ?').get(id)?.prenom || 'quelqu’un';

/* À appeler après chaque interaction sociale (chat, duel, devoir). */
function marquerInteraction(aId, bId) {
  if (!aId || !bId || aId === bId) return;
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
  const lien =
    db.prepare("SELECT 1 FROM chat_amis WHERE eleve_a = ? AND eleve_b = ? AND statut = 'actif'").get(a, b) ||
    db.prepare("SELECT 1 FROM chat_amis WHERE eleve_a = ? AND eleve_b = ? AND statut = 'actif'").get(b, a);
  if (!lien) return;

  let row = db.prepare('SELECT * FROM flammes WHERE eleve_a = ? AND eleve_b = ?').get(a, b);
  const now = new Date().toISOString();
  if (!row) {
    db.prepare('INSERT INTO flammes (eleve_a, eleve_b, compteur, record, dernier_a, dernier_b) VALUES (?, ?, 0, 0, NULL, NULL)').run(a, b);
    row = db.prepare('SELECT * FROM flammes WHERE eleve_a = ? AND eleve_b = ?').get(a, b);
  }

  const champ = aId === a ? 'dernier_a' : 'dernier_b';
  const autreChamp = aId === a ? 'dernier_b' : 'dernier_a';
  if ((row[champ] || '').slice(0, 10) === auj()) return; // déjà agi aujourd'hui : rien à faire

  let compteur = row.compteur;
  if (!recent(row.dernier_a) && !recent(row.dernier_b)) compteur = 0; // flamme éteinte
  const nouveau = recent(row[autreChamp]) ? compteur + 1 : 1;

  db.prepare(
    `UPDATE flammes SET compteur = ?, record = MAX(record, ?), ${champ} = ? WHERE eleve_a = ? AND eleve_b = ?`
  ).run(nouveau, nouveau, now, a, b);

  if (nouveau > compteur) {
    sse.send(aId, 'flamme', { avec: prenomDe(bId), compteur: nouveau });
    sse.send(bId, 'flamme', { avec: prenomDe(aId), compteur: nouveau });
  }
}

/* Liste des flammes d'un élève, triées par compteur. */
function listerFlammes(moi) {
  const rows = db
    .prepare(
      `SELECT f.*, e.id AS autre_id, e.prenom, e.avatar
       FROM flammes f
       JOIN eleves e ON e.id = (CASE WHEN f.eleve_a = ? THEN f.eleve_b ELSE f.eleve_a END)
       WHERE f.eleve_a = ? OR f.eleve_b = ?
       ORDER BY f.compteur DESC, f.record DESC`
    )
    .all(moi, moi, moi);
  return rows.map((r) => {
    const da = r.dernier_a ? new Date(r.dernier_a).getTime() : null;
    const db2 = r.dernier_b ? new Date(r.dernier_b).getTime() : null;
    const base = da === null || db2 === null ? Date.now() : Math.min(da, db2);
    const heures = Math.max(0, Math.round(48 - (Date.now() - base) / 3600000));
    return {
      avec: { id: r.autre_id, prenom: r.prenom, avatar: r.avatar },
      compteur: r.compteur,
      record: r.record,
      heures,
      eteinte: heures <= 0,
    };
  });
}

module.exports = { marquerInteraction, listerFlammes };
