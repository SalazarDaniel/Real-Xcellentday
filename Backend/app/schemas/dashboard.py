from datetime import date

from pydantic import BaseModel

from app.schemas.boda import BodaOut
from app.schemas.common import Money
from app.schemas.presupuesto import AlertaPago, PresupuestoOut
from app.schemas.proveedor import ProveedorOut
from app.schemas.tarea import TareaOut


class ResumenFinanciero(BaseModel):
    monto_total: Money
    monto_comprometido: Money
    monto_pagado: Money
    saldo_pendiente: Money


class DashboardOut(BaseModel):
    bodas_activas: int
    bodas_proximos_30_dias: int
    tareas_pendientes: int
    tareas_vencidas: int
    pagos_proximos: int
    pagos_vencidos: int
    alertas_pagos: list[AlertaPago]
    finanzas: ResumenFinanciero
    proximas_bodas: list[BodaOut]


class ResumenTareas(BaseModel):
    pendientes: int
    en_proceso: int
    completadas: int
    vencidas: int
    lista: list[TareaOut]


class FechaImportanteOut(BaseModel):
    id: int
    titulo: str
    fecha: date
    descripcion: str | None


class ResumenInvitados(BaseModel):
    total: int
    confirmados: int
    pendientes: int
    rechazados: int


class ExpedienteOut(BaseModel):
    boda: BodaOut
    presupuesto: PresupuestoOut | None
    alertas_pagos: list[AlertaPago]
    proveedores: list[ProveedorOut]
    tareas: ResumenTareas
    fechas_importantes: list[FechaImportanteOut]
    invitados: ResumenInvitados
