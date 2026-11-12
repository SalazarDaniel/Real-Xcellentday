from datetime import UTC, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Enum, Numeric

MONEY = Numeric(12, 2)  # RNF11: montos con 2 decimales
ZERO = Decimal("0.00")


def utcnow() -> datetime:
    """Marca de tiempo en UTC sin zona (se guarda así en BD)."""
    return datetime.now(UTC).replace(tzinfo=None)


def enum_col(enum_cls: type[PyEnum], name: str) -> Enum:
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])
