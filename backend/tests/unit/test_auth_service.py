"""
Unit tests for ``backend.services.auth_service.AuthService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``AuthService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* No real bcrypt — the session-scoped ``_stub_bcrypt`` fixture in
  ``backend/tests/unit/conftest.py`` replaces ``pwd_context.hash`` /
  ``verify`` with deterministic fakes.
* No real Google OAuth — ``GoogleAuthProvider`` is monkeypatched at
  the import site so ``AuthService.__init__`` constructs a stub.
* No real JWT secret — the test fixture overrides ``secret_key`` on
  the constructed instance so ``jwt.encode`` works without env vars.
* Each test gets its own fresh mocks via fixtures (parallel-safe).
"""

from datetime import datetime as dt
from datetime import timezone as tz
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from jose import jwt

from backend.models.auth import ALGORITHM

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
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "source": "test_client",
        "is_active": True,
        "is_verified": True,
    }
    base.update(overrides)
    return base


def _make_token_row(**overrides):
    """Return a dict shaped like a row from the ``access_tokens`` table."""
    base = {
        "token": "existing.jwt.token",
        "user_id": "u_test01",
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "expires_at": dt(2026, 4, 8, 2, tzinfo=tz.utc),
        "is_active": True,
    }
    base.update(overrides)
    return base


def _make_google_user_info(**overrides):
    """Return a ``SimpleNamespace`` matching the Google user info shape."""
    base = {
        "id": "google_id_123",
        "email": "google@example.com",
        "name": "Google User",
        "picture": "https://example.com/pic.jpg",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


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
def mock_google_provider():
    """A mock ``GoogleAuthProvider`` whose ``verify_token`` returns a stub."""
    provider = MagicMock()
    provider.verify_token = AsyncMock()
    return provider


@pytest.fixture
def mock_group_service():
    """A mock ``GroupService`` whose ``create_group`` returns a stub group."""
    gs = MagicMock()
    gs.create_group = AsyncMock(return_value=SimpleNamespace(id="grp_new01"))
    return gs


@pytest.fixture
def auth_service(monkeypatch, mock_db, mock_google_provider, mock_group_service):
    """
    Construct an ``AuthService`` with all external dependencies stubbed:

    * ``get_db`` → returns ``mock_db``
    * ``GoogleAuthProvider`` → returns ``mock_google_provider``
    * ``GroupService`` → returns ``mock_group_service``
    * ``secret_key`` → overridden with a test value so ``jwt.encode`` works
      without ``JWT_SECRET_KEY`` env var
    """
    monkeypatch.setattr("backend.services.auth_service.get_db", lambda: mock_db)
    monkeypatch.setattr(
        "backend.services.auth_service.GoogleAuthProvider",
        lambda client_id, client_secret: mock_google_provider,
    )
    monkeypatch.setattr("backend.services.auth_service.GroupService", lambda: mock_group_service)

    from backend.services.auth_service import AuthService

    service = AuthService()
    service.secret_key = "test_secret_key"
    return service


# ================================================================
# get_password_hash / verify_password
# ================================================================


class TestPasswordHelpers:
    def test_get_password_hash_routes_through_pwd_context(self, auth_service):
        # The bcrypt stub turns hash("foo") into "hashed:foo".
        assert auth_service.get_password_hash("secret123") == "hashed:secret123"

    def test_verify_password_returns_true_for_matching_hash(self, auth_service):
        assert auth_service.verify_password("secret123", "hashed:secret123") is True

    def test_verify_password_returns_false_for_mismatched_hash(self, auth_service):
        assert auth_service.verify_password("WRONG", "hashed:secret123") is False


# ================================================================
# create_access_token
# ================================================================


class TestCreateAccessToken:
    def test_returns_access_token_with_user_id_and_expiry(self, auth_service):
        # Act
        token = auth_service.create_access_token("u_test01")

        # Assert: model fields populated
        assert token.user_id == "u_test01"
        assert token.is_active is True
        assert token.expires_at > token.created_at

        # Assert: JWT decodes back to the same user_id with the test secret
        payload = jwt.decode(token.token, "test_secret_key", algorithms=[ALGORITHM])
        assert payload["sub"] == "u_test01"


# ================================================================
# find_valid_token
# ================================================================


class TestFindValidToken:
    @pytest.mark.asyncio
    async def test_returns_access_token_when_db_returns_row(self, auth_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = _make_token_row()

        # Act
        result = await auth_service.find_valid_token("u_test01")

        # Assert
        assert result is not None
        assert result.user_id == "u_test01"
        assert result.token == "existing.jwt.token"

    @pytest.mark.asyncio
    async def test_returns_none_when_no_valid_token_exists(self, auth_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = None

        # Act
        result = await auth_service.find_valid_token("u_test01")

        # Assert
        assert result is None


# ================================================================
# get_or_create_token
# ================================================================


class TestGetOrCreateToken:
    @pytest.mark.asyncio
    async def test_returns_existing_token_without_inserting(self, auth_service, mock_db):
        # Arrange: existing valid token in DB
        mock_db.read_one.return_value = _make_token_row(token="cached.jwt.token")

        # Act
        result = await auth_service.get_or_create_token("u_test01")

        # Assert: returns the cached token
        assert result == {"access_token": "cached.jwt.token", "token_type": "bearer"}
        # Assert: no insert happened
        assert mock_db.insert_one.await_count == 0

    @pytest.mark.asyncio
    async def test_creates_new_token_when_none_exists(self, auth_service, mock_db):
        # Arrange: no existing token
        mock_db.read_one.return_value = None

        # Act
        result = await auth_service.get_or_create_token("u_test01")

        # Assert: returns a new token wrapped in the dict envelope
        assert result["token_type"] == "bearer"
        assert isinstance(result["access_token"], str) and len(result["access_token"]) > 0

        # Assert: persisted to access_tokens table
        assert mock_db.insert_one.await_count == 1
        table_arg, payload_arg = mock_db.insert_one.await_args.args
        assert table_arg == "access_tokens"
        assert payload_arg["user_id"] == "u_test01"


# ================================================================
# authenticate_user
# ================================================================


class TestAuthenticateUser:
    @pytest.mark.asyncio
    async def test_returns_user_on_correct_password(self, auth_service, mock_db):
        # Arrange
        mock_db.read_one.return_value = _make_user_row(hashed_pwd="hashed:secret123")

        # Act
        user = await auth_service.authenticate_user(email="test@example.com", password="secret123")

        # Assert
        assert user is not None
        assert user.id == "u_test01"
        assert user.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_returns_none_when_user_not_found(self, auth_service, mock_db):
        mock_db.read_one.return_value = None
        result = await auth_service.authenticate_user(email="missing@example.com", password="x")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_password_does_not_match(self, auth_service, mock_db):
        mock_db.read_one.return_value = _make_user_row(hashed_pwd="hashed:correctpwd")
        result = await auth_service.authenticate_user(email="test@example.com", password="WRONG")
        assert result is None


# ================================================================
# authenticate_google_user
# ================================================================


class TestAuthenticateGoogleUser:
    @pytest.mark.asyncio
    async def test_existing_user_with_google_id_returned_as_is(self, auth_service, mock_db, mock_google_provider):
        # Arrange: Google verifies and user already linked
        mock_google_provider.verify_token.return_value = _make_google_user_info()
        mock_db.read_one.return_value = _make_user_row(google_id="google_id_123", email="google@example.com")

        # Act
        result = await auth_service.authenticate_google_user("dummy_google_token")

        # Assert: existing user returned, no UPDATE issued, no INSERT issued
        assert result is not None
        assert result.email == "google@example.com"
        assert result.google_id == "google_id_123"
        assert mock_db.execute.await_count == 0
        assert mock_db.insert_one.await_count == 0

    @pytest.mark.asyncio
    async def test_existing_user_without_google_id_gets_linked(self, auth_service, mock_db, mock_google_provider):
        # Arrange: user exists by email but has no google_id yet
        mock_google_provider.verify_token.return_value = _make_google_user_info()
        mock_db.read_one.return_value = _make_user_row(google_id=None, email="google@example.com")

        # Act
        result = await auth_service.authenticate_google_user("dummy_google_token")

        # Assert: google_id and picture were patched onto the row
        assert result.google_id == "google_id_123"
        assert result.picture == "https://example.com/pic.jpg"
        # Assert: an UPDATE statement linking the google_id ran
        assert mock_db.execute.await_count == 1
        update_sql = mock_db.execute.await_args.args[0]
        assert "google_id = 'google_id_123'" in update_sql

    @pytest.mark.asyncio
    async def test_new_google_user_creates_user_and_personal_group(
        self, auth_service, mock_db, mock_google_provider, mock_group_service
    ):
        # Arrange: Google succeeds, no existing user
        mock_google_provider.verify_token.return_value = _make_google_user_info()
        mock_db.read_one.return_value = None

        # Act
        result = await auth_service.authenticate_google_user("dummy_google_token")

        # Assert: a new user was inserted into the users table
        assert mock_db.insert_one.await_count == 1
        table_arg, payload_arg = mock_db.insert_one.await_args.args
        assert table_arg == "users"
        assert payload_arg["email"] == "google@example.com"
        assert payload_arg["google_id"] == "google_id_123"

        # Assert: a personal group was created via the group service
        assert mock_group_service.create_group.await_count == 1

        # Assert: personal_group_id update SQL ran after group creation
        assert mock_db.execute.await_count == 1
        update_sql = mock_db.execute.await_args.args[0]
        assert "personal_group_id = 'grp_new01'" in update_sql

        # Assert: returned user matches the Google profile
        assert result.email == "google@example.com"
        assert result.source == "google"
