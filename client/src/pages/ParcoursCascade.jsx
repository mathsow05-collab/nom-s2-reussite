import { useState } from 'react';
import { Modal } from '../ui.jsx';
import { NODES, EDGES } from '../orientation/graphData.js';
import Icon from '../Icon.jsx';

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

/* Transitions logiques : après une licence viennent les ANNÉES, pas les
   universités (les liens « proposée par » servent seulement à la fiche). */
const SUIVANTS = {
  bac: ['branche'],
  branche: ['univ', 'domaine', 'pro', 'concours', 'alternance', 'etranger', 'travail'],
  univ: ['fac'],
  fac: ['licence'],
  domaine: ['ecole'],
  licence: ['annee'],
  annee: ['annee', 'master'],
  master: ['doctorat', 'metier'],
  doctorat: ['metier'],
  ecole: ['master', 'metier'],
  concours: ['metier'],
  pro: ['master', 'metier'],
  alternance: ['pro', 'metier'],
  travail: ['pro', 'metier'],
  etranger: ['metier'],
};
const enfantsDe = (id) => {
  const t = byId[id]?.type;
  return EDGES.filter((e) => e.from === id)
    .map((e) => byId[e.to])
    .filter((n) => n && (!SUIVANTS[t] || SUIVANTS[t].includes(n.type)));
};

/* Niveau d'accès déduit des textes d'admission : Bac, ou L2/L3. */
function niveauAcces(n) {
  const t = `${n.details?.Admission || ''} ${n.details?.['Préparation'] || ''} ${n.sub || ''}`;
  if (/bac\s*\+\s*[23]|bac\s*\+?2|licence|l2|l3/i.test(t)) return 'L2/L3';
  if (/bac/i.test(t)) return 'Bac';
  return null;
}
const FICHE = ['concours', 'ecole', 'master', 'pro', 'travail', 'etranger', 'alternance', 'metier', 'doctorat'];

/* Navigation en cascade : BAC → type → établissement → diplôme → années → débouchés. */
export default function ParcoursCascade({ onOuvrir }) {
  const [chemin, setChemin] = useState(['bac']);
  const [fiche, setFiche] = useState(null);
  const courant = byId[chemin[chemin.length - 1]];
  const enfants = enfantsDe(courant.id);
  const derniereAnnee =
    courant.type === 'annee' && !enfants.some((e) => e.type === 'annee');

  /* après une dernière année : catalogue concours/écoles accessibles avec L2/L3 */
  const apres = derniereAnnee
    ? NODES.filter((n) => ['concours', 'ecole', 'pro'].includes(n.type) && niveauAcces(n) === 'L2/L3')
    : [];

  function entrer(n) {
    if (FICHE.includes(n.type) || !enfantsDe(n.id).length) return setFiche(n);
    setChemin((c) => [...c, n.id]);
  }

  return (
    <div className="pc">
      {/* fil d'ariane */}
      <div className="pc-crumb">
        {chemin.map((id, i) => (
          <button key={id} className={i === chemin.length - 1 ? 'pc-crumb-on' : 'pc-crumb-btn'} onClick={() => setChemin(chemin.slice(0, i + 1))}>
            {byId[id].label.length > 18 ? byId[id].label.slice(0, 17) + '…' : byId[id].label}
          </button>
        ))}
      </div>

      <h3 className="pc-titre">
        {courant.id === 'bac' ? 'Choisis ton type de parcours :' : `Continue depuis ${courant.label} :`}
      </h3>

      <div className="pc-grid">
        {enfants.map((n) => {
          const niv = niveauAcces(n);
          return (
            <button key={n.id} className="pc-box" onClick={() => entrer(n)}>
              <span className="pc-box-top">
                <Icon name={n.icon || 'cap'} size={16} />
                <strong>{n.label}</strong>
                {niv && <span className="pc-badge">{niv}</span>}
              </span>
              {n.type !== 'annee' && n.sub && <small>{n.sub}</small>}
              {n.type === 'annee' && n.details?.Programme && (
                <small className="pc-info">📚 {String(n.details.Programme).slice(0, 90)}…</small>
              )}
              <span className="pc-go">{enfantsDe(n.id).length && !FICHE.includes(n.type) ? '→' : 'ⓘ'}</span>
            </button>
          );
        })}
      </div>

      {fiche && (
        <Modal title={fiche.label} onClose={() => setFiche(null)} wide>
          <p className="muted small" style={{ marginTop: -6 }}>
            {fiche.sub || ''}
          </p>
          {fiche.presentation && <p className="small">{fiche.presentation}</p>}
          {fiche.details && (
            <div className="xo-details">
              {Object.entries(fiche.details).map(([k, v]) => (
                <div key={k}>
                  <strong>{k}</strong>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          {fiche.concoursList?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 6px' }}>Concours & admissions</h4>
              <div className="chips3">
                {fiche.concoursList.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
          {fiche.masters?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 6px' }}>Masters ensuite</h4>
              <div className="chips3">
                {fiche.masters.map((m) => (
                  <span key={m} className="chip">
                    {m}
                  </span>
                ))}
              </div>
            </>
          )}
          {fiche.metiers?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 6px' }}>Métiers visés</h4>
              <div className="chips3">
                {fiche.metiers.map((m) => (
                  <span key={m} className="chip">
                    💼 {m}
                  </span>
                ))}
              </div>
            </>
          )}
          {fiche.details?.Conseil && <p className="small" style={{ marginTop: 10 }}>💡 {fiche.details.Conseil}</p>}
        </Modal>
      )}

      {apres.length > 0 && (
        <>
          <h3 className="pc-titre" style={{ marginTop: 16 }}>
            🎯 Débouchés après {courant.label} (niveau L2/L3) :
          </h3>
          <div className="pc-grid">
            {apres.map((n) => (
              <button key={n.id} className="pc-box" onClick={() => setFiche(n)}>
                <span className="pc-box-top">
                  <Icon name={n.icon || 'award'} size={16} />
                  <strong>{n.label}</strong>
                  <span className="pc-badge">L2/L3</span>
                </span>
                {n.sub && <small>{n.sub}</small>}
                <span className="pc-go">ⓘ</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
