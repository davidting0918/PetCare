import os
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("backend/.env")

class MongoAsyncClient:
    def __init__(self, environment: Optional[str] = None):
        if environment is None:
            if os.getenv("PYTEST_RUNNING") == "1":
                environment = "test"
            else:
                environment = os.getenv("APP_ENV", "prod")

        self.environment = environment
        self.db_url = os.getenv("MONGO_URL")

        if environment == "test":
            self.db_name = os.getenv("MONGO_TEST_DB_NAME")
        elif environment == "staging":
            self.db_name = os.getenv("MONGO_STAGING_DB_NAME")
        else:  # prod
            self.db_name = os.getenv("MONGO_PROD_DB_NAME")

        self.client = AsyncIOMotorClient(self.db_url)
        self.db = self.client[self.db_name]

    async def insert_one(self, collection: str, document: dict):
        collection = self.db[collection]
        result = await collection.insert_one(document)
        return result.inserted_id

    async def find_one(self, collection: str, filter: dict):
        collection = self.db[collection]
        document = await collection.find_one(filter)
        if document:
            document.pop("_id", None)
        return document

    async def update_one(self, collection: str, filter: dict, update: dict):
        collection = self.db[collection]
        result = await collection.update_one(filter, {"$set": update})
        return result.modified_count

    async def close(self):
        self.client.close()