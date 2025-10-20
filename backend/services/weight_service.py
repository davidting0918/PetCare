import math
import uuid

from fastapi import HTTPException, status

from backend.core.db_manager import get_db
from backend.models.weight import (
    CreateWeightRecordRequest,
    SearchWeightRecordsRequest,
    SearchWeightRecordsResponse,
    UpdateWeightRecordRequest,
    WeightRecordDetails,
    WeightRecordInfo,
    weight_table,
)


class WeightService:
    """
    WeightService handles all weight record-related business logic following
    the group-based permissions model.

    Key Principles:
    - Group-Based Permissions: Access controlled through group membership roles
    - Creator/Member Can Record: Only creators and members can create/edit weight records
    - All Members Can View: All group members (including viewers) can view weight records
    - Prefixed ID: Uses wt_{8-char-id} format for clear type identification
    """

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

    # ================== Permission Helpers ==================

    async def _get_user_role(self, user_id: str, pet_id: str) -> str:
        sql = f"""
        select
            gm."role" as role
        from
            pets p
        left join group_members gm using (group_id)
        where
            p.id = '{pet_id}'
            and gm.user_id = '{user_id}'
            and gm.is_active = TRUE
            and p.is_active = TRUE
        """
        role = await self.db.read_one(sql)
        return role["role"] if role else "none"

    async def _can_record_weight(self, pet_id: str, user_id: str) -> bool:
        """Check if user can record weight in the group (creator and member only)"""
        role = await self._get_user_role(user_id, pet_id)
        return role in ["creator", "member"]

    async def _can_view_weight(self, pet_id: str, user_id: str) -> bool:
        """Check if user can view weight records in the group (all roles can view)"""
        role = await self._get_user_role(user_id, pet_id)
        return role in ["creator", "member", "viewer"]

    # ================== ID Generation ==================

    def _generate_weight_id(self) -> str:
        """
        Generate weight record ID with prefix.

        Format: wt_{8-char-id}
        Example: wt_abc12345
        """
        return f"wt_{uuid.uuid4().hex[:8]}"

    # ================== CRUD Operations ==================

    async def create_weight_record(self, request: CreateWeightRecordRequest, user_id: str) -> WeightRecordDetails:
        """
        Create a new weight record for a pet.

        Only creators and members can create weight records.
        """
        if not await self._can_record_weight(request.pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to record weight measurements for this pet",
            )

        weight_id = self._generate_weight_id()
        sql = f"""
        INSERT INTO {weight_table} (id, pet_id, weight, user_id, timestamp, notes)
        VALUES ('{weight_id}', '{request.pet_id}', {request.weight},
        '{user_id}', '{request.timestamp}', '{request.notes}')
        RETURNING *
        """
        created_record = await self.db.execute_returning(sql)
        return WeightRecordInfo(**created_record)

    async def get_weight_record(self, weight_id: str, user_id: str) -> WeightRecordDetails:
        """
        Get detailed information about a specific weight record.

        All group members (including viewers) can view weight records.
        """
        sql = """
        SELECT
            w.*,
            p.name as pet_name,
            p.pet_type,
            p.group_id,
            u.name as user_name
        FROM weight_records w
        JOIN pets p ON w.pet_id = p.id
        JOIN users u ON w.user_id = u.id
        WHERE w.id = {weight_id} AND w.is_active = TRUE AND p.is_active = TRUE
        """
        record = await self.db.read_one(sql)
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weight record not found")

        # Check view permission
        if not await self._can_view_weight(user_id, record["group_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this weight record"
            )

        return WeightRecordDetails(
            id=record["id"],
            pet_id=record["pet_id"],
            pet_name=record["pet_name"],
            pet_type=record["pet_type"],
            weight=float(record["weight"]),
            user_id=record["user_id"],
            user_name=record["user_name"],
            timestamp=record["timestamp"],
            notes=record["notes"],
            created_at=record["created_at"],
            updated_at=record["updated_at"],
            is_active=record["is_active"],
        )

    async def update_weight_record(
        self, weight_id: str, request: UpdateWeightRecordRequest, user_id: str
    ) -> WeightRecordDetails:
        """
        Update an existing weight record.

        Only the user who created the record can update it.
        """
        # Check permission
        can_modify, weight_info = await self._can_modify_weight_record(weight_id, user_id)
        if not can_modify:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own weight records"
            )

        # Build update query dynamically based on provided fields
        update_fields = []
        params = []

        if request.weight is not None:
            update_fields.append(f"weight = {request.weight}")

        if request.timestamp is not None:
            update_fields.append(f"timestamp = {request.timestamp}")

        if request.notes is not None:
            update_fields.append(f"notes = {request.notes}")

        if not update_fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        # Add weight_id as the last parameter
        params.append(weight_id)

        sql = f"""
        UPDATE {weight_table}
        SET {', '.join(update_fields)}
        WHERE id = {weight_id}
        RETURNING *
        """

        updated_record = await self.db.execute_returning(sql)
        if not updated_record:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update weight record"
            )

        # Get full details for response
        return await self.get_weight_record(weight_id, user_id)

    async def delete_weight_record(self, weight_id: str, user_id: str) -> dict:
        """
        Soft delete a weight record.

        Only the user who created the record can delete it.
        """
        # Check permission
        can_modify, weight_info = await self._can_modify_weight_record(weight_id, user_id)
        if not can_modify:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own weight records"
            )

        sql = f"""
        UPDATE {weight_table}
        SET is_active = FALSE
        WHERE id = {weight_id}
        RETURNING id
        """
        result = await self.db.execute_returning(sql)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete weight record"
            )

        return {"id": weight_id, "deleted": True}

    # ================== Search Operations ==================

    async def search_weight_records(
        self, request: SearchWeightRecordsRequest, user_id: str
    ) -> SearchWeightRecordsResponse:
        """
        Search weight records with various filters and pagination.

        All group members (including viewers) can search weight records.
        """
        # Build WHERE clause
        where_conditions = ["w.is_active = TRUE", "p.is_active = TRUE"]

        # Filter by pet_id
        if request.pet_id:
            # Validate pet access
            pet_context = await self._get_pet_group_context(request.pet_id)
            group_id = pet_context["group_id"]

            # Check view permission
            if not await self._can_view_weight(user_id, group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view weight records for this pet",
                )

            where_conditions.append(f"w.pet_id = {request.pet_id}")
        else:
            # If no pet_id specified, only show records from pets in groups the user has access to
            where_conditions.append(
                f"""
                p.group_id IN (
                    SELECT group_id FROM group_members
                    WHERE user_id = {user_id} AND is_active = TRUE
                )
            """
            )

        # Filter by user_id
        if request.user_id:
            where_conditions.append(f"w.user_id = {request.user_id}")

        # Filter by timestamp range
        if request.start:
            where_conditions.append(f"w.timestamp >= {request.start}")

        if request.end:
            where_conditions.append(f"w.timestamp <= {request.end}")

        where_clause = " AND ".join(where_conditions)

        # Get total count
        count_sql = f"""
        SELECT COUNT(*) as total
        FROM {weight_table} w
        JOIN pets p ON w.pet_id = p.id
        WHERE {where_clause}
        """
        count_result = await self.db.read_one(count_sql)
        total = count_result["total"] if count_result else 0

        # Calculate pagination
        offset = (request.page - 1) * request.number
        total_pages = math.ceil(total / request.number) if total > 0 else 0

        # Build ORDER BY clause
        order_field = request.order_by.value
        order_dir = request.order_direction.value.upper()

        # Get records
        records_sql = f"""
        SELECT
            w.id,
            w.pet_id,
            p.name as pet_name,
            w.weight,
            w.user_id,
            u.name as user_name,
            w.timestamp,
            w.notes,
            w.created_at
        FROM {weight_table} w
        JOIN pets p ON w.pet_id = p.id
        JOIN users u ON w.user_id = u.id
        WHERE {where_clause}
        ORDER BY w.{order_field} {order_dir}
        LIMIT {request.number} OFFSET {offset}
        """

        records = await self.db.read(records_sql)

        # Build response
        weight_records = [
            WeightRecordInfo(
                id=record["id"],
                pet_id=record["pet_id"],
                pet_name=record["pet_name"],
                weight=float(record["weight"]),
                user_id=record["user_id"],
                user_name=record["user_name"],
                timestamp=record["timestamp"],
                notes=record["notes"],
                created_at=record["created_at"],
            )
            for record in records
        ]

        return SearchWeightRecordsResponse(
            records=weight_records, total=total, page=request.page, number=request.number, total_pages=total_pages
        )
