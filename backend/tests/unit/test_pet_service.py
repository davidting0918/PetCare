"""
Unit tests for ``backend.services.pet_service.PetService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``PetService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* No real filesystem — ``get_photo_storage_path`` is patched.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage is the priority — pet operations are gated by
group membership role (owner / creator / member / viewer / none) and
each gate has its own test.
"""

from datetime import datetime as dt
from datetime import timezone as tz
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.pet import AssignPetToGroupRequest, CreatePetRequest, PetGender, PetType, UpdatePetRequest

# ================================================================
# Helpers
# ================================================================


def _make_pet_row(**overrides):
    """Return a dict shaped like a row from the ``pets`` table."""
    base = {
        "id": "p_test01",
        "name": "Fluffy",
        "pet_type": "cat",
        "breed": "Persian",
        "gender": "female",
        "birth_date": dt(2024, 1, 1, tzinfo=tz.utc),
        "current_weight_kg": 4.5,
        "target_weight_kg": 4.0,
        "height_cm": 25.0,
        "is_spayed": True,
        "microchip_id": "chip123",
        "daily_calorie_target": 250,
        "owner_id": "u_owner",
        "group_id": "grp_test01",
        "photo_url": "",
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "is_active": True,
        "notes": None,
        "owner_name": "Owner User",
        "group_name": "Test Group",
    }
    base.update(overrides)
    return base


def _make_owner_row(**overrides):
    base = {
        "id": "u_owner",
        "name": "Owner User",
        "email": "owner@example.com",
        "personal_group_id": "grp_personal",
        "is_active": True,
    }
    base.update(overrides)
    return base


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
def pet_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.pet_service.get_db", lambda: mock_db)
    monkeypatch.setattr(
        "backend.services.pet_service.get_photo_storage_path",
        lambda category: "/fake/storage/path",
    )
    from backend.services.pet_service import PetService

    return PetService()


# ================================================================
# _extract_filename_from_url
# ================================================================


class TestExtractFilenameFromUrl:
    @pytest.mark.parametrize(
        "url,expected",
        [
            ("/static/pet_photos/abc.jpg", "abc.jpg"),
            ("https://example.com/static/pet_photos/abc.jpg", "abc.jpg"),
            ("", None),
            (None, None),
            ("/some/other/path/abc.jpg", None),
        ],
    )
    def test_parses_filename_from_various_url_shapes(self, pet_service, url, expected):
        assert pet_service._extract_filename_from_url(url) == expected


# ================================================================
# _get_user_pet_permission
# ================================================================


class TestGetUserPetPermission:
    @pytest.mark.asyncio
    async def test_pet_not_found_raises_404(self, pet_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await pet_service._get_user_pet_permission("p_ghost", "u_test01")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role_value", ["owner", "creator", "member", "viewer"])
    async def test_returns_role_when_user_has_access(self, pet_service, mock_db, role_value):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": role_value},
        ]
        result = await pet_service._get_user_pet_permission("p_test01", "u_test01")
        assert result == role_value

    @pytest.mark.asyncio
    async def test_no_membership_raises_403(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [_make_pet_row(), None]

        with pytest.raises(HTTPException) as exc:
            await pet_service._get_user_pet_permission("p_test01", "u_outsider")
        assert exc.value.status_code == 403


# ================================================================
# create_pet
# ================================================================


class TestCreatePet:
    @pytest.mark.asyncio
    async def test_happy_path_inserts_pet_and_returns_details(self, pet_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = _make_owner_row()
        request = CreatePetRequest(name="Fluffy", pet_type=PetType.CAT, gender=PetGender.FEMALE)

        # Act
        result = await pet_service.create_pet(request, "u_owner")

        # Assert: insert was called against pets table
        assert mock_db.insert_one.await_count == 1
        assert mock_db.insert_one.await_args.args[0] == "pets"
        # Assert: pet uses owner's personal_group_id by default
        inserted = mock_db.insert_one.await_args.args[1]
        assert inserted["group_id"] == "grp_personal"
        assert inserted["owner_id"] == "u_owner"
        # Assert: response shape
        assert result.name == "Fluffy"
        assert result.owner_id == "u_owner"
        assert result.owner_name == "Owner User"

    @pytest.mark.asyncio
    async def test_owner_not_found_raises_404(self, pet_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await pet_service.create_pet(CreatePetRequest(name="Fluffy", pet_type=PetType.CAT), "u_ghost")
        assert exc.value.status_code == 404
        assert mock_db.insert_one.await_count == 0


# ================================================================
# update_pet
# ================================================================


class TestUpdatePet:
    @pytest.mark.asyncio
    async def test_owner_can_update_pet(self, pet_service, mock_db):
        # Arrange: permission helper sees owner, then get_pet_details path runs
        mock_db.read_one.side_effect = [
            _make_pet_row(),  # _can_modify_pet → pet lookup
            {"user_permission": "owner"},  # _can_modify_pet → permission lookup
            _make_pet_row(),  # get_pet_details → pet lookup
            {"user_permission": "owner"},  # get_pet_details permission check pet lookup
            _make_pet_row(name="Updated"),  # get_pet_details → final fetch
        ]

        result = await pet_service.update_pet("p_test01", UpdatePetRequest(name="Updated"), "u_owner")

        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "name = 'Updated'" in sql
        assert result.name == "Updated"

    @pytest.mark.asyncio
    async def test_viewer_cannot_update_pet(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": "viewer"},
        ]

        with pytest.raises(HTTPException) as exc:
            await pet_service.update_pet("p_test01", UpdatePetRequest(name="Updated"), "u_viewer")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# delete_pet
# ================================================================


class TestDeletePet:
    @pytest.mark.asyncio
    async def test_owner_can_delete_pet(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": "owner"},
        ]

        result = await pet_service.delete_pet("p_test01", "u_owner")

        assert mock_db.execute.await_count == 1
        assert "delete from pets" in mock_db.execute.await_args.args[0].lower()
        assert "deleted" in result["message"].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role", ["creator", "member", "viewer"])
    async def test_non_owner_cannot_delete_pet(self, pet_service, mock_db, role):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": role},
        ]

        with pytest.raises(HTTPException) as exc:
            await pet_service.delete_pet("p_test01", "u_other")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# assign_pet_to_group
# ================================================================


class TestAssignPetToGroup:
    @pytest.mark.asyncio
    async def test_owner_who_is_creator_of_target_group_can_assign(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),  # _is_owner → pet lookup
            {"user_permission": "owner"},  # _is_owner → permission lookup
            {"group_id": "grp_target", "role": "creator"},  # target group role check
            {  # get pet info for response
                "pet_id": "p_test01",
                "pet_name": "Fluffy",
                "group_id": "grp_target",
                "group_name": "Target Group",
            },
        ]

        result = await pet_service.assign_pet_to_group(
            "p_test01", AssignPetToGroupRequest(group_id="grp_target"), "u_owner"
        )

        assert result.group_id == "grp_target"
        # Assert: UPDATE was issued for group reassignment
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "group_id = 'grp_target'" in sql

    @pytest.mark.asyncio
    async def test_non_owner_cannot_assign_pet(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": "member"},
        ]

        with pytest.raises(HTTPException) as exc:
            await pet_service.assign_pet_to_group(
                "p_test01", AssignPetToGroupRequest(group_id="grp_target"), "u_member"
            )
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_target_group_not_found_raises_404(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": "owner"},
            None,  # target group role lookup → not a member
        ]

        with pytest.raises(HTTPException) as exc:
            await pet_service.assign_pet_to_group(
                "p_test01", AssignPetToGroupRequest(group_id="grp_unknown"), "u_owner"
            )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_owner_must_be_creator_of_target_group(self, pet_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_row(),
            {"user_permission": "owner"},
            {"group_id": "grp_target", "role": "member"},
        ]

        with pytest.raises(HTTPException) as exc:
            await pet_service.assign_pet_to_group("p_test01", AssignPetToGroupRequest(group_id="grp_target"), "u_owner")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# get_accessible_pets
# ================================================================


class TestGetAccessiblePets:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_pets(self, pet_service, mock_db):
        mock_db.read.return_value = []
        result = await pet_service.get_accessible_pets("u_test01")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_pet_info_list_sorted_newest_first(self, pet_service, mock_db):
        older = _make_pet_row(id="p_old", created_at=dt(2026, 1, 1, tzinfo=tz.utc), user_permission="member")
        newer = _make_pet_row(id="p_new", created_at=dt(2026, 4, 1, tzinfo=tz.utc), user_permission="member")
        mock_db.read.return_value = [older, newer]

        result = await pet_service.get_accessible_pets("u_test01")

        assert [p.id for p in result] == ["p_new", "p_old"]
