import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, Sparkles, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { LoopSubdivision } from 'three-subdivide'
import * as THREE from 'three'

/**
 * Árbol de la Vida = LOGOTIPO de la plaza en 3D (relieve extruido) como telón
 * fijo detrás de toda la página, con acabado cromo/peltre pulido.
 *
 * Recorrido por scroll estilo "Uncut Gems": la cámara se hunde en el árbol en
 * un zoom microscópico cinematográfico; a la vez suben la iridiscencia, unas
 * luces de color (magenta/cian/oro), el bloom y una aberración cromática →
 * un interior de gema hipnótico. Al llegar a la sección "Visítanos" (#visita)
 * la cámara retrocede y el LOGO se FORMA de frente y se queda ahí (vivo, no
 * congelado). Todo se comparte vía `scrollRef`.
 */
const MODEL = '/models/arbol-logo.glb'

// Progreso → factores del recorrido. `gem` es la campana del zoom profundo
// (0 arriba, 1 en el punto microscópico, 0 al formarse) que dispara el look gema.
function phases(p) {
  const zoomRaw = Math.min(1, p / 0.86)
  const zoom = zoomRaw * zoomRaw * (3 - 2 * zoomRaw)
  const revRaw = Math.max(0, (p - 0.86) / 0.14)
  const reveal = revRaw * revRaw * (3 - 2 * revRaw)
  const gem = Math.sin(zoomRaw * Math.PI) // campana
  return { zoom, reveal, gem }
}

/**
 * Micro-polvo: nube de motas que flotan en el volumen del árbol. De lejos casi
 * imperceptibles; en el zoom profundo se revelan como partículas microscópicas.
 */
function MicroDust({ reducedMotion }) {
  const ref = useRef()
  const { positions, phasesArr } = useMemo(() => {
    const N = 1100
    const positions = new Float32Array(N * 3)
    const phasesArr = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6
      phasesArr[i] = Math.random() * Math.PI * 2
    }
    return { positions, phasesArr }
  }, [])

  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    const t = state.clock.elapsedTime
    const arr = ref.current.geometry.attributes.position.array
    for (let i = 0; i < phasesArr.length; i++) {
      const ph = phasesArr[i]
      arr[i * 3] += Math.sin(t * 0.25 + ph) * 0.00035
      arr[i * 3 + 1] += Math.cos(t * 0.2 + ph * 1.3) * 0.00045
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    ref.current.rotation.y = Math.sin(t * 0.05) * 0.1
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        sizeAttenuation
        color="#e6ecf6"
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function LogoTree({ reducedMotion, scrollRef, pointerRef }) {
  const group = useRef()
  const inner = useRef()
  const { scene } = useGLTF(MODEL)
  const { viewport, camera } = useThree()

  // Clona la escena y aplica material cromo-gema (iridiscencia fuerte) + normales
  const { model, aspect } = useMemo(() => {
    const s = scene.clone(true)
    // Acabado LUXURY con un toque DIAMANTE, consistente Safari/Chrome:
    // se evitan iridescence/anisotropy (extensiones KHR que Safari renderiza
    // distinto). El brillo de gema viene de un clearcoat cristalino + un
    // realce especular fino — sobrio, sin exagerar.
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#c4cbd6',
      metalness: 0.9,
      roughness: 0.3, // satinado con un punto más de nitidez de facetas
      clearcoat: 1.0, // capa cristalina tipo diamante
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.25,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#ffffff'),
      sheen: 0.3,
      sheenColor: new THREE.Color('#e2c087'), // sheen dorado suave
    })
    // Subdivisión (Loop) → muchos más polígonos: superficie ultra suave y
    // detallada, clave en el zoom microscópico (sin facetas). Antes se saltaba
    // en móvil y por eso el árbol se veía POLIGONAL en el iPhone mientras en
    // Chrome salía liso; ahora es el mismo paso en ambos.
    const iters = 1
    s.traverse((o) => {
      if (o.isMesh) {
        let g = o.geometry
        if (iters > 0) {
          g = LoopSubdivision.modify(g, iters, {
            split: true,
            uvSmooth: true,
            preserveEdges: false,
            maxTriangles: 250000,
          })
        }
        g.computeVertexNormals()
        o.geometry = g
        o.material = mat
      }
    })
    const box = new THREE.Box3().setFromObject(s)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    s.position.sub(center)
    const k = 1 / (size.y || 1)
    const wrap = new THREE.Group()
    wrap.add(s)
    wrap.scale.setScalar(k)
    // Proporción ancho/alto ya normalizada (alto = 1): sirve para encuadrar.
    return { model: wrap, aspect: size.x / (size.y || 1) }
  }, [scene])

  // Encuadre. En escritorio se conserva el tamaño de siempre (1.488). En
  // pantallas angostas (iPhone en vertical) ese tamaño deja el árbol cortado
  // por los lados, así que ahí se ajusta al ANCHO disponible para que entre
  // completo. `viewport` está medido en el plano z=0 de la cámara.
  const baseScale = Math.min(2.4 * 0.62, (viewport.width * 0.94) / (aspect || 1))
  // Al reducirlo para que quepa a lo ancho, el árbol se iría al borde inferior
  // del encuadre (la cámara mira desde arriba): se sube hacia el centro en la
  // misma proporción en que se encogió.
  const lift = Math.max(0, 2.4 * 0.62 - baseScale) * 0.36

  useFrame((state, delta) => {
    if (!group.current || !inner.current) return
    const t = state.clock.elapsedTime
    const p = scrollRef.current
    const k = 1 - Math.pow(0.0022, delta)
    const { zoom, reveal, gem } = phases(p)
    const live = reducedMotion ? 0 : 1

    // === CÁMARA — vuelo cinematográfico ===
    // Dolly de acercamiento (microscópico) y pull-back de revelación
    const zIn = 1.75 - zoom * 1.42 //  1.75 (lejos) → 0.33 (microscópico)
    const zCam = zIn * (1 - reveal) + 3.35 * reveal
    camera.position.z += (zCam - camera.position.z) * k * 0.9

    // Órbita lateral: arco alrededor del árbol durante la inmersión (máximo a
    // media profundidad, vuelve al centro al formarse) + micro-vaivén de
    // "cámara en mano" que crece con la profundidad → vuelo, no travelling.
    const hand = live * (Math.sin(t * 0.9) * 0.011 + Math.sin(t * 1.7 + 2) * 0.005) * (0.35 + gem)
    // Paralaje suave de cámara con el cursor (además del giro del modelo)
    const camPar = live * pointerRef.current.x * 0.13
    const camX = (Math.sin(zoom * Math.PI * 0.9) * 0.5 + hand) * (1 - reveal) + camPar
    camera.position.x += (camX - camera.position.x) * k * 0.9

    const handY = live * (Math.sin(t * 0.7 + 1) * 0.009 + Math.sin(t * 1.4) * 0.004) * (0.35 + gem)
    const travelY = (0.55 - zoom * 1.15 + handY) * (1 - reveal)
    camera.position.y += (travelY - camera.position.y) * k * 0.9
    const lookY = (0.35 - zoom * 0.95) * (1 - reveal)
    camera.lookAt(0, lookY, 0)

    // Dolly-zoom sutil (vértigo Hitchcock): el FOV se abre en lo más profundo
    // y se recompone al formarse el logo.
    const fovT = 42 + gem * 6 * (1 - reveal)
    camera.fov += (fovT - camera.fov) * k
    camera.updateProjectionMatrix()

    // === MODELO — siempre animado ===
    // Turntable: el vaivén de giro se AMPLIFICA durante la inmersión (el árbol
    // rota visiblemente mientras lo recorres) y vuelve a sutil al formarse.
    const idleY = live * Math.sin(t * 0.22) * (0.055 + 0.22 * gem)
    const idleX = live * Math.sin(t * 0.17 + 1.1) * 0.03
    const drift = live * Math.sin(t * 0.18) * 0.12
    // Puntero: el canvas es `pointer-events: none`, así que `state.pointer`
    // nunca se actualiza. El movimiento con el cursor viene de `pointerRef`,
    // que se alimenta de un listener en la ventana (-1..1 en cada eje).
    const px = pointerRef.current.x
    const py = pointerRef.current.y
    const journeyY = (-0.35 + zoom * 0.5 + drift) * (1 - reveal)
    const targetY = journeyY + idleY + px * 0.32
    group.current.rotation.y += (targetY - group.current.rotation.y) * k
    const targetX = (0.08 * (1 - zoom)) * (1 - reveal) + idleX - py * 0.18
    group.current.rotation.x += (targetX - group.current.rotation.x) * k
    const targetZ = live * Math.sin(t * 0.42 + 0.6) * 0.02
    group.current.rotation.z += (targetZ - group.current.rotation.z) * k

    // Respiración de escala, más profunda dentro del árbol
    const breathe = 1 + live * Math.sin(t * 0.6) * (0.012 + 0.016 * gem * (1 - reveal))
    const target = baseScale * breathe
    const cur = inner.current.scale.x
    inner.current.scale.setScalar(cur + (target - cur) * k)
  })

  return (
    <group ref={group}>
      <group ref={inner} scale={baseScale} position-y={lift}>
        <primitive object={model} />
      </group>
    </group>
  )
}

// Luz especular que orbita → un brillo recorre el metal (detalle continuo)
function OrbitingHighlight({ reducedMotion }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = reducedMotion ? 0.7 : state.clock.elapsedTime
    ref.current.position.set(Math.cos(t * 0.35) * 4, 1.5 + Math.sin(t * 0.5) * 1.5, Math.sin(t * 0.35) * 4 + 1.5)
  })
  return <pointLight ref={ref} intensity={12} distance={12} decay={1.6} color="#ffffff" />
}

// Iluminación LUXURY de joyería: split cálido (champán) / frío (platino) que
// orbita e intensifica CON SUTILEZA en el zoom profundo. Sin colores saturados.
function LuxuryLights({ scrollRef }) {
  const warm = useRef(), cool = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { gem } = phases(scrollRef.current)
    const I = 8 + gem * 13 // realce contenido y sobrio
    if (warm.current) {
      warm.current.intensity = I * 1.25 // el dorado manda un poco
      warm.current.position.set(Math.cos(t * 0.28) * 3, 1.6 + Math.sin(t * 0.3) * 1.2, 2 + Math.sin(t * 0.28) * 0.6)
    }
    if (cool.current) {
      cool.current.intensity = I * 0.75
      cool.current.position.set(Math.cos(t * 0.28 + Math.PI) * 3, 1.2 + Math.cos(t * 0.32) * 1.2, 2 + Math.cos(t * 0.28) * 0.6)
    }
  })
  return (
    <group>
      <pointLight ref={warm} distance={11} decay={1.5} color="#f4ce88" />
      <pointLight ref={cool} distance={11} decay={1.5} color="#e2e9f4" />
    </group>
  )
}

// Anima el post-procesado con la profundidad del zoom: más bloom y aberración
// cromática cuando el zoom es microscópico → sensación de lente de cine / gema.
// Solo modula el bloom con la profundidad (glow contenido). Sin aberración
// cromática dinámica → nada de franjas RGB.
function FXDriver({ scrollRef, bloomRef }) {
  useFrame(() => {
    const { gem } = phases(scrollRef.current)
    if (bloomRef.current) bloomRef.current.intensity = 0.24 + gem * 0.28
  })
  return null
}

export default function TreeBackground({ reducedMotion }) {
  const [isMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Progreso de scroll compartido (0 arriba → 1 al formarse en #visita)
  const scrollRef = useRef(0)
  useEffect(() => {
    const read = () => {
      const doc = document.documentElement
      const vh = window.innerHeight
      const visit = document.getElementById('visita')
      let targetTop
      if (visit) {
        // Se forma cuando el encabezado "Te esperamos en el corazón de Metepec"
        // (arriba de #visita) ya está en pantalla — no antes.
        const top = visit.getBoundingClientRect().top + window.scrollY
        targetTop = top - vh * 0.28
      } else {
        targetTop = doc.scrollHeight - vh
      }
      const denom = Math.max(1, targetTop)
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / denom))
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  // Cursor normalizado (-1..1). Se escucha en la VENTANA porque el canvas es
  // `pointer-events: none` y nunca recibiría eventos por su cuenta.
  const pointerRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (reducedMotion) return
    const onMove = (e) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onLeave = () => {
      pointerRef.current.x = 0
      pointerRef.current.y = 0
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [reducedMotion])

  const bloomRef = useRef()
  const frameloop = reducedMotion || !visible ? 'demand' : 'always'

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" style={{ height: '100dvh' }}>
      <Canvas
        dpr={[1, isMobile ? 2 : 1.85]}
        camera={{ position: [0, 0.55, 1.75], fov: 42 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          // Pipeline de color EXPLÍCITO → mismo render en Safari y Chrome.
          // Exposición +15%: iguala el look plateado luminoso de Safari (el
          // que gustó) también en Chrome.
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        frameloop={frameloop}
      >
        <color attach="background" args={['#14181e']} />
        <fog attach="fog" args={['#14181e', 6, 13]} />
        <ambientLight intensity={0.42} />
        <hemisphereLight args={['#cfe0ff', '#1b2028', 0.6]} />
        <spotLight position={[5, 8, 5]} angle={0.5} penumbra={0.9} intensity={52} color="#fff2df" />
        <pointLight position={[-5, 2, -3]} intensity={15} color="#9fb2cc" />
        <pointLight position={[0, 2, -6]} intensity={13} color="#dfe7f5" />
        <pointLight position={[3, -2, 4]} intensity={9} color="#eaf0ff" />
        <directionalLight position={[2, 3, 5]} intensity={0.9} color="#ffffff" />
        <OrbitingHighlight reducedMotion={reducedMotion} />
        {!reducedMotion && <LuxuryLights scrollRef={scrollRef} />}

        <Suspense fallback={null}>
          <Float speed={reducedMotion ? 0 : 0.7} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.15}>
            <LogoTree reducedMotion={reducedMotion} scrollRef={scrollRef} pointerRef={pointerRef} />
          </Float>
          {!isMobile && <MicroDust reducedMotion={reducedMotion} />}
          {!reducedMotion && (
            <Sparkles count={70} scale={[7, 9, 4]} size={1.4} speed={0.2} color="#dbe3f0" opacity={0.4} />
          )}
          {isMobile ? (
            // iOS/WebKit (Safari y Chrome iOS) no genera bien el envMap desde una
            // escena (cube render target half-float) → el metal sale MATE. Un HDR
            // sí funciona en iOS y devuelve el brillo metálico.
            //
            // El HDR se sirve desde ESTE dominio: `preset="studio"` lo bajaba de
            // raw.githack.com (1.7 MB, CDN de terceros con límite de tasa), así
            // que en el teléfono el árbol se quedaba mate hasta que llegara —o
            // para siempre si fallaba.
            <Environment files="/hdr/studio-small.hdr" environmentIntensity={1.2} />
          ) : (
            <Environment resolution={128} environmentIntensity={1.0}>
              <color attach="background" args={['#0b0e12']} />
              <Lightformer intensity={3.2} form="rect" position={[0, 4, -3]} scale={[10, 4, 1]} color="#eaf1ff" />
              <Lightformer intensity={2.2} form="rect" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} color="#cdd8ea" />
              <Lightformer intensity={2.7} form="rect" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[6, 6, 1]} color="#f6d38f" />
              <Lightformer intensity={1.6} form="circle" position={[0, -3, 2]} scale={5} color="#9fb2cc" />
            </Environment>
          )}
        </Suspense>

        {/* Post-procesado: bloom limpio (glow de joyería). Sin aberración
            cromática. También en móvil —sin él el árbol se veía plano frente a
            Chrome—, pero sin multisampling y con la viñeta que ya está en DOM. */}
        <EffectComposer disableNormalPass multisampling={isMobile ? 0 : 4}>
          <Bloom ref={bloomRef} mipmapBlur intensity={0.28} luminanceThreshold={0.8} luminanceSmoothing={0.2} radius={0.62} />
          <Vignette eskil={false} offset={0.26} darkness={0.74} />
        </EffectComposer>
        <FXDriver scrollRef={scrollRef} bloomRef={bloomRef} />
      </Canvas>

      {/* Realce en DOM: brillo cálido + viñeta para legibilidad del contenido */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.65)_100%)]" />
    </div>
  )
}

useGLTF.preload(MODEL)
