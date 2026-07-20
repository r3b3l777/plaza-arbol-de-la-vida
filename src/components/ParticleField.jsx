import { useEffect, useRef } from 'react'

/**
 * Motas de luz flotantes (canvas 2D) que derivan hacia arriba y reaccionan al
 * mouse: se apartan suavemente cuando el cursor se acerca. Estética de polen /
 * luciérnagas en la paleta plata-cálida de la marca. Solo escritorio con
 * puntero fino; se pausa fuera de pantalla (IntersectionObserver).
 */
const COLORS = ['198,203,211', '219,219,219', '230,224,207'] // plata, claro, perla cálida

export default function ParticleField({ reducedMotion }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (reducedMotion) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const N = 42
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(0.06 + Math.random() * 0.22),
      r: 0.6 + Math.random() * 1.7,
      a: 0.12 + Math.random() * 0.35,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      tw: Math.random() * Math.PI * 2, // fase de titileo
    }))

    const mouse = { x: -9999, y: -9999 }
    // La posición del canvas se guarda y solo se vuelve a medir al hacer
    // scroll/resize: pedir getBoundingClientRect en CADA mousemove obligaba al
    // navegador a recalcular el layout decenas de veces por segundo.
    let rect = canvas.getBoundingClientRect()
    let rectDirty = false
    const remeasure = () => { rectDirty = true } // se aplica en el próximo frame
    const onMove = (e) => {
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    let raf = 0
    let running = true
    const RADIUS = 130 // radio de influencia del cursor

    const tick = (t) => {
      raf = requestAnimationFrame(tick)
      if (!running) return
      if (rectDirty) {
        rect = canvas.getBoundingClientRect()
        rectDirty = false
      }
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        // Repulsión suave del cursor
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < RADIUS * RADIUS) {
          const d = Math.max(12, Math.sqrt(d2))
          const f = ((RADIUS - d) / RADIUS) * 0.6
          p.vx += (dx / d) * f
          p.vy += (dy / d) * f
        }
        p.vx *= 0.96
        p.vy = p.vy * 0.96 - 0.004 // recupera su deriva ascendente
        p.x += p.vx
        p.y += p.vy
        // Envolver bordes
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w }
        if (p.x < -8) p.x = w + 8
        if (p.x > w + 8) p.x = -8
        if (p.y > h + 8) p.y = -8

        const alpha = p.a * (0.7 + 0.3 * Math.sin(t * 0.0012 + p.tw))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.c},${alpha.toFixed(3)})`
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(tick)

    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting
    })
    io.observe(canvas)

    const onResize = () => { resize(); remeasure() }
    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', remeasure, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', remeasure)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
