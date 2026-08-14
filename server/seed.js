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

  return result;
}

module.exports = { seed, CLASSES };
