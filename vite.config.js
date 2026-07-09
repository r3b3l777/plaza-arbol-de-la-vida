import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier carpeta
  // (incluida una demo local con `npx serve`).
  base: './',
  plugins: [react(), tailwindcss()],
})
