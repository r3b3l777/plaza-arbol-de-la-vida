import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Smooth scroll con inercia (Lenis) para todo el sitio. Los anclajes internos
 * (#seccion) se delegan a lenis.scrollTo para conservar el desplazamiento
 * suave. Desactivado con prefers-reduced-motion (cae al scroll nativo).
 */
export default function useLenis(enabled) {
  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({ lerp: 0.1 })
    window.__lenis = lenis

    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const href = a.getAttribute('href')
      if (href.length > 1 && document.querySelector(href)) {
        e.preventDefault()
        lenis.scrollTo(href, { duration: 1.6 })
      }
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('click', onClick)
      if (window.__lenis === lenis) delete window.__lenis
      lenis.destroy()
    }
  }, [enabled])
}
