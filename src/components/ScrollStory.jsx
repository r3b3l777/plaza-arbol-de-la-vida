import { useEffect, useRef } from 'react'

/**
 * Ducati-style "scrolly" chapter reveal: a tall section with a pinned
 * viewport. As the user scrolls, large editorial statements cross-fade and
 * drift, scrubbed directly to scroll progress. Driven by a passive scroll
 * listener writing to refs (rAF-throttled) — smooth and dependency-free.
 */
// Morph monocromo (paleta oficial): piedra → plata → niebla, sin dorados
const CHAPTERS = [
  { kicker: 'Raíces', line: 'Nacida del barro,', accent: 'forjada en Metepec.', color: '#8f8989' }, // piedra
  { kicker: 'Ramas', line: 'Cada local, una historia;', accent: 'cada visita, un ritual.', color: '#c6cbd3' }, // plata
  { kicker: 'Fruto', line: 'Compras, arte y bienestar', accent: 'en un mismo latido.', color: '#ececec' }, // niebla
]

// Interpolación lineal entre dos colores hex → "r,g,b"
function lerpColor(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16)
  const b = parseInt(h2.slice(1), 16)
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t)
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t)
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t)
  return `${r},${g},${bl}`
}

export default function ScrollStory() {
  const sectionRef = useRef(null)
  const chapterRefs = useRef([])
  const barRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const total = CHAPTERS.length

    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = el.offsetHeight - window.innerHeight
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, scrollable)))

      if (barRef.current) barRef.current.style.transform = `scaleY(${progress})`

      // Morph de color ligado al scroll: el halo central y el riel de
      // progreso funden barro → plata → oro al pasar de capítulo, en sincronía
      // exacta con el scrub (adelante y atrás).
      const seg = Math.min(total - 1, Math.max(0, progress * total - 0.5))
      const i = Math.floor(seg)
      const rgb = lerpColor(CHAPTERS[i].color, CHAPTERS[Math.min(total - 1, i + 1)].color, seg - i)
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(circle, rgba(${rgb},0.16), rgba(${rgb},0.05) 55%, transparent 72%)`
      }
      if (barRef.current) barRef.current.style.background = `rgb(${rgb})`

      const span = 1 / total
      chapterRefs.current.forEach((node, i) => {
        if (!node) return
        const center = i * span + span / 2
        const dist = Math.abs(progress - center)
        // Visible within its slice; fade + drift out beyond it
        const opacity = Math.max(0, 1 - dist / (span * 0.62))
        const y = (progress - center) * -260
        node.style.opacity = opacity.toFixed(3)
        node.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
      })
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="historia" ref={sectionRef} className="relative" style={{ height: '320vh' }}>
      <div className="sticky top-0 h-dvh overflow-hidden flex items-center justify-center">
        {/* Velo oscuro: el árbol 3D recede y los capítulos se leen nítidos */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/70" />
        <div
          ref={glowRef}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(circle, rgba(143,137,137,0.16), rgba(143,137,137,0.05) 55%, transparent 72%)' }}
        />

        {CHAPTERS.map((ch, i) => (
          <div
            key={i}
            ref={(n) => (chapterRefs.current[i] = n)}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 will-change-transform"
            style={{ opacity: 0 }}
          >
            <span className="font-body text-xs tracking-[0.5em] uppercase text-plata mb-6 text-protect">{ch.kicker}</span>
            <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl leading-[1.05] text-blanco max-w-4xl text-balance text-protect">
              {ch.line}
              <span className="block font-serif italic normal-case tracking-normal" style={{ color: ch.color }}>{ch.accent}</span>
            </h2>
          </div>
        ))}

        {/* Ducati-style vertical scroll progress rail */}
        <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 h-40 w-px bg-blanco/10">
          <div ref={barRef} className="absolute inset-x-0 top-0 h-full bg-niebla origin-top" style={{ transform: 'scaleY(0)' }} />
        </div>
      </div>
    </section>
  )
}
