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

    PET_ID = {
        "pet1": None,
    }

    @pytest.mark.asyncio
    async def test_setup_create_pet(self, async_client: AsyncClient, session_auth_headers_user1, test_helper):
        """Setup: Create a pet for weight tracking"""
        pet_data = self.WEIGHT_PET
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=pet_data)

        assert response.status_code == 200
        data = response.json()
        self.PET_ID["pet1"] = data["data"]["id"]
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
        weight_data = {"pet_id": self.PET_ID["pet1"], **self.WEIGHT_RECORDS["weight1"]}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        weight_details = data["data"]
        self.WEIGHT_IDS["weight1"] = weight_details["id"]

        # Verify prefixed ID format: wt_{8-char-id}
        assert weight_details["id"].startswith("wt_")
        assert len(weight_details["id"]) == 11  # "wt_" (3) + 8 chars
        assert weight_details["pet_id"] == self.PET_ID["pet1"]
        assert weight_details["weight"] == self.WEIGHT_RECORDS["weight1"]["weight"]
        assert weight_details["notes"] == self.WEIGHT_RECORDS["weight1"]["notes"]

    @pytest.mark.asyncio
    async def test_create_multiple_weight_records(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test creating multiple weight records for tracking weight over time"""
        # Create second weight record
        weight_data2 = {"pet_id": self.PET_ID["pet1"], **self.WEIGHT_RECORDS["weight2"]}
        response2 = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data2)

        assert response2.status_code == 200
        data2 = response2.json()
        test_helper.assert_response_structure(data2, expected_status=1)
        self.WEIGHT_IDS["weight2"] = data2["data"]["id"]

        # Create third weight record
        weight_data3 = {"pet_id": self.PET_ID["pet1"], **self.WEIGHT_RECORDS["weight3"]}
        response3 = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data3)

        assert response3.status_code == 200
        data3 = response3.json()
        test_helper.assert_response_structure(data3, expected_status=1)
        self.WEIGHT_IDS["weight3"] = data3["data"]["id"]

        # Verify all records have unique IDs
        assert self.WEIGHT_IDS["weight1"] != self.WEIGHT_IDS["weight2"]
        assert self.WEIGHT_IDS["weight2"] != self.WEIGHT_IDS["weight3"]
        assert self.WEIGHT_IDS["weight1"] != self.WEIGHT_IDS["weight3"]

    @pytest.mark.asyncio
    async def test_update_weight_record_success(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test updating a weight record by its creator"""
        weight_id = self.WEIGHT_IDS["weight1"]
        update_data = self.WEIGHT_RECORDS["updated_weight"]

        response = await async_client.post(
            f"/weights/update/{weight_id}", headers=session_auth_headers_user1, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        weight_details = data["data"]
        assert weight_details["id"] == weight_id
        assert weight_details["weight"] == update_data["weight"]
        assert weight_details["notes"] == update_data["notes"]

    @pytest.mark.asyncio
    async def test_update_weight_record_unauthorized(
        self, async_client: AsyncClient, session_auth_headers_user2, test_helper
    ):
        """Test that only the creator can update their weight record"""
        weight_id = self.WEIGHT_IDS["weight1"]
        update_data = {"weight": 99.9, "notes": "Unauthorized update attempt"}

        response = await async_client.post(
            f"/weights/update/{weight_id}", headers=session_auth_headers_user2, json=update_data
        )

        # Should fail with 403 Forbidden or 404 Not Found depending on implementation
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_search_weight_records_for_pet(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test searching weight records for a specific pet"""
        search_params = {"pet_id": self.PET_ID["pet1"], "page": 1, "number": 50}

        response = await async_client.get("/weights/info", headers=session_auth_headers_user1, params=search_params)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        search_results = data["data"]
        assert "records" in search_results
        assert "total" in search_results
        assert "page" in search_results
        assert "number" in search_results
        assert "total_pages" in search_results

        # Should have 3 weight records created earlier
        assert search_results["total"] >= 3
        assert len(search_results["records"]) >= 3

        # Verify all records belong to the correct pet
        for record in search_results["records"]:
            assert record["pet_id"] == self.PET_ID["pet1"]

    @pytest.mark.asyncio
    async def test_search_weight_records_with_sorting(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test searching weight records with custom sorting"""
        search_params = {
            "pet_id": self.PET_ID["pet1"],
            "order_by": "weight",
            "order_direction": "asc",
            "page": 1,
            "number": 50,
        }

        response = await async_client.get("/weights/info", headers=session_auth_headers_user1, params=search_params)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        search_results = data["data"]
        records = search_results["records"]

        # Verify records are sorted by weight in ascending order
        if len(records) >= 2:
            for i in range(len(records) - 1):
                assert records[i]["weight"] <= records[i + 1]["weight"]

    @pytest.mark.asyncio
    async def test_delete_weight_record_unauthorized(self, async_client: AsyncClient, session_auth_headers_user2):
        """Test that only the creator can delete their weight record"""
        weight_id = self.WEIGHT_IDS["weight2"]

        response = await async_client.post(f"/weights/delete/{weight_id}", headers=session_auth_headers_user2)

        # Should fail with 403 Forbidden or 404 Not Found
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_delete_weight_record_success(
        self, async_client: AsyncClient, session_auth_headers_user1, test_helper
    ):
        """Test soft deleting a weight record by its creator"""
        weight_id = self.WEIGHT_IDS["weight2"]

        # Delete the weight record
        response = await async_client.post(f"/weights/delete/{weight_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        deletion_result = data["data"]
        assert "id" in deletion_result
        assert deletion_result["id"] == weight_id

        # Verify the record is soft deleted (no longer appears in normal queries)
        get_response = await async_client.get(f"/weights/{weight_id}", headers=session_auth_headers_user1)
        # Should either return 404 or return record with is_active=false
        if get_response.status_code == 200:
            get_data = get_response.json()
            assert get_data["data"]["is_active"] is False
        else:
            assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_weight_record_invalid_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating a weight record for a non-existent pet"""
        invalid_weight_data = {"pet_id": "pet_invalid123", "weight": 25.5, "notes": "Invalid pet test"}

        response = await async_client.post(
            "/weights/create", headers=session_auth_headers_user1, json=invalid_weight_data
        )

        # Should fail with 404 Not Found or 403 Forbidden
        assert response.status_code in [404, 403]
