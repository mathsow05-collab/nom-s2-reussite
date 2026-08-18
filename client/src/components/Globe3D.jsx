import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Icon from '../Icon.jsx';

/* Vraie Terre 3D (three.js) : texture Blue Marble, reliefs, reflets des
   océans, nuages animés indépendants, atmosphère bleutée, lumière solaire
   avec terminator jour/nuit. Rotation au doigt, zoom, rotation auto qui
   s'arrête quand on touche et reprend après 3 s. Marqueurs = capitales. */

const PAYS = [
  { id: 'sn', nom: 'Sénégal', flag: '🇸', lat: 14.7, lon: -17.45, cap: 'Dakar', pop: '≈ 18 M', langue: 'Français, wolof',
    fun: 'Le Monument de la Renaissance est plus haut que la statue de la Liberté !',
    geo: 'Afrique de l’Ouest, façade atlantique. Climat sahélien, fleuve Sénégal, Casamance verdoyante.',
    poli: 'Pilier de la CEDEAO et de l’Union africaine, très engagé dans les Casques bleus de l’ONU. Voix stable et écoutée.',
    hist: 'Tirailleurs sénégalais dans les deux guerres mondiales ; indépendance en 1960 avec Senghor, poète-président.',
    glob: 'Diaspora sur trois continents, musique et littérature mondiales, francophonie vivante.' },
  { id: 'fr', nom: 'France', flag: '🇫', lat: 48.86, lon: 2.35, cap: 'Paris', pop: '≈ 68 M', langue: 'Français',
    fun: 'Le pays le plus visité au monde (≈ 100 M de touristes/an).',
    geo: 'Europe de l’Ouest, entre Atlantique et Méditerranée, présente sur tous les océans via l’outre-mer.',
    poli: 'Membre permanent du Conseil de sécurité de l’ONU, UE, OTAN. Puissance diplomatique majeure.',
    hist: 'Théâtre central des deux guerres mondiales (Verdun 1916, Débarquement 1944).',
    glob: '2e domaine maritime mondial, langue sur 5 continents, luxe, aéronautique, cinéma.' },
  { id: 'de', nom: 'Allemagne', flag: '🇩🇪', lat: 52.52, lon: 13.4, cap: 'Berlin', pop: '≈ 84 M', langue: 'Allemand',
    fun: 'Le mur de Berlin est tombé en 1989, réunifiant le pays un an plus tard.',
    geo: 'Europe centrale, neuf voisins, du Rhin aux Alpes.',
    poli: 'Première économie d’Europe, moteur de l’UE, membre de l’OTAN.',
    hist: 'À l’origine des deux guerres mondiales ; vaincue en 1945, divisée, réunifiée en 1990.',
    glob: 'Machines, automobiles, chimie : l’exportation comme identité.' },
  { id: 'gb', nom: 'Royaume-Uni', flag: '🇬🇧', lat: 51.5, lon: -0.13, cap: 'Londres', pop: '≈ 68 M', langue: 'Anglais',
    fun: 'Son empire fut si grand qu’on disait « le soleil ne s’y couche jamais ».',
    geo: 'Îles entre mer du Nord et Atlantique, face à l’Europe.',
    poli: 'Membre permanent du Conseil de sécurité, OTAN, Commonwealth (56 États). Brexit en 2020.',
    hist: 'Vainqueur des deux guerres mondiales malgré le Blitz ; empire décolonisé après 1945.',
    glob: 'L’anglais, langue du monde ; la City, finance globale ; Beatles, foot.' },
  { id: 'ru', nom: 'Russie', flag: '🇷🇺', lat: 55.76, lon: 37.62, cap: 'Moscou', pop: '≈ 144 M', langue: 'Russe',
    fun: '11 fuseaux horaires : quand Kaliningrad dîne, Vladivostok petit-déjeune.',
    geo: 'Le plus grand pays du monde, de Kaliningrad au Pacifique.',
    poli: 'Membre permanent du Conseil de sécurité ; en guerre en Ukraine depuis 2014/2022.',
    hist: 'L’URSS a payé ≈ 26 millions de morts en 1945 ; Stalingrad renverse la guerre. Guerre froide.',
    glob: 'Gaz, pétrole, blé, armes : la mondialisation des ressources.' },
  { id: 'ua', nom: 'Ukraine', flag: '🇺🇦', lat: 50.45, lon: 30.52, cap: 'Kyiv', pop: '≈ 37 M', langue: 'Ukrainien',
    fun: 'Sa « terre noire » ultra-fertile en fait un grenier mondial.',
    geo: 'Plaines d’Europe orientale, mer Noire au sud.',
    poli: 'En guerre contre la Russie (invasion 2022), candidate à l’Union européenne.',
    hist: 'Broyée par les deux guerres mondiales ; Holodomor 1932-33 ; Babyn Yar.',
    glob: 'Blé, maïs, tournesol : sa guerre fait trembler les prix alimentaires mondiaux.' },
  { id: 'us', nom: 'États-Unis', flag: '🇺🇸', lat: 38.9, lon: -77.04, cap: 'Washington', pop: '≈ 335 M', langue: 'Anglais',
    fun: '≈ 750 bases militaires à l’étranger : aucun autre pays n’en a autant.',
    geo: 'Un continent-puissance, du Pacifique à l’Atlantique.',
    poli: 'Première superpuissance ; dollar, OTAN, siège de l’ONU à New York.',
    hist: 'Entrée décisive dans les deux guerres mondiales (1917, 1941) ; seule nation frappée par l’arme nucléaire subie… et utilisatrice (1945).',
    glob: 'Hollywood, Silicon Valley, réseaux sociaux : le modèle de la mondialisation.' },
  { id: 'cn', nom: 'Chine', flag: '🇨🇳', lat: 39.9, lon: 116.4, cap: 'Pékin', pop: '≈ 1,4 Md', langue: 'Mandarin',
    fun: 'Presque tout objet en plastique autour de toi a quitté un port chinois.',
    geo: 'De l’Himalaya au désert de Gobi ; 1,4 milliard d’habitants.',
    poli: 'Membre permanent du Conseil de sécurité, BRICS, « routes de la soie ».',
    hist: 'Envahie par le Japon (1937-1945) ; révolution communiste de 1949.',
    glob: 'Premier exportateur de la planète : l’« usine du monde ».' },
  { id: 'jp', nom: 'Japon', flag: '🇯🇵', lat: 35.68, lon: 139.7, cap: 'Tokyo', pop: '≈ 124 M', langue: 'Japonais',
    fun: 'Puissance reconstruite après 1945 sans presque aucune armée offensive.',
    geo: 'Archipel volcanique de 6 800 îles face au Pacifique.',
    poli: 'Allié des États-Unis ; puissance pacifique par sa Constitution.',
    hist: 'Pearl Harbor 1941 ; Hiroshima et Nagasaki (1945).',
    glob: 'Mangas, jeux vidéo, voitures, sushis : une soft power planétaire.' },
  { id: 'in', nom: 'Inde', flag: '🇮🇳', lat: 28.6, lon: 77.2, cap: 'New Delhi', pop: '≈ 1,45 Md', langue: 'Hindi, anglais',
    fun: 'Pays le plus peuplé du monde depuis 2023, plus grande démocratie.',
    geo: 'Sous-continent entre Himalaya et océan Indien.',
    poli: 'Non-alignée, BRICS, puissance nucléaire, rivale de la Chine.',
    hist: 'Indépendance non-violente de Gandhi (1947) ; troupes indiennes des deux guerres.',
    glob: 'Bollywood, yoga, ingénieurs de la Silicon Valley.' },
  { id: 'br', nom: 'Brésil', flag: '🇧🇷', lat: -15.8, lon: -47.9, cap: 'Brasília', pop: '≈ 216 M', langue: 'Portugais',
    fun: 'L’Amazonie brésilienne, poumon de la planète.',
    geo: 'La moitié de l’Amérique du Sud.',
    poli: 'Leader du BRICS et de l’Amérique latine ; voix des pays du Sud.',
    hist: 'Empire puis république ; dictature 1964-1985 ; troupes en Europe en 1944.',
    glob: 'Soja, café, carnaval, football.' },
  { id: 'tr', nom: 'Turquie', flag: '🇹🇷', lat: 39.9, lon: 32.85, cap: 'Ankara', pop: '≈ 85 M', langue: 'Turc',
    fun: 'Istanbul est à cheval sur deux continents.',
    geo: 'Pont Europe-Asie ; Bosphore et Dardanelles.',
    poli: 'OTAN mais diplomatie indépendante ; héritière de l’Empire ottoman.',
    hist: 'Gallipoli 1915 ; République d’Atatürk en 1923.',
    glob: 'Séries TV vendues dans 150 pays, tourisme, diaspora.' },
  { id: 'sa', nom: 'Arabie saoudite', flag: '🇸🇦', lat: 24.7, lon: 46.7, cap: 'Riyad', pop: '≈ 36 M', langue: 'Arabe',
    fun: 'Le prix de l’essence mondiale se décide en partie ici.',
    geo: 'Péninsule désertique ; La Mecque et Médine.',
    poli: 'Premier exportateur de pétrole, G20, influence religieuse mondiale.',
    hist: 'Unifiée en 1932 ; pétrole en 1938, acteur clé des crises énergétiques.',
    glob: 'Pétrole, pèlerinage, fonds d’investissement géants.' },
  { id: 'eg', nom: 'Égypte', flag: '🇪🇬', lat: 30.0, lon: 31.2, cap: 'Le Caire', pop: '≈ 110 M', langue: 'Arabe',
    fun: '≈ 12 % du commerce mondial passe par son canal de Suez.',
    geo: 'Le Nil, le désert, le canal de Suez.',
    poli: 'Poids lourd du monde arabe et africain ; gardienne du canal.',
    hist: 'Berceau des pharaons ; El-Alamein (1942) renverse la guerre en Afrique.',
    glob: 'Coton, gaz, cinéma et musique de Dakar à Dubaï.' },
  { id: 'ma', nom: 'Maroc', flag: '🇲🇦', lat: 34.0, lon: -6.8, cap: 'Rabat', pop: '≈ 37 M', langue: 'Arabe, amazigh',
    fun: 'À 14 km de l’Espagne par le détroit de Gibraltar.',
    geo: 'De l’Atlantique à la Méditerranée, porte de l’Afrique.',
    poli: 'Stabilité maghrébine, partenariats Europe/USA/Afrique.',
    hist: 'Indépendance en 1956 ; soldats marocains des deux guerres mondiales.',
    glob: 'Phosphates (1er réservoir mondial), automobiles, diaspora.' },
];

const CALQUES = [
  { id: 'geo', nom: 'Géographie', color: '#22d3ee' },
  { id: 'poli', nom: 'Géopolitique', color: '#f87171' },
  { id: 'hist', nom: 'Histoire & guerres', color: '#fbbf24' },
  { id: 'glob', nom: 'Mondialisation', color: '#60a5fa' },
];

function latLon(lat, lon, r) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

export default function Globe3D() {
  const wrapRef = useRef(null);
  const api3 = useRef({});
  const markersRef = useRef([]);
  const [sel, setSel] = useState(null);
  const [calque, setCalque] = useState('geo');
  const [ripple, setRipple] = useState(null);
  const [ready, setReady] = useState(false);

  const c = CALQUES.find((x) => x.id === calque);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    renderer.setSize(W, H);
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.z = 2.6;

    const globe = new THREE.Group();
    scene.add(globe);

    const loader = new THREE.TextureLoader();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        map: loader.load('/textures/earth.jpg', () => setReady(true)),
        bumpMap: loader.load('/textures/topo.png'),
        bumpScale: 0.6,
        specularMap: loader.load('/textures/water.png'),
        specular: new THREE.Color(0x3a5f8a),
        shininess: 16,
      })
    );
    globe.add(earth);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.014, 64, 64),
      new THREE.MeshLambertMaterial({ map: loader.load('/textures/clouds.png'), transparent: true, opacity: 0.42, depthWrite: false })
    );
    globe.add(clouds);

    // atmosphère (halo bleuté)
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vN; void main(){ float i = pow(max(0.0, 0.72 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0); gl_FragColor = vec4(0.25, 0.55, 1.0, 1.0) * i; }',
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      })
    );
    scene.add(atm);

    // lumière solaire + ambiante bleutée
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(5, 1.5, 2.5);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x2a3c5f, 1.1));

    // marqueurs capitales
    const markers = [];
    for (const p of PAYS) {
      const g = new THREE.Group();
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 12, 12),
        new THREE.MeshBasicMaterial({ color: c.color })
      );
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.022, 0.03, 24),
        new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      halo.lookAt(new THREE.Vector3(0, 0, 0));
      const pos = latLon(p.lat, p.lon, 1.005);
      pin.position.copy(pos);
      halo.position.copy(pos);
      halo.lookAt(pos.clone().multiplyScalar(2));
      // étiquette
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(8,15,35,0.85)';
      const w = Math.min(250, ctx.measureText(p.nom).width + 26);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect((256 - w) / 2, 6, w, 46, 23);
      else ctx.rect((256 - w) / 2, 6, w, 46);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.nom, 128, 30);
      const tex = new THREE.CanvasTexture(cv);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      spr.scale.set(0.34, 0.085, 1);
      spr.position.copy(latLon(p.lat, p.lon, 1.16));
      spr.visible = false;
      g.add(pin, halo, spr);
      g.userData = { pays: p, pin, spr };
      globe.add(g);
      markers.push(g);
    }
    markersRef.current = markers;

    // interactions
    let dragging = null;
    let moved = 0;
    let lastAct = 0;
    let targetZ = 2.6;
    const state = { rx: 0.25, ry: -0.4 };

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    function down(e) {
      dragging = { x: e.clientX, y: e.clientY };
      moved = 0;
      lastAct = Date.now();
    }
    function moveP(e) {
      if (!dragging) return;
      const dx = e.clientX - dragging.x;
      const dy = e.clientY - dragging.y;
      moved += Math.abs(dx) + Math.abs(dy);
      dragging = { x: e.clientX, y: e.clientY };
      state.ry += dx * 0.005;
      state.rx = Math.max(-1.1, Math.min(1.1, state.rx + dy * 0.004));
      lastAct = Date.now();
    }
    function up(e) {
      if (dragging && moved < 7) {
        // tap : raycast marqueurs
        const r = el.getBoundingClientRect();
        const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(v, camera);
        const hits = ray.intersectObjects(markers.map((m) => m.userData.pin), false);
        if (hits.length) {
          const p = hits[0].object.parent.userData.pays;
          const wp = hits[0].object.getWorldPosition(new THREE.Vector3()).project(camera);
          setRipple({ x: ((wp.x + 1) / 2) * 100, y: ((1 - wp.y) / 2) * 100, key: Date.now() });
          setTimeout(() => setSel(p), 350);
        }
      }
      dragging = null;
      lastAct = Date.now();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', moveP);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', () => (dragging = null));

    api3.current.zoom = (d) => {
      targetZ = Math.max(1.5, Math.min(3.4, targetZ - d));
      lastAct = Date.now();
    };

    const ro = new ResizeObserver(() => {
      const w2 = wrap.clientWidth;
      const h2 = wrap.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    });
    ro.observe(wrap);

    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!dragging && !selRef.current && Date.now() - lastAct > 3000) state.ry += 0.0016;
      clouds.rotation.y += 0.00045;
      globe.rotation.y += (state.ry - globe.rotation.y) * 0.12;
      globe.rotation.x += (state.rx - globe.rotation.x) * 0.12;
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      const showLbl = camera.position.z < 2.15;
      for (const m of markers) m.userData.spr.visible = showLbl;
      renderer.render(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', moveP);
      el.removeEventListener('pointerup', up);
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, []);

  // recolorer les marqueurs selon le calque
  const selRef = useRef(null);
  selRef.current = sel;
  useEffect(() => {
    const col = new THREE.Color(c.color);
    for (const m of markersRef.current) {
      m.userData.pin.material.color = col;
      m.children[1].material.color = col;
    }
  }, [calque]);

  return (
    <section className="card s3card globe3-sec">
      <h2>La Terre entre tes mains</h2>
      <p className="muted small">
        Fais tourner la planète dans tous les sens, zoome, puis touche un point lumineux : une onde part de la capitale
        et la carte d'identité du pays se déplie. Nuages, atmosphère et lumière du soleil incluses.
      </p>
      <div className="globe3-calques">
        {CALQUES.map((k) => (
          <button key={k.id} className={calque === k.id ? 'pill active' : 'pill'} onClick={() => setCalque(k.id)}>
            {k.nom}
          </button>
        ))}
      </div>

      <div className="globe3-wrap">
        <div className="globe3-canvas" ref={wrapRef} />
        {!ready && <div className="globe3-loading">Chargement de la Terre…</div>}
        {ripple && <span key={ripple.key} className="g3-ripple" style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, borderColor: c.color }} />}
        <div className="g3-zoom">
          <button onClick={() => api3.current.zoom?.(0.6)} title="Zoomer">
            +
          </button>
          <button onClick={() => api3.current.zoom?.(-0.6)} title="Dézoomer">
            −
          </button>
        </div>
      </div>

      {sel && (
        <div className="sheet3" onClick={() => setSel(null)}>
          <div className="sheet3-card g3-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet3-handle" />
            <header className="g3-pass">
              <span className="g3-flag">{sel.flag}</span>
              <div className="g3-pass-id">
                <strong>{sel.nom}</strong>
                <small>
                  {sel.cap} · {sel.pop} · {sel.langue}
                </small>
              </div>
              <button className="icon3" onClick={() => setSel(null)} title="Fermer">
                ✕
              </button>
            </header>
            <div className="globe3-calques">
              {CALQUES.map((k) => (
                <button key={k.id} className={calque === k.id ? 'pill active' : 'pill'} onClick={() => setCalque(k.id)}>
                  {k.nom}
                </button>
              ))}
            </div>
            <p className="g3-txt" style={{ borderLeftColor: c.color }}>
              {sel[calque]}
            </p>
            <div className="g3-fun">
              <Icon name="spark" size={15} /> {sel.fun}
            </div>
            <div className="g3-nav">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const i = CALQUES.findIndex((k) => k.id === calque);
                  setCalque(CALQUES[(i + 1) % CALQUES.length].id);
                }}
              >
                Lecture suivante <Icon name="right" size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
