import { useState } from 'react';
import { api, setToken } from '../../api.js';
import { Modal } from '../../ui.jsx';
import Juridique from '../Juridique.jsx';
import InstallApp from '../InstallApp.jsx';
import { deviceId, empreinte } from '../../device.js';
import Icon from '../../Icon.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

export default function EtudiantLogin() {
  const [id, setId] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [jur, setJur] = useState(false);
  const [inscrire, setInscrire] = useState(false);
  const [cree, setCree] = useState(null);
  const [code, setCode] = useState('');
  const [f, setF] = useState({ prenom: '', nom: '', filiere: 'mi', universite: '', tel: '' });

  async function submitInscription(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fp = await empreinte();
      const r = await api('/etudiant/inscrire', { method: 'POST', body: { ...f, device_id: deviceId(), fp_hash: fp.hash, fp_mark: fp.mark } });
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
      const r = await api('/etudiant/verifier', { method: 'POST', body: { code, tel: f.tel } });
      setToken(r.token);
      window.location.hash = '#/etu/app';
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
      const { token } = await api('/etudiant/login', { method: 'POST', body: { etu_id: id } });
      setToken(token);
      window.location.hash = '#/etu/app';
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
        <h1>SCHOOBY Étudiant</h1>
        <p className="tag3">
          L'université, ta réussite — <span className="grad3">100 % gratuit.</span>
        </p>

        {!inscrire && !cree && (
          <form onSubmit={submit}>
            <label className="lab3" htmlFor="eid2">Ton ID étudiant</label>
            <input
              id="eid2"
              className="inp3"
              placeholder="ETU-XXXX-XXXXX"
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
        )}

        <div className="feat3">
          <span><Icon name="users" size={13} /> Groupes par filière</span>
          <span><Icon name="book" size={13} /> Boutique de packs</span>
          <span><Icon name="shield" size={13} /> Gratuit & sécurisé</span>
        </div>

        <a className="admin3" href="#/">Espace lycée (S2 / L2)</a>
      </main>

      {cree && (
        <section className="card s3card" style={{ marginTop: 14, padding: 18, textAlign: 'center' }}>
          <h2>📲 Vérifie ton WhatsApp</h2>
          <p className="muted small">
            Ton identifiant : <strong>{cree.etu_id}</strong>. Un message WhatsApp avec ton <strong>code à 6 chiffres</strong>{' '}
            et ton ID vient de partir{cree.envoi_auto ? '' : ' (ou sera envoyé dans quelques minutes)'}. Entre le code pour
            activer ton compte gratuit :
          </p>
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
            {err && <div className="err3">{err}</div>}
            <button className="btn btn-primary" disabled={busy || code.length !== 6}>
              Activer mon compte gratuit
            </button>
          </form>
        </section>
      )}

      {inscrire && !cree && (
        <form onSubmit={submitInscription} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <div className="pills">
            {Object.entries(FILIERES_ETU).map(([k, v]) => (
              <button type="button" key={k} className={f.filiere === k ? 'pill active' : 'pill'} onClick={() => setF({ ...f, filiere: k })}>
                {v.ico} {v.label}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Prénom *" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required />
          <input className="input" placeholder="Nom *" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          <input className="input" placeholder="Université (ex. UCAD, UGB, ESP…)" value={f.universite} onChange={(e) => setF({ ...f, universite: e.target.value })} />
          <input className="input" placeholder="Numéro WhatsApp * (code + ID envoyés dessus)" type="tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} required />
          {err && <div className="err3">{err}</div>}
          <button className="btn btn-primary" disabled={busy}>
            🎓 Créer mon compte gratuit
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { setInscrire(false); setErr(null); }}>
            J'ai déjà un ID
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!inscrire && !cree && (
          <button className="btn btn-primary" onClick={() => setInscrire(true)}>
            ✍ S'inscrire — c'est gratuit
          </button>
        )}
        <InstallApp auto />
        <button className="btn btn-ghost" onClick={() => setJur(true)}>
          📄 Conditions · Confidentialité
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
