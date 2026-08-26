/* Empreinte appareil multi-couches : sert à empêcher de multiplier les
   semaines gratuites en recréant des comptes.
   - hash matériel (canvas, écran, UA, fuseau…) : survit au vidage de stockage ;
   - marqueur persistant doublé (localStorage + cookie 10 ans). */

async function hashText(t) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return 'x' + Math.abs(h).toString(36);
  }
}

function lireCookie(nom) {
  try {
    return document.cookie
      .split('; ')
      .find((c) => c.startsWith(nom + '='))
      ?.split('=')[1];
  } catch {
    return null;
  }
}
function ecrireCookie(nom, val) {
  try {
    document.cookie = `${nom}=${val}; max-age=315360000; path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
function nouveauMarqueur() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function empreinte() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
  ];
  try {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.textBaseline = 'top';
    g.font = '14px Arial';
    g.fillStyle = '#f60';
    g.fillRect(0, 0, 80, 30);
    g.fillText('schooby', 2, 15);
    parts.push(c.toDataURL().slice(-100));
  } catch {
    /* ignore */
  }
  const hash = await hashText(parts.join('|'));

  let mark = null;
  try {
    mark = localStorage.getItem('kd_mark');
  } catch {
    /* ignore */
  }
  const cook = lireCookie('kd_mark');
  if (mark && cook && mark !== cook) mark = cook; // l'un des deux a été vidé : garde l'ancien
  if (!mark) mark = cook || nouveauMarqueur();
  try {
    localStorage.setItem('kd_mark', mark);
  } catch {
    /* ignore */
  }
  ecrireCookie('kd_mark', mark);
  return { hash, mark };
}

/* ancien deviceId conservé pour compatibilité */
export function deviceId() {
  try {
    let d = localStorage.getItem('kd_device');
    if (!d) {
      d = nouveauMarqueur();
      localStorage.setItem('kd_device', d);
    }
    return d;
  } catch {
    return 'inconnu';
  }
}
