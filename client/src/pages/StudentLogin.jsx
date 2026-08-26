import { useState } from 'react';
import { api, setToken } from '../api.js';
import { Modal } from '../ui.jsx';
import Juridique from './Juridique.jsx';
import InstallApp from './InstallApp.jsx';
import { deviceId, empreinte } from '../device.js';
import Icon from '../Icon.jsx';

export default function StudentLogin() {
  const [id, setId] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [jur, setJur] = useState(false);
  const [inscrire, setInscrire] = useState(false);
  const [cree, setCree] = useState(null);
  const [f, setF] = useState({ prenom: '', nom: '', classe: '', filiere: 'S2', tel: '' });
  const [code, setCode] = useState('');

  async function submitInscription(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fp = await empreinte();
      const r = await api('/eleve/inscrire', { method: 'POST', body: { ...f, device_id: deviceId(), fp_hash: fp.hash, fp_mark: fp.mark } });
      setCree(r);
    } catch (ex) {
      setErr(ex.message || 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api('/eleve/verifier', { method: 'POST', body: { code, tel: f.tel } });
      setToken(r.token);
      window.location.hash = '#/app';
    } catch (ex) {
      setErr(ex.message || 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }

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
      {cree && (
        <section className="card s3card" style={{ marginTop: 14, padding: 18, textAlign: 'center' }}>
          <h2>📲 Vérifie ton WhatsApp</h2>
          <p className="muted small">
            Ton identifiant : <strong>{cree.eleve_id}</strong>. Un message WhatsApp avec ton <strong>code à 6 chiffres</strong>{' '}
            et ton ID vient de partir{cree.envoi_auto ? '' : ' (ou sera envoyé par l’école dans quelques minutes)'}. Entre le
            code pour activer ta semaine gratuite :
          </p>
          {cree.abus && (
            <div className="alert alert-danger">
              Ce téléphone/numéro a déjà utilisé sa semaine gratuite : l'abonnement est requis directement.
            </div>
          )}
          <form onSubmit={submitCode} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            <input
              className="input cree-id"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button className="btn btn-primary" disabled={busy || code.length !== 6}>
              Activer ma semaine gratuite
            </button>
          </form>
        </section>
      )}

      {inscrire && (
        <form onSubmit={submitInscription} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <div className="pills">
            <button type="button" className={f.filiere === 'S2' ? 'pill active' : 'pill'} onClick={() => setF({ ...f, filiere: 'S2' })}>
              S2 · Sciences (1 500 F/mois après essai)
            </button>
            <button type="button" className={f.filiere === 'L2' ? 'pill active' : 'pill'} onClick={() => setF({ ...f, filiere: 'L2' })}>
              L2 · Lettres (1 000 F/mois après essai)
            </button>
          </div>
          <input className="input" placeholder="Prénom *" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required />
          <input className="input" placeholder="Nom *" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          <input className="input" placeholder="Classe (ex. Terminale S2)" value={f.classe} onChange={(e) => setF({ ...f, classe: e.target.value })} />
          <input className="input" placeholder="Numéro WhatsApp * (code + ID envoyés dessus)" type="tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} required />
          <button className="btn btn-primary" disabled={busy}>
            🎁 Créer mon compte — 7 jours gratuits
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setInscrire(false)}>
            J'ai déjà un ID
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!inscrire && (
          <button className="btn btn-primary" onClick={() => setInscrire(true)}>
            ✍ S'inscrire (1 semaine gratuite)
          </button>
        )}
        <InstallApp auto />
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
