import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { FILIERES_ETU } from '../data/etu.js';

/* Espace étudiant (gratuit) côté direction : liste des étudiants, validation
   des packs de cours en vente, validation des paiements d'achats. */
export default function EtudiantsAdmin() {
  const [vue, setVue] = useState('packs'); // packs | achats | etudiants
  const [etudiants, setEtudiants] = useState(null);
  const [packs, setPacks] = useState(null);
  const [achats, setAchats] = useState(null);

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
