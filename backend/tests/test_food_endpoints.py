"""
Food Endpoint Tests

Comprehensive tests for food management functionality including:
- CRUD operations (create, read, update, delete)
- Group-based permissions (creator, member, viewer)
- Data validation and error handling
- Search and filtering functionality
- Photo management (when implemented)

The food system follows group-based architecture where each group
maintains its own independent food database with role-based access control.
"""

import pytest
from httpx import AsyncClient


class TestFoodBasicOperations:
    """
    Test basic food operations using session-level data persistence,
    the tests here all based on personal group
    """

    FOOD_DATA = {
        "food1": {
            "brand": "Royal Canin Test",
            "product_name": "Adult Dog Food Basic",
            "food_type": "dry_food",
            "target_pet": "dog",
            "unit_weight": 100.0,
            "calories": 350.0,
            "protein": 25.0,
            "fat": 12.0,
            "moisture": 10.0,
            "carbohydrate": 45.0,
        },
        "food2": {
            "brand": "Brand 2",
            "product_name": "Product 2",
            "food_type": "wet_food",
            "target_pet": "cat",
            "unit_weight": 85.0,
            "calories": 380.0,
            "protein": 40.0,
            "fat": 12.0,
            "moisture": 25.0,
            "carbohydrate": 20.0,
        },
        "food3": {
            "brand": "Brand 3",
            "product_name": "Product 3",
            "food_type": "wet_food",
            "target_pet": "cat",
            "unit_weight": 85.0,
            "calories": 380.0,
            "protein": 40.0,
            "fat": 12.0,
            "moisture": 25.0,
            "carbohydrate": 20.0,
        },
        "update_food1": {
            "brand": "Updated Brand",
            "product_name": "Updated Product",
            "food_type": "wet_food",
            "target_pet": "cat",
            "unit_weight": 85.0,
            "calories": 380.0,
            "protein": 40.0,
            "fat": 12.0,
            "moisture": 25.0,
            "carbohydrate": 20.0,
        },
    }

    FOOD_ID = {
        "food1": "",
    }

    @pytest.mark.asyncio
    async def test_create_food_success(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test creating a new food item successfully"""
        # Use unique names to avoid conflicts with other tests
        food_data = self.FOOD_DATA["food1"]

        response = await async_client.post(
            f"/foods/create?group_id={session_user1['group_id']}", headers=session_auth_headers_user1, json=food_data
        )

        assert response.status_code == 200
        data = response.json()
        self.FOOD_ID["food1"] = data["data"]["id"]

        # Check response structure
        assert data["status"] == 1
        assert "data" in data
        assert data["message"].startswith("Food")

        # Check food data structure
        food = data["data"]
        assert food["brand"] == food_data["brand"]
        assert food["product_name"] == food_data["product_name"]
        assert food["food_type"] == food_data["food_type"]
        assert food["target_pet"] == food_data["target_pet"]
        assert food["unit_weight"] == food_data["unit_weight"]
        assert food["calories"] == food_data["calories"]
        assert food["protein"] == food_data["protein"]
        assert food["fat"] == food_data["fat"]
        assert food["moisture"] == food_data["moisture"]
        assert food["carbohydrate"] == food_data["carbohydrate"]

        # Check calculated fields
        expected_calories_per_unit = (food_data["calories"] * food_data["unit_weight"]) / 100
        assert food["calories_per_unit"] == expected_calories_per_unit

        # Check meta fields
        assert "id" in food
        assert food["group_id"] == session_user1["group_id"]
        assert "group_name" in food
        assert "created_at" in food
        assert "updated_at" in food
        assert food["has_photo"] is False

    @pytest.mark.asyncio
    async def test_get_food_details(self, async_client: AsyncClient, session_auth_headers_user1, session_test_group):
        """Test retrieving detailed food information"""

        food_id = self.FOOD_ID["food1"]
        food_data = self.FOOD_DATA["food1"]
        # Get food details
        response = await async_client.get(f"/foods/{food_id}/details", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        food_details = data["data"]
        assert food_details["id"] == food_id
        assert food_details["brand"] == food_data["brand"]
        assert food_details["product_name"] == food_data["product_name"]

        # Check calculated calories per unit
        expected_calories_per_unit = (food_data["calories"] * food_data["unit_weight"]) / 100
        assert food_details["calories_per_unit"] == expected_calories_per_unit

    @pytest.mark.asyncio
    async def test_update_food(self, async_client: AsyncClient, session_auth_headers_user1, session_test_group):
        """Test updating food information"""
        food_id = self.FOOD_ID["food1"]
        update_data = self.FOOD_DATA["update_food1"]
        # Update some fields

        response = await async_client.post(
            f"/foods/{food_id}/update", headers=session_auth_headers_user1, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        updated_food = data["data"]
        assert updated_food["brand"] == update_data["brand"]
        assert updated_food["protein"] == update_data["protein"]
        assert updated_food["fat"] == update_data["fat"]
        assert updated_food["product_name"] == update_data["product_name"]
        assert updated_food["moisture"] == update_data["moisture"]
        assert updated_food["carbohydrate"] == update_data["carbohydrate"]
        assert updated_food["food_type"] == update_data["food_type"]
        assert updated_food["target_pet"] == update_data["target_pet"]
        assert updated_food["unit_weight"] == update_data["unit_weight"]
        assert updated_food["calories"] == update_data["calories"]

    @pytest.mark.asyncio
    async def test_get_group_food_list(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test retrieving list of foods in a group"""
        group_id = session_user1["group_id"]
        # Get current count of foods
        current_response = await async_client.get(
            f"/foods/list?group_id={group_id}", headers=session_auth_headers_user1
        )
        current_count = len(current_response.json()["data"]) if current_response.status_code == 200 else 0

        # Create multiple foods with unique names
        foods_data_2 = self.FOOD_DATA["food2"]
        foods_data_3 = self.FOOD_DATA["food3"]

        # Create foods
        created_ids = []
        for food_data in [foods_data_2, foods_data_3]:
            response = await async_client.post(
                f"/foods/create?group_id={group_id}", headers=session_auth_headers_user1, json=food_data
            )
            assert response.status_code == 200
            created_ids.append(response.json()["data"]["id"])

        # Get food list
        response = await async_client.get(f"/foods/list?group_id={group_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        # Should have at least the 2 foods we just created
        assert len(data["data"]) >= current_count + 2

        # Check that our created foods are in the list
        foods = data["data"]
        created_brands = [f["brand"] for f in foods if f["id"] in created_ids]
        assert "Brand 2" in created_brands
        assert "Brand 3" in created_brands

    @pytest.mark.asyncio
    async def test_delete_food(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test soft deleting a food item"""
        # First create a food
        food_id = self.FOOD_ID["food1"]

        # Delete the food
        response = await async_client.post(f"/foods/{food_id}/delete", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert "deleted" in data["message"].lower()

        # Verify food is no longer accessible
        details_response = await async_client.get(f"/foods/{food_id}/details", headers=session_auth_headers_user1)
        assert details_response.status_code == 404


# class TestFoodPermissions:
#     """Test food permissions across different user roles using session data"""

#     @pytest.mark.asyncio
#     async def test_creator_can_manage_foods(
#         self, async_client: AsyncClient, session_auth_headers_user1, session_test_group
#     ):
#         """Test that group creator can create, update, and delete foods"""
#         food_data = {
#             "brand": "Creator Test",
#             "product_name": "Creator Product",
#             "food_type": "dry_food",
#             "target_pet": "dog",
#             "unit_weight": 100.0,
#             "calories": 350.0,
#             "protein": 25.0,
#             "fat": 12.0,
#             "moisture": 10.0,
#             "carbohydrate": 45.0,
#         }

#         # Create food
#         response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user1, json=food_data
#         )
#         assert response.status_code == 200
#         food_id = response.json()["data"]["id"]

#         # Update food
#         response = await async_client.post(
#             f"/foods/{food_id}/update", headers=session_auth_headers_user1, json={"brand": "Updated Brand"}
#         )
#         assert response.status_code == 200

#         # Delete food
#         response = await async_client.post(f"/foods/{food_id}/delete", headers=session_auth_headers_user1)
#         assert response.status_code == 200

#     @pytest.mark.asyncio
#     async def test_member_can_manage_foods(
#         self, async_client: AsyncClient, session_auth_headers_user2, session_test_group
#     ):
#         """Test that group member can create, update, and delete foods"""
#         food_data = {
#             "brand": "Member Test",
#             "product_name": "Member Product",
#             "food_type": "wet_food",
#             "target_pet": "cat",
#             "unit_weight": 85.0,
#             "calories": 400.0,
#             "protein": 35.0,
#             "fat": 15.0,
#             "moisture": 25.0,
#             "carbohydrate": 20.0,
#         }

#         # Create food
#         response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user2, json=food_data
#         )
#         assert response.status_code == 200
#         food_id = response.json()["data"]["id"]

#         # Update food
#         response = await async_client.post(
#             f"/foods/{food_id}/update", headers=session_auth_headers_user2, json={"protein": 40.0}
#         )
#         assert response.status_code == 200

#         # Delete food
#         response = await async_client.post(f"/foods/{food_id}/delete", headers=session_auth_headers_user2)
#         assert response.status_code == 200

#     @pytest.mark.asyncio
#     async def test_viewer_can_only_read_foods(
#         self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user3, session_test_group
#     ):
#         """Test that group viewer can only read foods, not modify them"""
#         # First create a food as creator
#         food_data = {
#             "brand": "Viewer Test",
#             "product_name": "Read Only",
#             "food_type": "dry_food",
#             "target_pet": "dog",
#             "unit_weight": 100.0,
#             "calories": 350.0,
#             "protein": 25.0,
#             "fat": 12.0,
#             "moisture": 10.0,
#             "carbohydrate": 45.0,
#         }

#         create_response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user1, json=food_data
#         )
#         food_id = create_response.json()["data"]["id"]

#         # Viewer can read food details
#         response = await async_client.get(f"/foods/{food_id}/details", headers=session_auth_headers_user3)
#         assert response.status_code == 200

#         # Viewer can list foods
#         response = await async_client.get(
#             f"/foods/list?group_id={session_test_group}", headers=session_auth_headers_user3
#         )
#         assert response.status_code == 200

#         # Viewer CANNOT create foods
#         response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user3, json=food_data
#         )
#         assert response.status_code == 403

#         # Viewer CANNOT update foods
#         response = await async_client.post(
#             f"/foods/{food_id}/update", headers=session_auth_headers_user3, json={"brand": "Hacked"}
#         )
#         assert response.status_code == 403

#         # Viewer CANNOT delete foods
#         response = await async_client.post(f"/foods/{food_id}/delete", headers=session_auth_headers_user3)
#         assert response.status_code == 403


# class TestFoodErrorCases:
#     """Test various error conditions and edge cases using session data"""

#     @pytest.mark.asyncio
#     async def test_food_not_found(self, async_client: AsyncClient, session_auth_headers_user1):
#         """Test accessing non-existent food"""
#         response = await async_client.get("/foods/nonexistent123/details", headers=session_auth_headers_user1)
#         assert response.status_code == 404

#     @pytest.mark.asyncio
#     async def test_unauthorized_access(self, async_client: AsyncClient):
#         """Test accessing food without proper authentication"""
#         food_data = {
#             "brand": "Test Brand",
#             "product_name": "Test Product",
#             "food_type": "dry_food",
#             "target_pet": "dog",
#             "unit_weight": 100.0,
#             "calories": 350.0,
#             "protein": 25.0,
#             "fat": 12.0,
#             "moisture": 10.0,
#             "carbohydrate": 45.0,
#         }

#         # Try to create food without authentication
#         response = await async_client.post("/foods/create?group_id=test123", json=food_data)
#         assert response.status_code == 401

#     @pytest.mark.asyncio
#     async def test_invalid_group_access(self, async_client: AsyncClient, session_auth_headers_user1):
#         """Test accessing food from group user doesn't belong to"""
#         # Try to create food in non-existent group
#         food_data = {
#             "brand": "Test Brand",
#             "product_name": "Test Product",
#             "food_type": "dry_food",
#             "target_pet": "dog",
#             "unit_weight": 100.0,
#             "calories": 350.0,
#             "protein": 25.0,
#             "fat": 12.0,
#             "moisture": 10.0,
#             "carbohydrate": 45.0,
#         }

#         response = await async_client.post(
#             "/foods/create?group_id=nonexistent", headers=session_auth_headers_user1, json=food_data
#         )
#         assert response.status_code == 403

#     @pytest.mark.asyncio
#     async def test_invalid_nutritional_values(
#         self, async_client: AsyncClient, session_auth_headers_user1, session_test_group
#     ):
#         """Test various invalid nutritional value combinations"""
#         # Test negative values
#         invalid_food = {
#             "brand": "Test Brand",
#             "product_name": "Invalid Food",
#             "food_type": "dry_food",
#             "target_pet": "dog",
#             "unit_weight": 100.0,
#             "calories": -50.0,  # Invalid: negative calories
#             "protein": 25.0,
#             "fat": 12.0,
#             "moisture": 10.0,
#             "carbohydrate": 45.0,
#         }

#         response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user1, json=invalid_food
#         )
#         assert response.status_code == 422  # Validation error

#         # Test values exceeding limits
#         invalid_food["calories"] = 1500.0  # Invalid: exceeds 1000 limit
#         response = await async_client.post(
#             f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user1, json=invalid_food
#         )
#         assert response.status_code == 422


# # TODO: Add search and filtering tests
# class TestFoodSearch:
#     """Test food search functionality using session data"""

#     @pytest.mark.asyncio
#     async def test_search_foods_by_keyword(
#         self, async_client: AsyncClient, session_auth_headers_user1, session_test_group
#     ):
#         """Test searching foods by keyword"""
#         # Create test foods with unique names
#         foods_data = [
#             {
#                 "brand": "SearchTest Royal Canin",
#                 "product_name": "Adult Dog Search",
#                 "food_type": "dry_food",
#                 "target_pet": "dog",
#                 "unit_weight": 100.0,
#                 "calories": 350.0,
#                 "protein": 25.0,
#                 "fat": 12.0,
#                 "moisture": 10.0,
#                 "carbohydrate": 45.0,
#             },
#             {
#                 "brand": "SearchTest Hill's",
#                 "product_name": "Canin Special Search",
#                 "food_type": "wet_food",
#                 "target_pet": "dog",
#                 "unit_weight": 85.0,
#                 "calories": 380.0,
#                 "protein": 30.0,
#                 "fat": 15.0,
#                 "moisture": 25.0,
#                 "carbohydrate": 25.0,
#             },
#         ]

#         created_ids = []
#         for food_data in foods_data:
#             response = await async_client.post(
#                 f"/foods/create?group_id={session_test_group}", headers=session_auth_headers_user1, json=food_data
#             )
#             assert response.status_code == 200
#             created_ids.append(response.json()["data"]["id"])

#         # Search by brand keyword
#         response = await async_client.get(
#             f"/foods/info?group_id={session_test_group}&keyword=SearchTest Royal", headers=session_auth_headers_user1
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["status"] == 1
#         # Should find at least our created food
#         found_brands = [f["brand"] for f in data["data"] if f["id"] in created_ids]
#         assert "SearchTest Royal Canin" in found_brands

#         # Search by product name keyword
#         response = await async_client.get(
#             f"/foods/info?group_id={session_test_group}&keyword=Search", headers=session_auth_headers_user1
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["status"] == 1
#         # Should match both foods we created (both have "Search" in product name)
#         found_our_foods = [f for f in data["data"] if f["id"] in created_ids]
#         assert len(found_our_foods) == 2
