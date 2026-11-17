import type { NextConfig } from "next";

// En desarrollo y en Docker, /api se redirige al backend de FastAPI.
// Dentro de docker compose el destino es http://backend:8000 (ver docker-compose.yml).
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  experimental: {
    // El área privada se pinta en el navegador (sesión en sessionStorage, datos pedidos desde el
    // cliente), así que solo se valida navegación instantánea donde un segmento lo pida con `instant`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
