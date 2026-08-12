import { useEffect, useRef, useState } from 'react';
// Visionneuse PDF intégrée (moteur PDF.js de Mozilla, auto-hébergé) :
// fonctionne sur TOUS les navigateurs, y compris Chrome mobile qui ne sait
// pas afficher les PDF dans une iframe.
// Chargée en différé (import dynamique) pour ne pas alourdir la page d'accueil.

export default function PdfViewer({ url }) {
  const containerRef = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const doc = await pdfjs.getDocument(url).promise;
      if (cancelled) return;
      setPages(doc.numPages);
      const container = containerRef.current;
      container.innerHTML = '';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const width = container.clientWidth || 600;
        const viewport = page.getViewport({ scale: width / base.width });
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        await page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        }).promise;
      }
      if (!cancelled) setState('ready');
    })().catch(() => {
      if (!cancelled) setState('error');
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="pdf-viewer">
      {state === 'loading' && <div className="pdf-status">Chargement du PDF…</div>}
      {state === 'error' && (
        <div className="pdf-status">Aperçu impossible sur cet appareil — utilise le bouton Télécharger ci-dessous.</div>
      )}
      {state === 'ready' && <div className="pdf-status pdf-status-ok">{pages} page{pages > 1 ? 's' : ''}</div>}
      <div className="pdf-pages" ref={containerRef} />
    </div>
  );
}
