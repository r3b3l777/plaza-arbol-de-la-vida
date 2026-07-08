import { useEffect, useState } from 'react'

const LINKS = [
  { label: 'La Plaza', href: '#plaza' },
  { label: 'Inquilinos', href: '#inquilinos' },
  { label: 'Experiencias', href: '#experiencias' },
  { label: 'Renta tu local', href: '#renta' },
  { label: 'Ubicación', href: '#visita' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
        scrolled ? 'bg-ink/80 backdrop-blur-md border-b border-plata/15' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto max-w-7xl flex items-center justify-between px-5 sm:px-8 h-16 sm:h-20">
        <a href="#top" className="flex items-center gap-3 cursor-pointer group" aria-label="Plaza Árbol de la Vida — inicio">
          <img
            src="/img/logo-icon-light.png"
            alt=""
            width="339"
            height="340"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg transition-opacity duration-300 group-hover:opacity-80"
          />
          <span className="font-display text-base sm:text-lg tracking-[0.08em] text-blanco leading-none">
            Plaza Árbol de la Vida
            <span className="block font-body text-[0.55rem] tracking-[0.4em] uppercase text-blanco/55 mt-1">
              Metepec
            </span>
          </span>
        </a>

        <ul className="hidden lg:flex items-center gap-9 font-body text-sm tracking-wide text-blanco/75">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="cursor-pointer transition-colors duration-300 hover:text-plata">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#visita"
          className="hidden lg:inline-flex items-center justify-center rounded-full border border-plata/50 px-6 h-11 min-h-11 font-body text-sm tracking-wide text-plata cursor-pointer transition-all duration-300 hover:bg-niebla hover:text-carbon"
        >
          Cómo llegar
        </a>

        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 min-h-11 cursor-pointer text-blanco"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="lg:hidden bg-ink/95 backdrop-blur-md border-t border-plata/15 px-5 pb-8 pt-3">
          <ul className="flex flex-col font-serif text-2xl text-blanco/90">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 min-h-11 cursor-pointer border-b border-white/5 hover:text-plata transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#visita"
            onClick={() => setOpen(false)}
            className="mt-6 flex items-center justify-center rounded-full bg-niebla h-12 font-body text-sm tracking-widest uppercase text-carbon cursor-pointer"
          >
            Cómo llegar
          </a>
        </div>
      )}
    </header>
  )
}
