import { useState } from 'react';
import { api, setToken } from '../api.js';
import Icon from '../Icon.jsx';
import { Aurora, Shiny } from '../components/Fx.jsx';

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
    <div className="auth-wrap">
      <Aurora />
      <div className="auth-hero">
        <div className="auth-logo">
          <Icon name="cap" size={30} /> <Shiny>KAY DIANG</Shiny>
        </div>
        <h1 className="auth-title">
          <span style={{ '--d': '0ms' }}>Ton lycée.</span>
          <span style={{ '--d': '140ms' }}>Ta réussite.</span>
          <span className="shiny" style={{ '--d': '280ms' }}>Une seule plateforme.</span>
        </h1>
        <p>
          Filière <strong>S2</strong> : Maths, Physique-Chimie, Français, Histoire-Géo. Filière <strong>L2</strong> :
          Français, Philosophie, Histoire-Géo, Anglais. Cours d'<strong>arabe</strong> par niveaux (1, 2, 3). Vidéos,
          fiches PDF et catalogue des métiers après le Bac.
        </p>
        <ul className="auth-points">
          <li>
            <Icon name="video" /> Vidéos de cours et fiches PDF par matière
          </li>
          <li>
            <Icon name="compass" /> Catalogue d'orientation post-Bac
          </li>
          <li>
            <Icon name="shield" /> Accès sécurisé par ID unique et session personnelle
          </li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <h2>Espace élève</h2>
        <p className="muted">Entre l'ID unique qui t'a été remis par l'administration.</p>
        <label className="label" htmlFor="eid">
          ID élève
        </label>
        <input
          id="eid"
          className="input input-lg"
          placeholder="S2-XXXX-XXXXX"
          value={id}
          onChange={(e) => setId(e.target.value.toUpperCase())}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck="false"
        />
        {err && <div className="alert alert-danger">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy || !id.trim()}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <div className="auth-foot">
          <a href="#/admin">
            <Icon name="shield" size={14} /> Espace administrateur
          </a>
        </div>
      </form>
    </div>
  );
}
