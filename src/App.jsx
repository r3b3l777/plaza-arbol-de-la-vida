import { lazy, Suspense } from 'react'
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
import CustomCursor from './components/CustomCursor'
import useReducedMotion from './hooks/useReducedMotion'
import useLenis from './hooks/useLenis'

// three.js pesa ~1 MB: se separa en su propio chunk y carga en paralelo,
// por debajo del contenido, sin bloquear el primer render.
const TreeBackground = lazy(() => import('./components/TreeBackground'))

function App() {
  const reducedMotion = useReducedMotion()
  // Smooth scroll con inercia en todo el sitio (nativo si reduced-motion)
  useLenis(!reducedMotion)

  return (
    <>
      {/* Árbol de la Vida 3D — telón continuo fijo detrás de toda la página */}
      <Suspense fallback={null}>
        <TreeBackground reducedMotion={reducedMotion} />
      </Suspense>

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
      <WhatsAppFloat />
      <CustomCursor reducedMotion={reducedMotion} />
    </>
  )
}

export default App
