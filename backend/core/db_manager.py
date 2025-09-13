"""
Database Connection Manager
統一管理數據庫連接池的初始化和銷毀
"""

import os
from typing import Optional

from backend.core.postgres_database import PostgresAsyncClient


class DatabaseManager:
    """數據庫連接管理器 - 單例模式"""

    _instance: Optional["DatabaseManager"] = None
    _db_client: Optional[PostgresAsyncClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self, environment: Optional[str] = None):
        """初始化數據庫連接池"""
        if self._db_client is None:
            self._db_client = PostgresAsyncClient(environment)
            await self._db_client.init_pool()

    def get_client(self) -> PostgresAsyncClient:
        """獲取數據庫客戶端實例"""
        if self._db_client is None:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._db_client

    async def close(self):
        """關閉數據庫連接"""
        if self._db_client:
            await self._db_client.close()
            self._db_client = None


# 全局實例
db_manager = DatabaseManager()


# 便捷函數
def get_db() -> PostgresAsyncClient:
    """獲取數據庫客戶端的便捷函數"""
    return db_manager.get_client()


async def init_database(environment: Optional[str] = None):
    """初始化數據庫連接的便捷函數"""
    await db_manager.initialize(environment)


async def close_database():
    """關閉數據庫連接的便捷函數"""
    await db_manager.close()
