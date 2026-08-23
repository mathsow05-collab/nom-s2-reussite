/* Sons d'interface courts et doux, synthétisés (WebAudio) — jamais plus de 0,4 s. */
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

/* tic doux et bref */
export const sonClic = () => {
  if (!actif) return;
  try {
    note(760, 0, 0.07, 'sine', 0.05);
  } catch {
    /* ignore */
  }
};

/* chaque espace ouvert : mini-signature de 2 notes, très courte */
export function sonOuvrir(quoi) {
  if (!actif) return;
  try {
    switch (quoi) {
      case 'accueil':
        note(523, 0, 0.1, 'sine', 0.05);
        note(784, 0.06, 0.12, 'sine', 0.045);
        break;
      case 'cours':
        note(587, 0, 0.1, 'sine', 0.05);
        note(880, 0.06, 0.12, 'sine', 0.045);
        break;
      case 'quiz':
        note(659, 0, 0.09, 'sine', 0.05);
        note(988, 0.06, 0.11, 'sine', 0.045);
        break;
      case 'profil':
        note(440, 0, 0.1, 'sine', 0.05);
        note(660, 0.06, 0.12, 'sine', 0.04);
        break;
      case 'anglais':
        note(523, 0, 0.08, 'sine', 0.05);
        note(659, 0.06, 0.08, 'sine', 0.05);
        note(784, 0.12, 0.1, 'sine', 0.05);
        break;
      default:
        note(494, 0, 0.1, 'sine', 0.05);
        note(740, 0.06, 0.12, 'sine', 0.045);
    }
  } catch {
    /* ignore */
  }
}

/* réussite : deux notes montantes */
export const sonOk = () => {
  if (!actif) return;
  try {
    note(523, 0, 0.12, 'sine', 0.07);
    note(784, 0.09, 0.16, 'sine', 0.07);
  } catch {
    /* ignore */
  }
};
/* erreur : ton grave feutré, bref */
export const sonKo = () => {
  if (!actif) return;
  try {
    note(220, 0, 0.14, 'triangle', 0.06);
    note(174, 0.09, 0.16, 'triangle', 0.05);
  } catch {
    /* ignore */
  }
};
/* victoire : petit arpège rapide */
export const sonWin = () => {
  if (!actif) return;
  try {
    [523, 659, 784, 1046].forEach((f, i) => note(f, i * 0.08, 0.14, 'sine', 0.07));
  } catch {
    /* ignore */
  }
};
/* rappel : double ding court */
export const sonNotif = () => {
  if (!actif) return;
  try {
    note(880, 0, 0.1, 'sine', 0.06);
    note(880, 0.16, 0.12, 'sine', 0.05);
  } catch {
    /* ignore */
  }
};
