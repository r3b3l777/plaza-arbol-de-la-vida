import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

// Progreso → factores del recorrido (misma curva que TreeBackground).
function phases(p) {
  const zoomRaw = Math.min(1, p / 0.86)
  const revRaw = Math.max(0, (p - 0.86) / 0.14)
  return {
    reveal: revRaw * revRaw * (3 - 2 * revRaw),
    gem: Math.sin(zoomRaw * Math.PI),
  }
}

// Modula el bloom con la profundidad del zoom: más glow en el punto
// microscópico → sensación de lente de cine. Sin aberración cromática.
function FXDriver({ scrollRef, bloomRef, isMobile }) {
  useFrame(() => {
    const { gem, reveal } = phases(scrollRef.current)
    if (bloomRef.current) {
      // El halo en móvil va MÁS BAJO: con el HDR de estudio el árbol ya llega
      // luminoso al bloom, y sumarle el mismo halo que en escritorio lo lleva
      // al blanco quemado. Se pidió expresamente que brillara menos.
      bloomRef.current.intensity = isMobile
        ? 0.13 + gem * 0.16 + reveal * 0.03
        : 0.24 + gem * 0.28 + reveal * 0.12
    }
  })
  return null
}

/**
 * Post-procesado: bloom limpio (glow de joyería).
 *
 * Va MEMOIZADO a propósito. `@react-three/postprocessing` calcula los args de
 * cada efecto con `useMemo(..., [JSON.stringify(props)])`, y en React 19 `ref`
 * viaja como una prop más. En el primer render el ref es null y no pasa nada,
 * pero en CUALQUIER re-render posterior ese stringify se encuentra el
 * BloomEffect ya construido, que es una estructura circular, y lanza
 * "Converting circular structure to JSON" — una excepción no capturada que
 * tumba todo el árbol de React y deja la página en blanco.
 *
 * Pasaba de verdad: bastaba con cambiar de pestaña y volver. Al aislar los
 * efectos aquí con props estables, React se salta el re-render.
 */
const PostFX = memo(function PostFX({ scrollRef, isMobile }) {
  const bloomRef = useRef()
  return (
    <>
      <EffectComposer disableNormalPass multisampling={isMobile ? 0 : 4}>
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

export default PostFX
