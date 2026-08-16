import { useRef } from 'react';

// Effets visuels inspirés de reactbits.dev / viewport-ui.design, sans dépendance.

// « Aurora » : halos de couleur qui flottent doucement derrière le contenu.
export function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
    </div>
  );
}

// « Spotlight card » : un halo lumineux suit le doigt / le curseur sur la carte.
export function Spot({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  function move(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - r.left}px`);
    el.style.setProperty('--sy', `${e.clientY - r.top}px`);
  }
  function leave() {
    ref.current?.style.setProperty('--sx', '-999px');
  }
  return (
    <Tag ref={ref} className={`spot ${className}`} onPointerMove={move} onPointerLeave={leave} {...rest}>
      {children}
    </Tag>
  );
}

// « Shiny text » : texte en dégradé qui scintille en boucle.
export function Shiny({ children, className = '' }) {
  return <span className={`shiny ${className}`}>{children}</span>;
}

// « Marquee » : bandeau qui défile à l'infini.
export function Marquee({ items }) {
  const row = (key) => items.map((t, i) => <span className="mq-item" key={`${key}${i}`}>{t}</span>);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
