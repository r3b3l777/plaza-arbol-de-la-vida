/*
 * Encuadre cinematográfico: viñeta suave + grano de película fijo sobre toda
 * la escena (incluido el árbol 3D). No captura punteros y es puramente visual.
 * Se sitúa por encima del contenido (z-40) pero por debajo del navbar (z-50).
 */
export default function CinematicOverlay() {
  return (
    <div
      aria-hidden="true"
      className="cinematic-overlay pointer-events-none fixed inset-0 z-40 overflow-hidden"
    />
  )
}
