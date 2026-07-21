import { useEffect, useRef } from 'react'

/**
 * Versión MÓVIL del árbol: el mismo recorrido, pre-renderizado.
 *
 * Los 40 fotogramas salen del render real a calidad de escritorio —clearcoat,
 * 7 luces, bloom, subdivisión y partículas— capturados de la propia escena. No
 * es una imitación: es el árbol de verdad, revelado.
 *
 * Lo que cambia es el coste. En vivo, cada frame de scroll obliga a sombrear
 * la pantalla entera con un material físico y 7 luces evaluadas por píxel. Aquí
 * el trabajo por frame es `drawImage`: copiar un mapa de bits. Da igual lo
 * complejo que fuera el render original — ya está hecho.
 *
 * A cambio se pierden el giroscopio y el paralaje con el dedo, que en un
 * teléfono son un detalle menor frente a que el scroll vaya fluido.
 */
const N = 40
const SRC = (i) => `/seq/${String(i).padStart(2, '0')}.webp`

export default function TreeSequence({ reducedMotion }) {
  const canvasRef = useRef(null)
  const shellRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })

    const marcos = new Array(N)
    let actual = -99
    let progreso = 0
    let raf = 0
    let vivo = true

    // Tamaño del lienzo. dpr tope 2: por encima de eso solo se copian más
    // píxeles de los que la fuente tiene (los fotogramas son de 468 px de ancho).
    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      actual = -99 // fuerza redibujado
      pedirDibujo()
    }

    // Encaje tipo `object-fit: cover`, calculado a mano porque drawImage no lo
    // hace: se escala por el lado que más falta y se centra el sobrante.
    const pintar = (img) => {
      const cw = canvas.width, ch = canvas.height
      const escala = Math.max(cw / img.width, ch / img.height)
      const w = img.width * escala, h = img.height * escala
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
    }

    // Mezcla de fotogramas contiguos. Con 40 imágenes sueltas el recorrido se
    // ve a saltos —stop-motion—, porque el scroll es continuo y las imágenes no.
    // Dibujando el fotograma actual y encima el siguiente con la opacidad de la
    // fracción, el movimiento se vuelve continuo sin añadir ni un byte. Son dos
    // drawImage por frame: sigue siendo copiar mapas de bits.
    // Bucle CONTINUO con suavizado, igual que hacía la versión 3D.
    //
    // Antes esto se redibujaba solo al recibir un evento de scroll, y en iOS
    // esos eventos llegan a golpes durante el desplazamiento con inercia: el
    // fondo avanzaba a saltos mientras el contenido se movía suave. Eso era el
    // "se salta fotogramas".
    //
    // Ahora un rAF persigue el objetivo con un lerp independiente del framerate
    // (la misma fórmula que la cámara del 3D), así que la posición se
    // interpola en CADA frame aunque el scroll no haya avisado. Cuando alcanza
    // el objetivo el bucle se detiene solo: en reposo no gasta nada.
    let mostrado = 0
    let ultimo = 0
    const dibujar = (ahora) => {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016)
      ultimo = ahora
      const objetivo = Math.min(N - 1, Math.max(0, progreso * (N - 1)))
      const k = 1 - Math.pow(0.0022, dt) // converge igual a 30 y a 120 fps
      mostrado += (objetivo - mostrado) * k
      if (Math.abs(objetivo - mostrado) < 0.004) mostrado = objetivo
      const f = mostrado
      if (Math.abs(f - actual) < 0.008) {
        // Ya está donde debe: se para el bucle hasta el próximo scroll.
        raf = Math.abs(objetivo - mostrado) > 0.004 ? requestAnimationFrame(dibujar) : 0
        return
      }
      raf = requestAnimationFrame(dibujar)
      const i = Math.floor(f)
      const t = f - i
      const a = marcos[i]
      if (!a) return
      actual = f
      ctx.globalAlpha = 1
      pintar(a)
      const b = marcos[Math.min(N - 1, i + 1)]
      if (b && t > 0.02) {
        ctx.globalAlpha = t
        pintar(b)
        ctx.globalAlpha = 1
      }
    }
    const pedirDibujo = () => { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(dibujar) } }

    // === progreso del scroll: misma referencia que el 3D (#visita) ===
    let denom = 1
    const leer = () => {
      progreso = Math.min(1, Math.max(0, window.scrollY / denom))
      pedirDibujo()
    }
    const medirDenom = () => {
      const vh = window.innerHeight
      const visita = document.getElementById('visita')
      const top = visita
        ? visita.getBoundingClientRect().top + window.scrollY - vh * 0.28
        : document.documentElement.scrollHeight - vh
      denom = Math.max(1, top)
      leer()
    }
    let pend = 0
    const programar = () => {
      cancelAnimationFrame(pend)
      pend = requestAnimationFrame(() => { medir(); medirDenom() })
    }

    // === carga ===
    // El primero se pide solo y en cuanto llega se pinta y aparece el fondo.
    // El resto va detrás, en orden, para no abrir 40 conexiones a la vez.
    // `createImageBitmap` decodifica FUERA del hilo principal y devuelve algo
    // que drawImage ya puede copiar sin trabajo extra. Con <img> normal la
    // decodificación cae en el hilo principal justo mientras se hace scroll, y
    // ahí es donde aparecían los tirones: medido con la CPU frenada 6×, los
    // peores frames del recorrido coincidían con las decodificaciones.
    const cargar = async (i) => {
      try {
        const r = await fetch(SRC(i))
        const blob = await r.blob()
        marcos[i] = await createImageBitmap(blob)
      } catch {
        // Navegador sin createImageBitmap (o fallo de red): se cae a <img>.
        await new Promise((resolve) => {
          const img = new Image()
          img.decoding = 'async'
          img.onload = img.onerror = () => { marcos[i] = img; resolve() }
          img.src = SRC(i)
        })
      }
    }

    ;(async () => {
      await cargar(0)
      if (!vivo) return
      medir(); medirDenom()
      if (shellRef.current) shellRef.current.style.opacity = '1'
      for (let i = 1; i < N && vivo; i++) {
        await cargar(i)
        // Si el usuario ya scrolleó hasta aquí, se refresca al vuelo.
        if (Math.round(progreso * (N - 1)) === i) pedirDibujo()
      }
    })()

    window.addEventListener('scroll', leer, { passive: true })
    window.addEventListener('resize', programar)
    window.addEventListener('load', programar)
    const ro = new ResizeObserver(programar)
    ro.observe(document.body)

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pend)
      ro.disconnect()
      window.removeEventListener('scroll', leer)
      window.removeEventListener('resize', programar)
      window.removeEventListener('load', programar)
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
      style={{
        // `100vh`, no `100dvh`: en Safari iOS el dinámico cambia al colapsarse
        // la barra de URL y redimensionaría el lienzo en mitad del scroll.
        height: '100vh',
        opacity: 0,
        transition: reducedMotion ? 'none' : 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        background: '#14181e',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          // Respiración muy lenta para que no se sienta una foto pegada. Es un
          // `transform`, o sea trabajo del compositor: no repinta nada.
          animation: reducedMotion ? 'none' : 'seq-vive 14s ease-in-out infinite',
        }}
      />
      {/* Mismos realces en DOM que la versión 3D */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.65)_100%)]" />
    </div>
  )
}
