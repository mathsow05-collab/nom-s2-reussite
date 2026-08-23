/* Kit sonore premium synthétisé (WebAudio) : cloches douces, un son par action. */
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
/* cloche riche : fondamentale + 2 partiels, enveloppe douce, léger écho */
function cloche(f, t0, dur, g = 0.06, brillant = 1) {
  const c = ac();
  const t = c.currentTime + t0;
  const part = [
    [1, 1],
    [2.0, 0.35 * brillant],
    [2.98, 0.12 * brillant],
  ];
  for (const [mult, vol] of part) {
    const o = c.createOscillator();
    const gn = c.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g * vol, t + 0.014);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.08);
    /* petit écho aérien */
    const dl = c.createDelay(0.5);
    dl.delayTime.value = 0.16;
    const fb = c.createGain();
    fb.gain.value = 0.18;
    const g2 = c.createGain();
    g2.gain.value = 0.35;
    gn.connect(g2).connect(dl);
    dl.connect(fb).connect(dl);
    dl.connect(c.destination);
  }
}
function souffle(f0, f1, t0, dur, g = 0.04) {
  const c = ac();
  const t = c.currentTime + t0;
  const o = c.createOscillator();
  const gn = c.createGain();
  const fl = c.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.setValueAtTime(f0, t);
  fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.type = 'triangle';
  o.frequency.setValueAtTime(f0 / 3, t);
  o.frequency.exponentialRampToValueAtTime(f1 / 3, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(g, t + 0.03);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl).connect(gn).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/* tic cristal discret à chaque appui */
export const sonClic = () => {
  if (!actif) return;
  try {
    cloche(1250, 0, 0.09, 0.035, 0.7);
  } catch {
    /* ignore */
  }
};

/* chaque espace ouvert a sa propre signature sonore */
export function sonOuvrir(quoi) {
  if (!actif) return;
  try {
    switch (quoi) {
      case 'accueil':
        cloche(523, 0, 0.22, 0.05);
        cloche(784, 0.07, 0.26, 0.045);
        break;
      case 'cours':
        souffle(300, 900, 0, 0.22, 0.05);
        cloche(659, 0.05, 0.2, 0.05);
        break;
      case 'quiz':
        cloche(587, 0, 0.14, 0.05);
        cloche(880, 0.09, 0.18, 0.05);
        break;
      case 'flash':
        cloche(740, 0, 0.12, 0.045);
        cloche(740, 0.11, 0.12, 0.035);
        break;
      case 'profil':
        cloche(440, 0, 0.24, 0.05);
        cloche(660, 0.08, 0.24, 0.04);
        break;
      case 'suivi':
        cloche(494, 0, 0.16, 0.05);
        cloche(740, 0.08, 0.2, 0.045);
        break;
      case 'anglais':
        cloche(523, 0, 0.12, 0.05);
        cloche(659, 0.08, 0.12, 0.05);
        cloche(784, 0.16, 0.2, 0.05);
        break;
      default:
        souffle(400, 1100, 0, 0.2, 0.045);
        cloche(700, 0.04, 0.18, 0.045);
    }
  } catch {
    /* ignore */
  }
}

/* réussite : cloche brillante */
export const sonOk = () => {
  if (!actif) return;
  try {
    cloche(784, 0, 0.22, 0.06, 1.3);
    cloche(1175, 0.09, 0.3, 0.05, 1.3);
  } catch {
    /* ignore */
  }
};
/* erreur : ton feutré, sans agressivité */
export const sonKo = () => {
  if (!actif) return;
  try {
    souffle(240, 140, 0, 0.28, 0.06);
    cloche(196, 0.02, 0.24, 0.04, 0.4);
  } catch {
    /* ignore */
  }
};
/* victoire : arpège scintillant */
export const sonWin = () => {
  if (!actif) return;
  try {
    [523, 659, 784, 1046, 1318].forEach((f, i) => cloche(f, i * 0.09, 0.3, 0.055, 1.4));
  } catch {
    /* ignore */
  }
};
/* notification rappel */
export const sonNotif = () => {
  if (!actif) return;
  try {
    cloche(880, 0, 0.18, 0.05);
    cloche(880, 0.22, 0.22, 0.045);
  } catch {
    /* ignore */
  }
};
