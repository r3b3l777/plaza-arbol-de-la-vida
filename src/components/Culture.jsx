import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Reveal from './Reveal'
import { LOBBY_PHOTO } from '../data/site'

export default function Culture() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1])
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%'])

  return (
    <section id="cultura" ref={ref} className="relative panel-white py-24 sm:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Muro de concreto con el logotipo tallado — foto real de la plaza */}
        <Reveal className="order-2 lg:order-1">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_35px_70px_-40px_rgba(32,37,45,0.55)]">
            <motion.img
              src={LOBBY_PHOTO}
              alt="Muro de concreto con el logotipo de Plaza Árbol de la Vida"
              style={{ scale, y }}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-carbon/75 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="font-serif italic text-blanco text-lg drop-shadow">
                "Un símbolo de progreso, de oportunidades y de la fuerza de nuestra comunidad."
              </p>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-piedra mb-6">
              Arte & Cultura
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-carbon text-balance">
              Una plaza que también es galería
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 font-body text-lg sm:text-xl font-light text-carbon/75 text-balance leading-relaxed">
              Exposiciones, conversatorios y activaciones culturales dan vida a
              nuestros pasillos durante todo el año. Un punto de encuentro para
              artistas, familias y visitantes que buscan algo más que comprar.
            </p>
          </Reveal>

          <ul className="mt-10 space-y-5">
            {[
              'Galería de arte con exposiciones rotativas',
              'Eventos y activaciones cada temporada',
              'Espacios de convivencia y descanso',
            ].map((item, i) => (
              <Reveal as="li" key={item} delay={0.3 + i * 0.08}>
                <div className="flex items-center gap-4">
                  <span className="text-carbon shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="font-body text-carbon/80">{item}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
