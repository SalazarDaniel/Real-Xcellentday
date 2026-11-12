from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_boda_propia, require_planner
from app.core.config import today
from app.core.database import get_db
from app.models import (
    Boda,
    EstadoBoda,
    EstadoRSVP,
    EstadoTarea,
    Pareja,
    Proveedor,
    Usuario,
)
from app.schemas.boda import BodaOut, BodaUpdate, BorradorIn, OnboardingIn
from app.schemas.dashboard import (
    ExpedienteOut,
    FechaImportanteOut,
    ResumenInvitados,
    ResumenTareas,
)
from app.schemas.presupuesto import PresupuestoOut
from app.schemas.proveedor import ProveedorOut
from app.schemas.tarea import TareaOut
from app.services.bodas import boda_out, confirmar_onboarding, tarea_vencida
from app.services.pagos import actualizar_vencidos, alertas_pagos

router = APIRouter(prefix="/bodas", tags=["Bodas y onboarding (RF04, RF05)"])


@router.get("", response_model=list[BodaOut], summary="Lista de clientes (bodas)")
def listar(
    estado: EstadoBoda | None = None,
    proximos_dias: int | None = Query(default=None, ge=1, le=365),
    q: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    stmt = select(Boda).outerjoin(Pareja).where(Boda.planner_id == user.id)
    if estado:
        stmt = stmt.where(Boda.estado == estado)
    if proximos_dias:
        hoy = today()
        stmt = stmt.where(
            Boda.estado == EstadoBoda.ACTIVA,
            Boda.fecha >= hoy,
            Boda.fecha <= hoy + timedelta(days=proximos_dias),
        )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Pareja.nombre_contrayente1.ilike(like),
                Pareja.nombre_contrayente2.ilike(like),
                Boda.lugar.ilike(like),
            )
        )
    stmt = stmt.order_by(Boda.fecha.is_(None), Boda.fecha, Boda.id.desc())
    return [boda_out(b) for b in db.scalars(stmt).all()]


# ---------- Onboarding (RF04) ----------


@router.post(
    "/borradores",
    response_model=BodaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Guardar borrador del onboarding",
)
def crear_borrador(
    data: BorradorIn, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    boda = Boda(
        planner_id=user.id,
        estado=EstadoBoda.BORRADOR,
        paso_onboarding=data.paso,
        datos_borrador=data.model_dump(exclude={"paso"}),
    )
    db.add(boda)
    db.commit()
    db.refresh(boda)
    return boda_out(boda)


@router.put("/borradores/{boda_id}", response_model=BodaOut, summary="Actualizar borrador")
def actualizar_borrador(
    data: BorradorIn, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    if boda.estado != EstadoBoda.BORRADOR:
        raise HTTPException(status.HTTP_409_CONFLICT, "La boda ya no es un borrador")
    boda.paso_onboarding = data.paso
    boda.datos_borrador = data.model_dump(exclude={"paso"})
    db.commit()
    db.refresh(boda)
    return boda_out(boda)


@router.post(
    "/onboarding",
    response_model=BodaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Confirmar onboarding: crea pareja, boda, presupuesto y expediente",
)
def confirmar(
    data: OnboardingIn,
    borrador_id: int | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    borrador = None
    if borrador_id is not None:
        borrador = get_boda_propia(borrador_id, user, db)
        if borrador.estado != EstadoBoda.BORRADOR:
            raise HTTPException(status.HTTP_409_CONFLICT, "La boda ya fue confirmada")
    boda = confirmar_onboarding(db, user.id, data, borrador)
    return boda_out(boda)


# ---------- Boda ----------


@router.get("/{boda_id}", response_model=BodaOut)
def obtener(boda: Boda = Depends(get_boda_propia)):
    return boda_out(boda)


@router.patch("/{boda_id}", response_model=BodaOut)
def actualizar(
    data: BodaUpdate, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    if boda.estado == EstadoBoda.BORRADOR:
        raise HTTPException(status.HTTP_409_CONFLICT, "Completa el onboarding antes de editar")
    cambios = data.model_dump(exclude_unset=True)
    if cambios.get("estado") == EstadoBoda.BORRADOR:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Una boda activa no puede volver a borrador"
        )
    for k, v in cambios.items():
        setattr(boda, k, v)
    db.commit()
    db.refresh(boda)
    return boda_out(boda)


@router.delete("/{boda_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar borrador")
def eliminar(boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)):
    if boda.estado != EstadoBoda.BORRADOR:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Solo se pueden eliminar borradores; cancela la boda en su lugar",
        )
    db.delete(boda)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Expediente digital (RF05) ----------


@router.get("/{boda_id}/expediente", response_model=ExpedienteOut, summary="Expediente digital")
def expediente(boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)):
    if boda.estado == EstadoBoda.BORRADOR:
        raise HTTPException(status.HTTP_409_CONFLICT, "La boda aún está en borrador")
    actualizar_vencidos(db)
    db.refresh(boda)

    tareas = sorted(boda.tareas, key=lambda t: t.fecha_limite)
    tareas_out = [
        TareaOut.model_validate(t).model_copy(update={"vencida": tarea_vencida(t)}) for t in tareas
    ]
    invitados = boda.invitados

    return ExpedienteOut(
        boda=boda_out(boda),
        presupuesto=PresupuestoOut.model_validate(boda.presupuesto) if boda.presupuesto else None,
        alertas_pagos=alertas_pagos(db, boda.planner_id, boda.id),
        proveedores=[ProveedorOut.model_validate(p) for p in boda.proveedores],
        tareas=ResumenTareas(
            pendientes=sum(t.estado == EstadoTarea.PENDIENTE for t in tareas),
            en_proceso=sum(t.estado == EstadoTarea.EN_PROCESO for t in tareas),
            completadas=sum(t.estado == EstadoTarea.COMPLETADA for t in tareas),
            vencidas=sum(t.vencida for t in tareas_out),
            lista=tareas_out,
        ),
        fechas_importantes=[
            FechaImportanteOut.model_validate(f, from_attributes=True)
            for f in sorted(boda.fechas_importantes, key=lambda f: f.fecha)
        ],
        invitados=ResumenInvitados(
            total=sum(1 + i.acompanantes for i in invitados),
            confirmados=sum(
                1 + i.acompanantes for i in invitados if i.confirmacion == EstadoRSVP.CONFIRMADO
            ),
            pendientes=sum(
                1 + i.acompanantes for i in invitados if i.confirmacion == EstadoRSVP.PENDIENTE
            ),
            rechazados=sum(
                1 + i.acompanantes for i in invitados if i.confirmacion == EstadoRSVP.RECHAZADO
            ),
        ),
    )


# ---------- Proveedores contratados (RF06) ----------


@router.post(
    "/{boda_id}/proveedores/{proveedor_id}",
    response_model=list[ProveedorOut],
    summary="Asociar proveedor contratado",
)
def asociar_proveedor(
    proveedor_id: int, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    proveedor = db.get(Proveedor, proveedor_id)
    if proveedor is None or proveedor.planner_id != boda.planner_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")
    if not proveedor.activo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El proveedor está desactivado")
    if proveedor not in boda.proveedores:
        boda.proveedores.append(proveedor)
        db.commit()
    return boda.proveedores


@router.delete(
    "/{boda_id}/proveedores/{proveedor_id}",
    response_model=list[ProveedorOut],
    summary="Quitar proveedor contratado",
)
def desasociar_proveedor(
    proveedor_id: int, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    boda.proveedores = [p for p in boda.proveedores if p.id != proveedor_id]
    db.commit()
    return boda.proveedores
