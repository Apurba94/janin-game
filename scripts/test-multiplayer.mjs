// Janin integration smoke test: joins two independent WebSocket clients and checks that a shared snapshot is broadcast.
import WebSocket from "ws";

const endpoint = process.env.JANIN_TEST_URL || "ws://127.0.0.1:8787";
const connect = (name, color) => new Promise((resolve, reject) => {
  const socket = new WebSocket(endpoint);
  const timer = setTimeout(() => reject(new Error(`Timed out connecting ${name}`)), 5000);
  socket.on("open", () => socket.send(JSON.stringify({ t: "join", r: "SMOKE", n: name, c: color })));
  socket.on("message", (buffer) => {
    const message = JSON.parse(buffer.toString());
    if (message.t === "welcome") { clearTimeout(timer); resolve({ socket, welcome: message }); }
  });
  socket.on("error", reject);
});

const one = await connect("ALPHA", 0);
const two = await connect("BETA", 1);
let sawSharedRoom = false;
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("No two-player snapshot received")), 5000);
  one.socket.on("message", (buffer) => {
    const message = JSON.parse(buffer.toString());
    if (message.t === "snapshot" && message.p?.length === 2) { clearTimeout(timer); sawSharedRoom = true; resolve(message); }
  });
  two.socket.send(JSON.stringify({ t: "input", x: 1, y: 0, d: 1 }));
});
one.socket.close(); two.socket.close();
if (!sawSharedRoom || result.p.length !== 2) throw new Error("Shared-room validation failed");
console.log(`Janin multiplayer smoke test passed: room ${result.r} broadcast ${result.p.length} players.`);

// Hostile input must close only the offending socket, never the whole server.
const httpEndpoint = endpoint.replace(/^ws/, "http");
for (const [label, payload] of [["null message", "null"], ["oversized message", "x".repeat(5000)]]) {
  await new Promise((resolve) => {
    const socket = new WebSocket(endpoint);
    socket.on("open", () => socket.send(payload));
    socket.on("close", resolve);
    socket.on("error", () => {});
  });
  const health = await fetch(`${httpEndpoint}/health`).then((response) => response.json());
  if (!health.ok) throw new Error(`Server stopped responding after a ${label}`);
}
console.log("Janin multiplayer robustness test passed: null and oversized messages were rejected.");
