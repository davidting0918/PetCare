from enum import Enum
from typing import Optional, Set

from pydantic import BaseModel, Field

# Database collections
group_collection = "groups"
group_invitation_collection = "group_invitations"
group_member_collection = "group_members"


class GroupRole(str, Enum):
    """Enhanced group member roles with granular permissions"""

    CREATOR = "creator"  # Group creator with full permissions (manage members, edit group, delete group)
    MEMBER = "member"  # Can view and interact with group content, invite new members
    VIEWER = "viewer"  # Read-only access to group content (cannot invite or modify)


class InvitationStatus(str, Enum):
    """Group invitation status"""

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


# ================== Core Models ==================


class GroupMember(BaseModel):
    """
    Enhanced group membership model with granular permissions.
    Uses (group_id, user_id) as natural composite primary key.
    """

    group_id: str  # Group this membership belongs to
    user_id: str  # User who is a member
    role: GroupRole = GroupRole.MEMBER  # Member's role in the group
    created_at: int
    updated_at: int  # Timestamp when user joined the group
    invited_by: Optional[str] = None  # User ID who invited this member
    is_active: bool = True  # Whether membership is active

    class Config:
        # Create compound index for efficient queries
        indexes = [
            ("group_id", "user_id"),  # Composite primary key and fast lookup
            ("user_id", "is_active"),  # Fast lookup of user's active memberships
            ("group_id", "role"),  # Fast role-based queries
        ]


class Group(BaseModel):
    """
    Enhanced Group model using dedicated GroupMember relationships.
    Members are now managed through the GroupMember collection for better flexibility.
    """

    id: str
    name: str = Field(..., min_length=1, max_length=50)
    creator_id: str
    created_at: int
    updated_at: int
    is_active: bool = True


class GroupInvitation(BaseModel):
    """
    Simplified invitation system for joining groups.
    """

    id: str
    group_id: str
    invited_by: str  # User ID who sent invitation
    invite_code: str  # Unique code for joining
    status: InvitationStatus = InvitationStatus.PENDING
    created_at: int
    expires_at: int  # Invitations expire after 7 days
    accepted_at: Optional[int] = None
    accepted_by: Optional[str] = None  # User ID who accepted


# ================== Request Models ==================


class CreateGroupRequest(BaseModel):
    """Request to create a new group"""

    name: str = Field(..., min_length=1, max_length=50)


class JoinGroupRequest(BaseModel):
    """Request to join a group using invite code"""

    invite_code: str


class UpdateMemberRoleRequest(BaseModel):
    """Request to update a member's role in the group"""

    user_id: str
    new_role: GroupRole


class RemoveMemberRequest(BaseModel):
    """Request to remove a member from the group"""

    user_id: str


# ================== Response Models ==================


class GroupInfo(BaseModel):
    """Basic group information for members"""

    id: str
    name: str
    creator_id: str
    created_at: int
    updated_at: int
    member_count: int
    is_creator: bool  # True if current user is the creator
    is_active: bool


class GroupMemberInfo(BaseModel):
    """Enhanced group member information with user details and membership data"""

    user_id: str
    user_name: str
    user_email: str
    role: GroupRole
    created_at: int  # When the user joined the group
    invited_by: Optional[str] = None  # Who invited this user (user_id)
    invited_by_name: Optional[str] = None  # Name of the person who invited (for display)
    is_active: bool = True


class InvitationInfo(BaseModel):
    """Invitation information"""

    id: str
    group_name: str
    invited_by_name: str
    invite_code: str
    created_at: int
    expires_at: int


# ================== Permission Management ==================


class GroupPermission:
    """
    Centralized permission management for group roles.
    Defines what each role can and cannot do within a group.
    """

    # Define permissions as sets for efficient lookup
    CREATOR_PERMISSIONS = {
        "view_group",
        "edit_group",
        "delete_group",
        "view_members",
        "invite_members",
        "remove_members",
        "change_member_roles",
        "create_invitations",
        "delete_invitations",
        "manage_group_content",
        "view_group_content",
    }

    MEMBER_PERMISSIONS = {
        "view_group",
        "view_members",
        "invite_members",  # Can invite but cannot remove
        "create_invitations",
        "manage_group_content",
        "view_group_content",
    }

    VIEWER_PERMISSIONS = {"view_group", "view_members", "view_group_content"}  # Can only view, cannot invite or manage

    @classmethod
    def get_permissions(cls, role: GroupRole) -> Set[str]:
        """Get all permissions for a given role"""
        permission_map = {
            GroupRole.CREATOR: cls.CREATOR_PERMISSIONS,
            GroupRole.MEMBER: cls.MEMBER_PERMISSIONS,
            GroupRole.VIEWER: cls.VIEWER_PERMISSIONS,
        }
        return permission_map.get(role, set())

    @classmethod
    def can_perform(cls, role: GroupRole, permission: str) -> bool:
        """Check if a role has a specific permission"""
        return permission in cls.get_permissions(role)

    @classmethod
    def can_manage_member(cls, actor_role: GroupRole, target_role: GroupRole) -> bool:
        """Check if actor can manage (remove/change role of) target member"""
        # CREATOR can manage everyone except other CREATORs
        if actor_role == GroupRole.CREATOR:
            return target_role != GroupRole.CREATOR

        # MEMBER and VIEWER cannot manage anyone
        return False

    @classmethod
    def can_assign_role(cls, actor_role: GroupRole, target_role: GroupRole) -> bool:
        """Check if actor can assign a specific role to members"""
        # CREATOR can assign any role except CREATOR (only one creator per group)
        if actor_role == GroupRole.CREATOR:
            return target_role != GroupRole.CREATOR

        # MEMBER and VIEWER cannot assign roles
        return False
