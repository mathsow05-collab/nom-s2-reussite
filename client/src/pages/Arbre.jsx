import { useRef, useState } from 'react';
import Icon from '../Icon.jsx';

/* « Mon parcours » — expérience immersive post-Bac.
   Données organisées comme les sites d'orientation professionnels :
   voie universitaire (LMD : Licence 3 ans → Master +2 → Doctorat +3,
   inscription publique via Campusen) et voie écoles/formations (concours,
   BTS/DUT 2-3 ans), avec métiers, salaires indicatifs et conseil pratique. */

const DATA = {
  S2: {
    bac: 'BAC S2',
    img: '/metiers/ecole.jpg',
    filieres: [
      {
        id: 'data', label: 'Maths, Stats & Data', img: '/metiers/data.jpg',
        resume: 'La voie des chiffres : modéliser, prévoir, décider avec les données.',
        competences: ['Raisonnement abstrait', 'Rigueur', 'Statistiques', 'Anglais technique'],
        univ: {
          etabs: 'UCAD — Faculté des Sciences & Techniques (FST), UGB Saint-Louis, Université de Thiès',
          etapes: [
            ['Licence', '3 ans', 'Maths, statistiques, informatique, probabilités. Sélection en master sur dossier.'],
            ['Master', '+2 ans', 'Statistique appliquée, data science, actuariat, modélisation.'],
            ['Doctorat', '+3 ans', 'Recherche et enseignement supérieur (Bac+8 au total).'],
          ],
        },
        ecoles: [
          ['ENSAE Dakar', '3-4 ans', 'Concours — statistique & économie, la référence'],
          ['ESP / EPT', '5 ans', 'Concours post-Bac — diplôme d’ingénieur (maths appliquées)'],
          ['BTS / DUT informatique', '2-3 ans', 'Voie courte pour entrer vite dans la data'],
        ],
        metiers: [
          ['Actuaire', '300 000 – 700 000 F/mois'],
          ['Data scientist', '250 000 – 1 000 000 F/mois'],
          ['Statisticien', '200 000 – 450 000 F/mois'],
          ['Enseignant·e-chercheur', 'selon grille fonction publique'],
        ],
        conseil: 'Les maths du S2 sont ton ticket d’entrée : garde un bon niveau et vise l’ENSAE ou un master data.',
      },
      {
        id: 'info', label: 'Informatique & Numérique', img: '/metiers/info.jpg',
        resume: 'Coder, sécuriser, connecter : le secteur qui recrute le plus vite.',
        competences: ['Logique', 'Autonomie', 'Projets personnels', 'Anglais'],
        univ: {
          etabs: 'UCAD (FST) — licence & master Informatique, UGB, Université de Thiès',
          etapes: [
            ['Licence', '3 ans', 'Algorithmique, programmation, bases de données, réseaux.'],
            ['Master', '+2 ans', 'Génie logiciel, IA, cybersécurité, systèmes distribués.'],
            ['Doctorat', '+3 ans', 'Recherche en informatique.'],
          ],
        },
        ecoles: [
          ['ESP Dakar / EPT Thiès', '5 ans', 'Concours — ingénieurs en informatique & télécoms'],
          ['BTS SIO / DUT réseaux', '2-3 ans', 'Emploi rapide puis passerelles vers licence pro'],
          ['Certifications en ligne', 'continu', 'Complètent le diplôme (Cisco, AWS, Google)'],
        ],
        metiers: [
          ['Développeur web/mobile', '200 000 – 600 000 F/mois'],
          ['Expert cybersécurité', '400 000 – 1 200 000 F/mois'],
          ['Ingénieur télécoms', '300 000 – 700 000 F/mois'],
        ],
        conseil: 'Un portfolio (petits projets en ligne) vaut souvent autant que le diplôme aux yeux des recruteurs.',
      },
      {
        id: 'ing', label: 'Physique & Ingénierie', img: '/metiers/energie.jpg',
        resume: 'Construire, produire, électrifier : le Sénégal bâtit et se met au solaire.',
        competences: ['Physique', 'Calcul', 'CAO & manipulations', 'Travail d’équipe'],
        univ: {
          etabs: 'UCAD (FST) licence physique/électronique → masters énergie & matériaux',
          etapes: [
            ['Licence', '3 ans', 'Physique, électronique, mécanique, maths appliquées.'],
            ['Master', '+2 ans', 'Énergies renouvelables, matériaux, électronique.'],
            ['Doctorat', '+3 ans', 'Recherche appliquée.'],
          ],
        },
        ecoles: [
          ['ESP / EPT / ENSUT', '5 ans', 'Concours — génie civil, électrotechnique, télécoms'],
          ['DUT génie civil / élec', '2-3 ans', 'Technicien supérieur, chantier rapide'],
          ['ENSTP', 'variable', 'Travaux publics'],
        ],
        metiers: [
          ['Ingénieur civil', '300 000 – 800 000 F/mois'],
          ['Ingénieur électrotechnique', '300 000 – 700 000 F/mois'],
          ['Chef de chantier', '250 000 – 500 000 F/mois'],
        ],
        conseil: 'Les stages en entreprise dès la 2e année font la différence à l’embauche.',
      },
      {
        id: 'sante', label: 'Santé & Médecine', img: '/metiers/medecin.jpg',
        resume: 'Soigner et sauver : longues études, métier respecté, besoin énorme.',
        competences: ['Mémoire', 'Empathie', 'Sang-froid', 'Endurance'],
        univ: {
          etabs: 'FMPOS (UCAD), Facultés de médecine de Thiès & Ziguinchor',
          etapes: [
            ['Concours + 1er cycle', '1-3 ans', 'Sélection sévère après le Bac S2 (notes + concours).'],
            ['2e/3e cycle médecine', '+4-6 ans', 'Externat, internat, spécialisation (7 à 10 ans au total).'],
            ['Pharmacie / Odontologie', '6 ans', 'Thèse de docteur en pharmacie ou chirurgie dentaire.'],
          ],
        },
        ecoles: [
          ['ENDSS', '2-3 ans', 'Infirmiers, sages-femmes, techniciens de santé'],
          ['Écoles privées agréées', '2-3 ans', 'Vérifie l’agrément avant de t’inscrire'],
        ],
        metiers: [
          ['Médecin', '350 000 F et + /mois'],
          ['Pharmacien', '400 000 F et + /mois'],
          ['Infirmier d’État', '150 000 – 300 000 F/mois'],
          ['Sage-femme', '180 000 – 350 000 F/mois'],
        ],
        conseil: 'Prépare le concours dès la Terminale : SVT, physique et surtout maths.',
      },
      {
        id: 'agro', label: 'Agro, Environnement & Terre', img: '/metiers/agronome.jpg',
        resume: 'Nourrir, protéger, explorer : souveraineté alimentaire et ressources.',
        competences: ['SVT', 'Terrain', 'Gestion de projet', 'Sensibilité écologique'],
        univ: {
          etabs: 'UCAD (FST biologie/géologie), ISE (environnement), IST (géologues)',
          etapes: [
            ['Licence', '3 ans', 'Biologie, géologie, écologie, chimie.'],
            ['Master', '+2 ans', 'Environnement, ressources en eau, mines.'],
            ['Doctorat', '+3 ans', 'Recherche (ISRA, IRD…).'],
          ],
        },
        ecoles: [
          ['ENSA Thiès', '5 ans', 'Concours — ingénieurs agronomes'],
          ['EISMV Dakar', '6 ans', 'Vétérinaire (école inter-États)'],
          ['BTS agricole', '2 ans', 'Technicien, insertion rapide'],
        ],
        metiers: [
          ['Ingénieur agronome', '250 000 – 600 000 F/mois'],
          ['Vétérinaire', '300 000 – 700 000 F/mois'],
          ['Géologue', '300 000 – 800 000 F/mois'],
        ],
        conseil: 'Le pétrole, le gaz et les mines ouvrent grand cette filière au Sénégal dans les années qui viennent.',
      },
      {
        id: 'eco', label: 'Économie & Gestion', img: '/metiers/finance.jpg',
        resume: 'Comprendre l’argent, les marchés, les organisations.',
        competences: ['Calcul', 'Synthèse', 'Communication', 'Excel & outils'],
        univ: {
          etabs: 'UCAD — SEG (Sciences Économiques et Gestion), UGB',
          etapes: [
            ['Licence', '3 ans', 'Économie, comptabilité, management, statistiques.'],
            ['Master', '+2 ans', 'Finance, audit, contrôle de gestion, marketing.'],
            ['Doctorat', '+3 ans', 'Enseignement et recherche.'],
          ],
        },
        ecoles: [
          ['ISG / ESG (UCAD)', '4-5 ans', 'Gestion, finance, sur concours/dossier'],
          ['CESAG, ISM, IAM (privés)', '3-5 ans', 'Réputés — frais à prévoir, bourses possibles'],
          ['BTS comptabilité/gestion', '2 ans', 'Emploi rapide en cabinet ou banque'],
        ],
        metiers: [
          ['Expert-comptable', '350 000 – 900 000 F/mois'],
          ['Analyste financier', '300 000 – 700 000 F/mois'],
          ['Banquier', '200 000 – 500 000 F/mois'],
        ],
        conseil: 'L’anglais + un tableur maîtrisé te mettent au-dessus du lot dès la licence.',
      },
    ],
  },
  L2: {
    bac: 'BAC L2',
    img: '/metiers/lettres.jpg',
    filieres: [
      {
        id: 'droit', label: 'Droit & Science politique', img: '/metiers/juriste.jpg',
        resume: 'Défendre, réguler, représenter : la voix de la justice et de l’État.',
        competences: ['Argumentation', 'Rédaction', 'Mémoire', 'Éthique'],
        univ: {
          etabs: 'UCAD — FSJP (Faculté des Sciences Juridiques et Politiques), UGB',
          etapes: [
            ['Licence', '3 ans', 'Droit civil, pénal, public, science politique (via Campusen).'],
            ['Master', '+2 ans', 'Droit des affaires, droit international, CRFPA.'],
            ['Écoles professionnelles', '+1-2 ans', 'Barreau (avocat), magistrature, notariat.'],
          ],
        },
        ecoles: [
          ['ENA / ENAM', '2-3 ans', 'Concours — administration publique, diplomatie'],
          ['CFJ', 'variable', 'Formation judiciaire'],
        ],
        metiers: [
          ['Avocat·e', 'très variable, croît avec la clientèle'],
          ['Magistrat·e', '350 000 F et + /mois'],
          ['Juriste d’entreprise', '250 000 – 600 000 F/mois'],
          ['Diplomate', 'selon grille des affaires étrangères'],
        ],
        conseil: 'Les plaidoiries et concours d’éloquence en licence sont un excellent entraînement.',
      },
      {
        id: 'lettres', label: 'Lettres, Langues & Enseignement', img: '/metiers/parcours.jpg',
        resume: 'Transmettre et raconter : former les générations, publier, traduire.',
        competences: ['Expression écrite', 'Lecture', 'Pédagogie', 'Langues'],
        univ: {
          etabs: 'UCAD — FLASH (lettres, langues, arts), UGB',
          etapes: [
            ['Licence', '3 ans', 'Littérature, grammaire, anglais/arabe/espagnol, linguistique.'],
            ['Master', '+2 ans', 'Métiers du livre, traduction, didactique.'],
            ['Doctorat', '+3 ans', 'Recherche et enseignement supérieur.'],
          ],
        },
        ecoles: [
          ['FASTEF / CRFPE', '1-3 ans', 'Concours — professeurs de collège/lycée'],
          ['EBAD (UCAD)', '2-3 ans', 'Bibliothécaires, archivistes, documentalistes'],
        ],
        metiers: [
          ['Enseignant·e', 'grille fonction publique + heures sup'],
          ['Traducteur·rice', '200 000 – 500 000 F/mois'],
          ['Écrivain·e / Éditeur·rice', 'variable selon projets'],
        ],
        conseil: 'Le concours d’enseignement se prépare dès la licence : vise la mention.',
      },
      {
        id: 'shs', label: 'Sciences humaines & Social', img: '/metiers/campus.jpg',
        resume: 'Comprendre l’humain et la société, accompagner les plus fragiles.',
        competences: ['Écoute', 'Enquête', 'Analyse', 'Rédaction de rapports'],
        univ: {
          etabs: 'UCAD — FLASH sociologie/anthropologie/géographie, psychologie',
          etapes: [
            ['Licence', '3 ans', 'Théories, méthodes d’enquête, terrains.'],
            ['Master', '+2 ans', 'Psychologie clinique, développement, urbanisme.'],
            ['Doctorat', '+3 ans', 'Recherche et expertise.'],
          ],
        },
        ecoles: [
          ['ENTSS', '2-3 ans', 'Concours — travailleurs sociaux spécialisés'],
        ],
        metiers: [
          ['Psychologue', '200 000 – 500 000 F/mois'],
          ['Assistant·e social·e', '150 000 – 300 000 F/mois'],
          ['Chargé·e d’études', '250 000 – 500 000 F/mois'],
        ],
        conseil: 'Les ONG et bureaux d’études recrutent beaucoup d’enquêteurs : multiplie les stages.',
      },
      {
        id: 'media', label: 'Journalisme, Com & Arts', img: '/metiers/media.jpg',
        resume: 'Informer, créer, faire vibrer : médias, publicité, design, audiovisuel.',
        competences: ['Curiosité', 'Aisance orale', 'Créativité', 'Réseaux sociaux'],
        univ: {
          etabs: 'UCAD — licences info-com ; UGB',
          etapes: [
            ['Licence', '3 ans', 'Communication, journalisme, sémiologie, PAO.'],
            ['Master', '+2 ans', 'Stratégies de communication, médias numériques.'],
          ],
        },
        ecoles: [
          ['CESTI (UCAD)', '3 ans', 'Concours — la référence du journalisme'],
          ['École nationale des Arts / ISAD', '3-5 ans', 'Arts, design, musique'],
          ['Sup’Imax, ISIC (privés)', '2-3 ans', 'Audiovisuel & multimédia'],
        ],
        metiers: [
          ['Journaliste', '150 000 – 400 000 F/mois'],
          ['Community manager', '150 000 – 350 000 F/mois'],
          ['Designer graphique', '200 000 – 600 000 F/mois'],
        ],
        conseil: 'Constitue un book (articles, visuels, vidéos) dès la première année.',
      },
      {
        id: 'tour', label: 'Tourisme, Hôtellerie & Commerce', img: '/metiers/tourisme.jpg',
        resume: 'Accueillir le monde : hôtels, agences, événementiel, import-export.',
        competences: ['Langues', 'Sens du contact', 'Organisation', 'Sourire'],
        univ: {
          etabs: 'UCAD (licence tourisme, géographie), ILEA (langues appliquées)',
          etapes: [
            ['Licence', '3 ans', 'Tourisme, langues, économie du secteur.'],
            ['Master', '+2 ans', 'Management hôtelier, marketing touristique.'],
          ],
        },
        ecoles: [
          ['ENFHT', '2-3 ans', 'Concours — hôtellerie, tourisme, restauration'],
          ['BTS tourisme / commerce', '2 ans', 'Insertion rapide'],
        ],
        metiers: [
          ['Guide touristique', '150 000 – 300 000 F + pourboires'],
          ['Responsable hôtel', '300 000 – 700 000 F/mois'],
          ['Agent de voyage', '150 000 – 350 000 F/mois'],
        ],
        conseil: 'Deux langues vivantes solides (anglais + une autre) doublent tes chances.',
      },
    ],
  },
};

function Tilt({ children, className = '', onClick }) {
  const ref = useRef(null);
  function move(e) {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`;
  }
  function leave() {
    if (ref.current) ref.current.style.transform = '';
  }
  return (
    <button ref={ref} className={`tilt3 ${className}`} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Arbre({ filiere, onOpenMetier }) {
  const arbre = DATA[filiere] || DATA.S2;
  const [sel, setSel] = useState(null);

  return (
    <div>
      {!sel ? (
        <div className="vue-anim">
          <div className="arb2-hero">
            <img src={arbre.img} alt="" />
            <div className="arb2-hero-txt">
              <small>Après le</small>
              <strong>{arbre.bac}</strong>
              <p>Deux routes s'ouvrent à toi : l'université (système LMD) ou les écoles & formations professionnelles. Touche une filière pour dérouler tout ton chemin.</p>
            </div>
          </div>
          <div className="arb2-voies">
            <span className="arb-voie">
              <Icon name="cap" size={13} /> Université — Licence 3 ans · Master +2 · Doctorat +3
            </span>
            <span className="arb-voie alt">
              <Icon name="briefcase" size={13} /> Écoles & BTS/DUT — 2 à 5 ans, sur concours
            </span>
          </div>
          <div className="arb2-grid">
            {arbre.filieres.map((f, i) => (
              <Tilt key={f.id} className="arb2-card" onClick={() => setSel(f)}>
                <img src={f.img} alt="" />
                <strong>{f.label}</strong>
                <small>{f.resume}</small>
                <span className="arb2-cta">
                  Découvrir mon chemin <Icon name="right" size={12} />
                </span>
              </Tilt>
            ))}
          </div>
        </div>
      ) : (
        <div className="vue-anim">
          <div className="arb2-crumb">
            <button className="btn btn-ghost btn-sm" onClick={() => setSel(null)}>
              <Icon name="left" size={14} /> {arbre.bac}
            </button>
            <span className="arb2-crumb-sep">›</span>
            <strong>{sel.label}</strong>
          </div>

          <header className="arb2-cover">
            <img src={sel.img} alt="" />
            <div className="arb2-cover-txt">
              <strong>{sel.label}</strong>
              <p>{sel.resume}</p>
              <div className="tags-wrap">
                {sel.competences.map((c) => (
                  <span key={c} className="tag-chip">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="arb2-voies2">
            <section className="card s3card">
              <h2>
                <Icon name="cap" size={16} /> Voie universitaire (LMD)
              </h2>
              <p className="muted small">{sel.univ.etabs}</p>
              <p className="muted small">Inscription publique via <strong>Campusen</strong> (notes du Bac + mention).</p>
              <div className="path-timeline">
                {sel.univ.etapes.map(([t, d, det], i) => (
                  <div className="pstep" key={t}>
                    <span className="pstep-dot arb2-num">{i + 1}</span>
                    <div>
                      <strong>
                        {t} · {d}
                      </strong>
                      <p className="muted small">{det}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card s3card">
              <h2>
                <Icon name="briefcase" size={16} /> Écoles & formations pro
              </h2>
              <p className="muted small">Accès surtout par <strong>concours</strong> après le Bac.</p>
              <div className="path-timeline">
                {sel.ecoles.map(([nom, d, det], i) => (
                  <div className="pstep" key={nom}>
                    <span className="pstep-dot arb2-num alt">{i + 1}</span>
                    <div>
                      <strong>
                        {nom} · {d}
                      </strong>
                      <p className="muted small">{det}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card s3card">
            <h2>
              <Icon name="target" size={16} /> Métiers visés & salaires indicatifs
            </h2>
            <div className="arb2-metiers">
              {sel.metiers.map(([nom, sal]) => (
                <button key={nom} className="arb2-met" onClick={() => onOpenMetier(nom)}>
                  <strong>{nom}</strong>
                  <small>{sal}</small>
                </button>
              ))}
            </div>
            <div className="arb2-conseil">
              <Icon name="spark" size={15} /> {sel.conseil}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
