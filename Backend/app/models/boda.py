from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import enum_col, utcnow
from app.models.enums import EstadoBoda, EstadoRSVP

# Agregación Boda ◇— Proveedor (0..* a 0..*)
boda_proveedor = Table(
    "boda_proveedor",
    Base.metadata,
    Column("boda_id", ForeignKey("bodas.id", ondelete="CASCADE"), primary_key=True),
    Column("proveedor_id", ForeignKey("proveedores.id", ondelete="RESTRICT"), primary_key=True),
)


class Pareja(Base):
    __tablename__ = "parejas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_contrayente1: Mapped[str] = mapped_column(String(100))
    nombre_contrayente2: Mapped[str] = mapped_column(String(100))
    correo: Mapped[str] = mapped_column(String(255))
    telefono: Mapped[str] = mapped_column(String(10))

    @property
    def nombre(self) -> str:
        return f"{self.nombre_contrayente1} & {self.nombre_contrayente2}"


class Boda(Base):
    """Entidad central del CRM. Mientras está en BORRADOR, los datos capturados del onboarding se
    guardan en `datos_borrador` y `paso_onboarding` recuerda el paso alcanzado (RF04 / UC15)."""

    __tablename__ = "bodas"

    id: Mapped[int] = mapped_column(primary_key=True)
    planner_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), index=True
    )
    pareja_id: Mapped[int | None] = mapped_column(
        ForeignKey("parejas.id", ondelete="RESTRICT"), nullable=True, unique=True
    )
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    lugar: Mapped[str | None] = mapped_column(String(200), nullable=True)
    estilo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invitados_estimados: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[EstadoBoda] = mapped_column(
        enum_col(EstadoBoda, "estado_boda"), default=EstadoBoda.BORRADOR, index=True
    )
    paso_onboarding: Mapped[int] = mapped_column(Integer, default=1)
    datos_borrador: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    pareja: Mapped["Pareja | None"] = relationship()
    expediente: Mapped["ExpedienteDigital | None"] = relationship(
        back_populates="boda", cascade="all, delete-orphan", uselist=False
    )
    presupuesto: Mapped["Presupuesto | None"] = relationship(  # noqa: F821
        back_populates="boda", cascade="all, delete-orphan", uselist=False
    )
    tareas: Mapped[list["Tarea"]] = relationship(  # noqa: F821
        back_populates="boda", cascade="all, delete-orphan"
    )
    fechas_importantes: Mapped[list["FechaImportante"]] = relationship(
        back_populates="boda", cascade="all, delete-orphan"
    )
    invitados: Mapped[list["Invitado"]] = relationship(
        back_populates="boda", cascade="all, delete-orphan"
    )
    proveedores: Mapped[list["Proveedor"]] = relationship(  # noqa: F821
        secondary=boda_proveedor
    )


class ExpedienteDigital(Base):
    """Composición 1:1 con Boda. Su contenido se calcula al consultarse (RF05)."""

    __tablename__ = "expedientes_digitales"

    id: Mapped[int] = mapped_column(primary_key=True)
    boda_id: Mapped[int] = mapped_column(ForeignKey("bodas.id", ondelete="CASCADE"), unique=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    boda: Mapped[Boda] = relationship(back_populates="expediente")


class FechaImportante(Base):
    __tablename__ = "fechas_importantes"

    id: Mapped[int] = mapped_column(primary_key=True)
    boda_id: Mapped[int] = mapped_column(ForeignKey("bodas.id", ondelete="CASCADE"), index=True)
    titulo: Mapped[str] = mapped_column(String(150))
    fecha: Mapped[date] = mapped_column(Date)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)

    boda: Mapped[Boda] = relationship(back_populates="fechas_importantes")


class Invitado(Base):
    __tablename__ = "invitados"

    id: Mapped[int] = mapped_column(primary_key=True)
    boda_id: Mapped[int] = mapped_column(ForeignKey("bodas.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(150))
    correo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(10), nullable=True)
    acompanantes: Mapped[int] = mapped_column(Integer, default=0)
    mesa: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confirmacion: Mapped[EstadoRSVP] = mapped_column(
        enum_col(EstadoRSVP, "estado_rsvp"), default=EstadoRSVP.PENDIENTE
    )

    boda: Mapped[Boda] = relationship(back_populates="invitados")
