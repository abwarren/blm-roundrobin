"""Selection service stub"""


class SelectionService:
    async def list_selections(self, project_id):
        return []

    async def add_selection(self, project_id, body):
        return {"id": "stub", "project_id": project_id, "sort_order": 0,
                "selection_name": body.selection_name, "odds_decimal": body.odds_decimal,
                "created_at": "2026-07-21T00:00:00"}

    async def batch_add_selections(self, project_id, bodies):
        return [await self.add_selection(project_id, b) for b in bodies]

    async def update_selection(self, project_id, sel_id, body):
        return None

    async def delete_selection(self, project_id, sel_id):
        pass

    async def reorder_selections(self, project_id, order):
        pass
