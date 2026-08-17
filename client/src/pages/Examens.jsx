import { useEffect, useRef, useState } from 'react';
import { api, getToken, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import PdfViewer from '../components/PdfViewer.jsx';

const DL = { 60: '1 h', 120: '2 h', 180: '3 h' };

export default function Examens() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [tent, setTent] = useState(null);
  const [duree, setDuree] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => api('/eleve/examens').then(setData);
  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = (t) =>
    now - new Date(t.started_at).getTime() - (t.paused_ms || 0) - (t.paused_at ? now - new Date(t.paused_at).getTime() : 0);
  const restant = tent && tent.statut === 'en_cours' ? Math.max(0, tent.duree * 60000 - elapsed(tent)) : 0;
  const fini = tent && tent.statut === 'en_cours' && (restant <= 0 || tent.done === 1);
  const mm = String(Math.floor(restant / 60000)).padStart(2, '0');
  const ss = String(Math.floor((restant % 60000) / 1000)).padStart(2, '0');

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api(`/eleve/examens/${open.id}/start`, { method: 'POST', body: { duree } });
      setTent(r.tentative);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function pause(p) {
    await api(`/eleve/examens/tentative/${tent.id}/pause`, { method: 'POST', body: { paused: p } });
    setTent({ ...tent, paused_at: p ? new Date().toISOString() : null });
    setNow(Date.now());
  }

  async function finir() {
    await api(`/eleve/examens/tentative/${tent.id}/finir`, { method: 'POST', body: {} });
    setTent({ ...tent, done: 1, paused_at: tent.paused_at || new Date().toISOString() });
    setNow(Date.now());
  }

  async function rendre(file) {
    setBusy(true);
    const fd = new FormData();
    fd.append('copie', file);
    try {
      const res = await fetch(`/api/eleve/examens/tentative/${tent.id}/rendre`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur d’envoi.');
      const t = await api(`/eleve/examens/tentative/${tent.id}`);
      setTent(t);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  /* ---------------- salle d'examen ---------------- */
  if (open && tent) {
    const m = MATIERE_BY_ID[open.matiere] || { label: open.matiere || 'Examen', color: '#0f2557' };
    return (
      <main className="container">
        <button className="btn btn-ghost" onClick={() => { setOpen(null); setTent(null); }}>
          <Icon name="left" size={15} /> Tous les examens
        </button>
        <section className="card s3card ex-room">
          <div className="ex-head">
            <div>
              <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>
              <h2 style={{ margin: '6px 0 0' }}>{open.titre}</h2>
            </div>
            <div className={restant < 300000 && tent.statut === 'en_cours' ? 'ex-timer rouge' : 'ex-timer'}>
              <Icon name="clock" size={16} /> {mm}:{ss}
            </div>
          </div>

          {tent.statut === 'en_cours' && (
            <>
              {open.consignes && <p className="muted small">{open.consignes}</p>}
              <p className="ex-paper">
                <Icon name="file" size={14} /> Écris tes réponses <strong>sur papier</strong>. À la fin (ou à la fin du
                temps), scanne tes feuilles avec une app type CamScanner, transforme-les en PDF et dépose-les ici.
              </p>

              {!tent.paused_at && !fini && (
                <div className="ex-sujet">
                  <PdfViewer url={`/api/eleve/examens/tentative/${tent.id}/sujet?token=${encodeURIComponent(getToken())}`} />
                </div>
              )}

              {(tent.paused_at || fini) && (
                <div className="ex-cache">
                  <strong>{fini ? (tent.done ? 'Examen terminé' : 'Temps écoulé') : 'Examen en pause'}</strong>
                  <p className="muted small">
                    {fini
                      ? 'Le sujet est définitivement masqué : dépose ta copie scannée ci-dessous.'
                      : 'Le sujet est masqué et le chrono est arrêté. Reprends quand tu es prêt·e.'}
                  </p>
                  {!fini && (
                    <button className="btn btn-primary" onClick={() => pause(false)}>
                      <Icon name="play" size={15} /> Reprendre l'examen
                    </button>
                  )}
                </div>
              )}

              {err && <div className="alert alert-danger">{err}</div>}

              <div className="ex-actions">
                {!tent.paused_at && !fini && (
                  <button className="btn btn-outline" onClick={() => pause(true)}>
                    <Icon name="clock" size={15} /> Pause (sujet masqué)
                  </button>
                )}
                {!fini && (
                  <button className="btn btn-outline" onClick={finir}>
                    <Icon name="check" size={15} /> J'ai fini avant l'heure
                  </button>
                )}
                <button className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={15} /> Déposer ma copie (PDF)
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => e.target.files[0] && rendre(e.target.files[0])}
                />
              </div>
            </>
          )}

          {tent.statut === 'rendu' && (
            <div className="ex-cache">
              <strong>Copie déposée — en attente de correction</strong>
              <p className="muted small">L'administration va corriger ta copie. Reviens consulter ta note et le corrigé.</p>
              {open.has_corrige !== 0 && (
                <button className="btn btn-outline" onClick={() => window.open(`/api/eleve/examens/tentative/${tent.id}/corrige?token=${encodeURIComponent(getToken())}`, '_blank')}>
                  <Icon name="file" size={15} /> Voir le corrigé
                </button>
              )}
            </div>
          )}

          {tent.statut === 'corrige' && (
            <div className="ex-cache">
              <strong>Examen corrigé</strong>
              <div className="ex-note">{tent.score}</div>
              {tent.commentaire && <p className="muted">{tent.commentaire}</p>}
              <button className="btn btn-outline" onClick={() => window.open(`/api/eleve/examens/tentative/${tent.id}/corrige?token=${encodeURIComponent(getToken())}`, '_blank')}>
                <Icon name="file" size={15} /> Voir le corrigé
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  /* ---------------- fiche examen (pas encore démarré) ---------------- */
  if (open) {
    const m = MATIERE_BY_ID[open.matiere] || { label: open.matiere || 'Examen', color: '#0f2557' };
    return (
      <main className="container">
        <button className="btn btn-ghost" onClick={() => setOpen(null)}>
          <Icon name="left" size={15} /> Tous les examens
        </button>
        <section className="card s3card">
          <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>
          <h2 style={{ margin: '8px 0 4px' }}>{open.titre}</h2>
          {open.consignes && <p className="muted small">{open.consignes}</p>}
          <div className="ex-regles">
            <p><Icon name="clock" size={14} /> Durées au choix : {open.durees.split(';').map((d) => DL[d] || d).join(' · ')}</p>
            <p><Icon name="file" size={14} /> Le sujet s'affiche uniquement après avoir appuyé sur « Débuter ».</p>
            <p><Icon name="eye" size={14} /> Pause = sujet masqué et chrono arrêté, jusqu'à ton retour.</p>
            <p><Icon name="upload" size={14} /> Copie sur papier, scannée en PDF, à déposer avant la fin du temps.</p>
          </div>
          <label className="label">Choisis ta durée</label>
          <div className="pills">
            {open.durees.split(';').map((d) => (
              <button key={d} className={duree === d ? 'pill active' : 'pill'} onClick={() => setDuree(d)}>
                {DL[d] || d}
              </button>
            ))}
          </div>
          {err && <div className="alert alert-danger">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={!duree || busy || data.restants === 0} onClick={start}>
            Débuter l'examen
          </button>
          {data.restants === 0 && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Limite de 2 examens par semaine atteinte. Reviens lundi prochain.
            </p>
          )}
        </section>
      </main>
    );
  }

  /* ---------------- liste ---------------- */
  return (
    <main className="container">
      <section className="banner">
        <h2>Examens</h2>
        <p>
          Conditions réelles : sujet masqué, chrono, copie sur papier scannée.{' '}
          <strong>{data.restants} tentative{data.restants > 1 ? 's' : ''} restante{data.restants > 1 ? 's' : ''} cette semaine</strong> (2 max).
        </p>
      </section>
      {data.examens.length === 0 && <div className="empty">Aucun examen programmé pour l'instant. L'administration en publiera bientôt.</div>}
      <div className="annales-list">
        {data.examens.map((ex, i) => {
          const m = MATIERE_BY_ID[ex.matiere] || { label: ex.matiere || 'Examen', color: '#0f2557' };
          const t = data.tentatives.find((x) => x.examen_id === ex.id);
          return (
            <button className="card annale-card" style={{ '--mc': m.color, '--i': i }} key={ex.id} onClick={() => { setOpen(ex); setTent(t || null); setDuree(null); setErr(null); }}>
              <div className="annale-body">
                <div className="annale-top">
                  <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>
                  <span className="annale-year-txt" style={{ color: m.color }}>
                    {t ? (t.statut === 'en_cours' ? 'En cours' : t.statut === 'corrige' ? `Note : ${t.score}` : 'Rendu') : `${ex.durees.split(';').map((d) => DL[d]).join(' / ')}`}
                  </span>
                </div>
                <h3>{ex.titre}</h3>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
