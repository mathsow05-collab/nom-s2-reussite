import { useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal } from '../ui.jsx';
import PdfViewer from '../components/PdfViewer.jsx';
import { useHorsLigne, useInstall, supprimerHL, lireHL, fmtTaille } from '../offline.jsx';
import Onboarding, { THEMES } from './Onboarding.jsx';
import { sonsActifs, setSons } from '../sons.js';
import { badgesOf, computeStats, fmtMin, levelOf, streak, xpOf } from '../progress.js';
import { MATIERE_BY_ID } from '../api.js';

export default function Profil({ me, cours, prog, onAvatar, onGo, logout, theme, onTheme, onSetTheme, onPersoChange }) {
  const [perso, setPerso] = useState(false);
  const [sons, setSonsEtat] = useState(sonsActifs());
  const stats = computeStats(prog, cours);
  const xp = xpOf(prog);
  const lvl = levelOf(xp);
  const badges = badgesOf(prog, stats);
  const tousBadges = 9;
  const derniersQuiz = [...prog.quiz].sort((a, b) => b.t - a.t).slice(0, 5);
  const hl = useHorsLigne();
  const install = useInstall();
  const [lecture, setLecture] = useState(null);
  const tailleTotale = hl.items.reduce((s, f) => s + (f.taille || 0), 0);

  async function ouvrir(f) {
    const rec = await lireHL(f.id).catch(() => null);
    if (!rec?.blob) return;
    setLecture({ titre: f.titre, url: URL.createObjectURL(rec.blob) });
  }
  function fermerLecture() {
    setLecture((l) => {
      if (l?.url) URL.revokeObjectURL(l.url);
      return null;
    });
  }


  return (
    <main className="container profil3">
      <section className="pf-hero">
        <button className="pf-quit" onClick={logout} title="Déconnexion">
          ⎋
        </button>
        <div className="pf-avatar">
          <span className={`anime-av grand i${me.avatar?.startsWith('an:') ? me.avatar.slice(3) : (me.id || 0) % 8}`} />
        </div>
        <h1 className="pf-nom">
          {me.prenom} {me.nom}
        </h1>
        <div className="pf-ligne">
          <span className="pf-filiere">{me.filiere}</span>
          <span>{me.classe}</span>
          <span className="mono">{me.eleve_id}</span>
        </div>
        <div className="pf-stats">
          <div className="pf-stat">
            <span className="pf-stat-ico">
              <Icon name="flame" size={12} /> Série
            </span>
            <strong>{streak(prog)} jour(s)</strong>
          </div>
          <div className="pf-stat">
            <span className="pf-stat-ico">
              <Icon name="clock" size={12} /> Étude
            </span>
            <strong>{fmtMin(prog.minutes)}</strong>
          </div>
          <div className="pf-stat">
            <span className="pf-stat-ico">
              <Icon name="book" size={12} /> Cours
            </span>
            <strong>
              {stats.vues}/{stats.total} vus
            </strong>
          </div>
          <div className="pf-stat">
            <span className="pf-stat-ico">
              <Icon name="target" size={12} /> Quiz
            </span>
            <strong>{stats.pctMoy} % de moyenne</strong>
          </div>
        </div>
      </section>

      <section className="card s3card">
        <div className="pf-level-top">
          <h2>
            Niveau {lvl.i + 1} — {lvl.nom}
          </h2>
          <span className="pf-xp">{xp} XP</span>
        </div>
        <div className="bar3" style={{ marginTop: 10 }}>
          <div style={{ width: `${Math.min(100, Math.round((xp % 250) / 2.5))}%` }} />
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>
          Encore {lvl.reste} XP pour passer au niveau suivant. Continue comme ça !
        </div>
      </section>

      <section className="card s3card">
        <h2>Badges ({badges.length}/{tousBadges})</h2>
        <div className="badges3">
          {badges.length === 0 && <p className="muted">Commence à apprendre pour gagner ton premier badge !</p>}
          {badges.map((b) => (
            <div className="badge3" key={b.nom}>
              <span className="badge3-ico">
                <Icon name={b.ico} size={20} />
              </span>
              <strong>{b.nom}</strong>
              <small>{b.desc}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card s3card">
        <h2>Ma personnalisation</h2>
        <p className="muted small" style={{ marginTop: -4 }}>
          Choisis une apparence — textes et couleurs s'adaptent pour rester toujours lisibles.
        </p>
        <div className="pf-themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={theme === t.id ? 'pf-theme on' : 'pf-theme'}
              onClick={() => onSetTheme?.(t.id)}
            >
              <span className="dot" style={{ background: t.sw[2] }} />
              {t.nom}
            </button>
          ))}
        </div>
        <button className="theme3" onClick={onTheme}>
          <span>Mode sombre rapide (confort le soir)</span>
          <span className={theme === 'dark' ? 'switch3 on' : 'switch3'} />
        </button>
        <button
          className="theme3"
          onClick={() => {
            setSons(!sons);
            setSonsEtat(!sons);
          }}
        >
          <span>🔊 Petits sons agréables (appuis, réussites)</span>
          <span className={sons ? 'switch3 on' : 'switch3'} />
        </button>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPerso(true)}>
          <Icon name="spark" size={15} /> Revoir ma personnalisation complète
        </button>
      </section>

      {perso && (
        <Onboarding
          prenom={me.prenom}
          theme={theme}
          onTheme={(t) => onSetTheme?.(t)}
          onFin={(hobs, av) => {
            try {
              localStorage.setItem('kd_onboarded', '1');
              localStorage.setItem('kd_hobbies', JSON.stringify(hobs));
            } catch {
              /* ignore */
            }
            if (av) onAvatar(av);
            onPersoChange?.();
            setPerso(false);
          }}
        />
      )}

      <section className="card s3card">
        <h2>
          <span className="h2-flex">
            Téléchargements hors ligne
            {hl.items.length > 0 && <span className="hl-count">{hl.items.length}</span>}
          </span>
        </h2>
        <p className="muted small hl-note">
          Comme sur YouTube : tes documents enregistrés restent <strong>dans l'application</strong> et se lisent sans
          connexion. Ils ne sortent pas vers le téléphone.
        </p>
        {hl.items.length === 0 ? (
          <p className="muted">
            Rien pour l'instant. Dans un cours ou une annale, appuie sur <strong>Hors ligne</strong> pour garder le
            PDF avec toi.
          </p>
        ) : (
          <>
            <div>
              {hl.items.map((f) => (
                <div className="hist3 hl-row" key={f.id}>
                  <span className="hist3-ico hl-ico">
                    <Icon name="file" size={16} />
                  </span>
                  <div className="hist3-txt">
                    <strong>{f.titre}</strong>
                    <small>
                      {f.sous} · {fmtTaille(f.taille)} ·{' '}
                      {new Date(f.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </small>
                  </div>
                  <button className="btn btn-outline hl-lire" onClick={() => ouvrir(f)}>
                    <Icon name="book" size={14} /> Lire
                  </button>
                  <button
                    className="hl-del"
                    title="Retirer de mes téléchargements"
                    onClick={() => supprimerHL(f.id)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="muted small" style={{ marginTop: 8 }}>
              Espace utilisé : {fmtTaille(tailleTotale)}
            </div>
          </>
        )}
        {install.peut && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={install.installer}>
            <Icon name="download" size={16} /> Installer l'application sur mon téléphone
          </button>
        )}
      </section>

      <section className="card s3card">
        <h2>Mon avatar style animé</h2>
        <div className="avatar-grid">
          {Array.from({ length: 8 }, (_, i) => `an:${i}`).map((a) => (
            <button key={a} className={me.avatar === a ? 'avatar-pick actif' : 'avatar-pick'} onClick={() => onAvatar(a)}>
              <span className={`anime-av i${a.slice(3)}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="card s3card">
        <h2>Activité récente</h2>
        {derniersQuiz.length === 0 && <p className="muted">Aucun quiz pour l'instant.</p>}
        {derniersQuiz.map((q, i) => {
          const m = MATIERE_BY_ID[q.matiere] || { label: q.matiere, color: '#64748b' };
          return (
            <div className="hist3" key={i}>
              <span className="hist3-ico" style={{ background: `${m.color}22`, color: m.color }}>
                <Icon name={q.score / q.total >= 0.6 ? 'check' : 'book'} size={16} />
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

      {lecture && (
        <Modal title={lecture.titre} onClose={fermerLecture} wide>
          <PdfViewer url={lecture.url} />
          <div className="muted small hl-note" style={{ marginTop: 8 }}>
            Lecture hors ligne — ce document reste dans l'application.
          </div>
        </Modal>
      )}
    </main>
  );
}
