/* Couche DONNÉES du graphe d'orientation : nodes + edges.
   Construits programmatiquement à partir du contenu (data.js) pour pouvoir
   ajouter des centaines de formations sans toucher au frontend.
   Types de nœuds : bac, branche, univ, fac, licence, annee, master, doctorat,
   domaine, ecole, pro, concours, alternance, etranger, travail, metier. */

import {
  UNIVERSITES, FACULTES, LICENCES, DOMAINES_ECOLES, ECOLES, PRO, CONCOURS, ETRANGER, TRAVAIL, INTERETS,
} from './data.js';

export const NODES = [];
export const EDGES = [];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Secteurs professionnels : deuxième filtre (indépendant du type de parcours). */
export const SECTEURS = [
  { id: 'num', label: 'Informatique & Numérique', icon: 'zap' },
  { id: 'data', label: 'Maths, Stats & Data', icon: 'target' },
  { id: 'sante', label: 'Santé & Social', icon: 'heart' },
  { id: 'ing', label: 'Ingénierie, Énergie & BTP', icon: 'building' },
  { id: 'sci', label: 'Sciences & Laboratoire', icon: 'bulb' },
  { id: 'commerce', label: 'Commerce, Finance & Gestion', icon: 'briefcase' },
  { id: 'droit', label: 'Droit, Admin & Politique', icon: 'shield' },
  { id: 'lettres', label: 'Lettres, Langues & Com', icon: 'chat' },
  { id: 'edu', label: 'Enseignement & Recherche', icon: 'cap' },
  { id: 'env', label: 'Environnement, Agro & Nature', icon: 'globe' },
  { id: 'tourisme', label: 'Tourisme, Transport & Hôtels', icon: 'compass' },
  { id: 'medias', label: 'Médias, Création & Culture', icon: 'image' },
];

const LIC_SECT = {
  maths: ['data'], info: ['num'], physique: ['ing', 'sci'], chimie: ['sci', 'env'], svt: ['sci', 'env', 'sante'],
  eco: ['commerce', 'data'], gestion: ['commerce'], compta: ['commerce'], droit: ['droit'], scpo: ['droit', 'lettres'],
  lettres: ['lettres', 'medias', 'edu'], anglais: ['lettres', 'tourisme'], geo: ['env', 'lettres'], socio: ['sante', 'lettres'],
  psy: ['sante'], medecine: ['sante'], ens: ['edu'],
};
const DOM_SECT = {
  info: ['num'], sante: ['sante'], commerce: ['commerce'], com: ['medias', 'lettres'], genie: ['ing'], compta: ['commerce'],
  droit: ['droit'], btp: ['ing'], transport: ['tourisme', 'commerce'], tourisme: ['tourisme'],
};
const PRO_SECT = { bts: ['commerce', 'num'], dut: ['ing', 'num'], licpro: ['num', 'commerce'], certif: ['num', 'medias'] };
const CONC_SECT = { ingenieur: ['ing', 'num'], sante: ['sante'], admin: ['droit'], enseignement: ['edu'], journalisme: ['medias'], vet: ['env', 'sante'] };
const ALT_SECT = { 'alt-1': ['ing', 'num', 'commerce'], 'alt-2': ['num', 'commerce'], 'alt-3': ['commerce', 'num', 'medias'] };

function addNode(n) {
  if (!NODES.some((x) => x.id === n.id)) NODES.push(n);
  return n;
}
function edge(a, b, label) {
  if (a && b && !EDGES.some((e) => e.from === a && e.to === b)) EDGES.push({ from: a, to: b, label });
}

/* --------------------------------- racines --------------------------------- */
addNode({ id: 'bac', type: 'bac', label: 'BAC', sub: 'Ton point de départ', icon: 'cap' });

const BRANCHES = [
  { id: 'b-universite', label: 'Université', sub: 'Licence → Master → Doctorat', icon: 'cap' },
  { id: 'b-ecoles', label: 'Écoles supérieures', sub: 'Ingénieurs, commerce, santé…', icon: 'building' },
  { id: 'b-pro', label: 'Formations professionnelles', sub: 'BTS, DUT, licences pro', icon: 'briefcase' },
  { id: 'b-concours', label: 'Concours', sub: 'Grandes écoles, fonctions publiques', icon: 'award' },
  { id: 'b-alternance', label: 'Alternance', sub: 'Étudier en travaillant', icon: 'refresh' },
  { id: 'b-etranger', label: 'Études à l’étranger', sub: 'Partir avec un plan', icon: 'globe' },
  { id: 'b-travail', label: 'Insertion professionnelle', sub: 'Gagner sa vie, garder des portes', icon: 'zap' },
];
for (const b of BRANCHES) {
  addNode({ ...b, type: 'branche' });
  edge('bac', b.id);
}

/* ------------------------------- université ------------------------------- */
for (const u of UNIVERSITES) {
  addNode({
    id: `u-${u.id}`, type: 'univ', label: u.nom, sub: `${u.ville} · ${u.frais}`, icon: 'building',
    details: { 'Ville': u.ville, 'Frais': u.frais, 'Admission': u.admission },
  });
  edge('b-universite', `u-${u.id}`);
  for (const fid of u.facultes) {
    const F = FACULTES[fid];
    addNode({ id: `f-${fid}`, type: 'fac', label: F.nom, sub: `${F.licences.length} licences`, icon: 'cap', details: { 'Fait partie de': UNIVERSITES.filter((x) => x.facultes.includes(fid)).map((x) => x.nom).join(' · ') } });
    edge(`u-${u.id}`, `f-${fid}`);
    for (const lid of F.licences) {
      const L = LICENCES[lid];
      const licId = `lic-${lid}`;
      addNode({
        id: licId, type: 'licence', label: L.nom, sub: `${L.duree} · ${'●'.repeat(L.difficulte)}${'○'.repeat(3 - L.difficulte)}`, icon: 'book',
        details: {
          'Durée': L.duree, 'Admission': L.admission, 'Frais': L.frais,
          'Difficulté': '●'.repeat(L.difficulte) + '○'.repeat(3 - L.difficulte),
          'Matières': L.matieres.join(', '), 'Compétences': L.competences.join(', '),
          'Établissements': L.univs.map((x) => UNIVERSITES.find((y) => y.id === x)?.nom).join(' · '),
          'Après': L.apres.masters.join(' · '), 'Débouchés': L.apres.debouche,
        },
        presentation: L.presentation,
        passerelles: L.passerelles,
        tags: L.tags,
        secteurs: LIC_SECT[lid] || ['sci'],
        metiers: L.apres.metiers,
        masters: L.apres.masters,
        concoursList: L.apres.concours,
        secteursPro: L.apres.secteurs,
        compare: {
          prix: L.frais, duree: L.duree, admission: L.admission, diplome: 'Licence (Bac+3)',
          matieres: L.matieres.join(', '), masters: L.apres.masters.join(' · '),
          debouches: L.apres.debouche, metiers: L.apres.metiers.join(', '),
        },
      });
      edge(`f-${fid}`, licId);
      // années L1 → L2 → L3
      const ANS = [
        ['1', 'L1 — socle & méthode', 'Adaptation au supérieur : cours magistraux, TD, premières UE de spécialité.'],
        ['2', 'L2 — approfondissement', 'Cœur de la discipline + premiers projets ; c’est l’année qui compte pour les masters.'],
        ['3', 'L3 — spécialisation', 'UE de spécialité, stage ou projet ; validation du diplôme de licence.'],
      ];
      let prev = licId;
      for (const [n, lab, desc] of ANS) {
        const aid = `lic-${lid}-l${n}`;
        addNode({ id: aid, type: 'annee', label: lab, sub: desc.slice(0, 60) + '…', icon: 'clock', details: { 'Programme': desc } });
        edge(prev, aid);
        prev = aid;
      }
      // masters dédupliqués
      for (const m of L.apres.masters) {
        const mid = `m-${slug(m)}`;
        addNode({ id: mid, type: 'master', label: m, sub: 'Bac+5 · 2 ans après la licence', icon: 'award', details: { 'Durée': '2 ans', 'Admission': 'Licence (dossier/mention)', 'Niveau': 'Bac+5' } });
        edge(prev, mid);
        edge(mid, 'doctorat');
        for (const met of L.apres.metiers) {
          const kid = `met-${slug(met)}`;
          addNode({ id: kid, type: 'metier', label: met, sub: 'Métier', icon: 'star' });
          edge(mid, kid);
        }
      }
      // métiers directs + secteurs
      for (const met of L.apres.metiers) {
        const kid = `met-${slug(met)}`;
        addNode({ id: kid, type: 'metier', label: met, sub: 'Métier', icon: 'star' });
      }
      // établissements : connexions multiples
      for (const uu of L.univs) edge(licId, `u-${uu}`, 'proposée par');
    }
  }
}
addNode({ id: 'doctorat', type: 'doctorat', label: 'Doctorat', sub: 'Bac+8 · recherche & enseignement', icon: 'bulb', details: { 'Durée': '3 ans après le master', 'Débouche sur': 'Enseignant-chercheur, expert de haut niveau' } });

/* --------------------------------- écoles --------------------------------- */
for (const d of DOMAINES_ECOLES) {
  addNode({ id: `d-${d.id}`, type: 'domaine', label: d.nom, sub: `${ECOLES.filter((e) => e.domaine === d.id).length} école(s)`, icon: 'grid' });
  edge('b-ecoles', `d-${d.id}`);
  for (const e of ECOLES.filter((x) => x.domaine === d.id)) {
    const eid = `e-${e.id}`;
    addNode({
      id: eid, type: 'ecole', label: e.nom, sub: `${e.ville} · ${e.duree}`, icon: 'building',
      details: {
        'Ville': e.ville, 'Durée': e.duree, 'Diplôme': e.diplome, 'Admission': e.admission,
        'Inscription': e.fraisInscription, 'Scolarité': e.fraisScolarite, 'Débouchés': e.debouches, 'Poursuite': e.masters.join(' · '),
      },
      tags: { matieres: [], interets: e.interets, budget: e.budget, select: e.select },
      secteurs: DOM_SECT[e.domaine] || ['commerce'],
      metiers: e.metiers,
      masters: e.masters,
      compare: {
        prix: `${e.fraisInscription} + ${e.fraisScolarite}`, duree: e.duree, admission: e.admission, diplome: e.diplome,
        matieres: e.debouches, masters: e.masters.join(' · '), debouches: e.debouches, metiers: e.metiers.join(', '),
      },
    });
    edge(`d-${d.id}`, eid);
    for (const met of e.metiers) {
      const kid = `met-${slug(met)}`;
      addNode({ id: kid, type: 'metier', label: met, sub: 'Métier', icon: 'star' });
      edge(eid, kid);
    }
  }
}

/* ----------------------------- pro / alternance ----------------------------- */
for (const p of PRO) {
  const pid = `pro-${p.id}`;
  addNode({
    id: pid, type: 'pro', label: p.nom, sub: p.diplome, icon: 'briefcase',
    details: { 'Durée': p.duree, 'Admission': p.admission, 'Coût': p.cout, 'Diplôme': p.diplome, 'Débouchés': p.debouches, 'Passerelle': p.passerelle },
    compare: { prix: p.cout, duree: p.duree, admission: p.admission, diplome: p.diplome, matieres: p.debouches, masters: p.passerelle, debouches: p.debouches, metiers: p.metiers.join(', ') },
    tags: p.tags,
    secteurs: PRO_SECT[p.id] || ['commerce'],
    metiers: p.metiers,
  });
  edge('b-pro', pid);
  edge('b-alternance', pid, 'souvent en alternance');
  for (const met of p.metiers) {
    const kid = `met-${slug(met)}`;
    addNode({ id: kid, type: 'metier', label: met, sub: 'Métier', icon: 'star' });
    edge(pid, kid);
  }
}
const ALT = [
  { id: 'alt-1', label: 'BTS/DUT en alternance', sub: 'Salaire + diplôme, 2-3 ans', details: { 'Principe': '2-3 jours en entreprise, le reste en cours ; frais payés par l’employeur.', 'Pour qui': 'Bac S/L motivé par un métier précis.' } },
  { id: 'alt-2', label: 'Licence pro en alternance', sub: 'Après un Bac+2, 1 an', details: { 'Principe': 'Spécialisation rémunérée ; souvent proposée par les universités.', 'Pour qui': 'Sortants de BTS/DUT.' } },
  { id: 'alt-3', label: 'Écoles privées en alternance', sub: 'Commerce, informatique, compta', details: { 'Principe': 'L’entreprise paie la scolarité ; contrat d’apprentissage ou de professionnalisation.', 'Vigilance': 'Vérifie le réseau d’entreprises partenaires de l’école.' } },
];
for (const a of ALT) {
  addNode({ ...a, type: 'alternance', icon: 'refresh', secteurs: ALT_SECT[a.id] || ['commerce'] });
  edge('b-alternance', a.id);
}

/* ------------------------------ concours etc. ------------------------------ */
for (const c of CONCOURS) {
  const cid = `c-${c.id}`;
  addNode({ id: cid, type: 'concours', label: c.nom, sub: c.preparation.slice(0, 50) + '…', icon: 'award', details: { 'Préparation': c.preparation, 'Durée après réussite': c.dureeApres, 'Conseil': c.conseil }, secteurs: CONC_SECT[c.id] || ['droit'], metiers: c.metiers });
  edge('b-concours', cid);
  for (const met of c.metiers) {
    const kid = `met-${slug(met)}`;
    addNode({ id: kid, type: 'metier', label: met, sub: 'Métier', icon: 'star' });
    edge(cid, kid);
  }
}
for (const x of ETRANGER) {
  const xid = `et-${x.id}`;
  addNode({ id: xid, type: 'etranger', label: x.nom, sub: x.budget, icon: 'globe', details: { 'Budget': x.budget, 'Conditions': x.conditions, 'Atouts': x.atouts, 'Vigilance': x.vigilance }, secteurs: ['all'] });
  edge('b-etranger', xid);
}
for (const t of TRAVAIL) {
  const tid = `tr-${slug(t.nom)}`;
  addNode({ id: tid, type: 'travail', label: t.nom, sub: t.atout, icon: 'zap', details: { 'Atout': t.atout, 'Risque': t.risque, 'Reprendre des études': t.passerelle }, secteurs: ['all'] });
  edge('b-travail', tid);
  edge(tid, 'b-pro', 'reprendre des études');
}

export const INTERETS_LIST = INTERETS;
export const NB_NODES = NODES.length;
export const NB_EDGES = EDGES.length;
