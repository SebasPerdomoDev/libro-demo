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
  const viewerRef = useRef(null);

  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(1100);
  const [aspect, setAspect] = useState(0.65);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // NUEVO: detectar si el dispositivo está en modo retrato (para rotar libro a horizontal)
  const [isPortrait, setIsPortrait] = useState(false);

  // medir relación real del PDF
  const onFirstPageLoad = (page) => {
    const w = page.view[2] - page.view[0];
    const h = page.view[3] - page.view[1];
    if (w > 0 && h > 0) setAspect(h / w);
  };

  const onDocLoad = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoaded(true);
    setCurrentPage(0);
  };

  // ✔ Cálculo de tamaño con el espacio REAL disponible del contenedor
  const doResize = () => {
    if (!shellRef.current || !viewerRef.current) return;

    const shell = shellRef.current.getBoundingClientRect();
    // Reserva algo para flechas/indicadores
    const reservedX = 48 * 2 + 16 * 2; // dos flechas + márgenes
    const reservedY = 24 * 2 + 16 * 2; // indicadores + márgenes

    let availW = Math.max(220, Math.floor(shell.width - reservedX));
    let availH = Math.max(180, Math.floor(shell.height - reservedY));

    // Si estamos en retrato y forzamos horizontal con rotación,
    // el ancho disponible pasa a ser la altura del viewport y viceversa.
    if (isPortrait) {
      [availW, availH] = [availH, availW];
    }

    // encajar manteniendo aspecto (landscape)
    let width = Math.min(availW, Math.round(availH / aspect));
    let height = Math.round(width * aspect);
    if (height > availH) {
      height = availH;
      width = Math.round(height / aspect);
    }

    setPageWidth(width);
  };

  // Escuchar resize + orientación
  useEffect(() => {
    const mm = window.matchMedia("(orientation: portrait)");
    const applyOrientation = () => setIsPortrait(mm.matches);
    applyOrientation();
    mm.addEventListener("change", applyOrientation);

    doResize();
    window.addEventListener("resize", doResize);

    return () => {
      mm.removeEventListener("change", applyOrientation);
      window.removeEventListener("resize", doResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  useEffect(() => {
    doResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortrait]);

  const pageHeight = Math.round(pageWidth * aspect);

  const goPrev = () => {
    if (flipRef.current && currentPage > 0) flipRef.current.pageFlip().flipPrev();
  };
  const goNext = () => {
    if (flipRef.current && numPages && currentPage < numPages - 1)
      flipRef.current.pageFlip().flipNext();
  };
  const onFlip = (e) => setCurrentPage(e.data);

  return (
    <div className="book-shell" ref={shellRef}>
      {/* Mensaje solo si prefieres sugerir rotar (lo dejamos pero ahora además rotamos el libro) */}
      {isPortrait && (
        <div className="rotate-msg">
          <span>Mejor horizontal. Ajusté el libro para verse apaisado.</span>
        </div>
      )}

      <div
        className={`flip-wrap ${isPortrait ? "force-landscape" : ""}`}
        ref={viewerRef}
        // var CSS para que la SCSS sepa el tamaño actual del libro
        style={{ "--book-w": `${pageWidth}px`, "--book-h": `${pageHeight}px` }}
      >
        {/* Flechas */}
        <button
          className={`nav-arrow nav-arrow-left${currentPage === 0 ? " disabled" : ""}`}
          onClick={goPrev}
          aria-label="Anterior"
          disabled={currentPage === 0}
        >
          &#8592;
        </button>
        <button
          className={`nav-arrow nav-arrow-right${numPages && currentPage === numPages - 1 ? " disabled" : ""}`}
          onClick={goNext}
          aria-label="Siguiente"
          disabled={numPages && currentPage === numPages - 1}
        >
          &#8594;
        </button>

        <div className="book-viewer-pdf">
          <Document
            file={file}
            onLoadSuccess={onDocLoad}
            onLoadError={(e) => console.error("PDF error:", e)}
            loading={<div className="p-4 text-center">Cargando PDF…</div>}
          >
            {isLoaded && numPages && (
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
                onFlip={onFlip}
                startPage={currentPage}
                style={{ margin: "0 auto" }}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <PagePaper key={i}>
                    <Page
                      pageNumber={i + 1}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={i === 0 ? onFirstPageLoad : undefined}
                      className="book-page"
                    />
                  </PagePaper>
                ))}
              </HTMLFlipBook>
            )}
          </Document>
        </div>

        {/* Guardia esquinas (si la sigues usando, déjala aquí) */}
        {/* <div className="flip-guard" style={{ "--corner": "12px" }}>
          <div className="fg-block fg-center" />
          <div className="fg-block fg-top" />
          <div className="fg-block fg-bottom" />
          <div className="fg-block fg-left" />
          <div className="fg-block fg-right" />
        </div> */}
      </div>

      {isLoaded && numPages && (
        <>
          <div className="page-indicator page-indicator-top">
            Página {currentPage + 1} de {numPages}
          </div>
          <div className="page-indicator page-indicator-bottom">
            Página {currentPage + 1} de {numPages}
          </div>
        </>
      )}
    </div>
  );
}
