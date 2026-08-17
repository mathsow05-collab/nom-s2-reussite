import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

export default function Echanges() {
  const [questions, setQuestions] = useState(null);
  const [idees, setIdees] = useState(null);
  const [commu, setCommu] = useState(null);
  const [epingle, setEpingle] = useState(null);
  const [vue, setVue] = useState('perso');
  const [share, setShare] = useState(false);
  const [meId, setMeId] = useState(null);
  const [qSujet, setQSujet] = useState('');
  const [qMsg, setQMsg] = useState('');
  const [iMsg, setIMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    api('/eleve/questions').then(setQuestions);
    api('/eleve/idees').then(setIdees);
    api('/eleve/communaute').then((d) => { setCommu(d.liste || []); setEpingle(d.epingle || null); }).catch(() => setCommu([]));
  };
  useEffect(() => {
    api('/eleve/me').then((m) => setMeId(m.id));
    load();
  }, []);

  async function like(id) {
    await api('/eleve/communaute/like', { method: 'POST', body: { id } });
    api('/eleve/communaute').then((d) => setCommu(d.liste || []));
  }

  // Réponse admin en temps réel (poussée par le serveur via SSE)
  useEffect(() => {
    const h = (ev) => {
      if (ev.detail?.type === 'reponse') {
        load();
        setToast('L’administration vient de répondre à une de tes questions !');
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
      await api('/eleve/questions', { method: 'POST', body: { sujet: qSujet, message: qMsg, public: share ? 1 : 0 } });
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
        <h2>Échanges & communauté</h2>
        <p>Dialogue avec l'administration, et profite des questions déjà répondues partagées par les autres élèves de ta filière.</p>
      </section>

      <div className="pills" style={{ marginBottom: 12 }}>
        <button className={vue === 'perso' ? 'pill active' : 'pill'} onClick={() => setVue('perso')}>
          Mes échanges
        </button>
        <button className={vue === 'commu' ? 'pill active' : 'pill'} onClick={() => setVue('commu')}>
          Communauté ({commu ? commu.length : '…'})
        </button>
      </div>

      {vue === 'commu' && (
        <section className="panel">
          <h2>Questions partagées de ta filière</h2>
          {epingle && (
            <div className="pin3">
              <div className="pin3-titre">Question de la semaine</div>
              <div className="chat-bulle">
                <span className="thread-from">Élève · {epingle.prenom} {epingle.nom}</span>
                {epingle.message}
              </div>
              <div className="chat-bulle reponse-admin" style={{ marginTop: 8 }}>
                <span className="thread-from">Administration</span>
                {epingle.reponse}
              </div>
            </div>
          )}
          {!commu || commu.length === 0 ? (
            <p className="muted">Pas encore de questions partagées. Coche « partager » en posant ta question pour aider les autres !</p>
          ) : (
            commu.map((c) => (
              <div className="commu3" key={c.id}>
                  <div className="chat-msg moi">
                  <div className="chat-bulle">
                    <span className="thread-from">Élève · {c.prenom} {c.nom}</span>
                    {c.sujet && <span className="thread-sujet">{c.sujet}</span>}
                    {c.message}
                  </div>
                </div>
                <div className="chat-msg ia">
                  <div className="chat-bulle reponse-admin">
                    <span className="thread-from">Administration</span>
                    {c.reponse}
                  </div>
                </div>
                <button className={commu && c.likes.includes(meId) ? 'like3 on' : 'like3'} onClick={() => like(c.id)}>
                  <Icon name="thumb" size={14} /> {c.likes.length}
                </button>
              </div>
            ))
          )}
        </section>
      )}

      {vue === 'perso' && (
      <>
      <section className="panel">
        <h2>
          <Icon name="chat" size={17} /> Poser une question
        </h2>
        <form onSubmit={envoyerQuestion}>
          <label className="label">Concernant (optionnel)</label>
          <input className="input" placeholder="Ex. : le cours sur l'énergie mécanique" value={qSujet} onChange={(e) => setQSujet(e.target.value)} />
          <label className="label">Ta question *</label>
          <textarea className="input" rows="3" required value={qMsg} onChange={(e) => setQMsg(e.target.value)} placeholder="Je n'ai pas compris comment on choisit le référentiel…" />
          <label className="share3">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Partager ma question (et sa réponse) avec les autres élèves de ma filière
          </label>
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
          <div className="qa-thread">
            {questions.map((q) => (
              <div className="thread-item" key={q.id}>
                <div className="chat-msg moi">
                  <div className="chat-bulle">
                    {q.sujet && <span className="thread-sujet"> {q.sujet}</span>}
                    {q.message}
                  </div>
                </div>
                {q.reponse ? (
                  <div className="chat-msg ia">
                    <div className="chat-bulle reponse-admin">
                      <span className="thread-from">Administration</span>
                      {q.reponse}
                    </div>
                  </div>
                ) : (
                  <div className="thread-wait">⏳ L'administration prépare sa réponse…</div>
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
      </>
      )}
    </main>
  );
}
