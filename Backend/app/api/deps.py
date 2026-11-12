from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Boda, Rol, Sesion, Usuario
from app.models.base import utcnow

bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "No autenticado") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Sesion:
    """Valida el JWT y que su sesión siga activa en el servidor (RNF02)."""
    if credentials is None:
        raise _unauthorized()
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise _unauthorized("Tu sesión expiró") from exc
    except jwt.PyJWTError as exc:
        raise _unauthorized("Token inválido") from exc

    sesion = db.scalar(select(Sesion).where(Sesion.jti == payload.get("jti")))
    if sesion is None or not sesion.activa:
        raise _unauthorized("Sesión cerrada")
    if sesion.expira_en <= utcnow():
        raise _unauthorized("Tu sesión expiró")
    if not sesion.usuario.activo:
        raise _unauthorized("Cuenta inactiva, contacta al administrador")
    return sesion


def get_current_user(sesion: Sesion = Depends(get_current_session)) -> Usuario:
    return sesion.usuario


def require_role(*roles: Rol) -> Callable[..., Usuario]:
    def checker(user: Usuario = Depends(get_current_user)) -> Usuario:
        if user.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
        return user

    return checker


require_admin = require_role(Rol.ADMINISTRADOR)
require_planner = require_role(Rol.WEDDING_PLANNER)


def get_boda_propia(
    boda_id: int,
    user: Usuario = Depends(require_planner),
    db: Session = Depends(get_db),
) -> Boda:
    """Control de acceso por propietario (RNF03): 404 si no existe, 403 si es de otra planner."""
    boda = db.get(Boda, boda_id)
    if boda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boda no encontrada")
    if boda.planner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return boda
