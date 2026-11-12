from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_boda_propia, require_planner
from app.core.database import get_db
from app.models import Boda, ConceptoPresupuesto, EstadoPago, Pago, Presupuesto, Proveedor, Usuario
from app.schemas.presupuesto import (
    AlertaPago,
    ConceptoCreate,
    ConceptoUpdate,
    PagoCreate,
    PagoRegistrar,
    PresupuestoOut,
    PresupuestoUpdate,
)
from app.services.pagos import (
    ReglaNegocioError,
    actualizar_vencidos,
    alertas_pagos,
    registrar_pago,
    validar_nuevo_pago,
)

router = APIRouter(tags=["Presupuestos y pagos (RF07, RF08)"])


def _presupuesto(boda: Boda) -> Presupuesto:
    if boda.presupuesto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La boda no tiene presupuesto")
    return boda.presupuesto


def _concepto_propio(db: Session, concepto_id: int, user: Usuario) -> ConceptoPresupuesto:
    concepto = db.get(ConceptoPresupuesto, concepto_id)
    if concepto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Concepto no encontrado")
    if concepto.presupuesto.boda.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return concepto


def _pago_propio(db: Session, pago_id: int, user: Usuario) -> Pago:
    pago = db.get(Pago, pago_id)
    if pago is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pago no encontrado")
    if pago.concepto.presupuesto.boda.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return pago


def _validar_proveedor(db: Session, proveedor_id: int | None, user: Usuario) -> None:
    if proveedor_id is None:
        return
    proveedor = db.get(Proveedor, proveedor_id)
    if proveedor is None or proveedor.planner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")


def _out(db: Session, presupuesto: Presupuesto) -> PresupuestoOut:
    db.refresh(presupuesto)
    return PresupuestoOut.model_validate(presupuesto)


@router.get("/bodas/{boda_id}/presupuesto", response_model=PresupuestoOut)
def obtener(boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)):
    actualizar_vencidos(db)
    return _out(db, _presupuesto(boda))


@router.patch("/bodas/{boda_id}/presupuesto", response_model=PresupuestoOut)
def ajustar_total(
    data: PresupuestoUpdate, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    presupuesto = _presupuesto(boda)
    presupuesto.monto_total = data.monto_total
    db.commit()
    return _out(db, presupuesto)


@router.post(
    "/bodas/{boda_id}/presupuesto/conceptos",
    response_model=PresupuestoOut,
    status_code=status.HTTP_201_CREATED,
)
def agregar_concepto(
    data: ConceptoCreate,
    boda: Boda = Depends(get_boda_propia),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    presupuesto = _presupuesto(boda)
    _validar_proveedor(db, data.proveedor_id, user)
    presupuesto.conceptos.append(ConceptoPresupuesto(**data.model_dump()))
    db.commit()
    return _out(db, presupuesto)


@router.put("/conceptos/{concepto_id}", response_model=PresupuestoOut)
def editar_concepto(
    concepto_id: int,
    data: ConceptoUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    concepto = _concepto_propio(db, concepto_id, user)
    _validar_proveedor(db, data.proveedor_id, user)
    if data.monto_acordado < concepto.monto_programado:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "El monto acordado no puede ser menor a la suma de los pagos programados",
        )
    for k, v in data.model_dump().items():
        setattr(concepto, k, v)
    db.commit()
    return _out(db, concepto.presupuesto)


@router.delete("/conceptos/{concepto_id}", response_model=PresupuestoOut)
def eliminar_concepto(
    concepto_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    concepto = _concepto_propio(db, concepto_id, user)
    if any(p.estado == EstadoPago.PAGADO for p in concepto.pagos):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "No se puede eliminar un concepto con pagos registrados"
        )
    presupuesto = concepto.presupuesto
    db.delete(concepto)
    db.commit()
    return _out(db, presupuesto)


@router.post(
    "/conceptos/{concepto_id}/pagos",
    response_model=PresupuestoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Programar (o registrar) un pago simulado",
)
def programar_pago(
    concepto_id: int,
    data: PagoCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    concepto = _concepto_propio(db, concepto_id, user)
    try:
        validar_nuevo_pago(concepto, data.monto)
    except ReglaNegocioError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    pago = Pago(monto=data.monto, fecha_vencimiento=data.fecha_vencimiento, simulado=True)
    if data.fecha_pago:
        registrar_pago(pago, data.fecha_pago)
    concepto.pagos.append(pago)
    db.commit()
    actualizar_vencidos(db)
    return _out(db, concepto.presupuesto)


@router.post(
    "/pagos/{pago_id}/pagar",
    response_model=PresupuestoOut,
    summary="Registrar pago simulado como pagado",
)
def pagar(
    pago_id: int,
    data: PagoRegistrar | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    pago = _pago_propio(db, pago_id, user)
    try:
        registrar_pago(pago, data.fecha_pago if data else None)
    except ReglaNegocioError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    db.commit()
    return _out(db, pago.concepto.presupuesto)


@router.delete("/pagos/{pago_id}", response_model=PresupuestoOut)
def eliminar_pago(
    pago_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    pago = _pago_propio(db, pago_id, user)
    if pago.estado == EstadoPago.PAGADO:
        raise HTTPException(status.HTTP_409_CONFLICT, "No se puede eliminar un pago ya registrado")
    presupuesto = pago.concepto.presupuesto
    db.delete(pago)
    db.commit()
    return _out(db, presupuesto)


@router.get(
    "/alertas/pagos",
    response_model=list[AlertaPago],
    summary="Alertas de pagos próximos a vencer y vencidos (RF08)",
)
def alertas(db: Session = Depends(get_db), user: Usuario = Depends(require_planner)):
    return alertas_pagos(db, user.id)
