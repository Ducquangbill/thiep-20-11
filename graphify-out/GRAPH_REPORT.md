# Graph Report - 20-11  (2026-11-19)

## Corpus Check
- 19 files · ~25,939 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 285 nodes · 446 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e08f725c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.test.js
- EntirePlugin
- entireSetup
- buildShareUrl
- with
- UI/UX Design — thiep-20-11 (Impeccable, Experience mode)
- ComposerController
- AGENTS.md
- package.json
- Domain Docs
- Issue tracker: Entire (`entire trail`)
- PetalController
- triage-labels.md
- DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11)
- Product
- 3. Deployment
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `entireSetup()` - 25 edges
2. `EntirePlugin()` - 17 edges
3. `ComposerController` - 17 edges
4. `handleEvent()` - 16 edges
5. `EnvelopeController` - 16 edges
6. `PetalController` - 14 edges
7. `initApp()` - 14 edges
8. `DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11)` - 13 edges
9. `UI/UX Design — thiep-20-11 (Impeccable, Experience mode)` - 12 edges
10. ``app.js` module exports (ESM; importable in Node and browser)` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Edge & environment states` --references--> `decodeValue()`  [INFERRED]
  docs/thiep-20-11/design.md → app.js
- ``resolveParams(searchString) -> { to, msg, from }`` --references--> `decodeValue()`  [INFERRED]
  docs/thiep-20-11/spec.md → app.js
- ``shouldAutoOpenComposer(searchString) -> boolean`` --references--> `resolveParams()`  [INFERRED]
  docs/thiep-20-11/spec.md → app.js
- ``buildShareUrl(baseUrl, { to, msg, from }) -> string`` --references--> `decodeValue()`  [INFERRED]
  docs/thiep-20-11/spec.md → app.js
- ``class EnvelopeController`` --references--> `nextState()`  [INFERRED]
  docs/thiep-20-11/spec.md → app.js

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 0 - "app.test.js"
Cohesion: 0.09
Nodes (27): decodeValue(), DEFAULTS, EnvelopeController, FIELDS, init, initApp(), MAX_FIELD_LEN, MAX_LEN (+19 more)

### Community 1 - "EntirePlugin"
Cohesion: 0.14
Nodes (19): EntirePlugin(), announcedKey(), announceTask(), backgroundSessionAborted(), callHook(), callHookSync(), callKey(), drainBackgroundTasks() (+11 more)

### Community 2 - "entireSetup"
Cohesion: 0.20
Nodes (25): entireSetup(), announceTask(), callKey(), classify(), drainBackgroundTasks(), endSession(), endSessions(), endTurn() (+17 more)

### Community 3 - "buildShareUrl"
Cohesion: 0.09
Nodes (22): buildShareUrl(), Business Need & Goal, Business Rules, Edge Cases & Contradictions, Functional Requirements & Acceptance Criteria, Non-Functional Requirements (NFRs), Open Questions, Requirements — thiep-20-11 (+14 more)

### Community 4 - "with"
Cohesion: 0.07
Nodes (31): jobs, package, test, node, name, on, pull_request, push (+23 more)

### Community 5 - "UI/UX Design — thiep-20-11 (Impeccable, Experience mode)"
Cohesion: 0.08
Nodes (24): Card ornaments (lotus & chrysanthemum filigree), Components & Tokens, Composer — Quick Card Composer & Share Link, Content defaults (BR-2 fallback, final copy), Craft-floor compliance checklist, CSS variables (`:root` — single source of truth), Drawer `#composer-panel`, Edge & environment states (+16 more)

### Community 6 - "ComposerController"
Cohesion: 0.17
Nodes (11): ComposerController, `app.js` module exports (ESM; importable in Node and browser), `buildShareUrl(baseUrl, { to, msg, from }) -> string`, `class ComposerController`, `class EnvelopeController`, `decodeValue(raw) -> string`, `nextState(state) -> string`, `prefersReducedMotion() -> boolean` (+3 more)

### Community 7 - "AGENTS.md"
Cohesion: 0.22
Nodes (8): Agent skills, Core Rules, Domain docs, Execution Model, graphify, Intent → Skill Mapping, Issue tracker, Triage labels

### Community 8 - "package.json"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, start, test, type, version

### Community 9 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 10 - "Issue tracker: Entire (`entire trail`)"
Cohesion: 0.33
Nodes (5): Conventions, Issue tracker: Entire (`entire trail`), Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 11 - "PetalController"
Cohesion: 0.27
Nodes (4): PetalController, Thế giới thị giác, Accessibility & Usability Checks, `class PetalController`

### Community 13 - "DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11)"
Cohesion: 0.15
Nodes (12): Bề mặt trình duyệt, Bố cục, Chuỗi mở 3 giai đoạn (chỉ khi `no-preference`), Chữ, Composer (tạo thiệp & chia sẻ), Cánh hoa, DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11), Ranh giới (craft floor) (+4 more)

### Community 14 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 15 - "3. Deployment"
Cohesion: 0.14
Nodes (13): 1. Local preview, 2. URL personalization, 3. Deployment, 4. Monitoring, 5. Rollback, 6. Project closure, Cloudflare Pages, GitHub Pages (+5 more)

### Community 16 - "vercel.json"
Cohesion: 0.40
Nodes (4): cleanUrls, headers, $schema, trailingSlash

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UI/UX Design — thiep-20-11 (Impeccable, Experience mode)` connect `UI/UX Design — thiep-20-11 (Impeccable, Experience mode)` to `PetalController`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ComposerController` (e.g. with ``init() -> void`` and `Module & File Plan`) actually correct?**
  _`ComposerController` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `app.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09408033826638477 - nodes in this community are weakly interconnected._
- **Why does `PetalController` connect `PetalController` to `app.test.js`, `buildShareUrl`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `EnvelopeController` (e.g. with ``class ComposerController`` and ``init() -> void``) actually correct?**
  _`EnvelopeController` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `EntirePlugin` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._
- **Why does `Thế giới thị giác` connect `PetalController` to `DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11)`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._