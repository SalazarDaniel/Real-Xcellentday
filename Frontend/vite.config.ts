import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// En desarrollo, las peticiones a /api se redirigen al backend de FastAPI.
// Dentro de Docker el destino es http://backend:8000 (ver docker-compose.yml).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8000'
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Necesario para la recarga en caliente con volúmenes de Docker en Windows/macOS
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
      proxy: { '/api': { target, changeOrigin: true } },
    },
  }
})
