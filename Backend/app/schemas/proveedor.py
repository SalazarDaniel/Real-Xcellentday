from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import TipoServicio
from app.schemas.common import ORMModel, Phone10


class ProveedorBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    tipo_servicio: TipoServicio
    nombre_contacto: str | None = Field(default=None, max_length=150)
    telefono: Phone10 | None = None
    correo: EmailStr | None = None
    notas: str | None = None

    @field_validator("nombre_contacto", "notas", "telefono", "correo", mode="before")
    @classmethod
    def vacio_a_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(ProveedorBase):
    activo: bool | None = None


class ProveedorOut(ORMModel):
    id: int
    nombre: str
    tipo_servicio: TipoServicio
    nombre_contacto: str | None
    telefono: str | None
    correo: str | None
    notas: str | None
    activo: bool
