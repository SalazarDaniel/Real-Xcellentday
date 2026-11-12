from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import enum_col, utcnow
from app.models.enums import TipoRecordable


class Recordatorio(Base):
    """Bitácora de recordatorios por correo (RF10). La restricción única evita enviar el mismo
    recordatorio dos veces el mismo día."""

    __tablename__ = "recordatorios"
    __table_args__ = (
        UniqueConstraint(
            "tipo_elemento", "elemento_id", "fecha_programada", name="uq_recordatorio_por_dia"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    planner_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    tipo_elemento: Mapped[TipoRecordable] = mapped_column(
        enum_col(TipoRecordable, "tipo_recordable")
    )
    elemento_id: Mapped[int] = mapped_column(Integer)
    fecha_programada: Mapped[date] = mapped_column(Date)
    asunto: Mapped[str] = mapped_column(String(255))
    enviado: Mapped[bool] = mapped_column(Boolean, default=False)
    intentos: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    enviado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
