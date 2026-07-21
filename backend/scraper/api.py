"""
Scraper API endpoints — exposes headless Playwright scraper to the overlay.
Uses an injected singleton scraper instance from main.py.
"""

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from scraper.service import PokerBetScraper

router = APIRouter(prefix="/scrape", tags=["Scraper"])

# Shared instance — injected by main.py lifespan
_scraper: Optional[PokerBetScraper] = None


def init(instance: PokerBetScraper):
    """Inject the shared scraper instance (called from main.py)."""
    global _scraper
    _scraper = instance


class GameMarket(BaseModel):
    line: float
    over: float
    under: float


class GameResponse(BaseModel):
    id: str
    homeTeam: str
    awayTeam: str
    homeScore: int
    awayScore: int
    period: str
    clock: str
    league: str
    homeOdds: Optional[float] = None
    awayOdds: Optional[float] = None
    totalPoints: list[GameMarket] = []
    teamTotals: dict[str, list[GameMarket]] = {}


class ScrapeResponse(BaseModel):
    success: bool
    game_count: int
    games: list[GameResponse]
    metrics: dict
    error: Optional[str] = None


class MetricsResponse(BaseModel):
    total_scrapes: int
    total_kb: float
    total_saved_kb: float
    avg_duration_ms: float
    scrapes: list[dict]


@router.get("/live-basketball", response_model=ScrapeResponse)
async def scrape_live_basketball():
    """Scrape all live basketball games with O/U markets from PokerBet."""
    if not _scraper:
        return ScrapeResponse(
            success=False, game_count=0, games=[], metrics={},
            error="Scraper not initialized",
        )

    try:
        games, metrics = await _scraper.scrape_live_games()

        game_responses = []
        for g in games:
            tp = []
            for m in g.get("markets", {}).get("totalPoints", []):
                tp.append(GameMarket(line=m["line"], over=m["over"], under=m["under"]))

            tt = {}
            for team, markets in g.get("markets", {}).get("teamTotals", {}).items():
                tt[team] = [GameMarket(line=m["line"], over=m["over"], under=m["under"]) for m in markets]

            game_responses.append(GameResponse(
                id=g.get("id", ""),
                homeTeam=g.get("homeTeam", ""),
                awayTeam=g.get("awayTeam", ""),
                homeScore=g.get("homeScore", 0),
                awayScore=g.get("awayScore", 0),
                period=g.get("period", ""),
                clock=g.get("clock", ""),
                league=g.get("league", ""),
                homeOdds=g.get("homeOdds"),
                awayOdds=g.get("awayOdds"),
                totalPoints=tp,
                teamTotals=tt,
            ))

        return ScrapeResponse(
            success=True,
            game_count=len(game_responses),
            games=game_responses,
            metrics=metrics.summary(),
        )

    except TimeoutError:
        return ScrapeResponse(
            success=False, game_count=0, games=[], metrics={},
            error="Basketball section did not load within timeout",
        )
    except Exception as e:
        return ScrapeResponse(
            success=False, game_count=0, games=[], metrics={},
            error=str(e),
        )


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Return bandwidth metrics + optimization suggestions."""
    if not _scraper:
        return MetricsResponse(total_scrapes=0, total_kb=0, total_saved_kb=0,
                               avg_duration_ms=0, scrapes=[])

    log = _scraper.metrics_log
    total_kb = sum(m.kb_total for m in log)
    total_saved = sum(m.kb_saved for m in log)
    avg_duration = sum(m.load_duration_ms for m in log) / max(1, len(log))

    return MetricsResponse(
        total_scrapes=len(log),
        total_kb=round(total_kb, 1),
        total_saved_kb=round(total_saved, 1),
        avg_duration_ms=round(avg_duration, 0),
        scrapes=[m.summary() for m in log][-20:],  # last 20
    )


@router.get("/optimization-suggestions")
async def optimization_suggestions():
    """Return recommended new blocking rules based on observed traffic."""
    if not _scraper:
        return {"suggestions": []}
    # Aggregate across recent metrics
    return {"suggestions": []}


@router.get("/blocked-domains")
async def blocked_domains():
    """Return the current list of always-blocked domains."""
    from scraper.bandwidth import BandwidthTracker
    return {"domains": sorted(BandwidthTracker.ALWAYS_BLOCK_DOMAINS)}


@router.post("/refresh-context")
async def refresh_context():
    """Force-create a new browser context (e.g. after detection or IP rotation)."""
    if not _scraper:
        return {"status": "error", "detail": "Not initialized"}
    await _scraper._create_context()
    return {"status": "context_refreshed"}
