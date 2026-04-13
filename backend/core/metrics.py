"""
In-memory metrics collector for API performance monitoring.

Collects request timing, DB query timing, and external call timing using
thread-safe deques. Each metric category stores the most recent N entries
(configurable via ``maxlen``, default 500). Percentile computation is
on-demand — no background threads.

Usage::

    from backend.core.metrics import metrics_collector

    # Record a timing
    metrics_collector.record_request("GET", "/user/me", 200, 12.3)
    metrics_collector.record_db_query("read_one", 3.2)
    metrics_collector.record_external_call("cloudinary", 1200.5)

    # Read stats
    stats = metrics_collector.get_request_stats()
"""

import logging
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Slow-request thresholds (ms)
SLOW_REQUEST_THRESHOLD_MS = 1000.0
SLOW_DB_QUERY_THRESHOLD_MS = 500.0
SLOW_EXTERNAL_CALL_THRESHOLD_MS = 5000.0

DEFAULT_MAXLEN = 500


@dataclass
class SlowRequestEntry:
    method: str
    path: str
    duration_ms: float
    timestamp: str


def _percentile(sorted_data: List[float], p: float) -> float:
    """Compute the p-th percentile from a pre-sorted list."""
    if not sorted_data:
        return 0.0
    k = (len(sorted_data) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1
    if c >= len(sorted_data):
        return sorted_data[f]
    return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


class MetricsCollector:
    """Thread-safe in-memory metrics collector."""

    def __init__(self, maxlen: int = DEFAULT_MAXLEN):
        self._maxlen = maxlen
        self._lock = threading.Lock()

        # request timings: key = (method, path) -> deque of durations (ms)
        self._requests: Dict[tuple, deque] = defaultdict(lambda: deque(maxlen=self._maxlen))

        # DB query timings: key = operation name -> deque of durations (ms)
        self._db_queries: Dict[str, deque] = defaultdict(lambda: deque(maxlen=self._maxlen))

        # External call timings: key = service name -> deque of durations (ms)
        self._external_calls: Dict[str, deque] = defaultdict(lambda: deque(maxlen=self._maxlen))

        # Slow requests log (capped)
        self._slow_requests: deque = deque(maxlen=self._maxlen)

    def record_request(self, method: str, path: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self._requests[(method, path)].append(duration_ms)
            if duration_ms >= SLOW_REQUEST_THRESHOLD_MS:
                from datetime import datetime, timezone

                self._slow_requests.append(
                    SlowRequestEntry(
                        method=method,
                        path=path,
                        duration_ms=round(duration_ms, 2),
                        timestamp=datetime.now(timezone.utc).isoformat(),
                    )
                )
                logger.warning(
                    "SLOW REQUEST: %s %s %d %.1fms (threshold: %.0fms)",
                    method,
                    path,
                    status_code,
                    duration_ms,
                    SLOW_REQUEST_THRESHOLD_MS,
                )

    def record_db_query(self, operation: str, duration_ms: float) -> None:
        with self._lock:
            self._db_queries[operation].append(duration_ms)
        if duration_ms >= SLOW_DB_QUERY_THRESHOLD_MS:
            logger.warning(
                "SLOW QUERY: %s %.1fms (threshold: %.0fms)",
                operation,
                duration_ms,
                SLOW_DB_QUERY_THRESHOLD_MS,
            )

    def record_external_call(self, service: str, duration_ms: float) -> None:
        with self._lock:
            self._external_calls[service].append(duration_ms)
        if duration_ms >= SLOW_EXTERNAL_CALL_THRESHOLD_MS:
            logger.warning(
                "SLOW EXTERNAL CALL: %s %.1fms (threshold: %.0fms)",
                service,
                duration_ms,
                SLOW_EXTERNAL_CALL_THRESHOLD_MS,
            )

    def _compute_stats(self, timings: deque) -> Dict[str, Any]:
        data = list(timings)
        if not data:
            return {"count": 0, "avg_ms": 0.0, "p50_ms": 0.0, "p95_ms": 0.0, "max_ms": 0.0}
        sorted_data = sorted(data)
        return {
            "count": len(data),
            "avg_ms": round(sum(data) / len(data), 2),
            "p50_ms": round(_percentile(sorted_data, 50), 2),
            "p95_ms": round(_percentile(sorted_data, 95), 2),
            "max_ms": round(max(data), 2),
        }

    def get_request_stats(self) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._requests.items())
        results = []
        for (method, path), timings in items:
            stats = self._compute_stats(timings)
            stats["method"] = method
            stats["path"] = path
            results.append(stats)
        results.sort(key=lambda x: x["p95_ms"], reverse=True)
        return results

    def get_db_query_stats(self) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._db_queries.items())
        results = []
        for operation, timings in items:
            stats = self._compute_stats(timings)
            stats["operation"] = operation
            results.append(stats)
        results.sort(key=lambda x: x["p95_ms"], reverse=True)
        return results

    def get_external_call_stats(self) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._external_calls.items())
        results = []
        for service, timings in items:
            stats = self._compute_stats(timings)
            stats["service"] = service
            results.append(stats)
        results.sort(key=lambda x: x["p95_ms"], reverse=True)
        return results

    def get_slow_requests(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [
                {
                    "method": entry.method,
                    "path": entry.path,
                    "duration_ms": entry.duration_ms,
                    "timestamp": entry.timestamp,
                }
                for entry in self._slow_requests
            ]


# Module-level singleton
metrics_collector = MetricsCollector()
