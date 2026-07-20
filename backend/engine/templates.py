"""
System Template Definitions

Pre-defined system bet types with their fold configurations.
"""

SYSTEM_TEMPLATES = {
    "patent": {
        "name": "Patent",
        "min_selections": 3,
        "max_selections": 3,
        "folds": [1, 2, 3],
        "total_combos": 7,
        "description": "3 singles + 3 doubles + 1 treble",
    },
    "trixie": {
        "name": "Trixie",
        "min_selections": 3,
        "max_selections": 3,
        "folds": [2, 3],
        "total_combos": 4,
        "description": "3 doubles + 1 treble",
    },
    "yankee": {
        "name": "Yankee",
        "min_selections": 4,
        "max_selections": 4,
        "folds": [2, 3, 4],
        "total_combos": 11,
        "description": "6 doubles + 4 trebles + 1 four-fold",
    },
    "canadian": {
        "name": "Canadian (Super Yankee)",
        "min_selections": 5,
        "max_selections": 5,
        "folds": [2, 3, 4, 5],
        "total_combos": 26,
        "description": "10 doubles + 10 trebles + 5 four-folds + 1 five-fold",
    },
    "heinz": {
        "name": "Heinz",
        "min_selections": 6,
        "max_selections": 6,
        "folds": [2, 3, 4, 5, 6],
        "total_combos": 57,
    },
    "super_heinz": {
        "name": "Super Heinz",
        "min_selections": 7,
        "max_selections": 7,
        "folds": [2, 3, 4, 5, 6, 7],
        "total_combos": 120,
    },
    "goliath": {
        "name": "Goliath",
        "min_selections": 8,
        "max_selections": 8,
        "folds": [2, 3, 4, 5, 6, 7, 8],
        "total_combos": 247,
    },
    "lucky15": {
        "name": "Lucky 15",
        "min_selections": 4,
        "max_selections": 4,
        "folds": [1, 2, 3, 4],
        "total_combos": 15,
    },
    "lucky31": {
        "name": "Lucky 31",
        "min_selections": 5,
        "max_selections": 5,
        "folds": [1, 2, 3, 4, 5],
        "total_combos": 31,
    },
    "lucky63": {
        "name": "Lucky 63",
        "min_selections": 6,
        "max_selections": 6,
        "folds": [1, 2, 3, 4, 5, 6],
        "total_combos": 63,
    },
}


def get_template_folds(template_name: str, num_selections: int) -> list[int]:
    """Get fold sizes for a named template, validated against selection count."""
    template = SYSTEM_TEMPLATES.get(template_name)
    if not template:
        raise ValueError(f"Unknown template: {template_name}")
    if num_selections < template["min_selections"]:
        raise ValueError(
            f"Template '{template_name}' needs at least {template['min_selections']} "
            f"selections, got {num_selections}"
        )
    return template["folds"]
