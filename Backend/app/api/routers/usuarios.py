from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models import Sesion, Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate

router = APIRouter(prefix="/usuarios", tags=["Usuarios (RF01)"])


@router.get("", response_model=list[UsuarioOut])
def listar(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return db.scalars(select(Usuario).order_by(Usuario.fecha_registro.desc())).all()


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear(
    data: UsuarioCreate, db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)
):
    correo = data.correo.lower()
    if db.scalar(select(Usuario.id).where(func.lower(Usuario.correo) == correo)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El correo ya está registrado")
    user = Usuario(
        nombre_completo=data.nombre_completo,
        correo=correo,
        password_hash=hash_password(data.password),
        rol=data.rol,
        activo=True,
        creado_por_id=admin.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def actualizar(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Cambia el rol o desactiva/reactiva una cuenta. Las cuentas no se borran."""
    user = db.get(Usuario, usuario_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if user.id == admin.id and (data.activo is False or data.rol not in (None, admin.rol)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No puedes desactivar ni cambiar el rol de tu propia cuenta",
        )
    if data.rol is not None:
        user.rol = data.rol
    if data.activo is not None:
        user.activo = data.activo
        if not data.activo:
            # Una cuenta desactivada pierde sus sesiones abiertas
            db.execute(update(Sesion).where(Sesion.usuario_id == user.id).values(activa=False))
    db.commit()
    db.refresh(user)
    return user
