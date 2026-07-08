import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Float, Sparkles, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { TREE_MODEL } from '../data/site'

/**
 * Árbol de la Vida como telón fijo detrás de toda la página. Es un árbol LARGO:
 * copa arriba, tronco alto y continuo, raíces al fondo. Está completo desde el
 * inicio; el scroll hace un recorrido cinematográfico (estilo scrub) desde la
 * copa hasta las raíces, sincronizado para terminar en la sección "Visítanos".
 *
 * El tronco y las ramas se construyen como tubos suaves y afilados (Frenet
 * frames) y se fusionan en UNA sola malla → sin anillos ni escalones, un solo
 * draw call. Material cromo/peltre pulido para un acabado premium.
 */

// RNG determinista para que el árbol sea idéntico en cada carga
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Tubo suave y afilado a lo largo de una curva Bézier (radio r0→r1). Escribe
// sus vértices/índices en los acumuladores compartidos para fusionar todas las
// ramas en UNA sola geometría (sin dependencias externas de three/examples).
function taperedTube(curve, r0, r1, steps, radial, acc) {
  const frames = curve.computeFrenetFrames(steps, false)
  const base = acc.positions.length / 3
  const P = new THREE.Vector3()
  const dir = new THREE.Vector3()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = r0 + (r1 - r0) * t
    curve.getPoint(t, P)
    const N = frames.normals[i]
    const B = frames.binormals[i]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      dir.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a))
      acc.positions.push(P.x + dir.x * r, P.y + dir.y * r, P.z + dir.z * r)
      acc.normals.push(dir.x, dir.y, dir.z)
    }
  }
  const per = radial + 1
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = base + i * per + j
      const b = a + per
      acc.indices.push(a, b, b + 1, a, b + 1, a + 1)
    }
  }
}

// `radial` = segmentos radiales de los tubos: más en escritorio (suavidad),
// menos en móvil (rendimiento). La silueta del árbol no cambia.
function buildTree(radial = 12) {
  const rnd = mulberry32(20252)
  const branches = [] // { curve, r0, r1, steps }
  const leaves = []   // { pos, quat, r }

  function addCurve(p0, p1, p2, r0, r1, steps) {
    branches.push({ curve: new THREE.QuadraticBezierCurve3(p0, p1, p2), r0, r1, steps })
    return p2.clone()
  }

  function leafCluster(center, count, spread, size) {
    for (let i = 0; i < count; i++) {
      const off = new THREE.Vector3(
        (rnd() - 0.5) * spread,
        (rnd() - 0.5) * spread * 0.85,
        (rnd() - 0.5) * spread * 0.9
      )
      const p = center.clone().add(off)
      const e = new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI)
      const q = new THREE.Quaternion().setFromEuler(e)
      leaves.push({ pos: [p.x, p.y, p.z], quat: [q.x, q.y, q.z, q.w], r: size * (0.8 + rnd() * 0.5) })
    }
  }

  // Ramas recursivas — sesgo hacia arriba y silueta contenida (copa redonda)
  function grow(origin, dir, len, radius, depth) {
    const bendStrength = len * 0.4
    const perp = new THREE.Vector3(rnd() - 0.5, rnd() * 0.4, (rnd() - 0.5) * 0.5)
      .normalize()
      .multiplyScalar(bendStrength * (0.4 + rnd() * 0.6))
    const end = origin.clone().add(dir.clone().multiplyScalar(len))
    const ctrl = origin.clone().add(dir.clone().multiplyScalar(len * 0.5)).add(perp)
    const tip = addCurve(origin, ctrl, end, radius, radius * 0.5, depth >= 3 ? 14 : 8)

    if (depth === 0) {
      leafCluster(tip, 6 + Math.floor(rnd() * 4), 0.46, 0.1)
      return
    }
    if (depth === 1 && rnd() < 0.8) leafCluster(tip, 3, 0.34, 0.085)

    const children = depth >= 2 ? 3 : 2
    for (let i = 0; i < children; i++) {
      const az = (i / children - 0.5) * 2.2 + (rnd() - 0.5) * 0.5
      const tiltUp = 0.35 + rnd() * 0.4
      const newDir = new THREE.Vector3(
        Math.sin(az) * Math.cos(tiltUp * 0.5),
        Math.cos(az * 0.6) * tiltUp + 0.55,
        (rnd() - 0.5) * 0.85
      )
        .add(dir.clone().multiplyScalar(0.6))
        .normalize()
      grow(tip, newDir, len * (0.7 + rnd() * 0.1), radius * 0.6, depth - 1)
    }
  }

  // === Tronco MUY largo en S (dos curvas encadenadas) ===
  const baseY = -10.4
  const trunkH = 11.2
  const lowerCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, baseY, 0),
    new THREE.Vector3(-0.68, baseY + trunkH * 0.28, 0.08),
    new THREE.Vector3(0.06, baseY + trunkH * 0.56, 0)
  )
  const upperCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.06, baseY + trunkH * 0.56, 0),
    new THREE.Vector3(0.6, baseY + trunkH * 0.82, -0.08),
    new THREE.Vector3(0.0, baseY + trunkH, 0)
  )
  branches.push({ curve: lowerCurve, r0: 0.46, r1: 0.26, steps: 34 })
  branches.push({ curve: upperCurve, r0: 0.26, r1: 0.13, steps: 30 })
  const trunkTop = new THREE.Vector3(0.0, baseY + trunkH, 0)

  // Punto EXACTO sobre el eje del tronco a una altura relativa u∈[0,1] —
  // así cada rama nace dentro del tronco y emerge por su superficie.
  const trunkPoint = (u) =>
    u < 0.5 ? lowerCurve.getPoint(u * 2) : upperCurve.getPoint((u - 0.5) * 2)

  // Follaje repartido a lo largo del tronco — ramas y plantas que pasas al bajar
  const midBranches = [
    [0.2, new THREE.Vector3(-0.9, 0.45, 0.25), 0.95, 0.07],
    [0.3, new THREE.Vector3(0.92, 0.4, -0.2), 1.0, 0.075],
    [0.42, new THREE.Vector3(-0.95, 0.5, 0.22), 1.05, 0.075],
    [0.54, new THREE.Vector3(0.95, 0.42, -0.18), 1.1, 0.075],
    [0.66, new THREE.Vector3(-0.85, 0.55, 0.28), 0.95, 0.07],
    [0.76, new THREE.Vector3(0.8, 0.6, 0.12), 0.9, 0.07],
    [0.86, new THREE.Vector3(-0.7, 0.75, -0.2), 0.8, 0.06],
  ]
  midBranches.forEach(([u, d, len, r]) => grow(trunkPoint(u), d.clone().normalize(), len, r, 2))

  // Tres ramas madre desde la cima — la copa redonda del logotipo
  grow(trunkTop, new THREE.Vector3(-0.7, 0.9, 0.1).normalize(), 1.35, 0.12, 3)
  grow(trunkTop, new THREE.Vector3(0.05, 1, -0.08).normalize(), 1.5, 0.12, 3)
  grow(trunkTop, new THREE.Vector3(0.75, 0.8, 0.05).normalize(), 1.35, 0.12, 3)

  // Raíces — UNA geometría por raíz, relativas a la base del tronco, para
  // animarlas brotando de forma escalonada y orgánica al final del recorrido.
  const merge = (list) => {
    const acc = { positions: [], normals: [], indices: [] }
    list.forEach((b) => taperedTube(b.curve, b.r0, b.r1, b.steps, radial, acc))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.normals, 3))
    g.setIndex(acc.indices)
    return g
  }

  const roots = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    const dirOut = new THREE.Vector3(Math.cos(a), -0.42, Math.sin(a) * 0.7).normalize()
    const reach = 0.75 + rnd() * 0.45
    const geo = merge([
      {
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(dirOut.x * 0.42, -0.24 - rnd() * 0.06, dirOut.z * 0.42),
          new THREE.Vector3(dirOut.x * reach, -0.42, dirOut.z * reach)
        ),
        r0: 0.17,
        r1: 0.028,
        steps: 10,
      },
    ])
    // Orden de brote aleatorio pero determinista → naturaleza, no reloj
    roots.push({ geo, delay: rnd() * 0.45 })
  }

  const wood = merge(branches)

  return { wood, roots, leaves, rootY: baseY }
}

// Rampa del recorrido: arranque suave pero SIN frenar al final — el descenso
// acelera ligeramente hacia las raíces para que el tramo Galería→Visítanos
// tenga movimiento visible (el smoothstep clásico moría al final).
function journeyEase(x) {
  return 0.2 * x + 0.8 * x * x
}

// Altura del árbol del logo en unidades de escena: ALTO, para que el
// descenso copa→raíces dure toda la página (recorrido cinematográfico)
const LOGO_TREE_H = 12
useGLTF.preload(TREE_MODEL)

function Tree({ reducedMotion, isMobile }) {
  const group = useRef()
  const { viewport, camera } = useThree()
  // Solo se usan las raíces procedurales (brotan al final); el árbol es el
  // modelo 3D generado con Higgsfield a partir del logotipo oficial.
  const { wood, roots } = useMemo(() => buildTree(isMobile ? 10 : 16), [isMobile])
  // Base del árbol cerca del origen para quedar dentro del set de luces
  // (spot y puntuales rodean y≈0); la copa termina en y≈+4.
  const rootY = -3.4
  const cursorLightRef = useRef()
  const rootRefs = useRef([])

  // Peltre pulido con laca — mismo acabado en árbol y raíces
  const pewter = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#cfd4dc',
        roughness: 0.18,
        metalness: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.35,
      }),
    []
  )

  // Árbol del logotipo (GLB de Higgsfield): se normaliza — centrado en XZ,
  // base en y=0, altura LOGO_TREE_H — y se recubre con peltre. El mesh
  // reconstruido trae normales poco confiables: se recalculan, y el material
  // es de doble cara con un leve emissive para que nunca caiga en silueta.
  const { scene: logoScene } = useGLTF(TREE_MODEL)
  const logoPewter = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#cfd4dc',
        roughness: 0.3,
        metalness: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.3,
        envMapIntensity: 1.4,
        emissive: '#232931',
        emissiveIntensity: 0.4,
        side: THREE.DoubleSide,
      }),
    []
  )
  const logoTree = useMemo(() => {
    const s = logoScene.clone(true)
    s.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.geometry.computeVertexNormals()
        o.material = logoPewter
      }
    })
    const box = new THREE.Box3().setFromObject(s)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const k = LOGO_TREE_H / size.y
    s.scale.setScalar(k)
    s.position.set(-center.x * k, -box.min.y * k, -center.z * k)
    const wrap = new THREE.Group()
    wrap.add(s)
    return wrap
  }, [logoScene, logoPewter])

  useEffect(
    () => () => {
      wood?.dispose()
      roots?.forEach((r) => r.geo.dispose())
    },
    [wood, roots]
  )

  // Progreso de scroll: el recorrido copa→raíces se reparte HASTA el final de
  // la sección "Visítanos" (#visita, con el mapa). Después se mantiene en 1.
  const scrollP = useRef(0)
  const rootsP = useRef(0) // progreso del despliegue de raíces (sección #visita)
  useEffect(() => {
    const read = () => {
      const doc = document.documentElement
      const vh = window.innerHeight
      let denom = doc.scrollHeight - vh
      const visit = document.getElementById('visita')
      if (visit) {
        const rect = visit.getBoundingClientRect()
        denom = rect.bottom + window.scrollY - vh
        // Las raíces SOLO se extienden cuando la sección del mapa entra en
        // pantalla: 0 al asomar por abajo → 1 con la sección bien visible.
        rootsP.current = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (vh * 0.75)))
      }
      denom = Math.max(1, denom)
      scrollP.current = Math.min(1, Math.max(0, window.scrollY / denom))
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  // Encaje responsivo: el árbol se reduce en viewports estrechos
  const scale = viewport.width < 6.5 ? Math.max(0.6, viewport.width / 6.8) : 1

  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const p = scrollP.current
    const pe = journeyEase(p) // progreso del recorrido (sin frenar al final)
    const fin = rootsP.current // progreso del FINAL (sección del mapa visible)
    const finS = fin * fin * (3 - 2 * fin) // smoothstep del cierre
    const k = 1 - Math.pow(0.0015, delta) // amortiguación independiente del fps

    // Giro sutil + parallax; en el cierre el árbol hace un barrido elegante
    const targetY =
      pe * 0.5 +
      finS * 0.55 +
      state.pointer.x * 0.16 +
      (reducedMotion ? 0 : Math.sin(t * 0.12) * 0.035)
    group.current.rotation.y += (targetY - group.current.rotation.y) * k
    const targetX = -0.03 - state.pointer.y * 0.04
    group.current.rotation.x += (targetX - group.current.rotation.x) * k * 0.85

    // La luz cálida sigue al cursor (mouse tracking del prompt): ilumina el
    // costado del árbol hacia donde apunta el usuario, con lerp suave.
    const light = cursorLightRef.current
    if (light) {
      const lx = state.pointer.x * 4.5
      const ly = camera.position.y + 1.4 + state.pointer.y * 2.4
      light.position.x += (lx - light.position.x) * k
      light.position.y += (ly - light.position.y) * k
      light.position.z += (3.2 - light.position.z) * k
    }

    // Recorrido vertical: COPA (arriba) → RAÍCES (abajo), repartido en TODA
    // la página. El árbol abarca y ∈ [-3.4, +8.6]; la cámara arranca en la
    // punta de la copa y desciende pegada al árbol pasando ramas y hojas.
    // Travelling lateral: arco suave para que el descenso se sienta como
    // viaje a través de la escena, no como un ascensor.
    // Cierre: en la sección final (mapa) la cámara retrocede en gran
    // dolly-out y encuadra el ÁRBOL COMPLETO — copa, tronco y raíces recién
    // brotadas — como el logotipo entero. Ahí "se completa" el árbol.
    const midY = -3.4 + LOGO_TREE_H / 2 // centro del árbol (y = 2.6)
    const jy = 7.4 - pe * 10.8 // viaje: +7.4 (copa) → -3.4 (base)
    const jz = 7.2 - pe * 0.8
    const camX = Math.sin(pe * Math.PI) * 0.85 * (1 - finS) * scale
    const camY = (jy * (1 - finS) + midY * finS) * scale
    const camZ = (jz * (1 - finS) + 18.5 * finS) * scale
    camera.position.x += (camX - camera.position.x) * k * 0.9
    camera.position.y += (camY - camera.position.y) * k * 0.9
    camera.position.z += (camZ - camera.position.z) * k * 0.9
    camera.lookAt(0, camera.position.y, 0)

    // Las raíces BROTAN escalonadas cuando el mapa entra en pantalla — cada
    // una con su retraso y una desaceleración orgánica (rápida al nacer,
    // asentándose despacio), como crece la naturaleza. reduced-motion: fijas.
    for (let i = 0; i < roots.length; i++) {
      const mesh = rootRefs.current[i]
      if (!mesh) continue
      let target = 1
      if (!reducedMotion) {
        const d = roots[i].delay
        const x = Math.min(1, Math.max(0, (fin - d) / Math.max(0.2, 1 - d)))
        target = 1 - Math.pow(1 - x, 3) // easeOutCubic: brote vivo, asiento suave
      }
      const s = Math.max(0.001, target)
      const cur = mesh.scale.x
      const nextS = cur + (s - cur) * k * 0.8
      // Se extienden hacia afuera (XZ) y hacia abajo (Y) desde la base
      mesh.scale.set(nextS, Math.max(0.001, nextS * 0.88 + 0.12), nextS)
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]} scale={scale}>
      {/* Luz cálida que persigue al cursor — realce especular vivo */}
      <pointLight ref={cursorLightRef} position={[0, 3, 3.2]} intensity={reducedMotion ? 0 : 14} color="#dfe5ee" distance={9} decay={1.8} />

      {/* Árbol del logotipo oficial — modelo 3D generado con Higgsfield
          (sam_3_3d) a partir del logo del manual de marca, en peltre pulido */}
      <primitive object={logoTree} position={[0, rootY + 0.1, 0]} />

      {/* Raíces — ancladas a la base; brotan escalonadas al final */}
      {roots.map((r, i) => (
        <mesh
          key={i}
          ref={(n) => {
            rootRefs.current[i] = n
          }}
          geometry={r.geo}
          material={pewter}
          position={[0, rootY + 0.25, 0]}
          scale={[0.001, 0.001, 0.001]}
          castShadow
          frustumCulled={false}
        />
      ))}

      {/* Disco de suelo sutil bajo las raíces */}
      <mesh position={[0, rootY - 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 48]} />
        <meshStandardMaterial color="#181d24" roughness={0.85} metalness={0.3} />
      </mesh>

      {/* Sombra de contacto para anclar el árbol (solo escritorio, por costo) */}
      {!isMobile && !reducedMotion && (
        <ContactShadows
          position={[0, rootY - 0.24, 0]}
          opacity={0.5}
          scale={7}
          blur={2.6}
          far={4}
          resolution={512}
          color="#05070a"
        />
      )}
    </group>
  )
}

export default function TreeBackground({ reducedMotion }) {
  const [isMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  // Pausa el bucle de render cuando la pestaña está oculta (batería/CPU)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const frameloop = reducedMotion || !visible ? 'demand' : 'always'

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" style={{ height: '100dvh' }}>
      <Canvas
        shadows
        dpr={[1, isMobile ? 1.5 : 1.85]}
        camera={{ position: [0, 7.4, 7.2], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        frameloop={frameloop}
      >
        <color attach="background" args={['#14181e']} />
        {/* Niebla lejana: no debe tragarse el árbol en el dolly-out final (~17 u) */}
        <fog attach="fog" args={['#14181e', 10, 40]} />
        <ambientLight intensity={0.3} />
        <spotLight position={[5, 8, 5]} angle={0.5} penumbra={0.9} intensity={60} color="#e9eef6" castShadow />
        <pointLight position={[-5, 2, -3]} intensity={16} color="#8fa0b8" />
        <pointLight position={[0, -3, 4]} intensity={9} color="#cfd5de" />
        <pointLight position={[3, 4, -4]} intensity={10} color="#eaf0ff" />

        <Suspense fallback={null}>
          <Float speed={reducedMotion ? 0 : 0.8} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.18}>
            <Tree reducedMotion={reducedMotion} isMobile={isMobile} />
          </Float>
          {!reducedMotion && !isMobile && (
            <>
              {/* Dos capas de motas a distinta profundidad → parallax real:
                  las cercanas viajan más rápido que las del fondo */}
              <Sparkles count={45} scale={[8, 12, 5]} size={2} speed={0.16} color="#dbdbdb" opacity={0.32} />
              <Sparkles
                count={70}
                scale={[16, 20, 4]}
                position={[0, -2, -5]}
                size={1.1}
                speed={0.07}
                color="#8fa0b8"
                opacity={0.2}
              />
            </>
          )}
          {/* Entorno frío (city): reflejos plata/azulados, sin dorados cálidos */}
          <Environment preset="city" environmentIntensity={0.55} />
        </Suspense>
      </Canvas>

      {/* Realce cinematográfico en DOM (barato): brillo plata + viñeta */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_38%,rgba(198,203,211,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.72)_100%)]" />
    </div>
  )
}
