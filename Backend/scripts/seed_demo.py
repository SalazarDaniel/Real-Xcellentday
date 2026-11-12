"""Carga datos de demostración: una wedding planner con dos bodas, proveedores, pagos y tareas.

Uso:  poetry run python -m scripts.seed_demo
      docker compose exec backend python -m scripts.seed_demo
"""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.config import today
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Boda,
    ConceptoPresupuesto,
    EstadoBoda,
    EstadoPago,
    ExpedienteDigital,
    Pago,
    Pareja,
    Presupuesto,
    PrioridadTarea,
    Proveedor,
    Rol,
    Tarea,
    TipoServicio,
    Usuario,
)
from app.services.auth import ensure_first_admin

PLANNER_EMAIL = "planner@xcellentday.com"
PLANNER_PASSWORD = "Planner123"


def main() -> None:
    hoy = today()
    with SessionLocal() as db:
        ensure_first_admin(db)
        if db.scalar(select(Usuario).where(Usuario.correo == PLANNER_EMAIL)):
            print("Los datos de demostración ya existen.")
            return

        planner = Usuario(
            nombre_completo="Valeria Xcellent",
            correo=PLANNER_EMAIL,
            password_hash=hash_password(PLANNER_PASSWORD),
            rol=Rol.WEDDING_PLANNER,
        )
        db.add(planner)
        db.flush()

        foto = Proveedor(
            planner_id=planner.id,
            nombre="Luz de Yucatán Fotografía",
            tipo_servicio=TipoServicio.FOTOGRAFIA,
            nombre_contacto="Andrés Canul",
            telefono="9991112233",
            correo="hola@luzdeyucatan.mx",
        )
        banquete = Proveedor(
            planner_id=planner.id,
            nombre="Banquetes La Ceiba",
            tipo_servicio=TipoServicio.BANQUETE,
            nombre_contacto="Marisol Pech",
            telefono="9994445566",
            correo="eventos@laceiba.mx",
        )
        flores = Proveedor(
            planner_id=planner.id,
            nombre="Flor de Mayo",
            tipo_servicio=TipoServicio.FLORES,
            telefono="9997778899",
        )
        db.add_all([foto, banquete, flores])
        db.flush()

        def nueva_boda(n1, n2, dias, lugar, estilo, total):
            boda = Boda(
                planner_id=planner.id,
                pareja=Pareja(
                    nombre_contrayente1=n1,
                    nombre_contrayente2=n2,
                    correo=f"{n1.lower()}.{n2.lower()}@correo.com",
                    telefono="9990000000",
                ),
                fecha=hoy + timedelta(days=dias),
                lugar=lugar,
                estilo=estilo,
                invitados_estimados=180,
                estado=EstadoBoda.ACTIVA,
                paso_onboarding=3,
                presupuesto=Presupuesto(monto_total=Decimal(total)),
                expediente=ExpedienteDigital(),
            )
            db.add(boda)
            return boda

        b1 = nueva_boda("Sofía", "Diego", 25, "Hacienda Temozón", "Hacienda clásica", 450000)
        b2 = nueva_boda("Mariana", "Carlos", 140, "Playa Progreso", "Boho playero", 300000)
        b1.proveedores = [foto, banquete]
        b2.proveedores = [flores]

        c1 = ConceptoPresupuesto(
            descripcion="Banquete 180 personas", monto_acordado=Decimal(180000), proveedor=banquete
        )
        c1.pagos = [
            Pago(
                monto=Decimal(60000),
                fecha_vencimiento=hoy - timedelta(days=20),
                fecha_pago=hoy - timedelta(days=21),
                estado=EstadoPago.PAGADO,
            ),
            Pago(monto=Decimal(60000), fecha_vencimiento=hoy + timedelta(days=3)),
            Pago(monto=Decimal(60000), fecha_vencimiento=hoy + timedelta(days=20)),
        ]
        c2 = ConceptoPresupuesto(
            descripcion="Fotografía y video", monto_acordado=Decimal(45000), proveedor=foto
        )
        c2.pagos = [
            Pago(
                monto=Decimal(15000),
                fecha_vencimiento=hoy - timedelta(days=2),
                estado=EstadoPago.VENCIDO,
            )
        ]
        b1.presupuesto.conceptos = [c1, c2]
        b2.presupuesto.conceptos = [
            ConceptoPresupuesto(
                descripcion="Decoración floral", monto_acordado=Decimal(35000), proveedor=flores
            )
        ]

        b1.tareas = [
            Tarea(
                titulo="Prueba de menú",
                fecha_limite=hoy + timedelta(days=2),
                prioridad=PrioridadTarea.ALTA,
            ),
            Tarea(
                titulo="Confirmar música de ceremonia",
                fecha_limite=hoy - timedelta(days=1),
                prioridad=PrioridadTarea.MEDIA,
            ),
        ]
        b2.tareas = [
            Tarea(
                titulo="Enviar save the date",
                fecha_limite=hoy + timedelta(days=10),
                prioridad=PrioridadTarea.BAJA,
            )
        ]
        db.commit()
        print(f"Datos de demostración creados. Planner: {PLANNER_EMAIL} / {PLANNER_PASSWORD}")


if __name__ == "__main__":
    main()
