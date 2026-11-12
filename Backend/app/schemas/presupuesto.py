from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import EstadoPago
from app.schemas.common import Money, ORMModel, PositiveMoney


class PagoCreate(BaseModel):
    monto: PositiveMoney
    fecha_vencimiento: date
    # Si se indica, el pago se registra directamente como pagado (pago simulado)
    fecha_pago: date | None = None


class PagoRegistrar(BaseModel):
    fecha_pago: date | None = None


class PagoOut(ORMModel):
    id: int
    concepto_id: int
    monto: Money
    fecha_vencimiento: date
    fecha_pago: date | None
    estado: EstadoPago
    simulado: bool


class ConceptoCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=150)
    monto_acordado: PositiveMoney
    proveedor_id: int | None = None


class ConceptoUpdate(ConceptoCreate):
    pass


class ProveedorMini(ORMModel):
    id: int
    nombre: str
    tipo_servicio: str


class ConceptoOut(ORMModel):
    id: int
    descripcion: str
    monto_acordado: Money
    monto_programado: Money
    monto_pagado: Money
    saldo: Money
    proveedor: ProveedorMini | None
    pagos: list[PagoOut]


class PresupuestoOut(ORMModel):
    id: int
    boda_id: int
    monto_total: Money
    monto_comprometido: Money
    monto_pagado: Money
    saldo_pendiente: Money
    disponible: Money
    excedido: bool
    conceptos: list[ConceptoOut]


class PresupuestoUpdate(BaseModel):
    monto_total: PositiveMoney


class AlertaPago(BaseModel):
    pago_id: int
    boda_id: int
    pareja: str
    concepto: str
    monto: Money
    fecha_vencimiento: date
    dias: int  # negativos = días de retraso
    nivel: str  # "amarillo" (próximo) | "rojo" (vencido)
