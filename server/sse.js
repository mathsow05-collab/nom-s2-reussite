// Hub Server-Sent Events : permet de pousser en temps réel une déconnexion
// forcée vers l'appareil d'un élève (équivalent léger de Redis pub/sub ;
// à remplacer par Redis en production multi-instance).
const channels = new Map(); // eleveDbId -> Set<res>

function add(eleveDbId, res) {
  if (!channels.has(eleveDbId)) channels.set(eleveDbId, new Set());
  channels.get(eleveDbId).add(res);
}

function remove(eleveDbId, res) {
  const set = channels.get(eleveDbId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) channels.delete(eleveDbId);
}

function send(eleveDbId, event, data) {
  const set = channels.get(eleveDbId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      /* connexion déjà fermée */
    }
  }
}

module.exports = { add, remove, send };
