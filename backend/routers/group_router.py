from typing import Annotated

from fastapi import APIRouter, Depends

from backend.services.auth_service import get_current_user
from backend.models.user import UserInfo
from backend.services.group_service import GroupService
from backend.models.group import (
    CreateGroupRequest, JoinGroupRequest,
    GroupInfo, GroupMemberInfo
)

router = APIRouter(prefix="/groups", tags=["groups"])
group_service = GroupService()


# ================== Core Group Functions ==================

@router.post("/", response_model=dict)
async def create_group(
    request: CreateGroupRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Create a new group for family pet care collaboration.
    The user creating the group automatically becomes a member.
    
    Body:
    - name: Group name (1-50 characters)
    
    Returns:
    - Group information with creator details
    
    Example:
    POST /groups
    {
        "name": "Smith Family Pets"
    }
    """
    try:
        group_info = await group_service.create_group(request, current_user.id)
        return {
            "status": 1,
            "data": group_info.model_dump(),
            "message": "Group created successfully"
        }
    except Exception as e:
        raise e


@router.post("/{group_id}/invitations", response_model=dict)
async def create_invitation(
    group_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Create an invitation code for someone to join the group.
    Any group member can create invitations.
    Invitations expire after 7 days.
    
    Returns:
    - Invitation information and shareable invite code
    
    Example:
    POST /groups/abc123/invitations
    Response:
    {
        "status": 1,
        "data": {
            "invitation": {...},
            "invite_code": "xyz789",
            "share_message": "Join my pet care group 'Smith Family Pets' with code: xyz789"
        }
    }
    """
    try:
        invitation_data = await group_service.create_invitation(group_id, current_user.id)
        return {
            "status": 1,
            "data": invitation_data,
            "message": "Invitation created successfully"
        }
    except Exception as e:
        raise e


@router.post("/join", response_model=dict)
async def join_group(
    request: JoinGroupRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Join a group using an invitation code.
    The invitation must be valid and not expired.
    User cannot already be a member of the group.
    
    Body:
    - invite_code: Valid invitation code
    
    Returns:
    - Information about the joined group
    
    Example:
    POST /groups/join
    {
        "invite_code": "xyz789"
    }
    """
    try:
        group_info = await group_service.join_group_by_code(request, current_user.id)
        return {
            "status": 1,
            "data": group_info.model_dump(),
            "message": "Successfully joined group"
        }
    except Exception as e:
        raise e


# ================== Helper Endpoints ==================

@router.get("/", response_model=dict)
async def get_my_groups(
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Get all groups where the current user is a member.
    Returns basic information about each group.
    
    Returns:
    - List of groups with member count and creator status
    
    Example response:
    {
        "status": 1,
        "data": [
            {
                "id": "abc123",
                "name": "Smith Family Pets",
                "creator_id": "user456",
                "created_at": 1640995200,
                "member_count": 3,
                "is_creator": true
            }
        ],
        "message": "Found 1 groups"
    }
    """
    try:
        groups = await group_service.get_user_groups(current_user.id)
        return {
            "status": 1,
            "data": [group.model_dump() for group in groups],
            "message": f"Found {len(groups)} groups"
        }
    except Exception as e:
        raise e


@router.get("/{group_id}/members", response_model=dict)
async def get_group_members(
    group_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Get all members of a specific group.
    User must be a member of the group to view members.
    
    Returns:
    - List of group members with their user information
    
    Example response:
    {
        "status": 1,
        "data": [
            {
                "user_id": "user123",
                "user_name": "John Smith",
                "user_email": "john@example.com",
                "joined_at": 1640995200
            }
        ],
        "message": "Found 3 members"
    }
    """
    try:
        members = await group_service.get_group_members(group_id, current_user.id)
        return {
            "status": 1,
            "data": [member.model_dump() for member in members],
            "message": f"Found {len(members)} members"
        }
    except Exception as e:
        raise e
