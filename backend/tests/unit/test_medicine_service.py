"""
Unit tests for ``backend.services.medicine_service.MedicineService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``MedicineService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage focuses on the ``creator`` / ``member`` (edit)
vs ``viewer`` (view-only) gate that governs every operation.
"""

from datetime import date
from datetime import datetime as dt
from datetime import timezone as tz
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.medicine import (
    CreateCourseRequest,
    CreateLogRequest,
    CreateMedicationRequest,
    DosageUnit,
    MedicationType,
    TimeOfDay,
    UpdateMedicationRequest,
)

# ================================================================
# Helpers
# ================================================================


def _make_medication_row(**overrides):
    base = {
        "id": "med_abc1234",
        "group_id": "grp_test",
        "name": "Amlodipine",
        "medication_type": "oral",
        "default_dosage": 1.0,
        "dosage_unit": "tablet",
        "notes": None,
        "creator_id": "u_test01",
        "is_active": True,
        "created_at": dt(2026, 4, 9, 12, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 9, 12, tzinfo=tz.utc),
    }
    base.update(overrides)
    return base


def _make_course_row(**overrides):
    base = {
        "id": "tc_abc12345",
        "pet_id": "p_test01",
        "medication_id": "med_abc1234",
        "group_id": "grp_test",
        "dosage": 1.0,
        "dosage_unit": "tablet",
        "frequency_days": 1,
        "times_per_day": ["morning", "evening"],
        "start_date": date(2026, 4, 9),
        "end_date": None,
        "notes": None,
        "created_by": "u_test01",
        "is_active": True,
        "created_at": dt(2026, 4, 9, 12, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 9, 12, tzinfo=tz.utc),
    }
    base.update(overrides)
    return base


def _make_log_row(**overrides):
    base = {
        "id": "mlog_abc123",
        "pet_id": "p_test01",
        "medication_id": "med_abc1234",
        "group_id": "grp_test",
        "course_id": "tc_abc12345",
        "dosage": 1.0,
        "dosage_unit": "tablet",
        "time_of_day": "morning",
        "administered_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
        "administered_by": "u_test01",
        "notes": None,
        "is_active": True,
        "created_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
    }
    base.update(overrides)
    return base


def _role_row(role):
    return {"role": role}


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
def medicine_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.medicine_service.get_db", lambda: mock_db)
    from backend.services.medicine_service import MedicineService

    return MedicineService()


# ================================================================
# create_medication
# ================================================================


class TestCreateMedication:
    @pytest.mark.asyncio
    async def test_member_can_create(self, medicine_service, mock_db):
        mock_db.read_one.return_value = _role_row("member")
        mock_db.execute_returning.return_value = _make_medication_row()

        req = CreateMedicationRequest(
            group_id="grp_test",
            name="Amlodipine",
            medication_type=MedicationType.ORAL,
            dosage_unit=DosageUnit.TABLET,
        )
        result = await medicine_service.create_medication(req, "u_test01")
        assert result.name == "Amlodipine"
        assert result.medication_type == MedicationType.ORAL

    @pytest.mark.asyncio
    async def test_viewer_cannot_create(self, medicine_service, mock_db):
        mock_db.read_one.return_value = _role_row("viewer")

        req = CreateMedicationRequest(
            group_id="grp_test",
            name="Amlodipine",
            medication_type=MedicationType.ORAL,
            dosage_unit=DosageUnit.TABLET,
        )
        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.create_medication(req, "u_viewer")
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_stranger_cannot_create(self, medicine_service, mock_db):
        mock_db.read_one.return_value = None  # not a group member

        req = CreateMedicationRequest(
            group_id="grp_test",
            name="Amlodipine",
            medication_type=MedicationType.ORAL,
            dosage_unit=DosageUnit.TABLET,
        )
        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.create_medication(req, "u_stranger")
        assert exc_info.value.status_code == 403


# ================================================================
# list_medications
# ================================================================


class TestListMedications:
    @pytest.mark.asyncio
    async def test_viewer_can_list(self, medicine_service, mock_db):
        mock_db.read_one.return_value = _role_row("viewer")
        mock_db.read.return_value = [_make_medication_row(), _make_medication_row(id="med_xyz9876")]

        result = await medicine_service.list_medications("grp_test", "u_viewer")
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_stranger_cannot_list(self, medicine_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.list_medications("grp_test", "u_stranger")
        assert exc_info.value.status_code == 403


# ================================================================
# update_medication
# ================================================================


class TestUpdateMedication:
    @pytest.mark.asyncio
    async def test_member_can_update(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_medication_row(),  # existing med
            _role_row("member"),  # role check
        ]
        mock_db.execute_returning.return_value = _make_medication_row(name="Updated Name")

        req = UpdateMedicationRequest(name="Updated Name")
        result = await medicine_service.update_medication("med_abc1234", req, "u_test01")
        assert result.name == "Updated Name"

    @pytest.mark.asyncio
    async def test_viewer_cannot_update(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_medication_row(),  # existing med
            _role_row("viewer"),  # role check
        ]

        req = UpdateMedicationRequest(name="Updated Name")
        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.update_medication("med_abc1234", req, "u_viewer")
        assert exc_info.value.status_code == 403


# ================================================================
# delete_medication
# ================================================================


class TestDeleteMedication:
    @pytest.mark.asyncio
    async def test_member_can_delete(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_medication_row(),  # existing med
            _role_row("member"),  # role check
        ]

        result = await medicine_service.delete_medication("med_abc1234", "u_test01")
        assert result["deleted"] is True

    @pytest.mark.asyncio
    async def test_not_found_raises_404(self, medicine_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.delete_medication("med_missing", "u_test01")
        assert exc_info.value.status_code == 404


# ================================================================
# create_course
# ================================================================


class TestCreateCourse:
    @pytest.mark.asyncio
    async def test_member_can_create_course(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _role_row("member"),  # _require_member
            {"group_id": "grp_test"},  # _get_pet_group_id
            _make_medication_row(),  # medication exists
        ]
        mock_db.execute_returning.return_value = _make_course_row()
        # _enrich_course lookups
        mock_db.read_one.side_effect = [
            _role_row("member"),
            {"group_id": "grp_test"},
            _make_medication_row(),
            {"name": "Fluffy"},  # pet name
            {"name": "Amlodipine", "medication_type": "oral"},  # medication
            {"name": "Test User"},  # creator name
        ]

        req = CreateCourseRequest(
            pet_id="p_test01",
            medication_id="med_abc1234",
            group_id="grp_test",
            dosage=1.0,
            dosage_unit=DosageUnit.TABLET,
            frequency_days=1,
            times_per_day=[TimeOfDay.MORNING, TimeOfDay.EVENING],
            start_date="2026-04-09",
        )
        result = await medicine_service.create_course(req, "u_test01")
        assert result.medication_name == "Amlodipine"
        assert result.frequency_days == 1

    @pytest.mark.asyncio
    async def test_viewer_cannot_create_course(self, medicine_service, mock_db):
        mock_db.read_one.return_value = _role_row("viewer")

        req = CreateCourseRequest(
            pet_id="p_test01",
            medication_id="med_abc1234",
            group_id="grp_test",
            dosage=1.0,
            dosage_unit=DosageUnit.TABLET,
            start_date="2026-04-09",
        )
        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.create_course(req, "u_viewer")
        assert exc_info.value.status_code == 403


# ================================================================
# end_course
# ================================================================


class TestEndCourse:
    @pytest.mark.asyncio
    async def test_member_can_end_course(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_course_row(),  # existing course
            _role_row("member"),  # role check
        ]
        ended_row = _make_course_row(end_date=date(2026, 4, 10))
        mock_db.execute_returning.return_value = ended_row
        # _enrich_course lookups
        mock_db.read_one.side_effect = [
            _make_course_row(),
            _role_row("member"),
            {"name": "Fluffy"},
            {"name": "Amlodipine", "medication_type": "oral"},
            {"name": "Test User"},
        ]

        result = await medicine_service.end_course("tc_abc12345", "u_test01", "2026-04-10")
        assert result.end_date == "2026-04-10"

    @pytest.mark.asyncio
    async def test_not_found_raises_404(self, medicine_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.end_course("tc_missing", "u_test01")
        assert exc_info.value.status_code == 404


# ================================================================
# create_log
# ================================================================


class TestCreateLog:
    @pytest.mark.asyncio
    async def test_member_can_create_log(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _role_row("member"),  # _require_member
            _make_medication_row(),  # medication exists
            _make_course_row(),  # course exists
        ]
        mock_db.execute_returning.return_value = _make_log_row()
        # _enrich_log lookups
        mock_db.read_one.side_effect = [
            _role_row("member"),
            _make_medication_row(),
            _make_course_row(),
            {"name": "Amlodipine"},  # med name
            {"name": "Test User"},  # admin name
        ]

        req = CreateLogRequest(
            pet_id="p_test01",
            medication_id="med_abc1234",
            group_id="grp_test",
            course_id="tc_abc12345",
            dosage=1.0,
            dosage_unit=DosageUnit.TABLET,
            time_of_day=TimeOfDay.MORNING,
        )
        result = await medicine_service.create_log(req, "u_test01")
        assert result.medication_name == "Amlodipine"

    @pytest.mark.asyncio
    async def test_viewer_cannot_create_log(self, medicine_service, mock_db):
        mock_db.read_one.return_value = _role_row("viewer")

        req = CreateLogRequest(
            pet_id="p_test01",
            medication_id="med_abc1234",
            group_id="grp_test",
            dosage=1.0,
            dosage_unit=DosageUnit.TABLET,
        )
        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.create_log(req, "u_viewer")
        assert exc_info.value.status_code == 403


# ================================================================
# delete_log
# ================================================================


class TestDeleteLog:
    @pytest.mark.asyncio
    async def test_member_can_delete_log(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_log_row(),  # existing log
            _role_row("member"),  # role check
        ]

        result = await medicine_service.delete_log("mlog_abc123", "u_test01")
        assert result["deleted"] is True

    @pytest.mark.asyncio
    async def test_not_found_raises_404(self, medicine_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.delete_log("mlog_missing", "u_test01")
        assert exc_info.value.status_code == 404


# ================================================================
# _is_dosing_day
# ================================================================


class TestIsDosingDay:
    def test_daily_is_always_dosing_day(self, medicine_service):
        assert medicine_service._is_dosing_day(date(2026, 4, 1), 1, date(2026, 4, 5), None)

    def test_every_2_days_alternates(self, medicine_service):
        start = date(2026, 4, 1)
        # Day 0 (start): dosing
        assert medicine_service._is_dosing_day(start, 2, date(2026, 4, 1), None)
        # Day 1: no dosing
        assert not medicine_service._is_dosing_day(start, 2, date(2026, 4, 2), None)
        # Day 2: dosing
        assert medicine_service._is_dosing_day(start, 2, date(2026, 4, 3), None)

    def test_before_start_date_is_not_dosing(self, medicine_service):
        assert not medicine_service._is_dosing_day(date(2026, 4, 5), 1, date(2026, 4, 3), None)

    def test_after_end_date_is_not_dosing(self, medicine_service):
        assert not medicine_service._is_dosing_day(date(2026, 4, 1), 1, date(2026, 4, 10), date(2026, 4, 5))

    def test_on_end_date_is_dosing(self, medicine_service):
        assert medicine_service._is_dosing_day(date(2026, 4, 1), 1, date(2026, 4, 5), date(2026, 4, 5))

    def test_weekly_frequency(self, medicine_service):
        start = date(2026, 4, 1)  # Tuesday
        # Day 0: dosing
        assert medicine_service._is_dosing_day(start, 7, date(2026, 4, 1), None)
        # Day 3: no dosing
        assert not medicine_service._is_dosing_day(start, 7, date(2026, 4, 4), None)
        # Day 7: dosing
        assert medicine_service._is_dosing_day(start, 7, date(2026, 4, 8), None)


# ================================================================
# get_today_schedule
# ================================================================


class TestGetTodaySchedule:
    @pytest.mark.asyncio
    async def test_returns_scheduled_items(self, medicine_service, mock_db):
        # _get_pet_group_id
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test"},  # pet group
            _role_row("viewer"),  # viewer permission
        ]
        # courses
        mock_db.read.side_effect = [
            [  # courses query
                {
                    "id": "tc_001",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "medication_name": "Amlodipine",
                    "medication_type": "oral",
                    "group_id": "grp_test",
                    "dosage": 1.0,
                    "dosage_unit": "tablet",
                    "frequency_days": 1,
                    "times_per_day": ["morning", "evening"],
                    "start_date": date(2026, 4, 1),
                    "end_date": None,
                },
            ],
            [],  # logs query (empty = nothing done yet)
        ]

        result = await medicine_service.get_today_schedule("p_test01", "u_viewer", "2026-04-09")
        assert result.date == "2026-04-09"
        assert len(result.scheduled_items) == 2
        assert result.scheduled_items[0].time_of_day == "morning"
        assert result.scheduled_items[0].is_done is False
        assert result.scheduled_items[1].time_of_day == "evening"
        assert result.summary["total_scheduled"] == 2
        assert result.summary["pending"] == 2

    @pytest.mark.asyncio
    async def test_marks_done_when_log_exists(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test"},
            _role_row("member"),
        ]
        mock_db.read.side_effect = [
            [  # courses
                {
                    "id": "tc_001",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "medication_name": "Amlodipine",
                    "medication_type": "oral",
                    "group_id": "grp_test",
                    "dosage": 1.0,
                    "dosage_unit": "tablet",
                    "frequency_days": 1,
                    "times_per_day": ["morning"],
                    "start_date": date(2026, 4, 1),
                    "end_date": None,
                },
            ],
            [  # logs — morning is done
                {
                    "id": "mlog_001",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "group_id": "grp_test",
                    "course_id": "tc_001",
                    "dosage": 1.0,
                    "dosage_unit": "tablet",
                    "time_of_day": "morning",
                    "administered_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
                    "administered_by": "u_test01",
                    "administered_by_name": "David",
                    "notes": None,
                    "is_active": True,
                    "created_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
                    "updated_at": dt(2026, 4, 9, 8, 0, tzinfo=tz.utc),
                },
            ],
        ]

        result = await medicine_service.get_today_schedule("p_test01", "u_test01", "2026-04-09")
        assert len(result.scheduled_items) == 1
        assert result.scheduled_items[0].is_done is True
        assert result.scheduled_items[0].administered_by_name == "David"
        assert result.summary["completed"] == 1

    @pytest.mark.asyncio
    async def test_non_dosing_day_returns_empty(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test"},
            _role_row("viewer"),
        ]
        mock_db.read.side_effect = [
            [  # courses — every 2 days starting Apr 9
                {
                    "id": "tc_001",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "medication_name": "Amlodipine",
                    "medication_type": "oral",
                    "group_id": "grp_test",
                    "dosage": 1.0,
                    "dosage_unit": "tablet",
                    "frequency_days": 2,
                    "times_per_day": ["morning"],
                    "start_date": date(2026, 4, 9),
                    "end_date": None,
                },
            ],
            [],  # logs
        ]

        # Apr 10 is day 1 (not dosing day for freq=2)
        result = await medicine_service.get_today_schedule("p_test01", "u_viewer", "2026-04-10")
        assert len(result.scheduled_items) == 0
        assert result.summary["total_scheduled"] == 0

    @pytest.mark.asyncio
    async def test_all_day_item_marked_done_with_any_log(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test"},
            _role_row("member"),
        ]
        mock_db.read.side_effect = [
            [  # courses with all_day
                {
                    "id": "tc_001",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "medication_name": "Eye Drops",
                    "medication_type": "eye_drops",
                    "group_id": "grp_test",
                    "dosage": 2.0,
                    "dosage_unit": "drops",
                    "frequency_days": 1,
                    "times_per_day": ["all_day"],
                    "start_date": date(2026, 4, 1),
                    "end_date": None,
                },
            ],
            [  # log — no time_of_day set but course_id matches
                {
                    "id": "mlog_002",
                    "pet_id": "p_test01",
                    "medication_id": "med_001",
                    "group_id": "grp_test",
                    "course_id": "tc_001",
                    "dosage": 2.0,
                    "dosage_unit": "drops",
                    "time_of_day": None,
                    "administered_at": dt(2026, 4, 9, 14, 0, tzinfo=tz.utc),
                    "administered_by": "u_test01",
                    "administered_by_name": "David",
                    "notes": None,
                    "is_active": True,
                    "created_at": dt(2026, 4, 9, 14, 0, tzinfo=tz.utc),
                    "updated_at": dt(2026, 4, 9, 14, 0, tzinfo=tz.utc),
                },
            ],
        ]

        result = await medicine_service.get_today_schedule("p_test01", "u_test01", "2026-04-09")
        assert len(result.scheduled_items) == 1
        assert result.scheduled_items[0].time_of_day == "all_day"
        assert result.scheduled_items[0].is_done is True

    @pytest.mark.asyncio
    async def test_stranger_cannot_view_schedule(self, medicine_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test"},
            None,  # not a group member
        ]

        with pytest.raises(HTTPException) as exc_info:
            await medicine_service.get_today_schedule("p_test01", "u_stranger", "2026-04-09")
        assert exc_info.value.status_code == 403
