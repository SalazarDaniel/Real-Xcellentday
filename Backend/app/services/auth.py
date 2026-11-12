from datetime import UTC, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Rol, Sesion, Usuario
from app.models.base import utcnow

MSG_CREDENCIALES = "Correo o contraseña incorrectos"
MSG_INACTIVA = "Cuenta inactiva, contacta al administrador"
MSG_BLOQUEADA = (
    "Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en {m} minutos"
)


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def authenticate(db: Session, correo: str, password: str) -> tuple[str, Sesion]:
    """Flujo de inicio de sesión (RF02). Devuelve (token, sesión)."""
    ahora = utcnow()
    user = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo.lower()))
    if user is None:
        raise AuthError(MSG_CREDENCIALES)

    if user.bloqueado_hasta and user.bloqueado_hasta > ahora:
        minutos = max(1, int((user.bloqueado_hasta - ahora).total_seconds() // 60) + 1)
        raise AuthError(MSG_BLOQUEADA.format(m=minutos), status_code=423)

    if not verify_password(password, user.password_hash):
        user.intentos_fallidos = (user.intentos_fallidos or 0) + 1
        if user.intentos_fallidos >= settings.MAX_LOGIN_ATTEMPTS:
            user.bloqueado_hasta = ahora + timedelta(minutes=settings.LOCKOUT_MINUTES)
            user.intentos_fallidos = 0
        db.commit()
        raise AuthError(MSG_CREDENCIALES)

    if not user.activo:
        raise AuthError(MSG_INACTIVA, status_code=403)

    token, jti, expires_at = create_access_token(user.id, user.rol.value, ahora)
    sesion = Sesion(
        usuario_id=user.id,
        jti=jti,
        inicio=ahora,
        expira_en=expires_at.astimezone(UTC).replace(tzinfo=None),
    )
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return token, sesion


def logout(db: Session, sesion: Sesion) -> None:
    """Invalida el token en el servidor (RF03)."""
    sesion.activa = False
    sesion.cerrada_en = utcnow()
    db.commit()


def ensure_first_admin(db: Session) -> None:
    """Crea la cuenta de administrador inicial si la base no tiene usuarios."""
    if db.scalar(select(func.count(Usuario.id))):
        return
    db.add(
        Usuario(
            nombre_completo=settings.FIRST_ADMIN_NAME,
            correo=settings.FIRST_ADMIN_EMAIL.lower(),
            password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
            rol=Rol.ADMINISTRADOR,
            activo=True,
        )
    )
    db.commit()
