from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

# Database collections
group_collection = "groups"
group_invitation_collection = "group_invitations"

class GroupRole(str, Enum):
    """Simplified group member roles"""
    CREATOR = "creator"  # Group creator with full permissions
    MEMBER = "member"    # Regular group member

class InvitationStatus(str, Enum):
    """Group invitation status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

# ================== Core Models ==================

class Group(BaseModel):
    """
    Ultra-simplified Group model using member lists.
    Members are stored as a list of user IDs for maximum simplicity.
    """
    id: str
    name: str = Field(..., min_length=1, max_length=50)
    creator_id: str
    member_ids: List[str] = Field(default_factory=list)  # List of user IDs who are members
    created_at: int
    updated_at: int
    is_active: bool = True
    
    @property
    def member_count(self) -> int:
        """Calculate member count from the member list"""
        return len(self.member_ids)

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

# ================== Response Models ==================

class GroupInfo(BaseModel):
    """Basic group information for members"""
    id: str
    name: str
    creator_id: str
    created_at: int
    member_count: int
    is_creator: bool  # True if current user is the creator

class GroupMemberInfo(BaseModel):
    """Group member information with user details"""
    user_id: str
    user_name: str
    user_email: str
    role: GroupRole  # creator or member

class InvitationInfo(BaseModel):
    """Invitation information"""
    id: str
    group_name: str
    invited_by_name: str
    invite_code: str
    created_at: int
    expires_at: int
