import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
  base: './',
  plugins: [react()],
  define: { 'import.meta.env.VITE_AUTH_PROFILE': JSON.stringify(mode === 'development' ? 'dev' : 'production') },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: env.IKARUS_API_TARGET ?? 'http://127.0.0.1:8787', changeOrigin: false } },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  }
})
