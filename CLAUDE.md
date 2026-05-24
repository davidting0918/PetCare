# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo

PetCare is a collaborative pet health tracker. Two top-level components:

- [backend/](backend/) — FastAPI + asyncpg (PostgreSQL), OAuth-only auth (Apple + Google), Cloudinary for photo storage.
- [ios/PetCare/](ios/PetCare/) — legacy SwiftUI MVVM iOS client. Scheduled to be replaced by a `petcare-ios/` rewrite at repo root that mirrors the Heracles iOS architecture (cached-first stores, never spinner-flicker, all stores at `@main` scope).

The full table list and API surface live in the [README](README.md) — consult it rather than rediscovering shapes.

## ⚠️ Current migration status

The repo is mid-rewrite. The original PetCare backend used REST-style path params (`/pets/{pet_id}/update`), email+password + Google OAuth, a multi-env config switch, and `scalar_fastapi`. It's being replaced wholesale with the Heracles pattern. Concretely:

- ✅ `backend/core/config.py` — Heracles-style Settings dataclass; single `POSTGRES_URI`; `validate_auth_settings` crashes startup on missing JWT secret.
- ✅ `backend/core/{db_manager,postgres_database}.py` — clean asyncpg wrapper (`read / read_one / insert_one / insert / execute / execute_returning`).
- ✅ `backend/main.py` — boots with TimingMiddleware + `/health`; auth + user routers wired; non-auth routers commented out.
- ✅ Auth: `services/{auth_service,user_service,google_auth_provider,apple_auth_provider}.py` rewritten OAuth-only. Apple JWKS verification, single-use refresh tokens, `is_active`-flag revocation.
- ✅ Routers: `auth_router.py`, `user_router.py` — Heracles-style (GET/POST, no path params).
- ✅ Schema: `database/db_schema.sql` updated — dropped `hashed_pwd` / `is_verified` / `api_keys`; added `apple_id` with sparse unique on `users`.
- ✅ Docker / deploy: `Dockerfile`, `docker-compose.yml`, `deploy.sh`, `.github/workflows/deploy.yml` mirror Heracles (container on `127.0.0.1:8002`, host-side Postgres via `host.docker.internal`).
- ✅ `routers/{group,pet,food,meal,weight,medicine}.py` + matching services — all rewritten Heracles-style (GET/POST only, no path params, `$1, $2` placeholders, constructor-injected services).
- ✅ `auth_service` bootstraps a `personal_group` on first login via `GroupService.create_personal_group` and patches the user's `personal_group_id`. Idempotent: cheap SELECT every login, INSERT only when missing.
- ❌ iOS: `ios/PetCare/` is the old MVVM app. Phase 3 will delete it and build `petcare-ios/` from scratch following Heracles iOS patterns — see [Heracles iOS](../Heracles/heracles-ios/) for the reference structure.

When working on backend code outside auth/user, expect to be touching this rewrite. Do NOT preserve the old patterns (f-string SQL, path params, `pwd_context`, `verify_api_key`, `{status, data, message}` envelopes, `auth_service = AuthService()` at module scope) — they don't apply.

## Common commands

```bash
# Backend (run from repo root; .env loader expects backend/.env)
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env   # then fill JWT_SECRET_KEY + provider IDs + POSTGRES_URI
brew services start postgresql@16      # or run Postgres however suits you
createdb petcare                       # one-off — DB must exist before startup
psql petcare -f database/db_schema.sql # one-off — applies the full schema (no migrations; re-run drops/recreates as needed)
python -m backend.main                 # or: uvicorn backend.main:app --reload
# → http://localhost:8000  /  http://localhost:8000/docs

# Docker
docker compose up -d --build
curl http://127.0.0.1:8002/health
```

There is no test suite, linter config, or formatter wired up in this repo (the old `pytest` / `pre-commit` / `.flake8` configs were removed with the email-password rewrite). Don't invent commands for them.

iOS app: open [ios/PetCare/PetCare.xcodeproj](ios/PetCare/PetCare.xcodeproj) in Xcode and run — but note this is the legacy app that's about to be replaced; do not invest in it.

## Backend architecture

The pattern is **DI-built services per request, no ORM, raw SQL via asyncpg**:

- [main.py](backend/main.py) — FastAPI app. `lifespan` runs `validate_auth_settings` (crashes on missing `JWT_SECRET_KEY`) then `init_database(settings.postgres_uri)`. Failed Postgres connect crashes startup intentionally.
- [core/postgres_database.py](backend/core/postgres_database.py) — `PostgresAsyncClient`. Always use `$1, $2, …` placeholders — never f-string interpolate user input. `_convert_decimals_to_floats` flattens NUMERIC → Python `float` for clean JSON.
- [core/db_manager.py](backend/core/db_manager.py) — process-wide singleton holding the client. Services call `get_db()` lazily so the pool is in place by request time.
- [database/db_schema.sql](database/db_schema.sql) — **single source of truth for the schema**. No migration tool: when the schema changes you drop/recreate.
- [routers/](backend/routers/) — one file per domain, only `GET` and `POST`, no path params (ids in query / body). Responses are typed Pydantic models, not a `{status, data, message}` envelope.
- [services/](backend/services/) — business logic, constructor-injected `db: PostgresAsyncClient`. Routers build services via tiny `get_<x>_service()` `Depends`. `get_current_user` (in [auth_service.py](backend/services/auth_service.py)) is the bearer-token gate.

### Domain rules baked into the data model

- **Ownership / group membership is enforced in the service layer.** Even where the SQL schema has FKs, every mutation/read still calls a `_get_owned_<thing>` helper that 404s on missing and 403s on group-role mismatch — the FK is for cascade behavior, not for app-visible errors.
- **Soft delete only.** Every row carries `is_active BOOLEAN DEFAULT TRUE`. Every query filters `WHERE is_active = TRUE`; never hard-delete.
- **Group sharing is the model.** Pets, foods, meals, weight records, medications, treatment courses, and medication logs are all `group_id`-scoped. A user with `MEMBER` or `VIEWER` role on a group can see everything in it; only `CREATOR` (and the owner of the specific resource where applicable) can mutate or delete.
- **Meals snapshot the food.** When logging a meal, calories + macros are computed from the food's per-unit values × serving and stored on the meal row. Editing the source food later does NOT retroactively change historical meals.
- **Auth has two tables.** Signed JWTs in `access_tokens` and opaque random strings in `refresh_tokens`, both linked by `access_token_id`. Every request re-checks the access-token row's `is_active` flag (that's how `/auth/logout` cuts access immediately rather than waiting on JWT expiry). Refresh tokens are **single-use** — refreshing deactivates the old one and issues a fresh pair.
- **Apple's name quirk.** Apple returns the user's `full_name` only on the *first* grant. The iOS client sends `email` and `full_name` on first login; the backend stores them then. See `login_with_apple` in [auth_service.py](backend/services/auth_service.py).
- **Photos via Cloudinary.** User / pet / food photos all go through [core/cloudinary_client.py](backend/core/cloudinary_client.py). `public_id = <entity_id>` so re-uploads overwrite instead of accumulating orphans.

## iOS architecture (planned — Phase 3)

`ios/PetCare/` is the OLD MVVM SwiftUI app and is scheduled for full replacement, not incremental edits. The replacement `petcare-ios/` will mirror Heracles iOS patterns:

- App entry owns all stores at the `@main` scope so they outlive view transitions.
- `APIClient` injects auth via a `tokenProvider` closure (set by `AuthStore`) so the client doesn't retain `AuthStore`.
- `TokenStorage` — Keychain-backed tokens + UserDefaults cached user profile.
- `AuthStore` — **Cold-launch UX rule**: if both cached tokens and cached `UserPublic` exist on disk, jump straight to `.authenticated` with no loading state, then silently `GET /user/me` in the background.
- Per-domain `*Store` (PetsStore, FoodsStore, MealsStore, WeightsStore, MedicineStore, GroupsStore) — hydrate from disk synchronously, refresh in background, animate new values in. Never flip the UI to a loading state once we have any cache.

When building iOS screens, follow this "cached-first, refresh-in-background, never spinner-flicker" pattern — it's the project's stated 最高指導原則.

The dark-theme color palette in [ios/PetCare/PetCare/Theme/Colors.swift](ios/PetCare/PetCare/Theme/Colors.swift) already matches the old website's design tokens and must be preserved verbatim in the rewrite.

## API conventions (post-rewrite)

- Only `GET` and `POST`. No path params — everything in query string or JSON body. Resource IDs (`pet_id`, `food_id`, `meal_id`, `group_id`) go in the request body for POST mutations.
- Response models are tight typed Pydantic shapes — clients rely on the OpenAPI doc reflecting them directly. Don't wrap responses in envelopes.
- IDs are prefixed: users = 8-hex, groups = 8 chars, pets = 8 chars, food = 30 chars, meals / weight_records / medications / treatment_courses / medication_logs = 11 chars. Generated via `secrets.token_hex` / `secrets.token_urlsafe` with a uniqueness retry loop.
