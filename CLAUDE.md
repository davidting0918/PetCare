# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

When responding to the user in this repository, write all conversational text in **Traditional Chinese (繁體中文)**. Everything else stays in English — code, file contents, commit messages, code comments, identifiers, and any text written into files. Only the assistant's chat responses themselves are translated.

## Dev Flow

All skill-driven development work (`/be`, `/fe`, `/bte`, `/summary`) follows a single **classic single-checkout flow** that runs synchronously in the user's main checkout. The user is present for every step. There is no background worktree, no parallel agent dispatch, no cross-checkout coordination.

This is a deliberate inversion of an earlier worktree-based design. The user explicitly chose linearity and visibility over parallelism, accepting that the main checkout is occupied while a skill runs.

### The flow (every code-mutating skill follows this exact sequence)

```
Pre-flight (the skill auto-checks BEFORE touching anything)
  1. git status --porcelain        must be empty
       └ Not empty → STOP. Tell the user exactly which files are dirty
         and ask them to commit or stash first. Never stash on their behalf.
  2. git fetch origin master       must succeed
       └ Failure → report verbatim and stop. Do not retry silently.
  3. Intended branch name has no collision on origin/local
       └ Collision → append -2, -3, ... until unique.

Branch
  4. git checkout -b claude/issue-{N}-{slug} origin/master
       (single command — branches off the latest origin/master and switches.
        Replaces "checkout master → pull → checkout -b" as three steps.)
       For batch issues: claude/issues-{N1}-{N2}-{slug}

Implement (in the user's main checkout, fully visible)
  5. Implement the feature / fix per the plan
  6. Self-review against the skill's checklist
  7. /bte handoff (only inside /be flow — runs inline in main checkout,
                   per /bte's unit subcommand: bootstrap if no test file
                   exists, review-only if it does)
  8. Quality gate
       - /be:  cd backend  && pre-commit run --all-files
       - /fe:  cd frontend && npm run lint && npm run build
       - Failure → fix the underlying issue and re-run.
                   NEVER use --no-verify.
                   Two failures in a row → STOP and report.
  9. /summary auto-chain
       - Scans git diff HEAD..origin/master + the conversation history
       - Detects doc drift across CLAUDE.md / skill files / memory
       - Proposes per-file diff → waits for user confirmation → applies

Commit / Push / PR
  10. git commit
       - /fe:        one commit (feat or fix)
       - /be:        one commit (feat/fix), plus a second commit
                     (test(<domain>): ...) if /bte wrote tests
       - /summary:   adds a third commit (docs: sync after #N)
                     if it applied doc updates
  11. git push -u origin <branch>
  12. gh pr create --draft --base master --title ... --body ...
       (PR templates per ## Project Skills > PR mechanics)
  13. Final report
       - PR URL (clickable)
       - Branch name
       - One-line reminder: "To return to your previous branch:
         git switch <previous>"
```

### Pre-flight failure modes

- **Working tree not clean** — refuse to proceed. List the dirty files. Ask the user to commit or stash. **Never** run `git stash`, `git add`, `git checkout --`, or any mutating cleanup on the user's behalf.
- **`git fetch` fails** — report the underlying error verbatim and stop. Do not retry, do not work offline against a stale local master.
- **Branch-name collision** — append `-2`, `-3`, etc. until unique. The chosen name must appear in the user-facing report.
- **User is on master with unpushed commits** — refuse and tell the user. Do not try to "fix" their checkout.

### Hard rules for any skill flow

- **No background worktree, no `Agent` tool dispatch for code work.** Everything runs synchronously in main checkout. If you find yourself reaching for `Agent` to "isolate" code work, stop — that pattern is gone.
- **No auto-merge, no force-push, no marking PRs ready-for-review.** PRs are always opened as `--draft`. The user marks them ready themselves after review.
- **No `--no-verify` on commits.** If pre-commit or husky-style hooks fail, fix the underlying issue and re-stage.
- **Multiple issues in one skill invocation → one combined branch + one combined PR**, not parallel branches. If issues are clearly unrelated, stop at the planning step and ask the user whether to handle them separately.
- **No auto-commit on the user's existing branch.** Skill work always creates a fresh branch from `origin/master`. If the user wants to add changes to an existing branch, they do that themselves outside the skill.

### When this flow does NOT apply

The flow only applies to **code-mutating** skill work. Read-only or discussion work is exempt:

- Reading files, searching code, planning, design Q&A
- `/be discuss`, `/fe discuss`, `/bte discuss`
- `/summary` invoked manually for doc-drift inspection (it modifies docs but is conversational and skipped pre-flight intentionally — see `## Project Skills > /summary` for its own rules)
- Editing CLAUDE.md / memory / project docs the user is actively reviewing in the IDE
- Any change explicitly scoped to the file the user is currently editing

### Why the change from worktree

The original Dev Flow (2026-04-07) used background worktrees + `Agent` dispatch so the user could keep working in the foreground while skills ran in parallel. After building it out across `/be`, `/fe`, `/bte`, the user found that:

1. Cross-checkout coordination (especially for `/summary` doc updates) added complexity without proportional value.
2. They preferred seeing every step in their IDE rather than trusting a background agent.
3. A single linear flow is easier to reason about than multiple parallel agents.

The trade-off — main checkout is occupied while a skill runs — is acceptable because skill runs are short-lived (minutes, not hours).

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
- **Use the project design tokens, not raw Tailwind colors** — the canonical token system lives in [frontend/src/styles/tokens.css](frontend/src/styles/tokens.css) (CSS variables) and is exposed through [frontend/tailwind.config.js](frontend/tailwind.config.js) as `surface.{0,1,2,3}` / `border.{subtle,DEFAULT,strong}` / `text.{primary,secondary,tertiary,disabled}` / `accent.{pink,teal,purple,blue}` (each with `-hover` variant) / `success` / `warning` / `danger` / `info`. New components use these names — cards use the `surface-card` component class (defined in [frontend/src/index.css](frontend/src/index.css)), buttons use `btn-primary` / `btn-secondary`, inputs use `input-field`, shadows use `shadow-card` / `shadow-elevated` / `shadow-selected-{pink,teal,purple,blue}`. The legacy warm-pastel palette (`mint` / `earth` / `orange` / `primary`) and the 3D component classes (`card-3d` / `btn-3d*` / `input-3d` / `shadow-3d`) are kept ONLY for the unswept consumer files and will be removed once issues #54-#57 finish migrating them — do **not** use them in new code. Do not hardcode `bg-emerald-500`, `bg-amber-400`, `bg-white`, `text-gray-*`, etc. — pick the nearest semantic token instead.
- **Icons come from `lucide-react`**, never `@mui/icons-material`. See [MealPage.tsx](frontend/src/components/meal/MealPage.tsx) for the canonical icon-import pattern.
- **`@mui/material` is reserved for complex specialized widgets** that would be painful to write in raw HTML + Tailwind. Currently only `@mui/x-charts` is in active use. Before reaching for any other MUI component (DatePicker, Autocomplete, complex Table, etc.), justify in the implementation plan why Tailwind cannot do the job.
- **`@emotion/*` must never be imported directly** in components or hooks. It is only present as a transitive dependency of MUI.
- **Modals and dialogs are Tailwind-built**, not MUI. Use the existing [common/Modal.tsx](frontend/src/components/common/Modal.tsx) and [common/DeleteConfirmDialog.tsx](frontend/src/components/common/DeleteConfirmDialog.tsx) when possible; if you must build a new one, copy the `fixed inset-0 bg-black/50` pattern from [CreateMealForm.tsx](frontend/src/components/forms/CreateMealForm.tsx).
- **Forms reuse `useFormState`** ([src/hooks/useFormState.ts](frontend/src/hooks/useFormState.ts)) and **uploads reuse `useFileUpload`** ([src/hooks/useFileUpload.ts](frontend/src/hooks/useFileUpload.ts)). Do not reinvent form state or multipart upload handling.

## Project Skills

### Skill chain overview

The five project skills form a single end-to-end pipeline. Each skill's responsibilities are scoped tightly so the boundaries don't blur:

```
/pm discuss  →  /pm plan  →  /be / /fe / /bte  →  /summary  →  draft PR
   (Q&A,         (creates       (implements code         (syncs CLAUDE.md
    converges    GitHub         in main checkout         + skill files
    direction)   issues +       per Dev Flow)            + memory)
                 milestone)
```

- **`/pm`** — entry point for new work. Discusses feature ideas, breaks them into GitHub issues + milestones along domain boundaries, dispatches downstream skills.
- **`/be` / `/fe`** — execute one or more issues. Run synchronously in main checkout per `## Dev Flow`.
- **`/bte`** — backend test work. Invoked inline by `/be`, or directly for review / bootstrap / integration test discussions.
- **`/summary`** — doc drift sync. Auto-chained from `/be` / `/fe` at their quality-gate step, or invoked manually.

You can enter the chain at any point. Bypassing `/pm` (typing `/be 12` directly when issue 12 was created by hand) is fully supported — `/pm` is only mandatory when you need to *create* issues from a feature description.

### PR mechanics (shared by `/be` and `/fe`)

Both `/be` and `/fe` end their issue flow by committing, pushing, and opening a **draft** PR from the user's main checkout (per `## Dev Flow`). The conventions are identical and live here so the two skills don't drift:

- **Branch name**: `claude/issue-{N}-{slug}` for a single issue, `claude/issues-{N1}-{N2}-{slug}` for a batch. If a branch with the exact same name already exists on `origin` or locally, append `-2`, `-3`, etc. until unique.
- **Target branch**: `master`. CI runs on push/PR to both `master` and `develop`, but the canonical PR base is `master`.
- **Draft, never ready-for-review**: PRs are always opened with `gh pr create --draft`. The user marks them ready themselves after review. Never auto-merge, never force-push.
- **PR title**: `[#N] <issue title>` for a single issue, `[#N1 #N2] Combined: <short combined title>` for a batch.
- **PR body** must include: `Closes #N` lines (one per issue), a `## Summary` bullet list, `## Files changed by layer` grouping, the manual test plan or steps from self-review, and any non-obvious decisions in `## Notes`. `/be` adds `## Manual SQL to run` and `## Pre-existing coverage gaps`. `/fe` adds `## Backend endpoints consumed` (with `file:line` refs) and `## Mobile viewport check`. If `/summary` applied doc updates, both add `## Doc updates`. **No Claude attribution footer.**
- **Commit cadence**: `/fe` makes one commit (feat / fix). `/be` makes one commit for the implementation plus a second commit (`test(<domain>): ...`) if `/bte` wrote unit tests in the same run. Both add a third commit (`docs: sync after #N`) if `/summary` applied doc drift fixes. All commits go on the same branch in the same PR.
- **Quality gate before commit**: `/be` runs `cd backend && pre-commit run --all-files`. `/fe` runs `cd frontend && npm run lint && npm run build`. If either fails, fix the underlying issue and re-stage. **Never use `--no-verify`.** If the gate fails twice in a row, **stop the skill** and report the failure to the user — do not commit broken code.
- **Existing PR collision**: if a draft PR with the same `Closes #N` already exists on `origin`, **stop and report** — do not push or open a duplicate. The user decides whether to reuse or close it first.
- **PR URL is reported back**: the skill's final message to the user always includes the clickable PR URL plus the branch name plus a one-line reminder of how to switch back to the user's previous branch (`git switch <previous>`).

### `/pm` — Project + Product Manager

Defined at [.claude/skills/pm/SKILL.md](.claude/skills/pm/SKILL.md). Project-scoped skill that owns feature discovery, scoping, and breakdown into GitHub issues + milestones. **The only skill that touches the GitHub issue tracker** — every other skill consumes issues but never creates them. Has no opinion about backend vs frontend; routes work to `/be` / `/fe` after issues are created.

Subcommands:
- `/pm discuss <topic>` — two-stage product / project Q&A. **Stage 1** uses the same five-section structure as `/be discuss` / `/fe discuss` (problem → three proposals → concerns → user decisions → follow-ups) to converge direction quickly. **Stage 2** (only if the user picks a proposal in their reply) expands the chosen direction into a near-spec-level document: user stories, data model, full API surface, frontend surface, authorization model, user journey walk-through, technical risks, breakdown preview. Every reply ends with an explicit prompt block telling the user their next options. **Never creates issues during discuss** — the only path from discuss to issues is the user typing `plan 1` / `plan 2` / `plan 3` (or `plan` after stage 2) at a prompt block.
- `/pm plan <feature description>` (or `/pm plan` continuing from a stage-2 spec) — proposes a GitHub issue breakdown along domain boundaries: one issue per backend domain, one issue per frontend resource, separate schema issue if `db_schema.sql` is touched. Each issue body uses a strict three-section format: `## Background` (Problem / Why now / Out of scope), `## Tech Implementation Plan` (Affected layers / Files / API contract OR Data flow / Dependencies), `## Manual Verification Before Merge` (checklist). Issues get `type:*` + `area:*` + `domain:*` labels per [.claude/labels.yaml](.claude/labels.yaml). Milestones are created **only when ≥ 3 issues** (override allowed) and **never carry due dates** (matches the project's no-time-estimates rule). Then proposes the full plan to the user, waits for explicit `apply`, creates the issues + milestone via `gh`, hands off to the user for GitHub-side review, and finally dispatches `/be` / `/fe` / `/bte` in dependency order on user confirmation — with a hard pause between issues so the user can review each PR before downstream work starts.

**Project conventions enforced by `/pm`:**
- **Issue bodies are English**, conversation is Traditional Chinese. English bodies stay searchable across sessions and tools.
- **Domain-boundary breakdown**: backend issues mirror `/be`'s service boundary, frontend issues mirror `/fe`'s resource boundary. Schema changes get their own issue. No vertical-slice fullstack issues — the project's tooling is built around the backend / frontend split, and a single issue spanning both would force `/be` and `/fe` into the same PR.
- **Always propose before applying**: `/pm` never creates issues, milestones, or dispatches downstream skills without an explicit `apply` / `dispatch` reply from the user. GitHub mutations are user-visible and hard to undo cleanly.
- **No new labels**: `/pm` only applies labels that already exist in `.claude/labels.yaml`. If a feature would benefit from a new label, `/pm` proposes it in the discuss section but tells the user to `chore(labels): add <name>` separately.
- **No code, schema, or PR work**: `/pm` lives entirely in the GitHub API surface plus the skill chain. It never runs Dev Flow steps itself.

### `/be` — Backend Engineer

Defined at [.claude/skills/be/SKILL.md](.claude/skills/be/SKILL.md). Project-scoped skill that owns backend + database development end-to-end, including DBA work on [database/db_schema.sql](database/db_schema.sql). It embeds the layering, schema conventions, authorization model, and HTTP verb rule (see `## Backend`) so future sessions don't have to re-derive them. **Use this skill instead of ad-hoc backend implementation work.**

Subcommands:
- `/be <issue_number>[,<issue_number>...]` — full implementation flow for one or more GitHub issues, run synchronously in the user's main checkout per `## Dev Flow`. Sequence: read issue → plan → confirmation gate (pause if the plan touches `db_schema.sql`, dependencies, response envelope, auth, or if issues are unrelated / criteria unclear) → pre-flight + branch creation (`claude/issue-{N}-{slug}` from latest `origin/master`) → implement (model → service → router → `main.py` → schema) → self-review → inline `/bte unit <domain>` flow for each touched domain (bootstrap mode if no test file, review-only if exists) → `pre-commit run --all-files` → inline `/summary` chain to detect doc drift → commit(s) → `git push -u origin` → `gh pr create --draft` → final report with PR URL.
- `/be discuss <topic>` — open Q&A about backend / database design or development. Five-section structure: (1) restate the question and confirm scope, (2) **three** concrete proposals with pros/cons/impact/complexity ordered from smallest change to most ambitious, (3) concerns and an opinionated recommendation, (4) numbered yes/no decisions the user must make before implementation, (5) follow-up ideas to park for later. **Never implements during discuss mode.**

**Project conventions enforced by `/be`:**
- HTTP verbs: backend uses **only `GET` and `POST`**. Update / delete operations are `POST` with the verb in the URL path (e.g. `POST /pet/{pet_id}/update`, `POST /meal/{meal_id}/delete`). `PUT` / `DELETE` / `PATCH` are never used. Match the position of the verb (`/{id}/update` vs `/update/{id}`) to the nearest sibling endpoint in the same router.
- Schema changes are made by editing `database/db_schema.sql` directly. There is no migration tool, so any schema change must be accompanied by the exact SQL to run manually against staging / prod (surfaced in the PR body's `## Manual SQL to run` section).
- Backend tests are **not** written by `/be` directly — `/be` runs the `/bte unit <domain>` flow inline in main checkout (bootstrap mode if no test file exists, review-only mode if it does). Test commits land in the same branch / PR as the implementation.

### `/fe` — Frontend Engineer

Defined at [.claude/skills/fe/SKILL.md](.claude/skills/fe/SKILL.md). Project-scoped skill that owns frontend development end-to-end. It embeds the layering, styling rules, state-management rules, mobile-first principles, and the canonical resource-add order (see `## Frontend`) so future sessions don't have to re-derive them. **Use this skill instead of ad-hoc frontend implementation work.**

Subcommands:
- `/fe <issue_number>[,<issue_number>...]` — full implementation flow for one or more GitHub issues, run synchronously in the user's main checkout per `## Dev Flow`. Sequence: read issue → 8-field plan (files / data flow / state / component tree / routing / UX states / mobile-first / out-of-scope) → confirmation gate (paused **only** for unrelated batches or unclear acceptance criteria; technical changes like `vite.config.ts`, `App.tsx`, `client.ts`, npm deps, or store root edits **do not** pause — the user catches issues during manual testing) → pre-flight + branch creation → verify backend API contracts by reading `backend/routers/` + `backend/services/` → implement layer-by-layer (`types` → `services` → `slices` → `hooks` → `components` → `routing`) → self-review (criteria, contract consistency, styling rule check, component reuse check, state rules, lint, build, manual test steps, mobile viewport) → `npm run lint && npm run build` → inline `/summary` chain → commit → `git push -u origin` → `gh pr create --draft` → final report with PR URL.
- `/fe discuss <topic>` — open Q&A about frontend / UX / state / build design. Same five-section structure as `/be discuss`. **Never implements during discuss mode.**

**Project conventions enforced by `/fe`:**
- All HTTP calls go through `src/api/services/` and the shared `src/api/client.ts` axios instance. **Never `import axios` directly inside a component or hook.**
- Backend contract verification is mandatory: before consuming any endpoint, read the actual `backend/routers/<domain>_router.py` to confirm URL / verb / payload / response. If the endpoint does not exist, **stop and tell the user backend must be done first via `/be`** — `/fe` never modifies backend code.
- Styling rules from `## Frontend > Styling rules` are non-negotiable: Tailwind everywhere, project tokens (`mint` / `earth` / `orange` / `card-3d` / `btn-3d`), `lucide-react` icons, MUI only for `@mui/x-charts`, no `sx={}`, no direct `@emotion/*` imports, no `@mui/icons-material`. Modals reuse `common/Modal.tsx` / `common/DeleteConfirmDialog.tsx`. Forms reuse `useFormState`. Uploads reuse `useFileUpload`.
- Frontend has no test framework — the quality gate is `npm run lint && npm run build` (the build runs `tsc -b` first, so this is also the full typecheck). There is no `/fte` and no test handoff.

### `/bte` — Backend Test Engineer

Defined at [.claude/skills/bte/SKILL.md](.claude/skills/bte/SKILL.md). Project-scoped skill for all backend test work. It embeds the agreed two-tier test architecture and mock strategy (see `## Backend > Tests`), so future sessions don't have to re-derive them. **Use this skill instead of writing ad-hoc test reviews.** `/be` invokes this skill automatically as part of its issue flow (running inline in the same main checkout, on the same branch).

Subcommands:
- `/bte unit <domain>` — for `auth`, `user`, `group`, `pet`, `food`, `meal`, `weight`. Runs synchronously in the user's main checkout per `## Dev Flow`. Behaviour depends on whether a unit test file already exists for the domain:
  - **If `backend/tests/unit/services/test_<domain>_service.py` exists** → review-only. Produces a coverage map, missing cases, refactor opportunities, violations of unit-test rules, and a P0/P1/P2 priority list. Stops there. Does not write code, does not offer to implement.
  - **If no test file exists** → bootstrap mode. Builds a coverage plan from the service, shows it to the user, runs pre-flight + branch creation (`claude/bte-bootstrap-<domain>` from latest `origin/master`), then writes a fresh test file (creating `backend/tests/unit/conftest.py` with the bcrypt stub if needed) directly in main checkout, runs `pytest`, commits, pushes, and opens a draft PR.
  - **When invoked inline by `/be`** → no separate branch / PR. `/bte` writes to the branch `/be` already created and adds a `test(<domain>): ...` commit that lands in `/be`'s same PR.
- `/bte integration <domain>` — discussion-first review of integration tests for the same domain list, plus the special `schema` domain (verifies the live DB matches `db_schema.sql`). Always produces a discussion document, asks the user to pick which proposed cases to implement, and only after the user confirms in their next message does it run pre-flight + branch + write the selected cases in main checkout + commit + push + draft PR. Never bootstraps automatically.
- `/bte discuss <topic>` — open Q&A about backend test strategy, patterns, or specific code. Ends with options + explicit decisions for the user. Never implements during discuss mode.

### `/summary` — Doc Drift Sync

Defined at [.claude/skills/summary/SKILL.md](.claude/skills/summary/SKILL.md). Project-scoped maintenance skill that detects and fixes drift between the project's actual state and its documentation: [CLAUDE.md](CLAUDE.md), the four skill files (`be`, `fe`, `bte`, `summary`), and the user's memory (`MEMORY.md` + `feedback_*.md` / `project_*.md` / `reference_*.md`). Not role-based — `/summary` has no opinion about backend or frontend, only about whether the docs reflect reality.

`/summary` runs in two modes, both **synchronous in the user's main checkout** (no branch creation, no auto-commit by itself — see Dev Flow exemption):

- **Auto mode (chained from `/be` / `/fe`)** — at the quality-gate step of `/be` or `/fe`, the parent skill auto-invokes `/summary` against the diff `git diff HEAD..origin/master` for the in-progress branch. `/summary` proposes per-file doc updates, the user confirms, and the updates are staged into the parent skill's commit / PR (added as a `docs: sync after #N` commit if non-empty).
- **Manual mode (`/summary` typed directly)** — `/summary` scans both `git diff HEAD..origin/master` (relative to the user's current branch) **and** the current conversation history for decisions / rules / structural changes that haven't been written down. Proposes per-file doc updates. Does **not** auto-commit — the user decides what to do with the changes after they apply.

Detection categories (the only things `/summary` looks for):
1. New backend domain (new `backend/routers/<x>_router.py` + `services/<x>_service.py` + `models/<x>.py`)
2. Database schema changes in `database/db_schema.sql`
3. New frontend resource (new `src/types/<x>.ts` + `api/services/<X>Service.ts` + `store/slices/<x>Slice.ts`)
4. New conventions / rules formalised in commit messages, PR bodies, or conversation
5. New dependencies (`backend/requirements.txt` / `frontend/package.json`)
6. New environment variables (`backend/.env.example` / `vite.config.ts` `VITE_*` references)
7. CI / build / lint config changes (`.github/workflows/*.yml`, `pyproject.toml`, `.pre-commit-config.yaml`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`)
8. Top-level directory structure changes
9. Dead references in CLAUDE.md / skills / memory pointing at files or symbols that no longer exist

`/summary` always proposes diffs and waits for explicit user confirmation before applying — it never silently rewrites docs, even in auto mode.

## GitHub Labels

The repo uses a `category:value` label system. **Source of truth is [.claude/labels.yaml](.claude/labels.yaml)** — every label, color, and description lives there. Live GitHub state must match this file. Re-apply commands and the rationale for each category are documented inline in the YAML.

### Categories

- **`type:*`** (6) — kind of work, mirrors conventional-commit prefixes. Every issue and PR gets exactly one. `type:feat`, `type:fix`, `type:refactor`, `type:test`, `type:docs`, `type:chore`.
- **`area:*`** (5) — which top-level part of the monorepo is touched. At least one required, multiple allowed (e.g. a schema-touching backend change is `area:backend` + `area:database`). `area:backend`, `area:frontend`, `area:database`, `area:ci`, `area:claude`.
- **`domain:*`** (8) — feature domain, one-to-one with `/bte`'s domain argument plus `medicine` (planned). Apply when the work is scoped to a specific service / module: `auth`, `user`, `group`, `pet`, `food`, `meal`, `weight`, `medicine`.
- **`test:*`** (2) — test tier, only when `type:test` is set. `test:unit` for `backend/tests/unit/`, `test:integration` for `backend/tests/integration/` (covers schema verification too — there is no `test:schema`).

Total: **21 custom labels**. All 9 GitHub default labels were deleted on 2026-04-08 (`bug` / `documentation` / `enhancement` were replaced by `type:fix` / `type:docs` / `type:feat`; the other 6 were unused on this single-developer repo).

### Where labels live

**Labels live on issues, not on PRs.** `/pm plan` is the only skill that applies labels (when it creates issues from a feature breakdown). `/be`, `/fe`, `/bte`, and `/summary` do **not** pass `--label` to `gh pr create` — PRs inherit context from the `Closes #N` linkage in the PR body, and the issue's labels remain visible there.

The reason: labels exist so the user can filter the issue list (`type:feat`, `area:frontend`, `domain:meal`, etc.). Re-attaching them to PRs is duplicate noise that slows the dev flow without adding signal — every PR that closes an issue is already discoverable by clicking through the issue.

If a PR is opened by hand (not via `/be` / `/fe`) and the user wants it to appear in some label-filtered view, they can `gh pr edit <N> --add-label <name>` themselves.

### Manual conventions

- Issues filed by hand: at minimum set one `type:*` and one `area:*`. Add `domain:*` if the work is domain-scoped. Skip `test:*` unless filing a test-only ticket.
- Adding a new label: edit [.claude/labels.yaml](.claude/labels.yaml) first, then `gh label create` with the same name/color/description, then commit under `chore(labels): add <name>`. Do not add labels straight to GitHub without updating the YAML — `/summary` will flag the drift.
- Removing a label: delete from YAML, run `gh label delete <name> --yes`, commit under `chore(labels): remove <name>`. Existing issues lose the label silently.

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
