import { useEffect, useRef, useState } from 'react';

/* Enregistrement audio (note vocale) réutilisable : start() démarre le micro,
   stop() envoie le blob via onBlob, cancel() annule. Arrêt auto à 2 minutes. */
export function useMicro(notifier, onBlob) {
  const [sec, setSec] = useState(null);
  const recRef = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const onBlobRef = useRef(onBlob);
  onBlobRef.current = onBlob;

  useEffect(
    () => () => {
      const r = recRef.current;
      if (r && r.state !== 'inactive') r.stop();
      clearInterval(timer.current);
    },
    []
  );

  async function start() {
    if (recRef.current && recRef.current.state !== 'inactive') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
          (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)
        ) || '';
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        setSec(null);
        const blob = new Blob(chunks.current, { type: mime || 'audio/webm' });
        if (blob.size > 1500) {
          const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
          onBlobRef.current?.(blob, ext);
        }
      };
      r.start();
      recRef.current = r;
      setSec(0);
      timer.current = setInterval(() => {
        setSec((s) => {
          if (s + 1 >= 120 && r.state !== 'inactive') r.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      notifier?.('Active ton micro dans les réglages du navigateur.');
    }
  }

  function stop() {
    const r = recRef.current;
    if (r && r.state !== 'inactive') r.stop();
  }

  function cancel() {
    chunks.current = [];
    const r = recRef.current;
    if (r && r.state !== 'inactive') {
      r.onstop = () => r.stream.getTracks().forEach((t) => t.stop());
      r.stop();
    }
    clearInterval(timer.current);
    setSec(null);
  }

  return { sec, start, stop, cancel };
}
