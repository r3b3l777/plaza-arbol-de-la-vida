import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playEntrySequence } from '../lib/brandAudio'
import { BRAND_TREE, BRAND_TREE_SIZE } from '../data/site'

/**
 * Intro cinematográfica de marca. Se muestra en cada carga/refresh: el árbol
 * del logotipo se revela con un barrido metálico, el wordmark asciende en
 * escalón y una línea de progreso llena el encuadre. Al entrar con el gesto
 * del usuario suena la secuencia de marca (ElevenLabs): riser → voz →
 * ambiente. El audio NUNCA se fuerza en autoplay; el fondo/Escape entran en
 * silencio y el toggle flotante queda disponible.
 */
const WORD = 'Plaza Árbol de la Vida'

export default function Intro({ reducedMotion }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    if (reducedMotion) return false
    if (new URLSearchParams(window.location.search).has('nointro')) return false
    // Se muestra en CADA carga y refresh (no se cachea por sesión)
    return true
  })
  const [ready, setReady] = useState(false) // animación terminó → invita a entrar
  const dismissedRef = useRef(false)

  const dismiss = useCallback((withSound) => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    if (withSound) playEntrySequence()
    // Señal para que App monte el árbol 3D ya mismo si aún no lo hizo.
    window.dispatchEvent(new Event('plaza:enter'))
    setOpen(false)
  }, [])

  // Marca la animación como lista para invitar a entrar. El audio ya NO se
  // pre-carga aquí: eran ~688 KB compitiendo con la primera pintura. Los mp3
  // empiezan a bajar en el gesto de "Entrar con sonido" (ver brandAudio).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setReady(true), 1450)
    return () => clearTimeout(t)
  }, [open])

  // Escape = entrar en silencio (accesibilidad)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  // Cierre suave en silencio si el usuario no interactúa
  useEffect(() => {
    if (!open || !ready) return
    const t = setTimeout(() => dismiss(false), 6000)
    return () => clearTimeout(t)
  }, [open, ready, dismiss])

  // Bloquea el scroll mientras la intro está en pantalla
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="intro"
          className="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 1.05, ease: [0.76, 0, 0.24, 1] } }}
          onClick={() => (ready ? dismiss(false) : null)}
          role="dialog"
          aria-label="Bienvenida — Plaza Árbol de la Vida"
        >
          <div className="intro-glow" aria-hidden="true" />

          <div className="intro-stage">
            <motion.div
              className="intro-tree-wrap"
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(5px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={BRAND_TREE}
                alt=""
                width={BRAND_TREE_SIZE.w}
                height={BRAND_TREE_SIZE.h}
                className="intro-tree"
                draggable="false"
                fetchPriority="high"
              />
              <span className="intro-sheen" aria-hidden="true" />
            </motion.div>

            <div className="intro-word" aria-hidden="true">
              {WORD.split(' ').map((w, i) => (
                <motion.span
                  key={w + i}
                  className="intro-word-part"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{ duration: 0.75, delay: 0.22 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </div>
            <motion.p
              className="intro-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              Metepec
            </motion.p>

            <motion.div
              className="intro-progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.35, ease: [0.4, 0, 0.2, 1] }}
            />

            <AnimatePresence>
              {ready && (
                <motion.button
                  type="button"
                  className="intro-enter"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    dismiss(true)
                  }}
                >
                  <span className="intro-enter-dot" aria-hidden="true" />
                  Entrar con sonido
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {ready && (
            <span className="intro-skip" aria-hidden="true">
              o toca para entrar en silencio
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
