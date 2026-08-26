import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

/* Écran / modale d'abonnement : paiement automatique Wave & Orange Money
   (1 appui = montant exact), ou mode manuel si l'auto n'est pas activé. */
export default function Abonnement({ logout, onClose }) {
  const [abo, setAbo] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [manuel, setManuel] = useState(false);
  const [numero, setNumero] = useState('');
  const [ref, setRef] = useState('');
  const maj = () => api('/eleve/abonnement').then(setAbo).catch(() => {});
  useEffect(() => {
    maj();
  }, []);

  async function payer(methode) {
    setBusy(methode);
    setMsg(null);
    try {
      const r = await api('/eleve/abonnement/checkout', { method: 'POST', body: { methode } });
      if (r.url) window.location.href = r.url;
    } catch (ex) {
      if (ex?.code === 'PAIEMENT_MANUEL') {
        setManuel(true);
        setMsg('Le paiement automatique arrive bientôt : utilise le mode manuel ci-dessous.');
      } else {
        setMsg('✘ ' + (ex.message || 'Paiement impossible pour le moment.'));
      }
    } finally {
      setBusy(null);
    }
  }

  async function declarer(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/eleve/abonnement/payer', { method: 'POST', body: { methode: 'wave', numero_envoyeur: numero, reference: ref } });
      setMsg('✔ Paiement déclaré ! Accès activé dès vérification par l’administration.');
      maj();
    } catch (ex) {
      setMsg('✘ ' + ex.message);
    }
  }

  const M = abo?.montant || '—';

  return (
    <main className={onClose ? 'abo-carte' : 'container abo-ecran'} style={{ maxWidth: 560 }}>
      <section className="card s3card" style={{ marginTop: onClose ? 0 : 20, padding: 20 }}>
        {onClose && (
          <button className="btn btn-ghost" style={{ float: 'right' }} onClick={onClose}>
            <Icon name="x" size={15} /> Fermer
          </button>
        )}
        <h2>🔑 Mon abonnement</h2>
        <p className="muted small">
          {abo?.statut === 'expiré'
            ? 'Ta semaine d’essai est terminée : active ton accès pour continuer.'
            : 'Renouvelle ou active ton accès en 1 appui — le montant exact est débité, rien à saisir.'}{' '}
          <strong>
            {M} F CFA / 30 jours
          </strong>{' '}
          (filière {abo?.filiere}).
        </p>

        {abo?.en_attente?.length > 0 && (
          <div className="alert alert-warn">⏳ Un paiement est en cours de vérification.</div>
        )}

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg,#1b9be0,#0d6fb8)' }} disabled={!!busy} onClick={() => payer('wave')}>
            🌊 Payer {M} F avec Wave
          </button>
          <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg,#f16e00,#c95400)' }} disabled={!!busy} onClick={() => payer('om')}>
            🟠 Payer {M} F avec Orange Money
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Tu seras conduit sur Wave / Orange Money avec le montant déjà rempli : confirme, et ton accès s'active tout
          seul immédiatement.
        </p>

        {(manuel || !abo?.auto) && (
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: 'pointer', color: 'var(--muted)' }}>
              Ou mode manuel (j'ai déjà envoyé l'argent)
            </summary>
            <form onSubmit={declarer} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <p className="small">
                Envoie {M} F {abo?.numeros?.wave ? `au Wave ${abo.numeros.wave}` : ''}
                {abo?.numeros?.om ? ` ou OM ${abo.numeros.om}` : ''}, puis indique ton numéro d'envoi :
              </p>
              <input className="input" placeholder="77 123 45 67" value={numero} onChange={(e) => setNumero(e.target.value)} required />
              <input className="input" placeholder="Référence (facultatif)" value={ref} onChange={(e) => setRef(e.target.value)} />
              <button className="btn btn-outline" disabled={!numero.trim()}>
                J'ai payé, vérifiez mon envoi
              </button>
            </form>
          </details>
        )}

        {msg && <div className="alert" style={{ marginTop: 10 }}>{msg}</div>}
        {logout && (
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={logout}>
            Se déconnecter
          </button>
        )}
      </section>
    </main>
  );
}
