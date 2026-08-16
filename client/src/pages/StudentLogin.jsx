import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function StudentLogin() {
  const [id, setId] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { token } = await api('/eleve/login', { method: 'POST', body: { eleve_id: id } });
      setToken(token);
      window.location.hash = '#/app';
    } catch (ex) {
      setErr(ex.message || 'Erreur de connexion.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-v3">
      <div className="auth-glow g1" aria-hidden="true" />
      <div className="auth-glow g2" aria-hidden="true" />
      <main className="auth-card3">
        <div className="logo3">🎓</div>
        <h1>KAY DIANG</h1>
        <p className="tag3">
          Ton lycée, ta réussite — <span className="grad3">une seule plateforme.</span>
        </p>
        <form onSubmit={submit}>
          <label className="lab3" htmlFor="eid">
            Ton ID élève
          </label>
          <input
            id="eid"
            className="inp3"
            placeholder="S2-XXXX-XXXXX"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
          />
          {err && <div className="err3">{err}</div>}
          <button className="btn3" disabled={busy || !id.trim()}>
            {busy ? 'Connexion…' : 'Entrer dans mon espace →'}
          </button>
        </form>
        <div className="feat3">
          <span>🎬 Vidéos & PDF</span>
          <span>🧭 Orientation</span>
          <span>🛡️ Session sécurisée</span>
        </div>
        <a className="admin3" href="#/admin">
          Espace administrateur
        </a>
      </main>
    </div>
  );
}
