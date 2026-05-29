import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['kuroshiro', 'kuroshiro-analyzer-kuromoji'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})