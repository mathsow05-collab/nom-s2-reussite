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
  if (db.prepare('SELECT COUNT(*) c FROM admins').get().c === 0) {
    const admins = [
      { username: process.env.ADMIN1_USERNAME || 'admin', password: process.env.ADMIN1_PASSWORD || 'Admin#S2-2026', display: 'Direction', filiere: 'all' },
      { username: process.env.ADMIN2_USERNAME || 'partenaire', password: process.env.ADMIN2_PASSWORD || 'Partenaire#S2-2026', display: 'Partenaire', filiere: 'all' },
      { username: 'mouhamed', password: 'pelo2007', display: 'Mouhamed Sy Sow', filiere: 'L2' },
    ];
    const ins = db.prepare('INSERT INTO admins (username, password_hash, display_name, filiere) VALUES (?, ?, ?, ?)');
    for (const a of admins) {
      ins.run(a.username, hashPassword(a.password), a.display, a.filiere);
      result.admins.push({ username: a.username, password: a.password });
    }
    log(`[seed] Comptes admin créés : ${admins.map((a) => a.username).join(', ')}`);
  } else {
    // Base existante : complète les nouvelles colonnes + ajoute Mouhamed si absent
    db.prepare("UPDATE admins SET display_name = username WHERE display_name IS NULL").run();
    const has = db.prepare('SELECT 1 FROM admins WHERE username = ?').get('mouhamed');
    if (!has) {
      db.prepare('INSERT INTO admins (username, password_hash, display_name, filiere) VALUES (?, ?, ?, ?)')
        .run('mouhamed', hashPassword('pelo2007'), 'Mouhamed Sy Sow', 'L2');
      log('[seed] Compte admin « mouhamed » (L2) ajouté.');
    }
  }

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

  /* ---------------- Cours S2 (base vierge) ---------------- */
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

  /* ---------------- Catalogue métiers (orientation, commun S2/L2) ---------------- */
  if (db.prepare('SELECT COUNT(*) c FROM metiers').get().c === 0) {
    const metiers = [
      {
        titre: 'Médecin',
        domaine: 'Santé',
        image: '/metiers/medecin.jpg',
        description:
          "Le médecin diagnostique, traite et prévient les maladies. Après le Bac, la voie royale est la Faculté de Médecine (UCAD à Dakar, ou les facultés de Thiès et Ziguinchor) : un cursus exigeant d'environ 7 ans, mais un métier profondément utile, très recherché au Sénégal comme à l'international.",
        debouches: 'Hôpitaux publics et cliniques privées;Spécialisations (chirurgie, pédiatrie, cardiologie…);ONG et santé publique;Recherche médicale et enseignement',
      },
      {
        titre: 'Ingénieur·e informatique',
        domaine: 'Numérique & Tech',
        image: '/metiers/informatique.jpg',
        description:
          "Concevoir des logiciels, des applications mobiles et des systèmes sécurisés : l'informatique recrute partout. Formations possibles : École Polytechnique de Thiès (EPT), ESP Dakar, licences d'informatique à l'UCAD, classes préparatoires puis écoles d'ingénieurs.",
        debouches: 'Développement web et mobile;Data science et intelligence artificielle;Cybersécurité;Entrepreneuriat tech et freelance',
      },
      {
        titre: 'Avocat·e / Juriste',
        domaine: 'Droit & Justice',
        image: '/metiers/juriste.jpg',
        description:
          "Défendre, conseiller et rédiger les contrats : le juriste est indispensable aux entreprises comme aux particuliers. Études : licence puis master en droit (UCAD - Faculté des Sciences Juridiques et Politiques), puis école de formation professionnelle pour devenir avocat ou magistrat.",
        debouches: 'Barreau (avocat);Magistrature (juge, procureur);Juriste d’entreprise ou de banque;Notariat et fonction publique',
      },
      {
        titre: 'Architecte',
        domaine: 'Bâtiment & Urbanisme',
        image: '/metiers/architecte.jpg',
        description:
          "Imaginer et dessiner les bâtiments de demain : logements, écoles, hôpitaux. Avec l'essor de la construction au Sénégal, les architectes sont très demandés. Formation : écoles d'architecture (Dakar, Lomé, Rabat…) après un Bac scientifique ou littéraire.",
        debouches: 'Cabinets d’architecture;BTP et promotion immobilière;Urbanisme et collectivités locales;Design d’intérieur',
      },
      {
        titre: 'Enseignant·e / Journaliste',
        domaine: 'Lettres & Communication',
        image: '/metiers/agronome.jpg',
        description:
          "Pour les élèves de la filière Lettres : l'enseignement (lettres, histoire-géo, philosophie) via les universités et l'FASTEF, ou le journalisme et la communication via le CESTI de Dakar. Deux métiers qui font vivre les idées et la transmission.",
        debouches: 'Enseignement (collèges, lycées, université);Journalisme presse, radio, TV;Communication d’entreprise;Édition et rédaction web',
      },
    ];
    const ins = db.prepare(
      'INSERT INTO metiers (titre, domaine, description, debouches, image, ordre) VALUES (@titre, @domaine, @description, @debouches, @image, @ordre)'
    );
    metiers.forEach((m, i) => ins.run({ ...m, ordre: i + 1 }));
    log(`[seed] ${metiers.length} fiches métiers créées.`);
  }

  return result;
}

module.exports = { seed, CLASSES };
