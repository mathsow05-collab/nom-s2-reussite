import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import Icon from '../../Icon.jsx';
import { Modal, Spinner } from '../../ui.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

/* Boutique : packs de cours vendus par les étudiants. Commission % retenue
   par la plateforme (réglée par la direction) ; le reste revient au vendeur. */
export default function Boutique({ me }) {
  const [packs, setPacks] = useState(null);
  const [fil, setFil] = useState(me.filiere);
  const [vue, setVue] = useState('parcourir'); // parcourir | vendre | mes-ventes | mes-achats
  const [modal, setModal] = useState(null); // pack en cours d'achat
  const [err, setErr] = useState(null);

  const maj = useCallback(() => {
    api(`/etudiant/packs?${fil !== 'all' ? `filiere=${fil}` : ''}`).then(setPacks).catch(() => {});
  }, [fil]);

  useEffect(() => {
    maj();
  }, [maj]);

  const t = (me.commission ?? 25) / 100;

  return (
    <main className="container">
      <section className="banner">
        <h2>🛒 Boutique de packs</h2>
        <p>
          Des étudiants vendent leurs packs de cours (fiches, exercices, annales corrigées…). La plateforme vérifie chaque
          pack avant publication et retient {Math.round(t * 100)} % — le reste va directement au vendeur.
        </p>
      </section>

      <div className="pills">
        <button className={vue === 'parcourir' ? 'pill active' : 'pill'} onClick={() => setVue('parcourir')}>Parcourir</button>
        <button className={vue === 'vendre' ? 'pill active' : 'pill'} onClick={() => setVue('vendre')}>💰 Vendre un pack</button>
        <button className={vue === 'mes-ventes' ? 'pill active' : 'pill'} onClick={() => setVue('mes-ventes')}>Mes ventes</button>
        <button className={vue === 'mes-achats' ? 'pill active' : 'pill'} onClick={() => setVue('mes-achats')}>Mes achats</button>
      </div>

      {vue === 'parcourir' && (
        <>
          <div className="pills" style={{ marginTop: 6 }}>
            <button className={fil === me.filiere ? 'pill active' : 'pill'} onClick={() => setFil(me.filiere)}>Ma filière</button>
            <button className={fil === 'all' ? 'pill active' : 'pill'} onClick={() => setFil('all')}>Toutes</button>
          </div>
          {!packs ? (
            <div className="page-loading"><Spinner /></div>
          ) : packs.length === 0 ? (
            <div className="empty">Aucun pack en vente pour l'instant — lance-toi, vends le premier !</div>
          ) : (
            <div className="grid-cards">
              {packs.map((p) => (
                <article className="card cours-card" key={p.id}>
                  <div className="cours-top">
                    <span className="badge-pastel">{(FILIERES_ETU[p.filiere] || {}).label || p.filiere}{p.matiere ? ` · ${p.matiere}` : ''}</span>
                    <strong>{p.prix} F</strong>
                  </div>
                  <h3>{p.titre}</h3>
                  {p.description && <p className="muted clamp2">{p.description}</p>}
                  <p className="muted small">Par {p.vendeur_prenom} · {p.ventes} vente(s)</p>
                  <div className="cours-actions">
                    {p.possede ? (
                      <button className="btn btn-outline" onClick={() => setVue('mes-achats')}>✔ Dans mes achats</button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => setModal(p)}>
                        <Icon name="briefcase" size={15} /> Acheter — {p.prix} F
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {vue === 'vendre' && <Vendre me={me} onFait={() => { setVue('mes-ventes'); }} err={err} setErr={setErr} />}
      {vue === 'mes-ventes' && <MesVentes t={t} />}
      {vue === 'mes-achats' && <MesAchats />}

      {modal && (
        <Modal title={`Acheter « ${modal.titre} »`} onClose={() => setModal(null)}>
          <AchatModal pack={modal} onFait={() => { setModal(null); setVue('mes-achats'); maj(); }} />
        </Modal>
      )}
    </main>
  );
}

function Vendre({ me, onFait, err, setErr }) {
  const [f, setF] = useState({ titre: '', filiere: me.filiere, matiere: '', prix: 2000, description: '', contenu: '' });
  const [busy, setBusy] = useState(false);
  const gain = Math.round(f.prix * (1 - (me.commission ?? 25) / 100));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api('/etudiant/packs', { method: 'POST', body: f });
      onFait();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <p className="muted small">
        Ton pack est vérifié par la direction avant publication (contenu sérieux uniquement). À chaque vente tu reçois{' '}
        <strong>{100 - (me.commission ?? 25)} %</strong> du prix, versés par la direction sur ton Wave/OM.
      </p>
      <input className="input" placeholder="Titre * (ex. Pack Algèbre 1 — tout le S1)" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} required />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="input" style={{ flex: 1 }} value={f.filiere} onChange={(e) => setF({ ...f, filiere: e.target.value })}>
          {Object.entries(FILIERES_ETU).map(([k, v]) => (
            <option key={k} value={k}>{v.ico} {v.label}</option>
          ))}
        </select>
        <input className="input" style={{ flex: 1 }} placeholder="Matière (ex. Algèbre 1)" value={f.matiere} onChange={(e) => setF({ ...f, matiere: e.target.value })} />
      </div>
      <label className="label">Prix de vente (F CFA) — tu reçois {gain} F par vente</label>
      <input className="input" type="number" min={500} max={25000} step={100} value={f.prix} onChange={(e) => setF({ ...f, prix: Number(e.target.value) })} />
      <textarea className="input" rows={2} placeholder="Description courte (ce que l'acheteur obtient)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <textarea className="input" rows={4} placeholder="Contenu détaillé * : liste des chapitres, nombre de fiches, exercices corrigés, format (PDF, lien Drive…)" value={f.contenu} onChange={(e) => setF({ ...f, contenu: e.target.value })} required />
      {err && <div className="alert alert-danger">{err}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : '📤 Soumettre à la vérification'}</button>
    </form>
  );
}

function MesVentes({ t }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    api('/etudiant/mes-packs').then(setList).catch(() => {});
  }, []);
  if (!list) return <div className="page-loading"><Spinner /></div>;
  const total = list.reduce((s, p) => s + p.gain * p.ventes_ok, 0);
  return (
    <div style={{ marginTop: 10 }}>
      <div className="card etu-bilan">
        <strong>💰 Gains validés : {total} F CFA</strong>
        <small className="muted">Versés par la direction après validation de chaque paiement.</small>
      </div>
      {list.length === 0 && <div className="empty">Tu n'as encore aucun pack en vente.</div>}
      {list.map((p) => (
        <div className="card" key={p.id} style={{ marginTop: 8 }}>
          <div className="cours-top">
            <strong>{p.titre}</strong>
            <span className={p.statut === 'en_ligne' ? 'badge badge-soft' : 'badge'}>
              {p.statut === 'en_ligne' ? '✔ En vente' : p.statut === 'en_attente' ? '⏳ En vérification' : '✖ Refusé'}
            </span>
          </div>
          <p className="muted small">
            {p.prix} F · {p.ventes_ok} vente(s) validée(s) · tu gagnes {p.gain} F/vente (commission {Math.round(t * 100)} % retenue).
          </p>
        </div>
      ))}
    </div>
  );
}

function MesAchats() {
  const [list, setList] = useState(null);
  useEffect(() => {
    api('/etudiant/mes-achats').then(setList).catch(() => {});
  }, []);
  if (!list) return <div className="page-loading"><Spinner /></div>;
  return (
    <div style={{ marginTop: 10 }}>
      {list.length === 0 && <div className="empty">Aucun achat pour l'instant.</div>}
      {list.map((a) => (
        <div className="card" key={a.id} style={{ marginTop: 8 }}>
          <div className="cours-top">
            <strong>{a.titre}</strong>
            <span className={a.statut === 'valide' ? 'badge badge-soft' : 'badge'}>
              {a.statut === 'valide' ? '✔ Payé & débloqué' : a.statut === 'en_attente' ? '⏳ En attente de validation' : '✖ Paiement refusé'}
            </span>
          </div>
          <p className="muted small">{a.prix} F · vendu par {a.vendeur_prenom}</p>
          {a.statut === 'valide' && (
            <div className="etu-contenu">
              <strong>📦 Contenu du pack</strong>
              <p style={{ whiteSpace: 'pre-wrap' }}>{a.contenu}</p>
            </div>
          )}
          {a.statut === 'en_attente' && (
            <p className="muted small">La direction vérifie ton paiement — tu recevras le contenu juste après.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AchatModal({ pack, onFait }) {
  const [methode, setMethode] = useState('wave');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function payer(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/etudiant/packs/${pack.id}/acheter`, { method: 'POST', body: { methode, reference } });
      onFait();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <p>
        Montant exact : <strong>{pack.prix} F CFA</strong>. Envoie le montant sur le compte Wave / Orange Money de la
        plateforme, puis déclare ton paiement ici — la direction valide et ton pack se débloque.
      </p>
      <form onSubmit={payer} style={{ display: 'grid', gap: 8 }}>
        <div className="pills">
          <button type="button" className={methode === 'wave' ? 'pill active' : 'pill'} onClick={() => setMethode('wave')}>🌊 Wave</button>
          <button type="button" className={methode === 'om' ? 'pill active' : 'pill'} onClick={() => setMethode('om')}>🟠 Orange Money</button>
        </div>
        <input className="input" placeholder="Référence de la transaction (ou ton numéro d'envoi)" value={reference} onChange={(e) => setReference(e.target.value)} required />
        {err && <div className="alert alert-danger">{err}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : `J'ai payé ${pack.prix} F — déclarer`}</button>
      </form>
    </div>
  );
}
