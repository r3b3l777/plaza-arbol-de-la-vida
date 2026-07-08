import Reveal from './Reveal'
import {
  ADDRESS,
  HOURS,
  MAPS_EMBED,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_TEL,
  SOCIALS,
  WHATSAPP_URL,
} from '../data/site'

const INFO = [
  { label: 'Dirección', value: ADDRESS, link: { href: MAPS_URL, text: 'Cómo llegar →', external: true } },
  { label: 'Horario', value: HOURS, live: true },
  { label: 'Contacto', value: `${PHONE_DISPLAY} · llamadas y WhatsApp`, link: { href: `tel:${PHONE_TEL}`, text: 'Llamar ahora →' } },
]

export default function Visit() {
  return (
    <section id="visita" className="relative py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-plata mb-6">Visítanos</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-blanco text-balance text-protect">
              Te esperamos en el corazón de Metepec
            </h2>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {INFO.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-plata/15 bg-ink/40 p-8 text-center flex flex-col">
                <p className="font-body text-xs tracking-[0.3em] uppercase text-plata mb-4">
                  {item.label}
                </p>
                <p className="font-serif text-lg text-blanco/85 leading-relaxed">{item.value}</p>
                {item.live && (
                  <p className="mt-3 inline-flex items-center justify-center gap-2 font-body text-sm text-blanco/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                    Todos los días de la semana
                  </p>
                )}
                {item.link && (
                  <a
                    href={item.link.href}
                    {...(item.link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="mt-auto pt-4 font-body text-sm text-claro cursor-pointer hover:underline"
                  >
                    {item.link.text}
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Mapa */}
        <Reveal delay={0.15}>
          <div className="mt-12 relative overflow-hidden rounded-2xl border border-plata/15 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)]">
            <iframe
              src={MAPS_EMBED}
              title="Mapa de Plaza Árbol de la Vida"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-96 w-full border-0 grayscale-[0.5] contrast-[1.05]"
            />
            {/* Barra propia bajo el mapa (no tapa controles ni atribución).
                En teléfono lleva un respiro grande (alto + margen derecho)
                para que el botón flotante de WhatsApp nunca la encime. */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-ink/95 border-t border-plata/20 px-5 py-7 pr-24 sm:px-6 sm:py-4 sm:pr-6">
              <div>
                <p className="font-body text-sm font-medium text-blanco">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-niebla animate-pulse mr-2 align-middle" aria-hidden="true" />
                  1 local disponible · 79 m²
                </p>
                <p className="font-body text-xs text-blanco/50 mt-0.5">Para más información escríbenos</p>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs tracking-[0.15em] uppercase text-plata border-b border-plata/50 pb-0.5 cursor-pointer hover:border-plata hover:text-blanco transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-9 h-13 py-3.5 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Ver en Google Maps
            </a>
            <a
              href={SOCIALS[0].href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-9 h-13 py-3.5 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Síguenos
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
