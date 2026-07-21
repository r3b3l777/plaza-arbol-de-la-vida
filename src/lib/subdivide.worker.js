import { BufferAttribute, BufferGeometry } from 'three'
import { LoopSubdivision } from 'three-subdivide'

/**
 * Subdivisión Loop del logotipo, FUERA del hilo principal.
 *
 * Medido: `LoopSubdivision.modify` sobre esta malla (5.052 → 34.784 triángulos)
 * tarda ~200 ms en un Mac y ~700 ms en un iPhone. Corriendo en el hilo
 * principal eso es la página CONGELADA ese tiempo: no hay scroll, no hay
 * pintado, y el árbol no existe hasta que termina. Aquí abajo ese mismo cálculo
 * no le quita un frame a nadie.
 *
 * El GLB no trae normales (solo `position`), así que calcularlas no es
 * opcional. Se hacen aquí también, sobre la malla ya subdividida y sin índice,
 * que es exactamente lo que producía el código original.
 */
self.onmessage = (e) => {
  const { id, position, index } = e.data

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(position, 3))
  if (index) g.setIndex(new BufferAttribute(index, 1))

  const out = LoopSubdivision.modify(g, 1, {
    split: true,
    uvSmooth: true,
    preserveEdges: false,
    maxTriangles: 250000,
  })
  out.computeVertexNormals()

  const pos = out.attributes.position.array
  const nrm = out.attributes.normal.array
  // Transferibles: se ceden los búferes en vez de copiarlos (son ~2.4 MB).
  self.postMessage({ id, position: pos, normal: nrm }, [pos.buffer, nrm.buffer])
}
