// Génération des PDF de démonstration sans dépendance externe, en écrivant
// directement la structure PDF 1.4 (objets + table xref).
// Utilisé par le seed au premier lancement ET par scripts/make-demo-pdf.js.
const fs = require('fs');
const path = require('path');

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function makePdf(title, subtitle, lines) {
  const enc = (s) => Buffer.from(s, 'latin1');
  let stream = `BT /F2 20 Tf 50 790 Td (${esc(title)}) Tj ET\n`;
  if (subtitle) stream += `BT /F1 10.5 Tf 50 772 Td (${esc(subtitle)}) Tj ET\n`;
  stream += `0.35 w 50 764 m 545 764 l S\n`;
  stream += `BT /F1 11 Tf 15 TL 50 742 Td\n`;
  for (const ln of lines) stream += `(${esc(ln)}) Tj T*\n`;
  stream += 'ET';
  const streamBuf = enc(stream);

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>'
  );
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  objects.push(`<< /Length ${streamBuf.length} >>\nstream\n${stream}\nendstream`);

  let out = enc('%PDF-1.4\n');
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out = Buffer.concat([out, enc(`${i + 1} 0 obj\n${obj}\nendobj\n`)]);
  });
  const xrefPos = out.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  out = Buffer.concat([out, enc(xref)]);
  return out;
}

const docs = [
  {
    file: 'maths/fonctions-numeriques.pdf',
    title: 'Les fonctions numériques',
    subtitle: 'Mathématiques – Cours de démonstration – Plateforme S2 Réussite',
    lines: [
      '1. Définition',
      'Une fonction numérique f est un procédé qui, à tout nombre x choisi dans un',
      'ensemble D (le domaine de définition), associe un unique nombre réel f(x),',
      'appelé image de x par f. On note f : D -> R, x -> f(x).',
      '',
      '2. Image et antécédent',
      'L’image de x par f est f(x). Un antécédent d’un nombre y est une solution de',
      'l’équation f(x) = y. Graphiquement : on lit y sur l’axe des ordonnées, et les',
      'antécédents de y sont les abscisses des points de la courbe d’ordonnée y.',
      '',
      '3. Domaine de définition',
      'Pour une fonction polynomiale : D = R.',
      'Pour une fonction rationnelle : D = R privé des valeurs qui annulent le',
      'dénominateur. Pour une racine carrée : il faut que l’expression sous la racine',
      'soit positive ou nulle.',
      '',
      '4. Sens de variation',
      'f est croissante sur un intervalle I si, lorsque x augmente, f(x) augmente.',
      'f est décroissante si, lorsque x augmente, f(x) diminue. Le tableau de',
      'variations résume ces informations et se construit à partir du signe de la',
      'dérivée (en Première et Terminale).',
      '',
      '5. Exemple d’exercice',
      'Soit f(x) = x² - 4x + 3. Calculer f(0), f(1) et f(4). Résoudre f(x) = 0.',
      'Corrigé : f(0) = 3, f(1) = 0, f(4) = 3 ; f(x) = 0 donne x = 1 ou x = 3.',
    ],
  },
  {
    file: 'physique-chimie/energie-mecanique.pdf',
    title: 'L’énergie mécanique',
    subtitle: 'Physique-Chimie – Cours de démonstration – Plateforme S2 Réussite',
    lines: [
      '1. Énergie cinétique',
      'Un corps de masse m animé d’une vitesse v possède l’énergie cinétique :',
      'Ec = 1/2 x m x v²  (m en kg, v en m/s, Ec en joules J).',
      '',
      '2. Énergie potentielle de pesanteur',
      'Un corps de masse m situé à l’altitude z (référence choisie) possède :',
      'Ep = m x g x z  (g est l’intensité de la pesanteur, environ 9,8 N/kg).',
      '',
      '3. Énergie mécanique',
      'L’énergie mécanique est la somme : Em = Ec + Ep.',
      '',
      '4. Conservation de l’énergie mécanique',
      'En l’absence de frottements, l’énergie mécanique se conserve : ce que le corps',
      'perd en énergie potentielle, il le gagne en énergie cinétique (chute libre),',
      'et inversement (lancer vers le haut). Avec frottements, une partie de Em est',
      'convertie en chaleur : Em diminue.',
      '',
      '5. Exemple d’exercice',
      'Une balle de masse 0,20 kg tombe sans vitesse initiale d’une hauteur de 5 m.',
      'Quelle est sa vitesse juste avant l’impact (sans frottements) ?',
      'Corrigé : m.g.h = 1/2.m.v² donc v = racine(2.g.h) = racine(2 x 9,8 x 5)',
      'soit v ≈ 9,9 m/s (environ 36 km/h).',
    ],
  },
  {
    file: 'francais/figures-de-style.pdf',
    title: 'Les figures de style essentielles',
    subtitle: 'Français – Fiche de révision – Plateforme S2 Réussite',
    lines: [
      'Comparaison : rapproche deux éléments avec un outil (comme, tel, pareil à).',
      'Ex. : « Il est fort comme un lion. »',
      '',
      'Métaphore : comparaison sans outil de comparaison.',
      'Ex. : « Cet homme est un lion. »',
      '',
      'Hyperbole : exagération volontaire. Ex. : « Je meurs de faim. »',
      '',
      'Gradation : termes organisés en intensité croissante ou décroissante.',
      'Ex. : « Je me meurs, je suis mort, je suis enterré. » (Molière)',
      '',
      'Anaphore : répétition d’un même mot en tête de phrases ou de vers.',
      '',
      'Oxymore : réunion de deux mots de sens opposés. Ex. : « une obscure clarté ».',
      '',
      'Litote : dire moins pour suggérer plus. Ex. : « Va, je ne te hais point. »',
      '',
      'Personnification : attribue des traits humains à un objet ou un animal.',
      '',
      'Antithèse : opposition de deux idées dans une même phrase.',
      '',
      'Astuce pour le Bac : identifiez d’abord le procédé, puis expliquez toujours',
      'l’EFFET produit sur le lecteur (émotion, insistance, image frappante…).',
    ],
  },
  {
    file: 'histoire-geographie/decolonisation.pdf',
    title: 'La décolonisation en Afrique',
    subtitle: 'Histoire-Géographie – Fiche de révision – Plateforme S2 Réussite',
    lines: [
      '1. Le contexte après 1945',
      'La Seconde Guerre mondiale affaiblit les puissances coloniales (France,',
      'Royaume-Uni). Les peuples colonisés, qui ont participé à l’effort de guerre,',
      'revendiquent leur liberté. L’ONU (1945) affirme le droit des peuples à',
      'disposer d’eux-mêmes.',
      '',
      '2. Les grandes étapes',
      '1955 : conférence de Bandung, les pays non alignés soutiennent les',
      'indépendances. 1957 : indépendance du Ghana. 1960 : « année de l’Afrique »,',
      '17 pays accèdent à l’indépendance, dont le Sénégal (20 juin 1960).',
      '',
      '3. Les acteurs',
      'Léopold Sédar Senghor (Sénégal), Modibo Keïta (Mali), Kwame Nkrumah (Ghana),',
      'Sékou Touré (Guinée), Patrice Lumumba (Congo), ainsi que les mouvements',
      'syndicaux et les partis politiques africains.',
      '',
      '4. Des indépendances aux trajectoires variées',
      'Certaines sont négociées (Afrique occidentale française), d’autres arrachées',
      'par la lutte (Algérie, Kenya, Angola). Après les indépendances viennent les',
      'défis : construction de l’État, développement économique, unité nationale.',
      '',
      '5. Repère à retenir pour le Bac',
      'Savoir situer 1960, citer deux acteurs et distinguer indépendance négociée',
      'et indépendance par la lutte.',
    ],
  },
  {
    file: 'philosophie/dissertation.pdf',
    title: 'Méthode de la dissertation philosophique',
    subtitle: 'Philosophie – Filière L2 – Plateforme Réussite',
    lines: [
      '1. Analyser le sujet',
      'Repérez les mots-clés, définissez-les, et dégagez le PROBLÈME : quelle',
      'question le sujet pose-t-il vraiment ? Évitez le hors-sujet en reformulant',
      'la question au brouillon.',
      '',
      '2. Construire le plan',
      'Thèse (première réponse argumentée), antithèse (limites ou objection),',
      'dépassement (troisième partie qui résout la tension). Chaque partie contient',
      '2 ou 3 arguments illustrés par des exemples ou des références.',
      '',
      '3. Introduction en 4 temps',
      'Amorce (citation, fait, exemple), analyse du sujet, problématique, annonce',
      'du plan.',
      '',
      '4. Conclusion',
      'Réponse claire à la problématique + ouverture. Ne jamais introduire une',
      'idée nouvelle.',
      '',
      '5. Exemple de sujet traité en classe',
      '« La liberté est-elle l’absence de contraintes ? » : distinguer liberté',
      'physique, liberté morale et liberté politique ; mobiliser Épictète (la',
      'liberté intérieure), Montesquieu (la liberté par la loi) et Sartre (la',
      'liberté comme responsabilité).',
    ],
  },
  {
    file: 'francais/commentaire-compose.pdf',
    title: 'Le commentaire composé pas à pas',
    subtitle: 'Français – Filière L2 – Plateforme Réussite',
    lines: [
      '1. Lire et annoter le texte',
      'Repérez procédés d’écriture, tonalités, structure et champs lexicaux.',
      'Surlignez les passages qui produisent un effet.',
      '',
      '2. Dégager des axes de lecture',
      '2 ou 3 axes qui regroupent vos remarques (et jamais un simple relevé de',
      'procédés). Exemple : I. Un tableau réaliste de la ville ; II. Une scène',
      'portée par l’émotion.',
      '',
      '3. Rédiger',
      'Introduction (présentation du texte + axes), développement (un paragraphe =',
      'une idée + une citation + un procédé + l’effet produit), conclusion (bilan +',
      'ouverture).',
      '',
      '4. Le réflexe qui fait gagner des points',
      'Toujours relier le PROCÉDÉ à l’EFFET : « la métaphore de l’océan traduit',
      'l’angoisse du personnage » et non « il y a une métaphore ».',
    ],
  },
  {
    file: 'histoire-geographie/colonisation.pdf',
    title: 'La colonisation en Afrique (filière L2)',
    subtitle: 'Histoire-Géographie – Filière L2 – Plateforme Réussite',
    lines: [
      '1. La conquête coloniale',
      'À partir des années 1880, les puissances européennes se partagent l’Afrique',
      'à la conférence de Berlin (1884-1885), sans consulter les populations.',
      '',
      '2. La domination coloniale',
      'Administration directe (France : assimilation) ou indirecte (Royaume-Uni :',
      'indirect rule), économie d’exploitation (cultures de rente, impôt, travail',
      'forcé), et transformations des sociétés africaines.',
      '',
      '3. Les résistances',
      'Résistances armées (Alburi Ndiaye, Lat Dior, Samori Touré), résistances',
      'culturelles et religieuses, puis naissance des mouvements politiques au',
      'XXe siècle.',
      '',
      '4. Vers les indépendances',
      'Après 1945, la contestation s’amplifie jusqu’aux indépendances des années',
      '1960. Faire le lien avec la fiche « décolonisation » de la filière S2.',
    ],
  },
  {
    file: 'anglais/vocabulaire-bac.pdf',
    title: 'English – Essential vocabulary for the Bac',
    subtitle: 'Anglais – Filière L2 – Plateforme Réussite',
    lines: [
      '1. Talking about education',
      'a scholarship (une bourse), a degree (un diplôme), to graduate (obtenir son',
      'diplôme), a freshman (un étudiant en première année), tuition fees (frais',
      'de scolarité).',
      '',
      '2. Expressing your opinion',
      'In my opinion… / As far as I am concerned… / It seems to me that… / I',
      'strongly believe that… / On the one hand… on the other hand…',
      '',
      '3. Linking words that boost your essay',
      'however (cependant), therefore (donc), moreover (de plus), although (bien',
      'que), as a result (par conséquent), whereas (tandis que).',
      '',
      '4. Common mistakes to avoid',
      '« I am agree » -> I agree. « Since 10 years » -> for 10 years. « People »',
      'est déjà pluriel. Ne jamais traduire mot à mot du français.',
    ],
  },
  {
    file: 'annales/s2-maths-2023-sujet.pdf',
    title: 'Bac S2 2023 – Mathématiques (sujet)',
    subtitle: 'Annales – Session 2023 – Plateforme Réussite',
    lines: [
      'Exercice 1 (5 pts) : fonction f(x) = x² - 4x + 3.',
      '1) Étudier les variations de f. 2) Résoudre f(x) = 0.',
      '3) Dresser le tableau de signes de f.',
      '',
      'Exercice 2 (5 pts) : suite arithmétique (Un) de premier terme U0 = 2 et de',
      'raison 3. 1) Calculer U5. 2) Exprimer Un en fonction de n.',
      '3) Calculer la somme S = U0 + U1 + … + U10.',
      '',
      'Problème (10 pts) : étude complète d’une fonction rationnelle et calcul',
      'd’aire (document-réponse fourni).',
    ],
  },
  {
    file: 'annales/s2-maths-2023-corrige.pdf',
    title: 'Bac S2 2023 – Mathématiques (corrigé)',
    subtitle: 'Annales – Session 2023 – Plateforme Réussite',
    lines: [
      'Exercice 1 : f’(x) = 2x - 4 ; f croissante sur [2 ; +∞[, décroissante sur',
      ']-∞ ; 2]. f(x) = 0 donne x = 1 ou x = 3. Signe : + sur ]-∞;1[ et ]3;+∞[,',
      '- sur ]1;3[.',
      '',
      'Exercice 2 : U5 = 2 + 5x3 = 17. Un = 2 + 3n. S = (11 x (2 + 32)) / 2 = 187.',
      '',
      'Barème indicatif : méthode 40 %, calculs 40 %, rédaction 20 %.',
    ],
  },
  {
    file: 'annales/s2-pc-2022-sujet.pdf',
    title: 'Bac S2 2022 – Physique-Chimie (sujet)',
    subtitle: 'Annales – Session 2022 – Plateforme Réussite',
    lines: [
      'Exercice 1 : une balle de 0,20 kg tombe de 5 m sans vitesse initiale.',
      '1) Quelle énergie potentielle au départ ? 2) Vitesse à l’impact (sans',
      'frottements) ?',
      '',
      'Exercice 2 : circuit électrique avec générateur 12 V et résistance 4 ohms.',
      '1) Intensité. 2) Puissance dissipée.',
      '',
      'Exercice 3 : équilibrer la réaction de combustion du méthane CH4.',
    ],
  },
  {
    file: 'annales/s2-pc-2022-corrige.pdf',
    title: 'Bac S2 2022 – Physique-Chimie (corrigé)',
    subtitle: 'Annales – Session 2022 – Plateforme Réussite',
    lines: [
      'Exercice 1 : Ep = m.g.h = 0,2 x 9,8 x 5 = 9,8 J. v = racine(2.g.h) = 9,9 m/s.',
      'Exercice 2 : I = U/R = 3 A. P = U x I = 36 W.',
      'Exercice 3 : CH4 + 2 O2 -> CO2 + 2 H2O.',
    ],
  },
  {
    file: 'annales/l2-francais-2021-sujet.pdf',
    title: 'Bac L2 2021 – Français (sujet)',
    subtitle: 'Annales – Session 2021 – Plateforme Réussite',
    lines: [
      'Texte : extrait des « Bouts de bois de Dieu » d’Ousmane Sembène.',
      '',
      '1) Questions de compréhension (6 pts) : qui parle ? quel est le contexte',
      'historique ? quel est le ton du passage ?',
      '2) Relevez deux figures de style et expliquez leur effet (4 pts).',
      '3) Commentaire composé (10 pts) : vous montrerez comment le récit donne',
      'à voir la solidarité du peuple.',
    ],
  },
  {
    file: 'annales/l2-francais-2021-corrige.pdf',
    title: 'Bac L2 2021 – Français (corrigé)',
    subtitle: 'Annales – Session 2021 – Plateforme Réussite',
    lines: [
      'Pistes de corrigé : contexte = grève des cheminots de 1947-48 ; ton épique ;',
      'figures : accumulation (« femmes, hommes, enfants, vieillards »),',
      'personnification de la faim ; plan conseillé en deux axes : un récit',
      'testimonial / une célébration de la solidarité.',
    ],
  },
  {
    file: 'annales/l2-philo-2024-sujet.pdf',
    title: 'Bac L2 2024 – Philosophie (sujet)',
    subtitle: 'Annales – Session 2024 – Plateforme Réussite',
    lines: [
      'Sujet 1 : La liberté consiste-t-elle à faire tout ce que l’on veut ?',
      'Sujet 2 : Le travail nous éloigne-t-il de la nature ?',
      'Sujet 3 : Commentaire de texte (extrait du « Contrat social », Rousseau).',
      '',
      'Consigne : traiter un seul sujet, en respectant la méthode de la',
      'dissertation vue en cours (problématique, plan dialectique, exemples).',
    ],
  },
  {
    file: 'annales/l2-philo-2024-corrige.pdf',
    title: 'Bac L2 2024 – Philosophie (corrigé)',
    subtitle: 'Annales – Session 2024 – Plateforme Réussite',
    lines: [
      'Sujet 1 – éléments : I. Liberté comme absence d’obstacles (sens courant) ;',
      'II. mais liberté sans loi = violence (Hobbes, l’état de nature) ;',
      'III. la liberté véritable = obéissance à la loi qu’on se prescrit (Rousseau,',
      'Kant : l’autonomie).',
    ],
  },
  {
    file: 'arabe/niveau1-alphabet.pdf',
    title: "Arabe Niveau 1 - L'alphabet et la prononciation",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "1. Les 28 lettres",
      "Apprends-les par groupes de 4 : alif, ba, ta, tha / jim, ha, kha / dal, dhal,",
      "ra / zay, sin, shin / sad, dad, ta, za / ayn, ghayn / fa, qaf / kaf, lam /",
      "mim, nun / ha, waw, ya.",
      "",
      "2. Les voyelles courtes (harakat)",
      "fatha (a), kasra (i), damma (u). Exemple : b + fatha = ba ; b + kasra = bi.",
      "",
      "3. Règle d'écriture",
      "L'arabe s'écrit de droite à gauche. Chaque lettre a 4 formes : isolée, en",
      "début, au milieu, en fin de mot.",
      "",
      "4. Entraînement",
      "Recopie chaque lettre 5 fois, puis lis à voix haute avec la vidéo du cours.",
    ],
  },
  {
    file: 'arabe/niveau1-salutations.pdf',
    title: "Arabe Niveau 1 - Salutations et premiers mots",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "as-salamu alaykum = bonjour ; wa alaykum as-salam = réponse.",
      "marhaban = bienvenue ; shukran = merci ; afwan = de rien.",
      "ma ismuka ? (garçon) / ma ismuki ? (fille) = comment t'appelles-tu ?",
      "ismi ... = je m'appelle ...",
      "kayfa haluka ? = comment vas-tu ? ; ana bikhayr = je vais bien.",
      "Exercice : joue le dialogue avec un camarade, puis inversez les rôles.",
    ],
  },
  {
    file: 'arabe/niveau2-phrase-nominale.pdf',
    title: "Arabe Niveau 2 - La phrase nominale",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "1. Structure",
      "La phrase nominale commence par un NOM : moubtada (sujet) + khabar",
      "(prédicat). Ex. : al-baytu kabirun = la maison est grande.",
      "",
      "2. La marque du cas",
      "Moubtada et khabar sont presque toujours à la damma (un) en fin de mot.",
      "",
      "3. Exercices",
      "Traduis : « le livre est nouveau », « l'école est grande », « le professeur",
      "est présent ». Corrige-toi avec le lexique du cours.",
    ],
  },
  {
    file: 'arabe/niveau2-madi.pdf',
    title: "Arabe Niveau 2 - Le verbe au passé (madi)",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "1. Principe",
      "Le verbe arabe se construit sur une racine de 3 consonnes. k-t-b (écrire) :",
      "kataba = il a écrit.",
      "",
      "2. Conjugaison type",
      "kataba (il), katabat (elle), katabtu (je), katabta (tu m.), katabti (tu f.),",
      "katabna (nous), katabu (ils).",
      "",
      "3. Pratique",
      "Conjugue : darasa (étudier), sharia (acheter), akala (manger).",
    ],
  },
  {
    file: 'arabe/niveau3-lecture.pdf',
    title: "Arabe Niveau 3 - Lecture et compréhension",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "Méthode en 3 passages : 1) lire sans s'arrêter pour le sens global ;",
      "2) relire en notant les mots nouveaux ; 3) répondre aux questions.",
      "",
      "Texte : « Yadhhabu at-tilmidhu ila al-madrasati kulla sabahin... » (l'élève",
      "va à l'école chaque matin...). Questions : qui ? où ? quand ? pourquoi ?",
      "",
      "Lexique du texte : sabah = matin ; kull = chaque ; yadhhabu = il va.",
    ],
  },
  {
    file: 'arabe/niveau3-expression.pdf',
    title: "Arabe Niveau 3 - Expression écrite",
    subtitle: "Cours d'arabe - Plateforme Réussite",
    lines: [
      "1. Connecteurs utiles",
      "thumma (ensuite), wa (et), lakin (mais), li-anna (parce que).",
      "",
      "2. Modèle de paragraphe",
      "Présente ta journée : 3 phrases avec verbe au passé + 2 phrases avec",
      "phrase nominale + 1 conclusion.",
      "",
      "3. Conseil",
      "Relis-toi en vérifiant : harakat des noms, accord du verbe, ponctuation.",
    ],
  },
];
// fichiers créés. Avec { force: true }, réécrit tout.
function writeDemoPdfs(uploadsDir, { force = false } = {}) {
  const written = [];
  for (const d of docs) {
    const target = path.join(uploadsDir, d.file);
    if (!force && fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, makePdf(d.title, d.subtitle, d.lines));
    written.push(d.file);
  }
  return written;
}

module.exports = { makePdf, docs, writeDemoPdfs };
