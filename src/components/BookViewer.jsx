import React, { useRef, useEffect, useState, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const PagePaper = forwardRef(function PagePaper({ children }, ref) {
  return <div ref={ref} className="page-wrapper">{children}</div>;
});

export default function BookViewer({ file = "/libro.pdf" }) {
  const flipRef = useRef(null);
  const shellRef = useRef(null);

  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(1100);
  const [aspect, setAspect] = useState(0.65);

  const CORNER_PX = 14; // ← tamaño real del agujerito de esquina (ajústalo 10–18)

  const onDocLoad = ({ numPages }) => setNumPages(numPages);

  useEffect(() => {
    const handle = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      // Calcula el ancho y alto máximo permitidos
      // Deja un pequeño margen si quieres (ejemplo: 32px)
      const maxWidth = Math.max(300, Math.min(1600, cw - 32));
      const maxHeight = Math.max(300, Math.min(1200, ch - 32));
      // Calcula el ancho basado en el alto y el aspecto
      let width = Math.min(maxWidth, Math.round(maxHeight / aspect));
      let height = Math.round(width * aspect);
      // Si el alto se pasa, ajusta
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height / aspect);
      }
      setPageWidth(width);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [aspect]);

  const pageHeight = Math.round(pageWidth * aspect);

  const onFirstPageLoad = (page) => {
    const w = page.view[2] - page.view[0];
    const h = page.view[3] - page.view[1];
    if (w > 0 && h > 0) setAspect(h / w);
  };

  return (
    <div className="book-shell" ref={shellRef}>
      <div className="flip-wrap">
        {/* Flechas laterales */}
        <button
          className="nav-arrow nav-arrow-left"
          onClick={() => flipRef.current?.pageFlip().flipPrev()}
          aria-label="Anterior"
        >
          &#8592;
        </button>
        <button
          className="nav-arrow nav-arrow-right"
          onClick={() => flipRef.current?.pageFlip().flipNext()}
          aria-label="Siguiente"
        >
          &#8594;
        </button>

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
              singlePage={true}
              size="fixed"
              drawShadow
              maxShadowOpacity={0.15}
              useMouseEvents
              mobileScrollSupport
              disableFlipByClick={true}
              clickEventForward={true}
              showPageCorners={false}
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

        {/* Guardia */}
        <div
          className="flip-guard"
          style={{ "--corner": `${CORNER_PX}px` }}
          aria-hidden="true"
        >
          <div className="fg-block fg-center" />
          <div className="fg-block fg-top" />
          <div className="fg-block fg-bottom" />
          <div className="fg-block fg-left" />
          <div className="fg-block fg-right" />
        </div>
      </div>
    </div>
  );
}
