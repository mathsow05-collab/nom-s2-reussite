import { useEffect, useRef, useState } from 'react';

// Lecteur vidéo « KAY DIANG » : la vidéo se regarde sur le site, sans jamais
// être redirigé vers YouTube.
//  - façade miniature : rien ne charge avant que l'élève clique ;
//  - un bandeau noir OPAQUE (notre propre barre de titre) recouvre la barre du
//    haut de YouTube : le nom YouTube et le bouton « regarder sur YouTube »
//    sont invisibles et non cliquables ;
//  - un cache noir en bas à droite recouvre le logo YouTube pendant la lecture ;
//  - rel=0 : aucune suggestion externe ;
//  - à la fin de la vidéo, on revient à l'affiche (pas d'écran de fin YouTube) ;
//  - bouton plein écran maison.
let ytPromise = null;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = reject;
        document.head.appendChild(s);
      }
    });
  }
  return ytPromise;
}

export default function VideoPlayer({ id, titre }) {
  const [play, setPlay] = useState(false);
  const [fini, setFini] = useState(false);
  const [fb, setFb] = useState(false); // repli si l'API ne charge pas
  const boxRef = useRef(null);
  const holderRef = useRef(null);

  useEffect(() => {
    if (!play || fb) return undefined;
    let player = null;
    let dead = false;
    const garde = setTimeout(() => {
      if (!player && !dead) setFb(true);
    }, 3500);
    loadYT()
      .then((YT) => {
        if (dead || !holderRef.current) return;
        player = new YT.Player(holderRef.current, {
          width: '100%',
          height: '100%',
          videoId: id,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            hl: 'fr',
            enablejsapi: 1,
            host: 'https://www.youtube-nocookie.com',
          },
          events: {
            onStateChange: (e) => {
              // 0 = vidéo terminée : on masque tout et on revient à l'affiche.
              if (e.data === 0 && !dead) {
                setFini(true);
                setPlay(false);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!dead) setFb(true);
      });
    return () => {
      dead = true;
      clearTimeout(garde);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [play, id, fb]);

  function pleinEcran() {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="vp-box" ref={boxRef}>
      {!play ? (
        <button
          className="vp-facade"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}
          onClick={() => {
            setFb(false);
            setPlay(true);
          }}
        >
          <span className="vp-play">▶</span>
          <span className="vp-label">{fini ? '↺ Revoir la vidéo' : titre}</span>
        </button>
      ) : (
        <div className="vp-wrap">
          {fb ? (
            <iframe
              title={titre}
              src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&hl=fr`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="vp-holder" ref={holderRef} />
          )}
          {/* Bandeau maison : masque totalement la barre YouTube du haut */}
          <div className="vp-shield">
            <span className="vp-shield-titre">{titre}</span>
            <span className="vp-shield-badge">KAY DIANG</span>
          </div>
          {/* Cache le logo YouTube en bas à droite */}
          <div className="vp-shield-br">KAY DIANG</div>
        </div>
      )}
      <button className="vp-full" onClick={pleinEcran} title="Plein écran">
        ⛶
      </button>
    </div>
  );
}
