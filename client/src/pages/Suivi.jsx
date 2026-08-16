import { FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { computeStats, fmtMin, revisions, useCountUp } from '../progress.js';

function Stat({ icon, valeur, suffixe, label }) {
  const v = useCountUp(valeur);
  return (
    <div className="stat3">
      <span className="stat3-emoji">
        <Icon name={icon} size={17} />
      </span>
      <strong>
        {v}
        {suffixe}
      </strong>
      <small>{label}</small>
    </div>
  );
}

export default function Suivi({ me, cours, prog, onGo }) {
  const stats = computeStats(prog, cours);
  const matieres = Object.entries(stats.parMatiere).map(([id, o]) => ({
    id,
    ...o,
    ...(MATIERE_BY_ID[id] || { label: id, color: '#64748b' }),
  }));
  const derniersQuiz = [...prog.quiz].sort((a, b) => b.t - a.t).slice(0, 6);
  const derniersCours = Object.values(prog.cours)
    .sort((a, b) => b.t - a.t)
    .slice(0, 4);

  const OBJ_COURS = 4;
  const OBJ_QUIZ = 2;
  const pc = Math.min(100, Math.round((stats.coursSemaine / OBJ_COURS) * 100));
  const pq = Math.min(100, Math.round((stats.quizSemaine / OBJ_QUIZ) * 100));

  return (
    <main className="container suivi3">
      <header className="hello3">
        <h1>Ton suivi</h1>
        <p>Ta progression réelle, matière par matière.</p>
      </header>

      <div className="stats-grid">
        <Stat icon="book" valeur={stats.vues} suffixe={`/${stats.total}`} label="cours ouverts" />
        <Stat icon="target" valeur={stats.pctMoy} suffixe=" %" label="moyenne quiz" />
        <Stat icon="clock" valeur={stats.minutes} label="minutes d'étude" />
        <Stat icon="flame" valeur={stats.joursActifs} label="jours actifs / 7" />
      </div>

      <section className="card s3card">
        <h2>Objectifs de la semaine</h2>
        <div className="obj3">
          <div className="obj3-line">
            <span>
              Ouvrir {OBJ_COURS} cours · <b>{Math.min(stats.coursSemaine, OBJ_COURS)}/{OBJ_COURS}</b>
            </span>
            <small>{pc} %</small>
          </div>
          <div className="bar3">
            <div style={{ width: `${pc}%` }} />
          </div>
          <div className="obj3-line">
            <span>
              Faire {OBJ_QUIZ} quiz · <b>{Math.min(stats.quizSemaine, OBJ_QUIZ)}/{OBJ_QUIZ}</b>
            </span>
            <small>{pq} %</small>
          </div>
          <div className="bar3">
            <div style={{ width: `${pq}%` }} />
          </div>
          {pc === 100 && pq === 100 && <div className="obj3-win">Semaine parfaite, bravo !</div>}
        </div>
      </section>

      <section className="card s3card">
        <h2>Révision intelligente</h2>
        <p className="muted small">Calculé d'après tes erreurs de quiz et le temps écoulé depuis tes derniers cours.</p>
        {(() => {
          const rev = revisions(prog, cours, (FILIERES[me.filiere] || FILIERES.S2).matieres);
          if (rev.length === 0) return <p className="muted">Rien à réviser pour l'instant — continue d'avancer ! 🌱</p>;
          return rev.map((r, i) => (
            <button key={i} className="reco3" onClick={() => onGo(r.tab, r.matiere)}>
              <span className="reco3-ico">
                <Icon name={r.tab === 'quiz' ? 'target' : 'book'} size={15} />
              </span>
              {r.txt}
            </button>
          ));
        })()}
      </section>

      <section className="card s3card">
        <h2>Progression par matière</h2>

        {matieres.length === 0 && <p className="muted">Aucun cours disponible pour l'instant.</p>}
        {matieres.map((m) => {
          const p = m.total ? Math.round((m.vus / m.total) * 100) : 0;
          return (
            <div className="mat3" key={m.id}>
              <div className="mat3-line">
                <span className="mat3-dot" style={{ background: m.color }} />
                <strong>{m.label}</strong>
                <small>
                  {m.vus}/{m.total} cours
                </small>
              </div>
              <div className="bar3">
                <div style={{ width: `${p}%`, background: m.color }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="card s3card">
        <h2>Historique récent</h2>
        {derniersQuiz.length === 0 && derniersCours.length === 0 && (
          <p className="muted">Rien pour l'instant : ouvre un cours ou lance un quiz, et ton historique apparaîtra ici.</p>
        )}
        {derniersQuiz.map((q, i) => {
          const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
          const pct = Math.round((q.score / q.total) * 100);
          return (
            <div className="hist3" key={`q${i}`}>
              <span className="hist3-ico" style={{ background: `${m.color}22`, color: m.color }}>
                <Icon name={pct >= 60 ? 'check' : 'book'} size={16} />
              </span>
              <div className="hist3-txt">
                <strong>
                  Quiz {m.label} — {q.score}/{q.total}
                </strong>
                <small>{q.lecon}</small>
              </div>
              <span className="hist3-date">{new Date(q.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </div>
          );
        })}
        {derniersCours.map((c, i) => (
          <div className="hist3" key={`c${i}`}>
            <span className="hist3-ico" style={{ background: '#eef2ff', color: '#1d4ed8' }}>
              <Icon name="book" size={16} />
            </span>
            <div className="hist3-txt">
              <strong>{c.titre}</strong>
              <small>Cours consulté</small>
            </div>
            <span className="hist3-date">{new Date(c.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
        ))}
      </section>

      <div className="s3-actions">
        <button className="btn btn-primary" onClick={() => onGo('cours')}>
          Continuer mes cours
        </button>
        <button className="btn btn-outline" onClick={() => onGo('quiz')}>
          Faire un quiz
        </button>
      </div>
    </main>
  );
}
