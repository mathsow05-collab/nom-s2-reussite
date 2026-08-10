import { useCallback, useEffect, useState } from 'react';
import { api, getToken, clearToken, MATIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import Metiers from './Metiers.jsx';

export default function StudentApp() {
  const [me, setMe] = useState(null);
  const [cours, setCours] = useState(null);
  const [lost, setLost] = useState(null); // raison de la déconnexion forcée
  const [tab, setTab] = useState('cours');
  const [matiere, setMatiere] = useState('all');
  const [viewer, setViewer] = useState(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([api('/eleve/me'), api('/eleve/cours')]);
      setMe(m);
      setCours(c);
    } catch (e) {
      if (e.status === 401) setLost('session_perdue');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Temps réel : le serveur pousse la déconnexion forcée via SSE.
  useEffect(() => {
    if (!me) return undefined;
    const es = new EventSource(`/api/eleve/stream?token=${encodeURIComponent(getToken())}`);
    es.addEventListener('session', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setLost(d.type || 'session_perdue');
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  }, [me]);

  // Filet de sécurité si le SSE est bloqué par le réseau.
  useEffect(() => {
    if (!me) return undefined;
    const t = setInterval(() => {
      api('/eleve/me').catch((e) => {
        if (e.status === 401) setLost('session_perdue');
      });
    }, 45000);
    return () => clearInterval(t);
  }, [me]);

  function logout() {
    api('/eleve/logout').catch(() => {});
    clearToken();
    window.location.hash = '#/';
  }

  if (lost) return <SessionLost reason={lost} />;
  if (!me || !cours)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const visible = matiere === 'all' ? cours : cours.filter((c) => c.matiere === matiere);

  return (
    <div className="student">
      <header className="topbar">
        <div className="topbar-brand">
          <Icon name="cap" size={22} /> <span>S2 Réussite</span>
        </div>
        <div className="topbar-user">
          <div className="topbar-id">
            <strong>
              {me.prenom} {me.nom}
            </strong>
            <small>
              {me.classe} · {me.eleve_id}
            </small>
          </div>
          <button className="btn btn-ghost" onClick={logout} title="Déconnexion">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <nav className="seg">
        <button className={tab === 'cours' ? 'active' : ''} onClick={() => setTab('cours')}>
          <Icon name="book" /> Cours
        </button>
        <button className={tab === 'orientation' ? 'active' : ''} onClick={() => setTab('orientation')}>
          <Icon name="compass" /> Orientation S2
        </button>
      </nav>

      {tab === 'cours' ? (
        <main className="container">
          <div className="pills">
            <button className={matiere === 'all' ? 'pill active' : 'pill'} onClick={() => setMatiere('all')}>
              Toutes
            </button>
            {MATIERES.map((m) => (
              <button
                key={m.id}
                className={matiere === m.id ? 'pill active' : 'pill'}
                style={{ '--mc': m.color }}
                onClick={() => setMatiere(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="empty">Aucun cours dans cette matière pour l'instant.</div>
          ) : (
            <div className="grid-cards">
              {visible.map((c) => (
                <CoursCard key={c.id} c={c} onOpen={() => setViewer(c)} />
              ))}
            </div>
          )}
        </main>
      ) : (
        <Metiers />
      )}

      {viewer && <Viewer c={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function CoursCard({ c, onOpen }) {
  const m = MATIERE_BY_ID[c.matiere] || { label: c.matiere, color: '#64748b' };
  return (
    <article className="card cours-card" style={{ '--mc': m.color }}>
      <div className="cours-top">
        <span className="badge" style={{ background: m.color }}>
          {m.label}
        </span>
        <div className="cours-icons">
          {c.youtube_id && <Icon name="video" size={16} />}
          {c.has_pdf && <Icon name="file" size={16} />}
        </div>
      </div>
      <h3>{c.titre}</h3>
      {c.description && <p className="muted clamp2">{c.description}</p>}
      <div className="cours-actions">
        {c.youtube_id && (
          <button className="btn btn-primary" onClick={onOpen}>
            <Icon name="play" size={16} /> Regarder
          </button>
        )}
        {c.has_pdf && (
          <button className={c.youtube_id ? 'btn btn-outline' : 'btn btn-primary'} onClick={onOpen}>
            <Icon name="file" size={16} /> Lire le PDF
          </button>
        )}
      </div>
    </article>
  );
}

function Viewer({ c, onClose }) {
  const pdfUrl = c.has_pdf ? `/api/eleve/cours/${c.id}/pdf?token=${encodeURIComponent(getToken())}` : null;
  const [showPdf, setShowPdf] = useState(!!pdfUrl && !c.youtube_id);

  return (
    <Modal title={c.titre} onClose={onClose} wide>
      {c.youtube_id && !showPdf && (
        <div className="ratio">
          <iframe
            title={c.titre}
            src={`https://www.youtube-nocookie.com/embed/${c.youtube_id}?rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {pdfUrl && showPdf && (
        <div className="pdf-box">
          <iframe title={`PDF ${c.titre}`} src={pdfUrl} />
        </div>
      )}
      <div className="viewer-foot">
        {c.youtube_id && pdfUrl && (
          <button className="btn btn-outline" onClick={() => setShowPdf((s) => !s)}>
            <Icon name={showPdf ? 'play' : 'file'} size={16} />
            {showPdf ? 'Voir la vidéo' : 'Lire le PDF'}
          </button>
        )}
        {pdfUrl && (
          <a className="btn btn-ghost" href={pdfUrl} download>
            <Icon name="download" size={16} /> Télécharger
          </a>
        )}
      </div>
    </Modal>
  );
}

function SessionLost({ reason }) {
  const messages = {
    session_remplacee: [
      'Session unique : ton ID vient d’être utilisé sur un autre appareil.',
      'Par sécurité, la session de cet appareil a été fermée. Si ce n’était pas toi, préviens immédiatement l’administration.',
    ],
    revoque: [
      'Ton accès a été suspendu par l’administration.',
      'Contacte ton administrateur pour réactiver ton ID.',
    ],
    session_perdue: [
      'Ta session a expiré ou a été fermée.',
      'Reconnecte-toi avec ton ID pour continuer.',
    ],
  };
  const [title, sub] = messages[reason] || messages.session_perdue;
  return (
    <div className="lost">
      <div className="lost-card">
        <div className="lost-icon">
          <Icon name="shield" size={34} />
        </div>
        <h2>{title}</h2>
        <p className="muted">{sub}</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            clearToken();
            window.location.hash = '#/';
          }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
