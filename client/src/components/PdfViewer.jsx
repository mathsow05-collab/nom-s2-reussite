import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Visionneuse PDF universelle (fonctionne sur Android, iPhone et PC) :
// le PDF est rendu en images via PDF.js, au lieu de l'iframe que beaucoup
// de navigateurs mobiles refusent d'afficher.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfViewer({ src }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(src).promise;
        if (cancelled) return;
        const container = containerRef.current;
        container.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const cssWidth = Math.min(container.clientWidth || 640, 900);
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: (cssWidth * ratio) / base.width });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          container.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (!cancelled) setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="pdf-viewer">
      {status === 'loading' && <div className="pdf-status">Ouverture du PDF…</div>}
      {status === 'error' && (
        <div className="pdf-status">
          Aperçu impossible sur cet appareil — utilisez le bouton « Télécharger » ci-dessous.
        </div>
      )}
      <div className="pdf-pages" ref={containerRef} />
    </div>
  );
}
