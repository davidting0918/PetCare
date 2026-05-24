"""Medicine business logic: catalog, schedules, and administration logs.

Three sub-domains:
  1. medications      — group-scoped catalog. Modifications restricted to
                        CREATOR / MEMBER. Viewers can read.
  2. treatment_courses — pet-scoped recurring schedules. Modifications by
                        CREATOR / MEMBER. Open-ended (`end_date IS NULL`)
                        until someone explicitly ends them.
  3. medication_logs  — actual administration events. Recorder OR group
                        CREATOR can delete.

The "today's schedule" endpoint expands each active course at the requested
date (filtering by `(local_date - start_date) % frequency_days == 0`) into
one ScheduledItem per `times_per_day` slot, then matches each against
medication_logs to mark which slots have been administered.

`times_per_day` is a Postgres ENUM array; we cast on INSERT/UPDATE with
`::time_of_day_enum[]`.
"""

import logging
import secrets
from datetime import date as _date
from datetime import datetime, time, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.core.postgres_database import PostgresAsyncClient
from backend.models.group import GroupRole, group_member_table
from backend.models.medicine import (
    CourseStatusFilter,
    CreateCourseRequest,
    CreateLogRequest,
    CreateMedicationRequest,
    DosageUnit,
    EndCourseRequest,
    MedicationInfo,
    MedicationLogInfo,
    MedicationType,
    ScheduledItem,
    TimeOfDay,
    TodayScheduleResponse,
    TreatmentCourseInfo,
    UpdateCourseRequest,
    UpdateMedicationRequest,
    medication_log_table,
    medication_table,
    treatment_course_table,
)
from backend.models.pet import pet_table
from backend.models.user import user_table

logger = logging.getLogger(__name__)


class MedicineService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── id helpers ──────

    async def _generate_id(self, table: str, prefix: str) -> str:
        # All three medicine tables use varchar(11) PKs with 3-char prefixes.
        for _ in range(5):
            candidate = prefix + secrets.token_hex(4)  # prefix(3) + 8 hex = 11
            existing = await self._db.read_one(
                f"SELECT 1 FROM {table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError(f"Failed to generate a unique id for {table}")

    # ────── permission helpers ──────

    async def _membership(self, group_id: str, user_id: str) -> dict | None:
        return await self._db.read_one(
            f"""
            SELECT role FROM {group_member_table}
            WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
            """,
            group_id, user_id,
        )

    async def _require_group_role(
        self, group_id: str, user_id: str, allowed: set[GroupRole]
    ) -> dict:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )
        if GroupRole(membership["role"]) not in allowed:
            roles = ", ".join(sorted(r.value for r in allowed))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {roles}",
            )
        return membership

    async def _require_can_view(self, group_id: str, user_id: str) -> dict:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )
        return membership

    async def _get_pet(self, pet_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT id, name, group_id FROM {pet_table} WHERE id = $1 AND is_active = TRUE",
            pet_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
        return row

    async def _get_medication_or_404(self, medication_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {medication_table} WHERE id = $1 AND is_active = TRUE",
            medication_id,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found"
            )
        return row

    async def _get_course_or_404(self, course_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {treatment_course_table} WHERE id = $1 AND is_active = TRUE",
            course_id,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Treatment course not found"
            )
        return row

    async def _get_log_or_404(self, log_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {medication_log_table} WHERE id = $1 AND is_active = TRUE",
            log_id,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Medication log not found"
            )
        return row

    # ────────────────────────────────── MEDICATIONS ──────────────────────────────────

    async def create_medication(
        self, request: CreateMedicationRequest, user_id: str
    ) -> MedicationInfo:
        await self._require_group_role(
            request.group_id, user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        med_id = await self._generate_id(medication_table, "md_")
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            medication_table,
            {
                "id": med_id,
                "group_id": request.group_id,
                "name": request.name,
                "medication_type": request.medication_type.value,
                "default_dosage": request.default_dosage,
                "dosage_unit": request.dosage_unit.value,
                "notes": request.notes,
                "creator_id": user_id,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self.get_medication(med_id, user_id)

    async def get_medication(self, medication_id: str, user_id: str) -> MedicationInfo:
        row = await self._get_medication_or_404(medication_id)
        await self._require_can_view(row["group_id"], user_id)
        return self._row_to_medication(row)

    async def list_medications(self, group_id: str, user_id: str) -> list[MedicationInfo]:
        await self._require_can_view(group_id, user_id)
        rows = await self._db.read(
            f"""
            SELECT * FROM {medication_table}
            WHERE group_id = $1 AND is_active = TRUE
            ORDER BY name ASC
            """,
            group_id,
        )
        return [self._row_to_medication(r) for r in rows]

    async def update_medication(
        self, request: UpdateMedicationRequest, user_id: str
    ) -> MedicationInfo:
        med = await self._get_medication_or_404(request.medication_id)
        await self._require_group_role(
            med["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        payload = request.model_dump(exclude_unset=True, exclude={"medication_id"})
        if not payload:
            return await self.get_medication(request.medication_id, user_id)
        for k, v in list(payload.items()):
            if hasattr(v, "value"):
                payload[k] = v.value

        set_clauses, values = self._set_clauses_and_values(payload)
        values.append(datetime.now(timezone.utc))
        values.append(request.medication_id)
        ts_p = f"${len(values) - 1}"
        id_p = f"${len(values)}"
        await self._db.execute(
            f"""
            UPDATE {medication_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_p}
            WHERE id = {id_p} AND is_active = TRUE
            """,
            *values,
        )
        return await self.get_medication(request.medication_id, user_id)

    async def delete_medication(self, medication_id: str, user_id: str) -> dict:
        med = await self._get_medication_or_404(medication_id)
        await self._require_group_role(
            med["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {medication_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, medication_id,
        )
        return {
            "deleted_medication_id": medication_id,
            "name": med["name"],
            "deleted_by": user_id,
            "deleted_at": now,
        }

    # ────────────────────────────────── COURSES ──────────────────────────────────

    async def create_course(
        self, request: CreateCourseRequest, user_id: str
    ) -> TreatmentCourseInfo:
        pet = await self._get_pet(request.pet_id)
        await self._require_group_role(
            pet["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        med = await self._get_medication_or_404(request.medication_id)
        if med["group_id"] != pet["group_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medication belongs to a different group than this pet",
            )
        if request.end_date and request.end_date < request.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be on or after start_date",
            )

        course_id = await self._generate_id(treatment_course_table, "tc_")
        now = datetime.now(timezone.utc)
        times_array = [t.value for t in (request.times_per_day or [TimeOfDay.MORNING])]
        # times_per_day is time_of_day_enum[] — explicit cast keeps asyncpg
        # from having to inspect the column type.
        await self._db.execute(
            f"""
            INSERT INTO {treatment_course_table}
                (id, pet_id, medication_id, group_id, dosage, dosage_unit,
                 frequency_days, times_per_day, start_date, end_date, notes,
                 created_by, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::time_of_day_enum[],
                    $9, $10, $11, $12, TRUE, $13, $13)
            """,
            course_id,
            request.pet_id,
            request.medication_id,
            pet["group_id"],
            request.dosage,
            request.dosage_unit.value,
            request.frequency_days,
            times_array,
            request.start_date,
            request.end_date,
            request.notes,
            user_id,
            now,
        )
        return await self.get_course(course_id, user_id)

    async def update_course(
        self, request: UpdateCourseRequest, user_id: str
    ) -> TreatmentCourseInfo:
        course = await self._get_course_or_404(request.course_id)
        await self._require_group_role(
            course["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )

        payload = request.model_dump(exclude_unset=True, exclude={"course_id", "local_date"})
        if request.end_date is not None and request.end_date < course["start_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be on or after the course's start_date",
            )

        # When the cadence changes, reset start_date to the client's "today"
        # so the new frequency_days cycle begins immediately rather than
        # carrying over the old offset.
        if "frequency_days" in payload:
            new_start = request.local_date or datetime.now(timezone.utc).date()
            payload["start_date"] = new_start

        for k, v in list(payload.items()):
            if hasattr(v, "value"):
                payload[k] = v.value
            elif isinstance(v, list):  # times_per_day list of enums
                payload[k] = [t.value if hasattr(t, "value") else t for t in v]

        if not payload:
            return await self.get_course(request.course_id, user_id)

        set_clauses: list[str] = []
        values: list[Any] = []
        for col, val in payload.items():
            values.append(val)
            placeholder = f"${len(values)}"
            if col == "times_per_day":
                set_clauses.append(f"{col} = {placeholder}::time_of_day_enum[]")
            else:
                set_clauses.append(f"{col} = {placeholder}")
        values.append(datetime.now(timezone.utc))
        values.append(request.course_id)
        ts_p = f"${len(values) - 1}"
        id_p = f"${len(values)}"
        await self._db.execute(
            f"""
            UPDATE {treatment_course_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_p}
            WHERE id = {id_p} AND is_active = TRUE
            """,
            *values,
        )
        return await self.get_course(request.course_id, user_id)

    async def end_course(
        self, request: EndCourseRequest, user_id: str
    ) -> TreatmentCourseInfo:
        course = await self._get_course_or_404(request.course_id)
        await self._require_group_role(
            course["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        end_date = request.local_date or datetime.now(timezone.utc).date()
        if end_date < course["start_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be on or after the course's start_date",
            )
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"""
            UPDATE {treatment_course_table}
            SET end_date = $1, updated_at = $2
            WHERE id = $3 AND is_active = TRUE
            """,
            end_date, now, request.course_id,
        )
        return await self.get_course(request.course_id, user_id)

    async def get_course(self, course_id: str, user_id: str) -> TreatmentCourseInfo:
        course = await self._get_course_or_404(course_id)
        await self._require_can_view(course["group_id"], user_id)
        return await self._course_to_info(course)

    async def list_courses(
        self, pet_id: str, user_id: str, course_status: CourseStatusFilter
    ) -> list[TreatmentCourseInfo]:
        pet = await self._get_pet(pet_id)
        await self._require_can_view(pet["group_id"], user_id)

        # "active" courses are those with no end_date or whose end_date is
        # in the future (relative to the server's UTC today).
        today = datetime.now(timezone.utc).date()
        conditions = ["tc.is_active = TRUE", "tc.pet_id = $1"]
        values: list[Any] = [pet_id]
        if course_status == CourseStatusFilter.ACTIVE:
            values.append(today)
            conditions.append(f"(tc.end_date IS NULL OR tc.end_date >= ${len(values)})")
        elif course_status == CourseStatusFilter.ENDED:
            values.append(today)
            conditions.append(f"tc.end_date IS NOT NULL AND tc.end_date < ${len(values)}")
        # ALL: no additional filter

        rows = await self._db.read(
            f"""
            SELECT
                tc.*,
                p.name AS pet_name,
                m.name AS medication_name,
                m.medication_type AS medication_type,
                u.name AS created_by_name
            FROM {treatment_course_table} tc
            JOIN {pet_table} p ON p.id = tc.pet_id
            JOIN {medication_table} m ON m.id = tc.medication_id
            LEFT JOIN {user_table} u ON u.id = tc.created_by
            WHERE {' AND '.join(conditions)}
            ORDER BY tc.start_date DESC
            """,
            *values,
        )
        return [self._enriched_course_row_to_info(r) for r in rows]

    # ────────────────────────────────── LOGS ──────────────────────────────────

    async def create_log(self, request: CreateLogRequest, user_id: str) -> MedicationLogInfo:
        pet = await self._get_pet(request.pet_id)
        await self._require_group_role(
            pet["group_id"], user_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        med = await self._get_medication_or_404(request.medication_id)
        if med["group_id"] != pet["group_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medication belongs to a different group than this pet",
            )

        if request.course_id:
            course = await self._get_course_or_404(request.course_id)
            if course["pet_id"] != request.pet_id or course["medication_id"] != request.medication_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Course does not match the given pet + medication",
                )

        log_id = await self._generate_id(medication_log_table, "ml_")
        now = datetime.now(timezone.utc)
        administered_at = request.administered_at or now
        await self._db.insert_one(
            medication_log_table,
            {
                "id": log_id,
                "pet_id": request.pet_id,
                "medication_id": request.medication_id,
                "group_id": pet["group_id"],
                "course_id": request.course_id,
                "dosage": request.dosage,
                "dosage_unit": request.dosage_unit.value,
                "time_of_day": request.time_of_day.value if request.time_of_day else None,
                "administered_at": administered_at,
                "administered_by": user_id,
                "notes": request.notes,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self._fetch_log_info(log_id)

    async def delete_log(self, log_id: str, user_id: str) -> dict:
        log = await self._get_log_or_404(log_id)
        # Recorder or group CREATOR.
        if log["administered_by"] != user_id:
            membership = await self._membership(log["group_id"], user_id)
            if not membership or GroupRole(membership["role"]) != GroupRole.CREATOR:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the administrator or the group's CREATOR can delete this log",
                )
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {medication_log_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, log_id,
        )
        return {
            "deleted_log_id": log_id,
            "deleted_by": user_id,
            "deleted_at": now,
        }

    async def _fetch_log_info(self, log_id: str) -> MedicationLogInfo:
        row = await self._db.read_one(
            f"""
            SELECT
                ml.*,
                m.name AS medication_name,
                u.name AS administered_by_name
            FROM {medication_log_table} ml
            JOIN {medication_table} m ON m.id = ml.medication_id
            LEFT JOIN {user_table} u ON u.id = ml.administered_by
            WHERE ml.id = $1
            """,
            log_id,
        )
        assert row is not None
        return self._row_to_log_info(row)

    # ────────────────────────────────── TODAY ──────────────────────────────────

    async def get_today_schedule(
        self, pet_id: str, user_id: str, local_date: _date | None
    ) -> TodayScheduleResponse:
        pet = await self._get_pet(pet_id)
        await self._require_can_view(pet["group_id"], user_id)

        d = local_date or datetime.now(timezone.utc).date()
        day_start = datetime.combine(d, time.min, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        # Active courses due on `d`: (d - start_date) % frequency_days == 0.
        course_rows = await self._db.read(
            f"""
            SELECT
                tc.*,
                m.name AS medication_name,
                m.medication_type AS medication_type
            FROM {treatment_course_table} tc
            JOIN {medication_table} m ON m.id = tc.medication_id
            WHERE tc.is_active = TRUE
              AND tc.pet_id = $1
              AND tc.start_date <= $2
              AND (tc.end_date IS NULL OR tc.end_date >= $2)
              AND (($2 - tc.start_date) % tc.frequency_days) = 0
            """,
            pet_id, d,
        )

        log_rows = await self._db.read(
            f"""
            SELECT
                ml.*,
                m.name AS medication_name,
                u.name AS administered_by_name
            FROM {medication_log_table} ml
            JOIN {medication_table} m ON m.id = ml.medication_id
            LEFT JOIN {user_table} u ON u.id = ml.administered_by
            WHERE ml.is_active = TRUE
              AND ml.pet_id = $1
              AND ml.administered_at >= $2
              AND ml.administered_at < $3
            ORDER BY ml.administered_at ASC
            """,
            pet_id, day_start, day_end,
        )

        # Index logs by (course_id, time_of_day) so each schedule cell can
        # mark itself done. A `None` time_of_day on the log counts against
        # ALL_DAY for whatever course the log is attached to.
        by_slot: dict[tuple[str, str], dict] = {}
        ad_hoc: list[dict] = []
        for lg in log_rows:
            if lg.get("course_id"):
                slot = lg.get("time_of_day") or TimeOfDay.ALL_DAY.value
                by_slot.setdefault((lg["course_id"], slot), lg)
            else:
                ad_hoc.append(lg)

        scheduled_items: list[ScheduledItem] = []
        total_done = 0
        for course in course_rows:
            for slot in course["times_per_day"]:
                slot_val = slot if isinstance(slot, str) else getattr(slot, "value", slot)
                lg = by_slot.get((course["id"], slot_val))
                done = lg is not None
                if done:
                    total_done += 1
                scheduled_items.append(
                    ScheduledItem(
                        course_id=course["id"],
                        medication_id=course["medication_id"],
                        medication_name=course["medication_name"],
                        medication_type=MedicationType(course["medication_type"]),
                        dosage=course["dosage"],
                        dosage_unit=DosageUnit(course["dosage_unit"]),
                        time_of_day=TimeOfDay(slot_val),
                        is_done=done,
                        log_id=lg["id"] if lg else None,
                        administered_by_name=(lg.get("administered_by_name") if lg else None),
                        administered_at=(lg.get("administered_at") if lg else None),
                    )
                )

        return TodayScheduleResponse(
            pet_id=pet_id,
            date=d.isoformat(),
            scheduled_items=scheduled_items,
            ad_hoc_logs=[self._row_to_log_info(r) for r in ad_hoc],
            total_scheduled=len(scheduled_items),
            total_done=total_done,
            total_ad_hoc=len(ad_hoc),
        )

    # ────────────────────────────────── row → DTO converters ─────────────────────

    @staticmethod
    def _set_clauses_and_values(payload: dict) -> tuple[list[str], list[Any]]:
        set_clauses: list[str] = []
        values: list[Any] = []
        for i, (col, val) in enumerate(payload.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        return set_clauses, values

    @staticmethod
    def _row_to_medication(r: dict) -> MedicationInfo:
        return MedicationInfo(
            id=r["id"],
            group_id=r["group_id"],
            name=r["name"],
            medication_type=MedicationType(r["medication_type"]),
            default_dosage=r.get("default_dosage"),
            dosage_unit=DosageUnit(r["dosage_unit"]),
            notes=r.get("notes"),
            creator_id=r.get("creator_id"),
            is_active=bool(r.get("is_active", True)),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    @staticmethod
    def _row_to_log_info(r: dict) -> MedicationLogInfo:
        return MedicationLogInfo(
            id=r["id"],
            pet_id=r["pet_id"],
            medication_id=r["medication_id"],
            medication_name=r.get("medication_name") or "",
            group_id=r["group_id"],
            course_id=r.get("course_id"),
            dosage=r["dosage"],
            dosage_unit=DosageUnit(r["dosage_unit"]),
            time_of_day=TimeOfDay(r["time_of_day"]) if r.get("time_of_day") else None,
            administered_at=r["administered_at"],
            administered_by=r.get("administered_by"),
            administered_by_name=r.get("administered_by_name"),
            notes=r.get("notes"),
            is_active=bool(r.get("is_active", True)),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    @staticmethod
    def _enriched_course_row_to_info(r: dict) -> TreatmentCourseInfo:
        slots = r["times_per_day"] or []
        return TreatmentCourseInfo(
            id=r["id"],
            pet_id=r["pet_id"],
            pet_name=r["pet_name"],
            medication_id=r["medication_id"],
            medication_name=r["medication_name"],
            medication_type=MedicationType(r["medication_type"]),
            group_id=r["group_id"],
            dosage=r["dosage"],
            dosage_unit=DosageUnit(r["dosage_unit"]),
            frequency_days=int(r["frequency_days"]),
            times_per_day=[
                TimeOfDay(s if isinstance(s, str) else getattr(s, "value", s)) for s in slots
            ],
            start_date=r["start_date"],
            end_date=r.get("end_date"),
            notes=r.get("notes"),
            created_by=r.get("created_by"),
            created_by_name=r.get("created_by_name"),
            is_active=bool(r.get("is_active", True)),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    async def _course_to_info(self, course: dict) -> TreatmentCourseInfo:
        enriched = await self._db.read_one(
            f"""
            SELECT
                tc.*,
                p.name AS pet_name,
                m.name AS medication_name,
                m.medication_type AS medication_type,
                u.name AS created_by_name
            FROM {treatment_course_table} tc
            JOIN {pet_table} p ON p.id = tc.pet_id
            JOIN {medication_table} m ON m.id = tc.medication_id
            LEFT JOIN {user_table} u ON u.id = tc.created_by
            WHERE tc.id = $1
            """,
            course["id"],
        )
        assert enriched is not None
        return self._enriched_course_row_to_info(enriched)
