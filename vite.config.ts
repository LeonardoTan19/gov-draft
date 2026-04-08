import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (
            id.includes('/@codemirror/state/') ||
            id.includes('/@codemirror/commands/')
          ) {
            return 'codemirror-core-vendor'
          }

          if (id.includes('/@codemirror/view/')) {
            return 'codemirror-view-vendor'
          }

          if (
            id.includes('/@codemirror/language/') ||
            id.includes('/@codemirror/lang-markdown/')
          ) {
            return 'codemirror-language-vendor'
          }

          if (id.includes('/vue/') || id.includes('/pinia/')) {
            return 'vue-vendor'
          }

          if (
            id.includes('/markdown-it/') ||
            id.includes('/yaml/') ||
            id.includes('/handlebars/')
          ) {
            return 'document-vendor'
          }

          if (id.includes('/lucide-vue-next/')) {
            return 'icons-vendor'
          }

          if (id.includes('/jspdf/')) {
            return 'jspdf-vendor'
          }

          if (id.includes('/html2canvas/')) {
            return 'html2canvas-vendor'
          }

          if (id.includes('/dompurify/')) {
            return 'dompurify-vendor'
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/test/**/*.test.ts', 'src/**/test/**/*.pbt.test.ts', 'server/**/*.test.ts'],
  },
})
