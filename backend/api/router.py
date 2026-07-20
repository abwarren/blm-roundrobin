"""API Router — mounts all endpoint modules"""

from fastapi import APIRouter

from api.projects import router as projects_router
from api.selections import router as selections_router
from api.combinations import router as combinations_router
from api.systems import router as systems_router
from api.compare import router as compare_router

api_router = APIRouter()
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(selections_router, prefix="/projects", tags=["Selections"])
api_router.include_router(combinations_router, prefix="/projects", tags=["Combinations"])
api_router.include_router(systems_router, prefix="/projects", tags=["Systems"])
api_router.include_router(compare_router, prefix="/compare", tags=["Compare"])
