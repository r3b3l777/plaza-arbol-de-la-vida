import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Reveal from './Reveal'

const STATS = [
  { value: '19', label: 'Establecimientos' },
  { value: '4.6★', label: 'Calificación en Google' },
  { value: '16.5', label: 'Horas abierta al día' },
  { value: '100%', label: 'Espíritu metepequense' },
]

export default function Manifesto() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])

  return (
    <section id="plaza" ref={ref} className="relative panel-light py-24 sm:py-36 overflow-hidden">
      <motion.div
        style={{ y }}
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-carbon/5 blur-[120px]"
      />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 text-center">
        <Reveal>
          <p className="font-body text-xs tracking-[0.4em] uppercase text-piedra mb-8">
            Plaza Árbol de la Vida · Metepec
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl leading-tight text-carbon text-balance">
            Más que una plaza,
            <span className="block font-serif italic normal-case tracking-normal"> un destino.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-8 font-body text-lg sm:text-xl font-light text-carbon/75 max-w-3xl mx-auto text-balance leading-relaxed">
            Un espacio diseñado para disfrutar, descubrir y compartir. Aquí
            convergen experiencias, servicios, gastronomía y entretenimiento
            para crear momentos que hacen cada visita especial.
          </p>
        </Reveal>

        <div className="mt-16 sm:mt-24 h-px bg-gradient-to-r from-transparent via-carbon/25 to-transparent" />

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div>
                <p className="font-display text-4xl sm:text-5xl lg:text-6xl text-carbon">{s.value}</p>
                <p className="mt-3 font-body text-xs sm:text-sm tracking-wide uppercase text-piedra">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
