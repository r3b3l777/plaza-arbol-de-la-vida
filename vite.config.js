import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier carpeta
  // (incluida una demo local con `npx serve`).
  base: './',
  plugins: [react(), tailwindcss()],
  // El worker de subdivisión se instancia con `{ type: 'module' }`, así que el
  // build tiene que emitirlo como módulo ES. Vite empaqueta los workers como
  // IIFE por defecto: en `npm run dev` funcionaba (el servidor lo sirve como
  // módulo) y en producción no, que es justo el síntoma que se veía —bien en
  // local, mal en Vercel—. Además, en formato ES el worker comparte código con
  // el resto del bundle en vez de llevarse su propia copia de three.
  worker: { format: 'es' },
})
