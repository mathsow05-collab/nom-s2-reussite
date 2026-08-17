import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

// Décode le texte des blocs : lignes « Sous-titre : » puis métiers séparés par « ; ».
export function parseBlocs(texte) {
  const blocs = [];
  let cur = null;
  for (const ligne of String(texte || '').split('\n')) {
    const l = ligne.trim();
    if (!l) continue;
    if (l.endsWith(':')) {
      cur = { sous: l.slice(0, -1).trim(), metiers: [] };
      blocs.push(cur);
    } else {
      if (!cur) {
        cur = { sous: '', metiers: [] };
        blocs.push(cur);
      }
      cur.metiers.push(...l.split(';').map((m) => m.trim()).filter(Boolean));
    }
  }
  return blocs;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const DOM_EMOJI = {
  sant: '🩺', déf: '🛡️', mer: '⚓', ciel: '✈️', num: '💻', data: '📊', btp: '🏗️',
  bât: '📐', énerg: '⚡', agric: '🌱', terre: '🪨', scienc: '🔬', finan: '💰',
  écon: '📈', droit: '⚖️', éduc: '🧑‍', médi: '️', lettre: '', tour: '',
  psych: '🧠', dipl: '🌍', comm: '📣', bibl: '🗃️', hist: '🏺', trad: '',
  phot: '', santé: '',
};
function domEmoji(d) {
  const n = norm(d || '');
  for (const [k, e] of Object.entries(DOM_EMOJI)) if (n.startsWith(k)) return e;
  return '💼';
}

/* ------------------------- Test d'orientation ------------------------- */
const QUIZ = [
  {
    q: 'Ce qui te motive le plus, c’est…',
    r: [
      ['Soigner et aider les gens', 'sante'],
      ['Construire des choses concrètes', 'btp'],
      ['Comprendre comment tout fonctionne', 'sciences'],
      ['Défendre, protéger, servir', 'defense'],
      ['Créer, écrire, communiquer', 'lettres'],
      ['Gérer, entreprendre, compter', 'finance'],
    ],
  },
  {
    q: 'Ta matière préférée au lycée ?',
    r: [
      ['SVT / biologie', 'sante'],
      ['Maths', 'sciences'],
      ['Physique-chimie', 'btp'],
      ['Français / philo', 'lettres'],
      ['Histoire-géo', 'defense'],
      ['Éco / gestion', 'finance'],
    ],
  },
  {
    q: 'Dans un projet de groupe, tu es plutôt…',
    r: [
      ['Celui qui organise tout', 'finance'],
      ['Celui qui explique aux autres', 'lettres'],
      ['Celui qui répare et expérimente', 'sciences'],
      ['Celui qui prend soin de l’équipe', 'sante'],
      ['Celui qui sécurise le plan', 'defense'],
      ['Celui qui dessine la solution', 'btp'],
    ],
  },
  {
    q: 'Ton environnement de travail rêvé ?',
    r: [
      ['Un hôpital / un labo', 'sante'],
      ['Un grand chantier', 'btp'],
      ['Un bureau avec des écrans de données', 'sciences'],
      ['Sur le terrain, en uniforme', 'defense'],
      ['Une rédaction, un plateau, une scène', 'lettres'],
      ['Une banque ou ma propre entreprise', 'finance'],
    ],
  },
  {
    q: 'Ce qui te rendrait le plus fier ?',
    r: [
      ['Sauver des vies', 'sante'],
      ['Voir un bâtiment que j’ai conçu', 'btp'],
      ['Découvrir quelque chose de nouveau', 'sciences'],
      ['Protéger mon pays', 'defense'],
      ['Toucher les gens par mes mots', 'lettres'],
      ['Réussir un grand projet', 'finance'],
    ],
  },
  {
    q: 'Ta vraie force, c’est…',
    r: [
      ['Écouter et aider les autres', 'sante'],
      ['Expliquer avec des mots simples', 'lettres'],
      ['Comprendre la logique des choses', 'sciences'],
      ['Construire de mes mains', 'btp'],
      ['Convaincre et organiser', 'finance'],
      ['Défendre ce qui est juste', 'defense'],
    ],
  },
  {
    q: 'Et après le Bac, ton objectif ?',
    r: [
      ['Des études courtes pour travailler vite', 'court'],
      ['De longues études pour viser haut', 'long'],
      ['Créer ma propre entreprise', 'entreprendre'],
      ['Servir mon pays (armée, administration)', 'defense'],
      ['Continuer mes études à l’étranger', 'etranger'],
      ['Je ne sais pas encore', 'court'],
    ],
  },
];
const COMPETENCES = {
  sante: ['empathie', 'rigueur scientifique', 'sang-froid'],
  btp: ['logique', 'dessin technique', 'travail d’équipe'],
  sciences: ['analyse', 'curiosité', 'méthode'],
  defense: ['discipline', 'leadership', 'sang-froid'],
  lettres: ['expression écrite', 'culture générale', 'créativité'],
  finance: ['organisation', 'calcul mental', 'communication'],
};
const TAG_PARCOURS = {
  sante: ['Santé'],
  btp: ['Ingénierie', 'Sciences'],
  sciences: ['Sciences', 'Ingénierie'],
  defense: ['Droit', 'Sciences Politiques'],
  lettres: ['Lettres', 'Journalisme', 'Sciences Humaines'],
  finance: ['Économie', 'Gestion'],
};
const TAG_DOMAINES = {
  sante: ['sant', 'médec', 'pharma', 'psych'],
  btp: ['btp', 'bâtiment', 'urban', 'architecture', 'génie'],
  sciences: ['scienc', 'data', 'numéri', 'tech', 'recherche', 'terre', 'stat'],
  defense: ['défense', 'sécurité', 'militaire', 'mer', 'ciel', 'dipl'],
  lettres: ['lettre', 'média', 'édit', 'comm', 'droit', 'justice', 'trad', 'hist', 'éduc'],
  finance: ['finan', 'écon', 'gestion', 'compt', 'tour'],
};

function OrientationQuiz({ metiers, parcours, onPick, onPickP, onClose }) {
  const [i, setI] = useState(0);
  const [scores, setScores] = useState({});
  const [resultat, setResultat] = useState(null);

  function repondre(tag) {
    const s = { ...scores, [tag]: (scores[tag] || 0) + 1 };
    setScores(s);
    if (i + 1 >= QUIZ.length) {
      const top = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
      const sugg = [];
      for (const t of top) {
        for (const m of metiers) {
          const dom = norm(m.domaine);
          if ((TAG_DOMAINES[t] || []).some((k) => dom.includes(norm(k))) && !sugg.find((x) => x.id === m.id)) sugg.push(m);
        }
      }
      const parcs = [];
      for (const t of top) {
        for (const kw of TAG_PARCOURS[t] || []) {
          for (const p of parcours) {
            if (norm(p.titre).includes(norm(kw)) && !parcs.find((x) => x.id === p.id)) parcs.push(p);
          }
        }
      }
      const comps = [...new Set(top.flatMap((t) => COMPETENCES[t] || []))].slice(0, 6);
      setResultat({ met: (sugg.length ? sugg : metiers.slice(0, 3)).slice(0, 3), parcs: parcs.slice(0, 3), comps });
    } else setI(i + 1);
  }

  return (
    <Modal title="Quel métier te ressemble ?" onClose={onClose}>
      {resultat ? (
        <>
          <p className="muted">D'après tes réponses, voici ton profil d'orientation :</p>
          <h4 className="h4">Métiers qui te ressemblent</h4>
          <div className="quiz-sugg">
            {resultat.met.map((m) => (
              <button key={m.id} className="sugg-card" onClick={() => onPick(m)}>
                {m.image && <img src={m.image} alt="" />}
                <strong>{m.titre}</strong>
                <span className="muted small">{m.domaine}</span>
              </button>
            ))}
          </div>
          {resultat.parcs.length > 0 && (
            <>
              <h4 className="h4">Parcours d'études conseillés</h4>
              <div className="tags-wrap">
                {resultat.parcs.map((p) => (
                  <button key={p.id} className="tag-chip link" onClick={() => onPickP(p)}>
                    {p.titre} <Icon name="right" size={12} />
                  </button>
                ))}
              </div>
            </>
          )}
          {resultat.comps.length > 0 && (
            <>
              <h4 className="h4">Compétences à développer</h4>
              <div className="tags-wrap">
                {resultat.comps.map((c) => (
                  <span key={c} className="tag-chip">
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => { setI(0); setScores({}); setResultat(null); }}>
              <Icon name="refresh" size={15} /> Refaire le test
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="muted small" style={{ marginBottom: 8 }}>
            Question {i + 1}/{QUIZ.length}
          </div>
          <div className="quiz-bar">
            <div style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} />
          </div>
          <h3 style={{ margin: '10px 0 14px' }}>{QUIZ[i].q}</h3>
          <div className="quiz-choices">
            {QUIZ[i].r.map(([label, tag]) => (
              <button key={label} className="quiz-choice" onClick={() => repondre(tag)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ------------------------- Page Orientation ------------------------- */
export default function Metiers() {
  const [me, setMe] = useState(null);
  const [metiers, setMetiers] = useState(null);
  const [parcours, setParcours] = useState([]);
  const [q, setQ] = useState('');
  const [domaine, setDomaine] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState({});
  const [open, setOpen] = useState(null);
  const [openP, setOpenP] = useState(null);
  const [quiz, setQuiz] = useState(false);
  const [vue, setVue] = useState('metiers');

  useEffect(() => {
    api('/eleve/me').then((m) => {
      setMe(m);
      try {
        setFavs(JSON.parse(localStorage.getItem('s2r_fav_' + m.eleve_id) || '{}'));
      } catch {
        setFavs({});
      }
    });
    api('/eleve/metiers').then(setMetiers).catch(() => setMetiers([]));
    api('/eleve/parcours-univ').then(setParcours).catch(() => setParcours([]));
  }, []);

  function toggleFav(m) {
    setFavs((f) => {
      const next = { ...f, [m.id]: !f[m.id] };
      if (me) localStorage.setItem('s2r_fav_' + me.eleve_id, JSON.stringify(next));
      return next;
    });
  }

  const domaines = useMemo(() => {
    const set = new Map();
    (metiers || []).forEach((m) => {
      const d = (m.domaine || 'Autre').split('&')[0].trim();
      set.set(d, (set.get(d) || 0) + 1);
    });
    return [...set.keys()];
  }, [metiers]);

  if (!metiers || !me)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const nq = norm(q);
  const filtres = metiers.filter((m) => {
    if (favOnly && !favs[m.id]) return false;
    if (domaine !== 'all' && !(m.domaine || '').startsWith(domaine)) return false;
    if (nq && !norm(m.titre + ' ' + m.domaine + ' ' + m.description + ' ' + (m.parcours || '')).includes(nq)) return false;
    return true;
  });
  const univ = parcours.filter((p) => p.cible !== 'all');
  const formations = parcours.filter((p) => p.cible === 'all');
  const univFiltres = univ.filter((p) => !nq || norm(p.titre + ' ' + p.intro + ' ' + p.blocs).includes(nq));
  const formFiltres = formations.filter((p) => !nq || norm(p.titre + ' ' + p.intro + ' ' + p.blocs).includes(nq));

  return (
    <main className="container orient">
      <section className="orient-hero">
        <h1>Ton avenir commence ici</h1>
        <p>Métiers, universités, formations : explore, garde tes favoris et trouve la voie qui te ressemble.</p>
        <div className="orient-search">
          <Icon name="eye" size={17} />
          <input
            placeholder="Rechercher (ex. médecin, droit, data, bourse…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="icon-btn" onClick={() => setQ('')}>
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
        <button className="btn btn-light" onClick={() => setQuiz(true)}>
          Je ne sais pas encore — fais-moi un test !
        </button>
      </section>

      <div className="orient-tabs" role="tablist">
        {[
          ['metiers', `Métiers (${metiers.length})`],
          ['etudes', `Études → Métiers (${parcours.length})`],
        ].map(([id, lbl]) => (
          <button key={id} className={vue === id ? 'otab active' : 'otab'} onClick={() => setVue(id)}>
            {lbl}
          </button>
        ))}
      </div>

      {vue === 'metiers' && (
        <div className="vue-anim" key="m">
          <div className="pills">
            <button className={favOnly ? 'pill active' : 'pill'} onClick={() => setFavOnly(!favOnly)}>
              Mes favoris
            </button>
            <button className={domaine === 'all' ? 'pill active' : 'pill'} onClick={() => setDomaine('all')}>
              Tous les domaines
            </button>
            {domaines.map((d) => (
              <button key={d} className={domaine === d ? 'pill active' : 'pill'} onClick={() => setDomaine(domaine === d ? 'all' : d)}>
                {d}
              </button>
            ))}
          </div>
          {filtres.length === 0 ? (
            <div className="empty">Aucun résultat pour « {q} ». Essaie un autre mot, ou lance le test d'orientation !</div>
          ) : (
            <div className="orient-grid">
              {filtres.map((m, i) => (
                <article className="orient-card anim" style={{ '--i': Math.min(i, 11) }} key={m.id}>
                  <button className="orient-fav" onClick={() => toggleFav(m)} aria-label="Favori">
                    {favs[m.id] ? <Icon name="heart" size={16} className="fav-on" /> : <Icon name="heart" size={16} />}
                  </button>
                  <button className="orient-img" onClick={() => setOpen(m)}>
                    {m.image ? <img src={m.image} alt="" loading="lazy" /> : <span className="orient-emoji">{domEmoji(m.domaine)}</span>}
                    <div className="orient-shade">
                      <span className="badge">{m.domaine}</span>
                      <strong>{m.titre}</strong>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {vue === 'etudes' && (
        <div className="vue-anim" key="e">
          {univFiltres.length === 0 && formFiltres.length === 0 ? (
            <div className="empty">Aucune filière trouvée pour « {q} ».</div>
          ) : (
            <>
              {univFiltres.length > 0 && (
                <>
                  <h2 className="orient-title">Universités & grandes filières</h2>
                  <div className="orient-grid">
                    {univFiltres.map((p, i) => (
                      <article className="orient-card anim" style={{ '--i': Math.min(i, 11) }} key={p.id}>
                        <button className="orient-img" onClick={() => setOpenP(p)}>
                          {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="uni-icon"><Icon name="cap" size={26} /></span>}
                          <div className="orient-shade">
                            <span className="badge badge-soft">Bac {p.cible}</span>
                            <strong>{p.titre}</strong>
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {formFiltres.length > 0 && (
                <>
                  <h2 className="orient-title">Écoles, BTS & mobilité</h2>
                  <div className="orient-grid">
                    {formFiltres.map((p, i) => (
                      <article className="orient-card anim" style={{ '--i': Math.min(i, 11) }} key={p.id}>
                        <button className="orient-img" onClick={() => setOpenP(p)}>
                          {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="uni-icon"><Icon name="building" size={26} /></span>}
                          <div className="orient-shade">
                            <span className="badge badge-soft">{p.cible === 'all' ? 'Pour tous' : `Bac ${p.cible}`}</span>
                            <strong>{p.titre}</strong>
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {open && (
        <Modal title={open.titre} onClose={() => setOpen(null)} wide>
          <div className="modal-hero">
            {open.image && <img src={open.image} alt="" />}
            <div className="modal-hero-shade">
              <span className="badge">{open.domaine}</span>
              <h3>{open.titre}</h3>
            </div>
            <button className="orient-fav on-img" onClick={() => toggleFav(open)}>
              {favs[open.id] ? <Icon name="heart" size={16} className="fav-on" /> : <Icon name="heart" size={16} />}
            </button>
          </div>
          <div className="mini-path">
            <span className="mp-step">Bac {open.filiere === 'all' ? '' : open.filiere}</span>
            <span className="mp-arrow">→</span>
            <span className="mp-step">Études</span>
            <span className="mp-arrow">→</span>
            <span className="mp-step on">{open.titre}</span>
          </div>
          <p style={{ marginTop: 12 }}>{open.description}</p>
          {open.parcours && (
            <>
              <h4 className="h4">Études après le Bac</h4>
              <p className="parcours-box">{open.parcours}</p>
            </>
          )}
          {open.debouches && (
            <>
              <h4 className="h4">Débouchés</h4>
              <div className="pills" style={{ marginBottom: 0 }}>
                {open.debouches
                  .split(';')
                  .map((d) => d.trim())
                  .filter(Boolean)
                  .map((d, i) => (
                    <span className="pill" style={{ cursor: 'default' }} key={i}>
                      {d}
                    </span>
                  ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {openP && (
        <Modal title="Ton parcours, étape par étape" onClose={() => setOpenP(null)} wide>
          <div className="uni-hero">
            {openP.image ? (
              <img className="uni-hero-img" src={openP.image} alt="" />
            ) : (
              <span className="uni-hero-icon"><Icon name="cap" size={26} /></span>
            )}
            <div>
              <span className="badge badge-light">{openP.cible === 'all' ? 'Pour tous les Bac' : `Réservé aux Bac ${openP.cible}`}</span>
              <h3>{openP.titre}</h3>
            </div>
          </div>
          {openP.intro && <p className="muted" style={{ marginTop: 12 }}>{openP.intro}</p>}
          <div className="path-timeline">
            <div className="pstep">
              <span className="pstep-dot"><Icon name="user" size={16} /></span>
              <div>
                <strong>Étape 1 — Ton Bac {openP.cible === 'all' ? '' : openP.cible}</strong>
                <p className="muted small">Le point de départ de ce parcours.</p>
              </div>
            </div>
            {parseBlocs(openP.blocs).map((b, i) => (
              <div className="pstep" key={i}>
                <span className="pstep-dot"><Icon name="building" size={16} /></span>
                <div>
                  <strong>
                    Étape {i + 2} — {b.sous || 'Ta formation'}
                  </strong>
                  <div className="tags-wrap" style={{ marginTop: 6 }}>
                    {b.metiers.map((m, j) => {
                      const hit = metiers.find(
                        (x) => norm(x.titre).includes(norm(m).split(' ')[0]) || norm(m).includes(norm(x.titre).split(' ')[0])
                      );
                      return (
                        <button
                          key={j}
                          className={hit ? 'tag-chip link' : 'tag-chip'}
                          title={hit ? 'Ouvrir la fiche métier' : undefined}
                          onClick={() => {
                            if (hit) {
                              setOpenP(null);
                              setOpen(hit);
                            }
                          }}
                        >
                          {m}
                          {hit && <Icon name="right" size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div className="pstep">
              <span className="pstep-dot"><Icon name="briefcase" size={16} /></span>
              <div>
                <strong>Et après → ton métier</strong>
                <p className="muted small">
                  Chaque formation ci-dessus mène à des métiers précis : touche ceux qui ont une flèche pour ouvrir leur fiche complète.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <h2 className="orient-title">Ils sont passés par là</h2>
      <div className="temo3">
        {[
          { n: 'Awa D., Terminale S2 → ESP Dakar', t: 'Les annales corrigées sur la plateforme m’ont appris à gérer le temps. Le jour du Bac, aucune surprise.' },
          { n: 'Moussa N., Bac L2 → FSJP (Droit)', t: 'Le test d’orientation m’a confirmé le droit. Voir les métiers derrière chaque filière change tout.' },
          { n: 'Fatou S., S2 → prépa médecine', t: 'Les examens blancs chronométrés, copie sur papier comme au vrai concours : c’est ça qui m’a rendue prête.' },
        ].map((x, i) => (
          <figure className="card temo3-card" key={i}>
            <blockquote>« {x.t} »</blockquote>
            <figcaption>{x.n}</figcaption>
          </figure>
        ))}
      </div>
      <h2 className="orient-title">Les métiers qui recrutent demain</h2>
      <div className="avenir3">
        {['Intelligence artificielle & data', 'Cybersécurité', 'Énergies renouvelables', 'Santé numérique', 'Agrotech & souveraineté alimentaire', 'Finance & mobile money'].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>

      {quiz && (
        <OrientationQuiz
          metiers={metiers}
          parcours={parcours}
          onClose={() => setQuiz(false)}
          onPick={(m) => {
            setQuiz(false);
            setVue('metiers');
            setOpen(m);
          }}
          onPickP={(p) => {
            setQuiz(false);
            setVue('etudes');
            setOpenP(p);
          }}
        />
      )}
    </main>
  );
}
