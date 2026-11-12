from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Montos en MXN con 2 decimales; se serializan como número en JSON.
Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]
PositiveMoney = Annotated[
    Decimal,
    Field(gt=0, max_digits=12, decimal_places=2),
    PlainSerializer(lambda v: float(v), return_type=float, when_used="json"),
]
Phone10 = Annotated[str, Field(pattern=r"^\d{10}$", description="Teléfono de 10 dígitos")]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str
