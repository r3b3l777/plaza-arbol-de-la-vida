import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

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

function buildTree() {
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
    list.forEach((b) => taperedTube(b.curve, b.r0, b.r1, b.steps, 12, acc))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.normals, 3))
    g.setIndex(acc.indices)
    return g
  }

  // Un SISTEMA de raíz estilo Árbol de la Vida: una raíz principal larga que
  // sale en abanico, ondula y CAE, y de la que brotan raicillas más finas que
  // también ondulan y se ramifican — como en la referencia. Todo el sistema
  // se fusiona en una geometría para brotar como una sola unidad.
  const rootSystem = (az) => {
    const segs = []
    // Dirección de salida en el plano (Z comprimido → abanico elíptico)
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az) * 0.72)
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize()

    // Cadena de puntos ondulada y tapering; `up` sesga la caída (raíz madre
    // baja mucho; raicillas menos). Devuelve la curva CatmullRom.
    const strand = (origin, baseDir, reach, drop, waveAmp, freq, n) => {
      const pts = [origin.clone()]
      const p2 = new THREE.Vector3(-baseDir.z, 0, baseDir.x).normalize()
      const sign = rnd() > 0.5 ? 1 : -1
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const w = Math.sin(t * Math.PI * freq) * waveAmp * (0.3 + t) * sign
        const p = origin
          .clone()
          .addScaledVector(baseDir, reach * t)
          .addScaledVector(p2, w)
        p.y = origin.y - drop * (0.25 * t + 0.75 * t * t) // cae acelerando
        pts.push(p)
      }
      return new THREE.CatmullRomCurve3(pts)
    }

    // Raíz madre — NACE DENTRO DEL TRONCO: origen alto (0.5–1.15 sobre la base,
    // radio de la base ≈ 0.44) y gruesa, para que el tronco se abra en raíces
    // de forma continua (contrafuertes), no que aparezcan flotando debajo.
    const originY = 0.5 + rnd() * 0.65
    const reach = 1.5 + rnd() * 1.0
    const drop = 1.2 + rnd() * 0.8
    const main = strand(new THREE.Vector3(0, originY, 0), dir, reach, drop, 0.16 + rnd() * 0.12, 1.3 + rnd() * 0.8, 7)
    segs.push({ curve: main, r0: 0.26 + rnd() * 0.08, r1: 0.02, steps: 30 })

    // Raicillas: brotan de puntos intermedios de la madre, más finas
    const nChild = 2 + Math.floor(rnd() * 3)
    for (let c = 0; c < nChild; c++) {
      const ts = 0.32 + rnd() * 0.5
      const base = main.getPoint(ts)
      const caz = az + (rnd() - 0.5) * 1.1
      const cdir = new THREE.Vector3(Math.cos(caz), 0, Math.sin(caz) * 0.72)
        .addScaledVector(perp, (rnd() - 0.5) * 0.4)
        .normalize()
      const creach = (0.55 + rnd() * 0.8) * (1 - ts * 0.5)
      const cdrop = (0.4 + rnd() * 0.5) * (1 - ts * 0.4)
      const child = strand(base, cdir, creach, cdrop, 0.1 + rnd() * 0.1, 1.6 + rnd(), 5)
      segs.push({ curve: child, r0: 0.055 + rnd() * 0.02, r1: 0.01, steps: 18 })
    }
    return segs
  }

  const roots = []
  const NROOTS = 11
  for (let i = 0; i < NROOTS; i++) {
    // Reparto angular con jitter → abanico natural, no simétrico
    const az = (i / NROOTS) * Math.PI * 2 + (rnd() - 0.5) * 0.4
    const geo = merge(rootSystem(az))
    // Orden de brote aleatorio pero determinista → naturaleza, no reloj
    roots.push({ geo, delay: rnd() * 0.5 })
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

function Tree({ reducedMotion }) {
  const group = useRef()
  const { viewport, camera } = useThree()
  const { wood, roots, leaves, rootY } = useMemo(() => buildTree(), [])
  const leafRef = useRef()
  const rootRefs = useRef([])

  // Datos base de cada hoja + parámetros de aleteo deterministas (fase, eje y
  // amplitud propios) para animarlas de forma orgánica, no en bloque.
  const leafData = useMemo(
    () =>
      leaves.map((it) => {
        const basePos = new THREE.Vector3(...it.pos)
        const baseQuat = new THREE.Quaternion(...it.quat)
        const scale = new THREE.Vector3(it.r * 1.7, it.r, it.r * 0.34)
        // fase pseudo-aleatoria estable a partir de la posición
        const h = Math.sin(basePos.x * 12.9898 + basePos.y * 78.233 + basePos.z * 37.719) * 43758.5453
        const phase = (h - Math.floor(h)) * Math.PI * 2
        // eje de aleteo ligeramente inclinado, único por hoja
        const axis = new THREE.Vector3(0.35 + (phase % 0.4), 0.2, 1).normalize()
        return { basePos, baseQuat, scale, phase, axis, sway: 0.9 + (phase % 1) * 0.6 }
      }),
    [leaves]
  )

  // Objetos temporales reutilizados en el bucle (cero asignaciones por frame)
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), sw: new THREE.Quaternion(), p: new THREE.Vector3() }),
    []
  )

  // Coloca las hojas una vez (estado base; con reduced-motion se quedan así)
  useLayoutEffect(() => {
    const mesh = leafRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    leafData.forEach((L, i) => {
      m.compose(L.basePos, L.baseQuat, L.scale)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [leafData])

  useEffect(
    () => () => {
      wood?.dispose()
      roots?.forEach((r) => r.geo.dispose())
    },
    [wood, roots]
  )

  // Progreso de scroll: el recorrido copa→raíces se reparte HASTA el final de
  // la sección "Visítanos" (#visita). Las raíces, en cambio, se expanden como
  // naturaleza a lo largo de TODA la parte final: desde que #visita empieza a
  // entrar hasta el fondo absoluto de la página (footer incluido).
  const scrollP = useRef(0)
  const rootsP = useRef(0) // progreso del despliegue de raíces (parte final)
  const scrollVel = useRef(0) // velocidad de scroll (alimenta el aleteo de hojas)
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  useEffect(() => {
    const read = () => {
      const doc = document.documentElement
      const vh = window.innerHeight
      const pageEnd = doc.scrollHeight - vh // fondo absoluto de la página
      let denom = pageEnd
      const visit = document.getElementById('visita')
      if (visit) {
        const rect = visit.getBoundingClientRect()
        denom = rect.bottom + window.scrollY - vh
        // Las raíces crecen progresivamente desde que #visita asoma (start)
        // hasta el final de la página (end) → se expanden por toda la parte
        // final, no de golpe.
        const start = rect.top + window.scrollY - vh * 0.9
        const span = Math.max(1, pageEnd - start)
        rootsP.current = Math.min(1, Math.max(0, (window.scrollY - start) / span))
      }
      denom = Math.max(1, denom)
      scrollP.current = Math.min(1, Math.max(0, window.scrollY / denom))
      // Velocidad instantánea (px por evento), acumulada y limitada; se
      // amortigua en useFrame → las hojas aletean con el scroll y se calman.
      scrollVel.current = Math.min(120, scrollVel.current + Math.abs(window.scrollY - lastY.current))
      lastY.current = window.scrollY
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

    // VIENTO — todo el árbol respira/mece: cabeceo lento en Z (y un pelín en X)
    // superpuesto al giro. Da vida continua a la malla completa. reduced-motion
    // lo deja quieto.
    if (!reducedMotion) {
      group.current.rotation.z = Math.sin(t * 0.45) * 0.022 + Math.sin(t * 0.83 + 1.1) * 0.01
    } else {
      group.current.rotation.z = 0
    }

    // Recorrido vertical: COPA (arriba) → RAÍCES (abajo). Escalado por `scale`.
    // Cierre cinematográfico: al llegar al final la cámara retrocede (dolly-out)
    // y sube un poco para encuadrar el TRONCO abriéndose en las raíces — se ve
    // parte del árbol fundiéndose con ellas, no solo las raíces sueltas.
    const jCamY = 2.8 - pe * 13.6 //  +2.8 (copa) → -10.8 (base)
    const jCamZ = 6.8 - pe * 0.9
    const fCamY = -9.7 // encuadre final: algo por encima de la base del tronco
    const fCamZ = 9.2 //  retrocede para ver el abanico completo de raíces
    const camY = (jCamY * (1 - finS) + fCamY * finS) * scale
    const camZ = (jCamZ * (1 - finS) + fCamZ * finS) * scale
    camera.position.y += (camY - camera.position.y) * k * 0.9
    camera.position.z += (camZ - camera.position.z) * k * 0.9
    // Mira al frente durante el recorrido; al final baja la vista al tronco→raíz
    const lookY = camera.position.y * (1 - finS) + -10.7 * scale * finS
    camera.lookAt(0, lookY, 0)

    // Las raíces BROTAN escalonadas al entrar la parte final — cada una con su
    // retraso y una desaceleración orgánica (rápida al nacer, asentándose
    // despacio), como crece la naturaleza. reduced-motion: fijas.
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

    // HOJAS — aleteo estético: vaivén continuo + un extra que sube con la
    // velocidad de scroll (las hojas "reaccionan" al desplazarse) y se calma
    // sola al detenerse. Con reduced-motion quedan fijas (no se toca la malla).
    if (leafRef.current && !reducedMotion) {
      const vel = scrollVel.current
      const amp = 0.055 + Math.min(0.3, vel * 0.0024)
      const { m, q, sw, p } = tmp
      for (let i = 0; i < leafData.length; i++) {
        const L = leafData[i]
        const a =
          (Math.sin(t * 1.5 + L.phase) + 0.4 * Math.sin(t * 2.7 + L.phase * 1.6)) * amp * L.sway
        sw.setFromAxisAngle(L.axis, a)
        q.multiplyQuaternions(sw, L.baseQuat)
        p.copy(L.basePos)
        p.y += Math.sin(t * 1.2 + L.phase) * (0.018 + vel * 0.0006)
        m.compose(p, q, L.scale)
        leafRef.current.setMatrixAt(i, m)
      }
      leafRef.current.instanceMatrix.needsUpdate = true
    }
    // Amortigua la velocidad de scroll (aleteo que se apaga tras el scroll)
    scrollVel.current *= Math.pow(0.02, delta)
  })

  return (
    <group ref={group} position={[0, 0, 0]} scale={scale}>
      {/* Tronco y ramas — malla continua, cromo/peltre pulido */}
      <mesh geometry={wood} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#8b95a4" roughness={0.28} metalness={0.95} envMapIntensity={0.7} />
      </mesh>

      {/* Raíces — ancladas a la base; brotan escalonadas al final */}
      {roots.map((r, i) => (
        <mesh
          key={i}
          ref={(n) => {
            rootRefs.current[i] = n
          }}
          geometry={r.geo}
          position={[0, rootY, 0]}
          scale={[0.001, 0.001, 0.001]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial color="#8b95a4" roughness={0.28} metalness={0.95} envMapIntensity={0.7} />
        </mesh>
      ))}

      {/* Hojas — dibujan la copa del logo. Atenuadas (sin resplandor blanco)
          para que NO laven el texto claro encima, p. ej. en "Experiencias". */}
      <instancedMesh ref={leafRef} args={[null, null, leaves.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshStandardMaterial
          color="#aeb2ad"
          roughness={0.35}
          metalness={0.45}
          emissive="#2b2c28"
          emissiveIntensity={0.18}
          envMapIntensity={0.7}
        />
      </instancedMesh>

      {/* Sin disco de suelo ni sombra de contacto: las raíces se expanden
          libres "como naturaleza", sin un círculo que las ancle. */}
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
        camera={{ position: [0, 2.8, 6.8], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        frameloop={frameloop}
      >
        <color attach="background" args={['#14181e']} />
        <fog attach="fog" args={['#14181e', 9, 20]} />
        <ambientLight intensity={0.3} />
        <spotLight position={[5, 8, 5]} angle={0.5} penumbra={0.9} intensity={60} color="#fff2df" castShadow />
        <pointLight position={[-5, 2, -3]} intensity={16} color="#8fa0b8" />
        <pointLight position={[0, -3, 4]} intensity={9} color="#cfd5de" />
        <pointLight position={[3, 4, -4]} intensity={10} color="#eaf0ff" />

        <Suspense fallback={null}>
          <Float speed={reducedMotion ? 0 : 0.8} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.18}>
            <Tree reducedMotion={reducedMotion} />
          </Float>
          {!reducedMotion && !isMobile && (
            <Sparkles count={45} scale={[8, 12, 5]} size={2} speed={0.16} color="#dbdbdb" opacity={0.32} />
          )}
          <Environment preset="night" environmentIntensity={0.8} />
        </Suspense>
      </Canvas>

      {/* Realce cinematográfico en DOM (barato): brillo cálido + viñeta */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_38%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.72)_100%)]" />
    </div>
  )
}
