import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';

/* Globe 3D interactif : la carte défile lentement (rotation), on la fait
   tourner au doigt, et chaque pays marqué s'ouvre en 4 lectures :
   Géographie · Géopolitique · Histoire & guerres mondiales · Mondialisation. */

const PAYS = [
  { id: 'sn', nom: 'Sénégal', flag: '🇸🇳', lat: 14.5, lon: -14.5,
    geo: 'Afrique de l’Ouest, façade atlantique. Climat sahélien, fleuve Sénégal et Casamance verdoyante.',
    poli: 'Pilier de la CEDEAO et de l’Union africaine, très actif à l’ONU (Casques bleus). Stable et respecté, le Sénégal est une voix qui compte entre l’Afrique et l’Occident.',
    hist: 'Comptoirs puis colonie française, indépendant en 1960 avec Léopold Sédar Senghor. Les tirailleurs sénégalais ont combattu dans les deux guerres mondiales.',
    glob: 'Diaspora présente sur trois continents, exportations (arachide, pêche, phosphates), capitale de la francophonie culturelle (musique, littérature).' },
  { id: 'fr', nom: 'France', flag: '🇫🇷', lat: 46.6, lon: 2.5,
    geo: 'Europe de l’Ouest, entre Atlantique et Méditerranée. Présente sur tous les océans grâce à l’outre-mer.',
    poli: 'Membre permanent du Conseil de sécurité de l’ONU, UE, OTAN. Puissance diplomatique et militaire de premier plan.',
    hist: 'Théâtre majeur des deux guerres mondiales (1914-1918, 1939-1945), vainqueur dans les deux camps alliés. Ancien empire colonial.',
    glob: '2e domaine maritime mondial, langue parlée sur 5 continents, luxe, aéronautique, culture : une mondialisation à la française.' },
  { id: 'de', nom: 'Allemagne', flag: '🇩🇪', lat: 51.1, lon: 10.4,
    geo: 'Europe centrale, neuf pays voisins, du Rhin aux Alpes.',
    poli: 'Première économie d’Europe, moteur de l’UE, membre de l’OTAN.',
    hist: 'À l’origine des deux guerres mondiales, vaincue en 1945, divisée puis réunifiée en 1990. Devenue puissance civile et européenne.',
    glob: 'Machines, automobiles, chimie : l’exportation comme identité. Culture de la mémoire des guerres exemplaire.' },
  { id: 'gb', nom: 'Royaume-Uni', flag: '🇬🇧', lat: 54, lon: -2.5,
    geo: 'Îles au large de l’Europe, entre mer du Nord et Atlantique.',
    poli: 'Membre permanent du Conseil de sécurité, OTAN, Commonwealth de 56 États. Sorti de l’UE (Brexit, 2020).',
    hist: 'Empire « où le soleil ne se couche jamais », vainqueur des deux guerres mondiales malgré les bombardements (Blitz).',
    glob: 'L’anglais, langue du monde ; la City de Londres, place financière globale ; musique et universités exportées partout.' },
  { id: 'ru', nom: 'Russie', flag: '🇷🇺', lat: 55.7, lon: 37.6,
    geo: 'Le plus grand pays du monde, de Kaliningrad au Pacifique, onze fuseaux horaires.',
    poli: 'Membre permanent du Conseil de sécurité, héritier de l’URSS. En guerre en Ukraine depuis 2014/2022, tensions avec l’OTAN.',
    hist: 'L’URSS a payé le prix le plus lourd de la Seconde Guerre mondiale (≈ 26 millions de morts) et vaincu à Stalingrad. Guerre froide 1947-1991.',
    glob: 'Gaz, pétrole, blé, armes : une mondialisation par les ressources. Culture immense (Tolstoï, Tchaïkovski).' },
  { id: 'ua', nom: 'Ukraine', flag: '🇺🇦', lat: 49, lon: 31.4,
    geo: 'Plaines fertiles d’Europe orientale, « grenier à blé » du continent.',
    poli: 'En guerre contre la Russie depuis 2014, invasion totale en 2022. Candidate à l’Union européenne.',
    hist: 'Au cœur des deux guerres mondiales, famine orchestrée (Holodomor, 1932-33), théâtre de l’Holocauste (Babyn Yar).',
    glob: 'Blé, maïs, tournesol : sa guerre fait trembler les prix alimentaires mondiaux. Diaspora importante.' },
  { id: 'us', nom: 'États-Unis', flag: '🇺🇸', lat: 39, lon: -98,
    geo: 'Du Pacifique à l’Atlantique, un continent-puissance.',
    poli: 'Première superpuissance, OTAN, dollar roi, 750 bases militaires à l’étranger.',
    hist: 'Entrés tard mais décisifs dans les deux guerres mondiales (1917, 1941). Seule nation à avoir utilisé l’arme nucléaire (1945).',
    glob: 'Hollywood, Silicon Valley, fast-food, réseaux sociaux : le modèle même de la mondialisation culturelle et technologique.' },
  { id: 'cn', nom: 'Chine', flag: '🇨🇳', lat: 35, lon: 103,
    geo: 'De l’Himalaya au désert de Gobi, 1,4 milliard d’habitants.',
    poli: 'Membre permanent du Conseil de sécurité, BRICS, « nouvelles routes de la soie » en Afrique et en Asie.',
    hist: 'Envahie par le Japon (guerre 1937-1945, des millions de victimes), puis révolution communiste de 1949.',
    glob: 'L’« usine du monde » : premier exportateur de la planète. Écrans, jouets, téléphones : presque tout vient de Chine.' },
  { id: 'jp', nom: 'Japon', flag: '🇯🇵', lat: 36.2, lon: 138.2,
    geo: 'Archipel volcanique de 6 800 îles, entre mer du Japon et Pacifique.',
    poli: 'Allié des États-Unis, 3e-4e économie mondiale, puissance pacifiste par sa Constitution.',
    hist: 'Militariste jusqu’en 1945 (Pearl Harbor 1941), seule nation frappée par deux bombes atomiques (Hiroshima, Nagasaki).',
    glob: 'Mangas, jeux vidéo, voitures, sushis : une soft power planétaire née de la reconstruction.' },
  { id: 'in', nom: 'Inde', flag: '🇮🇳', lat: 21, lon: 78,
    geo: 'Sous-continent entre Himalaya et océan Indien, pays le plus peuplé (1,45 milliard).',
    poli: 'Plus grande démocratie du monde, non-alignée, BRICS, rivale et partenaire de la Chine.',
    hist: 'Colonisée par les Britanniques, indépendance non-violente de Gandhi (1947). Troupes indiennes dans les deux guerres mondiales.',
    glob: 'Bollywood, yoga, informatique : la mondialisation indienne. Diaspora influente (États-Unis, Royaume-Uni).' },
  { id: 'br', nom: 'Brésil', flag: '🇧🇷', lat: -10, lon: -52,
    geo: 'La moitié de l’Amérique du Sud ; l’Amazonie, poumon de la planète.',
    poli: 'Leader du BRICS et de l’Amérique latine, voix des pays du Sud.',
    hist: 'Empire puis république ; dictature militaire (1964-1985) ; premier pays d’Amérique latine à envoyer des troupes en 1944.',
    glob: 'Soja, bœuf, café, carnaval, football : une planète verte et culturelle.' },
  { id: 'tr', nom: 'Turquie', flag: '🇹🇷', lat: 39, lon: 35.2,
    geo: 'Pont naturel entre Europe et Asie, détroits du Bosphore et des Dardanelles.',
    poli: 'OTAN mais diplomatie indépendante, acteur majeur au Moyen-Orient, héritière de l’Empire ottoman.',
    hist: 'L’Empire ottoman dans la Première Guerre mondiale (Gallipoli 1915) ; effondrement puis République d’Atatürk (1923).',
    glob: 'Séries TV exportées dans 150 pays, tourisme, diaspora européenne : un carrefour mondialisé.' },
  { id: 'sa', nom: 'Arabie saoudite', flag: '🇸🇦', lat: 24, lon: 45,
    geo: 'Péninsule désertique, lieux saints de l’islam (La Mecque, Médine).',
    poli: 'Premier exportateur de pétrole, G20, influence religieuse mondiale, alliances oscillantes.',
    hist: 'Unifiée par Ibn Séoud (1932) ; le pétrole découvert en 1938 en fait un acteur clé des guerres et crises énergétiques.',
    glob: 'Le prix de l’essence mondiale se décide en partie à Riyad ; pèlerinage de millions de musulmans chaque année.' },
  { id: 'eg', nom: 'Égypte', flag: '🇪🇬', lat: 26.7, lon: 30,
    geo: 'Le Nil, le désert, et le canal de Suez : 12 % du commerce mondial y transite.',
    poli: 'Poids lourd du monde arabe et africain, gardienne du canal, paix avec Israël depuis 1979.',
    hist: 'Berceau des pharaons ; théâtre de la campagne d’Égypte et des guerres israélo-arabes ; Afrique du Nord dans la Seconde Guerre mondiale (El-Alamein).',
    glob: 'Coton, gaz, cinéma et musique écoutés de Dakar à Dubaï ; le canal, artère de la mondialisation.' },
  { id: 'ma', nom: 'Maroc', flag: '🇲🇦', lat: 31.8, lon: -6.5,
    geo: 'De l’Atlantique à la Méditerranée, porte de l’Afrique face à l’Europe (détroit de Gibraltar).',
    poli: 'Stabilité maghrébine, partenariats Europe/USA/Afrique, première destination touristique d’Afrique.',
    hist: 'Protectorat français et espagnol, indépendant en 1956 ; soldats marocains dans les deux guerres mondiales.',
    glob: 'Phosphates (1er réservoir mondial), voitures, diaspora européenne : un pont entre deux mondes.' },
];

const CALQUES = [
  { id: 'geo', nom: 'Géographie', color: '#0e7490' },
  { id: 'poli', nom: 'Géopolitique', color: '#b91c1c' },
  { id: 'hist', nom: 'Histoire & guerres', color: '#b45309' },
  { id: 'glob', nom: 'Mondialisation', color: '#1d4ed8' },
];

export default function Globe3D() {
  const [off, setOff] = useState(0.35); // position de la carte (0..2)
  const [drag, setDrag] = useState(null);
  const [sel, setSel] = useState(null);
  const [calque, setCalque] = useState('geo');
  const ref = useRef(null);

  // rotation lente automatique
  useEffect(() => {
    if (drag || sel) return undefined;
    const t = setInterval(() => setOff((o) => (o + 0.0009) % 2), 50);
    return () => clearInterval(t);
  }, [drag, sel]);

  function down(e) {
    setDrag({ x: e.clientX, off });
  }
  function move(e) {
    if (!drag || !ref.current) return;
    const w = ref.current.clientWidth;
    setOff((((drag.off - (e.clientX - drag.x) / w) % 2) + 2) % 2);
  }

  const c = CALQUES.find((x) => x.id === calque);

  return (
    <section className="card s3card globe3-sec">
      <h2>Le monde entre tes mains</h2>
      <p className="muted small">
        Fais tourner le globe, touche un pays marqué, puis change de lecture : géographie, géopolitique, histoire des
        guerres mondiales ou mondialisation.
      </p>
      <div className="globe3-calques">
        {CALQUES.map((k) => (
          <button key={k.id} className={calque === k.id ? 'pill active' : 'pill'} onClick={() => setCalque(k.id)}>
            {k.nom}
          </button>
        ))}
      </div>
      <div
        className="globe3"
        ref={ref}
        style={{ '--tint': c.color }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <div className="globe3-map" style={{ backgroundPositionX: `${off * 100}%` }} />
        <div className="globe3-shade" />
        {PAYS.map((p) => {
          const xb = ((p.lon + 180) / 360) * 2; // en largeurs de globe (carte = 2)
          let t = xb - off;
          t = ((t % 2) + 2) % 2;
          if (t > 1) return null; // face cachée
          const tt = (t - 0.5) * 2; // -1..1
          if (Math.abs(tt) > 0.97) return null;
          const y = ((90 - p.lat) / 180) * 100;
          const k = Math.sqrt(1 - tt * tt);
          return (
            <button
              key={p.id}
              className="g3-mark"
              style={{ left: `${50 + tt * 50}%`, top: `${y}%`, opacity: 0.35 + k * 0.65, transform: `translate(-50%,-50%) scale(${0.7 + k * 0.5})` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setSel(p)}
              title={p.nom}
            >
              <i />
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="sheet3" onClick={() => setSel(null)}>
          <div className="sheet3-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet3-handle" />
            <div className="g3-head">
              <span className="g3-flag">{sel.flag}</span>
              <div>
                <strong>{sel.nom}</strong>
                <small className="muted">
                  {sel.lat > 0 ? `${sel.lat}° N` : `${-sel.lat}° S`}, {sel.lon > 0 ? `${sel.lon}° E` : `${-sel.lon}° O`}
                </small>
              </div>
              <span className="g3-calque" style={{ color: c.color }}>
                <Icon name="globe" size={14} /> {c.nom}
              </span>
            </div>
            <p className="g3-txt">{sel[calque]}</p>
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
