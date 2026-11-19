# Issue tracker: Entire (`entire trail`)

Issues and specs for this repo live as Entire trails managed via the `entire` CLI (`entire trail`). Run `entire agent-help trail` for exact installed CLI flags.

## Conventions

- **Create a trail (issue/spec)**:
  - With a branch: `entire trail create --title "..." --body "..." --type <bug|feature|task> --priority <urgent|high|medium|low|none> --json`
  - Intent-only (no branch published yet): `entire trail create --no-branch --title "..." --body "..." --type <bug|feature|task> --json`
- **Read a trail**: `entire trail show <trail-number-or-id> --json` (or `entire trail show --json` to inspect the current branch's parent trail).
- **List trails**: `entire trail list --project <forge>/<project> --status open --json` (or `entire trail list --mine --status open --json` across projects).
- **Update a trail**: `entire trail update <trail-number-or-id> --title "..." --body "..." --type <bug|feature|task> --priority <urgent|high|medium|low|none> --status <open|closed> --json`.
- **Assign / unassign**: `entire trail update <trail-number-or-id> --add-assignee <login>` / `--remove-assignee <login>` (or `--assignee <login>` to replace).
- **Triage state**: Since Entire trails use `--status <open|closed>`, `--type <bug|feature|task>`, and `--priority`, record canonical triage role strings (from `docs/agents/triage-labels.md`) as a `Status: <triage-label>` line at the top of the trail `--body` (or via agent findings).
- **Read discussion / comments**: `entire trail comment list --trail <trail-number-or-id>`. Note: `entire trail comment` writes are reserved for humans and refuse in agent sessions.
- **Agent findings / questions / follow-ups**: Use `entire trail finding` (`entire trail finding add`, `entire trail finding list`, `entire trail finding reply`, `entire trail finding resolve`) when an agent needs to post review findings, questions, or follow-ups on a trail branch.
- **Close a trail**: `entire trail update <trail-number-or-id> --status closed --json`.

If the repo has no `origin` remote configured, pass `--project <forge>/<project>` and/or `--repo <forge>/<owner>/<repo>` explicitly as required by `entire trail`.

## When a skill says "publish to the issue tracker"

Create an Entire trail with `entire trail create` (using `--no-branch` for pure specs/tickets before branch work starts, or linking the working branch when implementation begins).

## When a skill says "fetch the relevant ticket"

Run `entire trail show <trail-number-or-id> --json` (and `entire trail comment list --trail <trail-number-or-id>` or `entire trail finding list --trail <trail-number-or-id>` if discussion/findings context is needed).

## Wayfinding operations

Used by `/wayfinder`.

- **Map**: an intent trail created via `entire trail create --no-branch --title "Wayfinder: <effort>" --type task --body "..."` holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a trail created via `entire trail create --no-branch --title "..." --type task --body "Part of trail #<map>\nType: <research|prototype|grilling|task>\nStatus: open\n..."`.
- **Blocking**: record `Blocked by: #<n>, #<n>` near the top of the child trail body. A ticket is unblocked when every blocker trail is `closed`.
- **Frontier**: list open trails for the effort (`entire trail list --project <forge>/<project> --status open --json` or `--mine`), drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: assign the trail with `entire trail update <n> --add-assignee <me>` (or set `Status: claimed` in the body) and link/checkout its branch (`entire trail checkout` / `entire trail link`) before starting work.
- **Resolve**: update the trail body with the answer under an `## Answer` heading and close it (`entire trail update <n> --status closed --body "..."`), then append a context pointer (gist + trail reference) to the map trail's Decisions-so-far via `entire trail update <map> --body "..."`.
