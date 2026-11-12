from datetime import timedelta

from app.core.config import today
from app.models import Tarea

PROV = {
    "nombre": "Foto Luz",
    "tipo_servicio": "FOTOGRAFIA",
    "nombre_contacto": "Luis",
    "telefono": "9990001111",
    "correo": "foto@luz.com",
}


def test_crud_y_filtro_de_proveedores(client, planner_headers):
    r = client.post("/api/proveedores", json=PROV, headers=planner_headers)
    assert r.status_code == 201
    client.post(
        "/api/proveedores",
        json={**PROV, "nombre": "Flores Mayas", "tipo_servicio": "FLORES", "correo": "f@m.com"},
        headers=planner_headers,
    )
    fotos = client.get("/api/proveedores?tipo_servicio=FOTOGRAFIA", headers=planner_headers).json()
    assert [p["nombre"] for p in fotos] == ["Foto Luz"]

    pid = r.json()["id"]
    r = client.put(
        f"/api/proveedores/{pid}", json={**PROV, "nombre": "Foto Luz MX"}, headers=planner_headers
    )
    assert r.json()["nombre"] == "Foto Luz MX"


def test_correo_duplicado_de_proveedor(client, planner_headers, otra_headers):
    client.post("/api/proveedores", json=PROV, headers=planner_headers)
    r = client.post("/api/proveedores", json=PROV, headers=planner_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Ya existe un proveedor con este correo"
    # Unicidad por catálogo de planner
    assert client.post("/api/proveedores", json=PROV, headers=otra_headers).status_code == 201


def test_no_se_elimina_proveedor_asociado(client, boda, planner_headers):
    pid = client.post("/api/proveedores", json=PROV, headers=planner_headers).json()["id"]
    r = client.post(f"/api/bodas/{boda['id']}/proveedores/{pid}", headers=planner_headers)
    assert r.status_code == 200
    r = client.delete(f"/api/proveedores/{pid}", headers=planner_headers)
    assert r.status_code == 409 and "desactivarlo" in r.json()["detail"]
    r = client.patch(f"/api/proveedores/{pid}/desactivar", headers=planner_headers)
    assert r.json()["activo"] is False


def test_eliminar_proveedor_sin_relaciones(client, planner_headers):
    pid = client.post("/api/proveedores", json=PROV, headers=planner_headers).json()["id"]
    assert client.delete(f"/api/proveedores/{pid}", headers=planner_headers).status_code == 204


def _fecha(d):
    return (today() + timedelta(days=d)).isoformat()


def test_tareas_flujo_completo(client, boda, planner_headers):
    url = f"/api/bodas/{boda['id']}/tareas"
    r = client.post(
        url,
        json={"titulo": "Prueba de menú", "fecha_limite": _fecha(5), "prioridad": "ALTA"},
        headers=planner_headers,
    )
    assert r.status_code == 201 and r.json()["estado"] == "PENDIENTE"
    tid = r.json()["id"]
    client.post(
        url, json={"titulo": "Invitaciones", "fecha_limite": _fecha(9)}, headers=planner_headers
    )

    altas = client.get(f"{url}?prioridad=ALTA", headers=planner_headers).json()
    assert [t["titulo"] for t in altas] == ["Prueba de menú"]

    assert client.get("/api/dashboard", headers=planner_headers).json()["tareas_pendientes"] == 2
    r = client.patch(f"/api/tareas/{tid}", json={"estado": "COMPLETADA"}, headers=planner_headers)
    assert r.json()["fecha_termino"] == today().isoformat()
    assert client.get("/api/dashboard", headers=planner_headers).json()["tareas_pendientes"] == 1


def test_tarea_fecha_pasada_y_posterior_a_boda(client, boda, planner_headers):
    url = f"/api/bodas/{boda['id']}/tareas"
    r = client.post(url, json={"titulo": "X", "fecha_limite": _fecha(-1)}, headers=planner_headers)
    assert r.status_code == 400
    r = client.post(url, json={"titulo": "X", "fecha_limite": _fecha(200)}, headers=planner_headers)
    assert r.status_code == 409 and r.json()["detail"]["code"] == "FECHA_POSTERIOR_BODA"
    r = client.post(
        url,
        json={"titulo": "X", "fecha_limite": _fecha(200), "confirmar": True},
        headers=planner_headers,
    )
    assert r.status_code == 201


def test_tarea_vencida_resaltada(client, db, boda, planner_headers):
    db.add(Tarea(boda_id=boda["id"], titulo="Atrasada", fecha_limite=today() - timedelta(days=1)))
    db.commit()
    tareas = client.get(f"/api/bodas/{boda['id']}/tareas", headers=planner_headers).json()
    assert tareas[0]["vencida"] is True
    vencidas = client.get("/api/tareas?vencidas=true", headers=planner_headers).json()
    assert [t["titulo"] for t in vencidas] == ["Atrasada"]
    assert client.get("/api/dashboard", headers=planner_headers).json()["tareas_vencidas"] == 1


def test_tarea_ajena_403(client, boda, planner_headers, otra_headers):
    r = client.post(
        f"/api/bodas/{boda['id']}/tareas",
        json={"titulo": "X", "fecha_limite": _fecha(3)},
        headers=planner_headers,
    )
    tid = r.json()["id"]
    assert (
        client.patch(
            f"/api/tareas/{tid}", json={"estado": "COMPLETADA"}, headers=otra_headers
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/bodas/{boda['id']}/tareas",
            json={"titulo": "X", "fecha_limite": _fecha(3)},
            headers=otra_headers,
        ).status_code
        == 403
    )
