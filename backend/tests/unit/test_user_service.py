"""
Unit tests for ``backend.services.user_service.UserService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``UserService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* No real bcrypt — the session-scoped ``_stub_bcrypt`` fixture in
  ``backend/tests/unit/conftest.py`` replaces ``pwd_context.hash`` /
  ``verify`` with deterministic fakes.
* No real filesystem — ``get_photo_storage_path`` is patched and
  ``aiofiles.open`` is replaced with an async-context-manager mock.
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


@pytest.fixture
def user_service(monkeypatch, mock_db, mock_group_service):
    """
    Construct a ``UserService`` with all external dependencies stubbed:

    * ``get_db`` → returns ``mock_db``
    * ``GroupService()`` → returns ``mock_group_service``
    * ``get_photo_storage_path`` → returns a fake path (no real ``mkdir``)
    """
    monkeypatch.setattr("backend.services.user_service.get_db", lambda: mock_db)
    monkeypatch.setattr("backend.services.user_service.GroupService", lambda: mock_group_service)
    monkeypatch.setattr(
        "backend.services.user_service.get_photo_storage_path",
        lambda category: "/fake/storage/path",
    )

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
                {"picture": "/static/user_photos/u_test01.jpg"},
                ["picture = '/static/user_photos/u_test01.jpg'"],
                ["name = "],
            ),
            (
                {"name": "New Name", "picture": "/static/user_photos/u_test01.jpg"},
                [
                    "name = 'New Name'",
                    "picture = '/static/user_photos/u_test01.jpg'",
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


class _AsyncFile:
    """Minimal async-context-manager standing in for ``aiofiles.open``."""

    def __init__(self):
        self.write = AsyncMock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None


class TestUploadUserPhoto:
    @pytest.mark.asyncio
    async def test_happy_path_writes_file_and_updates_picture_column(self, user_service, mock_db, monkeypatch):
        # Arrange
        mock_db.read_one.return_value = _make_user_row(id="u_test01")
        monkeypatch.setattr(
            "backend.services.user_service.aiofiles.open",
            lambda *args, **kwargs: _AsyncFile(),
        )
        upload = _make_upload_file(
            content=b"\x89PNG\r\n\x1a\n_fake_jpeg_bytes",
            filename="snapshot.jpg",
            content_type="image/jpeg",
        )

        # Act
        result = await user_service.upload_user_photo("u_test01", upload)

        # Assert: response shape and naming convention
        assert result["photo_name"] == "u_test01.jpg"
        assert result["photo_type"] == "image/jpeg"
        assert result["photo_url"].endswith("/static/user_photos/u_test01.jpg")
        assert result["photo_size"] == len(b"\x89PNG\r\n\x1a\n_fake_jpeg_bytes")

        # Assert: the picture column was updated for this user
        assert mock_db.execute.await_count == 1
        sql = mock_db.execute.await_args.args[0]
        assert "picture = " in sql
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
    async def test_write_failure_cleans_up_orphan_file_and_raises_500(self, user_service, mock_db, monkeypatch):
        # Arrange: user exists, aiofiles.open raises on enter
        mock_db.read_one.return_value = _make_user_row()

        def _raise(*args, **kwargs):
            raise IOError("disk full")

        monkeypatch.setattr("backend.services.user_service.aiofiles.open", _raise)
        monkeypatch.setattr("backend.services.user_service.os.path.exists", lambda path: True)
        remove_calls = []
        monkeypatch.setattr(
            "backend.services.user_service.os.remove",
            lambda path: remove_calls.append(path),
        )

        upload = _make_upload_file(b"data", "x.jpg", "image/jpeg")

        # Act + Assert
        with pytest.raises(HTTPException) as exc:
            await user_service.upload_user_photo("u_test01", upload)
        assert exc.value.status_code == 500
        assert "Failed to upload photo" in exc.value.detail

        # Assert: the orphan file path was removed exactly once
        assert len(remove_calls) == 1
        assert remove_calls[0].endswith(".jpg")
