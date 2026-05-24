"""PetCare backend entrypoint.

  uvicorn backend.main:app --reload
"""

import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.config import settings, validate_auth_settings
from backend.core.db_manager import close_database, init_database

from backend.routers.auth_router import router as auth_router
from backend.routers.food_router import router as food_router
from backend.routers.group_router import router as group_router
from backend.routers.meal_router import router as meal_router
from backend.routers.medicine_router import router as medicine_router
from backend.routers.pet_router import router as pet_router
from backend.routers.user_router import router as user_router
from backend.routers.weight_router import router as weight_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000.0
        logger.info(
            "%s %s %d %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🐾 Starting PetCare backend")
    validate_auth_settings(settings)
    await init_database(settings.postgres_uri)
    try:
        yield
    finally:
        logger.info("🛑 Shutting down PetCare backend")
        await close_database()


app = FastAPI(
    title="PetCare API",
    description="Collaborative pet health tracker backend for the PetCare iOS app.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TimingMiddleware)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(group_router)
app.include_router(pet_router)
app.include_router(food_router)
app.include_router(weight_router)
app.include_router(meal_router)
app.include_router(medicine_router)
# app.include_router(food_router)
# app.include_router(meal_router)
# app.include_router(weight_router)
# app.include_router(medicine_router)


@app.get("/")
async def root() -> dict:
    return {"name": "PetCare API", "tagline": "Care for them, together.", "version": "0.2.0"}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port)
