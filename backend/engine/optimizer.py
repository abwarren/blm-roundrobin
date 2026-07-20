"""
Optimisation Engine

Suggests removal of weak selections to optimise for various targets.
"""


def optimise_for_ev(selections: list[dict], combinations: list[dict]) -> dict:
    """
    Suggest which selections to remove to maximise EV.
    Examines each selection's contribution to overall portfolio EV.
    """
    scores = []
    for sel in selections:
        # Count how many combos include this selection
        combo_count = sum(
            1 for c in combinations if sel["id"] in c.get("selections", [])
        )
        scores.append({
            "selection_id": sel["id"],
            "team": sel.get("team", "Unknown"),
            "odds": sel.get("odds", 0),
            "combo_count": combo_count,
            "removal_score": _calculate_removal_score(sel, combo_count),
        })

    scores.sort(key=lambda x: x["removal_score"])
    return {
        "strategy": "maximise_ev",
        "selections": scores,
        "recommended_removals": [s for s in scores if s["removal_score"] < 0.5],
    }


def optimise_for_roi(selections: list[dict], combinations: list[dict]) -> dict:
    """
    Suggest selections to maximise ROI (remove lowest odds).
    """
    sorted_sels = sorted(selections, key=lambda s: s.get("odds", 0))
    return {
        "strategy": "maximise_roi",
        "lowest_odds_selections": [
            {"id": s["id"], "team": s.get("team", ""), "odds": s.get("odds", 0)}
            for s in sorted_sels[:3]
        ],
    }


def optimise_for_safest(selections: list[dict], combinations: list[dict]) -> dict:
    """
    Suggest safest combinations (lowest variance, most consistent).
    """
    safe_combos = sorted(combinations, key=lambda c: c.get("odds", 0))
    return {
        "strategy": "safest",
        "safest_combinations": [
            {"legs": c["legs"], "odds": c["odds"]}
            for c in safe_combos[:5]
        ],
    }


def _calculate_removal_score(selection: dict, combo_count: int) -> float:
    """Score how much a selection drags down the portfolio (0-1)."""
    odds = selection.get("odds", 2.0)
    confidence = selection.get("confidence", 0.5)
    # Low odds + low confidence = high removal score
    return (1 / odds) * (1 - confidence) if odds > 0 else 1.0
