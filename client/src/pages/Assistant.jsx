import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

const SUGGESTIONS = [
  'Explique-moi le théorème de Pythagore avec un exemple',
  'Comment réussir une dissertation de philosophie ?',
  'Donne-moi une méthode pour mémoriser une sourate',
  'C’est quoi une métaphore ? Donne 2 exemples',
  'Aide-moi à faire un planning de révision pour le Bac',
];

export default function Assistant() {
  const [msgs, setMsgs] = useState([
    { role: 'ia', text: 'Salut ! Je suis Prof IA 🤖 Pose-moi tes questions sur tes cours, tes révisions, ou demande-moi une explication simple. Je suis là pour toi !' },
  ]);
  const [saisie, setSaisie] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);
  const fin = useRef(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  async function envoyer(texte) {
    const t = (texte ?? saisie).trim();
    if (!t || busy) return;
    setSaisie('');
    setErreur(null);
    setMsgs((m) => [...m, { role: 'moi', text: t }]);
    setBusy(true);
    try {
      const historique = msgs.slice(-8).map((m) => ({ role: m.role === 'ia' ? 'ia' : 'eleve', text: m.text }));
      const r = await api('/eleve/ia', { method: 'POST', body: { message: t, historique } });
      setMsgs((m) => [...m, { role: 'ia', text: r.texte }]);
    } catch (e) {
      setErreur(e.message || 'Assistant indisponible.');
      setMsgs((m) => m.slice(0, -1)); // retire la question non traitée
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <section className="banner">
        <h2>🤖 Assistant IA</h2>
        <p>Ton tuteur personnel, disponible à toute heure pour expliquer, réviser et t'encourager.</p>
      </section>

      <div className="chat-box">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'ia' ? 'chat-msg ia' : 'chat-msg moi'}>
            <div className="chat-bulle">{m.text}</div>
          </div>
        ))}
        {busy && (
          <div className="chat-msg ia">
            <div className="chat-bulle">
              <span className="typing">✍️ Prof IA réfléchit…</span>
            </div>
          </div>
        )}
        <div ref={fin} />
      </div>

      {erreur && <div className="alert alert-danger">{erreur}</div>}

      {msgs.length <= 1 && (
        <div className="pills" style={{ marginTop: 10 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="pill" onClick={() => envoyer(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
      >
        <input className="input" placeholder="Écris ta question…" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
        <button className="btn btn-primary" disabled={busy || !saisie.trim()}>
          <Icon name="right" size={16} /> Envoyer
        </button>
      </form>
    </main>
  );
}
