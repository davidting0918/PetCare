# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

When responding to the user in this repository, write all conversational text in **Traditional Chinese (繁體中文)**. Everything else stays in English — code, file contents, commit messages, code comments, identifiers, and any text written into files. Only the assistant's chat responses themselves are translated.

## Dev Flow

**The single hard constraint: never interfere with the user's current working state in the main checkout.** The user is typically mid-task on some branch; switching branches, pulling, running migrations, or starting dev servers in their working directory would disrupt them. All implementation work happens in **isolated background worktrees** branched from the latest `origin/master`.

### When this flow applies

Apply the worktree flow to anything that **mutates code or state**: implementing a feature, fixing a bug, refactoring, adding tests for an existing service, running migrations, starting dev servers, or working through one or more GitHub issues.

The flow does **not** apply to read-only or discussion work: reading files, searching code, planning, design Q&A, `/bte discuss`, updating CLAUDE.md / memory / docs that the user is actively reviewing, or any change explicitly scoped to the file the user is currently editing.

### Required steps for any code-changing work

1. **Check master without touching the main checkout.** Read-only commands only:
   ```bash
   git fetch origin master
   git log HEAD..origin/master --oneline   # what's new on master
   ```
   Do **NOT** run `git pull`, `git checkout master`, `git switch`, `git reset`, or any branch-switching command in the main checkout. Even if the user said "make sure master is up to date", that means *fetch and base the new worktree on it*, not check it out in their working directory.

2. **Spawn a background worktree agent for the implementation.** Use the `Agent` tool with all three of these set:
   - `isolation: "worktree"` — gives the agent its own git worktree, completely isolated from the user's checkout. Auto-cleans if no changes are made.
   - `run_in_background: true` — runs in parallel so the user can keep working in the foreground; you'll be notified when it finishes.
   - A complete, self-contained prompt. Each `Agent` invocation starts fresh, so include: the full issue / feature description, relevant file paths, links to the right CLAUDE.md sections (especially `## Backend > Tests` for backend work), and an explicit instruction at the top of the prompt: *"Inside your worktree, run `git fetch origin && git checkout -b <branch-name> origin/master` before doing anything else, so your work starts from the latest master."*

3. **Multiple issues at once → multiple parallel agents.** If the user hands over several independent issues in the same message, send a single response with one `Agent` tool call per issue. They run in parallel in separate worktrees without interfering with each other or the main checkout.

4. **Report on completion.** When a background agent finishes, summarize: what changed, the worktree path + branch the agent created (returned in the agent result if it made changes), tests added, and any non-obvious decisions the agent made on its own.

   **PR policy depends on how the worktree was launched**:

   - **Skill-driven (`/be` or `/fe`)** — the agent's prompt explicitly authorizes it to **commit, push, and open a draft PR against `master` as the final step of its run**, per the conventions in `## Project Skills > PR mechanics`. Never auto-merge, never force-push, never mark the PR ready-for-review on the user's behalf. Report the PR URL in the completion summary so the user can click straight through.
   - **Ad-hoc background work** (everything else) — present the worktree for review. Do not auto-commit, auto-push, or open a PR without explicit user approval. The user will tell you what to do next.

### Forbidden in the main checkout (no exceptions without user override)

- `git checkout <other-branch>` / `git switch <other-branch>`
- `git pull` / `git merge` / `git rebase` / `git reset --hard`
- Editing source files for an issue or feature (docs and memory updates the user is reviewing are fine)
- Running migrations, seeders, or anything that mutates the local DB
- Starting `npm run dev`, `uvicorn`, or any long-running dev server

If you genuinely need to do one of these in the main checkout (e.g. the user explicitly asks), confirm with them first.

## Project Overview

PetCare is a pet health tracking web app for families. It tracks daily food intake (with calorie counting), weight, and (planned) medication. The product is mobile-first, PWA-installable, and built around **group-based collaboration** so multiple family members can share care of the same pet.

The repo is a monorepo with three top-level concerns:
- `backend/` — FastAPI + asyncpg PostgreSQL API (Python 3.13)
- `frontend/` — React 19 + TypeScript + Vite + Redux Toolkit PWA
- `database/` — Raw `db_schema.sql` and seed `staging_data.json` (no ORM migrations — schema is managed by hand)

## Common Commands

All commands assume you run them from the repo root unless noted.

### Backend (FastAPI)

```bash
# Install deps (Python 3.13)
pip install -r backend/requirements.txt

# Run dev server (binds 0.0.0.0:8000, lifespan inits asyncpg pool)
python -m backend.main
# or
uvicorn backend.main:app --reload --port 8000

# Tests — see "## Backend > Tests" for the two-tier layout
# Current legacy suite (still requires a real Postgres):
python -m pytest backend/tests
python -m pytest backend/tests/test_meal_endpoints.py::TestMealCreate::test_create_meal_success

# Planned unit-test suite (after restructure):
python -m pytest backend/tests/unit -n auto

# Planned integration-test suite (manual only):
python -m pytest backend/tests/integration

# Lint / format (matches CI's pre-commit job)
cd backend && pre-commit run --all-files
# Individually:
black --config=pyproject.toml backend
isort --settings-path=pyproject.toml backend
flake8 --config=.flake8 backend
```

The current legacy test suite **requires a real Postgres database** (no mocking). It connects via `POSTGRES_TEST` and sets `PYTEST_RUNNING=1` + `APP_ENV=test`. Other required env vars: `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. These live in `backend/.env` locally and in GitHub Secrets in CI. **This is being restructured** — see `## Backend > Tests`.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev      # vite dev server
npm run build    # tsc -b && vite build (typecheck must pass)
npm run lint     # eslint .
npm run preview  # serve built dist/
```

Frontend env vars (consumed in [src/api/client.ts](frontend/src/api/client.ts)) select the API base URL by `VITE_APP_ENV`: `VITE_PROD_BASE_URL`, `VITE_STAGING_BASE_URL`, `VITE_TEST_BASE_URL`.

## Backend

### Layering

The backend uses a **router → service → db** layering enforced by directory:

- [backend/main.py](backend/main.py) — FastAPI app factory. Registers CORS (env-driven), seven routers, mounts `/static` for uploaded photos, exposes `/scalar` for API docs, and runs `init_database` / `close_database` in the lifespan handler.
- [backend/routers/](backend/routers/) — Thin HTTP layer. One router per resource (`auth`, `user`, `group`, `pet`, `food`, `meal`, `weight`). Handles validation, auth dependencies, and delegates to a service. The standard response envelope is `{"status": 1, "data": {...}, "message": "..."}` (status `1` = success). Always honor this contract in new endpoints.
- [backend/services/](backend/services/) — All business logic. Each service depends on `get_db()` lazily via a `@property` (see `AuthService.db`) so the global asyncpg pool is initialized at app startup, not import time. **`get_db()` is the single seam where unit tests mock the database.**
- [backend/models/](backend/models/) — Pydantic schemas + table-name constants (e.g. `user_table = "users"`). There is **no ORM**; SQL is hand-written in services using the asyncpg client wrapper.
- [backend/core/](backend/core/) — Infrastructure: `db_manager.py` (singleton `DatabaseManager` exposing `get_db()`, `init_database()`, `close_database()`), `postgres_database.py` (asyncpg `Pool` wrapper, picks `POSTGRES_TEST` / `POSTGRES_STAGING` / `POSTGRES_PROD` based on env), `environment.py` (loads `backend/.env`, exposes `get_config`, `get_storage_path`, `build_static_url`).

When adding a new resource, follow this pattern: model file → service file (with `db` property using `get_db()`) → router file → register in `main.py` → tests under `backend/tests/unit/` (and integration tests if needed — see Tests below).

### Environment detection

[backend/core/environment.py](backend/core/environment.py) is the single source of truth. Priority:
1. Explicit argument
2. `PYTEST_RUNNING=1` → `test`
3. `APP_ENV` env var (mapped: `dev`/`development`/`stage`/`staging` → STAGING; `prod`/`production` → PRODUCTION; `test`/`testing` → TEST)
4. Default: PRODUCTION

CORS origins, debug flags, and the storage path all branch off this. Storage path is `STORAGE_BASE_PATH` env var if set (used on Render: `/var/data/storage`), otherwise `backend/storage/`. Photo URLs are built via `build_static_url(category, filename)` which returns either a relative `/static/...` path or an absolute `{base_url}/static/...` URL depending on environment config.

### Domain model (group-based access control)

Pets, foods, and meals are all scoped to a **group**, not directly to a user. Every user gets a `personal_group_id` on signup (their private group). Users can also create or join shared groups via invite codes with one of three roles:

- **Creator** — full control, can delete the group
- **Member** — can create/edit pets, foods, meals
- **Viewer** — read-only

Tables are linked: `pets.group_id → groups.id`, `foods.group_id → groups.id`, `meals.group_id → groups.id`. Group membership lives in `group_members` (with `role` column); invitations live in `group_invitations` (with `invite_code`, `expires_at`, `status`). All authorization checks must go through group membership — see [backend/services/group_service.py](backend/services/group_service.py) for the canonical patterns. **Authorization gaps are a priority finding** in any test review.

Schema is in [database/db_schema.sql](database/db_schema.sql). Note: `id` columns are short varchars (8–13 chars) generated in application code, not serial PKs. Each table has an `update_updated_at_column()` trigger and an `is_active` soft-delete flag.

### Authentication

Two auth mechanisms coexist:
1. **API key** (`api_keys` table) — used by the frontend's signup flow and for `/user/create`. Sent as `Authorization: Bearer {api_key}:{api_secret}`.
2. **JWT access tokens** (`access_tokens` table) — issued by `/auth/email/login` or `/auth/google/login`. Standard `Bearer {jwt}` for all authenticated endpoints. Tokens are also persisted in the DB for revocation.

`AuthService` ([backend/services/auth_service.py](backend/services/auth_service.py)) handles password hashing (bcrypt via passlib), JWT signing (python-jose), and Google OAuth code exchange via [backend/services/google_auth_provider.py](backend/services/google_auth_provider.py).

### Tests

Backend tests follow a **two-tier layout** under `backend/tests/`. Use the `/bte` skill (see Project Skills) for any test review or design work — it embeds the rules below so you don't need to re-derive them.

#### Unit tests — `backend/tests/unit/`

Fast, deterministic, run on **every commit and every PR** via the CI `unittest` job. One file per domain at `backend/tests/unit/services/test_<domain>_service.py`.

Hard rules:
- **MUST NOT touch any third-party resource** — no Postgres, no Google OAuth, no network, no real filesystem (except `tmp_path`).
- **MUST NOT** `from backend.main import ...`. Importing the FastAPI app drags in every router and the asyncpg pool. Import only the service module under test.
- **Mock the database** by patching `get_db()` (or the service-level `get_db` import) to return an `unittest.mock.AsyncMock`. Configure `read_one` / `read` / `insert_one` / `insert` / `execute` / `execute_returning` per test via `return_value` or `side_effect`. Mock return values must match the real dict shape, not just `{}`.
- **Stub bcrypt** via an autouse fixture in `backend/tests/unit/conftest.py` that monkeypatches `pwd_context.hash` and `pwd_context.verify` to a fast no-op fake. Real bcrypt is ~100ms per call and would dominate runtime.
- **Mock determinism sources** when needed: `dt.now`, `uuid.uuid4`, `jwt.encode`.
- **Parallel-safe**: no module-level mutable state, no shared `AsyncMock` instances across tests. CI runs `pytest backend/tests/unit -n auto` via `pytest-xdist`.
- **Clean code**: AAA structure, descriptive names, one logical assertion per test, prefer `parametrize` over copy-paste, fixtures over duplication.
- **Authorization coverage is required**: every service method that touches a group-scoped resource must have a test for the unauthorized-role path (member-vs-viewer-vs-stranger) — these are P0 gaps if missing.

The mock library is stdlib `unittest.mock` only; do **not** introduce `pytest-mock` unless the user explicitly approves.

#### Integration tests — `backend/tests/integration/`

Heavyweight, run **manually** (not in CI on every commit). Allowed to connect to a real Postgres (`POSTGRES_TEST`), Google OAuth, and other third-party services.

Hard rules:
- **Discussion-first**: do not add or modify integration tests without explicit user confirmation. Use `/bte integration <domain>` to start the discussion.
- **Justify every test**: each integration test must exercise something a unit test cannot — DB constraints (FK, CHECK, unique, triggers), multi-table cascades, real auth round-trips, schema verification.
- **Schema verification** lives at `backend/tests/integration/test_schema_match.py`. It connects to the designated DB env, queries `information_schema`, parses `database/db_schema.sql`, and asserts the live schema matches the source-of-truth file. Run this manually whenever `db_schema.sql` changes or before promoting between environments.
- Tests must be runnable individually with explicit env vars, e.g.:
  ```bash
  APP_ENV=test POSTGRES_TEST=... python -m pytest backend/tests/integration/test_schema_match.py
  ```

#### Current state (legacy, being replaced)

The existing `backend/tests/test_*_endpoints.py` files (`test_user_endpoints.py`, `test_group_endpoints.py`, `test_pet_endpoints.py`, `test_food_endpoints.py`, `test_meal_endpoints.py`, `test_weight_endpoints.py`) and the current `backend/tests/conftest.py` fixtures (`session_user1/2/3`, `session_test_group`, `clean_db_per_test`, etc.) are integration-style and will be **deleted** as part of the restructure. Do not add new tests in this layer — write them under `backend/tests/unit/` or `backend/tests/integration/` per the rules above.

## Frontend

- **Routing** — [src/App.tsx](frontend/src/App.tsx) defines the top-level routes. `AppLayout` wraps authenticated routes in `MainLayout` with bottom-tab navigation between dashboard / meal / medicine / weight / settings. `ProtectedRoute` redirects unauthenticated users to `/login`.
- **Initialization hooks** — `App` calls `useAuthInitialization()`, `usePetInitialization()`, `useGroupInitialization()` on mount to hydrate state from localStorage and the API. Auth tokens are persisted to `localStorage` under keys prefixed `petcare_*`.
- **Redux Toolkit store** — [src/store/index.ts](frontend/src/store/index.ts) — six slices: `auth`, `pet`, `group`, `weight`, `meal`, `food`. Each slice has its own async thunks (`fetchX`, `createX`, etc.) that call services in [src/api/services/](frontend/src/api/services/).
- **API layer** — [src/api/client.ts](frontend/src/api/client.ts) is a single Axios instance with interceptors that (1) auto-attach the `petcare_token` from localStorage, (2) handle FormData uploads correctly (don't set Content-Type), (3) on 401 clear all `petcare_*` localStorage keys, dispatch an `auth:logout` event, and force-redirect to `/login`. Service files in `src/api/services/` wrap endpoints by resource and are the only place that should construct URLs.
- **Hooks** — [src/hooks/](frontend/src/hooks/) is organized by domain (`auth/`, `pets/`, `groups/`, `meals/`, `foods/`, `weight/`, `user/`, `redux/`, `ui/`) plus shared utilities (`useFileUpload`, `useFormState`, `useRefresh`).
- **PWA** — Configured in [vite.config.ts](frontend/vite.config.ts) via `vite-plugin-pwa` (autoUpdate). Manifest declares standalone display, portrait orientation, and the icons in `public/`.

When adding a new resource on the frontend, the convention is: type in `src/types/X.ts` → service in `src/api/services/XService.ts` (re-exported from `src/api/services/index.ts`) → slice in `src/store/slices/xSlice.ts` (re-exported from `src/store/index.ts`) → hooks in `src/hooks/xs/` → components in `src/components/x/`.

### Styling rules (NON-NEGOTIABLE)

The frontend mixes Tailwind, MUI, and emotion as packages, but the actual codebase has a clear hierarchy. New code must follow it:

- **Tailwind is the default for everything** — layout, spacing, color, typography, transitions, focus states, responsive breakpoints. All styling goes through `className="..."`. Do **not** use MUI's `sx={...}` prop or `styled(...)` from `@emotion/styled` in new components.
- **Use the project design tokens, not raw Tailwind colors** — colors are `mint`, `earth`, `orange` (defined in `tailwind.config`), cards use `card-3d`, buttons use `btn-3d` / `btn-3d-mint`, shadows use `shadow-3d`. Do not hardcode `bg-emerald-500`, `bg-amber-400`, etc. — match the nearest sibling component instead.
- **Icons come from `lucide-react`**, never `@mui/icons-material`. See [MealPage.tsx](frontend/src/components/meal/MealPage.tsx) for the canonical icon-import pattern.
- **`@mui/material` is reserved for complex specialized widgets** that would be painful to write in raw HTML + Tailwind. Currently only `@mui/x-charts` is in active use. Before reaching for any other MUI component (DatePicker, Autocomplete, complex Table, etc.), justify in the implementation plan why Tailwind cannot do the job.
- **`@emotion/*` must never be imported directly** in components or hooks. It is only present as a transitive dependency of MUI.
- **Modals and dialogs are Tailwind-built**, not MUI. Use the existing [common/Modal.tsx](frontend/src/components/common/Modal.tsx) and [common/DeleteConfirmDialog.tsx](frontend/src/components/common/DeleteConfirmDialog.tsx) when possible; if you must build a new one, copy the `fixed inset-0 bg-black/50` pattern from [CreateMealForm.tsx](frontend/src/components/forms/CreateMealForm.tsx).
- **Forms reuse `useFormState`** ([src/hooks/useFormState.ts](frontend/src/hooks/useFormState.ts)) and **uploads reuse `useFileUpload`** ([src/hooks/useFileUpload.ts](frontend/src/hooks/useFileUpload.ts)). Do not reinvent form state or multipart upload handling.

## Project Skills

### PR mechanics (shared by `/be` and `/fe`)

Both `/be` and `/fe` end their issue flow by dispatching a background worktree Agent that auto-commits, pushes, and opens a **draft** PR. The conventions are identical and live here so the two skills don't drift:

- **Branch name**: `claude/issue-{N}-{slug}` for a single issue, `claude/issues-{N1}-{N2}-{slug}` for a batch. If a branch with the exact same name already exists on `origin`, append `-2`, `-3`, etc. until unique.
- **Target branch**: `master`. CI runs on push/PR to both `master` and `develop`, but the canonical PR base is `master`.
- **Draft, never ready-for-review**: PRs are always opened with `gh pr create --draft`. The user marks them ready themselves after review. Never auto-merge, never force-push.
- **PR title**: `[#N] <issue title>` for a single issue, `[#N1 #N2] Combined: <short combined title>` for a batch.
- **PR body** must include: `Closes #N` lines (one per issue), a `## Summary` bullet list, `## Files changed by layer` grouping, the manual test plan or steps from self-review, any non-obvious decisions in `## Notes`, and a `🤖 Generated with Claude Code` footer. `/be` adds `## Manual SQL to run` and `## Pre-existing coverage gaps`. `/fe` adds `## Backend endpoints consumed` (with `file:line` refs) and `## Mobile viewport check`.
- **Commit cadence**: `/fe` makes one commit. `/be` makes one commit for the implementation plus a second commit (`test(<domain>): ...`) if `/bte` wrote unit tests in the same run. Both go on the same branch in the same PR.
- **Quality gate before commit**: `/be` runs `cd backend && pre-commit run --all-files`. `/fe` runs `cd frontend && npm run lint && npm run build`. If either fails, fix the underlying issue and re-stage. **Never use `--no-verify`.** If the gate fails twice in a row, abort the Agent run and return a failure report instead of committing.
- **Existing PR collision**: if a draft PR with the same `Closes #N` already exists on `origin`, the Agent aborts and reports — it does not push or open a duplicate. The user decides whether to reuse or close it first.
- **PR URL is reported back**: the parent skill's final message to the user always includes the clickable PR URL plus the worktree path.

### `/be` — Backend Engineer

Defined at [.claude/skills/be/SKILL.md](.claude/skills/be/SKILL.md). Project-scoped skill that owns backend + database development end-to-end, including DBA work on [database/db_schema.sql](database/db_schema.sql). It embeds the layering, schema conventions, authorization model, and HTTP verb rule (see `## Backend`) so future sessions don't have to re-derive them. **Use this skill instead of ad-hoc backend implementation work.**

Subcommands:
- `/be <issue_number>[,<issue_number>...]` — full implementation flow for one or more GitHub issues. Steps 1-3 run in the user's main checkout (read-only): (1) `gh issue view` to read each issue including comments, (2) produce a structured implementation plan covering files / schema / API / authorization / errors / out-of-scope, (3) confirmation gate — pause if the plan touches `db_schema.sql`, dependencies, response envelope, auth, or if issues are unrelated / criteria unclear. Step 4 dispatches **one background worktree Agent** per `## Dev Flow` whose self-contained prompt runs the entire chain inside the worktree: implement → self-review → embedded `/bte` flow for each touched domain (bootstrap or review per `/bte` rules) → `pre-commit` gate → commit → push → open draft PR per `## Project Skills > PR mechanics`. Step 5 reports the PR URL + branch + non-obvious decisions back to the user when the Agent finishes.
- `/be discuss <topic>` — open Q&A about backend / database design or development. Five-section structure: (1) restate the question and confirm scope, (2) **three** concrete proposals with pros/cons/impact/complexity ordered from smallest change to most ambitious, (3) concerns and an opinionated recommendation, (4) numbered yes/no decisions the user must make before implementation, (5) follow-up ideas to park for later. **Never implements during discuss mode.**

**Project conventions enforced by `/be`:**
- HTTP verbs: backend uses **only `GET` and `POST`**. Update / delete operations are `POST` with the verb in the URL path (e.g. `POST /pet/{pet_id}/update`, `POST /meal/{meal_id}/delete`). `PUT` / `DELETE` / `PATCH` are never used. Match the position of the verb (`/{id}/update` vs `/update/{id}`) to the nearest sibling endpoint in the same router.
- Schema changes are made by editing `database/db_schema.sql` directly. There is no migration tool, so any schema change must be accompanied by the exact SQL to run manually against staging / prod (surfaced in the PR body's `## Manual SQL to run` section).
- Backend tests are **not** written by `/be` directly — the worktree Agent reads `.claude/skills/bte/SKILL.md` and runs the `/bte unit <domain>` flow inline (bootstrap mode if no test file exists, review-only mode if it does). Test commits land in the same branch / PR as the implementation.

### `/fe` — Frontend Engineer

Defined at [.claude/skills/fe/SKILL.md](.claude/skills/fe/SKILL.md). Project-scoped skill that owns frontend development end-to-end. It embeds the layering, styling rules, state-management rules, mobile-first principles, and the canonical resource-add order (see `## Frontend`) so future sessions don't have to re-derive them. **Use this skill instead of ad-hoc frontend implementation work.**

Subcommands:
- `/fe <issue_number>[,<issue_number>...]` — full implementation flow for one or more GitHub issues. Steps 1-3 run in the user's main checkout (read-only): (1) `gh issue view` to read each issue, (2) produce a structured 8-field plan covering files / data flow / state / component tree / routing / UX states / mobile-first / out-of-scope, (3) confirmation gate — paused **only** for unrelated batches or unclear acceptance criteria (technical changes like `vite.config.ts`, `App.tsx`, `client.ts`, npm deps, or store root edits **do not** pause; the user catches issues during manual testing). Step 4 dispatches **one background worktree Agent** per `## Dev Flow` whose prompt runs inside the worktree: verify backend API contracts by reading `backend/routers/` + `backend/services/` → implement layer-by-layer (`types` → `services` → `slices` → `hooks` → `components` → `routing`) → self-review (criteria, contract consistency, styling rule check, component reuse check, state rules, lint, build, manual test steps, mobile viewport) → commit → push → open draft PR per `## Project Skills > PR mechanics`. Step 5 reports the PR URL back to the user.
- `/fe discuss <topic>` — open Q&A about frontend / UX / state / build design. Same five-section structure as `/be discuss`. **Never implements during discuss mode.**

**Project conventions enforced by `/fe`:**
- All HTTP calls go through `src/api/services/` and the shared `src/api/client.ts` axios instance. **Never `import axios` directly inside a component or hook.**
- Backend contract verification is mandatory: before consuming any endpoint, read the actual `backend/routers/<domain>_router.py` to confirm URL / verb / payload / response. If the endpoint does not exist, **stop and tell the user backend must be done first via `/be`** — `/fe` never modifies backend code.
- Styling rules from `## Frontend > Styling rules` are non-negotiable: Tailwind everywhere, project tokens (`mint` / `earth` / `orange` / `card-3d` / `btn-3d`), `lucide-react` icons, MUI only for `@mui/x-charts`, no `sx={}`, no direct `@emotion/*` imports, no `@mui/icons-material`. Modals reuse `common/Modal.tsx` / `common/DeleteConfirmDialog.tsx`. Forms reuse `useFormState`. Uploads reuse `useFileUpload`.
- Frontend has no test framework — the quality gate is `npm run lint && npm run build` (the build runs `tsc -b` first, so this is also the full typecheck). There is no `/fte` and no test handoff.

### `/bte` — Backend Test Engineer

Defined at [.claude/skills/bte/SKILL.md](.claude/skills/bte/SKILL.md). Project-scoped skill for all backend test work. It embeds the agreed two-tier test architecture and mock strategy (see `## Backend > Tests`), so future sessions don't have to re-derive them. **Use this skill instead of writing ad-hoc test reviews.** `/be` invokes this skill automatically at the end of its issue flow.

Subcommands:
- `/bte unit <domain>` — for `auth`, `user`, `group`, `pet`, `food`, `meal`, `weight`. Behaviour depends on whether a unit test file already exists for the domain:
  - **If `backend/tests/unit/services/test_<domain>_service.py` exists** → review-only. Produces a coverage map, missing cases, refactor opportunities, violations of unit-test rules, and a P0/P1/P2 priority list. Stops there. Does not write code, does not offer to implement.
  - **If no test file exists** → bootstrap mode. Builds a coverage plan from the service, shows it to the user, then auto-writes a fresh test file (creating `backend/tests/unit/conftest.py` with the bcrypt stub if needed) via a background worktree per `## Dev Flow`. Reports back with branch + files + pytest result.
- `/bte integration <domain>` — discussion-first review of integration tests for the same domain list, plus the special `schema` domain (verifies the live DB matches `db_schema.sql`). Always produces a discussion document, asks the user to pick which proposed cases to implement, and only writes the selected cases (via a background worktree per `## Dev Flow`) after the user confirms in their next message. Never bootstraps automatically.
- `/bte discuss <topic>` — open Q&A about backend test strategy, patterns, or specific code. Ends with options + explicit decisions for the user. Never implements during discuss mode.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on push/PR to `master` and `develop`.

**Current jobs** (will change after the test restructure):
1. `pre-commit` job — runs `pre-commit run --all-files` from `backend/` (black + isort + flake8 + basic checks).
2. `test-endpoints-function` job — runs each legacy `test_*_endpoints.py` separately under `pytest --cov`, then uploads coverage to Codecov. Requires the test DB and Google OAuth secrets.

**Planned jobs** (after `backend/tests/unit/` exists):
1. `pre-commit` job — unchanged.
2. `unittest` job — runs `pytest backend/tests/unit -n auto`. No DB, no Google OAuth secrets needed (everything is mocked / stubbed per `## Backend > Tests > Unit tests`).

Integration tests are **not** run in CI under either layout — they are manual.

There is currently **no frontend CI** — `npm run lint` and `npm run build` are not enforced by GitHub Actions, so run them locally before pushing frontend changes.
