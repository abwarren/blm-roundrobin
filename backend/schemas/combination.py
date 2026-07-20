from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class SelectionInput(BaseModel):
    id: str
    game_id: str
    team: str
    odds: float
    market: Optional[str] = None
    line: Optional[str] = None
    pick: Optional[str] = None


class GenerateRequest(BaseModel):
    selections: list[SelectionInput]
    folds: list[int]
    stake_per_combo: float = 1.0
    total_stake: Optional[float] = None
    include_singles: bool = False
    filters: Optional[dict] = None


class ComboResult(BaseModel):
    id: str
    legs: list[str]
    leg_count: int
    odds: float
    stake: float
    payout: float
    profit: float
    roi: float
    ev: Optional[float] = None
    confidence: Optional[float] = None
    blm_score: Optional[float] = None


class Summary(BaseModel):
    total_combinations: int
    total_stake: float
    max_payout: float
    min_payout: float
    best_case_profit: float
    worst_case_profit: float
    best_case_roi: float
    worst_case_roi: float
    average_odds: float
    breakeven_pct: float
    expected_value: Optional[float] = None
    expected_roi: Optional[float] = None
    kelly_pct: Optional[float] = None
    variance: Optional[float] = None


class GenerateResponse(BaseModel):
    project_id: str
    config: dict
    total_combinations: int
    combinations: list[ComboResult]
    summary: Summary
    generated_at: str
