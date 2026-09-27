// Runs the Orbit Relay game loop headless: a no-op canvas stands in for the
// browser, and ticks are driven by hand instead of requestAnimationFrame.
import assert from "node:assert/strict";

globalThis.location = { search: "" };
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = () => 0;
const noop = () => {};
const context = new Proxy({}, {
  get: (target, key) => key in target ? target[key]
    : key === "createLinearGradient" || key === "createRadialGradient" ? () => ({ addColorStop: noop })
    : key === "measureText" ? () => ({ width: 10 })
    : noop,
  set: (target, key, value) => { target[key] = value; return true; },
});
const canvas = { width: 390, height: 844, clientWidth: 390, clientHeight: 844, style: {}, getContext: () => context, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) };

const { JaninArena } = await import("../client/src/janin-game.js");
let state = null;
const arena = new JaninArena(canvas, {}, (next) => { state = next; });

// Practice: the round clock runs down and the round ends at zero.
arena.beginPractice("TESTER");
let now = 0;
const run = (seconds) => { for (let i = 0; i < seconds * 30; i++) { now += 1000 / 30; arena.tick(now); } };
run(5);
assert.equal(state.mode, "practice");
assert.ok(state.remaining <= 86 && state.remaining >= 84, `clock after 5 s: ${state.remaining}`);
run(90);
assert.equal(state.remaining, 0);
assert.equal(state.done, true);

// Online: the clock comes from the server's "s" field ("t" is the message type).
arena.joinOnline({ r: "ROOM1", id: "me", n: "TESTER", c: 1 });
arena.applySnapshot({ t: "snapshot", p: [{ i: "me", n: "TESTER", c: 1, x: 100, y: 100, s: 3, h: 0 }], o: [], r: "ROOM1", s: 42 });
assert.equal(state.remaining, 42);
assert.equal(state.score, 3);
assert.equal(state.room, "ROOM1");

console.log("Orbit Relay arena test passed: practice clock, round end and online snapshot clock.");
