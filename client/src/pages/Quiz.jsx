import { useEffect, useRef, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import { addQuiz, clearErreur, getProg } from '../progress.js';

const MODES = [
  { id: 'entrainement', icon: 'book', nom: 'Entraînement', desc: 'Une leçon précise, avec explications' },
  { id: 'rapide', icon: 'zap', nom: 'Quiz rapide', desc: '10 questions mélangeant tes matières' },
  { id: 'chrono', icon: 'clock', nom: 'Chronométré', desc: '30 secondes par question' },
  { id: 'examen', icon: 'file', nom: 'Examen blanc', desc: '20 questions, 15 min, sans aide' },
  { id: 'erreurs', icon: 'refresh', nom: 'Revoir mes erreurs', desc: 'Les questions que tu as ratées' },
];

export default function Quiz() {
  const [me, setMe] = useState(null);
  const [prog, setProg] = useState(null);
  const [step, setStep] = useState('config');
  const [mode, setMode] = useState('entrainement');
  const [matiere, setMatiere] = useState('');
  const [lecon, setLecon] = useState('');
  const [n, setN] = useState(10);
  const [lecons, setLecons] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState(false); // feedback affiché
  const [timeLeft, setTimeLeft] = useState(30);
  const [hist, setHist] = useState([]);
  const erreursRef = useRef([]);

  useEffect(() => {
    api('/eleve/me').then((m) => {
      setMe(m);
      const p = getProg(m.eleve_id);
      setProg(p);
      setHist([...p.quiz].sort((a, b) => b.t - a.t).slice(0, 5));
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

  const feedback = mode !== 'examen';

  /* chrono par question */
  useEffect(() => {
    if (step !== 'run' || mode !== 'chrono' || revealed) return undefined;
    setTimeLeft(30);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setRevealed(true); // temps écoulé = réponse révélée
          setAnswers((a) => (a[idx] == null ? a.map((v, j) => (j === idx ? -1 : v)) : a));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step, mode, idx, revealed]);

  /* chrono global examen blanc */
  useEffect(() => {
    if (step !== 'run' || mode !== 'examen') return undefined;
    setTimeLeft(15 * 60);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setStep('result');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step, mode]);

  async function start(m) {
    let qs = [];
    if (m === 'entrainement') {
      qs = await api(`/eleve/quiz/questions?matiere=${encodeURIComponent(matiere)}&lecon=${encodeURIComponent(lecon)}&n=${n}`);
    } else if (m === 'erreurs') {
      qs = (prog?.erreurs || []).map((e, i) => ({ ...e, id: `err${i}` })).slice(0, 20);
    } else {
      qs = await api(`/eleve/quiz/questions?n=${m === 'examen' ? 20 : 10}`);
    }
    if (!qs.length) return;
    erreursRef.current = [];
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(null));
    setIdx(0);
    setRevealed(false);
    setStep('run');
  }

  function choisir(i) {
    if (revealed) return;
    setAnswers((a) => a.map((v, j) => (j === idx ? i : v)));
    if (feedback) setRevealed(true);
  }

  function suivant() {
    const q = questions[idx];
    const ok = answers[idx] === q.bonne;
    if (!ok) erreursRef.current.push({ question: q.question, choix: q.choix, bonne: q.bonne, matiere: q.matiere, lecon: q.lecon });
    else if (mode === 'erreurs') setProg(clearErreur(me.eleve_id, q.matiere, q.lecon));
    if (idx + 1 >= questions.length) {
      const sc = questions.reduce((s, qq, i) => s + (answers[i] === qq.bonne ? 1 : 0), 0);
      addQuiz(me.eleve_id, {
        matiere: q.matiere,
        lecon: mode === 'rapide' || mode === 'examen' || mode === 'chrono' ? MODES.find((x) => x.id === mode).nom : q.lecon,
        score: sc,
        total: questions.length,
        erreurs: erreursRef.current,
      });
      setProg(getProg(me.eleve_id));
      setStep('result');
    } else {
      setIdx(idx + 1);
      setRevealed(false);
    }
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
          <p>Cinq modes pour t'entraîner : les explications et le bilan détaillé sont inclus.</p>
        </section>
        <div className="modes3">
          {MODES.map((mo) => (
            <button key={mo.id} className={mode === mo.id ? 'mode3 on' : 'mode3'} onClick={() => setMode(mo.id)}>
              <span className="mode3-ico">
                <Icon name={mo.icon} size={17} />
              </span>
              <strong>{mo.nom}</strong>
              <small>{mo.desc}</small>
            </button>
          ))}
        </div>

        {mode === 'entrainement' && (
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
            <div className="pills">
              {[10, 15, 20].map((v) => (
                <button key={v} className={n === v ? 'pill active' : 'pill'} onClick={() => setN(v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'erreurs' && (prog?.erreurs || []).length === 0 && (
          <div className="empty">Aucune erreur enregistrée pour l'instant : fais un quiz, et tes erreurs arriveront ici pour être revues.</div>
        )}

        <button
          className="btn btn-primary btn-block"
          disabled={
            (mode === 'entrainement' && !lecon) || (mode === 'erreurs' && (prog?.erreurs || []).length === 0)
          }
          onClick={() => start(mode)}
        >
          <Icon name="award" size={16} /> Lancer — {MODES.find((x) => x.id === mode).nom}
        </button>

        {hist.length > 0 && (
          <section className="card quiz-hist">
            <h2>Tes derniers quiz</h2>
            {hist.map((q, i) => {
              const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
              const pct = Math.round((q.score / q.total) * 100);
              return (
                <div className="hist3" key={i}>
                  <span className="hist3-ico" style={{ background: `${m.color}22`, color: m.color }}>
                    <Icon name={pct >= 60 ? 'check' : 'book'} size={16} />
                  </span>
                  <div className="hist3-txt">
                    <strong>
                      {m.label} — {q.score}/{q.total}
                    </strong>
                    <small>{q.lecon}</small>
                  </div>
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
    const mention =
      pct >= 80 ? 'Excellent !' : pct >= 60 ? 'Bien joué, continue !' : pct >= 40 ? 'Pas mal, mais revois la leçon.' : 'Il faut reprendre le cours, courage !';
    const parMatiere = {};
    questions.forEach((q, i) => {
      const o = (parMatiere[q.matiere] ||= { ok: 0, tot: 0 });
      o.tot += 1;
      if (answers[i] === q.bonne) o.ok += 1;
    });
    const mixed = Object.keys(parMatiere).length > 1;
    return (
      <main className="container">
        <div className={pct >= 80 ? 'card quiz-result win' : 'card quiz-result'}>
          {pct >= 80 && (
            <div className="confetti3">
              <Icon name="trophy" size={34} />
            </div>
          )}
          <div className="quiz-score">
            {score}/{questions.length}
          </div>
          <div className="quiz-pct">{pct} % — {mention}</div>
          {mixed && (
            <div className="bilan3">
              {Object.entries(parMatiere).map(([m, o]) => {
                const mm = MATIERE_BY_ID[m] || { label: m, color: '#64748b' };
                return (
                  <span key={m} className="bilan3-chip" style={{ borderColor: mm.color }}>
                    {mm.label} · {o.ok}/{o.tot}
                  </span>
                );
              })}
            </div>
          )}
          <div className="quiz-review">
            {questions.map((q, i) => (
              <div key={q.id || i} className={answers[i] === q.bonne ? 'quiz-q ok' : 'quiz-q ko'}>
                <div className="quiz-q-head">
                  <Icon name={answers[i] === q.bonne ? 'check' : 'x'} size={15} />
                  <strong>{q.question}</strong>
                </div>
                <div className="muted">
                  Ta réponse : {answers[i] != null && answers[i] >= 0 ? q.choix[answers[i]] : '— (temps écoulé)'}
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
            <button className="btn btn-outline" onClick={() => start(mode)}>
              <Icon name="refresh" size={15} /> Recommencer
            </button>
            <button className="btn btn-primary" onClick={() => setStep('config')}>
              Changer de mode
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- déroulé ---------------- */
  const q = questions[idx];
  const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
  const okNow = revealed && answers[idx] === q.bonne;
  return (
    <main className="container">
      <div className="card quiz-run">
        <div className="quiz-progress">
          <span className="badge" style={{ background: m.color }}>
            {m.label} · {q.lecon}
          </span>
          <span className="muted">
            Question {idx + 1}/{questions.length}
            {mode === 'chrono' && ` · ${timeLeft} s`}
            {mode === 'examen' && ` · ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
          </span>
        </div>
        <div className="quiz-bar">
          <div style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
        {mode === 'chrono' && !revealed && (
          <div className="chrono3">
            <div style={{ width: `${(timeLeft / 30) * 100}%` }} />
          </div>
        )}
        <h3>{q.question}</h3>
        <div className="quiz-choices">
          {q.choix.map((c, i) => {
            let cls = 'quiz-choice';
            if (revealed && i === q.bonne) cls += ' good';
            else if (revealed && answers[idx] === i && i !== q.bonne) cls += ' bad';
            else if (!revealed && answers[idx] === i) cls += ' active';
            return (
              <button key={i} className={cls} onClick={() => choisir(i)}>
                {c}
              </button>
            );
          })}
        </div>
        {revealed && feedback && (
          <div className={okNow ? 'fb3 ok' : 'fb3 ko'}>
            {okNow ? 'Bonne réponse, bien joué !' : `La bonne réponse était : ${q.choix[q.bonne]}`}
          </div>
        )}
        <div className="form-actions">
          {mode === 'examen' && idx > 0 && (
            <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <Icon name="left" size={15} /> Précédent
            </button>
          )}
          <button className="btn btn-primary" disabled={(!revealed && answers[idx] == null) || (feedback && !revealed && mode === 'chrono')} onClick={suivant}>
            {feedback && !revealed && mode !== 'chrono' ? 'Valider ma réponse' : idx < questions.length - 1 ? 'Suivant' : 'Terminer'}{' '}
            <Icon name="right" size={15} />
          </button>
        </div>
      </div>
    </main>
  );
}
