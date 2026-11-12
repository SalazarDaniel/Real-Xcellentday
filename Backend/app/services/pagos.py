from datetime import date
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings, today
from app.models import (
    Boda,
    ConceptoPresupuesto,
    EstadoBoda,
    EstadoPago,
    Pago,
    Presupuesto,
)
from app.models.base import ZERO
from app.schemas.presupuesto import AlertaPago


class ReglaNegocioError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def actualizar_vencidos(db: Session, hoy: date | None = None) -> int:
    """Marca como VENCIDO todo pago pendiente cuya fecha de vencimiento ya pasó (RF08)."""
    hoy = hoy or today()
    result = db.execute(
        update(Pago)
        .where(Pago.estado == EstadoPago.PENDIENTE, Pago.fecha_vencimiento < hoy)
        .values(estado=EstadoPago.VENCIDO)
    )
    if result.rowcount:
        db.commit()
    return result.rowcount or 0


def validar_nuevo_pago(concepto: ConceptoPresupuesto, monto: Decimal) -> None:
    """La suma de pagos de un concepto no puede exceder su monto acordado (RF07)."""
    disponible = concepto.monto_acordado - concepto.monto_programado
    if monto > disponible:
        raise ReglaNegocioError(
            f"El monto del pago (${monto:,.2f}) excede el saldo por programar del concepto "
            f"(${max(disponible, ZERO):,.2f})"
        )


def registrar_pago(pago: Pago, fecha_pago: date | None = None) -> None:
    if pago.estado == EstadoPago.PAGADO:
        raise ReglaNegocioError("El pago ya fue registrado como pagado")
    pago.estado = EstadoPago.PAGADO
    pago.fecha_pago = fecha_pago or today()


def nivel_alerta(fecha_vencimiento: date, hoy: date) -> tuple[str | None, int]:
    dias = (fecha_vencimiento - hoy).days
    if dias < 0:
        return "rojo", dias
    if dias <= settings.PAYMENT_ALERT_DAYS:
        return "amarillo", dias
    return None, dias


def alertas_pagos(db: Session, planner_id: int, boda_id: int | None = None) -> list[AlertaPago]:
    """Pagos próximos a vencer (0–7 días, amarillo) y vencidos (rojo), ordenados por fecha."""
    actualizar_vencidos(db)
    hoy = today()
    limite = date.fromordinal(hoy.toordinal() + settings.PAYMENT_ALERT_DAYS)
    stmt = (
        select(Pago, ConceptoPresupuesto, Boda)
        .join(ConceptoPresupuesto, Pago.concepto_id == ConceptoPresupuesto.id)
        .join(Presupuesto, ConceptoPresupuesto.presupuesto_id == Presupuesto.id)
        .join(Boda, Presupuesto.boda_id == Boda.id)
        .where(
            Boda.planner_id == planner_id,
            Boda.estado == EstadoBoda.ACTIVA,
            Pago.estado.in_([EstadoPago.PENDIENTE, EstadoPago.VENCIDO]),
            Pago.fecha_vencimiento <= limite,
        )
        .order_by(Pago.fecha_vencimiento)
    )
    if boda_id is not None:
        stmt = stmt.where(Boda.id == boda_id)

    alertas: list[AlertaPago] = []
    for pago, concepto, boda in db.execute(stmt).all():
        nivel, dias = nivel_alerta(pago.fecha_vencimiento, hoy)
        if nivel is None:
            continue
        alertas.append(
            AlertaPago(
                pago_id=pago.id,
                boda_id=boda.id,
                pareja=boda.pareja.nombre if boda.pareja else f"Boda #{boda.id}",
                concepto=concepto.descripcion,
                monto=pago.monto,
                fecha_vencimiento=pago.fecha_vencimiento,
                dias=dias,
                nivel=nivel,
            )
        )
    return alertas
