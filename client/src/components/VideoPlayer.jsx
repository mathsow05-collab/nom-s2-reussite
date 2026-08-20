import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';

/* Lecteur « KAY DIANG » : l'iframe YouTube est montée SANS contrôles natifs
   (controls=0, pas de clavier, pas de plein écran natif) via l'API IFrame, et
   c'est NOTRE propre barre (play/pause, temps, progression, plein écran) qui
   pilote la lecture avec playVideo/pauseVideo/seekTo. Résultat : aucun logo,
   aucune barre YouTube, aucune vidéo suggérée visible ; l'écran de fin est
   court-circuité (retour à l'affiche). Le paramètre modestbranding étant
   déprécié, on ne s'appuie pas dessus : on masque par construction. */

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

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function VideoPlayer({ id, titre }) {
  const [play, setPlay] = useState(false);
  const [fini, setFini] = useState(false);
  const [fb, setFb] = useState(false); // repli si l'API ne charge pas
  const [etat, setEtat] = useState('idle');
  const [time, setTime] = useState(0);
  const [duree, setDuree] = useState(0);
  const [showCtl, setShowCtl] = useState(true);
  const boxRef = useRef(null);
  const holderRef = useRef(null);
  const playerRef = useRef(null);
  const hideT = useRef(null);

  useEffect(() => {
    if (!play || fb) return undefined;
    let dead = false;
    const garde = setTimeout(() => {
      if (!playerRef.current && !dead) setFb(true);
    }, 4000);
    loadYT()
      .then((YT) => {
        if (dead || !holderRef.current) return;
        playerRef.current = new YT.Player(holderRef.current, {
          width: '100%',
          height: '100%',
          videoId: id,
          playerVars: {
            controls: 0,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            host: 'https://www.youtube-nocookie.com',
          },
          events: {
            onReady: (e) => {
              setDuree(e.target.getDuration() || 0);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (dead) return;
              const S = window.YT.PlayerState;
              if (e.data === S.PLAYING) {
                setEtat('playing');
                setDuree(e.target.getDuration() || 0);
              } else if (e.data === S.PAUSED) setEtat('paused');
              else if (e.data === S.BUFFERING) setEtat('buffering');
              else if (e.data === S.ENDED) {
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
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [play, id, fb]);

  // Horloge de la barre de progression.
  useEffect(() => {
    if (!play) return undefined;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (p?.getCurrentTime) setTime(p.getCurrentTime() || 0);
    }, 400);
    return () => clearInterval(t);
  }, [play]);

  function poke() {
    setShowCtl(true);
    clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setShowCtl(false), 2800);
  }
  function bascule() {
    const p = playerRef.current;
    if (!p) return;
    if (etat === 'playing') p.pauseVideo();
    else p.playVideo();
    poke();
  }
  function seek(e) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    playerRef.current?.seekTo?.(f * (duree || 0), true);
    setTime(f * (duree || 0));
    poke();
  }
  function pleinEcran() {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
    poke();
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
          <span className="vp-play">
            <Icon name="play" size={22} />
          </span>
          <span className="vp-label">{fini ? 'Revoir la vidéo' : titre}</span>
        </button>
      ) : (
        <div className="vp-wrap">
          {fb ? (
            <iframe
              title={titre}
              src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&hl=fr`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="vp-holder" ref={holderRef} />
          )}

          {/*_zone tactile maison : joue/pause d'un geste, YouTube ne reçoit aucun clic_ */}
          {!fb && <div className="vp-tap" onClick={bascule} />}

          {/* bandeau titre de marque */}
          <div className="vp-shield">
            <span className="vp-shield-titre">{titre}</span>
            <span className="vp-shield-badge">SCHOOBY</span>
          </div>
          <div className="vp-shield-br">SCHOOBY</div>

          {etat === 'buffering' && <div className="vp-load" />}
          {etat === 'paused' && (
            <button className="vp-play-big" onClick={bascule}>
              <Icon name="play" size={26} />
            </button>
          )}

          {/* NOTRE barre de contrôles */}
          {!fb && (
            <div className={showCtl || etat !== 'playing' ? 'vpc show' : 'vpc'} onPointerDown={(e) => e.stopPropagation()}>
              <button className="vpc-btn" onClick={bascule} title={etat === 'playing' ? 'Pause' : 'Lecture'}>
                <Icon name={etat === 'playing' ? 'pause' : 'play'} size={16} />
              </button>
              <span className="vpc-time">
                {fmt(time)} / {fmt(duree)}
              </span>
              <div className="vpc-bar" onPointerDown={seek}>
                <i style={{ width: `${duree ? Math.min(100, (time / duree) * 100) : 0}%` }} />
              </div>
              <button className="vpc-btn" onClick={pleinEcran} title="Plein écran">
                <Icon name="maximize" size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
