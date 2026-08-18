/* Carte d'orientation interactive — données post-Bac Sénégal.
   Structure : 6 grandes branches → sous-niveaux → fiches détaillées.
   Chaque formation porte des tags (matières, intérêts, budget, sélectivité)
   pour le moteur « Trouver mon parcours ». */

export const SLOGAN = 'Ton avenir n’est pas une ligne droite. Explore les chemins qui s’offrent à toi.';

export const BRANCHES = [
  { id: 'universite', titre: 'Université', icone: 'cap', img: '/metiers/campus.jpg', desc: 'Licence → Master → Doctorat (LMD). Inscription publique via Campusen.' },
  { id: 'ecoles', titre: 'Écoles de formation', icone: 'building', img: '/metiers/ecole.jpg', desc: 'Ingénieurs, commerce, santé, communication… diplômes ciblés.' },
  { id: 'pro', titre: 'Formations professionnelles', icone: 'briefcase', img: '/metiers/chantier.jpg', desc: 'BTS, DUT, licence pro : un métier vite, des passerelles ensuite.' },
  { id: 'concours', titre: 'Concours', icone: 'award', img: '/metiers/juriste.jpg', desc: 'Grandes écoles et fonctions publiques : la sélection qui ouvre grand.' },
  { id: 'etranger', titre: 'Études à l’étranger', icone: 'globe', img: '/metiers/ciel.jpg', desc: 'France, Maroc, Canada… : partir avec un plan solide.' },
  { id: 'travail', titre: 'Vie professionnelle', icone: 'zap', img: '/metiers/mer.jpg', desc: 'Entrer dans la vie active dès le Bac, sans fermer les portes.' },
];

/* ------------------------------- UNIVERSITÉS ------------------------------- */
export const UNIVERSITES = [
  { id: 'ucad', nom: 'UCAD — Cheikh Anta Diop', ville: 'Dakar', img: '/metiers/campus.jpg', frais: '≈ 25 000 F CFA/an (droits publics)', admission: 'Bac + inscription Campusen', facultes: ['fst', 'seg', 'fsjp', 'flash', 'fmpos', 'fastef'] },
  { id: 'ugb', nom: 'UGB — Gaston Berger', ville: 'Saint-Louis', img: '/metiers/lettres.jpg', frais: '≈ 25 000 F CFA/an', admission: 'Bac + Campusen', facultes: ['fst', 'seg', 'flash'] },
  { id: 'uthies', nom: 'Université de Thiès', ville: 'Thiès', img: '/metiers/energie.jpg', frais: '≈ 25 000 F CFA/an', admission: 'Bac + Campusen', facultes: ['fst', 'seg'] },
  { id: 'uzig', nom: 'Université Assane Seck', ville: 'Ziguinchor', img: '/metiers/agronome.jpg', frais: '≈ 25 000 F CFA/an', admission: 'Bac + Campusen', facultes: ['fst', 'seg'] },
];

export const FACULTES = {
  fst: { nom: 'Sciences & Techniques (FST)', licences: ['maths', 'info', 'physique', 'chimie', 'svt'] },
  seg: { nom: 'Sciences Économiques & Gestion (SEG)', licences: ['eco', 'gestion', 'compta'] },
  fsjp: { nom: 'Sciences Juridiques & Politiques (FSJP)', licences: ['droit', 'scpo'] },
  flash: { nom: 'Lettres & Sciences Humaines (FLASH)', licences: ['lettres', 'anglais', 'geo', 'socio', 'psy'] },
  fmpos: { nom: 'Médecine, Pharmacie, Odonto-stomatologie (FMPOS)', licences: ['medecine'] },
  fastef: { nom: 'FASTEF — enseignement', licences: ['ens'] },
};

export const LICENCES = {
  maths: {
    nom: 'Licence Mathématiques', fac: 'fst', univs: ['ucad', 'ugb', 'uthies'],
    presentation: 'Le socle abstractif : algèbre, analyse, probabilités. La porte vers la data, l’actuariat, l’enseignement et les masters scientifiques.',
    admission: 'Bac S (mention conseillée) via Campusen', duree: '3 ans', difficulte: 3,
    matieres: ['Algèbre', 'Analyse', 'Probabilités', 'Informatique'],
    competences: ['Raisonnement abstrait', 'Modélisation', 'Rigueur démonstrative'],
    frais: '≈ 25 000 F/an (public)',
    apres: {
      masters: ['Master Statistique & Data', 'Master Actuariat', 'Master Enseignement (FASTEF)'],
      metiers: ['Statisticien', 'Data scientist', 'Actuaire', 'Enseignant'],
      concours: ['CAPES/CAFEM via FASTEF', 'ENSAE (admissions parallèles)'],
      secteurs: ['Banques & assurances', 'Télécoms', 'Éducation', 'Bureaux d’études'],
      debouche: 'Fort : la data et la finance recrutent massivement les profils maths+stats.',
    },
    passerelles: ['Vers licence Informatique (L2/L3 selon dossier)', 'Vers écoles d’ingénieurs sur concours', 'Vers SEG (économie quantitative)'],
    tags: { matieres: ['maths'], interets: ['data', 'sciences'], budget: 1, select: 2 },
  },
  info: {
    nom: 'Licence Informatique', fac: 'fst', univs: ['ucad', 'ugb', 'uthies'],
    presentation: 'Programmation, algorithmique, bases de données, réseaux. Le secteur qui recrute le plus vite au Sénégal.',
    admission: 'Bac S via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Algorithmique', 'Programmation', 'Bases de données', 'Réseaux'],
    competences: ['Coder', 'Concevoir des systèmes', 'Travailler en mode projet'],
    frais: '≈ 25 000 F/an (public)',
    apres: {
      masters: ['Master Génie logiciel', 'Master IA', 'Master Cybersécurité'],
      metiers: ['Développeur web/mobile', 'Ingénieur logiciel', 'Expert cybersécurité'],
      concours: ['ESP/EPT en admission parallèle'],
      secteurs: ['Startups & banques', 'Télécoms', 'Freelance international'],
      debouche: 'Excellent : pénurie de développeurs, salaires en forte hausse.',
    },
    passerelles: ['Vers BTS/DUT puis licence pro', 'Vers écoles d’ingénieurs', 'Vers data science'],
    tags: { matieres: ['maths'], interets: ['data', 'creatif'], budget: 1, select: 2 },
  },
  physique: {
    nom: 'Licence Physique', fac: 'fst', univs: ['ucad', 'uthies'],
    presentation: 'Énergie, électronique, matériaux : le Sénégal électrifie et construit, la physique mène aux énergies renouvelables.',
    admission: 'Bac S via Campusen', duree: '3 ans', difficulte: 3,
    matieres: ['Mécanique', 'Électromagnétisme', 'Électronique', 'Thermodynamique'],
    competences: ['Modéliser', 'Expérimenter', 'Calcul appliqué'],
    frais: '≈ 25 000 F/an',
    apres: {
      masters: ['Master Énergies renouvelables', 'Master Électronique', 'Master Matériaux'],
      metiers: ['Ingénieur énergie', 'Technicien supérieur', 'Chargé de projets solaires'],
      concours: ['ESP/EPT/ENSUT'],
      secteurs: ['Solaire & énergie', 'BTP', 'Industrie'],
      debouche: 'Bon et croissant avec la transition énergétique.',
    },
    passerelles: ['Vers écoles d’ingénieurs (ESP, EPT, ENSUT)', 'Vers DUT génie électrique'],
    tags: { matieres: ['physique', 'maths'], interets: ['sciences', 'terrain'], budget: 1, select: 2 },
  },
  chimie: {
    nom: 'Licence Chimie', fac: 'fst', univs: ['ucad'],
    presentation: 'Matière, analyses, qualité : industrie agroalimentaire, pharmaceutique, environnement.',
    admission: 'Bac S via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Chimie organique', 'Chimie minérale', 'Analyses'],
    competences: ['Manipuler en labo', 'Contrôler la qualité'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Chimie appliquée', 'Master Qualité & environnement'], metiers: ['Analyste de laboratoire', 'Responsable qualité'], concours: [], secteurs: ['Agroalimentaire', 'Pharma', 'Environnement'], debouche: 'Correct, surtout en qualité et agroalimentaire.' },
    passerelles: ['Vers écoles d’ingénieurs chimie', 'Vers licences pro qualité'],
    tags: { matieres: ['chimie'], interets: ['sciences', 'sante'], budget: 1, select: 2 },
  },
  svt: {
    nom: 'Licence SVT / Biologie', fac: 'fst', univs: ['ucad', 'ugb'],
    presentation: 'Vivant, environnement, santé : vers la biologie, l’écologie et les concours de santé.',
    admission: 'Bac S via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Biologie cellulaire', 'Écologie', 'Géologie'],
    competences: ['Observer', 'Analyser le vivant'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Biologie', 'Master Environnement'], metiers: ['Biologiste', 'Chargé d’environnement'], concours: ['Concours santé (passerelles rares)'], secteurs: ['Environnement', 'Agriculture', 'Santé publique'], debouche: 'Moyen ; très bon via les masters environnement.' },
    passerelles: ['Vers licences pro environnement', 'Vers écoles d’agronomie'],
    tags: { matieres: ['svt'], interets: ['sciences', 'sante', 'nature'], budget: 1, select: 1 },
  },
  eco: {
    nom: 'Licence Économie', fac: 'seg', univs: ['ucad', 'ugb', 'uthies'],
    presentation: 'Comprendre les marchés, les politiques, les données économiques. Tremplin vers la finance, les études, la banque centrale.',
    admission: 'Bac S ou L2 (selon profil) via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Microéconomie', 'Macroéconomie', 'Statistiques', 'Histoire économique'],
    competences: ['Analyser des données', 'Argumenter', 'Modéliser'],
    frais: '≈ 25 000 F/an',
    apres: {
      masters: ['Master Finance', 'Master Marketing', 'Master Économie internationale', 'Master Data'],
      metiers: ['Économiste', 'Analyste financier', 'Chargé d’études'],
      concours: ['ENSAE', 'Banque centrale (BCEAO)'],
      secteurs: ['Banques', 'Institutions (BCEAO, ministères)', 'Cabinets d’études'],
      debouche: 'Bon avec un master ; la finance paie bien.',
    },
    passerelles: ['Vers gestion/comptabilité', 'Vers écoles de commerce (CESAG, ISM)', 'Vers data/statistique'],
    tags: { matieres: ['economie', 'maths'], interets: ['business', 'social'], budget: 1, select: 2 },
  },
  gestion: {
    nom: 'Licence Gestion / Management', fac: 'seg', univs: ['ucad', 'ugb', 'uthies'],
    presentation: 'Entreprise, marketing, RH, stratégie : la voie royale vers le management et le commerce.',
    admission: 'Bac S ou L2 via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Comptabilité', 'Marketing', 'Management', 'Droit des affaires'],
    competences: ['Gérer un projet', 'Communiquer', 'Chiffrer'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Management', 'Master Marketing digital', 'Master RH', 'MBA plus tard'], metiers: ['Responsable marketing', 'Chargé de clientèle', 'Entrepreneur'], concours: [], secteurs: ['Toutes entreprises', 'Banques', 'Télécoms'], debouche: 'Très bon : toute entreprise a besoin de gestionnaires.' },
    passerelles: ['Vers écoles de commerce', 'Vers comptabilité/finance', 'Vers communication'],
    tags: { matieres: ['economie'], interets: ['business', 'social'], budget: 1, select: 1 },
  },
  compta: {
    nom: 'Licence Comptabilité & Finance', fac: 'seg', univs: ['ucad', 'uthies'],
    presentation: 'Comptabilité, fiscalité, audit : des métiers concrets et recherchés, vers l’expertise comptable.',
    admission: 'Bac S ou L2 via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Comptabilité générale', 'Fiscalité', 'Finance d’entreprise'],
    competences: ['Tenir des comptes', 'Auditer', 'Maîtriser les normes'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master CCA (comptabilité, contrôle, audit)', 'Master Finance'], metiers: ['Comptable', 'Auditeur', 'Contrôleur de gestion'], concours: [], secteurs: ['Cabinets d’audit', 'Entreprises', 'État'], debouche: 'Excellent : pénurie de comptables qualifiés.' },
    passerelles: ['Vers expertise comptable', 'Vers écoles de commerce'],
    tags: { matieres: ['maths', 'economie'], interets: ['business'], budget: 1, select: 1 },
  },
  droit: {
    nom: 'Licence Droit', fac: 'fsjp', univs: ['ucad', 'ugb'],
    presentation: 'Droit civil, pénal, des affaires : vers le barreau, le notariat, la magistrature, la fonction publique.',
    admission: 'Bac L ou S via Campusen', duree: '3 ans', difficulte: 3,
    matieres: ['Droit civil', 'Droit pénal', 'Droit constitutionnel', 'Culture juridique'],
    competences: ['Argumenter', 'Rédiger', 'Analyser des textes'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Droit des affaires', 'Master Droit public', 'CRFPA (barreau)'], metiers: ['Avocat', 'Juriste d’entreprise', 'Magistrat', 'Notaire'], concours: ['CRFPA', 'École de la magistrature', 'Douanes/impôts'], secteurs: ['Cabinets', 'Entreprises', 'Justice'], debouche: 'Bon mais compétitif : le master et le concours font la différence.' },
    passerelles: ['Vers sciences politiques', 'Vers écoles de commerce (droit des affaires)', 'Vers administration publique'],
    tags: { matieres: ['francais', 'histoire-geographie'], interets: ['social', 'droit'], budget: 1, select: 2 },
  },
  scpo: {
    nom: 'Licence Sciences Politiques', fac: 'fsjp', univs: ['ucad'],
    presentation: 'Politique, relations internationales, diplomatie : vers les ONG, les institutions, la diplomatie.',
    admission: 'Bac L ou S via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Science politique', 'Relations internationales', 'Économie politique'],
    competences: ['Analyser', 'Discourir', 'Négocier'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Relations internationales', 'Master Diplomatie'], metiers: ['Diplomate', 'Chargé de projets ONG', 'Analyste politique'], concours: ['Concours diplomatie'], secteurs: ['Affaires étrangères', 'ONG', 'Institutions internationales'], debouche: 'Sélectif mais réel via les concours.' },
    passerelles: ['Vers droit', 'Vers journalisme (CESTI)', 'Vers communication'],
    tags: { matieres: ['histoire-geographie', 'francais'], interets: ['social', 'droit'], budget: 1, select: 2 },
  },
  lettres: {
    nom: 'Licence Lettres modernes', fac: 'flash', univs: ['ucad', 'ugb'],
    presentation: 'Littérature, langue, rédaction : vers l’enseignement, l’édition, le journalisme, la communication.',
    admission: 'Bac L via Campusen', duree: '3 ans', difficulte: 1,
    matieres: ['Littérature', 'Grammaire', 'Rédaction'],
    competences: ['Écrire', 'Analyser', 'Corriger'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Lettres', 'Master Communication', 'Masters journalisme'], metiers: ['Enseignant', 'Rédacteur', 'Community manager', 'Éditeur'], concours: ['FASTEF (enseignement)'], secteurs: ['Éducation', 'Médias', 'Agences'], debouche: 'Correct avec des compétences numériques ajoutées.' },
    passerelles: ['Vers journalisme (CESTI)', 'Vers communication/marketing', 'Vers droit (avec dossier)'],
    tags: { matieres: ['francais'], interets: ['creatif', 'social'], budget: 1, select: 1 },
  },
  anglais: {
    nom: 'Licence Anglais (LLCE)', fac: 'flash', univs: ['ucad', 'ugb'],
    presentation: 'Langue, civilisations, traduction : l’anglais ouvre l’international, le tourisme, l’enseignement.',
    admission: 'Bac L ou S via Campusen', duree: '3 ans', difficulte: 1,
    matieres: ['Anglais', 'Civilisations', 'Traduction'],
    competences: ['Parler', 'Traduire', 'S’ouvrir à l’international'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Traduction', 'Master Enseignement', 'Master Tourisme'], metiers: ['Traducteur', 'Enseignant', 'Guide/agent tourisme', 'Chargé de clientèle internationale'], concours: ['FASTEF'], secteurs: ['Tourisme', 'Éducation', 'Entreprises internationales'], debouche: 'Bon : l’anglais est un multiplicateur de carrière.' },
    passerelles: ['Vers communication', 'Vers tourisme/hôtellerie (ENFHT)', 'Vers journalisme'],
    tags: { matieres: ['anglais'], interets: ['social', 'voyage'], budget: 1, select: 1 },
  },
  geo: {
    nom: 'Licence Géographie & Aménagement', fac: 'flash', univs: ['ucad', 'ugb'],
    presentation: 'Territoires, cartographie, SIG : l’urbanisation du Sénégal crée une vraie demande.',
    admission: 'Bac L ou S via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Géographie', 'Cartographie', 'SIG'],
    competences: ['Cartographier', 'Analyser des territoires'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master SIG', 'Master Aménagement'], metiers: ['Géomaticien', 'Urbaniste', 'Chargé d’études territoriales'], concours: [], secteurs: ['Collectivités', 'Bureaux d’études', 'ONG'], debouche: 'Bon niche : les SIG recrutent.' },
    passerelles: ['Vers environnement', 'Vers urbanisme/BTP'],
    tags: { matieres: ['histoire-geographie'], interets: ['nature', 'terrain'], budget: 1, select: 1 },
  },
  socio: {
    nom: 'Licence Sociologie', fac: 'flash', univs: ['ucad'],
    presentation: 'Enquêtes, sociétés, comportements : vers les études, les ONG, les RH.',
    admission: 'Bac L via Campusen', duree: '3 ans', difficulte: 2,
    matieres: ['Sociologie', 'Anthropologie', 'Méthodes d’enquête'],
    competences: ['Enquêter', 'Analyser le social'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Sociologie', 'Master RH', 'Master Développement'], metiers: ['Chargé d’études', 'Chargé de projets ONG', 'RH'], concours: [], secteurs: ['ONG', 'Instituts de sondage', 'Entreprises'], debouche: 'Moyen ; fort combiné à des méthodes quantitatives.' },
    passerelles: ['Vers RH/gestion', 'Vers communication'],
    tags: { matieres: ['philosophie', 'histoire-geographie'], interets: ['social'], budget: 1, select: 1 },
  },
  psy: {
    nom: 'Licence Psychologie', fac: 'flash', univs: ['ucad'],
    presentation: 'Cognition, clinique, sociale : vers les masters de psycho, les RH, le social.',
    admission: 'Bac L ou S via Campusen (sélectif)', duree: '3 ans', difficulte: 2,
    matieres: ['Psychologie', 'Neurosciences', 'Statistiques'],
    competences: ['Écouter', 'Analyser', 'Accompagner'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['Master Psychologie clinique', 'Master Psychologie du travail'], metiers: ['Psychologue (après master)', 'Chargé RH'], concours: [], secteurs: ['Santé', 'Social', 'Entreprises'], debouche: 'Nécessite le master ; demande croissante en santé mentale.' },
    passerelles: ['Vers RH', 'Vers sciences de l’éducation'],
    tags: { matieres: ['philosophie', 'svt'], interets: ['sante', 'social'], budget: 1, select: 2 },
  },
  medecine: {
    nom: 'Médecine / Pharmacie (FMPOS)', fac: 'fmpos', univs: ['ucad'],
    presentation: 'Le parcours long et sélectif : 7 ans et plus, concours d’entrée, métier à vie.',
    admission: 'Bac S mention Bien + concours', duree: '7 ans et +', difficulte: 3,
    matieres: ['Anatomie', 'Physiologie', 'Semiologie'],
    competences: ['Soigner', 'Décider', 'Résister'],
    frais: '≈ 25 000 F/an (public)',
    apres: { masters: ['Spécialités (internat)', 'Résidanat'], metiers: ['Médecin', 'Pharmacien', 'Chirurgien-dentiste'], concours: ['Concours FMPOS', 'Internat'], secteurs: ['Hôpitaux', 'Cliniques', 'Industrie pharma'], debouche: 'Excellent et valorisé, mais long.' },
    passerelles: ['Vers santé publique', 'Vers biologie si réorientation'],
    tags: { matieres: ['svt', 'physique', 'chimie'], interets: ['sante'], budget: 1, select: 3 },
  },
  ens: {
    nom: 'Licence + FASTEF (Enseignement)', fac: 'fastef', univs: ['ucad'],
    presentation: 'Devenir professeur certifié : licence disciplinaire puis concours FASTEF.',
    admission: 'Bac + licence puis concours', duree: '3+2 ans', difficulte: 2,
    matieres: ['Didactique', 'Pédagogie', 'Discipline choisie'],
    competences: ['Transmettre', 'Organiser', 'Évaluer'],
    frais: '≈ 25 000 F/an',
    apres: { masters: ['CAEM/CAES via FASTEF'], metiers: ['Professeur collège/lycée', 'Inspecteur (avec expérience)'], concours: ['Concours FASTEF'], secteurs: ['Éducation nationale', 'Privé'], debouche: 'Stable : recrutement public régulier.' },
    passerelles: ['Vers masters disciplinaires', 'Vers formation/communication'],
    tags: { matieres: ['francais', 'maths'], interets: ['social'], budget: 1, select: 2 },
  },
};

/* ---------------------------------- ÉCOLES ---------------------------------- */
export const DOMAINES_ECOLES = [
  { id: 'info', nom: 'Informatique & Numérique', img: '/metiers/info.jpg' },
  { id: 'sante', nom: 'Santé & Social', img: '/metiers/soins.jpg' },
  { id: 'commerce', nom: 'Commerce & Gestion', img: '/metiers/finance.jpg' },
  { id: 'com', nom: 'Communication & Médias', img: '/metiers/media.jpg' },
  { id: 'genie', nom: 'Génie & Industrie', img: '/metiers/energie.jpg' },
  { id: 'compta', nom: 'Comptabilité & Finance', img: '/metiers/data.jpg' },
  { id: 'droit', nom: 'Droit & Administration', img: '/metiers/juriste.jpg' },
  { id: 'btp', nom: 'BTP & Travaux publics', img: '/metiers/chantier.jpg' },
  { id: 'transport', nom: 'Transport & Logistique', img: '/metiers/mer.jpg' },
  { id: 'tourisme', nom: 'Tourisme & Hôtellerie', img: '/metiers/tourisme.jpg' },
];

export const ECOLES = [
  { id: 'esp', domaine: 'genie', nom: 'ESP — École Supérieure Polytechnique', ville: 'Dakar (UCAD)', diplome: 'Diplôme d’ingénieur (Bac+5)', duree: '5 ans', admission: 'Concours post-Bac S', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 250 000 F/an', masters: ['Masters ingénierie', 'Doctorat'], debouches: 'Ingénieur génie civil, élec, télécoms, informatique', metiers: ['Ingénieur', 'Chef de projet'], select: 3, budget: 1, interets: ['sciences', 'terrain'], img: '/metiers/energie.jpg' },
  { id: 'ept', domaine: 'genie', nom: 'EPT — École Polytechnique de Thiès', ville: 'Thiès', diplome: 'Ingénieur / technicien supérieur', duree: '3-5 ans', admission: 'Concours (Bac S)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 200 000 F/an', masters: ['Spécialisations ingénierie'], debouches: 'BTP, industrie, telecoms', metiers: ['Ingénieur travaux', 'Ingénieur industriel'], select: 3, budget: 1, interets: ['sciences', 'terrain'], img: '/metiers/chantier.jpg' },
  { id: 'ensut', domaine: 'genie', nom: 'ENSUT — Numérique & Télécoms', ville: 'Dakar', diplome: 'Licence pro / ingénieur', duree: '3-5 ans', admission: 'Concours/dossier (Bac S)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 300 000 F/an', masters: ['Masters télécoms & réseaux'], debouches: 'Opérateurs télécoms, infrastructures numériques', metiers: ['Ingénieur télécoms', 'Admin réseaux'], select: 2, budget: 1, interets: ['data', 'sciences'], img: '/metiers/info.jpg' },
  { id: 'ensae', domaine: 'compta', nom: 'ENSAE — Statistique & Économie appliquée', ville: 'Dakar', diplome: 'Ingénieur statisticien (Bac+4/5)', duree: '4 ans', admission: 'Concours (Bac S, niveau élevé)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 200 000 F/an', masters: ['Actuariat', 'Data science'], debouches: 'Banques, BCEAO, instituts de statistique', metiers: ['Statisticien', 'Actuaire', 'Data analyst'], select: 3, budget: 1, interets: ['data', 'business'], img: '/metiers/data.jpg' },
  { id: 'cesag', domaine: 'commerce', nom: 'CESAG — Management & Gestion', ville: 'Dakar', diplome: 'Licence/Master en gestion (Bac+3 à 5)', duree: '3-5 ans', admission: 'Concours/dossier', fraisInscription: '≈ 150 000 F', fraisScolarite: '≈ 1 500 000 F/an', masters: ['MBA', 'Masters finance/marketing'], debouches: 'Banques, multinationales, cabinets', metiers: ['Manager', 'Consultant', 'Analyste financier'], select: 2, budget: 3, interets: ['business'], img: '/metiers/finance.jpg' },
  { id: 'ism', domaine: 'commerce', nom: 'ISM — Institut Supérieur de Management', ville: 'Dakar', diplome: 'Licence/Master (Bac+3 à 5)', duree: '3-5 ans', admission: 'Dossier + entretien', fraisInscription: '≈ 100 000 F', fraisScolarite: '≈ 900 000 F/an', masters: ['Masters management/marketing'], debouches: 'Entreprises, banques, entrepreneuriat', metiers: ['Chargé de marketing', 'Gestionnaire'], select: 1, budget: 2, interets: ['business', 'social'], img: '/metiers/finance.jpg' },
  { id: 'iam', domaine: 'info', nom: 'IAM / Sup’Imax — Informatique privée', ville: 'Dakar', diplome: 'Licence pro / Master (Bac+3 à 5)', duree: '3-5 ans', admission: 'Dossier (Bac S/L)', fraisInscription: '≈ 100 000 F', fraisScolarite: '≈ 800 000 F/an', masters: ['Masters numériques'], debouches: 'Développement, réseaux, data', metiers: ['Développeur', 'Admin systèmes'], select: 1, budget: 2, interets: ['data', 'creatif'], img: '/metiers/info.jpg' },
  { id: 'cesti', domaine: 'com', nom: 'CESTI — Journalisme & Communication', ville: 'Dakar (UCAD)', diplome: 'Licence/Master journalisme', duree: '3-4 ans', admission: 'Concours (tous Bacs, sélectif)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 150 000 F/an', masters: ['Masters journalisme/communication'], debouches: 'Médias, agences, institutions', metiers: ['Journaliste', 'Chargé de communication'], select: 3, budget: 1, interets: ['creatif', 'social'], img: '/metiers/media.jpg' },
  { id: 'isic', domaine: 'com', nom: 'ISIC — Communication & médias (privé)', ville: 'Dakar', diplome: 'Licence pro', duree: '3 ans', admission: 'Dossier', fraisInscription: '≈ 100 000 F', fraisScolarite: '≈ 700 000 F/an', masters: ['Masters communication'], debouches: 'Agences, community management', metiers: ['Community manager', 'Attaché de presse'], select: 1, budget: 2, interets: ['creatif', 'social'], img: '/metiers/media.jpg' },
  { id: 'endss', domaine: 'sante', nom: 'ENDSS — Infirmiers & sages-femmes', ville: 'Dakar', diplome: 'Diplôme d’État (infirmier/sage-femme)', duree: '3 ans', admission: 'Concours (Bac S)', fraisInscription: '—', fraisScolarite: 'Formation publique (bourses possibles)', masters: ['Spécialisations santé'], debouches: 'Hôpitaux, centres de santé, ONG', metiers: ['Infirmier·ère', 'Sage-femme'], select: 3, budget: 1, interets: ['sante', 'social'], img: '/metiers/soins.jpg' },
  { id: 'enfht', domaine: 'tourisme', nom: 'ENFHT — Tourisme & Hôtellerie', ville: 'Dakar', diplome: 'Licence pro tourisme/hôtellerie', duree: '3 ans', admission: 'Concours/dossier', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 200 000 F/an', masters: ['Masters tourisme'], debouches: 'Hôtels, agences, aéroport', metiers: ['Manager hôtelier', 'Agent de voyage'], select: 2, budget: 1, interets: ['voyage', 'social'], img: '/metiers/tourisme.jpg' },
  { id: 'ebad', domaine: 'droit', nom: 'EBAD — Bibliothèques & archives', ville: 'Dakar (UCAD)', diplome: 'Licence/Master documentation', duree: '3-5 ans', admission: 'Concours/dossier', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 100 000 F/an', masters: ['Masters gestion de l’information'], debouches: 'Bibliothèques, centres de doc, data', metiers: ['Documentaliste', 'Archiviste'], select: 2, budget: 1, interets: ['social', 'creatif'], img: '/metiers/lettres.jpg' },
  { id: 'encr', domaine: 'droit', nom: 'ENCR — Administration & gestion publique (Bambey)', ville: 'Bambey', diplome: 'Licence administration', duree: '3 ans', admission: 'Concours', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 100 000 F/an', masters: ['Masters administration'], debouches: 'Fonction publique, collectivités', metiers: ['Administrateur', 'Gestionnaire public'], select: 2, budget: 1, interets: ['droit', 'social'], img: '/metiers/juriste.jpg' },
  { id: 'inseps', domaine: 'sante', nom: 'INSEPS — Sport & éducation physique', ville: 'Dakar (UCAD)', diplome: 'Licence/Master STAPS', duree: '3-5 ans', admission: 'Concours (tests physiques)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 100 000 F/an', masters: ['Masters entraînement'], debouches: 'Enseignement sport, clubs, fédération', metiers: ['Prof de sport', 'Entraîneur'], select: 2, budget: 1, interets: ['terrain', 'social'], img: '/metiers/campus.jpg' },
  { id: 'logistique', domaine: 'transport', nom: 'Formations Logistique & Portuaire', ville: 'Dakar/Thiès', diplome: 'Licence pro logistique', duree: '3 ans', admission: 'Dossier (Bac S/L)', fraisInscription: '≈ 100 000 F', fraisScolarite: '≈ 600 000 F/an', masters: ['Masters supply chain'], debouches: 'Port de Dakar, transitaires, entrepôts', metiers: ['Logisticien', 'Agent de transit'], select: 1, budget: 2, interets: ['business', 'terrain'], img: '/metiers/mer.jpg' },
  { id: 'btpEcole', domaine: 'btp', nom: 'ENSTP / écoles BTP', ville: 'Dakar/Thiès', diplome: 'Technicien supérieur / ingénieur travaux', duree: '2-5 ans', admission: 'Concours/dossier (Bac S)', fraisInscription: '≈ 50 000 F', fraisScolarite: '≈ 200 000 F/an', masters: ['Ingénierie civile'], debouches: 'Chantiers, bureaux de contrôle, routes', metiers: ['Conducteur de travaux', 'Métreur'], select: 2, budget: 1, interets: ['terrain', 'sciences'], img: '/metiers/chantier.jpg' },
];

/* ------------------------- FORMATIONS PROFESSIONNELLES ------------------------- */
export const PRO = [
  { id: 'bts', nom: 'BTS (2 ans)', duree: '2 ans', admission: 'Bac (dossier)', cout: 'Public ≈ 50 000 F/an · privé 300-800 000 F/an', diplome: 'Brevet de Technicien Supérieur', debouches: 'Emploi rapide : gestion, info, élec, tourisme…', passerelle: 'Licence pro puis master possibles', metiers: ['Technicien supérieur', 'Assistant gestion'], tags: { budget: 1, select: 1, interets: ['business', 'terrain'] } },
  { id: 'dut', nom: 'DUT (2-3 ans)', duree: '2-3 ans', admission: 'Bac S (dossier/concours)', cout: '≈ 50 000 F/an (IUT publics)', diplome: 'Diplôme Universitaire de Technologie', debouches: 'Technicien en industrie, réseaux, génie civil', passerelle: 'Licence puis écoles d’ingénieurs', metiers: ['Technicien', 'Assistant ingénieur'], tags: { budget: 1, select: 2, interets: ['sciences', 'terrain'] } },
  { id: 'licpro', nom: 'Licence professionnelle (1 an après BTS/DUT)', duree: '1 an', admission: 'Bac+2', cout: 'Variable', diplome: 'Licence pro (Bac+3)', debouches: 'Spécialisation directe emploi', passerelle: 'Master possible sur dossier', metiers: ['Spécialiste métier'], tags: { budget: 1, select: 2, interets: ['business', 'data'] } },
  { id: 'certif', nom: 'Certifications métiers (numérique, langues)', duree: '3-12 mois', admission: 'Aucun/Motivation', cout: '0 à 500 000 F', diplome: 'Certifications (Cisco, Google, AWS…)', debouches: 'Complètent un diplôme, freelance', passerelle: 'Portfolio → emplois tech', metiers: ['Technicien certifié', 'Freelance'], tags: { budget: 2, select: 1, interets: ['data', 'creatif'] } },
];

/* ---------------------------------- CONCOURS ---------------------------------- */
export const CONCOURS = [
  { id: 'ingenieur', nom: 'Concours écoles d’ingénieurs (ESP/EPT/ENSUT)', preparation: 'Bac S + prépa personnelle (maths/physique)', dureeApres: '5 ans', metiers: ['Ingénieur'], conseil: 'Révise maths & physique de Première/Terminale : c’est 80 % du concours.' },
  { id: 'sante', nom: 'Concours santé (FMPOS, ENDSS)', preparation: 'Bac S mention + SVT/physique/chimie', dureeApres: '3-7 ans', metiers: ['Médecin', 'Infirmier·ère'], conseil: 'Les places sont chères : entraîne-toi aux QCM dès la Première.' },
  { id: 'admin', nom: 'Concours administration (ENA/ENAM)', preparation: 'Bac+2/+3 puis concours', dureeApres: '2-3 ans', metiers: ['Administrateur civil', 'Gestionnaire public'], conseil: 'Solide en droit et culture générale.' },
  { id: 'enseignement', nom: 'Concours enseignement (FASTEF/CRFPE)', preparation: 'Licence disciplinaire puis concours', dureeApres: '2 ans', metiers: ['Professeur'], conseil: 'Choisis une licence dans ta matière forte.' },
  { id: 'journalisme', nom: 'Concours CESTI', preparation: 'Tous Bacs — culture générale + français', dureeApres: '3-4 ans', metiers: ['Journaliste'], conseil: 'Lis la presse chaque semaine dès maintenant.' },
  { id: 'vet', nom: 'Concours vétérinaire (EISMV)', preparation: 'Bac S + concours régional', dureeApres: '5-6 ans', metiers: ['Vétérinaire'], conseil: 'Concours commun africain : vise l’excellence en SVT.' },
];

/* ---------------------------------- ÉTRANGER ---------------------------------- */
export const ETRANGER = [
  { id: 'france', nom: 'France (Campus France)', budget: '≈ 3-6 millions F/an (frais + vie)', conditions: 'Dossier Campus France, TCF, parfois visa étudiant', atouts: 'Grand choix de licences/masters, bourses possibles', vigilance: 'Frais élevés hors UE ; prépare le budget et le logement.', metiers: ['Tous, avec retour valorisé'] },
  { id: 'maroc', nom: 'Maroc', budget: '≈ 1,5-3 millions F/an', conditions: 'Dossiers universités/écoles, bourses d’excellence', atouts: 'Proximité, bonnes écoles d’ingénieurs et de commerce', vigilance: 'Comparer les équivalences de diplômes.', metiers: ['Ingénieur', 'Manager'] },
  { id: 'canada', nom: 'Canada (Québec)', budget: '≈ 8-12 millions F/an', conditions: 'Admission + preuve financière + CAQ/visa', atouts: 'Immigration possible après les études', vigilance: 'Coût élevé ; planifie 1-2 ans à l’avance.', metiers: ['Tech, santé, gestion'] },
  { id: 'turquie', nom: 'Turquie (bourses Türkiye)', budget: 'Bourse souvent complète', conditions: 'Dossier + entretien, bourses du gouvernement', atouts: 'Bourses couvrant frais + logement', vigilance: 'Apprendre le turc la 1ʳᵉ année.', metiers: ['Selon filière'] },
];

/* ---------------------------------- TRAVAIL ---------------------------------- */
export const TRAVAIL = [
  { nom: 'Entrepreneuriat / commerce', desc: 'Lancer une activité (boutique, e-commerce, services) dès le Bac.', atout: 'Revenus immédiats, apprentissage terrain', risque: 'Reprends des cours du soir pour sécuriser (licence à distance).', passerelle: 'Licence pro / écoles de commerce en cours du soir' },
  { nom: 'Métiers du numérique en autodidacte', desc: 'Développement, design, community management via projets + certifications.', atout: 'Le portfolio compte plus que le diplôme', risque: 'Discipline exigée ; vise des certifications reconnues.', passerelle: 'Licence pro informatique sur dossier' },
  { nom: 'Armée / gendarmerie / douanes', desc: 'Concours accessibles avec le Bac ; carrière + formation continue.', atout: 'Stabilité, logement, progression', risque: 'Engagement et mobilité.', passerelle: 'Concours internes vers grades et écoles' },
  { nom: 'Emploi + université du soir', desc: 'Travailler et préparer une licence en parallèle.', atout: 'Expérience + diplôme', risque: 'Charge lourde : choisis un emploi compatible.', passerelle: 'Master possible ensuite' },
];

/* ------------------------- PASSERELLES GÉNÉRIQUES ------------------------- */
export const PASSERELLES_GLOBALES = [
  { de: 'BTS / DUT', vers: 'Licence pro puis Licence → Master', note: 'Le chemin classique de la voie courte vers le Bac+5.' },
  { de: 'Licence A', vers: 'Master B (dossier)', note: 'Changer de spécialité en master est courant si la licence est solide.' },
  { de: 'Licence universitaire', vers: 'Écoles de commerce/ingénieurs (admissions parallèles)', note: 'Beaucoup d’écoles recrutent à Bac+2/+3.' },
  { de: 'Emploi', vers: 'Licence du soir / VAE', note: 'L’expérience peut valider des années d’études (VAE).' },
  { de: 'Étranger', vers: 'Retour Sénégal (équivalences)', note: 'Vérifie les équivalences CAMES avant de partir.' },
];

/* Moteur « Trouver mon parcours » : score entre le profil et la formation. */
export function scoreFormation(profil, tags) {
  let s = 0;
  for (const m of profil.matieres) if (tags.matieres?.includes(m)) s += 2;
  for (const i of profil.interets) if (tags.interets?.includes(i)) s += 2;
  if (profil.budget >= tags.budget) s += 1;
  else s -= 2;
  const niveau = { faible: 1, bon: 2, excellent: 3 }[profil.niveau] || 2;
  if (tags.select <= niveau) s += 1;
  return s;
}

export const INTERETS = [
  { id: 'data', label: 'Chiffres & data' },
  { id: 'creatif', label: 'Créativité & médias' },
  { id: 'social', label: 'Aider les gens' },
  { id: 'business', label: 'Business & argent' },
  { id: 'sante', label: 'Santé' },
  { id: 'sciences', label: 'Sciences & technique' },
  { id: 'terrain', label: 'Travail de terrain' },
  { id: 'voyage', label: 'International & voyage' },
  { id: 'droit', label: 'Justice & droit' },
  { id: 'nature', label: 'Nature & environnement' },
];
