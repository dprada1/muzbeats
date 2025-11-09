import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  test: {
    environment: 'jsdom',
    globals: true,
  },

  server: {
    host: "0.0.0.0",
    fs: {
      strict: true,
    },
    proxy: {
      // Proxy /api requests to the backend server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy /assets requests to the backend server
      '/assets': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  }
})
