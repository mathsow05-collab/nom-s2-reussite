import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

export default function IaSettings() {
  const [etat, setEtat] = useState(null);
  const [cle, setCle] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/admin/settings').then(setEtat);
  }, []);

  async function sauver() {
    setMsg(null);
    try {
      await api('/admin/settings/ia', { method: 'POST', body: { key: cle } });
      setMsg('✔ Clé enregistrée : l’assistant IA est activé pour tous les élèves.');
      setCle('');
      setEtat(await api('/admin/settings'));
    } catch (e) {
      setMsg('✘ ' + e.message);
    }
  }

  async function retirer() {
    await api('/admin/settings/ia', { method: 'DELETE' });
    setEtat(await api('/admin/settings'));
    setMsg('Clé retirée.');
  }

  return (
    <div className="admin-page">
      <h1>🤖 Assistant IA</h1>
      <div className="panel">
        <p>
          Statut :{' '}
          {etat ? (
            etat.ia ? (
              <span className="badge badge-ok">Activé (clé via {etat.source === 'env' ? 'Render' : 'plateforme'})</span>
            ) : (
              <span className="badge badge-danger">Non configuré</span>
            )
          ) : (
            '…'
          )}
        </p>
        <p className="muted">
          L'assistant utilise <strong>Google Gemini (gratuit)</strong>. Pour l'activer : crée une clé gratuite sur{' '}
          <strong>aistudio.google.com/apikey</strong> (compte Google), colle-la ci-dessous. La clé reste côté serveur,
          les élèves ne la voient jamais.
        </p>
        <label className="label">Clé API Gemini</label>
        <input className="input" placeholder="AIza…" value={cle} onChange={(e) => setCle(e.target.value)} />
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={!cle.trim()} onClick={sauver}>
            <Icon name="check" size={15} /> Activer l'assistant
          </button>
          {etat?.ia && etat.source === 'admin' && (
            <button className="btn btn-ghost" onClick={retirer}>
              Retirer la clé
            </button>
          )}
        </div>
        {msg && <div className="alert alert-warn">{msg}</div>}
        <p className="hint">
          Astuce plan Starter : pour que la clé survive aux redéploiements, ajoute aussi la variable d'environnement
          GEMINI_API_KEY dans Render → Environment.
        </p>
      </div>
    </div>
  );
}
