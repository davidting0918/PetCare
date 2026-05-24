"""Group / member / invitation business logic.

Roles are simple enough to inline (no permission matrix):
  - CREATOR-only:   update_member_role, remove_member, delete_group
  - CREATOR+MEMBER: create_invitation
  - any member:     view group, list members, list pets

Ownership / membership is enforced here in the service layer. The FKs on
`group_members` / `group_invitations` exist for cascade behavior, not for
app-visible errors — every read/mutation re-checks the active membership row.

ID generation:
  - group id: 8 lowercase-alphanumeric chars via secrets.token_hex(4)
    (compatible with the schema's varchar(8))
  - invitation id: 13-char timestamp+random, matching the schema's varchar(13)
  - invite_code: 6 uppercase letters (human-shareable)
"""

import logging
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from backend.core.postgres_database import PostgresAsyncClient
from backend.models.group import (
    CreateGroupRequest,
    CreateInvitationRequest,
    GroupMember,
    GroupPet,
    GroupRole,
    GroupSummary,
    InvitationCreated,
    InvitationPreview,
    InvitationStatus,
    JoinGroupRequest,
    MemberSummary,
    RemoveMemberRequest,
    UpdateMemberRoleRequest,
    group_invitation_table,
    group_member_table,
    group_table,
)

logger = logging.getLogger(__name__)

MAX_GROUPS_PER_USER = 10
INVITATION_TTL_DAYS = 7


class GroupService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── ID generation ──────

    async def _generate_group_id(self) -> str:
        for _ in range(5):
            candidate = secrets.token_hex(4)  # 8 hex chars
            existing = await self._db.read_one(
                f"SELECT 1 FROM {group_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique group id after 5 attempts")

    def _generate_invitation_id(self) -> str:
        # Schema's varchar(13). Timestamp (10) + random (3) keeps natural sort
        # by creation time without needing a separate created_at index.
        return str(int(datetime.now(timezone.utc).timestamp())) + str(secrets.randbelow(900) + 100)

    async def _generate_invite_code(self) -> str:
        # 6 uppercase letters, retry on the rare collision (unique constraint).
        alphabet = string.ascii_uppercase
        for _ in range(5):
            candidate = "".join(secrets.choice(alphabet) for _ in range(6))
            existing = await self._db.read_one(
                f"SELECT 1 FROM {group_invitation_table} WHERE invite_code = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique invite code after 5 attempts")

    # ────── Membership helpers ──────

    async def _get_membership(self, group_id: str, user_id: str) -> GroupMember | None:
        row = await self._db.read_one(
            f"""
            SELECT * FROM {group_member_table}
            WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
            """,
            group_id, user_id,
        )
        return GroupMember(**row) if row else None

    async def _require_membership(self, group_id: str, user_id: str) -> GroupMember:
        membership = await self._get_membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )
        return membership

    async def _require_role(
        self, group_id: str, user_id: str, allowed: set[GroupRole]
    ) -> GroupMember:
        membership = await self._require_membership(group_id, user_id)
        if membership.role not in allowed:
            roles = ", ".join(sorted(r.value for r in allowed))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {roles}",
            )
        return membership

    async def _get_active_group(self, group_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {group_table} WHERE id = $1 AND is_active = TRUE",
            group_id,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
            )
        return row

    async def _add_member(
        self,
        group_id: str,
        user_id: str,
        role: GroupRole,
        invited_by: str | None = None,
    ) -> None:
        existing = await self._get_membership(group_id, user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this group",
            )
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            group_member_table,
            {
                "group_id": group_id,
                "user_id": user_id,
                "role": role.value,
                "invited_by": invited_by,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )

    async def _member_count(self, group_id: str) -> int:
        row = await self._db.read_one(
            f"""
            SELECT COUNT(*)::int AS count FROM {group_member_table}
            WHERE group_id = $1 AND is_active = TRUE
            """,
            group_id,
        )
        return int(row["count"]) if row else 0

    # ────── Core: create / delete groups ──────

    async def create_group(self, request: CreateGroupRequest, creator_id: str) -> GroupSummary:
        rows = await self._db.read(
            f"""
            SELECT 1 FROM {group_table}
            WHERE creator_id = $1 AND is_active = TRUE
            """,
            creator_id,
        )
        if len(rows) >= MAX_GROUPS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You have reached the maximum of {MAX_GROUPS_PER_USER} groups",
            )

        group_id = await self._generate_group_id()
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            group_table,
            {
                "id": group_id,
                "name": request.name,
                "creator_id": creator_id,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        await self._add_member(group_id, creator_id, GroupRole.CREATOR)

        # `personal_group_id` is populated by AuthService for personal groups.
        return GroupSummary(
            id=group_id,
            name=request.name,
            creator_id=creator_id,
            member_count=1,
            role=GroupRole.CREATOR,
            is_personal=False,
            created_at=now,
            updated_at=now,
        )

    async def create_personal_group(self, owner_id: str, owner_name: str) -> str:
        """Used by auth_service on first login. Returns the new group id.

        Skips the MAX_GROUPS_PER_USER check — every user gets exactly one
        personal group regardless of how many they otherwise create.
        """
        group_id = await self._generate_group_id()
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            group_table,
            {
                "id": group_id,
                "name": owner_name,
                "creator_id": owner_id,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        await self._add_member(group_id, owner_id, GroupRole.CREATOR)
        return group_id

    async def delete_group(self, group_id: str, actor_id: str) -> dict:
        await self._require_role(group_id, actor_id, {GroupRole.CREATOR})
        group_row = await self._get_active_group(group_id)

        # Refuse to delete the actor's personal group — it's the default
        # container for their pets.
        user_row = await self._db.read_one(
            "SELECT personal_group_id FROM users WHERE id = $1", actor_id
        )
        if user_row and user_row.get("personal_group_id") == group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your personal group",
            )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {group_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, group_id,
        )
        return {
            "deleted_group_id": group_id,
            "group_name": group_row["name"],
            "deleted_by": actor_id,
            "deleted_at": now,
        }

    # ────── Invitations ──────

    async def create_invitation(
        self, actor_id: str, request: CreateInvitationRequest
    ) -> InvitationCreated:
        await self._require_role(
            request.group_id, actor_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        if request.role == GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create an invitation for the CREATOR role",
            )

        group_row = await self._get_active_group(request.group_id)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=INVITATION_TTL_DAYS)
        invitation_id = self._generate_invitation_id()
        invite_code = await self._generate_invite_code()

        await self._db.insert_one(
            group_invitation_table,
            {
                "id": invitation_id,
                "group_id": request.group_id,
                "invited_by": actor_id,
                "invite_code": invite_code,
                "status": InvitationStatus.PENDING.value,
                "role": request.role.value,
                "expires_at": expires_at,
                "created_at": now,
                "updated_at": now,
            },
        )

        return InvitationCreated(
            id=invitation_id,
            group_id=request.group_id,
            group_name=group_row["name"],
            invite_code=invite_code,
            role=request.role,
            expires_at=expires_at,
            share_message=f"Join my pet care group '{group_row['name']}' with code: {invite_code}",
        )

    async def get_invitation_preview(self, invite_code: str, viewer_id: str) -> InvitationPreview:
        now = datetime.now(timezone.utc)
        invitation = await self._db.read_one(
            f"""
            SELECT * FROM {group_invitation_table}
            WHERE invite_code = $1 AND status = $2 AND expires_at > $3
            """,
            invite_code.upper(), InvitationStatus.PENDING.value, now,
        )
        if invitation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invitation code"
            )

        # If the viewer is already a member, surface that early so the client
        # can route them straight to the group instead of asking them to "join".
        membership = await self._get_membership(invitation["group_id"], viewer_id)
        if membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this group",
            )

        group_row = await self._get_active_group(invitation["group_id"])
        inviter_row = await self._db.read_one(
            "SELECT name FROM users WHERE id = $1 AND is_active = TRUE",
            invitation["invited_by"],
        )
        if inviter_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Inviter no longer exists"
            )

        return InvitationPreview(
            id=invitation["id"],
            group_id=invitation["group_id"],
            group_name=group_row["name"],
            invited_by_name=inviter_row["name"],
            invite_code=invitation["invite_code"],
            role=GroupRole(invitation["role"]),
            expires_at=invitation["expires_at"],
            created_at=invitation["created_at"],
        )

    async def join_by_code(self, request: JoinGroupRequest, user_id: str) -> GroupSummary:
        now = datetime.now(timezone.utc)
        invite_code = request.invite_code.upper()

        # Atomically claim the invitation. If the WHERE clause matches (still
        # pending + not expired), it flips to ACCEPTED and tells us which
        # group + role to use; otherwise RETURNING is empty and we 404.
        invitation = await self._db.execute_returning(
            f"""
            UPDATE {group_invitation_table}
            SET status = $1, accepted_by = $2, updated_at = $3
            WHERE invite_code = $4 AND status = $5 AND expires_at > $3
            RETURNING id, group_id, role, invited_by
            """,
            InvitationStatus.ACCEPTED.value,
            user_id,
            now,
            invite_code,
            InvitationStatus.PENDING.value,
        )
        if invitation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invitation code"
            )

        group_id = invitation["group_id"]
        role = GroupRole(invitation["role"])

        try:
            await self._add_member(group_id, user_id, role, invited_by=invitation["invited_by"])
        except HTTPException:
            # Already a member — roll the invitation back to PENDING so it
            # stays usable for whoever else has the code, and tell the user.
            await self._db.execute(
                f"""
                UPDATE {group_invitation_table}
                SET status = $1, accepted_by = NULL, updated_at = $2
                WHERE id = $3
                """,
                InvitationStatus.PENDING.value, now, invitation["id"],
            )
            raise

        group_row = await self._get_active_group(group_id)
        count = await self._member_count(group_id)
        user_personal = await self._db.read_one(
            "SELECT personal_group_id FROM users WHERE id = $1", user_id
        )
        is_personal = bool(user_personal and user_personal.get("personal_group_id") == group_id)
        return GroupSummary(
            id=group_id,
            name=group_row["name"],
            creator_id=group_row["creator_id"],
            member_count=count,
            role=role,
            is_personal=is_personal,
            created_at=group_row["created_at"],
            updated_at=group_row["updated_at"],
        )

    # ────── Listing ──────

    async def list_my_groups(self, user_id: str) -> list[GroupSummary]:
        rows = await self._db.read(
            f"""
            SELECT
                g.id,
                g.name,
                g.creator_id,
                g.created_at,
                g.updated_at,
                gm.role,
                (SELECT COUNT(*)::int FROM {group_member_table} m
                   WHERE m.group_id = g.id AND m.is_active = TRUE) AS member_count
            FROM {group_member_table} gm
            JOIN {group_table} g ON g.id = gm.group_id
            WHERE gm.user_id = $1
              AND gm.is_active = TRUE
              AND g.is_active = TRUE
            ORDER BY g.created_at DESC
            """,
            user_id,
        )

        user_row = await self._db.read_one(
            "SELECT personal_group_id FROM users WHERE id = $1", user_id
        )
        personal_id = user_row.get("personal_group_id") if user_row else None

        return [
            GroupSummary(
                id=r["id"],
                name=r["name"],
                creator_id=r["creator_id"],
                member_count=int(r["member_count"]),
                role=GroupRole(r["role"]),
                is_personal=(personal_id is not None and r["id"] == personal_id),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    async def list_members(self, group_id: str, viewer_id: str) -> list[MemberSummary]:
        await self._require_membership(group_id, viewer_id)
        rows = await self._db.read(
            f"""
            SELECT
                gm.user_id,
                gm.role,
                gm.invited_by,
                gm.created_at AS joined_at,
                u.name,
                u.email,
                u.picture,
                inviter.name AS invited_by_name
            FROM {group_member_table} gm
            JOIN users u ON u.id = gm.user_id
            LEFT JOIN users inviter ON inviter.id = gm.invited_by
            WHERE gm.group_id = $1
              AND gm.is_active = TRUE
              AND u.is_active = TRUE
            """,
            group_id,
        )
        members = [
            MemberSummary(
                user_id=r["user_id"],
                name=r["name"],
                email=r["email"],
                picture=r.get("picture"),
                role=GroupRole(r["role"]),
                invited_by=r.get("invited_by"),
                invited_by_name=r.get("invited_by_name"),
                joined_at=r["joined_at"],
            )
            for r in rows
        ]
        # Creator first, then by join date.
        members.sort(key=lambda m: (0 if m.role == GroupRole.CREATOR else 1, m.joined_at))
        return members

    # ────── Member management (CREATOR only) ──────

    async def update_member_role(
        self, request: UpdateMemberRoleRequest, actor_id: str
    ) -> dict:
        await self._require_role(request.group_id, actor_id, {GroupRole.CREATOR})

        if request.new_role == GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign CREATOR role — only one creator per group",
            )

        target = await self._get_membership(request.group_id, request.user_id)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user is not a member of this group",
            )
        if target.role == GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change the creator's role",
            )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"""
            UPDATE {group_member_table}
            SET role = $1, updated_at = $2
            WHERE group_id = $3 AND user_id = $4
            """,
            request.new_role.value, now, request.group_id, request.user_id,
        )
        return {
            "group_id": request.group_id,
            "user_id": request.user_id,
            "new_role": request.new_role.value,
            "updated_by": actor_id,
            "updated_at": now,
        }

    async def remove_member(self, request: RemoveMemberRequest, actor_id: str) -> dict:
        await self._require_role(request.group_id, actor_id, {GroupRole.CREATOR})

        target = await self._get_membership(request.group_id, request.user_id)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user is not a member of this group",
            )
        if target.role == GroupRole.CREATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the group creator",
            )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"""
            UPDATE {group_member_table}
            SET is_active = FALSE, updated_at = $1
            WHERE group_id = $2 AND user_id = $3
            """,
            now, request.group_id, request.user_id,
        )
        return {
            "group_id": request.group_id,
            "user_id": request.user_id,
            "removed_by": actor_id,
            "removed_at": now,
        }

    # ────── Group pets ──────

    async def list_group_pets(self, group_id: str, viewer_id: str) -> list[GroupPet]:
        membership = await self._require_membership(group_id, viewer_id)
        rows = await self._db.read(
            """
            SELECT
                p.id, p.name, p.pet_type, p.breed, p.gender,
                p.current_weight_kg, p.target_weight_kg, p.daily_calorie_target,
                p.photo_url, p.owner_id, p.created_at, p.updated_at,
                u.name AS owner_name
            FROM pets p
            JOIN users u ON u.id = p.owner_id
            WHERE p.group_id = $1 AND p.is_active = TRUE AND u.is_active = TRUE
            ORDER BY p.created_at DESC
            """,
            group_id,
        )
        result: list[GroupPet] = []
        for pet in rows:
            if pet["owner_id"] == viewer_id:
                permission = "owner"
            elif membership.role == GroupRole.CREATOR:
                permission = "creator"
            elif membership.role == GroupRole.MEMBER:
                permission = "member"
            else:
                permission = "viewer"
            result.append(
                GroupPet(
                    id=pet["id"],
                    name=pet["name"],
                    pet_type=pet["pet_type"],
                    breed=pet.get("breed"),
                    gender=pet["gender"],
                    current_weight_kg=pet.get("current_weight_kg"),
                    target_weight_kg=pet.get("target_weight_kg"),
                    daily_calorie_target=pet.get("daily_calorie_target"),
                    photo_url=pet.get("photo_url"),
                    owner_id=pet["owner_id"],
                    owner_name=pet["owner_name"],
                    user_permission=permission,
                    created_at=pet["created_at"],
                    updated_at=pet["updated_at"],
                )
            )
        return result

    # ────── Permission gate exposed for OTHER services ──────

    async def assert_group_role(
        self, group_id: str, user_id: str, allowed: set[GroupRole]
    ) -> GroupMember:
        """Public helper for the pet / food / meal / weight / medicine services
        to enforce group-level permissions without each one re-implementing
        membership lookup. Use this instead of `_require_role` from outside.
        """
        return await self._require_role(group_id, user_id, allowed)

    async def assert_group_member(self, group_id: str, user_id: str) -> GroupMember:
        return await self._require_membership(group_id, user_id)
