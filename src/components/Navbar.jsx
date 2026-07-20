import { useEffect, useRef, useState } from 'react'

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
  const [hidden, setHidden] = useState(false)
  const [active, setActive] = useState('')
  const lastY = useRef(0)
  const openRef = useRef(open)
  openRef.current = open

  // Scroll direction → background + auto-hide / reveal.
  useEffect(() => {
    lastY.current = window.scrollY
    let ticking = false

    const update = () => {
      const y = window.scrollY
      setScrolled(y > 40)

      const delta = y - lastY.current
      // Reveal near the top or when scrolling up; hide when scrolling down past the hero.
      if (openRef.current || y < 120) {
        setHidden(false)
      } else if (delta > 6) {
        setHidden(true)
      } else if (delta < -6) {
        setHidden(false)
      }
      lastY.current = y
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1))
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive('#' + visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  return (
    <header
      style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
      className={`fixed top-0 inset-x-0 z-50 will-change-transform transition-[transform,background,border-color,box-shadow,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:!transform-none ${
        scrolled ? 'nav-liquid' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="mx-auto max-w-7xl flex items-center justify-between px-5 sm:px-8 h-16 sm:h-20">
        <a href="#top" className="flex min-w-0 items-center gap-2.5 sm:gap-3 cursor-pointer group" aria-label="Plaza Árbol de la Vida — inicio">
          <img
            src="/img/logo-icon-light.webp"
            alt=""
            width="120"
            height="121"
            style={{ transform: scrolled ? 'scale(0.9)' : 'scale(1)' }}
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg origin-left transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-80 motion-reduce:!transform-none"
          />
          <span className="min-w-0 font-display text-sm sm:text-lg tracking-[0.06em] sm:tracking-[0.08em] text-blanco leading-none">
            <span className="block truncate">Plaza Árbol de la Vida</span>
            <span className="block font-body text-[0.5rem] sm:text-[0.55rem] tracking-[0.35em] sm:tracking-[0.4em] uppercase text-blanco/55 mt-1">
              Metepec
            </span>
          </span>
        </a>

        <ul className="hidden lg:flex items-center gap-9 font-body text-sm tracking-wide text-blanco/75">
          {LINKS.map((l) => {
            const isActive = active === l.href
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative cursor-pointer transition-colors duration-300 hover:text-plata ${
                    isActive ? 'text-plata' : ''
                  }`}
                >
                  {l.label}
                  <span
                    style={{ transform: isActive ? 'scaleX(1)' : 'scaleX(0)' }}
                    className="pointer-events-none absolute -bottom-1.5 left-0 h-px w-full origin-left bg-plata/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  />
                </a>
              </li>
            )
          })}
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
          className="lg:hidden shrink-0 inline-flex items-center justify-center w-11 h-11 min-h-11 cursor-pointer text-blanco"
        >
          <span className="relative block" style={{ width: 24, height: 16 }} aria-hidden="true">
            {['top', 'mid', 'bottom'].map((bar) => (
              <span
                key={bar}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 24,
                  height: 2,
                  borderRadius: 9999,
                  backgroundColor: 'currentColor',
                  transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 300ms cubic-bezier(0.22,1,0.36,1)',
                  transform:
                    bar === 'top'
                      ? open
                        ? 'translate(-50%,-50%) rotate(45deg)'
                        : 'translate(-50%,calc(-50% - 6px))'
                      : bar === 'bottom'
                        ? open
                          ? 'translate(-50%,-50%) rotate(-45deg)'
                          : 'translate(-50%,calc(-50% + 6px))'
                        : 'translate(-50%,-50%)',
                  opacity: bar === 'mid' && open ? 0 : 1,
                }}
                className="motion-reduce:!transition-none"
              />
            ))}
          </span>
        </button>
      </nav>

      {open && (
        <div className="lg:hidden menu-liquid px-5 pb-8 pt-3">
          <ul className="flex flex-col font-serif text-2xl text-blanco/90">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3.5 min-h-11 cursor-pointer border-b border-white/5 hover:text-plata transition-colors ${
                    active === l.href ? 'text-plata' : ''
                  }`}
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
