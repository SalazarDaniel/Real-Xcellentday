import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.routers import auth, bodas, dashboard, presupuesto, proveedores, tareas, usuarios
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.auth import ensure_first_admin

logger = logging.getLogger("xcellentday")

FIELD_LABELS = {
    "nombre_completo": "Nombre completo",
    "correo": "Correo electrónico",
    "password": "Contraseña",
    "password_confirmacion": "Confirmación de contraseña",
    "telefono": "Teléfono",
    "nombre_contrayente1": "Nombre del contrayente 1",
    "nombre_contrayente2": "Nombre del contrayente 2",
    "fecha": "Fecha de la boda",
    "lugar": "Lugar",
    "estilo": "Estilo",
    "invitados_estimados": "Invitados estimados",
    "monto_total": "Monto total",
    "monto_acordado": "Monto acordado",
    "monto": "Monto",
    "descripcion": "Descripción",
    "titulo": "Título",
    "fecha_limite": "Fecha límite",
    "fecha_vencimiento": "Fecha de vencimiento",
    "nombre": "Nombre",
    "tipo_servicio": "Tipo de servicio",
}


def _mensaje(err: dict) -> str:
    """Traduce los errores de validación de Pydantic a mensajes en español (RNF06)."""
    tipo = err.get("type", "")
    ctx = err.get("ctx") or {}
    if tipo == "missing":
        return "Este campo es obligatorio"
    if tipo == "string_too_short":
        return "Este campo es obligatorio"
    if tipo == "string_too_long":
        return f"Máximo {ctx.get('max_length')} caracteres"
    if tipo == "string_pattern_mismatch":
        return "Debe contener exactamente 10 dígitos"
    if tipo in ("greater_than", "greater_than_equal"):
        comparacion = "a" if tipo == "greater_than" else "o igual a"
        return f"Debe ser mayor {comparacion} {ctx.get('gt', ctx.get('ge'))}"
    if tipo in ("less_than_equal",):
        return f"Debe ser menor o igual a {ctx.get('le')}"
    if tipo == "value_error" and "email" in str(err.get("msg", "")).lower():
        return "El correo no tiene un formato válido"
    if tipo == "value_error":
        return str(err.get("msg", "")).removeprefix("Value error, ")
    if tipo.startswith("date") or tipo.startswith("datetime"):
        return "Fecha inválida"
    if tipo in ("decimal_parsing", "float_parsing", "int_parsing"):
        return "Debe ser un número válido"
    if tipo == "decimal_max_places":
        return "Máximo 2 decimales"
    if tipo == "enum":
        return "Valor no permitido"
    return str(err.get("msg", "Dato inválido"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    with SessionLocal() as db:
        try:
            ensure_first_admin(db)
        except Exception:  # la BD puede no estar migrada aún
            logger.exception("No se pudo verificar el administrador inicial")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="API REST del CRM Xcellent Day para wedding planners.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errores = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        campo = loc[-1] if loc else ""
        errores.append(
            {
                "campo": ".".join(loc),
                "etiqueta": FIELD_LABELS.get(campo, campo),
                "mensaje": _mensaje(err),
            }
        )
    resumen = "; ".join(
        f"{e['etiqueta']}: {e['mensaje']}" if e["etiqueta"] else e["mensaje"] for e in errores
    )
    return JSONResponse(
        status_code=422,
        content={"detail": resumen or "Datos inválidos", "errores": errores},
    )


@app.exception_handler(IntegrityError)
async def integrity_handler(_: Request, exc: IntegrityError):
    logger.warning("IntegrityError: %s", exc.orig)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "La operación viola una restricción de integridad de los datos"},
    )


api = APIRouter(prefix="/api")
for r in (auth, usuarios, bodas, proveedores, presupuesto, tareas, dashboard):
    api.include_router(r.router)
app.include_router(api)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}
