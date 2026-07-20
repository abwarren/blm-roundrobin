"""Combination generation endpoints"""

from fastapi import APIRouter, Depends
from schemas.combination import GenerateRequest, GenerateResponse
from services.combination_service import CombinationService

router = APIRouter()


@router.post("/{project_id}/combinations/generate", response_model=GenerateResponse)
async def generate_combinations(project_id: str, body: GenerateRequest, service: CombinationService = Depends()):
    return await service.generate(project_id, body)


@router.get("/{project_id}/combinations/{hash}", response_model=GenerateResponse)
async def get_cached_combinations(project_id: str, hash: str, service: CombinationService = Depends()):
    return await service.get_cached(project_id, hash)


@router.post("/{project_id}/combinations/scenario", response_model=dict)
async def run_scenario(project_id: str, body: dict, service: CombinationService = Depends()):
    return await service.run_scenario(project_id, body)


@router.post("/{project_id}/combinations/optimise", response_model=dict)
async def optimise_combinations(project_id: str, body: dict, service: CombinationService = Depends()):
    return await service.optimise(project_id, body)
