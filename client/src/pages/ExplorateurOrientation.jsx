import { useMemo, useState } from 'react';
import { FILIERES } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal } from '../ui.jsx';
import { SLOGAN } from '../orientation/data.js';
import { nodesById, searchNodes, conseiller, TYPE_META, INTERETS_LIST } from '../orientation/engine.js';
import { NODES, SECTEURS } from '../orientation/graphData.js';
import CarteMentale from './CarteMentale.jsx';
import ParcoursCascade from './ParcoursCascade.jsx';

/* Explorateur d'orientation v4 — lisible d'abord :
   1. filtre « type de parcours » (chips) ;
   2. filtre « secteur » (grille 2D simple, zéro rotation) ;
   3. résultats en cartes lisibles ;
   4. tiroir (panneau latéral / bottom sheet) avec le contenu réel :
      durée, concours, débouchés métiers, masters, passerelles ;
   5. BONUS : le parcours visualisé en petit réseau 2D dans le tiroir. */

const TYPES = [
  { id: 'universite', label: 'Université', types: ['licence'], hex: '#4f46e5' },
  { id: 'ecoles', label: 'Écoles supérieures', types: ['ecole'], hex: '#0d9488' },
  { id: 'pro', label: 'Pro & BTS/DUT', types: ['pro'], hex: '#d97706' },
  { id: 'concours', label: 'Concours', types: ['concours'], hex: '#db2777' },
  { id: 'alternance', label: 'Alternance', types: ['alternance'], hex: '#b45309' },
  { id: 'etranger', label: 'Étranger', types: ['etranger'], hex: '#0891b2' },
  { id: 'emploi', label: 'Emploi direct', types: ['travail'], hex: '#dc2626' },
];

const SAVED_KEY = 'kd_orient_parcours';

export default function ExplorateurOrientation({ filiere, onOpenMetier }) {
  const [type, setType] = useState('universite');
  const [secteur, setSecteur] = useState(null);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [compar, setCompar] = useState([]);
  const [showCompar, setShowCompar] = useState(false);
  const [carte, setCarte] = useState(false);
  const [vue, setVue] = useState('cascade');

  const results = useMemo(() => {
    const t = TYPES.find((x) => x.id === type);
    return NODES.filter(
      (n) =>
        t.types.includes(n.type) &&
        (!secteur || (n.secteurs || []).includes('all') || (n.secteurs || []).includes(secteur))
    );
  }, [type, secteur]);
  const accent = TYPES.find((t) => t.id === type)?.hex || '#4f46e5';

  const searchResults = useMemo(() => searchNodes(q), [q]);
  const sel = selected ? nodesById.get(selected) : null;
  const savedList = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');

  function toggleCompar(id) {
    setCompar((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? c : [...c, id]));
  }
  function sauver() {
    if (!sel) return;
    const list = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    if (!list.some((s) => s.id === sel.id)) {
      list.push({ id: sel.id, label: `${TYPES.find((t) => t.types.includes(sel.type))?.label || ''} · ${sel.label}` });
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    }
    setSavedOpen(true);
  }
  function ouvrirSearch(n) {
    const t = TYPES.find((x) => x.types.includes(n.type));
    if (t) setType(t.id);
    setSelected(n.id);
    setSearchOpen(false);
    setQ('');
  }

  return (
    <div className="xo">
      <header className="xo-head">
        <div>
          <h2>Explorateur d'orientation</h2>
          <p className="xo-slogan">« {SLOGAN} »</p>
        </div>
        <div className="xo-tools">
          <div className="xo-search">
            <Icon name="search" size={15} />
            <input
              value={q}
              placeholder="Formation, métier, école, université…"
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="xo-results">
                {searchResults.map((r) => (
                  <button key={r.id} onMouseDown={() => ouvrirSearch(r)}>
                    <span className="xo-type" style={{ color: TYPE_META[r.type]?.color }}>
                      {TYPE_META[r.type]?.label}
                    </span>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setCarte(true)}>
            🌳 Carte des parcours
          </button>
          <button className="btn btn-outline" onClick={() => setQuiz(true)}>
            <Icon name="bulb" size={15} /> Je ne sais pas quoi faire
          </button>
          <button className="btn btn-outline" onClick={() => setSavedOpen(true)}>
            <Icon name="heart" size={15} /> Mes choix{savedList.length > 0 ? ` (${savedList.length})` : ''}
          </button>
          <button className="btn btn-outline" disabled={compar.length < 2} onClick={() => setShowCompar(true)}>
            <Icon name="layers" size={15} /> Comparer ({compar.length})
          </button>
        </div>
      </header>

      <div className="pills" style={{ marginBottom: 12 }}>
        <button className={vue === 'cascade' ? 'pill active' : 'pill'} onClick={() => setVue('cascade')}>
          🧭 Parcours guidé
        </button>
        <button className={vue === 'libre' ? 'pill active' : 'pill'} onClick={() => setVue('libre')}>
          🔎 Filtres & recherche
        </button>
      </div>

      {vue === 'cascade' && (
        <ParcoursCascade
          onOuvrir={(n) => {
            if (n.type === 'metier') onOpenMetier(n.id);
            else setSelected(n.id);
          }}
        />
      )}

      {vue === 'libre' && (
        <>
      {/* ------------------------- filtre 1 : type de parcours ------------------------- */}
      <div className="xo2-filtres">
        <span className="xo2-label">Type de parcours</span>
        <div className="xo2-types">
          {TYPES.map((t) => (
            <button
              key={t.id}
              className={`chip${type === t.id ? ' on' : ''}`}
              style={type === t.id ? { background: t.hex, borderColor: t.hex, color: '#fff' } : undefined}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ------------------------- filtre 2 : secteur (grille 2D) ------------------------- */}
        <span className="xo2-label">Secteur qui t'attire</span>
        <div className="xo2-secteurs">
          <button className={`xo2-sect${secteur === null ? ' on' : ''}`} onClick={() => setSecteur(null)}>
            <Icon name="grid" size={18} />
            <strong>Tous les secteurs</strong>
          </button>
          {SECTEURS.map((s) => (
            <button key={s.id} className={`xo2-sect${secteur === s.id ? ' on' : ''}`} onClick={() => setSecteur(secteur === s.id ? null : s.id)}>
              <Icon name={s.icon} size={18} />
              <strong>{s.label}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------ résultats lisibles ------------------------------ */}
      <div className="xo2-count muted small">
        <span className="xo2-count-dot" style={{ background: accent }} />
        {results.length} possibilité{results.length > 1 ? 's' : ''} ·{' '}
        <strong style={{ color: accent }}>{TYPES.find((t) => t.id === type)?.label}</strong>
        {secteur ? ` · ${SECTEURS.find((s) => s.id === secteur)?.label}` : ''} — touche une carte pour le détail.
      </div>
      <div className="xo2-grille" key={`${type}-${secteur || 'tous'}`}>
        {results.map((n, i) => (
          <button
            className={`xo2-carte${selected === n.id ? ' sel' : ''}`}
            key={n.id}
            style={{
              borderLeft: `4px solid ${accent}`,
              animationDelay: `${Math.min(i, 10) * 40}ms`,
              ...(selected === n.id ? { borderColor: accent, background: `${accent}14` } : {}),
            }}
            onClick={() => setSelected(n.id)}
          >
            <span className="xo2-carte-ico" style={{ background: `${accent}1f`, color: accent }}>
              <Icon name={n.icon || 'star'} size={18} />
            </span>
            <span className="xo2-carte-txt">
              <strong>{n.label}</strong>
              <small>{n.sub}</small>
            </span>
            {selected === n.id ? (
              <span className="xo2-ouvert" style={{ background: accent }}>
                <Icon name="check" size={12} /> Ouvert
              </span>
            ) : (
              <span className="xo2-carte-chev">
                <Icon name="right" size={16} />
              </span>
            )}
          </button>
        ))}
        {results.length === 0 && (
          <p className="muted">Rien pour cette combinaison : essaie un autre secteur ou un autre type de parcours.</p>
        )}
      </div>

      {/* ---------------------- tiroir : contenu réel + réseau bonus ---------------------- */}
      {sel && (
        <aside className="xo-panel">
          <div className="xo-panel-head">
            <span className="xo-type" style={{ color: TYPE_META[sel.type]?.color }}>
              {TYPE_META[sel.type]?.label}
            </span>
            <button className="convo-retour" onClick={() => setSelected(null)}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <h3>{sel.label}</h3>
          {sel.presentation && <p className="muted small">{sel.presentation}</p>}

          {sel.details && (
            <div className="xo-details">
              {Object.entries(sel.details).map(([k, v]) => (
                <div key={k}>
                  <strong>{k}</strong>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}

          {sel.concoursList?.length > 0 && (
            <>
              <h4>Concours & admissions</h4>
              <div className="chips3">
                {sel.concoursList.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}

          {sel.metiers?.length > 0 && (
            <>
              <h4>Débouchés & métiers</h4>
              <div className="chips3">
                {sel.metiers.map((m) => (
                  <button key={m} className="chip on" onClick={() => onOpenMetier?.(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}

          {sel.masters?.length > 0 && (
            <>
              <h4>Après : masters & poursuites</h4>
              <div className="chips3">
                {sel.masters.map((m) => {
                  const target = NODES.find((x) => x.type === 'master' && x.label === m);
                  return (
                    <button key={m} className="chip" onClick={() => target && setSelected(target.id)}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {sel.secteursPro?.length > 0 && (
            <>
              <h4>Secteurs qui recrutent</h4>
              <div className="chips3">
                {sel.secteursPro.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {sel.passerelles && (
            <>
              <h4>Et si je change d'avis ?</h4>
              <ul className="passerelles">
                {sel.passerelles.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}

          <ReseauParcours node={sel} />

          <div className="xo-panel-actions">
            <button className="btn btn-outline" onClick={sauver}>
              <Icon name="heart" size={14} /> Sauvegarder
            </button>
            {sel.compare && (
              <button className={`btn btn-outline${compar.includes(sel.id) ? ' hl-saved' : ''}`} onClick={() => toggleCompar(sel.id)}>
                <Icon name="layers" size={14} /> {compar.includes(sel.id) ? 'Dans le comparateur' : 'Comparer'}
              </button>
            )}
          </div>
        </aside>
      )}

      {compar.length > 0 && !showCompar && (
        <div className="compar-tray">
          {compar.map((id) => (
            <span className="fil-chip" key={id}>
              {nodesById.get(id).label}
              <button onClick={() => toggleCompar(id)}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <button className="btn btn-primary" disabled={compar.length < 2} onClick={() => setShowCompar(true)}>
            Côte à côte
          </button>
        </div>
      )}

      {showCompar && <Compar nodes={compar.map((id) => nodesById.get(id))} onClose={() => setShowCompar(false)} />}

      {quiz && (
        <Quiz
          filiere={filiere}
          onClose={() => setQuiz(false)}
          onExplorer={(id) => {
            const n = nodesById.get(id);
            setQuiz(false);
            ouvrirSearch(n);
          }}
        />
      )}

      {savedOpen && (
        <Modal title="Mes choix sauvegardés" onClose={() => setSavedOpen(false)}>
          {savedList.length === 0 && <p className="muted">Aucun choix sauvegardé. Ouvre une formation puis « Sauvegarder ».</p>}
          {savedList.map((s, i) => (
            <div className="xo-saved" key={i}>
              <button
                className="xo-saved-txt"
                onClick={() => {
                  setSelected(s.id);
                  setSavedOpen(false);
                }}
              >
                {s.label}
              </button>
              <button
                className="hl-del"
                onClick={() => localStorage.setItem(SAVED_KEY, JSON.stringify(savedList.filter((_, j) => j !== i)))}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </Modal>
      )}
        </>
      )}

      {carte && (
        <Modal title="🌳 Carte mentale de ton orientation" onClose={() => setCarte(false)} wide>
          <CarteMentale
            onNode={(n) => {
              setCarte(false);
              if (n.type === 'metier') onOpenMetier(n.id);
              else setSelected(n.id);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* --------------------- BONUS : le parcours vu en réseau 2D --------------------- */
const NET_HEX = {
  bac: '#6366f1', licence: '#818cf8', ecole: '#0d9488', pro: '#f59e0b', concours: '#ec4899', alternance: '#fbbf24',
  etranger: '#06b6d4', travail: '#ef4444', master: '#a78bfa', metier: '#22c55e',
};
function ReseauParcours({ node }) {
  const cols = [[{ label: 'BAC', type: 'bac' }], [{ label: node.label, type: node.type }]];
  const masters = (node.masters || []).slice(0, 3);
  const metiers = (node.metiers || []).slice(0, 4);
  if (masters.length) cols.push(masters.map((m) => ({ label: m, type: 'master' })));
  if (metiers.length) cols.push(metiers.map((m) => ({ label: m, type: 'metier' })));
  const W = 680;
  const Hh = 230;
  const cw = (W - 60) / (cols.length - 1 || 1);
  const pos = cols.map((col, ci) =>
    col.map((n, ri) => ({
      ...n,
      x: 40 + ci * cw,
      y: Hh / 2 + (ri - (col.length - 1) / 2) * Math.min(56, (Hh - 40) / Math.max(1, col.length - 1 || 1)),
    }))
  );
  return (
    <div className="xo2-reseau">
      <h4>Ton parcours en réseau</h4>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="xo2-reseau-svg" role="img" aria-label="Parcours en réseau">
        {pos.slice(0, -1).map((col, ci) =>
          col.map((a, ai) =>
            pos[ci + 1].map((b, bi) => (
              <line key={`${ci}-${ai}-${bi}`} x1={a.x + 12} y1={a.y} x2={b.x - 12} y2={b.y} className="xo2-net-edge" />
            ))
          )
        )}
        {pos.map((col, ci) =>
          col.map((n, ri) => (
            <g key={`${ci}-${ri}`}>
              <circle cx={n.x} cy={n.y} r={ci === 0 ? 14 : 10} fill={NET_HEX[n.type] || '#64748b'} opacity={0.95} />
              <text x={n.x} y={n.y + (ci === pos.length - 1 ? 26 : -18)} className="xo2-net-txt" textAnchor="middle">
                {n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}
              </text>
            </g>
          ))
        )}
      </svg>
      <p className="muted small">Une même formation mène à plusieurs suites ; plusieurs chemins mènent au même métier.</p>
    </div>
  );
}

function Compar({ nodes, onClose }) {
  const rows = ['prix', 'duree', 'admission', 'diplome', 'matieres', 'masters', 'debouches', 'metiers'];
  const labels = { prix: 'Prix / frais', duree: 'Durée', admission: "Conditions d'accès", diplome: 'Diplôme', matieres: 'Matières / programme', masters: 'Masters / passerelles', debouches: 'Débouchés', metiers: 'Métiers' };
  return (
    <Modal title="Comparer deux formations" onClose={onClose} wide>
      <div className="compar-table">
        <div className="compar-col head" style={{ gridTemplateColumns: `120px repeat(${nodes.length}, 1fr)` }}>
          <div className="compar-cell" />
          {nodes.map((n) => (
            <div className="compar-cell titre" key={n.id}>
              {n.label}
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div className="compar-col" key={r} style={{ gridTemplateColumns: `120px repeat(${nodes.length}, 1fr)` }}>
            <div className="compar-cell label">{labels[r]}</div>
            {nodes.map((n) => (
              <div className="compar-cell" key={n.id}>
                {n.compare?.[r] || '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Quiz({ filiere, onClose, onExplorer }) {
  const matieres = (FILIERES[filiere] || FILIERES.S2).matieres;
  const [profil, setProfil] = useState({ matieres: [], interets: [] });
  const [res, setRes] = useState(null);
  const bascule = (cle, v) =>
    setProfil((p) => ({ ...p, [cle]: p[cle].includes(v) ? p[cle].filter((x) => x !== v) : [...p[cle], v] }));
  return (
    <Modal title="Je ne sais pas quoi faire" onClose={onClose} wide>
      <p className="muted small">Dis-nous ce que tu aimes : on te propose des formations à ouvrir.</p>
      <label className="label">Matières préférées</label>
      <div className="chips3">
        {matieres.map((m) => (
          <button key={m.id} className={profil.matieres.includes(m.id) ? 'chip on' : 'chip'} onClick={() => bascule('matieres', m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <label className="label">Activités & centres d'intérêt</label>
      <div className="chips3">
        {INTERETS_LIST.map((m) => (
          <button key={m.id} className={profil.interets.includes(m.id) ? 'chip on' : 'chip'} onClick={() => bascule('interets', m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary"
        style={{ marginTop: 12 }}
        onClick={() => setRes(conseiller(profil))}
        disabled={profil.matieres.length + profil.interets.length === 0}
      >
        <Icon name="spark" size={15} /> Proposer des formations
      </button>
      {res && (
        <div className="parcours-liste">
          {res.map((n) => (
            <div className="parcours-carte" key={n.id}>
              <strong>{n.label}</strong>
              <p className="muted small">{n.sub}</p>
              <button className="btn btn-outline" onClick={() => onExplorer(n.id)}>
                Ouvrir la fiche
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
