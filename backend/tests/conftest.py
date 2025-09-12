"""
Test configuration and fixtures for PetCare API tests.

This module provides shared test fixtures, database setup/teardown,
and common test utilities used across all test modules.
"""

import asyncio
import os
import uuid
from datetime import datetime as dt
from datetime import timezone as tz
from typing import AsyncGenerator, Dict

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Set test environment before importing application modules
os.environ["PYTEST_RUNNING"] = "1"
os.environ["APP_ENV"] = "test"

from backend.core.database import MongoAsyncClient
from backend.main import app
from backend.models.auth import access_token_collection, api_key_collection
from backend.models.group import group_collection, group_invitation_collection, group_member_collection
from backend.models.pet import pet_collection, pet_photo_collection
from backend.models.user import user_collection


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_db() -> AsyncGenerator[MongoAsyncClient, None]:
    """
    Provide test database instance with automatic cleanup.

    This fixture creates a test database connection and ensures
    all test collections are cleaned up after the test session.
    """
    # Create test database instance
    db = MongoAsyncClient(environment="test")

    yield db

    collections = [
        user_collection,
        api_key_collection,
        access_token_collection,
        group_collection,
        group_invitation_collection,
        group_member_collection,
        pet_collection,
        pet_photo_collection,
    ]
    for collection in collections:
        await db.delete_many(collection, {})

    await db.close()


@pytest_asyncio.fixture(autouse=True)
async def clean_db(test_db: MongoAsyncClient):
    """
    Automatically clean database before and after each test.

    This fixture ensures each test starts with a clean database state
    and cleans up after the test completes.
    """
    # Clean before test
    collections = [
        user_collection,
        api_key_collection,
        access_token_collection,
        group_collection,
        group_invitation_collection,
        group_member_collection,
        pet_collection,
        pet_photo_collection,
    ]
    for collection in collections:
        await test_db.delete_many(collection, {})

    yield

    # Clean after test
    collections = [
        user_collection,
        api_key_collection,
        access_token_collection,
        group_collection,
        group_invitation_collection,
        group_member_collection,
        pet_collection,
        pet_photo_collection,
    ]
    for collection in collections:
        await test_db.delete_many(collection, {})


@pytest_asyncio.fixture
async def test_api_key(test_db: MongoAsyncClient) -> Dict[str, str]:
    """
    Create and return a test API key for authentication.

    Returns:
        Dict containing api_key, api_secret, and authorization header
    """
    api_key = f"test_key_{str(uuid.uuid4())[:8]}"
    api_secret = f"test_secret_{str(uuid.uuid4())[:8]}"

    # Insert API key into database
    api_key_doc = {
        "api_key": api_key,
        "api_secret": api_secret,
        "name": "test_client",
        "created_at": int(dt.now(tz.utc).timestamp()),
        "is_active": True,
    }

    await test_db.insert_one(api_key_collection, api_key_doc)

    # Return key information for use in tests
    return {
        "api_key": api_key,
        "api_secret": api_secret,
        "auth_header": f"{api_key}:{api_secret}",
        "name": "test_client",
    }


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provide async HTTP client for testing API endpoints.

    This fixture creates an AsyncClient instance configured
    to work with the FastAPI test application.
    """
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def sync_client() -> TestClient:
    """
    Provide synchronous HTTP client for simple tests.

    Use this for basic endpoint tests that don't require
    complex async operations.
    """
    return TestClient(app)


@pytest_asyncio.fixture
async def test_user_data() -> Dict[str, str]:
    """
    Provide test user data for user creation tests.

    Returns:
        Dict containing user registration information
    """
    return {
        "email": f"test_{str(uuid.uuid4())[:8]}@example.com",
        "name": f"Test User {str(uuid.uuid4())[:8]}",
        "pwd": "TestPassword123!",
    }


@pytest_asyncio.fixture
async def authenticated_headers(test_api_key: Dict[str, str]) -> Dict[str, str]:
    """
    Provide headers with API key authentication.

    Args:
        test_api_key: API key fixture

    Returns:
        Dict containing Authorization header for API requests
    """
    return {"Authorization": f"Bearer {test_api_key['auth_header']}", "Content-Type": "application/json"}


# Test utilities
class TestHelper:
    """Helper class containing common test utilities."""

    @staticmethod
    def assert_response_structure(response_data: dict, expected_status: int = 1):
        """
        Assert that response follows expected API structure.

        Args:
            response_data: Response JSON data
            expected_status: Expected status code (default: 1 for success)
        """
        assert "status" in response_data
        assert "message" in response_data
        assert response_data["status"] == expected_status

        if expected_status == 1:
            assert "data" in response_data

    @staticmethod
    def assert_user_structure(user_data: dict):
        """
        Assert that user data contains required fields.

        Args:
            user_data: User data dictionary
        """
        required_fields = [
            "id",
            "email",
            "name",
            "created_at",
            "updated_at",
            "is_active",
            "source",
            "personal_group_id",
        ]
        for field in required_fields:
            assert field in user_data, f"Missing required field: {field}"

    @staticmethod
    def assert_group_structure(group_data: dict):
        """
        Assert that group data contains required fields.

        Args:
            group_data: Group data dictionary
        """
        required_fields = [
            "id",
            "name",
            "creator_id",
            "created_at",
            "updated_at",
            "member_count",
            "is_creator",
            "is_active",
        ]
        for field in required_fields:
            assert field in group_data, f"Missing required field: {field}"

    @staticmethod
    def assert_pet_structure(pet_data: dict):
        """
        Assert that pet data contains required fields.

        Args:
            pet_data: Pet data dictionary
        """
        required_fields = [
            "id",
            "name",
            "pet_type",
            "owner_id",
            "created_at",
            "updated_at",
            "is_active",
            "is_owned_by_user",
        ]
        for field in required_fields:
            assert field in pet_data, f"Missing required field: {field}"


@pytest.fixture
def test_helper() -> TestHelper:
    """Provide test helper instance."""
    return TestHelper()


# User Authentication Fixtures for Group Testing
@pytest_asyncio.fixture
async def test_user1(test_api_key: Dict[str, str], async_client: AsyncClient) -> Dict[str, str]:
    """Create test user 1 and return user info with JWT token"""
    user_data = {"email": "testuser1@example.com", "name": "Test User 1", "pwd": "TestPassword123!"}

    # Create user
    create_response = await async_client.post(
        "/user/create",
        headers={"Authorization": f"Bearer {test_api_key['auth_header']}", "Content-Type": "application/json"},
        json=user_data,
    )
    assert create_response.status_code == 200
    created_user = create_response.json()["data"]

    # Login to get JWT token
    login_response = await async_client.post(
        "/auth/email/login", json={"email": user_data["email"], "pwd": user_data["pwd"]}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()["data"]

    return {
        "id": created_user["id"],
        "email": user_data["email"],
        "name": user_data["name"],
        "access_token": token_data["access_token"],
    }


@pytest_asyncio.fixture
async def test_user2(test_api_key: Dict[str, str], async_client: AsyncClient) -> Dict[str, str]:
    """Create test user 2 and return user info with JWT token"""
    user_data = {"email": "testuser2@example.com", "name": "Test User 2", "pwd": "TestPassword123!"}

    # Create user
    create_response = await async_client.post(
        "/user/create",
        headers={"Authorization": f"Bearer {test_api_key['auth_header']}", "Content-Type": "application/json"},
        json=user_data,
    )
    assert create_response.status_code == 200
    created_user = create_response.json()["data"]

    # Login to get JWT token
    login_response = await async_client.post(
        "/auth/email/login", json={"email": user_data["email"], "pwd": user_data["pwd"]}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()["data"]

    return {
        "id": created_user["id"],
        "email": user_data["email"],
        "name": user_data["name"],
        "access_token": token_data["access_token"],
    }


@pytest_asyncio.fixture
async def auth_headers_user1(test_user1: Dict[str, str]) -> Dict[str, str]:
    """Provide authenticated headers for test user 1"""
    return {"Authorization": f"Bearer {test_user1['access_token']}", "Content-Type": "application/json"}


@pytest_asyncio.fixture
async def auth_headers_user2(test_user2: Dict[str, str]) -> Dict[str, str]:
    """Provide authenticated headers for test user 2"""
    return {"Authorization": f"Bearer {test_user2['access_token']}", "Content-Type": "application/json"}
