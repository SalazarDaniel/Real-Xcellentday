"""Fixtures de pruebas.

Por defecto las pruebas usan SQLite en memoria para que corran sin servicios externos
(`poetry run pytest`). Para probar contra PostgreSQL define TEST_DATABASE_URL.
"""

import os
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import today
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models import Rol, Usuario

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite://")

PASSWORD = "Secreta123"


@pytest.fixture()
def engine():
    if TEST_DATABASE_URL.startswith("sqlite"):
        eng = create_engine(
            TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    else:
        eng = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture()
def db(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture()
def client(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        s = TestingSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def crear_usuario(db, correo: str, rol: Rol, activo: bool = True) -> Usuario:
    u = Usuario(
        nombre_completo=correo.split("@")[0].title(),
        correo=correo,
        password_hash=hash_password(PASSWORD),
        rol=rol,
        activo=activo,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def login(client, correo: str, password: str = PASSWORD) -> dict:
    r = client.post("/api/auth/login", json={"correo": correo, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(db):
    return crear_usuario(db, "admin@test.com", Rol.ADMINISTRADOR)


@pytest.fixture()
def planner(db):
    return crear_usuario(db, "ana@test.com", Rol.WEDDING_PLANNER)


@pytest.fixture()
def otra_planner(db):
    return crear_usuario(db, "bea@test.com", Rol.WEDDING_PLANNER)


@pytest.fixture()
def admin_headers(client, admin):
    return login(client, admin.correo)


@pytest.fixture()
def planner_headers(client, planner):
    return login(client, planner.correo)


@pytest.fixture()
def otra_headers(client, otra_planner):
    return login(client, otra_planner.correo)


def onboarding_payload(dias: int = 120, monto: float = 200000, conceptos=None) -> dict:
    return {
        "pareja": {
            "nombre_contrayente1": "Laura",
            "nombre_contrayente2": "Miguel",
            "correo": "laura.miguel@test.com",
            "telefono": "9991234567",
        },
        "evento": {
            "fecha": (today() + timedelta(days=dias)).isoformat(),
            "lugar": "Hacienda Xcanatún",
            "estilo": "Romántico",
            "invitados_estimados": 150,
        },
        "presupuesto": {"monto_total": monto, "conceptos": conceptos or []},
    }


@pytest.fixture()
def boda(client, planner_headers):
    r = client.post("/api/bodas/onboarding", json=onboarding_payload(), headers=planner_headers)
    assert r.status_code == 201, r.text
    return r.json()
