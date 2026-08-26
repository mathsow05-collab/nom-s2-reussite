import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

export default function Paiements() {
  const [list, setList] = useState(null);
  const [cfg, setCfg] = useState({ wave: '', om: '' });
  const [msg, setMsg] = useState(null);
  const maj = () => api('/admin/paiements').then(setList).catch(() => {});
  useEffect(() => {
    maj();
    api('/admin/settings').then((s) => setCfg({ wave: s.wave || '', om: s.om || '' })).catch(() => {});
  }, []);

  async function agir(id, ok) {
    await api(`/admin/paiements/${id}/${ok ? 'valider' : 'rejeter'}`, { method: 'POST', body: {} });
    maj();
  }
  async function sauverNumeros() {
    await api('/admin/settings/paiements', { method: 'POST', body: cfg });
    setMsg('✔ Numéros de réception enregistrés.');
  }

  return (
    <div className="admin-page">
      <h1>💳 Paiements & abonnements</h1>

      <div className="panel">
        <h2>Numéros de réception (affichés aux élèves)</h2>
        <label className="label">Wave</label>
        <input className="input" value={cfg.wave} onChange={(e) => setCfg({ ...cfg, wave: e.target.value })} placeholder="77 000 00 00" />
        <label className="label">Orange Money</label>
        <input className="input" value={cfg.om} onChange={(e) => setCfg({ ...cfg, om: e.target.value })} placeholder="78 000 00 00" />
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={sauverNumeros}>
          Enregistrer
        </button>
        {msg && <div className="alert alert-ok">{msg}</div>}
      </div>

      <div className="panel">
        <h2>Paiements déclarés par les élèves</h2>
        {!list && <p className="muted">Chargement…</p>}
        {list && list.length === 0 && <p className="muted">Aucun paiement déclaré pour l'instant.</p>}
        {list?.map((p) => (
          <div className="hist3" key={p.id}>
            <span className="hist3-ico" style={{ background: p.statut === 'en_attente' ? 'var(--warn-soft)' : p.statut === 'valide' ? 'var(--ok-soft)' : 'var(--danger-soft)' }}>
              <Icon name={p.methode === 'wave' ? 'globe' : 'briefcase'} size={16} />
            </span>
            <div className="hist3-txt">
              <strong>
                {p.prenom} {p.nom} ({p.filiere}) — {p.montant} F · {p.methode === 'wave' ? 'Wave' : 'OM'}
              </strong>
              <small>
                envoyé depuis {p.numero_envoyeur}
                {p.reference ? ` · réf ${p.reference}` : ''} · {p.statut}
              </small>
            </div>
            {p.statut === 'en_attente' && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary" onClick={() => agir(p.id, true)}>
                  Valider (+30 j)
                </button>
                <button className="btn btn-ghost" onClick={() => agir(p.id, false)}>
                  Rejeter
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
