import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal } from '../ui.jsx';
import { FILIERES_ETU } from '../data/etu.js';

/* Espace étudiant (gratuit) côté direction : liste des étudiants, validation
   des packs de cours en vente, validation des paiements d'achats. */
export default function EtudiantsAdmin() {
  const [vue, setVue] = useState('packs'); // packs | achats | etudiants
  const [etudiants, setEtudiants] = useState(null);
  const [packs, setPacks] = useState(null);
  const [achats, setAchats] = useState(null);
  const [creer, setCreer] = useState(false);
  const [cree, setCree] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ prenom: '', nom: '', filiere: 'mi', universite: '', tel: '' });

  async function creerEtudiant(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api('/admin/etudiants', { method: 'POST', body: f });
      setCree(r.etu_id);
      setCreer(false);
      setF({ prenom: '', nom: '', filiere: 'mi', universite: '', tel: '' });
      maj();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  const maj = () => {
    api('/admin/etudiants').then(setEtudiants).catch(() => {});
    api('/admin/packs').then(setPacks).catch(() => {});
    api('/admin/achats-packs').then(setAchats).catch(() => {});
  };
  useEffect(() => {
    maj();
  }, []);

  async function validerPack(id) {
    await api(`/admin/packs/${id}/valider`, { method: 'POST' });
    maj();
  }
  async function refuserPack(id) {
    await api(`/admin/packs/${id}/refuser`, { method: 'POST' });
    maj();
  }
  async function validerAchat(id) {
    await api(`/admin/achats-packs/${id}/valider`, { method: 'POST' });
    maj();
  }
  async function rejeterAchat(id) {
    await api(`/admin/achats-packs/${id}/rejeter`, { method: 'POST' });
    maj();
  }

  const attente = (packs || []).filter((p) => p.statut === 'en_attente').length;
  const achatsAttente = (achats || []).filter((a) => a.statut === 'en_attente').length;

  return (
    <div>
      <div className="pills" style={{ marginBottom: 10 }}>
        <button className="pill active" onClick={() => setCreer(true)}>+ Créer un étudiant (ID instantané)</button>
      </div>

      <div className="pills">
        <button className={vue === 'packs' ? 'pill active' : 'pill'} onClick={() => setVue('packs')}>
          📦 Packs à vérifier {attente > 0 && `(${attente})`}
        </button>
        <button className={vue === 'achats' ? 'pill active' : 'pill'} onClick={() => setVue('achats')}>
          💰 Paiements achats {achatsAttente > 0 && `(${achatsAttente})`}
        </button>
        <button className={vue === 'etudiants' ? 'pill active' : 'pill'} onClick={() => setVue('etudiants')}>
          🎓 Étudiants ({etudiants?.length ?? '…'})
        </button>
      </div>

      {vue === 'packs' && (
        <div className="panel">
          <h2>Packs de cours des étudiants</h2>
          <p className="muted small">
            Vérifie le contenu avant de mettre en vente (contenu sérieux uniquement). Le vendeur reçoit le prix moins la
            commission après chaque paiement validé.
          </p>
          {!packs && <p className="muted">Chargement…</p>}
          {packs?.length === 0 && <p className="muted">Aucun pack soumis pour l'instant.</p>}
          {packs?.map((p) => (
            <div className="hist3" key={p.id} style={{ alignItems: 'flex-start' }}>
              <span className="hist3-ico" style={{ background: 'var(--warn-soft, #fef3c7)' }}>
                <Icon name="briefcase" size={16} />
              </span>
              <div className="hist3-txt">
                <strong>{p.titre} — {p.prix} F</strong>
                <small>
                  {(FILIERES_ETU[p.filiere] || {}).label} · par {p.v_prenom} {p.v_nom} ({p.v_tel}) · statut : {p.statut} · {p.ventes_ok} vente(s)
                </small>
                {p.description && <small className="muted">{p.description}</small>}
                <small className="muted" style={{ whiteSpace: 'pre-wrap' }}>{p.contenu}</small>
              </div>
              {p.statut === 'en_attente' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <button className="btn btn-primary" onClick={() => validerPack(p.id)}>✔ Mettre en vente</button>
                  <button className="btn btn-ghost" onClick={() => refuserPack(p.id)}>Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {vue === 'achats' && (
        <div className="panel">
          <h2>Paiements déclarés (achats de packs)</h2>
          <p className="muted small">
            Vérifie que l'argent est bien arrivé sur ton Wave/OM, puis valide : l'acheteur reçoit le contenu du pack, et
            tu reverses sa part au vendeur (prix − commission).
          </p>
          {!achats && <p className="muted">Chargement…</p>}
          {achats?.length === 0 && <p className="muted">Aucun achat déclaré.</p>}
          {achats?.map((a) => (
            <div className="hist3" key={a.id}>
              <span className="hist3-ico" style={{ background: 'var(--warn-soft, #fef3c7)' }}>
                <Icon name="briefcase" size={16} />
              </span>
              <div className="hist3-txt">
                <strong>{a.ach_prenom} {a.ach_nom} — {a.pack_titre} ({a.prix} F)</strong>
                <small>
                  via {a.methode} · réf « {a.reference || '—'} » · {a.statut} · vendeur : {a.v_prenom} ({a.v_tel})
                </small>
              </div>
              {a.statut === 'en_attente' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <button className="btn btn-primary" onClick={() => validerAchat(a.id)}>✔ Valider</button>
                  <button className="btn btn-ghost" onClick={() => rejeterAchat(a.id)}>Rejeter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {cree && (
        <Modal title="🎉 Étudiant créé !" onClose={() => setCree(null)}>
          <p>
            Compte gratuit activé immédiatement. Donne cet ID à l'étudiant — c'est avec lui qu'il se connectera sur
            l'écran <strong>SCHOOBY Étudiant</strong> :
          </p>
          <div className="cree-id" style={{ textAlign: 'center', margin: '10px 0' }}>{cree}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(cree);
                } catch {
                  /* ignore */
                }
              }}
            >
              Copier l'ID
            </button>
            <button className="btn btn-primary" onClick={() => setCree(null)}>
              Terminé
            </button>
          </div>
        </Modal>
      )}

      {creer && (
        <Modal title="Créer un étudiant" onClose={() => { setCreer(false); setErr(null); }}>
          <form onSubmit={creerEtudiant} style={{ display: 'grid', gap: 8 }}>
            <input className="input" placeholder="Prénom *" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required />
            <input className="input" placeholder="Nom *" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
            <select className="input" value={f.filiere} onChange={(e) => setF({ ...f, filiere: e.target.value })}>
              {Object.entries(FILIERES_ETU).map(([k, v]) => (
                <option key={k} value={k}>{v.ico} {v.label}</option>
              ))}
            </select>
            <input className="input" placeholder="Université (ex. UCAD)" value={f.universite} onChange={(e) => setF({ ...f, universite: e.target.value })} />
            <input className="input" placeholder="Numéro WhatsApp * (protège le compte)" type="tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} required />
            {err && <div className="alert alert-danger">{err}</div>}
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Générer l\'ID étudiant'}</button>
          </form>
          <p className="muted small" style={{ marginTop: 8 }}>
            Le compte est actif tout de suite — pas besoin de code WhatsApp. Le numéro empêche quiconque de recréer un
            compte avec ce même numéro.
          </p>
        </Modal>
      )}

      {vue === 'etudiants' && (
        <div className="panel">
          <h2>Étudiants inscrits (espace gratuit)</h2>
          {!etudiants && <p className="muted">Chargement…</p>}
          {etudiants?.length === 0 && <p className="muted">Aucun étudiant inscrit.</p>}
          {etudiants?.map((e) => (
            <div className="hist3" key={e.id}>
              <span className="hist3-ico">
                <Icon name="users" size={16} />
              </span>
              <div className="hist3-txt">
                <strong>{e.prenom} {e.nom} — {(FILIERES_ETU[e.filiere] || {}).label || e.filiere}</strong>
                <small>
                  {e.universite || '—'} · {e.tel} · ID {e.etu_id} · {e.verifie ? '✔ vérifié' : '⏳ en attente du code'}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
