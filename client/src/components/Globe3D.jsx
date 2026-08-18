import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';

/* Globe 3D v2 : rotation horizontale ET verticale au doigt, zoom (+/− et
   double-tap), inertie douce. Un appui sur un pays déclenche une onde qui
   part du point, puis sa « carte d'identité » se déplie (façon passeport)
   avec 4 lectures : géographie, géopolitique, histoire & guerres, mondialisation. */

const PAYS = [
  { id: 'sn', nom: 'Sénégal', flag: '🇸🇳', lat: 14.5, lon: -14.5, cap: 'Dakar', pop: '≈ 18 M', langue: 'Français, wolof',
    fun: 'Le Monument de la Renaissance est plus haut que la statue de la Liberté !',
    geo: 'Afrique de l’Ouest, façade atlantique. Climat sahélien, fleuve Sénégal, Casamance verdoyante.',
    poli: 'Pilier de la CEDEAO et de l’Union africaine, très engagé dans les Casques bleus de l’ONU. Voix stable et écoutée entre Afrique et Occident.',
    hist: 'Tirailleurs sénégalais dans les deux guerres mondiales ; indépendance en 1960 avec Senghor, poète-président.',
    glob: 'Diaspora sur trois continents, musique et littérature mondiales (Youssou N’Dour, Mariama Bâ), francophonie vivante.' },
  { id: 'fr', nom: 'France', flag: '🇫🇷', lat: 46.6, lon: 2.5, cap: 'Paris', pop: '≈ 68 M', langue: 'Français',
    fun: 'Le pays le plus visité au monde (≈ 100 M de touristes/an).',
    geo: 'Europe de l’Ouest, entre Atlantique et Méditerranée, présente sur tous les océans via l’outre-mer.',
    poli: 'Membre permanent du Conseil de sécurité de l’ONU, UE, OTAN. Puissance diplomatique et militaire majeure.',
    hist: 'Théâtre central des deux guerres mondiales (Verdun 1916, Débarquement 1944). Ancien empire colonial.',
    glob: '2e domaine maritime mondial, langue sur 5 continents, luxe, aéronautique, cinéma.' },
  { id: 'de', nom: 'Allemagne', flag: '🇩🇪', lat: 51.1, lon: 10.4, cap: 'Berlin', pop: '≈ 84 M', langue: 'Allemand',
    fun: 'Le mur de Berlin est tombé en 1989, réunifiant le pays un an plus tard.',
    geo: 'Europe centrale, neuf voisins, du Rhin aux Alpes.',
    poli: 'Première économie d’Europe, moteur de l’UE, membre de l’OTAN.',
    hist: 'À l’origine des deux guerres mondiales ; vaincue en 1945, divisée, réunifiée en 1990.',
    glob: 'Machines, automobiles, chimie : l’exportation comme identité ; mémoire des guerres exemplaire.' },
  { id: 'gb', nom: 'Royaume-Uni', flag: '🇬🇧', lat: 54, lon: -2.5, cap: 'Londres', pop: '≈ 68 M', langue: 'Anglais',
    fun: 'Son empire fut si grand qu’on disait « le soleil ne s’y couche jamais ».',
    geo: 'Îles entre mer du Nord et Atlantique, face à l’Europe.',
    poli: 'Membre permanent du Conseil de sécurité, OTAN, Commonwealth (56 États). Brexit en 2020.',
    hist: 'Vainqueur des deux guerres mondiales malgré le Blitz ; empire décolonisé après 1945.',
    glob: 'L’anglais, langue du monde ; la City, finance globale ; Beatles, universités, foot.' },
  { id: 'ru', nom: 'Russie', flag: '🇷🇺', lat: 55.7, lon: 37.6, cap: 'Moscou', pop: '≈ 144 M', langue: 'Russe',
    fun: '11 fuseaux horaires : quand Kaliningrad dîne, Vladivostok petit-déjeune.',
    geo: 'Le plus grand pays du monde, de l’enclave de Kaliningrad au Pacifique.',
    poli: 'Membre permanent du Conseil de sécurité ; en guerre en Ukraine depuis 2014/2022 ; bras de fer avec l’OTAN.',
    hist: 'L’URSS a payé ≈ 26 millions de morts en 1945 et brisé l’armée nazie à Stalingrad. Guerre froide 1947-1991.',
    glob: 'Gaz, pétrole, blé, armes : la mondialisation des ressources ; Tolstoï et Tchaïkovski.' },
  { id: 'ua', nom: 'Ukraine', flag: '🇺🇦', lat: 49, lon: 31.4, cap: 'Kyiv', pop: '≈ 37 M', langue: 'Ukrainien',
    fun: 'Son « terre noire » ultra-fertile en fait un grenier mondial.',
    geo: 'Plaines d’Europe orientale, mer Noire au sud.',
    poli: 'En guerre contre la Russie (invasion 2022), candidate à l’Union européenne.',
    hist: 'Broyée par les deux guerres mondiales, Holodomor 1932-33, l’un des pires massacres nazis à Babyn Yar.',
    glob: 'Blé, maïs, tournesol : sa guerre fait trembler les prix alimentaires de Dakar à Jakarta.' },
  { id: 'us', nom: 'États-Unis', flag: '🇺🇸', lat: 39, lon: -98, cap: 'Washington', pop: '≈ 335 M', langue: 'Anglais',
    fun: '≈ 750 bases militaires à l’étranger : aucun autre pays n’en a autant.',
    geo: 'Un continent-puissance, du Pacifique à l’Atlantique.',
    poli: 'Première superpuissance ; dollar, OTAN, ONU (siège à New York).',
    hist: 'Entrée décisive dans les deux guerres mondiales (1917, 1941) ; seule nation à avoir utilisé l’arme nucléaire (1945).',
    glob: 'Hollywood, Silicon Valley, fast-food, réseaux sociaux : le modèle de la mondialisation.' },
  { id: 'cn', nom: 'Chine', flag: '🇨🇳', lat: 35, lon: 103, cap: 'Pékin', pop: '≈ 1,4 Md', langue: 'Mandarin',
    fun: 'Presque tout objet en plastique autour de toi a probablement quitté un port chinois.',
    geo: 'De l’Himalaya au désert de Gobi ; 1,4 milliard d’habitants.',
    poli: 'Membre permanent du Conseil de sécurité, BRICS, « routes de la soie » en Afrique et en Asie.',
    hist: 'Envahie par le Japon (1937-1945, des millions de victimes) ; révolution communiste de 1949.',
    glob: 'Premier exportateur de la planète : l’« usine du monde ».' },
  { id: 'jp', nom: 'Japon', flag: '🇯🇵', lat: 36.2, lon: 138.2, cap: 'Tokyo', pop: '≈ 124 M', langue: 'Japonais',
    fun: 'Le pays a reconstruit sa puissance après 1945 sans presque aucune armée offensive.',
    geo: 'Archipel volcanique de 6 800 îles face au Pacifique.',
    poli: 'Allié des États-Unis ; puissance pacifique par sa Constitution.',
    hist: 'Pearl Harbor 1941 ; seules bombes atomiques subies : Hiroshima et Nagasaki (1945).',
    glob: 'Mangas, jeux vidéo, voitures, sushis : une soft power planétaire.' },
  { id: 'in', nom: 'Inde', flag: '🇮🇳', lat: 21, lon: 78, cap: 'New Delhi', pop: '≈ 1,45 Md', langue: 'Hindi, anglais',
    fun: 'Pays le plus peuplé du monde depuis 2023, et la plus grande démocratie.',
    geo: 'Sous-continent entre Himalaya et océan Indien.',
    poli: 'Non-alignée, BRICS, puissance nucléaire, rivale de la Chine.',
    hist: 'Indépendance non-violente de Gandhi (1947) ; troupes indiennes dans les deux guerres mondiales.',
    glob: 'Bollywood, yoga, ingénieurs de la Silicon Valley : une mondialisation indienne.' },
  { id: 'br', nom: 'Brésil', flag: '🇧🇷', lat: -10, lon: -52, cap: 'Brasília', pop: '≈ 216 M', langue: 'Portugais',
    fun: 'L’Amazonie brésilienne produit une part essentielle de l’oxygène mondial.',
    geo: 'La moitié de l’Amérique du Sud ; l’Amazonie, poumon de la planète.',
    poli: 'Leader du BRICS et de l’Amérique latine ; voix des pays du Sud.',
    hist: 'Empire puis république ; dictature 1964-1985 ; troupes engagées en 1944 en Europe.',
    glob: 'Soja, café, carnaval, football : une planète verte et culturelle.' },
  { id: 'tr', nom: 'Turquie', flag: '🇹🇷', lat: 39, lon: 35.2, cap: 'Ankara', pop: '≈ 85 M', langue: 'Turc',
    fun: 'Istanbul est à cheval sur deux continents : Europe et Asie.',
    geo: 'Pont entre Europe et Asie ; détroits du Bosphore et des Dardanelles.',
    poli: 'OTAN mais diplomatie indépendante ; héritière de l’Empire ottoman.',
    hist: 'Empire ottoman dans la Première Guerre mondiale (Gallipoli 1915) ; République d’Atatürk en 1923.',
    glob: 'Séries TV vendues dans 150 pays, tourisme, diaspora européenne.' },
  { id: 'sa', nom: 'Arabie saoudite', flag: '🇸🇦', lat: 24, lon: 45, cap: 'Riyad', pop: '≈ 36 M', langue: 'Arabe',
    fun: 'Le prix de ton trajet en bus dépend en partie des décisions de l’OPEP à Riyad.',
    geo: 'Péninsule désertique ; lieux saints de l’islam (La Mecque, Médine).',
    poli: 'Premier exportateur de pétrole, G20, influence religieuse mondiale.',
    hist: 'Unifiée en 1932 ; le pétrole (1938) en fait un acteur clé des crises énergétiques mondiales.',
    glob: 'Pétrole, pèlerinage de millions de musulmans chaque année, fonds d’investissement géants.' },
  { id: 'eg', nom: 'Égypte', flag: '🇪🇬', lat: 26.7, lon: 30, cap: 'Le Caire', pop: '≈ 110 M', langue: 'Arabe',
    fun: '≈ 12 % du commerce mondial passe par son canal de Suez.',
    geo: 'Le Nil, le désert, et le canal de Suez entre deux mers.',
    poli: 'Poids lourd du monde arabe et africain ; gardienne du canal.',
    hist: 'Berceau des pharaons ; batailles d’El-Alamein (1942) qui renversent la Seconde Guerre mondiale en Afrique.',
    glob: 'Coton, gaz, cinéma et musique écoutés de Dakar à Dubaï.' },
  { id: 'ma', nom: 'Maroc', flag: '🇲🇦', lat: 31.8, lon: -6.5, cap: 'Rabat', pop: '≈ 37 M', langue: 'Arabe, amazigh',
    fun: 'À 14 km de l’Espagne par le détroit de Gibraltar : l’Afrique voit l’Europe.',
    geo: 'De l’Atlantique à la Méditerranée, porte de l’Afrique.',
    poli: 'Stabilité maghrébine, partenariats Europe/USA/Afrique.',
    hist: 'Protectorats français et espagnol ; indépendance en 1956 ; soldats marocains des deux guerres mondiales.',
    glob: 'Phosphates (1er réservoir mondial), automobiles, diaspora européenne.' },
];

const CALQUES = [
  { id: 'geo', nom: 'Géographie', color: '#0e7490' },
  { id: 'poli', nom: 'Géopolitique', color: '#b91c1c' },
  { id: 'hist', nom: 'Histoire & guerres', color: '#b45309' },
  { id: 'glob', nom: 'Mondialisation', color: '#1d4ed8' },
];

const ZMIN = 1.25;
const ZMAX = 2.6;

export default function Globe3D() {
  const [offX, setOffX] = useState(0.55);
  const [offY, setOffY] = useState(0.12);
  const [zoom, setZoom] = useState(ZMIN);
  const [drag, setDrag] = useState(null);
  const [sel, setSel] = useState(null);
  const [calque, setCalque] = useState('geo');
  const [ripple, setRipple] = useState(null);
  const ref = useRef(null);

  // rotation lente quand personne ne touche
  useEffect(() => {
    if (drag || sel) return undefined;
    const t = setInterval(() => setOffX((o) => (o + 0.0011) % 2), 50);
    return () => clearInterval(t);
  }, [drag, sel]);

  function down(e) {
    setDrag({ x: e.clientX, y: e.clientY, offX, offY });
  }
  function move(e) {
    if (!drag || !ref.current) return;
    const w = ref.current.clientWidth;
    const h = ref.current.clientHeight;
    const dx = ((drag.x - e.clientX) / (w * zoom)) * 2;
    const dy = (drag.y - e.clientY) / (h * zoom);
    setOffX((((drag.offX + dx) % 2) + 2) % 2);
    setOffY(Math.min(1 - 1 / zoom, Math.max(0, drag.offY + dy)));
  }
  function zoomer(d) {
    setZoom((z) => {
      const nz = Math.min(ZMAX, Math.max(ZMIN, z + d));
      setOffY((y) => Math.min(1 - 1 / nz, Math.max(0, y)));
      return nz;
    });
  }

  function toucher(p, leftPct, topPct) {
    setRipple({ x: leftPct, y: topPct, key: Date.now() });
    setTimeout(() => setSel(p), 380);
  }

  const c = CALQUES.find((x) => x.id === calque);
  const winW = 2 / zoom; // fenêtre visible en unités carte
  const winH = 1 / zoom;

  return (
    <section className="card s3card globe3-sec">
      <h2>Le monde entre tes mains</h2>
      <p className="muted small">
        Fais tourner le globe dans tous les sens, zoome avec les boutons ou un double-tap, puis touche un point
        lumineux : une onde part du pays et sa carte d'identité se déplie.
      </p>
      <div className="globe3-calques">
        {CALQUES.map((k) => (
          <button key={k.id} className={calque === k.id ? 'pill active' : 'pill'} onClick={() => setCalque(k.id)}>
            {k.nom}
          </button>
        ))}
      </div>

      <div className="globe3-wrap">
        <div
          className="globe3"
          ref={ref}
          style={{ '--tint': c.color }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
          onDoubleClick={() => zoomer(zoom > (ZMIN + ZMAX) / 2 ? -1 : 1)}
        >
          <div
            className="globe3-map"
            style={{
              backgroundSize: `${200 * zoom}% ${100 * zoom}%`,
              backgroundPosition: `${((offX * zoom) / (2 * zoom - 1)) * 100}% ${zoom > 1 ? ((offY * zoom) / (zoom - 1)) * 100 : 50}%`,
            }}
          />
          <div className="globe3-shade" />
          {ripple && (
            <span key={ripple.key} className="g3-ripple" style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, borderColor: c.color }} />
          )}
          {PAYS.map((p) => {
            const xb = ((p.lon + 180) / 360) * 2;
            const yb = (90 - p.lat) / 180;
            const t = (((xb - offX) % 2) + 2) % 2;
            if (t > winW) return null;
            const v = (yb - offY) / winH;
            if (v < -0.02 || v > 1.02) return null;
            const tt = (t / winW - 0.5) * 2;
            const vv = (v - 0.5) * 2;
            const edge = Math.sqrt(Math.max(0, 1 - tt * tt)) * Math.sqrt(Math.max(0, 1 - vv * vv * 0.85));
            if (edge < 0.08) return null;
            return (
              <button
                key={p.id}
                className="g3-mark"
                style={{
                  left: `${(t / winW) * 100}%`,
                  top: `${v * 100}%`,
                  opacity: 0.3 + edge * 0.7,
                  transform: `translate(-50%,-50%) scale(${0.65 + edge * 0.55})`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  const r = ref.current.getBoundingClientRect();
                  toucher(p, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
                }}
                title={p.nom}
              >
                <i />
              </button>
            );
          })}
        </div>
        <div className="g3-zoom">
          <button onClick={() => zoomer(0.35)} title="Zoomer">
            +
          </button>
          <button onClick={() => zoomer(-0.35)} title="Dézoomer">
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
