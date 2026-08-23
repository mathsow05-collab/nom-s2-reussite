import { useMemo, useRef, useState } from 'react';
import { NODES, EDGES } from '../orientation/graphData.js';

const COLW = 205;
const NODE_W = 178;
const NODE_H = 36;
const LEAF_H = 46;
const PALETTE = ['#c4b5fd', '#a5c4fb', '#a7e8d8', '#fcd9a8', '#fbc0d4', '#b8e0f2'];

/* Arbre mental horizontal façon mind-map : racine à gauche, niveaux à droite. */
export default function CarteMentale({ onNode }) {
  const tree = useMemo(() => {
    const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
    const enfants = {};
    const parent = {};
    for (const e of EDGES) {
      if (!byId[e.from] || !byId[e.to] || parent[e.to]) continue;
      parent[e.to] = e.from;
      (enfants[e.from] ||= []).push(e.to);
    }
    const depth = { bac: 0 };
    const file = ['bac'];
    while (file.length) {
      const id = file.shift();
      for (const k of enfants[id] || [])
        if (depth[k] == null) {
          depth[k] = depth[id] + 1;
          file.push(k);
        }
    }
    return { byId, enfants, parent, depth };
  }, []);

  const [collapsed, setCollapsed] = useState(() => {
    const s = new Set();
    for (const n of NODES) if ((tree.depth[n.id] ?? 0) >= 2) s.add(n.id);
    return s;
  });
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 24, y: 60 });
  const drag = useRef(null);

  /* disposition « tidy tree » : feuilles empilées, parents centrés */
  const pos = useMemo(() => {
    const p = {};
    let y = 0;
    const place = (id) => {
      const kids = (tree.enfants[id] || []).filter((k) => tree.depth[k] != null);
      if (collapsed.has(id) || !kids.length) {
        y += LEAF_H;
        p[id] = { x: (tree.depth[id] || 0) * COLW, y };
        return;
      }
      kids.forEach(place);
      const ys = kids.map((k) => p[k].y);
      p[id] = { x: (tree.depth[id] || 0) * COLW, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    };
    place('bac');
    return p;
  }, [collapsed, tree]);

  function toggle(id) {
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="cm-wrap">
      <div className="cm-ctrl">
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))} title="Zoomer">
          +
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} title="Dézoomer">
          −
        </button>
        <button
          onClick={() => {
            setZoom(0.95);
            setPan({ x: 24, y: 60 });
          }}
          title="Recentrer"
        >
          ⌂
        </button>
      </div>

      <svg
        className="cm-svg"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* liens */}
          {Object.keys(pos).map((id) => {
            const pid = tree.parent[id];
            if (!pid || !pos[pid]) return null;
            const x1 = pos[pid].x + NODE_W;
            const y1 = pos[pid].y;
            const x2 = pos[id].x;
            const y2 = pos[id].y;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`e${id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="var(--line)"
                strokeWidth={1.6}
              />
            );
          })}
          {/* nœuds */}
          {Object.keys(pos).map((id) => {
            const n = tree.byId[id];
            const d = tree.depth[id] ?? 0;
            const kids = (tree.enfants[id] || []).filter((k) => tree.depth[k] != null);
            const ouvert = !collapsed.has(id);
            const label = n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label;
            return (
              <g
                key={id}
                transform={`translate(${pos[id].x},${pos[id].y - NODE_H / 2})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (kids.length) toggle(id);
                  onNode?.(n);
                }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={PALETTE[d % PALETTE.length]}
                  stroke={d === 0 ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}
                  strokeWidth={d === 0 ? 2 : 1}
                />
                <text x={10} y={NODE_H / 2 + 4} fontSize={11} fontWeight={700} fill="#1e2a44">
                  {label}
                </text>
                {kids.length > 0 && (
                  <g transform={`translate(${NODE_W + 9},${NODE_H / 2})`}>
                    <circle r={8} fill="var(--card)" stroke="var(--brand)" strokeWidth={1.4} />
                    <text x={0} y={3.5} fontSize={9} fontWeight={800} textAnchor="middle" fill="var(--brand)">
                      {ouvert ? '−' : '+'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <p className="muted small cm-hint">
        Glisse pour déplacer · + / − pour zoomer · appuie sur ⊕ pour déplier un niveau · appuie sur une feuille pour
        voir le détail.
      </p>
    </div>
  );
}
