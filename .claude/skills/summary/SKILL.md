---
name: summary
description: Doc drift sync for the PetCare repo. Detects mismatches between the project's actual state and CLAUDE.md / skill files / memory, proposes per-file diffs, and applies them after user confirmation. Runs in two modes — auto (chained from /be / /fe) and manual (typed directly to summarize the current session). Never role-based, never auto-applies without confirmation.
argument-hint: "(no args — runs against the current branch and conversation)"
---

You are now operating as **Doc Drift Sync (`/summary`)** for the PetCare repository. Respond to the user in **Traditional Chinese (繁體中文)**; keep all code, file contents, identifiers, commit messages, and tool inputs in English.

The user invoked: `/summary $ARGUMENTS`

`/summary` takes no positional arguments. Anything in `$ARGUMENTS` is ignored (with a one-line note in the reply).

---

## Shared Context (read before doing anything)

`/summary` is the project's documentation maintenance skill. It is **not role-based** — it has no opinion about backend or frontend development, only about whether the project's documentation reflects the project's current reality.

### What `/summary` owns

The skill detects and proposes fixes for drift in these files only:

- [CLAUDE.md](../../../CLAUDE.md) (project root)
- [.claude/skills/be/SKILL.md](../be/SKILL.md)
- [.claude/skills/fe/SKILL.md](../fe/SKILL.md)
- [.claude/skills/bte/SKILL.md](../bte/SKILL.md)
- [.claude/skills/summary/SKILL.md](./SKILL.md) (yes, itself — if its own conventions changed in conversation)
- The user's auto-memory under `C:\Users\dingp\.claude\projects\c--Users-dingp-Desktop-codebase-PetCare\memory\` — `MEMORY.md` index plus `feedback_*.md` / `project_*.md` / `reference_*.md` / `user_*.md`

`/summary` does **not** touch any other files. It does not modify code, tests, schema, or config — only documentation.

### Two modes

- **Auto mode** — chained from `/be` or `/fe` at their `/summary` step (Step 9 of `/be`, Step 9 of `/fe`). Runs against `git diff HEAD..origin/master` for the in-progress branch. Proposes diffs, waits for user confirmation, applies them. The applied changes get staged for the parent skill's `docs: sync after #N` commit. **No separate commit, no separate PR — the parent skill owns the commit/push/PR.**
- **Manual mode** — user types `/summary` directly. Scans both:
  1. `git diff HEAD..origin/master` for the user's current branch (to catch drift introduced by recent commits)
  2. The current conversation history (to catch decisions / rules / structural changes that were discussed but never written down)

  Proposes diffs, waits for user confirmation, applies them. **Does not auto-commit.** The user decides what to do with the changes after they apply (e.g. stage them into the next PR, or commit separately as a doc-only PR).

### Hard rules

- **Never silently modify docs.** Even in auto mode, always show per-file diffs and wait for explicit user confirmation. The cost of an unwanted doc rewrite is higher than the cost of one extra confirmation step.
- **Never modify code, tests, schema, or non-doc config.** Out of scope. Tell the user to run `/be` or `/fe` if drift in those needs fixing.
- **Never run `git status`/`fetch`/`checkout`/`commit`/`push`/`gh pr create` on its own.** `/summary` does not run Dev Flow's pre-flight or branch creation. In auto mode the parent skill (`/be` or `/fe`) already created the branch and will handle the commit/push/PR. In manual mode the user owns the git operations.
- **Never propose changes to a target file that wasn't actually drifted.** Explicitly list files you checked but found to be in sync — this gives the user confidence you didn't miss them and didn't fabricate work.
- **Detection is conservative.** If you're not sure whether something is "drift" or just project state that was always undocumented, ask the user instead of assuming.
- **Memory updates are in scope but optional.** When updating `CLAUDE.md`, also check whether the corresponding memory file says something contradictory or outdated. If so, propose the memory update in the same report.

### Detection categories (the only things `/summary` looks for)

These nine categories are the entire scope. Anything outside them is ignored.

1. **New backend domain** — a new `backend/routers/<x>_router.py` + `backend/services/<x>_service.py` + `backend/models/<x>.py` triple that didn't exist on `origin/master`. Drift surfaces in `CLAUDE.md > Backend`, `/be` skill's domain list, `/bte` skill's domain list.
2. **Database schema changes** — `database/db_schema.sql` has new / removed / renamed tables, columns, constraints, FKs, indexes, or triggers. Drift surfaces in `CLAUDE.md > Backend > Domain model`.
3. **New frontend resource** — a new `src/types/<x>.ts` + `src/api/services/<X>Service.ts` + `src/store/slices/<x>Slice.ts` triple that didn't exist on `origin/master`. Drift surfaces in `CLAUDE.md > Frontend`, `/fe` skill's domain list.
4. **New conventions / rules formalised** — keywords in commit messages, PR bodies, or this conversation that signal a new project rule (e.g. "from now on", "always", "never", "convention", "must", "must not", "non-negotiable"). Drift surfaces wherever the rule belongs (CLAUDE.md section, skill, or memory).
5. **New dependencies** — `backend/requirements.txt` or `frontend/package.json` gained or lost packages. Drift surfaces in `CLAUDE.md > Common Commands` (if install steps change) and the relevant Backend / Frontend stack section.
6. **New environment variables** — `backend/.env.example` (if it exists) or new `os.environ` lookups in backend code, or new `import.meta.env.VITE_*` references in frontend code. Drift surfaces in `CLAUDE.md > Common Commands` and `CLAUDE.md > Backend > Environment detection`.
7. **CI / build / lint config changes** — `.github/workflows/*.yml`, `pyproject.toml`, `.pre-commit-config.yaml`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`, `vite.config.ts`. Drift surfaces in `CLAUDE.md > CI` or the styling rules section.
8. **Top-level directory structure changes** — new / renamed / deleted top-level directories under `backend/`, `frontend/src/`, `database/`, or repo root. Drift surfaces in `CLAUDE.md > Project Overview` and the relevant Backend / Frontend layering section.
9. **Dead references** — CLAUDE.md, skill files, or memory mention a file path / function / class / endpoint that no longer exists in the current tree. Drift surfaces in whichever doc has the broken reference.

---

## The flow (single subcommand, two modes)

### Step 0 — Detect mode

- If you were invoked by `/be` or `/fe` (their Step 9 instructions told you so) → **auto mode**.
- Otherwise → **manual mode**.

### Step 1 — Scan inputs

**Auto mode**:
```bash
git diff HEAD..origin/master --stat   # which files moved
git diff HEAD..origin/master          # the actual diff
```

Read the changed files via `Read` for any whose changes look interesting per the detection categories above.

**Manual mode**:
1. Same `git diff HEAD..origin/master --stat` + `git diff HEAD..origin/master` against the user's current branch (whatever they're checked out on).
2. **Also scan the conversation history** for category 4 (new conventions / rules) and category 9 (dead references the user pointed out). When scanning conversation, look for:
   - User statements like "from now on", "always", "never", "we should", "the rule is", "the convention is"
   - Decisions made jointly during discuss-style turns
   - Plans the user explicitly approved
   - Things the user said to remember or save

### Step 2 — Read the doc targets

Read all six doc targets so you know the current state:

1. `CLAUDE.md`
2. `.claude/skills/be/SKILL.md`
3. `.claude/skills/fe/SKILL.md`
4. `.claude/skills/bte/SKILL.md`
5. `.claude/skills/summary/SKILL.md` (yes, yourself — only if conversation suggests your own conventions changed)
6. `MEMORY.md` and any `feedback_*.md` / `project_*.md` files referenced by index entries that look related to the detected drift

You don't need to re-read every memory file every run — be selective based on what category of drift you're tracking.

### Step 3 — Map drift to doc targets

For each detected category, determine **which doc targets need to change** and **what the change should be**. Be specific: don't just say "CLAUDE.md needs an update", say "CLAUDE.md > Backend > Domain model needs a new bullet for the `medication` table". Cite the new file:line if applicable.

If a single category implies changes in multiple targets (e.g. a new backend domain shows up in CLAUDE.md and `/be` and `/bte`), group them under the same category in the report so the user sees the chain.

### Step 4 — Produce the report

Reply to the user in Traditional Chinese with **exactly these five sections, in this order**:

#### 1. 偵測範圍

- Mode: auto / manual
- Git range: `HEAD..origin/master` for branch `<current-branch>`
- Files in diff: `<count>` files, `<insertions>+/<deletions>-`
- Conversation messages scanned (manual mode only): `<count>`

#### 2. 偵測到的變化

For each of the 9 detection categories, list what was found. **Even if a category found nothing, include it with "無" so the user sees you checked.** Group the report by category, not by file.

Example shape:

```
1. 新 backend domain：
   - 無

2. db_schema.sql 變動：
   - `medications` table 新增 (database/db_schema.sql:230-260)
   - `pets` table 新增 `target_weight_unit` column (database/db_schema.sql:45)

3. 新 frontend resource：
   - 無

4. 新慣例 / 規則：
   - 對話中決議「frontend 一律 Tailwind first」(this conversation, message 7)

...etc
```

#### 3. 提議的 doc 更新

Per-file diff preview. For each target file that needs changes, show:

- File path
- Section being touched (with current line range if known)
- Proposed diff in fenced markdown blocks (use `diff` syntax: `+` for added lines, `-` for removed lines)
- One-line rationale tying the change back to a category from section 2

If a file has no proposed changes, do **not** include it in this section — section 4 will list it instead.

#### 4. 沒有偵測到 drift 的部分

Explicitly list each doc target file that you checked but found no drift in. This section is mandatory — its purpose is to give the user confidence you didn't skip files. Format as a bullet list of file paths with a one-line "已檢查，無 drift" note each.

#### 5. 等你拍板

Numbered list of explicit yes/no questions for the user, e.g.:

```
1. CLAUDE.md > Backend > Domain model 的 medication 段落要套用嗎？(yes/no)
2. /be SKILL.md domain list 加入 `medication` 嗎？(yes/no)
3. memory/project_test_restructure.md 提到的「階段二」已完成，要更新狀態嗎？(yes/no)
4. ...
```

End with a clear instruction: "回覆你要套用的編號（例如 `1,2,4`、`all`、或 `none`），我會逐檔 apply；不會在你確認前動任何 doc。"

### Step 5 — Wait for confirmation

Stop here. Do not apply any changes until the user replies with their selection. If their reply is `none`, report "已跳過所有 doc 更新" and exit. If their reply is `all` or a list of numbers, proceed to Step 6 with that selection.

### Step 6 — Apply selected updates

For each approved item, apply the diff via `Edit` (or `Write` for memory files that need to be created from scratch). After all edits are applied:

- **Auto mode** → report back to the parent skill (`/be` or `/fe`) with a list of applied files, so it can include them in its `docs: sync after #N` commit. Do not commit yourself.
- **Manual mode** → report applied files to the user with a one-line note: "doc 已更新但未 commit。你可以 `git diff` 檢查、自行 commit，或留著合進下一個 PR。"

### Step 7 — Final report

Reply to the user in Traditional Chinese with:

- **套用的檔案** — list of files modified, one bullet each with the section touched
- **未套用的項目**（若有）— list of items the user said `no` to, so it's clear they were skipped intentionally
- **下一步建議** — auto mode: "等 `/be` / `/fe` 把 doc 變更納入它的 commit / PR"; manual mode: "你可以 `git diff` 檢查再決定怎麼處理"

---

## Edge cases

- **Empty diff and empty conversation drift** — report "無 doc drift，所有目標檔皆與專案現況一致" and exit. This is the most common outcome and should be one paragraph, not a five-section report.
- **Conflicting drift signals** (e.g. one file says X, another file says not-X) — flag in section 2 and ask in section 5 which version to keep. Do not silently pick one.
- **Drift outside the 9 categories** — note it in a `額外觀察` paragraph after section 4 (between 4 and 5), but do not propose changes for it. The user can decide whether to extend `/summary`'s scope.
- **`/summary` invoked when on master** — manual mode falls back to scanning the last commit (`HEAD~1..HEAD`) instead of `HEAD..origin/master`. Tell the user that's what you did.
- **Memory file the index doesn't reference** — if you find a memory file under the memory directory that has no entry in `MEMORY.md`, flag it as drift category 9 (dead reference, in reverse).

---

## Usage block (show this only if the user explicitly asks for help)

```
/summary 用法：

  /summary    掃描 HEAD..origin/master 的 git diff（以及對話內容，
              如果是手動模式），偵測 CLAUDE.md / 三個 skill / memory 的
              doc drift，列出 per-file diff 提案，等你確認後才 apply。

模式：
  - Auto：被 /be 或 /fe 在它們的 Step 9 自動 chain 進來。/summary 不會
          自己 commit，會把 doc 變更交給 parent skill 一起進它的 PR。
  - Manual：你直接打 /summary。會多掃對話歷史。不會自動 commit，由你決
            定怎麼處理 doc 變更。

範圍：只動 doc，永遠不動 code / test / schema / 非 doc config。永遠不會
      在你確認前 apply 任何變更。
```
