from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import enum_col, utcnow
from app.models.enums import Rol


class Usuario(Base):
    """Cuenta del sistema. Administrador y WeddingPlanner se distinguen por `rol` (herencia de
    tabla única)."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_completo: Mapped[str] = mapped_column(String(100))
    correo: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(enum_col(Rol, "rol"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    intentos_fallidos: Mapped[int] = mapped_column(Integer, default=0)
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    creado_por_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    sesiones: Mapped[list["Sesion"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )


class Sesion(Base):
    """Sesión autenticada (RF02/RF03). El token se invalida en servidor marcándola inactiva."""

    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    inicio: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expira_en: Mapped[datetime] = mapped_column(DateTime)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    cerrada_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    usuario: Mapped[Usuario] = relationship(back_populates="sesiones")
