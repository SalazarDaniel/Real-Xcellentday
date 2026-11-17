from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_planner
from app.core.database import get_db
from app.models import (
    Boda,
    ConceptoPresupuesto,
    EstadoBoda,
    Pareja,
    Proveedor,
    TipoServicio,
    Usuario,
    boda_proveedor,
)
from app.schemas.proveedor import ProveedorCreate, ProveedorOut, ProveedorUpdate

router = APIRouter(prefix="/proveedores", tags=["Proveedores (RF06)"])

MSG_DUPLICADO = "Ya existe un proveedor con este correo"


def _get_propio(db: Session, proveedor_id: int, user: Usuario) -> Proveedor:
    proveedor = db.get(Proveedor, proveedor_id)
    if proveedor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")
    if proveedor.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return proveedor


def _correo_duplicado(db: Session, user: Usuario, correo: str | None, excluir: int | None = None):
    if not correo:
        return False
    stmt = select(Proveedor.id).where(
        Proveedor.planner_id == user.id, func.lower(Proveedor.correo) == correo.lower()
    )
    if excluir:
        stmt = stmt.where(Proveedor.id != excluir)
    return db.scalar(stmt) is not None


@router.get("", response_model=list[ProveedorOut])
def listar(
    tipo_servicio: TipoServicio | None = None,
    q: str | None = Query(default=None, max_length=100),
    activo: bool | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    stmt = select(Proveedor).where(Proveedor.planner_id == user.id)
    if tipo_servicio:
        stmt = stmt.where(Proveedor.tipo_servicio == tipo_servicio)
    if q:
        stmt = stmt.where(Proveedor.nombre.ilike(f"%{q.strip()}%"))
    if activo is not None:
        stmt = stmt.where(Proveedor.activo == activo)
    proveedores = db.scalars(stmt.order_by(Proveedor.nombre)).all()

    # Parejas de bodas activas asociadas a cada proveedor (una sola consulta)
    clientes: dict[int, list[str]] = {}
    filas = db.execute(
        select(boda_proveedor.c.proveedor_id, Pareja)
        .join(Boda, Boda.id == boda_proveedor.c.boda_id)
        .join(Pareja, Pareja.id == Boda.pareja_id)
        .where(Boda.planner_id == user.id, Boda.estado == EstadoBoda.ACTIVA)
        .order_by(Boda.fecha)
    ).all()
    for proveedor_id, pareja in filas:
        clientes.setdefault(proveedor_id, []).append(pareja.nombre)
    return [
        ProveedorOut.model_validate(p).model_copy(update={"clientes": clientes.get(p.id, [])})
        for p in proveedores
    ]


@router.post("", response_model=ProveedorOut, status_code=status.HTTP_201_CREATED)
def crear(
    data: ProveedorCreate, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    if _correo_duplicado(db, user, data.correo):
        raise HTTPException(status.HTTP_409_CONFLICT, MSG_DUPLICADO)
    proveedor = Proveedor(**data.model_dump(), planner_id=user.id, activo=True)
    if proveedor.correo:
        proveedor.correo = proveedor.correo.lower()
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)
    return proveedor


@router.get("/{proveedor_id}", response_model=ProveedorOut)
def obtener(
    proveedor_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    return _get_propio(db, proveedor_id, user)


@router.put("/{proveedor_id}", response_model=ProveedorOut)
def actualizar(
    proveedor_id: int,
    data: ProveedorUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    proveedor = _get_propio(db, proveedor_id, user)
    if _correo_duplicado(db, user, data.correo, excluir=proveedor.id):
        raise HTTPException(status.HTTP_409_CONFLICT, MSG_DUPLICADO)
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "activo" and v is None:
            continue
        setattr(proveedor, k, v.lower() if k == "correo" and v else v)
    db.commit()
    db.refresh(proveedor)
    return proveedor


@router.patch("/{proveedor_id}/desactivar", response_model=ProveedorOut)
def desactivar(
    proveedor_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    proveedor = _get_propio(db, proveedor_id, user)
    proveedor.activo = False
    db.commit()
    db.refresh(proveedor)
    return proveedor


@router.patch("/{proveedor_id}/activar", response_model=ProveedorOut)
def activar(
    proveedor_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    proveedor = _get_propio(db, proveedor_id, user)
    proveedor.activo = True
    db.commit()
    db.refresh(proveedor)
    return proveedor


@router.delete("/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    proveedor_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    """Solo se borra físicamente si no tiene relaciones; si las tiene, se debe desactivar."""
    proveedor = _get_propio(db, proveedor_id, user)
    en_boda = db.scalar(select(exists().where(boda_proveedor.c.proveedor_id == proveedor.id)))
    en_concepto = db.scalar(
        select(exists().where(ConceptoPresupuesto.proveedor_id == proveedor.id))
    )
    if en_boda or en_concepto:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "El proveedor está asociado a una boda o a un pago y no puede eliminarse. "
            "Puedes desactivarlo en su lugar.",
        )
    db.delete(proveedor)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
