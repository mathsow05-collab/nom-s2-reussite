import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

export default function Echanges() {
  const [questions, setQuestions] = useState(null);
  const [idees, setIdees] = useState(null);
  const [qSujet, setQSujet] = useState('');
  const [qMsg, setQMsg] = useState('');
  const [iMsg, setIMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    api('/eleve/questions').then(setQuestions);
    api('/eleve/idees').then(setIdees);
  };
  useEffect(() => {
    load();
  }, []);

  // Réponse admin en temps réel (poussée par le serveur via SSE)
  useEffect(() => {
    const h = (ev) => {
      if (ev.detail?.type === 'reponse') {
        load();
        setToast('🎉 L’administration vient de répondre à une de tes questions !');
        setTimeout(() => setToast(null), 8000);
      }
    };
    window.addEventListener('s2r-sse', h);
    return () => window.removeEventListener('s2r-sse', h);
  }, []);

  async function envoyerQuestion(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/eleve/questions', { method: 'POST', body: { sujet: qSujet, message: qMsg } });
      setQMsg('');
      setQSujet('');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function envoyerIdee(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/eleve/idees', { method: 'POST', body: { message: iMsg } });
      setIMsg('');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      {toast && <div className="toast">{toast}</div>}
      <section className="banner">
        <h2>Échanges avec l'administration</h2>
        <p>Une question sur un cours ? Pose-la ici : la réponse arrive directement sur ton espace, en temps réel. Et propose tes idées pour améliorer la plateforme !</p>
      </section>

      <section className="panel">
        <h2>
          <Icon name="chat" size={17} /> Poser une question
        </h2>
        <form onSubmit={envoyerQuestion}>
          <label className="label">Concernant (optionnel)</label>
          <input className="input" placeholder="Ex. : le cours sur l'énergie mécanique" value={qSujet} onChange={(e) => setQSujet(e.target.value)} />
          <label className="label">Ta question *</label>
          <textarea className="input" rows="3" required value={qMsg} onChange={(e) => setQMsg(e.target.value)} placeholder="Je n'ai pas compris comment on choisit le référentiel…" />
          <button className="btn btn-primary" disabled={busy || !qMsg.trim()}>
            Envoyer ma question
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Mes questions</h2>
        {!questions ? (
          <Spinner />
        ) : questions.length === 0 ? (
          <p className="muted">Tu n'as pas encore posé de question.</p>
        ) : (
          <div className="qa-list">
            {questions.map((q) => (
              <div className={q.statut === 'repondu' ? 'qa-item ok-border' : 'qa-item'} key={q.id}>
                <div className="qa-q">
                  <strong>{q.sujet ? `${q.sujet} — ` : ''}</strong>
                  {q.message}
                  <span className={q.statut === 'repondu' ? 'badge badge-ok' : 'badge badge-soft'} style={{ marginLeft: 8 }}>
                    {q.statut === 'repondu' ? 'Répondu' : 'En attente'}
                  </span>
                </div>
                {q.reponse && (
                  <div className="qa-r">
                    <Icon name="check" size={15} /> {q.reponse}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>
          <Icon name="bulb" size={17} /> Boîte à idées
        </h2>
        <form onSubmit={envoyerIdee}>
          <textarea className="input" rows="2" required value={iMsg} onChange={(e) => setIMsg(e.target.value)} placeholder="Une idée pour améliorer la plateforme ? (nouvelle matière, fonctionnalité…)" />
          <button className="btn btn-outline" disabled={busy || !iMsg.trim()}>
            Déposer mon idée
          </button>
        </form>
        {idees && idees.length > 0 && (
          <p className="muted small" style={{ marginTop: 10 }}>
            Merci ! Tu as déjà déposé {idees.length} idée{idees.length > 1 ? 's' : ''}.
          </p>
        )}
      </section>
    </main>
  );
}
