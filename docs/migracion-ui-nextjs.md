# Migración de la interfaz a Next.js (diseño de Figma «X-Cellent»)

Rama: `feat/ui-nextjs`

El frontend de React + Vite se reemplazó por **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**,
siguiendo el diseño de Figma. Corre en **http://localhost:3000**.

## Verificación

- **Backend:** 44 pruebas pasan (`pytest`) y `ruff` sin observaciones.
- **Frontend:** `tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- **Navegador (Playwright):** flujo completo (registro, alta de pareja, asistente, pagos, invitados,
  proveedores, tareas y acceso de administrador) en escritorio y a 390 px de ancho, sin desplazamiento
  horizontal.

## Qué incluye

**Pantallas del Figma**

- Landing, inicio de sesión y registro.
- «Mis Eventos» con indicadores y tarjetas de boda.
- Modal «Registrar nueva pareja».
- Proveedores en tarjetas por tipo de servicio, con modal de alta y edición.
- Detalle del evento con las pestañas **Pagos** (dona de distribución) e **Invitados**.

**Páginas anteriores con el nuevo estilo**

- Presupuesto, Tareas y Proveedores contratados como pestañas extra del detalle del evento.
- Tareas también en la barra lateral.
- Usuarios para el administrador.

**Modal de pareja.** El diseño pide un solo nombre («Ana & Carlos») y un solo contacto. Al guardar se
crea un borrador y se abre el asistente de 3 pasos para completar lo que exige el backend (estilo,
invitados y presupuesto).

**Cambios en el backend** (commit aparte)

- `POST /auth/registro`: registro público; siempre crea una cuenta **Wedding Planner**, nunca administrador.
- Invitados: `GET/POST /bodas/{id}/invitados`, `PATCH/DELETE /invitados/{id}`, con nuevo campo `mesa`
  (migración `0002`).
- `BodaOut` incluye `presupuesto_total` y `progreso` (% de tareas completadas).
- `ProveedorOut` incluye `clientes` (parejas de bodas activas que lo contratan).

## Diferencias con el diseño

- **Límite de Figma:** se alcanzó el límite de llamadas del plan Starter a mitad del trabajo.
  Dashboard, login, registro, el modal de pareja y la tarjeta de proveedor usan las especificaciones
  exactas de Figma. Las pestañas Pagos e Invitados, el modal de proveedor y la landing se hicieron a
  partir de capturas, así que el espaciado puede variar un poco.
- **Fotografías:** las imágenes de la landing no se pudieron descargar; por ahora son bloques de color.
- **Tipos de proveedor:** el diseño muestra 8 (incluye Pastelería, Decoración y Moda) y el backend
  tiene 6. «Otro» cubre el resto; agregar tipos reales requiere un cambio en la base de datos.
- **«¿Olvidaste tu contraseña?»** solo muestra un aviso para contactar al administrador (no existe
  restablecimiento en el backend). Términos y Privacidad son texto, no páginas.

## Cómo levantarlo

- El frontend pasó del puerto **5173 al 3000**.
- Si otro contenedor ocupa el puerto 5432, define `POSTGRES_PORT=5433` en un `.env` junto a
  `docker-compose.yml`.
- La primera vez después de este cambio usa `docker compose up -d --build -V`. Sin `-V`, Docker
  reutiliza las dependencias del frontend anterior y la app no arranca.
- Administrador inicial: `admin@xcellentday.com` / `Admin12345`.
