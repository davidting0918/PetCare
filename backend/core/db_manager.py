"""Process-wide singleton holding the PostgresAsyncClient.

`init_database(dsn)` is called once from the FastAPI lifespan startup;
services call `get_db()` lazily so the pool is in place by request time.
"""

from backend.core.postgres_database import PostgresAsyncClient


class DatabaseManager:
    _instance: "DatabaseManager | None" = None
    _client: PostgresAsyncClient | None = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self, dsn: str) -> None:
        if self._client is None:
            self._client = PostgresAsyncClient(dsn)
            await self._client.init_pool()

    def get_client(self) -> PostgresAsyncClient:
        if self._client is None:
            raise RuntimeError("Database not initialized — call init_database() first")
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None


db_manager = DatabaseManager()


def get_db() -> PostgresAsyncClient:
    return db_manager.get_client()


async def init_database(dsn: str) -> None:
    await db_manager.initialize(dsn)


async def close_database() -> None:
    await db_manager.close()
