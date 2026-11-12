import re
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings

PASSWORD_RULES = [
    (lambda p: len(p) >= 8, "La contraseña debe tener al menos 8 caracteres"),
    (lambda p: re.search(r"[A-Z]", p) is not None, "La contraseña debe incluir una mayúscula"),
    (lambda p: re.search(r"\d", p) is not None, "La contraseña debe incluir un número"),
]


def password_policy_errors(password: str) -> list[str]:
    """Devuelve la lista de reglas de la política de contraseñas que no se cumplen (RF01)."""
    return [msg for rule, msg in PASSWORD_RULES if not rule(password)]


def hash_password(password: str) -> str:
    """Hash bcrypt con sal (RNF01)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, rol: str, issued_at: datetime) -> tuple[str, str, datetime]:
    """Genera un JWT. `issued_at` es UTC (con o sin zona). Devuelve (token, jti, expiración)."""
    if issued_at.tzinfo is None:
        issued_at = issued_at.replace(tzinfo=UTC)
    jti = uuid.uuid4().hex
    expires_at = issued_at + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "rol": rol,
        "jti": jti,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
