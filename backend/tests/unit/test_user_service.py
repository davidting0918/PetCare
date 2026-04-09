"""
Unit tests for ``backend.services.user_service.UserService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``UserService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* No real bcrypt — the session-scoped ``_stub_bcrypt`` fixture in
  ``backend/tests/unit/conftest.py`` replaces ``pwd_context.hash`` /
  ``verify`` with deterministic fakes.
* No real Cloudinary — ``upload_image`` is patched at the service module
  to return a deterministic fake response (no network).
* Each test gets its own fresh mocks via fixtures (parallel-safe).
"""

from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile

from backend.models.user import CreateUserRequest, ResetPasswordRequest, UpdateUserInfoRequest

# ================================================================
# Helpers
# ================================================================


def _make_user_row(**overrides):
    """Return a dict shaped like a row from the ``users`` table."""
    base = {
        "id": "u_test01",
        "google_id": None,
        "email": "test@example.com",
        "picture": "",
        "hashed_pwd": "hashed:secret123",
        "name": "Test User",
        "personal_group_id": "grp_test01",
        "created_at": "2026-04-08T00:00:00+00:00",
        "updated_at": "2026-04-08T00:00:00+00:00",
        "source": "test_client",
        "is_active": True,
        "is_verified": True,
    }
    base.update(overrides)
    return base


def _make_upload_file(content: bytes, filename: str, content_type: str) -> UploadFile:
    """Build a real ``UploadFile`` backed by an in-memory buffer."""
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


# ================================================================
# Fixtures
# ================================================================


@pytest.fixture
def mock_db():
    """A fresh ``AsyncMock`` matching the ``PostgresAsyncClient`` surface."""
    db = AsyncMock()
    db.read = AsyncMock()
    db.read_one = AsyncMock()
    db.insert = AsyncMock()
    db.insert_one = AsyncMock()
    db.execute = AsyncMock()
    db.execute_returning = AsyncMock()
    return db


@pytest.fixture
def mock_group_service():
    """A mock ``GroupService`` whose ``create_group`` returns a stub group."""
    gs = MagicMock()
    gs.create_group = AsyncMock(return_value=SimpleNamespace(id="grp_test01"))
    return gs


async def _fake_upload_image(content, folder, public_id, content_type):
    """Default Cloudinary stub used by ``user_service`` fixture.

    Returns the same shape as ``backend.core.cloudinary_client.upload_image``
    so the service code under test reads ``secure_url`` and ``public_id``
    from a real-looking dict.
    """
    return {
        "secure_url": f"https://res.cloudinary.com/test-cloud/image/upload/v1/{folder}/{public_id}.jpg",
        "public_id": public_id,
        "bytes": len(content),
        "format": "jpg",
    }


@pytest.fixture
def user_service(monkeypatch, mock_db, mock_group_service):
    """
    Construct a ``UserService`` with all external dependencies stubbed:

    * ``get_db`` → returns ``mock_db``
    * ``GroupService()`` → returns ``mock_group_service``
    * ``upload_image`` → returns a deterministic fake Cloudinary response
    """
    monkeypatch.setattr("backend.services.user_service.get_db", lambda: mock_db)
    monkeypatch.setattr("backend.services.user_service.GroupService", lambda: mock_group_service)
    monkeypatch.setattr("backend.services.user_service.upload_image", _fake_upload_image)

    from backend.services.user_service import UserService

    return UserService()


# ================================================================
# create_user
# ================================================================


class TestCreateUser:
    @pytest.mark.asyncio
    async def test_happy_path_returns_user_info_with_personal_group(self, user_service, mock_db, mock_group_service):
        # Arrange
        mock_db.read_one.return_value = None  # email does not exist
        request = CreateUserRequest(email="newuser@example.com", name="New User", pwd="secret123")
        key_info = {"name": "test_client"}

        # Act
        result = await user_service.create_user(request, key_info)

        # Assert: response shape
        assert result.email == "newuser@example.com"
        assert result.name == "New User"
        assert result.personal_group_id == "grp_test01"
        assert result.source == "test_client"
        assert result.is_active is True

        # Assert: bcrypt seam was used (fake hasher prefixes "hashed:")
        inserted_user = mock_db.insert_one.await_args.args[1]
        assert inserted_user["hashed_pwd"] == "hashed:secret123"
        assert inserted_user["email"] == "newuser@example.com"

        # Assert: group service was called once with the request name
        assert mock_group_service.create_group.await_count == 1
        group_request_arg = mock_group_service.create_group.await_args.args[0]
        assert group_request_arg.name == "New User"

        # Assert: the personal_group_id update SQL ran after the insert
        assert mock_db.execute.await_count == 1
        update_sql = mock_db.execute.await_args.args[0]
        assert "personal_group_id = 'grp_test01'" in update_sql

    @pytest.mark.asyncio
    async def test_duplicate_email_raises_400_and_skips_writes(self, user_service, mock_db, mock_group_service):
        # Arrange
        mock_db.read_one.return_value = _make_user_row(email="dup@example.com")
        request = CreateUserRequest(email="dup@example.com", name="Duplicate", pwd="secret123")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.create_user(request, {"name": "test_client"})
        assert exc.value.status_code == 400
        assert "already exists" in exc.value.detail

        # Assert: no side effects took place
        assert mock_db.insert_one.await_count == 0
        assert mock_db.execute.await_count == 0
        assert mock_group_service.create_group.await_count == 0


# ================================================================
# update_user_info
# ================================================================


class TestUpdateUserInfo:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "update_kwargs,expected_fragments,unexpected_fragments",
        [
            (
                {"name": "New Name"},
                ["name = 'New Name'"],
                ["picture = "],
            ),
            (
                {"picture": "https://res.cloudinary.com/test/image/upload/v1/petcare/user_photos/u_test01.jpg"},
                [
                    "picture = 'https://res.cloudinary.com/test/image/upload/v1/petcare/user_photos/u_test01.jpg'",
                ],
                ["name = "],
            ),
            (
                {
                    "name": "New Name",
                    "picture": "https://res.cloudinary.com/test/image/upload/v1/petcare/user_photos/u_test01.jpg",
                },
                [
                    "name = 'New Name'",
                    "picture = 'https://res.cloudinary.com/test/image/upload/v1/petcare/user_photos/u_test01.jpg'",
                ],
                [],
            ),
        ],
    )
    async def test_updates_only_provided_fields(
        self,
        user_service,
        mock_db,
        update_kwargs,
        expected_fragments,
        unexpected_fragments,
    ):
        # Arrange
        existing = _make_user_row()
        updated = _make_user_row(**update_kwargs)
        mock_db.read_one.side_effect = [existing, updated]

        # Act
        result = await user_service.update_user_info(UpdateUserInfoRequest(**update_kwargs), "u_test01")

        # Assert: exactly one UPDATE was issued
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        for fragment in expected_fragments:
            assert fragment in sql
        for fragment in unexpected_fragments:
            assert fragment not in sql

        # Assert: the returned UserInfo carries the new values
        for field, value in update_kwargs.items():
            assert getattr(result, field) == value

    @pytest.mark.asyncio
    async def test_empty_request_skips_update_sql(self, user_service, mock_db):
        # Arrange
        existing = _make_user_row()
        mock_db.read_one.side_effect = [existing, existing]

        # Act
        result = await user_service.update_user_info(UpdateUserInfoRequest(), "u_test01")

        # Assert: no UPDATE was attempted
        assert mock_db.execute.await_count == 0
        assert result.id == "u_test01"

    @pytest.mark.asyncio
    async def test_user_not_found_raises_400(self, user_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = None

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.update_user_info(UpdateUserInfoRequest(name="x"), "u_missing")
        assert exc.value.status_code == 400
        assert "not found" in exc.value.detail
        assert mock_db.execute.await_count == 0


# ================================================================
# reset_password
# ================================================================


class TestResetPassword:
    @pytest.mark.asyncio
    async def test_happy_path_hashes_new_password_and_revokes_tokens(self, user_service, mock_db):
        # Arrange: user exists, old password matches the fake hasher format
        existing = _make_user_row(hashed_pwd="hashed:oldpwd")
        mock_db.read_one.side_effect = [existing, existing]
        request = ResetPasswordRequest(old_pwd="oldpwd", new_pwd="newpwd")

        # Act
        result = await user_service.reset_password(request, "u_test01")

        # Assert: new password was hashed via the seam
        assert mock_db.execute.await_count == 2
        update_sql = mock_db.execute.await_args_list[0].args[0]
        assert "hashed_pwd = 'hashed:newpwd'" in update_sql

        # Assert: token revocation runs after the password update
        delete_sql = mock_db.execute.await_args_list[1].args[0]
        assert "delete from access_tokens" in delete_sql.lower()
        assert "u_test01" in delete_sql

        # Assert: a UserInfo is returned for the same user
        assert result.id == "u_test01"

    @pytest.mark.asyncio
    async def test_user_not_found_raises_400(self, user_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = None

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.reset_password(ResetPasswordRequest(old_pwd="x", new_pwd="y"), "u_missing")
        assert exc.value.status_code == 400
        assert "not found" in exc.value.detail
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_wrong_old_password_raises_400_without_writes(self, user_service, mock_db):
        # Arrange: stored hash is for "correctpwd", request supplies a wrong one
        existing = _make_user_row(hashed_pwd="hashed:correctpwd")
        mock_db.read_one.return_value = existing

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.reset_password(
                ResetPasswordRequest(old_pwd="WRONGpwd", new_pwd="newpwd"),
                "u_test01",
            )
        assert exc.value.status_code == 400
        assert "Old password is incorrect" in exc.value.detail
        assert mock_db.execute.await_count == 0


# ================================================================
# upload_user_photo
# ================================================================


class TestUploadUserPhoto:
    @pytest.mark.asyncio
    async def test_happy_path_uploads_to_cloudinary_and_updates_picture_column(
        self, user_service, mock_db, monkeypatch
    ):
        # Arrange
        mock_db.read_one.return_value = _make_user_row(id="u_test01")
        captured_calls = []

        async def _capturing_upload(content, folder, public_id, content_type):
            captured_calls.append(
                {"content": content, "folder": folder, "public_id": public_id, "content_type": content_type}
            )
            return {
                "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/petcare/user_photos/u_test01.jpg",
                "public_id": "petcare/user_photos/u_test01",
                "bytes": len(content),
                "format": "jpg",
            }

        monkeypatch.setattr("backend.services.user_service.upload_image", _capturing_upload)
        upload = _make_upload_file(
            content=b"\x89PNG\r\n\x1a\n_fake_jpeg_bytes",
            filename="snapshot.jpg",
            content_type="image/jpeg",
        )

        # Act
        result = await user_service.upload_user_photo("u_test01", upload)

        # Assert: cloudinary client was called with the correct arguments
        assert len(captured_calls) == 1
        call = captured_calls[0]
        assert call["folder"] == "petcare/user_photos"
        assert call["public_id"] == "u_test01"
        assert call["content_type"] == "image/jpeg"
        assert call["content"] == b"\x89PNG\r\n\x1a\n_fake_jpeg_bytes"

        # Assert: response shape echoes the Cloudinary fields
        assert result["photo_url"].startswith("https://res.cloudinary.com/")
        assert result["photo_url"].endswith("/petcare/user_photos/u_test01.jpg")
        assert result["photo_name"] == "petcare/user_photos/u_test01"
        assert result["photo_type"] == "image/jpeg"
        assert result["photo_size"] == len(b"\x89PNG\r\n\x1a\n_fake_jpeg_bytes")

        # Assert: the picture column was updated for this user with the Cloudinary URL
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "picture = 'https://res.cloudinary.com/" in sql
        assert "u_test01" in sql

    @pytest.mark.asyncio
    async def test_user_not_found_raises_404(self, user_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = None
        upload = _make_upload_file(b"data", "x.jpg", "image/jpeg")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.upload_user_photo("u_missing", upload)
        assert exc.value.status_code == 404
        assert "not found" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_invalid_content_type_raises_400(self, user_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = _make_user_row()
        upload = _make_upload_file(b"%PDF-1.4 fake", "doc.pdf", "application/pdf")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.upload_user_photo("u_test01", upload)
        assert exc.value.status_code == 400
        assert "Invalid file type" in exc.value.detail

    @pytest.mark.asyncio
    async def test_file_over_10mb_raises_400(self, user_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = _make_user_row()
        too_big = b"\x00" * (11 * 1024 * 1024)
        upload = _make_upload_file(too_big, "huge.jpg", "image/jpeg")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.upload_user_photo("u_test01", upload)
        assert exc.value.status_code == 400
        assert "too large" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_cloudinary_failure_raises_500_and_skips_db_write(self, user_service, mock_db, monkeypatch):
        # Arrange: user exists, but the Cloudinary upload itself fails
        mock_db.read_one.return_value = _make_user_row()

        async def _failing_upload(*args, **kwargs):
            raise HTTPException(status_code=500, detail="Cloudinary upload failed: boom")

        monkeypatch.setattr("backend.services.user_service.upload_image", _failing_upload)

        upload = _make_upload_file(b"data", "x.jpg", "image/jpeg")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.upload_user_photo("u_test01", upload)
        assert exc.value.status_code == 500
        assert "Cloudinary" in exc.value.detail

        # Assert: no DB UPDATE happened — failure short-circuited before persistence
        assert mock_db.execute.await_count == 0
