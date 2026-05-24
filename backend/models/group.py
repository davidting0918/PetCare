"""Group sharing model — the PetCare-specific multi-user collaboration layer.

A `Group` is a household / care-team boundary. Pets, foods, meals, weights,
medications, and treatment courses are all `group_id`-scoped, so adding a user
to a group lets them see and (depending on role) write to that group's records.

Roles:
  - CREATOR — the user who created the group. Manages membership + can delete
    the group. Exactly one per group; cannot be reassigned.
  - MEMBER  — full read/write to all group content; can invite other members.
  - VIEWER  — read-only.

Every user gets a `personal_group_id` auto-created on first login (see
`AuthService._ensure_personal_group`). That group's `name` defaults to the
user's name and they are its sole CREATOR.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# Table name constants (module-level so SQL strings can interpolate without
# scattering string literals).
group_table = "groups"
group_member_table = "group_members"
group_invitation_table = "group_invitations"


class GroupRole(str, Enum):
    CREATOR = "creator"
    MEMBER = "member"
    VIEWER = "viewer"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


# ────── Stored row shapes ──────


class Group(BaseModel):
    id: str
    name: str
    creator_id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class GroupMember(BaseModel):
    id: int
    group_id: str
    user_id: str
    role: GroupRole
    invited_by: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class GroupInvitation(BaseModel):
    id: str
    group_id: str
    invited_by: str
    invite_code: str
    status: InvitationStatus
    role: GroupRole
    accepted_by: str | None = None
    expires_at: datetime
    created_at: datetime
    updated_at: datetime


# ────── Request DTOs ──────


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class DeleteGroupRequest(BaseModel):
    group_id: str


class CreateInvitationRequest(BaseModel):
    """Generate an invite code with the given default role."""

    group_id: str
    role: GroupRole = GroupRole.MEMBER


class InvitationPreviewQuery(BaseModel):
    """Used internally — the router exposes invite_code as a query string."""

    invite_code: str


class JoinGroupRequest(BaseModel):
    invite_code: str


class UpdateMemberRoleRequest(BaseModel):
    group_id: str
    user_id: str
    new_role: GroupRole


class RemoveMemberRequest(BaseModel):
    group_id: str
    user_id: str


# ────── Response DTOs ──────


class GroupSummary(BaseModel):
    """Lightweight summary returned by list endpoints — includes the current
    user's role + cached member_count so clients don't need a second roundtrip.
    """

    id: str
    name: str
    creator_id: str
    member_count: int
    role: GroupRole  # current user's role in this group
    is_personal: bool  # True iff this is the user's personal_group_id
    created_at: datetime
    updated_at: datetime


class MemberSummary(BaseModel):
    """Member shown in /group/members. Joined with `users` for display fields."""

    user_id: str
    name: str
    email: str
    picture: str | None = None
    role: GroupRole
    invited_by: str | None = None
    invited_by_name: str | None = None
    joined_at: datetime


class InvitationPreview(BaseModel):
    """Shown to the invitee BEFORE they accept."""

    id: str
    group_id: str
    group_name: str
    invited_by_name: str
    invite_code: str
    role: GroupRole
    expires_at: datetime
    created_at: datetime


class InvitationCreated(BaseModel):
    """Returned to the inviter after generating an invite code."""

    id: str
    group_id: str
    group_name: str
    invite_code: str
    role: GroupRole
    expires_at: datetime
    share_message: str


class GroupPet(BaseModel):
    """Pet entry inside /group/pets — flattened owner info + permission tag."""

    id: str
    name: str
    pet_type: str
    breed: str | None = None
    gender: str
    current_weight_kg: float | None = None
    target_weight_kg: float | None = None
    daily_calorie_target: int | None = None
    photo_url: str | None = None
    owner_id: str
    owner_name: str
    user_permission: str  # one of: owner | creator | member | viewer
    created_at: datetime
    updated_at: datetime
