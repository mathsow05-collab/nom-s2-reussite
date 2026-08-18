import { useRef, useState } from 'react';
import Icon from '../Icon.jsx';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* Petit lecteur audio réutilisable (notes vocales du chat, explications de
   devoirs…). src = URL authentifiée du fichier. */
export default function AudioBulle({ src, className = '' }) {
  const audioRef = useRef(null);
  const [joue, setJoue] = useState(false);
  const [prog, setProg] = useState(0);
  const [duree, setDuree] = useState(0);

  return (
    <span className={`audio-bulle ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setJoue(true)}
        onPause={() => setJoue(false)}
        onEnded={() => {
          setJoue(false);
          setProg(0);
        }}
        onTimeUpdate={(e) => setProg(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuree(e.target.duration)}
      />
      <button type="button" className="audio-btn" onClick={() => (joue ? audioRef.current?.pause() : audioRef.current?.play())}>
        <Icon name={joue ? 'pause' : 'play'} size={15} />
      </button>
      <span className="audio-bar">
        <span style={{ width: duree ? `${Math.min(100, (prog / duree) * 100)}%` : '0%' }} />
      </span>
      <span className="audio-dur">{fmt(duree || 0)}</span>
    </span>
  );
}
