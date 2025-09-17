"""
Test configuration and fixtures for PetCare API tests.

This module provides shared test fixtures, database setup/teardown,
and common test utilities used across all test modules.
"""

import asyncio
import os
import uuid
from datetime import datetime as dt
from typing import AsyncGenerator, Dict

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Set test environment before importing application modules
os.environ["PYTEST_RUNNING"] = "1"
os.environ["APP_ENV"] = "test"

from backend.core.db_manager import DatabaseManager, close_database, get_db, init_database
from backend.main import app
from backend.models.auth import access_token_table, api_key_table
from backend.models.food import food_table
from backend.models.group import group_invitation_table, group_member_table, group_table
from backend.models.pet import pet_table
from backend.models.user import user_table


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_db():
    """
    Provide test database instance with automatic cleanup.

    This fixture creates a test database connection and ensures
    all test tables are cleaned up after the test session.
    """
    # Initialize test database
    await init_database(environment="test")
    db_manager = DatabaseManager()
    db = db_manager.get_client()

    yield db

    # Clean up all test tables
    tables = [
        user_table,
        api_key_table,
        access_token_table,
        group_table,
        group_invitation_table,
        group_member_table,
        pet_table,
        food_table,
    ]

    try:
        for table in tables:
            await db.execute(f"DELETE FROM {table}")
    except Exception as e:
        print(f"Warning: Error cleaning up table {table}: {e}")

    await close_database()


# ================== CLEANUP SYSTEM 1: PER-TEST CLEANING ==================


@pytest_asyncio.fixture
async def clean_db_per_test(test_db):
    """
    SYSTEM 1: Clean database between EACH test function.

    Use this fixture explicitly in test classes that need full isolation:
    - Preserves session-scoped users and API keys
    - Cleans test-specific data (groups, pets, tokens) between each test
    - Provides maximum test isolation but slower performance

    Usage: Add as dependency to test class or individual tests
    """
    # Tables to clean BETWEEN tests (preserve session data)
    test_data_tables = [
        group_table,
        group_invitation_table,
        group_member_table,
        pet_table,
        food_table,
    ]

    # Clean test data before test
    for table in test_data_tables:
        try:
            await test_db.execute(f"DELETE FROM {table}")
        except Exception as e:
            print(f"Warning: Error cleaning table {table}: {e}")

    # Clean expired access tokens (but preserve session tokens)
    try:
        await test_db.execute(
            f"""
            DELETE FROM {access_token_table}
            WHERE expires_at < CURRENT_TIMESTAMP
        """
        )
    except Exception as e:
        print(f"Warning: Error cleaning expired tokens: {e}")

    yield

    # Clean test data after test (same as before)
    for table in test_data_tables:
        try:
            await test_db.execute(f"DELETE FROM {table}")
        except Exception as e:
            print(f"Warning: Error cleaning table {table}: {e}")


@pytest_asyncio.fixture(autouse=True)
async def auto_clean_per_test(request, test_db):
    """
    Auto-apply per-test cleaning for test classes marked with @pytest.mark.clean_per_test

    Usage:
    @pytest.mark.clean_per_test
    class TestSomeFeature:
        # Tests here will auto-clean between each test
    """
    # Check if the test is marked for per-test cleaning
    if request.node.get_closest_marker("clean_per_test"):
        # Apply the same logic as clean_db_per_test
        test_data_tables = [
            group_table,
            group_invitation_table,
            group_member_table,
            pet_table,
            food_table,
        ]

        # Clean test data before test
        for table in test_data_tables:
            try:
                await test_db.execute(f"DELETE FROM {table}")
            except Exception as e:
                print(f"Warning: Error cleaning table {table}: {e}")

        # Clean expired access tokens
        try:
            await test_db.execute(
                f"""
                DELETE FROM {access_token_table}
                WHERE expires_at < CURRENT_TIMESTAMP
            """
            )
        except Exception as e:
            print(f"Warning: Error cleaning expired tokens: {e}")

        yield

        # Clean test data after test
        for table in test_data_tables:
            try:
                await test_db.execute(f"DELETE FROM {table}")
            except Exception as e:
                print(f"Warning: Error cleaning table {table}: {e}")
    else:
        # Just yield without cleaning
        yield


# ================== CLEANUP SYSTEM 2: SESSION-ONLY CLEANING ==================


@pytest_asyncio.fixture(scope="session")
async def clean_db_session_only():
    """
    SYSTEM 2: Clean database ONLY at session start and end.

    Use this for test classes that want to preserve data across tests:
    - Data persists between individual tests within the session
    - Only cleans at the very beginning and end of the test session
    - Faster performance but less test isolation
    - Good for integration tests or related test sequences

    Usage: This runs automatically at session scope
    """
    # Initialize database and clean at session start
    await init_database(environment="test")
    db = get_db()

    session_tables = [
        group_table,
        group_invitation_table,
        group_member_table,
        pet_table,
        food_table,
    ]

    print("🧹 SESSION START: Cleaning test data tables...")
    for table in session_tables:
        try:
            await db.execute(f"DELETE FROM {table}")
            print(f"  ✅ Cleaned {table}")
        except Exception as e:
            print(f"  ⚠️  Error cleaning {table}: {e}")

    yield

    # Clean at session end
    print("🧹 SESSION END: Cleaning test data tables...")
    for table in session_tables:
        try:
            await db.execute(f"DELETE FROM {table}")
            print(f"  ✅ Final cleanup {table}")
        except Exception as e:
            print(f"  ⚠️  Error in final cleanup {table}: {e}")


@pytest_asyncio.fixture(scope="session", autouse=True)
async def cleanup_session_data():
    """
    Clean up ALL data after the entire test session.
    This ensures a completely clean state for the next test run.
    Note: This cleans user/auth data, while clean_db_session_only handles test data.
    """
    yield  # Let all tests run first

    # After all tests complete, clean everything including user data
    await init_database(environment="test")
    db = get_db()
    all_tables = [
        user_table,  # Clean user data at session end
        api_key_table,  # Clean API keys at session end
        access_token_table,  # Clean all tokens at session end
        group_table,  # Final cleanup (also done by clean_db_session_only)
        group_invitation_table,
        group_member_table,
        pet_table,
        food_table,
    ]

    print("🧹 Performing final session cleanup...")
    for table in all_tables:
        try:
            result = await db.execute(f"DELETE FROM {table}")
            print(f"  ✅ Cleaned {table}: {result}")
        except Exception as e:
            print(f"  ⚠️  Error cleaning {table}: {e}")


# ================== USAGE EXAMPLES AND HELPERS ==================

"""
USAGE EXAMPLES:

1. FOR TESTS THAT NEED FULL ISOLATION (each test starts fresh):

   Method A - Using marker:
   @pytest.mark.clean_per_test
   class TestIsolatedFeature:
       def test_something(self, async_client):
           # This test starts with clean DB
           pass

   Method B - Using explicit fixture:
   class TestIsolatedFeature:
       def test_something(self, async_client, clean_db_per_test):
           # This test starts with clean DB
           pass

2. FOR TESTS THAT SHARE DATA ACROSS THE SESSION (faster, data persists):

   class TestIntegratedFeature:  # No marker, uses session-only cleaning
       def test_step1(self, async_client):
           # Create some data
           pass

       def test_step2(self, async_client):
           # Data from test_step1 still exists
           pass

3. MIXED APPROACH:
   - Mark specific test classes that need isolation
   - Leave others unmarked for session-only cleaning
"""


@pytest_asyncio.fixture
async def test_api_key(test_db) -> Dict[str, str]:
    """
    Create and return a test API key for authentication.

    Returns:
        Dict containing api_key, api_secret, and authorization header
    """
    api_key = f"test_key_{str(uuid.uuid4())[:8]}"
    api_secret = f"test_secret_{str(uuid.uuid4())[:8]}"

    # Insert API key into database
    api_key_data = {
        "api_key": api_key,
        "api_secret": api_secret,
        "name": "test_client",
        "created_at": dt.now(),
        "is_active": True,
    }

    await test_db.insert_one(api_key_table, api_key_data)

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
        ]
        for field in required_fields:
            assert field in pet_data, f"Missing required field: {field}"

    @staticmethod
    def assert_food_structure(food_data: dict, detailed: bool = False):
        """
        Assert that food data contains required fields.

        Args:
            food_data: Food data dictionary
            detailed: Whether to check for detailed food info fields
        """
        required_fields = [
            "id",
            "brand",
            "product_name",
            "food_type",
            "target_pet",
            "unit_weight",
            "calories",
            "protein",
            "fat",
            "moisture",
            "carbohydrate",
            "created_at",
            "updated_at",
            "group_id",
            "is_active",
        ]

        if detailed:
            # Additional fields for detailed food info
            required_fields.extend(
                [
                    "group_name",
                    "has_photo",
                    "calories_per_unit",
                    "creator_id",
                    "creator_name",
                ]
            )

        for field in required_fields:
            assert field in food_data, f"Missing required field: {field}"


@pytest.fixture
def test_helper() -> TestHelper:
    """Provide test helper instance."""
    return TestHelper()


# ================== SESSION-SCOPED TEST USERS (PERFORMANCE OPTIMIZED) ==================


@pytest_asyncio.fixture(scope="session")
async def session_api_key() -> Dict[str, str]:
    """
    Create a session-wide API key that persists across all tests.
    This reduces API key creation overhead.
    """

    await init_database(environment="test")
    db = get_db()
    api_key = f"session_key_{str(uuid.uuid4())[:8]}"
    api_secret = f"session_secret_{str(uuid.uuid4())[:8]}"

    api_key_data = {
        "api_key": api_key,
        "api_secret": api_secret,
        "name": "session_test_client",
        "created_at": dt.now(),
        "is_active": True,
    }

    await db.insert_one(api_key_table, api_key_data)
    print(f"✅ Session API key created: {api_key}")

    yield {
        "api_key": api_key,
        "api_secret": api_secret,
        "auth_header": f"{api_key}:{api_secret}",
        "name": "session_test_client",
    }

    # Cleanup after all tests
    try:
        await db.execute(f"DELETE FROM {api_key_table} WHERE api_key = '{api_key}'")
        print(f"🧹 Session API key cleaned up: {api_key}")
    except Exception as e:
        print(f"⚠️  Failed to cleanup session API key: {e}")


@pytest_asyncio.fixture(scope="session")
async def session_users(session_api_key: Dict[str, str]) -> Dict[str, Dict[str, str]]:
    """
    Create session-wide test users that persist across all tests.
    This dramatically improves test performance by avoiding repeated user creation.

    Returns:
        Dict with 'user1' and 'user2' keys containing user info and tokens
    """
    from httpx import AsyncClient

    users_data = [
        {"email": "session.user1@example.com", "name": "Session User 1", "pwd": "TestPassword123!", "key": "user1"},
        {"email": "session.user2@example.com", "name": "Session User 2", "pwd": "TestPassword123!", "key": "user2"},
        {"email": "session.user3@example.com", "name": "Session User 3", "pwd": "TestPassword123!", "key": "user3"},
    ]

    created_users = {}

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        for user_data in users_data:
            print(f"🏗️  Creating session user: {user_data['name']}")

            # Create user
            create_response = await client.post(
                "/user/create",
                headers={
                    "Authorization": f"Bearer {session_api_key['auth_header']}",
                    "Content-Type": "application/json",
                },
                json={"email": user_data["email"], "name": user_data["name"], "pwd": user_data["pwd"]},
            )

            if create_response.status_code != 200:
                print(f"❌ Failed to create user: {create_response.text}")
                continue

            created_user = create_response.json()["data"]

            # Login to get JWT token
            login_response = await client.post(
                "/auth/email/login", json={"email": user_data["email"], "pwd": user_data["pwd"]}
            )

            if login_response.status_code != 200:
                print(f"❌ Failed to login user: {login_response.text}")
                continue

            token_data = login_response.json()["data"]

            created_users[user_data["key"]] = {
                "id": created_user["id"],
                "email": user_data["email"],
                "name": user_data["name"],
                "pwd": user_data["pwd"],
                "access_token": token_data["access_token"],
                "group_id": created_user["personal_group_id"],
            }

            print(f"✅ Session user created: {user_data['name']} (ID: {created_user['id']})")

    yield created_users

    # Cleanup after all tests (optional - database cleanup handles this)
    print("🧹 Session users will be cleaned up by database cleanup")


@pytest_asyncio.fixture(scope="session")
async def session_test_group(
    session_auth_headers_user1, session_auth_headers_user2, session_auth_headers_user3, session_user3
):
    """user1 creates a group for pet sharing, user2 join as member, user3 join as viewer"""

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        group_response = await client.post(
            "/groups/create", headers=session_auth_headers_user1, json={"name": "Pet Care Team"}
        )
        assert group_response.status_code == 200
        group_id = group_response.json()["data"]["id"]

        invite_response = await client.post(f"/groups/{group_id}/invite", headers=session_auth_headers_user1)
        assert invite_response.status_code == 200
        invite_code = invite_response.json()["data"]["invite_code"]

        join_response = await client.post(
            "/groups/join", headers=session_auth_headers_user2, json={"invite_code": invite_code}
        )
        assert join_response.status_code == 200

        invite_response = await client.post(f"/groups/{group_id}/invite", headers=session_auth_headers_user1)
        assert invite_response.status_code == 200
        invite_code = invite_response.json()["data"]["invite_code"]

        join_response = await client.post(
            "/groups/join", headers=session_auth_headers_user3, json={"invite_code": invite_code}
        )
        assert join_response.status_code == 200

        # update user3 to viewer
        update_response = await client.post(
            f"/groups/{group_id}/update_role",
            headers=session_auth_headers_user1,
            json={"user_id": session_user3["id"], "new_role": "viewer"},
        )
        assert update_response.status_code == 200
        return group_id


@pytest_asyncio.fixture(scope="session")
async def session_user1(session_users: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    """Get session user 1 info"""
    return session_users["user1"]


@pytest_asyncio.fixture(scope="session")
async def session_user2(session_users: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    """Get session user 2 info"""
    return session_users["user2"]


@pytest_asyncio.fixture(scope="session")
async def session_user3(session_users: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    """Get session user 3 info"""
    return session_users["user3"]


@pytest_asyncio.fixture(scope="session")
async def session_auth_headers_user1(session_user1: Dict[str, str]) -> Dict[str, str]:
    """Get auth headers for session user 1"""
    return {"Authorization": f"Bearer {session_user1['access_token']}", "Content-Type": "application/json"}


@pytest_asyncio.fixture(scope="session")
async def session_auth_headers_user2(session_user2: Dict[str, str]) -> Dict[str, str]:
    """Get auth headers for session user 2"""
    return {"Authorization": f"Bearer {session_user2['access_token']}", "Content-Type": "application/json"}


@pytest_asyncio.fixture(scope="session")
async def session_auth_headers_user3(session_user3: Dict[str, str]) -> Dict[str, str]:
    """Get auth headers for session user 3"""
    return {"Authorization": f"Bearer {session_user3['access_token']}", "Content-Type": "application/json"}


@pytest_asyncio.fixture
async def test_user1(session_user1: Dict[str, str]) -> Dict[str, str]:
    """DEPRECATED: Use session_user1 for better performance"""
    return session_user1


@pytest_asyncio.fixture
async def test_user2(session_user2: Dict[str, str]) -> Dict[str, str]:
    """DEPRECATED: Use session_user2 for better performance"""
    return session_user2
