from tests.conftest import login

NUEVA = {
    "nombre_completo": "Carla Pérez",
    "correo": "carla@test.com",
    "password": "Segura123",
    "password_confirmacion": "Segura123",
    "rol": "WEDDING_PLANNER",
}


def test_admin_crea_cuenta_y_puede_iniciar_sesion(client, admin_headers):
    r = client.post("/api/usuarios", json=NUEVA, headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["activo"] is True
    lista = client.get("/api/usuarios", headers=admin_headers).json()
    assert any(u["correo"] == "carla@test.com" for u in lista)
    login(client, "carla@test.com", "Segura123")


def test_correo_duplicado(client, admin_headers):
    client.post("/api/usuarios", json=NUEVA, headers=admin_headers)
    r = client.post(
        "/api/usuarios", json={**NUEVA, "correo": "CARLA@test.com"}, headers=admin_headers
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "El correo ya está registrado"


def test_politica_de_contrasena(client, admin_headers):
    r = client.post(
        "/api/usuarios",
        json={**NUEVA, "password": "abcdef", "password_confirmacion": "abcdef"},
        headers=admin_headers,
    )
    assert r.status_code == 422
    detalle = r.json()["detail"]
    assert "8 caracteres" in detalle and "número" in detalle


def test_planner_no_gestiona_usuarios(client, planner_headers):
    assert client.get("/api/usuarios", headers=planner_headers).status_code == 403
    assert client.post("/api/usuarios", json=NUEVA, headers=planner_headers).status_code == 403


def test_desactivar_cuenta_cierra_sesiones(client, admin_headers, planner, planner_headers):
    r = client.patch(f"/api/usuarios/{planner.id}", json={"activo": False}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["activo"] is False
    assert client.get("/api/auth/me", headers=planner_headers).status_code == 401


def test_admin_no_se_desactiva_a_si_mismo(client, admin, admin_headers):
    r = client.patch(f"/api/usuarios/{admin.id}", json={"activo": False}, headers=admin_headers)
    assert r.status_code == 400
