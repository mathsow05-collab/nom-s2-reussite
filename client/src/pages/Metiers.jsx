import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import CarteOrientation from './CarteOrientation.jsx';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/* Orientation = une seule expérience immersive : « Mon parcours ». */
export default function Metiers() {
  const [me, setMe] = useState(null);
  const [metiers, setMetiers] = useState([]);
  const [open, setOpen] = useState(null);
  const [quiz, setQuiz] = useState(false);

  useEffect(() => {
    api('/eleve/me').then(setMe);
    api('/eleve/metiers').then(setMetiers).catch(() => setMetiers([]));
  }, []);

  if (!me)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const findMetier = (nom) =>
    metiers.find((x) => norm(x.titre).includes(norm(nom).split(' ')[0]) || norm(nom).includes(norm(x.titre).split(' ')[0]));

  return (
    <main className="container orient">
      <CarteOrientation
        filiere={me.filiere}
        onOpenMetier={(nom) => {
          const hit = typeof nom === 'string' ? findMetier(nom) : nom;
          if (hit) setOpen(hit);
        }}
      />

      <section className="temo3" style={{ marginTop: 18 }}>
        {[
          { n: 'Awa D., Terminale S2 → ESP Dakar', t: 'Voir le chemin complet — concours, années, métiers — m’a décidée à viser l’ESP dès la Première.' },
          { n: 'Moussa N., Bac L2 → FSJP (Droit)', t: 'L’arbre m’a montré qu’après la licence je pouvais viser le barreau ou la diplomatie. Maintenant, je sais où je vais.' },
        ].map((x, i) => (
          <figure className="card temo3-card" key={i}>
            <blockquote>« {x.t} »</blockquote>
            <figcaption>{x.n}</figcaption>
          </figure>
        ))}
      </section>

      {open && (
        <Modal title={open.titre} onClose={() => setOpen(null)} wide>
          <div className="modal-hero">
            {open.image && <img src={open.image} alt="" />}
            <div className="modal-hero-shade">
              <span className="badge">{open.domaine}</span>
              <h3>{open.titre}</h3>
            </div>
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

      {quiz && <QuizOrientation metiers={metiers} onPick={(m) => { setQuiz(false); setOpen(m); }} onClose={() => setQuiz(false)} />}
    </main>
  );
}

/* Petit test d'orientation : intérêts → métiers suggérés. */
const QUIZ = [
  { q: 'Ce qui te motive le plus ?', r: [['Soigner, aider', 'sant'], ['Construire', 'bât'], ['Comprendre la logique du monde', 'scienc'], ['Défendre, convaincre', 'droit'], ['Créer, raconter', 'lettre'], ['Gérer, entreprendre', 'finan']] },
  { q: 'Ta matière préférée ?', r: [['SVT', 'sant'], ['Maths', 'scienc'], ['Physique', 'énerg'], ['Français / philo', 'lettre'], ['Histoire-géo', 'droit'], ['Éco / gestion', 'finan']] },
  { q: 'Ton environnement rêvé ?', r: [['Hôpital / labo', 'sant'], ['Chantier', 'bât'], ['Bureau tech / data', 'num'], ['Tribunal / ambassade', 'droit'], ['Plateau / studio', 'médi'], ['Banque / entreprise', 'finan']] },
  { q: 'Après le Bac, tu veux…', r: ['Des études longues', 'Travailler vite', 'Créer ma boîte', 'Servir mon pays'].map((l, i) => [l, ['long', 'court', 'entre', 'serv'][i]]) },
];
const TAGS = {
  sant: ['sant'], bât: ['btp', 'bât', 'génie'], scienc: ['scienc', 'data', 'math'], énerg: ['énerg', 'phys'],
  droit: ['droit', 'just'], lettre: ['lettre', 'trad', 'éduc'], finan: ['finan', 'écon', 'gest'],
  num: ['num', 'info'], médi: ['médi', 'comm'],
};

function QuizOrientation({ metiers, onPick, onClose }) {
  const [i, setI] = useState(0);
  const [scores, setScores] = useState({});
  const [res, setRes] = useState(null);
  function rep(tag) {
    const s = { ...scores, [tag]: (scores[tag] || 0) + 1 };
    setScores(s);
    if (i + 1 >= QUIZ.length) {
      const top = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
      const sugg = [];
      for (const t of top)
        for (const m of metiers) {
          const dom = norm(m.domaine);
          if ((TAGS[t] || []).some((k) => dom.includes(norm(k))) && !sugg.find((x) => x.id === m.id)) sugg.push(m);
        }
      setRes((sugg.length ? sugg : metiers.slice(0, 3)).slice(0, 3));
    } else setI(i + 1);
  }
  return (
    <Modal title="Aide-moi à choisir" onClose={onClose}>
      {res ? (
        <>
          <p className="muted">D'après tes réponses, explore en priorité :</p>
          <div className="quiz-sugg">
            {res.map((m) => (
              <button key={m.id} className="sugg-card" onClick={() => onPick(m)}>
                {m.image && <img src={m.image} alt="" />}
                <strong>{m.titre}</strong>
                <span className="muted small">{m.domaine}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="muted small">Question {i + 1}/{QUIZ.length}</div>
          <div className="quiz-bar">
            <div style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} />
          </div>
          <h3 style={{ margin: '10px 0 14px' }}>{QUIZ[i].q}</h3>
          <div className="quiz-choices">
            {QUIZ[i].r.map(([label, tag]) => (
              <button key={label} className="quiz-choice" onClick={() => rep(tag)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
