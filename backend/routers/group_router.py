from typing import Annotated

from fastapi import APIRouter, Depends

from backend.models.group import CreateGroupRequest, JoinGroupRequest, RemoveMemberRequest, UpdateMemberRoleRequest
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["groups"])
group_service = GroupService()


# ================== Core Group Functions ==================


@router.post("/create", response_model=dict)
async def create_group(
    request: CreateGroupRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Create a new group for family pet care collaboration.
    The user creating the group automatically becomes a member.

    Body:
    - name: Group name (1-50 characters)

    Returns:
    - Group information with creator details
    """
    try:
        group_info = await group_service.create_group(request, current_user.id)
        return {"status": 1, "data": group_info.model_dump(), "message": "Group created successfully"}
    except Exception as e:
        raise e


@router.post("/{group_id}/invite", response_model=dict)
async def create_invitation(group_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Create an invitation code for someone to join the group.
    Any group member can create invitations.
    Invitations expire after 7 days.

    Returns:
    - Invitation information and shareable invite code
    """
    try:
        invitation_data = await group_service.create_invitation(group_id, current_user)
        return {"status": 1, "data": invitation_data, "message": "Invitation created successfully"}
    except Exception as e:
        raise e


@router.post("/join", response_model=dict)
async def join_group(request: JoinGroupRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Join a group using an invitation code.
    The invitation must be valid and not expired.
    User cannot already be a member of the group.

    Body:
    - invite_code: Valid invitation code

    Returns:
    - Information about the joined group
    """
    try:
        group_info = await group_service.join_group_by_code(request, current_user.id)
        return {"status": 1, "data": group_info.model_dump(), "message": "Successfully joined group"}
    except Exception as e:
        raise e


# ================== Helper Endpoints ==================


@router.get("/my_groups", response_model=dict)
async def get_my_groups(current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Get all groups where the current user is a member.
    Returns basic information about each group.

    Returns:
    - List of groups with member count and creator status
    """
    try:
        groups = await group_service.get_user_groups(current_user.id)
        return {"status": 1, "data": [group.model_dump() for group in groups], "message": f"Found {len(groups)} groups"}
    except Exception as e:
        raise e


@router.get("/{group_id}/members", response_model=dict)
async def get_group_members(group_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Get all members of a specific group.
    User must be a member of the group to view members.

    Returns:
    - List of group members with their user information
    """
    try:
        members = await group_service.get_group_members(group_id, current_user.id)
        return {
            "status": 1,
            "data": [member.model_dump() for member in members],
            "message": f"Found {len(members)} members",
        }
    except Exception as e:
        raise e


# ================== Permission Management Functions ==================


@router.post("/{group_id}/members/update_role", response_model=dict)
async def update_member_role(
    group_id: str, request: UpdateMemberRoleRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Update a member's role in the group.
    **Only group creators can perform this action.**

    **Permission Requirements:**
    - CREATOR: Can assign MEMBER, VIEWER roles to other members
    - MEMBER/VIEWER: Cannot assign roles

    **Restrictions:**
    - Cannot assign CREATOR role (only one creator per group)
    - Cannot change the creator's role

    Body:
    - user_id: Target user to update
    - new_role: New role to assign (member, viewer)
    """
    try:
        result = await group_service.update_member_role(group_id, request, current_user.id)
        return {"status": 1, "data": result, "message": "Role updated successfully"}
    except Exception as e:
        raise e


@router.post("/{group_id}/members/remove", response_model=dict)
async def remove_member(
    group_id: str, user_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Remove a member from the group.
    **Only group creators can perform this action.**

    **Permission Requirements:**
    - CREATOR: Can remove MEMBER, VIEWER roles
    - MEMBER/VIEWER: Cannot remove members

    **Restrictions:**
    - Cannot remove the group creator
    """
    try:
        result = await group_service.remove_member(group_id, RemoveMemberRequest(user_id=user_id), current_user.id)
        return {"status": 1, "data": result, "message": "Member removed successfully"}
    except Exception as e:
        raise e


# ================== Group Pet Management ==================


@router.get("/{group_id}/pets", response_model=dict)
async def get_group_pets(group_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Retrieves all pets assigned to a specific group.

    Authorization: Group membership required (any role: creator, member, or viewer)

    This endpoint enables group members to see all pets they can collaborate on
    within their shared care environment. It's perfect for:
    - Family members viewing all household pets
    - Care teams seeing their assigned pets
    - Group overview and coordination

    The response includes:
    - All pets currently assigned to the group
    - Pet owner information for each pet
    - User's permission level for each pet
    - Essential pet information for collaboration

    Permission context per pet:
    - "owner": User owns the pet (full permissions)
    - "creator": User created the group (management permissions)
    - "member": User is group member (care recording permissions)
    - "viewer": User is group viewer (read-only permissions)

    Returns:
    - List of pets in the group with owner and permission context
    - Each pet shows basic info needed for group collaboration
    - Permission indicators help UI show appropriate actions
    """
    try:
        pets = await group_service.get_group_pets(group_id, current_user.id)
        return {"status": 1, "data": pets, "message": f"Found {len(pets)} pets in group"}
    except Exception as e:
        raise e
