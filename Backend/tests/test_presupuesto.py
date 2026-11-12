from datetime import timedelta

from app.core.config import today


def _concepto(client, headers, boda_id, monto=50000, descripcion="Banquete"):
    r = client.post(
        f"/api/bodas/{boda_id}/presupuesto/conceptos",
        json={"descripcion": descripcion, "monto_acordado": monto},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["conceptos"][-1]


def _fecha(dias: int) -> str:
    return (today() + timedelta(days=dias)).isoformat()


def test_recalculo_de_saldo_ca1(client, boda, planner_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    r = client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 20000, "fecha_vencimiento": _fecha(10), "fecha_pago": _fecha(0)},
        headers=planner_headers,
    )
    assert r.status_code == 201
    p = r.json()
    assert p["monto_pagado"] == 20000
    assert p["conceptos"][0]["saldo"] == 30000
    assert p["saldo_pendiente"] == 30000
    assert p["conceptos"][0]["pagos"][0]["simulado"] is True


def test_pago_mayor_al_saldo_rechazado_ca2(client, boda, planner_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 20000, "fecha_vencimiento": _fecha(10), "fecha_pago": _fecha(0)},
        headers=planner_headers,
    )
    r = client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 40000, "fecha_vencimiento": _fecha(20)},
        headers=planner_headers,
    )
    assert r.status_code == 400
    assert "excede" in r.json()["detail"]


def test_alerta_presupuesto_excedido_ca3(client, boda, planner_headers):
    _concepto(client, planner_headers, boda["id"], monto=150000)
    r = client.post(
        f"/api/bodas/{boda['id']}/presupuesto/conceptos",
        json={"descripcion": "Lugar", "monto_acordado": 60000},
        headers=planner_headers,
    )
    assert r.status_code == 201  # no bloquea
    assert r.json()["excedido"] is True


def test_registrar_pago_programado(client, boda, planner_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    p = client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 10000, "fecha_vencimiento": _fecha(5)},
        headers=planner_headers,
    ).json()
    pago_id = p["conceptos"][0]["pagos"][0]["id"]
    assert p["monto_pagado"] == 0
    r = client.post(f"/api/pagos/{pago_id}/pagar", json={}, headers=planner_headers)
    assert r.status_code == 200
    assert r.json()["monto_pagado"] == 10000
    assert client.post(f"/api/pagos/{pago_id}/pagar", headers=planner_headers).status_code == 400


def test_alertas_de_vencimiento(client, boda, planner_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    for dias, monto in ((3, 1000), (-1, 2000), (30, 3000)):
        client.post(
            f"/api/conceptos/{concepto['id']}/pagos",
            json={"monto": monto, "fecha_vencimiento": _fecha(dias)},
            headers=planner_headers,
        )
    alertas = client.get("/api/alertas/pagos", headers=planner_headers).json()
    assert [(a["nivel"], a["monto"]) for a in alertas] == [("rojo", 2000), ("amarillo", 1000)]

    presupuesto = client.get(f"/api/bodas/{boda['id']}/presupuesto", headers=planner_headers).json()
    estados = {p["monto"]: p["estado"] for p in presupuesto["conceptos"][0]["pagos"]}
    assert estados[2000] == "VENCIDO" and estados[1000] == "PENDIENTE"

    # Al pagar el vencido desaparece la alerta (RF08 CA3)
    vencido = next(p for p in presupuesto["conceptos"][0]["pagos"] if p["monto"] == 2000)
    client.post(f"/api/pagos/{vencido['id']}/pagar", headers=planner_headers)
    alertas = client.get("/api/alertas/pagos", headers=planner_headers).json()
    assert [a["nivel"] for a in alertas] == ["amarillo"]


def test_alertas_aisladas_por_planner(client, boda, planner_headers, otra_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 1000, "fecha_vencimiento": _fecha(1)},
        headers=planner_headers,
    )
    assert client.get("/api/alertas/pagos", headers=otra_headers).json() == []
    r = client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 1000, "fecha_vencimiento": _fecha(1)},
        headers=otra_headers,
    )
    assert r.status_code == 403


def test_dashboard_resumen(client, boda, planner_headers):
    concepto = _concepto(client, planner_headers, boda["id"])
    client.post(
        f"/api/conceptos/{concepto['id']}/pagos",
        json={"monto": 5000, "fecha_vencimiento": _fecha(2), "fecha_pago": _fecha(0)},
        headers=planner_headers,
    )
    d = client.get("/api/dashboard", headers=planner_headers).json()
    assert d["bodas_activas"] == 1
    assert d["finanzas"]["monto_comprometido"] == 50000
    assert d["finanzas"]["monto_pagado"] == 5000
    assert d["finanzas"]["saldo_pendiente"] == 45000
