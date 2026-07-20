import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { HERO_PHOTO } from '../data/site'
import useReducedMotion from '../hooks/useReducedMotion'

/**
 * Reveal cinematográfico a mitad de página: la foto real de la plaza entra
 * como un marco pequeño y, conforme el usuario scrollea la sección pinned,
 * escala hasta full-bleed (clip-path scrubbed al scroll). El texto aparece
 * cuando la imagen ya domina la pantalla. Con reduced-motion cae al
 * interludio estático de siempre.
 */
export default function PhotoBreak() {
  const reducedMotion = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Marco → full-bleed: los insets del clip se cierran con el scroll
  const insetV = useTransform(scrollYProgress, [0, 0.55], [22, 0])
  const insetH = useTransform(scrollYProgress, [0, 0.55], [26, 0])
  const radius = useTransform(scrollYProgress, [0, 0.55], [28, 0])
  const clipPath = useMotionTemplate`inset(${insetV}% ${insetH}% round ${radius}px)`
  const imgScale = useTransform(scrollYProgress, [0, 0.7], [1.3, 1.05])
  const imgY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])

  const kickerOpacity = useTransform(scrollYProgress, [0.1, 0.4], [1, 0])
  const textOpacity = useTransform(scrollYProgress, [0.5, 0.72], [0, 1])
  const textY = useTransform(scrollYProgress, [0.5, 0.72], [40, 0])

  if (reducedMotion) {
    return (
      <section className="relative h-[70vh] min-h-105 overflow-hidden">
        <img
          src={HERO_PHOTO}
          alt="Plaza Árbol de la Vida al atardecer"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/30 to-ink/85" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="font-body text-xs tracking-[0.4em] uppercase text-plata mb-6">
            Metepec, Estado de México
          </p>
          <blockquote className="font-display text-3xl sm:text-5xl leading-tight text-blanco max-w-3xl text-balance">
            Un espacio de encuentro
            <span className="font-serif italic normal-case tracking-normal text-claro"> y convivencia.</span>
          </blockquote>
          <p className="mt-6 font-body text-sm text-blanco/70 flex items-center gap-2">
            <span className="text-claro tracking-widest" aria-hidden="true">★★★★★</span>
            4.6 · 62 reseñas en Google
          </p>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="relative" style={{ height: '220vh' }}>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Invitación mientras el marco aún es pequeño */}
        <motion.p
          style={{ opacity: kickerOpacity }}
          className="absolute left-1/2 top-14 -translate-x-1/2 z-0 font-body text-[0.65rem] sm:text-xs tracking-[0.45em] uppercase text-plata/80 text-protect"
        >
          Conoce la plaza
        </motion.p>

        <motion.div style={{ clipPath }} className="absolute inset-0 will-change-[clip-path]">
          <motion.img
            src={HERO_PHOTO}
            alt="Plaza Árbol de la Vida al atardecer"
            /* 820 KB a media página: se difiere y se decodifica fuera del hilo
               principal para que su llegada no corte el scroll */
            loading="lazy"
            decoding="async"
            style={{ scale: imgScale, y: imgY }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/20 to-ink/80" />

          <motion.div
            style={{ opacity: textOpacity, y: textY }}
            className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          >
            <p className="font-body text-xs tracking-[0.4em] uppercase text-plata mb-6">
              Metepec, Estado de México
            </p>
            <blockquote className="font-display text-3xl sm:text-5xl leading-tight text-blanco max-w-3xl text-balance">
              Un espacio de encuentro
              <span className="font-serif italic normal-case tracking-normal text-claro"> y convivencia.</span>
            </blockquote>
            <p className="mt-6 font-body text-sm text-blanco/70 flex items-center gap-2">
              <span className="text-claro tracking-widest" aria-hidden="true">★★★★★</span>
              4.6 · 62 reseñas en Google
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
