// Orbit Relay application shell: room configuration, responsive HUD, mobile controls, and low-frequency network intent transmission.

import "./style.css";
import { ASSETS, preloadAssets } from "./assets.js";
import { JaninNetwork } from "./network.js";
import { JaninArena } from "./janin-game.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#arenaCanvas");
const shell = $("#gameShell");
const logo = $("#brandLogo");
const roomCard = $("#roomCard");
const statusChip = $("#statusChip");
const roomValue = $("#roomValue");
const clockValue = $("#clockValue");
const scoreValue = $("#scoreValue");
const leaderValue = $("#leaderValue");
const playerCount = $("#playerCount");
const dashButton = $("#dashButton");
const practiceButton = $("#practiceButton");
const connectButton = $("#connectButton");
const closeRoomButton = $("#closeRoomButton");
const roomButton = $("#roomButton");
const pad = $("#movePad");
const inputs = { name: $("#nameInput"), room: $("#roomInput"), server: $("#serverInput") };
const images = preloadAssets();
logo.src = ASSETS.logo;

let state = null;
let intent = { x: 0, y: 0, dash: false };

function renderState(next) {
  state = next;
  roomValue.textContent = next.room;
  clockValue.textContent = `0:${String(next.remaining).padStart(2, "0")}`;
  scoreValue.textContent = String(next.score).padStart(2, "0");
  leaderValue.textContent = next.leader;
  playerCount.textContent = `${next.players} LINK${next.players === 1 ? "" : "S"}`;
  dashButton.classList.toggle("is-ready", next.dashReady);
  dashButton.disabled = !next.dashReady;
  shell.dataset.mode = next.mode;
}

const game = new JaninArena(canvas, images, renderState);
game.tick(performance.now());

function setStatus({ mode, label }) { statusChip.dataset.kind = mode; statusChip.textContent = label; }
const network = new JaninNetwork({
  onStatus: setStatus,
  onWelcome: (welcome) => { game.joinOnline(welcome); setStatus({ mode: "online", label: `LIVE · ${welcome.r}` }); roomCard.hidden = true; },
  onSnapshot: (snapshot) => game.applySnapshot(snapshot),
  onEvent: (event) => { if (event.k === "claim") setStatus({ mode: "online", label: "SIGNAL CLAIMED" }); },
});

function updateIntent(next = {}) {
  intent = { ...intent, ...next };
  const magnitude = Math.hypot(intent.x, intent.y);
  if (magnitude > 1) { intent.x /= magnitude; intent.y /= magnitude; }
  game.setInput(intent); network.sendInput(intent);
}

function startPractice() {
  network.disconnect();
  game.beginPractice(inputs.name.value || "YOU");
  roomCard.hidden = true;
  setStatus({ mode: "practice", label: "PRACTICE RELAY" });
}

function joinLive() {
  const server = inputs.server.value.trim();
  localStorage.setItem("janin-server-url", server);
  if (!server) { setStatus({ mode: "error", label: "ADD SERVER URL" }); return; }
  network.connect({ serverUrl: server, room: inputs.room.value || "JANIN", name: inputs.name.value || "YOU", color: 0 });
}

inputs.server.value = new URLSearchParams(location.search).get("server") || localStorage.getItem("janin-server-url") || "";
practiceButton.addEventListener("click", startPractice);
connectButton.addEventListener("click", joinLive);
roomButton.addEventListener("click", () => { roomCard.hidden = false; });
closeRoomButton.addEventListener("click", () => { roomCard.hidden = true; });
dashButton.addEventListener("pointerdown", (event) => { event.preventDefault(); updateIntent({ dash: true }); game.dash(); });

const keys = new Set();
window.addEventListener("keydown", (event) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(event.code)) event.preventDefault(); if (event.code === "Space") { updateIntent({ dash: true }); game.dash(); } else { keys.add(event.code); syncKeys(); } });
window.addEventListener("keyup", (event) => { keys.delete(event.code); syncKeys(); });
function syncKeys() { updateIntent({ x: (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0), y: (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) }); }

let padPointer = null;
function moveFromPointer(event) { const rect = pad.getBoundingClientRect(); const dx = event.clientX - (rect.left + rect.width / 2); const dy = event.clientY - (rect.top + rect.height / 2); const range = rect.width * 0.34; updateIntent({ x: dx / range, y: dy / range }); pad.style.setProperty("--stick-x", `${clamp(dx, -range, range)}px`); pad.style.setProperty("--stick-y", `${clamp(dy, -range, range)}px`); }
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
pad.addEventListener("pointerdown", (event) => { padPointer = event.pointerId; pad.setPointerCapture(event.pointerId); moveFromPointer(event); });
pad.addEventListener("pointermove", (event) => { if (event.pointerId === padPointer) moveFromPointer(event); });
pad.addEventListener("pointerup", (event) => { if (event.pointerId !== padPointer) return; padPointer = null; updateIntent({ x: 0, y: 0 }); pad.style.setProperty("--stick-x", "0px"); pad.style.setProperty("--stick-y", "0px"); });
window.addEventListener("resize", () => game.resize());
document.addEventListener("visibilitychange", () => { if (document.hidden) updateIntent({ x: 0, y: 0 }); });
setStatus({ mode: "practice", label: "PRACTICE READY" });
