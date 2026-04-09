"""
Unit tests for ``backend.services.group_service.GroupService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``GroupService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage is the priority — every public method that
touches a group-scoped resource is tested for the unauthorized-role
path (creator vs member vs viewer vs non-member).
"""

from datetime import datetime as dt
from datetime import timedelta as td
from datetime import timezone as tz
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.group import (
    CreateGroupRequest,
    CreateInvitationRequest,
    GroupRole,
    JoinGroupRequest,
    RemoveMemberRequest,
    UpdateMemberRoleRequest,
)
from backend.models.user import UserInfo

# ================================================================
# Helpers
# ================================================================


def _make_membership_row(role="member", **overrides):
    base = {
        "group_id": "grp_test01",
        "user_id": "u_test01",
        "role": role,
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "invited_by": None,
        "is_active": True,
    }
    base.update(overrides)
    return base


def _make_group_row(**overrides):
    base = {
        "id": "grp_test01",
        "name": "Test Group",
        "creator_id": "u_creator",
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "is_active": True,
    }
    base.update(overrides)
    return base


def _make_invitation_row(**overrides):
    base = {
        "id": "inv_test01",
        "group_id": "grp_test01",
        "invited_by": "u_creator",
        "invite_code": "ABCDEF",
        "role": "member",
        "status": "pending",
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "expires_at": dt(2026, 4, 15, tzinfo=tz.utc),
        "accepted_by": None,
    }
    base.update(overrides)
    return base


def _make_user_info():
    return UserInfo(
        id="u_test01",
        email="test@example.com",
        name="Test User",
        personal_group_id="grp_personal",
        created_at=dt(2026, 4, 8, tzinfo=tz.utc),
        updated_at=dt(2026, 4, 8, tzinfo=tz.utc),
        source="test_client",
        is_active=True,
        is_verified=True,
    )


# ================================================================
# Fixtures
# ================================================================


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.read = AsyncMock()
    db.read_one = AsyncMock()
    db.insert = AsyncMock()
    db.insert_one = AsyncMock()
    db.execute = AsyncMock()
    db.execute_returning = AsyncMock()
    return db


@pytest.fixture
def group_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.group_service.get_db", lambda: mock_db)
    from backend.services.group_service import GroupService

    return GroupService()


# ================================================================
# create_group
# ================================================================


class TestCreateGroup:
    @pytest.mark.asyncio
    async def test_happy_path_creates_group_and_adds_creator(self, group_service, mock_db):
        # Arrange: user has 0 existing groups, no membership conflict
        mock_db.read.return_value = []  # _add_user_to_group reads existing groups via read
        mock_db.read_one.return_value = None  # no existing membership

        # Act
        result = await group_service.create_group(CreateGroupRequest(name="My Family"), "u_creator")

        # Assert: response shape
        assert result.name == "My Family"
        assert result.creator_id == "u_creator"
        assert result.member_count == 1
        assert result.is_creator is True

        # Assert: 2 inserts (group + creator membership)
        assert mock_db.insert_one.await_count == 2
        first_table = mock_db.insert_one.await_args_list[0].args[0]
        second_table = mock_db.insert_one.await_args_list[1].args[0]
        assert first_table == "groups"
        assert second_table == "group_members"

    @pytest.mark.asyncio
    async def test_rejects_when_user_has_10_groups(self, group_service, mock_db):
        # Arrange: user already owns 10 active groups
        mock_db.read.return_value = [{"id": f"grp_{i:02d}"} for i in range(10)]

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await group_service.create_group(CreateGroupRequest(name="11th group"), "u_creator")
        assert exc.value.status_code == 400
        assert "maximum" in exc.value.detail.lower()
        assert mock_db.insert_one.await_count == 0


# ================================================================
# update_member_role
# ================================================================


class TestUpdateMemberRole:
    @pytest.mark.asyncio
    async def test_creator_can_promote_member_to_viewer(self, group_service, mock_db):
        # Arrange: actor is creator, target is a member
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        target_row = _make_membership_row(role="member", user_id="u_target")
        mock_db.read_one.side_effect = [actor_row, target_row]

        # Act
        result = await group_service.update_member_role(
            "grp_test01", UpdateMemberRoleRequest(user_id="u_target", new_role=GroupRole.VIEWER), "u_creator"
        )

        # Assert
        assert result["new_role"] == "viewer"
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "role = 'viewer'" in sql

    @pytest.mark.asyncio
    async def test_non_member_actor_is_rejected(self, group_service, mock_db):
        mock_db.read_one.return_value = None  # actor is not a member

        with pytest.raises(HTTPException) as exc:
            await group_service.update_member_role(
                "grp_test01", UpdateMemberRoleRequest(user_id="u_target", new_role=GroupRole.VIEWER), "u_outsider"
            )
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("actor_role", ["member", "viewer"])
    async def test_non_creator_actor_is_rejected(self, group_service, mock_db, actor_role):
        mock_db.read_one.return_value = _make_membership_row(role=actor_role, user_id="u_actor")

        with pytest.raises(HTTPException) as exc:
            await group_service.update_member_role(
                "grp_test01", UpdateMemberRoleRequest(user_id="u_target", new_role=GroupRole.VIEWER), "u_actor"
            )
        assert exc.value.status_code == 403
        assert "creator" in exc.value.detail.lower()
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_target_user_not_in_group_returns_404(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        mock_db.read_one.side_effect = [actor_row, None]

        with pytest.raises(HTTPException) as exc:
            await group_service.update_member_role(
                "grp_test01", UpdateMemberRoleRequest(user_id="u_ghost", new_role=GroupRole.VIEWER), "u_creator"
            )
        assert exc.value.status_code == 404
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_cannot_assign_creator_role(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        target_row = _make_membership_row(role="member", user_id="u_target")
        mock_db.read_one.side_effect = [actor_row, target_row]

        with pytest.raises(HTTPException) as exc:
            await group_service.update_member_role(
                "grp_test01", UpdateMemberRoleRequest(user_id="u_target", new_role=GroupRole.CREATOR), "u_creator"
            )
        assert exc.value.status_code == 400
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_cannot_change_existing_creator_role(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        target_row = _make_membership_row(role="creator", user_id="u_other_creator")
        mock_db.read_one.side_effect = [actor_row, target_row]

        with pytest.raises(HTTPException) as exc:
            await group_service.update_member_role(
                "grp_test01",
                UpdateMemberRoleRequest(user_id="u_other_creator", new_role=GroupRole.MEMBER),
                "u_creator",
            )
        assert exc.value.status_code == 400
        assert mock_db.execute.await_count == 0


# ================================================================
# remove_member
# ================================================================


class TestRemoveMember:
    @pytest.mark.asyncio
    async def test_creator_can_remove_member(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        target_row = _make_membership_row(role="member", user_id="u_target")
        mock_db.read_one.side_effect = [actor_row, target_row]

        result = await group_service.remove_member("grp_test01", RemoveMemberRequest(user_id="u_target"), "u_creator")

        assert result["removed_user_id"] == "u_target"
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "is_active = False" in sql

    @pytest.mark.asyncio
    @pytest.mark.parametrize("actor_role", ["member", "viewer"])
    async def test_non_creator_cannot_remove_members(self, group_service, mock_db, actor_role):
        mock_db.read_one.return_value = _make_membership_row(role=actor_role, user_id="u_actor")

        with pytest.raises(HTTPException) as exc:
            await group_service.remove_member("grp_test01", RemoveMemberRequest(user_id="u_target"), "u_actor")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_cannot_remove_creator(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        target_row = _make_membership_row(role="creator", user_id="u_other_creator")
        mock_db.read_one.side_effect = [actor_row, target_row]

        with pytest.raises(HTTPException) as exc:
            await group_service.remove_member("grp_test01", RemoveMemberRequest(user_id="u_other_creator"), "u_creator")
        assert exc.value.status_code == 400
        assert mock_db.execute.await_count == 0


# ================================================================
# delete_group
# ================================================================


class TestDeleteGroup:
    @pytest.mark.asyncio
    async def test_creator_can_soft_delete_group(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        group_row = _make_group_row(is_active=True)
        mock_db.read_one.side_effect = [actor_row, group_row]

        result = await group_service.delete_group("grp_test01", "u_creator")

        assert result["deleted_group_id"] == "grp_test01"
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "is_active = False" in sql

    @pytest.mark.asyncio
    async def test_non_member_cannot_delete_group(self, group_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await group_service.delete_group("grp_test01", "u_outsider")
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    @pytest.mark.parametrize("actor_role", ["member", "viewer"])
    async def test_non_creator_cannot_delete_group(self, group_service, mock_db, actor_role):
        mock_db.read_one.return_value = _make_membership_row(role=actor_role)

        with pytest.raises(HTTPException) as exc:
            await group_service.delete_group("grp_test01", "u_actor")
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_already_deleted_group_returns_400(self, group_service, mock_db):
        actor_row = _make_membership_row(role="creator", user_id="u_creator")
        group_row = _make_group_row(is_active=False)
        mock_db.read_one.side_effect = [actor_row, group_row]

        with pytest.raises(HTTPException) as exc:
            await group_service.delete_group("grp_test01", "u_creator")
        assert exc.value.status_code == 400


# ================================================================
# create_invitation
# ================================================================


class TestCreateInvitation:
    @pytest.mark.asyncio
    async def test_member_can_create_invitation(self, group_service, mock_db):
        # Arrange: actor is a member, group exists
        actor_row = _make_membership_row(role="member")
        group_row = _make_group_row()
        mock_db.read_one.side_effect = [actor_row, group_row]

        # Act
        result = await group_service.create_invitation(
            "grp_test01", _make_user_info(), CreateInvitationRequest(role=GroupRole.VIEWER)
        )

        # Assert: invitation was inserted
        assert mock_db.insert_one.await_count == 1
        assert mock_db.insert_one.await_args.args[0] == "group_invitations"
        # Assert: response carries invite code
        assert "invite_code" in result
        assert len(result["invite_code"]) == 6

    @pytest.mark.asyncio
    async def test_viewer_cannot_create_invitation(self, group_service, mock_db):
        mock_db.read_one.return_value = _make_membership_row(role="viewer")

        with pytest.raises(HTTPException) as exc:
            await group_service.create_invitation(
                "grp_test01", _make_user_info(), CreateInvitationRequest(role=GroupRole.MEMBER)
            )
        assert exc.value.status_code == 403
        assert mock_db.insert_one.await_count == 0

    @pytest.mark.asyncio
    async def test_non_member_cannot_create_invitation(self, group_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await group_service.create_invitation(
                "grp_test01", _make_user_info(), CreateInvitationRequest(role=GroupRole.MEMBER)
            )
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_cannot_invite_with_creator_role(self, group_service, mock_db):
        mock_db.read_one.return_value = _make_membership_row(role="creator")

        with pytest.raises(HTTPException) as exc:
            await group_service.create_invitation(
                "grp_test01", _make_user_info(), CreateInvitationRequest(role=GroupRole.CREATOR)
            )
        assert exc.value.status_code == 400
        assert mock_db.insert_one.await_count == 0


# ================================================================
# join_group_by_code
# ================================================================


class TestJoinGroupByCode:
    @pytest.mark.asyncio
    async def test_happy_path_joins_group(self, group_service, mock_db):
        # Arrange: invitation exists, user is not yet a member, group is active
        invitation = _make_invitation_row(expires_at=dt.now() + td(days=1))
        group_row = _make_group_row()
        mock_db.read_one.side_effect = [
            invitation,  # find invitation
            None,  # _is_group_member → no existing membership
            None,  # _add_user_to_group → no existing membership
            group_row,  # fetch group info
            {"count": 2},  # member count
        ]

        # Act
        result = await group_service.join_group_by_code(JoinGroupRequest(invite_code="ABCDEF"), "u_test01")

        # Assert
        assert result.id == "grp_test01"
        assert result.member_count == 2
        # Assert: invitation status updated and membership inserted
        assert mock_db.execute.await_count == 1
        assert mock_db.insert_one.await_count == 1
        assert mock_db.insert_one.await_args.args[0] == "group_members"

    @pytest.mark.asyncio
    async def test_invalid_code_returns_404(self, group_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await group_service.join_group_by_code(JoinGroupRequest(invite_code="BADCDE"), "u_test01")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_already_member_returns_400(self, group_service, mock_db):
        invitation = _make_invitation_row()
        existing_membership = _make_membership_row()
        mock_db.read_one.side_effect = [invitation, existing_membership]

        with pytest.raises(HTTPException) as exc:
            await group_service.join_group_by_code(JoinGroupRequest(invite_code="ABCDEF"), "u_test01")
        assert exc.value.status_code == 400
        assert mock_db.insert_one.await_count == 0


# ================================================================
# get_group_members (permission check)
# ================================================================


class TestGetGroupMembers:
    @pytest.mark.asyncio
    async def test_non_member_cannot_view_members(self, group_service, mock_db):
        mock_db.read_one.return_value = None  # _check_permission → no membership

        with pytest.raises(HTTPException) as exc:
            await group_service.get_group_members("grp_test01", "u_outsider")
        assert exc.value.status_code == 403
        assert mock_db.read.await_count == 0
