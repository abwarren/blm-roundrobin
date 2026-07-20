from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time


class SelectionCreate(BaseModel):
    sort_order: int = 0
    sport: Optional[str] = None
    league: Optional[str] = None
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    bookmaker: Optional[str] = "PokerBet"
    market: Optional[str] = None
    selection_name: str
    odds_decimal: float = Field(..., gt=1.0)
    odds_american: Optional[int] = None
    odds_fractional: Optional[str] = None
    confidence_pct: Optional[float] = Field(None, ge=0, le=100)
    blm_rating: Optional[float] = None
    trap_meter: Optional[float] = None
    edge_pct: Optional[float] = None
    expected_value: Optional[float] = None
    notes: Optional[str] = None


class SelectionResponse(BaseModel):
    id: str
    project_id: str
    sort_order: int
    sport: Optional[str] = None
    league: Optional[str] = None
    selection_name: str
    odds_decimal: float
    odds_american: Optional[int] = None
    odds_fractional: Optional[str] = None
    confidence_pct: Optional[float] = None
    blm_rating: Optional[float] = None
    trap_meter: Optional[float] = None
    edge_pct: Optional[float] = None
    expected_value: Optional[float] = None
    created_at: str
