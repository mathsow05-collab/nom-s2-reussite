import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={wide ? 'modal modal-wide' : 'modal'} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" aria-label="Chargement" />;
}

export function Badge({ children, tone = 'brand', style }) {
  return (
    <span className={`badge badge-${tone}`} style={style}>
      {children}
    </span>
  );
}

export function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="copy-field">
      <code>{value}</code>
      <button className="btn btn-outline btn-sm" onClick={copy}>
        <Icon name={copied ? 'check' : 'copy'} size={15} />
        {copied ? 'Copié !' : 'Copier'}
      </button>
    </div>
  );
}
