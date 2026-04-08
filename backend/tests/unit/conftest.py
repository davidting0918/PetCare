"""
Shared fixtures for the backend unit-test tier.

The biggest hidden cost in user/auth tests is bcrypt — every real
``pwd_context.hash`` call takes ~100ms. The session-scoped autouse fixture
below replaces ``hash`` and ``verify`` with deterministic fakes so unit
tests stay in the millisecond range.

The fake hasher is intentionally trivial: ``hash("foo")`` returns
``"hashed:foo"`` and ``verify("foo", "hashed:foo")`` returns ``True``.
This is enough to assert that a service routed a password through the
hashing seam without the cost of a real KDF.
"""

from typing import Iterator

import pytest


def _fake_hash(password: str) -> str:
    return f"hashed:{password}"


def _fake_verify(password: str, hashed: str) -> bool:
    return hashed == f"hashed:{password}"


@pytest.fixture(autouse=True, scope="session")
def _stub_bcrypt() -> Iterator[None]:
    """Replace ``pwd_context.hash`` / ``verify`` for every unit test."""
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("backend.services.user_service.pwd_context.hash", _fake_hash)
    monkeypatch.setattr("backend.services.user_service.pwd_context.verify", _fake_verify)
    try:
        yield
    finally:
        monkeypatch.undo()
