"""Comparison service stub"""


class ComparisonService:
    async def compare(self, system_ids: list[str]) -> dict:
        return {
            "systems": [
                {"system_id": sid, "name": "System", "metrics": {}}
                for sid in system_ids
            ],
            "recommended": None,
        }
