import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, Sparkles, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
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
function MicroDust({ reducedMotion, count = 1100, everyNthFrame = 1 }) {
  const ref = useRef()
  const tick = useRef(0)
  const { positions, phasesArr } = useMemo(() => {
    const N = count
    const positions = new Float32Array(N * 3)
    const phasesArr = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6
      phasesArr[i] = Math.random() * Math.PI * 2
    }
    return { positions, phasesArr }
  }, [count])

  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    const t = state.clock.elapsedTime
    // Recorrer las motas en JS es lo más caro de este componente: en móvil se
    // hace una de cada dos veces (a simple vista no se nota, son motas).
    tick.current++
    if (tick.current % everyNthFrame !== 0) return
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

function LogoTree({ reducedMotion, scrollRef, pointerRef, isMobile }) {
  const group = useRef()
  const inner = useRef()
  const { scene } = useGLTF(MODEL)
  const { viewport, camera } = useThree()

  // Clona la escena y aplica material cromo-gema (iridiscencia fuerte) + normales
  const { model, aspect, mat, peltre, oro, jobs } = useMemo(() => {
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
      envMapIntensity: 1.45, // recoge lo que aportaban las luces retiradas
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#ffffff'),
      // Sin `sheen`: es una capa BRDF extra que se evalúa en cada píxel y su
      // aporte (un velo dorado tenue) ahora lo dan el color y las luces.
    })
    // Subdivisión (Loop) → muchos más polígonos: superficie ultra suave y
    // detallada, clave en el zoom microscópico (sin facetas). Sin ella el árbol
    // se ve POLIGONAL, así que sigue haciéndose — pero YA NO AQUÍ.
    //
    // Medido sobre esta malla (5.052 → 34.784 triángulos): ~200 ms en un Mac,
    // ~700 ms en un iPhone. Hacerlo en el hilo principal congelaba la página
    // ese tiempo entero: sin scroll, sin pintar, y sin árbol hasta el final.
    // Ahora se monta al instante la malla BASE y un worker devuelve la versión
    // subdividida cuando la tiene (ver `jobs` y el efecto de abajo).
    //
    // La base va sin índice + `computeVertexNormals` para que tenga el MISMO
    // carácter de sombreado plano que el resultado final, solo más basta: al
    // llegar el relevo solo se afina la superficie, no cambia la iluminación.
    const jobs = []
    s.traverse((o) => {
      if (o.isMesh) {
        const src = o.geometry
        // Copias propias: los búferes se ceden al worker (transferibles) y no
        // pueden ser los del GLTF cacheado, que se reutiliza entre montajes.
        jobs.push({
          mesh: o,
          position: new Float32Array(src.attributes.position.array),
          index: src.index ? new Uint32Array(src.index.array) : null,
        })
        const g = src.toNonIndexed()
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
    return {
      model: wrap,
      aspect: size.x / (size.y || 1),
      mat,
      peltre: new THREE.Color('#c4cbd6'), // color base del metal
      oro: new THREE.Color('#e6bd7c'), // remate dorado del final
      jobs,
    }
  }, [scene])

  // Relevo de la malla subdividida, calculada en `src/lib/subdivide.worker.js`.
  // El encuadre (`aspect`, `baseScale`) se mide sobre la malla BASE y no se
  // vuelve a tocar: la subdivisión Loop encoge la silueta un 1.1 % en alto y
  // 0.38 % en proporción — medido — así que recalcularlo al llegar el relevo
  // solo serviría para provocar un salto visible a cambio de nada.
  useEffect(() => {
    if (!jobs.length) return
    let worker
    try {
      worker = new Worker(new URL('../lib/subdivide.worker.js', import.meta.url), {
        type: 'module',
      })
    } catch {
      // Sin workers el árbol se queda en la malla base: peor acabado, pero
      // jamás una página congelada. Es la degradación correcta.
      return
    }
    let vivo = true
    let pendientes = jobs.length
    worker.onmessage = (e) => {
      if (!vivo) return
      const { id, position, normal } = e.data
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(position, 3))
      g.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
      const { mesh } = jobs[id]
      const anterior = mesh.geometry
      mesh.geometry = g
      anterior.dispose()
      if (--pendientes === 0) worker.terminate()
    }
    jobs.forEach((j, id) => {
      worker.postMessage({ id, position: j.position, index: j.index },
        j.index ? [j.position.buffer, j.index.buffer] : [j.position.buffer])
    })
    return () => {
      vivo = false
      worker.terminate()
    }
  }, [jobs])

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

    // === REMATE DORADO ===
    // Al FORMARSE el logo (final del recorrido) el peltre se enciende con un
    // rescoldo de oro: sube el sheen dorado y aparece un emissive cálido que el
    // bloom convierte en brillo. Se apaga solo al volver a subir.
    // El oro viene del COLOR del metal, no de subir la luz: a más intensidad
    // el tone mapping lo lleva a BLANCO, no a dorado. El emissive se queda en
    // una brasa mínima que el bloom convierte en halo cálido.
    //
    // El metal NO se tiñe de oro por completo (0.58): se queda a medio camino
    // entre peltre y oro para que sobre esa base los reflejos de colores —
    // ámbar, oro rosa, oro verde — se lean como un dorado con vida en vez de
    // una pieza de oro macizo plano.
    mat.color.copy(peltre).lerp(oro, reveal * 0.58)
    mat.emissive.setRGB(0.93, 0.74, 0.4).multiplyScalar(reveal * 0.06)
    // En móvil el entorno es un HDR de estudio, mucho más luminoso que los
    // Lightformers de escritorio: si además se sube en el remate, el reflejo
    // blanco se come el oro. Ahí se BAJA para que manden las luces de color.
    mat.envMapIntensity = 1.45 + reveal * (isMobile ? -0.55 : 0.3)

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
function OrbitingHighlight({ reducedMotion, scrollRef }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = reducedMotion ? 0.7 : state.clock.elapsedTime
    ref.current.position.set(Math.cos(t * 0.35) * 4, 1.5 + Math.sin(t * 0.5) * 1.5, Math.sin(t * 0.35) * 4 + 1.5)
    // Al final, el brillo que recorre el metal vira a oro verde: es el tercer
    // tono del remate y el que lo separa de un dorado plano.
    const { reveal } = phases(scrollRef.current)
    ref.current.color.copy(BASE_HIGHLIGHT).lerp(ORO_VERDE, reveal)
  })
  return <pointLight ref={ref} intensity={12} distance={12} decay={1.6} color="#ffffff" />
}

// Iluminación LUXURY de joyería: split cálido (champán) / frío (platino) que
// orbita e intensifica CON SUTILEZA en el zoom profundo. Sin colores saturados.
// Paleta del remate: los reflejos se separan en tres oros distintos (ámbar,
// oro rosa, oro verde) en vez de un único dorado plano. Es la variación "RGB"
// pero SIEMPRE dentro de la familia del oro — nada de magenta/cian.
const ORO_AMBAR = new THREE.Color('#ffb347')
const ORO_ROSA = new THREE.Color('#ff9d7c')
const ORO_VERDE = new THREE.Color('#e6e58c')
const BASE_WARM = new THREE.Color('#f4ce88')
const BASE_COOL = new THREE.Color('#e2e9f4')
const BASE_HIGHLIGHT = new THREE.Color('#ffffff')

function LuxuryLights({ scrollRef }) {
  const warm = useRef(), cool = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { gem, reveal } = phases(scrollRef.current)
    const I = 8 + gem * 13 // realce contenido y sobrio
    if (warm.current) {
      // Al formarse el logo la luz dorada sube y se pone de frente: el remate
      // cálido del recorrido. La fría vira a oro rosa (no se apaga: es la que
      // mete el segundo tono del dorado).
      warm.current.color.copy(BASE_WARM).lerp(ORO_AMBAR, reveal)
      warm.current.intensity = I * 1.25 + reveal * 9
      const front = reveal * 1.6
      warm.current.position.set(
        Math.cos(t * 0.28) * 3 * (1 - reveal),
        1.6 + Math.sin(t * 0.3) * 1.2 * (1 - reveal * 0.7),
        2 + Math.sin(t * 0.28) * 0.6 + front
      )
    }
    if (cool.current) {
      cool.current.color.copy(BASE_COOL).lerp(ORO_ROSA, reveal)
      cool.current.intensity = I * 0.75 * (1 - reveal * 0.3) + reveal * 4
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

// Avisa en el primer frame REALMENTE pintado. Vive DENTRO del <Suspense> del
// modelo, así que solo se monta cuando el GLB ya resolvió.
// Se dispara en el primer frame a propósito: con reduced-motion el frameloop
// es 'demand' y podría no haber un segundo frame, lo que dejaría el canvas
// invisible para siempre. El fade de 900 ms absorbe la compilación de shaders.
function ReadySignal({ onReady }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady()
  })
  return null
}

// Anima el post-procesado con la profundidad del zoom: más bloom y aberración
// cromática cuando el zoom es microscópico → sensación de lente de cine / gema.
// Solo modula el bloom con la profundidad (glow contenido). Sin aberración
// cromática dinámica → nada de franjas RGB.
function FXDriver({ scrollRef, bloomRef, isMobile }) {
  useFrame(() => {
    const { gem, reveal } = phases(scrollRef.current)
    // + el empujón del remate dorado al formarse el logo (contenido en móvil,
    // donde el HDR ya aporta mucha luz y el bloom lo llevaría a blanco)
    if (bloomRef.current) {
      bloomRef.current.intensity = 0.24 + gem * 0.28 + reveal * (isMobile ? 0.05 : 0.12)
    }
  })
  return null
}

/**
 * Post-procesado: bloom limpio (glow de joyería). Sin aberración cromática.
 * También en móvil —sin él el árbol se veía plano frente a Chrome—, pero sin
 * multisampling y con la viñeta que ya está en DOM.
 *
 * Va MEMOIZADO a propósito. `@react-three/postprocessing` calcula los args de
 * cada efecto con `useMemo(..., [JSON.stringify(props)])`, y en React 19 `ref`
 * viaja como una prop más. En el primer render `bloomRef.current` es null y no
 * pasa nada, pero en CUALQUIER re-render posterior ese stringify se encuentra
 * el BloomEffect ya construido, que es una estructura circular, y lanza
 * "Converting circular structure to JSON" — una excepción no capturada que
 * tumba todo el árbol de React (la página se queda en blanco).
 *
 * Pasaba de verdad: bastaba con cambiar de pestaña y volver, porque
 * `setVisible` re-renderiza este componente. Al aislar los efectos aquí con
 * props estables (tres refs y un booleano), React se salta el re-render y el
 * stringify no vuelve a ejecutarse nunca.
 */
const PostFX = memo(function PostFX({ bloomRef, scrollRef, isMobile }) {
  return (
    <>
      <EffectComposer disableNormalPass multisampling={isMobile ? 0 : 4}>
        {/* En móvil el bloom se calcula a la mitad de resolución: es un
            desenfoque, no tiene detalle que perder, y ahorra la mayor parte
            de su costo de relleno. */}
        <Bloom
          ref={bloomRef}
          mipmapBlur
          intensity={0.28}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.2}
          radius={0.62}
          resolutionScale={isMobile ? 0.5 : 1}
        />
        <Vignette eskil={false} offset={0.26} darkness={0.74} />
      </EffectComposer>
      <FXDriver scrollRef={scrollRef} bloomRef={bloomRef} isMobile={isMobile} />
    </>
  )
})

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
    // El punto donde el recorrido llega a 1 se MIDE aparte y se guarda. Antes
    // se recalculaba con getBoundingClientRect en cada evento de scroll, lo que
    // forzaba un layout por frame mientras se desplaza la página: justo el tipo
    // de trabajo que se siente como scroll pegajoso. Ahora el scroll solo lee
    // `window.scrollY`, que no toca el layout.
    let denom = 1
    const read = () => {
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / denom))
    }
    const measure = () => {
      const vh = window.innerHeight
      const visit = document.getElementById('visita')
      // Se forma cuando el encabezado "Te esperamos en el corazón de Metepec"
      // (arriba de #visita) ya está en pantalla — no antes.
      const targetTop = visit
        ? visit.getBoundingClientRect().top + window.scrollY - vh * 0.28
        : document.documentElement.scrollHeight - vh
      denom = Math.max(1, targetTop)
      read()
    }
    // Re-medir en un rAF: las imágenes al cargar mueven el documento y el
    // ResizeObserver puede dispararse varias veces seguidas.
    let pending = 0
    const scheduleMeasure = () => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('load', scheduleMeasure)
    const ro = new ResizeObserver(scheduleMeasure)
    ro.observe(document.body)
    return () => {
      cancelAnimationFrame(pending)
      ro.disconnect()
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('load', scheduleMeasure)
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

  // Giroscopio: en el teléfono el árbol gira al inclinar el aparato, igual que
  // sigue al cursor en escritorio (alimenta el MISMO `pointerRef`).
  // iOS exige pedir permiso DENTRO de un gesto del usuario → se engancha al
  // primer toque de la página (sirve el botón de la intro). Android no pide
  // permiso y entra directo.
  useEffect(() => {
    if (reducedMotion || !isMobile || typeof DeviceOrientationEvent === 'undefined') return
    let attached = false
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      const clamp = (v) => Math.max(-1, Math.min(1, v))
      // gamma: inclinación izquierda/derecha. beta: adelante/atrás; el punto
      // neutro son ~60°, el ángulo en que se sostiene el teléfono al leer, para
      // que el árbol esté de frente en la posición natural y no ya inclinado.
      pointerRef.current.x = clamp(e.gamma / 38)
      pointerRef.current.y = clamp((e.beta - 60) / 45)
    }
    const attach = () => {
      if (attached) return
      attached = true
      window.addEventListener('deviceorientation', onTilt)
    }
    const request = () => {
      const ask = DeviceOrientationEvent.requestPermission
      if (typeof ask === 'function') {
        ask().then((res) => res === 'granted' && attach()).catch(() => {})
      } else {
        attach()
      }
    }
    request() // Android / navegadores sin permiso explícito
    window.addEventListener('pointerdown', request, { once: true }) // iOS
    return () => {
      window.removeEventListener('deviceorientation', onTilt)
      window.removeEventListener('pointerdown', request)
    }
  }, [reducedMotion, isMobile])

  const bloomRef = useRef()
  const frameloop = reducedMotion || !visible ? 'demand' : 'always'

  // Fade del telón estático al 3D. El canvas pinta el MISMO color de fondo
  // (#14181e) que StaticBackdrop, así que lo único que aparece es el árbol.
  //
  // Se toca el estilo por ref en vez de con estado: un setState aquí
  // re-renderizaría el componente, y ese re-render es justo lo que hace
  // explotar a postprocessing (ver PostFX). Además así el fade no cuesta ni
  // un render de React.
  const shellRef = useRef(null)
  const onReady = useCallback(() => {
    if (shellRef.current) shellRef.current.style.opacity = '1'
  }, [])

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
      style={{
        height: '100dvh',
        opacity: 0,
        transition: reducedMotion ? 'none' : 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* dpr 1.75 en móvil: se ve nítido y pinta ~23 % menos píxeles que a 2 */}
      <Canvas
        dpr={[1, isMobile ? 1.75 : 1.85]}
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
        {/* Iluminación adelgazada de 10 luces a 7. El material (physical con
            clearcoat) se evalúa POR LUZ y por píxel, y el árbol cubre casi toda
            la pantalla: cada luz de menos es tiempo de GPU en cada frame.
            Fuera: el spotLight con penumbra (la más cara con diferencia) y dos
            rellenos estáticos; su aporte lo recogen la direccional (ahora key
            de verdad) y el envMap. */}
        <ambientLight intensity={0.42} />
        <hemisphereLight args={['#cfe0ff', '#1b2028', 0.6]} />
        <directionalLight position={[3, 5, 5]} intensity={2.6} color="#fff2df" />
        <pointLight position={[0, 2, -6]} intensity={16} color="#dfe7f5" />
        <OrbitingHighlight reducedMotion={reducedMotion} scrollRef={scrollRef} />
        {!reducedMotion && <LuxuryLights scrollRef={scrollRef} />}

        <Suspense fallback={null}>
          <Float speed={reducedMotion ? 0 : 0.7} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.15}>
            <LogoTree reducedMotion={reducedMotion} scrollRef={scrollRef} pointerRef={pointerRef} isMobile={isMobile} />
          </Float>
          {/* Micro-polvo también en móvil, con menos motas y a media cadencia */}
          <ReadySignal onReady={onReady} />
          <MicroDust
            reducedMotion={reducedMotion}
            count={isMobile ? 420 : 1100}
            everyNthFrame={isMobile ? 2 : 1}
          />
          {!reducedMotion && (
            <Sparkles count={isMobile ? 36 : 70} scale={[7, 9, 4]} size={1.4} speed={0.2} color="#dbe3f0" opacity={0.4} />
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

        <PostFX bloomRef={bloomRef} scrollRef={scrollRef} isMobile={isMobile} />
      </Canvas>

      {/* Realce en DOM: brillo cálido + viñeta para legibilidad del contenido */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.65)_100%)]" />
    </div>
  )
}

useGLTF.preload(MODEL)
