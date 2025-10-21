"""
Comprehensive weight record functionality tests
Tests weight operations: create, update, delete, search, and permissions
"""


import pytest
from httpx import AsyncClient


class TestWeightBasicFunctions:
    """
    Test basic weight record operations with simple scenarios

    This class uses SESSION-ONLY cleaning (default behavior):
    - Data persists between tests within this class
    - Only cleans at session start/end
    - Faster performance, good for related tests
    """

    WEIGHT_PET = {
        "name": "Weight Test Pet",
        "pet_type": "dog",
        "breed": "Labrador",
        "current_weight_kg": 25.0,
    }

    WEIGHT_RECORDS = {
        "weight1": {"weight": 25.5, "notes": "Regular checkup"},
        "weight2": {"weight": 26.0, "notes": "After medication"},
        "weight3": {"weight": 25.8, "notes": "Monthly weigh-in"},
        "updated_weight": {"weight": 25.7, "notes": "Corrected measurement"},
    }

    WEIGHT_IDS = {
        "weight1": None,
        "weight2": None,
        "weight3": None,
    }

    PET_ID = None

    @pytest.mark.asyncio
    async def test_setup_create_pet(self, async_client: AsyncClient, session_auth_headers_user1, test_helper):
        """Setup: Create a pet for weight tracking"""
        pet_data = self.WEIGHT_PET
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=pet_data)

        assert response.status_code == 200
        data = response.json()
        self.PET_ID = data["data"]["id"]
        test_helper.assert_response_structure(data, expected_status=1)

        pet_details = data["data"]
        test_helper.assert_pet_structure(pet_details)

        assert pet_details["name"] == pet_data["name"]
        assert pet_details["pet_type"] == pet_data["pet_type"]
        assert pet_details["breed"] == pet_data["breed"]
        assert pet_details["current_weight_kg"] == pet_data["current_weight_kg"]

    @pytest.mark.asyncio
    async def test_create_weight_record_success(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test creating a weight record"""
        weight_data = {"pet_id": self.PET_ID, **self.WEIGHT_RECORDS["weight1"]}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        weight_details = data["data"]
        self.WEIGHT_IDS["weight1"] = weight_details["id"]

        # Verify prefixed ID format: wt_{8-char-id}
        assert weight_details["id"].startswith("wt_")
        assert len(weight_details["id"]) == 11  # "wt_" (3) + 8 chars
        assert weight_details["pet_id"] == self.PET_ID
        assert weight_details["weight"] == self.WEIGHT_RECORDS["weight1"]["weight"]
        assert weight_details["notes"] == self.WEIGHT_RECORDS["weight1"]["notes"]
        assert weight_details["pet_name"] == "Weight Test Pet"
