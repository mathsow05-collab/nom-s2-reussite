import { useRef, useState } from 'react';

// Lecteur vidéo « sans fuite vers YouTube » :
// 1) façade avec miniature : rien ne charge tant que l'élève ne clique pas ;
// 2) une fois lancé, un bouclier transparent couvre la barre du haut de YouTube
//    (titre + logo cliquables) : impossible de sortir du site d'un clic ;
// 3) rel=0 + modestbranding : pas de suggestions externes à la fin ;
// 4) bouton plein écran natif.
export default function VideoPlayer({ id, titre }) {
  const [play, setPlay] = useState(false);
  const boxRef = useRef(null);

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
          onClick={() => setPlay(true)}
        >
          <span className="vp-play">▶</span>
          <span className="vp-label">{titre}</span>
        </button>
      ) : (
        <div className="vp-wrap">
          <iframe
            title={titre}
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&hl=fr`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="vp-shield" />
        </div>
      )}
      <button className="vp-full" onClick={pleinEcran} title="Plein écran">
        ⛶
      </button>
    </div>
  );
}
