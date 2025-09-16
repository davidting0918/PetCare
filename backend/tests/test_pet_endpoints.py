"""
Simple pet functionality tests following KISS principle
Tests basic pet operations: create, update, delete, group assignment, photo management
"""

# import io

import pytest
from httpx import AsyncClient


class TestPetBasicFunctions:
    """
    Test basic pet operations with simple scenarios

    This class uses SESSION-ONLY cleaning (default behavior):
    - Data persists between tests within this class
    - Only cleans at session start/end
    - Faster performance, good for related tests
    """

    PETS_INFO = {
        "pet1": {
            "name": "Buddy",
            "pet_type": "dog",
            "breed": "Golden Retriever",
            "gender": "male",
            "current_weight_kg": 25.5,
        },
        "pet2": {
            "name": "Fluffy",
            "pet_type": "cat",
            "breed": "Persian",
            "gender": "female",
            "current_weight_kg": 10.5,
        },
        "updated_pet1": {
            "name": "Buddy Updated",
            "current_weight_kg": 26.5,
            "notes": "Weight increased after training",
        },
    }

    PETS_ID = {
        "pet1": None,
        "pet2": None,
    }

    @pytest.mark.asyncio
    async def test_create_pet_success(self, async_client: AsyncClient, session_auth_headers_user1, test_helper):
        """Test creating a pet - should be straightforward"""

        pet_data = self.PETS_INFO["pet1"]
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=pet_data)

        assert response.status_code == 200
        data = response.json()
        self.PETS_ID["pet1"] = data["data"]["id"]
        test_helper.assert_response_structure(data, expected_status=1)

        pet_details = data["data"]
        test_helper.assert_pet_structure(pet_details)

        assert pet_details["name"] == pet_data["name"]
        assert pet_details["pet_type"] == pet_data["pet_type"]
        assert pet_details["breed"] == pet_data["breed"]
        assert pet_details["gender"] == pet_data["gender"]
        assert pet_details["current_weight_kg"] == pet_data["current_weight_kg"]

    @pytest.mark.asyncio
    async def test_get_accessible_pets(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting user's accessible pets after creating one"""
        # First create a pet
        pets2_data = self.PETS_INFO["pet2"]
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=pets2_data)
        self.PETS_ID["pet2"] = response.json()["data"]["id"]

        # Then get accessible pets
        response = await async_client.get("/pets/accessible", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == 1
        assert len(data["data"]) == 2
        assert any(pet["name"] == pets2_data["name"] for pet in data["data"])

    @pytest.mark.asyncio
    async def test_update_pet_information(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test updating pet information"""

        # Update pet information
        update_data = self.PETS_INFO["updated_pet1"]
        pet_id = self.PETS_ID["pet1"]

        response = await async_client.post(
            f"/pets/{pet_id}/update", headers=session_auth_headers_user1, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        updated_pet = data["data"]
        assert updated_pet["name"] == update_data["name"]
        assert updated_pet["current_weight_kg"] == 26.5
        assert "Weight increased after training" in updated_pet["notes"]

    @pytest.mark.asyncio
    async def test_get_pet_details(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting detailed pet information"""

        # Get pet details
        pet_data = self.PETS_INFO["pet2"]
        pet_id = self.PETS_ID["pet2"]
        response = await async_client.get(f"/pets/{pet_id}/details", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        pet_details = data["data"]
        assert pet_details["name"] == pet_data["name"]
        assert pet_details["pet_type"] == pet_data["pet_type"]
        assert pet_details["breed"] == pet_data["breed"]

    @pytest.mark.asyncio
    async def test_delete_pet(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test soft deleting a pet"""
        pet_id = self.PETS_ID["pet1"]
        # Delete the pet
        response = await async_client.post(f"/pets/{pet_id}/delete", headers=session_auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1


class TestPetGroupAssignment:
    """Test pet group assignment functionality"""

    @pytest.mark.asyncio
    async def test_assign_pet_to_group_workflow(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test complete pet group assignment workflow"""
        # Step 1: Create a group
        group_response = await async_client.post(
            "/groups/create", headers=session_auth_headers_user1, json={"name": "Pet Family Group"}
        )
        group_id = group_response.json()["data"]["id"]

        # Step 2: Create a pet
        pet_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Group Pet", "pet_type": "dog"}
        )
        pet_id = pet_response.json()["data"]["id"]

        # Step 3: Assign pet to group
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group", headers=session_auth_headers_user1, json={"group_id": group_id}
        )

        assert assign_response.status_code == 200
        assign_data = assign_response.json()["data"]
        assert assign_data["group_id"] == group_id
        assert assign_data["pet_name"] == "Group Pet"
        assert assign_data["group_name"] == "Pet Family Group"

        # Step 4: Check current group assignment
        current_group_response = await async_client.get(
            f"/pets/{pet_id}/current_group", headers=session_auth_headers_user1
        )

        assert current_group_response.status_code == 200
        current_group_data = current_group_response.json()["data"]
        assert current_group_data["group_id"] == group_id
        assert current_group_data["group_name"] == "Pet Family Group"


class TestPetErrorHandling:
    """Test error cases to ensure robustness"""

    PETS_INFO = {
        "invalid_pet": {
            "name": "",
            "pet_type": "invalid_type",
        },
    }

    @pytest.mark.asyncio
    async def test_create_pet_with_invalid_data(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test creating pet with invalid data"""
        invalid_pet_data = self.PETS_INFO["invalid_pet"]
        response = await async_client.post("/pets/create", headers=session_auth_headers_user1, json=invalid_pet_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_update_non_owned_pet(
        self, async_client: AsyncClient, session_auth_headers_user1, session_auth_headers_user2
    ):
        """Test that user cannot update pet they don't own"""
        # User1 creates a pet
        create_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "User1 Pet", "pet_type": "dog"}
        )
        pet_id = create_response.json()["data"]["id"]

        # User2 tries to update User1's pet
        response = await async_client.post(
            f"/pets/{pet_id}/update", headers=session_auth_headers_user2, json={"name": "Hacked Pet"}
        )

        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_nonexistent_pet_details(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test getting details of non-existent pet"""
        response = await async_client.get("/pets/nonexistent123/details", headers=session_auth_headers_user1)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_assign_pet_to_nonexistent_group(self, async_client: AsyncClient, session_auth_headers_user1):
        """Test assigning pet to non-existent group"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create", headers=session_auth_headers_user1, json={"name": "Lost Pet", "pet_type": "cat"}
        )
        pet_id = create_response.json()["data"]["id"]

        # Try to assign to non-existent group
        response = await async_client.post(
            f"/pets/{pet_id}/assign_group", headers=session_auth_headers_user1, json={"group_id": "nonexistent123"}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


# class TestCompletePetWorkflow:
#     """Test the complete pet management workflow from start to finish"""

#     @pytest.mark.asyncio
#     async def test_complete_pet_workflow(
#         self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2, test_user1, test_user2
#     ):
#         """Test the complete typical pet management scenario"""

#         print("=== Testing Complete Pet Management Workflow ===")

#         # Step 1: User1 creates a group for pet sharing
#         print("Step 1: Creating pet sharing group...")
#         group_response = await async_client.post(
#             "/groups/create", headers=auth_headers_user1, json={"name": "Pet Care Team"}
#         )
#         assert group_response.status_code == 200
#         group_data = group_response.json()["data"]
#         group_id = group_data["id"]
#         print(f"✓ Group created: {group_data['name']} (ID: {group_id})")

#         # Step 2: User1 creates a pet
#         print("Step 2: Creating pet...")
#         pet_data = {
#             "name": "Workflow Pet",
#             "pet_type": "dog",
#             "breed": "Labrador",
#             "gender": "female",
#             "current_weight_kg": 30.0,
#             "daily_calorie_target": 1200,
#             "notes": "Very energetic and friendly",
#         }

#         pet_response = await async_client.post("/pets/create", headers=auth_headers_user1, json=pet_data)
#         assert pet_response.status_code == 200
#         pet_details = pet_response.json()["data"]
#         pet_id = pet_details["id"]
#         print(f"✓ Pet created: {pet_details['name']} (ID: {pet_id})")

#         # Step 3: Upload a photo for the pet
#         print("Step 3: Uploading pet photo...")
#         fake_image = io.BytesIO(b"fake workflow pet photo content")
#         photo_response = await async_client.post(
#             f"/pets/{pet_id}/photo/upload",
#             headers={"Authorization": auth_headers_user1["Authorization"]},
#             files={"file": ("workflow_pet.jpg", fake_image, "image/jpeg")},
#         )
#         assert photo_response.status_code == 200
#         photo_data = photo_response.json()["data"]
#         print(f"✓ Photo uploaded: {photo_data['photo_url']}")

#         # Step 4: Assign pet to the group
#         print("Step 4: Assigning pet to group...")
#         assign_response = await async_client.post(
#             f"/pets/{pet_id}/assign_group", headers=auth_headers_user1, json={"group_id": group_id}
#         )
#         assert assign_response.status_code == 200
#         assign_data = assign_response.json()["data"]
#         print(f"✓ Pet assigned to group: {assign_data['group_name']}")

#         # Step 5: User2 joins the group to access the pet
#         print("Step 5: Adding User2 to the pet care group...")
#         invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)
#         invite_code = invite_response.json()["data"]["invite_code"]

#         join_response = await async_client.post(
#             "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
#         )
#         assert join_response.status_code == 200
#         print("✓ User2 joined the pet care group")

#         # Step 6: User2 can now see the pet in accessible pets
#         print("Step 6: Verifying User2 can access the pet...")
#         accessible_response = await async_client.get("/pets/accessible", headers=auth_headers_user2)
#         assert accessible_response.status_code == 200

#         accessible_pets = accessible_response.json()["data"]
#         workflow_pet = next((pet for pet in accessible_pets if pet["name"] == "Workflow Pet"), None)
#         assert workflow_pet is not None
#         assert workflow_pet["user_permission"] in ["member", "creator"]  # But has group access
#         print(f"✓ User2 can access pet with permission: {workflow_pet['user_permission']}")

#         # Step 7: Update pet information
#         print("Step 7: Updating pet information...")
#         update_response = await async_client.post(
#             f"/pets/{pet_id}/update",
#             headers=auth_headers_user1,
#             json={"current_weight_kg": 28.5, "notes": "Lost some weight during training"},
#         )
#         assert update_response.status_code == 200
#         updated_pet = update_response.json()["data"]
#         assert updated_pet["current_weight_kg"] == 28.5
#         print("✓ Pet information updated successfully")

#         # Step 8: Get complete pet details
#         print("Step 8: Retrieving complete pet details...")
#         details_response = await async_client.get(f"/pets/{pet_id}/details", headers=auth_headers_user1)
#         assert details_response.status_code == 200

#         complete_details = details_response.json()["data"]
#         assert complete_details["name"] == "Workflow Pet"
#         assert complete_details["current_weight_kg"] == 28.5
#         assert "Lost some weight during training" in complete_details["notes"]
#         print("✓ Complete pet details retrieved")

#         # Step 9: Verify group assignment
#         print("Step 9: Verifying group assignment...")
#         group_assignment_response = await async_client.get(
#         f"/pets/{pet_id}/current_group", headers=auth_headers_user1)
#         assert group_assignment_response.status_code == 200

#         assignment_info = group_assignment_response.json()["data"]
#         assert assignment_info["group_name"] == "Pet Care Team"
#         assert assignment_info["user_role_in_group"] == "creator"
#         print(f"✓ Pet assigned to: {assignment_info['group_name']}")

#         print("=== Complete Pet Management Workflow Test PASSED ===")
