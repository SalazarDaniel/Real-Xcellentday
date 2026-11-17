from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import EstadoRSVP
from app.schemas.common import ORMModel, Phone10


class InvitadoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    correo: EmailStr | None = None
    telefono: Phone10 | None = None
    acompanantes: int = Field(default=0, ge=0, le=20)
    mesa: str | None = Field(default=None, max_length=50)
    confirmacion: EstadoRSVP = EstadoRSVP.PENDIENTE

    @field_validator("nombre")
    @classmethod
    def strip_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre del invitado es obligatorio")
        return v

    @field_validator("correo", "telefono", "mesa", mode="before")
    @classmethod
    def vacio_a_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class InvitadoCreate(InvitadoBase):
    pass


class InvitadoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    correo: EmailStr | None = None
    telefono: Phone10 | None = None
    acompanantes: int | None = Field(default=None, ge=0, le=20)
    mesa: str | None = Field(default=None, max_length=50)
    confirmacion: EstadoRSVP | None = None

    @field_validator("correo", "telefono", "mesa", mode="before")
    @classmethod
    def vacio_a_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class InvitadoOut(ORMModel):
    id: int
    boda_id: int
    nombre: str
    correo: str | None
    telefono: str | None
    acompanantes: int
    mesa: str | None
    confirmacion: EstadoRSVP
