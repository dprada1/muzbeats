import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { Plugin } from 'vite'

// Plugin to inject production CSP (removes unsafe-inline from script-src)
// This makes production more secure while keeping dev functionality
function cspPlugin(): Plugin {
  return {
    name: 'csp-plugin',
    transformIndexHtml(html, ctx) {
      // In production builds, remove 'unsafe-inline' from script-src
      // Development keeps it for Vite HMR (Hot Module Replacement)
      // We keep unsafe-eval (PayPal SDK requires it)
      // We keep unsafe-inline for style-src (PayPal buttons and Tailwind need it)
      const isProduction = !ctx.server // ctx.server is undefined in production builds
      
      if (isProduction) {
        // Production: Remove unsafe-inline from script-src for better security
        // Match the entire script-src directive including all whitespace
        const productionScriptSrc = `script-src 'self' 
          https://www.paypal.com 
          https://www.sandbox.paypal.com 
          https://static.cloudflareinsights.com 
          'unsafe-eval';`
        
        // More flexible regex that handles any whitespace between tokens
        return html.replace(
          /script-src\s+'self'[\s\S]*?'unsafe-inline'[\s\S]*?'unsafe-eval';/,
          productionScriptSrc
        )
      }
      
      // Development: Keep unsafe-inline for Vite HMR
      return html
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    cspPlugin(),
  ],

  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/main.tsx',
      ],
    },
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
