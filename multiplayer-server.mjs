// Janin self-hosted room server: an authoritative, memory-only WebSocket relay for compact 2D arena snapshots.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const TICK_RATE = 30;
const SNAPSHOT_EVERY = 2;
const MAX_PLAYERS = 8;
const ROUND_SECONDS = 90;
const WORLD = 1000;
const ORB_COUNT = 8;
const rooms = new Map();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeCode = (value) => String(value || "JANIN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "JANIN";
const safeName = (value) => String(value || "PILOT").toUpperCase().replace(/[^A-Z0-9 _-]/g, "").trim().slice(0, 14) || "PILOT";
const random = (min, max) => min + Math.random() * (max - min);
const makeOrb = () => ({ i: randomUUID().slice(0, 8), x: Math.round(random(120, 880)), y: Math.round(random(130, 870)), h: Math.floor(Math.random() * 3) });
const message = (target, data) => { if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(data)); };
const overlap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 42;

function createRoom(code) {
  const now = Date.now();
  return { code, players: new Map(), orbs: Array.from({ length: ORB_COUNT }, makeOrb), roundStartedAt: now, nextSnapshot: 0, tick: 0 };
}

function playerPayload(player) {
  return { i: player.id, n: player.name, c: player.color, x: Math.round(player.x), y: Math.round(player.y), s: player.score, h: Math.round(player.heading * 100) / 100 };
}

function snapshot(room) {
  return { t: "snapshot", k: room.tick, p: [...room.players.values()].map(playerPayload), o: room.orbs, r: room.code, s: Math.max(0, Math.ceil(ROUND_SECONDS - (Date.now() - room.roundStartedAt) / 1000)) };
}

function broadcast(room, payload) {
  for (const player of room.players.values()) message(player.socket, payload);
}

function removePlayer(player) {
  const room = rooms.get(player.roomCode);
  if (!room) return;
  room.players.delete(player.id);
  broadcast(room, { t: "event", k: "leave", i: player.id });
  if (room.players.size === 0) rooms.delete(room.code);
}

function beginRound(room) {
  room.roundStartedAt = Date.now();
  room.orbs = Array.from({ length: ORB_COUNT }, makeOrb);
  for (const player of room.players.values()) { player.score = 0; player.x = random(170, 830); player.y = random(190, 810); player.vx = 0; player.vy = 0; player.cooldown = 0; }
  broadcast(room, { t: "event", k: "round" });
}

function updateRoom(room, delta) {
  const now = Date.now();
  if ((now - room.roundStartedAt) / 1000 >= ROUND_SECONDS) beginRound(room);
  for (const player of room.players.values()) {
    player.cooldown = Math.max(0, player.cooldown - delta);
    if (player.input.d && player.cooldown <= 0) { player.dashUntil = now + 220; player.cooldown = 1.25; }
    player.input.d = 0;
    const speed = now < player.dashUntil ? 565 : 255;
    player.vx = player.input.x * speed; player.vy = player.input.y * speed;
    player.x = clamp(player.x + player.vx * delta, 58, WORLD - 58); player.y = clamp(player.y + player.vy * delta, 80, WORLD - 58);
    if (Math.abs(player.vx) + Math.abs(player.vy) > 1) player.heading = Math.atan2(player.vy, player.vx);
  }
  for (const orb of room.orbs) {
    const claimer = [...room.players.values()].find((player) => overlap(player, orb));
    if (!claimer) continue;
    claimer.score += 1;
    broadcast(room, { t: "event", k: "claim", i: claimer.id, o: orb.i });
    Object.assign(orb, makeOrb());
  }
  room.tick += 1;
  if (room.tick % SNAPSHOT_EVERY === 0) broadcast(room, snapshot(room));
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((sum, room) => sum + room.players.size, 0) }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Janin room server — connect by WebSocket or request /health" }));
});

const websocketServer = new WebSocketServer({ server, maxPayload: 1024 });
websocketServer.on("connection", (socket) => {
  let player = null;
  const joinTimeout = setTimeout(() => socket.close(1008, "Join required"), 8000);
  // Protocol errors (oversized or malformed frames) arrive as "error" events;
  // ws closes the socket itself. Unhandled, one would crash every room.
  socket.on("error", () => {});
  socket.on("message", (buffer) => {
    if (buffer.length > 1024) return socket.close(1009, "Message too large");
    let incoming;
    try { incoming = JSON.parse(buffer.toString()); } catch { return socket.close(1003, "JSON required"); }
    // Valid JSON can still be null or a bare value; only objects are messages.
    if (!incoming || typeof incoming !== "object") return socket.close(1003, "JSON object required");
    if (incoming.t === "join" && !player) {
      clearTimeout(joinTimeout);
      const code = safeCode(incoming.r);
      const room = rooms.get(code) || createRoom(code);
      if (room.players.size >= MAX_PLAYERS) { message(socket, { t: "event", k: "full" }); return socket.close(1008, "Room full"); }
      rooms.set(code, room);
      player = { id: randomUUID().slice(0, 8), socket, roomCode: code, name: safeName(incoming.n), color: clamp(Number.parseInt(incoming.c, 10) || 0, 0, 7), x: random(180, 820), y: random(180, 820), vx: 0, vy: 0, heading: 0, score: 0, dashUntil: 0, cooldown: 0, input: { x: 0, y: 0, d: 0 } };
      room.players.set(player.id, player);
      message(socket, { ...snapshot(room), t: "welcome", id: player.id, r: code, n: player.name, c: player.color });
      broadcast(room, { t: "event", k: "join", i: player.id });
      return;
    }
    if (incoming.t === "input" && player) {
      const x = clamp(Number(incoming.x) || 0, -1, 1); const y = clamp(Number(incoming.y) || 0, -1, 1); const length = Math.max(1, Math.hypot(x, y));
      player.input = { x: x / length, y: y / length, d: incoming.d ? 1 : 0 };
    }
  });
  socket.on("close", () => { clearTimeout(joinTimeout); if (player) removePlayer(player); });
});

let last = Date.now();
setInterval(() => {
  const now = Date.now(); const delta = Math.min((now - last) / 1000, 0.05); last = now;
  for (const room of rooms.values()) updateRoom(room, delta);
}, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => console.log(`Janin room server listening on :${PORT}`));
