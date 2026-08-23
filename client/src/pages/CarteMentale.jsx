import { useMemo, useRef, useState } from 'react';
import { NODES, EDGES } from '../orientation/graphData.js';

const COLW = 205;
const NODE_W = 178;
const NODE_H = 36;
const LEAF_H = 46;
const PALETTE = ['#c4b5fd', '#a5c4fb', '#a7e8d8', '#fcd9a8', '#fbc0d4', '#b8e0f2'];

/* Carte mentale horizontale :
   - 1 doigt / souris : déplacer la carte ;
   - pincer (2 doigts) ou molette : zoom ;
   - toucher un nœud : fiche info ;
   - toucher ⊕ / − : plier / déplier le niveau. */
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
  const [pan, setPan] = useState({ x: 24, y: 80 });
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const moved = useRef(0);

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

  function zoomAt(cx, cy, nz) {
    nz = Math.min(2.4, Math.max(0.35, nz));
    setPan((p) => ({ x: cx - ((cx - p.x) * nz) / zoom, y: cy - ((cy - p.y) * nz) / zoom }));
    setZoom(nz);
  }

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
        <button onClick={() => zoomAt(window.innerWidth / 2, 300, zoom + 0.2)} title="Zoomer">
          +
        </button>
        <button onClick={() => zoomAt(window.innerWidth / 2, 300, zoom - 0.2)} title="Dézoomer">
          −
        </button>
        <button
          onClick={() => {
            setZoom(0.95);
            setPan({ x: 24, y: 80 });
          }}
          title="Recentrer"
        >
          ⌂
        </button>
      </div>

      <svg
        className="cm-svg"
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          moved.current = 0;
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
          }
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          const prev = pointers.current.get(e.pointerId);
          const dx = e.clientX - prev.x;
          const dy = e.clientY - prev.y;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch.current.d > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, pinch.current.z * (d / pinch.current.d));
            }
            moved.current += Math.abs(dx) + Math.abs(dy);
          } else if (pointers.current.size === 1) {
            setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
            moved.current += Math.abs(dx) + Math.abs(dy);
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
        }}
        onWheel={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          zoomAt(e.clientX - rect.left, e.clientY - rect.top, zoom * (e.deltaY < 0 ? 1.15 : 0.87));
        }}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {Object.keys(pos).map((id) => {
            const pid = tree.parent[id];
            if (!pid || !pos[pid]) return null;
            const x1 = pos[pid].x + NODE_W;
            const y1 = pos[pid].y;
            const x2 = pos[id].x;
            const y2 = pos[id].y;
            const mx = (x1 + x2) / 2;
            return (
              <path key={`e${id}`} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="var(--line)" strokeWidth={1.6} />
            );
          })}
          {Object.keys(pos).map((id) => {
            const n = tree.byId[id];
            const d = tree.depth[id] ?? 0;
            const kids = (tree.enfants[id] || []).filter((k) => tree.depth[k] != null);
            const ouvert = !collapsed.has(id);
            const label = n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label;
            return (
              <g key={id} transform={`translate(${pos[id].x},${pos[id].y - NODE_H / 2})`}>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  style={{ cursor: 'pointer' }}
                  fill={PALETTE[d % PALETTE.length]}
                  stroke={d === 0 ? 'var(--brand)' : 'rgba(0,0,0,0.08)'}
                  strokeWidth={d === 0 ? 2 : 1}
                  onClick={() => {
                    if (moved.current > 6) return;
                    onNode?.(n);
                  }}
                />
                <text
                  x={10}
                  y={NODE_H / 2 + 4}
                  fontSize={11}
                  fontWeight={700}
                  fill="#1e2a44"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
                {kids.length > 0 && (
                  <g
                    transform={`translate(${NODE_W + 9},${NODE_H / 2})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (moved.current > 6) return;
                      toggle(id);
                    }}
                  >
                    <circle r={9} fill="var(--card)" stroke="var(--brand)" strokeWidth={1.6} />
                    <text x={0} y={3.5} fontSize={10} fontWeight={800} textAnchor="middle" fill="var(--brand)" style={{ pointerEvents: 'none' }}>
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
        Glisse = déplacer · pince ou molette = zoom · touche un nœud = fiche info · ⊕ / − = déplier / plier.
      </p>
    </div>
  );
}
