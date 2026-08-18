import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* Graphe d'orientation « arborescence 3D » (three.js) :
   - le parcours (chemin) forme la colonne vertébrale ;
   - les possibilités suivantes s'ouvrent en couronne autour, en 3D ;
   - on tourne autour (drag), on zoome (molette/pincement), on touche un
     nœud pour l'ouvrir (raycasting). Technique des grandes libs de graphe
   3D (ngraph.three / 3d-force-graph) mais sans dépendance supplémentaire. */

const HEX = {
  bac: '#6366f1', branche: '#4f46e5', univ: '#0ea5e9', fac: '#38bdf8', licence: '#818cf8',
  annee: '#94a3b8', master: '#a78bfa', doctorat: '#c084fc', domaine: '#14b8a6', ecole: '#0d9488',
  pro: '#f59e0b', concours: '#ec4899', alternance: '#fbbf24', etranger: '#06b6d4', travail: '#ef4444', metier: '#22c55e',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function labelSprite(text, accent) {
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  const fs = 30;
  const pad = 20;
  let t = text;
  ctx.font = `700 ${fs}px Outfit, system-ui, Arial`;
  if (ctx.measureText(t).width > 470) {
    while (t.length > 4 && ctx.measureText(t + '…').width > 470) t = t.slice(0, -1);
    t += '…';
  }
  canvas.width = Math.ceil(ctx.measureText(t).width + pad * 2);
  canvas.height = 62;
  ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.82)';
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 31);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, canvas.width - 3, canvas.height - 3, 30);
  ctx.stroke();
  ctx.font = `700 ${fs}px Outfit, system-ui, Arial`;
  ctx.fillStyle = '#f4f6ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, pad, canvas.height / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  const s = 0.0115;
  sp.scale.set(canvas.width * s, canvas.height * s, 1);
  return sp;
}

export default function Graph3D({ cheminNodes, kids, selected, onNavigate, onFail }) {
  const holderRef = useRef(null);
  const apiRef = useRef(null);
  const propsRef = useRef({ cheminNodes, kids, selected });
  propsRef.current = { cheminNodes, kids, selected };
  const cbRef = useRef({ onNavigate, onFail });
  cbRef.current = { onNavigate, onFail };

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      cbRef.current.onFail?.();
      return undefined;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(holder.clientWidth, holder.clientHeight);
    holder.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, holder.clientWidth / holder.clientHeight, 0.1, 100);
    let targetZ = holder.clientWidth < 640 ? 12 : 9.5;
    camera.position.set(0, 0.6, targetZ);

    const world = new THREE.Group();
    scene.add(world);

    scene.add(new THREE.AmbientLight(0xbfd0ff, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 6, 8);
    scene.add(sun);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const state = {
      group: null,
      spheres: [],
      born: 0,
      rx: 0.16,
      ry: -0.35,
      trx: 0.16,
      try_: -0.35,
      lastTouch: Date.now(),
    };

    function build() {
      const { cheminNodes, kids, selected } = propsRef.current;
      if (state.group) {
        state.group.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
        world.remove(state.group);
      }
      const g = new THREE.Group();
      state.spheres = [];
      const S = 2.5;
      const pos = new Map();
      cheminNodes.forEach((n, i) => pos.set(n.id, new THREE.Vector3(i * S, 0, 0)));
      const d = cheminNodes.length;
      const nb = kids.length;
      kids.forEach((k, i) => {
        const ang = (i / Math.max(1, nb)) * Math.PI * 2 + 0.5;
        const r = nb <= 1 ? 0.4 : 1.15 + 0.3 * Math.sqrt(nb);
        pos.set(k.id, new THREE.Vector3(d * S, Math.cos(ang) * r, Math.sin(ang) * r * 0.85));
      });

      const edges = [];
      for (let i = 0; i < cheminNodes.length - 1; i++) edges.push([cheminNodes[i].id, cheminNodes[i + 1].id, true]);
      for (const k of kids) edges.push([cheminNodes[cheminNodes.length - 1]?.id, k.id, false]);

      for (const [a, b, on] of edges) {
        const pa = pos.get(a);
        const pb = pos.get(b);
        if (!pa || !pb) continue;
        const mid = pa.clone().lerp(pb, 0.5);
        mid.y *= 0.55;
        mid.z *= 0.55;
        const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
        const mat = new THREE.LineBasicMaterial({
          color: on ? 0x6366f1 : 0x8ea3c8,
          transparent: true,
          opacity: on ? 0.95 : 0.4,
        });
        g.add(new THREE.Line(geo, mat));
      }

      const all = [...cheminNodes, ...kids];
      for (const n of all) {
        const p = pos.get(n.id);
        const accent = HEX[n.type] || '#64748b';
        const isSel = selected === n.id;
        const isBac = n.type === 'bac';
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(isBac ? 0.34 : isSel ? 0.24 : 0.19, 24, 24),
          new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.15, emissive: accent, emissiveIntensity: isSel ? 0.55 : 0.22 })
        );
        sphere.position.copy(p);
        sphere.userData.id = n.id;
        g.add(sphere);
        state.spheres.push(sphere);
        if (isSel || isBac) {
          const halo = new THREE.Mesh(
            new THREE.SphereGeometry((isBac ? 0.34 : 0.24) + 0.09, 24, 24),
            new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.22 })
          );
          halo.position.copy(p);
          g.add(halo);
        }
        const label = labelSprite(n.label, accent);
        label.position.copy(p).add(new THREE.Vector3(0, isBac ? 0.62 : 0.5, 0));
        g.add(label);
      }

      // centre la colonne sous la caméra
      g.position.x = (-((cheminNodes.length - 1) * S) / 2) || 0;
      state.group = g;
      state.born = performance.now();
      world.add(g);
    }

    build();
    apiRef.current = { rebuild: build };

    /* ------------------------------ interactions ------------------------------ */
    const el = renderer.domElement;
    const pointers = new Map();
    let moved = 0;
    let pinchD = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function down(e) {
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchD = Math.hypot(a.x - b.x, a.y - b.y);
      }
      state.lastTouch = Date.now();
    }
    function moveEvt(e) {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) {
        state.try_ += dx * 0.005;
        state.trx = Math.max(-1.1, Math.min(1.1, state.trx + dy * 0.0035));
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dNow = Math.hypot(a.x - b.x, a.y - b.y);
        targetZ = Math.max(5, Math.min(16, targetZ - (dNow - pinchD) * 0.02));
        pinchD = dNow;
      }
      state.lastTouch = Date.now();
    }
    function upEvt(e) {
      pointers.delete(e.pointerId);
      if (moved < 7 && e.type === 'pointerup') {
        const rect = el.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(state.spheres, false);
        if (hits.length) cbRef.current.onNavigate?.(hits[0].object.userData.id);
      }
      state.lastTouch = Date.now();
    }
    function wheel(e) {
      e.preventDefault();
      targetZ = Math.max(5, Math.min(16, targetZ + e.deltaY * 0.01));
      state.lastTouch = Date.now();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', moveEvt);
    el.addEventListener('pointerup', upEvt);
    el.addEventListener('pointercancel', upEvt);
    el.addEventListener('wheel', wheel, { passive: false });

    const ro = new ResizeObserver(() => {
      const w = holder.clientWidth;
      const h = holder.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(holder);

    let raf = 0;
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!reduced && Date.now() - state.lastTouch > 3000) state.try_ += 0.0016;
      state.ry += (state.try_ - state.ry) * 0.12;
      state.rx += (state.trx - state.rx) * 0.12;
      world.rotation.set(state.rx, state.ry, 0);
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      camera.lookAt(0, 0, 0);
      // entrée progressive des nœuds (transform/échelle côté GPU)
      const t = performance.now() - state.born;
      if (state.group && t < 900) {
        const k = Math.min(1, t / 700);
        const ease = 1 - Math.pow(1 - k, 3);
        state.group.scale.setScalar(0.85 + 0.15 * ease);
        state.group.traverse((o) => {
          if (o.material && o.material.transparent && o.userData?.baseOp == null && o.type === 'Line') {
            /* opacité gérée par matériel */
          }
        });
      } else if (state.group) {
        state.group.scale.setScalar(1);
      }
      renderer.render(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', moveEvt);
      el.removeEventListener('pointerup', upEvt);
      el.removeEventListener('pointercancel', upEvt);
      el.removeEventListener('wheel', wheel);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      holder.removeChild(el);
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reconstruit quand le graphe visible change
  useEffect(() => {
    apiRef.current?.rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheminNodes.map((n) => n.id).join(','), kids.map((k) => k.id).join(','), selected]);

  return <div ref={holderRef} className="g3d-holder" />;
}
