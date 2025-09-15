import React, { useRef, useEffect, useState, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Hoja controlable por react-pageflip
const PagePaper = forwardRef(function PagePaper({ children }, ref) {
  return (
    <div ref={ref} className="page-wrapper">
      {children}
    </div>
  );
});

export default function BookViewer({ file = "/libro.pdf" }) {
  const flipRef = useRef(null);
  const containerRef = useRef(null);

  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(1100);
  const [aspect, setAspect] = useState(0.65); // alto/ancho (se ajusta al cargar pág. 1)

  const onDocLoad = ({ numPages }) => setNumPages(numPages);

  // Ocupar casi todo el ancho del contenedor
  useEffect(() => {
    const handle = () => {
      const cw = containerRef.current?.clientWidth || 1200;
      setPageWidth(Math.max(700, Math.min(1600, cw - 32)));
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const pageHeight = Math.round(pageWidth * aspect);

  // Medimos la relación real del PDF en la página 1
  const onFirstPageLoad = (page) => {
    const w = page.view[2] - page.view[0];
    const h = page.view[3] - page.view[1];
    if (w > 0 && h > 0) setAspect(h / w);
  };

  // Endpoints de navegación (botones)
  const prev = () => flipRef.current?.pageFlip().flipPrev();
  const next = () => flipRef.current?.pageFlip().flipNext();

  // Ajustes finos de sensibilidad al montar
  useEffect(() => {
    const api = flipRef.current?.pageFlip();
    if (!api) return;
    api.update({
      clickEventForward: true, // no voltear por click en el centro
      cornerSize: 40,          // área activa de esquina (px) => más pequeña
      swipeDistance: 80,       // swipe más exigente en touch
      showPageCorners: true,   // muestra pista visual de la esquina
    });
  }, []);

  return (
    <div className="container my-4 book-shell" ref={containerRef}>
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <button className="btn btn-outline-secondary" onClick={prev}>⟵ Anterior</button>
        <div className="fw-semibold text-center flex-grow-1">
          Tip: arrastra una esquina para pasar página
        </div>
        <button className="btn btn-primary" onClick={next}>Siguiente ⟶</button>
      </div>

      <Document
        file={file}
        onLoadSuccess={onDocLoad}
        onLoadError={(e) => console.error("PDF error:", e)}
        loading={<div className="p-4 text-center">Cargando PDF…</div>}
      >
        {numPages && (
          <HTMLFlipBook
            ref={flipRef}
            className="book shadow"
            width={pageWidth}
            height={pageHeight}
            singlePage={true}     // SIEMPRE una sola hoja centrada
            size="fixed"          // respeta estrictamente width/height
            drawShadow
            maxShadowOpacity={0.15}
            useMouseEvents
            mobileScrollSupport
          >
            {Array.from({ length: numPages }, (_, i) => (
              <PagePaper key={i}>
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={i === 0 ? onFirstPageLoad : undefined}
                />
              </PagePaper>
            ))}
          </HTMLFlipBook>
        )}
      </Document>
    </div>
  );
}
