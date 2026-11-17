import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // AR.js necesita HTTPS para pedir la cámara desde el celular.
    // El certificado es autofirmado: el navegador va a mostrar una advertencia.
    basicSsl(),
  ],
  resolve: {
    // AR.js trae su propia copia de three; forzamos una sola instancia.
    dedupe: ['three'],
  },
  server: {
    host: true,
    port: 5173,
  },
})
