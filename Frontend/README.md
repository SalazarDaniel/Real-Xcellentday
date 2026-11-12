# Xcellent Day — Frontend

Aplicación web en **React 19 + TypeScript + Vite** con React Router.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173 (redirige /api al backend en http://localhost:8000)
npm run build    # verificación de tipos + build de producción en dist/
npm run lint     # oxlint
```

Para cambiar el destino del proxy de la API en desarrollo define `API_PROXY_TARGET`
(dentro de Docker Compose es `http://backend:8000`).

## Estructura

```
src/
  api/          cliente HTTP (token JWT, manejo de 401) y tipos de la API
  auth/         contexto de sesión (login, logout, expiración)
  components/   layout, encabezado de boda, alertas y controles de formulario
  lib/          formato de moneda/fechas y hook useApi
  pages/        una pantalla por requerimiento (Dashboard, Bodas, Onboarding, Expediente,
                Presupuesto, Tareas, Proveedores, Usuarios, Login)
  index.css     sistema visual (tokens de color, tipografía y componentes)
```
