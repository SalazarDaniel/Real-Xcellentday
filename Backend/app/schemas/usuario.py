from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.security import password_policy_errors
from app.models.enums import Rol
from app.schemas.common import ORMModel


class LoginIn(BaseModel):
    correo: EmailStr
    password: str


class UsuarioOut(ORMModel):
    id: int
    nombre_completo: str
    correo: EmailStr
    rol: Rol
    activo: bool
    fecha_registro: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    usuario: UsuarioOut


class RegistroIn(BaseModel):
    """Alta pública de una wedding planner. El rol no se elige: siempre es WEDDING_PLANNER."""

    nombre_completo: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    password: str
    password_confirmacion: str

    @field_validator("nombre_completo")
    @classmethod
    def strip_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre completo es obligatorio")
        return v

    @field_validator("password")
    @classmethod
    def politica(cls, v: str) -> str:
        errores = password_policy_errors(v)
        if errores:
            raise ValueError("; ".join(errores))
        return v

    @model_validator(mode="after")
    def confirmacion(self):
        if self.password != self.password_confirmacion:
            raise ValueError("La contraseña y su confirmación no coinciden")
        return self


class UsuarioCreate(RegistroIn):
    rol: Rol


class UsuarioUpdate(BaseModel):
    rol: Rol | None = None
    activo: bool | None = None
