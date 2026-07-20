"""Saved system bet configurations"""

from fastapi import APIRouter, Depends
from schemas.system import SystemCreate, SystemResponse
from services.combination_service import CombinationService

router = APIRouter()


@router.get("/{project_id}/systems", response_model=list[SystemResponse])
async def list_systems(project_id: str, service: CombinationService = Depends()):
    return await service.list_systems(project_id)


@router.post("/{project_id}/systems", response_model=SystemResponse, status_code=201)
async def save_system(project_id: str, body: SystemCreate, service: CombinationService = Depends()):
    return await service.save_system(project_id, body)


@router.delete("/{project_id}/systems/{sys_id}", status_code=204)
async def delete_system(project_id: str, sys_id: str, service: CombinationService = Depends()):
    await service.delete_system(project_id, sys_id)


@router.get("/system-templates")
async def list_templates():
    from engine.templates import SYSTEM_TEMPLATES
    return SYSTEM_TEMPLATES
