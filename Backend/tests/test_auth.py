from app.models import Rol, Sesion
from tests.conftest import PASSWORD, crear_usuario, login


def test_login_correcto_devuelve_token_y_rol(client, planner):
    r = client.post("/api/auth/login", json={"correo": planner.correo, "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["usuario"]["rol"] == "WEDDING_PLANNER"


def test_login_incorrecto_mensaje_generico(client, planner):
    r1 = client.post("/api/auth/login", json={"correo": planner.correo, "password": "Mala1234"})
    r2 = client.post("/api/auth/login", json={"correo": "noexiste@test.com", "password": "x"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detail"] == r2.json()["detail"] == "Correo o contraseña incorrectos"


def test_bloqueo_tras_cinco_intentos(client, planner):
    for _ in range(5):
        client.post("/api/auth/login", json={"correo": planner.correo, "password": "Mala1234"})
    # El sexto intento es rechazado aunque la contraseña sea correcta (RF02 CA3)
    r = client.post("/api/auth/login", json={"correo": planner.correo, "password": PASSWORD})
    assert r.status_code == 423


def test_cuenta_inactiva(client, db):
    crear_usuario(db, "inactiva@test.com", Rol.WEDDING_PLANNER, activo=False)
    r = client.post("/api/auth/login", json={"correo": "inactiva@test.com", "password": PASSWORD})
    assert r.status_code == 403
    assert "inactiva" in r.json()["detail"]


def test_endpoints_privados_sin_token_responden_401(client):
    for url in (
        "/api/dashboard",
        "/api/bodas",
        "/api/proveedores",
        "/api/usuarios",
        "/api/auth/me",
    ):
        assert client.get(url).status_code == 401


def test_logout_invalida_token_en_servidor(client, planner, db):
    headers = login(client, planner.correo)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    # RF03 CA1: el token anterior ya no sirve
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert db.query(Sesion).filter_by(activa=False).count() == 1


def test_logout_no_afecta_otras_sesiones(client, planner):
    h1 = login(client, planner.correo)
    h2 = login(client, planner.correo)
    client.post("/api/auth/logout", headers=h1)
    assert client.get("/api/auth/me", headers=h2).status_code == 200


def test_token_invalido(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer basura"})
    assert r.status_code == 401
