from app.models import Rol
from tests.conftest import crear_usuario, login

REGISTRO = {
    "nombre_completo": "Lucía Ramos",
    "correo": "lucia@test.com",
    "password": "Segura123",
    "password_confirmacion": "Segura123",
}


def test_registro_crea_planner_y_devuelve_token(client):
    r = client.post("/api/auth/registro", json=REGISTRO)
    assert r.status_code == 201
    data = r.json()
    assert data["usuario"]["rol"] == "WEDDING_PLANNER"
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me.json()["correo"] == "lucia@test.com"


def test_registro_ignora_rol_enviado(client):
    r = client.post("/api/auth/registro", json={**REGISTRO, "rol": "ADMINISTRADOR"})
    assert r.status_code == 201
    assert r.json()["usuario"]["rol"] == "WEDDING_PLANNER"


def test_registro_correo_duplicado(client):
    client.post("/api/auth/registro", json=REGISTRO)
    r = client.post("/api/auth/registro", json={**REGISTRO, "correo": "LUCIA@test.com"})
    assert r.status_code == 409


def test_registro_politica_y_confirmacion(client):
    r = client.post(
        "/api/auth/registro", json={**REGISTRO, "password": "abc", "password_confirmacion": "abc"}
    )
    assert r.status_code == 422
    r = client.post("/api/auth/registro", json={**REGISTRO, "password_confirmacion": "Otra1234"})
    assert r.status_code == 422


def _boda(client, headers) -> int:
    r = client.post("/api/bodas/borradores", json={"paso": 1}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_crud_invitados(client, db):
    crear_usuario(db, "p1@test.com", Rol.WEDDING_PLANNER)
    h = login(client, "p1@test.com")
    boda_id = _boda(client, h)

    r = client.post(
        f"/api/bodas/{boda_id}/invitados",
        json={"nombre": "Ana Martínez", "correo": "ana@test.com", "mesa": "Mesa 2"},
        headers=h,
    )
    assert r.status_code == 201
    inv = r.json()
    assert inv["confirmacion"] == "PENDIENTE" and inv["mesa"] == "Mesa 2"

    r = client.patch(f"/api/invitados/{inv['id']}", json={"confirmacion": "CONFIRMADO"}, headers=h)
    assert r.json()["confirmacion"] == "CONFIRMADO"

    lista = client.get(f"/api/bodas/{boda_id}/invitados", headers=h).json()
    assert [i["nombre"] for i in lista] == ["Ana Martínez"]

    assert client.delete(f"/api/invitados/{inv['id']}", headers=h).status_code == 204
    assert client.get(f"/api/bodas/{boda_id}/invitados", headers=h).json() == []


def test_invitados_de_otra_planner(client, db):
    crear_usuario(db, "p1@test.com", Rol.WEDDING_PLANNER)
    crear_usuario(db, "p2@test.com", Rol.WEDDING_PLANNER)
    h1 = login(client, "p1@test.com")
    h2 = login(client, "p2@test.com")
    boda_id = _boda(client, h1)
    inv = client.post(f"/api/bodas/{boda_id}/invitados", json={"nombre": "X"}, headers=h1).json()

    assert client.get(f"/api/bodas/{boda_id}/invitados", headers=h2).status_code == 403
    assert (
        client.patch(f"/api/invitados/{inv['id']}", json={"mesa": "1"}, headers=h2).status_code
        == 403
    )
    assert client.delete(f"/api/invitados/{inv['id']}", headers=h2).status_code == 403


def test_boda_out_incluye_presupuesto_y_progreso_y_proveedor_clientes(client, db):
    crear_usuario(db, "p1@test.com", Rol.WEDDING_PLANNER)
    h = login(client, "p1@test.com")
    from datetime import timedelta

    from app.core.config import today

    body = {
        "pareja": {
            "nombre_contrayente1": "Ana",
            "nombre_contrayente2": "Carlos",
            "correo": "ana@test.com",
            "telefono": "5512345678",
        },
        "evento": {
            "fecha": (today() + timedelta(days=90)).isoformat(),
            "lugar": "Hacienda",
            "estilo": "Clásico",
            "invitados_estimados": 150,
        },
        "presupuesto": {"monto_total": 25000, "conceptos": []},
    }
    boda = client.post("/api/bodas/onboarding", json=body, headers=h).json()
    assert boda["presupuesto_total"] == 25000
    assert boda["progreso"] is None

    limite = (today() + timedelta(days=10)).isoformat()
    for titulo in ("A", "B"):
        r = client.post(
            f"/api/bodas/{boda['id']}/tareas",
            json={"titulo": titulo, "fecha_limite": limite, "prioridad": "MEDIA"},
            headers=h,
        )
        assert r.status_code == 201, r.text
    tarea_id = r.json()["id"]
    client.patch(f"/api/tareas/{tarea_id}", json={"estado": "COMPLETADA"}, headers=h)
    assert client.get(f"/api/bodas/{boda['id']}", headers=h).json()["progreso"] == 50

    prov = client.post(
        "/api/proveedores", json={"nombre": "Flores", "tipo_servicio": "FLORES"}, headers=h
    ).json()
    client.post(f"/api/bodas/{boda['id']}/proveedores/{prov['id']}", headers=h)
    lista = client.get("/api/proveedores", headers=h).json()
    assert lista[0]["clientes"] == ["Ana & Carlos"]
