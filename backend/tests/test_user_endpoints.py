"""
Integration tests for user endpoints.

This module contains comprehensive integration tests for user-related
API endpoints including user creation and authentication flows.
"""

import pytest
from fastapi import status
from httpx import AsyncClient

from backend.core.database import MongoAsyncClient
from backend.models.auth import access_token_collection
from backend.models.user import user_collection


class TestUserEndpointsIntegration:
    """Integration tests for user endpoints."""

    @pytest.mark.asyncio
    async def test_create_user_and_login_flow(
        self,
        async_client: AsyncClient,
        test_db: MongoAsyncClient,
        authenticated_headers: dict,
        test_user_data: dict,
        test_helper,
    ):
        """
        Complete integration test: Create user and then login.

        This test verifies the complete user lifecycle:
        1. Create user with API key authentication
        2. Login with email/password authentication
        3. Verify user data consistency
        """

        # Step 1: Create user
        create_response = await async_client.post("/user/create", json=test_user_data, headers=authenticated_headers)

        # Verify user creation response
        assert create_response.status_code == status.HTTP_200_OK
        create_data = create_response.json()

        test_helper.assert_response_structure(create_data, expected_status=1)
        assert create_data["message"] == "User registered successfully"

        # Verify created user data structure
        user_data = create_data["data"]
        test_helper.assert_user_structure(user_data)

        # Verify user data matches input
        assert user_data["email"] == test_user_data["email"]
        assert user_data["name"] == test_user_data["name"]
        assert user_data["source"] == "test_client"  # From API key name
        assert user_data["is_active"] is True
        assert user_data["is_verified"] is True

        # Verify user exists in database
        db_user = await test_db.find_one(user_collection, {"email": test_user_data["email"]})
        assert db_user is not None
        assert db_user["id"] == user_data["id"]

        # Step 2: Login with created user
        login_data = {"email": test_user_data["email"], "pwd": test_user_data["pwd"]}

        login_response = await async_client.post("/auth/email/login", json=login_data)

        # Verify login response
        assert login_response.status_code == status.HTTP_200_OK
        login_response_data = login_response.json()

        test_helper.assert_response_structure(login_response_data, expected_status=1)
        assert login_response_data["message"] == "Email login successful"

        # Verify login response data structure
        login_data_response = login_response_data["data"]
        assert "access_token" in login_data_response
        assert "token_type" in login_data_response
        assert "user" in login_data_response

        assert login_data_response["token_type"] == "bearer"

        # Verify user data in login response
        login_user_data = login_data_response["user"]
        assert login_user_data["id"] == user_data["id"]
        assert login_user_data["email"] == test_user_data["email"]
        assert login_user_data["name"] == test_user_data["name"]

        # Step 3: Verify token was created in database
        access_token = login_data_response["access_token"]
        assert access_token is not None
        assert len(access_token) > 20  # JWT tokens are much longer

        # Verify token exists in database
        db_token = await test_db.find_one(access_token_collection, {"user_id": user_data["id"]})
        assert db_token is not None
        assert db_token["is_active"] is True

        print(f"✅ Successfully created user {user_data['id']} and authenticated")

    @pytest.mark.asyncio
    async def test_create_user_without_api_key_fails(self, async_client: AsyncClient, test_user_data: dict):
        """
        Test that user creation fails without API key authentication.
        """

        # Attempt to create user without API key
        response = await async_client.post("/user/create", json=test_user_data)

        # Should fail with 401 Unauthorized
        assert response.status_code == status.HTTP_403_FORBIDDEN
        error_data = response.json()
        assert "Not authenticated" in error_data["detail"]

    @pytest.mark.asyncio
    async def test_create_user_with_invalid_api_key_fails(self, async_client: AsyncClient, test_user_data: dict):
        """
        Test that user creation fails with invalid API key.
        """

        invalid_headers = {"Authorization": "Bearer invalid_key:invalid_secret", "Content-Type": "application/json"}

        response = await async_client.post("/user/create", json=test_user_data, headers=invalid_headers)

        # Should fail with 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        error_data = response.json()
        assert "Invalid API key" in error_data["detail"]

    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials_fails(self, async_client: AsyncClient):
        """
        Test that login fails with invalid credentials.
        """

        invalid_login_data = {"email": "nonexistent@example.com", "pwd": "wrongpassword"}

        response = await async_client.post("/auth/email/login", json=invalid_login_data)

        # Should fail with 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        error_data = response.json()
        assert "Incorrect email or password" in error_data["detail"]

    @pytest.mark.asyncio
    async def test_create_duplicate_user_fails(
        self, async_client: AsyncClient, authenticated_headers: dict, test_user_data: dict
    ):
        """
        Test that creating a user with existing email fails.
        """

        # Create first user
        first_response = await async_client.post("/user/create", json=test_user_data, headers=authenticated_headers)
        assert first_response.status_code == status.HTTP_200_OK

        # Attempt to create user with same email
        duplicate_response = await async_client.post("/user/create", json=test_user_data, headers=authenticated_headers)

        # Should fail with 400 Bad Request
        assert duplicate_response.status_code == status.HTTP_400_BAD_REQUEST
        error_data = duplicate_response.json()
        assert "User already exists" in error_data["detail"]

    @pytest.mark.asyncio
    async def test_database_cleanup_between_tests(self, test_db: MongoAsyncClient):
        """
        Verify that database is properly cleaned between tests.

        This test should run with a clean database state.
        """

        # Verify all test collections are empty
        user_count = await test_db.count_documents(user_collection)
        token_count = await test_db.count_documents(access_token_collection)

        assert user_count == 0, f"Expected 0 users, found {user_count}"
        assert token_count == 0, f"Expected 0 tokens, found {token_count}"

        print("✅ Database cleanup verification passed")
