"""
Financial Calculator — payout, EV, Kelly, breakeven, variance
"""

from typing import Optional
import math


def calculate_combo_payout(stake: float, decimal_odds: float) -> float:
    """Calculate payout for a single combination."""
    return round(stake * decimal_odds, 2)


def calculate_combo_profit(stake: float, decimal_odds: float) -> float:
    """Calculate profit for a single combination."""
    return round(stake * (decimal_odds - 1), 2)


def calculate_roi(profit: float, total_stake: float) -> float:
    """Return ROI as a percentage."""
    if total_stake == 0:
        return 0.0
    return round((profit / total_stake) * 100, 2)


def calculate_breakeven(total_stake: float, max_payout: float) -> float:
    """Return breakeven percentage."""
    if max_payout == 0:
        return 0.0
    return round((total_stake / max_payout) * 100, 2)


def calculate_ev(
    combos: list[dict],
    selection_confidences: dict[str, float],
    total_stake: float,
) -> float:
    """
    Calculate expected value across all combinations.
    Each combo's probability = product of each leg's confidence.
    """
    expected_return = 0.0

    for combo in combos:
        # Probability all legs win
        prob_win = 1.0
        for sel_id in combo.get("selections", []):
            prob_win *= selection_confidences.get(sel_id, 0.5)

        expected_return += prob_win * combo["payout"]

    ev = expected_return - total_stake
    return round(ev, 2)


def calculate_kelly_fraction(odds: float, probability: float) -> float:
    """
    Calculate optimal Kelly fraction for a single bet.
    f* = (p * b - q) / b
    where b = decimal odds - 1, p = win prob, q = 1-p
    """
    b = odds - 1
    if b <= 0:
        return 0.0
    q = 1 - probability
    kelly = (probability * b - q) / b
    return max(0.0, round(kelly, 4))


def calculate_variance(combos: list[dict], mean_payout: float) -> float:
    """Calculate variance of payout outcomes."""
    if not combos:
        return 0.0
    n = len(combos)
    variance = sum((c["payout"] - mean_payout) ** 2 for c in combos) / n
    return round(variance, 2)


def calculate_summary(combos: list[dict], total_stake: float) -> dict:
    """Calculate aggregate summary metrics."""
    if not combos:
        return {}

    max_payout = max(c["payout"] for c in combos)
    min_payout = min(c["payout"] for c in combos)
    total_combos = len(combos)
    total_payout = sum(c["payout"] for c in combos)
    avg_odds = sum(c["odds"] for c in combos) / total_combos if total_combos else 0

    # Worst case: only the lowest-paying combo wins
    worst_case_profit = min_payout - total_stake
    # Best case: all combos hit (max per combo × count)
    best_case_profit = (max_payout * total_combos) - total_stake

    return {
        "total_combinations": total_combos,
        "total_stake": round(total_stake, 2),
        "max_payout": round(max_payout, 2),
        "min_payout": round(min_payout, 2),
        "best_case_profit": round(best_case_profit, 2),
        "worst_case_profit": round(worst_case_profit, 2),
        "best_case_roi": calculate_roi(best_case_profit, total_stake),
        "worst_case_roi": calculate_roi(worst_case_profit, total_stake),
        "average_odds": round(avg_odds, 4),
        "breakeven_pct": calculate_breakeven(total_stake, max_payout * total_combos),
        "expected_value": None,
        "expected_roi": None,
        "kelly_pct": None,
        "variance": None,
    }
