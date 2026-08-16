const { hashPassword, generateEleveId } = require('./security');
const { writeDemoPdfs } = require('./demo-pdf');
const { UPLOADS_DIR } = require('./paths');

const CLASSES = {
  S2: ['Seconde S2', 'Première S2', 'Terminale S2'],
  L2: ['Seconde L2', 'Première L2', 'Terminale L2'],
};

function seed(db, log = console.log) {
  const result = { createdIds: [], admins: [] };

  /* ---------------- Admins (avec nom affiché + périmètre de filière) ---------------- */
  // Comptes officiels : aliou = accès total ; abou = S2 ; moustapha = arabe ;
  // mouhamed = L2. Mise à jour idempotente (mot de passe + périmètre).
  const ADMINS = [
    { username: 'aliou', password: 'balet05', display: 'Aliou Sow (fondateur, accès total)', filiere: 'all' },
    { username: 'abou', password: 'tounkara04', display: 'Abou (responsable S2)', filiere: 'S2' },
    { username: 'moustapha', password: 'ndiaye2026', display: 'Moustapha Ndiaye (prof d’arabe)', filiere: 'AR' },
    { username: 'mouhamed', password: 'pelo07', display: 'Mouhamed Sy Sow (responsable L2)', filiere: 'L2' },
  ];
  const upAdmin = db.prepare('UPDATE admins SET password_hash = ?, display_name = ?, filiere = ? WHERE username = ?');
  const insAdmin = db.prepare('INSERT INTO admins (username, password_hash, display_name, filiere) VALUES (?, ?, ?, ?)');
  for (const a of ADMINS) {
    const r = upAdmin.run(hashPassword(a.password), a.display, a.filiere, a.username);
    if (r.changes === 0) {
      insAdmin.run(a.username, hashPassword(a.password), a.display, a.filiere);
      log(`[seed] Compte admin « ${a.username} » (${a.filiere}) créé.`);
    }
  }
  // Compte direction supplémentaire via variables d'environnement (Render).
  if (process.env.ADMIN1_USERNAME) {
    const exists = db.prepare('SELECT 1 FROM admins WHERE username = ?').get(process.env.ADMIN1_USERNAME);
    if (!exists) {
      insAdmin.run(
        process.env.ADMIN1_USERNAME,
        hashPassword(process.env.ADMIN1_PASSWORD || 'Admin#S2-2026'),
        'Direction',
        'all'
      );
    }
  }
  result.admins = ADMINS.map((a) => ({ username: a.username, password: a.password }));

  /* ---------------- Élèves de démonstration (S2 + L2) ---------------- */
  if (db.prepare("SELECT COUNT(*) c FROM eleves WHERE filiere = 'S2'").get().c === 0) {
    const demo = [
      { prenom: 'Awa', nom: 'Diop', classe: 'Terminale S2', filiere: 'S2' },
      { prenom: 'Moussa', nom: 'Ndiaye', classe: 'Terminale S2', filiere: 'S2' },
      { prenom: 'Fatou', nom: 'Sarr', classe: 'Première S2', filiere: 'S2' },
    ];
    const ins = db.prepare('INSERT INTO eleves (eleve_id, nom, prenom, classe, filiere) VALUES (?, ?, ?, ?, ?)');
    for (const d of demo) {
      let id;
      do {
        id = generateEleveId();
      } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ?').get(id));
      ins.run(id, d.nom, d.prenom, d.classe, d.filiere);
      result.createdIds.push({ id, ...d });
    }
    log('[seed] Élèves de démonstration S2 créés.');
  }
  if (db.prepare("SELECT COUNT(*) c FROM eleves WHERE filiere = 'L2'").get().c === 0) {
    const demo = [
      { prenom: 'Aminata', nom: 'Ba', classe: 'Terminale L2', filiere: 'L2' },
      { prenom: 'Ibrahima', nom: 'Fall', classe: 'Première L2', filiere: 'L2' },
    ];
    const ins = db.prepare('INSERT INTO eleves (eleve_id, nom, prenom, classe, filiere) VALUES (?, ?, ?, ?, ?)');
    for (const d of demo) {
      let id;
      do {
        id = generateEleveId();
      } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ?').get(id));
      ins.run(id, d.nom, d.prenom, d.classe, d.filiere);
      result.createdIds.push({ id, ...d });
    }
    log('[seed] Élèves de démonstration L2 créés :');
    for (const e of result.createdIds.filter((x) => x.filiere === 'L2')) log(`   ${e.prenom} ${e.nom} (${e.classe}) -> ${e.id}`);
  }
  if (db.prepare("SELECT COUNT(*) c FROM eleves WHERE filiere = 'AR'").get().c === 0) {
    const demo = [
      { prenom: 'Khady', nom: 'Gueye', classe: 'Niveau 1', filiere: 'AR' },
      { prenom: 'Omar', nom: 'Sow', classe: 'Niveau 2', filiere: 'AR' },
    ];
    const ins = db.prepare('INSERT INTO eleves (eleve_id, nom, prenom, classe, filiere) VALUES (?, ?, ?, ?, ?)');
    for (const d of demo) {
      let id;
      do {
        id = generateEleveId();
      } while (db.prepare('SELECT 1 FROM eleves WHERE eleve_id = ?').get(id));
      ins.run(id, d.nom, d.prenom, d.classe, d.filiere);
      result.createdIds.push({ id, ...d });
    }
    log('[seed] Élèves de démonstration Arabe créés (niveaux 1 et 2).');
  }

  /* ---------------- Cours S2 (base vierge) ---------------- */
  // Migration douce : la S2 a désormais Physique et Chimie séparées.
  db.prepare("UPDATE cours SET matiere = 'physique' WHERE filiere = 'S2' AND matiere = 'physique-chimie'").run();
  if (db.prepare('SELECT COUNT(*) c FROM cours').get().c === 0) {
    const cours = [
      { titre: 'Tableaux de signes – méthode complète', matiere: 'maths', youtube_id: '50CByVTP4ig', description: 'Dresser et lire un tableau de signes : la méthode pas à pas avec des exemples corrigés.' },
      { titre: 'Les puissances – cours et exercices', matiere: 'maths', youtube_id: '-1BqL1zNN3Y', description: 'Définition, propriétés de calcul et exercices sur les puissances.' },
      { titre: 'Les fonctions numériques (cours complet)', matiere: 'maths', pdf_file: 'maths/fonctions-numeriques.pdf', description: 'Définitions, domaine de définition, images et antécédents, sens de variation.' },
      { titre: 'Modélisation d’une action par une force', matiere: 'physique-chimie', youtube_id: 'QR6YVz2-ocg', description: 'Caractéristiques d’une force, schéma bilan et exemples du quotidien.' },
      { titre: 'Le principe de l’inertie', matiere: 'physique-chimie', youtube_id: 'UvdBNvLpPbc', description: 'Première loi de Newton, choix du référentiel et exercices types.' },
      { titre: 'L’énergie mécanique (cours + exercices)', matiere: 'physique-chimie', pdf_file: 'physique-chimie/energie-mecanique.pdf', description: 'Énergie cinétique, énergie potentielle de pesanteur et conservation.' },
      { titre: 'Les figures de style – les repérer facilement', matiere: 'francais', youtube_id: 'GSsUDhhJgVs', description: 'La méthode pour identifier à coup sûr les figures de style le jour du Bac.' },
      { titre: 'Fiche – Les figures de style essentielles', matiere: 'francais', pdf_file: 'francais/figures-de-style.pdf', description: 'Fiche de révision : comparaison, métaphore, hyperbole, anaphore, oxymore…' },
      { titre: 'Guerre froide : bipolarisation et crises (1945-1975)', matiere: 'histoire-geographie', youtube_id: 'iNFcDuHMZlw', description: 'Le monde bipolaire, la crise de Berlin, Cuba et les grandes crises de la Guerre froide.' },
      { titre: 'Fiche – La décolonisation en Afrique', matiere: 'histoire-geographie', pdf_file: 'histoire-geographie/decolonisation.pdf', description: 'Repères chronologiques, grands acteurs et conséquences de la décolonisation.' },
    ];
    const ins = db.prepare(
      'INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre, filiere) VALUES (@titre, @matiere, @description, @youtube_id, @pdf_file, @ordre, @filiere)'
    );
    cours.forEach((c, i) => ins.run({ youtube_id: null, pdf_file: null, ...c, ordre: i + 1, filiere: 'S2' }));
    log(`[seed] ${cours.length} cours S2 créés.`);
  }

  /* ---------------- Cours L2 (ajoutés même sur base existante) ---------------- */
  if (db.prepare("SELECT COUNT(*) c FROM cours WHERE filiere = 'L2'").get().c === 0) {
    const cours = [
      { titre: 'Méthode de la dissertation philosophique', matiere: 'philosophie', pdf_file: 'philosophie/dissertation.pdf', description: 'Analyser le sujet, construire un plan dialectique, rédiger intro et conclusion.' },
      { titre: 'Le commentaire composé pas à pas', matiere: 'francais', pdf_file: 'francais/commentaire-compose.pdf', description: 'La méthode complète pour le jour du Bac : axes, procédés, effets.' },
      { titre: 'Les figures de style – les repérer facilement', matiere: 'francais', youtube_id: 'GSsUDhhJgVs', description: 'Vidéo indispensable pour enrichir vos commentaires composés.' },
      { titre: 'Fiche – La colonisation en Afrique', matiere: 'histoire-geographie', pdf_file: 'histoire-geographie/colonisation.pdf', description: 'Conquête, domination, résistances : l’essentiel du cours de L2.' },
      { titre: 'Guerre froide : bipolarisation et crises (1945-1975)', matiere: 'histoire-geographie', youtube_id: 'iNFcDuHMZlw', description: 'Le monde bipolaire et ses grandes crises, au programme de la filière Lettres.' },
      { titre: 'English – Essential vocabulary for the Bac', matiere: 'anglais', pdf_file: 'anglais/vocabulaire-bac.pdf', description: 'Le vocabulaire qui fait gagner des points à l’écrit comme à l’oral.' },
    ];
    const ins = db.prepare(
      'INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre, filiere) VALUES (@titre, @matiere, @description, @youtube_id, @pdf_file, @ordre, @filiere)'
    );
    cours.forEach((c, i) => ins.run({ youtube_id: null, pdf_file: null, ...c, ordre: i + 1, filiere: 'L2' }));
    const written = writeDemoPdfs(UPLOADS_DIR);
    if (written.length) log(`[seed] ${written.length} PDF générés.`);
    log(`[seed] ${cours.length} cours L2 créés.`);
  }

  /* ---------------- Filières universitaires (orientation S2 & L2) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM parcours_univ').get().c === 0) {
    const P = (cible, titre, intro, blocs) => ({ cible, titre, intro, blocs });
    const parcours = [
      P('L2', 'Droit et Sciences Politiques',
        "Le droit et la science politique forment aux métiers de la justice, de l'administration et du conseil. Après une licence à l'UCAD (FSJP) ou à l'UGB, ouvre-toi aux masters et écoles professionnelles.",
        "Droit Privé et Sciences Criminelles :\nAvocat (barreau judiciaire ou pénal);Notaire;Huissier de justice;Magistrat;Clerc de notaire;Juriste;Juriste en entreprise;Juriste en banque;Avocat en banque;Legal tech;Métiers du secteur privé;Juriste d'entreprise;Juriste en banque;Avocat en banque;Legal tech\nDroit Public et Administration :\nGreffier des tribunaux;Inspecteur du tribunal;Inspecteur des établissements pénitentiaires;Inspecteur des impôts;Inspecteur territorial;Commissaire de police;Officier de police;Gendarmerie;OMS;Collectivités territoriales;Juriste en droit public;Consultant en administration publique;Attaché territorial\nScience Politique et Relations Internationales :\nPolitologue;Diplomate;Analyste politique;Chargé de mission aux Nations Unies;Conseiller aux affaires étrangères (consul)"),
      P('L2', 'Lettres, Langues et Civilisations',
        "Les filières lettres développent une maîtrise rédactionnelle, une analyse textuelle et une communication publique recherchées dans tout le secteur culturel et numérique.",
        "Lettres Modernes / Lettres Classiques :\nÉcrivain;Enseignant;Rédacteur web;Éditeur;Correcteur;Relecteur;Concepteur-rédacteur en publicité;Biographe;Métiers de la culture;Critique littéraire;Animateur d'ateliers d'écriture;Médiateur culturel\nLangues Étrangères (Anglais, Espagnol, Arabe, Portugais…) :\nTraducteur littéraire;Traducteur technique;Interprète de conférence;Métiers du commerce international\nLangues Étrangères Appliquées (LEA) :\nAssistant en commerce international;Assistant trilingue;Chargé de clientèle internationale;Traducteur;Logisticien"),
      P('L2', 'Sciences Humaines et Sociales',
        "Ces filières étudient l'humain et la société : comprendre, enquêter, accompagner. Très utiles dans les ONG, les collectivités et la recherche.",
        "Sociologie et Anthropologie :\nChercheur en sociologie et anthropologie;Sociologue;Chargé d'études;Socio-économiste;Enquêteur en urbanisme\nMétiers du développement social et social :\nConsultant en développement communautaire;Assistant social;Chef de projet RSE (Responsabilité Sociétale des Entreprises);Médiateur social\nGéographie et Aménagement du Territoire :\nGéographe;Urbaniste;Cartographe;Analyste SIG;Enseignant d'histoire-géographie"),
      P('L2', 'Journalisme, Communication et Arts',
        "Informer et créer : presse, radio, TV, web, entreprises. Le CESTI de Dakar et les licences de communication sont les portes d'entrée classiques.",
        "Journalisme et médias :\nJournaliste presse écrite;Journaliste radio/TV;Présentateur;Reporter;Community manager\nCommunication et création :\nChargé de communication;Attaché de presse;Designer graphique;Photographe;Réalisateur;Métiers du cinéma et de l'audiovisuel"),
      P('S2', 'Sciences de la Santé',
        "Médecine, pharmacie, odontologie, maïeutique : des concours exigeants après le Bac S2, puis de longues études qui mènent à des métiers essentiels et respectés.",
        "Médecine et spécialités :\nMédecin généraliste;Chirurgien;Pédiatre;Cardiologue;Médecin militaire\nPharmacie et odontologie :\nPharmacien;Biologiste médical;Chirurgien-dentiste\nMaïeutique et soins :\nSage-femme;Infirmier d'État;Kinésithérapeute"),
      P('S2', 'Sciences et Technologies',
        "Mathématiques, physique, chimie, biologie, géologie : la voie des chercheurs, enseignants et ingénieurs, à l'UCAD, l'UGB ou en écoles (ESP, EPT, ENSA).",
        "Mathématiques et Physique :\nEnseignant-chercheur;Actuaire;Statisticien;Data scientist;Ingénieur d'études\nChimie, Biologie et Géologie :\nBiologiste;Chimiste;Géologue;Hydrologue;Technicien de laboratoire;Ingénieur agronome;Vétérinaire"),
      P('S2', 'Ingénierie et Numérique',
        "Les écoles d'ingénieurs (ESP, EPT, ESI, ENSUT) recrutent sur les profils S2 : bâtiments, énergie, réseaux, logiciel. Emploi rapide et salaires parmi les plus élevés.",
        "Génie civil et BTP :\nIngénieur civil;Technicien supérieur en génie civil;Architecte;Conducteur de travaux;Géomètre\nÉlectricité, télécoms et informatique :\nIngénieur électrotechnique;Ingénieur en télécommunications;Ingénieur en informatique;Développeur;Expert en cybersécurité"),
      P('S2', 'Économie, Gestion et Finance',
        "Comprendre l'argent, les marchés et les organisations : banques, assurances, entreprises et administrations recrutent massivement ces profils.",
        "Finance et gestion :\nExpert-comptable;Auditeur;Analyste financier;Banquier;Gestionnaire\nÉconomie et commerce :\nÉconomiste;Chargé d'études;Chef de produit;Entrepreneur;Cadre commercial"),
    ];
    const ins = db.prepare('INSERT INTO parcours_univ (cible, titre, intro, blocs) VALUES (@cible, @titre, @intro, @blocs)');
    for (const q of parcours) ins.run(q);
    log(`[seed] Orientation : ${parcours.length} filières universitaires (S2 & L2).`);
  }

  /* --------- Images des filières + bloc « Formations » (idempotent) --------- */
  const PIMG = {
    'Droit et Sciences Politiques': '/metiers/juriste.jpg',
    'Lettres, Langues et Civilisations': '/metiers/lettres.jpg',
    'Sciences Humaines et Sociales': '/metiers/campus.jpg',
    'Journalisme, Communication et Arts': '/metiers/media.jpg',
    'Sciences de la Santé': '/metiers/medecin.jpg',
    'Sciences et Technologies': '/metiers/labo.jpg',
    'Ingénierie et Numérique': '/metiers/info.jpg',
    'Économie, Gestion et Finance': '/metiers/finance.jpg',
    'Étudier à l’étranger : bourses & mobilité': '/metiers/ciel.jpg',
  };
  const upP = db.prepare('UPDATE parcours_univ SET image = ? WHERE titre = ?');
  for (const [t, img] of Object.entries(PIMG)) upP.run(img, t);

  /* Formations reconstruites par filière : logique (S2 = sciences, L2 = lettres). */
  db.prepare("DELETE FROM parcours_univ WHERE titre LIKE 'Grandes écoles%' OR titre LIKE 'BTS, DUT%'").run();
  const F = (cible, titre, intro, blocs, image) => ({ cible, titre, intro, blocs, image });
  const forms = [
    F('S2', 'Grandes écoles scientifiques & techniques',
      'Les écoles publiques d’excellence réservées aux Bac S2 : concours ou dossier, diplômes reconnus, emploi rapide.',
      "Ingénierie :\nESP Dakar (École Supérieure Polytechnique);EPT Thiès (École Polytechnique);ENSA Thiès (agronomie);ENSUT;Écoles d'ingénieurs privées reconnues\nSanté :\nFMPOS UCAD (médecine, pharmacie, dentaire);Facultés de médecine de Thiès et Ziguinchor;Écoles d'infirmiers et sages-femmes\nSciences, statistiques & gestion :\nENSAE Dakar (statistique, économie);Faculté des Sciences (licence-master);Institut Supérieur d'Informatique",
      '/metiers/campus.jpg'),
    F('L2', 'Grandes écoles littéraires, juridiques & médias',
      'Les écoles d’excellence réservées aux Bac L2 : droit, enseignement, journalisme, langues.',
      "Droit, science politique & administration :\nFSJP UCAD (licence-master droit);ENAM (administration publique);Centre des hautes études de sécurité\nEnseignement, lettres & langues :\nFASTEF (professeurs);FLASH UCAD (lettres, langues, histoire, géographie);École normale supérieure\nJournalisme, communication & interprétariat :\nCESTI Dakar (journalisme);École supérieure de journalisme et communication;Traduction-interprétariat (UCAD, instituts)",
      '/metiers/enseignant.jpg'),
    F('S2', 'BTS, DUT & licences pro scientifiques',
      '2 à 3 ans d’études pratiques pour les Bac S2, emploi rapide et passerelles vers licence/master.',
      "Industrie & BTP :\nDUT génie civil;BTS bâtiment;DUT génie électrique;DUT maintenance industrielle;Licence pro énergies renouvelables\nNumérique & data :\nBTS SIO (informatique);DUT réseaux & télécoms;Licence pro développement web;Licence pro statistique",
      '/metiers/ecole.jpg'),
    F('L2', 'BTS, DUT & licences pro tertiaires & créatives',
      '2 à 3 ans d’études pratiques pour les Bac L2 : commerce, tourisme, communication, design.',
      "Gestion, commerce & tourisme :\nBTS MCO (commerce);BTS comptabilité-gestion;BTS tourisme;DUT techniques de commercialisation;Licence pro banque-assurance\nCommunication, design & lettres :\nLicence pro communication digitale;Design graphique (écoles d'art);Métiers du livre et de l'édition;Community management",
      '/metiers/design.jpg'),
  ];
  const insF = db.prepare('INSERT INTO parcours_univ (cible, titre, intro, blocs, image) VALUES (@cible, @titre, @intro, @blocs, @image)');
  for (const f of forms) insF.run(f);
  log(`[seed] Orientation : ${forms.length} cartes « Formations » par filière (S2/L2).`);

  /* ---------------- Annales (sujets + corrigés) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM annales').get().c === 0) {
    const annales = [
      { filiere: 'S2', matiere: 'maths', annee: 2023, titre: 'Bac S2 2023 – Mathématiques', sujet_pdf: 'annales/s2-maths-2023-sujet.pdf', corrige_pdf: 'annales/s2-maths-2023-corrige.pdf' },
      { filiere: 'S2', matiere: 'physique-chimie', annee: 2022, titre: 'Bac S2 2022 – Physique-Chimie', sujet_pdf: 'annales/s2-pc-2022-sujet.pdf', corrige_pdf: 'annales/s2-pc-2022-corrige.pdf' },
      { filiere: 'L2', matiere: 'francais', annee: 2021, titre: 'Bac L2 2021 – Français', sujet_pdf: 'annales/l2-francais-2021-sujet.pdf', corrige_pdf: 'annales/l2-francais-2021-corrige.pdf' },
      { filiere: 'L2', matiere: 'philosophie', annee: 2024, titre: 'Bac L2 2024 – Philosophie', sujet_pdf: 'annales/l2-philo-2024-sujet.pdf', corrige_pdf: 'annales/l2-philo-2024-corrige.pdf' },
    ];
    const ins = db.prepare('INSERT INTO annales (filiere, matiere, annee, titre, sujet_pdf, corrige_pdf) VALUES (@filiere, @matiere, @annee, @titre, @sujet_pdf, @corrige_pdf)');
    for (const a of annales) ins.run(a);
    const written = writeDemoPdfs(UPLOADS_DIR);
    if (written.length) log(`[seed] ${written.length} PDF générés.`);
    log(`[seed] ${annales.length} annales créées.`);
  }

  /* ---------------- Questions de quiz (auto-évaluation) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM quiz_questions').get().c === 0) {
    const Q = (filiere, matiere, lecon, question, choix, bonne) => ({ filiere, matiere, lecon, question, choix: JSON.stringify(choix), bonne });
    const quiz = [
      Q('S2', 'maths', 'Puissances', '10³ × 10² = ?', ['10⁶', '10⁵', '10⁹', '100'], 1),
      Q('S2', 'maths', 'Puissances', '(10²)³ = ?', ['10⁵', '10⁶', '10⁸', '10⁹'], 1),
      Q('S2', 'maths', 'Puissances', '10⁻² = ?', ['-100', '1/100', '100', '-20'], 1),
      Q('S2', 'maths', 'Puissances', '2⁵ = ?', ['10', '25', '32', '64'], 2),
      Q('S2', 'maths', 'Puissances', 'Si a ≠ 0, a⁰ = ?', ['0', '1', 'a', '10'], 1),
      Q('S2', 'maths', 'Puissances', '10⁷ / 10³ = ?', ['10⁴', '10¹⁰', '10³', '10²¹'], 0),
      Q('S2', 'maths', 'Puissances', '√100 = ?', ['50', '10', '20', '100'], 1),
      Q('S2', 'maths', 'Puissances', 'L’écriture scientifique de 4500 est :', ['45 × 10²', '4,5 × 10³', '0,45 × 10⁴', '4,5 × 10²'], 1),
      Q('S2', 'maths', 'Puissances', '(2 × 10³)² = ?', ['2 × 10⁶', '4 × 10⁶', '4 × 10⁹', '2 × 10⁹'], 1),
      Q('S2', 'maths', 'Puissances', '10⁰ + 10¹ = ?', ['10', '11', '20', '1'], 1),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'L’unité de l’énergie est :', ['le newton', 'le joule', 'le watt', 'le pascal'], 1),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'L’énergie cinétique vaut :', ['m.g.h', '½.m.v²', 'm.v', '½.m.h²'], 1),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'L’énergie potentielle de pesanteur vaut :', ['m.g.z', '½.m.v²', 'm.v.z', 'g.z'], 0),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'L’énergie mécanique est :', ['Ec - Ep', 'Ec × Ep', 'Ec + Ep', 'Ep / Ec'], 2),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'Un objet qui tombe (sans frottement) :', ['voit son Ec augmenter', 'voit son Ec diminuer', 'garde Ec constante', 'perd toute énergie'], 0),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'Vitesse doublée, masse identique : Ec est…', ['doublée', 'inchangée', 'multipliée par 4', 'divisée par 2'], 2),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'Sans frottements, Em est :', ['croissante', 'décroissante', 'constante', 'nulle'], 2),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'g vaut environ :', ['9,8 N/kg', '98 N/kg', '0,98 N/kg', '9,8 m/s'], 0),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'Avec frottements, une partie de Em devient :', ['de la lumière', 'de la chaleur', 'de la masse', 'rien'], 1),
      Q('S2', 'physique-chimie', 'Énergie mécanique', 'Masse doublée à même vitesse : Ec est…', ['doublée', 'quadruplée', 'inchangée', 'divisée par 2'], 0),
      Q('L2', 'francais', 'Figures de style', '« Il est fort comme un lion » est :', ['une métaphore', 'une comparaison', 'une hyperbole', 'une litote'], 1),
      Q('L2', 'francais', 'Figures de style', '« Cet homme est un lion » est :', ['une comparaison', 'une métaphore', 'un oxymore', 'une anaphore'], 1),
      Q('L2', 'francais', 'Figures de style', '« Je meurs de faim » est :', ['une hyperbole', 'une litote', 'une gradation', 'un oxymore'], 0),
      Q('L2', 'francais', 'Figures de style', '« Une obscure clarté » est :', ['un oxymore', 'une antithèse', 'une métaphore', 'une litote'], 0),
      Q('L2', 'francais', 'Figures de style', '« Va, je ne te hais point » est :', ['une litote', 'une hyperbole', 'une anaphore', 'une comparaison'], 0),
      Q('L2', 'francais', 'Figures de style', 'Répéter un mot en début de phrases successives :', ['gradation', 'anaphore', 'personnification', 'oxymore'], 1),
      Q('L2', 'francais', 'Figures de style', '« Je me meurs, je suis mort, je suis enterré » illustre :', ['une gradation', 'une litote', 'une comparaison', 'un euphémisme'], 0),
      Q('L2', 'francais', 'Figures de style', 'Donner des traits humains à un objet :', ['personnification', 'métaphore', 'antithèse', 'litote'], 0),
      Q('L2', 'francais', 'Figures de style', 'Opposer deux idées dans une même phrase :', ['oxymore', 'antithèse', 'hyperbole', 'anaphore'], 1),
      Q('L2', 'francais', 'Figures de style', 'La métaphore est une comparaison…', ['avec l’outil « comme »', 'sans outil de comparaison', 'toujours négative', 'réservée à la poésie'], 1),
      Q('L2', 'philosophie', 'Repères et notions', '« Je pense donc je suis » est de :', ['Kant', 'Descartes', 'Sartre', 'Hobbes'], 1),
      Q('L2', 'philosophie', 'Repères et notions', '« A priori » signifie :', ['après l’expérience', 'indépendant de l’expérience', 'par l’expérience', 'contre l’expérience'], 1),
      Q('L2', 'philosophie', 'Repères et notions', 'Doctrine faisant du plaisir le souverain bien :', ['stoïcisme', 'épicurisme', 'empirisme', 'idéalisme'], 1),
      Q('L2', 'philosophie', 'Repères et notions', '« L’homme est un animal politique » :', ['Platon', 'Aristote', 'Rousseau', 'Marx'], 1),
      Q('L2', 'philosophie', 'Repères et notions', 'Le contraire du dogmatisme est :', ['le scepticisme', 'le rationalisme', 'le réalisme', 'l’empirisme'], 0),
      Q('L2', 'philosophie', 'Repères et notions', 'L’éthique étudie :', ['l’être', 'l’action morale', 'la beauté', 'le langage'], 1),
      Q('L2', 'philosophie', 'Repères et notions', 'Pour Sartre, l’homme est :', ['déterminé par Dieu', 'condamné à être libre', 'un roseau pensant', 'un loup pour l’homme'], 1),
      Q('L2', 'philosophie', 'Repères et notions', 'Thèse, antithèse, puis :', ['hypothèse', 'synthèse', 'analyse', 'exégèse'], 1),
      Q('L2', 'philosophie', 'Repères et notions', '« Connais-toi toi-même » était inscrit à :', ['Athènes', 'Delphes', 'Rome', 'Alexandrie'], 1),
      Q('L2', 'philosophie', 'Repères et notions', 'Pour l’empirisme, la connaissance vient :', ['de la raison', 'de l’expérience', 'de Dieu', 'des idées innées'], 1),
    ];
    const ins = db.prepare('INSERT INTO quiz_questions (filiere, matiere, lecon, question, choix, bonne) VALUES (@filiere, @matiere, @lecon, @question, @choix, @bonne)');
    for (const q of quiz) ins.run(q);
    log(`[seed] ${quiz.length} questions de quiz créées.`);
  }

  /* ---------------- Échéances (agenda dynamique) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM echeances').get().c === 0) {
    const ech = [
      { titre: 'Bac général – épreuves écrites (S2 & L2)', categorie: 'bac', date_debut: '2027-06-07', date_fin: '2027-06-12', lieu: 'Centres d’examen de ton département (voir convocation)', description: 'L’épreuve reine de l’année : toutes les matières écrites sur une semaine.', conseils: 'Refais les annales 2015-2026 en conditions réelles; dors 8 h la veille; arrive 1 h en avance avec convocation + pièce d’identité; commence par lire TOUT le sujet.' },
      { titre: 'Bac blanc du lycée', categorie: 'examen', date_debut: '2027-04-05', date_fin: '2027-04-09', lieu: 'Ton lycée', description: 'Répétition générale dans les conditions du Bac.', conseils: 'Téléphone à la maison, montre simple, copie propre : habitue-toi dès maintenant au format.' },
      { titre: 'Concours ENSA Thiès – pré-inscriptions', categorie: 'concours', date_debut: '2026-09-15', date_fin: '2026-10-30', lieu: 'En ligne + ENSA de Thiès', description: 'Ouverture des pré-inscriptions au concours d’entrée des écoles d’ingénieurs (polytechnique, agronomie…).', conseils: 'Prépare le dossier (relevés de notes, CNI, photos) en avance; révise maths et physique de Première et Terminale.' },
      { titre: 'Concours Médecine (UCAD) – retrait des dossiers', categorie: 'concours', date_debut: '2026-11-02', date_fin: '2026-11-27', lieu: 'Dakar, Université Cheikh Anta Diop', description: 'Dépôt des dossiers pour le concours d’entrée en Faculté de Médecine.', conseils: 'Le concours porte sur maths, physique, chimie et SVT du programme S2 : commence les annales dès septembre.' },
      { titre: 'Compositions du 1er trimestre', categorie: 'examen', date_debut: '2026-12-07', date_fin: '2026-12-11', lieu: 'Ton lycée', description: 'Premier bilan officiel de l’année : les comptes rendus entrent dans ton dossier pour les concours.', conseils: 'Fais un planning de révision 3 semaines avant avec le générateur de la plateforme.' },
    ];
    const ins = db.prepare('INSERT INTO echeances (titre, categorie, date_debut, date_fin, lieu, description, conseils) VALUES (@titre, @categorie, @date_debut, @date_fin, @lieu, @description, @conseils)');
    for (const e of ech) ins.run(e);
    log(`[seed] ${ech.length} échéances créées.`);
  }

  /* ---------------- Cours complémentaires (toutes les matières) ---------------- */
  const complement = [
    { filiere: 'S2', matiere: 'chimie', titre: 'Réactions chimiques : équilibrer', pdf_file: 'chimie/reactions.pdf', description: "La méthode pas à pas pour équilibrer n'importe quelle équation." },
    { filiere: 'S2', matiere: 'svt', titre: 'La cellule et ses constituants', pdf_file: 'svt/cellule.pdf', description: 'Membrane, noyau, organites : la base de toute la SVT.' },
    { filiere: 'S2', matiere: 'anglais', titre: 'English : grammaire clé pour le Bac', pdf_file: 'anglais/revision-s2.pdf', description: "Present perfect, comparatifs, connecteurs : l'essentiel." },
    { filiere: 'S2', matiere: 'philosophie', titre: "La conscience et l'inconscient", pdf_file: 'philosophie/conscience.pdf', description: 'Descartes face à Freud : un classique des sujets de Bac.' },
    { filiere: 'L2', matiere: 'maths', titre: 'Maths L2 : statistiques et pourcentages', pdf_file: 'maths/stats-pourcentages.pdf', description: 'Les outils maths dont un élève de Lettres a vraiment besoin.' },
    { filiere: 'L2', matiere: 'physique-chimie', titre: "Sciences L2 : l'essentiel pour comprendre", pdf_file: 'physique-chimie/bases-sciences-l2.pdf', description: 'Matière, énergie, mélanges : lire le monde scientifiquement.' },
    { filiere: 'L2', matiere: 'svt', titre: 'SVT : corps humain et santé', pdf_file: 'svt/corps-sante.pdf', description: "Circulation, respiration, hygiène de vie : le programme utile." },
    { filiere: 'L2', matiere: 'economie', titre: 'Économie : offre, demande et marché', pdf_file: 'economie/offre-demande.pdf', description: "Comprendre les prix, les pénuries, et l'actualité économique." },
    { filiere: 'L2', matiere: 'espagnol', titre: 'Español : les bases pour démarrer', pdf_file: 'espagnol/bases.pdf', description: "Saluer, se présenter, conjuguer : ta première semaine d'espagnol." },
  ];
  for (const c of complement) {
    if (db.prepare('SELECT 1 FROM cours WHERE filiere = ? AND matiere = ?').get(c.filiere, c.matiere)) continue;
    db.prepare('INSERT INTO cours (titre, matiere, description, pdf_file, ordre, filiere) VALUES (?, ?, ?, ?, 90, ?)')
      .run(c.titre, c.matiere, c.description, c.pdf_file, c.filiere);
  }
  const writtenMatieres = writeDemoPdfs(UPLOADS_DIR);
  if (writtenMatieres.length) log(`[seed] ${writtenMatieres.length} PDF de matières générés.`);

  /* ---------------- Cours Coran / arabe (niveaux 1-3) ---------------- */
  const hasCoran = db.prepare("SELECT COUNT(*) c FROM cours WHERE filiere = 'AR' AND matiere = 'sourates'").get().c > 0;
  if (!hasCoran) {
    db.prepare("DELETE FROM cours WHERE filiere = 'AR'").run();
    const cours = [
      { titre: "L'alphabet arabe et les makharij (prononciation)", matiere: 'lecture', niveau: 1, youtube_id: 'rgLli1ecwl8', pdf_file: 'arabe/niveau1-alphabet.pdf', description: "Les 28 lettres, leurs sons exacts (points d'articulation) et les voyelles." },
      { titre: "Sourate Al-Fâtiha : lire correctement", matiere: 'sourates', niveau: 1, youtube_id: 'lLzs5QX9pDE', pdf_file: 'arabe/niveau1-fatiha.pdf', description: "La sourate qui ouvre le Coran : lecture répétée, translittération et sens global." },
      { titre: "Petites sourates (1) : Al-Kawthar et Al-Ikhlâs", matiere: 'sourates', niveau: 1, pdf_file: 'arabe/niveau1-petites1.pdf', description: "Lecture, mémorisation et signification des sourates 108 et 112." },
      { titre: "Petites sourates (2) : Al-Falaq et An-Nâs", matiere: 'sourates', niveau: 1, pdf_file: 'arabe/niveau1-petites2.pdf', description: "Les deux sourates protectrices (113-114) : lecture et mémorisation." },
      { titre: "Tajwid 1 : les allongements (madd) et la qalqala", matiere: 'tajwid', niveau: 2, youtube_id: '8bsenfOm2Ck', pdf_file: 'arabe/niveau2-tajwid1.pdf', description: "Les règles de base pour embellir la récitation sans erreur." },
      { titre: "Lecture appliquée : Ad-Duhâ et Ash-Sharh", matiere: 'sourates', niveau: 2, pdf_file: 'arabe/niveau2-duha.pdf', description: "Appliquer le tajwid appris sur les sourates 93 et 94, avec leur sens." },
      { titre: "Mémorisation guidée : sourates 99 à 103", matiere: 'sourates', niveau: 2, pdf_file: 'arabe/niveau2-memorisation.pdf', description: "Méthode pas à pas : répéter, comprendre, réciter par cœur." },
      { titre: "Tajwid 2 : nûn sâkina et tanwîn (idghâm, ikhfâ, izhâr)", matiere: 'tajwid', niveau: 3, pdf_file: 'arabe/niveau3-tajwid2.pdf', description: "Les 4 règles du nûn sâkina avec exemples coraniques." },
      { titre: "Sourate Al-Mulk (1-10) : lecture et sens", matiere: 'tafsir', niveau: 3, pdf_file: 'arabe/niveau3-mulk.pdf', description: "Lecture fluide des premiers versets et explication simplifiée." },
      { titre: "Le sens des petites sourates : tafsîr simplifié", matiere: 'tafsir', niveau: 3, pdf_file: 'arabe/niveau3-tafsir.pdf', description: "Comprendre ce que disent les sourates mémorisées au niveau 1." },
    ];
    const ins = db.prepare(
      'INSERT INTO cours (titre, matiere, description, youtube_id, pdf_file, ordre, filiere, niveau) VALUES (@titre, @matiere, @description, @youtube_id, @pdf_file, @ordre, @filiere, @niveau)'
    );
    cours.forEach((c, i) => ins.run({ youtube_id: null, pdf_file: null, ...c, ordre: i + 1, filiere: 'AR' }));
    const written = writeDemoPdfs(UPLOADS_DIR);
    if (written.length) log(`[seed] ${written.length} PDF générés.`);
    log(`[seed] Programme Coran : ${cours.length} cours (niveaux 1-3).`);
  }

  /* ---------------- Lexique arabe-français (bonus interactif) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM lexique').get().c === 0) {
    const mots = [
      ['السَّلَامُ عَلَيْكُمْ', 'Bonjour (que la paix soit sur vous)', 'salutations'],
      ['مَرْحَبًا', 'Bienvenue', 'salutations'],
      ['شُكْرًا', 'Merci', 'salutations'],
      ['عَفْوًا', 'De rien / pardon', 'salutations'],
      ['مَا اسْمُكَ ؟', 'Comment tu t’appelles ? (à un garçon)', 'salutations'],
      ['أَب', 'Père', 'famille'],
      ['أُم', 'Mère', 'famille'],
      ['أَخ', 'Frère', 'famille'],
      ['أُخْت', 'Sœur', 'famille'],
      ['جَد', 'Grand-père', 'famille'],
      ['جَدَّة', 'Grand-mère', 'famille'],
      ['كِتَاب', 'Livre', 'école'],
      ['قَلَم', 'Stylo', 'école'],
      ['مَدْرَسَة', 'École', 'école'],
      ['أُسْتَاذ', 'Professeur', 'école'],
      ['تِلْمِيذ', 'Élève', 'école'],
      ['دَرْس', 'Leçon', 'école'],
      ['وَاحِد', 'Un', 'nombres'],
      ['اِثْنَان', 'Deux', 'nombres'],
      ['ثَلَاثَة', 'Trois', 'nombres'],
      ['أَرْبَعَة', 'Quatre', 'nombres'],
      ['خَمْسَة', 'Cinq', 'nombres'],
      ['عَشَرَة', 'Dix', 'nombres'],
    ];
    const ins = db.prepare('INSERT INTO lexique (mot_ar, mot_fr, categorie) VALUES (?, ?, ?)');
    for (const [ar, fr, cat] of mots) ins.run(ar, fr, cat);
    log(`[seed] Lexique arabe : ${mots.length} mots.`);
  }

  /* ---------------- Culture du monde (L2) : une publication par jour ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM culture').get().c === 0) {
    const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const C = (categorie, titre, contenu, n) => ({ categorie, titre, contenu, date_publi: jour(n) });
    const culture = [
      C('actualite', 'Lire l’actualité comme un pro',
        "Réflexes de vérification : 1) qui parle (source) ? 2) quelle date ? 3) est-ce confirmé par un deuxième média ? 4) fait ou opinion ? En histoire-géo comme en philo, citer une info fiable vaut des points ; citer une rumeur en fait perdre.", 0),
      C('histoire', 'Un jour dans l’histoire : 15 août 1960',
        "Indépendance du Congo (Brazzaville), après la loi-cadre Defferre et le référendum de 1958. En un mois d’août 1960, 17 pays africains accèdent à la souveraineté : c’est le cœur de la « décolonisation éclair » à maîtriser pour le Bac.", 1),
      C('pratique', 'La méthode Pomodoro pour réviser',
        "25 minutes de travail concentré (téléphone hors de la pièce) + 5 minutes de pause, 4 fois, puis une longue pause. Ton cerveau retient mieux en séances courtes et régulières qu’en nuits blanches. Teste ce soir sur la dissertation.", 2),
      C('figure', 'Cheikh Anta Diop, l’historien qui a renversé le regard',
        "Sénégalais (1923-1986), il a défendu l’idée que l’Égypte antique est africaine dans « Nations nègres et cultures ». L’UNESCO a repris ses intuitions sur le peuplement de la vallée du Nil. Un modèle de rigueur et de courage intellectuel.", 3),
      C('langue', 'Ces mots français venus de l’arabe',
        "Algorithme (al-Khwârizmî, mathématicien), algèbre (al-jabr), alcool (al-kuhl), amiral (amîr al-bahr), coton (qutn), sucre (sukkar). La langue française s’est nourrie de l’arabe médiéval : un pont parfait entre nos filières S2, L2 et arabe !", 4),
      C('geo', 'Le Sénégal en 5 chiffres',
        "196 722 km² · environ 18 millions d’habitants · 700 km de côte atlantique · 5 frontières (Mauritanie, Mali, Guinée, Guinée-Bissau, Gambie) · 1 enclave : la Gambie. À placer sans faute en introduction de copie.", 5),
      C('actualite', 'ZLECAf : le grand marché africain, expliqué simple',
        "La Zone de libre-échange continentale africaine vise un marché unique de 1,3 milliard de consommateurs. En jeu : baisser les barrières douanières et commercer entre voisins. Sujet chaud pour les dissertations de géo.", 6),
      C('figure', 'Mariama Bâ et « Une si longue lettre »',
        "Écrivaine sénégalaise (1929-1981), son roman épistolaire (1979) dénonce la polygamie et défend l’éducation des filles. Prix Noma. Un monument de la littérature africaine, au programme de nombreuses universités.", 7),
      C('histoire', 'Bandung 1955 : la naissance des non-alignés',
        "29 pays d’Asie et d’Afrique se réunissent en Indonésie et refusent de choisir entre Washington et Moscou. Conséquence directe : un élan pour les indépendances africaines des années 1960.", 8),
      C('pratique', '3 ressources gratuites pour la L2',
        "Gallica (BnF) : textes et journaux anciens en ligne. Khan Academy : grammaire et logique. FUN MOOC : cours d’universités francophones. Trois mines d’or pour exposés et commentaires composés.", 9),
      C('debat', 'Le débat du jour : faut-il réguler les réseaux sociaux ?',
        "Pour : lutte contre la désinformation, protection des mineurs. Contre : liberté d’expression, risque de censure. Entraîne-toi à construire thèse/antithèse en 10 minutes chrono, comme au Bac.", 10),
      C('langue', 'L’anaphore, figure des grands discours',
        "Répéter un même mot en tête de phrase : « Je fais un rêve… » (Martin Luther King). Effet : marteler, émouvoir, fédérer. Repère-la dans un discours et explique son effet = points assurés au commentaire.", 11),
      C('figure', 'David Diop, le Goncourt de « Frère d’âme »',
        "Enseignant-chercheur franco-sénégalais, il a reçu le Prix Goncourt des lycéens puis l’International Booker pour « Frère d’âme » (2018), roman sur les tirailleurs sénégalais de 14-18. La preuve que la L2 mène au sommet.", 12),
      C('pratique', 'Bourses après le Bac : les bons réflexes',
        "Surveille : bourses nationales (MESRI), Campus Sénégal, AUF (études francophones), Campus France (bourses d’excellence). Astuce : prépare ton dossier (bulletins, CNI, projet motivé) AVANT les annonces, les places partent vite.", 13),
    ];
    culture.push(
      C('citation', '« Je pense donc je suis. » — Descartes',
        "Le point de départ de toute la philosophie moderne : même si je doute de tout, je ne peux pas douter que je suis en train de penser. À placer en intro d'une dissert sur la conscience, la vérité ou le doute.", 14),
      C('citation', '« L’homme est condamné à être libre. » — Sartre',
        "Pour Sartre, on ne choisit pas de naître, mais une fois né, on est responsable de tout ce qu'on fait : pas d'excuse toute faite. Parfait pour les sujets sur la liberté et la responsabilité.", 15),
      C('citation', "« Le futur a plusieurs noms : pour les faibles, il est l’impossible ; pour les timides, l’inconnu ; pour les vaillants, l’idéal. » — Victor Hugo",
        "Une citation en or pour une dissert de français ou de philo sur l'espoir, le courage ou l'avenir. Retiens aussi le procédé : c'est une anaphore + gradation.", 16),
      C('citation', "« Écoutez, dans la nuit du monde, l’immense chanson d’Amour ! » — Léopold Sédar Senghor",
        "Le premier Africain élu à l'Académie française (1983). À citer pour montrer qu'on connaît les auteurs africains : effet garanti devant un correcteur.", 17),
      C('figure', 'Franklin D. Roosevelt (1882-1945)',
        "Président des États-Unis pendant la crise de 1929 puis la Seconde Guerre mondiale. Son « New Deal » relance l'économie par de grands travaux ; il est le seul président élu 4 fois. Incontournable sur le XXe siècle.", 18),
      C('figure', 'Nelson Mandela (1918-2013)',
        "27 ans de prison pour avoir lutté contre l'apartheid, puis premier président noir d'Afrique du Sud (1994) et prix Nobel de la paix. Symbole mondial du pardon et de la réconciliation.", 19),
      C('figure', 'Abraham Lincoln (1809-1865)',
        "Président américain qui abolit l'esclavage (1865) et préserve l'Union pendant la guerre de Sécession. Son discours de Gettysburg (« le gouvernement du peuple, par le peuple, pour le peuple ») est un monument.", 20),
      C('actualite', 'Pourquoi le pétrole est-il parfois si cher ?',
        "Le prix du baril dépend de 3 choses : 1) l'offre (les pays producteurs de l'OPEP+ décident combien ils pompent) ; 2) la demande (quand la Chine ou les États-Unis tournent à fond, ça monte) ; 3) les tensions (guerre, détroit bloqué = peur de pénurie). Le sais-tu ? Ton plein de carburant et le prix du transport suivent ce baril.", 21),
      C('actualite', 'Comprendre le conflit israélo-palestinien en 3 repères',
        "Pour y voir clair sans prendre parti : 1) 1947-1967 : création d'Israël, guerres, occupation des territoires palestiniens ; 2) 1993 : accords d'Oslo, espoir de deux États, puis blocage ; 3) aujourd'hui : colonies, blocus de Gaza et cycles de violences. À retenir pour le Bac : c'est un conflit de territoires, de sécurité et de droits nationaux, suivi par l'ONU depuis 1947.", 22),
      C('actualite', "Climat : c’est quoi El Niño dont tout le monde parle ?",
        "El Niño, c'est un réchauffement inhabituel de l'océan Pacifique qui dérègle la météo mondiale : sécheresses ici, pluies énormes là-bas. Pour le Sahel et le Sénégal, cela peut changer le calendrier des pluies — donc les récoltes. Un excellent exemple du lien climat-économie à citer en géo.", 23)
    );
    const ins = db.prepare('INSERT INTO culture (categorie, titre, contenu, date_publi) VALUES (@categorie, @titre, @contenu, @date_publi)');
    for (const c of culture) ins.run(c);
    log(`[seed] Culture du monde : ${culture.length} publications (dont citations, biographies, actus).`);
  }

  /* Ajout des citations/biographies/actus sur une base déjà existante. */
  if (db.prepare("SELECT COUNT(*) c FROM culture WHERE categorie IN ('citation','figure') AND titre LIKE '%—%'").get().c === 0) {
    const jour2 = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const C2 = (categorie, titre, contenu, n) => ({ categorie, titre, contenu, date_publi: jour2(n) });
    const extra = [
      C2('citation', '« Je pense donc je suis. » — Descartes',
        "Le point de départ de toute la philosophie moderne : même si je doute de tout, je ne peux pas douter que je suis en train de penser. À placer en intro d'une dissert sur la conscience, la vérité ou le doute.", 14),
      C2('citation', '« L’homme est condamné à être libre. » — Sartre',
        "Pour Sartre, on ne choisit pas de naître, mais une fois né, on est responsable de tout ce qu'on fait : pas d'excuse toute faite. Parfait pour les sujets sur la liberté et la responsabilité.", 15),
      C2('citation', '« Le futur a plusieurs noms : pour les faibles, il est l’impossible ; pour les timides, l’inconnu ; pour les vaillants, l’idéal. » — Victor Hugo',
        "Une citation en or pour une dissert de français ou de philo sur l'espoir, le courage ou l'avenir. Retiens aussi le procédé : c'est une anaphore + gradation.", 16),
      C2('citation', '« Écoutez, dans la nuit du monde, l’immense chanson d’Amour ! » — Léopold Sédar Senghor',
        "Le premier Africain élu à l'Académie française (1983). À citer pour montrer qu'on connaît les auteurs africains : effet garanti devant un correcteur.", 17),
      C2('figure', 'Franklin D. Roosevelt (1882-1945)',
        "Président des États-Unis pendant la crise de 1929 puis la Seconde Guerre mondiale. Son « New Deal » relance l'économie par de grands travaux ; il est le seul président élu 4 fois. Incontournable sur le XXe siècle.", 18),
      C2('figure', 'Nelson Mandela (1918-2013)',
        "27 ans de prison pour avoir lutté contre l'apartheid, puis premier président noir d'Afrique du Sud (1994) et prix Nobel de la paix. Symbole mondial du pardon et de la réconciliation.", 19),
      C2('figure', 'Abraham Lincoln (1809-1865)',
        "Président américain qui abolit l'esclavage (1865) et préserve l'Union pendant la guerre de Sécession. Son discours de Gettysburg (« le gouvernement du peuple, par le peuple, pour le peuple ») est un monument.", 20),
      C2('actualite', 'Pourquoi le pétrole est-il parfois si cher ?',
        "Le prix du baril dépend de 3 choses : 1) l'offre (les pays producteurs de l'OPEP+ décident combien ils pompent) ; 2) la demande (quand la Chine ou les États-Unis tournent à fond, ça monte) ; 3) les tensions (guerre, détroit bloqué = peur de pénurie). Le sais-tu ? Ton plein de carburant et le prix du transport suivent ce baril.", 21),
      C2('actualite', 'Comprendre le conflit israélo-palestinien en 3 repères',
        "Pour y voir clair sans prendre parti : 1) 1947-1967 : création d'Israël, guerres, occupation des territoires palestiniens ; 2) 1993 : accords d'Oslo, espoir de deux États, puis blocage ; 3) aujourd'hui : colonies, blocus de Gaza et cycles de violences. À retenir pour le Bac : c'est un conflit de territoires, de sécurité et de droits nationaux, suivi par l'ONU depuis 1947.", 22),
      C2('actualite', 'Climat : c’est quoi El Niño dont tout le monde parle ?',
        "El Niño, c'est un réchauffement inhabituel de l'océan Pacifique qui dérègle la météo mondiale : sécheresses ici, pluies énormes là-bas. Pour le Sahel et le Sénégal, cela peut changer le calendrier des pluies — donc les récoltes. Un excellent exemple du lien climat-économie à citer en géo.", 23),
    ];
    const ins2 = db.prepare('INSERT INTO culture (categorie, titre, contenu, date_publi) VALUES (@categorie, @titre, @contenu, @date_publi)');
    for (const c of extra) ins2.run(c);
    log(`[seed] Culture : +${extra.length} (citations, biographies, actus).`);
  }

  /* ---------------- Catalogue métiers (par filière, avec parcours d'études) ---------------- */
  const hasNewCatalog = db.prepare("SELECT COUNT(*) c FROM metiers WHERE filiere IN ('S2','L2')").get().c > 0;
  if (!hasNewCatalog) {
    db.prepare('DELETE FROM metiers').run();
    const M = (filiere, titre, domaine, image, description, parcours, debouches) => ({ filiere, titre, domaine, image, description, parcours, debouches });
    const metiers = [
      M("S2", "Médecin", "Santé", "/metiers/medecin.jpg",
        "Diagnostiquer, soigner et prévenir les maladies. Un des métiers les plus respectés, au Sénégal comme à l'international.",
        "Bac S2 → Faculté de Médecine (UCAD Dakar, Thiès, Ziguinchor) ~7 ans → thèse. Spécialisations possibles ensuite (chirurgie, pédiatrie, cardiologie…). Bourses d'études possibles à l'étranger (France, Maroc, Cuba, Chine).",
        "Hôpitaux et cliniques;Cabinets privés;ONG et santé publique;Spécialisation chirurgie, pédiatrie…"),
      M("S2", "Médecin militaire", "Défense & Santé", "/metiers/militaire.jpg",
        "Soigner les soldats et leurs familles, servir en mission nationale ou internationale (Casques bleus). Médecine + carrière d'officier.",
        "Bac S2 → Faculté de Médecine + concours du Service de Santé des Armées, ou recrutement officier après la thèse. Formation militaire complémentaire.",
        "Hôpitaux militaires;Missions ONU/CEDEAO;Carrière d'officier"),
      M("S2", "Pharmacien", "Santé", "/metiers/labo.jpg",
        "Délivrer et contrôler les médicaments, conseiller les patients, ou travailler en industrie pharmaceutique et en laboratoire.",
        "Bac S2 → FMPOS (UCAD) filière pharmacie, ~6 ans → diplôme de Docteur en pharmacie. Très bon niveau en chimie exigé.",
        "Officines (pharmacies);Hôpitaux;Industrie pharmaceutique;Laboratoires de contrôle"),
      M("S2", "Chirurgien-dentiste", "Santé", "/metiers/medecin.jpg",
        "Soigner les dents et la bouche, pratiquer des soins et prothèses. Clientèle assurée : peu de dentistes au Sénégal.",
        "Bac S2 → FMPOS (UCAD) filière odontologie, ~6 ans. Précision et sang-froid indispensables.",
        "Cabinet privé;Cliniques dentaires;Hôpitaux publics"),
      M("S2", "Vétérinaire", "Santé animale", "/metiers/agronome.jpg",
        "Soigner les animaux d'élevage et de compagnie, contrôler la sécurité des viandes. L'élevage est un pilier de l'économie sahélienne.",
        "Bac S2 → EISMV Dakar (École Inter-États des Sciences et Médecine Vétérinaires) ~6 ans, ou écoles vétérinaires à l'étranger.",
        "Services d'élevage;Cliniques vétérinaires;Contrôle sanitaire;ONG"),
      M("S2", "Sage-femme", "Santé", "/metiers/medecin.jpg",
        "Accompagner les grossesses et accouchements. Métier essentiel : la santé maternelle est une priorité nationale.",
        "Bac S2 → concours des écoles de sages-femmes (rattachées aux CHU), 4 ans d'études → diplôme d'État.",
        "Maternités et centres de santé;Hôpitaux;Cliniques privées;ONG santé mère-enfant"),
      M("S2", "Infirmier diplômé d'État", "Santé", "/metiers/medecin.jpg",
        "Donner les soins, suivre les patients, assister les médecins. Emploi rapide et stable dans tout le pays.",
        "Bac S2 → concours des écoles nationales de santé (infirmiers), 3 ans → diplôme d'État. Recrutement direct dans la fonction publique.",
        "Hôpitaux et postes de santé;Cliniques;Missions humanitaires;Cabinets privés"),
      M("S2", "Biologiste", "Sciences & Santé", "/metiers/labo.jpg",
        "Analyser sang, eaux, aliments… en laboratoire. Un métier scientifique clé pour la santé et l'environnement.",
        "Bac S2 → Licence + Master en biologie/biochimie (Faculté des Sciences UCAD, UGB Saint-Louis), puis labo ou doctorat.",
        "Laboratoires d'analyses médicales;Contrôle qualité agroalimentaire;Recherche;Environnement"),
      M("S2", "Ingénieur en informatique", "Numérique & Tech", "/metiers/informatique.jpg",
        "Concevoir logiciels, applications et systèmes. Le secteur qui recrute le plus vite, au Sénégal et en télétravail mondial.",
        "Bac S2 → ESP Dakar / École Polytechnique de Thiès / licence-master informatique UCAD, ou écoles privées sérieuses. Le niveau en maths est ton atout.",
        "Développement web et mobile;Data et IA;Cybersécurité;Freelance international"),
      M("S2", "Data scientist", "Numérique & Data", "/metiers/informatique.jpg",
        "Transformer les données en décisions : modèles, prévisions, intelligence artificielle. Métier d'avenir très bien payé.",
        "Bac S2 → licence maths/info + master en data science (UCAD, instituts, ou formations en ligne certifiantes). Le profil S2 est idéal.",
        "Banques et télécoms;Start-ups;Organisations internationales;Consulting"),
      M("S2", "Ingénieur civil", "BTP & Infrastructures", "/metiers/chantier.jpg",
        "Calculer et construire bâtiments, ponts et routes. Le Sénégal bâtit partout : les ingénieurs manquent.",
        "Bac S2 → EPT (École Polytechnique de Thiès) ou ESP, spécialité génie civil, 5 ans. Maths et physique solides obligatoires.",
        "Bureaux d'études;Grands chantiers (ponts, routes, immeubles);Entreprises BTP;État"),
      M("S2", "Ingénieur électrotechnique", "Énergie & Industrie", "/metiers/chantier.jpg",
        "Concevoir les systèmes électriques : production, transport, machines. Central avec les grands projets solaires et éoliens du pays.",
        "Bac S2 → EPT/ESP spécialité électricité-électrotechnique, 5 ans. Physique et maths.",
        "SENELEC;Parcs solaires et éoliens;Industries;Bureaux de contrôle"),
      M("S2", "Ingénieur en télécommunications", "Numérique & Réseaux", "/metiers/informatique.jpg",
        "Déployer et sécuriser les réseaux : fibre, 4G/5G, satellites. Le numérique africain explose.",
        "Bac S2 → ESP/EPT spécialité télécoms, ou BTS + école d'ingénieur. Maths + informatique.",
        "Sonatel, Orange, Free;Opérateurs satellites;Régulateur (ARTP);Équipementiers"),
      M("S2", "Ingénieur agronome", "Agriculture & Environnement", "/metiers/agronome.jpg",
        "Moderniser l'agriculture, gérer sols et eaux : un métier stratégique pour la souveraineté alimentaire.",
        "Bac S2 → ENSA Thiès (École Nationale Supérieure d'Agriculture), 5 ans. SVT et maths utiles.",
        "Développement rural;Agro-industrie;Recherche (ISRA);Gestion des ressources en eau"),
      M("S2", "Architecte", "Bâtiment & Design", "/metiers/architecte.jpg",
        "Dessiner et concevoir les bâtiments de demain. Créativité + rigueur scientifique.",
        "Bac S2 → écoles d'architecture (Dakar, Lomé, Rabat…), 5-6 ans. Un bon niveau en maths et un sens du dessin aident.",
        "Cabinets d'architecture;Promotion immobilière;Urbanisme;Design d'intérieur"),
      M("S2", "Technicien supérieur en génie civil", "BTP", "/metiers/chantier.jpg",
        "Encadrer les chantiers, métrer, dessiner les plans. Emploi très rapide après 2-3 ans d'études.",
        "Bac S2 → DUT/BTS génie civil (ESP, EPT, lycées techniques), 2-3 ans. Passerelles possibles vers le diplôme d'ingénieur ensuite.",
        "Chantiers BTP;Cabinets de métré;Conducteur de travaux;Création d'entreprise"),
      M("S2", "Géologue", "Terre & Ressources", "/metiers/labo.jpg",
        "Étudier sols, eaux souterraines, minerais. Le sous-sol sénégalais (or, zircon, pétrole) attire les investisseurs.",
        "Bac S2 → licence-master en géologie (Faculté des Sciences UCAD), puis terrain ou doctorat.",
        "Mines et carrières;Pétrole et gaz;Hydraulique;Environnement"),
      M("S2", "Chercheur", "Sciences", "/metiers/labo.jpg",
        "Faire avancer les connaissances : maths, physique, santé, agronomie… et les enseigner à l'université.",
        "Bac S2 → licence, master, doctorat (UCAD, UGB ou étranger avec bourse). Curiosité et patience.",
        "Universités (enseignant-chercheur);ISRA, IPD, IRD;Centres de recherche internationaux"),
      M("S2", "Actuaire", "Finance & Risques", "/metiers/finance.jpg",
        "Calculer risques et tarifs pour assurances et retraites. Un des métiers les mieux payés de la finance.",
        "Bac S2 → licence de maths/statistiques + formation actuariat (ENSAE Dakar, instituts, cursus assurances). Les maths du S2 sont le cœur du métier.",
        "Compagnies d'assurance;Caisses de retraite;Banques;Consulting"),
      M("S2", "Statisticien", "Data & Études", "/metiers/finance.jpg",
        "Collecter et analyser les chiffres qui guident les décisions : recensements, études, économie.",
        "Bac S2 → ENSAE Dakar ou licence-master en statistique (UCAD, UGB). Rigueur et goût des chiffres.",
        "ANSD et services statistiques;Banques;Organisations internationales;Études de marché"),
      M("S2", "Expert-comptable", "Finance & Gestion", "/metiers/finance.jpg",
        "Certifier les comptes, conseiller les entreprises. Prestige et indépendance.",
        "Bac S2 → licence en comptabilité/finance (UCAD SEG) puis DSCG/INTEC, 5-7 ans au total.",
        "Cabinets d'audit;Direction financière;Cabinet personnel;Fiscalité"),
      M("S2", "Officier de gendarmerie", "Défense & Sécurité", "/metiers/militaire.jpg",
        "Commander des unités, enquêter, protéger. Carrière de responsabilité et de respect.",
        "Bac S2 + concours officiers → école militaire de formation des officiers (formation scientifique et militaire). Le bac scientifique est très apprécié.",
        "Commandement d'unités;Police judiciaire militaire;Sécurité routière et territoriale;Missions internationales"),
      M("S2", "Sous-officier (Armée de terre)", "Défense", "/metiers/militaire.jpg",
        "Encadrer une équipe de soldats, avec des spécialités techniques : transmissions, mécanique, logistique…",
        "Bac S2 + concours sous-officiers → école de formation (entraînement + spécialité technique). Évolution possible vers officier.",
        "Infanterie;Transmissions;Génie militaire;Logistique et maintenance"),
      M("S2", "Marin (Marine nationale)", "Défense & Mer", "/metiers/militaire.jpg",
        "Servir en mer : protection des eaux, secours, lutte contre la pêche illégale. Aventure et discipline.",
        "Bac S2 + concours de la Marine nationale (base de Ouakam) → écoles de marine. Maths et physique servent à la navigation et aux machines.",
        "Navigation et pont;Mécanique navale;Sécurité maritime;Forces navales"),
      M("S2", "Aviateur (Armée de l'air)", "Défense & Ciel", "/metiers/militaire.jpg",
        "Servir dans l'armée de l'air : maintenance des aéronefs, contrôle, défense. Sélection exigeante, fierté immense.",
        "Bac S2 + concours de l'Armée de l'air (Yoff) → formation militaire et technique. Bon niveau scientifique demandé, visite médicale stricte.",
        "Maintenance aéronautique;Contrôle et opérations;Défense aérienne;Passerelles vers l'aviation civile"),
      M("L2", "Avocat·e / Juriste", "Droit & Justice", "/metiers/juriste.jpg",
        "Défendre, conseiller, rédiger. Un pilier de l'État de droit.",
        "Bac L2 → licence + master en droit (UCAD FSJP), puis école de formation (avocat/magistrat).",
        "Barreau;Magistrature;Juriste d'entreprise;Notariat"),
      M("L2", "Enseignant·e", "Éducation", "/metiers/agronome.jpg",
        "Transmettre le savoir : lettres, histoire-géo, philosophie. Le métier qui forme tous les autres.",
        "Bac L2 → licence/master + FASTEF (formation des enseignants) ou CAP. Concours de recrutement.",
        "Collèges et lycées;Université;Formation professionnelle;Cours en ligne"),
      M("L2", "Journaliste / Communicant", "Médias", "/metiers/finance.jpg",
        "Informer, enquêter, raconter : presse, radio, TV, web.",
        "Bac L2 → CESTI Dakar (concours) ou licence en information-communication.",
        "Rédactions;Communication d'entreprise;Réseaux sociaux et web;Édition"),
      M("L2", "Écrivain·e / Éditeur·rice", "Lettres & Édition", "/metiers/juriste.jpg",
        "Écrire, corriger, publier : la vie des livres.",
        "Bac L2 → licence de lettres/master métiers du livre. Beaucoup de lecture et d'écriture personnelle.",
        "Maisons d'édition;Traduction;Correction;Auto-édition et web"),
    ];
    const ins = db.prepare(
      'INSERT INTO metiers (titre, domaine, description, debouches, image, ordre, filiere, parcours) VALUES (@titre, @domaine, @description, @debouches, @image, @ordre, @filiere, @parcours)'
    );
    metiers.forEach((m, i) => ins.run({ ...m, ordre: i + 1 }));
    log(`[seed] Catalogue métiers renouvelé : ${metiers.length} fiches (S2 + L2) avec parcours d'études.`);
  }

  /* --------- Images variées par métier (idempotent, base neuve ou existante) --------- */
  const IMG = {
    'Médecin': '/metiers/medecin.jpg',
    'Médecin militaire': '/metiers/militaire.jpg',
    'Pharmacien': '/metiers/labo.jpg',
    'Chirurgien-dentiste': '/metiers/dentiste.jpg',
    'Vétérinaire': '/metiers/veto.jpg',
    'Sage-femme': '/metiers/soins.jpg',
    'Infirmier diplômé d’État': '/metiers/medecin.jpg',
    'Biologiste': '/metiers/labo.jpg',
    'Ingénieur en informatique': '/metiers/info.jpg',
    'Data scientist': '/metiers/data.jpg',
    'Ingénieur civil': '/metiers/chantier.jpg',
    'Ingénieur électrotechnique': '/metiers/energie.jpg',
    'Ingénieur en télécommunications': '/metiers/info.jpg',
    'Ingénieur agronome': '/metiers/agronome.jpg',
    'Architecte': '/metiers/architecte.jpg',
    'Technicien supérieur en génie civil': '/metiers/chantier.jpg',
    'Géologue': '/metiers/labo.jpg',
    'Chercheur': '/metiers/labo.jpg',
    'Actuaire': '/metiers/finance.jpg',
    'Statisticien': '/metiers/data.jpg',
    'Expert-comptable': '/metiers/finance.jpg',
    'Officier de gendarmerie': '/metiers/militaire.jpg',
    'Sous-officier (Armée de terre)': '/metiers/militaire.jpg',
    'Marin (Marine nationale)': '/metiers/mer.jpg',
    'Aviateur (Armée de l’air)': '/metiers/ciel.jpg',
    'Avocat·e / Juriste': '/metiers/juriste.jpg',
    'Enseignant·e': '/metiers/enseignant.jpg',
    'Journaliste / Communicant': '/metiers/media.jpg',
    'Écrivain·e / Éditeur·rice': '/metiers/lettres.jpg',
    'Traducteur·rice / Interprète': '/metiers/campus.jpg',
    'Psychologue': '/metiers/psy.jpg',
    'Diplomate': '/metiers/diplomate.jpg',
    'Community manager / Designer graphique': '/metiers/design.jpg',
    'Photographe / Réalisateur': '/metiers/photo.jpg',
    'Bibliothécaire / Archiviste': '/metiers/lettres.jpg',
    'Guide touristique / Hôtellerie': '/metiers/tourisme.jpg',
    'Historien·ne / Archéologue': '/metiers/campus.jpg',
  };
  const upImg = db.prepare('UPDATE metiers SET image = ? WHERE titre = ?');
  for (const [t, img] of Object.entries(IMG)) upImg.run(img, t);

  /* --------- Compléments L2 (idempotent) --------- */
  if (!db.prepare("SELECT 1 FROM metiers WHERE titre LIKE 'Traducteur%'").get()) {
    const X = (titre, domaine, image, description, parcours, debouches) => ({
      filiere: 'L2', titre, domaine, image, description, parcours, debouches,
    });
    const extras = [
      X('Traducteur·rice / Interprète', 'Langues & Traduction', '/metiers/lettres.svg',
        'Traduire textes et discours entre plusieurs langues. Un atout rare dans les organisations internationales et le commerce.',
        'Bac L2 → licence de langues (UCAD) + master en traduction/interprétation ( Dakar, Genève, Paris).',
        'Organisations internationales;Ambassades;Entreprises exportatrices;Traduction web et littéraire'),
      X('Psychologue', 'Santé & Social', '/metiers/soins.jpg',
        'Écouter, accompagner, comprendre le fonctionnement humain. Profession en forte croissance au Sénégal.',
        'Bac L2 (ou S2) → licence + master de psychologie (UCAD), 5 ans. Stages en milieu clinique obligatoires.',
        'Cabinets privés;Hôpitaux et CMP;Écoles et ONG;Ressources humaines'),
      X('Diplomate', 'Relations internationales', '/metiers/campus.svg',
        'Représenter le Sénégal à l’étranger, négocier, protéger les Sénégalais de la diaspora. Prestige et voyages.',
        'Bac L2 → licence/master en droit ou science politique (UCAD FSJP) + concours du ministère des Affaires étrangères.',
        'Ambassades et consulats;ONU et CEDEAO;Coopération internationale'),
      X('Community manager / Designer graphique', 'Création & Web', '/metiers/info.jpg',
        'Créer l’image des marques : visuels, réseaux sociaux, campagnes. Le métier qui explose avec le numérique africain.',
        'Bac L2 → écoles de design/communication (Dakar) ou formation en ligne + portfolio. La créativité prime sur le diplôme.',
        'Agences de pub;Start-ups;Freelance international;Médias'),
      X('Photographe / Réalisateur', 'Arts & Audiovisuel', '/metiers/media.svg',
        'Raconter en images : clips, documentaires, pub, mariages, mode. L’industrie créative sénégalaise recrute.',
        'Bac L2 → écoles de cinéma/audiovisuel (Dakar, Kouribga…) ou apprentissage sur le terrain + matériel progressif.',
        'Productions audiovisuelles;Presse et médias;Mode et événementiel;Cinéma'),
      X('Bibliothécaire / Archiviste', 'Culture & Patrimoine', '/metiers/lettres.svg',
        'Organiser, conserver et transmettre livres et archives : mémoire des entreprises, de l’État et de la culture.',
        'Bac L2 → licence/master en documentation ou histoire (UCAD) + formation aux archives (Bibliothèque nationale, FLASH).',
        'Bibliothèques universitaires et publiques;Archives nationales;Entreprises et ONG'),
      X('Guide touristique / Hôtellerie', 'Tourisme & Accueil', '/metiers/tourisme.svg',
        'Faire découvrir le Sénégal (Gorée, Saint-Louis, Saly, Casamance) et accueillir le monde. Secteur clé de l’économie.',
        'Bac L2 → écoles de tourisme et d’hôtellerie (Dakar, Saly) ou BTS tourisme. Les langues sont ton trésor.',
        'Hôtels et resorts;Agences de voyage;Sites historiques;Écotourisme'),
      X('Historien·ne / Archéologue', 'Sciences humaines', '/metiers/campus.svg',
        'Fouiller le passé pour éclairer le présent : patrimoine, recherches, musées, enseignement.',
        'Bac L2 → licence/master en histoire et archéologie (UCAD FLASH), fouilles avec l’IFAN.',
        'Musées (IFAN, Gorée);Enseignement et recherche;Patrimoine et culture'),
    ];
    const insX = db.prepare(
      'INSERT INTO metiers (titre, domaine, description, debouches, image, ordre, filiere, parcours) VALUES (@titre, @domaine, @description, @debouches, @image, @ordre, @filiere, @parcours)'
    );
    const maxOrdre = db.prepare('SELECT MAX(ordre) m FROM metiers').get().m || 0;
    extras.forEach((m, i) => insX.run({ ...m, ordre: maxOrdre + i + 1 }));
    log(`[seed] Orientation : ${extras.length} métiers L2 ajoutés.`);
  }

  return result;
}

module.exports = { seed, CLASSES };
