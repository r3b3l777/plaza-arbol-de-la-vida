import Reveal from './Reveal'

const EXPERIENCES = [
  {
    n: '01',
    title: 'Gastronomía',
    desc: 'De la trattoria italiana al asado al carbón, del pan de autor al helado artesanal desde 1977 — sabores para reunirse y celebrar.',
    icon: (
      <>
        <path d="M6 3v8a2 2 0 0 0 2 2v8M6 3v5m3-5v5M18 3c-1.5 0-2 3-2 5v4h2v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    n: '02',
    title: 'Salud',
    desc: 'Laboratorio clínico, farmacia y odontología integral: el cuidado de tu familia resuelto en una sola visita.',
    icon: (
      <>
        <path d="M12 21s-7-4.6-9.2-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.2 12C19 16.4 12 21 12 21Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M8 12h2.2l1.2-2.4 1.4 4 1.2-1.6H16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    n: '03',
    title: 'Belleza & Bienestar',
    desc: 'Spa, barbería clásica, salón de belleza, pilates y gimnasio funcional para un estilo de vida en equilibrio.',
    icon: (
      <>
        <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 8v6m0 0l-4 6m4-6l4 6M7 11l5 1 5-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    n: '04',
    title: 'Arte & Galería',
    desc: 'La galería de Irma Aguilar y activaciones culturales dan voz a artistas locales durante todo el año.',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="9" r="1.6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 17l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
]

export default function Experiences() {
  return (
    <section id="experiencias" className="relative py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-plata mb-6">
              Experiencias
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-blanco text-balance">
              Un solo lugar, cuatro formas de vivirlo
            </h2>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-plata/12 border border-plata/12 rounded-2xl overflow-hidden panel-dark">
          {EXPERIENCES.map((e, i) => (
            <Reveal key={e.title} delay={(i % 2) * 0.1} className="bg-carbon/35">
              <article className="group relative h-full p-8 sm:p-12 cursor-pointer transition-colors duration-500 hover:bg-graphite/70">
                <div className="flex items-start justify-between mb-8">
                  <span className="text-plata w-10 h-10">
                    <svg viewBox="0 0 24 24" fill="none" width="40" height="40" aria-hidden="true">
                      {e.icon}
                    </svg>
                  </span>
                  <span className="font-serif text-2xl text-plata/40 group-hover:text-plata transition-colors duration-500">
                    {e.n}
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl text-blanco mb-3">{e.title}</h3>
                <p className="font-body text-blanco/60 leading-relaxed max-w-md">{e.desc}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-body text-sm tracking-wide text-plata opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  Explorar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
