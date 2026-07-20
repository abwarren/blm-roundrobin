"""Project CRUD endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from services.project_service import ProjectService

router = APIRouter()


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(service: ProjectService = Depends()):
    return await service.list_projects()


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(body: ProjectCreate, service: ProjectService = Depends()):
    return await service.create_project(body)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, service: ProjectService = Depends()):
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, body: ProjectUpdate, service: ProjectService = Depends()):
    project = await service.update_project(project_id, body)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, service: ProjectService = Depends()):
    await service.archive_project(project_id)


@router.post("/{project_id}/duplicate", response_model=ProjectResponse, status_code=201)
async def duplicate_project(project_id: str, service: ProjectService = Depends()):
    return await service.duplicate_project(project_id)
