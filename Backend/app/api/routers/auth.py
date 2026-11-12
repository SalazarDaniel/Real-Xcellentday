from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_session, get_current_user
from app.core.database import get_db
from app.models import Sesion, Usuario
from app.schemas.common import Message
from app.schemas.usuario import LoginIn, TokenOut, UsuarioOut
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenOut, summary="Iniciar sesión (RF02)")
def login(data: LoginIn, db: Session = Depends(get_db)):
    try:
        token, sesion = auth_service.authenticate(db, data.correo, data.password)
    except auth_service.AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return TokenOut(
        access_token=token,
        expires_at=sesion.expira_en,
        usuario=UsuarioOut.model_validate(sesion.usuario),
    )


@router.post("/logout", response_model=Message, summary="Cerrar sesión (RF03)")
def logout(sesion: Sesion = Depends(get_current_session), db: Session = Depends(get_db)):
    auth_service.logout(db, sesion)
    return Message(detail="Sesión cerrada")


@router.get("/me", response_model=UsuarioOut, summary="Usuario autenticado")
def me(user: Usuario = Depends(get_current_user)):
    return user
