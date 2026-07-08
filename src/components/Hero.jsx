import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { RATING, WHATSAPP_URL } from '../data/site'
import ParticleField from './ParticleField'

const EASE = [0.16, 1, 0.3, 1]

export default function Hero({ reducedMotion }) {
  const ref = useRef(null)
  // El árbol 3D vive fijo detrás de toda la página (TreeBackground). Aquí el
  // hero es solo la capa de contenido: se desvanece suavemente al abandonarlo.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55, 0.9], [1, 1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.9], [0, -60])

  // Parallax sutil con el mouse: el titular flota hacia el cursor
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 50, damping: 16 })
  const py = useSpring(my, { stiffness: 50, damping: 16 })
  useEffect(() => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 16)
      my.set((e.clientY / window.innerHeight - 0.5) * 12)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [reducedMotion, mx, my])

  return (
    <section
      id="top"
      ref={ref}
      className="relative w-full min-h-dvh min-h-[640px] overflow-hidden"
    >
      {/* Realce local: refuerza legibilidad del texto sobre el árbol */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink pointer-events-none" />

      {/* Motas de luz interactivas: se apartan al acercar el cursor */}
      <div className="absolute inset-0 z-[5]" aria-hidden="true">
        <ParticleField reducedMotion={reducedMotion} />
      </div>

      <motion.div
        style={reducedMotion ? undefined : { opacity: contentOpacity, y: contentY }}
        className="relative z-10 flex min-h-dvh flex-col items-center justify-between px-5 sm:px-8 pt-24 sm:pt-28 pb-8 text-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-[0.65rem] sm:text-xs tracking-[0.3em] uppercase text-blanco/70"
        >
          <span className="text-plata">Metepec · Pueblo Mágico</span>
          <span className="hidden sm:inline text-blanco/30" aria-hidden="true">|</span>
          <span>Abierto · 7:00 – 23:30</span>
          <span className="hidden sm:inline text-blanco/30" aria-hidden="true">|</span>
          <span className="tracking-normal">
            <span className="text-claro" aria-hidden="true">★★★★★</span>{' '}
            {RATING.score} · {RATING.reviews} reseñas
          </span>
        </motion.div>

        <motion.div
          className="max-w-4xl"
          style={reducedMotion ? undefined : { x: px, y: py }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.35 }}
            className="font-display text-[2.6rem] sm:text-6xl lg:text-[5.2rem] leading-[1.04] text-blanco text-balance drop-shadow-[0_2px_30px_rgba(15,18,23,0.6)]"
          >
            El punto de
            <span className="block">encuentro</span>
            <span className="block text-claro">perfecto.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.6 }}
            className="mt-6 sm:mt-8 font-serif italic text-xl sm:text-2xl text-blanco/85 max-w-2xl mx-auto text-balance drop-shadow-[0_2px_20px_rgba(15,18,23,0.6)]"
          >
            Gran ciudad. Plaza exclusiva. Gastronomía, salud, arte y bienestar
            en el corazón de Metepec.
          </motion.p>
        </motion.div>

        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.85 }}
            className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto"
          >
            <a
              href="#inquilinos"
              className="btn-liquid w-full sm:w-auto inline-flex items-center justify-center rounded-full px-9 h-13 py-3.5 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer"
            >
              Descubre la plaza
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid w-full sm:w-auto inline-flex items-center justify-center rounded-full px-9 h-13 py-3.5 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer"
            >
              WhatsApp
            </a>
          </motion.div>

          {/* Cintillo de disponibilidad */}
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 1.1 }}
            href="#renta"
            className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-plata/30 bg-ink/60 backdrop-blur-sm px-5 py-2.5 min-h-11 font-body text-xs sm:text-sm text-blanco/80 cursor-pointer transition-colors duration-300 hover:border-plata"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-niebla animate-pulse" aria-hidden="true" />
            <span>
              <strong className="font-serif italic text-claro font-normal">1 local disponible</strong>
              {' '}· 79 m²
            </span>
            <span className="text-plata" aria-hidden="true">→</span>
          </motion.a>
        </div>
      </motion.div>
    </section>
  )
}
