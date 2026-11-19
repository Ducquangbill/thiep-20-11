# UI/UX Design — thiep-20-11 (Impeccable, Experience mode)

Static single-page greeting card (Vietnamese Teachers' Day 20/11). Pure HTML/CSS/JS, zero build, zero dependencies. Native platform only — no widget libraries, no animation library (CSS transitions + one `<canvas>` rAF loop cover everything).

**Motion thesis:** one authored focal sequence — breaking a lacquer-and-wax seal on a hand-made giấy dó envelope — repeated use never cheapens it because replay is user-initiated, not ambient. Petals are the only loop; they stop on close, on `stop()`, and never run under reduced motion.

**Delight thesis:** the user should feel they are opening a real physical thiệp, not a webpage — earned by material behavior (paper grain, wax seal, letter pull), not by whimsy.

## Target User & UX Flow

**Users:** (a) *người tặng* — opens link, personalizes via URL params, replays the opening to present to others; (b) *người nhận* — opens a shared link on a phone, reads the greeting immediately, no scrolling to find content.

**Flow (≤4 steps):**

1. **Land (Closed)** — full-viewport scene, 3D envelope centered on textured cream paper, wax-seal medallion "20/11", prompt "Chạm để mở thiệp". Card content (`to`/`msg`/`from`) resolved from URL at first paint.
2. **Open** — tap / `Enter` / `Space` on envelope → 3-stage choreography (≤900ms, see Motion section): seal lifts, flap rotates `rotateX(180deg)`, letter draws out and settles forward, staggered typography reveal, petals begin falling.
3. **Read (Opened)** — full greeting card: botanical medallion "20 • 11", heading, recipient, message, sender, filigree corners, "Đóng lại" button; `Escape` also closes.
4. **Replay / Close** — close → petals fade ≤1s, envelope returns to closed state, fully repeatable.

Nothing else exists. One screen, two primary states (`closed` / `open`); `opening`/`closing` are CSS-only visual stages.

## Visual World & Materiality

Warm hand-made paper world: giấy dó (cotton paper) texture, warm directional light, soft offset shadows — nothing flat, nothing neon.

### Paper texture & lighting

- **Grain:** one inline SVG `feTurbulence` noise tile as a `data:` URI background layer (fractalNoise, `baseFrequency="0.9"`, `numOctaves="2"`, opacity ≈ 0.035 dark / 0.05 warm-light), applied to `body` and `.greeting-card` as the top background layer. No image files, ≈ 400 bytes.
- **Directional light:** warm radial-gradient from top-left on `body` (`radial-gradient(120% 90% at 18% 8%, rgba(255,248,230,0.9), transparent 60%)` over `--color-paper`) — the scene reads as lit paper, not a painted flat.
- **Shadows (craft-floor: offset + soft blur, always):**

```css
--shadow-envelope: 0 18px 40px -12px rgb(74 18 27 / 0.35), 0 4px 10px rgb(74 18 27 / 0.18);
--shadow-card:     0 24px 60px -16px rgb(74 18 27 / 0.30), 0 6px 16px rgb(74 18 27 / 0.14);
--shadow-letter:   0 10px 24px -8px rgb(74 18 27 / 0.25);
```

### Wax seal "20/11" (envelope flap)

Built entirely in CSS on `.envelope-seal` (keeps spec skeleton: `<span class="envelope-seal" aria-hidden="true">20/11</span>`):

- **Disc:** radial-gradient lacquer red (`--color-burgundy` → `--color-burgundy-deep` edge), 56px circle, `border-radius: 50%`.
- **Multi-ring metallic rim:** 3 concentric `box-shadow` rings — `inset 0 0 0 2px var(--color-gold)`, `inset 0 0 0 4px rgb(201 162 39 / 0.45)`, `0 0 0 1px rgb(201 162 39 / 0.7)` outer hairline.
- **Inner relief highlight:** `inset 0 2px 3px rgb(255 248 230 / 0.35)` top light + `inset 0 -3px 5px rgb(0 0 0 / 0.35)` bottom shade — embossed wax look.
- **Label:** "20/11" in `--color-gold-soft`, `font-variant-numeric: tabular-nums`, letterspaced 0.08em.
- **Specular glint:** `::after` — a small rotated white gradient streak (`linear-gradient(120deg, transparent, rgba(255,255,255,0.5), transparent)`, `mix-blend-mode: screen`), animated once during Stage 1 (opacity 0 → 1 → 0), never looping.
- **Hover rule (animate.md):** the button never moves itself — `#envelope:hover .envelope-seal { transform: translateY(-1px) rotate(-2deg) }` + seal shadow deepens; ribbon folds = two static gradient folds on the seal's `::before` that shift `background-position` 2px on hover. Hit box of `#envelope` unchanged.

### Card ornaments (lotus & chrysanthemum filigree)

All inline SVG as `data:` URI backgrounds on `.greeting-card` `::before`/`::after` (spec: no image files):

- **Corner filigree:** one authored SVG motif — stylized lotus bud + chrysanthemum rosette with curling stem, single-weight strokes (`stroke: var(--color-terracotta)`, accent buds `var(--color-gold)`), ~28×28 viewBox, drawn in 4 mirror variants (lx/rx/ly/ry) as 4 background layers at the 4 corners, ~18px inset.
- **Double-hairline inner frame:** `::after` — `inset: 10px; border: 1px solid rgb(184 92 56 / 0.55); box-shadow: inset 0 0 0 3px var(--color-card), inset 0 0 0 4px rgb(201 162 39 / 0.4);` → 1px terracotta line + 1px gold hairline separated by 3px card ground.
- **Divider ornament:** small centered chrysanthemum sprig (same SVG family, ~48×12) between message and sender, `background-position: center bottom` of the message block region.
- **Medallion badge ("20 • 11"):** drawn botanical seal — burgundy disc with double gold rim (same ring recipe as wax seal, smaller), "20 • 11" in cream, flanked by two short laurel/filigree strokes. Sits *inside* the drawn ornament, not as a kicker/eyebrow above the heading (craft-floor ban respected).

### Typography rhythm

- `Playfair Display` (display, italic for recipient/sender) + `Be Vietnam Pro` (body), `vietnamese` subset, `woff2`, `display=swap`, ≈ 60–80KB (NFR-3).
- Heading `text-wrap: balance`, `letter-spacing: -0.02em` (floor -0.04em not needed at this size; display never exceeds 6rem), message `text-wrap: pretty`.
- Rhythm: more space above the heading than below it (`margin-top: 1.75rem; margin-bottom: 0.75rem`); tight groups (label+value 0.25rem), generous separation (blocks 1.5rem).
- **Browser surfaces themed (craft-floor):** `::selection { background: var(--color-burgundy); color: var(--color-card) }`; custom scrollbar on the card (`::-webkit-scrollbar` 8px, thumb `rgb(184 92 56 / 0.5)` rounded, track transparent); `caret-color: var(--color-burgundy)`; tabular numerals on all "20/11"/"20 • 11" figures.

## Screens & Information Architecture

- `CardScene` — route: `/` (single page, no routing) — purpose: envelope → greeting reveal, the entire product.
- Query params (only interface): `?to=<recipient>&msg=<message>&from=<sender>` — decoded, truncated at 120 chars with `…`, empty/missing/invalid → Vietnamese default. Only `to`/`msg`/`from` consumed (BR-1).

### Content defaults (BR-2 fallback, final copy)

| Field | Default value |
|---|---|
| Medallion badge | `20 • 11` |
| Occasion heading | `Tri Ân Thầy Cô` |
| `to` | `Thầy/Cô của em` |
| `msg` | `Kính chúc Thầy/Cô luôn dồi dào sức khỏe, tràn đầy niềm vui và hạnh phúc. Cảm ơn Thầy/Cô vì tất cả những điều tốt đẹp đã dành cho chúng em.` |
| `from` | `Người học trò của bạn` |
| Prompt (closed) | `Chạm để mở thiệp` |
| Close button | `Đóng lại` |

> **Spec deltas to sync in `spec.md` (2 lines only):** `<span class="card-badge">20/11</span>` → `<span class="card-badge">20 • 11</span>` (drawn medallion); `<h1 class="card-title">Chào mừng Ngày Nhà giáo Việt Nam 20/11</h1>` → `<h1 class="card-title">Tri Ân Thầy Cô</h1>`. All IDs, attributes, ARIA, and business rules unchanged. Reason: `card-badge` above the heading is a kicker/eyebrow, which craft-floor bans; the medallion integrates the date inside a drawn ornament instead. Occasion context remains carried by the medallion + full message copy.

## Layout & Hierarchy

**Mobile (base, ≥320px) — everything in first viewport (NFR-1):**

```
┌─────────────────────────┐
│ [petal canvas: fixed    │  ← z-index 0, aria-hidden, pointer-events:none
│  full viewport bg]      │
│      ┌───────────┐      │  Envelope (closed): width min(86vw, 340px),
│      │ ENVELOPE  │      │  aspect-ratio 4/2.8, centered ~42vh
│      └───────────┘      │
│    Chạm để mở thiệp     │  ← prompt, 14px, gentle opacity pulse
│ ── when OPEN ──         │
│      ┌───────────┐      │  Card: width min(92vw, 640px), max-height
│   [medallion 20 • 11]   │  92dvh, paper texture, corner filigree,
│    Tri Ân Thầy Cô       │  double-hairline frame
│    Gửi: …               │
│    msg …                │
│    ── sprig divider ──  │
│    Từ: …                │
│    [Đóng lại]           │
└─────────────────────────┘
```

Reading order inside card (semantic): `<header>` medallion + heading → `Gửi:` recipient → message body → sprig divider → `Từ:` sender → close button. Message is the visual anchor: largest body text (18px mobile / 20px desktop), recipient/sender in Playfair italic.

**Desktop (≥1024px):** same centered composition, envelope `min(30vw, 420px)`, card `max-width: 640px`; body measure 65–75ch maintained; petals across full width. No sidebar, no multi-column — vertical centerpiece is the design.

**Scale map (envelope → card):** letter starts sized to the envelope's inner cavity, rises `translateY(-30%)` then the card settles forward `scale(1.15 → 1)` into final size — reads as pulling the letter out of the envelope.

## Composer — Quick Card Composer & Share Link

Người tặng soạn nhiều thiệp không cần tự gõ `+` hay mã hoá URL. Lớp thứ hai của cùng thế giới giấy dó — không rời thiệp chính, không phá chuỗi mở thư.

### Nút nổi `#open-composer`

Pill burgundy (`--color-burgundy`), icon lông ngỗng vẽ SVG nhỏ (cùng ngôn ngữ hoa văn vẽ tay, không emoji) + chữ kem nhạt `--color-gold-soft`, `--radius-pill: 999px`, nhãn 14px "Tạo thiệp mới", neo góc dưới-phải (`inset: auto 16px 16px auto`), `z-index: var(--z-composer)`. Bóng `--shadow-seal` (offset + blur mềm — không bao giờ hard offset). **Nghỉ = lặng lẽ:** opacity 0.92, tĩnh; hover/focus = dâng nhẹ `translateY(-1px)` + bóng sâu hơn, con dấu không đổi. Nhấn = `scale(0.97)` 120ms rồi bật lại. Không đẩy bố cục, không che nội dung thiệp (góc màn hình, nhỏ). Hiện trên mọi trạng thái (`closed`/`open`) — luôn có đường tạo thiệp khác (US-8).

### Drawer `#composer-panel`

Mặt giấy `--color-card` + hạt giấy `--grain`, khung đôi hairline terracotta + vàng (cùng công thức `.greeting-card`), `--radius-card`, bóng `--shadow-card`. Sau lưng drawer: scrim đặc `rgb(58 46 42 / 0.42)` (lớp phủ tối không blur — craft-floor cấm glass), đẩy `#card-scene` vào `inert` khi drawer mở (spec). Trượt lên 24px + fade trong `--dur-composer 240ms` (`--ease-expo`), `transform-origin: bottom right`; đóng ngược lại. Reduced motion: hiện/ẩn tức thời (`opacity` 180ms `--dur-crossfade`), không trượt.

- **Mobile:** full-width `inset-inline: 12px; bottom: 12px`, các trường xếp dọc, hai CTA xếp dọc.
- **Desktop ≥768px:** `min(92vw, 520px)`, neo góc dưới-phải cạnh nút nổi.

### Ô nhập & bộ đếm

- `#input-to`, `#input-from`: `<input type="text">` 1 dòng; `#input-msg`: `<textarea rows="3">`. Cả ba `maxlength="120"`, nền `--color-paper-warm`, viền 1px `--color-terracotta` 55%, `caret-color: var(--color-burgundy)`, focus: viền `--color-focus` + quầng vàng (như nút).
- Tất cả có `<label for>` tường minh (không placeholder-as-label): "Người nhận", "Lời chúc 20/11", "Người gửi".
- Bộ đếm `#count-to`/`#count-msg`/`#count-from`: 12px `--color-ink-muted`, `font-variant-numeric: tabular-nums`, đặt dưới-phải mỗi ô, cập nhật `value.length`/`120` theo `input`, thêm lớp `.is-limit` (burgundy đậm) khi chạm 120; mỗi ô nối `aria-describedby` tới bộ đếm của nó (không `aria-hidden`).

### Link chia sẻ & CTA

- `#share-url`: `<input type="text" readonly>` trong chip viền vàng mảnh `1px rgb(201 162 39 / 0.4)` — luôn chép tay được kể cả khi clipboard bị chặn. Chữ `--color-ink-muted`, `font-variant-numeric: tabular-nums`, không tô đậm.
- `#copy-link` (chính): nền burgundy + chữ kem (≈ 8:1), nhãn "Sao chép link gửi tặng".
- `#preview-card` (phụ): viền vàng mảnh `1px var(--color-gold)` + chữ burgundy trên nền card (chữ ≈ 8:1; viền là điểm nhấn trang trí, không dùng gold làm chữ), nhãn "Xem thử thiệp".
- `#composer-status`: `.sr-only` + `aria-live="polite"` — thông báo "Đã sao chép link thiệp vào bộ nhớ tạm".
- `#close-composer`: nút chữ "Đóng" (không icon emoji/glyph — craft-floor), đặt góc trên-phải drawer.

### Tiêu điểm & bàn phím (drawer)

Mở: tiêu điểm vào `#input-to`. Đóng (`#close-composer` hoặc `Escape`): tiêu điểm về `#open-composer`. `Tab`/`Shift+Tab` quẩn trong drawer (không rơi ra after cảnh): `#card-scene` và `#open-composer` mang `inert` khi drawer mở (spec). `Escape` thuộc về composer khi nó mở (capture phase + `stopImmediatePropagation`) — phong bì phía sau **không** đóng theo (`FR-6`).

## Motion Thesis & Choreography (authored focal sequence)

All stages use natural deceleration `--ease-expo: cubic-bezier(0.16, 1, 0.3, 1)`; total ≤900ms (matches spec lock `transitionMs: 900`); GPU-only properties (`transform`, `opacity`, bounded `filter`/`box-shadow` on isolated elements). Driven by `data-state="closed" → "open"` attribute change on `#card-scene` (CSS transitions with per-element `transition-delay` — no JS timing beyond the lock).

| Stage | Window | Element | Motion |
|---|---|---|---|
| **1 — Unsealing** | 0–350ms | `.envelope-seal` | Lifts `translateY(-2px) scale(1.04)` 350ms; specular glint sweeps once (opacity 0→1→0, 300ms). |
| | 0–500ms | `.envelope-flap` | `rotateX(180deg)`, `transform-origin: top center`, `backface-visibility: hidden` shows flap inner (burgundy-deep); envelope shadow deepens `box-shadow` transition 400ms. |
| **2 — Letter draw** | 200–850ms | `.envelope-letter-preview` | Slides up out of pocket `translateY(-46%)` 650ms, subtle `filter: brightness(1.03)`; letter shadow expands (`--shadow-letter` → `--shadow-card`-like). Backdrop warms: envelope interior gradient shifts `background-position` 400ms. |
| | 250–650ms | `#envelope` (whole) | Fades `opacity → 0` 400ms behind the rising card (pocket stays under letter). |
| **3 — Settle & petals** | 450–850ms | `#greeting-card` | Scales in `scale(0.96) → 1` + opacity 0 → 1, 400ms. |
| | 400–900ms | Card children | Sibling stagger: medallion → heading → recipient → message → sender+divider, `--delay-stagger-base: 400ms`, `--stagger-step: 45ms` (total 180ms cap), each 320ms, `translateY(8px) → 0` + fade. |
| | 450ms → | Petal canvas | First petals enter viewport ≈ 500–700ms (spawned at `y ∈ [-120, -20]`, fall speed tuned so entry matches Stage 3). Runs as ambient loop until close. |

**Multi-toned organic petals (not flat ovals):** each petal is a bezier-drawn blossom silhouette (teardrop body with a notch, drawn once per color to offscreen sprites for perf). Palette per petal: `--color-burgundy`, `--color-terracotta`, `--color-apricot` (`#E3B23C`), `--color-gold-soft`. Per-petal variance: `size` 6–14px, `scaleY(cos(rotation))` for 3D tumble (reuses existing `rotation`/`rotationSpeed` state), depth opacity 0.35–0.85 (smaller = farther = fainter), sway `sin(phase)` × `swayAmp`. No new PetalController state fields — color derives deterministically from `size`/`x` seed. PETAL_COUNT 30, clamped [10, 40] (spec intact).

**Interruption & repeat:** lock ignores clicks/keys during 900ms window (spec); replay is identical every time (US-2); close fades petals ≤1s (BR-5, FR-3); rAF loop idempotent start/stop, restores cancelled frame state (spec).

### Reduced motion (intentional alternative)

`matchMedia('(prefers-reduced-motion: reduce)')`:

- **No 3D, no petals:** seal never lifts, flap never rotates, letter never slides, PetalController `count = 0`.
- **Dignified crossfade:** envelope opacity → 0, card opacity 0 → 1, single `180ms` `opacity` transition (lock `transitionMs: 200` per spec — lock ≥ transition). No scale, no translate, no stagger.
- State change stays unmistakable: card content visible immediately after 180ms; live region announces "Thiệp đã mở" (spec).
- Stagger/petal/glint keyframes all wrapped in `@media (prefers-reduced-motion: no-preference)` so they never exist on the reduced path.

## States (per screen)

### Primary interaction states (BR-4: exactly two: `closed` / `open`)

- **`closed`** — envelope centered, flap down, seal visible. Whole envelope is one control: `<button id="envelope" type="button" aria-expanded="false" aria-label="Mở thiệp chúc mừng 20/11">`. Prompt "Chạm để mở thiệp" visible below, gentle opacity pulse (0.65 → 1, 2.4s ease-in-out infinite, paused under reduced motion). Hover: seal + ribbon folds respond (child-carried, button hit box static — see Wax seal); envelope shadow deepens. Focus: see Accessibility. Spam clicks safe: lock ignores input during transition (spec).
- **`opening`** — CSS-only visual stage, the 3-stage choreography above. `data-state` flips to `open` immediately; all visuals are attribute-driven transitions.
- **`open`** — envelope `display:none` after transition, card shown, petals running. Card content: medallion, heading, recipient, message, divider, sender, "Đóng lại" button.
- **`closing`** — reverse: card fades 250ms, envelope fades back in ≤400ms, petals fade ≤1s (BR-5, FR-3).

### Edge & environment states

- **`empty` (per-field defaults):** missing/empty `to`/`msg`/`from` → exact Vietnamese defaults from table above (BR-2). Never an empty slot — the card is always complete.
- **`loading` (first paint):** zero-JS render — full closed envelope + prompt are pure HTML/CSS, visible <1s (NFR-3). No skeleton needed; the envelope *is* the loading state. JS only enhances (opens animation, petals).
- **`error` (hostile input):** malformed `%`-escape → `decodeValue` returns the raw substring for that field, never a crash (spec); oversized values truncated to 120 chars + `…`. No error UI exists — every input degrades to readable Vietnamese text.
- **`no-permission` / JS-off:** `<noscript>Thiệp cần JavaScript để mở — vui lòng bật JavaScript.</noscript>` below the prompt. Envelope stays visible and inert; card content (`#card-to`/`#card-msg`/`#card-from`) is pre-rendered in HTML with defaults, so the message is still readable in raw DOM and by screen readers.
- **`composer-closed` (default):** only the pill `#open-composer` shows; `#composer-panel` has `hidden`, drawer invisible. A shared link (`?to/msg/from`, no `compose=1`) lands exactly here — pure card, no drawer.
- **`composer-open`:** drawer over the scene, pill hidden (or inert behind), focus in `#input-to`. `?compose=1` or a pill tap is the only way in. `Escape`/`#close-composer` return to `composer-closed` without touching the envelope state.
- **`composer-copy`:** transient success — `#composer-status` announces "Đã sao chép link thiệp vào bộ nhớ tạm"; `#share-url` stays selected/highlighted if clipboard failed, so copy-by-hand remains one `Ctrl/Cmd+C`.
- **`reduced-motion`** — see dedicated section above.

## Components & Tokens

**Reuse:** greenfield repo — no existing components. Everything native.

**New components (plain HTML/CSS/JS, one page):**

| Component | Behavior |
|---|---|
| `Envelope` | 3D CSS construction: `perspective: 900px` on `#envelope`; children per spec skeleton: `.envelope-back`, `.envelope-letter-preview`, `.envelope-pocket--l/--r` (side triangles via `clip-path`), `.envelope-flap` (`transform-origin: top center`, rotates 180°), `.envelope-seal` (wax seal, see above). One click/tap/Enter target. |
| `GreetingCard` | Semantic `<article id="greeting-card">`; 4 content slots filled by JS from params; medallion + filigree corners + hairline frame + divider as inline SVG backgrounds; close `<button>`. |
| `PetalCanvas` | `<canvas id="petal-canvas">` fixed fullscreen, `aria-hidden="true"`, `pointer-events: none`, z-index 0. DPR-aware sizing once per resize (spec). Bezier blossom sprites, multi-toned. |
| `ParamResolver` | ~20-line JS module: read `to/msg/from`, per-param `try decodeURIComponent`, truncate 120 + `…`, `textContent` assignment only (BR-3, NFR-7). |
| `FloatingComposer` (`#open-composer`) | Quiet pill button, bottom-right, opens the drawer; visible on every card state. |
| `ComposerPanel` (`#composer-panel`) | Modal drawer: 3 labelled inputs + counters, readonly `#share-url`, `#copy-link`/`#preview-card` CTAs, `#composer-status`. |

### CSS variables (`:root` — single source of truth)

```css
:root {
  /* Palette — warm paper & deep accents */
  --color-paper:        #FAF5EC;  /* page background (cream) */
  --color-paper-warm:   #F3EADA;  /* envelope body */
  --color-card:         #FFFCF5;  /* greeting card surface */
  --color-burgundy:     #6B1F2A;  /* primary: seal, titles, buttons — 8.2:1 on card */
  --color-burgundy-deep:#4A121B;  /* flap inner, pressed states, selection */
  --color-terracotta:   #B85C38;  /* accents, filigree strokes, petal base */
  --color-gold:         #C9A227;  /* decorative only: rims, hairlines, glint */
  --color-gold-soft:    #E8D9A8;  /* seal label, petal highlight */
  --color-apricot:      #E3B23C;  /* petal accent tone */
  --color-ink:          #3A2E2A;  /* body text on card — 10.5:1 on card */
  --color-ink-muted:    #7A6A5F;  /* sender/prompt text — 5.1:1 on card */

  /* Typography — full Vietnamese diacritics (NFR-5) */
  --font-display: "Playfair Display", "Noto Serif", "Times New Roman", serif;
  --font-body: "Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, sans-serif;

  /* Type scale */
  --text-badge: 0.875rem;   /* 14px medallion "20 • 11", tabular-nums */
  --text-title: 1.75rem;    /* 28px heading (22px ≤400px) */
  --text-body:  1.125rem;   /* 18px message (20px ≥768px) */
  --text-label: 0.875rem;   /* 14px Gửi:/Từ:/prompt */

  /* Space & shape */
  --space-card-pad: 1.5rem;      /* 24px; 2rem ≥768px */
  --radius-card: 16px;
  --radius-envelope: 8px;
  --frame-inset: 10px;           /* double-hairline frame inset */

  /* Shadows — offset + soft blur always (craft-floor) */
  --shadow-envelope: 0 18px 40px -12px rgb(74 18 27 / 0.35), 0 4px 10px rgb(74 18 27 / 0.18);
  --shadow-card:     0 24px 60px -16px rgb(74 18 27 / 0.30), 0 6px 16px rgb(74 18 27 / 0.14);
  --shadow-letter:   0 10px 24px -8px rgb(74 18 27 / 0.25);

  /* Motion — natural deceleration, authored focal sequence */
  --ease-expo:       cubic-bezier(0.16, 1, 0.3, 1);
  --dur-seal:        350ms;   /* Stage 1: seal lift + glint */
  --dur-open-flap:   500ms;   /* Stage 1: flap rotateX(180deg) */
  --dur-open-letter: 650ms;   /* Stage 2: letter draw */
  --delay-letter:    200ms;
  --dur-envelope-fade: 400ms; /* Stage 2: envelope fade behind card */
  --delay-envelope-fade: 250ms;
  --dur-card-settle: 400ms;   /* Stage 3: card scale-in */
  --delay-card-settle: 450ms;
  --dur-stagger:     320ms;   /* Stage 3: typography reveal */
  --delay-stagger-base: 400ms;
  --stagger-step:    45ms;    /* 5 elements → 180ms total cap */
  --dur-crossfade:   180ms;   /* reduced-motion path */
  --dur-petal-fade:  1000ms;  /* close: petals fade ≤1s (BR-5) */

  /* Composer — pill + drawer */
  --radius-pill:     999px;
  --dur-composer:    240ms;   /* drawer slide/fade (--ease-expo) */
  --z-composer:      50;      /* above card; petal canvas stays z-index 0 */
}
```

**Fonts:** Google Fonts `Playfair Display` + `Be Vietnam Pro`, `vietnamese` subset, `woff2`, `display=swap` → ~60–80KB, fits ≤200KB budget (NFR-3). Fallback stacks guarantee correct diacritics if fonts fail (`Noto Serif`/system). Verify NFR-5 test string renders: `Nguyễn Trường An, chúc mừng Ngày Nhà giáo 20/11`.

**Responsive breakpoints:** base = mobile ≥320px (NFR-1); `@media (min-width: 768px)` — larger type/padding; `@media (min-width: 1024px)` — desktop scale. All widths `min(Xvw, Ypx)`; card `max-height: 92dvh` with internal `overflow-y: auto` (long `msg` never breaks layout, FR-2 — custom scrollbar themed).

## Accessibility & Usability Checks

- **Keyboard/Focus:** Tab order = `#envelope` → (after open) `#close-card`. Both are real `<button type="button">` (native Enter/Space free, FR-5). `Escape` on `document` closes when `data-state="open"` (spec). No focus traps; focus rests in tab order through transitions. `:focus-visible`: `outline: 3px solid var(--color-burgundy)` + `box-shadow: 0 0 0 2px var(--color-gold)` offset ring — burgundy on cream ≈ 8:1 (gold alone on cream is 1.9:1, decoration only). Focus ring never removed on the reduced-motion path.
- **Keyboard/Focus (composer):** opening the drawer moves focus into `#input-to`; closing returns focus to `#open-composer`. `Tab`/`Shift+Tab` wrap inside the drawer (`_wrapFocus`); `#card-scene` + `#open-composer` are `inert` while open so browse-mode assistive tech stays out of the background. `Escape` branches composer-first (capture phase): drawer open → close drawer only, envelope untouched (`FR-6`). Composer inputs carry explicit `<label for>`; each field's `aria-describedby` points at its `#count-*` counter; `#share-url` (`readonly`) is non-interactive; `#composer-status` is `aria-live="polite"`.
- **Labels/ARIA:** envelope `aria-label="Mở thiệp chúc mừng 20/11"`; `aria-expanded` reflects state. `#status-live` (`aria-live="polite"`, `.sr-only`) announces "Thiệp đã mở" / "Đã đóng thiệp" (spec). `#petal-canvas`, seal, pockets, flap, medallion, filigree: `aria-hidden="true"`. Gửi:/Từ: are visible labels paired with their values in the same text block; no placeholder-as-label anywhere.
- **Contrast (≥4.5:1):** body `--color-ink` on `--color-card` 10.5:1; heading burgundy on card 8.2:1; muted ink 5.1:1; prompt burgundy on cream 7.9:1; medallion cream-on-burgundy ≈ 8:1; button burgundy bg + cream text ≈ 8:1. `--color-gold`/`--color-gold-soft`/`--color-apricot` are decoration-only — never text on light ground (gold on cream ≈ 1.9:1, fails).
- **Motion safety:** animated properties = `transform`/`opacity` (plus bounded `filter`/`box-shadow` on isolated elements — glint, seal, backdrop warmth); no layout property animates per frame (NFR-2). Petals never intercept pointer events, never render above card text. Petal loop stops on close, on `stop()`, and never starts under reduced motion; `document.hidden` pauses the loop (nonessential loop stops when hidden).
- **UX Risks:** (1) user may not realize the envelope is clickable → prompt text + hover seal response + gentle pulse; (2) spam-clicking during transition → lock ignores input until 900ms unlock (spec); (3) long personalized `msg` → internal scroll + 120-char cap keeps composition intact; (4) accidental close → reopen is one tap, identical replay (US-2); (5) hover flicker near button edge → button never moves itself, only children transform (animate.md).

## Craft-floor compliance checklist

- **Contrast:** all text pairs ≥4.5:1 (ratios above); no gray-on-tint secondary text — muted ink is hue-tinted from the paper world.
- **Depth:** every shadow carries offset + soft blur (token block); zero-offset halos appear only as seal rim rings (metallic rim, not a shadow).
- **Spacing:** space above heading (1.75rem) > below (0.75rem); tight label/value groups, generous block separation.
- **Type:** body measure 65–75ch on desktop; display ≤6rem; `text-wrap: balance` headings; obvious scale/weight steps (Playfair display vs Be Vietnam body).
- **Motion:** one authored focal sequence (seal → flap → letter → settle), not scattered effects; exponential ease-out `cubic-bezier(0.16, 1, 0.3, 1)`; reaches past transform/opacity into glint, backdrop warmth, shadow expansion — all bounded.
- **States:** hover (child-carried), disabled-equivalent (lock), loading (pure-CSS envelope first paint), error (degrade-to-raw), empty (Vietnamese defaults), JS-off (noscript + pre-rendered content), reduced motion (dignified crossfade). Real content, working controls, responsive composition, keyboard focus.
- **Browser surfaces:** `::selection`, scrollbar, caret, focus rings, tabular numerals all themed from the palette.
- **Copy:** product's own language — all copy is Vietnamese, occasion-specific; controls name their action ("Mở thiệp", "Đóng lại").
- **Composer:** inherits the paper world — inputs get themed caret/selection, counters `tabular-nums`, CTAs name their action ("Sao chép link gửi tặng", "Xem thử thiệp"), pill uses offset + blur shadow, close button is text "Đóng" (no emoji/glyph icon).
- **No bans:** no kicker/eyebrow (medallion replaces `card-badge` above heading); no gradient text; no glass/blur decoration; no one-sided bar; no hard offset shadows; no system display face; no emoji/unicode-glyph icons (all ornaments are drawn SVG); no geometric masks.
