import { useEffect } from 'react'
import Lenis from 'lenis'
import Snap from 'lenis/snap'

/**
 * Smooth scroll con inercia (Lenis) para todo el sitio + SNAP por PROXIMIDAD
 * (estilo GSAP snap) integrado con la misma inercia: al detenerte cerca del
 * inicio de una sección, el scroll "encaja" con suavidad. Es proximidad (no
 * obligatorio) → nunca te atrapa dentro de secciones largas.
 *
 * Los anclajes internos (#seccion) se delegan a lenis.scrollTo. Todo se
 * desactiva con prefers-reduced-motion (cae al scroll nativo, sin snap).
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

    // Compensa el nav fijo (~5.5rem) para que la sección no quede bajo la barra
    const navOffset = Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 5.5) || 88

    // SNAP por proximidad a las secciones con id. Las posiciones se RE-MIDEN
    // cada vez que el layout cambia (imágenes/fuentes tardías, resize): un
    // único programador debounced reconstruye los puntos → nunca quedan
    // desalineados con las secciones reales.
    let snap
    let snapTimer
    const buildSnap = () => {
      snap?.destroy()
      snap = new Snap(lenis, {
        type: 'proximity',
        distanceThreshold: '18%',
        duration: 1.0,
        debounce: 450,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      })
      document.querySelectorAll('main section[id]').forEach((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY - navOffset
        snap.add(Math.max(0, Math.round(top)))
      })
    }
    const scheduleSnap = (delay = 250) => {
      clearTimeout(snapTimer)
      snapTimer = setTimeout(buildSnap, delay)
    }
    scheduleSnap(400)
    const onResize = () => scheduleSnap()
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onResize, { once: true })
    // El body crece cuando cargan imágenes lazy → recalibrar puntos de snap
    const ro = new ResizeObserver(() => scheduleSnap())
    ro.observe(document.body)

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const href = a.getAttribute('href')
      if (href.length > 1 && document.querySelector(href)) {
        e.preventDefault()
        lenis.scrollTo(href, { duration: 1.6, offset: -navOffset })
      }
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(snapTimer)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
      document.removeEventListener('click', onClick)
      snap?.destroy()
      if (window.__lenis === lenis) delete window.__lenis
      lenis.destroy()
    }
  }, [enabled])
}
