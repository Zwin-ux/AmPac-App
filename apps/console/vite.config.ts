import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            '@tanstack/react-query',
            '@tanstack/query-core',
            '@azure/msal-browser',
            '@azure/msal-react'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
