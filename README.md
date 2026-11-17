# Xcellent Day

CRM web para wedding planners: centraliza parejas, bodas, proveedores, presupuestos y pagos,
tareas, fechas importantes e invitados en un solo sistema.

Proyecto de Proyectos VII, Universidad Modelo Campus Mérida (agosto–diciembre 2026).

| Capa          | Tecnología                                                        |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4     |
| Backend       | FastAPI, SQLAlchemy 2, Alembic, Pydantic, JWT, bcrypt             |
| Base de datos | PostgreSQL 16                                                     |
| Dependencias  | Poetry (backend), npm (frontend)                                  |
| Contenedores  | Docker y Docker Compose                                           |

```
.
├── Backend/            API REST (FastAPI + Poetry)
│   ├── app/
│   │   ├── api/        dependencias de seguridad y routers por módulo
│   │   ├── core/       configuración, conexión a BD, hash y JWT
│   │   ├── models/     modelos SQLAlchemy (diagrama de clases)
│   │   ├── schemas/    esquemas Pydantic de entrada y salida
│   │   └── services/   lógica de negocio (autenticación, pagos, onboarding)
│   ├── alembic/        migraciones
│   ├── scripts/        entrypoint de Docker y datos de demostración
│   └── tests/          pruebas con pytest
├── Frontend/           Next.js + Tailwind (diseño de Figma «X-Cellent»)
└── docker-compose.yml  db + backend + frontend
```

## Arranque rápido con Docker

Requisitos: Docker Desktop (o Docker Engine con el plugin Compose).

```bash
docker compose up --build
```

| Servicio        | URL                         |
| --------------- | --------------------------- |
| Aplicación web  | http://localhost:3000       |
| API             | http://localhost:8000       |
| Swagger/OpenAPI | http://localhost:8000/docs  |

Al arrancar, el backend aplica las migraciones y crea un **administrador inicial** si la base
está vacía: `admin@xcellentday.com` / `Admin12345` (configurable en `.env`, ver `.env.example`).

Para cargar una wedding planner con datos de ejemplo (dos bodas, proveedores, pagos y tareas):

```bash
docker compose exec backend python -m scripts.seed_demo
# planner@xcellentday.com / Planner123
```

## Desarrollo sin Docker

**Backend** (Python 3.12+ y Poetry 2):

```bash
cd Backend
cp .env.example .env            # ajusta DATABASE_URL a tu PostgreSQL local
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

**Frontend** (Node 22+):

```bash
cd Frontend
npm install
npm run dev                     # http://localhost:3000; /api se envía a http://localhost:8000
                                # (cámbialo con API_PROXY_TARGET)
```

## Pruebas y calidad

```bash
cd Backend
poetry run pytest --cov         # SQLite en memoria por defecto
TEST_DATABASE_URL=postgresql+psycopg://usuario:clave@localhost:5432/xcellentday_test poetry run pytest
poetry run ruff check .

cd ../Frontend
npm run lint && npm run build
```

El flujo de GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, migraciones y pruebas del
backend contra PostgreSQL (cobertura mínima 60 %, RNF10) y el build del frontend en cada push y
pull request.

Nueva migración tras cambiar modelos:

```bash
poetry run alembic revision --autogenerate -m "descripción del cambio"
```

## Avance de requerimientos

| ID   | Requerimiento                              | Estado                                                    |
| ---- | ------------------------------------------ | --------------------------------------------------------- |
| RF01 | Registro de cuenta y asignación de rol     | Hecho                                                     |
| RF02 | Inicio de sesión                           | Hecho (JWT de 8 h, bloqueo de 15 min tras 5 intentos)     |
| RF03 | Cierre de sesión                           | Hecho (el token se invalida en el servidor)               |
| RF04 | Onboarding de 3 pasos                      | Hecho (con borradores que se retoman en el mismo paso)    |
| RF05 | Expediente digital por boda                | Hecho (bloques de invitados y fechas listos para RF12/13) |
| RF06 | Gestión de proveedores                     | Hecho                                                     |
| RF07 | Presupuestos y pagos simulados             | Hecho                                                     |
| RF08 | Alertas de vencimiento de pagos            | Hecho                                                     |
| RF09 | Gestión de tareas por boda                 | Hecho                                                     |
| RF10 | Recordatorios automáticos por correo       | Pendiente (modelo `Recordatorio` ya creado)               |
| RF11 | Dashboard general                          | Hecho                                                     |
| RF12 | Fechas importantes y calendario            | Pendiente (modelo y tabla creados)                        |
| RF13 | Módulo de invitados                        | Pendiente (modelo y tabla creados)                        |
| RF14 | Búsqueda global                            | Pendiente (hay búsqueda por módulo en bodas y proveedores)|

Requerimientos no funcionales ya cubiertos: contraseñas con bcrypt (RNF01), JWT con sesión
revocable (RNF02), control de acceso por rol y propietario con respuestas 403 (RNF03), interfaz en
español con mensajes de error por campo (RNF06), diseño responsivo (RNF07), API documentada en
Swagger (RNF09), pruebas automatizadas con cobertura alta (RNF10), llaves foráneas, unicidad y
montos `NUMERIC(12,2)` (RNF11) y `docker compose up` como único paso (RNF12).

## Convenciones

- Rama `main` protegida: los cambios entran por pull request revisado por otro integrante (RNF09).
- El código de dominio usa los nombres del diagrama de clases (Boda, Pareja, Presupuesto, …).
- Todas las rutas de la API llevan el prefijo `/api`.
