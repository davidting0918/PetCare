import uuid
from datetime import date
from datetime import datetime as dt
from datetime import timezone as tz
from typing import Dict, List, Optional

from fastapi import HTTPException, status

from backend.core.db_manager import get_db
from backend.models.medicine import (
    CreateCourseRequest,
    CreateLogRequest,
    CreateMedicationRequest,
    MedicationInfo,
    MedicationLogInfo,
    ScheduledItem,
    TodayScheduleResponse,
    TreatmentCourseInfo,
    UpdateCourseRequest,
    UpdateMedicationRequest,
    medication_log_table,
    medication_table,
    treatment_course_table,
)


class MedicineService:
    """
    MedicineService handles medication tracking business logic:
    - Medication catalog (group-scoped)
    - Treatment courses (open-ended recurring schedules)
    - Medication logs (actual administration records)
    - Today's schedule computation (is_dosing_day + log matching)
    """

    @property
    def db(self):
        return get_db()

    # ================== ID Generation ==================

    def _generate_medication_id(self) -> str:
        return f"med_{uuid.uuid4().hex[:7]}"

    def _generate_course_id(self) -> str:
        return f"tc_{uuid.uuid4().hex[:8]}"

    def _generate_log_id(self) -> str:
        return f"mlog_{uuid.uuid4().hex[:6]}"

    # ================== Permission Helpers ==================

    async def _get_user_group_role(self, group_id: str, user_id: str) -> str:
        sql = """
        SELECT role FROM group_members
        WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
        """
        result = await self.db.read_one(sql, group_id, user_id)
        return result["role"] if result else "none"

    async def _require_member(self, group_id: str, user_id: str) -> None:
        role = await self._get_user_group_role(group_id, user_id)
        if role not in ("creator", "member"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You need member or creator role to perform this action",
            )

    async def _require_viewer(self, group_id: str, user_id: str) -> None:
        role = await self._get_user_group_role(group_id, user_id)
        if role not in ("creator", "member", "viewer"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this resource",
            )

    async def _get_pet_group_id(self, pet_id: str) -> str:
        sql = """
        SELECT group_id FROM pets
        WHERE id = $1 AND is_active = TRUE
        """
        result = await self.db.read_one(sql, pet_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pet not found",
            )
        return result["group_id"]

    # ================== Medication CRUD ==================

    async def create_medication(self, request: CreateMedicationRequest, user_id: str) -> MedicationInfo:
        await self._require_member(request.group_id, user_id)

        med_id = self._generate_medication_id()
        sql = f"""
        INSERT INTO {medication_table}
            (id, group_id, name, medication_type, default_dosage, dosage_unit, notes, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """
        record = await self.db.execute_returning(
            sql,
            med_id,
            request.group_id,
            request.name,
            request.medication_type.value,
            request.default_dosage,
            request.dosage_unit.value,
            request.notes,
            user_id,
        )
        return MedicationInfo(**record)

    async def get_medication(self, medication_id: str, user_id: str) -> MedicationInfo:
        sql = f"""
        SELECT * FROM {medication_table}
        WHERE id = $1 AND is_active = TRUE
        """
        record = await self.db.read_one(sql, medication_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication not found",
            )
        await self._require_viewer(record["group_id"], user_id)
        return MedicationInfo(**record)

    async def list_medications(self, group_id: str, user_id: str) -> List[MedicationInfo]:
        await self._require_viewer(group_id, user_id)
        sql = f"""
        SELECT * FROM {medication_table}
        WHERE group_id = $1 AND is_active = TRUE
        ORDER BY name ASC
        """
        records = await self.db.read(sql, group_id)
        return [MedicationInfo(**r) for r in records]

    async def update_medication(
        self, medication_id: str, request: UpdateMedicationRequest, user_id: str
    ) -> MedicationInfo:
        # Get existing
        sql = f"SELECT * FROM {medication_table} WHERE id = $1 AND is_active = TRUE"
        existing = await self.db.read_one(sql, medication_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication not found",
            )
        await self._require_member(existing["group_id"], user_id)

        update_fields = []
        params = []
        param_count = 0

        if request.name is not None:
            param_count += 1
            update_fields.append(f"name = ${param_count}")
            params.append(request.name)

        if request.medication_type is not None:
            param_count += 1
            update_fields.append(f"medication_type = ${param_count}")
            params.append(request.medication_type.value)

        if request.default_dosage is not None:
            param_count += 1
            update_fields.append(f"default_dosage = ${param_count}")
            params.append(request.default_dosage)

        if request.dosage_unit is not None:
            param_count += 1
            update_fields.append(f"dosage_unit = ${param_count}")
            params.append(request.dosage_unit.value)

        if request.notes is not None:
            param_count += 1
            update_fields.append(f"notes = ${param_count}")
            params.append(request.notes)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        param_count += 1
        update_sql = f"""
        UPDATE {medication_table}
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
        """
        params.append(medication_id)
        record = await self.db.execute_returning(update_sql, *params)
        return MedicationInfo(**record)

    async def delete_medication(self, medication_id: str, user_id: str) -> Dict[str, str]:
        sql = f"SELECT * FROM {medication_table} WHERE id = $1 AND is_active = TRUE"
        existing = await self.db.read_one(sql, medication_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication not found",
            )
        await self._require_member(existing["group_id"], user_id)

        await self.db.execute(
            f"UPDATE {medication_table} SET is_active = FALSE WHERE id = $1",
            medication_id,
        )
        return {"id": medication_id, "deleted": True}

    # ================== Treatment Course CRUD ==================

    def _parse_date(self, date_str: str, field_name: str) -> date:
        try:
            return dt.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must be in YYYY-MM-DD format",
            )

    async def create_course(self, request: CreateCourseRequest, user_id: str) -> TreatmentCourseInfo:
        await self._require_member(request.group_id, user_id)

        # Validate pet exists and belongs to group
        pet_group_id = await self._get_pet_group_id(request.pet_id)
        if pet_group_id != request.group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pet does not belong to the specified group",
            )

        # Validate medication exists and belongs to group
        med_sql = f"SELECT * FROM {medication_table} WHERE id = $1 AND is_active = TRUE"
        med = await self.db.read_one(med_sql, request.medication_id)
        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication not found",
            )
        if med["group_id"] != request.group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medication does not belong to the specified group",
            )

        start_date = self._parse_date(request.start_date, "start_date")
        end_date = self._parse_date(request.end_date, "end_date") if request.end_date else None

        times_per_day_values = [t.value if hasattr(t, "value") else t for t in request.times_per_day]

        course_id = self._generate_course_id()
        sql = f"""
        INSERT INTO {treatment_course_table}
            (id, pet_id, medication_id, group_id, dosage, dosage_unit,
             frequency_days, times_per_day, start_date, end_date, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::time_of_day_enum[], $9, $10, $11, $12)
        RETURNING *
        """
        record = await self.db.execute_returning(
            sql,
            course_id,
            request.pet_id,
            request.medication_id,
            request.group_id,
            request.dosage,
            request.dosage_unit.value,
            request.frequency_days,
            times_per_day_values,
            start_date,
            end_date,
            request.notes,
            user_id,
        )
        return await self._enrich_course(record)

    async def _enrich_course(self, record: dict) -> TreatmentCourseInfo:
        """Enrich a raw course record with pet name, medication name, creator name."""
        pet_sql = "SELECT name FROM pets WHERE id = $1"
        pet = await self.db.read_one(pet_sql, record["pet_id"])

        med_sql = f"SELECT name, medication_type FROM {medication_table} WHERE id = $1"
        med = await self.db.read_one(med_sql, record["medication_id"])

        creator_name = None
        if record.get("created_by"):
            user_sql = "SELECT name FROM users WHERE id = $1"
            user = await self.db.read_one(user_sql, record["created_by"])
            creator_name = user["name"] if user else None

        # Convert times_per_day to list of strings
        times = record["times_per_day"]
        if isinstance(times, (list, tuple)):
            times_list = [str(t) for t in times]
        else:
            times_list = [str(times)]

        return TreatmentCourseInfo(
            id=record["id"],
            pet_id=record["pet_id"],
            pet_name=pet["name"] if pet else "Unknown",
            medication_id=record["medication_id"],
            medication_name=med["name"] if med else "Unknown",
            medication_type=med["medication_type"] if med else "other",
            group_id=record["group_id"],
            dosage=float(record["dosage"]),
            dosage_unit=record["dosage_unit"],
            frequency_days=record["frequency_days"],
            times_per_day=times_list,
            start_date=str(record["start_date"]),
            end_date=str(record["end_date"]) if record["end_date"] else None,
            notes=record.get("notes"),
            created_by=record.get("created_by"),
            created_by_name=creator_name,
            is_active=record["is_active"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

    def _course_from_enriched_row(self, record: dict) -> TreatmentCourseInfo:
        """Build TreatmentCourseInfo from a row that already has JOINed columns."""
        times = record["times_per_day"]
        if isinstance(times, (list, tuple)):
            times_list = [str(t) for t in times]
        else:
            times_list = [str(times)]

        return TreatmentCourseInfo(
            id=record["id"],
            pet_id=record["pet_id"],
            pet_name=record.get("pet_name") or "Unknown",
            medication_id=record["medication_id"],
            medication_name=record.get("medication_name") or "Unknown",
            medication_type=record.get("medication_type") or "other",
            group_id=record["group_id"],
            dosage=float(record["dosage"]),
            dosage_unit=record["dosage_unit"],
            frequency_days=record["frequency_days"],
            times_per_day=times_list,
            start_date=str(record["start_date"]),
            end_date=str(record["end_date"]) if record["end_date"] else None,
            notes=record.get("notes"),
            created_by=record.get("created_by"),
            created_by_name=record.get("created_by_name"),
            is_active=record["is_active"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

    async def list_courses(
        self,
        pet_id: str,
        user_id: str,
        course_status: str = "active",
    ) -> List[TreatmentCourseInfo]:
        group_id = await self._get_pet_group_id(pet_id)
        await self._require_viewer(group_id, user_id)

        conditions = [
            "tc.pet_id = $1",
            "tc.is_active = TRUE",
        ]

        if course_status == "active":
            conditions.append("(tc.end_date IS NULL OR tc.end_date >= CURRENT_DATE)")
        elif course_status == "ended":
            conditions.append("tc.end_date IS NOT NULL AND tc.end_date < CURRENT_DATE")
        # "all" — no extra condition

        sql = f"""
        SELECT tc.*,
               p.name AS pet_name,
               m.name AS medication_name,
               m.medication_type,
               u.name AS created_by_name
        FROM {treatment_course_table} tc
        LEFT JOIN pets p ON tc.pet_id = p.id
        LEFT JOIN {medication_table} m ON tc.medication_id = m.id
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE {' AND '.join(conditions)}
        ORDER BY tc.created_at DESC
        """
        records = await self.db.read(sql, pet_id)
        return [self._course_from_enriched_row(r) for r in records]

    async def update_course(
        self,
        course_id: str,
        request: UpdateCourseRequest,
        user_id: str,
    ) -> TreatmentCourseInfo:
        sql = f"SELECT * FROM {treatment_course_table} WHERE id = $1 AND is_active = TRUE"
        existing = await self.db.read_one(sql, course_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment course not found",
            )
        await self._require_member(existing["group_id"], user_id)

        update_fields = []
        params = []
        param_count = 0

        if request.dosage is not None:
            param_count += 1
            update_fields.append(f"dosage = ${param_count}")
            params.append(request.dosage)

        if request.dosage_unit is not None:
            param_count += 1
            update_fields.append(f"dosage_unit = ${param_count}")
            params.append(request.dosage_unit.value)

        frequency_changed = False
        if request.frequency_days is not None:
            param_count += 1
            update_fields.append(f"frequency_days = ${param_count}")
            params.append(request.frequency_days)
            frequency_changed = True

        if request.times_per_day is not None:
            times_values = [t.value if hasattr(t, "value") else t for t in request.times_per_day]
            param_count += 1
            update_fields.append(f"times_per_day = ${param_count}::time_of_day_enum[]")
            params.append(times_values)

        if request.end_date is not None:
            end_date = self._parse_date(request.end_date, "end_date")
            param_count += 1
            update_fields.append(f"end_date = ${param_count}")
            params.append(end_date)

        if request.notes is not None:
            param_count += 1
            update_fields.append(f"notes = ${param_count}")
            params.append(request.notes)

        # If frequency changed, reset start_date to local_date (today from client)
        if frequency_changed:
            local_date_str = request.local_date
            if not local_date_str:
                local_date_str = dt.now(tz.utc).strftime("%Y-%m-%d")
            new_start = self._parse_date(local_date_str, "local_date")
            param_count += 1
            update_fields.append(f"start_date = ${param_count}")
            params.append(new_start)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        param_count += 1
        update_sql = f"""
        UPDATE {treatment_course_table}
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        RETURNING *
        """
        params.append(course_id)
        record = await self.db.execute_returning(update_sql, *params)
        return await self._enrich_course(record)

    async def end_course(self, course_id: str, user_id: str, local_date: Optional[str] = None) -> TreatmentCourseInfo:
        sql = f"SELECT * FROM {treatment_course_table} WHERE id = $1 AND is_active = TRUE"
        existing = await self.db.read_one(sql, course_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Treatment course not found",
            )
        await self._require_member(existing["group_id"], user_id)

        if not local_date:
            local_date = dt.now(tz.utc).strftime("%Y-%m-%d")
        end_date = self._parse_date(local_date, "local_date")

        update_sql = f"""
        UPDATE {treatment_course_table}
        SET end_date = $1
        WHERE id = $2
        RETURNING *
        """
        record = await self.db.execute_returning(update_sql, end_date, course_id)
        return await self._enrich_course(record)

    # ================== Medication Log CRUD ==================

    async def create_log(self, request: CreateLogRequest, user_id: str) -> MedicationLogInfo:
        await self._require_member(request.group_id, user_id)

        # Validate medication exists
        med_sql = f"SELECT * FROM {medication_table} WHERE id = $1 AND is_active = TRUE"
        med = await self.db.read_one(med_sql, request.medication_id)
        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication not found",
            )

        # If course_id provided, validate it exists
        if request.course_id:
            course_sql = f"SELECT * FROM {treatment_course_table} " f"WHERE id = $1 AND is_active = TRUE"
            course = await self.db.read_one(course_sql, request.course_id)
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Treatment course not found",
                )

        log_id = self._generate_log_id()
        time_of_day_val = request.time_of_day.value if request.time_of_day else None

        sql = f"""
        INSERT INTO {medication_log_table}
            (id, pet_id, medication_id, group_id, course_id,
             dosage, dosage_unit, time_of_day, administered_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7,
                $8::time_of_day_enum, $9, $10)
        RETURNING *
        """
        record = await self.db.execute_returning(
            sql,
            log_id,
            request.pet_id,
            request.medication_id,
            request.group_id,
            request.course_id,
            request.dosage,
            request.dosage_unit.value,
            time_of_day_val,
            user_id,
            request.notes,
        )
        return await self._enrich_log(record)

    async def _enrich_log(self, record: dict) -> MedicationLogInfo:
        med_sql = f"SELECT name FROM {medication_table} WHERE id = $1"
        med = await self.db.read_one(med_sql, record["medication_id"])

        admin_name = None
        if record.get("administered_by"):
            user_sql = "SELECT name FROM users WHERE id = $1"
            user = await self.db.read_one(user_sql, record["administered_by"])
            admin_name = user["name"] if user else None

        return MedicationLogInfo(
            id=record["id"],
            pet_id=record["pet_id"],
            medication_id=record["medication_id"],
            medication_name=med["name"] if med else "Unknown",
            group_id=record["group_id"],
            course_id=record.get("course_id"),
            dosage=float(record["dosage"]),
            dosage_unit=record["dosage_unit"],
            time_of_day=record.get("time_of_day"),
            administered_at=record["administered_at"],
            administered_by=record.get("administered_by"),
            administered_by_name=admin_name,
            notes=record.get("notes"),
            is_active=record["is_active"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
        )

    async def delete_log(self, log_id: str, user_id: str) -> Dict[str, str]:
        sql = f"SELECT * FROM {medication_log_table} WHERE id = $1 AND is_active = TRUE"
        existing = await self.db.read_one(sql, log_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medication log not found",
            )
        await self._require_member(existing["group_id"], user_id)

        await self.db.execute(
            f"UPDATE {medication_log_table} SET is_active = FALSE WHERE id = $1",
            log_id,
        )
        return {"id": log_id, "deleted": True}

    # ================== Today's Schedule ==================

    def _is_dosing_day(self, start_date: date, frequency_days: int, check_date: date, end_date: Optional[date]) -> bool:
        if check_date < start_date:
            return False
        if end_date and check_date > end_date:
            return False
        days_since_start = (check_date - start_date).days
        return days_since_start % frequency_days == 0

    async def get_today_schedule(
        self, pet_id: str, user_id: str, local_date: Optional[str] = None
    ) -> TodayScheduleResponse:
        group_id = await self._get_pet_group_id(pet_id)
        await self._require_viewer(group_id, user_id)

        if local_date:
            check_date = self._parse_date(local_date, "local_date")
        else:
            check_date = dt.now(tz.utc).date()

        date_str = check_date.isoformat()

        # Get all active courses for this pet
        course_sql = f"""
        SELECT tc.*, m.name as medication_name, m.medication_type
        FROM {treatment_course_table} tc
        JOIN {medication_table} m ON tc.medication_id = m.id
        WHERE tc.pet_id = $1
          AND tc.is_active = TRUE
          AND m.is_active = TRUE
          AND tc.start_date <= $2
          AND (tc.end_date IS NULL OR tc.end_date >= $2)
        """
        courses = await self.db.read(course_sql, pet_id, check_date)

        # Get all logs for this pet on this date (JOIN medications for ad-hoc enrichment)
        log_sql = f"""
        SELECT ml.*, u.name as administered_by_name, m.name as medication_name
        FROM {medication_log_table} ml
        LEFT JOIN users u ON ml.administered_by = u.id
        LEFT JOIN {medication_table} m ON ml.medication_id = m.id
        WHERE ml.pet_id = $1
          AND ml.is_active = TRUE
          AND DATE(ml.administered_at) = $2
        """
        logs = await self.db.read(log_sql, pet_id, check_date)

        # Build scheduled items
        scheduled_items: List[ScheduledItem] = []
        for course in courses:
            course_start = course["start_date"]
            course_end = course["end_date"]
            freq = course["frequency_days"]

            if not self._is_dosing_day(course_start, freq, check_date, course_end):
                continue

            times = course["times_per_day"]
            if isinstance(times, (list, tuple)):
                times_list = [str(t) for t in times]
            else:
                times_list = [str(times)]

            for time_slot in times_list:
                # Find matching log
                matching_log = None
                for log in logs:
                    if log.get("course_id") == course["id"] and (
                        time_slot == "all_day" or str(log.get("time_of_day", "")) == time_slot
                    ):
                        matching_log = log
                        break

                scheduled_items.append(
                    ScheduledItem(
                        course_id=course["id"],
                        medication_id=course["medication_id"],
                        medication_name=course["medication_name"],
                        medication_type=course["medication_type"],
                        dosage=float(course["dosage"]),
                        dosage_unit=course["dosage_unit"],
                        time_of_day=time_slot,
                        is_done=matching_log is not None,
                        log_id=matching_log["id"] if matching_log else None,
                        administered_by_name=(matching_log.get("administered_by_name") if matching_log else None),
                        administered_at=(matching_log["administered_at"] if matching_log else None),
                    )
                )

        # Ad-hoc logs: logs without a course_id on this date
        # Data is already enriched via JOINs above — no per-record queries needed
        ad_hoc_logs = []
        for log in logs:
            if not log.get("course_id"):
                ad_hoc_logs.append(
                    MedicationLogInfo(
                        id=log["id"],
                        pet_id=log["pet_id"],
                        medication_id=log["medication_id"],
                        medication_name=log.get("medication_name") or "Unknown",
                        group_id=log["group_id"],
                        course_id=log.get("course_id"),
                        dosage=float(log["dosage"]),
                        dosage_unit=log["dosage_unit"],
                        time_of_day=log.get("time_of_day"),
                        administered_at=log["administered_at"],
                        administered_by=log.get("administered_by"),
                        administered_by_name=log.get("administered_by_name"),
                        notes=log.get("notes"),
                        is_active=log["is_active"],
                        created_at=log["created_at"],
                        updated_at=log["updated_at"],
                    )
                )

        total = len(scheduled_items)
        completed = sum(1 for item in scheduled_items if item.is_done)

        return TodayScheduleResponse(
            pet_id=pet_id,
            date=date_str,
            scheduled_items=scheduled_items,
            ad_hoc_logs=ad_hoc_logs,
            summary={
                "total_scheduled": total,
                "completed": completed,
                "pending": total - completed,
            },
        )
