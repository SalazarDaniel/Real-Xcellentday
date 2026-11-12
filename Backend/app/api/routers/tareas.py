from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_boda_propia, require_planner
from app.core.config import today
from app.core.database import get_db
from app.models import Boda, EstadoBoda, EstadoTarea, PrioridadTarea, Tarea, Usuario
from app.schemas.tarea import TareaCreate, TareaOut, TareaUpdate
from app.services.bodas import tarea_vencida

router = APIRouter(tags=["Tareas (RF09)"])

ADVERTENCIA_FECHA = (
    "La fecha límite es posterior a la fecha de la boda. Confirma si deseas guardarla así."
)


def _out(t: Tarea) -> TareaOut:
    return TareaOut.model_validate(t).model_copy(
        update={
            "vencida": tarea_vencida(t),
            "pareja": t.boda.pareja.nombre if t.boda and t.boda.pareja else None,
        }
    )


def _tarea_propia(db: Session, tarea_id: int, user: Usuario) -> Tarea:
    tarea = db.get(Tarea, tarea_id)
    if tarea is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if tarea.boda.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return tarea


def _check_fecha_boda(boda: Boda, fecha_limite, confirmar: bool) -> None:
    if boda.fecha and fecha_limite > boda.fecha and not confirmar:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "FECHA_POSTERIOR_BODA", "message": ADVERTENCIA_FECHA},
        )


@router.get("/tareas", response_model=list[TareaOut], summary="Tareas de todas mis bodas")
def listar_todas(
    estado: EstadoTarea | None = None,
    prioridad: PrioridadTarea | None = None,
    vencidas: bool = False,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    stmt = (
        select(Tarea).join(Boda).where(Boda.planner_id == user.id, Boda.estado == EstadoBoda.ACTIVA)
    )
    if estado:
        stmt = stmt.where(Tarea.estado == estado)
    if prioridad:
        stmt = stmt.where(Tarea.prioridad == prioridad)
    if vencidas:
        stmt = stmt.where(Tarea.estado != EstadoTarea.COMPLETADA, Tarea.fecha_limite < today())
    return [_out(t) for t in db.scalars(stmt.order_by(Tarea.fecha_limite)).all()]


@router.get("/bodas/{boda_id}/tareas", response_model=list[TareaOut])
def listar(
    estado: EstadoTarea | None = None,
    prioridad: PrioridadTarea | None = None,
    boda: Boda = Depends(get_boda_propia),
    db: Session = Depends(get_db),
):
    stmt = select(Tarea).where(Tarea.boda_id == boda.id)
    if estado:
        stmt = stmt.where(Tarea.estado == estado)
    if prioridad:
        stmt = stmt.where(Tarea.prioridad == prioridad)
    return [_out(t) for t in db.scalars(stmt.order_by(Tarea.fecha_limite)).all()]


@router.post(
    "/bodas/{boda_id}/tareas", response_model=TareaOut, status_code=status.HTTP_201_CREATED
)
def crear(data: TareaCreate, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)):
    if boda.estado != EstadoBoda.ACTIVA:
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo se agregan tareas a bodas activas")
    if data.fecha_limite < today():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "La fecha límite no puede ser anterior a hoy"
        )
    _check_fecha_boda(boda, data.fecha_limite, data.confirmar)
    tarea = Tarea(boda_id=boda.id, **data.model_dump(exclude={"confirmar"}))
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return _out(tarea)


@router.patch("/tareas/{tarea_id}", response_model=TareaOut)
def actualizar(
    tarea_id: int,
    data: TareaUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    tarea = _tarea_propia(db, tarea_id, user)
    cambios = data.model_dump(exclude_unset=True, exclude={"confirmar"})
    if "fecha_limite" in cambios and cambios["fecha_limite"] != tarea.fecha_limite:
        _check_fecha_boda(tarea.boda, cambios["fecha_limite"], data.confirmar)
    nuevo_estado = cambios.get("estado")
    if nuevo_estado and nuevo_estado != tarea.estado:
        tarea.fecha_termino = today() if nuevo_estado == EstadoTarea.COMPLETADA else None
    for k, v in cambios.items():
        if v is not None or k == "descripcion":
            setattr(tarea, k, v)
    db.commit()
    db.refresh(tarea)
    return _out(tarea)


@router.delete("/tareas/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    tarea_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    tarea = _tarea_propia(db, tarea_id, user)
    db.delete(tarea)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
