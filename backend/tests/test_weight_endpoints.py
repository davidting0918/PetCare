"""
Comprehensive weight record functionality tests
Tests weight operations: create, update, delete, search, and permissions
"""

from datetime import datetime as dt
from datetime import timedelta

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
    async def test_setup_create_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Setup: Create a pet for weight tracking"""
        pet_data = {"name": "Weight Test Pet", "pet_type": "dog", "breed": "Labrador", "current_weight_kg": 25.0}
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=pet_data)

        assert response.status_code == 200
        self.PET_ID = response.json()["data"]["id"]

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

    @pytest.mark.asyncio
    async def test_create_weight_with_timestamp(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating a weight record with specific timestamp (retroactive entry)"""
        past_timestamp = (dt.now() - timedelta(days=7)).isoformat()
        weight_data = {
            "pet_id": self.PET_ID,
            "weight": self.WEIGHT_RECORDS["weight2"]["weight"],
            "timestamp": past_timestamp,
            "notes": self.WEIGHT_RECORDS["weight2"]["notes"],
        }
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 200
        data = response.json()
        weight_details = data["data"]
        self.WEIGHT_IDS["weight2"] = weight_details["id"]

        assert weight_details["weight"] == self.WEIGHT_RECORDS["weight2"]["weight"]
        # Verify timestamp is in the past
        record_timestamp = dt.fromisoformat(weight_details["timestamp"].replace("Z", "+00:00"))
        assert record_timestamp < dt.now()

    @pytest.mark.asyncio
    async def test_get_weight_record_details(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting detailed weight record information"""
        weight_id = self.WEIGHT_IDS["weight1"]
        response = await async_client.get(f"/weights/{weight_id}", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        weight_details = data["data"]
        assert weight_details["id"] == weight_id
        assert weight_details["pet_id"] == self.PET_ID
        assert weight_details["weight"] == self.WEIGHT_RECORDS["weight1"]["weight"]
        assert weight_details["pet_name"] == "Weight Test Pet"
        assert weight_details["pet_type"] == "dog"

    @pytest.mark.asyncio
    async def test_update_weight_record(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test updating an existing weight record"""
        weight_id = self.WEIGHT_IDS["weight1"]
        update_data = self.WEIGHT_RECORDS["updated_weight"]
        response = await async_client.post(
            f"/weights/{weight_id}/update", headers=session_auth_headers_user1, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        updated_weight = data["data"]
        assert updated_weight["weight"] == update_data["weight"]
        assert updated_weight["notes"] == update_data["notes"]

    @pytest.mark.asyncio
    async def test_create_third_weight_for_search(self, async_client: AsyncClient, session_auth_headers_user1):
        """Create another weight record for search testing"""
        weight_data = {"pet_id": self.PET_ID, **self.WEIGHT_RECORDS["weight3"]}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 200
        self.WEIGHT_IDS["weight3"] = response.json()["data"]["id"]

    @pytest.mark.asyncio
    async def test_search_weight_records_by_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test searching weight records for a specific pet"""
        search_data = {"pet_id": self.PET_ID, "page": 1, "number": 10}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        search_result = data["data"]
        assert search_result["total"] >= 3
        assert len(search_result["records"]) >= 3
        assert search_result["page"] == 1
        assert all(record["pet_id"] == self.PET_ID for record in search_result["records"])

    @pytest.mark.asyncio
    async def test_delete_weight_record(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test soft deleting a weight record"""
        weight_id = self.WEIGHT_IDS["weight2"]
        response = await async_client.post(f"/weights/{weight_id}/delete", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert data["data"]["deleted"] is True

        # Verify it's not returned in search results anymore
        search_data = {"pet_id": self.PET_ID, "page": 1, "number": 10}
        search_response = await async_client.post(
            "/weights/search", headers=session_auth_headers_user1, json=search_data
        )
        search_result = search_response.json()["data"]

        # Should not find the deleted record
        assert not any(record["id"] == weight_id for record in search_result["records"])


class TestWeightPermissions:
    """Test permission control for weight records"""

    PET_ID = None
    GROUP_ID = None
    WEIGHT_ID = None

    @pytest.mark.asyncio
    async def test_setup_group_and_pet(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2
    ):
        """Setup: Create group, pet, and add members with different roles"""
        # User1 creates a group
        group_response = await async_client.post(
            "/groups/create", headers=session_auth_headers_user1, json={"name": "Weight Permission Test Group"}
        )
        self.GROUP_ID = group_response.json()["data"]["id"]

        # User1 creates a pet
        pet_response = await async_client.post(
            "/pets/create",
            headers=session_auth_headers_user1,
            json={"name": "Permission Test Pet", "pet_type": "cat"},
        )
        self.PET_ID = pet_response.json()["data"]["id"]

        # Assign pet to group
        await async_client.post(
            f"/pets/{self.PET_ID}/assign_group", headers=session_auth_headers_user1, json={"group_id": self.GROUP_ID}
        )

    @pytest.mark.asyncio
    async def test_creator_can_record_weight(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test that group creator can record weight"""
        weight_data = {"pet_id": self.PET_ID, "weight": 5.5, "notes": "Creator's record"}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 200
        self.WEIGHT_ID = response.json()["data"]["id"]

    @pytest.mark.asyncio
    async def test_add_member_to_group(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2
    ):
        """Setup: Add user2 as member"""
        # Create invitation
        invite_response = await async_client.post(
            f"/groups/{self.GROUP_ID}/invite", headers=session_auth_headers_user1, json={"role": "member"}
        )
        invite_code = invite_response.json()["data"]["invite_code"]

        # User2 accepts invitation
        await async_client.post("/groups/join", headers=session_auth_headers_user2, json={"invite_code": invite_code})

    @pytest.mark.asyncio
    async def test_member_can_record_weight(self, async_client: AsyncClient, session_auth_headers_user2):
        """Test that group member can record weight"""
        weight_data = {"pet_id": self.PET_ID, "weight": 5.6, "notes": "Member's record"}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user2, json=weight_data)

        assert response.status_code == 200
        assert response.json()["data"]["weight"] == 5.6

    @pytest.mark.asyncio
    async def test_add_viewer_to_group(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user3
    ):
        """Setup: Add user3 as viewer"""
        # Create viewer invitation
        invite_response = await async_client.post(
            f"/groups/{self.GROUP_ID}/invite", headers=session_auth_headers_user1, json={"role": "viewer"}
        )
        invite_code = invite_response.json()["data"]["invite_code"]

        # User3 accepts as viewer
        await async_client.post("/groups/join", headers=session_auth_headers_user3, json={"invite_code": invite_code})

    @pytest.mark.asyncio
    async def test_viewer_cannot_record_weight(self, async_client: AsyncClient, session_auth_headers_user3):
        """Test that viewer cannot record weight"""
        weight_data = {"pet_id": self.PET_ID, "weight": 5.7, "notes": "Viewer's attempt"}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user3, json=weight_data)

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_viewer_can_view_weights(self, async_client: AsyncClient, session_auth_headers_user3):
        """Test that viewer can view weight records"""
        search_data = {"pet_id": self.PET_ID, "page": 1, "number": 10}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user3, json=search_data)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert len(data["data"]["records"]) >= 2

    @pytest.mark.asyncio
    async def test_only_recorder_can_update(self, async_client: AsyncClient, session_auth_headers_user2):
        """Test that only the user who recorded can update their own record"""
        # User2 tries to update User1's record (should fail)
        update_data = {"weight": 5.9}
        response = await async_client.post(
            f"/weights/{self.WEIGHT_ID}/update", headers=session_auth_headers_user2, json=update_data
        )

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_only_recorder_can_delete(self, async_client: AsyncClient, session_auth_headers_user2):
        """Test that only the user who recorded can delete their own record"""
        # User2 tries to delete User1's record (should fail)
        response = await async_client.post(f"/weights/{self.WEIGHT_ID}/delete", headers=session_auth_headers_user2)

        assert response.status_code == 403  # Forbidden


class TestWeightSearch:
    """Test weight record search functionality with various filters"""

    PET_ID = None
    USER1_ID = None
    USER2_ID = None
    WEIGHT_IDS = []

    @pytest.mark.asyncio
    async def test_setup_search_data(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2
    ):
        """Setup: Create multiple weight records for comprehensive search testing"""
        # Create group and pet
        group_response = await async_client.post(
            "/groups/create", headers=session_auth_headers_user1, json={"name": "Search Test Group"}
        )
        group_id = group_response.json()["data"]["id"]

        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Search Test Pet", "pet_type": "dog"}
        )
        self.PET_ID = pet_response.json()["data"]["id"]

        await async_client.post(
            f"/pets/{self.PET_ID}/assign_group", headers=session_auth_headers_user1, json={"group_id": group_id}
        )

        # Add user2 as member
        invite_response = await async_client.post(
            f"/groups/{group_id}/invite", headers=session_auth_headers_user1, json={"role": "member"}
        )
        await async_client.post(
            "/groups/join",
            headers=session_auth_headers_user2,
            json={"invite_code": invite_response.json()["data"]["invite_code"]},
        )

        # Create multiple weight records with different timestamps
        now = dt.now()
        test_records = [
            {"days_ago": 30, "weight": 20.0, "user": session_auth_headers_user1},
            {"days_ago": 20, "weight": 20.5, "user": session_auth_headers_user1},
            {"days_ago": 10, "weight": 21.0, "user": session_auth_headers_user2},
            {"days_ago": 5, "weight": 21.3, "user": session_auth_headers_user1},
            {"days_ago": 1, "weight": 21.5, "user": session_auth_headers_user2},
        ]

        for record in test_records:
            timestamp = (now - timedelta(days=record["days_ago"])).isoformat()
            weight_data = {"pet_id": self.PET_ID, "weight": record["weight"], "timestamp": timestamp}
            response = await async_client.post("/weights/create", headers=record["user"], json=weight_data)
            self.WEIGHT_IDS.append(response.json()["data"]["id"])

    @pytest.mark.asyncio
    async def test_search_with_time_range(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test searching with start and end date filters"""
        now = dt.now()
        start = (now - timedelta(days=15)).isoformat()
        end = now.isoformat()

        search_data = {"pet_id": self.PET_ID, "start": start, "end": end, "page": 1, "number": 10}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        data = response.json()["data"]
        # Should find records from last 15 days (3 records)
        assert data["total"] >= 3

    @pytest.mark.asyncio
    async def test_search_by_user_id(self, async_client: AsyncClient, session_auth_headers_user1, session_users):
        """Test searching by user_id filter"""
        user1_id = session_users["user1"]["id"]
        search_data = {"pet_id": self.PET_ID, "user_id": user1_id, "page": 1, "number": 10}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        data = response.json()["data"]
        # User1 created 3 records
        assert data["total"] == 3
        assert all(record["user_id"] == user1_id for record in data["records"])

    @pytest.mark.asyncio
    async def test_search_order_by_timestamp_desc(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test ordering by timestamp in descending order (most recent first)"""
        search_data = {
            "pet_id": self.PET_ID,
            "order_by": "timestamp",
            "order_direction": "desc",
            "page": 1,
            "number": 10,
        }
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        records = response.json()["data"]["records"]

        # Verify descending order (most recent first)
        timestamps = [dt.fromisoformat(r["timestamp"].replace("Z", "+00:00")) for r in records]
        assert timestamps == sorted(timestamps, reverse=True)

    @pytest.mark.asyncio
    async def test_search_order_by_timestamp_asc(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test ordering by timestamp in ascending order (oldest first)"""
        search_data = {
            "pet_id": self.PET_ID,
            "order_by": "timestamp",
            "order_direction": "asc",
            "page": 1,
            "number": 10,
        }
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        records = response.json()["data"]["records"]

        # Verify ascending order (oldest first)
        timestamps = [dt.fromisoformat(r["timestamp"].replace("Z", "+00:00")) for r in records]
        assert timestamps == sorted(timestamps)

    @pytest.mark.asyncio
    async def test_search_pagination(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test pagination functionality"""
        # First page with 2 records per page
        search_data = {"pet_id": self.PET_ID, "page": 1, "number": 2}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        page1_data = response.json()["data"]
        assert len(page1_data["records"]) == 2
        assert page1_data["page"] == 1
        assert page1_data["total"] >= 5
        assert page1_data["total_pages"] >= 3

        # Second page
        search_data["page"] = 2
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)
        page2_data = response.json()["data"]
        assert len(page2_data["records"]) == 2
        assert page2_data["page"] == 2

        # Verify different records
        page1_ids = [r["id"] for r in page1_data["records"]]
        page2_ids = [r["id"] for r in page2_data["records"]]
        assert set(page1_ids).isdisjoint(set(page2_ids))


class TestWeightEdgeCases:
    """Test edge cases and error handling"""

    @pytest.mark.asyncio
    async def test_create_weight_invalid_value(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating weight with invalid value (out of range)"""
        # Create a pet first
        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Test Pet", "pet_type": "cat"}
        )
        pet_id = pet_response.json()["data"]["id"]

        # Try to create with invalid weight
        weight_data = {"pet_id": pet_id, "weight": 250.0}  # Over 200kg limit
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_create_weight_nonexistent_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating weight for non-existent pet"""
        weight_data = {"pet_id": "nonexist", "weight": 10.0}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 404  # Pet not found

    @pytest.mark.asyncio
    async def test_get_nonexistent_weight_record(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting non-existent weight record"""
        fake_id = "fake1234-1234567890000"
        response = await async_client.get(f"/weights/{fake_id}", headers=session_auth_headers_user1)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_with_no_fields(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test updating weight record with no fields provided"""
        # Create a weight record first
        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Update Test Pet", "pet_type": "dog"}
        )
        pet_id = pet_response.json()["data"]["id"]

        weight_response = await async_client.post(
            "/weights/create", headers=session_auth_headers_user1, json={"pet_id": pet_id, "weight": 15.0}
        )
        weight_id = weight_response.json()["data"]["id"]

        # Try to update with empty data
        response = await async_client.post(f"/weights/{weight_id}/update", headers=session_auth_headers_user1, json={})

        assert response.status_code == 400  # Bad request

    @pytest.mark.asyncio
    async def test_notes_length_validation(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test notes field length validation (max 500 chars)"""
        # Create a pet
        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Notes Test Pet", "pet_type": "cat"}
        )
        pet_id = pet_response.json()["data"]["id"]

        # Try to create with notes exceeding 500 characters
        long_notes = "A" * 501
        weight_data = {"pet_id": pet_id, "weight": 5.0, "notes": long_notes}
        response = await async_client.post("/weights/create", headers=session_auth_headers_user1, json=weight_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_search_without_pet_id_returns_all_accessible(
        self, async_client: AsyncClient, session_auth_headers_user1
    ):
        """Test search without pet_id returns records from all accessible pets"""
        # Create multiple pets and weights
        pet1_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Pet 1", "pet_type": "dog"}
        )
        pet1_id = pet1_response.json()["data"]["id"]

        pet2_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Pet 2", "pet_type": "cat"}
        )
        pet2_id = pet2_response.json()["data"]["id"]

        # Create weight for both pets
        await async_client.post(
            "/weights/create", headers=session_auth_headers_user1, json={"pet_id": pet1_id, "weight": 20.0}
        )
        await async_client.post(
            "/weights/create", headers=session_auth_headers_user1, json={"pet_id": pet2_id, "weight": 5.0}
        )

        # Search without pet_id filter
        search_data = {"page": 1, "number": 50}
        response = await async_client.post("/weights/search", headers=session_auth_headers_user1, json=search_data)

        assert response.status_code == 200
        data = response.json()["data"]
        # Should find weights from both pets
        pet_ids_in_results = set(record["pet_id"] for record in data["records"])
        assert pet1_id in pet_ids_in_results
        assert pet2_id in pet_ids_in_results
