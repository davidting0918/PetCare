"""
Simple pet functionality tests following KISS principle
Tests basic pet operations: create, update, delete, group assignment, photo management
"""

import io

import pytest
from httpx import AsyncClient


class TestPetBasicFunctions:
    """Test basic pet operations with simple scenarios"""

    @pytest.mark.asyncio
    async def test_create_pet_success(self, async_client: AsyncClient, auth_headers_user1, test_helper):
        """Test creating a pet - should be straightforward"""
        pet_data = {
            "name": "Buddy",
            "pet_type": "dog",
            "breed": "Golden Retriever",
            "gender": "male",
            "current_weight_kg": 25.5,
            "notes": "Very friendly dog",
        }

        response = await async_client.post("/pets/create", headers=auth_headers_user1, json=pet_data)

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        pet_details = data["data"]
        test_helper.assert_pet_structure(pet_details)

        assert pet_details["name"] == "Buddy"
        assert pet_details["pet_type"] == "dog"
        assert pet_details["breed"] == "Golden Retriever"
        assert pet_details["gender"] == "male"
        assert pet_details["current_weight_kg"] == 25.5
        return pet_details

    @pytest.mark.asyncio
    async def test_get_accessible_pets(self, async_client: AsyncClient, auth_headers_user1):
        """Test getting user's accessible pets after creating one"""
        # First create a pet
        await async_client.post("/pets/create", headers=auth_headers_user1, json={"name": "Fluffy", "pet_type": "cat"})

        # Then get accessible pets
        response = await async_client.get("/pets/accessible", headers=auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert len(data["data"]) >= 1
        assert any(pet["name"] == "Fluffy" for pet in data["data"])

    @pytest.mark.asyncio
    async def test_update_pet_information(self, async_client: AsyncClient, auth_headers_user1):
        """Test updating pet information"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create",
            headers=auth_headers_user1,
            json={"name": "Rex", "pet_type": "dog", "current_weight_kg": 20.0},
        )
        pet_id = create_response.json()["data"]["id"]

        # Update pet information
        update_data = {"name": "Rex Updated", "current_weight_kg": 22.5, "notes": "Weight increased after training"}

        response = await async_client.post(f"/pets/{pet_id}/update", headers=auth_headers_user1, json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        updated_pet = data["data"]
        assert updated_pet["name"] == "Rex Updated"
        assert updated_pet["current_weight_kg"] == 22.5
        assert "Weight increased after training" in updated_pet["notes"]

    @pytest.mark.asyncio
    async def test_get_pet_details(self, async_client: AsyncClient, auth_headers_user1):
        """Test getting detailed pet information"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "Whiskers", "pet_type": "cat", "breed": "Persian"}
        )
        pet_id = create_response.json()["data"]["id"]

        # Get pet details
        response = await async_client.get(f"/pets/{pet_id}/details", headers=auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        pet_details = data["data"]
        assert pet_details["name"] == "Whiskers"
        assert pet_details["pet_type"] == "cat"
        assert pet_details["breed"] == "Persian"
        assert pet_details["is_owned_by_user"] is True

    @pytest.mark.asyncio
    async def test_delete_pet(self, async_client: AsyncClient, auth_headers_user1):
        """Test soft deleting a pet"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "Temporary Pet", "pet_type": "hamster"}
        )
        pet_id = create_response.json()["data"]["id"]

        # Delete the pet
        response = await async_client.post(f"/pets/{pet_id}/delete", headers=auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1


class TestPetGroupAssignment:
    """Test pet group assignment functionality"""

    @pytest.mark.asyncio
    async def test_assign_pet_to_group_workflow(self, async_client: AsyncClient, auth_headers_user1):
        """Test complete pet group assignment workflow"""
        # Step 1: Create a group
        group_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Pet Family Group"}
        )
        group_id = group_response.json()["data"]["id"]

        # Step 2: Create a pet
        pet_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "Group Pet", "pet_type": "dog"}
        )
        pet_id = pet_response.json()["data"]["id"]

        # Step 3: Assign pet to group
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group", headers=auth_headers_user1, json={"group_id": group_id}
        )

        assert assign_response.status_code == 200
        assign_data = assign_response.json()["data"]
        assert assign_data["group_id"] == group_id
        assert assign_data["pet_name"] == "Group Pet"
        assert assign_data["group_name"] == "Pet Family Group"

        # Step 4: Check current group assignment
        current_group_response = await async_client.get(f"/pets/{pet_id}/current_group", headers=auth_headers_user1)

        assert current_group_response.status_code == 200
        current_group_data = current_group_response.json()["data"]
        assert current_group_data["group_id"] == group_id
        assert current_group_data["group_name"] == "Pet Family Group"


class TestPetPhotoManagement:
    """Test pet photo upload and management"""

    @pytest.mark.asyncio
    async def test_upload_pet_photo(self, async_client: AsyncClient, auth_headers_user1):
        """Test uploading a pet photo"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "Photo Pet", "pet_type": "cat"}
        )
        pet_id = create_response.json()["data"]["id"]

        # Create a fake image file
        fake_image = io.BytesIO(b"fake image content for testing")
        fake_image.name = "test_pet.jpg"

        # Upload photo
        response = await async_client.post(
            f"/pets/{pet_id}/photo/upload",
            headers={"Authorization": auth_headers_user1["Authorization"]},
            files={"file": ("test_pet.jpg", fake_image, "image/jpeg")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1

        photo_info = data["data"]
        assert photo_info["pet_id"] == pet_id
        assert photo_info["content_type"] == "image/jpeg"
        assert "photo_url" in photo_info
        assert photo_info["photo_url"].startswith("/static/pet_photos/")


class TestPetErrorHandling:
    """Test error cases to ensure robustness"""

    @pytest.mark.asyncio
    async def test_create_pet_with_invalid_data(self, async_client: AsyncClient, auth_headers_user1):
        """Test creating pet with invalid data"""
        response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "", "pet_type": "invalid_type"}
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_update_non_owned_pet(self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2):
        """Test that user cannot update pet they don't own"""
        # User1 creates a pet
        create_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "User1 Pet", "pet_type": "dog"}
        )
        pet_id = create_response.json()["data"]["id"]

        # User2 tries to update User1's pet
        response = await async_client.post(
            f"/pets/{pet_id}/update", headers=auth_headers_user2, json={"name": "Hacked Pet"}
        )

        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_nonexistent_pet_details(self, async_client: AsyncClient, auth_headers_user1):
        """Test getting details of non-existent pet"""
        response = await async_client.get("/pets/nonexistent123/details", headers=auth_headers_user1)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_assign_pet_to_nonexistent_group(self, async_client: AsyncClient, auth_headers_user1):
        """Test assigning pet to non-existent group"""
        # Create a pet first
        create_response = await async_client.post(
            "/pets/create", headers=auth_headers_user1, json={"name": "Lost Pet", "pet_type": "cat"}
        )
        pet_id = create_response.json()["data"]["id"]

        # Try to assign to non-existent group
        response = await async_client.post(
            f"/pets/{pet_id}/assign_group", headers=auth_headers_user1, json={"group_id": "nonexistent123"}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCompletePetWorkflow:
    """Test the complete pet management workflow from start to finish"""

    @pytest.mark.asyncio
    async def test_complete_pet_workflow(
        self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2, test_user1, test_user2
    ):
        """Test the complete typical pet management scenario"""

        print("=== Testing Complete Pet Management Workflow ===")

        # Step 1: User1 creates a group for pet sharing
        print("Step 1: Creating pet sharing group...")
        group_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Pet Care Team"}
        )
        assert group_response.status_code == 200
        group_data = group_response.json()["data"]
        group_id = group_data["id"]
        print(f"✓ Group created: {group_data['name']} (ID: {group_id})")

        # Step 2: User1 creates a pet
        print("Step 2: Creating pet...")
        pet_data = {
            "name": "Workflow Pet",
            "pet_type": "dog",
            "breed": "Labrador",
            "gender": "female",
            "current_weight_kg": 30.0,
            "daily_calorie_target": 1200,
            "notes": "Very energetic and friendly",
        }

        pet_response = await async_client.post("/pets/create", headers=auth_headers_user1, json=pet_data)
        assert pet_response.status_code == 200
        pet_details = pet_response.json()["data"]
        pet_id = pet_details["id"]
        print(f"✓ Pet created: {pet_details['name']} (ID: {pet_id})")

        # Step 3: Upload a photo for the pet
        print("Step 3: Uploading pet photo...")
        fake_image = io.BytesIO(b"fake workflow pet photo content")
        photo_response = await async_client.post(
            f"/pets/{pet_id}/photo/upload",
            headers={"Authorization": auth_headers_user1["Authorization"]},
            files={"file": ("workflow_pet.jpg", fake_image, "image/jpeg")},
        )
        assert photo_response.status_code == 200
        photo_data = photo_response.json()["data"]
        print(f"✓ Photo uploaded: {photo_data['photo_url']}")

        # Step 4: Assign pet to the group
        print("Step 4: Assigning pet to group...")
        assign_response = await async_client.post(
            f"/pets/{pet_id}/assign_group", headers=auth_headers_user1, json={"group_id": group_id}
        )
        assert assign_response.status_code == 200
        assign_data = assign_response.json()["data"]
        print(f"✓ Pet assigned to group: {assign_data['group_name']}")

        # Step 5: User2 joins the group to access the pet
        print("Step 5: Adding User2 to the pet care group...")
        invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)
        invite_code = invite_response.json()["data"]["invite_code"]

        join_response = await async_client.post(
            "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
        )
        assert join_response.status_code == 200
        print("✓ User2 joined the pet care group")

        # Step 6: User2 can now see the pet in accessible pets
        print("Step 6: Verifying User2 can access the pet...")
        accessible_response = await async_client.get("/pets/accessible", headers=auth_headers_user2)
        assert accessible_response.status_code == 200

        accessible_pets = accessible_response.json()["data"]
        workflow_pet = next((pet for pet in accessible_pets if pet["name"] == "Workflow Pet"), None)
        assert workflow_pet is not None
        assert workflow_pet["is_owned_by_user"] is False  # User2 doesn't own it
        assert workflow_pet["user_permission"] in ["member", "creator"]  # But has group access
        print(f"✓ User2 can access pet with permission: {workflow_pet['user_permission']}")

        # Step 7: Update pet information
        print("Step 7: Updating pet information...")
        update_response = await async_client.post(
            f"/pets/{pet_id}/update",
            headers=auth_headers_user1,
            json={"current_weight_kg": 28.5, "notes": "Lost some weight during training"},
        )
        assert update_response.status_code == 200
        updated_pet = update_response.json()["data"]
        assert updated_pet["current_weight_kg"] == 28.5
        print("✓ Pet information updated successfully")

        # Step 8: Get complete pet details
        print("Step 8: Retrieving complete pet details...")
        details_response = await async_client.get(f"/pets/{pet_id}/details", headers=auth_headers_user1)
        assert details_response.status_code == 200

        complete_details = details_response.json()["data"]
        assert complete_details["name"] == "Workflow Pet"
        assert complete_details["current_weight_kg"] == 28.5
        assert "Lost some weight during training" in complete_details["notes"]
        print("✓ Complete pet details retrieved")

        # Step 9: Verify group assignment
        print("Step 9: Verifying group assignment...")
        group_assignment_response = await async_client.get(f"/pets/{pet_id}/current_group", headers=auth_headers_user1)
        assert group_assignment_response.status_code == 200

        assignment_info = group_assignment_response.json()["data"]
        assert assignment_info["group_name"] == "Pet Care Team"
        assert assignment_info["user_role_in_group"] == "creator"
        print(f"✓ Pet assigned to: {assignment_info['group_name']}")

        print("=== Complete Pet Management Workflow Test PASSED ===")
