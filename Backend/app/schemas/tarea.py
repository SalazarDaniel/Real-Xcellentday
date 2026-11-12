from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import EstadoTarea, PrioridadTarea
from app.schemas.common import ORMModel


class TareaCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=150)
    descripcion: str | None = None
    fecha_limite: date
    prioridad: PrioridadTarea = PrioridadTarea.MEDIA
    # RF09 flujo 3a: confirmar cuando la fecha límite es posterior a la boda
    confirmar: bool = False


class TareaUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=150)
    descripcion: str | None = None
    fecha_limite: date | None = None
    prioridad: PrioridadTarea | None = None
    estado: EstadoTarea | None = None
    confirmar: bool = False


class TareaOut(ORMModel):
    id: int
    boda_id: int
    titulo: str
    descripcion: str | None
    fecha_limite: date
    prioridad: PrioridadTarea
    estado: EstadoTarea
    fecha_termino: date | None
    vencida: bool = False
    pareja: str | None = None
