import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, Preload, Sparkles, useGLTF } from '@react-three/drei'
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
// El post-proceso (bloom) vive en su propio chunk y SOLO se descarga en el
// nivel de calidad completo. `postprocessing` + su envoltorio de react-three
// son decenas de KB que el móvil no llegaba a usar nunca y aun así bajaba.
const PostFX = lazy(() => import('./PostFX'))

const MODEL = '/models/arbol-logo.glb'

// Bloque del titular "Visítanos / Te esperamos en el corazón de Metepec"
// (Visit.jsx). Es el ancla del tramo final del recorrido: el logo empieza a
// formarse cuando este bloque asoma en pantalla.
const ANCLA_REVELADO = 'visita-titular'

// Modo captura: congela el tiempo para pre-renderizar la secuencia del móvil.
const CAPTURA = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('capture')

/**
 * NIVEL DE CALIDAD DEL 3D.
 *
 * El coste de esta escena está en el sombreado POR PÍXEL: el árbol cubre la
 * pantalla entera, así que cada luz, cada capa del material y cada pasada de
 * post-proceso se pagan multiplicadas por el número de píxeles. Las palancas,
 * de más a menos brutal: resolución (dpr), post-proceso, clearcoat, nº de luces.
 *
 * Se puede forzar con `?q=0`, `?q=1` o `?q=2` para comparar los tres en el
 * mismo teléfono sin recompilar nada.
 *
 *   0 · mínimo   dpr 1     · material estándar · 3 luces · sin bloom ni polvo
 *   1 · medio    dpr 1.3   · clearcoat         · 5 luces · sin bloom ni polvo
 *   2 · completo dpr 1.5/1.85 · clearcoat      · 7 luces · bloom + polvo
 *
 * El teléfono TAMBIÉN va al nivel completo: la escena se veía distinta ahí
 * (sin partículas, sin halo, con dos luces menos) y el modelo es el mismo en
 * ambos. Lo que cambia dentro del nivel 2 es solo la DENSIDAD: menos resolución
 * y menos motas, que es donde el teléfono no nota la diferencia y sí nota el
 * presupuesto de GPU. Ver `PRESUPUESTO_MOVIL` abajo.
 */
function nivelCalidad() {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q !== null && /^[012]$/.test(q)) return Number(q)
  }
  return 2
}

/**
 * De dónde sale el presupuesto para las partículas y el bloom en el teléfono.
 *
 * El coste de esta escena es de RELLENO: casi todo se paga por píxel. Así que
 * lo que se añade en calidad visible (motas, halo, luces) se paga bajando cosas
 * que a 460 ppi no se distinguen:
 *
 *   dpr 1.85 → 1.5   ~34 % menos píxeles en cada pasada, incluida la del bloom
 *   1100 → 560 motas la nube se lee igual; el bucle JS por frame se parte a la mitad
 *   cada 2 frames     las motas se desplazan 0.0004 por frame: a media cadencia
 *                     el ojo no distingue el paso
 *   70 → 42 sparkles  mismo criterio
 */
const PRESUPUESTO_MOVIL = { dpr: 1.5, motas: 560, cadencia: 2, sparkles: 42 }

/**
 * ESCALERA DE CALIDAD EN MÓVIL — el teléfono decide, no la tabla de arriba.
 *
 * `PRESUPUESTO_MOVIL` es una apuesta: que un teléfono cualquiera aguante la
 * escena completa a dpr 1.5. En los que no la aguantan se notaba en los dos
 * momentos de más relleno — al aparecer el árbol y al final, cuando la cámara
 * retrocede y el logo pasa a ocupar toda la pantalla con el dorado encendido.
 *
 * En vez de bajar la calidad para todos por si acaso, se empieza arriba y se
 * baja un escalón cada vez que el aparato demuestra que no puede. Nunca se
 * sube: subir y bajar en bucle se ve peor que quedarse abajo.
 *
 * LA ESCALERA SOLO TOCA LA RESOLUCIÓN. Una versión anterior iba quitando el
 * bloom y luego las partículas, y en un teléfono que llegó al último escalón el
 * resultado fue el que había que evitar: la escena dejó de parecerse a la de
 * escritorio. La escena es intocable — el teléfono tiene que ver lo mismo que
 * el escritorio. Lo único que se sacrifica son píxeles, que a 460 ppi no se
 * distinguen, y que además son la palanca MÁS fuerte: el coste de esta escena
 * es de relleno, así que va casi lineal con el número de píxeles.
 *
 * Del primero al último hay 2,25× de diferencia de píxeles, con las mismas
 * motas, el mismo halo y las mismas 7 luces en todos.
 *
 * Ojo al tocar esto: NO añadir aquí nada que cambie las props de <PostFX>. Sus
 * props tienen que quedarse estables o se re-renderiza, y ahí vuelve el fallo
 * del `ref` de <Bloom> que deja la página en blanco (ver PostFX.jsx).
 */
const PASOS_MOVIL = [
  { dpr: 1.5 }, // lo que se ve hoy
  { dpr: 1.3 }, // ~25 % menos píxeles
  { dpr: 1.15 }, // ~41 %
  { dpr: 1.0 }, // ~56 %, último recurso
]

/**
 * Vigila los tiempos de frame y avisa cuando el aparato no da abasto.
 *
 * Se mide en bloques de 45 frames (~0.75 s) en vez de frame a frame: un tirón
 * suelto no significa nada — lo que importa es que la lentitud se sostenga. Se
 * mira el percentil 90 y no la media, porque lo que se siente como "se traba"
 * son los frames malos, no el promedio.
 *
 * El sesgo es DELIBERADAMENTE agresivo, porque los dos errores no cuestan lo
 * mismo: equivocarse bajando cuesta píxeles que a 460 ppi no se distinguen, y
 * equivocarse NO bajando cuesta justo lo que no puede pasar — que el teléfono
 * se trabe. Ante la duda, se baja. Ahora que la escalera solo mueve resolución,
 * el peor caso de un falso positivo es una imagen un punto menos fina, nunca
 * una escena distinta.
 *
 * Los primeros bloques se descartan: justo después de montar se están
 * compilando shaders y subiendo geometría, y ahí SIEMPRE hay frames largos.
 * Bajar la calidad por eso sería castigar a todos los teléfonos.
 */
function VigilanteDeCalidad({ onBajar }) {
  const muestras = useRef([])
  const bloques = useRef(0)
  useFrame((_, delta) => {
    const m = muestras.current
    m.push(delta)
    if (m.length < 45) return
    bloques.current++
    m.sort((a, b) => a - b)
    const p90 = m[Math.floor(m.length * 0.9)]
    m.length = 0
    // Se ignoran los dos primeros bloques (~1.5 s): son el arranque.
    if (bloques.current <= 2) return
    // 20 ms de p90 = por debajo de 50 fps en 1 de cada 10 frames. Es un listón
    // exigente a propósito: el objetivo no es "aceptable", es que no se note.
    if (p90 > 0.020) onBajar()
  })
  return null
}

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

function LogoTree({ reducedMotion, scrollRef, pointerRef, isMobile, nivel, onGeometryReady }) {
  // En modo captura se congela TODO lo que depende del tiempo (respiración,
  // vaivén de cámara en mano, deriva del turntable). Si no, cada fotograma
  // saldría con un balanceo distinto y la secuencia pre-renderizada temblaría
  // al pasar de uno a otro. Se evalúa una sola vez, no por frame.
  const congelado = useRef(
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('capture')
  )
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
    // Nivel 0: material estándar. El clearcoat es una segunda capa BRDF
    // completa evaluada por píxel Y por luz — en la práctica duplica el coste
    // del sombreado. El aspecto metálico no depende de él sino del metalness
    // + el mapa de entorno, así que se compensa subiendo el entorno.
    const mat = nivel === 0
      ? new THREE.MeshStandardMaterial({
          color: '#c4cbd6',
          metalness: 0.9,
          roughness: 0.28,
          envMapIntensity: 1.6,
        })
      : new THREE.MeshPhysicalMaterial({
          color: '#c4cbd6',
          metalness: 0.9,
          // El teléfono reflejaba DEMASIADO. No es el mismo material viéndose
          // distinto: es que las dos rutas se iluminan distinto. Escritorio usa
          // Lightformers art-directed (tiras concretas, colocadas a mano);
          // móvil usa un HDR de ESTUDIO, que son focos enormes y blancos
          // rodeando al objeto — sobre metal con clearcoat eso es destello por
          // todas partes, no reflejo.
          //
          // Se corrige con la rugosidad, no bajando el metal: subirla dispersa
          // el reflejo en vez de apagarlo, así que el árbol sigue leyéndose
          // metálico pero satinado en lugar de espejo.
          roughness: isMobile ? 0.42 : 0.3,
          clearcoat: 1.0, // capa cristalina tipo diamante
          clearcoatRoughness: isMobile ? 0.22 : 0.12,
          // Y el mapa de entorno aporta menos, que es de donde viene el brillo
          // que sobraba (ver también `environmentIntensity` del Environment).
          envMapIntensity: isMobile ? 1.12 : 1.45,
          specularIntensity: isMobile ? 0.72 : 1.0,
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
        if (nivel === 0) {
          // Sin subdividir. Y no se ve facetado porque las normales salen de la
          // malla INDEXADA: computeVertexNormals promedia la normal de las caras
          // que comparten cada vértice y la superficie se sombrea suave. La
          // versión facetada es la misma malla con normales PLANAS (una por
          // cara), que es lo que produce toNonIndexed(). Coste cero.
          const g = src.clone()
          g.computeVertexNormals()
          o.geometry = g
        } else {
          // Copias propias: los búferes no pueden ser los del GLTF cacheado,
          // que se reutiliza entre montajes.
          jobs.push({
            mesh: o,
            position: new Float32Array(src.attributes.position.array),
            index: src.index ? new Uint32Array(src.index.array) : null,
          })
          const g = src.toNonIndexed()
          g.computeVertexNormals()
          o.geometry = g
        }
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
  }, [scene, nivel, isMobile])

  // Relevo de la malla subdividida, calculada en `src/lib/subdivide.worker.js`.
  // El encuadre (`aspect`, `baseScale`) se mide sobre la malla BASE y no se
  // vuelve a tocar: la subdivisión Loop encoge la silueta un 1.1 % en alto y
  // 0.38 % en proporción — medido — así que recalcularlo al llegar el relevo
  // solo serviría para provocar un salto visible a cambio de nada.
  useEffect(() => {
    // Nivel 0 no subdivide: la malla montada YA es la definitiva.
    if (!jobs.length) {
      onGeometryReady()
      return
    }
    let vivo = true
    let pendientes = jobs.length
    let resuelto = false

    const terminado = () => {
      if (resuelto) return
      resuelto = true
      clearTimeout(plazo)
      onGeometryReady()
    }

    // Plan B: la subdivisión en el hilo principal, dentro de un hueco libre.
    // Cuesta ~700 ms de CPU en un teléfono, así que no es gratis — pero la
    // alternativa es un árbol facetado PARA SIEMPRE, que es exactamente el
    // aspecto de "el modelo no cargó bien".
    // `three-subdivide` se importa aquí dentro a propósito: solo se descarga si
    // de verdad hace falta y no engorda el chunk del 3D.
    const planB = () => {
      if (!vivo || resuelto) return
      const correr = async () => {
        const { LoopSubdivision } = await import('three-subdivide')
        if (!vivo || resuelto) return
        for (const { mesh, position, index } of jobs) {
          const g = new THREE.BufferGeometry()
          g.setAttribute('position', new THREE.BufferAttribute(position, 3))
          if (index) g.setIndex(new THREE.BufferAttribute(index, 1))
          const out = LoopSubdivision.modify(g, 1, {
            split: true, uvSmooth: true, preserveEdges: false, maxTriangles: 250000,
          })
          out.computeVertexNormals()
          const anterior = mesh.geometry
          mesh.geometry = out
          anterior.dispose()
        }
        terminado()
      }
      const ric = window.requestIdleCallback
      if (ric) ric(correr, { timeout: 1500 })
      else setTimeout(correr, 200)
    }

    // PLAZO, no detección de errores. Un worker puede fallar de muchas maneras
    // y varias son SILENCIOSAS: `new Worker()` no lanza si el script no carga,
    // y `onerror` no siempre llega (se comprobó en un iPhone real — el árbol se
    // quedó facetado con `onerror` puesto). Así que no se intenta averiguar por
    // qué falla: si en 1,2 s no ha entregado la malla, se hace por el otro
    // camino. Lo único que importa es que el árbol acabe fino, siempre.
    const plazo = setTimeout(planB, 1200)

    let worker
    try {
      worker = new Worker(new URL('../lib/subdivide.worker.js', import.meta.url), {
        type: 'module',
      })
    } catch {
      clearTimeout(plazo)
      planB()
      return () => { vivo = false }
    }
    worker.onerror = () => { if (vivo) planB() }
    worker.onmessage = (e) => {
      if (!vivo || resuelto) return
      const { id, position, normal } = e.data
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(position, 3))
      g.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
      const { mesh } = jobs[id]
      const anterior = mesh.geometry
      mesh.geometry = g
      anterior.dispose()
      if (--pendientes === 0) {
        worker.terminate()
        terminado()
      }
    }
    // SIN lista de transferibles: si se cedieran los búferes, quedarían
    // `detached` y el plan B se quedaría sin datos con los que trabajar.
    // Copiarlos cuesta ~120 KB — los arrays pesados (2.4 MB) son los de VUELTA,
    // y esos sí viajan transferidos desde el worker.
    jobs.forEach((j, id) => {
      worker.postMessage({ id, position: j.position, index: j.index })
    })
    return () => {
      vivo = false
      clearTimeout(plazo)
      worker.terminate()
    }
  }, [jobs, onGeometryReady])

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
    const live = reducedMotion || congelado.current ? 0 : 1

    // === CÁMARA — vuelo cinematográfico ===
    // Dolly de acercamiento (microscópico) y pull-back de revelación
    // Profundidad del viaje. En pantallas ANGOSTAS el recorrido se acorta:
    // ahí el árbol se encuadra más pequeño (`baseScale` depende del ancho), así
    // que con el recorrido largo la cámara lo rebasaba y se quedaba mirando el
    // vacío — medido: 16 de 40 fotogramas del recorrido salían SIN árbol, el
    // 40 % del scroll con el fondo desierto. Era el "se pierde parte del
    // modelo" que se reportaba, no un fallo de carga.
    const hondo = isMobile ? 0.80 : 1.42
    const zIn = 1.75 - zoom * hondo //  1.75 (lejos) → 0.33 escritorio / 0.95 móvil
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
    const travelY = (0.55 - zoom * (isMobile ? 0.62 : 1.15) + handY) * (1 - reveal)
    camera.position.y += (travelY - camera.position.y) * k * 0.9
    const lookY = (0.35 - zoom * (isMobile ? 0.50 : 0.95)) * (1 - reveal)
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
    // OJO: esto reescribe cada frame el valor del material, así que la base de
    // móvil tiene que repetirse aquí o se pierde.
    // En móvil el entorno es un HDR de estudio, mucho más luminoso que los
    // Lightformers de escritorio: si además se sube en el remate, el reflejo
    // blanco se come el oro. Ahí se BAJA para que manden las luces de color.
    mat.envMapIntensity = isMobile ? 1.12 - reveal * 0.42 : 1.45 + reveal * 0.3

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


/**
 * Suavizado del progreso de scroll — SOLO en el teléfono.
 *
 * En escritorio el recorrido nunca recibe el scroll crudo: Lenis interpola
 * `window.scrollY` con lerp 0.1, así que lo que llega ya es continuo. En el
 * teléfono Lenis deja el scroll táctil en manos del sistema (`syncTouch` es
 * `false` por defecto, y activarlo secuestra la inercia nativa de iOS), así que
 * el progreso avanza a saltos del tamaño que traiga cada evento de scroll —
 * irregulares por definición durante el desplazamiento con inercia.
 *
 * La cámara ya se amortigua sola, pero el resto del recorrido (FOV, color del
 * metal, intensidad del bloom, giro del modelo) leía `p` directo y heredaba
 * esos saltos. Interpolando aquí, en un solo sitio, todo lo que depende del
 * progreso se vuelve continuo — y un frame perdido deja de verse como un tirón,
 * porque el valor sigue viajando hacia su destino en vez de teletransportarse.
 *
 * Constante de tiempo 90 ms: lo bastante corto para que siga pegado al dedo,
 * lo bastante largo para comerse la irregularidad entre eventos.
 */
function SuavizadoDeScroll({ scrollRef, targetRef }) {
  useFrame((_, delta) => {
    const objetivo = targetRef.current
    const brecha = objetivo - scrollRef.current
    // Salto grande = no es scroll, es un salto de ancla o la vuelta de una
    // pestaña oculta (donde el frameloop estuvo parado). Ahí se encaja seco:
    // interpolar un tramo largo se vería como un barrido que nadie pidió.
    if (Math.abs(brecha) > 0.25) {
      scrollRef.current = objetivo
      return
    }
    // `delta` se acota: tras un frame muy largo, un k cercano a 1 anularía el
    // suavizado justo cuando más falta hace.
    scrollRef.current += brecha * (1 - Math.exp(-Math.min(delta, 0.05) / 0.09))
  })
  return null
}

export default function TreeBackground({ reducedMotion }) {
  const [isMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  const [nivel] = useState(() => nivelCalidad())
  // Escalón actual de la escalera de calidad (solo móvil, solo hacia abajo).
  const [paso, setPaso] = useState(0)
  const bajarCalidad = useCallback(() => {
    setPaso((p) => Math.min(PASOS_MOVIL.length - 1, p + 1))
  }, [])
  const calidad = PASOS_MOVIL[paso]
  // La escalera solo aplica a la ruta móvil en calidad completa: en escritorio
  // no hay nada que degradar, y en los niveles forzados por `?q=` el usuario
  // pidió un nivel concreto y no se le cambia por debajo.
  const escalable = isMobile && nivel === 2
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Progreso de scroll compartido (0 arriba → 1 al formarse en #visita)
  const scrollRef = useRef(0)
  // Valor crudo del scroll, antes de suavizar. En escritorio es el mismo: lo
  // que llega ya viene interpolado por Lenis. Ver `SuavizadoDeScroll`.
  const scrollTargetRef = useRef(0)
  const suavizarScroll = isMobile && !reducedMotion
  useEffect(() => {
    // El punto donde el recorrido llega a 1 se MIDE aparte y se guarda. Antes
    // se recalculaba con getBoundingClientRect en cada evento de scroll, lo que
    // forzaba un layout por frame mientras se desplaza la página: justo el tipo
    // de trabajo que se siente como scroll pegajoso. Ahora el scroll solo lee
    // `window.scrollY`, que no toca el layout.
    // Dos anclas, no una. El recorrido tiene dos tramos con significados
    // distintos y hasta ahora compartían un solo divisor:
    //
    //   inmersión (p 0 → 0.86)  el zoom microscópico, todo el largo de la página
    //   formación (p 0.86 → 1)  el logo se arma de frente y se pone dorado
    //
    // Con un solo divisor, la formación se llevaba el último 14 % del scroll de
    // TODA la página, que en un documento largo es un tramo enorme y cae ya en
    // el pie: el logo terminaba de armarse al final del todo. Ahora cada tramo
    // tiene sus propios límites, y los de la formación están atados al titular
    // "Te esperamos en el corazón de Metepec". La regla es que cuando el texto
    // SE VE, el logo dorado ya tiene que estar puesto — no formándose:
    //
    //   empieza  2.2 alturas de pantalla antes de que llegue el bloque
    //   termina  justo cuando el bloque toca el borde inferior, o sea en el
    //            instante en que el texto empieza a asomar
    //
    // Toda la formación ocurre ANTES, mientras el usuario sube por la sección
    // anterior. Al llegar al texto ya se encuentra el logo hecho y dorado.
    let inicioFormacion = 1
    let finFormacion = 2
    const read = () => {
      const y = window.scrollY
      let v
      if (y <= inicioFormacion) {
        // Tramo de inmersión: 0 → 0.86 repartido en todo lo que hay antes.
        v = (y / inicioFormacion) * 0.86
      } else {
        // Tramo de formación: 0.86 → 1 en la ventana del titular.
        const t = (y - inicioFormacion) / (finFormacion - inicioFormacion)
        v = 0.86 + Math.min(1, t) * 0.14
      }
      v = Math.min(1, Math.max(0, v))
      scrollTargetRef.current = v
      // Sin suavizado, el recorrido consume el valor crudo tal cual (escritorio:
      // Lenis ya lo entrega interpolado).
      if (!suavizarScroll) scrollRef.current = v
    }
    const measure = () => {
      const vh = window.innerHeight
      const ancla = document.getElementById(ANCLA_REVELADO)
      if (ancla) {
        const arriba = ancla.getBoundingClientRect().top + window.scrollY
        // Termina cuando el bloque toca el borde inferior de la pantalla: a
        // partir de ahí, todo lo que el usuario ve del titular lo ve con el
        // logo ya formado.
        finFormacion = Math.max(2, arriba - vh)
        inicioFormacion = Math.max(1, finFormacion - vh * 1.2)
      } else {
        // Sin ancla (por si el bloque se renombra): el comportamiento anterior.
        const fin = document.documentElement.scrollHeight - vh
        inicioFormacion = Math.max(1, fin * 0.86)
        finFormacion = Math.max(inicioFormacion + 1, fin)
      }
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
  }, [suavizarScroll])

  // Gancho de captura (?capture=1): permite fijar el progreso del recorrido
  // desde fuera para pre-renderizar los fotogramas del móvil. Solo se instala
  // con el parámetro puesto; en producción no existe.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('capture')) return
    window.__setP = (v) => {
      const p = Math.max(0, Math.min(1, v))
      scrollRef.current = p
      scrollTargetRef.current = p // sin esto el suavizado lo arrastraría de vuelta
    }
    window.__ready = true
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

  const frameloop = reducedMotion || !visible ? 'demand' : 'always'

  // Fade del telón estático al 3D. El canvas pinta el MISMO color de fondo
  // (#14181e) que StaticBackdrop, así que lo único que aparece es el árbol.
  //
  // Se toca el estilo por ref en vez de con estado: un setState aquí
  // re-renderizaría el componente, y ese re-render es justo lo que hace
  // explotar a postprocessing (ver PostFX). Además así el fade no cuesta ni
  // un render de React.
  // El canvas NO aparece hasta que la malla es la fina. Se comprobó en un
  // iPhone real que mostrar antes la malla base se ve MAL: facetas triangulares
  // enormes en el zoom cercano, que es justo lo que se leía como "el modelo no
  // cargó bien". Vale más esperar ~1 s con el telón de marca —que ya pinta el
  // color y los degradados— y entrar con el árbol correcto.
  const shellRef = useRef(null)
  const pintado = useRef(false)
  const afinado = useRef(false)
  const mostrar = useCallback(() => {
    if (pintado.current && afinado.current && shellRef.current) {
      shellRef.current.style.opacity = '1'
    }
  }, [])
  const onReady = useCallback(() => {
    pintado.current = true
    mostrar()
  }, [mostrar])
  const onGeometryReady = useCallback(() => {
    afinado.current = true
    mostrar()
  }, [mostrar])
  // Red de seguridad: si la malla fina no llega por lo que sea, el árbol se
  // enseña igual. Un árbol basto es peor que uno fino, pero infinitamente mejor
  // que un fondo vacío para siempre.
  useEffect(() => {
    const t = setTimeout(() => {
      afinado.current = true
      mostrar()
    }, 4000)
    return () => clearTimeout(t)
  }, [mostrar])

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
      style={{
        // `100vh`, NO `100dvh`. En Safari iOS `dvh` cambia mientras haces
        // scroll, según se colapsa y reaparece la barra de URL. Cada cambio
        // redimensiona este contenedor → el ResizeObserver de R3F llama a
        // gl.setSize() → y el EffectComposer REASIGNA sus render targets (mips
        // del bloom, búferes de multisampling). Reservar búferes de GPU en
        // mitad de un scroll es exactamente lo que se sentía como trabazón, y
        // solo pasaba en móvil porque en escritorio no hay barra que se colapse.
        // `100vh` es el viewport grande y NO varía durante el scroll.
        height: '100vh',
        opacity: 0,
        transition: reducedMotion ? 'none' : 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <Canvas
        // Resolución por nivel. Es la palanca más bruta: el coste va con el
        // número de píxeles, así que de 1.85 a 1 hay casi 3,5× de diferencia.
        // En el nivel completo el teléfono va a 1.5 en vez de 1.85: eso es lo
        // que paga sus partículas y su bloom (ver PRESUPUESTO_MOVIL).
        dpr={[1, escalable ? calidad.dpr : [1, 1.3, 1.85][nivel]]}
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
        {/* Primero de todo: el resto del árbol consume `scrollRef` en el mismo
            frame, y los useFrame corren en orden de montaje. */}
        {suavizarScroll && (
          <SuavizadoDeScroll scrollRef={scrollRef} targetRef={scrollTargetRef} />
        )}
        {/* Solo mientras quede algún escalón por bajar: cuando ya está abajo,
            seguir midiendo es trabajo por frame que no puede cambiar nada. */}
        {escalable && paso < PASOS_MOVIL.length - 1 && (
          <VigilanteDeCalidad onBajar={bajarCalidad} />
        )}
        <color attach="background" args={['#14181e']} />
        <fog attach="fog" args={['#14181e', 6, 13]} />
        {/* Iluminación adelgazada de 10 luces a 7. El material (physical con
            clearcoat) se evalúa POR LUZ y por píxel, y el árbol cubre casi toda
            la pantalla: cada luz de menos es tiempo de GPU en cada frame.
            Fuera: el spotLight con penumbra (la más cara con diferencia) y dos
            rellenos estáticos; su aporte lo recogen la direccional (ahora key
            de verdad) y el envMap. */}
        {/* Cada luz se evalúa POR PÍXEL sobre un objeto que ocupa toda la
            pantalla, así que el coste del sombreado es casi lineal con su
            número. Las tres primeras están siempre; se suben de intensidad en
            los niveles bajos para que la luz total no se desplome al retirar
            las otras. El remate dorado NO depende de ellas: sale del color del
            material. */}
        <ambientLight intensity={nivel === 0 ? 0.55 : 0.42} />
        <hemisphereLight args={['#cfe0ff', '#1b2028', nivel === 0 ? 0.8 : 0.6]} />
        <directionalLight position={[3, 5, 5]} intensity={nivel === 0 ? 3.4 : 2.6} color="#fff2df" />
        {nivel >= 2 && <pointLight position={[0, 2, -6]} intensity={16} color="#dfe7f5" />}
        {nivel >= 2 && <OrbitingHighlight reducedMotion={reducedMotion} scrollRef={scrollRef} />}
        {nivel >= 1 && !reducedMotion && <LuxuryLights scrollRef={scrollRef} />}

        <Suspense fallback={null}>
          <Float speed={reducedMotion || CAPTURA ? 0 : 0.7} rotationIntensity={0} floatIntensity={reducedMotion || CAPTURA ? 0 : 0.15}>
            <LogoTree reducedMotion={reducedMotion} scrollRef={scrollRef} pointerRef={pointerRef} isMobile={isMobile} nivel={nivel} onGeometryReady={onGeometryReady} />
          </Float>
          <ReadySignal onReady={onReady} />
          {/* Partículas del nivel completo, en escritorio y en teléfono. Son
              cientos de puntos con mezcla ADITIVA y sin escritura de
              profundidad, o sea relleno transparente acumulado sobre el árbol,
              más un bucle JS por frame. En móvil van a la mitad de motas y a
              media cadencia: la nube se lee igual y el bucle cuesta la mitad. */}
          {nivel >= 2 && (
            <MicroDust
              reducedMotion={reducedMotion}
              count={isMobile ? PRESUPUESTO_MOVIL.motas : 1100}
              everyNthFrame={isMobile ? PRESUPUESTO_MOVIL.cadencia : 1}
            />
          )}
          {nivel >= 2 && !reducedMotion && (
            <Sparkles
              count={isMobile ? PRESUPUESTO_MOVIL.sparkles : 70}
              scale={[7, 9, 4]}
              size={1.4}
              speed={0.2}
              color="#dbe3f0"
              opacity={0.4}
            />
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
            <Environment files="/hdr/studio-small.hdr" environmentIntensity={0.82} />
          ) : (
            <Environment resolution={128} environmentIntensity={1.0}>
              <color attach="background" args={['#0b0e12']} />
              <Lightformer intensity={3.2} form="rect" position={[0, 4, -3]} scale={[10, 4, 1]} color="#eaf1ff" />
              <Lightformer intensity={2.2} form="rect" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} color="#cdd8ea" />
              <Lightformer intensity={2.7} form="rect" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[6, 6, 1]} color="#f6d38f" />
              <Lightformer intensity={1.6} form="circle" position={[0, -3, 2]} scale={5} color="#9fb2cc" />
            </Environment>
          )}
          {/* Compila los shaders y sube la geometría a la GPU AQUÍ, dentro del
              Suspense, en vez de dejar que ocurra en el primer frame visible.
              El material es un physical con clearcoat iluminado por 7 luces:
              su shader es de los caros de compilar, y en un teléfono eso son
              cientos de ms de congelación justo cuando el árbol aparece. Al
              montarse detrás de la intro, ese coste se paga mientras la intro
              tapa la pantalla y el usuario no ve nada raro. */}
          <Preload all />
        </Suspense>

        {/* El bloom son varias pasadas a pantalla completa (reducir,
            desenfocar, recomponer) que se pagan enteras cada frame. La viñeta
            ya existe en DOM, así que fuera del nivel completo solo se pierde el
            halo. */}
        {nivel >= 2 && (
          <Suspense fallback={null}>
            <PostFX scrollRef={scrollRef} isMobile={isMobile} />
          </Suspense>
        )}
      </Canvas>

      {/* Realce en DOM: brillo cálido + viñeta para legibilidad del contenido */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,rgba(214,205,183,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,18,23,0.65)_100%)]" />
    </div>
  )
}

useGLTF.preload(MODEL)
