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
import useReducedMotion from './hooks/useReducedMotion'
import useLenis from './hooks/useLenis'

// three.js pesa ~1 MB: se separa en su propio chunk y carga en paralelo,
// por debajo del contenido, sin bloquear el primer render.
const TreeBackground = lazy(() => import('./components/TreeBackground'))

function App() {
  const reducedMotion = useReducedMotion()
  // Smooth scroll con inercia en todo el sitio (nativo si reduced-motion)
  useLenis(!reducedMotion)

  // Montamos el árbol 3D (pesado: subdivisión + shaders + post) un instante
  // DESPUÉS del primer render → la entrada de la intro corre fluida y el 3D se
  // inicializa detrás del overlay, listo cuando la cortina se levanta.
  const [mount3D, setMount3D] = useState(false)
  useEffect(() => {
    // 900ms: después de que el texto de la intro aterrizó (~1.2s de animación
    // ligera) pero antes de que la cortina pueda levantarse (~2.5s) — el init
    // del 3D nunca compite con la animación visible.
    const id = setTimeout(() => setMount3D(true), 900)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      {/* Árbol de la Vida 3D — telón continuo fijo detrás de toda la página */}
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
