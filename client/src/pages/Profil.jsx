import { api } from '../api.js';
import { AVATARS } from './StudentApp.jsx';
import { badgesOf, computeStats, fmtMin, levelOf, streak, xpOf } from '../progress.js';
import { MATIERE_BY_ID } from '../api.js';

export default function Profil({ me, cours, prog, onAvatar, onGo, logout }) {
  const stats = computeStats(prog, cours);
  const xp = xpOf(prog);
  const lvl = levelOf(xp);
  const badges = badgesOf(prog, stats);
  const tousBadges = 9;
  const derniersQuiz = [...prog.quiz].sort((a, b) => b.t - a.t).slice(0, 5);

  return (
    <main className="container profil3">
      <section className="card prof3-head">
        <div className="profil-avatar big">{me.avatar || '🧑🏾‍🎓'}</div>
        <div className="prof3-id">
          <strong>
            {me.prenom} {me.nom}
          </strong>
          <span className={`filiere-badge fil-${me.filiere}`}>{me.filiere}</span>
          <div className="muted small">
            {me.classe} · <span className="mono">{me.eleve_id}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={logout} title="Déconnexion">
          ⎋
        </button>
      </section>

      <section className="card s3card">
        <h2>
          ⭐ Niveau {lvl.i + 1} — {lvl.nom}
        </h2>
        <div className="bar3">
          <div style={{ width: `${Math.min(100, Math.round((xp % 250) / 2.5))}%` }} />
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>
          {xp} points d'expérience · encore {lvl.reste} XP pour le niveau suivant.
        </div>
        <div className="chips3" style={{ marginTop: 12 }}>
          <span>🔥 Série : {streak(prog)} jour(s)</span>
          <span>⏱️ {fmtMin(prog.minutes)}</span>
          <span>📚 {stats.vues}/{stats.total} cours</span>
          <span>🎯 {stats.pctMoy} % en quiz</span>
        </div>
      </section>

      <section className="card s3card">
        <h2>
          🏅 Badges ({badges.length}/{tousBadges})
        </h2>
        <div className="badges3">
          {badges.length === 0 && <p className="muted">Commence à apprendre pour gagner ton premier badge !</p>}
          {badges.map((b) => (
            <div className="badge3" key={b.nom}>
              <span>{b.emoji}</span>
              <strong>{b.nom}</strong>
              <small>{b.desc}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card s3card">
        <h2>🎨 Mon avatar</h2>
        <div className="avatar-grid">
          {AVATARS.map((a) => (
            <button key={a} className={me.avatar === a ? 'avatar-pick actif' : 'avatar-pick'} onClick={() => onAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
      </section>

      <section className="card s3card">
        <h2>🕘 Activité récente</h2>
        {derniersQuiz.length === 0 && <p className="muted">Aucun quiz pour l'instant.</p>}
        {derniersQuiz.map((q, i) => {
          const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
          return (
            <div className="hist3" key={i}>
              <span className="hist3-ico" style={{ background: `${m.color}22`, color: m.color }}>
                {q.score / q.total >= 0.6 ? '✅' : '📘'}
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
        <div className="s3-actions">
          <button className="btn btn-primary" onClick={() => onGo('suivi')}>
            Voir tout mon suivi
          </button>
        </div>
      </section>
    </main>
  );
}
