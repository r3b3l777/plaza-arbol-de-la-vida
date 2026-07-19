import { SOCIALS } from '../data/site'

export default function Footer() {
  return (
    <footer className="relative panel-dark border-t border-plata/12 pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center rounded-2xl bg-blanco px-6 py-4">
              <img
                src="/img/logo-lockup-dark.png"
                alt="Plaza Árbol de la Vida · Metepec"
                width="1184"
                height="578"
                className="h-20 w-auto"
                loading="lazy"
              />
            </div>
            <p className="mt-4 font-serif italic text-blanco/50 max-w-sm mx-auto md:mx-0">
              Más que una plaza, un destino. El punto de encuentro perfecto en
              Metepec, Pueblo Mágico.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 font-body text-sm text-blanco/60">
            <a href="#plaza" className="cursor-pointer hover:text-plata transition-colors">La Plaza</a>
            <a href="#inquilinos" className="cursor-pointer hover:text-plata transition-colors">Inquilinos</a>
            <a href="#experiencias" className="cursor-pointer hover:text-plata transition-colors">Experiencias</a>
            <a href="#renta" className="cursor-pointer hover:text-plata transition-colors">Renta tu local</a>
            <a href="#visita" className="cursor-pointer hover:text-plata transition-colors">Ubicación</a>
          </nav>
        </div>

        <div className="mt-12 rule-metal" />

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-blanco/35">
            © {new Date().getFullYear()} Plaza Árbol de la Vida, Metepec. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 font-body text-xs tracking-[0.1em] uppercase text-blanco/40">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer hover:text-plata transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
