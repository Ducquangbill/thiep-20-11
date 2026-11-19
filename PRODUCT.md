# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Senders (Người tặng):** Students, former students, or parents who want to send a respectful, personalized Vietnamese Teachers' Day (20/11) greeting to a teacher by sharing a customized link, and who may replay the opening animation to preview or present it.
- **Recipients (Người nhận):** Vietnamese teachers opening a shared link (often on a mobile phone over 4G) to immediately experience the envelope reveal and read the greeting in their first viewport without signing in or scrolling.

## Product Purpose
A static, single-card online greeting experience for Vietnamese Teachers' Day (Ngày Nhà giáo Việt Nam 20/11). It lets anyone deliver an emotional, ceremonial "open the letter" moment—tapping a 3D envelope seal to reveal a greeting card accompanied by gently falling petals—personalized entirely via URL parameters (`?to`, `?msg`, `?from`). Success means instant load on mobile and desktop, smooth 60fps opening choreography, flawless Vietnamese typography, and zero friction to personalize or share.

## Positioning
A zero-backend, single-showcase 3D greeting card personalized purely through URL query parameters (`?to`, `?msg`, `?from`) with safe 120-character truncation and formal Vietnamese fallbacks—delivering a tactile envelope-opening and petal-fall ritual in a sub-200KB static payload without accounts, databases, forms, or multi-card walls.

## Operating Context
- Shared as a direct URL over messaging apps on and around November 20 (Ngày Nhà giáo Việt Nam).
- Frequently opened on mobile browsers (including iOS Safari and Android Chrome over 4G) as well as desktop browsers, or directly via `file://` / static hosting.
- Senders construct or tweak `?to=`, `?msg=`, and `?from=` query parameters directly in the URL and replay the open/close cycle to verify the presentation.

## Capabilities and Constraints
- **Single showcase card:** One centered screen with two primary states (`closed` and `open`), repeatable via the envelope trigger and "Đóng lại" button (or `Escape`).
- **URL parameter personalization:** Only `to`, `msg`, and `from` are consumed. `+` decodes to space before `decodeURIComponent`; malformed percent-encoding falls back safely without crashing. Values exceeding 120 characters are truncated with `…`.
- **Formal Vietnamese defaults:** Missing or empty parameters fall back per field to:
  - Occasion badge / title: `20/11` / `Chào mừng Ngày Nhà giáo Việt Nam 20/11`
  - `to`: `Thầy/Cô của em`
  - `msg`: `Kính chúc Thầy/Cô luôn dồi dào sức khỏe, tràn đầy niềm vui và hạnh phúc. Cảm ơn Thầy/Cô vì tất cả những điều tốt đẹp đã dành cho chúng em.`
  - `from`: `Người học trò của bạn`
- **Petal emitter:** Runs only while the envelope is `open` (10–40 concurrent particles on `<canvas>`, fading out in ≤1s on close).
- **Strict static & security constraints:** Vanilla HTML5, CSS3, and ES Modules (`index.html`, `styles.css`, `app.js`), zero runtime dependencies, zero backend/storage, no background music, no photo upload/gallery, no multi-card wall, and no in-page creation form. All dynamic text is assigned via `textContent` only (`innerHTML` is forbidden).
- **Performance budget:** Total compressed HTML+CSS+JS payload ≤ 200KB; GPU-only animations (`transform`, `opacity`) targeting ≥ 55fps.

## Brand Commitments
- **Voice & tone:** Formal, warm, grateful, and respectful Vietnamese (*trang trọng, ấm áp, tri ân*), honoring the teacher-student relationship.
- **Language & diacritics:** Full Vietnamese diacritic fidelity (`Playfair Display` and `Be Vietnam Pro` with Vietnamese subsets and safe serif/system fallbacks).

## Evidence on Hand
- Complete static implementation and contract tests in `index.html`, `styles.css`, `app.js`, and `tests/app.test.js`.
- Requirements, UI/UX design specification, and technical specification in `docs/thiep-20-11/requirements.md`, `docs/thiep-20-11/design.md`, and `docs/thiep-20-11/spec.md`.
- No external customer testimonials, analytics, or photographic assets exist; future work must not fabricate them.

## Product Principles
1. **Ceremony in one tap:** Every interaction serves the single emotional beat of unsealing the envelope and reading the tribute—nothing competes with the card.
2. **Zero-backend personalization:** The URL is the entire data layer; every link must render a complete, dignified Vietnamese greeting even when parameters are missing, overlong, or malformed.
3. **Content precedes choreography:** Greeting text is present in the DOM from first paint so weak devices, slow connections, or disabled animations never block the message.
4. **Respectful restraint:** Keep the product focused on a single tactile card—no popups, forms, audio autoplay, or social clutter.

## Accessibility & Inclusion
- Keyboard-operable envelope (`<button type="button">`, `aria-expanded`, `aria-label="Mở thiệp chúc mừng 20/11"`) and close control (`Đóng lại`, plus `Escape`), with polite live-region announcements (`#status-live`).
- WCAG AA contrast (≥ 4.5:1) for all card and prompt text; decorative gold accents and petal canvas (`aria-hidden="true"`) never carry text or block reading.
- Full `prefers-reduced-motion: reduce` support: disables the petal emitter and collapses the 3D opening choreography to an instant/short crossfade (≤ 200ms).
