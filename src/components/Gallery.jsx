import Reveal from './Reveal'
import { GALLERY } from '../data/site'

export default function Gallery() {
  const big = GALLERY.find((g) => g.big)
  const rest = GALLERY.filter((g) => !g.big)

  return (
    <section id="galeria" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-2xl mb-14">
          <Reveal>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-plata mb-6">Galería</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-blanco text-balance text-protect">
              Un recorrido por la plaza
            </h2>
          </Reveal>
        </div>

        {/*
         * Las fotos del recorrido son VERTICALES (≈2:3 y 4:5): cada una vive
         * en un marco vertical 3:4 para no decapitar fachadas ni letreros.
         * En lg la principal (lobby) ancla la columna izquierda a doble
         * altura y las cuatro restantes completan una retícula 3×2 exacta.
         */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {big && (
            <Reveal className="sm:row-span-2 min-h-0">
              <figure className="group relative h-full overflow-hidden rounded-2xl aspect-[4/5] sm:aspect-auto">
                <img
                  src={big.src}
                  alt={big.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <figcaption className="absolute bottom-5 left-5 font-body text-xs tracking-[0.2em] uppercase text-blanco">
                  {big.caption}
                </figcaption>
              </figure>
            </Reveal>
          )}
          {rest.map((g, i) => (
            <Reveal key={g.src} delay={0.08 * (i + 1)}>
              <figure className="group relative h-full overflow-hidden rounded-2xl aspect-[3/4]">
                <img
                  src={g.src}
                  alt={g.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <figcaption className="absolute bottom-5 left-5 font-body text-xs tracking-[0.2em] uppercase text-blanco">
                  {g.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
