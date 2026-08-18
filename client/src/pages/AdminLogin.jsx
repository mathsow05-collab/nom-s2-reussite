import { useState } from 'react';
import { api, setAdminToken } from '../api.js';
import Icon from '../Icon.jsx';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { username, password } });
      setAdminToken(token);
      window.location.hash = '#/admin/app';
    } catch (ex) {
      setErr(ex.message || 'Erreur de connexion.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap auth-admin">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card-logo">
          <Icon name="shield" size={26} />
        </div>
        <h2>Espace administrateur</h2>
        <p className="muted">Accès réservé aux gestionnaires de la plateforme.</p>
        <label className="label" htmlFor="u">
          Nom d'utilisateur
        </label>
        <input id="u" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
        <label className="label" htmlFor="p">
          Mot de passe
        </label>
        <input id="p" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {err && <div className="alert alert-danger">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy || !username || !password}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <div className="auth-foot">
          <a href="#/">
            <Icon name="left" size={14} /> Retour à l'espace élève
          </a>
        </div>
      </form>
    </div>
  );
}
