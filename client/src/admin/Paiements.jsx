import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

export default function Paiements() {
  const [list, setList] = useState(null);
  const [cfg, setCfg] = useState({ wave: '', om: '', cinetpay_key: '', cinetpay_site: '', whatsapp_token: '', whatsapp_phone_id: '', commission_packs: '25' });
  const [msg, setMsg] = useState(null);
  const [insc, setInsc] = useState(null);
  const maj = () => {
    api('/admin/paiements').then(setList).catch(() => {});
    api('/admin/inscriptions').then(setInsc).catch(() => {});
  };
  useEffect(() => {
    maj();
    api('/admin/settings').then((s) => setCfg({ wave: s.wave || '', om: s.om || '', cinetpay_key: s.cinetpay_key || '', cinetpay_site: s.cinetpay_site || '', whatsapp_token: s.whatsapp_token || '', whatsapp_phone_id: s.whatsapp_phone_id || '', commission_packs: s.commission_packs || '25' })).catch(() => {});
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
        <h2 style={{ marginTop: 14 }}>Paiement automatique (CinetPay)</h2>
        <p className="muted small">
          Avec un compte CinetPay (gratuit à créer), les élèves paient en 1 appui sur Wave / Orange Money et l'accès
          s'active tout seul. Sans clés, le mode manuel reste disponible.
        </p>
        <label className="label">Clé API CinetPay</label>
        <input className="input" value={cfg.cinetpay_key} onChange={(e) => setCfg({ ...cfg, cinetpay_key: e.target.value })} placeholder="xxxx-xxxx-…" />
        <label className="label">ID du site</label>
        <input className="input" value={cfg.cinetpay_site} onChange={(e) => setCfg({ ...cfg, cinetpay_site: e.target.value })} placeholder="123456" />
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={sauverNumeros}>
          Enregistrer
        </button>
        {msg && <div className="alert alert-ok">{msg}</div>}
      </div>

      <div className="panel">
        <h2>🛒 Commission boutique étudiante</h2>
        <label className="label">Commission de la plateforme sur chaque pack vendu (%)</label>
        <input className="input" type="number" min="0" max="90" value={cfg.commission_packs} onChange={(e) => setCfg({ ...cfg, commission_packs: e.target.value })} />
        <p className="muted small">Exemple : pack à 2 000 F, commission {cfg.commission_packs || 25} % → la plateforme garde {Math.round(2000 * (cfg.commission_packs || 25) / 100)} F, le vendeur reçoit {2000 - Math.round(2000 * (cfg.commission_packs || 25) / 100)} F.</p>
      </div>

      <div className="panel">
        <h2>📲 Inscriptions à vérifier (code WhatsApp)</h2>
        <p className="muted small">
          Si l'envoi automatique n'est pas branché, envoie le code + l'ID en 1 clic via ton WhatsApp, puis l'élève le
          saisit et sa semaine gratuite démarre.
        </p>
        {insc && insc.length === 0 && <p className="muted">Aucune inscription en attente.</p>}
        {insc?.map((i) => {
          const tel = i.tel?.length === 9 ? '221' + i.tel : i.tel;
          const txt = encodeURIComponent(`Bienvenue sur SCHOOBY  Ton code de vérification : ${i.code_verif} — Ton identifiant élève : ${i.eleve_id}. Garde-les précieusement.`);
          return (
            <div className="hist3" key={i.id}>
              <span className="hist3-ico" style={{ background: 'var(--warn-soft)' }}>
                <Icon name="users" size={16} />
              </span>
              <div className="hist3-txt">
                <strong>{i.prenom} {i.nom} ({i.filiere}) — {i.tel}</strong>
                <small>code {i.code_verif} · ID {i.eleve_id}</small>
              </div>
              <a className="btn btn-primary" href={`https://wa.me/${tel}?text=${txt}`} target="_blank" rel="noreferrer">
                Envoyer via WhatsApp
              </a>
            </div>
          );
        })}
        <h2 style={{ marginTop: 14 }}>WhatsApp automatique (API Meta, optionnel)</h2>
        <label className="label">Token d'accès Meta</label>
        <input className="input" value={cfg.whatsapp_token} onChange={(e) => setCfg({ ...cfg, whatsapp_token: e.target.value })} placeholder="EAAG…" />
        <label className="label">ID du numéro WhatsApp</label>
        <input className="input" value={cfg.whatsapp_phone_id} onChange={(e) => setCfg({ ...cfg, whatsapp_phone_id: e.target.value })} placeholder="1055…" />
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
