from pydantic import BaseModel


class ScenarioRequest(BaseModel):
    scenario_type: str  # 'x_wins', 'specific_winners', 'random'
    wins_count: int = 0
    specific_winners: list[str] = []


class OptimiseRequest(BaseModel):
    target: str  # 'ev', 'roi', 'variance', 'safest'
    constraints: dict = {}
