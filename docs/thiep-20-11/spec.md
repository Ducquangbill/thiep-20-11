# Technical Specification — thiep-20-11

## Architecture Overview & Tech Stack

Static single-page greeting card, zero build step, zero runtime dependencies. Vanilla HTML5 + CSS3 + ES Modules: `index.html`, `styles.css`, `app.js`. Production serves three static files directly (any static host / `file://`). Tests run on Node's built-in runner (`node --test`) with zero npm packages; a single `package.json` exists only to set `"type": "module"` so Node parses `app.js` as ESM.

Greenfield repo (no existing components). No frameworks, no libraries, no bundler, no widgets. `app.js` is the only JS; it parses URL params, owns the envelope state machine, and drives the petal canvas. All logic lives in pure exported functions or injectable controllers so `tests/app.test.js` verifies behavior without a browser or DOM.

## Non-Functional Requirements (NFRs)

- Performance/Scalability:
  - Open/petal animation targets ≥ 55fps (no > 200ms frame drop on average hardware). All animated transforms use GPU-only `transform`/`opacity`; no layout-changing property animates per frame.
  - Petal canvas is one full-screen `<canvas>` with `requestAnimationFrame` loop and device-pixel-ratio-aware sizing set once per resize (not per frame).
  - Total static payload (HTML + CSS + JS, gzip, excluding fonts) ≤ 200KB. Fonts (`Playfair Display` + `Be Vietnam Pro`, `vietnamese` subset, `woff2`) ≈ 60–80KB. Envelope visible within ≤ 2s on 4G; first paint is pure HTML/CSS (< 1s), JS only enhances.
  - Single page, no network calls after load.
- Security/Auth:
  - No auth, no backend, no storage. Trust boundary = URL query string (untrusted input).
  - Only `to`, `msg`, `from` params are read; all other names ignored (BR-1).
  - Every dynamic value inserted via `textContent` only. `innerHTML`/`insertAdjacentHTML`/`outerHTML` are forbidden anywhere in `app.js` (BR-3, NFR-7).
  - Share URLs are generated exclusively via `URLSearchParams` (`buildShareUrl`); user text flows into `URLSearchParams`/`.value`/`textContent`, never into markup. `#share-url` is `type="text" readonly` — display + copy only, never navigable, never executes.
  - Per-param decode wrapped in `try/catch`; malformed `%` never crashes the page (edge case).
- Reliability/Concurrency:
  - Envelope transition is gated by a lock: while `opening`/`closing`, clicks and key presses are ignored (no double toggle, no duplicate petal emitter).
  - State is a two-value machine (`closed` ⇄ `open`); petal loop and card visibility derive from state, never from animation completion. Card text is in the DOM from first paint, so content shows even if transitions fail (weak device, no GPU).
  - rAF loop guards against double-start (`start()` is idempotent when running) and always restores cancelled frame state on `stop()`.
  - Reduced-motion: `matchMedia('(prefers-reduced-motion: reduce)')` disables the petal emitter entirely and collapses the transition to a short crossfade.

## Data Model / Schema Changes

No database, no persistence. Single in-memory content model:

```js
// Resolved card content (pure object, no DOM)
{ to: string, msg: string, from: string }
```

Constants in `app.js`:
- `MAX_FIELD_LEN = 120`
- `PETAL_COUNT = 30` (clamped to `[10, 40]` at runtime)
- `DEFAULTS = { to, msg, from }` (exact Vietnamese copy below)

Migration / Backfill: `none`

## API / Interface Contracts

### `app.js` module exports (ESM; importable in Node and browser)

Top-level has **no** DOM access. Browser self-init is guarded so Node import is side-effect free.

```js
export const MAX_FIELD_LEN = 120;
export const PETAL_MIN = 10;
export const PETAL_MAX = 40;
export const PETAL_COUNT = 30;
export const DEFAULTS = {
  to:   "Thầy/Cô của em",
  msg:  "Kính chúc Thầy/Cô luôn dồi dào sức khỏe, tràn đầy niềm vui và hạnh phúc. Cảm ơn Thầy/Cô vì tất cả những điều tốt đẹp đã dành cho chúng em.",
  from: "Người học trò của bạn",
};
```

#### `decodeValue(raw) -> string`
- Input: `raw: string` (raw substring after `=`, un-decoded).
- Output: `decodeURIComponent(raw.replace(/\+/g, " "))`; on any `URIError` returns `raw` unchanged (no partial decode).
- `+` decodes to a space before percent-decoding, so standard query strings (`?to=Co+Lan`) read as `"Co Lan"`. Gate-1 approved decision; tests assert it.

#### `truncate(value, max = MAX_FIELD_LEN) -> string`
- `value.length <= max`: return `value` unchanged.
- Else: return `value.slice(0, max - 1) + "…"`. Guarantees returned length ≤ 120, `…` included (BR-1, FR-2).

#### `resolveParams(searchString) -> { to, msg, from }`
- Input: `searchString: string` (raw `location.search` value, leading `?` optional).
- Parses pairs manually (splits on `&`, then first `=`), keeping the **raw** value so `decodeValue` controls decoding.
- Field rules (per field, independently):
  - Key not present, value `null`, or value `""` → `DEFAULTS[field]`.
  - Otherwise → `truncate(decodeValue(rawValue))`.
- Only `to`/`msg`/`from` keys are consumed; unknown keys (`recipient`, etc.) ignored entirely.
- Output: `{ to, msg, from }`, all strings, never `undefined`/`null`.

#### `nextState(state) -> string`
- `"closed"` → `"open"`; `"open"` → `"closed"`.
- Any other input → `throw new TypeError('unknown envelope state: <state>')`.

#### `prefersReducedMotion() -> boolean`
- `typeof window !== "undefined" && window.matchMedia` → `matchMedia("(prefers-reduced-motion: reduce)").matches`; else `false`.

#### `class EnvelopeController`
- `constructor(root, { reducedMotion = false, transitionMs } = {})`
  - `root`: `<main id="card-scene">` element.
  - `transitionMs` defaults: `reducedMotion ? 200 : 900` (matches `opening` choreography window; lock timer only, transitions driven by CSS).
- Properties/state: `get state()` → `"closed" | "open"`; internal `_locked: boolean`.
- `toggle()`: no-op while `_locked`; flips via `nextState`, sets `_locked = true`, applies state to DOM, schedules unlock after `transitionMs`.
- `open()` / `close()`: targeted transitions (same lock semantics).
- DOM side effects on state change (all via class/toggle/`textContent`, never `innerHTML`):
  - `root.dataset.state = state` (sets `data-state`).
  - Set `envelope.aria-expanded` → `"true"`/`"false"`.
  - Write live region `statusLive.textContent` once: `"Thiệp đã mở"` (open) / `"Đã đóng thiệp"` (close).
- No petal logic inside; it emits a callback `onStateChange(state)` so `init()` wires `PetalController.start()/stop()`.

#### `class PetalController`
- `constructor(canvas, { reducedMotion = false, count = PETAL_COUNT, min = PETAL_MIN, max = PETAL_MAX } = {})`
  - `canvas`: `HTMLCanvasElement`; any object exposing `getContext('2d')`, `width`, `height` works (testable with a stub).
  - `count` clamped to `[min, max]`. If `reducedMotion === true`, `count = 0`.
- `start()`: no-op if `reducedMotion` or already running; seeds `count` petals (spawn from top edge, random `x` across full width), starts single `requestAnimationFrame` loop.
- `stop()`: stops new spawns, fades existing petals (`opacity -= dt * fadeRate`) over ≤ 1s, cancels rAF when no petals remain. Idempotent.
- `loop(timestamp)`: computes `dt` from previous frame (clamped, to avoid big jumps), updates each petal (`y += speed * dt`, `x += sin(phase) * swayAmp`, `rotation += rotationSpeed * dt`), removes petals past bottom/`opacity <= 0`, redraws, schedules next frame.
- Petal state per instance: `{ x, y, size, swayAmp, swayFreq, phase, speed, rotation, rotationSpeed, opacity }`; rendered as `bezierCurveTo()` notched blossom petal.
- `start()`/`stop()` return `this` for chaining.

#### `buildShareUrl(baseUrl, { to, msg, from }) -> string`
- Input: `baseUrl: string` (clean origin + pathname, e.g. `location.origin + location.pathname`); `to`, `msg`, `from`: strings (may be empty/`undefined`).
- Normalizes `baseUrl`: `String(baseUrl ?? "").split("?")[0].split("#")[0]` — existing query/fragment stripped.
- Per field: `const v = String(field ?? "").trim();` — empty after trim → omitted from the URL; otherwise `params.set(key, v)`.
- `const qs = params.toString();` (a shared `URLSearchParams`). Returns `qs ? `${base}?${qs}` : base`.
- Encoding contract (BR-7): `URLSearchParams` turns spaces into `+` and Vietnamese diacritics/special chars into percent-escapes — exactly inverse of `decodeValue` (`+`→space before `decodeURIComponent`), so `resolveParams(buildShareUrl(...))` round-trips losslessly.
- Pure, no DOM, no `location` access; testable in Node.

#### `shouldAutoOpenComposer(searchString) -> boolean`
- Input: `searchString: string` (raw `location.search` value, leading `?` optional).
- Output: `true` iff the `compose` param is present with exact value `"1"` (first occurrence); any other value (`"true"`, `"0"`, absent) → `false`.
- `const p = new URLSearchParams(String(searchString ?? "")); return p.get("compose") === "1";` — `URLSearchParams` tolerates a leading `?`.
- Independent of `resolveParams`: `compose` never enters the three card fields (BR-1).

#### `class ComposerController`
- `constructor(doc, win, envelope, { max = MAX_FIELD_LEN } = {})`
  - `doc`: document-like; elements resolved by id — `#composer-panel`, `#open-composer`, `#close-composer`, `#input-to|msg|from`, `#count-to|msg|from`, `#share-url`, `#copy-link`, `#preview-card`, `#composer-status`, `#card-to|msg|from`, `#card-scene`.
  - `win`: window-like (`location`, `history`, `navigator`); `envelope`: `EnvelopeController` — `preview()` calls its `open()`.
  - `max`: field cap used by counters and share-URL truncation (`120`).
- State: getter `isOpen` (internal flag); `#composer-panel.hidden` mirrors it.
- `open()` / `close()` / `toggle()`: idempotent. `open()` reveals the panel, sets `aria-expanded="true"` on `#open-composer`, marks `#card-scene` and `#open-composer` `inert` (`inert = true` plus the `inert` attribute) so assistive tech cannot traverse behind the modal, then focuses `#input-to`. `close()` hides the panel, clears `inert` on both elements, sets `aria-expanded="false"`, then focuses `#open-composer` — inert is cleared before focus returns.
- Constructor binds `#open-composer` click → `toggle()`; `#close-composer` → `close()`; panel click where `event.target === #composer-panel` → `close()`; `input` on the three fields → `sync()`; `#copy-link` → `copy()`; `#preview-card` → `preview()`.
- Keyboard (capture phase on `document`, only while open): `Escape` closes the composer and calls `stopImmediatePropagation()` so the greeting card underneath stays open; `Tab` / `Shift+Tab` wrap focus across `#close-composer`, `#input-to`, `#input-msg`, `#input-from`, `#share-url`, `#copy-link`, `#preview-card` (`_wrapFocus`), so keyboard focus cannot leave the modal. Mid-list Tab is left to the browser.
- `sync()` → reads the three inputs (raw values), writes `#count-*` = `` `${value.length}/120` `` with `.is-limit` toggled at `>= 120`, and `#share-url.value = buildShareUrl(baseUrl(), fields)`; returns the raw values.
- `baseUrl()` → `origin + pathname`; falls back to `href`.
- `copy()` (async) → clipboard write, else `#share-url.select()` + `document.execCommand("copy")` in `try/catch`; `#composer-status` announces `"Đã sao chép link thiệp vào bộ nhớ tạm"` or the manual-copy message; returns a boolean.
- `preview()` → `sync()`, resolve blank fields to `DEFAULTS` (non-blank truncated to 120 + `…`), write `#card-to|msg|from` via `textContent`, `history.replaceState` inside `try/catch`, `close()`, `envelope.open()`; returns the resolved content.

#### `init() -> void`
- Browser-only. Reads `location.search`, calls `resolveParams`, writes the three card slots via `textContent` (labels are static in HTML; only `#card-to`, `#card-msg`, `#card-from` values are dynamic).
- Instantiates `EnvelopeController` and `PetalController`, wires `onStateChange` → petal `start`/`stop`, binds control events.
- Instantiates `ComposerController(doc, win, envelopeController)` (only meaningful when `#composer-panel` exists) and auto-opens when `shouldAutoOpenComposer(win?.location?.search ?? "")` is `true`; `compose` is never read by `resolveParams`, so it never leaks into card content.
- Two `keydown` paths, composer first: `ComposerController` listens on `document` in **capture** phase and consumes `Escape` (closing the composer and calling `stopImmediatePropagation()`) while it is open; `initApp` adds the bubble-phase fallback `if (event.key === "Escape" && controller.state === "open") controller.close()`.
- Composer Tab handling lives in the same capture listener: focus is wrapped inside the dialog while open, and `#card-scene` / `#open-composer` carry `inert` so browse-mode assistive tech stays out of the background.
- Called by bottom-of-file guard:
  ```js
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
  ```

## DOM Contracts

Static markup (authoring-time, in `index.html`) is fixed. JS only toggles the attributes listed below and fills three text slots.

### IDs

| ID | Element | Role / notes |
|---|---|---|
| `card-scene` | `<main>` | scene root; carries `data-state` |
| `petal-canvas` | `<canvas>` | full-viewport, fixed, z-index `0` |
| `envelope` | `<button type="button">` | whole envelope is one control |
| `greeting-card` | `<article>` | semantic card, `hidden` initially |
| `card-to` | `<span>` | recipient value (dynamic) |
| `card-msg` | `<p>` | message value (dynamic) |
| `card-from` | `<span>` | sender value (dynamic) |
| `close-card` | `<button type="button">` | closes envelope (FR-1) |
| `status-live` | `<div>` | `aria-live="polite"` status region |
| `open-composer` | `<button type="button">` | floating pill "Tạo thiệp mới" (FR-6) |
| `composer-panel` | `<div>` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="composer-title"`, `hidden` initially; solid scrim, no blur (craft-floor ban) |
| `composer-title` | `<h2>` | dialog title (labelledby target) |
| `close-composer` | `<button type="button">` | closes drawer, label "Đóng" |
| `input-to` | `<input type="text" maxlength="120">` | recipient |
| `input-msg` | `<textarea maxlength="120" rows="3">` | message |
| `input-from` | `<input type="text" maxlength="120">` | sender |
| `count-to` / `count-msg` / `count-from` | `<span>` | live `0/120`, `.is-limit` at 120, referenced by each field's `aria-describedby` |
| `share-url` | `<input type="text" readonly>` | generated URL, always copyable |
| `copy-link` | `<button type="button">` | CTA "Sao chép link gửi tặng" |
| `preview-card` | `<button type="button">` | CTA "Xem thử thiệp" (applies + opens) |
| `composer-status` | `<div>` | `aria-live="polite"` status region |

### Classes / structure (semantic skeleton)

```html
<body>
  <canvas id="petal-canvas" aria-hidden="true"></canvas>
  <main id="card-scene" data-state="closed">
    <button id="envelope" type="button" aria-expanded="false"
            aria-label="Mở thiệp chúc mừng 20/11">
      <span class="envelope-back" aria-hidden="true"></span>
      <span class="envelope-letter-preview" aria-hidden="true"></span>
      <span class="envelope-pocket envelope-pocket--l" aria-hidden="true"></span>
      <span class="envelope-pocket envelope-pocket--r" aria-hidden="true"></span>
      <span class="envelope-flap" aria-hidden="true"></span>
      <span class="envelope-seal" aria-hidden="true">
        <span class="envelope-ribbon"></span>
        <span class="seal-label">20/11</span>
        <span class="seal-glint"></span>
      </span>
    </button>
    <p class="prompt">Chạm để mở thiệp</p>
    <noscript>Thiệp cần JavaScript để mở — vui lòng bật JavaScript.</noscript>

    <article id="greeting-card" class="greeting-card" hidden>
      <header class="card-head">
        <span class="card-badge" aria-hidden="true">20 • 11</span>
        <h1 class="card-title">Tri Ân Thầy Cô</h1>
      </header>
      <p class="card-recipient">Gửi:&nbsp;<span id="card-to"></span></p>
      <p id="card-msg" class="card-message"></p>
      <p class="card-sender">Từ:&nbsp;<span id="card-from"></span></p>
      <button id="close-card" type="button" class="card-close">Đóng lại</button>
    </article>
  </main>

  <button id="open-composer" type="button" class="floating-composer">Tạo thiệp mới</button>

  <div id="composer-panel" class="composer-panel"
           role="dialog" aria-modal="true" aria-labelledby="composer-title" hidden>
    <h2 id="composer-title" class="composer-title">Tạo thiệp mới</h2>
    <button id="close-composer" type="button" class="composer-close">Đóng</button>

    <label for="input-to">Người nhận</label>
    <input id="input-to" type="text" maxlength="120" aria-describedby="count-to" placeholder="Kính tặng Cô Nguyễn Thị Lan" />
    <span id="count-to" class="composer-counter">0/120</span>

    <label for="input-msg">Lời chúc 20/11</label>
    <textarea id="input-msg" maxlength="120" rows="3" aria-describedby="count-msg"></textarea>
    <span id="count-msg" class="composer-counter">0/120</span>

    <label for="input-from">Người gửi</label>
    <input id="input-from" type="text" maxlength="120" aria-describedby="count-from" placeholder="Tập thể lớp 12A1" />
    <span id="count-from" class="composer-counter">0/120</span>

    <label for="share-url">Link chia sẻ</label>
    <input id="share-url" type="text" readonly class="composer-share" />

    <button id="copy-link" type="button" class="composer-primary">Sao chép link gửi tặng</button>
    <button id="preview-card" type="button" class="composer-secondary">Xem thử thiệp</button>
    <div id="composer-status" class="sr-only" aria-live="polite"></div>
  </div>

  <div id="status-live" class="sr-only" aria-live="polite"></div>
  <script type="module" src="./app.js"></script>
</body>
```

Ornaments (floral corners) are CSS `::before`/`::after` inline SVG backgrounds on `.greeting-card`. No image files.

### ARIA & keyboard

- Envelope: real `<button type="button">` → native Enter/Space activation (FR-5), no `tabindex`/`role` needed. `aria-expanded` reflects state. `aria-label` as above.
- Close control: real `<button type="button">`, default label "Đóng lại".
- `Escape` key (on `document`) branches composer-first: drawer open → close drawer only (never the card behind it); else with `data-state="open"` → close envelope.
- Composer: `role="dialog"` + `aria-modal="true"` + `aria-labelledby="composer-title"`; every field has an explicit `<label for>`; drawer open moves focus to `#input-to`, close returns it to `#open-composer`; each field's `aria-describedby` points at its counter (`#count-to/msg/from`, live `0/120`, `.is-limit` at 120 — not `aria-hidden`, so screen readers announce it); `#composer-status` `aria-live="polite"`; `#share-url` `readonly`.
- `#petal-canvas` and all decorative spans: `aria-hidden="true"`.
- `#status-live`: `aria-live="polite"`, visually hidden via `.sr-only` (not `display:none`).
- `:focus-visible` outline 3px `--color-focus` (#7A1C24), offset 3–4px, plus a 6px gold halo, on every control.

### State attribute

`data-state="closed" | "open"` on `#card-scene` is the single CSS driver:
- `closed`: envelope + prompt visible; card `hidden`; petals stopped.
- `open`: envelope hidden (`display:none` after transition), card shown, petals running.
- CSS also defines an `opening`/`closing` visual stage via transitions (`--dur-open-flap`, `--dur-open-letter`, `--delay-letter`); these are CSS-only timing, not JS state.

### Composer visibility state

Composer has its own orthogonal state, independent of `data-state`: `#composer-panel`'s `hidden` attribute (single source of truth — `ComposerController.isOpen()`). The pill `#open-composer` sits above the scene at `z-index: var(--z-composer)` on every card state; the drawer only changes its own `hidden`, never `#card-scene`'s `data-state`.

## Module & File Plan

- `index.html` — create — semantic skeleton, all default Vietnamese text pre-rendered, composer trigger + dialog, module script tag.
- `styles.css` — create — `:root` tokens, envelope 3D, card, composer panel, canvas, breakpoints, reduced-motion overrides.
- `app.js` — create — constants, pure funcs, `EnvelopeController`, `PetalController`, `ComposerController`, `buildShareUrl`, `shouldAutoOpenComposer`, `init`, guard.
- `tests/app.test.js` — create — `node --test` unit tests for pure funcs + controller logic with stubs.
- `package.json` — create — `{ "type": "module", "scripts": { "test": "node --test" } }`, zero dependencies.

## Technical Risks & Rollout Notes

- `decodeValue` converts `+` to a space before decoding; `?msg=a+b` renders as `a b`. Malformed escapes (`%zz`, `%E0%A4%A`) return the raw substring for that field, never a crash. Tester must assert both behaviors.
- Server settings: static host must serve `.html`/`.css`/`.js` with `Content-Type: text/html|text/css|text/javascript` and `charset=utf-8`; `index.html` must carry `<meta charset="utf-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` (NFR-5 diacritics, NFR-1).
- `file://` protocol works for all features except Google Fonts are fetched over https (fallback to Noto Serif/system serif still renders diacritics).
- `node --test` requires Node ≥ 20 (stable built-in runner). No dev dependency to install.
- Envelope uses CSS 3D (`perspective`, `rotateX`); Safari iOS ancient versions lacking 3D degrade to the reduced-motion crossfade — card text stays reachable (weak-device edge).
- `buildShareUrl` round-trip must be asserted: `resolveParams(buildShareUrl("", { to: "Cô Lan", msg: "Chúc mừng" }))` reproduces the exact strings (spaces ↔ `+`, diacritics ↔ `%`-escapes). Tester covers empty-after-trim omission and the all-empty → bare base case (BR-7).
- Clipboard: `navigator.clipboard` exists only in secure contexts (https/localhost); on `file://`/http it throws/is undefined → fallback `#share-url.select()` + `document.execCommand("copy")`. Tester must cover the no-clipboard path (`FR-6`, `#composer-status` still announces).
- Composer dialog keeps focus inside: `Tab`/`Shift+Tab` wrap across its controls (`_wrapFocus`), and `#card-scene` + `#open-composer` are `inert` while it is open so browse-mode assistive tech cannot reach the page behind the modal. Inert is cleared before focus returns to `#open-composer`.
- `history.replaceState` is same-origin, no navigation, but can throw in sandboxed frames → wrapped in `try/catch` so preview still works.
- `?compose=1` is read only for auto-open; `resolveParams` ignores it, so it never contaminates `#card-to`/`#card-msg`/`#card-from`. Tester asserts a `compose` param alone still renders the default card.