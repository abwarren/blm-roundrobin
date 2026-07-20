"""
BLM Aggregator — roll up per-selection BLM scores to combinations
"""

from typing import Optional


def aggregate_blm_score(selections: list[dict]) -> float:
    """
    Aggregate BLM scores across a set of selections into a single score.

    Uses geometric mean to penalise weak links in the chain.
    """
    scores = [s.get("blm_rating", 50) for s in selections if s.get("blm_rating")]
    if not scores:
        return 50.0

    product = 1.0
    for s in scores:
        product *= s / 100.0

    geometric = (product ** (1.0 / len(scores))) * 100
    return round(geometric, 1)


def aggregate_confidence(selections: list[dict]) -> float:
    """
    Aggregate confidence scores across a set of selections.
    Uses product of probabilities (all must win).
    """
    confidences = [
        s.get("confidence_pct", 50) / 100.0
        for s in selections
        if s.get("confidence_pct")
    ]
    if not confidences:
        return 50.0

    product = 1.0
    for c in confidences:
        product *= c

    return round(product * 100, 1)


def aggregate_risk_rating(selections: list[dict]) -> str:
    """
    Determine overall risk rating for a combination.
    """
    trap_meters = [s.get("trap_meter", 0) for s in selections if s.get("trap_meter")]
    if not trap_meters:
        return "medium"

    avg_trap = sum(trap_meters) / len(trap_meters)
    if avg_trap > 40:
        return "high"
    elif avg_trap > 20:
        return "medium"
    return "low"
