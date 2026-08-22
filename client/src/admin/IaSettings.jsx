import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

export default function IaSettings() {
  const [etat, setEtat] = useState(null);
  const [cle, setCle] = useState('');
  const [groq, setGroq] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/admin/settings').then(setEtat);
  }, []);

  async function sauver() {
    setMsg(null);
    try {
      await api('/admin/settings/ia', { method: 'POST', body: { key: cle, groq } });
      setMsg('✔ Clé(s) enregistrée(s) : l’assistant IA est activé pour tous les élèves.');
      setCle('');
      setGroq('');
      setEtat(await api('/admin/settings'));
    } catch (e) {
      setMsg('✘ ' + e.message);
    }
  }

  async function retirerGroq() {
    await api('/admin/settings/ia/groq', { method: 'DELETE' });
    setEtat(await api('/admin/settings'));
    setMsg('Secours Groq retiré.');
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
        <label className="label">Clé API Gemini (principale)</label>
        <input className="input" placeholder="AIza…" value={cle} onChange={(e) => setCle(e.target.value)} />
        <label className="label" style={{ marginTop: 10 }}>
          Clé Groq (secours gratuit, optionnel — <strong>gsk_…</strong> sur console.groq.com)
        </label>
        <input className="input" placeholder="gsk…" value={groq} onChange={(e) => setGroq(e.target.value)} />
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={!cle.trim() && !groq.trim()} onClick={sauver}>
            <Icon name="check" size={15} /> Enregistrer
          </button>
          {etat?.ia && etat.source === 'admin' && (
            <button className="btn btn-ghost" onClick={retirer}>
              Retirer la clé Gemini
            </button>
          )}
          {etat?.groq && (
            <button className="btn btn-ghost" onClick={retirerGroq}>
              Retirer le secours Groq
            </button>
          )}
        </div>
        {etat?.groq && (
          <p className="muted small">⚡ Secours Groq actif : si Gemini sature, l'assistant bascule tout seul sur Llama 3.3 70B.</p>
        )}
        {msg && <div className="alert alert-warn">{msg}</div>}
        <p className="hint">
          Astuce plan Starter : pour que la clé survive aux redéploiements, ajoute aussi la variable d'environnement
          GEMINI_API_KEY dans Render → Environment.
        </p>
      </div>
    </div>
  );
}
