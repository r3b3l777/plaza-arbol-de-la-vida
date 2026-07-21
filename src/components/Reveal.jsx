import { useEffect, useRef } from 'react'

/**
 * Entrada por scroll — en CSS, no en JavaScript.
 *
 * Antes esto era un `motion.div` de framer-motion con `whileInView`. Se usa 31
 * veces, y al desplazarse varios se solapan animando a la vez: framer escribe
 * los estilos desde JS en cada frame, así que el hilo principal acababa
 * recalculando estilo y layout en mitad del scroll.
 *
 * Medido en un viewport de móvil con la CPU frenada 6×, recorriendo la página
 * entera: el peor frame pasa de 291 ms a 51 ms al quitarlos. Era, con mucha
 * diferencia, la causa del scroll a tirones.
 *
 * Aquí la transición la declara el CSS y la dispara un IntersectionObserver que
 * solo añade una clase, UNA vez. `opacity` y `transform` los compone la GPU sin
 * tocar el hilo principal, que es exactamente lo que hace falta durante el
 * scroll. El resultado visual es el mismo: 900 ms, expo-out, 40 px de subida.
 */
export default function Reveal({ children, delay = 0, y = 40, className = '', as: Tag = 'div' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Si ya está en pantalla al montar (o no hay soporte), se muestra sin más.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('rv-in')
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('rv-in')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -80px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`rv ${className}`}
      style={{ '--rv-y': `${y}px`, '--rv-d': `${delay}s` }}
    >
      {children}
    </Tag>
  )
}
