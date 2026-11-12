from sqlalchemy.orm import Session

from app.core.config import today
from app.models import (
    Boda,
    ConceptoPresupuesto,
    EstadoBoda,
    EstadoTarea,
    ExpedienteDigital,
    Pareja,
    Presupuesto,
    Tarea,
)
from app.schemas.boda import BodaOut, OnboardingIn


def boda_out(boda: Boda) -> BodaOut:
    out = BodaOut.model_validate(boda)
    if boda.fecha:
        out.dias_restantes = (boda.fecha - today()).days
    if boda.estado != EstadoBoda.BORRADOR:
        out.datos_borrador = None
    return out


def tarea_vencida(tarea: Tarea) -> bool:
    return tarea.estado != EstadoTarea.COMPLETADA and tarea.fecha_limite < today()


def confirmar_onboarding(
    db: Session, planner_id: int, data: OnboardingIn, borrador: Boda | None = None
) -> Boda:
    """Crea en una sola operación pareja, boda (ACTIVA), presupuesto y expediente (RF04)."""
    pareja = Pareja(**data.pareja.model_dump())
    boda = borrador or Boda(planner_id=planner_id)
    boda.pareja = pareja
    boda.fecha = data.evento.fecha
    boda.lugar = data.evento.lugar
    boda.estilo = data.evento.estilo
    boda.invitados_estimados = data.evento.invitados_estimados
    boda.estado = EstadoBoda.ACTIVA
    boda.paso_onboarding = 3
    boda.datos_borrador = None
    boda.presupuesto = Presupuesto(
        monto_total=data.presupuesto.monto_total,
        conceptos=[
            ConceptoPresupuesto(descripcion=c.descripcion, monto_acordado=c.monto_acordado)
            for c in data.presupuesto.conceptos
        ],
    )
    boda.expediente = ExpedienteDigital()
    db.add(boda)
    db.commit()
    db.refresh(boda)
    return boda
