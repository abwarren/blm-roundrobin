from pydantic import BaseModel
from typing import Any


class CompareItem(BaseModel):
    system_id: str
    name: str
    metrics: dict[str, Any]


class CompareResponse(BaseModel):
    systems: list[CompareItem]
    recommended: str | None = None
