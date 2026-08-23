import { useState } from 'react';
import { api, setToken } from '../api.js';
import { Modal } from '../ui.jsx';
import Juridique from './Juridique.jsx';
import Icon from '../Icon.jsx';

export default function StudentLogin() {
  const [id, setId] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [jur, setJur] = useState(false);

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
        <div className="logo3"><Icon name="cap" size={28} /></div>
        <h1>SCHOOBY</h1>
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
          <span><Icon name="video" size={13} /> Vidéos & PDF</span>
          <span><Icon name="compass" size={13} /> Orientation</span>
          <span><Icon name="shield" size={13} /> Session sécurisée</span>
        </div>
        <a className="admin3" href="#/admin">
          Espace administrateur
        </a>
      </main>
      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={() => setJur(true)}>
          📄 Conditions d'utilisation · Confidentialité · Mentions légales
        </button>
      </p>
      {jur && (
        <Modal title="Informations légales" onClose={() => setJur(false)} wide>
          <Juridique avecBoutonFermer onFermer={() => setJur(false)} />
        </Modal>
      )}
    </div>
  );
}
