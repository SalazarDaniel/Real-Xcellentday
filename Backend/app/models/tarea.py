from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import enum_col, utcnow
from app.models.enums import EstadoTarea, PrioridadTarea


class Tarea(Base):
    """Tarea de una boda (RF09). Implementa conceptualmente la interfaz Recordable."""

    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True)
    boda_id: Mapped[int] = mapped_column(ForeignKey("bodas.id", ondelete="CASCADE"), index=True)
    titulo: Mapped[str] = mapped_column(String(150))
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_limite: Mapped[date] = mapped_column(Date, index=True)
    prioridad: Mapped[PrioridadTarea] = mapped_column(
        enum_col(PrioridadTarea, "prioridad_tarea"), default=PrioridadTarea.MEDIA
    )
    estado: Mapped[EstadoTarea] = mapped_column(
        enum_col(EstadoTarea, "estado_tarea"), default=EstadoTarea.PENDIENTE, index=True
    )
    fecha_termino: Mapped[date | None] = mapped_column(Date, nullable=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    boda: Mapped["Boda"] = relationship(back_populates="tareas")  # noqa: F821
