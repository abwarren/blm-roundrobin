"""Combination service — orchestrates generator, calculator, cache"""

from engine.generator import generate_combinations, generate_system_combinations
from engine.calculator import calculate_summary, calculate_combo_payout
from engine.scenarios import simulate_x_wins, simulate_specific_winners
from engine.optimizer import optimise_for_ev, optimise_for_roi, optimise_for_safest
from schemas.combination import GenerateResponse, ComboResult, Summary
from datetime import datetime
import hashlib
import json


_CACHE: dict[str, dict] = {}


class CombinationService:
    """Handles combination generation, caching, scenario simulation, and optimisation."""

    async def generate(self, project_id: str, body) -> GenerateResponse:
        selections = [s.model_dump() for s in body.selections]
        folds = body.folds

        # Generate raw combos
        raw_combos = generate_combinations(selections, folds)

        # Enrich with financials
        stake = body.stake_per_combo
        combos = []
        for c in raw_combos:
            payout = calculate_combo_payout(stake, c["odds"])
            profit = round(payout - stake, 2)
            combos.append(ComboResult(
                id=f"{c['leg_count']}-{'-'.join(c['legs'])}",
                legs=c["legs"],
                leg_count=c["leg_count"],
                odds=c["odds"],
                stake=stake,
                payout=payout,
                profit=profit,
                roi=round((profit / stake) * 100, 2) if stake else 0,
            ))

        # Summary
        total_stake = len(combos) * stake
        summary_data = calculate_summary(
            [c.model_dump() for c in combos], total_stake
        )
        summary = Summary(**summary_data)

        response = GenerateResponse(
            project_id=project_id,
            config={"folds": folds, "stake_per_combo": stake},
            total_combinations=len(combos),
            combinations=combos,
            summary=summary,
            generated_at=datetime.utcnow().isoformat(),
        )

        # Cache
        cache_key = self._hash_key(project_id, body)
        _CACHE[cache_key] = response.model_dump()

        return response

    async def get_cached(self, project_id: str, hash_key: str) -> dict:
        return _CACHE.get(hash_key, {})

    async def run_scenario(self, project_id: str, body: dict) -> dict:
        # Stub — needs cached combination data
        return {"scenario": "not_implemented"}

    async def optimise(self, project_id: str, body: dict) -> dict:
        target = body.get("target", "ev")
        # Stub — needs cached selections and combinations
        return {"strategy": target, "message": "Optimisation requires selections data"}

    async def list_systems(self, project_id: str) -> list:
        return []

    async def save_system(self, project_id: str, body) -> dict:
        return {"id": "stub", "project_id": project_id, "name": body.name,
                "system_type": body.system_type, "config": body.config,
                "stake_per_combo": body.stake_per_combo, "created_at": "2026-07-21T00:00:00"}

    async def delete_system(self, project_id: str, sys_id: str):
        pass

    def _hash_key(self, project_id: str, body) -> str:
        raw = json.dumps({"pid": project_id, "sels": [s.id for s in body.selections],
                          "folds": body.folds}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:12]
