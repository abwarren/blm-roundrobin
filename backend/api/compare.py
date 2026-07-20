"""Comparison endpoint — compare multiple system configurations"""

from fastapi import APIRouter, Depends
from services.comparison_service import ComparisonService

router = APIRouter()


@router.post("/", response_model=dict)
async def compare_systems(body: dict, service: ComparisonService = Depends()):
    """
    Compare multiple system configurations.
    Body: { "systems": ["sys_id_1", "sys_id_2", ...] }
    """
    return await service.compare(body.get("systems", []))
