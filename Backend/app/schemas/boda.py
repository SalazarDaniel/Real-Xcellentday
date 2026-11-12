from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.config import today
from app.models.enums import EstadoBoda
from app.schemas.common import ORMModel, Phone10, PositiveMoney


class ParejaIn(BaseModel):
    """Paso 1 del onboarding."""

    nombre_contrayente1: str = Field(min_length=1, max_length=100)
    nombre_contrayente2: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    telefono: Phone10


class EventoIn(BaseModel):
    """Paso 2 del onboarding."""

    fecha: date
    lugar: str = Field(min_length=1, max_length=200)
    estilo: str = Field(min_length=1, max_length=100)
    invitados_estimados: int = Field(ge=1, le=10000)

    @field_validator("fecha")
    @classmethod
    def fecha_futura(cls, v: date) -> date:
        if v <= today():
            raise ValueError("La fecha de la boda debe ser futura")
        return v


class ConceptoInicialIn(BaseModel):
    descripcion: str = Field(min_length=1, max_length=150)
    monto_acordado: PositiveMoney


class PresupuestoInicialIn(BaseModel):
    """Paso 3 del onboarding."""

    monto_total: PositiveMoney
    conceptos: list[ConceptoInicialIn] = []


class OnboardingIn(BaseModel):
    pareja: ParejaIn
    evento: EventoIn
    presupuesto: PresupuestoInicialIn


class BorradorIn(BaseModel):
    """Avance parcial del asistente. Los datos no se validan hasta confirmar."""

    paso: int = Field(ge=1, le=3)
    pareja: dict | None = None
    evento: dict | None = None
    presupuesto: dict | None = None


class ParejaOut(ORMModel):
    id: int
    nombre_contrayente1: str
    nombre_contrayente2: str
    correo: str
    telefono: str
    nombre: str


class BodaOut(ORMModel):
    id: int
    estado: EstadoBoda
    paso_onboarding: int
    fecha: date | None
    lugar: str | None
    estilo: str | None
    invitados_estimados: int | None
    pareja: ParejaOut | None
    dias_restantes: int | None = None
    datos_borrador: dict | None = None


class BodaUpdate(BaseModel):
    lugar: str | None = Field(default=None, min_length=1, max_length=200)
    estilo: str | None = Field(default=None, min_length=1, max_length=100)
    invitados_estimados: int | None = Field(default=None, ge=1, le=10000)
    fecha: date | None = None
    estado: EstadoBoda | None = None
