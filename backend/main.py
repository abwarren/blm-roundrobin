"""BLM Round Robin — FastAPI Application Entry

Simple in-memory server. No DB required for v1.
"""

from __future__ import annotations
import os, sys
from pathlib import Path
from contextlib import asynccontextmanager

_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8420"))


# ── Engine ──────────────────────────────────────────────────────
from engine.generator import generate_combinations
from engine.calculator import calculate_combo_payout, calculate_summary, calculate_roi
from engine.templates import SYSTEM_TEMPLATES
from engine.scenarios import simulate_x_wins
from engine.optimizer import optimise_for_ev


# ── Scraper ─────────────────────────────────────────────────────
from scraper.service import PokerBetScraper
from scraper.api import router as scraper_router, init as init_scraper


# ── Schemas ─────────────────────────────────────────────────────
class SelectionIn(BaseModel):
    id: str
    gameId: str
    team: str
    odds: float
    market: str = ""
    line: str = ""
    pick: str = ""

class GenerateIn(BaseModel):
    selections: list[SelectionIn]
    folds: list[int] = [2, 3]
    stake_per_combo: float = 1.0

class ComboOut(BaseModel):
    id: str
    legs: list[str]
    leg_count: int
    odds: float
    stake: float
    payout: float
    profit: float
    roi: float

class SummaryOut(BaseModel):
    total_combinations: int
    total_stake: float
    max_payout: float
    min_payout: float
    best_case_profit: float
    worst_case_profit: float
    average_odds: float
    breakeven_pct: float

class GenerateOut(BaseModel):
    config: dict
    total_combinations: int
    combinations: list[ComboOut]
    summary: SummaryOut
    generated_at: str


# ── Scraper singleton ──────────────────────────────────────────
_scraper_instance: PokerBetScraper | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scraper_instance
    _scraper_instance = PokerBetScraper(headless=True, block_resources=True)
    await _scraper_instance.start()
    init_scraper(_scraper_instance)  # inject into API module
    yield
    if _scraper_instance:
        await _scraper_instance.stop()


# ── App ─────────────────────────────────────────────────────────
app = FastAPI(title="BLM Round Robin API", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── Routes ─────────────────────────────────────────────────────

# Include scraper routes
app.include_router(scraper_router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/templates")
async def templates():
    return SYSTEM_TEMPLATES

@app.post("/generate", response_model=GenerateOut)
async def generate(body: GenerateIn):
    sels = [s.model_dump() for s in body.selections]
    raw = generate_combinations(sels, body.folds)
    stake = body.stake_per_combo

    combos = []
    for c in raw:
        payout = calculate_combo_payout(stake, c["odds"])
        profit = round(payout - stake, 2)
        combo_id = f"{c['leg_count']}f-{'-'.join(c['legs'][:3])}"
        combos.append(ComboOut(
            id=combo_id,
            legs=c["legs"],
            leg_count=c["leg_count"],
            odds=c["odds"],
            stake=stake,
            payout=payout,
            profit=profit,
            roi=round(profit / stake * 100, 2) if stake else 0,
        ))

    total_stake = len(combos) * stake
    s = calculate_summary([c.model_dump() for c in combos], total_stake)

    return GenerateOut(
        config={"folds": body.folds, "stake_per_combo": stake},
        total_combinations=len(combos),
        combinations=combos,
        summary=SummaryOut(**{k: s[k] for k in SummaryOut.model_fields.keys()}),
        generated_at=__import__('datetime').datetime.utcnow().isoformat(),
    )

@app.post("/scenario")
async def scenario(body: dict):
    # body: { "combinations": [...], "wins": 3, "total_selections": 5 }
    wins = body.get("wins", 0)
    total = body.get("total_selections", 0)
    combos_data = body.get("combinations", [])
    result = simulate_x_wins(combos_data, wins, [f"s{i}" for i in range(total)])
    return result


# ── Entry ───────────────────────────────────────────────────────
def main():
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False, log_level="info", access_log=False)

if __name__ == "__main__":
    main()
