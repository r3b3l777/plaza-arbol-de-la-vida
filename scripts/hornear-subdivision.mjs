/**
 * Hornea la subdivisión Loop DENTRO del GLB, en tiempo de compilación.
 *
 * El teléfono venía haciendo este cálculo al arrancar (~200 ms en un Mac,
 * ~700 ms en un iPhone). Aunque corre en un worker y no congela la página, el
 * árbol no se puede mostrar hasta que termina — y desde que la intro espera al
 * 3D, ese tiempo es tiempo que el usuario pasa mirando la animación de entrada.
 *
 * Aquí se hace UNA vez, en el Mac, y el teléfono se limita a subir a la GPU una
 * malla que ya viene fina. Se paga en bytes lo que se ahorra en CPU.
 *
 * Reproduce EXACTAMENTE lo que hacía `src/lib/subdivide.worker.js`: mismas
 * opciones de LoopSubdivision, mismo orden, y las normales calculadas al final
 * sobre la malla sin índice. Si se cambia uno, hay que cambiar el otro.
 *
 * Uso:  node scripts/hornear-subdivision.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { BufferAttribute, BufferGeometry } from 'three'
import { LoopSubdivision } from 'three-subdivide'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { EXTMeshoptCompression } from '@gltf-transform/extensions'
import { reorder, prune, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const ENTRADA = 'assets-original/models/arbol-logo.glb'
const SALIDA = 'public/models/arbol-logo.glb'

await MeshoptDecoder.ready
await MeshoptEncoder.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(ENTRADA)

let antes = 0
let despues = 0

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const posAcc = prim.getAttribute('POSITION')
    const idxAcc = prim.getIndices()
    if (!posAcc) continue

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(Float32Array.from(posAcc.getArray()), 3))
    if (idxAcc) g.setIndex(new BufferAttribute(Uint32Array.from(idxAcc.getArray()), 1))
    antes += (idxAcc ? idxAcc.getCount() : posAcc.getCount()) / 3

    // Mismas opciones que el worker.
    const out = LoopSubdivision.modify(g, 1, {
      split: true,
      uvSmooth: true,
      preserveEdges: false,
      maxTriangles: 250000,
    })
    // Sin computeVertexNormals: las normales las deriva la GPU (flatShading).

    const pos = out.attributes.position.array
    despues += pos.length / 9

    // El resultado de LoopSubdivision viene SIN índice: un vértice por esquina
    // de triángulo. Se guarda igual, que es lo que consumía el runtime.
    const nuevoPos = doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos))
    prim.setIndices(null)
    prim.setAttribute('POSITION', nuevoPos)
    // SIN normales, a propósito. El acabado de este árbol es FACETADO: el
    // runtime calculaba las normales sobre la malla sin índice, o sea una
    // normal por cara. Esas son exactamente las que `flatShading: true` deriva
    // en la GPU con derivadas de pantalla, gratis. Enviarlas sería duplicar
    // datos —y además impide soldar la malla, porque cada esquina llevaría una
    // normal distinta y ningún vértice coincidiría con otro.
    prim.setAttribute('NORMAL', null)
    // Cualquier otro atributo del original (uv, etc.) ya no cuadra en número de
    // vértices con la malla nueva: se quita en vez de dejar basura.
    for (const nombre of prim.listSemantics()) {
      if (nombre !== 'POSITION' && nombre !== 'NORMAL') prim.setAttribute(nombre, null)
    }
  }
}

// La textura base nunca se usa: el runtime sustituye todo material por su
// MeshPhysicalMaterial. `prune` no la quita porque SÍ está referenciada.
for (const mat of doc.getRoot().listMaterials()) {
  mat.setBaseColorTexture(null)
}

// Sin índice, la malla ocupa 1 MB: cada triángulo repite sus 3 vértices. Al
// soldarla, los vértices compartidos se unifican y aparecen los índices.
//
// NO se cuantiza, y es deliberado. Se probó (122 KB en vez de 217) y provocaba
// un TEMBLOR visible: al no enviar normales, `flatShading` las deriva de las
// posiciones, así que el error de cuantización se convierte en error de normal.
// Sobre un metal con clearcoat eso no se ve como imprecisión, se ve como
// centelleo — las facetas parpadean al moverse la cámara.
//
// Los 95 KB de más compran una superficie quieta. Y el balance sigue a favor:
// al hornear desapareció el chunk del worker (119 KB de JS), así que contra el
// estado anterior el sitio pesa ~42 KB más y se ahorra el cálculo entero.
await doc.transform(weld(), prune(), reorder({ encoder: MeshoptEncoder }))
doc.createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })

const bytes = await io.writeBinary(doc)
writeFileSync(SALIDA, bytes)

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
console.log(`triángulos : ${antes} → ${despues}`)
console.log(`entrada    : ${kb(readFileSync(ENTRADA).length)}`)
console.log(`salida     : ${kb(bytes.length)}  → ${SALIDA}`)
