## Agent skills

### Issue tracker

Issues and specs are tracked via the Entire CLI (`entire trail`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical triage role strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at the repo root). See `docs/agents/domain.md`.

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are installed in `~/.agents/skills/<skill-name>/SKILL.md` (and repo-local `.opencode/skills/<skill-name>/SKILL.md` or `.agents/skills/<skill-name>/SKILL.md`).
- Read `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, and `docs/agents/triage-labels.md` when a skill interacts with domain docs or the issue tracker (`entire trail`).
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, ticket breakdown, or test-first cycles when a skill demands them.

## Intent → Skill Mapping

Map the user's intent to the matching Matt Pocock skill automatically:

- Feature / new functionality → `to-spec` (or `grill-me` / `grill-with-docs` to clarify first), then `to-tickets`, `implement` (or `implement-spec`), and `tdd`
- Planning / breakdown / wayfinding → `to-tickets` or `wayfinder`
- Ambiguous idea / stress-testing a plan → `grilling` (or `grill-me`, `grill-with-docs`, `to-questionnaire`)
- Bug / failure / unexpected behavior → `diagnosing-bugs`
- Issue triage → `triage`
- Code review → `ocr-review`
- Refactoring / architecture / simplification → `improve-codebase-architecture` and `codebase-design`
- API, module interface, or domain design → `codebase-design` and `domain-modeling`
- UI work / state-model exploration → `prototype`
- Deep docs / primary-source investigation → `research`
- Pull request description / session handoff → `pr` / `handoff`

## Execution Model

For every request:

1. Determine if any skill applies (even a small chance).
2. Load the skill with `skill({ id: "<skill-name>" })` (or read its `SKILL.md` if not directly registered in the tool catalog).
3. Follow the skill workflow exactly.
4. Only proceed to implementation once required steps are complete.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

