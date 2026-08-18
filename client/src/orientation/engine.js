/* Couche MOTEUR du graphe d'orientation : navigation, recherche, chemin.
   Aucune notion visuelle ici — l'interface consomme ces fonctions. */

import { NODES, EDGES, INTERETS_LIST } from './graphData.js';

export { INTERETS_LIST };

export const nodesById = new Map(NODES.map((n) => [n.id, n]));

const childrenMap = new Map();
const parentsMap = new Map();
for (const e of EDGES) {
  if (!childrenMap.has(e.from)) childrenMap.set(e.from, []);
  childrenMap.get(e.from).push({ to: e.to, label: e.label });
  if (!parentsMap.has(e.to)) parentsMap.set(e.to, []);
  parentsMap.get(e.to).push(e.from);
}

export function childrenOf(id) {
  return (childrenMap.get(id) || []).map((c) => ({ ...nodesById.get(c.to), via: c.label })).filter((n) => n.id);
}
export function parentsOf(id) {
  return (parentsMap.get(id) || []).map((p) => nodesById.get(p)).filter(Boolean);
}

/* Parent canonique : premier parent enregistré → chemin par défaut vers le BAC. */
export function pathTo(id) {
  const path = [];
  let cur = id;
  let garde = 0;
  while (cur && garde++ < 40) {
    path.unshift(cur);
    if (cur === 'bac') break;
    const pars = parentsMap.get(cur);
    cur = pars?.[0] || null;
  }
  return path[0] === 'bac' || path[0] === id ? path : [id];
}

export const TYPE_META = {
  bac: { label: 'Bac', color: 'var(--brand)' },
  branche: { label: 'Direction', color: 'var(--brand)' },
  univ: { label: 'Université', color: '#0ea5e9' },
  fac: { label: 'Faculté / UFR', color: '#0ea5e9' },
  licence: { label: 'Licence', color: '#4f46e5' },
  annee: { label: 'Année', color: '#64748b' },
  master: { label: 'Master', color: '#7c3aed' },
  doctorat: { label: 'Doctorat', color: '#7c3aed' },
  domaine: { label: 'Domaine', color: '#0d9488' },
  ecole: { label: 'École', color: '#0d9488' },
  pro: { label: 'Formation pro', color: '#d97706' },
  concours: { label: 'Concours', color: '#db2777' },
  alternance: { label: 'Alternance', color: '#d97706' },
  etranger: { label: 'Étranger', color: '#0891b2' },
  travail: { label: 'Emploi', color: '#dc2626' },
  metier: { label: 'Métier', color: '#16a34a' },
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function searchNodes(q) {
  const nq = norm(q.trim());
  if (nq.length < 2) return [];
  const res = [];
  for (const n of NODES) {
    if (n.type === 'bac') continue;
    const hay = norm(`${n.label} ${n.sub || ''} ${TYPE_META[n.type]?.label || ''}`);
    if (hay.includes(nq)) res.push(n);
    if (res.length >= 8) break;
  }
  return res;
}

/* Questionnaire « je ne sais pas quoi faire » → domaines/branches à explorer. */
export function conseiller(profil) {
  const scores = new Map();
  for (const n of NODES) {
    if (!n.tags) continue;
    let s = 0;
    for (const m of profil.matieres) if (n.tags.matieres?.includes(m)) s += 2;
    for (const i of profil.interets) if (n.tags.interets?.includes(i)) s += 2;
    if (s > 0) scores.set(n.id, s);
  }
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => nodesById.get(id));
  // remonte vers des nœuds « explorables » (licence/école/pro)
  return top.filter(Boolean);
}
