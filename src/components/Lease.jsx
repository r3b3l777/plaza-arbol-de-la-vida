import { useState } from 'react'
import Reveal from './Reveal'
import { LEASE_EMAIL, METAL_TEXTURE, METAL_TEXTURE_VIDEO, WHATSAPP_URL } from '../data/site'
import useReducedMotion from '../hooks/useReducedMotion'

const POINTS = [
  'Ubicación de alto tráfico sobre Av. Adolfo López Mateos, con visibilidad garantizada.',
  'Comunidad de 19 negocios ya consolidada: salud, gastronomía, belleza y bienestar.',
  'Acompañamiento cercano de la administración durante todo el proceso.',
]

const FIELD_CLS =
  'w-full border-0 border-b border-carbon/20 bg-transparent px-0.5 py-2.5 font-body text-base text-carbon placeholder:text-carbon/35 focus:outline-none focus:border-carbon transition-colors'

export default function Lease() {
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const reducedMotion = useReducedMotion()

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.reportValidity()) return
    const data = Object.fromEntries(new FormData(form).entries())
    if (data.empresa_web) return // honeypot
    setStatus('sending')
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${LEASE_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Nueva solicitud de renta · Plaza Árbol de la Vida',
          _template: 'table',
          _captcha: 'false',
          nombre: data.nombre,
          celular: data.celular,
          email: data.email,
          giro: data.giro,
          descripcion: data.descripcion,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="renta" className="relative panel-light py-24 sm:py-32 overflow-hidden">
      {/* Cifra protagonista del local disponible */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 mb-20">
        <Reveal>
          <div className="relative overflow-hidden flex flex-col lg:flex-row items-center gap-8 lg:gap-14 rounded-3xl bg-carbon p-8 sm:p-12 shadow-[0_35px_70px_-35px_rgba(32,37,45,0.6)]">
            {/* Textura de metal líquido (IA) animada en video — profundidad
                viva bajo el contenido. Con reduced-motion, imagen estática. */}
            {reducedMotion ? (
              <img
                src={METAL_TEXTURE}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
              />
            ) : (
              <video
                src={METAL_TEXTURE_VIDEO}
                poster={METAL_TEXTURE}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-carbon/90 via-carbon/60 to-carbon/85 pointer-events-none" />
            <p className="relative font-display text-7xl sm:text-8xl leading-none text-blanco">
              79<span className="text-3xl sm:text-4xl align-super text-claro">m²</span>
            </p>
            <div className="relative text-center lg:text-left">
              <h3 className="font-display text-2xl sm:text-3xl text-blanco mb-2">
                Queda un local disponible.
              </h3>
              <p className="font-body text-blanco/65 max-w-md">
                Espacio de 79 m² listo para tu negocio dentro de Plaza Árbol de la Vida.
                Escríbenos por WhatsApp para una respuesta inmediata.
              </p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-liquid lg:ml-auto inline-flex items-center justify-center gap-2 rounded-full px-8 h-13 py-3.5 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap"
            >
              WhatsApp →
            </a>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-20 items-start">
        <div>
          <Reveal>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-piedra mb-6">
              Renta tu local
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight text-carbon text-balance mb-6">
              Súmate a Plaza Árbol de la Vida
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="font-body text-carbon/70 leading-relaxed max-w-md mb-10">
              Completa el formulario y un asesor de la administración te contactará
              en menos de 24 horas por correo, WhatsApp o llamada.
            </p>
          </Reveal>
          <ul className="space-y-6">
            {POINTS.map((p, i) => (
              <Reveal as="li" key={p} delay={0.2 + i * 0.08}>
                <div className="flex gap-4">
                  <span className="font-serif italic text-xl text-piedra shrink-0 w-8">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-body text-sm text-carbon/80 leading-relaxed">{p}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-claro bg-blanco p-7 sm:p-10 shadow-[0_25px_55px_-35px_rgba(32,37,45,0.4)]">
            {status === 'success' ? (
              <div className="text-center py-10" role="status">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-carbon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fafaf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="font-serif text-lg text-carbon/85 max-w-sm mx-auto leading-relaxed">
                  Gracias, recibimos tu información. En menos de 24 horas la
                  administración se comunicará contigo por correo, WhatsApp o llamada.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-7">
                <div>
                  <label htmlFor="leaseNombre" className="block font-body text-[0.65rem] tracking-[0.2em] uppercase text-piedra mb-2">
                    Nombre completo <span className="text-carbon" aria-hidden="true">*</span>
                  </label>
                  <input id="leaseNombre" name="nombre" type="text" autoComplete="name" required minLength={3} className={FIELD_CLS} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                  <div>
                    <label htmlFor="leaseCelular" className="block font-body text-[0.65rem] tracking-[0.2em] uppercase text-piedra mb-2">
                      Celular <span className="text-carbon" aria-hidden="true">*</span>
                    </label>
                    <input id="leaseCelular" name="celular" type="tel" autoComplete="tel" inputMode="tel" required pattern="[0-9+\s-]{10,15}" className={FIELD_CLS} />
                  </div>
                  <div>
                    <label htmlFor="leaseEmail" className="block font-body text-[0.65rem] tracking-[0.2em] uppercase text-piedra mb-2">
                      Correo electrónico <span className="text-carbon" aria-hidden="true">*</span>
                    </label>
                    <input id="leaseEmail" name="email" type="email" autoComplete="email" required className={FIELD_CLS} />
                  </div>
                </div>
                <div>
                  <label htmlFor="leaseGiro" className="block font-body text-[0.65rem] tracking-[0.2em] uppercase text-piedra mb-2">
                    Giro del negocio <span className="text-carbon" aria-hidden="true">*</span>
                  </label>
                  <input id="leaseGiro" name="giro" type="text" required placeholder="Ej. Cafetería, boutique, clínica…" className={FIELD_CLS} />
                </div>
                <div>
                  <label htmlFor="leaseDescripcion" className="block font-body text-[0.65rem] tracking-[0.2em] uppercase text-piedra mb-2">
                    Descripción breve
                  </label>
                  <textarea id="leaseDescripcion" name="descripcion" rows={3} placeholder="Cuéntanos sobre tu negocio y qué buscas en un local." className={`${FIELD_CLS} resize-y min-h-20`} />
                </div>
                <input type="text" name="empresa_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn-liquid-solid w-full inline-flex items-center justify-center rounded-full h-13 min-h-11 font-body text-sm tracking-widest uppercase cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  {status === 'sending' ? 'Enviando…' : 'Enviar solicitud →'}
                </button>

                {status === 'error' && (
                  <p role="alert" className="text-center font-body text-sm text-red-700">
                    Hubo un problema al enviar tu solicitud. Intenta de nuevo o{' '}
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-carbon">
                      escríbenos por WhatsApp
                    </a>.
                  </p>
                )}

                <p className="text-center font-body text-xs text-piedra leading-relaxed">
                  Tus datos se usan únicamente para contactarte sobre este local.
                  ¿Dudas? Escríbenos a{' '}
                  <a href={`mailto:${LEASE_EMAIL}`} className="underline hover:text-carbon transition-colors">
                    {LEASE_EMAIL}
                  </a>
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
