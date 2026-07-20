"""Project service stub"""


class ProjectService:
    async def list_projects(self):
        return []

    async def create_project(self, body):
        return {"id": "stub", "name": body.name, "description": body.description,
                "created_at": "2026-07-21T00:00:00", "updated_at": "2026-07-21T00:00:00",
                "archived": False, "version": 1, "selection_count": 0}

    async def get_project(self, project_id):
        return None

    async def update_project(self, project_id, body):
        return None

    async def archive_project(self, project_id):
        pass

    async def duplicate_project(self, project_id):
        return {}
