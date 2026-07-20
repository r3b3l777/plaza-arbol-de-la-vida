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
import CinematicOverlay from './components/CinematicOverlay'
import StaticBackdrop from './components/StaticBackdrop'
import useReducedMotion from './hooks/useReducedMotion'
import useLenis from './hooks/useLenis'

// three.js pesa ~1 MB: se separa en su propio chunk y carga en paralelo,
// por debajo del contenido, sin bloquear el primer render.
const TreeBackground = lazy(() => import('./components/TreeBackground'))

function App() {
  const reducedMotion = useReducedMotion()
  // Smooth scroll con inercia en todo el sitio (nativo si reduced-motion)
  useLenis(!reducedMotion)

  // El 3D (chunk de three.js + GLB + HDR) no se toca hasta que la página ya
  // está pintada e interactiva. Antes se montaba con un setTimeout fijo y el
  // GLB además se precargaba desde el <head>, así que competía con la primera
  // pintura. Ahora arranca en el primer hueco libre del hilo principal, o en
  // cuanto el usuario entra por la intro — lo que ocurra primero.
  const [mount3D, setMount3D] = useState(false)
  useEffect(() => {
    let done = false
    const start = () => {
      if (done) return
      done = true
      setMount3D(true)
    }
    // requestIdleCallback = "cuando el hilo principal esté libre"; el timeout
    // es la red de seguridad para navegadores ocupados (y Safari, que no lo
    // implementa).
    const ric = window.requestIdleCallback
    const idle = ric ? ric(start, { timeout: 2000 }) : null
    const timer = setTimeout(start, ric ? 2500 : 800)
    // La intro emite este evento al entrar (con o sin sonido).
    window.addEventListener('plaza:enter', start, { once: true })
    return () => {
      done = true
      clearTimeout(timer)
      if (idle != null && window.cancelIdleCallback) window.cancelIdleCallback(idle)
      window.removeEventListener('plaza:enter', start)
    }
  }, [])

  return (
    <>
      {/* Telón estático de marca: se ve desde el primer frame, sin descargas */}
      <StaticBackdrop />

      {/* Árbol de la Vida 3D — telón continuo fijo detrás de toda la página.
          Aparece con un fade sobre el telón estático al estar listo. */}
      {mount3D && (
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
    </>
  )
}

export default App
