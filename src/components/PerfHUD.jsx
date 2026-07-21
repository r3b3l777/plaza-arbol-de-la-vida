import { useEffect, useRef } from 'react'

/**
 * Medidor de fluidez para diagnosticar EN EL APARATO REAL. Se activa con
 * `?debug=1`.
 *
 * Muestra los fps del último segundo y el frame MÁS LENTO de ese segundo, que
 * es el dato que de verdad importa: una media de 50 fps con picos de 300 ms se
 * siente rota, mientras que 40 fps estables se sienten bien.
 *
 * Escribe por `textContent` en un rAF, sin estado de React: medir no puede
 * costar renders, o el medidor falsearía lo que mide.
 */
export default function PerfHUD() {
  const ref = useRef(null)

  useEffect(() => {
    let raf = 0
    let frames = 0
    let peor = 0
    let previo = performance.now()
    let corte = previo

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = now - previo
      previo = now
      if (dt > peor) peor = dt
      frames++
      if (now - corte >= 1000) {
        const fps = Math.round((frames * 1000) / (now - corte))
        if (ref.current) {
          ref.current.textContent = `${fps} fps · peor ${peor.toFixed(0)} ms`
          // Verde ≥50, ámbar ≥35, rojo por debajo.
          ref.current.style.color =
            fps >= 50 ? '#7ee0a4' : fps >= 35 ? '#f2d79a' : '#ff8f7c'
        }
        frames = 0
        peor = 0
        corte = now
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '1.1rem',
        transform: 'translateX(-50%)',
        zIndex: 200,
        pointerEvents: 'none',
        font: '600 12px/1 ui-monospace, Menlo, monospace',
        letterSpacing: '0.04em',
        color: '#c6cbd3',
        background: 'rgba(10,13,17,0.82)',
        padding: '7px 12px',
        borderRadius: '999px',
        border: '1px solid rgba(198,203,211,0.25)',
      }}
    >
      midiendo…
    </div>
  )
}
