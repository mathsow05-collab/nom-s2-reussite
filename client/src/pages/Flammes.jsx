import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Flammes() {
  const [list, setList] = useState(null);
  useEffect(() => {
    const maj = () => api('/eleve/flammes').then(setList).catch(() => {});
    maj();
    window.addEventListener('kd-flamme', maj);
    return () => window.removeEventListener('kd-flamme', maj);
  }, []);
  if (!list || !list.length) return null;
  return (
    <section className="card fl-card">
      <div className="fl-head">🔥 Mes flammes</div>
      <div className="fl-list">
        {list.map((f) => (
          <div className="fl-row" key={f.avec.id}>
            <span className="fl-feu">{f.eteinte ? '💧' : '🔥'}</span>
            <strong>{f.avec.prenom}</strong>
            <span className="fl-nb">{f.compteur} j</span>
            <small className="muted">
              {f.eteinte ? 'éteinte — relance !' : f.heures <= 12 ? `plus que ${f.heures} h !` : `record : ${f.record} j`}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
