from datetime import timedelta

from app.core.config import today
from tests.conftest import onboarding_payload


def test_onboarding_crea_boda_activa_con_presupuesto_y_expediente(client, planner_headers):
    r = client.post(
        "/api/bodas/onboarding",
        json=onboarding_payload(conceptos=[{"descripcion": "Banquete", "monto_acordado": 80000}]),
        headers=planner_headers,
    )
    assert r.status_code == 201, r.text
    boda = r.json()
    assert boda["estado"] == "ACTIVA"
    assert boda["pareja"]["nombre"] == "Laura & Miguel"
    assert boda["dias_restantes"] == 120

    lista = client.get("/api/bodas?estado=ACTIVA", headers=planner_headers).json()
    assert [b["id"] for b in lista] == [boda["id"]]

    exp = client.get(f"/api/bodas/{boda['id']}/expediente", headers=planner_headers).json()
    assert exp["presupuesto"]["monto_total"] == 200000
    assert exp["presupuesto"]["monto_comprometido"] == 80000


def test_fecha_pasada_rechazada(client, planner_headers):
    payload = onboarding_payload()
    payload["evento"]["fecha"] = (today() - timedelta(days=1)).isoformat()
    r = client.post("/api/bodas/onboarding", json=payload, headers=planner_headers)
    assert r.status_code == 422
    assert "La fecha de la boda debe ser futura" in r.json()["detail"]


def test_validaciones_paso_1(client, planner_headers):
    payload = onboarding_payload()
    payload["pareja"]["telefono"] = "12345"
    payload["pareja"]["correo"] = "no-es-correo"
    r = client.post("/api/bodas/onboarding", json=payload, headers=planner_headers)
    assert r.status_code == 422
    campos = {e["campo"] for e in r.json()["errores"]}
    assert {"pareja.telefono", "pareja.correo"} <= campos


def test_presupuesto_debe_ser_mayor_a_cero(client, planner_headers):
    r = client.post(
        "/api/bodas/onboarding", json=onboarding_payload(monto=0), headers=planner_headers
    )
    assert r.status_code == 422


def test_borrador_se_guarda_y_retoma(client, planner_headers):
    datos_paso1 = onboarding_payload()["pareja"]
    r = client.post(
        "/api/bodas/borradores", json={"paso": 2, "pareja": datos_paso1}, headers=planner_headers
    )
    assert r.status_code == 201
    borrador = r.json()
    assert borrador["estado"] == "BORRADOR" and borrador["paso_onboarding"] == 2

    # Retomar: el borrador conserva paso y datos (RF04 CA3)
    obtenido = client.get(f"/api/bodas/{borrador['id']}", headers=planner_headers).json()
    assert obtenido["paso_onboarding"] == 2
    assert obtenido["datos_borrador"]["pareja"]["nombre_contrayente1"] == "Laura"

    # Los borradores no cuentan en el dashboard
    assert client.get("/api/dashboard", headers=planner_headers).json()["bodas_activas"] == 0

    r = client.post(
        f"/api/bodas/onboarding?borrador_id={borrador['id']}",
        json=onboarding_payload(),
        headers=planner_headers,
    )
    assert r.status_code == 201
    assert r.json()["id"] == borrador["id"] and r.json()["estado"] == "ACTIVA"


def test_expediente_de_otra_planner_es_403(client, boda, otra_headers):
    r = client.get(f"/api/bodas/{boda['id']}/expediente", headers=otra_headers)
    assert r.status_code == 403


def test_admin_no_accede_a_bodas(client, admin_headers):
    assert client.get("/api/bodas", headers=admin_headers).status_code == 403


def test_solo_se_eliminan_borradores(client, boda, planner_headers):
    r = client.delete(f"/api/bodas/{boda['id']}", headers=planner_headers)
    assert r.status_code == 409
