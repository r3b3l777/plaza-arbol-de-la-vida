import { lazy, Suspense, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import Manifesto from './components/Manifesto'
import ScrollStory from './components/ScrollStory'
import Tenants from './components/Tenants'
import Experiences from './components/Experiences'
import PhotoBreak from './components/PhotoBreak'
import Culture from './components/Culture'
import Gallery from './components/Gallery'
import Lease from './components/Lease'
import Visit from './components/Visit'
import Footer from './components/Footer'
import WhatsAppFloat from './components/WhatsAppFloat'
import SoundToggle from './components/SoundToggle'
import Intro from './components/Intro'
import CustomCursor from './components/CustomCursor'
import PerfHUD from './components/PerfHUD'
import CinematicOverlay from './components/CinematicOverlay'
import StaticBackdrop from './components/StaticBackdrop'
import useReducedMotion from './hooks/useReducedMotion'
import useLenis from './hooks/useLenis'

// three.js pesa ~1 MB: se separa en su propio chunk y carga en paralelo,
// por debajo del contenido, sin bloquear el primer render.
const TreeBackground = lazy(() => import('./components/TreeBackground'))


// Interruptores de diagnóstico, solo por URL:
//   ?no3d=1   monta la página SIN el árbol 3D  → aísla si el 3D es la causa
//   ?debug=1  muestra fps y peor frame del último segundo
const params = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search)
  : new URLSearchParams()
const SIN_3D = params.get('no3d') === '1'
const CON_HUD = params.get('debug') === '1'

function App() {
  const reducedMotion = useReducedMotion()
  // Smooth scroll con inercia en todo el sitio (nativo si reduced-motion)
  useLenis(!reducedMotion)

  // El 3D arranca DURANTE la intro, no al salir de ella.
  //
  // Antes esperaba a un hueco libre del hilo principal (timeout 2000 ms) o al
  // evento de entrada, lo que llegara primero. El problema: la intro se deja
  // pulsar a los 1450 ms, así que quien entraba rápido disparaba el montaje
  // ENTERO —ejecutar el chunk, parsear el GLB, construir materiales, crear el
  // contexto WebGL y compilar shaders— justo encima de la animación de salida
  // de la intro. Ese era el tirón que se notaba al pulsar "Entrar" o al entrar
  // sin sonido.
  //
  // Ahora se monta a los 400 ms, en cuanto la intro ya pintó su primer frame, y
  // la intro no se quita hasta recibir `plaza:3d-listo`. Entre las dos cosas,
  // cuando la intro desaparece no queda nada por cargar.
  const [mount3D, setMount3D] = useState(false)
  useEffect(() => {
    if (SIN_3D) return
    let done = false
    const start = () => {
      if (done) return
      done = true
      setMount3D(true)
    }

    // Los assets del 3D se piden YA, sin esperar a montar nada. Mientras corre
    // la intro de marca (que son un WebP y CSS, casi nada de red) la conexión
    // está ociosa: es el hueco perfecto para bajar el GLB y el HDR. Así, cuando
    // el usuario entra, ya están en la caché HTTP y el componente los encuentra
    // servidos en vez de empezar a pedirlos.
    // El HDR solo lo usa la ruta móvil — escritorio ilumina con Lightformers.
    const assets = ['/models/arbol-logo.glb']
    if (window.matchMedia('(max-width: 767px)').matches) {
      assets.push('/hdr/studio-small.hdr')
    }
    for (const u of assets) {
      // Se consume el cuerpo: si no, la respuesta no termina de entrar en caché.
      // Prioridad baja para no competir con la primera pintura.
      fetch(u, { priority: 'low' }).then((r) => r.arrayBuffer()).catch(() => {})
    }

    // 400 ms: lo justo para que la intro pinte su entrada sin competir con
    // ella. No se espera a `requestIdleCallback` porque durante el arranque el
    // hilo principal nunca está ocioso de verdad, así que en la práctica
    // siempre acababa cayendo en su timeout — tarde.
    const timer = setTimeout(start, 400)
    // Suelo: si alguien entra antes de los 400 ms, se monta en ese momento.
    window.addEventListener('plaza:enter', start, { once: true })
    return () => {
      done = true
      clearTimeout(timer)
      window.removeEventListener('plaza:enter', start)
    }
  }, [])

  return (
    <>
      {/* Telón estático de marca: se ve desde el primer frame, sin descargas */}
      <StaticBackdrop />

      {/* Árbol de la Vida 3D — telón continuo fijo detrás de toda la página.
          Aparece con un fade sobre el telón estático al estar listo. */}
      {mount3D && !SIN_3D && (
        <Suspense fallback={null}>
          <TreeBackground reducedMotion={reducedMotion} />
        </Suspense>
      )}

      {/* Intro cinematográfica de marca (logo + voz/ambiente ElevenLabs) */}
      <Intro reducedMotion={reducedMotion} />

      <Navbar />
      <main className="relative z-10">
        <Hero reducedMotion={reducedMotion} />
        <Marquee />
        <Manifesto />
        <ScrollStory />
        <Tenants />
        <Experiences />
        <PhotoBreak />
        <Culture />
        <Gallery />
        <Lease />
        <Visit />
      </main>
      <Footer />
      <CinematicOverlay />
      <WhatsAppFloat />
      <SoundToggle />
      <CustomCursor reducedMotion={reducedMotion} />
      {CON_HUD && <PerfHUD />}
    </>
  )
}

export default App
