"""
Unit tests for ``backend.services.weight_service.WeightService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``WeightService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage focuses on the ``creator`` / ``member`` (edit)
vs ``viewer`` (view-only) gate that governs every operation.
"""

from datetime import datetime as dt
from datetime import timezone as tz
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.weight import CreateWeightRecordRequest, SearchWeightRecordsRequest, UpdateWeightRecordRequest

# ================================================================
# Helpers
# ================================================================


def _make_weight_row(**overrides):
    base = {
        "id": "wt_test0001",
        "pet_id": "p_test01",
        "weight": 4.5,
        "user_id": "u_test01",
        "user_name": "Test User",
        "timestamp": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "notes": "Routine check",
        "created_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "is_active": True,
        "pet_name": "Fluffy",
        "pet_type": "cat",
        "group_id": "grp_test01",
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
def weight_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.weight_service.get_db", lambda: mock_db)
    from backend.services.weight_service import WeightService

    return WeightService()


# ================================================================
# _sync_pet_current_weight
# ================================================================


class TestSyncPetCurrentWeight:
    @pytest.mark.asyncio
    async def test_syncs_to_latest_record_weight(self, weight_service, mock_db):
        mock_db.read_one.return_value = {"weight": 5.2}

        await weight_service._sync_pet_current_weight("p_test01")

        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "UPDATE pets" in sql
        assert "current_weight_kg = 5.2" in sql
        assert "p_test01" in sql

    @pytest.mark.asyncio
    async def test_sets_null_when_no_active_records(self, weight_service, mock_db):
        mock_db.read_one.return_value = None

        await weight_service._sync_pet_current_weight("p_test01")

        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "current_weight_kg = NULL" in sql


# ================================================================
# _generate_weight_id
# ================================================================


class TestGenerateWeightId:
    def test_uses_wt_prefix_with_8_char_hex(self, weight_service):
        weight_id = weight_service._generate_weight_id()
        assert weight_id.startswith("wt_")
        # Total length: "wt_" (3) + 8 hex chars = 11
        assert len(weight_id) == 11
        # All chars after the prefix are hex digits
        suffix = weight_id[3:]
        int(suffix, 16)  # raises if not hex


# ================================================================
# Permission helpers
# ================================================================


class TestRoleHelpers:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("role,expected", [("creator", True), ("member", True), ("viewer", False)])
    async def test_has_edit_permission_only_creator_and_member(self, weight_service, mock_db, role, expected):
        mock_db.read_one.return_value = {"role": role}
        assert await weight_service._has_edit_permission("p_test01", "u_test01") is expected

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role,expected", [("creator", True), ("member", True), ("viewer", True)])
    async def test_has_view_permission_all_three_roles(self, weight_service, mock_db, role, expected):
        mock_db.read_one.return_value = {"role": role}
        assert await weight_service._has_view_permission("p_test01", "u_test01") is expected

    @pytest.mark.asyncio
    async def test_no_membership_returns_none_role(self, weight_service, mock_db):
        mock_db.read_one.return_value = None
        assert await weight_service._has_edit_permission("p_test01", "u_outsider") is False
        assert await weight_service._has_view_permission("p_test01", "u_outsider") is False


# ================================================================
# create_weight_record
# ================================================================


class TestCreateWeightRecord:
    @pytest.mark.asyncio
    async def test_member_can_create_weight_record(self, weight_service, mock_db):
        # Arrange
        # ``INSERT ... RETURNING *`` only returns weight_records columns —
        # no joined ``user_name`` — and the service appends user_name itself.
        insert_returned_row = {
            "id": "wt_test0001",
            "pet_id": "p_test01",
            "weight": 4.5,
            "user_id": "u_test01",
            "timestamp": dt(2026, 4, 8, 12, tzinfo=tz.utc),
            "notes": "Routine check",
            "created_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
            "updated_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        }
        mock_db.read_one.side_effect = [
            {"role": "member"},  # _has_edit_permission
            {"weight": 4.5},  # _sync_pet_current_weight → latest record
        ]
        mock_db.execute_returning.return_value = insert_returned_row
        request = CreateWeightRecordRequest(
            pet_id="p_test01",
            weight=4.5,
            timestamp=dt(2026, 4, 8, 12, tzinfo=tz.utc),
            notes="Routine check",
        )

        # Act
        result = await weight_service.create_weight_record(request, "u_test01", "Test User")

        # Assert: insert was issued
        assert mock_db.execute_returning.await_count == 1
        sql = mock_db.execute_returning.await_args.args[0]
        assert "INSERT INTO weight_records" in sql
        assert result.pet_id == "p_test01"
        assert result.user_name == "Test User"
        # Assert: pet weight was synced
        assert mock_db.execute.await_count == 1
        sync_sql = mock_db.execute.await_args.args[0]
        assert "UPDATE pets" in sync_sql
        assert "current_weight_kg" in sync_sql

    @pytest.mark.asyncio
    async def test_viewer_cannot_create_weight_record(self, weight_service, mock_db):
        mock_db.read_one.return_value = {"role": "viewer"}
        request = CreateWeightRecordRequest(pet_id="p_test01", weight=4.5, timestamp=dt.now(tz.utc), notes="")

        with pytest.raises(HTTPException) as exc:
            await weight_service.create_weight_record(request, "u_viewer", "Viewer")
        assert exc.value.status_code == 403
        assert mock_db.execute_returning.await_count == 0


# ================================================================
# get_weight_record
# ================================================================


class TestGetWeightRecord:
    @pytest.mark.asyncio
    async def test_member_can_view_weight_record(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_weight_row(),
            {"role": "member"},
        ]

        result = await weight_service.get_weight_record("wt_test0001", "u_member")

        assert result.id == "wt_test0001"
        assert result.weight == 4.5

    @pytest.mark.asyncio
    async def test_record_not_found_returns_404(self, weight_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await weight_service.get_weight_record("wt_ghost", "u_test01")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_non_member_cannot_view_weight_record(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_weight_row(),
            None,
        ]

        with pytest.raises(HTTPException) as exc:
            await weight_service.get_weight_record("wt_test0001", "u_outsider")
        assert exc.value.status_code == 403


# ================================================================
# update_weight_record
# ================================================================


class TestUpdateWeightRecord:
    @pytest.mark.asyncio
    async def test_creator_can_update_weight(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},  # _get_weight_record_pet_id
            {"role": "creator"},  # _has_edit_permission
            {"weight": 5.0},  # _sync_pet_current_weight → latest record
            _make_weight_row(weight=5.0),  # get_weight_record → record fetch
            {"role": "creator"},  # get_weight_record → permission check
        ]
        mock_db.execute_returning.return_value = _make_weight_row(weight=5.0)

        request = UpdateWeightRecordRequest(weight=5.0, timestamp=dt(2026, 4, 8, tzinfo=tz.utc), notes="Updated")
        result = await weight_service.update_weight_record("wt_test0001", request, "u_creator")

        assert result.weight == 5.0
        assert mock_db.execute_returning.await_count == 1
        # Assert: pet weight was synced
        assert mock_db.execute.await_count == 1

    @pytest.mark.asyncio
    async def test_viewer_cannot_update_weight(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},
            {"role": "viewer"},
        ]

        request = UpdateWeightRecordRequest(weight=5.0)

        with pytest.raises(HTTPException) as exc:
            await weight_service.update_weight_record("wt_test0001", request, "u_viewer")
        assert exc.value.status_code == 403


# ================================================================
# delete_weight_record
# ================================================================


class TestDeleteWeightRecord:
    @pytest.mark.asyncio
    async def test_member_can_delete_weight_record(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},  # _get_weight_record_pet_id
            {"role": "member"},  # _has_edit_permission
            {"weight": 3.0},  # _sync_pet_current_weight → next latest record
        ]
        mock_db.execute_returning.return_value = {"id": "wt_test0001"}

        result = await weight_service.delete_weight_record("wt_test0001", "u_member")

        assert result["deleted"] is True
        assert mock_db.execute_returning.await_count == 1
        # Assert: pet weight was synced
        assert mock_db.execute.await_count == 1

    @pytest.mark.asyncio
    async def test_delete_last_record_sets_pet_weight_to_null(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},  # _get_weight_record_pet_id
            {"role": "member"},  # _has_edit_permission
            None,  # _sync_pet_current_weight → no active records remain
        ]
        mock_db.execute_returning.return_value = {"id": "wt_last"}

        await weight_service.delete_weight_record("wt_last", "u_member")

        sync_sql = mock_db.execute.await_args.args[0]
        assert "current_weight_kg = NULL" in sync_sql

    @pytest.mark.asyncio
    async def test_viewer_cannot_delete_weight_record(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},
            {"role": "viewer"},
        ]

        with pytest.raises(HTTPException) as exc:
            await weight_service.delete_weight_record("wt_test0001", "u_viewer")
        assert exc.value.status_code == 403
        assert mock_db.execute_returning.await_count == 0


# ================================================================
# search_weight_records
# ================================================================


class TestSearchWeightRecords:
    @pytest.mark.asyncio
    async def test_requires_weight_id_or_pet_id(self, weight_service):
        request = SearchWeightRecordsRequest()

        with pytest.raises(HTTPException) as exc:
            await weight_service.search_weight_records(request, "u_test01")
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_pet_id_scope_rejects_non_member(self, weight_service, mock_db):
        mock_db.read_one.return_value = None  # _get_user_role → no row
        request = SearchWeightRecordsRequest(pet_id="p_test01")

        with pytest.raises(HTTPException) as exc:
            await weight_service.search_weight_records(request, "u_outsider")
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_member_can_search_with_pet_id(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"role": "member"},  # _has_view_permission
            {"total": 2},  # count query
        ]
        mock_db.read.return_value = [
            _make_weight_row(id="wt_test0001"),
            _make_weight_row(id="wt_test0002"),
        ]

        request = SearchWeightRecordsRequest(pet_id="p_test01")
        response = await weight_service.search_weight_records(request, "u_member")

        assert response.total == 2
        assert len(response.records) == 2

    @pytest.mark.asyncio
    async def test_weight_id_only_path_validates_via_record_lookup(self, weight_service, mock_db):
        mock_db.read_one.side_effect = [
            {"pet_id": "p_test01"},  # _get_weight_record_pet_id
            {"role": "viewer"},  # _has_view_permission
            {"total": 1},  # count query
        ]
        mock_db.read.return_value = [_make_weight_row()]

        request = SearchWeightRecordsRequest(weight_id="wt_test0001")
        response = await weight_service.search_weight_records(request, "u_viewer")

        assert response.total == 1
        assert response.records[0].id == "wt_test0001"
