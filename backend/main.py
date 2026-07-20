"""BLM Round Robin — FastAPI Application Entry"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8420"))
ENV = os.environ.get("BLM_ENV", "development")


def create_app() -> FastAPI:
    app = FastAPI(
        title="BLM Round Robin API",
        version="0.1.0",
        description="Combinatorial betting engine — System bet generator for PokerBet overlay",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ───────────────────────────────────────
    from api.router import api_router
    app.include_router(api_router, prefix="/api/v1")

    # ── Health ───────────────────────────────────────
    @app.get("/health")
    async def health():
        return {"status": "ok", "version": "0.1.0", "service": "blm-roundrobin"}

    return app


def main() -> None:
    app = create_app()
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        reload=ENV == "development",
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
