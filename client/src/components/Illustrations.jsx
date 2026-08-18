/* Illustrations maison, style plat cohérent — palette de marque :
   navy #0f2557 · bleu #1d4ed8 · teal #0e7490 · clairs #dbe7ff / #9db8e8 */
const N = '#0f2557';
const B = '#1d4ed8';
const T = '#0e7490';
const L = '#dbe7ff';
const M = '#9db8e8';

const ART = {
  cours: (
    <>
      <path d="M20 58c14-8 26-8 38-2V22c-12-6-24-6-38 2Z" fill={L} />
      <path d="M100 58c-14-8-26-8-38-2V22c12-6 24-6 38 2Z" fill={M} />
      <path d="M58 22v34" stroke={N} strokeWidth="3" strokeLinecap="round" />
      <circle cx="88" cy="24" r="13" fill={B} />
      <path d="M84 18v12l10-6Z" fill="#fff" />
    </>
  ),
  annales: (
    <>
      <rect x="30" y="14" width="46" height="56" rx="6" fill="#fff" stroke={M} strokeWidth="2.5" />
      <path d="M38 26h30M38 36h30M38 46h20" stroke={M} strokeWidth="3" strokeLinecap="round" />
      <path d="M38 58h14" stroke={T} strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="56" r="13" fill={T} />
      <path d="M78 56l4 5 8-9" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 20l14-8 4 7-14 8Z" fill={B} />
    </>
  ),
  quiz: (
    <>
      <circle cx="58" cy="40" r="26" fill={L} />
      <circle cx="58" cy="40" r="17" fill={M} />
      <circle cx="58" cy="40" r="8" fill={B} />
      <path d="M58 40 92 16" stroke={N} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M92 16l-8 2 6 6Z" fill={N} />
    </>
  ),
  agenda: (
    <>
      <rect x="26" y="20" width="64" height="50" rx="8" fill="#fff" stroke={M} strokeWidth="2.5" />
      <path d="M26 34h64" stroke={M} strokeWidth="2.5" />
      <path d="M40 14v10M76 14v10" stroke={N} strokeWidth="4" strokeLinecap="round" />
      <rect x="36" y="42" width="10" height="8" rx="2" fill={L} />
      <rect x="52" y="42" width="10" height="8" rx="2" fill={L} />
      <rect x="68" y="42" width="10" height="8" rx="2" fill={T} />
      <rect x="36" y="56" width="10" height="8" rx="2" fill={L} />
      <rect x="52" y="56" width="10" height="8" rx="2" fill={B} />
    </>
  ),
  echanges: (
    <>
      <path d="M24 22h48a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H44l-12 10V56h-8a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z" fill={B} />
      <circle cx="40" cy="39" r="3.5" fill="#fff" />
      <circle cx="52" cy="39" r="3.5" fill="#fff" />
      <circle cx="64" cy="39" r="3.5" fill="#fff" />
      <path d="M96 44H72a6 6 0 0 0-6 6v10a6 6 0 0 0 6 6h6v8l10-8h8a6 6 0 0 0 6-6V50a6 6 0 0 0-6-6Z" fill={T} />
    </>
  ),
  outils: (
    <>
      <rect x="28" y="46" width="12" height="24" rx="3" fill={L} />
      <rect x="46" y="34" width="12" height="36" rx="3" fill={M} />
      <rect x="64" y="22" width="12" height="48" rx="3" fill={B} />
      <path d="M30 26c14 6 30 2 48-10" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M78 16l4 8-9 1Z" fill={T} />
    </>
  ),
  orientation: (
    <>
      <path d="M56 12v60" stroke={N} strokeWidth="4" strokeLinecap="round" />
      <path d="M56 20h34l8 7-8 7H56Z" fill={B} />
      <path d="M56 42H30l-8 7 8 7h26Z" fill={T} />
      <circle cx="56" cy="12" r="5" fill={M} />
    </>
  ),
  ia: (
    <>
      <path d="M28 20h56a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H52l-14 12V62H28a10 10 0 0 1-10-10V30a10 10 0 0 1 10-10Z" fill={N} />
      <path d="M56 30l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5Z" fill="#fff" />
      <circle cx="76" cy="41" r="3.5" fill={M} />
      <circle cx="36" cy="41" r="3.5" fill={M} />
    </>
  ),
  parcours: (
    <>
      <path d="M22 62c14-8 24-8 36-2V28c-12-6-22-6-36 2Z" fill={L} />
      <path d="M94 62c-14-8-24-8-36-2V28c12-6 24-6 36 2Z" fill={M} />
      <path d="M78 14a12 12 0 1 0 10 18 10 10 0 0 1-10-18Z" fill={T} />
      <path d="M94 16l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" fill={B} />
    </>
  ),
  culture: (
    <>
      <circle cx="58" cy="40" r="26" fill={B} />
      <path d="M40 30c8-6 16-4 20 2 5 7-4 10-10 10s-16-6-10-12Z" fill={T} />
      <path d="M62 48c6-4 14-2 14 4 0 5-8 8-14 6s-6-6 0-10Z" fill={L} />
      <path d="M20 52c24 12 52 12 76 0" stroke={N} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  examens: (
    <>
      <circle cx="58" cy="40" r="26" fill={L} />
      <path d="M58 24v16l11 7" stroke={B} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="40" r="26" fill="none" stroke={N} strokeWidth="3" />
    </>
  ),
  flash: (
    <>
      <rect x="28" y="26" width="62" height="42" rx="7" fill={M} transform="rotate(-7 59 47)" />
      <rect x="30" y="20" width="62" height="42" rx="7" fill="#fff" stroke={M} strokeWidth="2.5" transform="rotate(4 61 41)" />
      <path d="M44 34h34M44 44h22" stroke={B} strokeWidth="3.5" strokeLinecap="round" transform="rotate(4 61 41)" />
      <path d="M84 58l6 3-2.5 2 3 5-3 1.6-3-5-3.4 1Z" fill={T} />
    </>
  ),
};

export default function Illu({ name, size }) {
  return (
    <svg viewBox="0 0 120 80" width={size} aria-hidden="true" style={{ display: 'block' }}>
      {ART[name] || ART.cours}
    </svg>
  );
}
