"""
PetCare API Test Suite

This package contains comprehensive tests for all PetCare API endpoints.

Test Organization:
- conftest.py: Shared fixtures and test configuration
- test_user_endpoints.py: User creation, authentication, and profile tests
- test_auth_endpoints.py: Authentication and authorization tests
- test_group_endpoints.py: Group management and collaboration tests
- test_pet_endpoints.py: Pet management tests
- test_food_endpoints.py: Food and nutrition tests

Test Database:
Tests use a separate MongoDB database (configured via MONGO_TEST_DB_NAME)
with automatic cleanup between test runs.
"""

__version__ = "1.0.0"
