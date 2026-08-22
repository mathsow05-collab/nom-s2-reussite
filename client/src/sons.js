/* Petits sons d'interface synthétisés (WebAudio) — aucun fichier, discret et doux. */
let ctx = null;
let actif = typeof localStorage !== 'undefined' ? localStorage.getItem('kd_sons') !== '0' : true;

export const sonsActifs = () => actif;
export function setSons(v) {
  actif = !!v;
  try {
    localStorage.setItem('kd_sons', v ? '1' : '0');
  } catch {
    /* ignore */
  }
}
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function note(f, t0, dur, type = 'sine', g = 0.05) {
  const c = ac();
  const o = c.createOscillator();
  const gn = c.createGain();
  o.type = type;
  o.frequency.value = f;
  const t = c.currentTime + t0;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(g, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/* tic doux à chaque appui */
export const sonClic = () => {
  if (!actif) return;
  try {
    note(720, 0, 0.07, 'sine', 0.026);
  } catch {
    /* ignore */
  }
};
/* petite réussite (2 notes) */
export const sonOk = () => {
  if (!actif) return;
  try {
    note(523, 0, 0.12, 'sine', 0.04);
    note(784, 0.09, 0.16, 'sine', 0.04);
  } catch {
    /* ignore */
  }
};
/* erreur douce et grave */
export const sonKo = () => {
  if (!actif) return;
  try {
    note(220, 0, 0.16, 'triangle', 0.038);
    note(174, 0.1, 0.2, 'triangle', 0.032);
  } catch {
    /* ignore */
  }
};
/* victoire : petit arpège */
export const sonWin = () => {
  if (!actif) return;
  try {
    [523, 659, 784, 1046].forEach((f, i) => note(f, i * 0.09, 0.18, 'sine', 0.045));
  } catch {
    /* ignore */
  }
};
