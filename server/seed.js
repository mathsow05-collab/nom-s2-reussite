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
