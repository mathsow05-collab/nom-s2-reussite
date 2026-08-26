/* Empreinte appareil locale : sert à empêcher de multiplier les semaines gratuites. */
export function deviceId() {
  try {
    let d = localStorage.getItem('kd_device');
    if (!d) {
      d =
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem('kd_device', d);
    }
    return d;
  } catch {
    return 'inconnu';
  }
}
