"""
Scenario Simulation Engine

Simulates different win/loss outcomes for a set of combinations.
"""


def simulate_x_wins(combinations: list[dict], wins_count: int, selection_ids: list[str]) -> dict:
    """
    Simulate a scenario where exactly X of N selections win.

    Returns all combinations that would win, and summary P&L.
    """
    if wins_count > len(selection_ids):
        wins_count = len(selection_ids)

    winning_combos = []
    losing_combos = []

    for combo in combinations:
        combo_sel_ids = set(combo.get("selections", []))
        # A combo wins if all its legs are among the winners
        # We don't know which ones won, so we model best-case:
        # assume the wins_count most probable selections win
        if len(combo_sel_ids) <= wins_count:
            winning_combos.append(combo)
        else:
            losing_combos.append(combo)

    total_payout = sum(c.get("payout", 0) for c in winning_combos)
    total_stake = sum(c.get("stake", 0) for c in combinations)
    profit = total_payout - total_stake

    return {
        "scenario": f"{wins_count}_of_{len(selection_ids)}_wins",
        "winning_combos": len(winning_combos),
        "losing_combos": len(losing_combos),
        "total_payout": round(total_payout, 2),
        "total_stake": round(total_stake, 2),
        "profit": round(profit, 2),
        "roi": round((profit / total_stake * 100), 2) if total_stake else 0,
    }


def simulate_specific_winners(combinations: list[dict], winner_ids: list[str]) -> dict:
    """
    Simulate with specific winning selections.
    """
    winner_set = set(winner_ids)
    winning_combos = []
    losing_combos = []

    for combo in combinations:
        combo_sel_ids = set(combo.get("selections", []))
        if combo_sel_ids.issubset(winner_set):
            winning_combos.append(combo)
        else:
            losing_combos.append(combo)

    total_payout = sum(c.get("payout", 0) for c in winning_combos)
    total_stake = sum(c.get("stake", 0) for c in combinations)
    profit = total_payout - total_stake

    return {
        "scenario": "specific_winners",
        "winner_ids": winner_ids,
        "winning_combos": len(winning_combos),
        "losing_combos": len(losing_combos),
        "total_payout": round(total_payout, 2),
        "total_stake": round(total_stake, 2),
        "profit": round(profit, 2),
        "roi": round((profit / total_stake * 100), 2) if total_stake else 0,
    }
