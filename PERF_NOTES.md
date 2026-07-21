# Optimización de rendimiento — Plaza Árbol de la Vida

**Objetivo:** que el sitio corra fluido en móvil (iPhone 15 Pro Max) y escritorio,
**sin cambiar nada del diseño**. Solo optimizaciones invisibles.

**Diagnóstico:** el cuello de botella es el árbol 3D de fondo
(`src/components/TreeBackground.jsx`), que renderiza a pantalla completa cada
frame con: material físico + clearcoat, 7 luces por píxel, modelo subdividido a
~250k triángulos, bloom, y `frameloop="always"`. Eso satura la GPU del teléfono
y hace que el scroll de Lenis se sienta pegajoso. En móvil los paneles ya son
casi sólidos (bien); en escritorio hay `backdrop-filter: blur(28px)` que
recompone el canvas animado cada frame.

---

## Ya aplicado (en `src/components/TreeBackground.jsx`, verificado con esbuild)

1. `antialias: false` en el `<Canvas>` — el AA lo hace el EffectComposer; el MSAA
   del canvas actuaba sobre el quad final del post-proceso, sin efecto visible.
2. dpr móvil `1.75 → 1.5` — ~26% menos píxeles, imperceptible a 460 ppi.
3. MicroDust en móvil recalcula 1 de cada 3 frames (antes 1 de 2).

**Verificar primero:** `npm run build` y `npm run dev` en el Mac (aquí no corrió
por el binario nativo de Vite 8, que es solo un tema de entorno, no de código).
Confirmar que el árbol se ve idéntico. Medir FPS con el panel de rendimiento de
Chrome DevTools y en el iPhone real.

---

## Siguientes pasos (de menor a mayor riesgo visual — probar y medir cada uno)

### A. Cap de FPS del 3D en móvil (mayor ganancia, casi invisible)
El árbol se mueve lentísimo; renderizarlo a 60fps continuos es lo que funde la
GPU. Limitarlo a ~30–40fps en móvil libera GPU para que el scroll vaya fluido.
El movimiento es tan lento que 30fps es indistinguible.
- r3f no trae cap nativo. Implementar con un frameloop manual: `frameloop="never"`
  + un `requestAnimationFrame` propio que llame a `gl.render`/`advance` con
    throttle por `performance.now()`, solo en móvil.
- Ojo: mantener el frameloop 'always' en escritorio; y respetar `reducedMotion`
  (ahí ya es 'demand').

### B. Pausar el 3D cuando la pestaña/página no se ve
Ya hay `visibilitychange`. Añadir: si el usuario deja de hacer scroll y no mueve
el cursor por X segundos, bajar a `frameloop="demand"` (el árbol queda "vivo"
pero sin quemar GPU). Al primer scroll/mousemove, volver a 'always'.

### C. dpr móvil 1.5 → 1.35 (si aún hace falta)
Otro ~20% menos de píxeles. Empieza a notarse levemente en los bordes del metal
si se busca. Probar en el teléfono antes de dejarlo.

### D. Costo del material (solo si A–C no bastan; toca el look, medir con lupa)
`clearcoat` duplica el costo del shader por píxel a pantalla completa. Una versión
móvil con `clearcoat` un poco menor (p.ej. 0.6) casi no cambia el brillo pero
ahorra relleno. **Cambio con más riesgo visual — dejar para el final.**

### E. Escritorio: costo de los paneles de vidrio
`backdrop-filter: blur(28-30px)` en `.panel-light/.panel-white` (`src/index.css`)
recompone el canvas animado cada frame. Bajar el radio de blur (28 → ~18px) casi
no cambia el look y aligera bastante la composición. Probar A/B.

---

## Reglas
- Nada de cambiar la composición, colores, tipografías ni el recorrido de scroll.
- Cada cambio: aplicar → `npm run dev` → comparar lado a lado con el diseño
  actual → medir FPS en Chrome y en iPhone → conservar solo si es imperceptible.
- Objetivo de fluidez: scroll estable sin caídas por debajo de ~50fps en el
  Pro Max.
