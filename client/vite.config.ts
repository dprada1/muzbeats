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
  },

  build: {
    // Enable source maps for production debugging (optional, increases bundle size)
    sourcemap: false,
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'paypal-vendor': ['@paypal/react-paypal-js'],
          'wavesurfer-vendor': ['wavesurfer.js'],
          'ui-vendor': ['lucide-react', 'react-icons', 'react-loading-skeleton'],
          'utils-vendor': ['zod', 'nprogress'],
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // Increase chunk size warning limit (default is 500kb)
    // Large chunks are expected for WaveSurfer and PayPal SDK
    chunkSizeWarningLimit: 1000,
    
    // Minify with esbuild (faster, default) or terser (better compression)
    // esbuild automatically removes console.log in production builds
    minify: 'esbuild',
  },
})
