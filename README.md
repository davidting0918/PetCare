# PetCare

> *Care for them, together.* — Collaborative pet health & nutrition tracking for iOS.

PetCare is a personal-scale, OAuth-only (Apple + Google) pet health tracker. It models six domains: **auth, user, group, pet, food, meal, weight, medicine**. Multiple users can share a `group` to co-track the same pets — food / meal / weight / medication logs all live at the group scope so every member sees the same care history.

The backend follows Heracles's FastAPI + asyncpg pattern — DI-built services per request, no ORM, raw SQL via `$1, $2, …` placeholders, all photos stored in Cloudinary.

## Repo layout

```
PetCare/
├── backend/                 FastAPI + asyncpg
│   ├── main.py              app + lifespan + CORS + routers
│   ├── core/
│   │   ├── config.py        Settings dataclass + .env loader
│   │   ├── db_manager.py    asyncpg pool singleton
│   │   ├── postgres_database.py  PostgresAsyncClient query helpers
│   │   └── cloudinary_client.py  photo upload wrapper
│   ├── models/              Pydantic schemas + table name constants
│   ├── routers/             one file per domain; GET / POST only
│   └── services/            business logic; constructor-injected db handle
├── database/
│   └── db_schema.sql        single source of truth for the schema
├── ios/PetCare/             (legacy SwiftUI iOS app — to be replaced)
├── Dockerfile               Python 3.13-slim, 2 workers, healthcheck
├── docker-compose.yml       binds 127.0.0.1:8002, host Postgres via extra_hosts
└── deploy.sh                git pull → docker compose up -d --build → wait healthy
```

## ⚠️ Migration status

The codebase is mid-rewrite from the original "REST-style + path params + email/password" backend to a Heracles-style backend (GET/POST only, no path params, OAuth-only auth, single-env config). Concretely:

- ✅ `backend/core/*` — config / db pool / cloudinary client all on the new pattern
- ✅ `backend/main.py` — boots cleanly with auth + user routers
- ✅ `backend/services/auth_service.py` + `user_service.py` + Apple/Google providers — OAuth-only, Apple JWKS verification, single-use refresh tokens
- ✅ `backend/routers/auth_router.py` + `user_router.py` — Heracles-style
- ✅ All `{group,pet,food,meal,weight,medicine}` routers + services — Heracles-style (GET/POST only, no path params, raw SQL with `$1, $2` placeholders). 58 endpoints total.
- ❌ `ios/PetCare/` — old SwiftUI MVVM app. Slated for full rewrite as `petcare-ios/` at repo root, mirroring the Heracles iOS architecture (cached-first stores, never spinner-flicker).

Anything you touch outside the auth/user paths is in the "to be rewritten" bucket — see `CLAUDE.md` for the migration plan.

## Tables (post-rewrite schema)

| Table | Key fields | Notes |
|---|---|---|
| `users` | `id`, `email`, `google_id?`, `apple_id?`, `source`, `personal_group_id?` | OAuth-only — no `hashed_pwd`. Unique on `email`, `google_id`, `apple_id` |
| `access_tokens` | `id` (serial), `token`, `user_id`, `expires_at`, `is_active` | JWTs; row deactivated on logout |
| `refresh_tokens` | `id` (serial), `token`, `user_id`, `access_token_id`, `expires_at`, `is_active` | Single-use — refreshing flips `is_active=FALSE` |
| `groups` | `id`, `name`, `creator_id` | A user's `personal_group_id` is auto-created on first login (Phase 2) |
| `group_members` | `group_id`, `user_id`, `role` (CREATOR/MEMBER/VIEWER), `invited_by` | |
| `group_invitations` | `id`, `group_id`, `invite_code`, `status`, `expires_at`, `role` | Time-limited shareable codes |
| `pets` | `id`, `name`, `pet_type`, `gender`, `owner_id`, `group_id`, `current_weight_kg`, … | One owner; lives in exactly one group |
| `foods` | `id`, `group_id`, `brand`, `product_name`, `food_type`, macros | Group-scoped catalog (`food_type_enum` + `pet_type_enum`) |
| `meals` | `id`, `pet_id`, `food_id`, `group_id`, `timestamp`, snapshot macros | Macros snapshotted at log time |
| `weight_records` | `id`, `pet_id`, `weight`, `user_id`, `timestamp` | |
| `medications` | `id`, `group_id`, `name`, `medication_type`, `dosage_unit` | Group-scoped catalog |
| `treatment_courses` | `id`, `pet_id`, `medication_id`, `frequency_days`, `times_per_day[]`, `start_date`, `end_date?` | Recurring schedules, open-ended `end_date` |
| `medication_logs` | `id`, `pet_id`, `medication_id`, `course_id?`, `administered_at` | Actual administration records |

## Run the backend (local)

```bash
# 1. install
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 2. configure
cp backend/.env.example backend/.env
# edit backend/.env:
#   - JWT_SECRET_KEY  (required; generate with python -c "import secrets; print(secrets.token_urlsafe(64))")
#   - POSTGRES_URI    (default postgresql://localhost:5432/petcare)
#   - APPLE_BUNDLE_ID, GOOGLE_IOS_CLIENT_ID  (at least one provider for login)
#   - CLOUDINARY_*    (optional — photo upload returns 500 "not configured" if blank)

# 3. start Postgres locally + create the DB + apply the schema
brew services start postgresql@16
createdb petcare
psql petcare -f database/db_schema.sql

# 4. run
python -m backend.main
# or: uvicorn backend.main:app --reload
# -> http://localhost:8000
# -> http://localhost:8000/docs (Swagger UI)
```

`POSTGRES_URI` is a single DSN — the old multi-env (`POSTGRES_TEST` / `POSTGRES_STAGING` / `POSTGRES_PROD`) split is gone. Production uses `.env.prod` next to `docker-compose.yml` on the EC2 box; local uses `backend/.env`.

A missing/placeholder `JWT_SECRET_KEY` crashes startup intentionally — better fail loudly than 500 every request.

## Run with Docker (prod-shaped)

```bash
# .env.prod sits next to docker-compose.yml (gitignored, lives only on EC2)
docker compose up -d --build
curl http://127.0.0.1:8002/health   # {"status":"ok"}
```

The container binds to `127.0.0.1:8002`; nginx on the host terminates TLS and proxies in. Postgres runs on the host (NOT in compose) and the container reaches it via `host.docker.internal`. See [deploy.sh](deploy.sh) and [docker-compose.yml](docker-compose.yml) for the full setup. The EC2 deploy flow mirrors Heracles step-for-step.

## API surface

All authenticated endpoints expect `Authorization: Bearer <jwt>`. The OpenAPI spec at `/docs` is the canonical reference; this table is a roadmap, not the source of truth.

| Domain | Endpoints |
|---|---|
| `/auth/` | `POST google/login`, `POST apple/login`, `POST token/refresh`, `POST logout` |
| `/user/` | `GET me`, `POST update`, `POST photo/upload` |
| `/group/` | `POST create`, `POST delete`, `GET my_groups`, `GET members`, `POST member/update_role`, `POST member/remove`, `POST invitation/create`, `GET invitation/preview`, `POST join`, `GET pets` |
| `/pet/` | `POST create`, `GET accessible`, `GET details`, `POST update`, `POST delete`, `POST assign_group`, `GET current_group`, `POST photo/upload` |
| `/food/` | `POST create`, `GET details`, `GET list`, `POST update`, `POST delete`, `POST photo/upload` |
| `/meal/` | `POST create`, `GET details`, `GET list`, `POST update`, `POST delete`, `GET today`, `GET summary` |
| `/weight/` | `POST create`, `GET details`, `GET list`, `POST update`, `POST delete` |
| `/medicine/` | `POST medication/create`, `GET medication/details`, `GET medication/list`, `POST medication/update`, `POST medication/delete`, `POST course/create`, `GET course/details`, `GET course/list`, `POST course/update`, `POST course/end`, `POST log/create`, `POST log/delete`, `GET today` |

## Conventions (post-rewrite)

- Only `GET` and `POST`. No path params — resource IDs (`pet_id`, `food_id`, `meal_id`, `group_id`) ride in the query string (GET) or JSON body (POST).
- Responses are typed Pydantic models. No `{status, data, message}` envelope — clients consume the OpenAPI doc directly.
- IDs are prefixed and generated via `secrets.token_hex`:
  - users: 8-hex
  - groups: 8 chars
  - pets: 8 chars
  - foods: 30 chars
  - meals / weight_records / medications / treatment_courses / medication_logs: 11 chars
- Soft delete via `is_active` boolean. Every query filters `WHERE is_active = TRUE`.
- Ownership / group membership is enforced in the service layer — FKs exist for cascade behavior, not for app-visible errors.
