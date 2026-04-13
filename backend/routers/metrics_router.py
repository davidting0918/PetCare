from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.metrics import metrics_collector
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("")
async def get_metrics(current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    return {
        "status": 1,
        "data": {
            "endpoints": metrics_collector.get_request_stats(),
            "db_queries": metrics_collector.get_db_query_stats(),
            "external_calls": metrics_collector.get_external_call_stats(),
            "slow_requests": metrics_collector.get_slow_requests(),
        },
        "message": "ok",
    }
