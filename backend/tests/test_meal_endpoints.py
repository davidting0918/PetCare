"""
Meal Endpoint Tests

Comprehensive tests for meal management functionality including:
- CRUD operations (create, read, update, delete)
- Group-based permissions (creator, member, viewer)
- Data validation and nutritional calculations
- Specialized query endpoints (today's meals, statistics)
- Filtering and date range functionality

The meal system follows group-based architecture with independent endpoints
using query parameters for maximum flexibility.
"""

from datetime import datetime as dt
from datetime import timedelta

import pytest
from httpx import AsyncClient


class TestMealBasicOperations:
    """
    Test basic meal operations using session-level data persistence.
    Tests cover CRUD operations with proper nutritional calculations.
    """

    MEAL_DATA = {
        "meal1": {
            "pet_id": "",  # Will be set during test
            "food_id": "",  # Will be set during test
            "meal_type": "breakfast",
            "serving_type": "units",
            "serving_amount": 0.5,
            "notes": "Morning feeding",
        },
        "meal2": {
            "pet_id": "",  # Will be set during test
            "food_id": "",  # Will be set during test
            "meal_type": "dinner",
            "serving_type": "grams",
            "serving_amount": 200.0,
            "notes": "Evening feeding",
        },
        "update_meal1": {
            "meal_type": "lunch",
            "serving_amount": 1.0,
            "notes": "Updated to lunch feeding",
        },
    }

    MEAL_IDS = {
        "meal1": "",
        "meal2": "",
    }

    PET_DATA = {
        "test_pet": {
            "name": "Test Pet for Meals",
            "pet_type": "dog",
            "breed": "Golden Retriever",
            "gender": "male",
            "current_weight_kg": 25.0,
            "daily_calorie_target": 1000,
        }
    }

    FOOD_DATA = {
        "test_food": {
            "brand": "Test Brand",
            "product_name": "Test Food",
            "food_type": "wet_food",
            "target_pet": "dog",
            "unit_weight": 400.0,  # 400g per can
            "calories": 350.0,  # per 100g
            "protein": 25.0,
            "fat": 12.0,
            "moisture": 65.0,
            "carbohydrate": 8.0,
        }
    }

    PET_ID = ""
    FOOD_ID = ""

    @pytest.mark.asyncio
    async def test_setup_test_data(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Setup pet and food data for meal tests"""
        # Create test pet
        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json=self.PET_DATA["test_pet"]
        )
        assert pet_response.status_code == 200
        self.PET_ID = pet_response.json()["data"]["id"]
        self.MEAL_DATA["meal1"]["pet_id"] = self.PET_ID
        self.MEAL_DATA["meal2"]["pet_id"] = self.PET_ID

        # Create test food
        food_response = await async_client.post(
            f"/foods/create?group_id={session_user1['group_id']}",
            headers=session_auth_headers_user1,
            json=self.FOOD_DATA["test_food"],
        )
        assert food_response.status_code == 200
        self.FOOD_ID = food_response.json()["data"]["id"]
        self.MEAL_DATA["meal1"]["food_id"] = self.FOOD_ID
        self.MEAL_DATA["meal2"]["food_id"] = self.FOOD_ID

    @pytest.mark.asyncio
    async def test_create_meal_with_units_serving(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating a meal record with unit-based serving"""
        meal_data = self.MEAL_DATA["meal1"]

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=meal_data)

        assert response.status_code == 200
        data = response.json()
        self.MEAL_IDS["meal1"] = data["data"]["id"]

        # Check response structure
        assert data["status"] == 1
        assert "data" in data
        assert "meal recorded" in data["message"].lower()

        # Check meal data
        meal = data["data"]
        assert meal["pet_id"] == meal_data["pet_id"]
        assert meal["food_id"] == meal_data["food_id"]
        assert meal["meal_type"] == meal_data["meal_type"]
        assert meal["serving_type"] == meal_data["serving_type"]
        assert meal["serving_amount"] == meal_data["serving_amount"]
        assert meal["notes"] == meal_data["notes"]

        # Check nutritional calculations for 0.5 cans (0.5 * 400g = 200g)
        expected_weight = 0.5 * 400.0  # 200g
        expected_calories = (350.0 * expected_weight) / 100.0  # 700 calories
        expected_protein = (25.0 * expected_weight) / 100.0  # 50g protein

        assert meal["actual_weight_g"] == expected_weight
        assert meal["calories"] == expected_calories
        assert meal["protein_g"] == expected_protein

    @pytest.mark.asyncio
    async def test_create_meal_with_grams_serving(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating a meal record with gram-based serving"""
        meal_data = self.MEAL_DATA["meal2"]

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=meal_data)

        assert response.status_code == 200
        data = response.json()
        self.MEAL_IDS["meal2"] = data["data"]["id"]

        meal = data["data"]

        # Check serving information
        assert meal["serving_type"] == "grams"
        assert meal["serving_amount"] == 200.0
        assert meal["actual_weight_g"] == 200.0  # Direct weight input

        # Check nutritional calculations for 200g
        expected_calories = (350.0 * 200.0) / 100.0  # 700 calories
        expected_protein = (25.0 * 200.0) / 100.0  # 50g protein

        assert meal["calories"] == expected_calories
        assert meal["protein_g"] == expected_protein

    @pytest.mark.asyncio
    async def test_get_meal_details(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test retrieving detailed meal information"""
        meal_id = self.MEAL_IDS["meal1"]

        response = await async_client.get(f"/meals/{meal_id}/details", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        meal_details = data["data"]
        assert meal_details["id"] == meal_id
        assert meal_details["pet_name"] == self.PET_DATA["test_pet"]["name"]
        assert meal_details["food_brand"] == self.FOOD_DATA["test_food"]["brand"]
        assert meal_details["food_product_name"] == self.FOOD_DATA["test_food"]["product_name"]
        assert "fed_by_name" in meal_details
        assert "group_name" in meal_details

    @pytest.mark.asyncio
    async def test_update_meal_record(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test updating meal information with nutritional recalculation"""
        meal_id = self.MEAL_IDS["meal1"]
        update_data = self.MEAL_DATA["update_meal1"]

        response = await async_client.post(
            f"/meals/{meal_id}/update", headers=session_auth_headers_user1, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        updated_meal = data["data"]
        assert updated_meal["meal_type"] == update_data["meal_type"]
        assert updated_meal["serving_amount"] == update_data["serving_amount"]
        assert updated_meal["notes"] == update_data["notes"]

        # Check recalculated nutrition for 1.0 can (400g)
        expected_weight = 1.0 * 400.0  # 400g
        expected_calories = (350.0 * expected_weight) / 100.0  # 1400 calories

        assert updated_meal["actual_weight_g"] == expected_weight
        assert updated_meal["calories"] == expected_calories

    @pytest.mark.asyncio
    async def test_get_meal_records_by_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test retrieving meal records filtered by pet"""
        pet_id = self.PET_ID

        response = await async_client.get(f"/meals?pet_id={pet_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert len(data["data"]) >= 2  # Should have at least our 2 created meals

        # Check that all returned meals are for the correct pet
        meals = data["data"]
        for meal in meals:
            assert meal["pet_id"] == pet_id

    @pytest.mark.asyncio
    async def test_get_meal_records_by_group(
        self, async_client: AsyncClient, session_auth_headers_user1, session_user1
    ):
        """Test retrieving meal records filtered by group"""
        group_id = session_user1["group_id"]

        response = await async_client.get(f"/meals?group_id={group_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert len(data["data"]) >= 2

        # Check meal data structure
        meals = data["data"]
        for meal in meals:
            assert "pet_name" in meal
            assert "food_name" in meal
            assert "fed_by_name" in meal
            assert "calories" in meal

    @pytest.mark.asyncio
    async def test_get_today_meals(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting today's meal summary for a pet"""
        pet_id = self.PET_ID

        response = await async_client.get(f"/meals/today?pet_id={pet_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        summary = data["data"]
        assert summary["date"] == dt.now().strftime("%Y-%m-%d")
        assert summary["total_meals"] >= 2
        assert summary["total_calories"] > 0
        assert summary["pet_id"] == pet_id
        assert summary["pet_name"] == self.PET_DATA["test_pet"]["name"]

        # Check calorie target calculation
        daily_target = self.PET_DATA["test_pet"]["daily_calorie_target"]
        assert summary["daily_calorie_target"] == daily_target
        assert summary["calorie_target_percentage"] > 0

    @pytest.mark.asyncio
    async def test_get_meal_statistics(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test generating meal statistics for a date range"""
        pet_id = self.PET_ID
        today = dt.now().strftime("%Y-%m-%d")
        yesterday = (dt.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        response = await async_client.get(
            f"/meals/summary?pet_id={pet_id}&date_from={yesterday}&date_to={today}",
            headers=session_auth_headers_user1,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        stats = data["data"]
        assert stats["date_from"] == yesterday
        assert stats["date_to"] == today
        assert stats["total_meals"] >= 2
        assert stats["total_calories"] > 0
        assert stats["average_meals_per_day"] > 0
        assert stats["average_calories_per_day"] > 0
        assert "meal_type_distribution" in stats
        assert "most_active_feeders" in stats

    @pytest.mark.asyncio
    async def test_delete_meal_record(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test soft deleting a meal record"""
        meal_id = self.MEAL_IDS["meal2"]

        response = await async_client.post(f"/meals/{meal_id}/delete", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert "deleted" in data["message"].lower()

        # Verify meal is no longer accessible
        details_response = await async_client.get(f"/meals/{meal_id}/details", headers=session_auth_headers_user1)
        assert details_response.status_code == 404


class TestMealPermissions:
    """Test meal permissions across different user roles"""

    @pytest.mark.asyncio
    async def test_creator_can_manage_all_meals(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2, session_test_group
    ):
        """Test that group creator can create, update, and delete any meals"""
        # Setup: User2 (member) creates a meal
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user2,
            json={
                "name": "Member Pet",
                "pet_type": "dog",
                "breed": "Labrador",
                "gender": "female",
                "current_weight_kg": 20.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        # Assign pet to shared group
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group",
            headers=session_auth_headers_user2,
            json={"group_id": session_test_group},
        )
        assert assign_response.status_code == 200

        # Create food in shared group
        food_response = await async_client.post(
            f"/foods/create?group_id={session_test_group}",
            headers=session_auth_headers_user2,
            json={
                "brand": "Permission Test",
                "product_name": "Member Food",
                "food_type": "dry_food",
                "target_pet": "dog",
                "unit_weight": 100.0,
                "calories": 400.0,
                "protein": 30.0,
                "fat": 15.0,
                "moisture": 10.0,
                "carbohydrate": 35.0,
            },
        )
        assert food_response.status_code == 200
        food_id = food_response.json()["data"]["id"]

        # User2 creates a meal
        meal_response = await async_client.post(
            "/meals",
            headers=session_auth_headers_user2,
            json={
                "pet_id": pet_id,
                "food_id": food_id,
                "meal_type": "breakfast",
                "serving_type": "units",
                "serving_amount": 1.0,
            },
        )
        assert meal_response.status_code == 200
        meal_id = meal_response.json()["data"]["id"]

        # User1 (creator) can update the meal created by User2
        update_response = await async_client.post(
            f"/meals/{meal_id}/update",
            headers=session_auth_headers_user1,
            json={"meal_type": "lunch", "notes": "Updated by creator"},
        )
        assert update_response.status_code == 200

        # User1 (creator) can delete the meal created by User2
        delete_response = await async_client.post(f"/meals/{meal_id}/delete", headers=session_auth_headers_user1)
        assert delete_response.status_code == 200

    @pytest.mark.asyncio
    async def test_member_can_only_modify_own_meals(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2, session_test_group
    ):
        """Test that group member can only modify their own meal records"""
        # Setup: Create pet and food for testing
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={
                "name": "Creator Pet",
                "pet_type": "cat",
                "breed": "Persian",
                "gender": "male",
                "current_weight_kg": 5.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        # Assign to shared group
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group",
            headers=session_auth_headers_user1,
            json={"group_id": session_test_group},
        )
        assert assign_response.status_code == 200

        # Create food
        food_response = await async_client.post(
            f"/foods/create?group_id={session_test_group}",
            headers=session_auth_headers_user1,
            json={
                "brand": "Creator Brand",
                "product_name": "Creator Food",
                "food_type": "wet_food",
                "target_pet": "cat",
                "unit_weight": 85.0,
                "calories": 380.0,
                "protein": 40.0,
                "fat": 12.0,
                "moisture": 25.0,
                "carbohydrate": 18.0,
            },
        )
        assert food_response.status_code == 200
        food_id = food_response.json()["data"]["id"]

        # User1 (creator) creates a meal
        meal_response = await async_client.post(
            "/meals",
            headers=session_auth_headers_user1,
            json={
                "pet_id": pet_id,
                "food_id": food_id,
                "meal_type": "dinner",
                "serving_type": "units",
                "serving_amount": 1.0,
            },
        )
        assert meal_response.status_code == 200
        meal_id = meal_response.json()["data"]["id"]

        # User2 (member) CANNOT update meal created by User1
        update_response = await async_client.post(
            f"/meals/{meal_id}/update",
            headers=session_auth_headers_user2,
            json={"meal_type": "snack"},
        )
        assert update_response.status_code == 403

        # User2 (member) CANNOT delete meal created by User1
        delete_response = await async_client.post(f"/meals/{meal_id}/delete", headers=session_auth_headers_user2)
        assert delete_response.status_code == 403

    @pytest.mark.asyncio
    async def test_viewer_cannot_record_or_modify_meals(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user3, session_test_group
    ):
        """Test that group viewer cannot record or modify meals"""
        # Setup: Create pet and food
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={
                "name": "Viewer Test Pet",
                "pet_type": "rabbit",
                "breed": "Holland Lop",
                "gender": "female",
                "current_weight_kg": 2.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        # Assign to shared group
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group",
            headers=session_auth_headers_user1,
            json={"group_id": session_test_group},
        )
        assert assign_response.status_code == 200

        food_response = await async_client.post(
            f"/foods/create?group_id={session_test_group}",
            headers=session_auth_headers_user1,
            json={
                "brand": "Rabbit Brand",
                "product_name": "Rabbit Pellets",
                "food_type": "dry_food",
                "target_pet": "rabbit",
                "unit_weight": 50.0,
                "calories": 320.0,
                "protein": 18.0,
                "fat": 3.0,
                "moisture": 12.0,
                "carbohydrate": 60.0,
            },
        )
        assert food_response.status_code == 200
        food_id = food_response.json()["data"]["id"]

        # Create a meal as creator for testing viewer access
        meal_response = await async_client.post(
            "/meals",
            headers=session_auth_headers_user1,
            json={
                "pet_id": pet_id,
                "food_id": food_id,
                "meal_type": "breakfast",
                "serving_type": "units",
                "serving_amount": 2.0,
            },
        )
        assert meal_response.status_code == 200
        meal_id = meal_response.json()["data"]["id"]

        # User3 (viewer) CAN view meals
        response = await async_client.get(f"/meals?group_id={session_test_group}", headers=session_auth_headers_user3)
        assert response.status_code == 200

        # User3 (viewer) CAN view meal details
        details_response = await async_client.get(f"/meals/{meal_id}/details", headers=session_auth_headers_user3)
        assert details_response.status_code == 200

        # User3 (viewer) CAN view today's meals
        today_response = await async_client.get(
            f"/meals/today?group_id={session_test_group}", headers=session_auth_headers_user3
        )
        assert today_response.status_code == 200

        # User3 (viewer) CANNOT create meals
        create_response = await async_client.post(
            "/meals",
            headers=session_auth_headers_user3,
            json={
                "pet_id": pet_id,
                "food_id": food_id,
                "meal_type": "lunch",
                "serving_type": "units",
                "serving_amount": 1.0,
            },
        )
        assert create_response.status_code == 403

        # User3 (viewer) CANNOT update meals
        update_response = await async_client.post(
            f"/meals/{meal_id}/update",
            headers=session_auth_headers_user3,
            json={"meal_type": "snack"},
        )
        assert update_response.status_code == 403

        # User3 (viewer) CANNOT delete meals
        delete_response = await async_client.post(f"/meals/{meal_id}/delete", headers=session_auth_headers_user3)
        assert delete_response.status_code == 403


class TestMealErrorCases:
    """Test various error conditions and edge cases"""

    @pytest.mark.asyncio
    async def test_meal_not_found(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test accessing non-existent meal"""
        response = await async_client.get("/meals/nonexistent123/details", headers=session_auth_headers_user1)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, async_client: AsyncClient):
        """Test accessing meals without proper authentication"""
        meal_data = {
            "pet_id": "test123",
            "food_id": "test456",
            "serving_type": "units",
            "serving_amount": 1.0,
        }

        # Try to create meal without authentication
        response = await async_client.post("/meals", json=meal_data)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_pet_access(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating meal for non-accessible pet"""
        meal_data = {
            "pet_id": "nonexistent_pet",
            "food_id": "some_food",
            "serving_type": "units",
            "serving_amount": 1.0,
        }

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=meal_data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_food_access(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test creating meal with non-accessible food"""
        # Create a pet first
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={
                "name": "Error Test Pet",
                "pet_type": "dog",
                "breed": "Beagle",
                "gender": "male",
                "current_weight_kg": 15.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        # Try to create meal with non-existent food
        meal_data = {
            "pet_id": pet_id,
            "food_id": "nonexistent_food",
            "serving_type": "units",
            "serving_amount": 1.0,
        }

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=meal_data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_missing_required_query_parameters(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test meal queries without required pet_id or group_id"""
        # Try to get meals without specifying pet_id or group_id
        response = await async_client.get("/meals", headers=session_auth_headers_user1)
        assert response.status_code == 400

        # Try to get statistics without date range
        response = await async_client.get("/meals/summary?pet_id=test123", headers=session_auth_headers_user1)
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_invalid_serving_values(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test meal creation with invalid serving amounts"""
        # Create pet and food for testing
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={
                "name": "Validation Test Pet",
                "pet_type": "cat",
                "breed": "Siamese",
                "gender": "female",
                "current_weight_kg": 4.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        food_response = await async_client.post(
            f"/foods/create?group_id={session_user1['group_id']}",
            headers=session_auth_headers_user1,
            json={
                "brand": "Validation Brand",
                "product_name": "Validation Food",
                "food_type": "dry_food",
                "target_pet": "cat",
                "unit_weight": 0.5,
                "calories": 400.0,
                "protein": 35.0,
                "fat": 15.0,
                "moisture": 8.0,
                "carbohydrate": 35.0,
            },
        )
        assert food_response.status_code == 200
        food_id = food_response.json()["data"]["id"]

        # Test negative serving amount
        invalid_meal = {
            "pet_id": pet_id,
            "food_id": food_id,
            "serving_type": "units",
            "serving_amount": -1.0,  # Invalid: negative amount
        }

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=invalid_meal)
        assert response.status_code == 422  # Validation error

        # Test excessive serving amount
        invalid_meal["serving_amount"] = 15000.0  # Invalid: exceeds 10000 limit
        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=invalid_meal)
        assert response.status_code == 422


class TestMealDateFiltering:
    """Test date range filtering and specialized date queries"""

    @pytest.mark.asyncio
    async def test_date_range_filtering(self, async_client: AsyncClient, session_auth_headers_user1, session_user1):
        """Test filtering meals by date range"""
        # Setup pet and food
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={
                "name": "Date Test Pet",
                "pet_type": "dog",
                "breed": "Border Collie",
                "gender": "male",
                "current_weight_kg": 18.0,
            },
        )
        assert pet_response.status_code == 200
        pet_id = pet_response.json()["data"]["id"]

        food_response = await async_client.post(
            f"/foods/create?group_id={session_user1['group_id']}",
            headers=session_auth_headers_user1,
            json={
                "brand": "Date Test Brand",
                "product_name": "Date Test Food",
                "food_type": "wet_food",
                "target_pet": "dog",
                "unit_weight": 300.0,
                "calories": 380.0,
                "protein": 28.0,
                "fat": 14.0,
                "moisture": 75.0,
                "carbohydrate": 5.0,
            },
        )
        assert food_response.status_code == 200
        food_id = food_response.json()["data"]["id"]

        # Create meals with different timestamps
        yesterday = dt.now() - timedelta(days=1)
        today = dt.now()

        # Create yesterday's meal
        yesterday_meal = {
            "pet_id": pet_id,
            "food_id": food_id,
            "fed_at": yesterday.isoformat(),
            "meal_type": "breakfast",
            "serving_type": "units",
            "serving_amount": 1.0,
        }

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=yesterday_meal)
        assert response.status_code == 200

        # Create today's meal
        today_meal = {
            "pet_id": pet_id,
            "food_id": food_id,
            "fed_at": today.isoformat(),
            "meal_type": "dinner",
            "serving_type": "units",
            "serving_amount": 1.0,
        }

        response = await async_client.post("/meals", headers=session_auth_headers_user1, json=today_meal)
        assert response.status_code == 200

        # Test date filtering - only today
        today_str = today.strftime("%Y-%m-%d")
        response = await async_client.get(
            f"/meals?pet_id={pet_id}&date_from={today_str}&date_to={today_str}",
            headers=session_auth_headers_user1,
        )
        assert response.status_code == 200
        data = response.json()
        meals = data["data"]
        assert len(meals) >= 1

        # All returned meals should be from today
        for meal in meals:
            meal_date = dt.fromisoformat(meal["fed_at"]).strftime("%Y-%m-%d")
            assert meal_date == today_str

        # Test date filtering - yesterday only
        yesterday_str = yesterday.strftime("%Y-%m-%d")
        response = await async_client.get(
            f"/meals?pet_id={pet_id}&date_from={yesterday_str}&date_to={yesterday_str}",
            headers=session_auth_headers_user1,
        )
        assert response.status_code == 200
        data = response.json()
        meals = data["data"]
        assert len(meals) >= 1

        # Test broader date range
        response = await async_client.get(
            f"/meals?pet_id={pet_id}&date_from={yesterday_str}&date_to={today_str}",
            headers=session_auth_headers_user1,
        )
        assert response.status_code == 200
        data = response.json()
        meals = data["data"]
        assert len(meals) >= 2  # Should include both yesterday and today meals
