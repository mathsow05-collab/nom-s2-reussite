import { useEffect, useMemo, useRef, useState } from 'react';
import { FILIERES } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal } from '../ui.jsx';
import { SLOGAN } from '../orientation/data.js';
import { nodesById, childrenOf, parentsOf, pathTo, searchNodes, conseiller, TYPE_META, INTERETS_LIST } from '../orientation/engine.js';
import Graph3D from '../components/Graph3D.jsx';

/* Couche INTERFACE de l'explorateur d'orientation.
   Desktop : graphe horizontal (nœuds + connexions SVG, zoom/pan, panneau latéral).
   Mobile  : parcours vertical interactif + bottom sheet.
   Permanent : breadcrumb, recherche, comparaison, parcours sauvegardés. */

const NODE_W = 196;
const NODE_H = 62;
const COLW = 246;
const ROW = 92;
const PAD = 30;

const SAVED_KEY = 'kd_orient_parcours';

export default function ExplorateurOrientation({ filiere, onOpenMetier }) {
  const [chemin, setChemin] = useState(['bac']);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [compar, setCompar] = useState([]);
  const [showCompar, setShowCompar] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [webgl, setWebgl] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia?.('(max-width: 860px)')?.matches || false);
  const [force3d, setForce3d] = useState(null); // null = auto : 3D sur grand écran, liste sur mobile
  const dragRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 860px)');
    if (!mq) return undefined;
    const h = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', h);
    else if (mq.addListener) mq.addListener(h);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', h);
      else if (mq.removeListener) mq.removeListener(h);
    };
  }, []);

  const show3D = webgl && (force3d == null ? true : force3d);

  const results = useMemo(() => searchNodes(q), [q]);
  const sel = selected ? nodesById.get(selected) : null;
  const last = chemin[chemin.length - 1];
  const kids = useMemo(() => childrenOf(last), [last]);

  /* ----------------------------- layout du graphe ----------------------------- */
  const cols = useMemo(() => {
    const c = chemin.map((id) => [nodesById.get(id)]);
    c.push(kids);
    return c;
  }, [chemin, kids]);
  const maxRows = Math.max(...cols.map((c) => c.length), 1);
  const H = maxRows * ROW + PAD * 2;
  const W = cols.length * COLW + NODE_W + PAD;
  const posOf = (ci, ri, len) => ({
    x: PAD + ci * COLW,
    y: PAD + ri * ROW + ((maxRows - len) * ROW) / 2,
  });
  const positions = new Map();
  cols.forEach((col, ci) => col.forEach((n, ri) => positions.set(n.id, posOf(ci, ri, col.length))));

  const edges = [];
  for (let i = 0; i < chemin.length - 1; i++) edges.push({ a: chemin[i], b: chemin[i + 1], on: true });
  for (const k of kids) edges.push({ a: last, b: k.id, on: false });

  /* --------------------------------- actions --------------------------------- */
  function aller(id) {
    if (chemin.includes(id)) {
      setChemin(chemin.slice(0, chemin.indexOf(id) + 1));
      setSelected(id);
      return;
    }
    setChemin((c) => [...c, id]);
    setSelected(id);
  }
  function sauter(id) {
    setChemin(pathTo(id));
    setSelected(id);
    setSearchOpen(false);
    setQ('');
  }
  function sauver() {
    const label = chemin.map((id) => nodesById.get(id).label).join(' → ');
    const list = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    if (!list.some((s) => s.label === label)) {
      list.push({ label, ids: chemin, sel: selected });
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    }
    setSavedOpen(true);
  }
  const savedList = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');

  function toggleCompar(id) {
    setCompar((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? c : [...c, id]));
  }

  /* drag pan desktop */
  function down(e) {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }
  function move(e) {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.px + (e.clientX - dragRef.current.x), y: dragRef.current.py + (e.clientY - dragRef.current.y) });
  }
  function up() {
    dragRef.current = null;
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
              placeholder="Cherche une formation, un métier, une école…"
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && results.length > 0 && (
              <div className="xo-results">
                {results.map((r) => (
                  <button key={r.id} onMouseDown={() => sauter(r.id)}>
                    <span className="xo-type" style={{ color: TYPE_META[r.type]?.color }}>
                      {TYPE_META[r.type]?.label}
                    </span>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-outline" onClick={() => setForce3d(!show3D)}>
            <Icon name={show3D ? 'grid' : 'globe'} size={15} /> {show3D ? 'Vue liste' : 'Vue 3D'}
          </button>
          <button className="btn btn-outline" onClick={() => setQuiz(true)}>
            <Icon name="bulb" size={15} /> Je ne sais pas quoi faire
          </button>
          <button className="btn btn-outline" onClick={() => setSavedOpen(true)}>
            <Icon name="heart" size={15} /> Mes parcours{savedList.length > 0 ? ` (${savedList.length})` : ''}
          </button>
          <button className="btn btn-outline" disabled={compar.length < 2} onClick={() => setShowCompar(true)}>
            <Icon name="layers" size={15} /> Comparer ({compar.length})
          </button>
        </div>
      </header>

      <nav className="xo-fil" aria-label="Fil du parcours">
        {chemin.map((id, i) => (
          <button key={id} className={`xo-chip${i === chemin.length - 1 ? ' on' : ''}`} onClick={() => { setChemin(chemin.slice(0, i + 1)); }}>
            {nodesById.get(id).label}
          </button>
        ))}
      </nav>

      {/* --------------------------- graphe 3D arborescent --------------------------- */}
      {show3D && (
        <div className="xo-canvas3d">
          <Graph3D
            cheminNodes={chemin.map((id) => nodesById.get(id))}
            kids={kids}
            selected={selected}
            onNavigate={aller}
            onFail={() => setWebgl(false)}
          />
          <div className="xo-hint">
            <Icon name="globe" size={12} /> Glisse pour tourner · pince / molette pour zoomer · touche une bulle pour l'ouvrir
          </div>
        </div>
      )}

      {/* ---------------------------- parcours vertical (repli) ---------------------------- */}
      {!show3D && (
      <div className="xo-vert force">
        {chemin.map((id, i) => {
          const n = nodesById.get(id);
          return (
            <div className="xo-vstep" key={id}>
              <button className={`xo-node vert${selected === id ? ' sel' : ''}`} onClick={() => { setChemin(chemin.slice(0, i + 1)); setSelected(id); }}>
                <span className="xo-node-ico" style={{ color: TYPE_META[n.type]?.color }}>
                  <Icon name={n.icon || 'star'} size={14} />
                </span>
                <span className="xo-node-txt">
                  <strong>{n.label}</strong>
                  <small>{n.sub}</small>
                </span>
              </button>
              {i < chemin.length - 1 && <span className="xo-vlien" />}
            </div>
          );
        })}
        <div className="xo-vkids">
          {kids.length > 0 && <p className="muted small">Continue le chemin :</p>}
          {kids.map((k, i) => (
            <button key={k.id} className="xo-node vert kid" style={{ animationDelay: `${i * 60}ms` }} onClick={() => aller(k.id)}>
              <span className="xo-node-ico" style={{ color: TYPE_META[k.type]?.color }}>
                <Icon name={k.icon || 'star'} size={14} />
              </span>
              <span className="xo-node-txt">
                <strong>{k.label}</strong>
                <small>{k.sub}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* --------------------------- panneau / bottom sheet --------------------------- */}
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
          {sel.type === 'metier' && (
            <button className="btn btn-primary" onClick={() => onOpenMetier?.(sel.label)}>
              <Icon name="briefcase" size={15} /> Voir la fiche métier complète
            </button>
          )}
          {parentsOf(sel.id).length > 1 && (
            <>
              <h4>Accessible après</h4>
              <div className="chips3">
                {parentsOf(sel.id).slice(0, 6).map((p) => (
                  <button key={p.id} className="chip" onClick={() => sauter(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="xo-panel-actions">
            <button className="btn btn-outline" onClick={sauver}>
              <Icon name="heart" size={14} /> Sauvegarder ce parcours
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
            setQuiz(false);
            sauter(id);
          }}
        />
      )}

      {savedOpen && (
        <Modal title="Mes parcours sauvegardés" onClose={() => setSavedOpen(false)}>
          {savedList.length === 0 && <p className="muted">Aucun parcours sauvegardé. Explore puis touche « Sauvegarder ce parcours ».</p>}
          {savedList.map((s, i) => (
            <div className="xo-saved" key={i}>
              <button
                className="xo-saved-txt"
                onClick={() => {
                  setChemin(s.ids);
                  setSelected(s.sel || s.ids[s.ids.length - 1]);
                  setSavedOpen(false);
                }}
              >
                {s.label}
              </button>
              <button
                className="hl-del"
                onClick={() => {
                  localStorage.setItem(SAVED_KEY, JSON.stringify(savedList.filter((_, j) => j !== i)));
                  setSavedOpen(true);
                }}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </Modal>
      )}
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
      <p className="muted small">Dis-nous ce que tu aimes : on te propose des directions à explorer dans la carte.</p>
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
        <Icon name="spark" size={15} /> Proposer des directions
      </button>
      {res && (
        <div className="parcours-liste">
          {res.map((n) => (
            <div className="parcours-carte" key={n.id}>
              <strong>{n.label}</strong>
              <p className="muted small">{n.sub}</p>
              <button className="btn btn-outline" onClick={() => onExplorer(n.id)}>
                Explorer cette voie
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
