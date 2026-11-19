// Thiệp 20/11 — spandrel-free static greeting card.
// No top-level DOM access: importing this module in Node is side-effect free.

export const MAX_FIELD_LEN = 120;
export const MAX_LEN = MAX_FIELD_LEN;
export const PETAL_MIN = 10;
export const PETAL_MAX = 40;
export const PETAL_COUNT = 30;

export const DEFAULTS = {
  to: "Thầy/Cô của em",
  msg: "Kính chúc Thầy/Cô luôn dồi dào sức khỏe, tràn đầy niềm vui và hạnh phúc. Cảm ơn Thầy/Cô vì tất cả những điều tốt đẹp đã dành cho chúng em.",
  from: "Người học trò của bạn",
};

const FIELDS = ["to", "msg", "from"];
/** Blossom palette, ordered pale → deep: gold-soft, apricot, terracotta, burgundy. */
export const PETAL_PALETTE = ["#E8D9A8", "#E3B23C", "#B85C38", "#6B1F2A"];
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/** Percent-decode a raw param value. `+` means space; malformed input is kept verbatim. */
export function decodeValue(raw) {
  const value = String(raw ?? "");
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

/** Cap a display value at `max` chars, ending the result with an ellipsis. */
export function truncate(value, max = MAX_FIELD_LEN) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Resolve `?to=&msg=&from=` into three display strings; never returns empty or undefined fields. */
export function resolveParams(searchString) {
  const raw = {};
  const query = String(searchString ?? "").replace(/^\?/, "");
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? null : pair.slice(eq + 1);
    if (FIELDS.includes(key) && !Object.hasOwn(raw, key)) raw[key] = value;
  }
  const result = {};
  for (const field of FIELDS) {
    const value = raw[field];
    const decoded = value == null ? "" : decodeValue(value);
    // Whitespace-only input is treated as absent (BR-2): never an empty slot.
    result[field] = decoded.trim() === "" ? DEFAULTS[field] : truncate(decoded);
  }
  return result;
}

/** Two-state machine: closed ⇄ open. */
export function nextState(state) {
  if (state === "closed") return "open";
  if (state === "open") return "closed";
  throw new TypeError(`unknown envelope state: ${state}`);
}

export function prefersReducedMotion(win = globalThis.window) {
  return typeof win?.matchMedia === "function" && win.matchMedia(reducedMotionQuery).matches;
}

/**
 * Compose a shareable greeting URL: the base is reduced to origin + pathname,
 * then only non-blank (trimmed, 120-char capped) fields are encoded with
 * `URLSearchParams` — spaces become `+`, exactly inverse of `decodeValue`.
 */
export function buildShareUrl(baseUrl, { to = "", msg = "", from = "" } = {}) {
  const cleanBase = String(baseUrl ?? "").split(/[?#]/)[0];
  const values = { to, msg, from };
  const params = new URLSearchParams();
  for (const field of FIELDS) {
    const value = truncate(String(values[field] ?? "").trim(), MAX_FIELD_LEN);
    if (value !== "") params.set(field, value);
  }
  const query = params.toString();
  return query ? `${cleanBase}?${query}` : cleanBase;
}

export function shouldAutoOpenComposer(searchString) {
  return String(searchString ?? "")
    .replace(/^\?/, "")
    .split("&")
    .some((pair) => {
      const [key, value] = pair.split("=");
      return key === "compose" && value === "1";
    });
}

export class EnvelopeController {
  constructor(root, { reducedMotion = false, transitionMs, envelope, statusLive, card } = {}) {
    this.root = root;
    this.reducedMotion = Boolean(reducedMotion);
    this.transitionMs = transitionMs ?? (this.reducedMotion ? 200 : 900);
    this.envelope = envelope ?? null;
    this.statusLive = statusLive ?? null;
    this.card = card ?? null;
    this._state = "closed";
    this._locked = false;
    this._unlockTimer = null;
    this._listener = null;
    this._apply("closed", false);
  }

  get state() {
    return this._state;
  }

  onStateChange(fn) {
    this._listener = fn;
    return this;
  }

  toggle() {
    return this._locked ? false : this._transition(nextState(this._state));
  }

  open() {
    return this._state === "closed" && !this._locked ? this._transition("open") : false;
  }

  close() {
    return this._state === "open" && !this._locked ? this._transition("closed") : false;
  }

  _transition(next) {
    this._locked = true;
    clearTimeout(this._unlockTimer);
    this._apply(next);
    this._unlockTimer = setTimeout(() => {
      this._locked = false;
      this._unlockTimer = null;
    }, this.transitionMs);
    this._listener?.(next);
    return true;
  }

  _find(id, given) {
    if (given) return given;
    return this.root?.querySelector?.(`#${id}`) ?? this.root?.ownerDocument?.getElementById?.(id) ?? null;
  }

  _apply(state, announce = true) {
    this._state = state;
    if (this.root) this.root.dataset.state = state;
    this._find("envelope", this.envelope)?.setAttribute(
      "aria-expanded",
      state === "open" ? "true" : "false",
    );
    const card = this._find("greeting-card", this.card);
    if (card) card.hidden = state === "closed";
    const live = this._find("status-live", this.statusLive);
    if (live && announce) live.textContent = state === "open" ? "Thiệp đã mở" : "Đã đóng thiệp";
  }
}

export class PetalController {
  constructor(
    canvas,
    {
      reducedMotion = false,
      count = PETAL_COUNT,
      min = PETAL_MIN,
      max = PETAL_MAX,
      random = Math.random,
      raf,
      caf,
    } = {},
  ) {
    this.canvas = canvas;
    this.reducedMotion = Boolean(reducedMotion);
    this.count = this.reducedMotion ? 0 : Math.min(max, Math.max(min, count));
    this.petals = [];
    this.running = false;
    this._random = random;
    this._fadeRate = 1 / 1000; // opacity per ms → full fade in ≈ 1s
    this._raf = raf ?? ((cb) => globalThis.requestAnimationFrame(cb));
    this._caf = caf ?? ((id) => globalThis.cancelAnimationFrame?.(id));
    this._frame = null;
    this._last = null;
  }

  start() {
    if (this.reducedMotion || this.running) return this;
    this.running = true;
    this._last = null; // fresh clock baseline: a restart must not inherit the old fade-out timestamp
    while (this.petals.length < this.count) this.petals.push(this._spawn());
    if (this._frame == null) this._schedule();
    return this;
  }

  stop() {
    this.running = false;
    if (this.petals.length === 0) this._cancel();
    return this;
  }

  loop(timestamp) {
    this._frame = null;
    const dt = this._last == null ? 0 : Math.min(Math.max(timestamp - this._last, 0), 50);
    this._last = timestamp;
    const seconds = dt / 1000;

    if (this.running) {
      while (this.petals.length < this.count) this.petals.push(this._spawn());
    }

    const height = this.canvas?.height || 0;
    const alive = [];
    for (const petal of this.petals) {
      petal.phase += petal.swayFreq * seconds;
      petal.x += Math.sin(petal.phase) * petal.swayAmp * seconds;
      petal.y += petal.speed * seconds;
      petal.rotation += petal.rotationSpeed * seconds;
      if (!this.running) petal.opacity = Math.max(0, petal.opacity - this._fadeRate * dt);
      if (petal.opacity > 0 && petal.y <= height + petal.size) alive.push(petal);
    }
    this.petals = alive;

    this._draw();
    if (this.running || this.petals.length > 0) this._schedule();
    else this._last = null; // loop exited for good; next start() gets dt = 0
  }

  _schedule() {
    this._frame = this._raf((timestamp) => this.loop(timestamp));
  }

  _cancel() {
    if (this._frame != null) this._caf(this._frame);
    this._frame = null;
    this._last = null;
  }

  _spawn() {
    const random = this._random;
    const width = this.canvas?.width || 0;
    const size = 6 + random() * 8;
    // Colour and depth derive from size alone: small = far = pale, large = near = deep.
    const tone = Math.min(PETAL_PALETTE.length - 1, Math.floor((size - 6) / 2));
    return {
      x: random() * width,
      y: -20 - random() * 100, // y ∈ [-120, -20]: enters the viewport during Stage 3
      size,
      swayAmp: 10 + random() * 20,
      swayFreq: 0.6 + random() * 1.2,
      phase: random() * Math.PI * 2,
      speed: 40 + random() * 40,
      rotation: random() * Math.PI * 2,
      rotationSpeed: (random() - 0.5) * 2,
      opacity: 0.35 + ((size - 6) / 8) * 0.5,
      fill: PETAL_PALETTE[tone],
    };
  }

  _draw() {
    const ctx = this.canvas?.getContext?.("2d");
    if (!ctx) return;
    const width = this.canvas.width || 0;
    const height = this.canvas.height || 0;
    ctx.clearRect(0, 0, width, height);
    for (const petal of this.petals) {
      const size = petal.size;
      // abs(cos) keeps a solid silhouette while the petal tumbles in 3D.
      const tumble = Math.max(0.2, Math.abs(Math.cos(petal.rotation)));
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.scale(1, tumble);
      ctx.globalAlpha = petal.opacity;
      ctx.fillStyle = petal.fill;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.95, -size * 0.6, size * 0.85, size * 0.55, size * 0.22, size);
      ctx.bezierCurveTo(size * 0.12, size * 0.62, -size * 0.12, size * 0.62, -size * 0.22, size);
      ctx.bezierCurveTo(-size * 0.85, size * 0.55, -size * 0.95, -size * 0.6, 0, -size);
      ctx.fill();
      if (typeof ctx.stroke === "function") {
        ctx.globalAlpha = petal.opacity * 0.45;
        ctx.strokeStyle = "#E8D9A8";
        ctx.lineWidth = Math.max(0.5, size * 0.06);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/** Quick composer: build a personalized link, or preview the card immediately. */
export class ComposerController {
  constructor(doc, win, envelope, { max = MAX_FIELD_LEN } = {}) {
    this.doc = doc;
    this.win = win;
    this.envelope = envelope;
    this.max = max;
    this.panel = doc.getElementById("composer-panel");
    this.trigger = doc.getElementById("open-composer");
    this.shareUrl = doc.getElementById("share-url");
    this.status = doc.getElementById("composer-status");
    this.inputs = {};
    this.counters = {};
    for (const field of FIELDS) {
      this.inputs[field] = doc.getElementById(`input-${field}`);
      this.counters[field] = doc.getElementById(`count-${field}`);
    }
    this._open = false;

    this.trigger?.addEventListener("click", () => this.toggle());
    doc.getElementById("close-composer")?.addEventListener("click", () => this.close());
    this.panel?.addEventListener("click", (event) => {
      if (event.target === this.panel) this.close();
    });
    for (const field of FIELDS) {
      this.inputs[field]?.addEventListener("input", () => this.sync());
    }
    doc.getElementById("copy-link")?.addEventListener("click", () => this.copy());
    doc.getElementById("preview-card")?.addEventListener("click", () => this.preview());
    // Capture phase: while the composer is open, Escape and Tab belong to the
    // composer dialog, not to the greeting card underneath.
    doc.addEventListener(
      "keydown",
      (event) => {
        if (!this._open) return;
        if (event.key === "Escape") {
          this.close();
          event.stopImmediatePropagation?.();
          return;
        }
        if (event.key === "Tab") this._wrapFocus(event);
      },
      { capture: true },
    );
    this.sync();
    this.trigger?.setAttribute("aria-expanded", "false");
  }

  /** Keep keyboard focus inside the modal while it is open. */
  _wrapFocus(event) {
    const items = ["close-composer", ...FIELDS.map((field) => `input-${field}`), "share-url", "copy-link", "preview-card"]
      .map((id) => this.doc.getElementById(id))
      .filter((el) => el && typeof el.focus === "function");
    if (items.length === 0) return;
    const index = items.indexOf(this.doc.activeElement);
    if (index === -1) {
      event.preventDefault?.();
      items[event.shiftKey ? items.length - 1 : 0]?.focus?.();
      return;
    }
    if (event.shiftKey) {
      if (index === 0) {
        event.preventDefault?.();
        items[items.length - 1].focus();
      }
    } else if (index === items.length - 1) {
      event.preventDefault?.();
      items[0].focus();
    }
  }

  get isOpen() {
    return this._open;
  }

  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  open() {
    if (!this.panel) return;
    this._open = true;
    this.panel.hidden = false;
    this._setBackgroundInert(true);
    this.trigger?.setAttribute("aria-expanded", "true");
    this.inputs.to?.focus?.();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.panel.hidden = true;
    this._setBackgroundInert(false);
    this.trigger?.setAttribute("aria-expanded", "false");
    this.trigger?.focus?.();
  }

  /** Screen readers in browse mode must not reach the page behind the modal. */
  _setBackgroundInert(inert) {
    for (const element of [this.doc.getElementById("card-scene"), this.trigger]) {
      if (!element) continue;
      element.inert = inert;
      if (inert) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
    }
  }

  /** Read inputs, paint counters and refresh the share link. */
  sync() {
    const values = {};
    for (const field of FIELDS) {
      const value = String(this.inputs[field]?.value ?? "");
      values[field] = value;
      const counter = this.counters[field];
      if (counter) {
        counter.textContent = `${value.length}/${this.max}`;
        counter.classList?.toggle("is-limit", value.length >= this.max);
      }
    }
    if (this.shareUrl) this.shareUrl.value = buildShareUrl(this.baseUrl(), values);
    return values;
  }

  baseUrl() {
    const location = this.win?.location;
    if (!location) return "";
    if (location.origin && location.pathname) return `${location.origin}${location.pathname}`;
    return String(location.href ?? "");
  }

  async copy() {
    const url = String(this.shareUrl?.value ?? "");
    const clipboard = (this.win?.navigator ?? globalThis.navigator)?.clipboard;
    let copied = false;
    try {
      if (clipboard?.writeText) {
        await clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        this.shareUrl?.select?.();
        copied = Boolean(this.doc?.execCommand?.("copy"));
      } catch {
        copied = false;
      }
    }
    if (this.status) {
      this.status.textContent = copied
        ? "Đã sao chép link thiệp vào bộ nhớ tạm"
        : "Không thể sao chép tự động — hãy chọn link và sao chép thủ công";
    }
    return copied;
  }

  preview() {
    const values = this.sync();
    const content = {};
    for (const field of FIELDS) {
      const value = values[field].trim();
      content[field] = value === "" ? DEFAULTS[field] : truncate(value);
      const slot = this.doc.getElementById(`card-${field}`);
      if (slot) slot.textContent = content[field];
    }
    try {
      this.win?.history?.replaceState?.(null, "", buildShareUrl(this.baseUrl(), values));
    } catch {
      // file:// and sandboxed frames can refuse history writes; the preview still works.
    }
    this.close();
    this.envelope?.open();
    return content;
  }
}

/** Browser entry point: fill the card slots, wire the envelope, petals, close and Escape. */
export function initApp(doc = globalThis.document, win = globalThis.window) {
  if (!doc) return null;
  const byId = (id) => doc.getElementById(id);
  const scene = byId("card-scene");
  if (!scene) return null;

  const content = resolveParams(win?.location?.search ?? "");
  for (const field of FIELDS) {
    const slot = byId(`card-${field}`);
    if (slot) slot.textContent = content[field];
    const input = byId(`input-${field}`);
    // Seed the composer with personalized values only; defaults stay empty so links stay short.
    if (input && content[field] !== DEFAULTS[field]) input.value = content[field];
  }

  const reduced = prefersReducedMotion(win);
  const envelopeEl = byId("envelope");
  const controller = new EnvelopeController(scene, {
    reducedMotion: reduced,
    envelope: envelopeEl,
    card: byId("greeting-card"),
    statusLive: byId("status-live"),
  });

  const canvas = byId("petal-canvas");
  const petals = canvas ? new PetalController(canvas, { reducedMotion: reduced }) : null;
  controller.onStateChange((state) => {
    if (!petals) return;
    if (state === "open") petals.start();
    else petals.stop();
  });

  envelopeEl?.addEventListener("click", () => controller.open());
  byId("close-card")?.addEventListener("click", () => controller.close());
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && controller.state === "open") controller.close();
  });

  const sizeCanvas = () => {
    if (!canvas) return;
    const dpr = Math.min(win?.devicePixelRatio || 1, 2);
    canvas.width = Math.round((win?.innerWidth || 0) * dpr);
    canvas.height = Math.round((win?.innerHeight || 0) * dpr);
  };
  sizeCanvas();
  win?.addEventListener?.("resize", sizeCanvas);

  const composer = new ComposerController(doc, win, controller);
  if (shouldAutoOpenComposer(win?.location?.search ?? "")) composer.open();

  return controller;
}

export const init = initApp;

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initApp());
  } else {
    initApp();
  }
}
