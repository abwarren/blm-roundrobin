"""Selection CRUD endpoints (nested under projects)"""

from fastapi import APIRouter, Depends, HTTPException
from schemas.selection import SelectionCreate, SelectionResponse
from services.selection_service import SelectionService

router = APIRouter()


@router.get("/{project_id}/selections", response_model=list[SelectionResponse])
async def list_selections(project_id: str, service: SelectionService = Depends()):
    return await service.list_selections(project_id)


@router.post("/{project_id}/selections", response_model=SelectionResponse, status_code=201)
async def add_selection(project_id: str, body: SelectionCreate, service: SelectionService = Depends()):
    return await service.add_selection(project_id, body)


@router.post("/{project_id}/selections/batch", response_model=list[SelectionResponse], status_code=201)
async def batch_add_selections(project_id: str, body: list[SelectionCreate], service: SelectionService = Depends()):
    return await service.batch_add_selections(project_id, body)


@router.put("/{project_id}/selections/{sel_id}", response_model=SelectionResponse)
async def update_selection(project_id: str, sel_id: str, body: SelectionCreate, service: SelectionService = Depends()):
    sel = await service.update_selection(project_id, sel_id, body)
    if not sel:
        raise HTTPException(status_code=404, detail="Selection not found")
    return sel


@router.delete("/{project_id}/selections/{sel_id}", status_code=204)
async def delete_selection(project_id: str, sel_id: str, service: SelectionService = Depends()):
    await service.delete_selection(project_id, sel_id)


@router.post("/{project_id}/selections/reorder", status_code=204)
async def reorder_selections(project_id: str, body: dict, service: SelectionService = Depends()):
    await service.reorder_selections(project_id, body.get("order", []))
