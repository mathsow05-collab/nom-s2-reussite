/* ------------------------------------------------------------------ */
/* Découverte du jour : NASA, pays, mot d'anglais, Wikipédia, trivia.  */
/* Tout est agrégé côté serveur (CSP tranquille, cache quotidien).     */
/* ------------------------------------------------------------------ */
const express = require('express');
const db = require('../db');
const { requireEleve } = require('../middleware');
const { rateLimiter } = require('../security');

const router = express.Router();

let cacheJour = { date: '', data: null };
let cachePays = { date: '', list: null };

function jourAnnee() {
  const n = new Date();
  return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
}
function auj() {
  return new Date().toISOString().slice(0, 10);
}

/* Citations motivantes en français (les API de citations gratuites
   sont en anglais : une liste intégrée garantit la qualité). */
const CITATIONS = [
  { t: 'Celui qui déplace une montagne commence par déplacer de petites pierres.', a: 'Confucius' },
  { t: 'Le succès, c’est tomber sept fois et se relever huit.', a: 'Proverbe japonais' },
  { t: 'L’éducation est l’arme la plus puissante que vous pouvez utiliser pour changer le monde.', a: 'Nelson Mandela' },
  { t: 'L’excellence n’est pas un acte, mais une habitude.', a: 'Aristote' },
  { t: 'La vie, c’est comme une bicyclette : il faut avancer pour ne pas perdre l’équilibre.', a: 'Albert Einstein' },
  { t: 'Un enfant sans éducation est comme un oiseau sans ailes.', a: 'Proverbe tibétain' },
  { t: 'Seul on va plus vite, ensemble on va plus loin.', a: 'Proverbe africain' },
  { t: 'C’est en forgeant qu’on devient forgeron.', a: 'Proverbe' },
  { t: 'Petit à petit, l’oiseau fait son nid.', a: 'Proverbe' },
  { t: 'Il n’est jamais trop tard pour devenir ce que tu aurais pu être.', a: 'George Eliot' },
  { t: 'Fais de ta vie un rêve, et d’un rêve, une réalité.', a: 'Antoine de Saint-Exupéry' },
  { t: 'Ce n’est pas parce que les choses sont difficiles que nous n’osons pas ; c’est parce que nous n’osons pas qu’elles sont difficiles.', a: 'Sénèque' },
  { t: 'Le talent, c’est 1 % d’inspiration et 99 % de transpiration.', a: 'Thomas Edison' },
  { t: 'Il n’y a qu’une façon d’échouer, c’est d’abandonner avant d’avoir réussi.', a: 'Georges Clemenceau' },
  { t: 'Après la pluie, le beau temps.', a: 'Proverbe' },
  { t: 'Vouloir, c’est pouvoir.', a: 'Proverbe' },
  { t: 'Chaque chose vient à point à qui sait attendre.', a: 'Proverbe' },
  { t: 'L’avenir appartient à ceux qui se lèvent tôt.', a: 'Proverbe' },
  { t: 'Savoir, c’est pouvoir.', a: 'Francis Bacon' },
  { t: 'La persévérance, c’est beaucoup de petites courses les unes après les autres.', a: 'Walter Elliot' },
];

/* Vocabulaire anglais utile au lycée (le mot tourne chaque jour). */
const MOTS = [
  'achieve', 'improve', 'knowledge', 'wisdom', 'courage', 'patience', 'strength', 'journey',
  'goal', 'dream', 'hope', 'succeed', 'learn', 'teach', 'understand', 'remember',
  'believe', 'effort', 'progress', 'challenge', 'curious', 'brilliant', 'grateful', 'peaceful',
];

async function oeuvre() {
  /* Image du jour : tire des résumés Wikipédia au hasard jusqu'à un article illustré. */
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary');
      const a = await r.json();
      const img = a?.originalimage?.source || a?.thumbnail?.source;
      if (a?.title && a?.extract && img)
        return { titre: a.title, artiste: '', date: '', img, texte: String(a.extract).slice(0, 220) };
    } catch {
      /* silencieux */
    }
  }
  return null;
}

async function pays() {
  const p = PAYS[jourAnnee() % PAYS.length];
  return { code: p[0], nom: p[1], capital: p[2], pop: p[3], fait: p[4], drapeau: emojiDrapeau(p[0]) };
}

const PAYS = [
  ['SN', 'Sénégal', 'Dakar', 18.0, 'Le pays de la Téranga, dont le nom viendrait du fleuve Sénégal.'],
  ['FR', 'France', 'Paris', 68.0, 'La tour Eiffel était censée être démontée après 20 ans.'],
  ['JP', 'Japon', 'Tokyo', 124.0, 'Tokyo est la plus grande agglomération du monde (37 M d’habitants).'],
  ['BR', 'Brésil', 'Brasília', 216.0, 'Le Brésil a eu quatre capitales avant Brasília.'],
  ['CA', 'Canada', 'Ottawa', 40.0, 'Le Canada a plus de lacs que tous les autres pays réunis.'],
  ['EG', 'Égypte', 'Le Caire', 112.0, 'La grande pyramide est restée le plus haut bâtiment du monde pendant 3 800 ans.'],
  ['MA', 'Maroc', 'Rabat', 37.0, 'La plus vieille université du monde (Al Quaraouiyine, 859) s’y trouve.'],
  ['ML', 'Mali', 'Bamako', 23.0, 'La mosquée de Djenné est le plus grand bâtiment en banco du monde.'],
  ['CI', 'Côte d’Ivoire', 'Yamoussoukro', 28.0, 'La basilique de Yamoussoukro est l’une des plus grandes églises du monde.'],
  ['GH', 'Ghana', 'Accra', 34.0, 'Premier pays d’Afrique subsaharienne indépendant (1957).'],
  ['NG', 'Nigéria', 'Abuja', 223.0, 'Le pays le plus peuplé d’Afrique, plus de 500 langues parlées.'],
  ['KE', 'Kenya', 'Nairobi', 55.0, 'Ses coureurs de fond dominent le marathon mondial depuis 50 ans.'],
  ['ET', 'Éthiopie', 'Addis-Abeba', 126.0, 'Seul pays africain jamais colonisé ; 13 mois par an (calendrier propre).'],
  ['ZA', 'Afrique du Sud', 'Pretoria', 60.0, 'Trois capitales : Pretoria, Le Cap et Bloemfontein.'],
  ['DE', 'Allemagne', 'Berlin', 84.0, 'Plus de 1 500 sortes de bières et 300 sortes de pain.'],
  ['ES', 'Espagne', 'Madrid', 48.0, 'L’hymne national espagnol n’a pas de paroles officielles.'],
  ['IT', 'Italie', 'Rome', 59.0, 'L’Italie compte 59 sites classés au patrimoine mondial de l’UNESCO.'],
  ['GB', 'Royaume-Uni', 'Londres', 68.0, 'Le Big Ben est le nom de la cloche, pas de la tour.'],
  ['US', 'États-Unis', 'Washington D.C.', 335.0, 'La Statue de la Liberté fut un cadeau français (1886).'],
  ['CN', 'Chine', 'Pékin', 1425.0, 'La Grande Muraille fait plus de 21 000 km.'],
  ['IN', 'Inde', 'New Delhi', 1428.0, 'Le pays le plus peuplé du monde depuis 2023.'],
  ['AU', 'Australie', 'Canberra', 26.0, 'Sa Grande Barrière de corail est visible depuis l’espace.'],
  ['MX', 'Mexique', 'Mexico', 128.0, 'Mexico fut bâtie sur un lac, au-dessus de l’ancienne Tenochtitlan.'],
  ['AR', 'Argentine', 'Buenos Aires', 46.0, 'Le tango y est né à la fin du XIXe siècle.'],
  ['TR', 'Turquie', 'Ankara', 85.0, 'Istanbul est sur deux continents : Europe et Asie.'],
  ['RU', 'Russie', 'Moscou', 144.0, 'Le plus grand pays du monde : 11 fuseaux horaires.'],
  ['PT', 'Portugal', 'Lisbonne', 10.0, 'La plus vieille librairie du monde (1732) est à Lisbonne.'],
  ['NL', 'Pays-Bas', 'Amsterdam', 18.0, 'Un tiers du pays est sous le niveau de la mer.'],
  ['BE', 'Belgique', 'Bruxelles', 12.0, 'Le Belge moyen mange 6 kg de chocolat par an.'],
  ['CH', 'Suisse', 'Berne', 9.0, 'La Suisse a quatre langues nationales mais aucun président permanent.'],
  ['KR', 'Corée du Sud', 'Séoul', 52.0, 'L’alphabet hangul a été inventé en 1443 par le roi Sejong.'],
  ['VN', 'Viêt Nam', 'Hanoï', 99.0, 'Premier exportateur mondial de poivre et de noix de cajou.'],
  ['TH', 'Thaïlande', 'Bangkok', 72.0, 'Seul pays d’Asie du Sud-Est jamais colonisé.'],
  ['ID', 'Indonésie', 'Jakarta', 277.0, 'Le plus grand archipel du monde : plus de 17 000 îles.'],
  ['TN', 'Tunisie', 'Tunis', 12.0, 'Carthage, rivale de Rome, s’y trouvait dans l’Antiquité.'],
  ['DZ', 'Algérie', 'Alger', 45.0, 'Le plus grand pays d’Afrique par la superficie.'],
  ['GN', 'Guinée', 'Conakry', 14.0, 'Possède les plus grandes réserves mondiales de bauxite.'],
  ['BF', 'Burkina Faso', 'Ouagadougou', 23.0, '« Le pays des Hommes intègres ».'],
  ['GM', 'Gambie', 'Banjul', 2.7, 'Le plus petit pays d’Afrique continentale.'],
  ['CV', 'Cap-Vert', 'Praia', 0.6, 'Un archipel de dix îles volcaniques, patrie de Cesaria Evora.'],
  ['MR', 'Mauritanie', 'Nouakchott', 4.9, 'Le train le plus long du monde (2,5 km) y transporte du fer.'],
  ['TG', 'Togo', 'Lomé', 9.0, 'Lomé est la seule capitale au monde située sur une frontière.'],
  ['BJ', 'Bénin', 'Porto-Novo', 13.0, 'Berceau du vaudou, patrimoine vivant.'],
  ['NE', 'Niger', 'Niamey', 27.0, 'Le pays le plus jeune du monde par sa population.'],
  ['TD', 'Tchad', 'N’Djaména', 18.0, 'Le lac Tchad a perdu 90 % de sa surface depuis 1960.'],
  ['CM', 'Cameroun', 'Yaoundé', 28.0, 'On l’appelle « l’Afrique en miniature » : tous les climats du continent.'],
  ['CD', 'RD Congo', 'Kinshasa', 102.0, 'Le fleuve Congo est le plus profond du monde (220 m).'],
  ['RW', 'Rwanda', 'Kigali', 14.0, 'Pays des mille collines, interdit au plastique depuis 2008.'],
  ['TZ', 'Tanzanie', 'Dodoma', 67.0, 'Le Kilimandjaro, toit de l’Afrique (5 895 m), s’y dresse.'],
  ['UG', 'Ouganda', 'Kampala', 48.0, 'Abrite la moitié des gorilles de montagne restants.'],
];
const emojiDrapeau = (cc) => cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

async function pays() {
  const p = PAYS[jourAnnee() % PAYS.length];
  return { code: p[0], nom: p[1], capital: p[2], pop: p[3], fait: p[4], drapeau: emojiDrapeau(p[0]) };
}

async function mot() {
  const w = MOTS[jourAnnee() % MOTS.length];
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
    const d = await r.json();
    const e = Array.isArray(d) ? d[0] : null;
    const phon = (e?.phonetics || []).find((p) => p?.audioUrl || p?.audio);
    const meaning = e?.meanings?.[0];
    return {
      mot: w,
      phon: e?.phonetic || '',
      type: meaning?.partOfSpeech || '',
      def: meaning?.definitions?.[0]?.definition || '',
      exemple: meaning?.definitions?.[0]?.example || '',
      audio: phon?.audioUrl || phon?.audio || '',
    };
  } catch {
    return { mot: w, phon: '', type: '', def: '', exemple: '', audio: '' };
  }
}

async function article() {
  try {
    const r = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary');
    const a = await r.json();
    if (a?.title && a?.extract)
      return { titre: a.title, texte: String(a.extract).slice(0, 350), img: a?.originalimage?.source || a?.thumbnail?.source || '' };
  } catch {
    /* silencieux */
  }
  return null;
}

router.get('/jour', requireEleve(db), async (req, res) => {
  const today = auj();
  if (cacheJour.date === today && cacheJour.data) return res.json(cacheJour.data);
  const [oe, pa, mo, ar] = await Promise.all([oeuvre(), pays(), mot(), article()]);
  const data = { oeuvre: oe, pays: pa, mot: mo, article: ar, citation: CITATIONS[jourAnnee() % CITATIONS.length] };
  cacheJour = { date: today, data };
  res.json(data);
});

/* ------------------------- Défi d'anglais (Open Trivia) ------------------------- */
const ent = (s) =>
  String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const melange = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

router.get(
  '/trivia',
  requireEleve(db),
  rateLimiter({ max: 10, windowMs: 5 * 60 * 1000, message: 'Petite pause trivia. Reviens dans quelques minutes.' }),
  async (req, res) => {
    try {
      const r = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
      const d = await r.json();
      if (d?.response_code !== 0 || !Array.isArray(d.results) || d.results.length === 0)
        return res.status(502).json({ error: 'Trivia indisponible pour le moment.' });
      const questions = d.results.map((q) => ({
        q: ent(q.question),
        ok: ent(q.correct_answer),
        choix: melange([...q.incorrect_answers.map(ent), ent(q.correct_answer)]),
      }));
      return res.json({ questions });
    } catch {
      return res.status(502).json({ error: 'Trivia indisponible pour le moment.' });
    }
  }
);

module.exports = router;
