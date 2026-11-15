from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_boda_propia, require_planner
from app.core.database import get_db
from app.models import Boda, Invitado, Usuario
from app.schemas.invitado import InvitadoCreate, InvitadoOut, InvitadoUpdate

router = APIRouter(tags=["Invitados"])


def _invitado_propio(db: Session, invitado_id: int, user: Usuario) -> Invitado:
    invitado = db.get(Invitado, invitado_id)
    if invitado is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitado no encontrado")
    if invitado.boda.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return invitado


@router.get("/bodas/{boda_id}/invitados", response_model=list[InvitadoOut])
def listar(boda: Boda = Depends(get_boda_propia)):
    return sorted(boda.invitados, key=lambda i: (i.mesa or "", i.nombre.lower()))


@router.post(
    "/bodas/{boda_id}/invitados",
    response_model=InvitadoOut,
    status_code=status.HTTP_201_CREATED,
)
def crear(
    data: InvitadoCreate, boda: Boda = Depends(get_boda_propia), db: Session = Depends(get_db)
):
    invitado = Invitado(boda_id=boda.id, **data.model_dump())
    db.add(invitado)
    db.commit()
    db.refresh(invitado)
    return invitado


@router.patch("/invitados/{invitado_id}", response_model=InvitadoOut)
def actualizar(
    invitado_id: int,
    data: InvitadoUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_planner),
):
    invitado = _invitado_propio(db, invitado_id, user)
    for campo, valor in data.model_dump(exclude_unset=True).items():
        if campo in ("nombre", "acompanantes", "confirmacion") and valor is None:
            continue  # campos obligatorios: null no los borra
        setattr(invitado, campo, valor)
    db.commit()
    db.refresh(invitado)
    return invitado


@router.delete("/invitados/{invitado_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    invitado_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_planner)
):
    db.delete(_invitado_propio(db, invitado_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
