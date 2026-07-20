import { useEffect, useState } from 'react'

/**
 * Audio de marca (ElevenLabs) compartido por toda la página:
 *  - ambient: score cinematográfico en loop
 *  - shimmer: capa de brillo cuyo volumen sigue la profundidad del scroll
 *  - vo: voz de marca (bienvenida)
 *  - riser: barrido de transición al levantar la cortina de la intro
 *
 * Nada se reproduce sin un gesto del usuario (política de autoplay). El estado
 * vive fuera de React para sobrevivir a la intro y alimentar el toggle
 * flotante; useSoundState() lo puentea a React.
 *
 * Los cuatro mp3 suman ~688 KB y NO se descargan al montar: `preload = 'none'`
 * hace que cada uno empiece a bajar en su primer play(), es decir, solo si el
 * usuario elige "Entrar con sonido" o activa el toggle flotante.
 */
const AMBIENT_SRC = '/audio/ambient-plaza.mp3'
const SHIMMER_SRC = '/audio/shimmer.mp3'
const VO_SRC = '/audio/marca-vo.mp3'
const RISER_SRC = '/audio/riser.mp3'

const audioStore = {
  ambient: null,
  shimmer: null,
  vo: null,
  riser: null,
  on: false,
  scrollBound: false,
  listeners: new Set(),
}

function bindScrollShimmer() {
  if (audioStore.scrollBound || typeof window === 'undefined') return
  audioStore.scrollBound = true
  const onScroll = () => {
    const sh = audioStore.shimmer
    if (!sh || !audioStore.on) return
    const h = document.documentElement.scrollHeight - window.innerHeight
    const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0
    // Campana: silencio arriba, máximo en el zoom profundo, baja al fondo
    const bell = Math.sin(Math.min(1, p / 0.86) * Math.PI)
    sh.volume = 0.05 + bell * 0.26
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

export function ensureAudio() {
  if (typeof Audio === 'undefined') return
  if (!audioStore.ambient) {
    const a = new Audio(AMBIENT_SRC)
    a.loop = true
    a.volume = 0
    a.preload = 'none'
    audioStore.ambient = a
  }
  if (!audioStore.shimmer) {
    const sh = new Audio(SHIMMER_SRC)
    sh.loop = true
    sh.volume = 0
    sh.preload = 'none'
    audioStore.shimmer = sh
  }
  if (!audioStore.vo) {
    const v = new Audio(VO_SRC)
    v.volume = 0.92
    v.preload = 'none'
    audioStore.vo = v
  }
  if (!audioStore.riser) {
    const r = new Audio(RISER_SRC)
    r.volume = 0.42
    r.preload = 'none'
    audioStore.riser = r
  }
}

export function fadeTo(el, target, ms = 1400) {
  if (!el) return
  const start = el.volume
  const t0 = performance.now()
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms)
    el.volume = start + (target - start) * k
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function setSound(on, ambientTarget = 0.34) {
  ensureAudio()
  audioStore.on = on
  const { ambient, shimmer } = audioStore
  if (!ambient) return
  if (on) {
    bindScrollShimmer()
    ambient.play().then(() => fadeTo(ambient, ambientTarget)).catch(() => {})
    shimmer?.play().then(() => fadeTo(shimmer, 0.1, 1600)).catch(() => {})
  } else {
    fadeTo(ambient, 0, 500)
    fadeTo(shimmer, 0, 500)
    setTimeout(() => {
      ambient.pause()
      shimmer?.pause()
    }, 520)
  }
  audioStore.listeners.forEach((fn) => fn(on))
}

/**
 * Secuencia de entrada cinematográfica (gesto del usuario requerido):
 * riser al levantar la cortina → voz de marca sobre el riser → el ambiente
 * entra "ducked" (bajo) y florece a volumen pleno cuando la voz termina.
 */
export function playEntrySequence() {
  ensureAudio()
  const { vo, riser } = audioStore
  riser?.play().catch(() => {})
  setSound(true, 0.12)
  if (vo) {
    vo.onended = () => {
      if (audioStore.on) fadeTo(audioStore.ambient, 0.34, 1800)
    }
    setTimeout(() => vo.play().catch(() => {}), 500)
  }
}

export function useSoundState() {
  const [on, setOn] = useState(audioStore.on)
  useEffect(() => {
    const fn = (v) => setOn(v)
    audioStore.listeners.add(fn)
    return () => audioStore.listeners.delete(fn)
  }, [])
  return on
}
