import { useEffect, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import { addQuiz, getProg } from '../progress.js';

export default function Quiz() {
  const [me, setMe] = useState(null);
  const [step, setStep] = useState('config');
  const [matiere, setMatiere] = useState('');
  const [lecon, setLecon] = useState('');
  const [n, setN] = useState(10);
  const [lecons, setLecons] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hist, setHist] = useState([]);

  useEffect(() => {
    api('/eleve/me').then((m) => {
      setMe(m);
      setHist([...getProg(m.eleve_id).quiz].sort((a, b) => b.t - a.t).slice(0, 5));
      const first = (FILIERES[m.filiere] || FILIERES.S2).matieres[0].id;
      setMatiere(first);
    });
  }, []);

  useEffect(() => {
    if (!me || !matiere) return;
    api(`/eleve/quiz/lecons?matiere=${encodeURIComponent(matiere)}`).then((l) => {
      setLecons(l);
      setLecon(l[0]?.lecon || '');
    });
  }, [me, matiere]);

  async function start() {
    const qs = await api(`/eleve/quiz/questions?matiere=${encodeURIComponent(matiere)}&lecon=${encodeURIComponent(lecon)}&n=${n}`);
    if (!qs.length) return;
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(null));
    setIdx(0);
    setStep('run');
  }
  if (!me)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const matieres = (FILIERES[me.filiere] || FILIERES.S2).matieres;

  /* ---------------- config ---------------- */
  if (step === 'config')
    return (
      <main className="container">
        <section className="banner">
          <h2>Auto-évaluation</h2>
          <p>Choisis une leçon et un nombre de questions (10 à 20) : le quiz est généré instantanément, avec correction détaillée à la fin.</p>
        </section>
        <div className="card quiz-config">
          <label className="label">Matière</label>
          <select className="input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <label className="label">Leçon</label>
          {lecons.length === 0 ? (
            <p className="muted">Aucune leçon disponible dans cette matière pour l'instant.</p>
          ) : (
            <select className="input" value={lecon} onChange={(e) => setLecon(e.target.value)}>
              {lecons.map((l) => (
                <option key={l.lecon} value={l.lecon}>
                  {l.lecon}
                </option>
              ))}
            </select>
          )}
          <label className="label">Nombre de questions</label>
          <div className="seg">
            {[10, 15, 20].map((v) => (
              <button key={v} className={n === v ? 'active' : ''} onClick={() => setN(v)}>
                {v}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block" disabled={!lecon} onClick={start}>
            <Icon name="award" size={16} /> Lancer le quiz
          </button>
        </div>
        {hist.length > 0 && (
          <section className="card quiz-hist">
            <h2>🕘 Tes derniers quiz</h2>
            {hist.map((q, i) => {
              const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
              const pct = Math.round((q.score / q.total) * 100);
              return (
                <div className="hist3" key={i}>
                  <span className="hist3-ico" style={{ background: `${m.color}22`, color: m.color }}>
                    {pct >= 60 ? '✅' : '📘'}
                  </span>
                  <div className="hist3-txt">
                    <strong>
                      {m.label} — {q.score}/{q.total}
                    </strong>
                    <small>{q.lecon}</small>
                  </div>
                  <button className="btn btn-outline" onClick={() => { setMatiere(q.matiere); setLecon(q.lecon); }}>
                    Refaire
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </main>
    );

  /* ---------------- résultat ---------------- */
  if (step === 'result') {
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.bonne ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    const mention = pct >= 80 ? 'Excellent ! 🔥' : pct >= 60 ? 'Bien joué, continue !' : pct >= 40 ? 'Pas mal, mais revois la leçon.' : 'Il faut reprendre le cours, courage !';
    return (
      <main className="container">
        <div className={pct >= 80 ? 'card quiz-result win' : 'card quiz-result'}>
          {pct >= 80 && <div className="confetti3">🎉</div>}
          <div className="quiz-score">
            {score}/{questions.length}
          </div>
          <div className="quiz-pct">{pct} % — {mention}</div>
          <div className="quiz-review">
            {questions.map((q, i) => (
              <div key={q.id} className={answers[i] === q.bonne ? 'quiz-q ok' : 'quiz-q ko'}>
                <div className="quiz-q-head">
                  <Icon name={answers[i] === q.bonne ? 'check' : 'x'} size={15} />
                  <strong>{q.question}</strong>
                </div>
                <div className="muted">
                  Ta réponse : {answers[i] != null ? q.choix[answers[i]] : '—'}
                  {answers[i] !== q.bonne && (
                    <>
                      {' '}
                      · Bonne réponse : <strong className="ok-text">{q.choix[q.bonne]}</strong>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={start}>
              <Icon name="refresh" size={15} /> Recommencer (nouveau tirage)
            </button>
            <button className="btn btn-primary" onClick={() => setStep('config')}>
              Changer de leçon
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- déroulé ---------------- */
  const q = questions[idx];
  const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
  return (
    <main className="container">
      <div className="card quiz-run">
        <div className="quiz-progress">
          <span className="badge" style={{ background: m.color }}>
            {m.label} · {q.lecon}
          </span>
          <span className="muted">
            Question {idx + 1}/{questions.length}
          </span>
        </div>
        <div className="quiz-bar">
          <div style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
        <h3>{q.question}</h3>
        <div className="quiz-choices">
          {q.choix.map((c, i) => (
            <button key={i} className={answers[idx] === i ? 'quiz-choice active' : 'quiz-choice'} onClick={() => setAnswers((a) => a.map((v, j) => (j === idx ? i : v)))}>
              {c}
            </button>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <Icon name="left" size={15} /> Précédent
          </button>
          {idx < questions.length - 1 ? (
            <button className="btn btn-primary" disabled={answers[idx] == null} onClick={() => setIdx(idx + 1)}>
              Suivant <Icon name="right" size={15} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={answers.some((a) => a == null)}
              onClick={() => {
                const sc = questions.reduce((s, q, i) => s + (answers[i] === q.bonne ? 1 : 0), 0);
                addQuiz(me.eleve_id, { matiere, lecon, score: sc, total: questions.length });
                setStep('result');
              }}
            >
              <Icon name="check" size={15} /> Terminer
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
