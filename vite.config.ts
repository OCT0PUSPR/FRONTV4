import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './@'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/data': path.resolve(__dirname, './src/data'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  server: {
    host: '0.0.0.0', // Makes Vite accessible from outside the container
    port: 5173,
    strictPort: false, // Fails if port is already in use
    watch: {
      usePolling: true, // Necessary for hot reload in Docker
    },
  },
})
