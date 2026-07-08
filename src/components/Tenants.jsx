import { useCallback, useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import { TENANTS } from '../data/site'

export default function Tenants() {
  const trackRef = useRef(null)
  const [progress, setProgress] = useState(0)

  const updateProgress = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? el.scrollLeft / max : 0)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    updateProgress()
    return () => {
      el.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [updateProgress])

  // Tilt 3D siguiendo al cursor (estilo tarjeta de producto premium).
  // El suavizado lo da la transición CSS de .tilt-card; al salir, vuelve solo.
  const handleTiltMove = (e) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`
  }
  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = ''
  }

  const scrollBy = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('article')
    const step = card ? card.offsetWidth + 20 : 360
    el.scrollBy({ left: dir * step * 2, behavior: 'smooth' })
  }

  return (
    <section id="inquilinos" className="relative panel-light py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <Reveal>
              <p className="font-body text-xs tracking-[0.4em] uppercase text-piedra mb-6">
                Nuestros inquilinos
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-carbon text-balance">
                19 establecimientos, un mismo destino
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <p className="font-serif italic text-lg text-piedra">
              Gastronomía · Salud · Belleza · Bienestar · Arte
            </p>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.15}>
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none px-6 sm:px-8 pb-4"
          style={{ scrollPaddingInline: '1.5rem' }}
          role="region"
          aria-label="Carrusel de inquilinos"
          tabIndex={0}
        >
          {TENANTS.map((t) => (
            <article
              key={t.name}
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
              className="tilt-card group snap-start shrink-0 w-[78vw] sm:w-80 rounded-2xl border border-claro bg-blanco p-6 shadow-[0_20px_45px_-30px_rgba(32,37,45,0.35)] hover:border-carbon/30 hover:shadow-[0_28px_55px_-28px_rgba(32,37,45,0.45)]"
            >
              <div className="flex h-40 items-center justify-center rounded-xl bg-white border border-niebla p-6 mb-6">
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                />
              </div>
              <p className="font-body text-[0.65rem] tracking-[0.25em] uppercase text-piedra mb-2">
                {t.tag}
              </p>
              <h3 className="font-display text-xl text-carbon mb-2">{t.name}</h3>
              <p className="font-body text-sm text-carbon/65 leading-relaxed border-l-2 border-carbon/25 pl-3">
                {t.desc}
              </p>
            </article>
          ))}
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 mt-8 flex items-center gap-5">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Inquilinos anteriores"
          className="flex h-11 w-11 min-h-11 items-center justify-center rounded-full border border-carbon/30 text-carbon cursor-pointer transition-colors duration-300 hover:bg-carbon hover:text-blanco"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="relative h-px flex-1 bg-carbon/15" aria-hidden="true">
          <div
            className="absolute inset-y-0 left-0 w-1/4 bg-carbon transition-transform duration-300"
            style={{ transform: `translateX(${progress * 300}%)` }}
          />
        </div>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Siguientes inquilinos"
          className="flex h-11 w-11 min-h-11 items-center justify-center rounded-full border border-carbon/30 text-carbon cursor-pointer transition-colors duration-300 hover:bg-carbon hover:text-blanco"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  )
}
