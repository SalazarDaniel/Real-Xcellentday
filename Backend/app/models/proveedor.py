from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import enum_col, utcnow
from app.models.enums import TipoServicio


class Proveedor(Base):
    """Proveedor del catálogo de una wedding planner (RF06)."""

    __tablename__ = "proveedores"
    __table_args__ = (UniqueConstraint("planner_id", "correo", name="uq_proveedor_planner_correo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    planner_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), index=True
    )
    nombre: Mapped[str] = mapped_column(String(150))
    tipo_servicio: Mapped[TipoServicio] = mapped_column(enum_col(TipoServicio, "tipo_servicio"))
    nombre_contacto: Mapped[str | None] = mapped_column(String(150), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(10), nullable=True)
    correo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
