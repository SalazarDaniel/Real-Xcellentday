from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import MONEY, ZERO, enum_col, utcnow
from app.models.enums import EstadoPago


class Presupuesto(Base):
    """Presupuesto de una boda (RF07). Comprometido, pagado y saldo se recalculan a partir de sus
    conceptos y pagos, por lo que siempre reflejan el último cambio."""

    __tablename__ = "presupuestos"

    id: Mapped[int] = mapped_column(primary_key=True)
    boda_id: Mapped[int] = mapped_column(ForeignKey("bodas.id", ondelete="CASCADE"), unique=True)
    monto_total: Mapped[Decimal] = mapped_column(MONEY)

    boda: Mapped["Boda"] = relationship(back_populates="presupuesto")  # noqa: F821
    conceptos: Mapped[list["ConceptoPresupuesto"]] = relationship(
        back_populates="presupuesto",
        cascade="all, delete-orphan",
        order_by="ConceptoPresupuesto.id",
    )

    @property
    def monto_comprometido(self) -> Decimal:
        return sum((c.monto_acordado for c in self.conceptos), ZERO)

    @property
    def monto_pagado(self) -> Decimal:
        return sum((c.monto_pagado for c in self.conceptos), ZERO)

    @property
    def saldo_pendiente(self) -> Decimal:
        # Regla RF07: saldo pendiente = comprometido − pagado
        return self.monto_comprometido - self.monto_pagado

    @property
    def disponible(self) -> Decimal:
        return self.monto_total - self.monto_comprometido

    @property
    def excedido(self) -> bool:
        return self.monto_comprometido > self.monto_total


class ConceptoPresupuesto(Base):
    __tablename__ = "conceptos_presupuesto"

    id: Mapped[int] = mapped_column(primary_key=True)
    presupuesto_id: Mapped[int] = mapped_column(
        ForeignKey("presupuestos.id", ondelete="CASCADE"), index=True
    )
    descripcion: Mapped[str] = mapped_column(String(150))
    monto_acordado: Mapped[Decimal] = mapped_column(MONEY)
    proveedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=True
    )

    presupuesto: Mapped[Presupuesto] = relationship(back_populates="conceptos")
    proveedor: Mapped["Proveedor | None"] = relationship()  # noqa: F821
    pagos: Mapped[list["Pago"]] = relationship(
        back_populates="concepto", cascade="all, delete-orphan", order_by="Pago.fecha_vencimiento"
    )

    @property
    def monto_programado(self) -> Decimal:
        return sum((p.monto for p in self.pagos), ZERO)

    @property
    def monto_pagado(self) -> Decimal:
        return sum((p.monto for p in self.pagos if p.estado == EstadoPago.PAGADO), ZERO)

    @property
    def saldo(self) -> Decimal:
        return self.monto_acordado - self.monto_pagado


class Pago(Base):
    """Pago simulado (no hay cobro real). Implementa conceptualmente la interfaz Recordable."""

    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(primary_key=True)
    concepto_id: Mapped[int] = mapped_column(
        ForeignKey("conceptos_presupuesto.id", ondelete="CASCADE"), index=True
    )
    monto: Mapped[Decimal] = mapped_column(MONEY)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, index=True)
    fecha_pago: Mapped[date | None] = mapped_column(Date, nullable=True)
    estado: Mapped[EstadoPago] = mapped_column(
        enum_col(EstadoPago, "estado_pago"), default=EstadoPago.PENDIENTE, index=True
    )
    simulado: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    concepto: Mapped[ConceptoPresupuesto] = relationship(back_populates="pagos")
