import { useEffect, useState } from 'react';
import { QUESTIONS_HG } from '../data-quiz-hg.js';
import Icon from '../Icon.jsx';

const DUREE = 20; // secondes par question

function melange(t) {
  const a = [...t];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mini-jeu culture générale Histoire-Géo : 10 questions, chrono,
// série de bonnes réponses, et une explication après chaque réponse.
export default function MiniJeu() {
  const [etat, setEtat] = useState('idle'); // idle | jeu | fin
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [serie, setSerie] = useState(0);
  const [meilleure, setMeilleure] = useState(0);
  const [choisi, setChoisi] = useState(null);
  const [temps, setTemps] = useState(DUREE);

  const q = questions[idx];

  useEffect(() => {
    if (etat !== 'jeu' || choisi !== null) return;
    if (temps <= 0) {
      setChoisi(-1); // temps écoulé = raté
      setSerie(0);
      return;
    }
    const t = setTimeout(() => setTemps(temps - 1), 1000);
    return () => clearTimeout(t);
  }, [temps, etat, choisi]);

  function lancer() {
    setQuestions(melange(QUESTIONS_HG).slice(0, 10));
    setIdx(0);
    setScore(0);
    setSerie(0);
    setMeilleure(0);
    setChoisi(null);
    setTemps(DUREE);
    setEtat('jeu');
  }

  function repondre(i) {
    if (choisi !== null) return;
    setChoisi(i);
    if (i === q.b) {
      const bonus = temps >= 15 ? 2 : 1;
      const ns = serie + 1;
      setSerie(ns);
      setMeilleure((m) => Math.max(m, ns));
      setScore((s) => s + bonus);
    } else setSerie(0);
  }

  function suivant() {
    if (idx + 1 >= questions.length) setEtat('fin');
    else {
      setIdx(idx + 1);
      setChoisi(null);
      setTemps(DUREE);
    }
  }

  if (etat === 'idle')
    return (
      <section className="jeu-hero">
        <div>
          <h2>Challenge Histoire-Géo</h2>
          <p>10 questions chrono (20 s), spécial Terminale. Réponds vite pour gagner des points bonus, enchaîne les bonnes réponses, et apprends avec l'explication après chaque question !</p>
        </div>
        <button className="btn btn-light" onClick={lancer}>
          <Icon name="play" size={16} /> Jouer
        </button>
      </section>
    );

  if (etat === 'fin') {
    const max = questions.length * 2;
    const pct = Math.round((score / max) * 100);
    const rang = pct >= 80 ? 'Génie de l’Histoire-Géo !' : pct >= 50 ? '🥊 Très solide, continue !' : '📚 Relis tes fiches et rejoue !';
    return (
      <section className="jeu-hero fin">
        <div className="jeu-score">{score} pts</div>
        <div className="jeu-rang">{rang}</div>
        <p className="muted small">Meilleure série : {meilleure} bonnes réponses d'affilée.</p>
        <button className="btn btn-light" onClick={lancer}>
          <Icon name="refresh" size={15} /> Rejouer
        </button>
      </section>
    );
  }

  return (
    <section className="jeu-hero jeu-en-cours">
      <div className="jeu-top">
        <span className="badge badge-light">
          Question {idx + 1}/{questions.length}
        </span>
        <span className={temps <= 5 ? 'jeu-timer rouge' : 'jeu-timer'}>⏱ {choisi === null ? temps : '—'} s</span>
        <span className="badge badge-light">{score} pts {serie >= 2 ? `· série ${serie}` : ''}</span>
      </div>
      <h3 className="jeu-q">{q.q}</h3>
      <div className="quiz-choices">
        {q.c.map((v, i) => {
          let cls = 'quiz-choice';
          if (choisi !== null) {
            if (i === q.b) cls += ' good';
            else if (choisi === i) cls += ' bad';
          }
          return (
            <button key={i} className={cls} onClick={() => repondre(i)} disabled={choisi !== null}>
              {v}
            </button>
          );
        })}
      </div>
      {choisi !== null && (
        <div className="jeu-explication">
          <strong>{choisi === q.b ? '✔ Bien joué !' : choisi === -1 ? '⏰ Temps écoulé !' : '✘ Raté…'}</strong> {q.e}
          <button className="btn btn-light" onClick={suivant}>
            {idx + 1 >= questions.length ? 'Voir mon score' : 'Question suivante'} <Icon name="right" size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
