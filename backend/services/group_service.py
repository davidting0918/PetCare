import uuid
import secrets
from datetime import datetime as dt, timedelta as td, timezone as tz
from typing import List, Dict, Any
from fastapi import HTTPException, status

from backend.core.database import MongoAsyncClient
from backend.models.group import (
    # Collections
    group_collection, group_invitation_collection,
    # Models
    Group, GroupInvitation, InvitationStatus, GroupRole,
    # Request Models
    CreateGroupRequest, JoinGroupRequest,
    # Response Models
    GroupInfo, GroupMemberInfo, InvitationInfo
)
from backend.models.user import user_collection


class GroupService:
    """
    Ultra-simplified GroupService using member lists.
    Uses Group.member_ids and User.group_ids for maximum simplicity.
    
    Core functions:
    1. create_group - Create a new group
    2. create_invitation - Generate invite codes for joining  
    3. join_group_by_code - Join group using invite code
    """

    def __init__(self):
        self.db = MongoAsyncClient()

    async def _is_group_member(self, group_id: str, user_id: str) -> bool:
        """Check if user is a member of the group using group's member list"""
        group_dict = await self.db.find_one(
            group_collection,
            {"id": group_id, "is_active": True}
        )
        return group_dict and user_id in group_dict.get("member_ids", [])

    async def _add_user_to_group_atomically(self, group_id: str, user_id: str):
        """
        Atomically add user to group by updating both:
        1. group.member_ids list
        2. user.group_ids listgit
        """
        # Add user to group's member list
        await self.db.db[group_collection].update_one(
            {"id": group_id},
            {"$addToSet": {"member_ids": user_id}}
        )
        
        # Add group to user's group list
        await self.db.db[user_collection].update_one(
            {"id": user_id},
            {"$addToSet": {"group_ids": group_id}}
        )

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
        # Generate unique group ID
        group_id = str(uuid.uuid4())[:8]
        current_time = int(dt.now(tz.utc).timestamp())
        
        # Create group with creator as first member
        group = Group(
            id=group_id,
            name=request.name,
            creator_id=creator_id,
            member_ids=[creator_id],  # Creator is the first member
            created_at=current_time,
            is_active=True
        )
        
        # Save group to database
        await self.db.insert_one(group_collection, group.model_dump())
        
        # Add group to creator's group list
        await self.db.db[user_collection].update_one(
            {"id": creator_id},
            {"$addToSet": {"group_ids": group_id}}
        )
        
        return GroupInfo(
            id=group.id,
            name=group.name,
            creator_id=group.creator_id,
            created_at=group.created_at,
            member_count=group.member_count,
            is_creator=True
        )

    async def create_invitation(self, group_id: str, user_id: str) -> Dict[str, Any]:
        """
        Create an invitation for someone to join the group.
        Any group member can create invitations.
        
        Args:
            group_id: Target group
            user_id: User creating the invitation
            
        Returns:
            Dict containing invitation info and invite code
        """
        # Check user is a member of the group
        if not await self._is_group_member(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Generate invitation
        invitation_id = str(uuid.uuid4())[:8]
        invite_code = secrets.token_urlsafe(8)  # Shorter, user-friendly code
        current_time = int(dt.now(tz.utc).timestamp())
        expires_at = int((dt.now(tz.utc) + td(days=7)).timestamp())  # 7 days expiry
        
        invitation = GroupInvitation(
            id=invitation_id,
            group_id=group_id,
            invited_by=user_id,
            invite_code=invite_code,
            status=InvitationStatus.PENDING,
            created_at=current_time,
            expires_at=expires_at
        )
        
        # Save invitation
        await self.db.insert_one(group_invitation_collection, invitation.model_dump())
        
        # Get group and user info for response
        group_dict = await self.db.find_one(group_collection, {"id": group_id})
        user_dict = await self.db.find_one(user_collection, {"id": user_id})
        
        return {
            "invitation": InvitationInfo(
                id=invitation.id,
                group_name=group_dict["name"] if group_dict else "Unknown Group",
                invited_by_name=user_dict["name"] if user_dict else "Unknown User",
                invite_code=invite_code,
                created_at=invitation.created_at,
                expires_at=invitation.expires_at
            ),
            "invite_code": invite_code,
            "share_message": f"Join my pet care group '{group_dict['name'] if group_dict else 'Unknown'}' with code: {invite_code}"
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
                "expires_at": {"$gt": current_time}
            }
        )
        
        if not invitation_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invitation code"
            )
            
        group_id = invitation_dict["group_id"]
        
        # Check if user is already a member
        if await self._is_group_member(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this group"
            )
        
        # Add user to group atomically
        await self._add_user_to_group_atomically(group_id, user_id)
        
        # Update invitation status
        await self.db.update_one(
            group_invitation_collection,
            {"id": invitation_dict["id"]},
            {
                "status": InvitationStatus.ACCEPTED.value,
                "accepted_at": current_time,
                "accepted_by": user_id
            }
        )
        
        # Get updated group info
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to join group")
            
        return GroupInfo(
            id=group_dict["id"],
            name=group_dict["name"],
            creator_id=group_dict["creator_id"],
            created_at=group_dict["created_at"],
            member_count=len(group_dict.get("member_ids", [])),
            is_creator=(user_id == group_dict["creator_id"])
        )

    # ================== Helper Functions ==================

    async def get_user_groups(self, user_id: str) -> List[GroupInfo]:
        """
        Get all groups where user is an active member.
        Uses the user's group_ids list for efficient lookup.
        
        Args:
            user_id: User ID to get groups for
            
        Returns:
            List[GroupInfo]: User's group memberships
        """
        # Get user's group list
        user_dict = await self.db.find_one(user_collection, {"id": user_id, "is_active": True})
        if not user_dict or not user_dict.get("group_ids"):
            return []
        
        # Find all active groups user belongs to
        groups = await self.db.db[group_collection].find({
            "id": {"$in": user_dict["group_ids"]},
            "is_active": True
        }).to_list(None)
        
        group_infos = []
        for group_data in groups:
            group_infos.append(GroupInfo(
                id=group_data["id"],
                name=group_data["name"],
                creator_id=group_data["creator_id"],
                created_at=group_data["created_at"],
                member_count=len(group_data.get("member_ids", [])),
                is_creator=(user_id == group_data["creator_id"])
            ))
            
        return group_infos

    async def get_group_members(self, group_id: str, user_id: str) -> List[GroupMemberInfo]:
        """
        Get all members of a group.
        User must be a member to view group members.
        
        Args:
            group_id: Group ID
            user_id: User requesting the information
            
        Returns:
            List[GroupMemberInfo]: List of group members
        """
        # Check user is a member
        if not await self._is_group_member(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Get group with member IDs
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
            
        member_ids = group_dict.get("member_ids", [])
        if not member_ids:
            return []
        
        # Get user information for all members
        users = await self.db.db[user_collection].find({
            "id": {"$in": member_ids},
            "is_active": True
        }).to_list(None)
        
        members = []
        for user_data in users:
            # Determine role based on whether user is creator
            role = GroupRole.CREATOR if user_data["id"] == group_dict["creator_id"] else GroupRole.MEMBER
            
            members.append(GroupMemberInfo(
                user_id=user_data["id"],
                user_name=user_data["name"],
                user_email=user_data["email"],
                role=role
            ))
            
        return members
