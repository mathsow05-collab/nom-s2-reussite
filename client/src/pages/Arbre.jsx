import { useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import { Modal } from '../ui.jsx';

/* Arbre des parcours : BAC → voie → filière → années → Master → métier.
   Chaque nœud s'ouvre sur : conditions, matières, compétences, débouchés,
   salaires indicatifs, formations. Effet 3D (tilt) sur les cartes filières. */

const DATA = {
  S2: {
    bac: { label: 'BAC S2', img: '/metiers/ecole.jpg', sub: 'Sciences expérimentales & maths' },
    filieres: [
      {
        id: 'maths', label: 'Maths & Stats', img: '/metiers/data.jpg',
        conditions: 'Bac S2 avec un bon niveau en mathématiques.',
        matieres: 'Analyse, algèbre, probabilités, statistiques, informatique.',
        competences: 'Raisonnement abstrait, rigueur, logique, modélisation.',
        debouches: 'Enseignement, actuariat, data science, recherche, banques.',
        salaires: '≈ 150 000 – 350 000 F/mois en début · 600 000 F et + avec l’expérience.',
        formations: 'Université : licence → master maths/stats (UCAD, UGB) ; ENSAE Dakar ; écoles d’ingénieurs ; prépa.',
        metiers: ['Actuaire', 'Statisticien', 'Data scientist', 'Enseignant·e'],
      },
      {
        id: 'info', label: 'Informatique', img: '/metiers/info.jpg',
        conditions: 'Bac S2 ; la logique compte plus que le matériel possédé.',
        matieres: 'Algorithmique, programmation, bases de données, réseaux.',
        competences: 'Résolution de problèmes, autonomie, anglais technique.',
        debouches: 'Développement web/mobile, cybersécurité, IA, freelance international.',
        salaires: '≈ 200 000 – 500 000 F/mois en début · télétravail international bien au-delà.',
        formations: 'ESP Dakar, EPT, licence-master info UCAD, BTS SIO + école, certifications en ligne.',
        metiers: ['Ingénieur en informatique', 'Data scientist'],
      },
      {
        id: 'phys', label: 'Physique & Ingénierie', img: '/metiers/energie.jpg',
        conditions: 'Bac S2, physique et maths solides.',
        matieres: 'Mécanique, électricité, thermodynamique, électronique.',
        competences: 'Calcul, expérimentation, travail en équipe, CAO.',
        debouches: 'Énergie solaire, BTP, télécoms, maintenance industrielle.',
        salaires: '≈ 200 000 – 450 000 F/mois en début · ingénieurs très demandés.',
        formations: 'EPT Thiès, ESP, ENSUT ; DUT/BTS puis diplôme d’ingénieur.',
        metiers: ['Ingénieur civil', 'Ingénieur électrotechnique', 'Ingénieur en télécommunications'],
      },
      {
        id: 'sante', label: 'Santé', img: '/metiers/medecin.jpg',
        conditions: 'Bac S2 + concours (médecine, pharmacie, soins).',
        matieres: 'Biologie, chimie, anatomie, physiologie.',
        competences: 'Mémoire, sang-froid, empathie, endurance.',
        debouches: 'Hôpitaux, cliniques, pharmacies, santé publique, ONG.',
        salaires: '≈ 250 000 F en début · spécialistes et privé nettement plus.',
        formations: 'FMPOS UCAD, facultés de médecine Thiès/Ziguinchor, écoles d’infirmiers et sages-femmes.',
        metiers: ['Médecin', 'Pharmacien', 'Sage-femme', 'Infirmier diplômé d’État'],
      },
      {
        id: 'agro', label: 'Agro & Terre', img: '/metiers/agronome.jpg',
        conditions: 'Bac S2 ; intérêt pour la nature et l’alimentation.',
        matieres: 'SVT, biologie, géologie, agronomie, gestion de l’eau.',
        competences: 'Observation, terrain, gestion de projets.',
        debouches: 'Agro-industrie, élevage, environnement, mines, hydraulique.',
        salaires: '≈ 150 000 – 350 000 F/mois · secteur stratégique en croissance.',
        formations: 'ENSA Thiès, licence-master biologie/géologie (UCAD), EISMV (vétérinaire).',
        metiers: ['Ingénieur agronome', 'Vétérinaire', 'Géologue', 'Biologiste'],
      },
    ],
  },
  L2: {
    bac: { label: 'BAC L2', img: '/metiers/lettres.jpg', sub: 'Lettres, langues & sciences humaines' },
    filieres: [
      {
        id: 'droit', label: 'Droit', img: '/metiers/juriste.jpg',
        conditions: 'Bac L2 ; bonne expression écrite et esprit d’analyse.',
        matieres: 'Droit civil, pénal, public, science politique.',
        competences: 'Argumentation, rédaction, mémoire, éthique.',
        debouches: 'Barreau, magistrature, notariat, juriste d’entreprise, administration.',
        salaires: '≈ 150 000 – 300 000 F en début · avocats expérimentés bien au-delà.',
        formations: 'FSJP UCAD (L1→Master) ; ENAM ; écoles de formation (avocat, magistrat).',
        metiers: ['Avocat·e / Juriste', 'Diplomate'],
      },
      {
        id: 'lettres', label: 'Lettres & Langues', img: '/metiers/lettres.jpg',
        conditions: 'Bac L2 ; amour de la lecture et de l’écriture.',
        matieres: 'Littérature, grammaire, langues (anglais, arabe, espagnol…).',
        competences: 'Expression, traduction, culture générale, créativité.',
        debouches: 'Enseignement, édition, traduction, communication, métiers du livre.',
        salaires: '≈ 120 000 – 250 000 F en début · traduction/communication payantes.',
        formations: 'FLASH UCAD, FASTEF (enseignement), masters métiers du livre, interprétariat.',
        metiers: ['Écrivain·e / Éditeur·rice', 'Traducteur·rice / Interprète', 'Enseignant·e', 'Bibliothécaire / Archiviste'],
      },
      {
        id: 'shs', label: 'Sciences humaines', img: '/metiers/campus.jpg',
        conditions: 'Bac L2 ; curiosité pour la société et les gens.',
        matieres: 'Sociologie, anthropologie, géographie, psychologie.',
        competences: 'Enquête, écoute, analyse, rédaction de rapports.',
        debouches: 'ONG, collectivités, études, action sociale, urbanisme.',
        salaires: '≈ 150 000 – 300 000 F/mois selon le secteur.',
        formations: 'Licence-master sociologie/géo/psychologie (UCAD), FASTEF.',
        metiers: ['Psychologue', 'Historien·ne / Archéologue'],
      },
      {
        id: 'media', label: 'Journalisme & Com', img: '/metiers/media.jpg',
        conditions: 'Bac L2 ; aisance à l’oral et à l’écrit.',
        matieres: 'Techniques rédactionnelles, médias, communication, PAO.',
        competences: 'Synthèse, rapidité, créativité, réseaux sociaux.',
        debouches: 'Rédactions, agences, community management, audiovisuel.',
        salaires: '≈ 150 000 – 350 000 F en début · freelance et pub très variables.',
        formations: 'CESTI Dakar (concours), licences info-com, écoles de design.',
        metiers: ['Journaliste / Communicant', 'Photographe / Réalisateur', 'Community manager / Designer graphique'],
      },
    ],
  },
};

const NIVEAUX = ['L1', 'L2', 'L3', 'Master'];

function Tilt({ children, className = '', onClick }) {
  const ref = useRef(null);
  function move(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-3px)`;
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

export default function Arbre({ filiere, metiers, onOpenMetier }) {
  const arbre = DATA[filiere] || DATA.S2;
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const findMetier = (nom) =>
    metiers.find((x) => norm(x.titre).includes(norm(nom).split(' ')[0]) || norm(nom).includes(norm(x.titre).split(' ')[0]));

  return (
    <div className="vue-anim">
      {/* Racine BAC */}
      <div className="arb-racine">
        <img src={arbre.bac.img} alt="" />
        <span className="arb-racine-txt">
          <strong>{arbre.bac.label}</strong>
          <small>{arbre.bac.sub}</small>
        </span>
      </div>
      <div className="arb-fil" />

      {/* Voies */}
      <div className="arb-voies">
        <span className="arb-voie">Université</span>
        <span className="arb-voie alt">Écoles & formations</span>
      </div>
      <div className="arb-fil" />

      {/* Filières (cartes 3D) */}
      <div className="arb-row">
        {arbre.filieres.map((f) => (
          <Tilt key={f.id} onClick={() => setSel(f)}>
            <img src={f.img} alt="" />
            <strong>{f.label}</strong>
            <small>{sel?.id === f.id ? 'Parcours ci-dessous' : 'Toucher pour dérouler'}</small>
          </Tilt>
        ))}
      </div>

      {/* Déroulé années → métier */}
      {sel && (
        <div className="arb-niveaux vue-anim">
          <div className="arb-fil" />
          {NIVEAUX.map((n, i) => (
            <div className="arb-niv" key={n}>
              <span className="arb-niv-dot">{n}</span>
              <div>
                <strong>
                  {n} — {sel.label}
                </strong>
                <small>{i === 0 ? 'Entrée à l’université après le Bac' : i === 3 ? 'Spécialisation et recherche' : 'Approfondissement du cursus'}</small>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(sel)}>
                Détails
              </button>
            </div>
          ))}
          <div className="arb-fil" />
          <div className="arb-niv metier">
            <span className="arb-niv-dot pro">
              <Icon name="briefcase" size={14} />
            </span>
            <div>
              <strong>MÉTIER</strong>
              <small>Touche un métier pour ouvrir sa fiche complète</small>
            </div>
          </div>
          <div className="arb-metiers">
            {sel.metiers.map((nom) => {
              const hit = findMetier(nom);
              return (
                <button key={nom} className={hit ? 'tag-chip link' : 'tag-chip'} onClick={() => hit && onOpenMetier(hit)}>
                  {nom}
                  {hit && <Icon name="right" size={12} />}
                </button>
              );
            })}
            <button className="btn btn-outline btn-sm" onClick={() => setDetail(sel)}>
              Conditions · salaires · formations
            </button>
          </div>
        </div>
      )}

      {detail && (
        <Modal title={detail.label} onClose={() => setDetail(null)} wide>
          <div className="det3">
            <img src={detail.img} alt="" />
            {[
              ['Conditions d’accès', detail.conditions, 'check'],
              ['Matières principales', detail.matieres, 'book'],
              ['Compétences à développer', detail.competences, 'spark'],
              ['Débouchés', detail.debouches, 'briefcase'],
              ['Salaires indicatifs', detail.salaires, 'chart'],
              ['Formations & écoles', detail.formations, 'cap'],
            ].map(([t, v, ic]) => (
              <div className="det3-ligne" key={t}>
                <span className="det3-ico">
                  <Icon name={ic} size={15} />
                </span>
                <div>
                  <strong>{t}</strong>
                  <p>{v}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
