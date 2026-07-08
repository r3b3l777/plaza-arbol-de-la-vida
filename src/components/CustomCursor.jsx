import { useEffect, useRef } from 'react'

/**
 * Cursor personalizado premium: punto que sigue al mouse al instante y anillo
 * que lo persigue con inercia (lerp en rAF, sin re-renders). Sobre elementos
 * interactivos el anillo se expande.
 *
 * Los nodos SIEMPRE se montan (ocultos en móvil vía CSS): el efecto corre con
 * las refs ya vivas. El cursor nativo solo se oculta cuando el efecto activa
 * la clase `has-custom-cursor`, así jamás queda el puntero invisible.
 */
export default function CustomCursor({ reducedMotion }) {
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    if (reducedMotion) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return
    document.documentElement.classList.add('has-custom-cursor')

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let rx = tx
    let ry = ty
    let visible = false
    let hovering = false
    let pressed = false
    let rs = 1 // escala del anillo, con lerp para que respire en vez de saltar
    let raf = 0

    const paint = () => {
      rx += (tx - rx) * 0.16
      ry += (ty - ry) * 0.16
      const targetScale = pressed ? 0.85 : hovering ? 1.7 : 1
      rs += (targetScale - rs) * 0.14
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%) scale(${hovering ? 0.5 : 1})`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${rs.toFixed(3)})`
      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)

    const show = (v) => {
      visible = v
      const op = v ? '1' : '0'
      dot.style.opacity = op
      ring.style.opacity = op
    }

    const onMove = (e) => {
      tx = e.clientX
      ty = e.clientY
      if (!visible) show(true)
    }
    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, iframe'
    const onOver = (e) => {
      hovering = !!e.target.closest?.(INTERACTIVE)
      ring.style.borderColor = hovering ? 'rgba(250,250,248,0.95)' : 'rgba(198,203,211,0.7)'
    }
    const onDown = () => { pressed = true }
    const onUp = () => { pressed = false }
    const onLeave = () => show(false)

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [reducedMotion])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] hidden md:block">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border-2"
        style={{
          borderColor: 'rgba(198,203,211,0.7)',
          opacity: 0,
          transition: 'opacity 0.3s ease, border-color 0.3s ease',
          mixBlendMode: 'difference',
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-2 w-2 rounded-full bg-blanco"
        style={{
          opacity: 0,
          transition: 'opacity 0.3s ease',
          boxShadow: '0 0 0 1px rgba(20,24,30,0.35), 0 1px 6px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}
