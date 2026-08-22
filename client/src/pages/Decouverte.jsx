import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { addBonus } from '../progress.js';

function fmtPop(n) {
  if (!n) return '';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' M d’habitants';
  return Math.round(n / 1000) + ' 000 habitants';
}

export default function Decouverte({ meId }) {
  const [d, setD] = useState(null);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    api('/decouverte/jour')
      .then(setD)
      .catch(() => setD(false));
  }, []);

  async function lancer() {
    setQuiz({ chargement: true });
    try {
      const r = await api('/decouverte/trivia');
      setQuiz({ questions: r.questions, idx: 0, score: 0, fait: null, fini: false });
    } catch {
      setQuiz(null);
    }
  }
  function repondre(c) {
    setQuiz((q) => {
      if (!q || q.fait) return q;
      const ok = c === q.questions[q.idx].ok;
      return { ...q, fait: c, score: q.score + (ok ? 1 : 0) };
    });
  }
  function suivant() {
    setQuiz((q) => {
      const idx = q.idx + 1;
      if (idx >= q.questions.length) {
        const gain = q.score * 2;
        if (gain > 0) addBonus(meId, gain);
        return { ...q, fini: true, gain };
      }
      return { ...q, idx, fait: null };
    });
  }
  function ecouter() {
    if (d?.mot?.audio) new Audio(d.mot.audio).play().catch(() => {});
  }

  if (!d) return null;

  return (
    <section className="dec">
      <div className="dec-head">
        <h2 className="home3-title" style={{ margin: 0 }}>
          Découverte du jour
        </h2>
        {!quiz && (
          <button className="btn btn-outline" onClick={lancer}>
            🎯 Défi d'anglais (+XP)
          </button>
        )}
      </div>

      {quiz?.chargement && <div className="card dec-quiz muted small">Chargement du défi…</div>}

      {quiz && !quiz.chargement && (
        <div className="card dec-quiz">
          {quiz.fini ? (
            <div className="dec-quiz-fin">
              <strong>
                Score : {quiz.score}/{quiz.questions.length}
              </strong>
              <p className="muted small" style={{ margin: '6px 0 10px' }}>
                {quiz.gain > 0 ? `Bravo, +${quiz.gain} XP ajoutés à ta progression !` : 'Retente ta chance, tu gagneras 2 XP par bonne réponse.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={lancer}>
                  Rejouer
                </button>
                <button className="btn btn-ghost" onClick={() => setQuiz(null)}>
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="muted small">
                Question {quiz.idx + 1}/{quiz.questions.length} · score {quiz.score} — entraîne ton anglais en t'amusant !
              </div>
              <p className="dec-quiz-q">{quiz.questions[quiz.idx].q}</p>
              <div className="dec-quiz-choix">
                {quiz.questions[quiz.idx].choix.map((c) => (
                  <button
                    key={c}
                    disabled={!!quiz.fait}
                    className={
                      quiz.fait
                        ? c === quiz.questions[quiz.idx].ok
                          ? 'dec-choice ok'
                          : c === quiz.fait
                            ? 'dec-choice ko'
                            : 'dec-choice'
                        : 'dec-choice'
                    }
                    onClick={() => repondre(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {quiz.fait && (
                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={suivant}>
                  {quiz.idx + 1 >= quiz.questions.length ? 'Voir mon score' : 'Question suivante'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!quiz && (
        <div className="dec-grid">
          {d.citation && (
            <div className="dec-card wide">
              <p className="dec-cit">« {d.citation.t} »</p>
              <span className="dec-cit-a">— {d.citation.a}</span>
            </div>
          )}

          {d.oeuvre?.img && (
            <div className="dec-card wide">
              <img className="dec-img" src={d.oeuvre.img} alt={d.oeuvre.titre} loading="lazy" />
              <p className="dec-titre">🖼 {d.oeuvre.titre}</p>
              {d.oeuvre.texte && <p className="dec-txt">{d.oeuvre.texte}…</p>}
              <span className="dec-src">Image du jour — Wikipédia</span>
            </div>
          )}

          {d.pays && (
            <div className="dec-card">
              <div className="dec-pays">
                <span className="dec-flag-emoji">{d.pays.drapeau}</span>
                <div>
                  <p className="dec-titre">{d.pays.nom}</p>
                  <span className="dec-txt">Capitale : {d.pays.capital}</span>
                </div>
              </div>
              <span className="dec-txt">{fmtPop(Math.round(d.pays.pop * 1e6))}</span>
              {d.pays.fait && <p className="dec-txt">{d.pays.fait}</p>}
              <span className="dec-src">Pays du jour</span>
            </div>
          )}

          {d.mot?.mot && (
            <div className="dec-card">
              <div className="dec-mot-top">
                <p className="dec-titre">📖 {d.mot.mot}</p>
                {d.mot.audio && (
                  <button className="dec-audio" onClick={ecouter} title="Écouter la prononciation">
                    <Icon name="play" size={13} />
                  </button>
                )}
              </div>
              <span className="dec-txt">
                {d.mot.phon} {d.mot.type && <em>({d.mot.type})</em>}
              </span>
              {d.mot.def && <p className="dec-txt">{d.mot.def}</p>}
              <span className="dec-src">Mot du jour en anglais</span>
            </div>
          )}

          {d.article && (
            <div className="dec-card wide">
              {d.article.img && <img className="dec-img" src={d.article.img} alt={d.article.titre} loading="lazy" />}
              <p className="dec-titre">❓ Le saviez-vous ? {d.article.titre}</p>
              <p className="dec-txt">{d.article.texte}…</p>
              <span className="dec-src">Article du jour — Wikipédia</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
