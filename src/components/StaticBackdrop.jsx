/**
 * Telón estático de marca. Se pinta en el PRIMER frame, sin descargar nada:
 * es el color de la marca más los mismos dos degradados radiales que
 * TreeBackground dibuja en DOM sobre el canvas.
 *
 * Su función es que la primera pantalla nunca esté vacía ni trabada mientras
 * el chunk de three.js, el GLB y el HDR llegan por detrás. Cuando el árbol 3D
 * tiene su primer frame listo, el canvas hace fade encima de este telón: como
 * el fondo del canvas es exactamente el mismo color, la transición solo suma
 * el árbol, sin cambio de tono ni parpadeo.
 */
export default function StaticBackdrop() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none bg-ink" aria-hidden="true" style={{ height: '100vh' }}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.65)_100%)]" />
    </div>
  )
}
