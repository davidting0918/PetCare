import os
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv("backend/.env")


class MongoAsyncClient:
    def __init__(self, environment: Optional[str] = None):
        """
        Initialize MongoDB async client with environment support

        Args:
            environment (str): Environment name (test, staging, prod).
                              If None, auto-detect from APP_ENV or PYTEST_RUNNING
        """
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

    @classmethod
    def get_instance(cls, environment: Optional[str] = None):
        return cls(environment)

    def reload(self):
        if os.getenv("PYTEST_RUNNING") == "1":
            new_env = "test"
        else:
            new_env = os.getenv("APP_ENV", "prod")

        if new_env != self.environment:
            self.__init__(new_env)

    def list_collections(self):
        """List all collections in the database"""
        return self.db.list_collection_names()

    async def insert_one(self, collection: str, document: dict):
        """Create a single document"""
        collection = self.db[collection]
        result = await collection.insert_one(document)
        return result.inserted_id

    async def insert_many(self, collection: str, documents: list[dict]):
        """Create multiple documents"""
        collection = self.db[collection]
        result = await collection.insert_many(documents)
        return result.inserted_ids

    async def find_one(self, collection: str, filter: dict):
        """Find a single document"""
        collection = self.db[collection]
        document = await collection.find_one(filter)
        if document:
            document.pop("_id", None)
        return document

    async def find_many(self, collection: str, filter: dict = None):
        """Find multiple documents"""
        collection = self.db[collection]
        if filter is None:
            filter = {}
        cursor = collection.find(filter)
        documents = await cursor.to_list(length=None)
        results = []
        for document in documents:
            document.pop("_id", None)
            results.append(document)
        return results

    async def update_one(self, collection: str, filter: dict, update: dict):
        """Update a single document"""
        collection = self.db[collection]
        result = await collection.update_one(filter, {"$set": update})
        return result.modified_count

    async def update_many(self, collection: str, filter: dict, update: dict):
        """Update multiple documents"""
        collection = self.db[collection]
        result = await collection.update_many(filter, {"$set": update})
        return result.modified_count

    async def delete_one(self, collection: str, filter: dict):
        """Delete a single document"""
        collection = self.db[collection]
        result = await collection.delete_one(filter)
        return result.deleted_count

    async def delete_many(self, collection: str, filter: dict):
        """Delete multiple documents"""
        collection = self.db[collection]
        result = await collection.delete_many(filter)
        return result.deleted_count

    async def count_documents(self, collection: str, filter: dict = None):
        """Count documents in collection with optional filter"""
        collection = self.db[collection]
        if filter is None:
            filter = {}
        return await collection.count_documents(filter)

    async def find_with_pagination(
        self, collection: str, filter: dict = None, sort_criteria: list = None, skip: int = 0, limit: int = 20
    ):
        """Find documents with pagination, sorting, and filtering

        Args:
            collection (str): Collection name
            filter (dict): MongoDB filter criteria
            sort_criteria (list): List of tuples [(field, direction), ...] where direction is 1 (asc) or -1 (desc)
            skip (int): Number of documents to skip
            limit (int): Maximum number of documents to return

        Returns:
            list: List of documents with _id removed
        """
        collection = self.db[collection]
        if filter is None:
            filter = {}

        cursor = collection.find(filter)

        # Apply sorting if provided
        if sort_criteria:
            cursor = cursor.sort(sort_criteria)

        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)

        # Execute query and process results
        documents = await cursor.to_list(length=None)
        results = []
        for document in documents:
            document.pop("_id", None)
            results.append(document)
        return results

    async def aggregate(self, collection: str, pipeline: list):
        """Execute aggregation pipeline

        Args:
            collection (str): Collection name
            pipeline (list): MongoDB aggregation pipeline

        Returns:
            list: Aggregation results with _id removed
        """
        collection = self.db[collection]
        cursor = collection.aggregate(pipeline)
        results = []
        async for document in cursor:
            document.pop("_id", None)
            results.append(document)
        return results

    async def close(self):
        """Close the database connection"""
        self.client.close()
