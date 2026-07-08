# Plaza Árbol de la Vida · Metepec

Sitio oficial de Plaza Árbol de la Vida, construido según el manual de
identidad de la marca (paleta #20252D / #8F8989 / #DBDBDB / #ECECEC,
tipografías TAN MON CHERI → Italiana + Red Hat Display).

## Stack

- React 19 + Vite 8 + Tailwind CSS 4
- three.js / @react-three/fiber — Árbol de la Vida 3D procedural (instanced,
  carga en chunk separado)
- Framer Motion — reveals y parallax
- Formulario de renta vía FormSubmit (ajax) a la administración

## Comandos

```bash
npm install     # dependencias
npm run dev     # desarrollo → http://localhost:5173
npm run build   # producción → dist/
npm run lint    # oxlint
```

## Estructura

- `src/data/site.js` — única fuente de verdad: inquilinos, contacto,
  horarios, redes, WhatsApp, galería
- `src/components/` — secciones de la página en orden de aparición
- `public/img/` — logo, fotos de la plaza y logos de los 19 inquilinos

## Tipografía de marca

La pila display declara `"TAN Mon Cheri", "Italiana", serif`. Italiana
(Google Fonts) actúa como equivalente libre; al licenciar TAN MON CHERI
basta con servir el `@font-face` y se activa automáticamente.
