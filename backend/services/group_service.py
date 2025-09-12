import random
import secrets
import string
from datetime import datetime as dt
from datetime import timedelta as td
from datetime import timezone as tz
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from backend.core.database import MongoAsyncClient
from backend.models.group import (  # Collections; Models; Request Models; Response Models
    CreateGroupRequest,
    Group,
    GroupInfo,
    GroupInvitation,
    GroupMember,
    GroupMemberInfo,
    GroupPermission,
    GroupRole,
    InvitationInfo,
    InvitationStatus,
    JoinGroupRequest,
    RemoveMemberRequest,
    UpdateMemberRoleRequest,
    group_collection,
    group_invitation_collection,
    group_member_collection,
)
from backend.models.pet import pet_collection
from backend.models.user import UserInfo, user_collection


class GroupService:
    """
    Enhanced GroupService using dedicated GroupMember relationships.
    Provides simple permission control with CREATOR, MEMBER, and VIEWER roles.

    Permission Model:
    - CREATOR: Full control (create invitations, update roles, remove members)
    - MEMBER: Can view group, create invitations, participate
    - VIEWER: Read-only access to group content

    Core functions:
    1. create_group - Create a new group with creator membership
    2. create_invitation - Generate invite codes for joining (any member)
    3. join_group_by_code - Join group using invite code
    4. update_member_role - Update member permissions (CREATOR only)
    5. remove_member - Remove members from group (CREATOR only)
    """

    def __init__(self):
        self.db = MongoAsyncClient()

    @staticmethod
    def _generate_invitation_id() -> str:
        """
        use 10 digits current timestamp + 3 digit random number
        """
        return str(int(dt.now(tz.utc).timestamp())) + str(random.randint(100, 999))

    @staticmethod
    def _generate_group_id() -> str:
        """
        Generate a unique 8-character group ID using lowercase letters and digits.
        This provides 36^8 ≈ 2.8 trillion possible combinations with minimal collision risk.

        Returns:
            str: 8-character group ID (e.g., 'a5b2c9x1')
        """
        alphabet = string.ascii_lowercase + string.digits  # a-z, 0-9 (36 characters)
        return "".join(secrets.choice(alphabet) for _ in range(8))

    async def _get_user_membership(self, group_id: str, user_id: str) -> Optional[GroupMember]:
        """Get user's membership info if they are a member of the group"""
        membership_dict = await self.db.find_one(
            group_member_collection, {"group_id": group_id, "user_id": user_id, "is_active": True}
        )
        return GroupMember(**membership_dict) if membership_dict else None

    async def _is_group_member(self, group_id: str, user_id: str) -> bool:
        """Check if user is a member of the group"""
        membership = await self._get_user_membership(group_id, user_id)
        return membership is not None

    async def _check_permission(self, group_id: str, user_id: str, permission: str) -> bool:
        """Check if user has specific permission in the group"""
        membership = await self._get_user_membership(group_id, user_id)
        if not membership:
            return False
        return GroupPermission.can_perform(membership.role, permission)

    async def _add_user_to_group(
        self, group_id: str, user_id: str, role: GroupRole = GroupRole.MEMBER, invited_by: Optional[str] = None
    ):
        """
        Atomically add user to group by creating a GroupMember record.
        This replaces the old dual-list update system with a dedicated membership system.
        """
        # Check if membership already exists (avoid duplicates)
        existing_membership = await self._get_user_membership(group_id, user_id)
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this group"
            )

        # Create new membership record
        membership = GroupMember(
            group_id=group_id,
            user_id=user_id,
            role=role,
            created_at=int(dt.now(tz.utc).timestamp()),
            updated_at=int(dt.now(tz.utc).timestamp()),
            invited_by=invited_by,
            is_active=True,
        )

        # Insert membership record
        await self.db.insert_one(group_member_collection, membership.model_dump())

    # ================== Permission Management Functions (CREATOR Only) ==================

    async def update_member_role(
        self, group_id: str, request: UpdateMemberRoleRequest, actor_user_id: str
    ) -> Dict[str, Any]:
        """
        Update a member's role in the group (CREATOR only).

        Args:
            group_id: Target group ID
            request: Role update request (user_id, new_role)
            actor_user_id: User performing the action (must be CREATOR)

        Returns:
            dict: Success message with updated member info
        """
        # Get actor's membership - only CREATOR can update roles
        actor_membership = await self._get_user_membership(group_id, actor_user_id)
        if not actor_membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")

        # Simple permission check: Only CREATOR can update member roles
        if actor_membership.role != GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only group creators can change member roles"
            )

        # Get target member's current membership
        target_membership = await self._get_user_membership(group_id, request.user_id)
        if not target_membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Target user is not a member of this group"
            )

        # Prevent assigning CREATOR role (only one creator per group)
        if request.new_role == GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign CREATOR role - only one creator per group",
            )

        # Prevent changing creator's role
        if target_membership.role == GroupRole.CREATOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the creator's role")

        current_time = int(dt.now(tz.utc).timestamp())
        # Update the member's role
        await self.db.update_one(
            group_member_collection,
            {"group_id": group_id, "user_id": request.user_id, "is_active": True},
            {"role": request.new_role.value, "updated_at": current_time},
        )

        return {
            "user_id": request.user_id,
            "new_role": request.new_role.value,
            "updated_by": actor_user_id,
            "updated_at": current_time,
        }

    async def remove_member(self, group_id: str, request: RemoveMemberRequest, actor_user_id: str) -> Dict[str, Any]:
        """
        Remove a member from the group (CREATOR only).

        Args:
            group_id: Target group ID
            request: Member removal request (user_id)
            actor_user_id: User performing the action (must be CREATOR)

        Returns:
            dict: Success message
        """
        # Get actor's membership - only CREATOR can remove members
        actor_membership = await self._get_user_membership(group_id, actor_user_id)
        if not actor_membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")

        # Simple permission check: Only CREATOR can remove members
        if actor_membership.role != GroupRole.CREATOR:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group creators can remove members")

        # Get target member's current membership
        target_membership = await self._get_user_membership(group_id, request.user_id)
        if not target_membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Target user is not a member of this group"
            )

        # Prevent removing the group creator (creator cannot remove themselves)
        if target_membership.role == GroupRole.CREATOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the group creator")

        current_timestamp = int(dt.now(tz.utc).timestamp())
        # Deactivate the membership
        await self.db.update_one(
            group_member_collection,
            {"group_id": group_id, "user_id": request.user_id, "is_active": True},
            {"is_active": False, "updated_at": int(dt.now(tz.utc).timestamp())},
        )

        return {
            "removed_group_id": group_id,
            "removed_user_id": request.user_id,
            "removed_by": actor_user_id,
            "updated_at": current_timestamp,
        }

    # ================== Core Functions ==================

    async def create_group(self, request: CreateGroupRequest, creator_id: str) -> GroupInfo:
        """
        Create a new group with the creator as the first member.

        Args:
            request: Group creation details (name)
            creator_id: User ID of the group creator

        Returns:
            GroupInfo: Created group information
        """
        # first need to check if the user has created more than 10 groups
        user_groups = await self.db.find_many(group_collection, {"creator_id": creator_id})
        if len(user_groups) >= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="You have reached the maximum number of groups"
            )
        # Generate unique group ID using secure random alphanumeric characters
        group_id = self._generate_group_id()
        current_time = int(dt.now(tz.utc).timestamp())

        # Create group without members (they will be managed via GroupMember collection)
        group = Group(
            id=group_id,
            name=request.name,
            creator_id=creator_id,
            created_at=current_time,
            updated_at=current_time,
            is_active=True,
        )

        # Save group to database
        await self.db.insert_one(group_collection, group.model_dump())

        # Add creator as first member with CREATOR role
        await self._add_user_to_group(group_id=group_id, user_id=creator_id, role=GroupRole.CREATOR)

        return GroupInfo(
            id=group.id,
            name=group.name,
            creator_id=group.creator_id,
            created_at=group.created_at,
            updated_at=group.updated_at,
            member_count=1,  # Creator is the only member initially
            is_creator=True,
            is_active=group.is_active,
        )

    async def create_invitation(self, group_id: str, user: UserInfo) -> Dict[str, Any]:
        """
        Create an invitation for someone to join the group.
        Any group member can create invitations.

        Args:
            group_id: Target group
            user: User creating the invitation

        Returns:
            Dict containing invitation info and invite code
        """
        # Check user is a member of the group
        if not await self._is_group_member(group_id, user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")

        # Generate invitation ID
        invitation_id = self._generate_invitation_id()  # Reuse the same secure ID generator
        invite_code = secrets.token_urlsafe(8)  # Shorter, user-friendly code
        current_time = int(dt.now(tz.utc).timestamp())
        expires_at = int((dt.now(tz.utc) + td(days=7)).timestamp())  # 7 days expiry

        invitation = GroupInvitation(
            id=invitation_id,
            group_id=group_id,
            invited_by=user.id,
            invite_code=invite_code,
            status=InvitationStatus.PENDING,
            created_at=current_time,
            expires_at=expires_at,
        )

        # Save invitation
        await self.db.insert_one(group_invitation_collection, invitation.model_dump())

        # Get group and user info for response
        group_dict = await self.db.find_one(group_collection, {"id": group_id})

        return {
            "invitation": InvitationInfo(
                id=invitation.id,
                group_name=group_dict["name"],
                invited_by_name=user.name,
                invite_code=invite_code,
                created_at=invitation.created_at,
                expires_at=invitation.expires_at,
            ).model_dump(),
            "invite_code": invite_code,
            "share_message": f"Join my pet care group '{group_dict['name']}' with code: {invite_code}",
        }

    async def join_group_by_code(self, request: JoinGroupRequest, user_id: str) -> GroupInfo:
        """
        Join a group using an invitation code.

        Args:
            request: Join request with invite code
            user_id: User wanting to join

        Returns:
            GroupInfo: Information about the joined group
        """
        current_time = int(dt.now(tz.utc).timestamp())

        # Find valid invitation
        invitation_dict = await self.db.find_one(
            group_invitation_collection,
            {
                "invite_code": request.invite_code,
                "status": InvitationStatus.PENDING.value,
                "expires_at": {"$gt": current_time},
            },
        )

        if not invitation_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invitation code")

        group_id = invitation_dict["group_id"]

        # Check if user is already a member
        if await self._is_group_member(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member of this group"
            )

        # Add user to group atomically with default MEMBER role
        # The invited_by field is retrieved from the invitation
        invited_by = invitation_dict.get("invited_by")  # Who created this invitation
        await self._add_user_to_group(group_id=group_id, user_id=user_id, role=GroupRole.MEMBER, invited_by=invited_by)

        # Update invitation status
        await self.db.update_one(
            group_invitation_collection,
            {"id": invitation_dict["id"]},
            {
                "status": InvitationStatus.ACCEPTED.value,
                "accepted_by": user_id,
                "updated_at": current_time,
            },
        )

        # Get updated group info
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to join group")
        await self.db.update_one(group_collection, {"id": group_id}, {"updated_at": current_time})

        # Calculate member count from GroupMember collection
        member_count = await self.db.count_documents(group_member_collection, {"group_id": group_id, "is_active": True})

        return GroupInfo(
            id=group_dict["id"],
            name=group_dict["name"],
            creator_id=group_dict["creator_id"],
            created_at=group_dict["created_at"],
            updated_at=group_dict["updated_at"],
            member_count=member_count,
            is_creator=(user_id == group_dict["creator_id"]),
            is_active=group_dict["is_active"],
        )

    # ================== Helper Functions ==================

    async def get_user_groups(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all groups where user is an active member.
        Uses efficient batch queries for optimal performance.

        Args:
            user_id: User ID to get groups for

        Returns:
            List[Dict[str, Any]]
        """
        memberships = await self.db.find_many(group_member_collection, {"user_id": user_id, "is_active": True})

        output = []
        for membership in memberships:
            group = await self.db.find_one(group_collection, {"id": membership["group_id"], "is_active": True})
            if not group:
                continue
            output.append(
                {
                    "id": group["id"],
                    "name": group["name"],
                    "creator_id": group["creator_id"],
                    "created_at": group["created_at"],
                    "updated_at": group["updated_at"],
                    "role": membership["role"],
                    "is_active": group["is_active"],
                }
            )
        return output

    async def get_group_members(self, group_id: str, user_id: str) -> List[GroupMemberInfo]:
        """
        Get all members of a group with enhanced membership information.
        User must have 'view_members' permission to see group members.

        Args:
            group_id: Group ID
            user_id: User requesting the information

        Returns:
            List[GroupMemberInfo]: List of group members with roles and membership details
        """
        # Check if user has permission to view members
        if not await self._check_permission(group_id, user_id, "view_members"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view group members"
            )

        # Verify group exists
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        # Get all active memberships for this group
        memberships = await self.db.find_many(group_member_collection, {"group_id": group_id, "is_active": True})

        if not memberships:
            return []

        # Extract user IDs from memberships
        member_user_ids = [membership["user_id"] for membership in memberships]

        # Get user information for all members
        users = await self.db.find_many(user_collection, {"id": {"$in": member_user_ids}})

        # Create lookup dictionary for user data
        user_lookup = {user["id"]: user for user in users}

        # Build member info list with enhanced data
        members = []
        for membership in memberships:
            user_data = user_lookup.get(membership["user_id"])
            if not user_data:  # Skip if user not found or inactive
                continue

            # Get inviter name if available
            invited_by_name = None
            if membership.get("invited_by"):
                inviter = user_lookup.get(membership["invited_by"])
                invited_by_name = inviter["name"] if inviter else None

            members.append(
                GroupMemberInfo(
                    user_id=user_data["id"],
                    user_name=user_data["name"],
                    user_email=user_data["email"],
                    role=GroupRole(membership["role"]),
                    created_at=membership["created_at"],
                    updated_at=membership["updated_at"],
                    invited_by=membership.get("invited_by"),
                    invited_by_name=invited_by_name,
                    is_active=membership["is_active"],
                )
            )

        # Sort members: CREATOR first, then by join date
        members.sort(
            key=lambda m: (0 if m.role == GroupRole.CREATOR else 1, m.created_at)  # Creator first  # Then by join date
        )

        return members

    # ================== Group Pet Operations ==================

    async def get_group_pets(self, group_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all pets assigned to a specific group.
        User must be a member of the group to view its pets.

        This method is placed in GroupService (rather than PetService) to maintain
        the design principle of single service dependency per router.

        Args:
            group_id: Group ID
            user_id: User requesting the information

        Returns:
            List[Dict]: Pets assigned to the group with owner and permission context
        """
        # Check group membership
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        if user_id not in group_dict.get("member_ids", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this group to view its pets"
            )

        # Determine user's role in group
        user_role = "creator" if group_dict["creator_id"] == user_id else "member"

        # Get pets assigned to this group from pet collection
        pets = await self.db.find_many(pet_collection, {"group_id": group_id, "is_active": True})

        pet_infos = []
        for pet_dict in pets:
            # Get owner name
            owner_dict = await self.db.find_one(user_collection, {"id": pet_dict["owner_id"]})
            owner_name = owner_dict["name"] if owner_dict else "Unknown"

            # Build pet info response
            pet_info = {
                "id": pet_dict["id"],
                "name": pet_dict["name"],
                "pet_type": pet_dict["pet_type"],
                "breed": pet_dict.get("breed"),
                "gender": pet_dict["gender"],
                "current_weight_kg": pet_dict.get("current_weight_kg"),
                "owner_id": pet_dict["owner_id"],
                "owner_name": owner_name,
                "group_id": pet_dict["group_id"],
                "group_name": group_dict["name"],
                "created_at": pet_dict["created_at"],
                "is_owned_by_user": (pet_dict["owner_id"] == user_id),
                "user_permission": "owner" if pet_dict["owner_id"] == user_id else user_role,
            }
            pet_infos.append(pet_info)

        # Sort by pet name
        pet_infos.sort(key=lambda p: p["name"].lower())

        return pet_infos
