from typing import List, Optional

from pydantic import BaseModel


class EndpointStats(BaseModel):
    method: str
    path: str
    count: int
    avg_ms: float
    p50_ms: float
    p95_ms: float
    max_ms: float


class DbQueryStats(BaseModel):
    operation: str
    count: int
    avg_ms: float
    p50_ms: float
    p95_ms: float
    max_ms: float


class ExternalCallStats(BaseModel):
    service: str
    count: int
    avg_ms: float
    p50_ms: float
    p95_ms: float
    max_ms: float


class SlowRequestEntry(BaseModel):
    method: str
    path: str
    duration_ms: float
    timestamp: str


class MetricsData(BaseModel):
    endpoints: List[EndpointStats]
    db_queries: List[DbQueryStats]
    external_calls: List[ExternalCallStats]
    slow_requests: List[SlowRequestEntry]
