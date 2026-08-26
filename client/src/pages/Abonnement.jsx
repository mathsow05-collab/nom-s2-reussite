import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';

export default function Abonnement({ logout }) {
  const [abo, setAbo] = useState(null);
  const [methode, setMethode] = useState('wave');
  const [numero, setNumero] = useState('');
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState(null);
  const maj = () => api('/eleve/abonnement').then(setAbo).catch(() => {});
  useEffect(() => {
    maj();
  }, []);

  async function declarer(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/eleve/abonnement/payer', { method: 'POST', body: { methode, numero_envoyeur: numero, reference: ref } });
      setMsg('✔ Paiement déclaré ! Ton accès sera activé dès la vérification par l’administration.');
      setNumero('');
      setRef('');
      maj();
    } catch (ex) {
      setMsg('✘ ' + ex.message);
    }
  }

  return (
    <main className="container abo-ecran" style={{ maxWidth: 560 }}>
      <section className="card s3card" style={{ marginTop: 20, padding: 20 }}>
        <h2>🔓 Semaine d'essai terminée</h2>
        <p className="muted small">
          Ton accès reprend dès que ton abonnement est actif : <strong>{abo?.montant || '—'} F CFA / 30 jours</strong>{' '}
          (filière {abo?.filiere}).
        </p>

        <ol className="small" style={{ paddingLeft: 18, display: 'grid', gap: 6, margin: '12px 0', color: 'var(--ink)' }}>
          <li>
            Envoie <strong>{abo?.montant || '—'} F</strong> par{' '}
            {abo?.numeros?.wave ? <>Wave au <strong>{abo.numeros.wave}</strong></> : 'Wave'}
            {abo?.numeros?.om ? <> ou Orange Money au <strong>{abo.numeros.om}</strong></> : ''} ;
          </li>
          <li>Remplis le formulaire ci-dessous avec ton numéro d'envoi ;</li>
          <li>L'administration vérifie et active ton accès (30 jours).</li>
        </ol>

        {abo?.en_attente?.length > 0 && (
          <div className="alert alert-warn">⏳ Un paiement est en cours de vérification — patience, ça arrive vite !</div>
        )}

        <form onSubmit={declarer} style={{ display: 'grid', gap: 10 }}>
          <div className="pills">
            <button type="button" className={methode === 'wave' ? 'pill active' : 'pill'} onClick={() => setMethode('wave')}>
              🌊 Wave
            </button>
            <button type="button" className={methode === 'om' ? 'pill active' : 'pill'} onClick={() => setMethode('om')}>
              🟠 Orange Money
            </button>
          </div>
          <label className="label">Numéro qui a envoyé l'argent *</label>
          <input className="input" placeholder="77 123 45 67" value={numero} onChange={(e) => setNumero(e.target.value)} required />
          <label className="label">Référence / ID de transaction (si tu en as une)</label>
          <input className="input" placeholder="facultatif" value={ref} onChange={(e) => setRef(e.target.value)} />
          <button className="btn btn-primary" disabled={!numero.trim()}>
            <Icon name="check" size={15} /> J'ai payé, activer mon accès
          </button>
        </form>
        {msg && <div className="alert" style={{ marginTop: 10 }}>{msg}</div>}
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={logout}>
          Se déconnecter
        </button>
      </section>
    </main>
  );
}
