from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_planner
from app.core.config import today
from app.core.database import get_db
from app.models import Boda, EstadoBoda, EstadoTarea, Tarea, Usuario
from app.models.base import ZERO
from app.schemas.dashboard import DashboardOut, ResumenFinanciero
from app.services.bodas import boda_out
from app.services.pagos import alertas_pagos

router = APIRouter(prefix="/dashboard", tags=["Dashboard (RF11)"])


@router.get("", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), user: Usuario = Depends(require_planner)):
    hoy = today()
    activas = db.scalars(
        select(Boda)
        .where(Boda.planner_id == user.id, Boda.estado == EstadoBoda.ACTIVA)
        .order_by(Boda.fecha)
    ).all()
    proximas = [b for b in activas if b.fecha and hoy <= b.fecha <= hoy + timedelta(days=30)]

    tareas_base = (
        select(func.count(Tarea.id))
        .join(Boda)
        .where(Boda.planner_id == user.id, Boda.estado == EstadoBoda.ACTIVA)
    )
    tareas_pendientes = db.scalar(tareas_base.where(Tarea.estado == EstadoTarea.PENDIENTE)) or 0
    tareas_vencidas = (
        db.scalar(
            tareas_base.where(Tarea.estado != EstadoTarea.COMPLETADA, Tarea.fecha_limite < hoy)
        )
        or 0
    )

    alertas = alertas_pagos(db, user.id)
    presupuestos = [b.presupuesto for b in activas if b.presupuesto]
    total = sum((p.monto_total for p in presupuestos), ZERO)
    comprometido = sum((p.monto_comprometido for p in presupuestos), ZERO)
    pagado = sum((p.monto_pagado for p in presupuestos), ZERO)

    return DashboardOut(
        bodas_activas=len(activas),
        bodas_proximos_30_dias=len(proximas),
        tareas_pendientes=tareas_pendientes,
        tareas_vencidas=tareas_vencidas,
        pagos_proximos=sum(a.nivel == "amarillo" for a in alertas),
        pagos_vencidos=sum(a.nivel == "rojo" for a in alertas),
        alertas_pagos=alertas,
        finanzas=ResumenFinanciero(
            monto_total=total,
            monto_comprometido=comprometido,
            monto_pagado=pagado,
            saldo_pendiente=comprometido - pagado,
        ),
        proximas_bodas=[boda_out(b) for b in activas[:5]],
    )
