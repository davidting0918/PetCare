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
    - Creator/Member Can Manage: Creators and members can create, update, and delete ANY weight records in their group
    - Viewers Can View Only: Viewers can only view weight records, no modifications allowed
    - Simplified Model: No individual ownership - group role determines all permissions
    - Prefixed ID: Uses wt_{8-char-id} format for clear type identification
    """

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

    # ================== Permission Helpers ==================

    async def _get_user_role(self, user_id: str, pet_id: str) -> str:
        """Get user's role for a pet's group"""
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

    async def _has_edit_permission(self, pet_id: str, user_id: str) -> bool:
        """
        Check if user has EDIT permission (creator or member).
        Used for: create, update, delete operations.
        """
        role = await self._get_user_role(user_id, pet_id)
        return role in ["creator", "member"]

    async def _has_view_permission(self, pet_id: str, user_id: str) -> bool:
        """
        Check if user has VIEW permission (creator, member, or viewer).
        Used for: read and search operations.
        """
        role = await self._get_user_role(user_id, pet_id)
        return role in ["creator", "member", "viewer"]

    async def _get_weight_record_pet_id(self, weight_id: str) -> str:
        """
        Get pet_id from a weight record for permission checking.

        Returns:
            str: The pet_id associated with this weight record
        """
        sql = f"""
        SELECT w.pet_id
        FROM {weight_table} w
        JOIN pets p ON w.pet_id = p.id
        WHERE w.id = '{weight_id}' AND w.is_active = TRUE AND p.is_active = TRUE
        """
        record = await self.db.read_one(sql)
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weight record not found")
        return record["pet_id"]

    async def _get_pet_group_context(self, pet_id: str) -> dict:
        """
        Get pet's group context for permission checking.

        Returns:
            Dict containing pet and group information
        """
        sql = f"""
        SELECT
            p.id as pet_id,
            p.name as pet_name,
            p.owner_id,
            p.group_id,
            g.name as group_name
        FROM pets p
        LEFT JOIN groups g ON p.group_id = g.id
        WHERE p.id = '{pet_id}' AND p.is_active = TRUE AND g.is_active = TRUE
        """
        context = await self.db.read_one(sql)
        if not context:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found or not accessible")
        return context

    # ================== Pet Weight Sync ==================

    async def _sync_pet_current_weight(self, pet_id: str) -> None:
        """
        Update pets.current_weight_kg to match the latest active weight record.
        Sets to NULL if no active records exist.
        """
        sql = f"""
        SELECT weight
        FROM {weight_table}
        WHERE pet_id = '{pet_id}' AND is_active = TRUE
        ORDER BY timestamp DESC
        LIMIT 1
        """
        latest = await self.db.read_one(sql)
        new_weight = f"{float(latest['weight'])}" if latest else "NULL"

        update_sql = f"""
        UPDATE pets
        SET current_weight_kg = {new_weight}
        WHERE id = '{pet_id}'
        """
        await self.db.execute(update_sql)

    # ================== ID Generation ==================

    def _generate_weight_id(self) -> str:
        """
        Generate weight record ID with prefix.

        Format: wt_{8-char-id}
        Example: wt_abc12345
        """
        return f"wt_{uuid.uuid4().hex[:8]}"

    # ================== CRUD Operations ==================

    async def create_weight_record(
        self, request: CreateWeightRecordRequest, user_id: str, user_name: str
    ) -> WeightRecordDetails:
        """
        Create a new weight record for a pet.

        Requires EDIT permission (creator or member).
        """
        if not await self._has_edit_permission(request.pet_id, user_id):
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
        await self._sync_pet_current_weight(request.pet_id)
        return WeightRecordInfo(**created_record, user_name=user_name)

    async def get_weight_record(self, weight_id: str, user_id: str) -> WeightRecordDetails:
        """
        Get detailed information about a specific weight record.

        Requires VIEW permission (creator, member, or viewer).
        """
        sql = f"""
        SELECT
            w.*,
            p.name as pet_name,
            p.pet_type,
            p.group_id,
            u.name as user_name
        FROM weight_records w
        JOIN pets p ON w.pet_id = p.id
        JOIN users u ON w.user_id = u.id
        WHERE w.id = '{weight_id}' AND w.is_active = TRUE AND p.is_active = TRUE
        """
        record = await self.db.read_one(sql)
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weight record not found")

        # Check view permission
        if not await self._has_view_permission(record["pet_id"], user_id):
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

        Requires EDIT permission (creator or member).
        """
        # Get pet_id from weight record and check edit permission
        pet_id = await self._get_weight_record_pet_id(weight_id)
        if not await self._has_edit_permission(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creators and members can update weight records",
            )

        # Build update query dynamically based on provided fields
        update_fields = []
        if request.weight is not None:
            update_fields.append(f"weight = {request.weight:.2f}")

        if request.timestamp is not None:
            update_fields.append(f"timestamp = '{request.timestamp}'")

        if request.notes is not None:
            update_fields.append(f"notes = '{request.notes}'")

        if not update_fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        sql = f"""
        UPDATE weight_records
        SET {', '.join(update_fields)}
        WHERE id = '{weight_id}'
        RETURNING *
        """

        updated_record = await self.db.execute_returning(sql)
        if not updated_record:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update weight record"
            )

        # Sync pet weight after update
        await self._sync_pet_current_weight(pet_id)

        # Get full details for response
        return await self.get_weight_record(weight_id, user_id)

    async def delete_weight_record(self, weight_id: str, user_id: str) -> dict:
        """
        Soft delete a weight record.

        Requires EDIT permission (creator or member).
        """
        # Get pet_id from weight record and check edit permission
        pet_id = await self._get_weight_record_pet_id(weight_id)
        if not await self._has_edit_permission(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creators and members can delete weight records",
            )

        sql = f"""
        UPDATE weight_records
        SET is_active = FALSE
        WHERE id = '{weight_id}'
        RETURNING id
        """
        result = await self.db.execute_returning(sql)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete weight record"
            )

        await self._sync_pet_current_weight(pet_id)

        return {"id": weight_id, "deleted": True}

    # ================== Search Operations ==================

    async def search_weight_records(
        self, request: SearchWeightRecordsRequest, user_id: str
    ) -> SearchWeightRecordsResponse:
        """
        Search weight records with various filters and pagination.

        Requires VIEW permission (creator, member, or viewer).
        """
        # Validate that at least one of weight_id or pet_id is provided
        if not request.weight_id and not request.pet_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of 'weight_id' or 'pet_id' must be provided",
            )

        # Build WHERE clause
        where_conditions = ["w.is_active = TRUE", "p.is_active = TRUE"]

        # Filter by weight_id
        if request.weight_id:
            where_conditions.append(f"w.id = '{request.weight_id}'")

            # If only weight_id is provided (no pet_id), we need to validate permission
            # by first getting the pet_id from the weight record
            if not request.pet_id:
                pet_id = await self._get_weight_record_pet_id(request.weight_id)
                if not await self._has_view_permission(pet_id, user_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have permission to view this weight record",
                    )

        # Filter by pet_id
        if request.pet_id:
            # Check view permission
            if not await self._has_view_permission(request.pet_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view weight records for this pet",
                )

            where_conditions.append(f"w.pet_id = '{request.pet_id}'")

        # Filter by user_id
        if request.user_id:
            where_conditions.append(f"w.user_id = '{request.user_id}'")

        # Filter by timestamp range
        if request.start:
            where_conditions.append(f"w.timestamp >= '{request.start}'")

        if request.end:
            where_conditions.append(f"w.timestamp <= '{request.end}'")

        where_clause = " AND ".join(where_conditions)

        # Get total count
        count_sql = f"""
        SELECT COUNT(*) as total
        FROM {weight_table} w
        JOIN pets p ON w.pet_id = p.id
        LEFT JOIN users u ON w.user_id = u.id
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
            w.weight,
            w.user_id,
            u.name as user_name,
            w.timestamp,
            w.notes,
            w.created_at,
            w.updated_at
        FROM {weight_table} w
        JOIN pets p ON w.pet_id = p.id
        LEFT JOIN users u ON w.user_id = u.id
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
                weight=float(record["weight"]),
                user_id=record["user_id"],
                user_name=record["user_name"] or "Unknown User",
                timestamp=record["timestamp"],
                created_at=record["created_at"],
                updated_at=record["updated_at"],
                notes=record["notes"],
            )
            for record in records
        ]

        return SearchWeightRecordsResponse(
            records=weight_records, total=total, page=request.page, number=request.number, total_pages=total_pages
        )
