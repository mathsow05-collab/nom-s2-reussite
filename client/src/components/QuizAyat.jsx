import { useState } from 'react';
import { SOURATES_TEXT } from '../data-coran.js';
import Icon from '../Icon.jsx';

function melange(tab) {
  const t = [...tab];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Génère 10 questions « quel verset vient ensuite ? » depuis le texte des sourates.
function genererQuestions(n = 10) {
  const possibles = [];
  for (const [nom, ayat] of Object.entries(SOURATES_TEXT)) {
    for (let i = 0; i < ayat.length - 1; i++) possibles.push({ nom, i });
  }
  const toutes = Object.entries(SOURATES_TEXT).flatMap(([nom, ayat]) => ayat.map((v) => ({ nom, v })));
  const qs = [];
  for (const p of melange(possibles).slice(0, n)) {
    const ayat = SOURATES_TEXT[p.nom];
    const bonne = ayat[p.i + 1];
    const memes = ayat.filter((_, idx) => idx !== p.i + 1);
    const autres = toutes.filter((t) => t.nom !== p.nom).map((t) => t.v);
    const distracteurs = melange([...memes, ...autres]).slice(0, 3);
    qs.push({ nom: p.nom, verset: ayat[p.i], bonne, choix: melange([bonne, ...distracteurs]) });
  }
  return qs;
}

export default function QuizAyat() {
  const [questions, setQuestions] = useState(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [choisi, setChoisi] = useState(null);
  const [fini, setFini] = useState(false);

  function start() {
    setQuestions(genererQuestions(10));
    setIdx(0);
    setScore(0);
    setChoisi(null);
    setFini(false);
  }

  if (!questions)
    return (
      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Quiz des versets</h2>
        <p className="muted">
          « Quel verset vient ensuite ? » — 10 questions générées automatiquement depuis les petites sourates, pour
          ancrer ta mémorisation.
        </p>
        <button className="btn btn-primary" onClick={start}>
          <Icon name="award" size={16} /> Commencer le quiz
        </button>
      </section>
    );

  if (fini) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <section className="panel" style={{ marginBottom: 16, textAlign: 'center' }}>
        <div className="quiz-score">
          {score}/{questions.length}
        </div>
        <div className="quiz-pct">{pct} % — {pct >= 80 ? 'Mâ shâ’ Allah, excellent !' : pct >= 50 ? 'Bien, continue à écouter et réciter.' : 'Réécoute les sourates et réessaie.'}</div>
        <button className="btn btn-primary" onClick={start}>
          <Icon name="refresh" size={15} /> Rejouer
        </button>
      </section>
    );
  }

  const q = questions[idx];

  function repondre(v) {
    if (choisi !== null) return;
    setChoisi(v);
    if (v === q.bonne) setScore((s) => s + 1);
  }
  function suivant() {
    if (idx + 1 >= questions.length) setFini(true);
    else {
      setIdx(idx + 1);
      setChoisi(null);
    }
  }

  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="quiz-progress">
        <span className="badge badge-soft">Sourate {q.nom}</span>
        <span className="muted">
          Question {idx + 1}/{questions.length} · score {score}
        </span>
      </div>
      <div className="quiz-bar">
        <div style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="muted small">Quel verset vient juste après :</p>
      <div className="ayah-question">{q.verset}</div>
      <div className="ayah-choices">
        {q.choix.map((v, i) => {
          let cls = 'quiz-choice ayah';
          if (choisi !== null) {
            if (v === q.bonne) cls += ' good';
            else if (v === choisi) cls += ' bad';
          }
          return (
            <button key={i} className={cls} onClick={() => repondre(v)}>
              {v}
            </button>
          );
        })}
      </div>
      {choisi !== null && (
        <div className="form-actions">
          <span className={choisi === q.bonne ? 'ok-text' : 'ko-text'} style={{ alignSelf: 'center' }}>
            {choisi === q.bonne ? '✔ Exact !' : '✘ Pas tout à fait.'}
          </span>
          <button className="btn btn-primary" onClick={suivant}>
            {idx + 1 >= questions.length ? 'Voir mon score' : 'Suivant'} <Icon name="right" size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
