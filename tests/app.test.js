import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FIELD_LEN,
  MAX_LEN,
  PETAL_MIN,
  PETAL_MAX,
  PETAL_COUNT,
  PETAL_PALETTE,
  DEFAULTS,
  decodeValue,
  truncate,
  resolveParams,
  nextState,
  prefersReducedMotion,
  buildShareUrl,
  shouldAutoOpenComposer,
  EnvelopeController,
  PetalController,
  ComposerController,
  initApp,
} from "../app.js";

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeEl(extra = {}) {
  const listeners = new Map();
  const classes = new Set();
  return {
    textContent: "",
    value: "",
    dataset: {},
    hidden: false,
    inert: false,
    attrs: {},
    focused: false,
    selected: 0,
    classList: {
      toggle(name, force) {
        const on = force === undefined ? !classes.has(name) : Boolean(force);
        if (on) classes.add(name);
        else classes.delete(name);
        return on;
      },
      contains: (name) => classes.has(name),
    },
    focus() {
      this.focused = true;
      if (this.ownerDocument) this.ownerDocument.activeElement = this;
    },
    select() {
      this.selected += 1;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    getAttribute(name) {
      return this.attrs[name];
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
    ...extra,
  };
}

/** Minimal document stub: capture listeners run before bubble listeners, in registration order. */
function fakeDoc(elements) {
  const listeners = new Map();
  return {
    readyState: "complete",
    activeElement: null,
    execCommand: undefined,
    getElementById: (id) => elements[id] ?? null,
    addEventListener(type, fn, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ fn, capture: Boolean(options?.capture) });
    },
    fire(type, event = {}) {
      const e = { ...event };
      if (!e.stopImmediatePropagation) {
        Object.defineProperty(e, "stopImmediatePropagation", {
          value: () => {
            e.stopped = true;
          },
        });
      }
      const all = listeners.get(type) ?? [];
      for (const { fn } of [...all.filter((l) => l.capture), ...all.filter((l) => !l.capture)]) {
        fn(e);
        if (e.stopped) break;
      }
    },
  };
}

function fakeCanvas(width = 800, height = 600) {
  const calls = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    clearRect: (...args) => calls.push(["clearRect", ...args]),
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    moveTo: (...args) => calls.push(["moveTo", ...args]),
    bezierCurveTo: (...args) => calls.push(["bezierCurveTo", ...args]),
    fill: () => calls.push(["fill"]),
    stroke: () => calls.push(["stroke"]),
  };
  return { width, height, getContext: () => ctx, ctx };
}

function fakeRaf() {
  let queue = new Map();
  let nextId = 0;
  return {
    raf(cb) {
      queue.set(++nextId, cb);
      return nextId;
    },
    caf(id) {
      queue.delete(id);
    },
    flush(timestamp) {
      const pending = [...queue.values()];
      queue.clear();
      for (const cb of pending) cb(timestamp);
    },
    get pending() {
      return queue.size;
    },
  };
}

/* ---------- constants & content ---------- */

test("constants match the spec", () => {
  assert.equal(MAX_FIELD_LEN, 120);
  assert.equal(MAX_LEN, 120);
  assert.equal(PETAL_MIN, 10);
  assert.equal(PETAL_MAX, 40);
  assert.equal(PETAL_COUNT, 30);
  assert.deepEqual(Object.keys(DEFAULTS).sort(), ["from", "msg", "to"]);
});

test("DEFAULTS carry the final Vietnamese copy", () => {
  assert.equal(DEFAULTS.to, "Thầy/Cô của em");
  assert.equal(DEFAULTS.from, "Người học trò của bạn");
  assert.match(DEFAULTS.msg, /^Kính chúc Thầy\/Cô/);
});

/* ---------- decodeValue (BR-1) ---------- */

test("decodeValue decodes percent escapes including Vietnamese diacritics", () => {
  assert.equal(decodeValue("C%C3%B4%20Lan"), "Cô Lan");
  assert.equal(decodeValue("Nguy%E1%BB%85n%20Tr%C6%B0%E1%BB%9Dng%20An"), "Nguyễn Trường An");
});

test("decodeValue converts + to space", () => {
  assert.equal(decodeValue("Co+Lan"), "Co Lan");
  assert.equal(decodeValue("a+b+c"), "a b c");
});

test("decodeValue falls back to the raw value on malformed escapes", () => {
  assert.equal(decodeValue("%E0%A4%A"), "%E0%A4%A");
  assert.equal(decodeValue("%zz"), "%zz");
  assert.equal(decodeValue("100% thầy"), "100% thầy");
});

test("decodeValue passes plain text through", () => {
  assert.equal(decodeValue(""), "");
  assert.equal(decodeValue("Xin chào"), "Xin chào");
});

/* ---------- truncate (BR-1, FR-2) ---------- */

test("truncate keeps short values untouched", () => {
  assert.equal(truncate("abc"), "abc");
  assert.equal(truncate("x".repeat(MAX_FIELD_LEN)), "x".repeat(MAX_FIELD_LEN));
});

test("truncate caps at 120 chars including the ellipsis", () => {
  const cut = truncate("x".repeat(500));
  assert.equal(cut.length, MAX_FIELD_LEN);
  assert.equal(cut.at(-1), "…");
});

test("truncate honours a custom max", () => {
  assert.equal(truncate("abcdef", 5), "abcd…");
});

/* ---------- resolveParams (BR-1, BR-2, BR-3) ---------- */

test("resolveParams returns defaults for no params", () => {
  assert.deepEqual(resolveParams(""), DEFAULTS);
  assert.deepEqual(resolveParams("?"), DEFAULTS);
});

test("resolveParams returns defaults for empty field values", () => {
  assert.deepEqual(resolveParams("?to=&msg=&from="), DEFAULTS);
  assert.deepEqual(resolveParams("?to=%20%20&msg=&from="), DEFAULTS);
});

test("resolveParams ignores unknown parameter names", () => {
  assert.deepEqual(resolveParams("?recipient=Lan&name=Minh&text=hi"), DEFAULTS);
});

test("resolveParams decodes each field independently", () => {
  const result = resolveParams("?to=C%C3%B4%20Lan&msg=Ch%C3%BAc%20c%C3%B4%20vui&from=Sinh+vi%C3%AAn");
  assert.deepEqual(result, {
    to: "Cô Lan",
    msg: "Chúc cô vui",
    from: "Sinh viên",
  });
});

test("resolveParams falls back per field, not globally", () => {
  const result = resolveParams("?to=Co+Lan&msg=");
  assert.equal(result.to, "Co Lan");
  assert.equal(result.msg, DEFAULTS.msg);
  assert.equal(result.from, DEFAULTS.from);
});

test("resolveParams truncates each field to 120 chars", () => {
  const result = resolveParams(`?to=${"a".repeat(300)}&from=${"b".repeat(121)}`);
  assert.equal(result.to.length, 120);
  assert.equal(result.to.at(-1), "…");
  assert.equal(result.from.length, 120);
  assert.equal(result.msg, DEFAULTS.msg);
});

test("resolveParams keeps hostile markup as a plain string (BR-3)", () => {
  const payload = "<script>alert(1)</script>";
  const result = resolveParams(`?msg=${payload}&to=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E`);
  assert.equal(result.msg, payload);
  assert.equal(result.to, '<img src=x onerror=alert(1)>');
  assert.equal(typeof result.msg, "string");
});

test("resolveParams never throws on malformed percent encoding", () => {
  assert.doesNotThrow(() => resolveParams("?to=%E0%A4%A&msg=%zz&from=%"));
  const result = resolveParams("?to=%E0%A4%A");
  assert.equal(result.to, "%E0%A4%A");
  assert.equal(result.msg, DEFAULTS.msg);
});

test("resolveParams always returns three strings", () => {
  for (const input of ["", "?", "?to=", "?msg=%zz", "?to=a&from=b"]) {
    const result = resolveParams(input);
    assert.deepEqual(Object.keys(result).sort(), ["from", "msg", "to"]);
    for (const value of Object.values(result)) {
      assert.equal(typeof value, "string");
      assert.notEqual(value, "undefined");
    }
  }
});

test("resolveParams accepts a search string without the leading ?", () => {
  assert.equal(resolveParams("to=Lan").to, "Lan");
});

test("resolveParams keeps the first occurrence of duplicate keys", () => {
  const result = resolveParams("?to=Lan&to=Hoa");
  assert.equal(result.to, "Lan");
});

test("decodeValue tolerates null/undefined input", () => {
  assert.equal(decodeValue(null), "");
  assert.equal(decodeValue(undefined), "");
});

test("truncate boundary: 121 chars gets cut to 120 with ellipsis", () => {
  const cut = truncate("y".repeat(121));
  assert.equal(cut.length, 121 - 1);
  assert.equal(cut.at(-1), "…");
});

/* ---------- nextState (BR-4) ---------- */

test("nextState flips the two states", () => {
  assert.equal(nextState("closed"), "open");
  assert.equal(nextState("open"), "closed");
});

test("nextState rejects unknown states", () => {
  assert.throws(() => nextState("opening"), {
    name: "TypeError",
    message: "unknown envelope state: opening",
  });
});

/* ---------- prefersReducedMotion (BR-6) ---------- */

test("prefersReducedMotion is false without a window", () => {
  assert.equal(prefersReducedMotion(), false);
});

test("prefersReducedMotion follows matchMedia", () => {
  const original = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    assert.equal(prefersReducedMotion(), true);
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(prefersReducedMotion(), false);
  } finally {
    globalThis.window = original;
  }
});

/* ---------- EnvelopeController (BR-4) ---------- */

function envelopeFixture(options = {}) {
  const root = fakeEl();
  const envelope = fakeEl();
  const card = fakeEl({ hidden: true });
  const statusLive = fakeEl();
  const controller = new EnvelopeController(root, {
    transitionMs: 5,
    envelope,
    card,
    statusLive,
    ...options,
  });
  return { root, envelope, card, statusLive, controller };
}

test("envelope starts closed", () => {
  const { root, envelope, card, statusLive, controller } = envelopeFixture();
  assert.equal(controller.state, "closed");
  assert.equal(root.dataset.state, "closed");
  assert.equal(envelope.getAttribute("aria-expanded"), "false");
  assert.equal(card.hidden, true);
  assert.equal(statusLive.textContent, "");
});

test("toggle opens the envelope and reports the state", () => {
  const { root, envelope, card, statusLive, controller } = envelopeFixture();
  const seen = [];
  controller.onStateChange((state) => seen.push(state));

  assert.equal(controller.toggle(), true);
  assert.equal(controller.state, "open");
  assert.equal(root.dataset.state, "open");
  assert.equal(envelope.getAttribute("aria-expanded"), "true");
  assert.equal(card.hidden, false);
  assert.equal(statusLive.textContent, "Thiệp đã mở");
  assert.deepEqual(seen, ["open"]);
});

test("transition lock swallows spam clicks", async () => {
  const { controller, statusLive } = envelopeFixture({ transitionMs: 20 });
  const seen = [];
  controller.onStateChange((state) => seen.push(state));

  controller.toggle();
  assert.equal(controller.toggle(), false);
  assert.equal(controller.close(), false);
  assert.equal(controller.state, "open");
  assert.equal(seen.length, 1);
  assert.equal(statusLive.textContent, "Thiệp đã mở");

  await wait(30);
  assert.equal(controller.toggle(), true);
  assert.equal(controller.state, "closed");
  assert.equal(statusLive.textContent, "Đã đóng thiệp");
  assert.deepEqual(seen, ["open", "closed"]);
});

test("toggle is repeatable after each transition", async () => {
  const { controller } = envelopeFixture({ transitionMs: 5 });
  for (const expected of ["open", "closed", "open"]) {
    assert.equal(controller.toggle(), true);
    assert.equal(controller.state, expected);
    await wait(10);
  }
});

test("lock duration follows reduced motion", () => {
  assert.equal(envelopeFixture({ transitionMs: undefined }).controller.transitionMs, 900);
  assert.equal(
    envelopeFixture({ transitionMs: undefined, reducedMotion: true }).controller.transitionMs,
    200,
  );
});

test("targeted open/close are idempotent", async () => {
  const { controller } = envelopeFixture({ transitionMs: 5 });
  assert.equal(controller.close(), false);
  assert.equal(controller.open(), true);
  assert.equal(controller.open(), false);
  await wait(10);
  assert.equal(controller.close(), true);
  assert.equal(controller.close(), false);
});

/* ---------- PetalController (BR-5, BR-6, FR-3) ---------- */

function petalFixture(options = {}) {
  const canvas = fakeCanvas();
  const clock = fakeRaf();
  const controller = new PetalController(canvas, {
    raf: clock.raf,
    caf: clock.caf,
    random: () => 0.5,
    ...options,
  });
  return { canvas, clock, controller };
}

test("petal count is clamped to 10–40", () => {
  assert.equal(petalFixture().controller.count, PETAL_COUNT);
  assert.equal(petalFixture({ count: 5 }).controller.count, PETAL_MIN);
  assert.equal(petalFixture({ count: 99 }).controller.count, PETAL_MAX);
});

test("reduced motion disables the emitter", () => {
  const { clock, controller } = petalFixture({ reducedMotion: true });
  assert.equal(controller.count, 0);
  assert.equal(controller.start(), controller);
  assert.equal(controller.petals.length, 0);
  assert.equal(clock.pending, 0);
});

test("start seeds the petals from the top edge", () => {
  const { canvas, clock, controller } = petalFixture({ count: 12 });
  assert.equal(controller.start(), controller);
  assert.equal(controller.petals.length, 12);
  for (const petal of controller.petals) {
    assert.ok(petal.y <= 0);
    assert.ok(petal.x >= 0 && petal.x <= canvas.width);
    assert.ok(petal.opacity > 0);
  }
  assert.equal(clock.pending, 1);
});

function seededRandom(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("petals spawn above the viewport for a staged entry", () => {
  const { controller } = petalFixture({ count: 12, random: seededRandom(3) });
  controller.start();
  for (const petal of controller.petals) {
    assert.ok(petal.y <= -20 && petal.y >= -120, `spawn y ${petal.y} outside [-120,-20]`);
    assert.ok(petal.size >= 6 && petal.size <= 14);
    assert.ok(petal.opacity >= 0.35 && petal.opacity <= 0.85);
  }
});

test("petals carry multi-toned palette colours derived from size", () => {
  const { controller } = petalFixture({ count: 30, random: seededRandom(11) });
  controller.start();
  for (const petal of controller.petals) {
    assert.ok(PETAL_PALETTE.includes(petal.fill), `unexpected petal colour ${petal.fill}`);
    const expected = PETAL_PALETTE[Math.min(3, Math.floor((petal.size - 6) / 2))];
    assert.equal(petal.fill, expected);
  }
  const tones = new Set(controller.petals.map((petal) => petal.fill));
  assert.ok(tones.size >= 2, "petals should not be one flat colour");
});

test("draw paints notched bezier blossoms with a tumble scale", () => {
  const { canvas, clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  const curves = canvas.ctx.calls.filter(([name]) => name === "bezierCurveTo").length;
  const fills = canvas.ctx.calls.filter(([name]) => name === "fill").length;
  assert.equal(curves, 10 * 3);
  assert.equal(fills, 10);
  assert.ok(canvas.ctx.calls.some(([name]) => name === "moveTo"));
});

test("start is idempotent while running", () => {  const { clock, controller } = petalFixture();
  controller.start();
  controller.start();
  assert.equal(controller.petals.length, PETAL_COUNT);
  assert.equal(clock.pending, 1);
});

test("loop advances petals and keeps drawing", () => {
  const { canvas, clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  const before = controller.petals.map((petal) => petal.y);
  clock.flush(50);
  controller.petals.forEach((petal, index) => {
    assert.ok(petal.y > before[index]);
    assert.ok(Number.isFinite(petal.rotation));
  });
  assert.equal(controller.petals.length, 10);
  assert.ok(canvas.ctx.calls.some(([name]) => name === "clearRect"));
});

test("stop fades petals out then cancels the frame loop", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  controller.stop();
  assert.equal(controller.running, false);

  let timestamp = 0;
  for (let frame = 0; frame < 40 && controller.petals.length > 0; frame += 1) {
    timestamp += 50;
    clock.flush(timestamp);
    assert.ok(controller.petals.length <= 10, "no new petals spawn after stop");
  }
  assert.equal(controller.petals.length, 0);
  assert.equal(clock.pending, 0);
});

test("restart after a completed fade-out resets the frame clock", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  controller.stop();

  let timestamp = 0;
  while (controller.petals.length > 0) {
    timestamp += 50;
    clock.flush(timestamp);
  }
  assert.equal(clock.pending, 0, "loop exited naturally");

  controller.start();
  const seeded = controller.petals.map((petal) => petal.y);
  clock.flush(timestamp + 5000);
  assert.deepEqual(
    controller.petals.map((petal) => petal.y),
    seeded,
    "first frame after restart uses dt = 0",
  );
});

test("stop is idempotent and safe before start", () => {
  const { controller } = petalFixture();
  assert.equal(controller.stop(), controller);
  assert.equal(controller.stop(), controller);
  assert.equal(controller.petals.length, 0);
});

test("closed state never spawns petals on start after stop", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  controller.stop();
  clock.flush(0);
  assert.equal(controller.running, false);
  assert.ok(controller.petals.length <= 10);
});

test("loop respawns petals past the bottom edge", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  // Simulate long run: petals falling out are replaced, count stays at 10.
  let timestamp = 0;
  for (let frame = 0; frame < 200; frame += 1) {
    timestamp += 50;
    clock.flush(timestamp);
    assert.ok(controller.petals.length <= 10);
    for (const petal of controller.petals) {
      assert.ok(petal.y <= 600 + petal.size, "petal never drawn below canvas");
    }
  }
  assert.equal(controller.petals.length, 10);
  assert.ok(clock.pending >= 1, "running loop keeps scheduling");
});

test("loop clamps dt on huge frame gaps without crash", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  assert.doesNotThrow(() => clock.flush(10_000_000));
  assert.equal(controller.petals.length, 10);
  assert.ok(Number.isFinite(controller.petals[0].y));
});

test("start while fading refills to count", () => {
  const { clock, controller } = petalFixture({ count: 10 });
  controller.start();
  clock.flush(0);
  controller.stop();
  clock.flush(50);
  controller.start();
  assert.equal(controller.running, true);
  assert.equal(controller.petals.length, 10);
});

/* ---------- initApp (BR-1, BR-2, BR-3, BR-4, BR-5) ---------- */

function appFixture(search) {
  const canvas = fakeCanvas();
  const elements = {
    "petal-canvas": canvas,
    "card-scene": fakeEl(),
    envelope: fakeEl(),
    "greeting-card": fakeEl({ hidden: true }),
    "card-to": fakeEl(),
    "card-msg": fakeEl(),
    "card-from": fakeEl(),
    "close-card": fakeEl(),
    "status-live": fakeEl(),
    "open-composer": fakeEl(),
    "composer-panel": fakeEl({ hidden: true }),
    "close-composer": fakeEl(),
    "input-to": fakeEl(),
    "input-msg": fakeEl(),
    "input-from": fakeEl(),
    "count-to": fakeEl(),
    "count-msg": fakeEl(),
    "count-from": fakeEl(),
    "share-url": fakeEl(),
    "copy-link": fakeEl(),
    "preview-card": fakeEl(),
    "composer-status": fakeEl(),
  };
  const doc = fakeDoc(elements);
  const clock = fakeRaf();
  const win = {
    location: { search, origin: "https://thiep.vn", pathname: "/", href: `https://thiep.vn/${search}` },
    history: { calls: [], replaceState(...args) { this.calls.push(args); } },
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 2,
    innerWidth: 375,
    innerHeight: 812,
    addEventListener() {},
  };
  const restoreRaf = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
  globalThis.requestAnimationFrame = clock.raf;
  globalThis.cancelAnimationFrame = clock.caf;
  const controller = initApp(doc, win);
  return {
    elements,
    canvas,
    clock,
    doc,
    controller,
    cleanup() {
      [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = restoreRaf;
    },
  };
}

test("initApp writes resolved params into the card slots", () => {
  const app = appFixture("?to=C%C3%B4+Lan&msg=Ch%C3%BAc+m%E1%BB%ABng&from=Minh");
  try {
    assert.equal(app.elements["card-to"].textContent, "Cô Lan");
    assert.equal(app.elements["card-msg"].textContent, "Chúc mừng");
    assert.equal(app.elements["card-from"].textContent, "Minh");
  } finally {
    app.cleanup();
  }
});

test("initApp renders defaults and hostile payloads as text", () => {
  const empty = appFixture("");
  try {
    assert.equal(empty.elements["card-to"].textContent, DEFAULTS.to);
    assert.equal(empty.elements["card-msg"].textContent, DEFAULTS.msg);
    assert.equal(empty.elements["card-from"].textContent, DEFAULTS.from);
  } finally {
    empty.cleanup();
  }

  const hostile = appFixture("?msg=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E");
  try {
    assert.equal(hostile.elements["card-msg"].textContent, "<img src=x onerror=alert(1)>");
  } finally {
    hostile.cleanup();
  }
});

test("initApp opens on envelope click and starts petals", () => {
  const app = appFixture("?to=Lan");
  try {
    app.elements.envelope.fire("click");
    assert.equal(app.controller.state, "open");
    assert.equal(app.elements["card-scene"].dataset.state, "open");
    assert.equal(app.elements.envelope.getAttribute("aria-expanded"), "true");
    assert.equal(app.elements["greeting-card"].hidden, false);
    assert.equal(app.elements["status-live"].textContent, "Thiệp đã mở");
    assert.equal(app.clock.pending >= 1, true);
  } finally {
    app.cleanup();
  }
});

test("initApp closes via button and via Escape", async () => {
  const app = appFixture("");
  try {
    app.elements.envelope.fire("click");
    await wait(950);
    app.elements["close-card"].fire("click");
    assert.equal(app.controller.state, "closed");
    assert.equal(app.elements["status-live"].textContent, "Đã đóng thiệp");

    await wait(950);
    app.elements.envelope.fire("click");
    assert.equal(app.controller.state, "open");
    await wait(950);
    app.doc.fire("keydown", { key: "Escape" });
    assert.equal(app.controller.state, "closed");

    app.doc.fire("keydown", { key: "Escape" });
    assert.equal(app.controller.state, "closed");
  } finally {
    app.cleanup();
  }
});

test("initApp sizes the canvas with device pixel ratio", () => {
  const app = appFixture("");
  try {
    assert.equal(app.canvas.width, 750);
    assert.equal(app.canvas.height, 1624);
  } finally {
    app.cleanup();
  }
});

test("initApp returns null when the scene element is missing", () => {
  assert.equal(initApp({ getElementById: () => null, addEventListener() {} }, {}), null);
});

test("initApp ignores reduced motion petals but keeps content", () => {
  const canvas = fakeCanvas();
  const elements = {
    "petal-canvas": canvas,
    "card-scene": fakeEl(),
    envelope: fakeEl(),
    "greeting-card": fakeEl({ hidden: true }),
    "card-to": fakeEl(),
    "card-msg": fakeEl(),
    "card-from": fakeEl(),
    "close-card": fakeEl(),
    "status-live": fakeEl(),
  };
  const app = initApp(
    { getElementById: (id) => elements[id] ?? null, addEventListener() {} },
    {
      location: { search: "?to=Lan" },
      matchMedia: () => ({ matches: true }),
      devicePixelRatio: 1,
      innerWidth: 320,
      innerHeight: 480,
      addEventListener() {},
    },
  );
  elements.envelope.fire("click");
  assert.equal(app.state, "open");
  assert.equal(elements["card-to"].textContent, "Lan");
  assert.equal(canvas.ctx.calls.length, 0);
});

/* ---------- Share URL & composer (AC-8..AC-11, BR-7) ---------- */

test("buildShareUrl uses URLSearchParams so spaces encode as +", () => {
  assert.equal(
    buildShareUrl("https://example.com/card", { to: "Cô Lan", msg: "Chúc mừng" }),
    "https://example.com/card?to=C%C3%B4+Lan&msg=Ch%C3%BAc+m%E1%BB%ABng",
  );
});

test("buildShareUrl drops the whole base query string and hash", () => {
  const url = buildShareUrl("https://ex.com/?to=Old&compose=1#hash", {
    to: "New",
    msg: "",
    from: "",
  });
  assert.equal(url, "https://ex.com/?to=New");
  assert.equal(resolveParams(url.slice(url.indexOf("?"))).to, "New");
});

test("buildShareUrl trims, omits blanks and caps each field at 120 chars", () => {
  const url = buildShareUrl("https://ex.com/", {
    to: "   ",
    msg: `  ${"x".repeat(200)}  `,
    from: undefined,
  });
  const query = url.slice(url.indexOf("?") + 1);
  assert.ok(!query.includes("to="));
  assert.ok(!query.includes("from="));
  const decoded = resolveParams(`?${query}`).msg;
  assert.equal(decoded.length, 120);
  assert.equal(decoded.at(-1), "…");
});

test("buildShareUrl returns a bare URL when nothing is entered", () => {
  assert.equal(buildShareUrl("https://thiep.vn/?compose=1", {}), "https://thiep.vn/");
  assert.equal(
    buildShareUrl("https://thiep.vn/", { to: "", msg: "", from: "" }),
    "https://thiep.vn/",
  );
});

test("buildShareUrl encodes separators so values survive a round trip", () => {
  const url = buildShareUrl("https://thiep.vn/", { msg: "a+b=c&d" });
  const resolved = resolveParams(url.slice(url.indexOf("?")));
  assert.equal(resolved.msg, "a+b=c&d");
});

test("buildShareUrl round-trips real Vietnamese input through resolveParams", () => {
  const card = { to: "Cô Nguyễn Thị Lan", msg: "Chúc mừng Ngày Nhà giáo 20/11 — chúc thầy cô ễ ươ đ vui vẻ!", from: "Tập thể 12A1" };
  const url = buildShareUrl("https://thiep.vn/", card);
  assert.ok(!/[ \t]/.test(url), "no raw space in the share URL");
  const resolved = resolveParams(url.slice(url.indexOf("?")));
  assert.deepEqual(resolved, card);
});

test("buildShareUrl drops whitespace-only fields without padding others", () => {
  const url = buildShareUrl("https://thiep.vn/", { to: "  ", msg: "Lan", from: "\t\n" });
  assert.ok(!url.includes("to="));
  assert.ok(!url.includes("from="));
  assert.ok(url.includes("msg=Lan"));
});

test("shouldAutoOpenComposer opens only for compose=1", () => {
  assert.equal(shouldAutoOpenComposer("?compose=1"), true);
  assert.equal(shouldAutoOpenComposer("compose=1"), true);
  assert.equal(shouldAutoOpenComposer("?to=Lan&compose=1"), true);
  assert.equal(shouldAutoOpenComposer(""), false);
  assert.equal(shouldAutoOpenComposer("?"), false);
  assert.equal(shouldAutoOpenComposer("?compose=0"), false);
  assert.equal(shouldAutoOpenComposer("?compose"), false);
  assert.equal(shouldAutoOpenComposer("?to=1"), false);
});

function composerFixture({ clipboard } = {}) {
  const elements = {
    "open-composer": fakeEl(),
    "card-scene": fakeEl(),
    "composer-panel": fakeEl({ hidden: true }),
    "close-composer": fakeEl(),
    "input-to": fakeEl(),
    "input-msg": fakeEl(),
    "input-from": fakeEl(),
    "count-to": fakeEl(),
    "count-msg": fakeEl(),
    "count-from": fakeEl(),
    "share-url": fakeEl(),
    "copy-link": fakeEl(),
    "preview-card": fakeEl(),
    "composer-status": fakeEl(),
    "card-to": fakeEl(),
    "card-msg": fakeEl(),
    "card-from": fakeEl(),
  };
  const doc = fakeDoc(elements);
  const win = {
    location: { search: "", origin: "https://thiep.vn", pathname: "/thiep" },
    history: {
      calls: [],
      replaceState(...args) {
        this.calls.push(args);
      },
    },
    navigator: clipboard === undefined ? {} : { clipboard },
  };
  for (const element of Object.values(elements)) element.ownerDocument = doc;
  const envelope = {
    opened: 0,
    open() {
      this.opened += 1;
    },
  };
  return { elements, doc, win, envelope, composer: new ComposerController(doc, win, envelope) };
}

test("composer starts closed and toggles from the trigger", () => {
  const { elements, composer } = composerFixture();
  assert.equal(composer.isOpen, false);
  assert.equal(elements["composer-panel"].hidden, true);

  elements["open-composer"].fire("click");
  assert.equal(composer.isOpen, true);
  assert.equal(elements["composer-panel"].hidden, false);
  assert.equal(elements["open-composer"].getAttribute("aria-expanded"), "true");
  assert.equal(elements["input-to"].focused, true);

  elements["open-composer"].fire("click");
  assert.equal(composer.isOpen, false);
  assert.equal(elements["composer-panel"].hidden, true);
  assert.equal(elements["open-composer"].getAttribute("aria-expanded"), "false");
});

test("close button and backdrop both close the composer", () => {
  const { elements, composer } = composerFixture();

  composer.open();
  elements["close-composer"].fire("click");
  assert.equal(composer.isOpen, false);
  assert.equal(elements["open-composer"].focused, true);

  composer.open();
  elements["composer-panel"].fire("click", { target: elements["composer-panel"] });
  assert.equal(composer.isOpen, false);

  composer.open();
  elements["composer-panel"].fire("click", { target: elements["input-to"] });
  assert.equal(composer.isOpen, true, "clicks inside the dialog keep it open");
});

test("typing updates counters and the share link live", () => {
  const { elements, composer } = composerFixture();
  elements["input-to"].value = "Cô Lan";
  elements["input-to"].fire("input");
  elements["input-msg"].value = "Chúc mừng";
  elements["input-msg"].fire("input");

  assert.equal(elements["count-to"].textContent, "6/120");
  assert.equal(elements["count-msg"].textContent, "9/120");
  assert.equal(elements["count-from"].textContent, "0/120");
  assert.equal(
    elements["share-url"].value,
    "https://thiep.vn/thiep?to=C%C3%B4+Lan&msg=Ch%C3%BAc+m%E1%BB%ABng",
  );
  assert.equal(composer.sync().from, "");
});

test("counter sets is-limit at 120 characters", () => {
  const { elements } = composerFixture();
  elements["input-to"].value = "x".repeat(120);
  elements["input-to"].fire("input");
  assert.equal(elements["count-to"].textContent, "120/120");
  assert.equal(elements["count-to"].classList.contains("is-limit"), true);

  elements["input-to"].value = "x".repeat(119);
  elements["input-to"].fire("input");
  assert.equal(elements["count-to"].classList.contains("is-limit"), false);
});

test("Escape closes the composer and stops the card handler underneath", () => {
  const { elements, doc, composer } = composerFixture();
  let bubbleCalls = 0;
  doc.addEventListener("keydown", () => {
    bubbleCalls += 1;
  });

  composer.open();
  doc.fire("keydown", { key: "Escape" });
  assert.equal(composer.isOpen, false);
  assert.equal(elements["composer-panel"].hidden, true);
  assert.equal(elements["open-composer"].focused, true);
  assert.equal(bubbleCalls, 0, "capture handler stops the envelope's Escape handler");

  doc.fire("keydown", { key: "Escape" });
  assert.equal(bubbleCalls, 1, "Escape passes through when the composer is closed");
});

test("composer marks the page behind the modal inert while open", () => {
  const { elements, composer } = composerFixture();
  const originalFocus = elements["open-composer"].focus;
  let inertAtFocus = null;
  elements["open-composer"].focus = function focus() {
    inertAtFocus = elements["card-scene"].inert;
    originalFocus.call(this);
  };

  composer.open();
  assert.equal(elements["card-scene"].inert, true);
  assert.equal(elements["open-composer"].inert, true);
  assert.equal(elements["card-scene"].getAttribute("inert"), "");

  composer.close();
  assert.equal(elements["card-scene"].inert, false);
  assert.equal(elements["open-composer"].inert, false);
  assert.equal(elements["card-scene"].getAttribute("inert"), undefined);
  assert.equal(elements["open-composer"].focused, true);
  assert.equal(inertAtFocus, false, "inert is cleared before focus returns to the trigger");
});

test("Tab and Shift+Tab wrap inside the open composer", () => {
  const { elements, doc, composer } = composerFixture();
  const prevent = { count: 0 };
  const event = (extra) => ({ preventDefault: () => { prevent.count += 1; }, ...extra });

  composer.open();
  assert.equal(doc.activeElement, elements["input-to"]);

  doc.activeElement = elements["preview-card"];
  doc.fire("keydown", event({ key: "Tab" }));
  assert.equal(doc.activeElement, elements["close-composer"]);
  assert.equal(prevent.count, 1, "Tab on the last control is intercepted");

  doc.fire("keydown", event({ key: "Tab", shiftKey: true }));
  assert.equal(doc.activeElement, elements["preview-card"]);
  assert.equal(prevent.count, 2, "Shift+Tab on the first control is intercepted");

  doc.activeElement = elements["input-msg"];
  doc.fire("keydown", event({ key: "Tab" }));
  assert.equal(doc.activeElement, elements["input-msg"], "mid-list Tab is left to the browser");
  assert.equal(prevent.count, 2);

  doc.activeElement = elements["composer-panel"];
  doc.fire("keydown", event({ key: "Tab" }));
  assert.equal(doc.activeElement, elements["close-composer"]);
  assert.equal(prevent.count, 3, "Tab from outside the focusable list pulls focus inside");

  composer.close();
  doc.activeElement = elements["preview-card"];
  doc.fire("keydown", event({ key: "Tab" }));
  assert.equal(doc.activeElement, elements["preview-card"], "no trap when the composer is closed");
});

test("copy uses the clipboard API and reports success", async () => {
  const written = [];
  const { elements, composer } = composerFixture({
    clipboard: {
      async writeText(text) {
        written.push(text);
      },
    },
  });
  elements["share-url"].value = "https://thiep.vn/?to=Lan";
  const copied = await composer.copy();

  assert.equal(copied, true);
  assert.deepEqual(written, ["https://thiep.vn/?to=Lan"]);
  assert.equal(elements["composer-status"].textContent, "Đã sao chép link thiệp vào bộ nhớ tạm");
});

test("copy falls back to select + execCommand when the clipboard rejects", async () => {
  const { elements, doc, composer } = composerFixture({
    clipboard: {
      async writeText() {
        throw new Error("denied");
      },
    },
  });
  const commands = [];
  doc.execCommand = (command) => {
    commands.push(command);
    return true;
  };
  elements["share-url"].value = "https://thiep.vn/?to=Lan";

  const copied = await composer.copy();
  assert.equal(copied, true);
  assert.deepEqual(commands, ["copy"]);
  assert.equal(elements["share-url"].selected, 1);
  assert.equal(elements["composer-status"].textContent, "Đã sao chép link thiệp vào bộ nhớ tạm");
});

test("copy reports a manual fallback when nothing can copy", async () => {
  const { elements, composer } = composerFixture();
  const copied = await composer.copy();
  assert.equal(copied, false);
  assert.equal(
    elements["composer-status"].textContent,
    "Không thể sao chép tự động — hãy chọn link và sao chép thủ công",
  );
});

test("preview fills the card, rewrites history, closes and opens the envelope", () => {
  const { elements, win, envelope, composer } = composerFixture();
  elements["input-to"].value = "Cô Lan";
  elements["input-msg"].value = "   ";
  elements["input-from"].value = "<b>Minh</b>";
  composer.open();

  const content = composer.preview();

  assert.equal(content.to, "Cô Lan");
  assert.equal(content.msg, DEFAULTS.msg);
  assert.equal(elements["card-to"].textContent, "Cô Lan");
  assert.equal(elements["card-msg"].textContent, DEFAULTS.msg);
  assert.equal(elements["card-from"].textContent, "<b>Minh</b>");
  assert.equal(envelope.opened, 1);
  assert.equal(composer.isOpen, false);
  assert.equal(win.history.calls.length, 1);
  assert.ok(!String(win.history.calls[0][2]).includes("compose"));
  assert.ok(String(win.history.calls[0][2]).includes("to=C%C3%B4+Lan"));
});

test("preview survives a refused history write", () => {
  const { elements, win, composer } = composerFixture();
  win.history.replaceState = () => {
    throw new Error("SecurityError");
  };
  elements["input-to"].value = "Lan";
  assert.doesNotThrow(() => composer.preview());
  assert.equal(elements["card-to"].textContent, "Lan");
});

test("initApp auto-opens the composer from ?compose=1", () => {
  const app = appFixture("?compose=1");
  try {
    assert.equal(app.elements["composer-panel"].hidden, false);
    assert.equal(app.elements["open-composer"].getAttribute("aria-expanded"), "true");
  } finally {
    app.cleanup();
  }
});

test("initApp keeps the composer closed without the flag", () => {
  const app = appFixture("?to=Lan");
  try {
    assert.equal(app.elements["composer-panel"].hidden, true);
    assert.equal(app.elements["open-composer"].getAttribute("aria-expanded"), "false");
    assert.match(app.elements["share-url"].value, /^https:\/\/thiep\.vn\/\?to=/);
  } finally {
    app.cleanup();
  }
});

test("initApp preview opens the envelope and shows the entered greeting", () => {
  const app = appFixture("");
  try {
    app.elements["open-composer"].fire("click");
    app.elements["input-to"].value = "Lan";
    app.elements["preview-card"].fire("click");
    assert.equal(app.controller.state, "open");
    assert.equal(app.elements["card-to"].textContent, "Lan");
    assert.equal(app.elements["composer-panel"].hidden, true);
  } finally {
    app.cleanup();
  }
});
