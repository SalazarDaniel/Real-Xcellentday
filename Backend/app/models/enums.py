"""Enumeraciones del dominio (sección 4.4 del análisis de requerimientos)."""

from enum import StrEnum


class Rol(StrEnum):
    ADMINISTRADOR = "ADMINISTRADOR"
    WEDDING_PLANNER = "WEDDING_PLANNER"


class EstadoBoda(StrEnum):
    BORRADOR = "BORRADOR"
    ACTIVA = "ACTIVA"
    REALIZADA = "REALIZADA"
    CANCELADA = "CANCELADA"


class TipoServicio(StrEnum):
    BANQUETE = "BANQUETE"
    MUSICA = "MUSICA"
    FOTOGRAFIA = "FOTOGRAFIA"
    FLORES = "FLORES"
    LUGAR = "LUGAR"
    OTRO = "OTRO"


class EstadoPago(StrEnum):
    PENDIENTE = "PENDIENTE"
    PAGADO = "PAGADO"
    VENCIDO = "VENCIDO"


class EstadoTarea(StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADA = "COMPLETADA"


class PrioridadTarea(StrEnum):
    ALTA = "ALTA"
    MEDIA = "MEDIA"
    BAJA = "BAJA"


class EstadoRSVP(StrEnum):
    PENDIENTE = "PENDIENTE"
    CONFIRMADO = "CONFIRMADO"
    RECHAZADO = "RECHAZADO"


class TipoRecordable(StrEnum):
    TAREA = "TAREA"
    PAGO = "PAGO"
    FECHA_IMPORTANTE = "FECHA_IMPORTANTE"
