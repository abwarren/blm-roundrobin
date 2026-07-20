from pydantic import BaseModel
from typing import Optional


class SystemCreate(BaseModel):
    name: str
    system_type: str  # 'custom', 'patent', 'trixie', 'yankee', etc.
    config: dict
    stake_per_combo: float = 1.0
    total_stake: Optional[float] = None


class SystemResponse(BaseModel):
    id: str
    project_id: str
    name: str
    system_type: str
    config: dict
    stake_per_combo: float
    total_stake: Optional[float] = None
    created_at: str
