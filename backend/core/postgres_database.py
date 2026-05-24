"""Thin async wrapper around an asyncpg connection pool.

All query helpers take `$1, $2, ...` placeholders — never f-string interpolate
user-supplied values. NUMERIC columns come back from asyncpg as `Decimal`;
`_convert_decimals_to_floats` flattens those to `float` so Pydantic models
serialize cleanly into the JSON shapes the iOS client expects.
"""

import logging
from contextlib import asynccontextmanager
from decimal import Decimal
from typing import Any

import asyncpg
from asyncpg import Pool

logger = logging.getLogger(__name__)


class PostgresAsyncClient:
    def __init__(self, dsn: str):
        self._dsn = dsn
        self._pool: Pool | None = None

    async def init_pool(self) -> None:
        if self._pool is not None:
            return
        self._pool = await asyncpg.create_pool(
            self._dsn,
            min_size=1,
            max_size=20,
            command_timeout=60,
        )

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def get_connection(self):
        if self._pool is None:
            raise RuntimeError("Pool not initialized — call init_pool() first")
        async with self._pool.acquire() as conn:
            yield conn

    # ───── conversion ─────

    def _convert_decimals_to_floats(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, dict):
            return {k: self._convert_decimals_to_floats(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._convert_decimals_to_floats(v) for v in obj]
        if isinstance(obj, tuple):
            return tuple(self._convert_decimals_to_floats(v) for v in obj)
        return obj

    # ───── query helpers ─────

    async def read(self, query: str, *args: Any) -> list[dict]:
        async with self.get_connection() as conn:
            rows = await conn.fetch(query, *args)
            return self._convert_decimals_to_floats([dict(r) for r in rows])

    async def read_one(self, query: str, *args: Any) -> dict | None:
        async with self.get_connection() as conn:
            row = await conn.fetchrow(query, *args)
            if row is None:
                return None
            return self._convert_decimals_to_floats(dict(row))

    async def insert_one(self, table: str, data: dict) -> Any:
        cols = list(data.keys())
        placeholders = [f"${i}" for i in range(1, len(cols) + 1)]
        query = (
            f"INSERT INTO {table} ({', '.join(cols)}) "
            f"VALUES ({', '.join(placeholders)}) "
            f"RETURNING *"
        )
        async with self.get_connection() as conn:
            row = await conn.fetchrow(query, *data.values())
            result = self._convert_decimals_to_floats(dict(row))
            return result.get("id", result)

    async def insert(self, table: str, data: list[dict]) -> list:
        if not data:
            return []
        cols = list(data[0].keys())
        n = len(cols)
        value_groups: list[str] = []
        values: list[Any] = []
        for i, record in enumerate(data):
            if set(record.keys()) != set(cols):
                raise ValueError(
                    f"All records must share the same columns; "
                    f"expected {cols}, got {list(record.keys())}"
                )
            placeholders = [f"${j + i * n + 1}" for j in range(n)]
            value_groups.append(f"({', '.join(placeholders)})")
            for c in cols:
                values.append(record[c])
        query = (
            f"INSERT INTO {table} ({', '.join(cols)}) "
            f"VALUES {', '.join(value_groups)} "
            f"RETURNING *"
        )
        async with self.get_connection() as conn:
            rows = await conn.fetch(query, *values)
            results = self._convert_decimals_to_floats([dict(r) for r in rows])
            if results and "id" in results[0]:
                return [r["id"] for r in results]
            return results

    async def execute(self, query: str, *args: Any) -> str:
        async with self.get_connection() as conn:
            return await conn.execute(query, *args)

    async def execute_returning(self, query: str, *args: Any) -> dict | None:
        async with self.get_connection() as conn:
            row = await conn.fetchrow(query, *args)
            if row is None:
                return None
            return self._convert_decimals_to_floats(dict(row))
