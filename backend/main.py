import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from scalar_fastapi import get_scalar_api_reference
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.db_manager import close_database, init_database
from backend.core.environment import env_config, get_config
from backend.core.metrics import metrics_collector
from backend.routers.auth_router import router as auth_router
from backend.routers.food_router import router as food_router
from backend.routers.group_router import router as group_router
from backend.routers.meal_router import router as meal_router
from backend.routers.medicine_router import router as medicine_router
from backend.routers.pet_router import router as pet_router
from backend.routers.user_router import router as user_router
from backend.routers.weight_router import router as weight_router

logging.basicConfig(
    level=getattr(logging, get_config("log_level")), format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000.0

        method = request.method
        path = request.url.path
        status_code = response.status_code

        logger.info("%s %s %d %.1fms", method, path, status_code, duration_ms)
        metrics_collector.record_request(method, path, status_code, duration_ms)

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application based on current environment on startup"""
    logger.info(f"🚀 Starting API in {env_config.environment.value} environment")

    # Initialize database connection pool
    try:
        await init_database(env_config.environment.value)
        logger.info("✅ Database connection pool initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise

    yield

    # Close database connections on shutdown
    try:
        await close_database()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {e}")

    logger.info("🛑 Shutting down API")


# Create FastAPI application with environment-aware configuration
app = FastAPI(
    title="PetCare API",
    description="Pet Health Tracker API with user authentication and group collaboration features",
    version="1.0.0",
    debug=get_config("debug"),
    lifespan=lifespan,
)

# Add CORS middleware with environment-specific origins
cors_origins = get_config("cors_origins")
logger.info(f"🌐 Configuring CORS for origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
app.include_router(meal_router)
app.include_router(weight_router)
app.include_router(medicine_router)


# Add Scalar API documentation
@app.get("/scalar", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )


@app.get("/")
async def root():
    return {
        "message": "Welcome to PetCare API!",
        "environment": env_config.environment.value,
        "version": "1.0.0",
        "debug": get_config("debug"),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
