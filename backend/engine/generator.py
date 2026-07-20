"""
Combination Generator — Core nCr Engine

Generates all combinations of selections for given fold sizes.
Uses iterative approach to avoid Python recursion limits.
"""

from itertools import combinations
from typing import Any


def generate_combinations(selections: list[dict], fold_sizes: list[int]) -> list[dict]:
    """
    Generate all combinations for each fold size.

    Args:
        selections: List of selection dicts with 'id', 'team', 'odds', etc.
        fold_sizes: List of fold sizes to generate (e.g. [2, 3] for doubles + trebles)

    Returns:
        List of combination dicts with legs, combined odds, etc.
    """
    results = []

    for k in fold_sizes:
        if k > len(selections):
            continue
        if k == 0:
            continue

        for combo in combinations(selections, k):
            combined_odds = 1.0
            legs = []
            for sel in combo:
                combined_odds *= sel.get("odds", 1.0)
                legs.append(sel.get("team", "Unknown"))

            results.append({
                "legs": legs,
                "leg_count": k,
                "odds": round(combined_odds, 4),
                "selections": [s["id"] for s in combo],
            })

    return results


def count_combinations(n: int, k: int) -> int:
    """Count nCr combinations."""
    from math import comb
    return comb(n, k)


def generate_system_combinations(selections: list[dict], template: str) -> list[dict]:
    """
    Generate combinations for a named system template.
    """
    from engine.templates import get_template_folds
    folds = get_template_folds(template, len(selections))
    return generate_combinations(selections, folds)
