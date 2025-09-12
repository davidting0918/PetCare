"""
Simple group functionality tests following KISS principle
Tests basic group operations: create, join, view members
"""

import pytest
from httpx import AsyncClient


class TestGroupBasicFunctions:
    """Test basic group operations with simple scenarios"""

    @pytest.mark.asyncio
    async def test_create_group_success(self, async_client: AsyncClient, auth_headers_user1, test_helper):
        """Test creating a group - should be straightforward"""
        response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Test Family Group"}
        )

        assert response.status_code == 200
        data = response.json()
        test_helper.assert_response_structure(data, expected_status=1)

        group_data = data["data"]
        test_helper.assert_group_structure(group_data)

    @pytest.mark.asyncio
    async def test_get_my_groups(self, async_client: AsyncClient, auth_headers_user1):
        """Test getting user's groups after creating one"""
        # First create a group
        await async_client.post("/groups/create", headers=auth_headers_user1, json={"name": "My Test Group"})

        # Then get my groups
        response = await async_client.get("/groups/my_groups", headers=auth_headers_user1)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 1
        assert len(data["data"]) >= 1
        assert any(group["name"] == "My Test Group" for group in data["data"])

    @pytest.mark.asyncio
    async def test_create_invitation_and_join(self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2):
        """Test the complete invitation flow: create group -> create invite -> join group"""

        # Step 1: User1 creates a group
        create_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Invitation Test Group"}
        )
        group_data = create_response.json()["data"]
        group_id = group_data["id"]

        # Step 2: User1 creates an invitation
        invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)

        assert invite_response.status_code == 200
        invite_data = invite_response.json()["data"]
        invite_code = invite_data["invite_code"]
        assert len(invite_code) > 0

        # Step 3: User2 joins using the invite code
        join_response = await async_client.post(
            "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
        )

        assert join_response.status_code == 200
        join_data = join_response.json()["data"]
        assert join_data["name"] == "Invitation Test Group"
        assert join_data["member_count"] == 2
        assert join_data["is_creator"] is False  # User2 is not the creator

    @pytest.mark.asyncio
    async def test_view_group_members(self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2):
        """Test viewing group members after someone joins"""

        # Create group and join scenario
        create_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Members Test Group"}
        )
        group_id = create_response.json()["data"]["id"]

        # Create invite and join
        invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)
        invite_code = invite_response.json()["data"]["invite_code"]

        await async_client.post("/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code})

        # Now check members
        members_response = await async_client.get(f"/groups/{group_id}/members", headers=auth_headers_user1)

        assert members_response.status_code == 200
        members_data = members_response.json()["data"]
        assert len(members_data) == 2

        # Check that we have one creator and one member
        roles = [member["role"] for member in members_data]
        assert "creator" in roles
        assert "member" in roles


class TestGroupErrorHandling:
    """Test simple error cases to ensure robustness"""

    @pytest.mark.asyncio
    async def test_join_with_invalid_code(self, async_client: AsyncClient, auth_headers_user1):
        """Test joining with non-existent invite code"""
        response = await async_client.post(
            "/groups/join", headers=auth_headers_user1, json={"invite_code": "invalid-code-12345"}
        )

        assert response.status_code == 404
        assert "Invalid or expired invitation code" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_view_members_of_non_member_group(
        self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2
    ):
        """Test that non-members cannot view group members"""

        # User1 creates a group
        create_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Private Group"}
        )
        group_id = create_response.json()["data"]["id"]

        # User2 (non-member) tries to view members
        response = await async_client.get(f"/groups/{group_id}/members", headers=auth_headers_user2)

        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_group_with_empty_name(self, async_client: AsyncClient, auth_headers_user1):
        """Test creating group with invalid name"""
        response = await async_client.post("/groups/create", headers=auth_headers_user1, json={"name": ""})

        assert response.status_code == 422  # Validation error


class TestGroupLimits:
    """Test simple limits to prevent abuse"""

    @pytest.mark.asyncio
    async def test_cannot_join_same_group_twice(
        self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2
    ):
        """Test that user cannot join the same group multiple times"""

        # Create group and get invite code
        create_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Duplicate Join Test"}
        )
        group_id = create_response.json()["data"]["id"]

        invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)
        invite_code = invite_response.json()["data"]["invite_code"]

        # User2 joins successfully first time
        first_join = await async_client.post(
            "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
        )
        assert first_join.status_code == 200

        # User2 tries to join again with same code
        second_join = await async_client.post(
            "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
        )
        assert second_join.status_code == 404
        assert "Invalid or expired invitation code" in second_join.json()["detail"]


# Helper test to verify the basic workflow works end-to-end
class TestCompleteGroupWorkflow:
    """Test the complete group workflow from start to finish"""

    @pytest.mark.asyncio
    async def test_complete_group_workflow(
        self, async_client: AsyncClient, auth_headers_user1, auth_headers_user2, test_user1, test_user2
    ):
        """Test the complete typical group usage scenario"""

        print("=== Testing Complete Group Workflow ===")

        # 1. User1 creates a group
        print("Step 1: Creating group...")
        create_response = await async_client.post(
            "/groups/create", headers=auth_headers_user1, json={"name": "Complete Workflow Test"}
        )
        assert create_response.status_code == 200
        group_data = create_response.json()["data"]
        group_id = group_data["id"]
        print(f"✓ Group created: {group_data['name']} (ID: {group_id})")

        # 2. User1 creates an invitation
        print("Step 2: Creating invitation...")
        invite_response = await async_client.post(f"/groups/{group_id}/invite", headers=auth_headers_user1)
        assert invite_response.status_code == 200
        invite_code = invite_response.json()["data"]["invite_code"]
        print(f"✓ Invitation created: {invite_code}")

        # 3. User2 joins the group
        print("Step 3: User2 joining group...")
        join_response = await async_client.post(
            "/groups/join", headers=auth_headers_user2, json={"invite_code": invite_code}
        )
        assert join_response.status_code == 200
        print("✓ User2 joined successfully")

        # 4. Verify both users can see the group in their lists
        print("Step 4: Verifying group appears in both users' lists...")

        user1_groups = await async_client.get("/groups/my_groups", headers=auth_headers_user1)
        user2_groups = await async_client.get("/groups/my_groups", headers=auth_headers_user2)

        assert user1_groups.status_code == 200
        assert user2_groups.status_code == 200

        user1_group_names = [g["name"] for g in user1_groups.json()["data"]]
        user2_group_names = [g["name"] for g in user2_groups.json()["data"]]

        assert "Complete Workflow Test" in user1_group_names
        assert "Complete Workflow Test" in user2_group_names
        print("✓ Group visible to both users")

        # 5. Verify group member list
        print("Step 5: Checking group members...")
        members_response = await async_client.get(f"/groups/{group_id}/members", headers=auth_headers_user1)
        assert members_response.status_code == 200

        members = members_response.json()["data"]
        assert len(members) == 2

        roles = {member["role"]: member["user_name"] for member in members}
        assert "creator" in roles
        assert "member" in roles
        print(f"✓ Group has 2 members: Creator({roles['creator']}) and Member({roles['member']})")

        # 6. Change the user2 to the viewer
        print("Step 6: Changing user2 to viewer...")
        change_role_response = await async_client.post(
            f"/groups/{group_id}/update_role",
            headers=auth_headers_user1,
            json={"user_id": test_user2["id"], "new_role": "viewer"},
        )
        assert change_role_response.status_code == 200
        change_role_data = change_role_response.json()["data"]
        assert change_role_data["user_id"] == test_user2["id"]
        assert change_role_data["new_role"] == "viewer"
        assert change_role_data["updated_by"] == test_user1["id"]
        print("✓ User2 changed to viewer")

        # 7. Remove user2 from the group
        print("Step 7: Removing user2 from the group...")
        remove_response = await async_client.post(
            f"/groups/{group_id}/remove", headers=auth_headers_user1, json={"user_id": test_user2["id"]}
        )
        assert remove_response.status_code == 200

        remove_data = remove_response.json()["data"]
        assert remove_data["removed_group_id"] == group_id
        assert remove_data["removed_user_id"] == test_user2["id"]
        assert remove_data["removed_by"] == test_user1["id"]
        assert remove_data["updated_at"] is not None
        print("✓ User2 removed from the group")

        print("=== Complete Workflow Test PASSED ===")
